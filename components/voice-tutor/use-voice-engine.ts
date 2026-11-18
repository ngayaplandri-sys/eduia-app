"use client";

import * as React from "react";
import { VOICE_TUTOR_MAX_RECORDING_MS } from "@/lib/config/voice-tutor";

/**
 * Moteur audio du Professeur vocal, sans état React superflu :
 *  - enregistrement de la question au micro (MediaRecorder) avec détection de
 *    la fin de phrase (niveau sonore analysé par Web Audio) ;
 *  - lecture des réponses : une réponse = une suite de passages audio, joués
 *    l'un après l'autre dès qu'ils arrivent (la voix démarre pendant que le
 *    professeur écrit encore la suite), puis réécoutables en entier.
 *
 * Le micro est relâché après chaque question : l'indicateur d'enregistrement
 * s'éteint pendant que le professeur parle, et sur iPhone la voix ne bascule
 * pas sur l'écouteur (volume très faible quand le micro reste ouvert).
 */

export type MicFailure = "denied" | "missing" | "unsupported";

export class MicError extends Error {
  reason: MicFailure;
  constructor(reason: MicFailure) {
    super(reason);
    this.name = "MicError";
    this.reason = reason;
  }
}

export interface Playback {
  id: string;
  /** Position dans la réponse entière (tous passages confondus), en secondes. */
  currentTime: number;
  /** Durée connue de la réponse (s'allonge tant que des passages arrivent). */
  duration: number;
  playing: boolean;
  /** En attente du prochain passage audio. */
  waiting: boolean;
}

export type PlayOutcome = "ended" | "stopped" | "blocked";

/** Réponse en cours de lecture « au fil de l'eau » : on lui ajoute des passages. */
export interface LiveSpeech {
  add: (clip: Promise<Blob | null>) => void;
  close: () => void;
  done: Promise<PlayOutcome>;
}

interface ListenHandlers {
  /** Question enregistrée (fin de phrase détectée, ou envoi manuel). */
  onUtterance: (audio: Blob) => void;
  /** Rien entendu avant le délai : l'écoute s'arrête d'elle-même. */
  onNoSpeech: () => void;
}

const RECORDER_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/aac",
];

/** Réglages de la détection de parole (millisecondes). */
const TICK_MS = 50;
const CALIBRATION_MS = 350;
const SPEECH_MIN_MS = 200;
const END_SILENCE_MS = 1500;
const NO_SPEECH_TIMEOUT_MS = 10_000;
/** Envoi manuel : en dessous, l'enregistrement est jugé vide. */
const MIN_MANUAL_MS = 500;

/** WAV vide : « débloque » la lecture audio sur iPhone lors d'un appui. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

function pickRecorderType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  return RECORDER_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function toMicError(error: unknown): MicError {
  const name = (error as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return new MicError("denied");
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "NotReadableError") {
    return new MicError("missing");
  }
  return new MicError("unsupported");
}

/** Durée d'un passage audio (métadonnées), sans le jouer. */
function probeDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const probe = new Audio();
    const url = URL.createObjectURL(blob);
    const finish = (seconds: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(seconds) && seconds > 0 ? seconds : 0);
    };
    probe.preload = "metadata";
    probe.addEventListener("loadedmetadata", () => finish(probe.duration), { once: true });
    probe.addEventListener("error", () => finish(0), { once: true });
    probe.src = url;
  });
}

interface RecordingSession {
  id: number;
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  startedAt: number;
  speechStarted: boolean;
  timer: number | null;
  handlers: ListenHandlers;
  finishing: boolean;
}

interface Clip {
  promise: Promise<Blob | null>;
  /** `undefined` tant que le passage n'est pas arrivé ; `null` s'il a échoué. */
  blob?: Blob | null;
  duration?: number;
}

interface Sequence {
  id: string;
  clips: Clip[];
  /** Plus aucun passage ne sera ajouté. */
  closed: boolean;
  wake: (() => void) | null;
}

export function useVoiceEngine() {
  const contextRef = React.useRef<AudioContext | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const unlockedRef = React.useRef(false);
  const sessionRef = React.useRef<RecordingSession | null>(null);
  const sessionCounter = React.useRef(0);
  const levelRef = React.useRef(0);

  const sequencesRef = React.useRef(new Map<string, Sequence>());
  /** Lecture en cours : séquence, passage et numéro de lecture (annulation). */
  const currentRef = React.useRef<{ seq: Sequence; index: number; run: number } | null>(null);
  const runCounter = React.useRef(0);
  const settleClipRef = React.useRef<((outcome: PlayOutcome) => void) | null>(null);
  /** Où reprendre une réponse mise en pause (ou repositionnée). */
  const resumeRef = React.useRef<{ id: string; index: number; offset: number } | null>(null);
  const objectUrlRef = React.useRef<string | null>(null);
  const rateRef = React.useRef(1);

  const [playback, setPlayback] = React.useState<Playback | null>(null);
  /** Durée totale des réponses entièrement chargées, affichée même à l'arrêt. */
  const [durations, setDurations] = React.useState<Record<string, number>>({});
  const [rate, setRateState] = React.useState(1);

  function ensureContext(): AudioContext | null {
    if (!contextRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      contextRef.current = new Ctor();
    }
    if (contextRef.current.state === "suspended") {
      void contextRef.current.resume().catch(() => {});
    }
    return contextRef.current;
  }

  // ───────────────────────────── Lecture ─────────────────────────────

  function knownDuration(seq: Sequence): number {
    return seq.clips.reduce((sum, clip) => sum + (clip.duration ?? 0), 0);
  }

  function offsetBefore(seq: Sequence, index: number): number {
    return seq.clips.slice(0, index).reduce((sum, clip) => sum + (clip.duration ?? 0), 0);
  }

  function publish(waiting = false) {
    const current = currentRef.current;
    const audio = audioRef.current;
    if (!current || !audio) return;
    const { seq, index } = current;
    setPlayback({
      id: seq.id,
      currentTime: offsetBefore(seq, index) + (waiting ? 0 : audio.currentTime),
      duration: knownDuration(seq),
      playing: waiting || (!audio.paused && !audio.ended),
      waiting,
    });
  }

  function recordDuration(seq: Sequence) {
    if (!seq.closed || seq.clips.some((clip) => clip.blob === undefined || (clip.blob && !clip.duration))) {
      return;
    }
    const total = knownDuration(seq);
    if (total > 0) {
      setDurations((known) => (known[seq.id] === total ? known : { ...known, [seq.id]: total }));
    }
  }

  function settleClip(outcome: PlayOutcome) {
    const settle = settleClipRef.current;
    settleClipRef.current = null;
    settle?.(outcome);
  }

  function ensurePlayer(): HTMLAudioElement {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio();
    audio.preload = "auto";
    const sync = () => publish();
    for (const event of ["timeupdate", "play", "pause"]) audio.addEventListener(event, sync);
    audio.addEventListener("loadedmetadata", () => {
      const current = currentRef.current;
      if (!current) return;
      const clip = current.seq.clips[current.index];
      if (clip && Number.isFinite(audio.duration) && audio.duration > 0) clip.duration = audio.duration;
      publish();
    });
    audio.addEventListener("ended", () => settleClip("ended"));
    // Passage illisible : on passe au suivant plutôt que de bloquer la réponse.
    audio.addEventListener("error", () => {
      if (currentRef.current) settleClip("ended");
    });
    audioRef.current = audio;
    return audio;
  }

  /**
   * À appeler pendant un appui de l'utilisateur : prépare l'analyse du micro
   * et autorise les lectures audio déclenchées ensuite sans appui (iPhone).
   */
  function unlock() {
    ensureContext();
    const audio = ensurePlayer();
    if (!unlockedRef.current) {
      unlockedRef.current = true;
      audio.src = SILENT_WAV;
      void audio.play().catch(() => {});
    }
  }

  function addClip(seq: Sequence, promise: Promise<Blob | null>) {
    const clip: Clip = { promise };
    seq.clips.push(clip);
    void promise.then(async (blob) => {
      clip.blob = blob;
      if (blob) clip.duration = await probeDuration(blob);
      if (currentRef.current?.seq === seq) publish(settleClipRef.current === null);
      recordDuration(seq);
    });
    wake(seq);
  }

  function wake(seq: Sequence) {
    const resume = seq.wake;
    seq.wake = null;
    resume?.();
  }

  function playClip(seq: Sequence, index: number, blob: Blob, offset: number): Promise<PlayOutcome> {
    const audio = ensurePlayer();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    return new Promise<PlayOutcome>((resolve) => {
      settleClipRef.current = resolve;
      audio.src = url;
      audio.defaultPlaybackRate = rateRef.current;
      audio.playbackRate = rateRef.current;
      if (offset > 0) {
        audio.addEventListener(
          "loadedmetadata",
          () => {
            audio.currentTime = Math.min(offset, audio.duration || offset);
          },
          { once: true },
        );
      }
      audio.play().catch(() => settleClip("blocked"));
    });
  }

  /** Joue la séquence à partir d'un passage ; attend les passages pas encore arrivés. */
  async function run(seq: Sequence, startIndex: number, startOffset: number): Promise<PlayOutcome> {
    stopCurrent(false);
    const runId = ++runCounter.current;
    let index = startIndex;
    let offset = startOffset;
    resumeRef.current = null;

    while (runCounter.current === runId) {
      currentRef.current = { seq, index, run: runId };
      if (index >= seq.clips.length) {
        if (seq.closed) {
          currentRef.current = null;
          setPlayback((current) =>
            current?.id === seq.id
              ? { ...current, currentTime: knownDuration(seq), playing: false, waiting: false }
              : current,
          );
          return "ended";
        }
        publish(true);
        await new Promise<void>((resolve) => {
          seq.wake = resolve;
        });
        continue;
      }
      const clip = seq.clips[index];
      if (clip.blob === undefined) publish(true);
      const blob = clip.blob !== undefined ? clip.blob : await clip.promise;
      if (runCounter.current !== runId) return "stopped";
      if (!blob) {
        index += 1;
        offset = 0;
        continue;
      }
      const outcome = await playClip(seq, index, blob, offset);
      if (runCounter.current !== runId) return "stopped";
      if (outcome !== "ended") {
        if (outcome === "blocked") {
          resumeRef.current = { id: seq.id, index, offset: 0 };
          publish();
        }
        currentRef.current = null;
        return outcome;
      }
      index += 1;
      offset = 0;
    }
    return "stopped";
  }

  /** Arrête la lecture en cours ; `remember` garde la position pour une reprise. */
  function stopCurrent(remember: boolean) {
    const current = currentRef.current;
    const audio = audioRef.current;
    runCounter.current += 1;
    if (current && remember) {
      resumeRef.current = {
        id: current.seq.id,
        index: current.index,
        offset: audio && !audio.ended ? audio.currentTime : 0,
      };
    }
    if (audio && !audio.paused) audio.pause();
    settleClip("stopped");
    if (current) {
      wake(current.seq);
      const { seq } = current;
      setPlayback((state) =>
        state?.id === seq.id ? { ...state, playing: false, waiting: false } : state,
      );
    }
    currentRef.current = null;
  }

  /**
   * Nouvelle réponse lue au fil de l'eau : les passages s'ajoutent avec `add`
   * et sont joués dans l'ordre ; `close` quand la réponse est complète.
   */
  function startLiveSpeech(id: string): LiveSpeech {
    const seq: Sequence = { id, clips: [], closed: false, wake: null };
    sequencesRef.current.set(id, seq);
    const done = run(seq, 0, 0);
    return {
      add: (clip) => addClip(seq, clip),
      close: () => {
        seq.closed = true;
        wake(seq);
        recordDuration(seq);
      },
      done,
    };
  }

  /** Passages déjà chargés pour cette réponse et complets (`expected` attendus). */
  function loadedSequence(id: string, expected: number): Sequence | null {
    const seq = sequencesRef.current.get(id);
    return seq && seq.closed && seq.clips.length === expected ? seq : null;
  }

  /**
   * Lit une réponse depuis le début. Si ses `expected` passages n'ont pas tous
   * été chargés (réponse non prononcée ou coupée, message d'accueil),
   * `loadClips` les fournit.
   */
  function playMessage(
    id: string,
    expected: number,
    loadClips: () => Promise<Blob | null>[],
  ): Promise<PlayOutcome> {
    let seq = loadedSequence(id, expected);
    if (!seq) {
      seq = { id, clips: [], closed: false, wake: null };
      sequencesRef.current.set(id, seq);
      for (const clip of loadClips()) addClip(seq, clip);
      seq.closed = true;
    }
    return run(seq, 0, 0);
  }

  /** Reprend une réponse mise en pause là où elle s'était arrêtée. */
  function resume(id: string, expected: number): Promise<PlayOutcome> | null {
    const position = resumeRef.current;
    const seq = loadedSequence(id, expected);
    if (!position || position.id !== id || !seq) return null;
    return run(seq, position.index, position.offset);
  }

  function pause() {
    stopCurrent(true);
  }

  function stopPlayback() {
    stopCurrent(true);
  }

  /**
   * Repositionne une réponse (clic sur sa forme d'onde). Renvoie `true` si elle
   * était en cours de lecture : l'appelant la relance alors avec `resume`.
   */
  function seek(id: string, ratio: number): boolean {
    const seq = sequencesRef.current.get(id);
    if (!seq) return false;
    const total = knownDuration(seq);
    if (total <= 0) return false;
    const wasPlaying = currentRef.current?.seq === seq;
    if (wasPlaying) stopCurrent(false);
    let target = Math.min(total, Math.max(0, ratio * total));
    let index = 0;
    while (index < seq.clips.length - 1 && target >= (seq.clips[index].duration ?? 0)) {
      target -= seq.clips[index].duration ?? 0;
      index += 1;
    }
    resumeRef.current = { id, index, offset: target };
    setPlayback({
      id,
      currentTime: offsetBefore(seq, index) + target,
      duration: total,
      playing: false,
      waiting: false,
    });
    return wasPlaying;
  }

  function setRate(next: number) {
    rateRef.current = next;
    setRateState(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  /** Oublie toutes les réponses chargées (nouvelle conversation, autre cours). */
  function reset() {
    stopCurrent(false);
    resumeRef.current = null;
    sequencesRef.current.clear();
    setPlayback(null);
    setDurations({});
  }

  // ───────────────────────────── Micro ─────────────────────────────

  function releaseSession(session: RecordingSession) {
    if (session.timer !== null) window.clearInterval(session.timer);
    session.stream.getTracks().forEach((track) => track.stop());
    if (sessionRef.current === session) sessionRef.current = null;
    levelRef.current = 0;
  }

  function finish(session: RecordingSession, submit: boolean, reason?: "no-speech") {
    if (session.finishing) return;
    session.finishing = true;
    if (session.timer !== null) {
      window.clearInterval(session.timer);
      session.timer = null;
    }
    const deliver = () => {
      releaseSession(session);
      if (session.id !== sessionCounter.current) return;
      if (submit) {
        const type = session.recorder.mimeType || session.chunks[0]?.type || "audio/webm";
        session.handlers.onUtterance(new Blob(session.chunks, { type }));
      } else if (reason === "no-speech") {
        session.handlers.onNoSpeech();
      }
    };
    if (session.recorder.state === "inactive") {
      deliver();
      return;
    }
    session.recorder.addEventListener("stop", deliver, { once: true });
    session.recorder.stop();
  }

  async function startListening(handlers: ListenHandlers): Promise<void> {
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      throw new MicError("unsupported");
    }
    cancelListening();
    const id = ++sessionCounter.current;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      throw toMicError(error);
    }
    // Écoute annulée pendant la demande d'autorisation.
    if (id !== sessionCounter.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const mimeType = pickRecorderType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      throw new MicError("unsupported");
    }

    const session: RecordingSession = {
      id,
      stream,
      recorder,
      chunks: [],
      startedAt: performance.now(),
      speechStarted: false,
      timer: null,
      handlers,
      finishing: false,
    };
    sessionRef.current = session;
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) session.chunks.push(event.data);
    });
    recorder.start(250);

    // Analyse du niveau sonore. Sans contexte audio actif (rare : ancien
    // navigateur, contexte suspendu hors appui), l'élève envoie à la main.
    const context = ensureContext();
    let analyser: AnalyserNode | null = null;
    if (context) {
      try {
        analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        context.createMediaStreamSource(stream).connect(analyser);
      } catch {
        analyser = null;
      }
    }

    const samples = new Uint8Array(analyser?.fftSize ?? 0);
    const noise: number[] = [];
    let threshold = 0;
    let voicedMs = 0;
    let silentMs = 0;

    session.timer = window.setInterval(() => {
      const elapsed = performance.now() - session.startedAt;
      if (elapsed >= VOICE_TUTOR_MAX_RECORDING_MS) {
        finish(session, true);
        return;
      }
      if (!analyser || contextRef.current?.state !== "running") return;

      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const value of samples) {
        const centered = (value - 128) / 128;
        sum += centered * centered;
      }
      const rms = Math.sqrt(sum / samples.length);
      levelRef.current = levelRef.current * 0.6 + Math.min(1, rms * 9) * 0.4;

      if (elapsed < CALIBRATION_MS) {
        noise.push(rms);
        return;
      }
      if (!threshold) {
        const sorted = [...noise].sort((a, b) => a - b);
        const floor = sorted[Math.floor(sorted.length / 2)] ?? 0;
        threshold = Math.min(0.09, Math.max(0.014, floor * 2.8));
      }

      if (rms > threshold) {
        voicedMs += TICK_MS;
        silentMs = 0;
        if (voicedMs >= SPEECH_MIN_MS) session.speechStarted = true;
      } else {
        voicedMs = Math.max(0, voicedMs - TICK_MS / 2);
        if (session.speechStarted) silentMs += TICK_MS;
      }

      if (session.speechStarted && silentMs >= END_SILENCE_MS) {
        finish(session, true);
      } else if (!session.speechStarted && elapsed >= NO_SPEECH_TIMEOUT_MS) {
        finish(session, false, "no-speech");
      }
    }, TICK_MS);
  }

  /**
   * Envoi immédiat de la question en cours (appui sur le micro pendant
   * l'écoute). `false` : enregistrement trop court, abandonné sans envoi.
   */
  function submitListening(): boolean {
    const session = sessionRef.current;
    if (!session || session.finishing) return false;
    const submit =
      session.speechStarted || performance.now() - session.startedAt >= MIN_MANUAL_MS;
    finish(session, submit);
    return submit;
  }

  /** Abandon de l'écoute en cours, sans rien envoyer. */
  function cancelListening() {
    sessionCounter.current++;
    const session = sessionRef.current;
    if (session) finish(session, false);
  }

  /** Niveau du micro, de 0 à 1 (animation du cercle vocal). */
  function getMicLevel(): number {
    return sessionRef.current ? levelRef.current : 0;
  }

  React.useEffect(() => {
    const counter = sessionCounter;
    const runs = runCounter;
    return () => {
      counter.current++;
      runs.current++;
      const session = sessionRef.current;
      if (session) {
        if (session.timer !== null) window.clearInterval(session.timer);
        if (session.recorder.state !== "inactive") session.recorder.stop();
        session.stream.getTracks().forEach((track) => track.stop());
      }
      audioRef.current?.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      void contextRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    unlock,
    startListening,
    submitListening,
    cancelListening,
    getMicLevel,
    startLiveSpeech,
    playMessage,
    resume,
    pause,
    seek,
    stopPlayback,
    reset,
    playback,
    durations,
    rate,
    setRate,
  };
}

export type VoiceEngine = ReturnType<typeof useVoiceEngine>;

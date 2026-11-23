"use client";

import * as React from "react";
import { VOICE_TUTOR_MAX_RECORDING_MS } from "@/lib/config/voice-tutor";

/**
 * Moteur audio du Professeur vocal, sans état React superflu :
 *  - écoute de l'élève au micro (MediaRecorder) avec détection de la fin de
 *    phrase (niveau sonore analysé par Web Audio) ;
 *  - écoute pendant que le professeur parle : si l'élève prend la parole, il
 *    est coupé (`startWatching`) et la phrase de l'élève est enregistrée ;
 *  - lecture des réponses : une réponse = une suite de passages audio, joués
 *    l'un après l'autre dès qu'ils arrivent (la voix démarre pendant que le
 *    professeur écrit encore la suite), puis réécoutables en entier.
 *
 * L'écoute peut rester ouverte plusieurs minutes de silence (`noSpeechTimeoutMs`) :
 * la conversation ne s'arrête pas pendant que l'élève réfléchit.
 *
 * Le micro reste ouvert pendant toute la conversation (jusqu'à `releaseMic`),
 * sur tous les appareils, iPhone et iPad compris : l'élève coupe la parole au
 * professeur simplement en parlant. Sur iPhone et iPad, Safari baisse un peu
 * la voix tant que le micro est ouvert (limite d'iOS) ; le micro y est ouvert
 * avant la première phrase du professeur (`prepareMic`), car l'ouvrir pendant
 * qu'il parle peut couper sa voix.
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
  onNoSpeech?: () => void;
  /** L'élève a pris la parole pendant que le professeur parlait. */
  onBargeIn?: () => void;
  /** Fausse alerte (toux, bruit bref) après `onBargeIn` : rien n'est envoyé. */
  onFalseStart?: () => void;
}

interface ListenOptions {
  /**
   * Silence toléré avant `onNoSpeech` (10 s par défaut). Pendant un long
   * silence, l'enregistrement repart régulièrement de zéro : seule la fin,
   * avec la question, est envoyée.
   */
  noSpeechTimeoutMs?: number;
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
const END_SILENCE_MS = 1200;
const NO_SPEECH_TIMEOUT_MS = 10_000;
/** Écoute patiente : après ce silence, l'enregistrement repart de zéro (le silence n'est jamais envoyé). */
const SILENT_RESTART_MS = 8000;
/** Envoi manuel : en dessous, l'enregistrement est jugé vide. */
const MIN_MANUAL_MS = 500;

/** Pendant que le professeur parle : voix soutenue qui lui coupe la parole. */
const BARGE_IN_MS = 350;
/** Seuil minimal de cette voix (le professeur s'entend un peu dans le micro). */
const BARGE_IN_MIN_LEVEL = 0.03;
/** Début de l'écoute : on mesure d'abord l'écho de la voix du professeur. */
const BARGE_IN_WARMUP_MS = 700;
/** Enregistrement commencé sur un bruit qui ne s'est pas confirmé : abandonné. */
const SPECULATIVE_DROP_MS = 600;
/** Parole totale en dessous : fausse alerte. */
const FALSE_START_MS = 450;

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

function canRecord(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

/** L'élève peut-il couper la parole au professeur en parlant ? (partout où le micro enregistre) */
function voiceInterruptSupported(): boolean {
  return canRecord();
}

const noSubscription = () => () => {};

/** Silence gardé à la fin de chaque passage (s) : un raccord comme une pause entre deux phrases. */
const SPEECH_TAIL_S = 0.12;
/** En dessous de ce niveau (≈ −40 dB), un échantillon compte comme du silence. */
const SILENCE_LEVEL = 0.01;
/** Fréquence de vérification de la fin de la voix pendant la lecture (ms). */
const CLIP_WATCH_MS = 30;

let clipDecoderInstance: OfflineAudioContext | null | undefined;

/** Contexte audio hors ligne, jamais relié aux haut-parleurs : sert à décoder les passages. */
function clipDecoder(): OfflineAudioContext | null {
  if (clipDecoderInstance === undefined) {
    try {
      const Ctor =
        window.OfflineAudioContext ??
        (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
          .webkitOfflineAudioContext;
      clipDecoderInstance = Ctor ? new Ctor(1, 1, 24000) : null;
    } catch {
      clipDecoderInstance = null;
    }
  }
  return clipDecoderInstance;
}

/**
 * Durée d'un passage et instant où la voix s'y termine (`end`). La synthèse
 * vocale ajoute 0,3 à 0,5 s de silence à la fin de chaque passage : ajouté au
 * raccord, il hachait la parole. Chaque passage s'arrête donc peu après sa
 * dernière syllabe, et sa durée affichée s'arrête au même endroit.
 */
async function measureClip(blob: Blob): Promise<{ duration: number; end?: number }> {
  const context = clipDecoder();
  if (context) {
    try {
      const buffer = await context.decodeAudioData(await blob.arrayBuffer());
      const data = buffer.getChannelData(0);
      let last = data.length - 1;
      while (last > 0 && Math.abs(data[last]) < SILENCE_LEVEL) last--;
      if (last > 0 && buffer.duration > 0) {
        const end = Math.min(buffer.duration, last / buffer.sampleRate + SPEECH_TAIL_S);
        return { duration: end, end };
      }
    } catch {
      // Décodage impossible (ancien navigateur) : durée lue dans les métadonnées.
    }
  }
  return { duration: await probeDuration(blob) };
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

/** Micro ouvert : flux et analyse du niveau sonore. */
interface MicInput {
  stream: MediaStream;
  analyser: AnalyserNode | null;
  samples: Uint8Array<ArrayBuffer>;
}

interface MicSession {
  id: number;
  mode: "listen" | "watch";
  input: MicInput;
  /** Enregistrement en cours (dès l'ouverture en écoute ; dès un bruit en veille). */
  recorder: MediaRecorder | null;
  chunks: Blob[];
  startedAt: number;
  speechStarted: boolean;
  timer: number | null;
  handlers: ListenHandlers;
  finishing: boolean;
  /** Veille (`watch`) : reprise sans coupure par la veille ou l'écoute suivante. */
  control?: WatchControl;
}

interface WatchControl {
  /** Nouvelle phase (page suivante, voix qui reprend) : écho remesuré, sauf si l'élève parle déjà. */
  rewarm: () => void;
  /** L'élève parle déjà : sa phrase devient la question. `false` s'il ne parle pas. */
  adopt: () => boolean;
}

interface Clip {
  promise: Promise<Blob | null>;
  /** `undefined` tant que le passage n'est pas arrivé ; `null` s'il a échoué. */
  blob?: Blob | null;
  duration?: number;
  /** Fin de la voix dans le passage (s), silence final retiré ; inconnue si le décodage échoue. */
  end?: number;
}

interface Sequence {
  id: string;
  clips: Clip[];
  /** Plus aucun passage ne sera ajouté. */
  closed: boolean;
  wake: (() => void) | null;
  /** Appelé quand un passage commence à être joué. */
  onClipStart?: (index: number) => void;
}

export function useVoiceEngine() {
  const contextRef = React.useRef<AudioContext | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const unlockedRef = React.useRef(false);
  const micRef = React.useRef<MicInput | null>(null);
  const micPromiseRef = React.useRef<Promise<MicInput> | null>(null);
  const sessionRef = React.useRef<MicSession | null>(null);
  const sessionCounter = React.useRef(0);
  const levelRef = React.useRef(0);
  /** Bruit de fond mesuré à la dernière écoute (seuil de parole). */
  const noiseFloorRef = React.useRef<number | null>(null);

  const sequencesRef = React.useRef(new Map<string, Sequence>());
  /** Lecture en cours : séquence, passage et numéro de lecture (annulation). */
  const currentRef = React.useRef<{ seq: Sequence; index: number; run: number } | null>(null);
  const runCounter = React.useRef(0);
  const settleClipRef = React.useRef<((outcome: PlayOutcome) => void) | null>(null);
  /** Surveillance de la fin de la voix du passage en cours (`setInterval`). */
  const clipWatchRef = React.useRef<number | null>(null);
  /** Où reprendre une réponse mise en pause (ou repositionnée). */
  const resumeRef = React.useRef<{ id: string; index: number; offset: number } | null>(null);
  const objectUrlRef = React.useRef<string | null>(null);
  const rateRef = React.useRef(1);

  const [playback, setPlayback] = React.useState<Playback | null>(null);
  /** Durée totale des réponses entièrement chargées, affichée même à l'arrêt. */
  const [durations, setDurations] = React.useState<Record<string, number>>({});
  const [rate, setRateState] = React.useState(1);

  const canInterruptByVoice = React.useSyncExternalStore(
    noSubscription,
    voiceInterruptSupported,
    () => false,
  );

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

  function stopClipWatch() {
    if (clipWatchRef.current !== null) {
      window.clearInterval(clipWatchRef.current);
      clipWatchRef.current = null;
    }
  }

  function settleClip(outcome: PlayOutcome) {
    stopClipWatch();
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
      if (clip && clip.end === undefined && Number.isFinite(audio.duration) && audio.duration > 0) {
        clip.duration = audio.duration;
      }
      publish();
    });
    audio.addEventListener("ended", () => settleClip("ended"));
    // Voix mise en pause par le système et non par nous (iPhone, iPad : micro
    // qui se rouvre, notification) : on la relance, sinon la réponse resterait
    // bloquée. Nos propres pauses libèrent d'abord le passage (`settleClip`).
    audio.addEventListener("pause", () => {
      if (!settleClipRef.current || audio.ended) return;
      window.setTimeout(() => {
        if (settleClipRef.current && audio.paused && !audio.ended) {
          audio.play().catch(() => settleClip("blocked"));
        }
      }, 300);
    });
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
      if (blob) Object.assign(clip, await measureClip(blob));
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
      stopClipWatch();
      settleClipRef.current = resolve;
      // Voix terminée : passage suivant tout de suite, sans jouer le silence final
      // (`end` peut arriver un instant après le début de la lecture).
      const clip = seq.clips[index];
      clipWatchRef.current = window.setInterval(() => {
        if (clip?.end !== undefined && audio.currentTime >= clip.end) {
          audio.pause();
          settleClip("ended");
        }
      }, CLIP_WATCH_MS);
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
      seq.onClipStart?.(index);
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
  function startLiveSpeech(id: string, onClipStart?: (index: number) => void): LiveSpeech {
    const seq: Sequence = { id, clips: [], closed: false, wake: null, onClipStart };
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
    onClipStart?: (index: number) => void,
  ): Promise<PlayOutcome> {
    let seq = loadedSequence(id, expected);
    if (!seq) {
      seq = { id, clips: [], closed: false, wake: null };
      sequencesRef.current.set(id, seq);
      for (const clip of loadClips()) addClip(seq, clip);
      seq.closed = true;
    }
    seq.onClipStart = onClipStart;
    return run(seq, 0, 0);
  }

  /**
   * Reprend une réponse là où elle s'était arrêtée (pause, interruption). Les
   * passages qui n'avaient pas encore été chargés (réponse coupée pendant
   * qu'elle s'écrivait) sont demandés à `loadClip`.
   */
  function resumeMessage(
    id: string,
    expected: number,
    loadClip: (index: number) => Promise<Blob | null>,
    onClipStart?: (index: number) => void,
  ): Promise<PlayOutcome> | null {
    const position = resumeRef.current;
    const seq = sequencesRef.current.get(id);
    if (!position || position.id !== id || !seq || seq.clips.length > expected) return null;
    for (let index = seq.clips.length; index < expected; index++) addClip(seq, loadClip(index));
    seq.closed = true;
    seq.onClipStart = onClipStart;
    recordDuration(seq);
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
   * était en cours de lecture : l'appelant la relance alors avec `resumeMessage`.
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

  /** Ouvre le micro, ou réutilise celui déjà ouvert pendant la conversation. */
  function openMic(): Promise<MicInput> {
    const current = micRef.current;
    if (current && current.stream.getAudioTracks().some((track) => track.readyState === "live")) {
      return Promise.resolve(current);
    }
    if (current) closeMic();
    micPromiseRef.current ??= (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (error) {
        throw toMicError(error);
      }
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
      const input: MicInput = {
        stream,
        analyser,
        samples: new Uint8Array(new ArrayBuffer(analyser?.fftSize ?? 0)),
      };
      micRef.current = input;
      return input;
    })().finally(() => {
      micPromiseRef.current = null;
    });
    return micPromiseRef.current;
  }

  /**
   * Ouvre le micro dès le début de la conversation, avant que le professeur
   * parle (l'autorisation est demandée tout de suite). Sur iPhone et iPad,
   * l'ouvrir pendant qu'il parle peut couper sa voix.
   */
  async function prepareMic(): Promise<void> {
    if (!canRecord()) throw new MicError("unsupported");
    await openMic();
  }

  function closeMic() {
    const input = micRef.current;
    micRef.current = null;
    input?.stream.getTracks().forEach((track) => track.stop());
    levelRef.current = 0;
  }

  /** Niveau sonore instantané du micro (RMS, 0 à ~1). */
  function readLevel(input: MicInput): number | null {
    if (!input.analyser || contextRef.current?.state !== "running") return null;
    input.analyser.getByteTimeDomainData(input.samples);
    let sum = 0;
    for (const value of input.samples) {
      const centered = (value - 128) / 128;
      sum += centered * centered;
    }
    const rms = Math.sqrt(sum / input.samples.length);
    levelRef.current = levelRef.current * 0.6 + Math.min(1, rms * 9) * 0.4;
    return rms;
  }

  /** Seuil de parole déduit du bruit de fond. */
  function speechThreshold(floor: number): number {
    return Math.min(0.09, Math.max(0.014, floor * 2.8));
  }

  function startRecorder(session: MicSession): MediaRecorder | null {
    const mimeType = pickRecorderType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(session.input.stream, mimeType ? { mimeType } : undefined);
    } catch {
      return null;
    }
    const chunks: Blob[] = [];
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    recorder.start(250);
    session.recorder = recorder;
    session.chunks = chunks;
    return recorder;
  }

  /** Enregistrement commencé sur un bruit non confirmé : jeté. */
  function dropRecorder(session: MicSession) {
    const recorder = session.recorder;
    session.recorder = null;
    session.chunks = [];
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function finish(session: MicSession, submit: boolean, reason?: "no-speech" | "false-start") {
    if (session.finishing) return;
    session.finishing = true;
    if (session.timer !== null) {
      window.clearInterval(session.timer);
      session.timer = null;
    }
    const recorder = session.recorder;
    const deliver = () => {
      if (sessionRef.current === session) sessionRef.current = null;
      levelRef.current = 0;
      if (session.id !== sessionCounter.current) return;
      if (submit) {
        const type = recorder?.mimeType || session.chunks[0]?.type || "audio/webm";
        session.handlers.onUtterance(new Blob(session.chunks, { type }));
      } else if (reason === "no-speech") {
        session.handlers.onNoSpeech?.();
      } else if (reason === "false-start") {
        session.handlers.onFalseStart?.();
      }
    };
    if (!recorder || recorder.state === "inactive") {
      deliver();
      return;
    }
    recorder.addEventListener("stop", deliver, { once: true });
    recorder.stop();
  }

  /** Ouvre (ou réutilise) le micro pour une nouvelle session ; `null` si annulée entre-temps. */
  async function beginSession(
    mode: MicSession["mode"],
    handlers: ListenHandlers,
  ): Promise<MicSession | null> {
    cancelListening();
    const id = ++sessionCounter.current;
    const input = await openMic();
    if (id !== sessionCounter.current) return null;
    const session: MicSession = {
      id,
      mode,
      input,
      recorder: null,
      chunks: [],
      startedAt: performance.now(),
      speechStarted: false,
      timer: null,
      handlers,
      finishing: false,
    };
    sessionRef.current = session;
    return session;
  }

  /**
   * Écoute la question de l'élève jusqu'à la fin de sa phrase. Avec un long
   * `noSpeechTimeoutMs`, l'écoute reste ouverte pendant ses silences (il
   * réfléchit, relit son cours) sans que ce silence soit envoyé.
   */
  async function startListening(
    handlers: ListenHandlers,
    options: ListenOptions = {},
  ): Promise<void> {
    if (!canRecord()) throw new MicError("unsupported");
    // L'élève a commencé à parler juste avant la fin de la réponse : on garde
    // son enregistrement au lieu de le jeter (et de calibrer le bruit sur sa voix).
    const current = sessionRef.current;
    if (current?.mode === "watch" && !current.finishing && current.control?.adopt()) {
      current.handlers = {
        ...handlers,
        // Ce n'était qu'un bruit : écoute normale de sa question.
        onFalseStart: () => {
          void startListening(handlers, options).catch(() => handlers.onNoSpeech?.());
        },
      };
      return;
    }
    const session = await beginSession("listen", handlers);
    if (!session) return;
    if (!startRecorder(session)) {
      sessionRef.current = null;
      throw new MicError("unsupported");
    }

    const noSpeechTimeout = options.noSpeechTimeoutMs ?? NO_SPEECH_TIMEOUT_MS;
    const noise: number[] = [];
    let threshold = 0;
    let voicedMs = 0;
    let silentMs = 0;
    // Début de l'enregistrement en cours (il repart de zéro pendant un long silence).
    let recordingStart = session.startedAt;

    session.timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - session.startedAt;
      if (now - recordingStart >= VOICE_TUTOR_MAX_RECORDING_MS) {
        finish(session, true);
        return;
      }
      const rms = readLevel(session.input);
      if (rms === null) return;

      if (elapsed < CALIBRATION_MS) {
        noise.push(rms);
        return;
      }
      if (!threshold) {
        const sorted = [...noise].sort((a, b) => a - b);
        const floor = sorted[Math.floor(sorted.length / 2)] ?? 0;
        noiseFloorRef.current = floor;
        threshold = speechThreshold(floor);
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
      } else if (!session.speechStarted && elapsed >= noSpeechTimeout) {
        finish(session, false, "no-speech");
      } else if (
        !session.speechStarted &&
        voicedMs === 0 &&
        now - recordingStart >= SILENT_RESTART_MS
      ) {
        // Long silence : l'enregistrement repart de zéro, l'écoute continue.
        dropRecorder(session);
        if (!startRecorder(session)) {
          finish(session, false, "no-speech");
          return;
        }
        recordingStart = now;
      }
    }, TICK_MS);
  }

  /**
   * Pendant que le professeur parle : le micro reste à l'écoute. Si l'élève
   * prend la parole (voix nettement au-dessus de l'écho du professeur pendant
   * `BARGE_IN_MS`), `onBargeIn` est appelé — l'appelant coupe la voix — puis
   * sa phrase est enregistrée jusqu'à la fin (`onUtterance`), ou abandonnée si
   * ce n'était qu'un bruit (`onFalseStart`). L'enregistrement commence dès le
   * premier bruit, pour ne pas perdre le début de la phrase.
   *
   * Une veille déjà active (passage d'une page à la suivante, réflexion puis
   * parole) est reprise telle quelle : relancée, elle jetait la phrase que
   * l'élève avait commencée et prenait sa voix pour l'écho du professeur —
   * justement au moment, entre deux pages, où il prend la parole.
   *
   * Renvoie `false` si ce n'est pas possible (micro indisponible).
   */
  async function startWatching(handlers: ListenHandlers): Promise<boolean> {
    if (!voiceInterruptSupported()) return false;
    const current = sessionRef.current;
    if (current?.mode === "watch" && !current.finishing && current.control) {
      current.handlers = handlers;
      current.control.rewarm();
      return true;
    }
    let session: MicSession | null;
    try {
      session = await beginSession("watch", handlers);
    } catch {
      return false;
    }
    if (!session || !session.input.analyser) return false;
    const watched = session;

    const listenThreshold = speechThreshold(noiseFloorRef.current ?? 0.006);
    let echo = 0;
    let voicedMs = 0;
    let quietMs = 0;
    let silentMs = 0;
    let spokenMs = 0;
    let interruptedAt = 0;
    let warmupStart = watched.startedAt;

    watched.control = {
      rewarm: () => {
        if (watched.recorder || watched.speechStarted) return;
        warmupStart = performance.now();
        echo = 0;
        voicedMs = 0;
      },
      adopt: () => {
        if (!watched.recorder || watched.finishing) return false;
        if (!watched.speechStarted) {
          watched.speechStarted = true;
          interruptedAt = performance.now();
          spokenMs = voicedMs;
        }
        return true;
      },
    };

    watched.timer = window.setInterval(() => {
      const now = performance.now();
      const rms = readLevel(watched.input);
      if (rms === null) return;

      if (!watched.speechStarted) {
        // Écho de la voix du professeur : suivi lent, pour ne pas confondre.
        if (now - warmupStart < BARGE_IN_WARMUP_MS && !watched.recorder) {
          echo = Math.max(echo * 0.8, rms);
          return;
        }
        const threshold = Math.max(BARGE_IN_MIN_LEVEL, listenThreshold * 2, echo * 3);
        if (rms > threshold) {
          voicedMs += TICK_MS;
          quietMs = 0;
          if (!watched.recorder) startRecorder(watched);
          echo = echo * 0.995 + rms * 0.005;
        } else {
          voicedMs = Math.max(0, voicedMs - TICK_MS / 2);
          echo = echo * 0.95 + rms * 0.05;
          if (watched.recorder) {
            quietMs += TICK_MS;
            if (voicedMs === 0 && quietMs >= SPECULATIVE_DROP_MS) dropRecorder(watched);
          }
        }
        if (voicedMs >= BARGE_IN_MS && watched.recorder) {
          watched.speechStarted = true;
          interruptedAt = now;
          spokenMs = voicedMs;
          watched.handlers.onBargeIn?.();
        }
        return;
      }

      // L'élève a pris la parole : on l'écoute jusqu'à la fin de sa phrase.
      if (now - interruptedAt >= VOICE_TUTOR_MAX_RECORDING_MS) {
        finish(watched, true);
        return;
      }
      if (rms > listenThreshold) {
        spokenMs += TICK_MS;
        silentMs = 0;
      } else {
        silentMs += TICK_MS;
      }
      if (silentMs >= END_SILENCE_MS) {
        const real = spokenMs >= FALSE_START_MS;
        finish(watched, real, real ? undefined : "false-start");
      }
    }, TICK_MS);
    return true;
  }

  /**
   * Envoi immédiat de la question en cours (appui sur le micro pendant
   * l'écoute). `false` : enregistrement trop court, abandonné sans envoi.
   */
  function submitListening(): boolean {
    const session = sessionRef.current;
    if (!session || session.finishing || !session.recorder) return false;
    const submit =
      session.speechStarted || performance.now() - session.startedAt >= MIN_MANUAL_MS;
    finish(session, submit);
    return submit;
  }

  /** Abandon de l'écoute en cours, sans rien envoyer (le micro reste ouvert). */
  function cancelListening() {
    sessionCounter.current++;
    const session = sessionRef.current;
    if (session) finish(session, false);
  }

  /** Fin de la conversation : écoute annulée et micro fermé. */
  function releaseMic() {
    cancelListening();
    closeMic();
  }

  /** Niveau du micro, de 0 à 1 (animation du cercle vocal). */
  function getMicLevel(): number {
    return sessionRef.current ? levelRef.current : 0;
  }

  React.useEffect(() => {
    const counter = sessionCounter;
    const runs = runCounter;
    const clipWatch = clipWatchRef;
    return () => {
      counter.current++;
      runs.current++;
      if (clipWatch.current !== null) window.clearInterval(clipWatch.current);
      const session = sessionRef.current;
      if (session) {
        if (session.timer !== null) window.clearInterval(session.timer);
        if (session.recorder && session.recorder.state !== "inactive") session.recorder.stop();
      }
      micRef.current?.stream.getTracks().forEach((track) => track.stop());
      audioRef.current?.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      void contextRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    unlock,
    prepareMic,
    startListening,
    startWatching,
    submitListening,
    cancelListening,
    releaseMic,
    getMicLevel,
    canInterruptByVoice,
    startLiveSpeech,
    playMessage,
    resumeMessage,
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

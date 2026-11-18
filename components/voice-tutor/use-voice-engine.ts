"use client";

import * as React from "react";
import { VOICE_TUTOR_MAX_RECORDING_MS } from "@/lib/config/voice-tutor";

/**
 * Moteur audio du Professeur vocal, sans état React superflu :
 *  - enregistrement de la question au micro (MediaRecorder) avec détection de
 *    la fin de phrase (niveau sonore analysé par Web Audio) ;
 *  - lecture des réponses (un seul élément <audio>, une réponse à la fois).
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
  currentTime: number;
  duration: number;
  playing: boolean;
}

export type PlayOutcome = "ended" | "stopped" | "blocked";

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

export function useVoiceEngine() {
  const contextRef = React.useRef<AudioContext | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const unlockedRef = React.useRef(false);
  const sessionRef = React.useRef<RecordingSession | null>(null);
  const sessionCounter = React.useRef(0);
  const levelRef = React.useRef(0);

  const objectUrlRef = React.useRef<string | null>(null);
  const playbackIdRef = React.useRef<string | null>(null);
  const resolvePlayRef = React.useRef<((outcome: PlayOutcome) => void) | null>(null);
  const rateRef = React.useRef(1);
  const [playback, setPlayback] = React.useState<Playback | null>(null);
  /** Durée des réponses déjà chargées, affichée même à l'arrêt. */
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

  function settlePlay(outcome: PlayOutcome) {
    const resolve = resolvePlayRef.current;
    resolvePlayRef.current = null;
    resolve?.(outcome);
  }

  function ensurePlayer(): HTMLAudioElement {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio();
    audio.preload = "auto";
    const sync = () => {
      const id = playbackIdRef.current;
      if (!id) return;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setPlayback({
        id,
        currentTime: audio.currentTime,
        duration,
        playing: !audio.paused && !audio.ended,
      });
      if (duration > 0) {
        setDurations((known) => (known[id] === duration ? known : { ...known, [id]: duration }));
      }
    };
    for (const event of ["timeupdate", "durationchange", "loadedmetadata", "play", "pause"]) {
      audio.addEventListener(event, sync);
    }
    audio.addEventListener("ended", () => {
      sync();
      settlePlay("ended");
    });
    audio.addEventListener("error", () => {
      if (!playbackIdRef.current) return;
      sync();
      settlePlay("blocked");
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

  function isListening(): boolean {
    return Boolean(sessionRef.current && !sessionRef.current.finishing);
  }

  /** Niveau du micro, de 0 à 1 (animation du cercle vocal). */
  function getMicLevel(): number {
    return sessionRef.current ? levelRef.current : 0;
  }

  /** Lit une réponse ; se résout à la fin, à l'arrêt, ou si le navigateur bloque la lecture. */
  function play(id: string, audioBlob: Blob): Promise<PlayOutcome> {
    const audio = ensurePlayer();
    settlePlay("stopped");
    audio.pause();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(audioBlob);
    objectUrlRef.current = url;
    playbackIdRef.current = id;
    audio.src = url;
    audio.defaultPlaybackRate = rateRef.current;
    audio.playbackRate = rateRef.current;
    setPlayback({ id, currentTime: 0, duration: 0, playing: true });

    return new Promise<PlayOutcome>((resolve) => {
      resolvePlayRef.current = resolve;
      audio.play().catch(() => {
        setPlayback({ id, currentTime: 0, duration: 0, playing: false });
        settlePlay("blocked");
      });
    });
  }

  function pause() {
    audioRef.current?.pause();
    settlePlay("stopped");
  }

  /** Reprend la réponse déjà chargée (lecture manuelle depuis sa bulle). */
  function resume(id: string): boolean {
    const audio = audioRef.current;
    if (!audio || playbackIdRef.current !== id || !objectUrlRef.current) return false;
    if (audio.ended) audio.currentTime = 0;
    void audio.play().catch(() => {});
    return true;
  }

  function seek(id: string, ratio: number) {
    const audio = audioRef.current;
    if (!audio || playbackIdRef.current !== id || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.min(audio.duration, Math.max(0, ratio * audio.duration));
  }

  function stopPlayback() {
    const audio = audioRef.current;
    if (audio && !audio.paused) audio.pause();
    settlePlay("stopped");
  }

  function setRate(next: number) {
    rateRef.current = next;
    setRateState(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  React.useEffect(() => {
    const counter = sessionCounter;
    return () => {
      counter.current++;
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
    isListening,
    getMicLevel,
    play,
    pause,
    resume,
    seek,
    stopPlayback,
    playback,
    durations,
    rate,
    setRate,
  };
}

export type VoiceEngine = ReturnType<typeof useVoiceEngine>;

"use client";

import * as React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  Check,
  EllipsisVertical,
  FileSearch,
  FileText,
  FileUp,
  LoaderCircle,
  MessageCircle,
  Mic,
  Repeat,
  RotateCcw,
  Send,
  Square,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatBytes } from "@/lib/utils/format";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InlineErrorBanner } from "@/components/common/inline-error-banner";
import { InsufficientCreditsBanner } from "@/components/credits/insufficient-credits-banner";
import {
  VOICE_TUTOR_GREETING,
  VOICE_TUTOR_MAX_HISTORY,
  VOICE_TUTOR_MAX_PAGES,
  VOICE_TUTOR_MAX_PDF_BYTES,
  VOICE_TUTOR_MAX_UPLOAD_CHARS,
  VOICE_TUTOR_WELCOME,
  VOICE_TUTOR_LANGUAGES_COOKIE,
  type VoiceTutorLanguage,
} from "@/lib/config/voice-tutor";
import {
  PdfOpenError,
  extractPagesText,
  isScannedPageText,
  openPdf,
  readScannedPages,
} from "./pdf-document";
import { PdfViewer, type PdfViewerHandle } from "./pdf-viewer";
import { detectLanguage } from "./detect-language";
import {
  deleteSavedDocument,
  loadSavedDocument,
  saveDocument,
  saveDocumentPage,
} from "./saved-document";
import { LanguagePicker } from "./language-picker";
import {
  MicError,
  useVoiceEngine,
  type LiveSpeech,
  type MicFailure,
  type PlayOutcome,
} from "./use-voice-engine";
import { TeacherBadge, VoiceOrb, type VoicePhase } from "./voice-orb";
import {
  PLAYBACK_RATES,
  TutorMessageBubble,
  type SpeechSegment,
  type TutorMessage,
} from "./tutor-message";

/** Réponse du professeur : au-delà, la requête est abandonnée. */
const REQUEST_TIMEOUT_MS = 75_000;

/** Passages audio demandés en même temps (dans l'ordre de la réponse). */
const SPEECH_CONCURRENCY = 2;

interface DocumentMeta {
  key: number;
  name: string;
  size: number;
  pageCount: number;
  /** Page affichée à l'ouverture (cours retrouvé : là où l'élève en était). */
  initialPage: number;
}

type DocumentState =
  | { status: "empty" }
  | { status: "opening"; name: string }
  | {
      status: "reading";
      doc: PDFDocumentProxy;
      meta: DocumentMeta;
      done: number;
      total: number;
      scanned: boolean;
    }
  | {
      status: "ready";
      doc: PDFDocumentProxy;
      meta: DocumentMeta;
      pageTexts: string[];
      hasText: boolean;
    };

type ReadyDocument = Extract<DocumentState, { status: "ready" }>;

interface PanelError {
  message: string;
  code?: string;
}

/** Évènements du flux NDJSON de `POST /api/ai/voice-tutor`. */
type TutorEvent =
  | { type: "question"; text: string }
  | {
      type: "focus";
      page: number | null;
      quote: string | null;
      language: VoiceTutorLanguage | null;
      continues: boolean;
    }
  | { type: "delta"; text: string }
  | {
      type: "speech";
      text: string;
      token: string;
      original?: boolean;
      language?: VoiceTutorLanguage;
    }
  | { type: "done"; answer: string; pages: number[] }
  | { type: "error"; message: string };

/** Ce que l'élève a coupé en prenant la parole (repris si ce n'était qu'un bruit). */
type Interrupted = { kind: "answer"; messageId: string } | { kind: "lesson" };

let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `m${Date.now().toString(36)}${messageCounter}`;
}

function welcomeMessage(language: VoiceTutorLanguage): TutorMessage {
  return {
    id: `welcome-${language}`,
    role: "assistant",
    content: VOICE_TUTOR_WELCOME[language],
    language,
    welcome: true,
  };
}

/** Passages à prononcer d'un message (accueil et salutation : un seul, sans jeton). */
function segmentsOf(message: TutorMessage): SpeechSegment[] {
  return message.segments?.length ? message.segments : [{ text: message.content }];
}

/**
 * Texte du cours joint à la question : tout le cours s'il tient dans la
 * limite, sinon les pages les plus proches de la page affichée.
 */
function contextPages(pageTexts: string[], currentPage: number) {
  const pages = pageTexts
    .map((text, index) => ({ page: index + 1, text }))
    .filter((page) => page.text.trim().length > 0);
  const total = pages.reduce((sum, page) => sum + page.text.length, 0);
  if (total <= VOICE_TUTOR_MAX_UPLOAD_CHARS) return pages;

  const byDistance = [...pages].sort(
    (a, b) => Math.abs(a.page - currentPage) - Math.abs(b.page - currentPage),
  );
  const picked: typeof pages = [];
  let used = 0;
  for (const page of byDistance) {
    if (used + page.text.length > VOICE_TUTOR_MAX_UPLOAD_CHARS) continue;
    picked.push(page);
    used += page.text.length;
  }
  return picked.sort((a, b) => a.page - b.page);
}

/** JSON compressé en gzip (texte du cours : ~4 fois plus léger à envoyer), si le navigateur le permet. */
async function gzipJson(json: string): Promise<Blob | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
    return await new Response(stream).blob();
  } catch {
    return null;
  }
}

/** Voix d'un texte du professeur (jeton : texte signé par le serveur). */
async function requestSpeech(
  text: string,
  language: VoiceTutorLanguage,
  token?: string,
): Promise<Blob | null> {
  try {
    const response = await fetch("/api/ai/voice-tutor/speech", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, language, token }),
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

function audioFileName(type: string): string {
  const base = type.split(";")[0];
  const extension =
    base === "audio/mp4" ? "mp4" : base === "audio/ogg" ? "ogg" : base === "audio/aac" ? "m4a" : "webm";
  return `question.${extension}`;
}

/** Lit un flux NDJSON ligne par ligne. */
async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<TutorEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const parse = (line: string): TutorEvent | null => {
    try {
      return JSON.parse(line) as TutorEvent;
    } catch {
      return null;
    }
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const event = parse(buffer.slice(0, newline).trim());
      buffer = buffer.slice(newline + 1);
      if (event) yield event;
      newline = buffer.indexOf("\n");
    }
  }
  const last = parse((buffer + decoder.decode()).trim());
  if (last) yield last;
}

/**
 * Page « Professeur vocal » : PDF du cours à gauche, conversation 100 % orale
 * à droite, deux langues en haut. Le PDF est lu dans le navigateur (et gardé
 * sur l'appareil jusqu'à ce que l'élève le retire) ; chaque question part avec
 * le texte du cours vers `POST /api/ai/voice-tutor`, dont la réponse arrive en
 * flux : le texte s'affiche au fil de l'écriture et chaque passage est
 * prononcé dès qu'il est prêt (`POST /api/ai/voice-tutor/speech`).
 *
 * Conversation mains libres : au premier appui, le professeur salue l'élève,
 * puis le micro se rouvre après chaque réponse. Pendant qu'il parle, l'élève
 * peut lui couper la parole en parlant (ou en appuyant sur le micro sur
 * iPhone). Explication page par page : le professeur enchaîne seul les pages
 * (le PDF défile avec lui) jusqu'à la fin du cours ou jusqu'à ce que l'élève
 * l'interrompe.
 */
export function VoiceTutorWorkspace({
  userId,
  initialDocumentLanguage,
  initialReplyLanguage,
}: {
  userId: string;
  initialDocumentLanguage: VoiceTutorLanguage;
  initialReplyLanguage: VoiceTutorLanguage;
}) {
  const { dict, locale } = useI18n();
  const t = dict.voiceTutor;
  const engine = useVoiceEngine();

  const [documentLanguage, setDocumentLanguage] =
    React.useState<VoiceTutorLanguage>(initialDocumentLanguage);
  const [replyLanguage, setReplyLanguage] =
    React.useState<VoiceTutorLanguage>(initialReplyLanguage);

  const [docState, setDocState] = React.useState<DocumentState>({ status: "empty" });
  const [docError, setDocError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [dragging, setDragging] = React.useState(false);

  const [messages, setMessages] = React.useState<TutorMessage[]>([]);
  const [phase, setPhaseState] = React.useState<VoicePhase>("idle");
  const [error, setError] = React.useState<PanelError | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [mobileTab, setMobileTab] = React.useState<"document" | "teacher">("document");
  /** Explication page par page : page que le professeur prépare (il « tourne la page »). */
  const [preparingPage, setPreparingPage] = React.useState<number | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const viewerRef = React.useRef<PdfViewerHandle>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const readAbortRef = React.useRef<AbortController | null>(null);
  const requestAbortRef = React.useRef<AbortController | null>(null);
  const docKeyRef = React.useRef(0);
  // Mains libres : le micro se rouvre après chaque réponse prononcée.
  const conversationRef = React.useRef(false);
  // Réponse dont les passages sont prononcés au fil de l'eau (coupée si l'élève
  // interrompt ou arrête : la suite s'affiche sans être lue).
  const liveAnswerRef = React.useRef<string | null>(null);
  // Message en cours de lecture à voix haute.
  const speakingRef = React.useRef<string | null>(null);
  // Suite d'explication demandée, pas encore prononcée (annulable).
  const continuationRef = React.useRef(false);
  // Explication page par page : dernière page entièrement expliquée.
  const lessonPageRef = React.useRef<number | null>(null);
  // Salutation déjà prononcée dans cette conversation.
  const greetedRef = React.useRef(false);
  const interruptedRef = React.useRef<Interrupted | null>(null);
  // « Tour » de parole : chaque nouvelle action (écouter, arrêter, lire une
  // réponse, couper la parole) invalide les suites des actions précédentes.
  const turnRef = React.useRef(0);
  const speechQueueRef = React.useRef<{ active: number; waiting: (() => void)[] }>({
    active: 0,
    waiting: [],
  });
  // Voix des salutations, préparées dès que le cours est prêt.
  const greetingAudioRef = React.useRef(new Map<string, Promise<Blob | null>>());

  // Dernières valeurs, lues par les rappels asynchrones (fin de phrase, audio).
  const phaseRef = React.useRef<VoicePhase>("idle");
  const docRef = React.useRef<DocumentState>(docState);
  const messagesRef = React.useRef<TutorMessage[]>(messages);
  const pageRef = React.useRef(page);
  const languagesRef = React.useRef({ documentLanguage, replyLanguage });
  React.useEffect(() => {
    docRef.current = docState;
    messagesRef.current = messages;
    pageRef.current = page;
    languagesRef.current = { documentLanguage, replyLanguage };
  });

  const setPhase = React.useCallback(
    (next: VoicePhase) => {
      phaseRef.current = next;
      setPhaseState(next);
      // Fin de la conversation : le micro se ferme.
      if (next === "idle") engine.releaseMic();
    },
    [engine],
  );

  // Langues mémorisées un an sur cet appareil (cookie relu par la page serveur,
  // donc affichées dès le premier rendu).
  function saveLanguages(document: VoiceTutorLanguage, reply: VoiceTutorLanguage) {
    window.document.cookie = `${VOICE_TUTOR_LANGUAGES_COOKIE}=${document}.${reply}; path=/; max-age=31536000; samesite=lax`;
  }

  function changeDocumentLanguage(next: VoiceTutorLanguage) {
    setDocumentLanguage(next);
    saveLanguages(next, replyLanguage);
  }

  function changeReplyLanguage(next: VoiceTutorLanguage) {
    setReplyLanguage(next);
    saveLanguages(documentLanguage, next);
    // L'accueil, s'il est seul, passe dans la nouvelle langue.
    setMessages((current) =>
      current.length === 1 && current[0].welcome ? [welcomeMessage(next)] : current,
    );
  }

  const playback = engine.playback;

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, phase]);

  // Fermeture de la page : arrête la lecture du PDF et libère sa mémoire (le
  // cours reste enregistré sur l'appareil).
  React.useEffect(() => {
    return () => {
      readAbortRef.current?.abort();
      requestAbortRef.current?.abort();
      const current = docRef.current;
      if (current.status === "reading" || current.status === "ready") void current.doc.loadingTask.destroy();
    };
  }, []);

  // Retour sur la page : le cours enregistré sur l'appareil est rouvert, avec
  // son texte déjà lu, à la page où l'élève en était.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadSavedDocument(userId);
      if (cancelled || !saved || docRef.current.status !== "empty") return;
      const controller = new AbortController();
      readAbortRef.current = controller;
      setDocState({ status: "opening", name: saved.name });
      let doc: PDFDocumentProxy;
      try {
        doc = await openPdf(new File([saved.file], saved.name, { type: "application/pdf" }));
      } catch {
        if (controller.signal.aborted || cancelled) return;
        setDocState({ status: "empty" });
        void deleteSavedDocument(userId);
        return;
      }
      if (controller.signal.aborted || cancelled) {
        void doc.loadingTask.destroy();
        return;
      }
      if (doc.numPages !== saved.pageTexts.length) {
        void doc.loadingTask.destroy();
        setDocState({ status: "empty" });
        void deleteSavedDocument(userId);
        return;
      }
      docKeyRef.current += 1;
      const initialPage = Math.min(doc.numPages, Math.max(1, Math.round(saved.page) || 1));
      const hasText = saved.pageTexts.some((text) => !isScannedPageText(text));
      setPage(initialPage);
      setDocState({
        status: "ready",
        doc,
        meta: {
          key: docKeyRef.current,
          name: saved.name,
          size: saved.size,
          pageCount: doc.numPages,
          initialPage,
        },
        pageTexts: saved.pageTexts,
        hasText,
      });
      setMessages(hasText ? [welcomeMessage(languagesRef.current.replyLanguage)] : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Page affichée mémorisée avec le cours (reprise au même endroit).
  const savedPageKey = docState.status === "ready" && docState.hasText ? docState.meta.key : 0;
  React.useEffect(() => {
    if (!savedPageKey) return;
    const timer = window.setTimeout(() => void saveDocumentPage(userId, page), 600);
    return () => window.clearTimeout(timer);
  }, [page, savedPageKey, userId]);

  // ───────────────────────────── Document ─────────────────────────────

  function stopConversation() {
    turnRef.current += 1;
    conversationRef.current = false;
    liveAnswerRef.current = null;
    speakingRef.current = null;
    interruptedRef.current = null;
    if (continuationRef.current) {
      continuationRef.current = false;
      requestAbortRef.current?.abort();
    }
    setPreparingPage(null);
    engine.cancelListening();
    engine.stopPlayback();
    setPhase("idle");
  }

  function clearDocument() {
    stopConversation();
    requestAbortRef.current?.abort();
    readAbortRef.current?.abort();
    const current = docRef.current;
    if (current.status === "reading" || current.status === "ready") void current.doc.loadingTask.destroy();
    void deleteSavedDocument(userId);
    engine.reset();
    lessonPageRef.current = null;
    greetedRef.current = false;
    setDocState({ status: "empty" });
    setMessages([]);
    setError(null);
    setNotice(null);
    setPage(1);
  }

  async function importFile(file: File) {
    setDocError(null);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      setDocError(t.errorNotPdf);
      return;
    }
    if (file.size > VOICE_TUTOR_MAX_PDF_BYTES) {
      setDocError(t.errorPdfTooLarge(formatBytes(VOICE_TUTOR_MAX_PDF_BYTES, locale)));
      return;
    }

    clearDocument();
    const controller = new AbortController();
    readAbortRef.current = controller;
    setDocState({ status: "opening", name: file.name });

    let doc: PDFDocumentProxy;
    try {
      doc = await openPdf(file);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setDocState({ status: "empty" });
      setDocError(
        caught instanceof PdfOpenError && caught.reason === "password"
          ? t.errorPdfPassword
          : t.errorNotPdf,
      );
      return;
    }
    if (controller.signal.aborted) {
      void doc.loadingTask.destroy();
      return;
    }
    if (doc.numPages > VOICE_TUTOR_MAX_PAGES) {
      void doc.loadingTask.destroy();
      setDocState({ status: "empty" });
      setDocError(t.errorTooManyPages(doc.numPages, VOICE_TUTOR_MAX_PAGES));
      return;
    }

    docKeyRef.current += 1;
    const meta: DocumentMeta = {
      key: docKeyRef.current,
      name: file.name,
      size: file.size,
      pageCount: doc.numPages,
      initialPage: 1,
    };
    setPage(1);
    setDocState({ status: "reading", doc, meta, done: 0, total: doc.numPages, scanned: false });

    const progress = (done: number, total: number, scanned: boolean) =>
      setDocState((current) =>
        current.status === "reading" && current.doc === doc
          ? { ...current, done, total, scanned }
          : current,
      );

    try {
      const texts = await extractPagesText(
        doc,
        (done) => progress(done, doc.numPages, false),
        controller.signal,
      );
      const scannedPages = texts.flatMap((text, index) =>
        isScannedPageText(text) ? [index + 1] : [],
      );
      if (scannedPages.length > 0) {
        progress(0, scannedPages.length, true);
        const read = await readScannedPages(
          doc,
          scannedPages,
          (done, total) => progress(done, total, true),
          controller.signal,
        );
        for (const [number, text] of read) texts[number - 1] = text;
      }
      if (controller.signal.aborted) return;

      const hasText = texts.some((text) => !isScannedPageText(text));
      setDocState({ status: "ready", doc, meta, pageTexts: texts, hasText });
      // « Langue du document » préremplie d'après le texte du cours.
      const detected = detectLanguage(texts.join("\n"));
      if (detected && detected !== languagesRef.current.documentLanguage) {
        setDocumentLanguage(detected);
        saveLanguages(detected, languagesRef.current.replyLanguage);
      }
      if (hasText) {
        setMessages([welcomeMessage(languagesRef.current.replyLanguage)]);
        // Gardé sur l'appareil jusqu'à ce que l'élève le retire.
        void saveDocument({
          userId,
          name: file.name,
          size: file.size,
          file,
          pageTexts: texts,
          page: 1,
          savedAt: Date.now(),
        });
      } else {
        setDocError(t.errorPdfNoText);
      }
    } catch {
      if (controller.signal.aborted) return;
      setDocState({ status: "ready", doc, meta, pageTexts: [], hasText: false });
      setDocError(t.errorPdfNoText);
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function openPage(target: number) {
    viewerRef.current?.goToPage(target);
    setMobileTab("document");
  }

  // ───────────────────────────── Conversation ─────────────────────────────

  const ready = docState.status === "ready" && docState.hasText ? docState : null;
  const canTalk = Boolean(ready);

  // Salutation préparée à l'avance : elle part sans attente au premier appui.
  const greetingText = ready ? VOICE_TUTOR_GREETING[replyLanguage] : null;
  React.useEffect(() => {
    if (!greetingText) return;
    const cache = greetingAudioRef.current;
    if (cache.has(greetingText)) return;
    const request = requestSpeech(greetingText, replyLanguage).then((blob) => {
      if (!blob) cache.delete(greetingText);
      return blob;
    });
    cache.set(greetingText, request);
  }, [greetingText, replyLanguage]);

  function micErrorMessage(reason: MicFailure): string {
    if (reason === "denied") return t.errorMicDenied;
    if (reason === "missing") return t.errorMicMissing;
    return t.errorMicUnsupported;
  }

  /** Voix d'un passage (au plus deux demandes à la fois, dans l'ordre). */
  async function fetchSpeech(
    segment: SpeechSegment,
    language: VoiceTutorLanguage,
  ): Promise<Blob | null> {
    const prepared = segment.token ? undefined : greetingAudioRef.current.get(segment.text);
    if (prepared) return prepared;
    const queue = speechQueueRef.current;
    if (queue.active >= SPEECH_CONCURRENCY) {
      await new Promise<void>((resolve) => queue.waiting.push(resolve));
    }
    queue.active += 1;
    try {
      return await requestSpeech(segment.text, language, segment.token);
    } finally {
      queue.active -= 1;
      queue.waiting.shift()?.();
    }
  }

  /** Phrase du cours lue à voix haute : surlignée dans le PDF pendant sa lecture. */
  function highlightReading(segment: SpeechSegment | undefined, page: number | undefined) {
    if (!segment?.original || !page) return;
    viewerRef.current?.highlightPassage(segment.text, [page, page + 1, page - 1]);
  }

  function updateMessage(id: string, update: (message: TutorMessage) => TutorMessage) {
    setMessages((list) => list.map((message) => (message.id === id ? update(message) : message)));
  }

  /**
   * Après une réponse prononcée en entier : explication page par page →
   * page suivante ; sinon le micro se rouvre (mains libres).
   */
  function afterAnswer(message: Pick<TutorMessage, "focus" | "continues" | "lesson"> | null) {
    const pageCount = docRef.current.status === "ready" ? docRef.current.meta.pageCount : 0;
    if (message?.focus && (message.continues || message.lesson)) {
      lessonPageRef.current = message.focus.page >= pageCount ? null : message.focus.page;
    }
    if (!conversationRef.current) {
      setPhase("idle");
      return;
    }
    if (message?.continues && lessonPageRef.current && lessonPageRef.current < pageCount) {
      void continueLesson();
      return;
    }
    void listen();
  }

  /** L'élève peut couper la parole au professeur en parlant (sauf iPhone). */
  function watchForInterruption(turn: number) {
    if (!engine.canInterruptByVoice || !conversationRef.current) return;
    void engine.startWatching({
      onBargeIn: () => {
        if (turnRef.current === turn) interrupt();
      },
      onUtterance: (audio) => void ask(audio),
      onFalseStart: () => recoverFromFalseStart(),
    });
  }

  /** Le professeur se tait : l'élève a la parole. */
  function interrupt() {
    turnRef.current += 1;
    interruptedRef.current = speakingRef.current
      ? { kind: "answer", messageId: speakingRef.current }
      : continuationRef.current
        ? { kind: "lesson" }
        : null;
    if (continuationRef.current) {
      continuationRef.current = false;
      requestAbortRef.current?.abort();
    }
    liveAnswerRef.current = null;
    speakingRef.current = null;
    conversationRef.current = true;
    engine.stopPlayback();
    setPreparingPage(null);
    setError(null);
    setNotice(null);
    setPhase("listening");
  }

  /** Ce n'était qu'un bruit : le professeur reprend là où il s'était arrêté. */
  function recoverFromFalseStart() {
    const interrupted = interruptedRef.current;
    interruptedRef.current = null;
    if (!conversationRef.current) {
      setPhase("idle");
      return;
    }
    if (interrupted?.kind === "lesson") {
      void continueLesson();
      return;
    }
    const message =
      interrupted?.kind === "answer"
        ? messagesRef.current.find((item) => item.id === interrupted.messageId)
        : undefined;
    if (message) void speak(message, { conversation: true });
    else void listen();
  }

  /** Explication page par page : le professeur passe seul à la page suivante. */
  async function continueLesson() {
    const from = lessonPageRef.current;
    if (!from) {
      void listen();
      return;
    }
    // Il « tourne la page » : le PDF y va tout de suite.
    viewerRef.current?.goToPage(from + 1);
    await ask(null);
  }

  /**
   * Un tour du professeur : la question enregistrée (`audio`), ou, sans audio,
   * la suite d'une explication page par page.
   */
  async function ask(audio: Blob | null) {
    const current = docRef.current;
    if (current.status !== "ready" || !current.hasText) return;
    const document: ReadyDocument = current;
    const continuation = audio === null;
    const lessonPage = lessonPageRef.current;
    if (continuation && (!lessonPage || lessonPage >= document.meta.pageCount)) {
      void listen();
      return;
    }
    turnRef.current += 1;
    const turn = turnRef.current;
    const isCurrentTurn = () => turnRef.current === turn;
    const { documentLanguage: docLanguage, replyLanguage: language } = languagesRef.current;

    setError(null);
    setNotice(null);
    setPhase("thinking");
    continuationRef.current = continuation;
    setPreparingPage(continuation && lessonPage ? lessonPage + 1 : null);
    // Pendant qu'il prépare la page suivante, l'élève peut déjà l'arrêter.
    if (continuation) watchForInterruption(turn);

    const history = messagesRef.current
      .filter((message) => !message.welcome && message.content.trim())
      .slice(-VOICE_TUTOR_MAX_HISTORY)
      .map((message) => ({ role: message.role, content: message.content.slice(0, 4000) }));

    const payload = {
      documentName: document.meta.name.slice(0, 200),
      pageCount: document.meta.pageCount,
      currentPage: pageRef.current,
      documentLanguage: docLanguage,
      replyLanguage: language,
      pages: contextPages(document.pageTexts, pageRef.current),
      history,
      lessonPage,
      continueLesson: continuation,
    };
    const json = JSON.stringify(payload);
    const compressed = await gzipJson(json);
    const form = new FormData();
    if (compressed) form.append("payload", compressed, "payload.json.gz");
    else form.append("payload", json);
    if (audio) form.append("audio", audio, audioFileName(audio.type));

    const controller = new AbortController();
    requestAbortRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const answerId = nextMessageId();
    let live: LiveSpeech | null = null;

    const dropEmptyAnswer = () =>
      setMessages((list) =>
        list.flatMap((message) =>
          message.id !== answerId
            ? [message]
            : message.content.trim()
              ? [{ ...message, streaming: false }]
              : [],
        ),
      );

    try {
      const response = await fetch("/api/ai/voice-tutor", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const data: { question?: string; error?: string; code?: string } | null = await response
          .json()
          .catch(() => null);
        if (docRef.current !== document) return;
        if (data?.question) {
          const question = data.question;
          setMessages((list) => [
            ...list,
            { id: nextMessageId(), role: "user", content: question, language },
          ]);
        }
        if (!isCurrentTurn()) return;
        continuationRef.current = false;
        setPreparingPage(null);
        // Coupure de parole sur un simple bruit : le professeur reprend.
        if (data?.code === "NO_SPEECH" && interruptedRef.current) {
          recoverFromFalseStart();
          return;
        }
        interruptedRef.current = null;
        conversationRef.current = false;
        if (data?.code === "NO_SPEECH") setNotice(data.error ?? t.errorNoSpeech);
        else setError({ message: data?.error ?? t.errorGeneric, code: data?.code });
        setPhase("idle");
        return;
      }

      // Les passages sont prononcés au fil de l'eau seulement si l'élève est
      // toujours en conversation (il a pu arrêter pendant la transcription).
      if (conversationRef.current && isCurrentTurn()) liveAnswerRef.current = answerId;
      let finished = false;
      let failure: string | null = null;
      let voiceStarted = false;
      // Langue de la réponse : celle choisie, ou celle que l'élève vient de demander.
      let answerLanguage = language;
      let answerFocus: TutorMessage["focus"];
      let answerContinues = false;
      // Passages prononcés au fil de l'eau (dans l'ordre de lecture).
      const liveSegments: SpeechSegment[] = [];

      for await (const event of readEvents(response.body)) {
        if (docRef.current !== document) return;
        if (event.type === "question") {
          interruptedRef.current = null;
          const answer: TutorMessage = {
            id: answerId,
            role: "assistant",
            content: "",
            language,
            segments: [],
            streaming: true,
            lesson: continuation,
          };
          setMessages((list) =>
            continuation
              ? [...list, answer]
              : [...list, { id: nextMessageId(), role: "user", content: event.text, language }, answer],
          );
        } else if (event.type === "focus") {
          answerContinues = event.continues;
          // Le PDF défile jusqu'au passage dont parle le professeur.
          if (event.page) {
            const focus = { page: event.page, quote: event.quote };
            answerFocus = focus;
            if (isCurrentTurn()) viewerRef.current?.showPassage(focus.page, focus.quote);
          }
          const focus = answerFocus;
          updateMessage(answerId, (message) => ({ ...message, focus, continues: event.continues }));
          // L'élève a demandé une autre langue : elle devient la langue de réponse.
          if (event.language && event.language !== answerLanguage) {
            const next = event.language;
            answerLanguage = next;
            setReplyLanguage(next);
            saveLanguages(languagesRef.current.documentLanguage, next);
            updateMessage(answerId, (message) => ({ ...message, language: next }));
          }
        } else if (event.type === "delta") {
          updateMessage(answerId, (message) => ({ ...message, content: message.content + event.text }));
        } else if (event.type === "speech") {
          const segment: SpeechSegment = {
            text: event.text,
            token: event.token,
            ...(event.original ? { original: true, language: event.language } : {}),
          };
          updateMessage(answerId, (message) => ({
            ...message,
            segments: [...(message.segments ?? []), segment],
          }));
          if (liveAnswerRef.current === answerId) {
            live ??= engine.startLiveSpeech(answerId, (index) =>
              highlightReading(liveSegments[index], answerFocus?.page),
            );
            liveSegments.push(segment);
            const clip = fetchSpeech(segment, segment.language ?? answerLanguage);
            live.add(clip);
            void clip.then((blob) => {
              if (blob && !voiceStarted && isCurrentTurn() && phaseRef.current === "thinking") {
                voiceStarted = true;
                continuationRef.current = false;
                speakingRef.current = answerId;
                setPreparingPage(null);
                setPhase("speaking");
                // Le professeur parle : l'élève peut lui couper la parole.
                watchForInterruption(turn);
              }
            });
          }
        } else if (event.type === "done") {
          finished = true;
          updateMessage(answerId, (message) => ({
            ...message,
            content: event.answer,
            pages: event.pages,
            streaming: false,
          }));
        } else if (event.type === "error") {
          failure = event.message;
        }
      }
      window.clearTimeout(timer);
      live?.close();

      if (!finished) {
        // Réponse interrompue : on garde ce qui a été écrit, sans le prononcer.
        dropEmptyAnswer();
        if (liveAnswerRef.current === answerId) liveAnswerRef.current = null;
        if (!isCurrentTurn()) return;
        continuationRef.current = false;
        speakingRef.current = null;
        setPreparingPage(null);
        engine.stopPlayback();
        conversationRef.current = false;
        setError({ message: failure ?? t.errorConnection });
        setPhase("idle");
        return;
      }

      if (!live) {
        // Rien à prononcer (conversation arrêtée entre-temps).
        if (isCurrentTurn()) setPhase("idle");
        return;
      }
      const outcome: PlayOutcome = await live.done;
      if (liveAnswerRef.current === answerId) liveAnswerRef.current = null;
      if (!isCurrentTurn()) return;
      speakingRef.current = null;
      continuationRef.current = false;
      if (outcome === "blocked") {
        conversationRef.current = false;
        setNotice(t.autoplayBlocked);
      } else if (outcome === "ended" && !voiceStarted) {
        // Aucun passage n'a pu être prononcé : la réponse reste lisible.
        conversationRef.current = false;
        setNotice(t.errorSpeech);
      }
      if (outcome === "ended") {
        afterAnswer({ focus: answerFocus, continues: answerContinues, lesson: continuation });
        return;
      }
      setPhase("idle");
    } catch (caught) {
      live?.close();
      if (docRef.current !== document) return;
      dropEmptyAnswer();
      if (!isCurrentTurn()) return;
      continuationRef.current = false;
      speakingRef.current = null;
      interruptedRef.current = null;
      setPreparingPage(null);
      conversationRef.current = false;
      liveAnswerRef.current = null;
      engine.stopPlayback();
      setError({
        message:
          caught instanceof DOMException && caught.name === "AbortError"
            ? t.timeout
            : t.errorConnection,
      });
      setPhase("idle");
    } finally {
      window.clearTimeout(timer);
      if (requestAbortRef.current === controller) requestAbortRef.current = null;
    }
  }

  async function listen() {
    turnRef.current += 1;
    const turn = turnRef.current;
    setError(null);
    setNotice(null);
    setPhase("listening");
    try {
      await engine.startListening({
        onUtterance: (audio) => void ask(audio),
        onNoSpeech: () => {
          if (turnRef.current !== turn) return;
          conversationRef.current = false;
          setNotice(t.noSpeechStopped);
          setPhase("idle");
        },
      });
    } catch (caught) {
      if (turnRef.current !== turn) return;
      conversationRef.current = false;
      setPhase("idle");
      setError({
        message: micErrorMessage(caught instanceof MicError ? caught.reason : "unsupported"),
      });
    }
  }

  /** Premier appui de la conversation : le professeur salue l'élève, puis l'écoute. */
  function greet() {
    const language = languagesRef.current.replyLanguage;
    const greeting: TutorMessage = {
      id: nextMessageId(),
      role: "assistant",
      content: VOICE_TUTOR_GREETING[language],
      language,
      welcome: true,
    };
    setMessages((list) => [...list, greeting]);
    void speak(greeting, { conversation: true, fromStart: true });
  }

  function handleMic() {
    if (!canTalk) return;
    engine.unlock();
    switch (phaseRef.current) {
      case "idle":
        conversationRef.current = true;
        if (!greetedRef.current) {
          greetedRef.current = true;
          greet();
        } else {
          void listen();
        }
        break;
      case "listening":
        if (engine.submitListening()) {
          setPhase("thinking");
        } else {
          conversationRef.current = false;
          setPhase("idle");
        }
        break;
      case "speaking":
      case "thinking":
        // Appui pendant qu'il parle (ou prépare la page suivante) : l'élève
        // lui coupe la parole pour poser une autre question.
        if (phaseRef.current === "thinking" && !continuationRef.current) break;
        interrupt();
        interruptedRef.current = null;
        void listen();
        break;
    }
  }

  /**
   * Lecture d'un message à voix haute (reprise là où il s'était arrêté, sauf
   * `fromStart`). Depuis sa bulle, la conversation s'arrête ; en conversation
   * (salutation, reprise après un bruit), elle continue ensuite.
   */
  async function speak(
    message: TutorMessage,
    options: { fromStart?: boolean; conversation?: boolean } = {},
  ) {
    engine.unlock();
    if (phaseRef.current === "thinking" && !options.conversation) return;
    turnRef.current += 1;
    const turn = turnRef.current;
    if (!options.conversation) {
      conversationRef.current = false;
      engine.cancelListening();
    }
    liveAnswerRef.current = null;
    setError(null);
    setNotice(null);

    if (message.focus) viewerRef.current?.showPassage(message.focus.page, message.focus.quote);
    const segments = segmentsOf(message);
    const load = (index: number) =>
      fetchSpeech(segments[index], segments[index].language ?? message.language);
    const onClipStart = (index: number) => highlightReading(segments[index], message.focus?.page);
    const resumed = options.fromStart
      ? null
      : engine.resumeMessage(message.id, segments.length, load, onClipStart);
    speakingRef.current = message.id;
    setPhase("speaking");
    if (options.conversation) watchForInterruption(turn);
    const outcome = await (resumed ??
      engine.playMessage(
        message.id,
        segments.length,
        () => segments.map((_, index) => load(index)),
        onClipStart,
      ));
    if (turnRef.current !== turn) return;
    speakingRef.current = null;
    if (outcome === "blocked") {
      conversationRef.current = false;
      setNotice(t.autoplayBlocked);
      setPhase("idle");
      return;
    }
    if (options.conversation && outcome === "ended") {
      afterAnswer(message);
      return;
    }
    setPhase("idle");
  }

  function pauseMessage() {
    turnRef.current += 1;
    conversationRef.current = false;
    liveAnswerRef.current = null;
    speakingRef.current = null;
    engine.pause();
    setPhase("idle");
  }

  function seekMessage(message: TutorMessage, ratio: number) {
    if (engine.seek(message.id, ratio)) void speak(message);
  }

  function cycleRate() {
    const index = PLAYBACK_RATES.indexOf(engine.rate);
    engine.setRate(PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length]);
  }

  function newConversation() {
    stopConversation();
    requestAbortRef.current?.abort();
    engine.reset();
    lessonPageRef.current = null;
    greetedRef.current = false;
    setError(null);
    setNotice(null);
    setMessages(ready ? [welcomeMessage(replyLanguage)] : []);
  }

  const lastAnswer = [...messages]
    .reverse()
    .find(
      (message) =>
        message.role === "assistant" && !message.welcome && message.content.trim() && !message.streaming,
    );

  // ───────────────────────────── Affichage ─────────────────────────────

  // Explication page par page : la page que le professeur est en train d'expliquer.
  const spokenMessage =
    phase === "speaking" && playback ? messages.find((message) => message.id === playback.id) : undefined;
  const lessonPageShown =
    spokenMessage?.focus && (spokenMessage.lesson || spokenMessage.continues)
      ? spokenMessage.focus.page
      : null;
  const interruptible = phase === "speaking" || (phase === "thinking" && preparingPage !== null);

  const statusLabel = !ready
    ? docState.status === "reading" || docState.status === "opening"
      ? t.statusReading
      : docState.status === "ready"
        ? t.statusNoText
        : t.statusNoDocument
    : phase === "listening"
      ? t.statusListening
      : phase === "thinking"
        ? preparingPage !== null
          ? t.statusNextPage(preparingPage)
          : t.statusThinking
        : phase === "speaking"
          ? lessonPageShown !== null && ready
            ? t.statusLesson(lessonPageShown, ready.meta.pageCount)
            : t.statusSpeaking
          : t.statusIdle;

  const micLabel =
    phase === "listening"
      ? t.micSend
      : interruptible
        ? t.micInterrupt
        : phase === "thinking"
          ? t.micWait
          : t.micStart;

  const openDoc = docState.status === "reading" || docState.status === "ready" ? docState : null;
  const answerWriting = messages.some((message) => message.streaming);

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-var(--spacing-header)-4rem)] lg:min-h-[36rem]">
      {/* En-tête : titre + les deux langues */}
      <div className="flex shrink-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="hidden min-w-0 items-center gap-3.5 sm:flex">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a985f2_0%,#7c4fbe_50%,#553087_100%)] text-white shadow-[var(--shadow-btn-primary)] sm:size-14">
            <Mic className="size-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-[-0.02em] text-ink-900 sm:text-xl">
              {t.title}
            </h2>
            <p className="text-sm text-ink-500">{t.subtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:w-[32rem]">
          <LanguagePicker
            id="voice-tutor-document-language"
            icon={FileSearch}
            label={t.documentLanguage}
            value={documentLanguage}
            onChange={changeDocumentLanguage}
          />
          <LanguagePicker
            id="voice-tutor-reply-language"
            icon={MessageCircle}
            label={t.replyLanguage}
            value={replyLanguage}
            onChange={changeReplyLanguage}
          />
        </div>
      </div>

      {/* Onglets sur mobile et tablette */}
      <div
        role="tablist"
        aria-label={t.panelsLabel}
        className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-surface p-1 shadow-card ring-1 ring-line-soft lg:hidden"
      >
        {(["document", "teacher"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`voice-tutor-tab-${tab}`}
            aria-selected={mobileTab === tab}
            aria-controls={`voice-tutor-panel-${tab}`}
            onClick={() => setMobileTab(tab)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-fine font-semibold transition-colors",
              mobileTab === tab
                ? "bg-primary-600 text-white"
                : "text-ink-500 hover:bg-primary-50 hover:text-ink-900",
            )}
          >
            {tab === "document" ? (
              <FileText className="size-4" aria-hidden />
            ) : (
              <TeacherBadge className="size-4 [box-shadow:none]" />
            )}
            {tab === "document" ? t.tabDocument : t.tabTeacher}
            {tab === "teacher" && phase !== "idle" ? (
              <span className="size-2 rounded-full bg-success-500" aria-hidden />
            ) : null}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:gap-5">
        {/* ───────── Document ───────── */}
        <section
          id="voice-tutor-panel-document"
          role="tabpanel"
          aria-labelledby="voice-tutor-tab-document"
          className={cn(
            "relative h-[calc(100dvh-var(--spacing-header)-11.5rem)] min-h-[26rem] sm:h-[calc(100dvh-var(--spacing-header)-17rem)] flex-col gap-3 rounded-2xl bg-surface p-3 shadow-card ring-1 ring-line-soft sm:p-4 lg:flex lg:h-auto lg:min-h-0",
            mobileTab === "document" ? "flex" : "hidden",
            dragging && "ring-2 ring-primary-400",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void importFile(file);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void importFile(file);
            }}
          />

          {openDoc ? (
            <div className="flex shrink-0 items-center gap-3 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-line-soft">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger-50 text-[0.65rem] font-extrabold text-danger-600 ring-1 ring-danger-100">
                PDF
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900" title={openDoc.meta.name}>
                  {openDoc.meta.name}
                </p>
                <p className="text-meta text-ink-500">
                  {t.pagesAndSize(openDoc.meta.pageCount, formatBytes(openDoc.meta.size, locale))}
                </p>
              </div>
              {openDoc.status === "reading" ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-meta font-semibold text-primary-700">
                  <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
                  <span className="hidden sm:inline">
                    {openDoc.scanned
                      ? t.readingScanned(openDoc.done, openDoc.total)
                      : t.readingPages(openDoc.done, openDoc.total)}
                  </span>
                  <span className="sm:hidden">
                    {openDoc.done}/{openDoc.total}
                  </span>
                </span>
              ) : openDoc.hasText ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-50 px-2.5 py-1 text-meta font-semibold text-success-700 ring-1 ring-success-100">
                  <Check className="size-3.5" aria-hidden />
                  {t.imported}
                </span>
              ) : null}
              <button
                type="button"
                onClick={clearDocument}
                aria-label={t.removeDocument}
                title={t.removeDocument}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-500 ring-1 ring-line-soft transition-colors hover:bg-danger-50 hover:text-danger-600"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ) : null}

          {docError ? <InlineErrorBanner message={docError} className="shrink-0" /> : null}

          {openDoc ? (
            <PdfViewer
              key={openDoc.meta.key}
              ref={viewerRef}
              doc={openDoc.doc}
              initialPage={openDoc.meta.initialPage}
              onPageChange={setPage}
              pageTexts={docState.status === "ready" ? docState.pageTexts : null}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/40 px-5 py-8 text-center">
              {docState.status === "opening" ? (
                <>
                  <LoaderCircle className="size-9 animate-spin text-primary-500" aria-hidden />
                  <p className="text-sm font-semibold text-ink-700">{t.reading}</p>
                </>
              ) : (
                <>
                  <span className="flex size-16 items-center justify-center rounded-2xl bg-surface text-primary-600 shadow-card ring-1 ring-primary-100">
                    <FileUp className="size-7" aria-hidden />
                  </span>
                  <div className="max-w-sm">
                    <p className="text-title-sm font-bold text-ink-900">
                      {dragging ? t.dropHere : t.uploadTitle}
                    </p>
                    <p className="mt-1.5 text-fine leading-relaxed text-ink-500">{t.uploadBody}</p>
                  </div>
                  <Button type="button" onClick={openFilePicker}>
                    <FileUp className="size-4" aria-hidden />
                    {t.uploadButton}
                  </Button>
                  <p className="text-meta text-ink-400">
                    {t.uploadHint(formatBytes(VOICE_TUTOR_MAX_PDF_BYTES, locale), VOICE_TUTOR_MAX_PAGES)}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Mobile : poser une question sans quitter le document. */}
          {canTalk ? (
            <button
              type="button"
              onClick={() => {
                setMobileTab("teacher");
                if (phaseRef.current === "idle") handleMic();
              }}
              className="absolute bottom-5 right-5 z-10 flex items-center gap-2 rounded-full bg-primary-600 py-2.5 pl-3 pr-4 text-fine font-semibold text-white shadow-[var(--shadow-btn-primary)] transition-transform active:scale-95 lg:hidden"
            >
              <Mic className="size-4" aria-hidden />
              {t.askFromDocument}
            </button>
          ) : null}
        </section>

        {/* ───────── Professeur ───────── */}
        <section
          id="voice-tutor-panel-teacher"
          role="tabpanel"
          aria-labelledby="voice-tutor-tab-teacher"
          className={cn(
            "h-[calc(100dvh-var(--spacing-header)-11.5rem)] min-h-[28rem] sm:h-[calc(100dvh-var(--spacing-header)-17rem)] flex-col overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line-soft lg:flex lg:h-auto lg:min-h-0",
            mobileTab === "teacher" ? "flex" : "hidden",
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <TeacherBadge className="size-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">{t.teacherName}</p>
                <p className="flex items-center gap-1.5 text-meta text-ink-500">
                  <span
                    aria-hidden
                    className={cn("size-2 rounded-full", canTalk ? "bg-success-500" : "bg-line")}
                  />
                  {canTalk ? t.online : t.waiting}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t.menuLabel}
                  className="flex size-9 items-center justify-center rounded-full text-ink-500 ring-1 ring-line-soft transition-colors hover:bg-primary-50 hover:text-ink-900"
                >
                  <EllipsisVertical className="size-4" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem disabled={!ready} onSelect={newConversation}>
                  <RotateCcw className="size-4" aria-hidden />
                  {t.newConversation}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={openFilePicker}>
                  <FileUp className="size-4" aria-hidden />
                  {openDoc ? t.changeDocument : t.uploadButton}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex shrink-0 flex-col items-center px-4 pt-3">
            <VoiceOrb
              phase={phase}
              getLevel={engine.getMicLevel}
              className={messages.length > 1 ? "voice-orb--compact" : undefined}
            />
            <p
              aria-live="polite"
              className={cn(
                "mt-1 text-center text-sm font-semibold",
                phase === "listening" ? "text-primary-700" : "text-ink-700",
              )}
            >
              {statusLabel}
            </p>
            {phase === "listening" ? (
              <p className="mt-0.5 text-center text-meta text-ink-500">{t.listeningHint}</p>
            ) : interruptible ? (
              <p className="mt-0.5 text-center text-meta text-ink-500">
                {engine.canInterruptByVoice ? t.interruptHintVoice : t.interruptHintTap}
              </p>
            ) : null}
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
          >
            {messages.map((message) => (
              <TutorMessageBubble
                key={message.id}
                message={message}
                pageCount={ready?.meta.pageCount ?? 0}
                playback={playback}
                knownDuration={engine.durations[message.id]}
                audioDisabled={
                  phase === "thinking" || (Boolean(message.streaming) && playback?.id !== message.id)
                }
                rate={engine.rate}
                onPlay={() => void speak(message)}
                onPause={pauseMessage}
                onSeek={(ratio) => seekMessage(message, ratio)}
                onRateChange={cycleRate}
                onOpenPage={openPage}
              />
            ))}
            {phase === "thinking" && !answerWriting ? (
              <div className="flex items-center gap-2.5">
                <TeacherBadge className="size-8" />
                <span className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-surface px-4 py-3 shadow-card ring-1 ring-line-soft">
                  <span className="sr-only">{t.statusThinking}</span>
                  <span aria-hidden className="size-1.5 animate-bounce rounded-full bg-primary-400 [animation-delay:-0.3s]" />
                  <span aria-hidden className="size-1.5 animate-bounce rounded-full bg-primary-400 [animation-delay:-0.15s]" />
                  <span aria-hidden className="size-1.5 animate-bounce rounded-full bg-primary-400" />
                </span>
              </div>
            ) : null}
            {messages.length === 0 && !openDoc ? (
              <p className="mx-auto max-w-xs pt-2 text-center text-fine leading-relaxed text-ink-500">
                {t.emptyConversation}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 space-y-2 px-4">
            {error?.code === "INSUFFICIENT_CREDITS" ? (
              <InsufficientCreditsBanner message={error.message} />
            ) : error ? (
              <InlineErrorBanner message={error.message} />
            ) : null}
            {notice ? (
              <p role="status" className="rounded-lg bg-primary-50 px-3 py-2 text-fine text-primary-700">
                {notice}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 px-4 pb-4 pt-3">
            <div className="flex items-center justify-center gap-6 sm:gap-8">
              <button
                type="button"
                onClick={() => lastAnswer && void speak(lastAnswer, { fromStart: true })}
                disabled={!lastAnswer || phase === "thinking" || phase === "listening"}
                aria-label={t.replay}
                title={t.replay}
                className="flex size-12 items-center justify-center rounded-full bg-surface text-ink-500 ring-1 ring-line-soft transition-colors hover:bg-primary-50 hover:text-ink-900 disabled:text-ink-400 disabled:opacity-60 disabled:hover:bg-surface"
              >
                <Repeat className="size-5" aria-hidden />
              </button>

              <button
                type="button"
                onClick={handleMic}
                disabled={!canTalk || (phase === "thinking" && !interruptible)}
                aria-label={micLabel}
                className={cn(
                  "relative flex size-[4.5rem] items-center justify-center rounded-full bg-[linear-gradient(135deg,#a985f2_0%,#7c4fbe_50%,#553087_100%)] text-white shadow-[var(--shadow-btn-primary)] ring-[6px] ring-primary-100 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:size-20",
                  phase === "listening" && "voice-mic-live",
                )}
              >
                {phase === "thinking" && !interruptible ? (
                  <LoaderCircle className="size-8 animate-spin" aria-hidden />
                ) : phase === "listening" ? (
                  <Send className="size-7" aria-hidden />
                ) : (
                  <Mic className="size-8" aria-hidden />
                )}
              </button>

              <button
                type="button"
                onClick={stopConversation}
                disabled={phase === "idle"}
                aria-label={t.stopConversation}
                title={t.stopConversation}
                className="flex size-12 items-center justify-center rounded-full bg-surface text-danger-600 ring-1 ring-danger-100 transition-colors hover:bg-danger-50 disabled:text-ink-400 disabled:ring-line-soft disabled:hover:bg-surface"
              >
                <Square className="size-4" fill="currentColor" aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-center text-fine font-medium text-ink-500" aria-hidden>
              {micLabel}
            </p>
          </div>
        </section>
      </div>

      <p className="shrink-0 text-center text-meta text-ink-400">{t.disclaimer}</p>
    </div>
  );
}

"use client";

import * as React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  Check,
  EllipsisVertical,
  FileSearch,
  FileText,
  FileUp,
  Keyboard,
  LoaderCircle,
  MessageCircle,
  Mic,
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
  VOICE_TUTOR_MAX_HISTORY,
  VOICE_TUTOR_MAX_OCR_PAGES,
  VOICE_TUTOR_MAX_PDF_BYTES,
  VOICE_TUTOR_MAX_QUESTION_CHARS,
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
import { PdfViewer } from "./pdf-viewer";
import { LanguagePicker } from "./language-picker";
import { MicError, useVoiceEngine, type MicFailure } from "./use-voice-engine";
import { TeacherBadge, VoiceOrb, type VoicePhase } from "./voice-orb";
import {
  PLAYBACK_RATES,
  TutorMessageBubble,
  type TutorMessage,
} from "./tutor-message";

/** Réponse du professeur : au-delà, la requête est abandonnée. */
const REQUEST_TIMEOUT_MS = 75_000;

interface DocumentMeta {
  key: number;
  name: string;
  size: number;
  pageCount: number;
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
      ocrLimited: boolean;
    };

type ReadyDocument = Extract<DocumentState, { status: "ready" }>;

interface PanelError {
  message: string;
  code?: string;
}

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

function audioFileName(type: string): string {
  const base = type.split(";")[0];
  const extension =
    base === "audio/mp4" ? "mp4" : base === "audio/ogg" ? "ogg" : base === "audio/aac" ? "m4a" : "webm";
  return `question.${extension}`;
}

/**
 * Page « Professeur vocal » : PDF du cours à gauche, conversation à droite,
 * deux langues en haut. Le PDF est lu dans le navigateur ; chaque question
 * (voix ou clavier) part avec le texte du cours vers `POST /api/ai/voice-tutor`,
 * et la réponse est lue à voix haute (`POST /api/ai/voice-tutor/speech`).
 *
 * Conversation mains libres : après chaque réponse prononcée, le micro se
 * rouvre de lui-même jusqu'à ce que l'élève arrête (bouton carré) ou se taise.
 */
export function VoiceTutorWorkspace({
  initialDocumentLanguage,
  initialReplyLanguage,
}: {
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
  const [keyboardOpen, setKeyboardOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [mobileTab, setMobileTab] = React.useState<"document" | "teacher">("document");
  const [loadingAudioId, setLoadingAudioId] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const draftRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const readAbortRef = React.useRef<AbortController | null>(null);
  const docKeyRef = React.useRef(0);
  const audioCacheRef = React.useRef(new Map<string, Blob>());
  // Mains libres : le micro se rouvre après chaque réponse prononcée.
  const conversationRef = React.useRef(false);

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

  const setPhase = React.useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

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

  // Fermeture de la page : arrête la lecture du PDF et libère sa mémoire.
  React.useEffect(() => {
    return () => {
      readAbortRef.current?.abort();
      const current = docRef.current;
      if (current.status === "reading" || current.status === "ready") void current.doc.loadingTask.destroy();
    };
  }, []);

  // ───────────────────────────── Document ─────────────────────────────

  function stopConversation() {
    conversationRef.current = false;
    engine.cancelListening();
    engine.stopPlayback();
    if (phaseRef.current !== "thinking") setPhase("idle");
  }

  function clearDocument() {
    stopConversation();
    readAbortRef.current?.abort();
    const current = docRef.current;
    if (current.status === "reading" || current.status === "ready") void current.doc.loadingTask.destroy();
    audioCacheRef.current.clear();
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

    docKeyRef.current += 1;
    const meta: DocumentMeta = {
      key: docKeyRef.current,
      name: file.name,
      size: file.size,
      pageCount: doc.numPages,
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
        progress(0, Math.min(scannedPages.length, VOICE_TUTOR_MAX_OCR_PAGES), true);
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
      setDocState({
        status: "ready",
        doc,
        meta,
        pageTexts: texts,
        hasText,
        ocrLimited: scannedPages.length > VOICE_TUTOR_MAX_OCR_PAGES,
      });
      if (hasText) {
        setMessages([welcomeMessage(languagesRef.current.replyLanguage)]);
      } else {
        setDocError(t.errorPdfNoText);
      }
    } catch {
      if (controller.signal.aborted) return;
      setDocState({
        status: "ready",
        doc,
        meta,
        pageTexts: [],
        hasText: false,
        ocrLimited: false,
      });
      setDocError(t.errorPdfNoText);
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function openPage(target: number) {
    setPage(target);
    setMobileTab("document");
  }

  // ───────────────────────────── Conversation ─────────────────────────────

  const ready = docState.status === "ready" && docState.hasText ? docState : null;
  const canTalk = Boolean(ready);

  function micErrorMessage(reason: MicFailure): string {
    if (reason === "denied") return t.errorMicDenied;
    if (reason === "missing") return t.errorMicMissing;
    return t.errorMicUnsupported;
  }

  async function fetchSpeech(message: TutorMessage): Promise<Blob | null> {
    const cached = audioCacheRef.current.get(message.id);
    if (cached) return cached;
    setLoadingAudioId(message.id);
    try {
      const response = await fetch("/api/ai/voice-tutor/speech", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: message.content,
          language: message.language,
          token: message.speechToken,
        }),
      });
      if (!response.ok) return null;
      const blob = await response.blob();
      if (blob.size === 0) return null;
      audioCacheRef.current.set(message.id, blob);
      return blob;
    } catch {
      return null;
    } finally {
      setLoadingAudioId((current) => (current === message.id ? null : current));
    }
  }

  /** Prononce une réponse ; en mode mains libres, rouvre ensuite le micro. */
  async function speak(message: TutorMessage, continueConversation: boolean) {
    setPhase("speaking");
    const audio = await fetchSpeech(message);
    if (phaseRef.current !== "speaking") return;
    if (!audio) {
      conversationRef.current = false;
      setNotice(t.errorSpeech);
      setPhase("idle");
      return;
    }
    const outcome = await engine.play(message.id, audio);
    if (outcome === "blocked") {
      conversationRef.current = false;
      setNotice(t.autoplayBlocked);
    }
    if (phaseRef.current !== "speaking") return;
    if (outcome === "ended" && continueConversation && conversationRef.current) {
      void listen();
      return;
    }
    if (outcome === "stopped") conversationRef.current = false;
    setPhase("idle");
  }

  async function ask(input: { audio?: Blob; text?: string }) {
    const current = docRef.current;
    if (current.status !== "ready" || !current.hasText) return;
    const document: ReadyDocument = current;
    const fromVoice = Boolean(input.audio);
    const { documentLanguage: docLanguage, replyLanguage: language } = languagesRef.current;

    setError(null);
    setNotice(null);
    setPhase("thinking");

    const history = messagesRef.current
      .filter((message) => !message.welcome)
      .slice(-VOICE_TUTOR_MAX_HISTORY)
      .map((message) => ({ role: message.role, content: message.content.slice(0, 4000) }));

    if (input.text) {
      const question: TutorMessage = {
        id: nextMessageId(),
        role: "user",
        content: input.text,
        language,
      };
      setMessages((list) => [...list, question]);
    }

    const payload = {
      documentName: document.meta.name.slice(0, 200),
      pageCount: document.meta.pageCount,
      currentPage: pageRef.current,
      documentLanguage: docLanguage,
      replyLanguage: language,
      pages: contextPages(document.pageTexts, pageRef.current),
      history,
      question: input.text ?? "",
    };
    const form = new FormData();
    form.append("payload", JSON.stringify(payload));
    if (input.audio) form.append("audio", input.audio, audioFileName(input.audio.type));

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/ai/voice-tutor", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const data: {
        question?: string;
        answer?: string;
        pages?: number[];
        speechToken?: string;
        error?: string;
        code?: string;
      } | null = await response.json().catch(() => null);

      // Le cours a changé pendant la réponse : on l'ignore.
      if (docRef.current !== document) return;

      const spokenQuestion =
        fromVoice && data?.question
          ? { id: nextMessageId(), role: "user" as const, content: data.question, language }
          : null;

      if (!response.ok || !data?.answer) {
        if (spokenQuestion) setMessages((list) => [...list, spokenQuestion]);
        conversationRef.current = false;
        if (data?.code === "NO_SPEECH") setNotice(data.error ?? t.errorNoSpeech);
        else setError({ message: data?.error ?? t.errorGeneric, code: data?.code });
        setPhase("idle");
        return;
      }

      const answer: TutorMessage = {
        id: nextMessageId(),
        role: "assistant",
        content: data.answer,
        pages: data.pages ?? [],
        speechToken: data.speechToken,
        language,
      };
      setMessages((list) => [...list, ...(spokenQuestion ? [spokenQuestion] : []), answer]);

      // Question posée à voix haute : réponse prononcée, puis micro rouvert.
      if (fromVoice && conversationRef.current) {
        await speak(answer, true);
      } else {
        setPhase("idle");
      }
    } catch (caught) {
      if (docRef.current !== document) return;
      conversationRef.current = false;
      setError({
        message:
          caught instanceof DOMException && caught.name === "AbortError"
            ? t.timeout
            : t.errorConnection,
      });
      setPhase("idle");
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function listen() {
    setError(null);
    setNotice(null);
    setPhase("listening");
    try {
      await engine.startListening({
        onUtterance: (audio) => void ask({ audio }),
        onNoSpeech: () => {
          conversationRef.current = false;
          setNotice(t.noSpeechStopped);
          setPhase("idle");
        },
      });
    } catch (caught) {
      conversationRef.current = false;
      setPhase("idle");
      setError({
        message: micErrorMessage(caught instanceof MicError ? caught.reason : "unsupported"),
      });
    }
  }

  function handleMic() {
    if (!canTalk) return;
    engine.unlock();
    switch (phaseRef.current) {
      case "idle":
        conversationRef.current = true;
        void listen();
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
        // L'élève coupe la parole au professeur pour poser une autre question.
        engine.stopPlayback();
        conversationRef.current = true;
        void listen();
        break;
      case "thinking":
        break;
    }
  }

  function submitDraft(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !canTalk || phaseRef.current === "thinking") return;
    if (phaseRef.current !== "idle") stopConversation();
    setDraft("");
    void ask({ text: text.slice(0, VOICE_TUTOR_MAX_QUESTION_CHARS) });
  }

  async function playMessage(message: TutorMessage) {
    engine.unlock();
    if (phaseRef.current === "thinking") return;
    if (phaseRef.current === "listening") {
      conversationRef.current = false;
      engine.cancelListening();
    }
    if (engine.playback?.id === message.id && engine.resume(message.id)) {
      setPhase("speaking");
      return;
    }
    conversationRef.current = false;
    await speak(message, false);
  }

  function pauseMessage() {
    engine.pause();
    conversationRef.current = false;
    if (phaseRef.current === "speaking") setPhase("idle");
  }

  function cycleRate() {
    const index = PLAYBACK_RATES.indexOf(engine.rate);
    engine.setRate(PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length]);
  }

  function newConversation() {
    stopConversation();
    audioCacheRef.current.clear();
    setError(null);
    setNotice(null);
    setMessages(ready ? [welcomeMessage(replyLanguage)] : []);
  }

  // ───────────────────────────── Affichage ─────────────────────────────

  const statusLabel = !ready
    ? docState.status === "reading" || docState.status === "opening"
      ? t.statusReading
      : docState.status === "ready"
        ? t.statusNoText
        : t.statusNoDocument
    : phase === "listening"
      ? t.statusListening
      : phase === "thinking"
        ? t.statusThinking
        : phase === "speaking"
          ? t.statusSpeaking
          : t.statusIdle;

  const micLabel =
    phase === "listening"
      ? t.micSend
      : phase === "speaking"
        ? t.micInterrupt
        : phase === "thinking"
          ? t.micWait
          : t.micStart;

  const openDoc = docState.status === "reading" || docState.status === "ready" ? docState : null;

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
          {docState.status === "ready" && docState.ocrLimited ? (
            <p className="shrink-0 rounded-lg bg-warning-50 px-3 py-2 text-fine text-warning-700">
              {t.scannedPartial(VOICE_TUTOR_MAX_OCR_PAGES)}
            </p>
          ) : null}

          {openDoc ? (
            <PdfViewer
              key={openDoc.meta.key}
              doc={openDoc.doc}
              page={page}
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
                    {t.uploadHint(formatBytes(VOICE_TUTOR_MAX_PDF_BYTES, locale))}
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
                loadingAudio={loadingAudioId === message.id}
                audioDisabled={phase === "thinking"}
                rate={engine.rate}
                onPlay={() => void playMessage(message)}
                onPause={pauseMessage}
                onSeek={(ratio) => engine.seek(message.id, ratio)}
                onRateChange={cycleRate}
                onOpenPage={openPage}
              />
            ))}
            {phase === "thinking" ? (
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

          {keyboardOpen ? (
            <form onSubmit={submitDraft} className="flex shrink-0 items-center gap-2 px-4 pt-3">
              <input
                ref={draftRef}
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={VOICE_TUTOR_MAX_QUESTION_CHARS}
                disabled={!canTalk}
                placeholder={t.inputPlaceholder}
                aria-label={t.inputAria}
                dir="auto"
                className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm text-ink-900 placeholder:text-ink-400 hover:border-primary-200 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <Button
                type="submit"
                disabled={!canTalk || !draft.trim() || phase === "thinking"}
                aria-label={t.send}
                className="shrink-0"
              >
                <Send className="size-4" aria-hidden />
                <span className="hidden sm:inline">{t.send}</span>
              </Button>
            </form>
          ) : null}

          <div className="shrink-0 px-4 pb-4 pt-3">
            <div className="flex items-center justify-center gap-6 sm:gap-8">
              <button
                type="button"
                onClick={() => setKeyboardOpen((open) => !open)}
                aria-pressed={keyboardOpen}
                aria-label={t.keyboard}
                title={t.keyboard}
                className={cn(
                  "flex size-12 items-center justify-center rounded-full ring-1 transition-colors",
                  keyboardOpen
                    ? "bg-primary-100 text-primary-700 ring-primary-200"
                    : "bg-surface text-ink-500 ring-line-soft hover:bg-primary-50 hover:text-ink-900",
                )}
              >
                <Keyboard className="size-5" aria-hidden />
              </button>

              <button
                type="button"
                onClick={handleMic}
                disabled={!canTalk || phase === "thinking"}
                aria-label={micLabel}
                className={cn(
                  "relative flex size-[4.5rem] items-center justify-center rounded-full bg-[linear-gradient(135deg,#a985f2_0%,#7c4fbe_50%,#553087_100%)] text-white shadow-[var(--shadow-btn-primary)] ring-[6px] ring-primary-100 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:size-20",
                  phase === "listening" && "voice-mic-live",
                )}
              >
                {phase === "thinking" ? (
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

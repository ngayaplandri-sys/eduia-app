"use client";

import * as React from "react";
import { LoaderCircle, Pause, Play, UserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import type { VoiceTutorLanguage } from "@/lib/config/voice-tutor";
import type { Playback } from "./use-voice-engine";
import { TeacherBadge } from "./voice-orb";

/** Passage d'une réponse à prononcer, avec le jeton signé par le serveur. */
export interface SpeechSegment {
  text: string;
  token?: string;
}

export interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Pages du cours citées dans la réponse. */
  pages?: number[];
  /** Passages à prononcer (réponse lue phrase par phrase). */
  segments?: SpeechSegment[];
  /** Réponse encore en cours d'écriture. */
  streaming?: boolean;
  /** Langue de la réponse (voix de la synthèse vocale). */
  language: VoiceTutorLanguage;
  /** Message d'accueil : affiché, jamais renvoyé comme historique. */
  welcome?: boolean;
}

export const PLAYBACK_RATES = [1, 1.25, 1.5, 0.75];

/** « page 5 », « p. 5 », « sayfa 5 », « Seite 5 », « página 5 », « صفحة 5 »… */
const PAGE_REFERENCE =
  /(^|[^\p{L}])((?:pages?|p\.|sayfa(?:sı|da)?|seiten?|páginas?|pagina|صفحة|الصفحة)\s*(\d{1,4}))/giu;

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** Hauteurs stables de la forme d'onde, dérivées de l'identifiant du message. */
function waveform(id: string, count: number): number[] {
  let seed = 0;
  for (const char of id) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  return Array.from({ length: count }, (_, index) => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const random = (seed >>> 8) / 0xffffff;
    const envelope = 0.55 + 0.45 * Math.sin((index / count) * Math.PI);
    return 0.25 + random * 0.75 * envelope;
  });
}

/** Texte de la réponse, avec les références de page cliquables. */
function AnswerText({
  text,
  pageCount,
  onOpenPage,
  goToPageLabel,
}: {
  text: string;
  pageCount: number;
  onOpenPage: (page: number) => void;
  goToPageLabel: (page: number) => string;
}) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(PAGE_REFERENCE)) {
    const page = Number(match[3]);
    if (!page || page > pageCount) continue;
    const start = (match.index ?? 0) + match[1].length;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <button
        key={start}
        type="button"
        onClick={() => onOpenPage(page)}
        title={goToPageLabel(page)}
        className="rounded-md bg-primary-100 px-1.5 py-0.5 font-semibold text-primary-700 transition-colors hover:bg-primary-200"
      >
        {match[2]}
      </button>,
    );
    last = start + match[2].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function hasInlinePageReference(text: string, pageCount: number): boolean {
  for (const match of text.matchAll(PAGE_REFERENCE)) {
    const page = Number(match[3]);
    if (page && page <= pageCount) return true;
  }
  return false;
}

function AnswerAudio({
  message,
  playback,
  knownDuration,
  disabled,
  rate,
  onPlay,
  onPause,
  onSeek,
  onRateChange,
}: {
  message: TutorMessage;
  playback: Playback | null;
  knownDuration: number | undefined;
  disabled: boolean;
  rate: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (ratio: number) => void;
  onRateChange: () => void;
}) {
  const { dict } = useI18n();
  const t = dict.voiceTutor;
  const active = playback?.id === message.id ? playback : null;
  const loading = Boolean(active?.waiting);
  const duration = active?.duration || knownDuration || 0;
  const current = active?.currentTime ?? 0;
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;
  const bars = React.useMemo(() => waveform(message.id, 26), [message.id]);
  const playing = Boolean(active?.playing);

  return (
    <div className="mt-2.5 flex min-w-0 items-center gap-2 rounded-xl bg-canvas px-2 py-1.5 ring-1 ring-line-soft">
      <button
        type="button"
        onClick={playing ? onPause : onPlay}
        disabled={disabled || loading}
        aria-label={loading ? t.loadingAudio : playing ? t.pause : t.listen}
        title={loading ? t.loadingAudio : playing ? t.pause : t.listen}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-primary-600 shadow-card ring-1 ring-line-soft transition-colors hover:bg-primary-50 disabled:opacity-50"
      >
        {loading ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : playing ? (
          <Pause className="size-4" fill="currentColor" aria-hidden />
        ) : (
          <Play className="size-4 translate-x-px" fill="currentColor" aria-hidden />
        )}
      </button>
      <button
        type="button"
        disabled={duration === 0}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          onSeek((event.clientX - box.left) / box.width);
        }}
        aria-label={t.seek}
        className="flex h-7 min-w-0 flex-1 items-center gap-px overflow-hidden disabled:cursor-default sm:gap-[2px]"
      >
        {bars.map((height, index) => (
          <span
            key={index}
            aria-hidden
            className={cn(
              "min-w-px flex-1 rounded-full transition-colors",
              (index + 0.5) / bars.length <= progress ? "bg-primary-600" : "bg-primary-200",
            )}
            style={{ height: `${Math.round(height * 100)}%` }}
          />
        ))}
      </button>
      <span className="shrink-0 font-mono text-[0.7rem] tabular-nums text-ink-500">
        {formatClock(current)} / {duration ? formatClock(duration) : "–:––"}
      </span>
      <button
        type="button"
        onClick={onRateChange}
        aria-label={t.speed(`${rate}x`)}
        title={t.speed(`${rate}x`)}
        className="shrink-0 rounded-md bg-surface px-1.5 py-1 text-[0.7rem] font-bold tabular-nums text-ink-700 ring-1 ring-line-soft transition-colors hover:bg-primary-50"
      >
        {rate}x
      </button>
    </div>
  );
}

export function TutorMessageBubble({
  message,
  pageCount,
  playback,
  knownDuration,
  audioDisabled,
  rate,
  onPlay,
  onPause,
  onSeek,
  onRateChange,
  onOpenPage,
}: {
  message: TutorMessage;
  pageCount: number;
  playback: Playback | null;
  knownDuration: number | undefined;
  audioDisabled: boolean;
  rate: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (ratio: number) => void;
  onRateChange: () => void;
  onOpenPage: (page: number) => void;
}) {
  const { dict } = useI18n();
  const t = dict.voiceTutor;
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2.5">
        <p
          dir="auto"
          className="min-w-0 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-primary-50 px-3.5 py-2.5 text-sm leading-relaxed text-ink-900 ring-1 ring-primary-100"
        >
          <span className="sr-only">{t.you} : </span>
          {message.content}
        </p>
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600"
        >
          <UserRound className="size-4" />
        </span>
      </div>
    );
  }

  const writing = Boolean(message.streaming) && !message.content;
  const showSourceChips =
    !message.streaming &&
    (message.pages?.length ?? 0) > 0 &&
    !hasInlinePageReference(message.content, pageCount);

  return (
    <div className="flex items-start gap-2.5">
      <TeacherBadge className="size-8" />
      <div className="min-w-0 max-w-[92%] flex-1 rounded-2xl rounded-tl-sm bg-surface px-3.5 py-3 shadow-card ring-1 ring-line-soft">
        <span className="sr-only">{t.teacherName} : </span>
        {writing ? (
          <span className="flex items-center gap-1 py-1.5" aria-label={t.statusThinking}>
            <span aria-hidden className="size-1.5 animate-bounce rounded-full bg-primary-400 [animation-delay:-0.3s]" />
            <span aria-hidden className="size-1.5 animate-bounce rounded-full bg-primary-400 [animation-delay:-0.15s]" />
            <span aria-hidden className="size-1.5 animate-bounce rounded-full bg-primary-400" />
          </span>
        ) : null}
        <p
          dir="auto"
          lang={message.language}
          className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-800"
        >
          <AnswerText
            text={message.content}
            pageCount={pageCount}
            onOpenPage={onOpenPage}
            goToPageLabel={t.goToPage}
          />
        </p>
        {showSourceChips ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-meta text-ink-500">{t.sources}</span>
            {message.pages!.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => onOpenPage(page)}
                title={t.goToPage(page)}
                className="rounded-md bg-primary-100 px-1.5 py-0.5 text-meta font-semibold text-primary-700 transition-colors hover:bg-primary-200"
              >
                {t.pageRef(page)}
              </button>
            ))}
          </div>
        ) : null}
        {writing ? null : (
          <AnswerAudio
          message={message}
          playback={playback}
          knownDuration={knownDuration}
          disabled={audioDisabled}
          rate={rate}
          onPlay={onPlay}
          onPause={onPause}
          onSeek={onSeek}
          onRateChange={onRateChange}
          />
        )}
      </div>
    </div>
  );
}

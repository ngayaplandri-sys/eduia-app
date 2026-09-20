"use client";

import * as React from "react";
import { Bot, Send, Plus, LoaderCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InlineErrorBanner } from "@/components/common/inline-error-banner";
import { InsufficientCreditsBanner } from "@/components/credits/insufficient-credits-banner";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";
import type { AssistantMessage } from "@/types";

type ChatMessage = AssistantMessage;

/** Abandon si la route ne répond pas (protège contre une requête qui pend). */
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_CHARS = 4000;

/**
 * Espace de conversation de « Assistant IA ». `initialMessages` restaure la
 * conversation sauvegardée (chargée côté serveur par `AssistantPage` depuis
 * `assistant_conversations`) : l'historique survit à la navigation et à
 * l'actualisation. Chaque message réussi est re-persisté côté serveur par
 * `POST /api/ai/assistant` ; seule « Nouvelle conversation » l'efface
 * (`DELETE /api/ai/assistant/conversation`).
 */
export function AssistantWorkspace({
  initialMessages,
}: {
  initialMessages: ChatMessage[];
}) {
  const { dict } = useI18n();
  const t = dict.assistant;

  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errorCode, setErrorCode] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || pending) return;
    if (text.length > MAX_CHARS) {
      setError(t.charLimit);
      setErrorCode(null);
      return;
    }

    setError(null);
    setErrorCode(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    requestAnimationFrame(autoResize);
    setPending(true);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
        signal: controller.signal,
      });

      const data: { reply?: string; error?: string; code?: string } | null =
        await response.json().catch(() => null);

      if (!response.ok || !data?.reply) {
        setError(data?.error ?? t.errorGeneric);
        setErrorCode(data?.code ?? null);
        return;
      }

      const reply = data.reply;
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
    } catch (caught) {
      setError(
        caught instanceof DOMException && caught.name === "AbortError"
          ? t.timeout
          : t.errorConnection,
      );
    } finally {
      window.clearTimeout(timer);
      setPending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  async function startNewConversation() {
    setClearing(true);
    try {
      const response = await fetch("/api/ai/assistant/conversation", {
        method: "DELETE",
      });
      if (!response.ok) {
        setError(t.newConversationError);
        setErrorCode(null);
        return;
      }
      setMessages([]);
      setError(null);
      setErrorCode(null);
      setInput("");
    } catch {
      setError(t.newConversationError);
      setErrorCode(null);
    } finally {
      setClearing(false);
    }
  }

  function applySuggestion(text: string) {
    setInput(text);
    textareaRef.current?.focus();
  }

  return (
    <Card className="relative flex h-[calc(100vh-13rem)] min-h-[28rem] w-full flex-col overflow-hidden rounded-2xl p-0 sm:h-[calc(100vh-14rem)]">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400"
      />
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 ring-4 ring-primary-50">
            <Bot className="size-[1.15rem]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink-900">{t.assistantName}</p>
            <p className="truncate text-meta text-ink-400">{t.disclaimer}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={clearing}
          onClick={() =>
            messages.length > 0 ? setConfirmOpen(true) : void startNewConversation()
          }
          className="shrink-0"
        >
          {clearing ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
          <span className="hidden sm:inline">{t.newConversation}</span>
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-canvas/50 px-4 py-4 sm:px-5"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary-100 text-primary-600 ring-8 ring-primary-50">
              <Bot className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold text-ink-900">{t.emptyTitle}</p>
              <p className="mx-auto mt-1 max-w-sm text-fine leading-snug text-ink-500">
                {t.emptyBody}
              </p>
            </div>
            <div className="mt-2 flex max-w-md flex-wrap justify-center gap-2">
              {[t.suggestion1, t.suggestion2, t.suggestion3].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
                  className="rounded-full border border-line-soft bg-canvas px-3 py-1.5 text-fine font-medium text-ink-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <ChatBubble
                key={index}
                message={message}
                you={t.you}
                assistantName={t.assistantName}
              />
            ))}
            {pending ? (
              <div className="flex items-center gap-2 self-start rounded-2xl rounded-bl-sm border border-line-soft bg-surface px-4 py-3 shadow-card">
                <span className="sr-only">{t.thinking}</span>
                <span className="flex items-center gap-1" aria-hidden>
                  <span className="size-1.5 animate-bounce rounded-full bg-primary-400 [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-primary-400 [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-primary-400" />
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {error && errorCode === "INSUFFICIENT_CREDITS" ? (
        <InsufficientCreditsBanner message={error} className="mx-4 mb-2 sm:mx-5" />
      ) : error ? (
        <InlineErrorBanner message={error} className="mx-4 mb-2 sm:mx-5" />
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage();
        }}
        className="flex items-end gap-2.5 border-t border-line-soft px-4 py-3.5 sm:px-5"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            autoResize();
          }}
          onKeyDown={handleKeyDown}
          placeholder={t.inputPlaceholder}
          aria-label={t.inputAria}
          rows={1}
          maxLength={MAX_CHARS}
          disabled={pending}
          className="min-w-0 max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-900 transition-colors placeholder:text-ink-400 hover:border-primary-200 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={pending || !input.trim()}
          className="shrink-0"
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
          <span className="hidden sm:inline">{t.send}</span>
        </Button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t.newConversationConfirmTitle}
        description={t.newConversationConfirmBody}
        onConfirm={startNewConversation}
      />
    </Card>
  );
}

function ChatBubble({
  message,
  you,
  assistantName,
}: {
  message: ChatMessage;
  you: string;
  assistantName: string;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <span className="px-1 text-meta font-medium text-ink-400">
        {isUser ? you : assistantName}
      </span>
      <div
        className={cn(
          "min-w-0 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-card sm:max-w-[70%] lg:max-w-3xl",
          isUser
            ? "rounded-br-sm bg-primary-600 text-white"
            : "rounded-bl-sm border border-line-soft bg-surface text-ink-800",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

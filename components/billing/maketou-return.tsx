"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheck, CircleX, Clock, LoaderCircle, LogIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import { formatShortDate } from "@/lib/utils/format";
import { MAKETOU_CART_STORAGE_KEY } from "./maketou-pay-button";
import type { MaketouConfirmStatus } from "@/lib/maketou/catalog";
import type { CreditWallet, UserPlan } from "@/types";

/** Environ 2 minutes de vérification, puis on rassure et on laisse la main au rapprochement. */
const MAX_ATTEMPTS = 30;
const BASE_DELAY_MS = 4_000;
/**
 * Après connexion, retour ici : le panier est retrouvé grâce à l'id mémorisé
 * dans l'onglet, sinon par le dernier paiement de l'acheteur (48 h).
 */
const LOGIN_HREF = `/login?next=${encodeURIComponent("/billing/maketou/return")}`;

type View =
  | { kind: "checking" }
  | { kind: "success"; wallet: CreditWallet | null; plan: UserPlan | null }
  | { kind: "failed" }
  | { kind: "pending" }
  | { kind: "login" };

/**
 * Identifiant du panier : ajouté par Maketou à l'URL de retour (format exact
 * non documenté, lecture défensive), à défaut celui mémorisé au départ.
 */
function readCartId(): string | null {
  const match = /[?&]cart_?id=([0-9a-f-]{36})/i.exec(window.location.search);
  if (match) return match[1];
  try {
    return sessionStorage.getItem(MAKETOU_CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Page de retour après Maketou : interroge NOTRE serveur (jamais Maketou
 * depuis le navigateur) toutes les 4 s au moins, environ 2 minutes. Le
 * paiement n'est annoncé réussi qu'une fois l'accès réellement activé sur le
 * compte ; sinon l'élève peut fermer la page, le rapprochement planifié
 * terminera le travail.
 */
export function MaketouReturn() {
  const { dict, locale } = useI18n();
  const t = dict.billing;
  const [view, setView] = React.useState<View>({ kind: "checking" });

  React.useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const cartId = readCartId();

    async function showSuccess() {
      try {
        sessionStorage.removeItem(MAKETOU_CART_STORAGE_KEY);
      } catch {
        // Stockage indisponible : rien à nettoyer.
      }
      let wallet: CreditWallet | null = null;
      let plan: UserPlan | null = null;
      try {
        const response = await fetch("/api/credits", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { wallet?: CreditWallet; plan?: UserPlan };
          wallet = data.wallet ?? null;
          plan = data.plan ?? null;
        }
      } catch {
        // Le détail du solde est facultatif : l'achat est confirmé côté serveur.
      }
      if (!cancelled) setView({ kind: "success", wallet, plan });
    }

    async function poll(attempt: number) {
      if (cancelled) return;
      if (attempt >= MAX_ATTEMPTS) {
        setView({ kind: "pending" });
        return;
      }
      let delay = BASE_DELAY_MS * (attempt < 10 ? 1 : 1.5);
      try {
        const response = await fetch("/api/billing/maketou/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(cartId ? { cartId } : {}),
          cache: "no-store",
        });
        if (cancelled) return;
        if (response.status === 401) {
          setView({ kind: "login" });
          return;
        }
        if (response.status === 404 || response.status === 503) {
          setView({ kind: "pending" });
          return;
        }
        if (response.ok) {
          const data = (await response.json()) as {
            status?: MaketouConfirmStatus;
            retryAfterMs?: number;
          };
          if (data.status === "completed") {
            await showSuccess();
            return;
          }
          if (data.status === "payment_failed" || data.status === "abandoned") {
            setView({ kind: "failed" });
            return;
          }
          if (data.retryAfterMs) delay = Math.max(delay, data.retryAfterMs);
        }
        // `checking`, `waiting_payment`, 502, réponse illisible : on réessaie.
      } catch {
        // Réseau coupé : on réessaie avec la même cadence.
      }
      timer = window.setTimeout(() => void poll(attempt + 1), delay);
    }

    void poll(0);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const planName = (plan: UserPlan | null) =>
    plan === "premium_plus"
      ? dict.premium.planPremiumPlusTitle
      : plan === "premium"
        ? dict.premium.planPremiumTitle
        : null;

  const card = (
    icon: React.ReactNode,
    title: string,
    body: React.ReactNode,
    actions: React.ReactNode,
  ) => (
    <section
      aria-live="polite"
      className="w-full max-w-md rounded-2xl border border-line bg-surface p-7 text-center shadow-[var(--shadow-pop)] sm:p-8"
    >
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-canvas">{icon}</div>
      <h1 className="mt-5 text-title-sm font-bold text-ink-900">{title}</h1>
      <div className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-500">{body}</div>
      <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">{actions}</div>
    </section>
  );

  const primary = cn(buttonVariants({ variant: "primary", size: "md" }));
  const outline = cn(buttonVariants({ variant: "outline", size: "md" }));

  switch (view.kind) {
    case "checking":
      return card(
        <LoaderCircle className="size-7 animate-spin text-primary-600" aria-hidden />,
        t.checkingTitle,
        <p>{t.checkingBody}</p>,
        null,
      );
    case "success": {
      const name = planName(view.plan);
      return card(
        <CircleCheck className="size-8 text-success-600" aria-hidden />,
        t.successTitle,
        <>
          {name && view.wallet?.periodEnd ? (
            <p>{t.successPlan(name, formatShortDate(view.wallet.periodEnd, locale))}</p>
          ) : null}
          {view.wallet ? <p>{t.successBalance(view.wallet.total)}</p> : null}
        </>,
        <>
          <Link href="/dashboard" className={primary}>
            {t.dashboardCta}
          </Link>
          <Link href="/premium" className={outline}>
            {t.premiumCta}
          </Link>
        </>,
      );
    }
    case "failed":
      return card(
        <CircleX className="size-8 text-danger-500" aria-hidden />,
        t.failedTitle,
        <p>{t.failedBody}</p>,
        <>
          <Link href="/premium" className={primary}>
            {t.retryCta}
          </Link>
          <Link href="/dashboard" className={outline}>
            {t.dashboardCta}
          </Link>
        </>,
      );
    case "pending":
      return card(
        <Clock className="size-7 text-primary-600" aria-hidden />,
        t.pendingTitle,
        <p>{t.pendingBody}</p>,
        <Link href="/dashboard" className={primary}>
          {t.dashboardCta}
        </Link>,
      );
    case "login":
      return card(
        <LogIn className="size-7 text-primary-600" aria-hidden />,
        t.loginTitle,
        <p>{t.loginBody}</p>,
        <Link href={LOGIN_HREF} className={primary}>
          {t.loginCta}
        </Link>,
      );
  }
}

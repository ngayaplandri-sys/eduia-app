import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  ClipboardCheck,
  Coins,
  FilePenLine,
  FileText,
  Gift,
  Repeat,
  Sparkles,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { TiltSurface } from "@/components/motion/tilt-surface";
import { cn } from "@/lib/utils/cn";
import { CREDIT_COSTS, PLAN_CREDITS } from "@/lib/config/credits";
import { formatFcfa } from "@/lib/admin/constants";
import { getDictionary } from "@/lib/i18n/server";
import { PaymentMethodChips } from "@/components/billing/payment-method-chips";
import { SectionHeading, ctaArrowClass, ctaOutlineClass, ctaPrimaryClass } from "./marketing-ui";

interface Plan {
  name: string;
  price: string;
  period?: string;
  credits: string;
  cadence: string;
  points: string[];
  cta: string;
  href: string;
  featured?: boolean;
}

function PlanCard({ plan, recommendedLabel }: { plan: Plan; recommendedLabel: string }) {
  const card = (
    <TiltSurface
      maxTilt={2}
      className={cn(
        "flex h-full flex-col rounded-[1.7rem] p-7 sm:p-8",
        plan.featured ? "bg-surface" : "bg-canvas ring-1 ring-line",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[1.1rem] font-bold text-ink-900">{plan.name}</h3>
        {plan.featured ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-3 py-1 text-[0.72rem] font-bold text-white shadow-[0_8px_18px_-8px_rgb(105_63_168/0.8)]">
            <Sparkles className="size-3.5" aria-hidden />
            {recommendedLabel}
          </span>
        ) : null}
      </div>

      <p className="mt-5 flex items-baseline gap-1.5">
        <span className="font-display text-[2.6rem] font-medium leading-none tracking-[-0.02em] text-ink-900 tabular-nums">
          {plan.price}
        </span>
        {plan.period ? <span className="text-sm font-medium text-ink-400">{plan.period}</span> : null}
      </p>

      <p
        className={cn(
          "mt-5 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-fine",
          plan.featured ? "bg-primary-50 text-primary-700 ring-1 ring-primary-100" : "bg-surface text-ink-700 ring-1 ring-line",
        )}
      >
        <Coins className="size-4 shrink-0" aria-hidden />
        <span className="font-bold tabular-nums">{plan.credits}</span>
        <span className="text-ink-500">{plan.cadence}</span>
      </p>

      <ul className="mt-6 flex-1 space-y-3">
        {plan.points.map((point) => (
          <li key={point} className="flex items-start gap-2.5 text-[0.92rem] leading-snug text-ink-700">
            <span
              className={cn(
                "mt-0.5 flex size-[1.1rem] shrink-0 items-center justify-center rounded-full",
                plan.featured ? "bg-primary-600 text-white" : "bg-success-100 text-success-700",
              )}
            >
              <Check className="size-3" strokeWidth={3} aria-hidden />
            </span>
            {point}
          </li>
        ))}
      </ul>

      <Link
        href={plan.href}
        className={cn(plan.featured ? ctaPrimaryClass : ctaOutlineClass, "mt-8 w-full")}
      >
        {plan.cta}
        <ArrowRight className={ctaArrowClass} aria-hidden />
      </Link>
    </TiltSurface>
  );

  if (!plan.featured) return card;

  // Offre recommandée : liseré en dégradé violet + halo, pas seulement plus haute.
  return (
    <div className="relative h-full rounded-[1.8rem] bg-[linear-gradient(160deg,var(--color-primary-300),var(--color-primary-600)_45%,var(--color-primary-200))] p-px shadow-[var(--shadow-glow-lg)]">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary-300/30 blur-3xl dark:bg-primary-400/15" />
      {card}
    </div>
  );
}

/**
 * Tarifs — les DEUX offres réelles (`lib/config/credits.ts`) : Gratuit et
 * Premium, puis le coût de chaque outil et le bloc « Paiement ». Les boutons
 * mènent au flux existant : inscription pour un visiteur, page `/premium`
 * pour un membre connecté.
 *
 * Moyens de paiement : uniquement ceux déclarés dans
 * `lib/config/payment-methods.ts` — ceux que propose réellement la page de
 * paiement Maketou de la boutique.
 */
export async function LandingPricing({ isAuthenticated }: { isAuthenticated: boolean }) {
  const dict = await getDictionary();
  const t = dict.marketing.pricing;
  const p = dict.marketing.payment;
  const signup = "/signup";

  const plans: Plan[] = [
    {
      name: t.free.name,
      price: formatFcfa(PLAN_CREDITS.free.priceFcfa),
      credits: t.credits(PLAN_CREDITS.free.signupGrant),
      cadence: t.creditsOnce,
      points: t.free.points(PLAN_CREDITS.free.signupGrant),
      cta: isAuthenticated ? dict.marketing.header.dashboardCta : t.free.cta,
      href: isAuthenticated ? "/dashboard" : signup,
    },
    {
      name: t.premium.name,
      price: formatFcfa(PLAN_CREDITS.premium.priceFcfa),
      period: t.period,
      credits: t.credits(PLAN_CREDITS.premium.monthly),
      cadence: t.creditsMonthly,
      points: t.premium.points(PLAN_CREDITS.premium.monthly),
      cta: isAuthenticated ? t.choosePlan : t.premium.cta,
      href: isAuthenticated ? "/premium" : signup,
      featured: true,
    },
  ];

  const costs = [
    { label: t.costs.resumer, cost: CREDIT_COSTS.resumer, icon: FileText, tone: "bg-success-100 text-success-700" },
    { label: t.costs.generer, cost: CREDIT_COSTS.generer, icon: FilePenLine, tone: "bg-primary-100 text-primary-700" },
    { label: t.costs.corriger, cost: CREDIT_COSTS.corriger, icon: ClipboardCheck, tone: "bg-warning-100 text-warning-700" },
    { label: t.costs.assistant, cost: CREDIT_COSTS.assistant, icon: Bot, tone: "bg-info-100 text-info-700" },
  ];

  const paymentPoints = [
    { icon: Coins, text: p.points.fcfa },
    { icon: Gift, text: p.points.noCard },
    {
      icon: Zap,
      text: p.points.premium(formatFcfa(PLAN_CREDITS.premium.priceFcfa), PLAN_CREDITS.premium.monthly),
    },
    { icon: Repeat, text: p.points.monthly },
  ];

  return (
    <section
      id="tarifs"
      className="relative isolate scroll-mt-20 overflow-hidden bg-surface pb-24 pt-24 sm:pb-28 sm:pt-28 lg:pb-32 lg:pt-32"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-canvas to-transparent" />
        <div className="absolute left-1/2 top-1/4 h-[30rem] w-[60rem] max-w-[120%] -translate-x-1/2 rounded-[50%] bg-primary-100/70 blur-[130px] dark:bg-primary-200/20" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          before={t.heading}
          accent={t.headingAccent}
          after={t.headingSuffix ? ` ${t.headingSuffix}` : ""}
          subtitle={t.subtitle}
          align="center"
        />

        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
          {plans.map((plan, i) => (
            <Reveal
              key={plan.name}
              variant={plan.featured ? "scale" : "up"}
              delayMs={plan.featured ? 180 : i * 110}
              className="h-full"
            >
              <PlanCard plan={plan} recommendedLabel={t.recommended} />
            </Reveal>
          ))}
        </div>

        {/* Coût de chaque outil (valeurs réelles de CREDIT_COSTS). */}
        <Reveal delayMs={120} className="mx-auto mt-10 max-w-4xl">
          <div className="rounded-[1.5rem] bg-canvas p-5 ring-1 ring-line sm:p-6">
            <h3 className="text-fine font-bold text-ink-900">{t.costsHeading}</h3>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {costs.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label} className="flex items-center gap-3 rounded-xl bg-surface px-3.5 py-3 ring-1 ring-line">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", item.tone)}>
                      <Icon className="size-[1.05rem]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 text-fine font-medium text-ink-700">{item.label}</span>
                    <span className="shrink-0 text-fine font-bold tabular-nums text-ink-900">{t.costUnit(item.cost)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>

        {/* ── Paiement ── */}
        <Reveal className="mx-auto mt-6 max-w-4xl">
          <div className="rounded-[1.5rem] bg-scene-auth p-7 text-white shadow-[var(--shadow-elevated)] sm:p-8">
            <h3 className="font-display text-[1.75rem] font-medium leading-tight tracking-[-0.01em]">{p.heading}</h3>
            <p className="mt-2 text-[0.95rem] text-white/70">{p.subtitle}</p>
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {paymentPoints.map((point, i) => {
                const Icon = point.icon;
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/12 ring-1 ring-white/15">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="pt-1.5 text-[0.92rem] leading-snug text-white/85">{point.text}</span>
                  </li>
                );
              })}
            </ul>

            {/* Moyens de paiement réellement proposés par la page Maketou. */}
            <div className="mt-7 border-t border-white/10 pt-5">
              <p className="text-fine font-semibold text-white/70">{p.methodsHeading}</p>
              <PaymentMethodChips cardLabel={dict.billing.cardLabel} tone="dark" className="mt-3" />
              <p className="mt-3 text-meta text-white/60">{dict.billing.secureLine}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

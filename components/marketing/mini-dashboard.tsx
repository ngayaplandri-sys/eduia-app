import Image from "next/image";
import {
  ArrowRight,
  Bell,
  Bot,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Crown,
  FilePenLine,
  FileText,
  FolderOpen,
  History,
  House,
  Search,
  Settings,
  Sparkles,
  Activity,
} from "lucide-react";
import heroStudents from "@/public/illustrations/hero-student.jpg";
import { cn } from "@/lib/utils/cn";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { BrandLockup } from "./brand-lockup";

/**
 * Réplique miniature du vrai tableau de bord d'EduIA, dessinée à taille réelle
 * (1280 × 800, réduite par `ScaledScreen`) avec les mêmes libellés que
 * l'application (`dict.nav`, `dict.dashboard`, `dict.layout`), le même logo
 * et la même illustration : passer de la landing au dashboard, c'est retrouver
 * exactement cet écran. Les compteurs sont des valeurs d'exemple. Tokens du
 * design system : suit le thème clair/sombre comme l'application.
 */
export function MiniDashboard({ dict, name }: { dict: Dictionary; name: string }) {
  const nav = [
    { label: dict.nav.dashboard, icon: House, tone: "text-primary-600", active: true },
    { label: dict.nav.resumer, icon: FileText, tone: "text-success-600" },
    { label: dict.nav.generer, icon: FilePenLine, tone: "text-primary-600" },
    { label: dict.nav.corriger, icon: ClipboardCheck, tone: "text-warning-600" },
    { label: dict.nav.assistant, icon: Bot, tone: "text-primary-600" },
  ];
  const secondary = [
    { label: dict.nav.documents, icon: FolderOpen },
    { label: dict.nav.historique, icon: History },
    { label: dict.nav.parametres, icon: Settings },
    { label: dict.nav.aide, icon: CircleHelp },
  ];
  const stats = [
    { label: dict.dashboard.statsDocumentsLabel, value: "12", icon: FolderOpen, tone: "bg-primary-50 text-primary-600" },
    { label: dict.dashboard.statsSummariesLabel, value: "8", icon: Sparkles, tone: "bg-success-50 text-success-600" },
    { label: dict.dashboard.statsActivityLabel, value: "27", icon: Activity, tone: "bg-info-50 text-info-600" },
  ];
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="flex size-full bg-canvas font-sans text-ink-900">
      {/* Barre latérale. */}
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-line bg-surface px-4 py-6">
        <div className="px-2">
          <span className="block h-11">
            <BrandLockup sizes="160px" />
          </span>
          <p className="mt-1 pl-0.5 text-[0.72rem] font-medium text-ink-400">{dict.layout.tagline}</p>
        </div>
        <ul className="mt-7 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem]",
                  item.active ? "bg-primary-100 font-semibold text-ink-900" : "text-ink-700",
                )}
              >
                <Icon className={cn("size-[1.15rem]", item.tone)} />
                {item.label}
              </li>
            );
          })}
        </ul>
        <div className="my-4 h-px bg-line" />
        <ul className="space-y-1">
          {secondary.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] text-ink-700">
                <Icon className="size-[1.15rem] text-ink-500" />
                {item.label}
              </li>
            );
          })}
        </ul>
        <div className="mt-auto rounded-2xl bg-scene-premium p-4 text-center ring-1 ring-line">
          <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-surface/80 text-primary-600">
            <Crown className="size-4" />
          </span>
          <p className="mt-2 text-sm font-bold">{dict.layout.premiumCardTitle}</p>
          <p className="mt-1 text-[0.72rem] leading-snug text-ink-500">{dict.layout.premiumCardBody}</p>
          <p className="mt-3 rounded-lg bg-primary-600 py-2 text-[0.78rem] font-semibold text-white">
            {dict.layout.premiumCardCta}
          </p>
        </div>
      </aside>

      {/* Contenu. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-line bg-surface/80 px-8">
          <p className="text-[1.6rem] font-bold tracking-[-0.01em]">{dict.nav.dashboard}</p>
          <div className="flex items-center gap-5">
            <div className="flex h-11 w-[400px] items-center gap-2.5 rounded-xl border border-line bg-surface px-4 text-[0.9rem] text-ink-400">
              <Search className="size-4" />
              <span className="truncate">{dict.layout.searchPlaceholder}</span>
            </div>
            <Bell className="size-5 text-ink-500" />
            <div className="flex items-center gap-2.5">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                {initials}
              </span>
              <span>
                <span className="block text-sm font-bold leading-tight">{name}</span>
              </span>
              <ChevronDown className="size-4 text-ink-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-6 overflow-hidden p-8">
          <section className="grid grid-cols-[1fr_1.05fr] items-center gap-6 overflow-hidden rounded-3xl bg-scene-dashboard p-10 shadow-[var(--shadow-elevated)]">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/70 px-3 py-1 text-[0.8rem] font-semibold text-primary-700 ring-1 ring-line">
                {dict.dashboard.welcome(name)}
              </span>
              <p className="mt-4 font-display text-[3.2rem] font-medium leading-[1.03] tracking-[-0.01em]">
                {dict.dashboard.heroTitleBefore}
                <span className="italic text-primary-600">{dict.dashboard.heroTitleAccent}</span>
              </p>
              <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-ink-500">{dict.dashboard.heroBody}</p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-3 text-[0.95rem] font-semibold text-white">
                {dict.dashboard.heroCta}
                <ArrowRight className="size-4" />
              </span>
            </div>
            <Image
              src={heroStudents}
              alt=""
              sizes="300px"
              className="h-auto w-full [mask-image:linear-gradient(to_right,transparent_0,#000_6%,#000_94%,transparent_100%)]"
            />
          </section>

          <div className="grid grid-cols-3 gap-5">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-center gap-4 rounded-2xl bg-surface px-6 py-5 ring-1 ring-line">
                  <span className={cn("flex size-11 items-center justify-center rounded-xl", stat.tone)}>
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-[1.7rem] font-bold leading-none">{stat.value}</span>
                    <span className="mt-1 block text-sm text-ink-500">{stat.label}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

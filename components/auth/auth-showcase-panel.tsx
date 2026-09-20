import Image from "next/image";
import { FileText, FilePenLine, ClipboardCheck, Bot, Globe } from "lucide-react";
import logoMark from "@/public/brand/eduia-mark.png";
import { siteConfig } from "@/lib/config/site";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Volet de marque des pages connexion/inscription — identité visuelle d'EduIA
 * (logo, slogan, présentation, disponibilité FR/EN). Contenu localisé (le
 * formulaire passe par `AuthForm`, déjà i18n). Compact sur mobile (empilé
 * au-dessus du formulaire) ; à partir de `lg`, occupe exactement la moitié de
 * la carte connexion/inscription (`lg:w-1/2`, voir `app/(auth)/layout.tsx`).
 */
export async function AuthShowcasePanel() {
  const dict = await getDictionary();
  const t = dict.auth;

  const tools = [
    { icon: FileText, label: t.showcaseToolSummarize },
    { icon: FilePenLine, label: t.showcaseToolGenerate },
    { icon: ClipboardCheck, label: t.showcaseToolGrade },
    { icon: Bot, label: t.showcaseToolAssistant },
  ];

  return (
    <div className="relative isolate flex shrink-0 flex-col overflow-hidden bg-scene-auth px-6 py-6 sm:px-10 sm:py-8 lg:w-1/2 lg:px-11 lg:py-[clamp(1.25rem,5vh,3rem)]">
      {/* Halo décoratif — purement additif, cohérent avec les autres scènes. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 -z-10 size-[26rem] rounded-full bg-white/10 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 -z-10 size-[22rem] rounded-full bg-primary-400/20 blur-[110px]"
      />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center lg:mx-0 lg:max-w-none">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-fine font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
          {t.showcaseEyebrow}
        </span>

        <div className="mt-4 flex items-center gap-3 lg:mt-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[var(--shadow-elevated)] sm:size-12">
            <Image
              src={logoMark}
              alt=""
              priority
              sizes="44px"
              className="size-7 w-auto sm:size-8"
            />
          </span>
          <span className="font-display text-xl font-medium tracking-[-0.01em] text-white sm:text-2xl">
            {siteConfig.name}
          </span>
        </div>

        <p className="mt-4 font-display text-display-sm font-medium leading-[1.12] tracking-[-0.01em] text-white lg:mt-3.5 lg:text-display-md">
          {t.showcaseSlogan}
        </p>

        <p className="mt-3 hidden max-w-none text-[0.9rem] leading-relaxed text-white/70 lg:block">
          {t.showcaseDescription}
        </p>

        <span className="mt-4 inline-flex w-fit items-center gap-1.5 text-fine font-medium text-white/60 lg:mt-3">
          <Globe className="size-3.5" aria-hidden />
          {t.showcaseBilingualNote}
        </span>

        <div className="mt-6 hidden grid-cols-4 gap-2.5 lg:grid">
          {tools.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 px-2 py-3 text-center ring-1 ring-white/10"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white">
                <Icon className="size-3.5" strokeWidth={2} aria-hidden />
              </span>
              <span className="text-fine font-medium text-white/80">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

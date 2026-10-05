import Image from "next/image";
import { Check, Sparkles } from "lucide-react";
import studyDesk from "@/public/landing/study-desk.jpg";
import phoneLeft from "@/public/landing/phone-left.webp";
import phoneRight from "@/public/landing/phone-right.webp";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils/cn";
import { marketingPhone } from "@/lib/config/marketing";
import { quadToMatrix3d } from "@/lib/marketing/screen-quad";
import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { SectionHeading } from "./marketing-ui";
import { ParallaxScene } from "./parallax-scene";
import { PhoneShot } from "./phone-shot";
import { GenerateExamScreen, ImportCourseScreen } from "./how-phone-screens";

const SCREEN = marketingPhone.screen;
const LEFT_SCREEN = quadToMatrix3d(SCREEN.width, SCREEN.height, marketingPhone.quads.left);
const RIGHT_SCREEN = quadToMatrix3d(SCREEN.width, SCREEN.height, marketingPhone.quads.right);

/** Une étape « 01 / 02 / 03 », révélée au scroll. */
function Step({ index, title, description, delayMs }: { index: number; title: string; description: string; delayMs: number }) {
  return (
    <Reveal delayMs={delayMs} className="relative flex gap-5">
      <span className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full bg-surface font-display text-[1.05rem] font-medium tabular-nums text-primary-600 shadow-[var(--shadow-card)] ring-1 ring-primary-200">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="pt-1.5">
        <h3 className="text-[1.02rem] font-bold text-ink-900">{title}</h3>
        <p className="mt-1.5 text-[0.93rem] leading-relaxed text-ink-700">{description}</p>
      </div>
    </Reveal>
  );
}

/** Puce d'interface au premier plan (verre clair, couleurs fixes). */
function ForegroundChip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("glass-panel flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-[0.82rem] font-semibold text-[#1b1f2a]", className)}>
      {children}
    </div>
  );
}

function LeftPhone({ dict, sizes, className }: { dict: Dictionary; sizes: string; className?: string }) {
  return (
    <PhoneShot
      image={phoneLeft}
      side="left"
      screenTransform={LEFT_SCREEN}
      sizes={sizes}
      ariaLabel={dict.marketing.how.phoneAriaSummarize}
      className={className}
    >
      <ImportCourseScreen />
    </PhoneShot>
  );
}

function RightPhone({ dict, sizes, className }: { dict: Dictionary; sizes: string; className?: string }) {
  return (
    <PhoneShot
      image={phoneRight}
      side="right"
      screenTransform={RIGHT_SCREEN}
      sizes={sizes}
      ariaLabel={dict.marketing.how.phoneAriaGrade}
      className={className}
    >
      <GenerateExamScreen />
    </PhoneShot>
  );
}

/**
 * « Comment ça marche ? » — scène de photographie publicitaire.
 *
 * Trois plans (ordinateur) :
 *  - arrière-plan : un bureau d'étude photographié (lumière chaude de fenêtre,
 *    lueur violette EduIA dans la bibliothèque), à peine déplacé à la souris ;
 *  - plan intermédiaire : deux vrais smartphones photographiés (le même
 *    appareil, en miroir), posés sur le plateau avec ombre de contact et
 *    reflet, la vraie interface EduIA projetée sur leur vitre ;
 *  - premier plan : deux petites cartes d'interface et de fines particules
 *    lumineuses, qui bougent le plus.
 * Le texte central, sur un voile lumineux, reste presque immobile.
 *
 * Mobile/tablette : titre → étape 1 → téléphone 1 → étape 2 → téléphone 2 →
 * étape 3, chaque téléphone dans son propre cadrage du même bureau.
 */
export async function LandingHow() {
  const dict = await getDictionary();
  const t = dict.marketing.how;
  const screens = dict.marketing.features.previews.correction;

  return (
    <section
      id="comment-ca-marche"
      className="relative isolate scroll-mt-20 overflow-hidden bg-canvas"
    >
      {/* ───────────────────────── Ordinateur : la scène ───────────────────────── */}
      <ParallaxScene className="relative hidden lg:block lg:aspect-[4/3] xl:aspect-[16/9]">
        {/* Arrière-plan : bureau d'étude (flou de profondeur de champ intégré à
            l'image : aucun filtre à recalculer pendant la parallaxe). */}
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="depth-layer absolute -inset-[2.5%]" style={{ "--depth": 5 } as React.CSSProperties}>
            <Image
              src={studyDesk}
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-bottom dark:brightness-[0.4] dark:saturate-[1.2]"
            />
          </div>
          {/* Continuité avec la page : fondus haut et bas, voile lumineux central. */}
          <div className="absolute inset-x-0 top-0 h-[24%] bg-gradient-to-b from-canvas via-canvas/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[12%] bg-gradient-to-t from-surface to-transparent" />
          <div className="absolute left-1/2 top-[47%] h-[74%] w-[44%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-white/65 blur-[70px] dark:bg-[#0e1015]/60" />
          {/* Vignettage doux : bords légèrement assombris, comme à l'objectif. */}
          <div className="absolute inset-0 bg-[radial-gradient(120%_95%_at_50%_42%,transparent_58%,rgba(43,27,74,0.16)_100%)]" />
        </div>

        {/* Halos derrière les téléphones (lumière violette EduIA + chaude). */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-[5]">
          <div className="absolute bottom-[18%] left-[3%] h-[62%] w-[26%] rounded-[50%] bg-[#9a76cf]/30 blur-[90px]" />
          <div className="absolute bottom-[24%] left-[12%] h-[34%] w-[16%] rounded-[50%] bg-[#ffd9a8]/35 blur-[70px] dark:bg-[#ffd9a8]/10" />
          <div className="absolute bottom-[18%] right-[3%] h-[62%] w-[26%] rounded-[50%] bg-[#8a6ce0]/35 blur-[90px]" />
        </div>

        {/* Téléphone gauche. */}
        <div
          className="depth-layer absolute bottom-[15%] left-[4%] h-[72%] xl:left-[7%] xl:h-[74%]"
          style={{ "--depth": 14 } as React.CSSProperties}
        >
          <Reveal variant="phone" delayMs={120} className="relative h-full">
            <LeftPhone dict={dict} sizes="(min-width: 1280px) 19vw, 24vw" className="h-full" />
            {/* Premier plan : puce ancrée au téléphone, côté extérieur (jamais sur le texte). */}
            <div
              aria-hidden
              className="depth-layer pointer-events-none absolute bottom-[5%] -left-[14%]"
              style={{ "--depth": 16 } as React.CSSProperties}
            >
              <Reveal variant="scale" delayMs={900}>
                <ForegroundChip className="animate-float-slow">
                  <span className="flex size-6 items-center justify-center rounded-full bg-[#158f52] text-white">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  {dict.dropzone.textExtracted}
                </ForegroundChip>
              </Reveal>
            </div>
          </Reveal>
        </div>

        {/* Téléphone droit. */}
        <div
          className="depth-layer absolute bottom-[15%] right-[4%] h-[72%] xl:right-[7%] xl:h-[74%]"
          style={{ "--depth": 20 } as React.CSSProperties}
        >
          <Reveal variant="phone" delayMs={420} className="relative h-full">
            <RightPhone dict={dict} sizes="(min-width: 1280px) 19vw, 24vw" className="h-full" />
            <div
              aria-hidden
              className="depth-layer pointer-events-none absolute -right-[10%] bottom-[11%]"
              style={{ "--depth": 16 } as React.CSSProperties}
            >
              <Reveal variant="scale" delayMs={1150}>
                <ForegroundChip className="animate-float-slow [animation-delay:-4s]">
                  <span className="font-display text-[1.05rem] tabular-nums text-[#12723f]">{screens.score}</span>
                  <span className="flex items-center gap-1 text-[#12723f]">
                    <Sparkles className="size-3.5" />
                    {t.screens.praise}
                  </span>
                </ForegroundChip>
              </Reveal>
            </div>
          </Reveal>
        </div>

        {/* Contenu central, presque immobile. */}
        <div
          className="depth-layer absolute inset-y-0 left-0 right-0 mx-auto flex w-[42%] items-center xl:w-[38%]"
          style={{ "--depth": 2 } as React.CSSProperties}
        >
          <div className="w-full">
            <SectionHeading
              before={t.heading}
              accent={t.headingAccent}
              after={t.headingSuffix}
              subtitle={t.subtitle}
              align="center"
            />
            <Reveal variant="fade" className="relative mx-auto mt-9 max-w-md">
              <span
                aria-hidden
                className="draw-line-y absolute bottom-8 left-[1.375rem] top-8 w-px bg-gradient-to-b from-primary-300 via-primary-200 to-transparent"
              />
              <ol className="space-y-7">
                {t.steps.map((step, i) => (
                  <li key={step.title}>
                    <Step index={i} title={step.title} description={step.description} delayMs={200 + i * 170} />
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>

        {/* Premier plan : particules lumineuses (les puces sont ancrées aux téléphones). */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* Particules : quelques reflets flous, très discrets. */}
          {[
            "left-[27%] top-[22%] size-2",
            "left-[33%] top-[68%] size-1.5",
            "right-[30%] top-[18%] size-1.5",
            "right-[26%] top-[64%] size-2",
            "left-[48%] top-[12%] size-1",
          ].map((spot, k) => (
            <div key={spot} className={cn("depth-layer absolute", spot)} style={{ "--depth": 40 } as React.CSSProperties}>
              <span
                className="block size-full animate-float-slow rounded-full bg-white shadow-[0_0_14px_4px_rgba(203,182,243,0.7)] opacity-70 dark:opacity-50"
                style={{ animationDelay: `${-k * 1.7}s` }}
              />
            </div>
          ))}
        </div>
      </ParallaxScene>

      {/* ───────────────────────── Mobile / tablette : l'histoire ───────────────────────── */}
      <div className="mx-auto max-w-xl px-4 pb-24 pt-24 sm:px-6 sm:pb-28 sm:pt-28 lg:hidden">
        <SectionHeading
          before={t.heading}
          accent={t.headingAccent}
          after={t.headingSuffix}
          subtitle={t.subtitle}
          align="center"
        />

        <div className="mt-12 space-y-10">
          <Step index={0} title={t.steps[0].title} description={t.steps[0].description} delayMs={0} />
          <MobilePhoneScene objectPosition="object-[18%_100%]">
            <LeftPhone dict={dict} sizes="60vw" className="h-full" />
          </MobilePhoneScene>
          <Step index={1} title={t.steps[1].title} description={t.steps[1].description} delayMs={0} />
          <MobilePhoneScene objectPosition="object-[84%_100%]">
            <RightPhone dict={dict} sizes="60vw" className="h-full" />
          </MobilePhoneScene>
          <Step index={2} title={t.steps[2].title} description={t.steps[2].description} delayMs={0} />
        </div>
      </div>
    </section>
  );
}

/** Cadrage mobile : un téléphone debout sur le même bureau photographié. */
function MobilePhoneScene({ objectPosition, children }: { objectPosition: string; children: React.ReactNode }) {
  return (
    <Reveal variant="phone">
      <div className="relative mx-auto aspect-[2/3] w-full max-w-sm overflow-hidden rounded-[2rem] shadow-[0_40px_80px_-40px_rgb(43_27_74/0.55)] ring-1 ring-black/5">
        <Image
          src={studyDesk}
          alt=""
          fill
          sizes="(min-width: 640px) 384px, 92vw"
          className={cn("object-cover dark:brightness-[0.45] dark:saturate-[1.2]", objectPosition)}
        />
        <div aria-hidden className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent dark:from-black/30" />
        <div aria-hidden className="absolute bottom-[16%] left-1/2 h-[60%] w-[70%] -translate-x-1/2 rounded-[50%] bg-[#9a76cf]/30 blur-[50px]" />
        <div className="absolute bottom-[13%] left-1/2 h-[80%] -translate-x-1/2">{children}</div>
      </div>
    </Reveal>
  );
}

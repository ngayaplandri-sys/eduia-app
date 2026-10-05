import { cn } from "@/lib/utils/cn";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

/**
 * Briques visuelles partagées par les sections de la landing.
 *
 * Signature typographique = celle du dashboard (« Ton assistant IA pour
 * *apprendre* ») : titres en `font-display` (Fraunces) médium, un mot-clé en
 * italique violet de la même famille. Le reste de l'interface reste en
 * Plus Jakarta Sans.
 */

/** CTA principal : violet plein, ombre teintée, reflet au survol. */
export const ctaPrimaryClass = cn(
  buttonVariants({ variant: "primary", size: "lg" }),
  "cta-sheen group h-[3.25rem] rounded-xl px-6 text-[0.95rem]",
  "shadow-[0_18px_40px_-16px_rgb(124_79_190/0.75)] hover:shadow-[0_24px_52px_-14px_rgb(124_79_190/0.9)]",
);

/** CTA blanc sur fond violet profond (bandeau final). */
export const ctaLightClass = cn(
  buttonVariants({ size: "lg" }),
  "cta-sheen group h-[3.25rem] rounded-xl bg-white px-6 text-[0.95rem] text-[#553087]",
  "shadow-[0_18px_40px_-18px_rgb(0_0_0/0.55)] hover:bg-[#f6f4fb] active:bg-[#ebe4f7]",
);

/** CTA secondaire sur fond sombre : verre translucide + liseré clair. */
export const ctaGhostDarkClass = cn(
  buttonVariants({ size: "lg" }),
  "group h-[3.25rem] rounded-xl border border-white/20 bg-white/[0.07] px-6 text-[0.95rem] text-white backdrop-blur-md",
  "hover:border-white/35 hover:bg-white/[0.13]",
);

/** CTA secondaire sur fond clair. */
export const ctaOutlineClass = cn(
  buttonVariants({ variant: "outline", size: "lg" }),
  "group h-[3.25rem] rounded-xl px-6 text-[0.95rem]",
);

/** Flèche qui avance d'un cran quand on survole le CTA parent (`group`). */
export const ctaArrowClass =
  "size-[1.1rem] transition-transform duration-300 ease-out group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0";

interface SectionHeadingProps {
  before: string;
  accent: string;
  after?: string;
  subtitle?: string;
  /** `dark` : titre posé sur une scène sombre (texte clair). */
  tone?: "light" | "dark";
  align?: "left" | "center";
  id?: string;
  className?: string;
}

/** Titre de section révélé au scroll : mot-clé en italique violet. */
export function SectionHeading({
  before,
  accent,
  after = "",
  subtitle,
  tone = "light",
  align = "left",
  id,
  className,
}: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <Reveal
      className={cn(
        align === "center" ? "mx-auto text-center" : "text-left",
        "max-w-3xl",
        className,
      )}
    >
      <h2
        id={id}
        className={cn(
          "font-display text-[2.15rem] font-medium leading-[1.08] tracking-[-0.015em] sm:text-[2.6rem] lg:text-[3.05rem]",
          dark ? "text-white" : "text-ink-900",
        )}
      >
        {before}{" "}
        <span className={cn("italic", dark ? "text-[#cbb6f3]" : "text-primary-600")}>
          {accent}
        </span>
        {after}
      </h2>
      {subtitle ? (
        <p
          className={cn(
            "mt-4 max-w-[58ch] text-[1.02rem] leading-relaxed",
            align === "center" && "mx-auto",
            dark ? "text-white/70" : "text-ink-500",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </Reveal>
  );
}

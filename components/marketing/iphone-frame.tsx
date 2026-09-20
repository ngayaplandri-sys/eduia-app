import { cn } from "@/lib/utils/cn";

/**
 * Mockup d'iPhone réaliste en CSS pur (aucun asset image) : cadre « titane »
 * en dégradé, île dynamique, boutons latéraux, barre d'accueil, écran aux
 * coins arrondis. Les couleurs du cadre sont volontairement des valeurs
 * fixes (non tokenisées) — un boîtier de téléphone ne doit jamais s'inverser
 * avec le thème clair/sombre du site, contrairement au reste de l'UI (même
 * logique que `bg-hero-gradient`, le seul autre aplat non tokenisé de l'app).
 * Composant purement présentatif : l'inclinaison interactive vit dans le
 * client `InteractivePhone` qui l'enveloppe.
 */
export function IPhoneFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-[12.5rem] shrink-0 select-none lg:w-[13rem] xl:w-[14.5rem]",
        "aspect-[9/19.3]",
        className,
      )}
    >
      {/* Boutons latéraux — sous le cadre pour un léger relief au bord. */}
      <span
        aria-hidden
        className="absolute -left-px top-[16%] h-6 w-[3px] rounded-l-sm bg-[#1a1b1f]"
      />
      <span
        aria-hidden
        className="absolute -left-px top-[23%] h-10 w-[3px] rounded-l-sm bg-[#1a1b1f]"
      />
      <span
        aria-hidden
        className="absolute -left-px top-[31%] h-10 w-[3px] rounded-l-sm bg-[#1a1b1f]"
      />
      <span
        aria-hidden
        className="absolute -right-px top-[20%] h-14 w-[3px] rounded-r-sm bg-[#1a1b1f]"
      />

      {/* Cadre titane : dégradé + liseré de lumière simulant un bord métallique. */}
      <div className="absolute inset-0 rounded-[2.6rem] bg-[linear-gradient(160deg,#55575f_0%,#26272c_38%,#0b0c0e_100%)] p-[0.4rem] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
        <div className="pointer-events-none absolute inset-0 rounded-[2.6rem] [background:linear-gradient(150deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_16%,rgba(255,255,255,0)_84%,rgba(255,255,255,0.08)_100%)]" />

        {/* Écran. */}
        <div className="relative size-full overflow-hidden rounded-[2.15rem] bg-white">
          <div
            aria-hidden
            className="absolute left-1/2 top-[0.5rem] z-20 h-[1.3rem] w-[5.2rem] -translate-x-1/2 rounded-full bg-[#0b0c0e]"
          />
          <div className="size-full pt-8">{children}</div>
          <div
            aria-hidden
            className="absolute bottom-[0.45rem] left-1/2 h-[0.28rem] w-[5.5rem] -translate-x-1/2 rounded-full bg-[#0b0c0e]/20"
          />
        </div>
      </div>
    </div>
  );
}

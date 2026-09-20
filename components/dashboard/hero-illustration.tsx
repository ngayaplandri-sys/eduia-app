import Image from "next/image";
import heroStudent from "@/public/illustrations/hero-student.jpg";
import { cn } from "@/lib/utils/cn";

/**
 * Illustration principale du hero — visuel premium (rendu 3D/cartoon).
 * Fichier source : public/illustrations/hero-student.jpg
 * Original fourni : assets/illustrations-source/hero-students-duo-original.png
 *
 * Le fichier est recadré au ras de la scène (aucun liseré blanc) et les bords
 * sont fondus au masque pour que l'image se confonde avec le dégradé du bloc
 * hero — pas de cadre, pas d'ombre, pas de séparation visible. La photo garde
 * ses teintes violettes d'origine (hoodie, lueur du laptop) : un léger voile
 * navy en overlay (`mix-blend-mode`) la rapproche de la nouvelle identité sans
 * regénérer l'asset (étalonnage colorimétrique, pas de retouche du fichier).
 */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-auto w-full max-w-[32rem]", className)}>
      <Image
        src={heroStudent}
        alt="Deux élèves souriants devant un ordinateur portable au logo cerveau, utilisant l'intelligence artificielle, entourés d'icônes d'apprentissage"
        priority
        placeholder="blur"
        sizes="(min-width: 1024px) 32rem, (min-width: 640px) 26rem, 92vw"
        className={cn(
          "h-auto w-full",
          // Fond de l'image fondu vers le dégradé du bloc sur les 4 bords :
          // deux dégradés de masque croisés (intersection) → aucun bord net,
          // aucun rectangle visible, le centre reste parfaitement net.
          "[mask-image:linear-gradient(to_right,transparent_0,#000_11%,#000_89%,transparent_100%),linear-gradient(to_bottom,transparent_0,#000_10%,#000_90%,transparent_100%)]",
          "[mask-composite:intersect] [-webkit-mask-composite:source-in]",
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-600/15 via-transparent to-accent-500/10 mix-blend-multiply [mask-image:linear-gradient(to_right,transparent_0,#000_11%,#000_89%,transparent_100%),linear-gradient(to_bottom,transparent_0,#000_10%,#000_90%,transparent_100%)] [mask-composite:intersect] [-webkit-mask-composite:source-in]"
      />
    </div>
  );
}

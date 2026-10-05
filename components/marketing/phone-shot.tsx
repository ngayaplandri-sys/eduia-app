"use client";

import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils/cn";
import { marketingPhone } from "@/lib/config/marketing";
import { ScaledScreen } from "./scaled-screen";

/**
 * Smartphone photographié + vraie interface EduIA projetée sur sa vitre.
 *
 * Couches, de l'arrière vers l'avant :
 *  1. ombre de contact sur le bureau (ellipse floue) ;
 *  2. reflet du téléphone dans le plateau brillant (image retournée, fondue) ;
 *  3. la photo détourée du téléphone (cadre titane, verre, boutons) ;
 *  4. l'interface, dessinée en 390 × 844 puis projetée en perspective exacte
 *     sur l'écran (`matrix3d` calculée depuis les coins mesurés de la vitre) ;
 *  5. la vitre : reflet diagonal fixe + éclat qui balaie l'écran au survol.
 *
 * Survol (souris) : le téléphone monte de quelques pixels et pivote très
 * légèrement, son ombre s'élargit et s'adoucit, le reflet au sol s'estompe.
 * Toute la scène interne est dessinée à la taille native de la photo puis
 * réduite d'un bloc (`ScaledScreen`) : l'interface reste parfaitement calée
 * sur la vitre quelle que soit la taille d'affichage.
 */
export function PhoneShot({
  image,
  side,
  screenTransform,
  sizes,
  ariaLabel,
  className,
  children,
}: {
  image: StaticImageData;
  side: "left" | "right";
  /** `matrix3d(...)` qui projette l'interface sur la vitre (voir `quadToMatrix3d`). */
  screenTransform: string;
  sizes: string;
  ariaLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { width, height, screen } = marketingPhone;
  // Le téléphone de gauche regarde vers la droite (et inversement) : au survol,
  // il pivote encore un peu vers le centre de la scène.
  const hoverTurn =
    side === "left"
      ? "group-hover/phone:[transform:translateY(-10px)_perspective(1400px)_rotateY(-6deg)_rotateX(2deg)]"
      : "group-hover/phone:[transform:translateY(-10px)_perspective(1400px)_rotateY(6deg)_rotateX(2deg)]";

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn("group/phone relative", className)}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {/* 1. Ombre de contact. */}
      <div
        aria-hidden
        className={cn(
          "absolute -bottom-[0.6%] h-[3%] rounded-[50%] bg-[#1d1033]/55 blur-[9px] transition-[transform,opacity] duration-700 ease-out",
          "group-hover/phone:scale-x-[1.12] group-hover/phone:scale-y-[1.5] group-hover/phone:opacity-60",
          side === "left" ? "left-[16%] right-[8%]" : "left-[8%] right-[16%]",
        )}
      />

      {/* 2. Reflet dans le plateau brillant. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full h-[22%] overflow-hidden opacity-[0.2] transition-opacity duration-700 group-hover/phone:opacity-[0.08]"
      >
        <Image
          src={image}
          alt=""
          sizes={sizes}
          className="h-auto w-full -scale-y-100 [mask-image:linear-gradient(to_top,rgba(0,0,0,0.85)_0%,transparent_22%)]"
          style={{ marginTop: "-6.3%" }}
        />
      </div>

      {/* 3 à 5. Le téléphone, qui s'élève au survol. */}
      <div
        className={cn(
          "absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          hoverTurn,
          "motion-reduce:group-hover/phone:[transform:none]",
        )}
      >
        <ScaledScreen baseWidth={width} baseHeight={height} initialScale={0.32}>
          <Image src={image} alt="" sizes={sizes} className="absolute inset-0 h-full w-full" />
          <div
            className="absolute left-0 top-0 origin-top-left overflow-hidden"
            style={{
              width: screen.width,
              height: screen.height,
              borderRadius: screen.radius,
              transform: screenTransform,
            }}
          >
            {children}
            {/* Vitre : reflet diagonal permanent. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(255,255,255,0.32)_0%,rgba(255,255,255,0.1)_20%,rgba(255,255,255,0)_38%,rgba(255,255,255,0)_78%,rgba(255,255,255,0.08)_100%)]"
            />
            {/* Vitre : éclat qui traverse l'écran au survol. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-y-[10%] left-0 w-[70%] -translate-x-[120%] bg-[linear-gradient(100deg,transparent_0%,rgba(255,255,255,0.38)_50%,transparent_100%)] transition-transform duration-[1300ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/phone:translate-x-[190%] motion-reduce:hidden"
            />
          </div>
        </ScaledScreen>
      </div>
    </div>
  );
}

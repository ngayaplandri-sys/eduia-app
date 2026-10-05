import { cn } from "@/lib/utils/cn";

/**
 * Ordinateur portable réaliste en CSS pur : écran à bord fin et caméra, vitre
 * avec reflet, charnière, base en aluminium avec encoche d'ouverture, ombre
 * au sol. Couleurs du boîtier fixes (un appareil ne s'inverse pas avec le
 * thème). Le contenu de l'écran est fourni par l'appelant.
 */
export function LaptopMockup({
  children,
  className,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div role="img" aria-label={ariaLabel} className={cn("relative w-full", className)}>
      {/* Écran. */}
      <div className="relative mx-auto w-[88%] rounded-t-[1.1rem] rounded-b-[0.4rem] bg-[linear-gradient(180deg,#2f2d38_0%,#17161d_100%)] p-[2.2%] pb-[3.4%] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.75)] ring-1 ring-white/10">
        <span aria-hidden className="absolute left-1/2 top-[1.1%] size-1.5 -translate-x-1/2 rounded-full bg-[#3c3a47] ring-1 ring-white/10" />
        <div className="relative overflow-hidden rounded-[0.35rem] bg-canvas">
          {children}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.04)_28%,rgba(255,255,255,0)_45%)]"
          />
        </div>
      </div>
      {/* Charnière + base aluminium. */}
      <div aria-hidden className="relative mx-auto h-[0.55rem] w-[94%] bg-[linear-gradient(180deg,#5d606c,#3a3c45)]" />
      <div
        aria-hidden
        className="relative mx-auto h-[1.05rem] w-full rounded-b-[1.1rem] rounded-t-[0.2rem] bg-[linear-gradient(180deg,#e4e6ec_0%,#b9bdc8_55%,#8f94a1_100%)] shadow-[0_18px_30px_-12px_rgb(0_0_0/0.6)]"
      >
        <span className="absolute left-1/2 top-0 h-[0.38rem] w-[15%] -translate-x-1/2 rounded-b-lg bg-[linear-gradient(180deg,#8f94a1,#a9adb9)]" />
      </div>
      <div aria-hidden className="mx-auto mt-2 h-6 w-[80%] rounded-[50%] bg-black/45 blur-xl" />
    </div>
  );
}

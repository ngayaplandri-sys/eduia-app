"use client";

import * as React from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Lecteur de la vidéo de démonstration EXISTANTE (`/videos/demo-eduia.mp4`,
 * jamais remplacée) présenté comme un écran haut de gamme : image d'attente
 * extraite de la vidéo elle-même, gros bouton de lecture en verre, puis
 * contrôles natifs une fois la lecture lancée. `preload="none"` : les 39 Mo du
 * fichier ne sont téléchargés que si le visiteur lance la vidéo.
 */
export function VideoShowcase({
  src,
  poster,
  durationLabel,
  playLabel,
  ariaLabel,
  fallback,
}: {
  src: string;
  poster: string;
  durationLabel: string;
  playLabel: string;
  ariaLabel: string;
  fallback: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [started, setStarted] = React.useState(false);

  async function handlePlay() {
    const video = videoRef.current;
    if (!video) return;
    setStarted(true);
    try {
      await video.play();
    } catch {
      // Lecture refusée (politique du navigateur) : les contrôles natifs
      // restent disponibles pour relancer manuellement.
    }
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[1.1rem] bg-[#0b0814] sm:rounded-[1.35rem]">
      <video
        ref={videoRef}
        controls={started}
        playsInline
        preload="none"
        poster={poster}
        controlsList="nofullscreen nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        disableRemotePlayback
        onPlay={() => setStarted(true)}
        className="video-controls-minimal size-full object-cover"
        aria-label={ariaLabel}
      >
        <source src={src} type="video/mp4" />
        {fallback}
      </video>

      {/* Bouton de lecture : disparaît dès que la vidéo démarre. */}
      <button
        type="button"
        onClick={handlePlay}
        aria-label={playLabel}
        className={cn(
          "group absolute inset-0 flex items-center justify-center bg-[radial-gradient(60%_60%_at_50%_50%,rgb(14_10_27/0.15),rgb(14_10_27/0.55))] transition-opacity duration-500",
          started ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <span className="flex items-center gap-4 rounded-full bg-[#120b23]/55 py-2.5 pl-2.5 pr-6 text-white shadow-[0_20px_50px_-20px_rgb(14_10_27/0.8)] ring-1 ring-white/20 backdrop-blur-xl transition-[transform,background-color] duration-500 ease-out group-hover:scale-[1.04] group-hover:bg-[#120b23]/70 motion-reduce:group-hover:scale-100">
          <span className="flex size-14 items-center justify-center rounded-full bg-white text-[#553087] shadow-[0_14px_34px_-10px_rgb(124_79_190/0.9)] sm:size-16">
            <Play className="ml-1 size-6 fill-current sm:size-7" aria-hidden />
          </span>
          <span className="text-left">
            <span className="block text-[0.95rem] font-semibold sm:text-base">{playLabel}</span>
            <span className="block text-fine font-medium text-white/70 tabular-nums">{durationLabel}</span>
          </span>
        </span>
      </button>
    </div>
  );
}

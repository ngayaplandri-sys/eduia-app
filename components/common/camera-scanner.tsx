"use client";

import * as React from "react";
import * as RD from "@radix-ui/react-dialog";
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  LoaderCircle,
  SwitchCamera,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";

/**
 * « Scanner avec la caméra » : photographier une ou plusieurs pages (cours,
 * épreuve, copie) directement dans l'application. Les photos rejoignent
 * ensuite le pipeline d'import habituel de la zone de dépôt, comme des photos
 * importées.
 *
 * Caméra intégrée (`getUserMedia`, caméra arrière en priorité, plusieurs pages
 * d'affilée, lampe si l'appareil le permet). Repli sur l'appareil photo natif
 * du téléphone (`<input capture>`) quand la caméra n'est pas accessible :
 * navigateur sans `getUserMedia`, contexte non sécurisé, accès refusé.
 */
export function CameraScanButton({
  onCapture,
  maxShots,
  disabled,
  className,
}: {
  onCapture: (files: File[]) => void;
  /** Pages encore acceptées par la zone de dépôt. */
  maxShots: number;
  disabled?: boolean;
  className?: string;
}) {
  const { dict } = useI18n();
  const t = dict.dropzone;
  const [open, setOpen] = React.useState(false);
  const nativeRef = React.useRef<HTMLInputElement>(null);

  function openScanner() {
    const canStream =
      typeof window !== "undefined" &&
      window.isSecureContext &&
      typeof navigator.mediaDevices?.getUserMedia === "function";
    if (canStream) setOpen(true);
    else nativeRef.current?.click();
  }

  return (
    <>
      <button
        type="button"
        onClick={openScanner}
        disabled={disabled || maxShots <= 0}
        className={cn(
          "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-fine font-semibold text-ink-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
      >
        <Camera className="size-4 text-primary-600" aria-hidden />
        {t.scanWithCamera}
      </button>
      <input
        ref={nativeRef}
        type="file"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) onCapture(files.slice(0, Math.max(0, maxShots)));
        }}
      />
      {open ? (
        <CameraScannerDialog
          maxShots={maxShots}
          onClose={() => setOpen(false)}
          onDone={(files) => {
            setOpen(false);
            if (files.length > 0) onCapture(files);
          }}
          onUseNative={() => {
            setOpen(false);
            nativeRef.current?.click();
          }}
        />
      ) : null}
    </>
  );
}

type ScannerStatus = "starting" | "live" | "denied" | "unavailable";

interface Shot {
  file: File;
  url: string;
}

/** `ImageCapture` (photo pleine résolution) n'est pas encore typé par TypeScript. */
type ImageCaptureLike = { takePhoto: () => Promise<Blob> };
type ImageCaptureCtor = new (track: MediaStreamTrack) => ImageCaptureLike;

/** Coins du cadre de page affiché dans le viseur. */
const FRAME_CORNERS = [
  "left-0 top-0 rounded-tl-lg border-l-2 border-t-2",
  "right-0 top-0 rounded-tr-lg border-r-2 border-t-2",
  "bottom-0 left-0 rounded-bl-lg border-b-2 border-l-2",
  "bottom-0 right-0 rounded-br-lg border-b-2 border-r-2",
] as const;

/** En dessous, l'image ne permettrait pas de lire une page : on l'écarte. */
const MIN_SHOT_EDGE = 480;

async function shortEdge(blob: Blob): Promise<number> {
  try {
    const bitmap = await createImageBitmap(blob);
    const edge = Math.min(bitmap.width, bitmap.height);
    bitmap.close?.();
    return edge;
  } catch {
    return 0;
  }
}

/**
 * Photo pleine résolution du capteur si possible (`ImageCapture`), sinon
 * l'image du flux vidéo. Une image trop petite pour être lue n'est jamais
 * renvoyée.
 */
async function grabFrame(video: HTMLVideoElement, track: MediaStreamTrack | null): Promise<Blob | null> {
  const ImageCapture = (window as unknown as { ImageCapture?: ImageCaptureCtor }).ImageCapture;
  if (ImageCapture && track) {
    try {
      const photo = await Promise.race([
        new ImageCapture(track).takePhoto(),
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 3000)),
      ]);
      if (photo && photo.size > 0 && (await shortEdge(photo)) >= MIN_SHOT_EDGE) return photo;
    } catch {
      // Appareil sans prise de photo native : repli sur l'image du flux.
    }
  }

  if (Math.min(video.videoWidth, video.videoHeight) < MIN_SHOT_EDGE) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
}

function CameraScannerDialog({
  maxShots,
  onClose,
  onDone,
  onUseNative,
}: {
  maxShots: number;
  onClose: () => void;
  onDone: (files: File[]) => void;
  onUseNative: () => void;
}) {
  const { dict } = useI18n();
  const t = dict.dropzone;
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const viewRef = React.useRef<HTMLDivElement>(null);
  const [frame, setFrame] = React.useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const shotsRef = React.useRef<Shot[]>([]);
  const [status, setStatus] = React.useState<ScannerStatus>("starting");
  const [facing, setFacing] = React.useState<"environment" | "user">("environment");
  const [canSwitch, setCanSwitch] = React.useState(false);
  const [torchSupported, setTorchSupported] = React.useState(false);
  const [torchOn, setTorchOn] = React.useState(false);
  const [shots, setShots] = React.useState<Shot[]>([]);
  const [capturing, setCapturing] = React.useState(false);
  const [flash, setFlash] = React.useState(false);

  const full = shots.length >= maxShots;

  React.useEffect(() => {
    shotsRef.current = shots;
  }, [shots]);

  React.useEffect(() => {
    let cancelled = false;

    async function start() {
      setStatus("starting");
      setTorchOn(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          // Aperçu en 1080p (pris en charge partout, fluide sur les petits
          // téléphones) ; la photo elle-même est prise en pleine résolution du
          // capteur quand le navigateur le permet (`grabFrame`).
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        const track = stream.getVideoTracks()[0];
        const capabilities = track?.getCapabilities?.() as
          | (MediaTrackCapabilities & { torch?: boolean })
          | undefined;
        setTorchSupported(Boolean(capabilities?.torch));
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (!cancelled) {
          setCanSwitch(devices.filter((device) => device.kind === "videoinput").length > 1);
          setStatus("live");
        }
      } catch (error) {
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : "";
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
      }
    }

    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [facing]);

  // Zone où l'image est réellement affichée (`object-contain`) : le cadre de
  // page s'y aligne, quel que soit le format de la caméra et de l'écran.
  // Relancé quand le flux démarre : le contenu du portail Radix n'est monté
  // qu'après le premier rendu, les éléments n'existent pas encore au départ.
  React.useEffect(() => {
    const box = viewRef.current;
    const video = videoRef.current;
    if (status !== "live" || !box || !video) return;
    const update = () => {
      const { videoWidth: vw, videoHeight: vh } = video;
      const { clientWidth: bw, clientHeight: bh } = box;
      if (!vw || !vh || !bw || !bh) return;
      const scale = Math.min(bw / vw, bh / vh);
      setFrame({
        left: (bw - vw * scale) / 2,
        top: (bh - vh * scale) / 2,
        width: vw * scale,
        height: vh * scale,
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(box);
    video.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      video.removeEventListener("resize", update);
    };
  }, [status]);

  // Libère les aperçus à la fermeture (les fichiers, eux, sont transmis).
  React.useEffect(
    () => () => shotsRef.current.forEach((shot) => URL.revokeObjectURL(shot.url)),
    [],
  );

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || capturing || full) return;
    setCapturing(true);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 180);
    try {
      const track = streamRef.current?.getVideoTracks()[0] ?? null;
      const blob = await grabFrame(video, track);
      if (!blob) return;
      const index = shotsRef.current.length + 1;
      const stamp = new Date().toTimeString().slice(0, 8).replace(/:/g, "");
      const file = new File([blob], `scan-${stamp}-${index}.jpg`, {
        type: blob.type || "image/jpeg",
      });
      setShots((current) => [...current, { file, url: URL.createObjectURL(file) }]);
      // `takePhoto` éteint parfois la lampe : on reflète l'état réel.
      if (torchOn && track) {
        const settings = track.getSettings() as MediaTrackSettings & { torch?: boolean };
        if (settings.torch === false) setTorchOn(false);
      }
    } finally {
      setCapturing(false);
    }
  }

  function removeShot(index: number) {
    setShots((current) => {
      const removed = current[index];
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((_, i) => i !== index);
    });
  }

  const blocked = status === "denied" || status === "unavailable";

  return (
    <RD.Root open onOpenChange={(open) => (open ? undefined : onClose())}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-50 bg-[#0b0a10]/75 backdrop-blur-[2px] data-[state=open]:animate-overlay-in" />
        <RD.Content
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0b0a10] text-white outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(92vh,52rem)] sm:w-[min(92vw,46rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:shadow-pop"
          aria-describedby={undefined}
        >
          {/* En-tête */}
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <RD.Title className="text-sm font-semibold">{t.scanTitle}</RD.Title>
            <div className="flex items-center gap-1">
              {torchSupported && status === "live" ? (
                <button
                  type="button"
                  onClick={toggleTorch}
                  aria-pressed={torchOn}
                  aria-label={torchOn ? t.scanTorchOff : t.scanTorchOn}
                  className="flex size-10 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {torchOn ? <Flashlight className="size-5" aria-hidden /> : <FlashlightOff className="size-5" aria-hidden />}
                </button>
              ) : null}
              {canSwitch && status === "live" ? (
                <button
                  type="button"
                  onClick={() => setFacing((current) => (current === "environment" ? "user" : "environment"))}
                  aria-label={t.scanSwitchCamera}
                  className="flex size-10 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <SwitchCamera className="size-5" aria-hidden />
                </button>
              ) : null}
              <RD.Close
                aria-label={t.scanCancel}
                className="flex size-10 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <X className="size-5" aria-hidden />
              </RD.Close>
            </div>
          </div>

          {/* Viseur */}
          <div ref={viewRef} className="relative min-h-0 flex-1 overflow-hidden bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={cn(
                "absolute inset-0 h-full w-full object-contain transition-opacity duration-300",
                status === "live" ? "opacity-100" : "opacity-0",
              )}
            />

            {status === "live" ? (
              <>
                {/* Cadre de page, posé sur l'image réellement affichée : guide de
                    placement, le reste de l'image est assombri. */}
                {frame ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute flex items-center justify-center overflow-hidden p-[5%]"
                    style={frame}
                  >
                    <div className="relative aspect-[1/1.414] h-full max-h-full max-w-full rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.38)]">
                      {FRAME_CORNERS.map((corner) => (
                        <span key={corner} className={cn("absolute size-7 border-white", corner)} />
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit max-w-[90%] rounded-full bg-black/55 px-3 py-1.5 text-center text-[0.75rem] font-medium text-white/90">
                  {full ? t.scanLimit(maxShots) : t.scanHint}
                </p>
              </>
            ) : null}

            {status === "starting" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
                <LoaderCircle className="size-7 animate-spin" aria-hidden />
                <p className="text-sm">{t.scanStarting}</p>
              </div>
            ) : null}

            {blocked ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-white/10">
                  <CameraOff className="size-6" aria-hidden />
                </span>
                <p role="alert" className="max-w-sm text-sm leading-relaxed text-white/85">
                  {status === "denied" ? t.scanDenied : t.scanUnavailable}
                </p>
                <button
                  type="button"
                  onClick={onUseNative}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#16131f] transition-transform active:scale-[0.98]"
                >
                  <Camera className="size-4" aria-hidden />
                  {t.scanUseNative}
                </button>
              </div>
            ) : null}

            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 bg-white transition-opacity duration-200",
                flash ? "opacity-70" : "opacity-0",
              )}
            />
          </div>

          {/* Pages scannées + déclencheur */}
          <div className="space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {shots.length > 0 ? (
              <ul className="flex gap-2 overflow-x-auto pb-1" aria-label={t.scanDone(shots.length)}>
                {shots.map((shot, index) => (
                  <li key={shot.url} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (URL blob) */}
                    <img
                      src={shot.url}
                      alt={dict.dropzone.pageLabel(index + 1)}
                      className="h-16 w-12 rounded-md border border-white/20 object-cover"
                    />
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[0.625rem] font-semibold tabular-nums">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeShot(index)}
                      aria-label={t.scanRemovePage(index + 1)}
                      className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-white text-[#16131f] shadow"
                    >
                      <X className="size-3" strokeWidth={3} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <RD.Close className="justify-self-start rounded-full px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
                {t.scanCancel}
              </RD.Close>
              <button
                type="button"
                onClick={capture}
                disabled={status !== "live" || capturing || full}
                aria-label={t.scanCapture}
                className="flex size-[4.25rem] items-center justify-center rounded-full border-4 border-white/90 transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-95 disabled:opacity-40"
              >
                <span className="size-[3.25rem] rounded-full bg-white" />
              </button>
              <button
                type="button"
                onClick={() => onDone(shots.map((shot) => shot.file))}
                disabled={shots.length === 0}
                className="justify-self-end rounded-full bg-[#7c4fbe] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#693fa8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:bg-white/15 disabled:text-white/50"
              >
                {t.scanDone(shots.length)}
              </button>
            </div>
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { initials as toInitials } from "@/lib/utils/format";

interface AvatarProps {
  src: string | null;
  name: string;
  /** Diamètre en pixels. */
  size?: number;
  className?: string;
}

export function Avatar({ src, name, size = 40, className }: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const showImage = src && !failed;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-primary-100 font-bold text-primary-700 ring-1 ring-black/5",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden={showImage ? undefined : true}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        toInitials(name)
      )}
    </span>
  );
}

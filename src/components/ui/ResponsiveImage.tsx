"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

type ResponsiveImageProps = Omit<
  ImageProps,
  "src" | "alt" | "width" | "height" | "loader" | "unoptimized"
> & {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

function canOptimizeImage(src: string): boolean {
  if (src.startsWith("/") && !src.startsWith("//")) return true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    const imageUrl = new URL(src);
    const storageUrl = new URL(supabaseUrl);
    return (
      (imageUrl.protocol === "https:" || imageUrl.protocol === "http:") &&
      imageUrl.origin === storageUrl.origin &&
      imageUrl.pathname.startsWith("/storage/v1/object/public/")
    );
  } catch {
    return false;
  }
}

const FALLBACK_IMAGE = "/assets/image-unavailable.svg";

function ImageWithFallback({
  src,
  alt,
  width = 800,
  height = 600,
  sizes = "(max-width: 768px) 100vw, 50vw",
  fill,
  onError,
  ...props
}: ResponsiveImageProps) {
  const [failed, setFailed] = useState(false);
  const bypassOptimization = !canOptimizeImage(src);

  return (
    <Image
      {...props}
      src={failed ? FALLBACK_IMAGE : src}
      alt={failed && alt ? `${alt} — image temporairement indisponible` : alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      unoptimized={failed || bypassOptimization}
      onError={(event) => {
        if (!failed) setFailed(true);
        onError?.(event);
      }}
    />
  );
}

export default function ResponsiveImage(props: ResponsiveImageProps) {
  return <ImageWithFallback key={props.src} {...props} />;
}

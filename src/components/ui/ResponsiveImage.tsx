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

export default function ResponsiveImage({
  src,
  alt,
  width = 800,
  height = 600,
  sizes = "(max-width: 768px) 100vw, 50vw",
  ...props
}: ResponsiveImageProps) {
  const bypassOptimization = !canOptimizeImage(src);

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      unoptimized={bypassOptimization}
    />
  );
}

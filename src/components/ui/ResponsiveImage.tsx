import Image, { type ImageLoaderProps, type ImageProps } from "next/image";

type ResponsiveImageProps = Omit<
  ImageProps,
  "src" | "alt" | "width" | "height" | "loader" | "unoptimized"
> & {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

const identityLoader = ({ src }: ImageLoaderProps) => src;

export default function ResponsiveImage({
  src,
  alt,
  width = 800,
  height = 600,
  sizes = "(max-width: 768px) 100vw, 50vw",
  ...props
}: ResponsiveImageProps) {
  const bypassOptimization = /^(blob:|data:|https?:)/.test(src);

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      loader={bypassOptimization ? identityLoader : undefined}
      unoptimized={bypassOptimization}
    />
  );
}

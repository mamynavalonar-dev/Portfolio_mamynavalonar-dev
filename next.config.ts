import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    remotePatterns.push({
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    console.warn("NEXT_PUBLIC_SUPABASE_URL invalide : optimisation distante désactivée.");
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
    remotePatterns,
  },
};

export default nextConfig;

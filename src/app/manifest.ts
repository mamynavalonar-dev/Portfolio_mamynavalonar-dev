import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portfolio de Mamy Navalona Antonio",
    short_name: "Mamy Portfolio",
    description: "Portfolio de RAKOTONIAINA Mamy Navalona Antonio, développeur Full Stack.",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}

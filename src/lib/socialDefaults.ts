import type { SocialContent, SocialPlatform } from "@/types";
export const SOCIAL_PLATFORMS: Record<SocialPlatform, string> = { linkedin: "LinkedIn", instagram: "Instagram", github: "GitHub", whatsapp: "WhatsApp", facebook: "Facebook", x: "X", telegram: "Telegram", youtube: "YouTube", tiktok: "TikTok", email: "E-mail", website: "Site web", other: "Autre réseau" };
export const DEFAULT_SOCIAL_CONTENT: SocialContent = {
  settings: { heading: "Retrouvez-moi", introduction: "" },
  links: [
    { id: "00000000-0000-4000-8000-000000000001", platform: "linkedin", title: "LinkedIn", display_name: "Mamy Navalona Antonio", url: "https://www.linkedin.com/in/mamy-navalona-antonio-rakotoniaina-6aa98820a", featured: true, published: true, display_order: 0, created_at: "", updated_at: "" },
    { id: "00000000-0000-4000-8000-000000000002", platform: "instagram", title: "Instagram", display_name: "@m1ke_tys.0n", url: "https://www.instagram.com/m1ke_tys.0n", featured: false, published: true, display_order: 1, created_at: "", updated_at: "" },
    { id: "00000000-0000-4000-8000-000000000003", platform: "github", title: "GitHub", display_name: "@mamynavalonar-dev", url: "https://github.com/mamynavalonar-dev", featured: false, published: true, display_order: 2, created_at: "", updated_at: "" },
    { id: "00000000-0000-4000-8000-000000000004", platform: "whatsapp", title: "WhatsApp", display_name: "Me contacter", url: "https://wa.me/qr/CQDLCROVEAG3O1", featured: false, published: true, display_order: 3, created_at: "", updated_at: "" },
  ],
};

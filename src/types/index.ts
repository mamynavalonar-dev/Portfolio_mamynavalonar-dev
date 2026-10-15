export interface TechStack {
  id: number;
  name: string;
  logo_url: string;
  created_at: string;
  hero_visible?: boolean;
  hero_order?: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  key_features: string[];
  image_url: string | null;
  image_urls: string[] | null;
  live_url: string | null;
  github_url: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Certificate {
  id: number;
  title: string;
  image_url: string;
  created_at: string;
}

export interface PublicPortfolioData {
  projects: Project[];
  certificates: Certificate[];
  techStacks: TechStack[];
  services?: PortfolioService[];
  journey?: JourneyEntry[];
  social?: SocialContent;
  contentUnavailable?: Array<"services" | "journey" | "social">;
  contentMigrationMissing?: boolean;
  unavailable?: Array<"projects" | "certificates" | "techStacks">;
}

export type ServiceIcon = "code" | "database" | "layers" | "design" | "shield" | "cloud";
export type ServiceAccent = "blue" | "emerald" | "rose";
export type JourneyKind = "education" | "experience" | "project";
export type SocialPlatform = "linkedin" | "instagram" | "github" | "whatsapp" | "facebook" | "x" | "telegram" | "youtube" | "tiktok" | "email" | "website" | "other";
export interface SocialLink {
  id: string; platform: SocialPlatform; title: string; display_name: string;
  url: string; featured: boolean; published: boolean; display_order: number;
  created_at: string; updated_at: string;
}
export interface SocialSettings { heading: string; introduction: string; }
export interface SocialContent { settings: SocialSettings; links: SocialLink[]; }

export interface PortfolioService {
  id: string;
  title: string;
  summary: string;
  description: string;
  bullet_points: string[];
  icon: ServiceIcon;
  accent: ServiceAccent;
  display_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface JourneyEntry {
  id: string;
  kind: JourneyKind;
  title: string;
  organization: string;
  description: string;
  start_date: string;
  end_date: string | null;
  current: boolean;
  tags: string[];
  logo_url: string | null;
  project_id: string | null;
  external_url: string | null;
  display_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommentReply {
  username: string;
  message: string;
  created_at: string;
}

export interface PortfolioComment {
  id: number;
  name: string;
  username?: string | null;
  comment: string;
  image_url: string | null;
  likes: number;
  replies: CommentReply[];
  is_pinned: boolean;
  liked_by_admin?: boolean;
  created_at: string;
}

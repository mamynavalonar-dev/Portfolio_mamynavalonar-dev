export interface TechStack {
  id: number;
  name: string;
  logo_url: string;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string;
  key_features: string;
  image_url: string | null;
  image_urls: string[] | null;
  live_url: string | null;
  github_url: string | null;
  created_at: string;
}

export interface Certificate {
  id: number;
  title: string;
  image_url: string;
  created_at: string;
}
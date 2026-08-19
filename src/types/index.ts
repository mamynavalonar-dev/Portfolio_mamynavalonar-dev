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

-- Migration additive : appliquer uniquement ce fichier sur le projet existant.
-- Ne supprime ni projet, ni certificat, ni technologie, ni donnée historique.
begin;

create table if not exists public.portfolio_services (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null check (char_length(title) between 2 and 100),
  summary text not null check (char_length(summary) between 3 and 260),
  description text not null check (char_length(description) between 3 and 2000),
  bullet_points text[] not null check (cardinality(bullet_points) between 1 and 12),
  icon text not null default 'code' check (icon in ('code','database','layers','design','shield','cloud')),
  accent text not null default 'blue' check (accent in ('blue','emerald','rose')),
  display_order integer not null default 0 check (display_order between 0 and 9999),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_journey (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('education','experience','project')),
  title text not null check (char_length(title) between 2 and 140),
  organization text not null check (char_length(organization) between 2 and 140),
  description text not null default '' check (char_length(description) <= 2000),
  start_date date not null,
  end_date date,
  current boolean not null default false,
  tags text[] not null default '{}' check (cardinality(tags) <= 16),
  logo_url text,
  project_id uuid references public.projects(id) on delete set null,
  external_url text,
  display_order integer not null default 0 check (display_order between 0 and 9999),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check (not current or end_date is null),
  check (kind = 'project' or project_id is null)
);

alter table public.tech_stack add column if not exists hero_visible boolean not null default true;
alter table public.tech_stack add column if not exists hero_order integer not null default 0;

alter table public.portfolio_services enable row level security;
alter table public.portfolio_journey enable row level security;
revoke all on public.portfolio_services, public.portfolio_journey from public, anon, authenticated;
grant select on public.portfolio_services, public.portfolio_journey to anon;
grant select, insert, update, delete on public.portfolio_services, public.portfolio_journey to authenticated;
grant all on public.portfolio_services, public.portfolio_journey to service_role;

drop policy if exists "Published services read" on public.portfolio_services;
create policy "Published services read" on public.portfolio_services for select to anon, authenticated using (published = true);
drop policy if exists "Admin services management" on public.portfolio_services;
create policy "Admin services management" on public.portfolio_services for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Published journey read" on public.portfolio_journey;
create policy "Published journey read" on public.portfolio_journey for select to anon, authenticated using (published = true);
drop policy if exists "Admin journey management" on public.portfolio_journey;
create policy "Admin journey management" on public.portfolio_journey for all to authenticated using (public.is_admin()) with check (public.is_admin());

create index if not exists portfolio_services_display_idx on public.portfolio_services (display_order, created_at) where published = true;
create index if not exists portfolio_journey_display_idx on public.portfolio_journey (kind, display_order, start_date desc) where published = true;

drop trigger if exists portfolio_services_updated_at on public.portfolio_services;
create trigger portfolio_services_updated_at before update on public.portfolio_services for each row execute function public.update_updated_at_column();
drop trigger if exists portfolio_journey_updated_at on public.portfolio_journey;
create trigger portfolio_journey_updated_at before update on public.portfolio_journey for each row execute function public.update_updated_at_column();

-- Textes de départ adaptables dans /admin/services ; aucun diplôme ou emploi fictif.
insert into public.portfolio_services (slug, title, summary, description, bullet_points, icon, accent, display_order, published) values
('frontend', 'Développement front-end', 'Des interfaces claires, responsives et agréables à utiliser.', 'Je développe la partie visible de vos applications web, avec une attention portée à la navigation, à l’accessibilité et aux performances.', array['Interfaces avec React, Next.js et TypeScript','Mise en page responsive avec Tailwind CSS','Composants réutilisables et interactions accessibles','Optimisation des images et du chargement'], 'code', 'blue', 0, true),
('backend', 'Développement back-end', 'Des API et des données structurées pour des applications fiables.', 'Je conçois la logique serveur et les échanges de données, en intégrant la validation des entrées et le contrôle des accès.', array['API et routes serveur','Données relationnelles avec PostgreSQL et Supabase','Authentification et gestion des autorisations','Validation des données et gestion des erreurs'], 'database', 'emerald', 1, true),
('fullstack', 'Applications Full Stack', 'Une application cohérente, de l’interface aux données.', 'Je relie les interfaces, les API et la base de données pour créer des fonctionnalités complètes et maintenables.', array['Connexion du front-end aux services back-end','Formulaires et fonctionnalités métier','Espaces d’administration adaptés aux contenus','Intégration, tests et déploiement sur Vercel'], 'layers', 'rose', 2, true)
on conflict (slug) do nothing;

commit;

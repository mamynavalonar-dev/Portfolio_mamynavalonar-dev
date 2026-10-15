-- Ajouter uniquement cette migration après Services et Parcours.
begin;
create table if not exists public.portfolio_social_settings (
  id integer primary key default 1 check (id = 1),
  heading text not null check (char_length(heading) between 2 and 100),
  introduction text not null default '' check (char_length(introduction) <= 600),
  updated_at timestamptz not null default now()
);
create table if not exists public.portfolio_social_links (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  platform text not null check (platform in ('linkedin','instagram','github','whatsapp','facebook','x','telegram','youtube','email','website')),
  title text not null check (char_length(title) between 2 and 80),
  display_name text not null default '' check (char_length(display_name) <= 120),
  url text not null check (char_length(url) between 1 and 1000),
  featured boolean not null default false,
  published boolean not null default false,
  display_order integer not null default 0 check (display_order between 0 and 9999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.portfolio_social_links enable row level security;
alter table public.portfolio_social_settings enable row level security;
revoke all on public.portfolio_social_links, public.portfolio_social_settings from public, anon, authenticated;
grant select on public.portfolio_social_links, public.portfolio_social_settings to anon;
grant select, insert, update, delete on public.portfolio_social_links, public.portfolio_social_settings to authenticated;
grant all on public.portfolio_social_links, public.portfolio_social_settings to service_role;
drop policy if exists "Published social links read" on public.portfolio_social_links;
create policy "Published social links read" on public.portfolio_social_links for select to anon, authenticated using (published = true);
drop policy if exists "Admin social links management" on public.portfolio_social_links;
create policy "Admin social links management" on public.portfolio_social_links for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Public social settings read" on public.portfolio_social_settings;
create policy "Public social settings read" on public.portfolio_social_settings for select to anon, authenticated using (true);
drop policy if exists "Admin social settings management" on public.portfolio_social_settings;
create policy "Admin social settings management" on public.portfolio_social_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create index if not exists portfolio_social_links_display_idx on public.portfolio_social_links (display_order, created_at) where published = true;
drop trigger if exists portfolio_social_links_updated_at on public.portfolio_social_links;
create trigger portfolio_social_links_updated_at before update on public.portfolio_social_links for each row execute function public.update_updated_at_column();
drop trigger if exists portfolio_social_settings_updated_at on public.portfolio_social_settings;
create trigger portfolio_social_settings_updated_at before update on public.portfolio_social_settings for each row execute function public.update_updated_at_column();
-- Reprendre les quatre liens existants, sans créer de profil ou contacter un réseau.
-- Les valeurs initiales ne sont ajoutées qu'à la création de la présentation :
-- réexécuter la migration ne rétablit pas un lien retiré dans l'administration.
with initial_settings as (
  insert into public.portfolio_social_settings(id,heading,introduction) values (1,'Retrouvez-moi','')
  on conflict (id) do nothing returning id
)
insert into public.portfolio_social_links(slug,platform,title,display_name,url,featured,published,display_order)
select seed.* from (values
('linkedin','linkedin','LinkedIn','Mamy Navalona Antonio','https://www.linkedin.com/in/mamy-navalona-antonio-rakotoniaina-6aa98820a',true,true,0),
('instagram','instagram','Instagram','@m1ke_tys.0n','https://www.instagram.com/m1ke_tys.0n',false,true,1),
('github','github','GitHub','@mamynavalonar-dev','https://github.com/mamynavalonar-dev',false,true,2),
('whatsapp','whatsapp','WhatsApp','Me contacter','https://wa.me/qr/CQDLCROVEAG3O1',false,true,3)
) as seed(slug,platform,title,display_name,url,featured,published,display_order)
where exists (select 1 from initial_settings)
on conflict (slug) do nothing;
commit;

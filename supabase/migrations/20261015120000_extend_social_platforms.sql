-- Extension ciblée de la liste des plateformes : TikTok et Autre réseau.
-- À appliquer après 20261013163000_portfolio_social_links.sql.
-- Aucune ligne n'est ajoutée, modifiée ou supprimée ; les politiques RLS sont conservées.
begin;

alter table public.portfolio_social_links
  drop constraint if exists portfolio_social_links_platform_check;

alter table public.portfolio_social_links
  add constraint portfolio_social_links_platform_check
  check (platform in (
    'linkedin', 'instagram', 'github', 'whatsapp', 'facebook', 'x',
    'telegram', 'youtube', 'tiktok', 'email', 'website', 'other'
  ));

commit;

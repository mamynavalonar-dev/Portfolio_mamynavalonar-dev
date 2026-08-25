-- Gestion centralisée du CV du portfolio.
-- Le bucket reste privé : l'administration passe par une API serveur
-- authentifiée et le téléchargement public utilise une URL signée courte.

create table if not exists public.portfolio_cv (
  id smallint primary key default 1 check (id = 1),
  storage_path text,
  external_url text,
  file_name text not null check (char_length(file_name) between 1 and 255),
  file_size bigint check (
    file_size is null or (file_size > 0 and file_size <= 3145728)
  ),
  mime_type text not null default 'application/pdf'
    check (mime_type = 'application/pdf'),
  updated_at timestamptz not null default now(),
  check (
    (storage_path is not null and external_url is null)
    or
    (storage_path is null and external_url is not null)
  )
);

alter table public.portfolio_cv enable row level security;

revoke all on table public.portfolio_cv from anon, authenticated;
grant select, insert, update, delete on table public.portfolio_cv to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'cv',
  'cv',
  false,
  3145728,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Préserve le CV actuellement publié pendant la transition.
-- Le premier upload depuis /admin/cv remplace cette source héritée par
-- un PDF stocké dans le bucket privé "cv".
insert into public.portfolio_cv (
  id,
  storage_path,
  external_url,
  file_name,
  file_size,
  mime_type
)
values (
  1,
  null,
  'https://drive.google.com/uc?export=download&id=11wSlZrl5GtR7JZ9Zb6N7u250Q3mjtaLU',
  'CV.pdf',
  null,
  'application/pdf'
)
on conflict (id) do nothing;

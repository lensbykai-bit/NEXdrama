-- MovieFlix V3 — Supabase Database Setup
-- Run this in a NEW/DEDICATED Supabase project's SQL Editor.
-- Safe model: public can read titles; only users listed in public.admins can write.

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key,
  name text not null default 'MOVIEFLIX',
  accent_word text not null default 'FLIX',
  tagline text not null default 'Movies & Series',
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('movie','series')),
  year integer not null default extract(year from now())::integer check (year between 1900 and 2100),
  genre text not null default '',
  quality text not null default 'HD',
  poster text not null default '',
  description text not null default '',
  featured boolean not null default false,
  accent integer not null default 210 check (accent between 0 and 359),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  number integer not null default 1 check (number > 0),
  title text not null default '',
  duration text not null default '',
  video_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(item_id, number)
);

create unique index if not exists catalog_single_featured_idx
on public.catalog_items ((featured)) where featured = true;

insert into public.site_settings (id,name,accent_word,tagline)
values (1,'MOVIEFLIX','FLIX','Movies & Series')
on conflict (id) do nothing;

-- Explicit Data API privileges. RLS below still controls which rows each role may access.
grant usage on schema public to anon, authenticated;
grant select on public.site_settings, public.catalog_items, public.episodes to anon, authenticated;
grant select on public.admins to authenticated;
grant insert, update, delete on public.site_settings, public.catalog_items, public.episodes to authenticated;

alter table public.admins enable row level security;
alter table public.site_settings enable row level security;
alter table public.catalog_items enable row level security;
alter table public.episodes enable row level security;

-- Re-runnable policies.
drop policy if exists "Admin can read own admin row" on public.admins;
create policy "Admin can read own admin row" on public.admins
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Public can read settings" on public.site_settings;
create policy "Public can read settings" on public.site_settings
for select to anon, authenticated
using (true);

drop policy if exists "Admins can update settings" on public.site_settings;
create policy "Admins can update settings" on public.site_settings
for update to authenticated
using (exists (select 1 from public.admins a where a.user_id = (select auth.uid())))
with check (id = 1 and exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

drop policy if exists "Public can read catalog" on public.catalog_items;
create policy "Public can read catalog" on public.catalog_items
for select to anon, authenticated
using (true);

drop policy if exists "Admins can insert catalog" on public.catalog_items;
create policy "Admins can insert catalog" on public.catalog_items
for insert to authenticated
with check (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

drop policy if exists "Admins can update catalog" on public.catalog_items;
create policy "Admins can update catalog" on public.catalog_items
for update to authenticated
using (exists (select 1 from public.admins a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

drop policy if exists "Admins can delete catalog" on public.catalog_items;
create policy "Admins can delete catalog" on public.catalog_items
for delete to authenticated
using (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

drop policy if exists "Public can read episodes" on public.episodes;
create policy "Public can read episodes" on public.episodes
for select to anon, authenticated
using (true);

drop policy if exists "Admins can insert episodes" on public.episodes;
create policy "Admins can insert episodes" on public.episodes
for insert to authenticated
with check (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

drop policy if exists "Admins can update episodes" on public.episodes;
create policy "Admins can update episodes" on public.episodes
for update to authenticated
using (exists (select 1 from public.admins a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

drop policy if exists "Admins can delete episodes" on public.episodes;
create policy "Admins can delete episodes" on public.episodes
for delete to authenticated
using (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

-- Optional fictional sample content: inserted only if the catalog is empty.
do $$
declare
  series_id uuid;
  movie_id uuid;
begin
  if not exists (select 1 from public.catalog_items) then
    insert into public.catalog_items (title,type,year,genre,quality,description,featured,accent)
    values ('The Last Horizon','series',2026,'Sci-Fi, Adventure','HD','A fictional sci-fi series included as demo content.',true,205)
    returning id into series_id;

    insert into public.episodes (item_id,number,title,duration,video_url) values
      (series_id,1,'Beyond the Signal','45 min',''),
      (series_id,2,'Silent Orbit','46 min',''),
      (series_id,3,'The Gate','44 min','');

    insert into public.catalog_items (title,type,year,genre,quality,description,featured,accent)
    values ('Shadow City','movie',2026,'Action','HD','A fictional action movie included as demo content.',false,340)
    returning id into movie_id;

    insert into public.episodes (item_id,number,title,duration,video_url)
    values (movie_id,1,'Full Movie','1h 48m','');
  end if;
end $$;

-- IMPORTANT — after creating your admin account in admin.html, run ONE command like this:
-- Replace the email below with your real admin email, then uncomment and run it.
-- insert into public.admins (user_id)
-- select id from auth.users where lower(email) = lower('YOUR_ADMIN_EMAIL@example.com')
-- on conflict (user_id) do nothing;

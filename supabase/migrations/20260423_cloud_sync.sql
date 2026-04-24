create extension if not exists pgcrypto;

create table if not exists public.user_movies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_key text not null,
  list_type text not null check (list_type in ('watched', 'watchlist')),
  movie_data jsonb not null default '{}'::jsonb,
  rating smallint check (rating between 1 and 10),
  notes text,
  watched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, movie_key, list_type)
);

create index if not exists user_movies_user_id_idx on public.user_movies (user_id, list_type);
create index if not exists user_movies_movie_key_idx on public.user_movies (movie_key);

alter table public.user_movies enable row level security;

drop policy if exists "Users can read their own movies" on public.user_movies;
create policy "Users can read their own movies"
on public.user_movies
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own movies" on public.user_movies;
create policy "Users can insert their own movies"
on public.user_movies
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own movies" on public.user_movies;
create policy "Users can update their own movies"
on public.user_movies
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own movies" on public.user_movies;
create policy "Users can delete their own movies"
on public.user_movies
for delete
to authenticated
using (auth.uid() = user_id);

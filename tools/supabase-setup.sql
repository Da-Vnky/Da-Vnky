-- =====================================================================
-- DaV-nky's post office on Supabase. Run this once:
--   Supabase → your project → SQL Editor → New query → paste all of this → Run
-- It makes a table for visitors' post and a private place for their pictures.
-- Visitors can only SEND. Nobody can read, change or delete anything except
-- you, with your secret key (which lives only in the content manager).
-- Safe to run again.
-- =====================================================================

-- the post: one row per bottle or painting
create table if not exists public.post (
    id         uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    kind       text not null check (kind in ('bottle', 'art')),
    from_name  text not null default '' check (char_length(from_name) <= 40),
    message    text not null default '' check (char_length(message) <= 1000),
    title      text not null default '' check (char_length(title) <= 60),
    file_path  text not null default '' check (char_length(file_path) <= 120),
    file_name  text not null default '' check (char_length(file_name) <= 120),
    page       text not null default '' check (char_length(page) <= 300)
);
alter table public.post enable row level security;
grant insert on public.post to anon;
drop policy if exists "visitors can send post" on public.post;
create policy "visitors can send post" on public.post for insert to anon with check (true);
-- (no other policies on purpose: visitors can't read, change or delete anything)

-- the pictures: a private bucket, pictures only, under 1 MB each
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post', 'post', false, 1048576, array['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
on conflict (id) do update
    set public = false, file_size_limit = 1048576, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "visitors can send pictures" on storage.objects;
create policy "visitors can send pictures" on storage.objects for insert to anon
    with check (bucket_id = 'post' and (storage.foldername(name))[1] in ('bottle', 'art'));

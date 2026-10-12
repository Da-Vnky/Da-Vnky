-- =====================================================================
-- DaV-nky's desk (desk.html): your letters, visitors' post, paintings and
-- frames, from any browser you sign in on. Run this once:
--   Supabase → your project → SQL Editor → New query → paste all of this → Run
-- (it needs tools/supabase-setup.sql to have been run before: the post office.)
-- Safe to run again.
--
-- What it makes:
--   desk_owner   who may use the desk (you: one line, added after you sign in
--                the first time; the desk shows you that line, ready to copy)
--   desk         one row per file you've changed at the desk: its place on
--                the site (content/sea/2026-10-12-hello.txt), and whether it's
--                new / changed (the file is in the "desk" storage) or deleted.
--                anyone can read this list (the site needs it to show your
--                changes before they're published); only you can change it.
--   storage "desk"  the files themselves, public to read like the rest of
--                your site, only you can add or remove them.
-- and lets you (and only you) read and clear the visitors' post from the
-- desk, as the content manager does with your secret key.
-- The next time you publish from your computer, the content manager copies
-- everything from the desk into your folder (tools/desk.py), so the repo
-- keeps it all, and tidies the desk the publish after that.
-- =====================================================================

-- who owns the desk. nobody can read or change this from outside: only here
create table if not exists public.desk_owner (
    uid uuid primary key
);
alter table public.desk_owner enable row level security;
revoke all on public.desk_owner from anon, authenticated;

-- "is the person signed in the desk's owner?" (used by every rule below)
create or replace function public.dav_is_owner() returns boolean
language sql stable security definer set search_path = public
as $$
    select exists (select 1 from public.desk_owner where uid = auth.uid());
$$;
revoke all on function public.dav_is_owner() from public;
grant execute on function public.dav_is_owner() to anon, authenticated;

-- the desk's list of changed files
create table if not exists public.desk (
    path      text primary key check (path like 'content/%' and path !~ '\.\.' and char_length(path) <= 240),
    gone      boolean not null default false,             -- true: deleted at the desk
    obj       text not null default '' check (char_length(obj) <= 300),   -- where the file is in storage ("desk")
    at        timestamptz not null default now(),         -- when it last changed
    filed_at  timestamptz                                 -- when the content manager copied it into your folder
);
alter table public.desk enable row level security;
grant select on public.desk to anon, authenticated;
grant insert, update, delete on public.desk to authenticated;
drop policy if exists "anyone can read the desk" on public.desk;
create policy "anyone can read the desk" on public.desk for select to anon, authenticated using (true);
drop policy if exists "the owner writes on the desk" on public.desk;
create policy "the owner writes on the desk" on public.desk for all to authenticated
    using (public.dav_is_owner()) with check (public.dav_is_owner());

-- the visitors' post: you can read it and clear it from the desk (visitors still only send)
grant select, delete on public.post to authenticated;
drop policy if exists "the owner reads the post" on public.post;
create policy "the owner reads the post" on public.post for select to authenticated using (public.dav_is_owner());
drop policy if exists "the owner clears the post" on public.post;
create policy "the owner clears the post" on public.post for delete to authenticated using (public.dav_is_owner());

-- the desk's files: public to read (like the site), up to 30 MB each: pictures, letters, lists, videos and songs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('desk', 'desk', true, 31457280, array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
        'text/plain', 'text/html', 'application/json', 'video/mp4', 'video/webm',
        'audio/mpeg', 'audio/mp3', 'audio/ogg'])                         -- (songs in letters: 11 Oct)
on conflict (id) do update
    set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "the owner looks in the desk" on storage.objects;
create policy "the owner looks in the desk" on storage.objects for select to authenticated
    using (bucket_id = 'desk' and public.dav_is_owner());
drop policy if exists "the owner puts things on the desk" on storage.objects;
create policy "the owner puts things on the desk" on storage.objects for insert to authenticated
    with check (bucket_id = 'desk' and public.dav_is_owner());
drop policy if exists "the owner changes things on the desk" on storage.objects;
create policy "the owner changes things on the desk" on storage.objects for update to authenticated
    using (bucket_id = 'desk' and public.dav_is_owner()) with check (bucket_id = 'desk' and public.dav_is_owner());
drop policy if exists "the owner clears the desk" on storage.objects;
create policy "the owner clears the desk" on storage.objects for delete to authenticated
    using (bucket_id = 'desk' and public.dav_is_owner());

-- the visitors' pictures (private): you can see them and clear them from the desk
drop policy if exists "the owner sees the post's pictures" on storage.objects;
create policy "the owner sees the post's pictures" on storage.objects for select to authenticated
    using (bucket_id = 'post' and public.dav_is_owner());
drop policy if exists "the owner clears the post's pictures" on storage.objects;
create policy "the owner clears the post's pictures" on storage.objects for delete to authenticated
    using (bucket_id = 'post' and public.dav_is_owner());

-- =====================================================================
-- then:
--  1. Authentication → Users → Add user → Create new user: your email and a
--     password, "Auto Confirm User" ticked.
--  2. Authentication → Sign In / Providers: switch OFF "Allow new users to
--     sign up" (only you need an account; nobody else can use the desk
--     anyway, but there's no reason to let strangers make accounts).
--  3. Open dav-nky.pleroma.nexus/desk.html, sign in. It shows you one line
--     that makes you the desk's owner (with your account's id in it): run
--     that here, once, then reload the desk.
-- =====================================================================

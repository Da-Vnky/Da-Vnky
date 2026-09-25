-- =====================================================================
-- DaV-nky: a notification on your phone whenever a visitor leaves you
-- something (a bottle or a painting), so you know to open the content manager.
--
-- Don't paste this one by hand: the content manager fills in your own private
-- topic for you. Open it (tools\content.bat) → visitors → "phone notifications",
-- and copy the version it shows you. Then:
--   Supabase → your project → SQL Editor → New query → paste → Run (once).
--
-- How it works: when a new row lands in the post table, Supabase sends a
-- short note to ntfy.sh (a free notification service) under your topic; the
-- ntfy app on your phone (or an ntfy.sh tab in your browser) shows it.
-- Only the kind of thing and the name it was signed with are sent, never the
-- message or the picture. Safe to run again. To stop it:
--   drop trigger if exists dav_notify on public.post;
-- =====================================================================

create extension if not exists pg_net with schema extensions;

create or replace function public.dav_notify() returns trigger
language plpgsql security definer set search_path = public, extensions
as $$
begin
    perform net.http_post(
        url     := 'https://ntfy.sh/',
        body    := jsonb_build_object(
            'topic',   '{{TOPIC}}',
            'title',   'DaV-nky: ' || case when new.kind = 'art' then 'a painting' else 'a bottle' end || ' washed up',
            'message', case when new.kind = 'art' then 'new art' else 'a new message in a bottle' end
                       || case when coalesce(new.from_name, '') <> '' then ' from ' || left(new.from_name, 40) else '' end
                       || '. open the content manager to see it.',
            'tags',    jsonb_build_array(case when new.kind = 'art' then 'art' else 'love_letter' end)
        ),
        headers := '{"Content-Type": "application/json"}'::jsonb
    );
    return new;
exception when others then
    return new;                  -- (a notification that can't go out never stops the post arriving)
end;
$$;

drop trigger if exists dav_notify on public.post;
create trigger dav_notify after insert on public.post
    for each row execute function public.dav_notify();

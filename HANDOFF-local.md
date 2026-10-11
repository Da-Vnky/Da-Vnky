# Handoff: from the cloud sessions back to working locally (11 Oct 2026)

Paste this into a new Claude conversation started in `C:\Users\Victor\Desktop\DaV-nky`, or tell it to read this file.

---

**To Claude:** you're picking up DaV-nky (dav-nky.pleroma.nexus), Victor's da Vinci–notebook site and game. Before anything
else, read `CLAUDE.md` (the full manual, kept up to date through 11 Oct) and the top of `CHANGES.txt` (what changed and
what's waiting to be published). Everything below is only what a cloud session knew that the files don't already say.

## Where things stand

- Victor worked from Claude cloud sessions (claude.ai/code), which work on the GitHub copy of the repo and hand changes
  back as pull requests. Pull requests #17 to #20 are merged and published.
- **Pull request #21 may still be open**: https://github.com/Da-Vnky/Da-Vnky/pull/21. If it is: merge it on GitHub (the
  green button, no Claude needed), then run `tools\github-publish.bat` once. That brings it into this folder and puts it
  live. Check with `git log --oneline -3`: if "The bee faces the way it flies…" is there, it's in. What #21 does:
  - the bee turns to face the way it flies (and the gun it may be holding turns with it);
  - it starts over its roses on page load (its position variables are `--bee-wx`/`--bee-wy` now: plain `--wx`/`--wy` are
    the living room window's, set on the whole page, and the bee was inheriting them);
  - a click away from the bee and its chat closes the chat;
  - the wings' hum swoops up and down with its acceleration (`SWOOP`, 4 semitones);
  - the stand-in house's lattice and bottom step reach the lawn (there was a thin blue line).
- After that, there's nothing more on GitHub. From now on: work locally, preview with `tools\content.bat`
  (http://localhost:8001), publish with `tools\publish.bat` (or the content manager's publish button).

## Still waiting on Victor (not bugs)

- **The pat hand** (`assets/ui/cursor-pat`, 32 × 32, the palm at 17, 17 is the hotspot): he'll redraw it himself.
- **Rebelle opening the .psd** with `-input` (the drawing table): never tried on his computer. If Rebelle opens a blank
  canvas instead, `REBELLE_OPEN` in `tools/drawtable.py` can go back to `'new'` (see CLAUDE.md, *The drawing table*).
- **His front-house picture**: keep the house's foot at y 692 of the 1600 × 900 canvas. The bee's lawn (`LAWN` in
  sky/bee.js) is tuned to the stand-in's ground (y 711 to 787); check it still flies over the grass once his art is in.
- An offer not started: red guide marks (like front-ground's) for every slot's drawing-table canvas, skizy's room aside.
- The ending's "stay, and wake the others" still does nothing (CLAUDE.md, *Still to do*).

## Things that live outside this folder

- **Keeping Supabase awake**: `.github/workflows/keep-supabase-alive.yml` runs on GitHub every second day and costs
  nothing. It only works while the GitHub copy exists, so **don't delete the GitHub repo**, even after dropping the
  GitHub tools. If the project ever pauses anyway, restore it at supabase.com (project da-vnky).
- **The weekly letter** (Sundays 8:53 am Phoenix): a Claude Routine on claude.ai, not in the repo. It writes a bottle
  letter into the post for Victor to approve. It runs on Claude's cloud, so when the cloud credit is gone it may stop,
  or use his own plan's usage instead. To pause or delete it: claude.ai → Routines (it's named for the weekly letter).
- **The GitHub tools** (`tools\github-upload.bat`, `tools\github-publish.bat` and their `.sh`): only for the cloud
  sessions. Once he's done with those, they can be deleted (CLAUDE.md, *Working from GitHub*), but keep the GitHub repo
  for the Supabase job above.

## The rules that matter most (all in CLAUDE.md)

- Test in the browser before saying anything's done: `python tools\smoke.py`, `python tools\phones.py`, and look at the
  pages (known and fine: the living room's empty letter pile in the phone check).
- Every change gets a line in `CHANGES.txt` (`python tools\changes.py add "…"`).
- Never write the lists (`list.txt`, `catalog.txt`, `files.txt`, `manifest.txt`, …) or the `?v=` stamps: publishing does.
- **Victor's name is never in anything the site serves** (html, js, css, json, txt, svg, xml, comments included; write
  "the artist", or just the date). Check: `git grep -i victor -- ":!*.md" ":!tools/*.py" ":!tools/*.sh" ":!tools/*.bat"`.
- His friend is **skizy**, everywhere. Her folder (`schizophyllu.me.room/`) gets integration edits only, and he tells
  her what changed.
- Never read out, commit or send anything from `.inbox/`.
- Don't commit or push unless he asks: publishing is his.

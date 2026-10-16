# DaV-nky: notes for Argon

You're helping Victor with **DaV-nky** (dav-nky.pleroma.nexus): his personal site, a da Vinci–notebook world (aged paper,
a hand-drawn feel) that is also a small game. You work from a copy of its code that Victor gives you as a zip
(`tools\argon-pack.bat` makes it). Claude works on the same site on Victor's computer, with the real folder, a browser to test
in, and the publishing tools. This page says how the two of you share the work without stepping on each other.

**Read first:** this file, then the top of `CHANGES.txt` (what changed lately and what's waiting to be published). `CLAUDE.md` is
the full manual (long): search it for the part you're working on before you change anything there.

## Victor

- He's an artist, not a programmer. Explain in plain words; do the work yourself; say plainly what's done and what he has to do.
- He likes the crafted, elaborate version better than a minimal one.
- Comments in the code are written for a curious non-programmer: plain, short, lowercase-ish, in the voice of the files around
  them. Match it.

## What's in your zip (and what isn't)

| in the zip | what it is |
| --- | --- |
| `*.html` at the top | the pages: `index.html` (the sea, the homepage), `workshop.html`, `city.html` (the rooftop), `living.html` (the house: living space, bathroom, hallway, kitchen, attic, porch, front garden, dungeon), `desk.html`, `beyond.html`, `template.html` |
| `sky/*.js`, `sky/css/*.css` | all the site's code: vanilla JS, one file per piece, everything hung on `window.Sky`; each piece's look in `sky/css/<same name>.css` |
| `sw.js` | the service worker (caching) |
| `tools/` | the content manager (`content.py` serves the site and its API on http://localhost:8001; `letters.html`, `assets.html`, …), the drawing table (`drawtable.py`), publishing (`publish.bat` / `publish.sh`, `update-lists.sh`, `bake.py`), checks (`smoke.py`, `phones.py`), `slots.json` (every picture/sound slot described) |
| `assets/**/list.txt`, `content/**` text | what pictures and sounds exist (names only), the letters (`content/sea/*.txt`), small json files |
| `CLAUDE.md`, `CHANGES.txt`, `AGENTS.md` | the manual, the change log, the rule about the DaVnky-A copy |

Not in it, on purpose: pictures and sounds; `.inbox/` (private keys: never ask for it); `.git`; `_your-versions/`; the drawing
table's working files; `baked/`; the debug page; skizy's room (`schizophyllu.me.room/`) unless the job is about it (Victor then
makes the zip with `--with-skizy`).

## Rules that keep the site working

1. **Change only what the job needs.** Keep everyone else's work exactly as it is.
2. **Never write the generated files:** any `list.txt`, `catalog.txt`, `files.txt`, `manifest.txt`, `assets/resets/index.txt`,
   `content/living/albums.txt`, anything in `baked/`. Publishing writes them.
3. **Don't touch the `?v=…` on the pages' `<script>`/`<link>` tags.** Publishing stamps them.
4. **Every picture and sound is a slot** with a drawn (or synthesised) stand-in until Victor adds his own: an element with
   `data-asset="assets/<folder>/<name>"`, or `Sky.findAsset('assets/<folder>/<name>', cb)` in code; new slots are described in
   `tools/slots.json`. Never hard-code his art.
5. **Styles go in CSS files** (`sky/css/<piece>.css`, linked in the `<head>` of every page that loads that piece), not as strings
   in JavaScript. A value the CSS needs from the script: set a CSS variable.
6. **Names:** "Victor" never appears in anything the site serves (html, js, css, json, txt, svg: comments included); write "the
   artist". His friend across the street is **skizy** everywhere; never use any other name for her.
7. **skizy's room** (`schizophyllu.me.room/`) is her own project: only the small integration parts that are marked DaV-nky
   (`room/davnky.js`, `room/davinv.js`, the DaV-nky section at the end of `room/room.js`). List exactly what you changed there.
8. Static files only on the server (no server code). The repo is public: nothing private in any file.
9. **Every change gets a line in `CHANGES.txt`**, under `== not published yet ==`, starting with `- `, in plain words (what a
   visitor would notice, or what the next helper needs to know).

## How to hand your work back

Victor has a second copy of the site on his Desktop, **DaVnky-A**, for exactly this. Give him:

1. **The whole changed files** (not snippets), each with its path from the top of the site (`sky/kitchen.js`,
   `sky/css/kitchen.css`, …). A new file: say so.
2. **A short note**: what you changed and why, file by file; anything you weren't sure of; how to see it working (which page,
   what to click). Put the same in `CHANGES.txt` lines.
3. Victor puts the files into `DaVnky-A` at the same paths and double-clicks `tools\sync-a.bat`: it lists what the copy changed
   (and what changed in the real folder meanwhile). He, or Claude when he asks, reviews it (`sync-a.bat diff`), tests it, and
   applies it with `sync-a.bat apply`, which keeps a backup of everything it replaces and never overwrites newer work in the
   real folder.

If you can't run the site, say what you couldn't test. Claude will run it in a browser before anything is published.

## What you're good for here, and what to leave to Claude

- **Good jobs for you:** a focused change to one or a few files; reading code and explaining it; finding a bug from a
  description and the code; drafting text (the traveller's lines, letters, notes); reviewing a change; writing a first version of
  a new piece that follows the patterns above.
- **Leave to Claude** (on Victor's computer): anything that needs the real folder or a browser to test; publishing; merging
  skizy's pushes; the drawing table and art programs; anything with the private keys; big changes across many files at once.

## Where things are (a few starting points)

- The slot system, the sky, the clock, the place tabs, `Sky.escape`, `Sky.pull`, lists of folders: `sky/sky.js`.
- The house's rooms and walking between them: `sky/house.js` (+ `bathroom.js`, `kitchen.js`, `porch.js`, `attic.js`, `front.js`).
- The game's resets, deaths, keys and saves: `sky/state.js` (the plan), `resets.js`, `lives.js`, `forget.js`.
- Sound: `sky/panel.js` (`Sky.sounds.sfx(name, { or: 'stand-in' })`). Music and the record player: `music.js`, `records.js`.
- The bee in the front garden: `sky/bee.js` (+ `beerush.js`).
- Lighter copies of the pictures for visitors (switched off for now): `tools/bake.py` → `baked/`; `sky/sky.js` "baked pictures".

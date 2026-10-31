# DaV-nky in one read: what it is, how it's built, and what the artist is working towards

For Claude Code (or any assistant) starting cold in `C:\Users\Victor\Desktop\DaV-nky`. `CLAUDE.md` is the full manual (2000+
lines, one section per system): this is the map and the current direction, so you know which parts of it to open.
Written 24 Oct 2026. **Keep it true**: when a goal is reached or changes, change it here.

Read in this order: this file → the top of `CHANGES.txt` (what changed lately, and what's waiting to be published) → the
sections of `CLAUDE.md` your task touches (its `## ` headings are listed at the end of this file).

---

## What DaV-nky is

**dav-nky.pleroma.nexus**: Victor's personal site, and a small game hidden inside it. It's hosted (static files only) on his
friend **skizy**'s server pleroma.nexus as a subdomain, published by pushing to her Forgejo (members.pleroma.nexus, org
"subdomains"). The repo is **public**.

- **The look**: a da Vinci notebook come to life. Aged paper, ink, hand-drawn everything, and more and more **mixed media
  of paint and yarn/knitting/crochet** (Victor's direction: thick fuzzy yarn strokes, crocheted ropes, painterly brushwork).
  He always prefers the elaborate, crafted version over a minimal one.
- **The places** (each a page or a room): the **sea** (`index.html`, the homepage: scroll turns the day; letters wash up in
  bottles; a ship, a dock, a port city, waves, a rock framing the foreground), the **workshop** (easels, paintings, a notes
  board), the **rooftop** (`city.html`: skyline, telescope, skizy's window across the street), and the **house**
  (`living.html`: the living space, bathroom, hallway, kitchen, attic, porch, the front garden with its bee, and a dungeon
  under the bookshelf). A shared sky runs over all of it, following the real sun where the visitor is.
- **What visitors do**: read Victor's letters (written at the content manager or the hidden desk page, even in his own
  handwriting), send him a message in a bottle (he approves each one before it shows), play records he's put in the record
  player, look at his paintings, and talk to **the bee** in the front garden (skizy's BeeLLM, running in the visitor's
  browser) and **the little companion** (a gibberish-talking sprite voiced with Una Sugar).
- **The game underneath**: seven **resets** and an eighth (a Gnostic climb through the spheres). Each reset has one way to die
  and a hidden key; deaths and keys move you to the next reset, the world wears thinner, and reset 8 ends in knowing rather
  than dying (*The game: resets*, *Resets 5 to 8*, *The end* in CLAUDE.md). Played through the same pages as the site.
- **skizy's room** (`schizophyllu.me.room/`): **her** project, living inside the site (you climb in through her window). Only
  integration edits there, and say exactly what you changed so Victor can tell her. She also pushes to the repo and sends pull
  requests.

## How it's built

- **Static files only**: vanilla JS, one IIFE per file in `sky/`, all hung on `window.Sky`; each piece's CSS in
  `sky/css/<name>.css`. No framework, no build step. Pages link their scripts and styles by hand; publishing stamps the `?v=`.
- **Every picture and sound is a slot**: an element with `data-asset="assets/<folder>/<name>"` shows Victor's file if there is
  one (any of svg gif webp png jpg), else its drawn stand-in. Every slot is described in `tools/slots.json`. Most of the site is
  still stand-ins: Victor is replacing them with his own art, scene by scene. **Never hard-code art.**
- **The content manager** (`tools/content.py`, run by `tools\content.bat`, http://localhost:8001): serves the site locally and
  is Victor's workshop: letters, records, paintings, visitors' post, publishing, and the **asset manager** (`tools/assets.html`):
  each scene's slots on a live map of the page, and per slot "draw it in" Clip Studio / Photoshop / Rebelle / Blender (the
  **drawing table**, `tools/drawtable.py`: a canvas at the right size with a guide of the scene), "animate in", "use this".
- **Supabase** (free plan) holds visitors' bottles and the hidden **desk** page (`desk.html`: letters and post from his phone).
  Don't change the Supabase setup; Victor runs the SQL himself.
- **Publishing** is Victor's (`tools\publish.bat` or the content manager's button): it pulls skizy's work first, bakes lighter
  copies of pictures into `baked/`, writes the lists (`list.txt`, `catalog.txt`…), and pushes.

## What he's working on now (late Oct 2026)

1. **Replacing stand-ins with his own art**, the sea first (his rock, ship, dock and four waves are in; the port city and the rest of the scenes are still stand-ins). He paints in
   Clip Studio / Rebelle / Photoshop, draws on a Cintiq, and models in **Blender** (5.2, RTX 4070 Ti Super).
2. **Blender as part of the pipeline** (built 21–24 Oct; *The drawing table* and *A whole scene in Blender* in CLAUDE.md):
   - per slot: a Blender scene of the slot's canvas (camera locked to it, a guide behind, Grease Pencil with **the yarn**:
     strokes become fuzzy twisted yarn or a crochet chain, `tools/blender/yarn.py`); Ctrl+F12 renders into the slot's card.
   - per scene: "open this scene in Blender" lays the whole page out as layers at depth (slots with their own 3D .blend come in
     as real 3D, like the rock); "post-processing → site" brings back **depth of field, haze, light/mist pictures, bokeh lights
     and compositing** to the live site (`sky/postfx.js`), live and cheap where possible, baked where it must be.
   - the sea is set up that way now (focus on the ship, far wave pushed back, haze, bokeh in the port city).
   - **the toy camera** (25 Oct, first version, on the sea; *The toy camera* in CLAUDE.md): the page seen through a lens, the
     "matchbox car" look. Each layer slides by its Blender distance as the pointer moves, a faint handheld sway, vignette, grain,
     warmth, and the focus racks to what the visitor points at. Set on Blender's camera ("toy …" custom properties).
3. **Next ideas he's raised, not built yet**: cursor **relighting** and **depth parallax / parallax occlusion** from per-slot
   depth and normal maps exported from Blender (WebGL on the page, phones by tilt or drift); a **"boil"** (hand-drawn line
   wobble) on the waves, live (an SVG turbulence filter stepping ~10 fps) or from the Painterly add-on's animation; **rope
   physics** for the props hanging from the sky (the yarn rope tile exists: `tools/blender/rope.py`). Ask before starting any.
4. **Site speed matters**: anything new must not cost visitors (GPU-friendly CSS, small files, nothing per frame that redraws).
   He'll eventually "bake" the whole site once the art is in (`tools/bake.py` does pictures already).
5. **The game's next piece**: after the end, "stay, and wake the others" (*Still to do* in CLAUDE.md), and his art and sounds
   for resets 4 to 8.

## How to work with him (the short version: CLAUDE.md *How we work* has the reasons)

- He's an artist, not a programmer. Explain in plain words, do the work yourself, and **test in a browser before saying it's
  done** (`python tools/smoke.py`, `tools/phones.py`, Playwright screenshots, the console). Say plainly what he has to do after
  (restart the content manager if `tools/content.py` changed, publish, add art).
- **Every change gets a line in `CHANGES.txt`** (`python tools/changes.py add "…"`), and **keep `CLAUDE.md` true** (and this).
- **Never write** the generated lists (`list.txt`, `catalog.txt`, `files.txt`, `manifest.txt`, `assets/resets/index.txt`,
  `content/living/albums.txt`) or `baked/`, and never touch the `?v=` stamps. New pictures go in through the content manager
  (`asset_put`, a card's "use this"), not copied into `assets/` by hand.
- **Names**: "Victor" never appears in anything the server sends (html, js, css, json, txt incl. CHANGES.txt): write "the
  artist". His friend is **skizy**, her handle only, never her first name, anywhere in the repo.
- **Never** read out, commit or send anything from `.inbox/` (private keys). Don't commit or push unless he asks; publishing is
  his. Read a file again before changing it (he and skizy edit too) and never overwrite their edits: merge.
- **DaVnky-A** (`C:\Users\Victor\Desktop\DaVnky-A`) is a scratch copy for him and other helpers; `python tools/sync-a.py
  refresh --yes` keeps it up to date. **Never `sync-a.py apply` unless he asks** (AGENTS.md).
- Comments in the code are for a curious non-programmer, in the plain, lowercase-ish voice of the files around them.
- Other helpers on the site: **skizy** (and her Claude/Fable: `tools/FOR-SKIZY.md`, `tools/FOR-FABLE.md`), **Argon** (a
  browser AI: `tools/FOR-ARGON.md`), **Gemini/Antigravity** (`GEMINI.md`, `AGENTS.md`). Their briefs carry the same rules.

## Where things are

| | |
|---|---|
| `index.html`, `workshop.html`, `city.html`, `living.html`, `template.html`, `desk.html`, `beyond.html` | the pages |
| `sky/*.js`, `sky/css/*.css` | everything that runs on them (`sky.js` is the core: sky, slots, rooms, characters) |
| `assets/<folder>/` | Victor's art and sounds, one file per slot (`assets/README.txt` lists them) |
| `content/` | letters, records, paintings, books: what the content manager writes |
| `tools/content.py`, `tools/assets.html` | the content manager and its asset manager |
| `tools/slots.json` | every slot: what it is, its size, its scene, the asset manager's map views |
| `tools/drawtable.py`, `tools/blender/` | the drawing table, and Blender: `slot_scene.py`, `yarn.py`, `rope.py`, `scene_set.py`, `scene_post.py` |
| `tools/scenes.py` | "open this scene in Blender" and "post-processing → site" |
| `tools/drawing/` (gitignored) | his working files: canvases, .blend files, renders, `_scenes/` |
| `tools/smoke.py`, `tools/phones.py` | the tests |
| `schizophyllu.me.room/` | skizy's room (hers) |

## CLAUDE.md's sections (open the ones your task needs)

Working with Victor · Hosting and publishing · The desk · Links embedded in letters · Letters from the same day · The letters
in Victor's handwriting · Writing letters by hand · Players that start by themselves, songs in letters, records that fall out ·
The pages · The code (sky/) · The sea drifts · The sky's clock · Slots · The asset manager's maps and the template pictures ·
The drawing table (Blender, the yarn, the ropes) · A whole scene in Blender, and its post-processing back to the site · The
attic · Reset 4: below · The kitchen · The house: its rooms · The moon's light through the windows · Things that dance ·
Clicking, and taking hold of things · One press of Escape · Small shared pieces · The pages' lists of code and styles · The
front of the house · The bee in the front garden · "I'm just here for the bee" · The little companion · The porch · Phones ·
skizy's room and reset 3 · The traveller's size · Sounds · The record player · Records: their own vinyl · The screen's
static · The ambience · Lo-fi · Music and the stars · The sun's eye · Paper and canvas · Lighter pictures for visitors:
baked/ · Argon · Caching · The game: resets · Resets 5 to 8 · The end · skizy's window and skizy's room · Testing ·
Secrets and safety · Still to do / ideas on hold

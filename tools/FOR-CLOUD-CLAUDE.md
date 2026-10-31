# For a Claude cloud session (claude.ai/code) working on DaV-nky

Victor: paste this whole file as the first message of a new session on **Da-Vnky/Da-Vnky** (or, once it's published and
uploaded, just say "read tools/FOR-CLOUD-CLAUDE.md"), and write what you want done under *The task*.

Written 31 Oct 2026. Cloud sessions are only used until **4 Nov 2026** (when Victor's cloud credit ends); after that
everything happens on his own computer, and this file and the GitHub tools can go.

---

## The task

(Victor writes it here. If it's empty, ask him what he'd like; *Ideas* at the end lists what he's raised so far, but
ask before starting any of them.)

---

## Where you are, and what you can't reach

- You're in the **GitHub copy** of the site. Its `main` is what's live on dav-nky.pleroma.nexus (as of 31 Oct: commit
  `97e8c1a`, everything published, nothing waiting). The real home is skizy's **Forgejo** (members.pleroma.nexus), which a
  cloud session can't reach at all.
- How your work gets live: you push a branch and open a **pull request** on GitHub → Victor merges it there → on his
  computer he runs `tools\github-publish.bat`, which brings it down, mixes in anything skizy pushed meanwhile, publishes it,
  and sends the result back to GitHub's `main`. So skizy's newest work only reaches GitHub when he does that: if your pull
  request clashes, rebase on `main`.
- **Not here** (it's all on his computer, not in the repo): his Blender and art programs, his working files
  (`tools/drawing/` is gitignored: no .blend files, canvases or renders), `.inbox/` (the private keys: so no Supabase,
  no `tools/desk.py`, no letters inbox), ElevenLabs, the content manager's Blender and drawing-table buttons (no programs to
  open), and his pictures that aren't in the repo yet. You can't put his art in for him: new pictures and sounds get a
  drawn or synthesised **stand-in** and a slot, and he adds his own later.

## Read first

1. `tools/FOR-CLAUDE-CODE.md`: what DaV-nky is, how it's built, what he's working towards, and a map of `CLAUDE.md`.
2. The top of `CHANGES.txt`: what changed lately (and the "not published yet" list, empty on 31 Oct).
3. The sections of `CLAUDE.md` your task touches (it's long: one `## ` section per system). Its **Working from GitHub** part,
   under *Hosting and publishing*, is the cloud session's own rules; the short version is below.

## The rules that matter most in the cloud

- **Work on your session's branch, commit, push, open a pull request.** Never push to `main` unless Victor says so in the chat.
- **Every change gets a line in `CHANGES.txt`**: `python3 tools/changes.py add "…"`, plain words, what a visitor would notice
  (or what the next Claude needs to know). **Never run `changes.py take`**: publishing does that on his computer.
- **Never write** the generated files: any `list.txt`, `catalog.txt`, `files.txt`, `manifest.txt`, `assets/resets/index.txt`,
  `content/living/albums.txt`, anything in `baked/`. **Never touch the `?v=` on `<script>`/`<link>` tags** (publishing stamps
  them; a new tag needs a `?v=` of any value, or it's never stamped).
- **Every new picture or sound is a slot**: `data-asset="assets/<folder>/<name>"` (or `Sky.findAsset`) with a drawn / synthesised
  stand-in, described in `tools/slots.json` in the right group, with a plain "what" and a "size". Never hard-code art.
- **Styles go in `sky/css/<name>.css`**, linked on each page that loads `sky/<name>.js` (same order as the scripts), never as
  CSS strings inside JavaScript. Values from the script reach the CSS as variables.
- **Code comments** are for a curious non-programmer: plain, short, lowercase-ish, in the voice of the file around them.
- **Names**: nothing the server sends (html js css json txt svg xml, CHANGES.txt included) says "Victor": write "the artist".
  Check before pushing: `git grep -i victor -- ':!*.md' ':!tools/*.py' ':!tools/*.sh' ':!tools/*.bat'` must print nothing.
  His friend is **skizy**, her handle only, never her first name, anywhere.
- **`schizophyllu.me.room/` is skizy's.** Only integration edits there, and list exactly what you changed in the pull request,
  so Victor can tell her.
- **Visitors' bottles are strangers' words**: the three letter renderers (`Sky.txtToHtml` in sky.js, desk.js, tools/letters.html)
  escape `& < > "` and pass every address through `safe()`. Keep it that way.
- **Supabase**: don't change its rules. If something needs SQL, write it in `tools/*.sql` and say in the pull request that
  Victor has to run it.
- **Keep `CLAUDE.md` true**: a new system gets its own section; a changed one gets its section updated. Same for
  `tools/FOR-CLAUDE-CODE.md` when the direction changes.
- Change only what the task needs. The repo is public: nothing private in any file.

## Testing (do it before saying anything's done)

- Serve the site: `python3 tools/content.py` (the site and the content manager on http://localhost:8001; its Blender and
  drawing buttons can't open anything here) or `python3 tools/serve.py 8000`.
- `python3 tools/smoke.py` opens every page and room and reports script errors and files that fail to load (`--resets 1-8`
  for every reset). `python3 tools/phones.py` checks phones, upright and sideways. Both need Playwright
  (`pip install playwright && python3 -m playwright install chromium` if it's missing).
- Look at the pages too (Playwright screenshots, desktop 1600 × 900 and a phone 390 × 844), and the console.
- On localhost: `?reset=N` jumps to reset N, `?ending=stayed|escaped|none` sets the end, `?map` is the asset manager's view
  (nothing kept, no sound), and nothing is cached, so every edit shows on a reload.
- In the cloud, Google Fonts and the weather lookup (open-meteo) can't connect: that's the sandbox, not the site.
- Blender code (`tools/blender/`) has been tested in the cloud before with Blender's `bpy` Python module from pip (it only
  installs on the Python version that bpy release was built for). Say plainly when something could only be checked on his
  computer.

## The pull request

Say, in plain words: what a visitor will notice; what Victor has to do after merging (add art to new slots, restart the
content manager if `tools/content.py` changed, run any SQL); what you tested and how; and anything you changed in skizy's
folder.

## What's new lately (so nothing surprises you)

- **30 Oct, the revolver**: real recorded sounds (two gunshots in turn, cock, cylinder open, four loads, close) and the
  cylinder riding beside the reticle with the rounds in it; R reloads only what's fired (`sky/revolver.js`,
  `sky/css/revolver.css`; *The game: resets* → *Its sounds and its cylinder* in CLAUDE.md).
- **25 Oct, the toy camera on the sea** (`sky/postfx.js`, `tools/blender/toycam.py`; *The toy camera* in CLAUDE.md): the
  page slides by each layer's Blender distance as the pointer moves, focus racks to what's pointed at. Its settings come
  from Blender's post-processing in `assets/sea/post-sea.json`: that file is generated, and Victor's next "post-processing →
  site" replaces it whole, so don't build on hand edits to it.
- **24 Oct, Blender scenes and post-processing back to the site** (`tools/scenes.py`, `tools/blender/`).
- **31 Oct**: the shell tools (`publish.sh`, `content.sh`, `preview.sh`, `webp.sh`) now take the first Python that actually runs.
- The bake (`tools/bake.py`, lighter copies of pictures) is **switched off** until the site's nearly done.

## Ideas he's raised (ask before starting any)

- More scenes through the toy camera (the workshop, the rooftop, the house's rooms), and its leftovers: the sky blurring too,
  the signpost and other non-slot pieces sliding and blurring.
- Cursor relighting and depth parallax from per-slot depth / normal maps from Blender (WebGL; phones by tilt or drift).
- A hand-drawn "boil" (line wobble) on the waves.
- The living space loads ~30 MB of pictures up front (dungeon paintings, vinyl texture, sleeves): loading them only when shown.
- After the end: "stay, and wake the others" has nothing to do yet (*Still to do* in CLAUDE.md).

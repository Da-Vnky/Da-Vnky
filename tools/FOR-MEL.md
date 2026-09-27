# For Mel (and Mel's Claude): working on DaV-nky

Victor's site, **DaV-nky** (dav-nky.pleroma.nexus), is plain static files in this repo. Publishing = a git push to
Forgejo. Your room, `schizophyllu.me.room/`, lives inside it. This page is the short version of how Victor works on
it, and the tools he uses, set up for Linux and VS Code. **`CLAUDE.md` at the top of the repo is the full manual**
(every page, every system, the resets game): a Claude working here should read it before changing anything.

## 1. Set up once

```sh
git clone <the repo> DaV-nky && cd DaV-nky
git config core.hooksPath tools/hooks    # before each commit, the site's lists are written again (see "never edit")
mkdir -p .vscode && cp tools/vscode/tasks.json .vscode/tasks.json   # the tools as VS Code tasks
```

You need `git`, `sh` and `python3` (nothing else: no build step, no node). In VS Code, open the repo folder: the
tools are in **Terminal → Run Task…** (copied from `tools/vscode/tasks.json` by the line above).

## 2. The tools

| what | Linux / Mac | VS Code task (Terminal → Run Task) | Victor's Windows version |
|---|---|---|---|
| **get the latest** (what others pushed) | `sh tools/pull.sh` | DaV-nky: pull | `tools\pull.bat` |
| **the content manager** (below) | `sh tools/content.sh` → http://localhost:8001/ | DaV-nky: content manager | `tools\content.bat` |
| **preview the site** | `sh tools/preview.sh` → http://localhost:8000/ | DaV-nky: preview the site | `tools\preview.bat` |
| **publish** (pull, lists, commit, push) | `sh tools/publish.sh "what changed"` | DaV-nky: publish | `tools\publish.bat` |
| rewrite the lists by hand | `sh tools/update-lists.sh` | DaV-nky: rewrite the lists | (publish does it) |
| your room's slots, after adding things to it | `python3 tools/mel-room-slots.py` | DaV-nky: Mel's room slots | same |

**Pull before you start, publish when you're done.** Victor works on his copy at the same time.
- `pull.sh` never loses work. Your unpublished changes stay put.
- If the same file was changed both by you and on Forgejo, it keeps your copy in `_your-versions/<date>/`
  (never published), then pulls. Merge the two by hand, or ask your Claude to.
- `publish.sh` pulls first too, but just **stops** on a clash, so a publish can never overwrite anyone's work.

The content manager's **publish** button runs `tools/publish.sh` on Linux. Its output shows up in the terminal
where the content manager is running.

## 3. The content manager (http://localhost:8001/)

`tools/content.py` is a small local web app. Everything it changes is ordinary files in this folder, and nothing goes
online until you publish. Its tabs:

- **your letters**: the homepage's messages in bottles (`content/sea/`).
- **your things**: easel paintings, city window scenes, bookshelf pages.
- **visitors**: bottles and art people sent in (needs Victor's FormSubmit key, in `.inbox/`: never commit that folder).
- **notes**: the workshop clipboard.
- **assets**: every picture and sound on the site (next section), the record player (singles and albums), the noise
  machine, and each reset's own art.
- (**debug**, `tools/debug.html`: a page to jump between resets and flip the game's switches. It's kept out of git on
  purpose, because published it would be a cheat page on the live site. Ask Victor for the file and drop it in
  `tools/`: it stays on your computer.)

## 4. Pictures and sounds: slots

Everything drawn on the site is a **slot**: a name with a hand-drawn stand-in. Save a picture under that name, and it
replaces the stand-in. There's no code to change for this.

- **In the page**, a slot is an element with `data-asset="assets/<folder>/<name>"` holding an inline
  `<svg class="placeholder">` stand-in. `Sky.fillAssets()` (sky/sky.js) looks the name up in that folder's `list.txt`
  and swaps in the first of `.svg .png .webp .gif .jpg` it finds. A `-glow` twin or an `-open` twin is picked up the
  same way where a piece supports it. In JS: `Sky.findAsset('assets/<folder>/<name>', function (url) { … })`.
- **Sounds**: `Sky.sounds.sfx('<name>', { or: '<stand-in>' })` plays `assets/sounds/<name>.mp3|.ogg` if it's there,
  and otherwise a synthesized stand-in (the `or` one; the list is in `sky/panel.js`, `SFX`).
- **Per reset**: `assets/resets/reset-<n>/<folder>/<name>.*` swaps a slot from reset n on (`davSave.swapFor`).
- **In the asset manager**, slots are described in `tools/slots.json`. Its shape is
  `scenes → groups → slots`, each slot like:
  `{ "slot": "assets/living/porch-chair", "what": "the rocking chair…", "size": "about 120:170, see-through", "optional": true }`.
  - `kind` can be `sound`, `font`, `svg` (SVG only) or `model`; the default is a picture.
  - `stock` + `crop` (optional) make the stand-in preview show a file, zoomed in on a region.
  - A slot the pages use but `slots.json` doesn't describe still shows up by itself, under "found on the site"
    (content.py reads the pages and sky/*.js for `assets/<folder>/<name>`). Describe it properly when you can.
- **To add a new piece of art**:
  1. Draw a stand-in `<svg class="placeholder">` in the page.
  2. Give its element `data-asset="assets/<folder>/<name>"`.
  3. Add the slot to `tools/slots.json` (a new folder in `assets/` is fine: the lists pick it up).

## 5. Your room and the site

- `schizophyllu.me.room/` is yours. Victor's side only makes **integration** edits there, and says what they were.
  All in `room/room.js` or files of their own:
  - the **DaV-nky section at the end of `room/room.js`**: the reset 3 pills death, the quiet room and the record,
    the empty cabinet before reset 3, and Victor's pictures for the room;
  - a short hook at the top of `inlineArt()`;
  - `room/davnky.js`: those lines of dialogue;
  - `room/davinv.js`: the site's hotbar inside your room.
- **Victor's pictures for your room**: the asset manager's "Mel's room" tab. `assets/mel-room/<room>-<thing>.*`
  replaces `room/objects/<room>/<thing>.svg`, and `assets/mel-room/<room>.*` is that room's backdrop. Your own
  drawings stay as the stand-ins.
  - **Add a clickable thing** (a new `<g class="obj" data-id=… data-art="room/objects/<room>/<name>.svg">`) and run
    `python3 tools/mel-room-slots.py`: it gets a slot.
  - **If the code switches parts of a drawing on and off**, put a comment at its top:
    `the code looks these ids up, so keep them: #a, #b`. Its slot then takes SVG only.

## 6. Never edit by hand, and a few habits

- **Written by the tools, never by hand:** every `list.txt`, `catalog.txt`, `files.txt`, `manifest.txt`,
  `assets/resets/index.txt` and `content/living/albums.txt`. `update-lists.sh` writes them, on every publish and
  through the commit hook.
- **After changing anything in `sky/`**, bump the `?v=` string on every page, the same string everywhere (visitors'
  browsers cache hard).
- **Every new picture or sound** is a slot with a stand-in, described in `tools/slots.json`.
- **Test in a browser before publishing.** `?reset=N` on any page jumps to reset N, but only on localhost.
- **Deaths and resets** are in `CLAUDE.md`, "The game: resets". Each reset has one death, one heart, and a hidden key
  that has to be found first.

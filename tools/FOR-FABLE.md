# For skizy's Fable: two jobs on DaV-nky

You're working on Victor's site **DaV-nky** (dav-nky.pleroma.nexus) from the Forgejo repo, for skizy. Victor asked for
two things, written up here so you can pick them up cold. Read these first, in this order:

1. `CHANGES.txt`: what changed lately ("not published yet" at the top, then the log).
2. `CLAUDE.md`: the full manual (every page, every system, the slots, the house rules). The sections you'll need most:
   *How we work*, *Slots*, *The asset manager's maps and the template pictures*, *The drawing table* (its **Blender**, **The
   yarn** and **The ropes** parts), *Testing*.
3. `tools/FOR-SKIZY.md`: the tools on Linux, pulling, publishing, pull requests.

## The house rules (short: CLAUDE.md has the reasons)

- Victor isn't a programmer: explain in plain words, do the work, **test it in a browser before saying it's done**.
- **Every picture and sound is a slot** with a drawn stand-in, described in `tools/slots.json`. Never hard-code art.
- **Never write** any `list.txt`, `catalog.txt`, `files.txt`, `manifest.txt`, `assets/resets/index.txt` or
  `content/living/albums.txt` (publishing writes them), and never touch the `?v=` stamps. New pictures go into a slot through
  the content manager (`asset_put`, the card's "use this"), not by copying into `assets/` by hand.
- **Every change gets a line** in `CHANGES.txt` (`python3 tools/changes.py add "…"`), and `CLAUDE.md` is kept true.
- Names: **skizy** only (never her first name), anywhere in the repo. Victor's name is never in anything the server sends
  (html, js, css, json, txt, svg, CHANGES.txt…): write "the artist" there. These `.md` files and `tools/*.py` may say Victor.
- The repo is public. Nothing from `.inbox/` ever. Don't change the Supabase setup.
- Work on a branch and open a pull request on Forgejo (Victor merges with `tools/merge-prs.bat`), unless skizy says otherwise.
- Comments in the code are for a curious non-programmer, in the voice of the files around them.

---

## Job 1: "open this scene in Blender" in the asset manager

**Done (24 Oct, by Claude)**: see CLAUDE.md, *A whole scene in Blender, and its post-processing back to the site*. Kept below as it was.

**What Victor wants**: on each scene's tab in the asset manager (`tools/assets.html`: "the sea", "the living space", "the
kitchen"…), one button that brings **every slot of that category into Blender as a layered set**: each picture in its place
and stacking order, in its own collection, so he can draw over it with the yarn, add 3D models or pictures, and send each
layer back into its slot.

**What's already there to build on** (read the code before starting):

- `tools/drawtable.py`: the drawing table. `look()` opens a scene's map page in Playwright (1920 × 1080, `?map`: nothing kept,
  no sound) and finds a slot's box; `make()` builds a slot's canvas; `blender_scene()` + `tools/blender/slot_scene.py` make one
  slot's Blender scene (an orthographic camera framing exactly the canvas, the guide as a camera background, a Grease Pencil
  "draw here" in Draw mode, EEVEE, see-through film, Ctrl+F12 renders `<name>-render-0001.png` beside the .blend, where the slot's
  card shows it). `find_app('blender')` finds Blender or the card asks where it is.
- `tools/map.js` (`DavMap.boxes()`): every showing slot on a page and its box. `tools/templates.py`: opens each scene and view as
  a new visitor and draws the outlines (how to drive the map pages, `NOON`, `page_url`).
- `tools/slots.json`: scenes (`id`, `name`, `page`, `map: { page, views: [{ name, do, until, wait }] }`, `groups[].slots[]`).
- `tools/blender/yarn.py`: the yarn (Grease Pencil strokes → thick fuzzy twisted yarn or a crochet chain, on a Curves object:
  only those draw the fuzz). `yarn.add(scene, drawing)`.
- `tools/content.py`: the content manager's server (`draw_run`, `draw_open`, the `/__draw/*` routes).

**How it could go** (a suggestion: improve on it):

1. The button: next to "make the template pictures" on a scene with a map, "open the whole scene in Blender" (with the map's
   current `show` view). `POST /__draw/scene { scene, view }` → `python tools/drawtable.py scene <scene id> [--view <name>]`.
2. Gathering (Playwright, as `look()` does): open the map page in that view; for every slot of the category that's showing, its
   box and its stacking order (paint order: z-index and stacking contexts, then document order; `document.elementsFromPoint`
   at a few points is a cheap check), and its picture: the slot's own file if there is one (`current_file`), else a picture of
   its drawn stand-in (an element screenshot with everything else hidden and a see-through background). Slots of the category
   not showing in that view (other poses, open/shut states, sounds aside) go in too, hidden, in a "not showing now" collection.
3. Blender (`tools/blender/scene_set.py`, run with `blender -b --factory-startup --python … --`, like slot_scene.py): the same
   camera as slot_scene.py framing 1920 × 1080; each picture as a flat plane at its box, a little nearer the camera for each
   step up the stack (so they overlap as on the site), with a see-through image material; **one collection per slot**, named by
   the slot (`sea/wave-1`), custom properties `dav_slot`, `dav_box`, `dav_canvas`; the yarn's "draw here" on top. Saved as
   `tools/drawing/_scenes/<scene>.blend` (tools/drawing/ is gitignored: nothing there is published), then opened.
4. Back into the slots: a second step (a button in the .blend's "how to" text, or `drawtable.py scene-out <scene>`): render each
   slot's collection on its own (the others hidden), cropped to its box, at its canvas size (`canvas_size`: twice the shown size,
   or the slot's stated one), see-through, into `tools/drawing/<folder>--<name>/<name>-blender.png`, where each slot's card shows
   it with "use this". Anything drawn or added that isn't in a slot's collection is left for Victor to move into one.
5. **SVG**: only plain Grease Pencil lines can really be SVG (Blender's Grease Pencil SVG export). Yarn, lighting, 3D models and
   fog render as pictures; an SVG holding pictures is only a heavier PNG (and a page can't load files an `<img>`'s SVG points at).
   So PNG/WebP back into each slot, and SVG only for a slot drawn purely in pencil lines, if Victor wants it.
6. Things to choose, like the map's own `show` menu: the time of day (the sky, the lights), moving things (waves, the ship, the
   drift on the sea page) at one moment, animated GIFs/WebPs as their first frame (or an image sequence).
7. Test it without Victor's Blender the way it was done on 21 Oct: `pip install bpy` (5.2 runs on Python 3.13; 4.5 needs 3.11)
   gives Blender as a Python module, and a small stand-in `blender` script that hands `-b … --python X -- args` to it. Check the
   .blend (collections, boxes, order), and render a frame to compare with the map's own picture of the scene.

## Job 2: a debug pass over the whole site

**Done (by Fable).** Kept below as it was.

Go through the site looking for what's broken, report it plainly, fix what's clearly a bug, and **ask before changing how
anything is meant to work**. Don't remove features to make a problem go away.

- `python3 tools/smoke.py --resets 1-8` (every page and room, every reset: script errors and missing files; in a fresh clone
  the only 404s should be sounds Victor hasn't added) and `python3 tools/phones.py --sizes all` (things you can tap that are
  off screen or covered).
- **Times of day**: look at each page in the morning, at noon, at golden hour, dusk and night (`Sky.setTime(p)`: 0 noon,
  .5 sunset/sunrise, 1 midnight; the morning is the mirrored side). On 21 Oct a style for the letters' mirror writing (`.mirror`
  in paper.css) turned out to flip, fade and push down the whole sky, but only in the mornings: bugs like that hide at one time.
- **Reduced motion** (Playwright's `reduced_motion='reduce'`) and **phones**, upright and sideways.
- **Performance**: CDP `Performance.getMetrics` over a few seconds per page (task ms a second, layout, style). Headless
  Chromium has no graphics card, so frames a second there undersell a real computer; compare main-thread work per frame.
- **Leftovers** from things taken out: on 21 Oct the companion went from six kinds (one a day) to una alone; the ropes went to
  16 px and back to 5. Look for code, styles, slots or notes that still talk about what's gone.
- Known, to look at with Victor rather than fix alone: by day the moon hangs below the horizon and its rope still runs down into
  the sea (on phones it crosses the sun).
- skizy's room (`schizophyllu.me.room/`) is hers: check its integration with the site (`room/room.js`'s DaV-nky part,
  `room/davnky.js`, `room/davinv.js`, the window's sky), and leave her own code to her.
- Write up what you found (each: where, what happens, how to see it, fixed or not) in the pull request, and a `CHANGES.txt`
  line for each fix.

# Back to working locally (2 Nov 2026): the cloud sessions' handoff

For Claude Code on Victor's computer (`C:\Users\Victor\Desktop\DaV-nky`). From 5 Oct to 2 Nov, Claude cloud sessions
(claude.ai/code) worked on DaV-nky from a copy of the repo on GitHub. Victor's cloud credit ran out on 2 Nov, so from now on
all the work happens here, in his folder, with you. This file says what the cloud built, what nobody has checked yet, and what
to tidy away. Read it once, do the "first" list with him, then `tools/FOR-CLAUDE-CODE.md` and `CHANGES.txt` as usual.

Everything the cloud built is also described in `CLAUDE.md`, under the section named for it. This is only the summary and the
loose ends.

---

## First, with Victor (in this order)

1. **Is everything merged on GitHub?** The last pull request, "The ship catches the waves' glow at night" (Da-Vnky/Da-Vnky
   #35, which also carries this file), may still be open when he reads this. He merges it on GitHub first.
2. **Run `tools\github-publish.bat` one last time.** It brings what was merged on GitHub (the code, and the cloud's
   CHANGES.txt lines) into his folder, publishes it to Forgejo, and leaves GitHub's `main` the same as what's live. Check
   afterwards that `git log -1` here matches what the script said it pushed, and that CHANGES.txt has no lines from the cloud
   left under "not published yet".
3. **Then the GitHub tools can go**, once he says so (they were built to be deleted: CLAUDE.md, *Working from GitHub*):
   - `tools/github-upload.bat`, `tools/github-upload.sh`, `tools/github-publish.bat`, `tools/github-publish.sh`
   - `tools/FOR-CLOUD-CLAUDE.md` (the cloud's brief)
   - in `CLAUDE.md`: the *Working from GitHub* bullet, the cloud exception under *How we work*, and the line about these files
     in *Hosting and publishing*; in `tools/FOR-CLAUDE-CODE.md`, any mention of them; `merge-prs.sh` and `pull.sh` don't use them.
   - the git remote `github` can stay (harmless) or go (`git remote remove github`).
   - and this file, once its loose ends below are done (or fold what's left into CLAUDE.md's *Still to do*).
   Add a CHANGES.txt line for the removal, as for any change.

## What keeps running without the cloud

- **Keeping Supabase awake** (`.github/workflows/keep-supabase-alive.yml`) runs on **GitHub Actions**, which is free for a public
  repo and has nothing to do with Claude's credit. It keeps working as long as the GitHub repo exists, even if nothing is ever
  pushed there again (its last step re-enables itself each run, so GitHub's 60-day switch-off doesn't happen). **Don't delete the
  GitHub repo** unless something else takes over that job, or the free Supabase project pauses after a quiet week again (the
  letters, bottles, desk and post all stop). If it fails, GitHub emails him.
- **The weekly letter** (a Claude Routine on claude.ai, Sundays 8:53 Phoenix, writes a bottle from "Claude" for him to approve)
  runs in Claude's cloud. It probably stops with the credit (or takes from it when the credit comes back). It isn't in the repo,
  so nothing here needs changing; he checks it at claude.ai if he wants it on or off. Its bottles still need approving like any.

## What the cloud built, newest first

All published to Forgejo already (by his github-publish runs), except the ship's glow (PR #35, above).

- **2 Nov, the sea at night**: the waves' tops glow (a copy of each wave lifted out of the night's dimming, masked to its crest,
  with a slight bloom), and **the ship catches that light** near the water (`sky/ground-sea.js` `glowFilter()`, `shipLit()`;
  `sky/css/ground-sea.css`). CLAUDE.md: *The sea drifts* → "The waves' tops glow at night", "The ship lit by the waves". Two traps
  written down there (a url() in a CSS variable is read from `sky/css/`; never `has-art` on a `.layer`).
- **1–2 Nov, reset 1 on a television** (`sky/crt.js`, `sky/css/crt.css`): a filmed-CRT look (the tube's stripes, a dark band
  rolling up, flicker, rounded corners, a colour split strongest at the edges, a camera's colour), a REC / LIVE / CAM mark with
  the visitor's own date and time, shown only after the loading screen; switching on and off (the off is how reset 1 ends).
  The moiré was tried and taken out (it's in git history, commit 3a66d46). CLAUDE.md: *Reset 1 on a television*.
- **2 Nov, reset 1's bitcrush on everything**: the record player's lo-fi stuck on (the slider and switch shudder) and every sound
  through **one** shared engine with one bitcrush (`Sky.crush` in `sky/sky.js`; panel.js, babble.js, bee.js, music.js use its
  context in reset 1; recorded sound effects are decoded once and played from memory). From reset 2, all as before. Not in
  skizy's room. CLAUDE.md: the same section, "Everything bitcrushed" and "One engine, one bitcrush".
- **1 Nov**: reset 1 has no grain or post-processing (the television is its only effect); the grain is half as strong everywhere.
- **31 Oct**: seagulls on the sea (and on aluminium sticks in resets 1–2), their calls and the sky's birds' chirps; the Claubes
  talk (babble.js voices); the companion switched off (a tick in the asset manager brings it back); place tabs teleport; the porch
  from the front garden; the camera look (grain, corners, warmth) on every scene, none from reset 5; resets 5–8 deepened (three
  peeling seams in 5, the tea towel over the eye in 6, the pie's slice in the microwave in 7, the relics and rulers' names in 8);
  the big pictures turned into WebP; the weather's slider like a fader; the toy camera keeps its subjects in focus.
- **30 Oct**: the revolver's recorded sounds and its cylinder beside the reticle.
- **24–25 Oct**: whole scenes in Blender and post-processing back to the site; the toy camera on the sea.
- Before that (5–21 Oct): see CHANGES.txt's log; CLAUDE.md has each.

## Nobody has checked these yet (do it with him when they come up)

- **Every sound change since 30 Oct, by ear**: the cloud can't hear. Reset 1's bitcrush on all sounds (do the sound effects start
  on time now? is anything silent that shouldn't be?), the Claubes' voices and their "wheee", the seagulls and birds' drawn calls,
  the revolver's reload timing. `?reset=1` on localhost to hear reset 1.
- **Reset 1's television on his own screens** (his computer and phone): readability, and whether the colour split is kept or
  switched off by the speed check (`crt.js` `settle()`: sessionStorage `crt-split`).
- **The sea at night with his art**: the waves' glow and the ship's light were tuned on screenshots in a test browser, not his
  monitor. The numbers are at the top of ground-sea.js's glow section if he wants more or less.
- Older, still unverified: Rebelle opening a .psd with `-input` and the live-link new canvas (*The drawing table*); the desk
  against the real Supabase project (it was tested against a stand-in); `tools/supabase-desk.sql` run again for the audio types
  (songs at the desk).

## Habits from the cloud worth keeping

- Test in the browser before saying it's done: the content manager's preview (http://localhost:8001), and Playwright for
  screenshots at 1600 x 900 and a phone (390 x 844). `python tools/smoke.py --resets 1,2` (or 1-8) after anything shared;
  `python tools/phones.py` after layout changes.
- Before every publish: `git grep -i victor -- ':!*.md' ':!tools/*.py' ':!tools/*.sh' ':!tools/*.bat'` prints nothing.
- A CHANGES.txt line for every change (`python tools/changes.py add "…"`), and CLAUDE.md kept true.

## Ideas he raised that aren't built (ask before starting any)

- The toy camera on more scenes (workshop, rooftop, the house's rooms); the sky and non-slot pieces sliding and blurring too.
- Cursor relighting and depth parallax from Blender depth/normal maps (WebGL; phones by tilt or drift).
- A hand-drawn "boil" (line wobble) on the waves.
- The living space loads ~30 MB of pictures up front: load them only when shown.
- After the end: "stay, and wake the others" (he has his own idea for it); his art and sounds for resets 4 to 8.

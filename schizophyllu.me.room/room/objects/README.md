# the things you can click

Every clickable thing in the apartment has its own drawing here, one file each:

```
objects/main/       the room (crt.svg, claube.svg, fridge.svg, enki.svg, ...)
objects/bedroom/    acloset.svg, station.svg, lavalamp.svg, ...
objects/hallway/    objects/bathroom/    objects/closet/    objects/roof/
```

Everything that isn't clickable (walls, floor, light, the fairy lights, the clutter) stays in the room's own file, `room/room.svg`, `room/bedroom.svg` and so on.

## Drawing one

- **Every file is the whole room**: 1600 × 900, the same size as the room. Draw the thing where it sits in the room and it will land there on the site, with no positioning step. Opening `crt.svg` shows the CRT alone, sitting in its spot.
- **Redraw freely.** Replace everything inside the file if you want: shapes, gradients, images, anything. Keep the drawing inside the room's frame.
- **To see it in place**, reload the site. The page pulls each file in when it loads.
- **Layering is set by the room file.** Each thing has a placeholder line there, like `<g class="obj" data-id="crt" data-art="room/objects/main/crt.svg"></g>`. Things further down that file are drawn on top. Move the line up or down to change what's in front.
- **Images** can sit anywhere. Link them relative to the drawing's file, e.g. `href="../../../assets/apartment/claube-drawing.png"`.

## What the code needs

Most files have no rules. A few have a note at the top like this:

```
the code looks these ids up, so keep them: #fridge-open, #fridge-closed
```

Those parts get switched on and off, moved or filled in by the code:

- the fridge door open and shut
- the closet door
- the music station's screen and meters
- the console's power light
- Claube's pen

Keep those ids on whatever you draw for them. Everything else in the file can change. A few class names also make things animate: `pen` (Claube writing), `blink`, `bulb`, `blob` (lava), `varstar`, `head` (the cable hydra). Keep them on the new drawing wherever you want the movement.

Some files have a second `<defs class="preview">` block. Those are copies of gradients and patterns the thing shares with the rest of the room. They're only there so the file looks right when you open it alone. The site ignores them and uses the real ones in the room file, so to change a shared gradient, change it there.

The small invisible `anchor` circles in the room files mark where speech bubbles appear for Mira, skizy and Claube. They live in the room file, not the drawings, so redrawing a character never moves the speech bubbles.

## The glows

The light in each room (the CRT's green, the lamp, the moonbeam, the lava lamp, the hall bulb…) is made of **glows**,
and each glow has its own file too: `objects/<room>/glow-<name>.svg`. There are 28, and their names say what they are,
e.g. `main/glow-crt.svg` or `bedroom/glow-lavalamp.svg`. Paint them the same way as the things: the whole room is the
canvas, and you draw the light where it falls.

- **The room blends them in "screen" mode:** light only adds. Bright colours glow, and black or dark parts simply
  vanish, so paint them on black or on a see-through background.
- **They aren't clickable,** and they sit in the room's light layer, above everything else.
- **A few are switched or animated by the code** (the fridge's light, the lava lamp, the bulbs, the CRT's flicker, the
  music station's pulse…). Those files say so at the top: keep that id or class on your painted glow.

## The blinkies

The little lights that blink or move (monad's LED rows, the CRT's power light, the stars in the windows, Mira's
sparkles, the xmas lights, the radio tower…) live in their own files next to their object: `<name>-blink.svg`, e.g.
`main/server-blink.svg`. They sit on top of the object, so **if you paint the object as a flat picture, its blinkies
still blink over your painting**. Don't paint them into the object; leave those spots as they are and the blink
layer covers them. (A few stay inside their object because the code needs them there: Aether's antenna, the lights
inside the bedroom closet, and the cursor on opi's terminal.)

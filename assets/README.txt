DaV-nky · ASSETS
================

Everything you see on the site is a SLOT: a named spot waiting for your art.
The drawings you see now are only stand-ins. Save a picture with the slot's
name into its folder, commit, and it takes the drawing's place. No code.
Delete the file and the drawing comes back.

    assets/sky/  assets/sea/  assets/city/  assets/countryside/
    assets/workshop/  assets/living/  assets/characters/

  • any of .svg .png .webp .gif .jpg works (first one found wins, in that order)
  • "-glow" twin: the same name plus -glow (lantern-glow.png) is laid exactly
    on top and fades in as the sun goes down: flames, lit windows, lamps
  • a GIF can animate anything (a flickering candle, a spinning record)

SEE THE SLOTS: open any page with ?slots on the end, e.g.
    https://dav-nky.pleroma.nexus/city.html?slots
Every slot gets a dashed outline (green = your art is in) and a list of the
page's slot names appears in the corner.

Templates are in assets/templates/:
    room-template.svg   1920 x 1080 layout sheet: window, Polaris and the signs
    prop-template.svg   one piece per file (lamp, chair, shelf ...)
    palette.svg         the site's colours with hex codes


THE SKY (every page)                                     canvas to draw on
--------------------
    assets/sky/sun           the sun (+ sun-glow: the setting sun,     400 x 400, centred
                             fades in through sunset)
    assets/sky/moon          the moon                                  400 x 400, centred
    assets/sky/cloud         every cloud ... or give each its own:     800 x 360
    assets/sky/cloud-1 … cloud-5
    assets/sky/polaris       the north star, top centre at night       200 x 200, centred
                             (an easter egg: EGGS.polaris in sky/sky.js)
    assets/sky/plank         each signpost sign, pointing RIGHT; the    464 x 88
                             place's name is written across it for
                             you, so keep the middle fairly plain.
    assets/sky/plank-here    the sign for the page you're on (optional) 464 x 88

THE CONSTELLATIONS (every page, at night). Each is a link to another website
or an easter egg; set them in CONSTELLATIONS near the top of sky/sky.js.
    assets/sky/constellation-<id>   its star picture, e.g.        600 x 360 (the same
                                    constellation-harp.png         shape as 150 x 90)
      transparent, stars light on dark; the name is written under it for you.
      The ids now: pleroma, wish, lantern, harp, kite, whale, key.

THE PLACE TABS (on the right edge of every page but the homepage)
    assets/ui/place-sea        a little picture of each place: a ship,       square,
    assets/ui/place-workshop   a paintbrush, a telescope, a record player    192 x 192
    assets/ui/place-city       (a new place gets a door until it has one:
    assets/ui/place-living      assets/ui/place-<its id>)

THINGS THAT FLY PAST (while you're looking at the sky: out of a window, up
through the telescope). they cross left to right, so draw them FACING RIGHT.
    assets/sky/blimp          a steampunk airship, by day (+ blimp-glow: its    920 x 460
                              lit gondola at dusk)
    assets/sky/birds          a little flock (a GIF can flap), by day          480 x 240
    assets/sky/balloon        a hot-air balloon, by day                        300 x 450
    assets/sky/shooting-star  a streak of light, at night; it's flown down     600 x 160
                              to the right, head at the right end
    Want more (a dragon, a kite, a paper crane)? Add a line to FLYERS near the
    top of sky/sky.js with its name, when it flies (day or night), how often,
    how fast, how big and how high, and put its picture at assets/sky/<name>.

CURSORS (every page; drawn stand-ins until yours are in)
    assets/ui/cursor            the everyday pointer                          32 x 32
    assets/ui/cursor-pointer    over anything you can click                   (64 x 64 at most;
    assets/ui/cursor-star       over the constellations and Polaris            bigger ones are
    assets/ui/cursor-grab       over things you can pick up (the traveller,    ignored by
                                the ship, a cork)                               browsers)
    assets/ui/cursor-grabbing   while you're holding one
    assets/ui/cursor-look       over things to look into (the pinboard, a window, the telescope)
    assets/ui/cursor-brush      over the "paint here" easel (hotspot: the brush tip, bottom left)
    -> PNG with a transparent background. The "hotspot" (the pixel that does the
       pointing) is set per cursor in CURSORS near the top of sky/sky.js: for the
       stand-ins, the arrow's tip is 3, 2 (from the top left), the star's middle 16, 16.

THE CONTROL PANEL (top right, every page: music, weather, the noise machine)
    assets/ui/panel           the button that opens it                     128 x 128
    assets/ui/music           each layer's little icon                      96 x 96
    assets/ui/weather
    assets/ui/noise
    assets/ui/effects         (the sound effects' volume)
    (a new layer added later gets assets/ui/<its id> the same way)

OTHER BUTTONS                                                              96 x 96
    assets/ui/letters         "letters", top left of the homepage
    assets/ui/leave-art       "leave some art", in the workshop

WEATHER (see the settings at the top of sky/weather.js)
    assets/sky/storm-cloud    the heavy grey clouds of rain and storms       800 x 360
    The fair-weather white clouds (assets/sky/cloud*) follow the weather: they
    drift by on "a few clouds" days, thin out in fog, and are gone when it's
    clear, overcast, raining or snowing, so the sky always matches the forecast.

SOUNDS (.mp3 or .ogg; each loops, so make its ends meet)
    Every sound below is made by the page itself until you add a recording.
    assets/sounds/rain        the weather's rain, and the noise machine's
    assets/sounds/wind        the wind of storms and snow, and the machine's
    assets/sounds/thunder     one roll of thunder (played now and then, not looped)
    assets/sounds/storm       the machine's thunderstorm
    assets/sounds/ocean       the machine's waves
    assets/sounds/fire        the machine's crackling fire
    assets/sounds/white, pink, brown   the machine's plain noise
    A new sound for the machine: add a line to SOUNDS at the top of
    sky/noise.js (a name and a label) and put assets/sounds/<name>.mp3 here.

SOUND EFFECTS (.mp3 or .ogg; played once, not looped; volume in the panel)
    Also made by the page itself until you add a recording.
    assets/sounds/cork-pop       a bottle uncorked
    assets/sounds/cork-in        a cork pushed back in
    assets/sounds/paper-unroll   a letter unrolled
    assets/sounds/paper-roll     a letter rolled up
    assets/sounds/throw          a bottle thrown (the whoosh)
    assets/sounds/splash         something landing in the sea. One recording
                                 does for all three: it's played higher for a
                                 bottle, a little lower for the traveller, and
                                 lowest and slowest for the ship.
    assets/sounds/surface        the traveller bobbing back up out of the water
    assets/sounds/climb-out      the traveller hauling out onto the dock or deck, dripping
    assets/sounds/land           feet landing on wooden boards (softer for a hop aboard)
    assets/sounds/twinkle        a constellation that's still a placeholder, clicked
    assets/sounds/wish           the shooting star from "make a wish"
    assets/sounds/brush          a brush dab in the workshop's painting desk
    assets/sounds/portfolio      a painting slipped into the visitors' portfolio

THE NOISE MACHINE (in the living space)
    assets/living/noise-machine      the machine, about 3:2
    assets/living/noise-machine-on   shown while it plays (a GIF can glow and hum)

THINGS THAT DANCE WHEN MUSIC PLAYS
    Each has a drawn stand-in that dances by itself. Put your picture in the
    slot and it joins in as a whole (a gentle bob, sway or hop); or add a
    -dancing twin (cat-dancing.gif) and that's shown instead while music plays.
    Every character can have one too: assets/characters/living-dancing.gif …
    assets/living/cat         on the armchair         assets/living/plant   by the crate
    assets/workshop/manikin   on the bench            assets/workshop/metronome
    assets/sea/crab           on the dock             assets/sea/gull       on the bollard
    assets/city/cat           on the chimney          assets/city/pigeon    (two, on the ledge)
    The living space's lamp and picture, and the workshop's lantern, sway along
    too (class="sways" or "wobbles" on anything in a room makes it join in).

THE SEA (the homepage)
----------------------
    assets/sea/wave-1 … wave-4   the four rows of waves, back to front.   e.g. 1200 x 800
                             each is a strip AS TALL AS THE SEA that
                             repeats left to right (make the edges
                             meet). transparent above the water.
                             wave-1's crests sit about a third of the
                             way down, wave-4's near the bottom.
    assets/sea/ship          the ship, facing RIGHT, keel about 90%    1200 x 1000
                             of the way down (+ ship-glow: its lamps)
    assets/sea/dock          the dock on the right, shown as tall as   e.g. 1200 x 800
                             the sea; its width follows your picture.
                             top of the deck 30% down from the top,
                             running off the right edge (the traveller
                             walks along that line). + dock-glow.
                             (the signpost's post is still drawn for you)
    assets/sea/letter-board  the notice board on the dock that holds the   720 x 860
                             letters once they're read (click it to read
                             them all); stands on the deck, feet at the bottom
    the bottle, three pieces on one 2000 x 900 canvas, so they line up:
    assets/sea/bottle          the glass, empty, lying on its side, neck to the RIGHT
    assets/sea/bottle-scroll   the rolled message inside it (slides out when opened)
    assets/sea/bottle-cork     the cork in the neck, around x 1770 y 450 (pulled out, spins away)
    (the same bottle is used for letters, for "leave a message" and in the crate)

THE CITY
--------
    assets/city/foreground   the rooftop the traveller stands on, a     3840 x 440
                             strip along the bottom (20% of the screen
                             tall, bottom-anchored; narrow screens trim
                             the sides). their feet stand 55% of the
                             way down it. + foreground-glow (string
                             lights, a lit skylight)
    assets/city/skyline-back, skyline-middle, skyline-front              3840 x 800
                             three rows of buildings, back to front,
                             transparent sky, bottom-anchored (narrow
                             screens show the middle). each dims at
                             night; its -glow twin is its lit windows.
    assets/city/skyline-front-windows.json
                             where the telescope can peek: the windows
                             on YOUR front row, as % of the picture
                             (across, down, and optionally width, height):
                                 { "windows": [ [12.5, 70], [30, 64, 1, 2], [71.2, 80] ] }
                             the scenes from content/city/ go in these,
                             one each. without the file, the telescope
                             spreads them along the middle of the row.
    assets/city/telescope    the icon on the telescope button          128 x 128

THE COUNTRYSIDE (what the workshop looks out on)
    assets/countryside/sheep          one sheep, facing RIGHT, feet at the bottom, about 3:2   (e.g. 360 x 240)
    assets/countryside/sheep-jumping  the same sheep mid-leap (optional)
      (the flock grazes on the near hill and hops the little fence one by one)
------------------------------------------------
    assets/countryside/hills-1 … hills-4                               3840 x 700
                             four rows of hills, back to front,
                             transparent sky, bottom-anchored; they
                             drift as you scroll (narrow screens show
                             the middle).
                             + -glow twins (a farmhouse window).

ROOMS (the workshop and the living space)
-----------------------------------------
    assets/workshop/wall     the wallpaper, filling the screen; the    3840 x 2160
    assets/living/wall       window is cut out of it for you
    assets/workshop/window   the window frame, drawn around clear      1000 x 800
    assets/living/window     glass; stretched to fit the window
    (the view out of the window: see WINDOW VIEWS below)

workshop                          living space
    assets/workshop/lantern           assets/living/lamp
    assets/workshop/shelf             assets/living/picture
    assets/workshop/tools             assets/living/armchair
    assets/workshop/bench             assets/living/bookshelf
    assets/workshop/easel             assets/living/rug
      (keep its canvas where the        assets/living/turntable
       drawn one is: 17%-83% across,    assets/living/turntable-playing
       6%-56% down; the painting          (shown while music plays; a GIF
       is laid on that spot)              can spin the record; with your own
    assets/living/frame
      (a picture frame on the wall,
       every one, 4:5, see-through in
       the middle; or frame-1, frame-2 …
       for each. the painting fills the
       middle 76%: set --inset on the
       frame in living.html to change it.
       no art? the frames are drawn:
       data-look gilt / wood / dark /
       white / plain, or your colours)
    assets/workshop/paint-easel
      (the "paint here" easel visitors
       paint on, 62:100 like the other)
    assets/workshop/portfolio
      (the visitors' portfolio by the
       bench, about 5:4; its count
       badge sits on the top right)
                                          turntable, the record sits on its
                                          platter at 40% across, 53% down,
                                          54% wide: move it with --platter-x,
                                          --platter-y, --platter-w on .turntable
                                          in living.html)
                                      assets/living/crate
                                        (the bottle crate, about 4:3;
                                         the bottle necks and the count
                                         sit on top of it by themselves)
                                      assets/living/letter-shelf
                                        (the little shelf under the board,
                                         about 200:24; the letters stand on it)
                                      assets/living/letter
                                        (one sheet of paper, portrait; the
                                         letters on the shelf are made of it)
                                      assets/living/pinboard
                                        (the board, 4:3; notes are pinned
                                         on the middle 88% of it)

CHARACTERS (one per scene; a GIF can loop an idle animation)
    assets/characters/sea         rides the ship, steps onto the dock at night,
                                  can be picked up, swims (the head shows when surfacing)
    assets/characters/workshop    stands at the bench
    assets/characters/living      at home by the armchair
    assets/characters/city        stargazing on the rooftop
    -> feet on the bottom edge, facing RIGHT, transparent background,
       about 240-480 px tall. The site sizes it; it's flipped when walking left.

    poses (optional, same folder, same name plus the pose):
    assets/characters/sea-held    shown while they're picked up: a GIF of them
                                  struggling, kicking, flailing ... Loops for as
                                  long as they're held. Without it, the normal
                                  picture just wiggles.
    assets/characters/sea-startled
                                  the double-take when the ship sails off
                                  without them (about 1.4 seconds, then they
                                  run and dive). Without it, the normal picture
                                  jumps and shivers.
    -> draw it on the SAME canvas size as the main picture, feet (or where the
       feet would be) near the bottom edge, so it doesn't jump when it swaps.

(the paintings, songs, window scenes, letters and bottles themselves are
 CONTENT, not assets: they go in content/, see content/README.txt)

WINDOW VIEWS (what you see outside, and what you step out into)
    assets/living/view            the living space's own scene
    assets/living/view-night      optional night version (cross-fades in)
    -> 1920 x 800 SVG or 3840 x 1600 PNG/WebP. Leave the sky TRANSPARENT
       so the real sky shows; horizon about 40% down. Bottom-anchored.
    (the workshop looks out on the countryside, which has its own slots above)

Adding a brand-new piece (a clock, a cat) is one line in the page:
    <img class="furnish" src="assets/workshop/clock.svg"
         style="left: 20%; top: 30%; width: 90px;">


HOW THE SITE KNOWS YOUR FILE IS THERE
-------------------------------------
Each art folder has a list.txt of its files, like the content folders, and
the same one-time setup keeps them up to date on every commit:
    git config core.hooksPath tools/hooks
(or run  sh tools/update-lists.sh  yourself). If you upload a picture
through the Forgejo website instead, the list won't know about it unless
Mel's server or Forgejo lets the site look (see content/README.txt): run
the script next time you're at your computer, or add the file's name to
that folder's list.txt by hand.


WHAT TO MAKE
------------
Pieces, not flat pictures. A room is built from separate files (wall art,
bench, lantern, shelf ...) so the site can:
  - rearrange them on phones
  - make lamps and candles glow as the sun goes down
  - keep the window see-through to the live sky

Put anything that should LIGHT UP at dusk (flame, lampshade, lit windows)
on its own layer called "glow", or save it as a second file ending in
-glow  (e.g. workshop-lantern.svg + workshop-lantern-glow.svg).


FORMATS (the server accepts: svg png webp gif jpg)
-------
1st choice  SVG     flat paper-cut shapes. Sharp at every size, tiny files,
                    and colours can shift with the time of day.
                    Free tool: Inkscape. Also Illustrator, Affinity, Figma.
                    Convert text to paths. Keep each file under ~300 KB.

2nd choice  PNG     painted or textured pieces, transparent background.
            or WebP Export at 2x the size it appears on a 1920-wide screen,
                    e.g. a lamp shown 150 px tall -> export 300 px tall.
                    A full-wall piece -> 3840 x 2160. WebP is smaller.

GIF                 small looping animations (a flickering candle).
JPG                 only for full-screen photos (no transparency).


DIMENSIONS CHEAT SHEET (as it appears on a 1920 x 1080 screen -> export size)
----------------------
full wall / backdrop          1920 x 1080   ->  SVG, or PNG/WebP 3840 x 2160
window view (a custom frame)  ~600 x 500    ->  SVG, or PNG 1200 x 1000
big furniture (bench, bed)    ~1600 x 320   ->  SVG, or PNG 3200 x 640
medium (chair, shelf, desk)   ~300-600 wide ->  SVG, or PNG at 2x
small (lamp, jar, tool, book) ~40-200 tall  ->  SVG, or PNG at 2x
member button                 88 x 31       ->  PNG or GIF, exactly 88 x 31


NAMING
------
Slots use the exact names above: the folder says where, the name says
what (assets/sea/ship.png, assets/sky/sun-glow.svg). lowercase, dashes.
New pieces of your own can be called anything.


DON'T HAVE ANY OF THAT?
-----------------------
Send whatever you've got: a pencil sketch, an ink drawing, a phone photo
of something on paper, a screenshot, a rough doodle with notes. For
drawings: dark lines on white paper, flat even light, straight on.
Silhouettes and clean line art can be traced into SVG, cut out from the
background, recoloured to the palette and split into pieces.

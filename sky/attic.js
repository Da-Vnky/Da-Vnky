/* =====================================================================
   attic.js — the attic, above the hallway (living.html).

   THE WAY UP: in the hallway a cord hangs from the hatch in the ceiling, a light
   either side of it. Pull the cord down and the hatch swings open and a ladder
   slides down (open for the rest of the reset: run:hall-hatch).
   IN RESET 4 (only) there's no cord: the hatch has the hanging lamp under it
   instead, the hint that the attic's the place to look this time. Grab the lamp
   and pull it down, hard: it stretches on its cable… and comes away, drops and
   smashes on the floor, the hallway goes dim, the hatch creaks open and the ladder
   slides down. Broken for the rest of the reset (run:hall-lamp). LAMP_RESETS says
   which resets have the lamp. Click the ladder to climb up; the square hole in the
   attic floor (bottom right) goes back down.

   THE GRIMOIRE (reset 4: DEATHS.grimoire in sky/state.js): a black book on a
   lectern. Before it opens the traveller says how wrong it feels, and it opens with
   a horrible sound (sky/books.js: VIBES, QUIET). Open it, the first time: a ritual on
   the left page, and on the right a place to sign in your own blood (the pointer's a
   pricked finger; the ink runs red). "make the pact" and the book slams shut, rises in
   front of the traveller, something answers, they scream, and hands come up through
   the floor and drag them down. A death like any other (sky/gore.js respawn), and it
   happens once: after that (run:grimoire-pact) the grimoire is just a book of your
   pages (content/books/grimoire/, sky/books.js), a quieter sound as it opens, and the
   ritual page is gone. From reset 5 it's on the living-room bookshelf instead.

   slots (assets/living/): hall-cord, hall-light, hall-hatch, hall-hatch-open, attic-ladder, hall-lamp-broken, attic-wall,
          attic-floor, attic-window, attic-clutter, attic-lectern, attic-hole,
          grimoire, grimoire-open, grimoire-ritual, pact-hand;
          assets/characters/attic (+ attic-walking); assets/ui/cursor-blood
   sounds: cord, hatch, lamp-creak, lamp-snap, glass, ladder, quill, book-slam, pact, hands (stand-ins till then),
           and assets/sounds/grimoire (loops while the book's open; a drawn drone till then)
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    var body = document.body, hall = document.querySelector('.hallway'), attic = document.querySelector('.attic');
    if (!Sky || !hall || !attic || Sky.attic) return;
    var ladder = hall.querySelector('.hall-ladder'), cord = hall.querySelector('.hall-cord');
    var LAMP_RESETS = [4];                                 // the resets with the lamp that comes away (any other: the cord)
    var LAMP = !!S && LAMP_RESETS.indexOf(S.reset) !== -1;
    var CORD_PULL = 0.16;                                  // how far (a share of the cord's length) it's pulled before the hatch gives
    var hallMe = hall.querySelector('.character'), me = attic.querySelector('.attic-character');
    var hole = attic.querySelector('.attic-hole'), book = attic.querySelector('.attic-grimoire');
    var TUG = 0.42;                                        // how far (a share of the lamp's height) it stretches before it comes away
    var STAND = 30;                                        // where the traveller stands up here (% across)
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }
    function say(t, ms) { if (Sky.inventory && Sky.inventory.say) Sky.inventory.say(t, ms || 2600); }
    function get(k) { return S ? S.get(k) : null; }
    function set(k, v) { if (S) S.set(k, v); }

    var BLOOD_CURSOR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M4 30 Q2 22 6 16 L14 6 Q17 3 19.5 5 Q21.5 7 19 10.5 L12 20 Q10 26 4 30 Z" fill="#e8c4a4" stroke="#3a2716" stroke-width="1.2"/>' +
        '<path d="M16.5 6.5 Q19 5 20 7" stroke="#b08868" stroke-width="1" fill="none"/><circle cx="19.2" cy="6.8" r="2.2" fill="#8a0a0e"/><path d="M19.4 8.6 Q20.4 12 19.2 13.6 Q18 12 19.4 8.6 Z" fill="#8a0a0e"/></svg>');

    Sky.css(
        // the lamp you can pull, the hatch, the ladder, the mess
        // the cord and its two lights (any reset but 4), or the lamp (reset 4)
        '.hallway .hall-cord, .hallway .hall-light { display: none; }' +
        'body.hall-cord-on .hallway .hall-cord, body.hall-cord-on .hallway .hall-light { display: block; }' +
        'body.hall-cord-on .hallway .hall-lamp { display: none; }' +
        '.hallway .hall-cord { z-index: 2; cursor: grab; touch-action: none; }' +
        '.hallway .hall-cord > svg, .hallway .hall-cord > .art { display: block; width: 100%; height: 100%; object-fit: contain; object-position: 50% 0; pointer-events: none; }' +
        '.hallway .hall-cord.pulling { cursor: grabbing; animation: none !important; transform-origin: 50% 0; }' +
        '.hallway .hall-cord .hc-hint { position: absolute; left: 50%; bottom: -1.6em; transform: translateX(-50%); white-space: nowrap; font: italic .95rem "IM Fell English", Georgia, serif;' +
            'color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.9); opacity: 0; transition: opacity .2s; pointer-events: none; }' +
        '.hallway .hall-cord:hover .hc-hint, .hallway .hall-cord:focus-visible .hc-hint { opacity: 1; }' +
        'body.ladder-down .hallway .hall-cord .hc-hint { display: none; }' +
        '.hallway .hall-cord:focus-visible { outline: none; filter: drop-shadow(0 0 5px rgba(255,220,150,.7)); }' +
        'body.hatch-open .hallway .hall-hatch:not(.open-art) { filter: brightness(.35); }' +
        '.hallway .hall-lamp { cursor: grab; touch-action: none; }' +
        '.hallway .hall-lamp.pulling { cursor: grabbing; animation: none !important; transition: none; transform-origin: 50% 0; }' +
        'body.lamp-down .hallway .hall-lamp { display: none; }' +
        '.hallway .hall-hatch { left: 44.5%; top: 0; width: 11%; height: 2.6vh; z-index: 1; }' +
        '.hallway .hall-hatch > .art { width: 100%; height: 100%; object-fit: fill; }' +
        '.hallway .hall-ladder { left: 47.2%; top: 0; width: 5.6%; min-width: 40px; height: calc(100% - var(--floor-h) + 8px); padding: 0; border: 0; background: none; cursor: pointer; z-index: 1;' +
            'transform: translateY(-101%); visibility: hidden; transition: transform 1.3s cubic-bezier(.5,0,.3,1.15), visibility 0s 1.3s; }' +
        '.hallway .hall-ladder > svg, .hallway .hall-ladder > .art { display: block; width: 100%; height: 100%; object-fit: fill; }' +
        'body.ladder-down .hallway .hall-ladder { transform: none; visibility: visible; transition: transform 1.3s cubic-bezier(.5,0,.3,1.15), visibility 0s; }' +
        'body.hall-still .hallway .hall-ladder { transition: none !important; }' +
        '.hallway .hall-ladder:hover, .hallway .hall-ladder:focus-visible { outline: none; filter: drop-shadow(0 0 6px rgba(255,220,150,.6)); }' +
        '.hall-ladder .hl-hint, .attic-grimoire .ag-hint, .attic-hole .ah-hint { position: absolute; left: 50%; bottom: 20%; transform: translateX(-50%); white-space: nowrap; font: italic .95rem "IM Fell English", Georgia, serif;' +
            'color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.9); opacity: 0; transition: opacity .2s; pointer-events: none; }' +
        '.attic-grimoire .ag-hint { bottom: 110%; } .attic-hole .ah-hint { bottom: 105%; }' +
        '.hall-ladder:hover .hl-hint, .attic-grimoire:hover .ag-hint, .attic-hole:hover .ah-hint { opacity: 1; }' +
        '.hallway .hall-lamp-broken { left: 42%; bottom: calc(var(--floor-h) - 2.2vh); width: 12%; display: none; pointer-events: none; }' +
        'body.lamp-down .hallway .hall-lamp-broken { display: block; }' +
        // with the lamp gone it's dark in the hallway: only what comes down through the hatch
        '.hallway .hall-dark { position: absolute; inset: 0; z-index: 3; pointer-events: none; opacity: 0; transition: opacity 1.2s;' +
            'background: radial-gradient(ellipse 22% 60% at 50% 0%, rgba(0,0,0,0), rgba(4,3,2,.55) 70%, rgba(4,3,2,.72)); }' +
        'body.lamp-down .hallway .hall-dark { opacity: 1; }' +
        '.glass-bit { position: fixed; z-index: 6; width: 5px; height: 7px; background: rgba(240,236,220,.85); clip-path: polygon(0 0, 100% 30%, 40% 100%); pointer-events: none; }' +
        // the traveller going up and down the ladder
        '.character.up-ladder { animation: at-up .9s ease-in forwards; } @keyframes at-up { to { translate: 0 -60%; opacity: 0; } }' +
        '.character.down-ladder { animation: at-down .9s ease-out both; } @keyframes at-down { from { translate: 0 -60%; opacity: 0; } to { translate: 0 0; opacity: 1; } }' +
        '.character.into-hole { animation: at-sink .8s ease-in forwards; } @keyframes at-sink { to { translate: 0 70%; clip-path: inset(0 0 70% 0); } }' +
        '.character.out-of-hole { animation: at-rise .8s ease-out both; } @keyframes at-rise { from { translate: 0 70%; clip-path: inset(0 0 70% 0); } to { translate: 0 0; clip-path: inset(0 0 0 0); } }' +

        // the attic
        '.attic { position: fixed; inset: 0; z-index: 3; overflow: hidden; transform: translateY(-100%); visibility: hidden; --floor-h: 12vh; background: #1d150f; }' +
        '.attic > .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }' +
        '.attic > .attic-roof { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; }' +
        '.attic:has(> .art) > .attic-roof { display: none; }' +
        'body.in-attic .attic, body.attic-panning .attic { visibility: visible; transition: transform .9s cubic-bezier(.55,0,.25,1), visibility 0s; }' +
        'body.in-attic .attic { transform: none; }' +
        'body.in-hall .hallway { transition: transform .9s cubic-bezier(.55,0,.25,1), translate .9s cubic-bezier(.55,0,.25,1), visibility 0s; }' +
        'body.in-attic .hallway { translate: 0 100%; }' +
        'body.attic-now .attic, body.attic-now .hallway { transition: none !important; }' +
        '.attic .furnish { position: absolute; z-index: 2; }' +
        '.attic .room-floor { position: absolute; left: 0; right: 0; bottom: 0; height: var(--floor-h); z-index: 1; pointer-events: none; }' +
        '.attic .room-floor .placeholder, .attic .room-floor > .art { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: fill; }' +
        '.attic .room-floor .placeholder { border-top: 8px solid #1a120c; background: repeating-linear-gradient(90deg, #3a2a1e 0 88px, #2e2118 88px 91px), #3a2a1e; box-shadow: inset 0 14px 20px rgba(0,0,0,.5); }' +
        '.attic .attic-window { left: 46%; top: 11%; width: 8%; min-width: 60px; }' +
        '.attic .attic-beam { position: absolute; z-index: 1; left: 42%; top: 20%; width: 26%; height: 80%; pointer-events: none; mix-blend-mode: screen;' +
            'background: linear-gradient(172deg, rgba(190,205,255,.14), rgba(190,205,255,0) 85%); clip-path: polygon(24% 0, 40% 0, 100% 100%, 30% 100%); }' +
        '.attic .attic-clutter { left: 3%; bottom: calc(var(--floor-h) - 1.4vh); width: 32%; min-width: 220px; }' +
        '.attic .attic-lectern { left: 60%; bottom: calc(var(--floor-h) - 1.2vh); height: 26vh; aspect-ratio: 80 / 150; }' +
        '.attic .attic-grimoire { left: calc(60% - 1.6vh); bottom: calc(var(--floor-h) - 1.2vh + 26vh * .63); width: 17vh; aspect-ratio: 90 / 40; padding: 0; border: 0; background: none; cursor: pointer; display: none; z-index: 3;' +
            'filter: drop-shadow(0 0 4px rgba(140,10,10,.5)); animation: at-pulse 4s ease-in-out infinite; }' +
        '.attic.has-grimoire .attic-grimoire { display: block; }' +
        '.attic .attic-grimoire > svg, .attic .attic-grimoire > .art { display: block; width: 100%; height: 100%; object-fit: contain; }' +
        '@keyframes at-pulse { 0%, 100% { filter: drop-shadow(0 0 3px rgba(140,10,10,.4)); } 50% { filter: drop-shadow(0 0 9px rgba(200,20,20,.7)); } }' +
        '.attic .attic-hole { right: 3%; bottom: .6vh; width: 15%; min-width: 110px; height: calc(var(--floor-h) * .82); z-index: 3; cursor: pointer; padding: 0; background: none !important; }' +
        '.attic .attic-hole > svg, .attic .attic-hole > .art { display: block; width: 100%; height: 100%; object-fit: fill; }' +
        '.attic .attic-hole:hover, .attic .attic-hole:focus-visible { outline: none; filter: drop-shadow(0 0 6px rgba(255,220,150,.45)); }' +
        '.attic .attic-character { left: ' + STAND + '%; bottom: 3vh; height: 25vh; z-index: 4; }' +
        '@media (max-width: 620px) { .attic .attic-character { height: 14vh; } .attic .attic-lectern { left: 56%; height: 18vh; } .attic .attic-grimoire { left: calc(56% - 1.2vh); bottom: calc(var(--floor-h) - 1.2vh + 18vh * .63); width: 12vh; }' +
            '.attic .attic-clutter { width: 46%; min-width: 0; } .hallway .hall-ladder { left: 44%; width: 9%; } .hallway .hall-cord { left: 55.5%; } }' +

        // the grimoire, open
        '.grim-view { position: fixed; inset: 0; z-index: 9; display: grid; place-items: center; padding: 20px 12px; background: radial-gradient(ellipse at 50% 45%, rgba(40,4,4,.86), rgba(4,1,1,.96) 75%);' +
            'visibility: hidden; opacity: 0; transition: opacity .5s, visibility 0s .5s; font-family: "IM Fell English", Georgia, serif; perspective: 2200px; }' +
        '.grim-view.open { visibility: visible; opacity: 1; transition: opacity .5s; }' +
        '.grim-book { position: relative; width: min(94vw, 124vh); aspect-ratio: 1.46; display: grid; grid-template-columns: 1fr 1fr; padding: 2.2% 2.6%; border-radius: 8px;' +
            'background: var(--grim-art, linear-gradient(90deg, #120a0a, #241212 49.5%, #0a0606 50%, #241212 50.5%, #120a0a)); box-shadow: 0 30px 80px rgba(0,0,0,.8), inset 0 0 0 3px rgba(120,20,20,.35); transform-style: preserve-3d; }' +
        '.grim-page { position: relative; padding: 7% 8%; color: #2a1008; overflow: hidden; background: linear-gradient(90deg, #cdb88e, #e6d5ae 12%, #eadbb6 70%, #d6c296); box-shadow: inset 0 0 40px rgba(90,40,10,.35); }' +
        '.grim-view.has-art .grim-page { background: none; box-shadow: none; }' +
        '.grim-page.left { border-radius: 4px 0 0 4px; box-shadow: inset -18px 0 24px -14px rgba(40,10,0,.55), inset 0 0 40px rgba(90,40,10,.35); }' +
        '.grim-page.right { border-radius: 0 4px 4px 0; transform-origin: 0 50%; box-shadow: inset 18px 0 24px -14px rgba(40,10,0,.55), inset 0 0 40px rgba(90,40,10,.35); backface-visibility: hidden; }' +
        '.grim-page h3 { margin: 0 0 .4em; font: normal clamp(1rem, 2.3vh, 1.6rem) "IM Fell English SC", Georgia, serif; color: #6a0808; text-align: center; letter-spacing: .04em; }' +
        '.grim-page p { margin: 0 0 .7em; font-size: clamp(.8rem, 1.75vh, 1.12rem); line-height: 1.45; font-style: italic; }' +
        '.grim-page .gr-ritual { position: absolute; inset: 0; } .grim-page .gr-ritual > img { width: 100%; height: 100%; object-fit: contain; }' +
        '.grim-page .gr-sigil { display: block; width: 46%; margin: .4em auto .8em; opacity: .85; }' +
        '.grim-page .gr-sign { position: relative; margin: 6% 0 4%; height: 42%; border-bottom: 1.5px solid rgba(60,20,10,.6); cursor: url("' + BLOOD_CURSOR + '") 19 7, crosshair; touch-action: none; }' +
        '.grim-page .gr-sign canvas { position: absolute; inset: 0; width: 100%; height: 100%; }' +
        '.grim-page .gr-sign::after { content: "✕"; position: absolute; left: 2%; bottom: 4px; color: rgba(90,20,10,.6); font-size: 1.1rem; pointer-events: none; }' +
        '.grim-page .gr-acts { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }' +
        '.grim-page button { padding: 8px 18px; border-radius: 999px; border: 1px solid #5a0a0a; background: rgba(90,10,10,.12); color: #5a0a0a; cursor: pointer; font: italic 1rem "IM Fell English", Georgia, serif; }' +
        '.grim-page button.gr-pact { background: #5a0a0a; color: #f3e6c2; }' +
        '.grim-page button.gr-pact:disabled { opacity: .35; cursor: default; }' +
        '.grim-view.slam .grim-page.right { animation: gr-slam .42s cubic-bezier(.6,0,.9,.4) forwards; }' +
        '@keyframes gr-slam { to { transform: rotateY(-178deg); } }' +
        '.grim-view.slam .grim-book { animation: gr-thud .5s .38s ease-out; } @keyframes gr-thud { 30% { transform: scale(.97) translateY(6px); } }' +
        // the pact: the book rises in front of them, the hands come up through the floor
        '.pact-book { position: fixed; z-index: 8; pointer-events: none; filter: drop-shadow(0 0 14px rgba(255,30,20,.8)); }' +
        '.pact-book > svg, .pact-book > img { display: block; width: 100%; height: auto; }' +
        '.pact-dark { position: fixed; inset: 0; z-index: 7; pointer-events: none; opacity: 0; transition: opacity 1.4s;' +
            'background: radial-gradient(ellipse at 50% 70%, rgba(120,0,0,.15), rgba(10,0,0,.82) 70%); }' +
        '.pact-dark.on { opacity: 1; }' +
        '.pact-floor { position: fixed; left: 0; right: 0; top: 0; z-index: 8; overflow: hidden; pointer-events: none; }' +        // (the hands show only above the floorboards)
        '.pact-hand { position: absolute; aspect-ratio: 50 / 110; pointer-events: none; transform-origin: 50% 100%; }' +
        '.attic.pact .attic-grimoire { visibility: hidden; }' +
        '.pact-hand > svg, .pact-hand > img { display: block; width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; }' +
        '.character.dragged-down { animation: pact-down 1.5s cubic-bezier(.5,0,.8,.5) forwards; } @keyframes pact-down { 0% { translate: 0 0; clip-path: inset(0 0 0 0); } 12% { translate: 0 -3%; clip-path: inset(0 0 0 0); } 100% { translate: 0 105%; clip-path: inset(0 0 105% 0); } }' +
        '.character.writhing { animation: pact-writhe .12s linear infinite; } @keyframes pact-writhe { 0% { rotate: -3deg; } 50% { rotate: 3deg; } 100% { rotate: -3deg; } }' +
        '@media (prefers-reduced-motion: reduce) { .character.writhing { animation: none; } }'
    );

    var dark = document.createElement('div');
    dark.className = 'hall-dark';
    hall.appendChild(dark);

    /* ---------------- the cord or the lamp, the hatch, the ladder ---------------- */
    function broken() { return get('hall-lamp') === 'broken'; }
    function hatchOpen() { return LAMP ? broken() : get('hall-hatch') === 'open'; }
    if (!LAMP) body.classList.add('hall-cord-on');
    // as the page opens: already down if it's open, without sliding (hall-still: no sliding for a moment)
    body.classList.add('hall-still');
    if (hatchOpen()) { body.classList.add('ladder-down', 'hatch-open'); if (LAMP) body.classList.add('lamp-down'); }
    setTimeout(function () { requestAnimationFrame(function () { body.classList.remove('hall-still'); }); }, 300);
    // the hatch, open: your picture of it open (hall-hatch-open), or the shut one gone dark
    var openArt = null;
    Sky.findAsset('assets/living/hall-hatch-open', function (u) { openArt = u || null; if (hatchOpen()) showOpenHatch(); });
    function showOpenHatch() {
        body.classList.add('hatch-open');
        var h = hall.querySelector('.hall-hatch');
        if (!openArt || !h) return;
        if (h.tagName.toLowerCase() !== 'img') { var im = document.createElement('img'); im.className = h.getAttribute('class'); im.alt = ''; h.replaceWith(im); h = im; }
        h.src = openArt;
        h.classList.add('open-art');
    }
    function ladderDown() { sfx('ladder', { or: 'wall-slide' }); body.classList.add('ladder-down'); }
    var pull = null;
    function busy() { return (Sky.sides && Sky.sides.busy) || climbing; }
    function lampOf(e) { return e.target.closest && e.target.closest('.hall-lamp'); }       // (a picture of yours takes the drawn lamp's place, so it's looked for each time)
    hall.addEventListener('pointerdown', function (e) {
        var lamp = lampOf(e);
        if (!lamp || !LAMP || broken() || busy() || body.classList.contains('inv-holding') || e.button > 0) return;
        e.preventDefault();
        try { lamp.setPointerCapture(e.pointerId); } catch (x) {}
        var r = lamp.getBoundingClientRect();
        pull = { el: lamp, x: e.clientX, y: e.clientY, h: r.height || 150, creak: 0 };
        lamp.classList.add('pulling');
        lamp.style.transition = 'none';
    });
    hall.addEventListener('pointermove', function (e) {
        if (!pull) return;
        var lamp = pull.el;
        var dy = Math.max(0, e.clientY - pull.y), dx = e.clientX - pull.x;
        var stretch = Math.pow(dy / pull.h, 0.85) * 0.55;                   // (it gives, grudgingly)
        var ang = Math.max(-28, Math.min(28, -dx * 0.18));
        lamp.style.transform = 'rotate(' + ang.toFixed(1) + 'deg) scaleY(' + (1 + stretch).toFixed(3) + ')';
        if (stretch > pull.creak + 0.1) { pull.creak = stretch; sfx('lamp-creak', { or: 'tap', size: 0.3 + stretch }); }
        if (stretch >= TUG) snap(ang);
    });
    function letGo() {
        if (!pull) return;
        var lamp = pull.el;
        pull = null;
        lamp.classList.remove('pulling');
        lamp.style.transition = 'transform .7s cubic-bezier(.3,1.9,.5,1)';                      // back up it springs, swinging
        lamp.style.transform = '';
        setTimeout(function () { lamp.style.transition = ''; }, 720);
    }
    hall.addEventListener('pointerup', letGo);
    hall.addEventListener('pointercancel', letGo);

    // the cord: pull it down (or just click it) and the hatch gives
    var tug = null;
    function cordBack(el) {
        el.classList.remove('pulling');
        el.style.transition = 'transform .6s cubic-bezier(.3,1.8,.5,1)';                         // up it springs
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 620);
    }
    function openHatch() {
        set('hall-hatch', 'open');
        sfx('hatch', { or: 'door', size: 0.6 });
        showOpenHatch();
        say('the hatch swings open…', 2200);
        setTimeout(ladderDown, 450);
    }
    if (cord && !LAMP) {
        cord.addEventListener('pointerdown', function (e) {
            if (busy() || body.classList.contains('inv-holding') || e.button > 0) return;
            e.preventDefault();
            try { cord.setPointerCapture(e.pointerId); } catch (x) {}
            tug = { y: e.clientY, h: cord.getBoundingClientRect().height || 200, far: 0, done: false };
            cord.classList.add('pulling');
            cord.style.transition = 'none';
        });
        cord.addEventListener('pointermove', function (e) {
            if (!tug || tug.done) return;
            var dy = Math.max(0, e.clientY - tug.y);
            tug.far = Math.max(tug.far, dy);
            var k = Math.min(dy / tug.h, CORD_PULL * 1.15);
            cord.style.transform = 'scaleY(' + (1 + k).toFixed(3) + ')';
            if (k >= CORD_PULL) {
                tug.done = true;
                sfx('cord', { or: 'tap', size: 0.25 });
                if (!hatchOpen()) openHatch();
            }
        });
        var cordUp = function () {
            if (!tug) return;
            var t = tug; tug = null;
            if (!t.done && t.far < 6) { clickCord(); return; }            // (just a click: a tug of its own)
            cordBack(cord);
        };
        cord.addEventListener('pointerup', cordUp);
        cord.addEventListener('pointercancel', cordUp);
        cord.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickCord(); } });
    }
    function clickCord() {
        cord.classList.add('pulling');
        cord.style.transition = 'transform .16s ease-in';
        cord.style.transform = 'scaleY(' + (1 + CORD_PULL) + ')';
        sfx('cord', { or: 'tap', size: 0.25 });
        setTimeout(function () {
            if (!hatchOpen()) openHatch(); else say('it\u2019s open already.', 1400);
            cordBack(cord);
        }, 170);
    }
    function snap(ang) {
        var lamp = pull.el;
        pull = null;
        set('hall-lamp', 'broken');
        sfx('lamp-snap', { or: 'crack' });
        var r = lamp.getBoundingClientRect(), floorY = hall.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(hall).getPropertyValue('--floor-h')) || 11) / 100 * window.innerHeight;
        lamp.classList.remove('pulling');
        lamp.style.transformOrigin = '50% 60%';
        var drop = Math.max(40, floorY - r.bottom + r.height * 0.15);
        lamp.animate([{ transform: 'rotate(' + ang + 'deg) scaleY(1.2)' }, { transform: 'translateY(' + drop.toFixed(0) + 'px) rotate(' + (ang * 2 + (Math.random() < 0.5 ? -70 : 70)) + 'deg)' }],
            { duration: 560, easing: 'cubic-bezier(.5,0,1,1)', fill: 'forwards' }).onfinish = function () {
            sfx('glass', { or: 'shatter' });
            var cx = r.left + r.width / 2;
            for (var i = 0; i < 16; i++) {
                var g = document.createElement('div');
                g.className = 'glass-bit';
                g.style.left = cx + 'px'; g.style.top = floorY + 'px';
                body.appendChild(g);
                var a = -Math.PI * Math.random(), sp = 40 + Math.random() * 120;
                g.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * sp) + 'px,' + (Math.sin(a) * sp * 0.5 + 18) + 'px) rotate(' + (Math.random() * 500) + 'deg)', opacity: 0 }],
                    { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' }).onfinish = (function (q) { return function () { q.remove(); }; })(g);
            }
            lamp.getAnimations().forEach(function (an) { an.cancel(); });
            lamp.style.transform = ''; lamp.style.transformOrigin = '';
            body.classList.add('lamp-down');
            showOpenHatch();
            say('it came away in your hand… and something creaked open, up above.', 3400);
            setTimeout(ladderDown, 1100);
        };
    }

    /* ---------------- up the ladder, down the hole ---------------- */
    var climbing = false, up = false;
    function pctOf(el, host) { var r = el.getBoundingClientRect(), hr = host.getBoundingClientRect(); return (r.left + r.width / 2 - hr.left) / (hr.width || window.innerWidth) * 100; }
    function standAt(ch, x) { return x - (ch.offsetWidth / 2) / (ch.parentNode.clientWidth || window.innerWidth) * 100; }
    function walk(ch, x, done) { if (Sky.sides && Sky.sides.walk) Sky.sides.walk(ch, x, done); else { ch.style.left = x + '%'; if (done) setTimeout(done, 300); } }
    function place(ch, x, left) { if (Sky.sides && Sky.sides.place) Sky.sides.place(ch, x, left); else ch.style.left = x + '%'; }
    function climbUp() {
        if (climbing || up || !body.classList.contains('in-hall') || (Sky.sides && Sky.sides.busy)) return;
        climbing = true;
        var go = function () {
            if (hallMe) { hallMe.classList.remove('face-left'); hallMe.classList.add('up-ladder'); }
            var n = 0, steps = setInterval(function () { sfx('step', { size: 0.35 }); if (++n > 3) clearInterval(steps); }, 220);
            setTimeout(function () { openAttic(false); }, 750);
        };
        if (hallMe) walk(hallMe, standAt(hallMe, pctOf(ladder, hall)), go); else go();
    }
    function openAttic(now) {
        up = true;
        if (now) body.classList.add('attic-now');
        body.classList.add('in-attic');
        if (!now) body.classList.add('attic-panning');
        attic.setAttribute('aria-hidden', 'false');
        try { history.replaceState(null, '', '#attic'); } catch (e) {}
        if (Sky.fillAssets) Sky.fillAssets(attic);
        var holeX = standAt(me, pctOf(hole, attic));
        if (now) {
            place(me, STAND);
            setTimeout(function () { body.classList.remove('attic-now'); climbing = false; }, 60);
            if (hallMe) hallMe.classList.remove('up-ladder');
            return;
        }
        place(me, holeX, true);
        me.classList.add('out-of-hole');
        setTimeout(function () {
            body.classList.remove('attic-panning');
            if (hallMe) hallMe.classList.remove('up-ladder');
            me.classList.remove('out-of-hole');
            walk(me, STAND, function () { me.classList.remove('face-left'); climbing = false; });
        }, 950);
    }
    function climbDown(now) {
        if (!up || (climbing && !now)) return;
        var shut = function () {
            up = false;
            if (now) body.classList.add('attic-now');
            body.classList.remove('in-attic');
            if (!now) body.classList.add('attic-panning');
            attic.setAttribute('aria-hidden', 'true');
            me.classList.remove('into-hole');
            closeBook(true);
            try { history.replaceState(null, '', body.classList.contains('in-hall') ? '#hallway' : location.pathname + location.search); } catch (e) {}
            if (now) { setTimeout(function () { body.classList.remove('attic-now'); climbing = false; }, 60); return; }
            if (hallMe) { place(hallMe, standAt(hallMe, pctOf(ladder, hall))); hallMe.classList.add('down-ladder'); }
            setTimeout(function () { body.classList.remove('attic-panning'); if (hallMe) hallMe.classList.remove('down-ladder'); climbing = false; }, 950);
        };
        if (now) { shut(); return; }
        climbing = true;
        walk(me, standAt(me, pctOf(hole, attic)), function () {
            me.classList.add('into-hole');
            sfx('step', { size: 0.35 });
            setTimeout(shut, 650);
        });
    }
    if (ladder) ladder.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); climbUp(); });
    if (hole) hole.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); climbDown(false); });
    document.addEventListener('keydown', function (e) {                    // (Escape up here: back down the hole, not all the way home)
        if (e.key !== 'Escape' || !up) return;
        if (body.classList.contains('inv-holding')) return;
        e.stopImmediatePropagation();
        if (grim.classList.contains('open')) closeBook(); else climbDown(false);
    }, true);
    // off out of the hallway some other way (the place tabs): the attic's shut behind them
    (function hookSides(n) {
        if (Sky.sides && Sky.sides.on) Sky.sides.on(function (what, name) { if (name === 'hall' && what === 'leave' && up) climbDown(true); });
        else if (n < 40) setTimeout(function () { hookSides(n + 1); }, 150);
    })(0);
    // living.html#attic: start up there (the debug page's preview)
    if (location.hash === '#attic') setTimeout(function () { if (Sky.sides && Sky.sides.goNow) Sky.sides.goNow('hall'); setTimeout(function () { openAttic(true); }, 80); }, 120);

    /* ---------------- the grimoire ---------------- */
    var hasBook = !!S && S.live('grimoire');
    if (hasBook) attic.classList.add('has-grimoire');
    function pactMade() { return get('grimoire-pact') === '1'; }             // (once a reset: after that it's only a book)
    var FIRST_LOOK = 'Okay. I\u2019ve got a really, really bad feeling about this book.';
    var SIGIL = '<svg class="gr-sigil" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#6a0808" stroke-width="1.4">' +
        '<circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="38"/>' +
        '<path d="' + (function () { var d = ''; for (var i = 0; i < 7; i++) { var a = -Math.PI / 2 + i * 4 * Math.PI / 7; d += (i ? 'L' : 'M') + (50 + 38 * Math.cos(a)).toFixed(1) + ' ' + (50 + 38 * Math.sin(a)).toFixed(1); } return d + 'Z'; })() + '"/>' +
        '<circle cx="50" cy="50" r="9"/><path d="M50 41 V59 M41 50 H59"/></g></svg>';
    var grim = document.createElement('div');
    grim.className = 'grim-view';
    grim.setAttribute('role', 'dialog');
    grim.setAttribute('aria-label', 'the grimoire');
    grim.innerHTML = '<div class="grim-book"><div class="grim-page left"><h3>Of the Covenant</h3>' + SIGIL +
        '<p>Here beginneth the covenant of the Seventh Sphere, whereby one who would be free of the wheel may pass beyond the Archons that keep it.</p>' +
        '<p>Let the seeker give what is theirs alone: their name, written in their own blood upon this page. So shall the one who made the wheel know them, and they shall be known.</p>' +
        '<p>And what is written here cannot be unwritten.</p><div class="gr-ritual"></div></div>' +
        '<div class="grim-page right"><h3>Sign, in thine own blood</h3><div class="gr-sign"><canvas></canvas></div>' +
        '<div class="gr-acts"><button type="button" class="gr-pact" disabled>make the pact</button><button type="button" class="gr-shut">close the book</button></div></div></div>';
    body.appendChild(grim);
    Sky.findAsset('assets/living/grimoire-open', function (u) { if (u) { grim.querySelector('.grim-book').style.setProperty('--grim-art', 'url("' + new URL(u, location.href).href + '") center / 100% 100% no-repeat'); grim.classList.add('has-art'); } });
    Sky.findAsset('assets/living/grimoire-ritual', function (u) {             // your ritual page takes the left page's place
        if (!u) return;
        var left = grim.querySelector('.grim-page.left');
        left.querySelectorAll(':scope > :not(.gr-ritual)').forEach(function (n) { n.remove(); });
        left.querySelector('.gr-ritual').innerHTML = '<img alt="" src="' + u + '">';
    });
    Sky.findAsset('assets/ui/cursor-blood', function (u) { if (u) grim.querySelector('.gr-sign').style.cursor = 'url("' + u + '") 19 7, crosshair'; });
    var drone = null;
    function hum(on) {
        if (!drone && Sky.sounds && Sky.sounds.channel) drone = Sky.sounds.channel('grimoire');
        if (drone) drone.set(on ? on : 0, on ? 1.2 : 0.8);
        if (Sky.music && Sky.music.hush) Sky.music.hush(!!on);
    }

    // signing: the pointer draws in blood
    var pad = grim.querySelector('.gr-sign'), cv = pad.querySelector('canvas'), cx = cv.getContext('2d'), pactBtn = grim.querySelector('.gr-pact');
    var ink = 0, pen = null, lastScratch = 0;
    function sizePad() {
        var r = pad.getBoundingClientRect(), k = window.devicePixelRatio || 1;
        cv.width = Math.max(1, r.width * k); cv.height = Math.max(1, r.height * k);
        cx.setTransform(k, 0, 0, k, 0, 0);
        cx.lineCap = 'round'; cx.lineJoin = 'round';
    }
    function at(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; }
    pad.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        try { pad.setPointerCapture(e.pointerId); } catch (x) {}
        pen = at(e);
        cx.fillStyle = '#6d0008';
        cx.beginPath(); cx.arc(pen.x, pen.y, 2.2, 0, Math.PI * 2); cx.fill();
    });
    pad.addEventListener('pointermove', function (e) {
        if (!pen) return;
        var p = at(e), d = Math.hypot(p.x - pen.x, p.y - pen.y);
        if (d < 1) return;
        var speed = d / Math.max(1, p.t - pen.t);
        cx.strokeStyle = 'rgba(' + (95 + Math.random() * 25 | 0) + ',0,' + (6 + Math.random() * 6 | 0) + ',' + (0.82 + Math.random() * 0.15).toFixed(2) + ')';
        cx.lineWidth = Math.max(1.6, Math.min(5.2, 5.4 - speed * 2.2));
        cx.beginPath(); cx.moveTo(pen.x, pen.y); cx.lineTo(p.x, p.y); cx.stroke();
        ink += d;
        if (p.t - lastScratch > 140) { lastScratch = p.t; sfx('quill', { or: 'brush', size: 0.25 }); }
        pen = p;
        if (ink > 140) pactBtn.disabled = false;
    });
    function lift() {
        if (!pen) return;
        if (Math.random() < 0.45) {                                         // a drop runs down from the end of the stroke
            var x = pen.x, y = pen.y, len = 6 + Math.random() * 16;
            cx.strokeStyle = 'rgba(100,0,8,.8)'; cx.lineWidth = 1.8;
            cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + (Math.random() - 0.5), y + len); cx.stroke();
            cx.fillStyle = 'rgba(100,0,8,.9)'; cx.beginPath(); cx.arc(x, y + len, 2.1, 0, Math.PI * 2); cx.fill();
        }
        pen = null;
    }
    pad.addEventListener('pointerup', lift);
    pad.addEventListener('pointercancel', lift);

    function openBook() {
        if (!hasBook || climbing || pactMade() || grim.classList.contains('open')) return;
        grim.classList.remove('slam');
        grim.classList.add('open');
        body.classList.add('book-open');
        ink = 0; pactBtn.disabled = true;
        requestAnimationFrame(function () { sizePad(); cx.clearRect(0, 0, cv.width, cv.height); });
        hum(0.85);
    }
    function closeBook(quiet) {
        if (!grim.classList.contains('open')) return;
        grim.classList.remove('open');
        body.classList.remove('book-open');
        if (!quiet) sfx('page-turn');
        hum(0);
    }
    grim.querySelector('.gr-shut').addEventListener('click', function () { closeBook(); });
    grim.addEventListener('click', function (e) { if (e.target === grim) closeBook(); });
    if (book) book.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (!hasBook || climbing || body.classList.contains('inv-holding')) return;
        if (Sky.books && Sky.books.remarking) return;
        climbing = true;
        walk(me, standAt(me, pctOf(book, attic)) - 6, function () {
            me.classList.remove('face-left');
            climbing = false;
            // a word first (sky/books.js), then it opens: the ritual, loud, if its pact is still to be made; else only a book
            var first = get('grimoire-looked') !== '1';
            set('grimoire-looked', '1');
            if (!Sky.books || !Sky.books.grimoire) { if (!pactMade()) openBook(); return; }
            if (pactMade()) Sky.books.grimoire();
            else Sky.books.grimoire({ line: first ? FIRST_LOOK : null, loud: true, open: openBook });
        });
    });

    /* ---------------- the pact ---------------- */
    var HAND = '<svg viewBox="0 0 50 110" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><path d="M14 110 Q12 74 10 60 Q4 48 3 36 Q2 30 6 31 Q9 32 11 44 L13 28 Q12 14 14 8 Q17 4 19 9 L20 30 L22 6 Q24 0 27 4 Q29 8 27 30 L30 10 Q32 5 35 8 Q37 12 34 34 L38 22 Q41 18 43 22 Q44 28 40 44 Q38 60 36 74 Q35 92 36 110 Z" fill="#0c0808" stroke="#2a1414" stroke-width="1"/>' +
        '<path d="M16 70 Q24 76 32 70 M18 84 Q25 88 33 84" stroke="#241010" stroke-width="1.2" fill="none"/></svg>';
    var handArt = HAND;
    Sky.findAsset('assets/living/pact-hand', function (u) { if (u) handArt = '<img alt="" src="' + u + '">'; });
    pactBtn.addEventListener('click', function () {
        if (pactBtn.disabled || pactMade()) return;
        pactBtn.disabled = true;
        set('grimoire-pact', '1');                                          // (it's made: this can't happen again this reset)
        grim.classList.add('slam');
        setTimeout(function () { sfx('book-slam', { or: 'land', size: 1 }); }, 380);
        setTimeout(function () { grim.classList.remove('open'); body.classList.remove('book-open'); rise(); }, 900);
    });
    function rise() {
        climbing = true;
        var r = me.getBoundingClientRect();
        // the book, shut, floating up in front of them
        var fb = document.createElement('div');
        fb.className = 'pact-book';
        fb.style.width = Math.max(70, r.height * 0.55) + 'px';
        fb.style.left = (r.left + r.width / 2 - Math.max(70, r.height * 0.55) / 2) + 'px';
        fb.style.top = (r.top + r.height * 0.42) + 'px';
        attic.classList.add('pact');                                        // (it's left the lectern)
        fb.innerHTML = book.querySelector('img.art') ? '<img alt="" src="' + book.querySelector('img.art').src + '">' : book.querySelector('svg').outerHTML;
        body.appendChild(fb);
        fb.animate([{ transform: 'translateY(40px) rotate(-8deg)', opacity: 0 }, { transform: 'translateY(-10px) rotate(3deg)', opacity: 1, offset: 0.5 }, { transform: 'translateY(0) rotate(-2deg)', opacity: 1 }],
            { duration: 1200, easing: 'ease-out', fill: 'forwards' });
        var bob = setTimeout(function () { fb.animate([{ transform: 'translateY(0) rotate(-2deg)' }, { transform: 'translateY(-8px) rotate(2deg)' }], { duration: 900, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }); }, 1200);
        var dk = document.createElement('div');
        dk.className = 'pact-dark';
        body.appendChild(dk);
        requestAnimationFrame(function () { dk.classList.add('on'); });
        sfx('pact', { or: 'scare' }); setTimeout(function () { sfx('pact', { or: 'unnerve' }); }, 300);
        hum(1);
        me.classList.add('writhing');
        setTimeout(function () { sfx('scream'); }, 1300);
        // the hands, up through the boards around their feet
        var floorY = r.bottom - Math.max(2, r.height * 0.02), hands = [];
        var under = document.createElement('div');
        under.className = 'pact-floor';
        under.style.height = floorY + 'px';
        body.appendChild(under);
        setTimeout(function () {
            sfx('hands', { or: 'crack' });
            [-0.75, -0.3, 0.2, 0.62].forEach(function (k, i) {
                var h = document.createElement('div');
                h.className = 'pact-hand';
                h.innerHTML = handArt;
                var hw = Math.max(26, r.height * 0.26);
                h.style.width = hw + 'px'; h.style.height = (hw * 2.2) + 'px';
                h.style.left = (r.left + r.width / 2 + k * r.width - hw / 2) + 'px';
                h.style.top = (floorY - hw * 2.2) + 'px';
                h.style.transform = 'rotate(' + (k * 22) + 'deg)';
                under.appendChild(h);
                h.animate([{ translate: '0 100%' }, { translate: '0 12%', offset: 0.7 }, { translate: '0 22%' }], { duration: 600 + i * 90, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
                hands.push(h);
            });
        }, 1500);
        // and down they go
        setTimeout(function () {
            me.classList.remove('writhing');
            me.classList.add('dragged-down');
            hands.forEach(function (h) { h.animate([{ translate: '0 22%' }, { translate: '0 120%' }], { duration: 1500, easing: 'cubic-bezier(.5,0,.8,.5)', fill: 'forwards' }); });
            sfx('scream', { delay: 0.2 });
        }, 2500);
        setTimeout(function () {
            clearTimeout(bob);
            me.classList.add('gore-hidden');
            me.classList.remove('dragged-down');
            fb.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(30px)' }], { duration: 700, fill: 'forwards' }).onfinish = function () { fb.remove(); };
            hands.forEach(function (h) { h.remove(); });
            under.remove();
            dk.classList.remove('on');
            hum(0);
            setTimeout(function () {
                dk.remove();
                attic.classList.remove('pact');
                climbing = false;
                if (Sky.gore && Sky.gore.respawn) Sky.gore.respawn(me);           // (a death like any other: sky/lives.js counts it)
                else { me.classList.remove('gore-hidden'); document.dispatchEvent(new CustomEvent('dav:traveller-died')); }
            }, 1500);
        }, 4200);
    }

    Sky.attic = { up: function () { return up; }, open: function () { openAttic(true); }, climbDown: climbDown, openBook: openBook, get lamp() { return LAMP; } };
})();

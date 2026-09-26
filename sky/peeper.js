/* =====================================================================
   peeper.js — the city telescope. Look across the lit skyline; some
   windows glow a little warmer. Each one holds a scene from a folder
   (one file = one window). Click one and the telescope zooms right in.
   From the telescope you can also look up at the sky (Polaris, the
   constellations and the day/night player).

       <button class="telescope-btn" data-folder="content/city/"> … </button>   (on the rooftop it's the telescope
                                                                                 standing on the roof: city.html)
       <script src="sky/peeper.js"></script>     (after sky/sky.js and sky/ground-city.js)

   Click a window on the skyline (telescope down) and it comes up already aimed at
   it. There are no arrows: you find the rooms by looking.

   MEL'S WINDOW: one building on the front row is abandoned, every window dark,
   except one that's boarded up. Click it: knock, and keep knocking, and the boards
   come off one by one until you're in. Behind the last board: darkness, a wrong
   sound… and something at the window. That happens once, ever, in each visitor's
   browser (it doesn't kill you: it lunges, then slides off into the dark). Then the
   window's lit: Mel's room, her own (schizophyllu.me.room/, she made it), there
   through the glass. "[ climb in ]" and you're in it, on its own page; its
   "back to the rooftop" brings you back here. slots:
       assets/city/mel-board       one board (a plank, wider than tall; it's stretched)
       assets/city/mel-scare       what's waiting behind the boards (a transparent PNG/GIF)
   sounds: assets/sounds/knock, crack, unnerve, scare (and hobo, the soundtrack in the dark)
   the words (and who says them): MEL near the top of this file. on your own skyline art, say where her
   window is: "mel": [x%, y%, w%, h%] in assets/city/skyline-front-windows.json

   files: pictures (.png .jpg .jpeg .webp .gif .svg), video (.mp4 .webm, plays muted
   on loop) or a bit of .html. order: by file name. caption: from the file name,
   or a .txt with the same name beside it.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var btn = document.querySelector('.telescope-btn[data-folder]');
    if (!btn || !Sky.city) return;
    var MEDIA = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'mp4', 'webm', 'html'];
    var EVENING = 0.84;                        // the hour the telescope turns it to: dark enough for every window to be lit
    var MEL = {
        title: 'mel\u2019s room',
        boards: 5,                                  // how many boards to pull off
        first: 'knock knock\u2026 nobody answers. try again?',
        more: ['something shifts behind the boards.', 'a board splinters.', 'the wood gives a little more.', 'one more\u2026', ''],
        inside: 'mel\u2019s room',
        dark: '\u2026',                                       // (under the window while it's pitch black in there)
        dark_secs: 12,                                     // how long it's pitch black in there, from the last board coming off
        call: 'call out\u2026',                              // the button you can press in the dark (it does nothing, but you can't help it)
        calls: ['Is anybody there?', 'Hello?', '\u2026Anybody home?'],
        lit: 'something inside is lit.',
        climb: '[ climb in ]'
    };

    Sky.css(
        '.peep-spots { position: absolute; left: -6%; bottom: -12px; width: 112%; height: calc(100% + 12px); pointer-events: none; visibility: hidden; }' +
        'body.peep-view .peep-spots { visibility: visible; }' +
        '.peep-spot { position: absolute; padding: 0; border: 0; border-radius: 1px; cursor: zoom-in; pointer-events: auto;' +
            'background: #ffe7a8; box-shadow: 0 0 4px 1px rgba(255,214,130,.95), 0 0 10px 3px rgba(255,190,90,.55);' +
            'animation: peep-glow 2.6s ease-in-out infinite alternate; }' +
        '.peep-spot:hover, .peep-spot:focus-visible { background: #fff6dc; outline: none;' +
            'box-shadow: 0 0 5px 2px rgba(255,236,180,1), 0 0 16px 6px rgba(255,200,110,.8); animation: none; }' +
        '@keyframes peep-glow { from { opacity: .72; } to { opacity: 1; } }' +
        '.ground-city.peep-drag { transition: none !important; }' +
        'body.peep-view .ground-city { transform-origin: 50% 100%; }' +
        'body.peep-view .scope-lens, body.peep-close .scope-lens { opacity: 1; visibility: visible; transition: opacity .8s ease .15s; }' +
        'body.peep-view .scene-character, body.peep-view .ui-button { opacity: 0; visibility: hidden; pointer-events: none; }' +
        'body.peep-view .signpost, body.peep-close .signpost { opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .4s, visibility 0s .4s; }' +
        'body.peep-view { cursor: crosshair; } body.peep-view.peep-pushing { cursor: move; }' +
        // on a touch screen the whole view belongs to your finger while you look: no page scroll, no zoom
        'html.peep-touch, html.peep-touch body, html.peep-touch body * { touch-action: none !important; overscroll-behavior: none; }' +
        '@media (hover: none), (pointer: coarse) { body.peep-view { cursor: grab; } body.peep-view.peep-dragging { cursor: grabbing; } }' +

        /* things drawn on the telescope's glass */
        '.peep-ui { position: fixed; inset: 0; z-index: 6; pointer-events: none; opacity: 0; visibility: hidden; transition: opacity .4s, visibility 0s .4s;' +
            'font-family: "IM Fell English", Georgia, serif; }' +
        'body.peep-view .peep-ui, body.peep-close .peep-ui { opacity: 1; visibility: visible; transition: opacity .5s ease .7s; }' +
        'body.peep-close .peep-ui .pu-note { opacity: 0; }' +
        'body.sky-view .peep-ui { opacity: 0 !important; visibility: hidden !important; }' +
        '.peep-ui button { pointer-events: auto; border: 0; cursor: pointer; font: italic 1rem "IM Fell English", Georgia, serif; }' +
        '.peep-ui .pu-leave { position: absolute; left: 18px; top: 18px; display: flex; gap: 8px; align-items: center; padding: 8px 14px 8px 12px;' +
            'border-radius: 999px; background: rgba(40,28,18,.8); color: #f3e6c2; }' +
        '.peep-ui .pu-leave:hover { background: rgba(40,28,18,.95); }' +
        '.peep-ui .pu-up { position: absolute; left: 50%; top: calc(48% - min(45vh, 46vw) + 84px); transform: translateX(-50%); padding: 6px 14px;' +
            'border-radius: 999px; background: rgba(234,220,185,.9); color: #3a2716; box-shadow: 0 4px 10px rgba(0,0,0,.4); }' +
        '.peep-ui .pu-up:hover { background: #eadcb9; }' +
        '.peep-ui .pu-note { position: absolute; left: 50%; top: calc(48% + min(45vh, 46vw) - 74px); transform: translateX(-50%); max-width: min(80vw, 60vh);' +
            'text-align: center; font-style: italic; color: #fff6dc; text-shadow: 0 1px 4px rgba(0,0,0,.9); font-size: 1.05rem; }' +

        /* a window, up close */
        '.peep-scene { position: fixed; inset: 0; z-index: 5; display: grid; place-items: center; pointer-events: none; visibility: hidden; opacity: 0;' +
            'transition: opacity .5s, visibility 0s .5s; font-family: "IM Fell English", Georgia, serif; }' +
        'body.peep-close .peep-scene { visibility: visible; opacity: 1; transition: opacity .6s ease .35s; }' +
        '.ps-frame { position: relative; width: calc(min(45vh, 46vw) * 1.5); height: calc(min(45vh, 46vw) * 1.18); margin-top: -4vh; pointer-events: auto;' +
            'border: 14px solid #2a1d14; background: #1b140e; box-shadow: 0 0 0 3px #4a3322, 0 0 60px 10px rgba(255,190,100,.35); }' +
        '.ps-frame::after { content: ""; position: absolute; left: -26px; right: -26px; bottom: -32px; height: 16px; background: #2a1d14; box-shadow: 0 6px 8px rgba(0,0,0,.5); }' +
        '.ps-view { position: absolute; inset: 0; overflow: hidden; display: grid; place-items: center; background: #f0e2c0; }' +
        '.ps-view > img, .ps-view > video { width: 100%; height: 100%; object-fit: cover; display: block; }' +
        '.ps-view > div { padding: 6% 8%; color: #3a2716; overflow: auto; max-height: 100%; }' +
        '.ps-curtain { position: absolute; top: 0; bottom: 0; width: 52%; z-index: 2; transition: transform 1s cubic-bezier(.5,0,.2,1);' +
            'background: repeating-linear-gradient(90deg, #7a2a1c 0 10px, #6a2216 10px 18px, #8a3322 18px 26px); box-shadow: inset 0 -30px 40px rgba(0,0,0,.35); }' +
        '.ps-curtain.l { left: 0; transform-origin: 0 0; } .ps-curtain.r { right: 0; transform-origin: 100% 0; }' +
        '.peep-scene.drawn .ps-curtain.l, .peep-scene.drawn .ps-curtain.r { transform: scaleX(.16); }' +
        'body.peep-close .pu-up { display: none; }' +
        'body.peep-close .scene-character, body.peep-close .ui-button { opacity: 0; visibility: hidden; pointer-events: none; }' +
        '.ps-title { position: absolute; left: 50%; top: calc(100% + 30px); transform: translateX(-50%) rotate(-1deg); white-space: nowrap; max-width: 90vw;' +
            'overflow: hidden; text-overflow: ellipsis; padding: 4px 14px; background: #eadcb9; color: #3a2716; font-style: italic; box-shadow: 0 4px 8px rgba(0,0,0,.4); }' +
        '.ps-title small { color: #6e5236; }' +
        // mel's window: on the skyline, and up close with its boards
        '.peep-spot.mel { background: #4a3526; box-shadow: 0 0 3px 1px rgba(255,170,90,.45); animation: mel-flick 3.4s ease-in-out infinite; }' +
        '.peep-spot.mel:hover, .peep-spot.mel:focus-visible { background: #6b4b34; box-shadow: 0 0 5px 2px rgba(255,180,100,.8); }' +
        '@keyframes mel-flick { 0%, 100% { opacity: .75; } 45% { opacity: 1; } 50% { opacity: .55; } }' +
        'body.city-aim, body.city-aim * { cursor: var(--cursor-look, zoom-in) !important; }' +
        '.mel-planks { position: absolute; inset: 0; z-index: 3; cursor: pointer; }' +
        '.mel-board { position: absolute; left: -5%; width: 110%; height: 17%; transform-origin: 50% 50%; transition: transform .25s;' +
            'background: repeating-linear-gradient(90deg, #6b4a32 0 3px, #5c3f2b 3px 11px, #735037 11px 14px, #5a3d29 14px 22px); border-radius: 2px;' +
            'box-shadow: 0 3px 6px rgba(0,0,0,.55), inset 0 2px 0 rgba(255,255,255,.08), inset 0 -3px 0 rgba(0,0,0,.25); }' +
        '.mel-board > .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; }' +
        '.mel-board::before, .mel-board::after { content: ""; position: absolute; top: 50%; width: 7px; height: 7px; margin-top: -3.5px; border-radius: 50%; background: #9aa0a6; box-shadow: inset -1px -1px 0 rgba(0,0,0,.4); }' +
        '.mel-board::before { left: 7%; } .mel-board::after { right: 7%; }' +
        '.mel-board.has-art::before, .mel-board.has-art::after { display: none; }' +
        '.mel-board.shake { animation: board-shake .3s; }' +
        '@keyframes board-shake { 0%, 100% { translate: 0 0; } 25% { translate: -3px 1px; } 50% { translate: 3px -1px; } 75% { translate: -2px 0; } }' +
        '.mel-board.loose { transition: transform .3s; }' +
        '.mel-board.gone { transition: transform 1.1s cubic-bezier(.5,0,.8,.6), opacity .6s .6s; opacity: 0; pointer-events: none; }' +
        '.peep-scene.mel .ps-view { background: #1a1418; }' +
        'body.peep-mel .peep-ui .pu-note { opacity: 1; transition: opacity .3s; }' +
        '.peep-scene.mel .ps-curtain { display: none; }' +
        '.peep-scene.mel .ps-frame { box-shadow: 0 0 0 3px #3a2a20, 0 0 40px 6px rgba(255,160,80,.18); border-color: #3a2a20; }' +
        '.peep-scene.mel.in .ps-frame { box-shadow: 0 0 0 3px #3a2a20, 0 0 70px 14px rgba(255,170,90,.4); transition: box-shadow 1.5s; }' +
        '.peep-scene.mel .ps-view > .mel-dark { position: absolute; inset: 0; background: #000; opacity: 1; transition: opacity 1.8s; pointer-events: none; }' +
        '.peep-scene.mel.in .ps-view > .mel-dark { opacity: 0; }' +
        '.peep-scene.mel .ps-view > svg { width: 100%; height: 100%; display: block; }' +
        '.peep-scene.mel.void .ps-view > .mel-dark { opacity: 1 !important; transition: opacity .3s; }' +
        // her room (schizophyllu.me.room/, Mel's own): live through the glass once the thing at the window's been
        '.ps-view > .mel-live { position: absolute; inset: 0; padding: 0; overflow: hidden; max-height: none; background: #07080d; cursor: pointer; }' +
        '.mel-live iframe { position: absolute; left: 50%; top: 50%; width: 1600px; height: 900px; border: 0; pointer-events: none; transform-origin: 50% 50%; }' +
        '.mel-climb { position: absolute; left: 50%; bottom: 7%; z-index: 6; transform: translateX(-50%); padding: 7px 18px; border: 1px solid rgba(109,255,176,.55); border-radius: 999px;' +
            'background: rgba(7,8,13,.8); color: #9dffc8; font: 1rem ui-monospace, Menlo, Consolas, monospace; cursor: pointer; opacity: 0; transition: opacity .8s .6s; }' +
        '.peep-scene.mel.in .mel-climb { opacity: 1; }' +
        '.mel-climb:hover, .mel-climb:focus-visible { background: rgba(20,40,30,.9); outline: none; }' +
        '.mel-through { position: fixed; inset: 0; z-index: 2147483000; background: #000; opacity: 0; pointer-events: all; transition: opacity .9s ease-in; }' +
        '.mel-through.on { opacity: 1; }' +
        '.peep-scene.mel.climbing .ps-frame { transition: transform 1.1s cubic-bezier(.6,0,.9,.5); transform: scale(3.2); }' +
        // what's behind the boards
        '.mel-scare { position: absolute; inset: 2% 8% -2%; z-index: 4; pointer-events: none; opacity: 0; }' +
        '.mel-call { position: absolute; left: 50%; bottom: 7%; z-index: 6; transform: translateX(-50%); padding: 7px 18px; border: 1px solid rgba(243,230,194,.3); border-radius: 999px;' +
            'background: rgba(20,14,10,.85); color: #f3e6c2; font: italic 1rem "IM Fell English", Georgia, serif; cursor: pointer; }' +
        '.mel-call:hover { background: rgba(60,40,28,.9); }' +
        '.mel-calls { position: absolute; inset: 0; z-index: 5; pointer-events: none; }' +
        '.ps-view > .mel-calls, .ps-view > .mel-scare { padding: 0; overflow: visible; max-height: none; }' +
        '.mel-said { position: absolute; padding: 4px 12px; border-radius: 12px; background: #f6ecd2; color: #2a1d14; font: italic clamp(.8rem, 1.8vh, 1.05rem) "IM Fell English", Georgia, serif;' +
            'white-space: nowrap; box-shadow: 0 3px 10px rgba(0,0,0,.6); animation: mel-said 3s ease-out forwards; }' +
        '@keyframes mel-said { 0% { opacity: 0; transform: translateY(6px); } 10% { opacity: 1; transform: none; } 65% { opacity: 1; } 100% { opacity: 0; transform: translateY(-10px); } }' +
        '.mel-scare > svg, .mel-scare > img, .mel-scare > video { width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; display: block; }' +
        // your own (a photo, a GIF, a video): right up against the glass, filling the whole window
        '.mel-scare:has(> img), .mel-scare:has(> video) { inset: 0; }' +
        '.mel-scare > img, .mel-scare > video { object-fit: cover; object-position: 50% 35%; }' +
        '.mel-scare.boo { opacity: 1; animation: mel-boo .16s ease-out; }' +
        '@keyframes mel-boo { from { transform: scale(1.5) translateY(10%); } to { transform: none; } }' +
        '.mel-scare.away { opacity: 1; transform: translateX(-125%); transition: transform 3.4s cubic-bezier(.45,0,.55,1); }' +
        '.peep-scene.jolt .ps-frame { animation: mel-jolt .45s linear; }' +
        '@keyframes mel-jolt { 0%, 100% { translate: 0 0; } 20% { translate: -9px 4px; } 40% { translate: 8px -5px; } 60% { translate: -5px 3px; } 80% { translate: 3px -2px; } }' +
        '.mel-flash { position: fixed; inset: 0; z-index: 8; pointer-events: none; background: #fff; opacity: 0; }' +
        '.mel-flash.on { animation: mel-flash .5s ease-out; }' +
        '@keyframes mel-flash { 0% { opacity: .9; } 100% { opacity: 0; } }' +
        '@media (prefers-reduced-motion: reduce) { .peep-scene.jolt .ps-frame, .mel-scare.boo { animation: none !important; } }' +
        '@media (max-width: 620px) { .scope-lens { --r: min(45vh, 47vw); } body.peep-close .scope-lens { --r: 49vw; }' +
            '.peep-ui .pu-note { font-size: .95rem; } .ps-frame { border-width: 9px; } }'
    );

    btn.setAttribute('aria-label', 'look through the telescope');

    /* ---------------- the glowing windows ---------------- */
    var ground = Sky.city.el, frontSvg = null;
    var spots = document.createElement('div');
    spots.className = 'peep-spots';
    ground.appendChild(spots);

    var ui = document.createElement('div');
    ui.className = 'peep-ui';
    ui.innerHTML =
        '<button type="button" class="pu-leave">lower the telescope</button>' +
        '<button type="button" class="pu-up">look up at the sky ↑</button>' +
        '<div class="pu-note"></div>';
    document.body.appendChild(ui);
    var note = ui.querySelector('.pu-note');

    var scene = document.createElement('div');
    scene.className = 'peep-scene';
    scene.innerHTML = '<div class="ps-frame"><div class="ps-view"></div><div class="ps-curtain l"></div><div class="ps-curtain r"></div><div class="ps-title"></div></div>';
    document.body.appendChild(scene);
    var viewEl = scene.querySelector('.ps-view'), titleEl = scene.querySelector('.ps-title');

    var scenes = [], chosen = [], at = 0, state = 'off', melWin = null;
    var Z = 2.8, pan = { x: 0, y: 0 };

    function frontInfo() { return Sky.city.front; }
    // pick one lit window per scene, spread across the width of the skyline
    function placeSpots() {
        spots.innerHTML = '';
        chosen = [];
        var fr = frontInfo();
        if (!fr) return;
        frontSvg = fr.svg;
        spots.style.transform = frontSvg.style.transform;
        melWin = fr.mel || null;
        if (melWin) {
            var m = document.createElement('button');
            m.type = 'button';
            m.className = 'peep-spot mel';
            m.style.left = (melWin.x - 0.5) + 'px'; m.style.top = (melWin.y - 0.5) + 'px';
            m.style.width = (melWin.w + 1) + 'px'; m.style.height = (melWin.h + 1) + 'px';
            m.setAttribute('aria-label', 'a boarded-up window');
            m.addEventListener('click', function (e) { e.stopPropagation(); if (!dragged) melPeek(); });
            m.addEventListener('mouseenter', function () { if (state === 'looking') note.textContent = 'a boarded-up window. there\u2019s a light on behind it.'; });
            m.addEventListener('mouseleave', function () { if (state === 'looking') note.textContent = hintText(); });
            spots.appendChild(m);
        }
        if (!scenes.length) return;
        var lit = fr.windows.filter(function (w) { return w.lit && w.y > w.top + 8; });
        if (!lit.length) lit = fr.windows;
        lit.sort(function (a, b) { return a.x - b.x; });
        var n = scenes.length, W = fr.W, lo = W * 0.12, hi = W * 0.88;
        scenes.forEach(function (sc, i) {
            var a = lo + (hi - lo) * i / n, b = lo + (hi - lo) * (i + 1) / n;
            var pool = lit.filter(function (w) { return w.x >= a && w.x < b; });
            if (!pool.length) pool = lit;
            var rnd = Sky.seeded(Sky.hashStr(sc.file.name));
            var w = pool[Math.floor(rnd() * pool.length)];
            chosen.push(w);
            var s = document.createElement('button');
            s.type = 'button';
            s.className = 'peep-spot';
            s.style.left = (w.x - 0.5) + 'px';
            s.style.top = (w.y - 0.5) + 'px';
            s.style.width = (w.w + 1) + 'px';
            s.style.height = (w.h + 1) + 'px';
            s.setAttribute('aria-label', 'look into the window: ' + sc.title);
            s.addEventListener('click', function (e) { e.stopPropagation(); if (!dragged) peek(i); });
            s.addEventListener('mouseenter', function () { if (state === 'looking') note.textContent = sc.title; });
            s.addEventListener('mouseleave', function () { if (state === 'looking') note.textContent = hintText(); });
            s.addEventListener('focus', function () { if (state === 'looking') { at = i; note.textContent = sc.title; } });
            spots.appendChild(s);
        });
    }
    Sky.city.onBuild = placeSpots;
    Sky.onFrame(function () { if (frontSvg) spots.style.transform = frontSvg.style.transform; });
    setInterval(function () { if (frontSvg && spots.style.transform !== frontSvg.style.transform) spots.style.transform = frontSvg.style.transform; }, 500);

    function hintText() {
        if (!scenes.length) return 'no windows lit yet. scenes go in content/city/';
        return (fine.matches ? 'point toward the edge to turn, or drag. ' : 'drag to look around. ') +
            'click a bright window to look in (' + scenes.length + ' to find)';
    }

    /* ---------------- aiming the telescope ---------------- */
    function vh() { return window.innerHeight; }
    function vw() { return window.innerWidth; }
    function clampPan(p) {
        var Hg = ground.clientHeight, W = vw();
        var mx = (Z - 1) * W / 2;
        return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(0, Math.min(Math.max(0, Z * Hg - vh() * 0.62), p.y)) };
    }
    var holdUntil = 0;            // while an aimed move is gliding, the rim doesn't push
    function applyPan(zoom, p, ms) {
        if (ms !== 0) holdUntil = performance.now() + (ms || 650);
        ground.style.transition = ms === 0 ? 'none' : 'transform ' + (ms || 650) + 'ms cubic-bezier(.25,.8,.25,1), opacity .9s';
        ground.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) scale(' + zoom.toFixed(3) + ')';
    }
    // where a window's centre sits on screen with no zoom (see the ground's layout in sky.css)
    function baseXY(w) {
        var W = vw(), Hg = ground.clientHeight;
        var drift = parseFloat((/translateX\(([-\d.]+)%\)/.exec(frontSvg ? frontSvg.style.transform : '') || [0, 0])[1]) || 0;
        var x0 = -0.06 * W + drift / 100 * 1.12 * W + w.x + w.w / 2;
        var y0 = vh() - Hg + w.y + w.h / 2;
        return { x: x0, y: y0 };
    }
    function panFor(w, zoom) {
        var b = baseXY(w), ox = vw() / 2, oy = vh();
        return { x: -(b.x - ox) * zoom, y: vh() * 0.48 - (oy + (b.y - oy) * zoom) };
    }
    function aim(i, ms) {
        if (!chosen[i]) return;
        aimAt(chosen[i], ms);
    }
    function aimAt(w, ms) {
        pan = clampPan(panFor(w, Z));
        applyPan(Z, pan, ms);
    }

    /* ---------------- moving the view ----------------
       with a mouse: no clicking needed. point where you want to look: the telescope turns
       that way, faster the further your pointer is from the middle of the lens (and not
       at all near the middle, so you can rest there). on a touch screen: drag to look around. */
    var REST = 0.1;               // this close to the middle (1 = the rim), it stays still
    var PUSH = 720;               // px per second with the pointer at the rim or beyond
    var vel = { x: 0, y: 0 };
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    var aimPt = null, pushT = 0, pushing = false;
    function lensR() {
        var lens = document.querySelector('.scope-lens');
        var r = lens ? parseFloat(getComputedStyle(lens).getPropertyValue('--r')) : NaN;
        return r > 0 ? r : Math.min(vh() * 0.45, vw() * 0.46);
    }
    document.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        aimPt = e.target.closest && e.target.closest('button, a, .signpost, .polaris, .peep-ui') ? null : { x: e.clientX, y: e.clientY };
        if (state === 'looking' && aimPt && !pushing) { pushing = true; pushT = performance.now(); requestAnimationFrame(push); }
    });
    document.documentElement.addEventListener('mouseleave', function () { aimPt = null; });
    window.addEventListener('blur', function () { aimPt = null; });
    function push(now) {
        if (state !== 'looking') { pushing = false; vel.x = vel.y = 0; document.body.classList.remove('peep-pushing'); return; }
        var dt = Math.min(0.15, (now - pushT) / 1000);           // (keeps pace on a slow computer too)
        pushT = now;
        var tx = 0, ty = 0;
        if (aimPt && now > holdUntil) {
            var cx = vw() / 2, cy = vh() * 0.48, R = lensR();
            var dx = aimPt.x - cx, dy = aimPt.y - cy, dist = Math.hypot(dx, dy);
            var k = Math.max(0, Math.min(1, (dist / R - REST) / (1 - REST)));
            k = Math.pow(k, 1.5);                                // gentle near the middle for aiming, quick toward the rim
            if (dist > 0) { tx = dx / dist * PUSH * k; ty = dy / dist * PUSH * k; }
        }
        // a quick take-up and a quick stop: it goes where you point
        var ease = Math.min(1, dt * 16);
        vel.x += (tx - vel.x) * ease; vel.y += (ty - vel.y) * ease;
        if (drag) { vel.x = vel.y = 0; }
        var moving = Math.abs(vel.x) + Math.abs(vel.y) > 2;
        document.body.classList.toggle('peep-pushing', moving);
        if (moving) {
            var next = clampPan({ x: pan.x - vel.x * dt, y: pan.y - vel.y * dt });
            if (Math.abs(next.x - pan.x) + Math.abs(next.y - pan.y) > 0.01) { pan = next; applyPan(Z, pan, 0); }
        }
        if (!aimPt && !moving) { pushing = false; vel.x = vel.y = 0; document.body.classList.remove('peep-pushing'); return; }
        requestAnimationFrame(push);
    }

    var drag = null, dragged = false;
    document.addEventListener('pointerdown', function (e) {
        if (state !== 'looking' || e.button !== 0 || e.target.closest('button, a, .signpost, .polaris')) return;
        drag = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, id: e.pointerId };
        dragged = false;
    });
    document.addEventListener('touchmove', function (e) { if (state === 'looking' || state === 'scene') e.preventDefault(); }, { passive: false });
    document.addEventListener('pointercancel', function () { drag = null; document.body.classList.remove('peep-dragging'); });
    document.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!dragged && Math.hypot(dx, dy) < 5) return;
        dragged = true;
        document.body.classList.add('peep-dragging');
        pan = clampPan({ x: drag.px + dx, y: drag.py + dy });
        applyPan(Z, pan, 0);
    });
    document.addEventListener('pointerup', function () {
        if (!drag) return;
        drag = null;
        document.body.classList.remove('peep-dragging');
        setTimeout(function () { dragged = false; }, 0);
    });
    window.addEventListener('wheel', function (e) {
        if (state !== 'looking') return;
        e.preventDefault();
        pan = clampPan({ x: pan.x - (e.shiftKey ? e.deltaY : e.deltaX), y: pan.y - (e.shiftKey ? 0 : e.deltaY) });
        applyPan(Z, pan, 0);
    }, { passive: false });

    /* ---------------- looking through it ---------------- */
    function lookThrough(target) {
        if (state !== 'off') return;
        target = target && target.type ? null : target;           // (a click event isn't a target)
        state = 'looking';
        Z = vw() < 620 ? 3.4 : 2.8;
        document.body.classList.add('peep-view');
        document.documentElement.classList.add('peep-touch');
        Sky.setTime(EVENING, 1400);                      // night falls, and stays when you lower it
        placeSpots();
        note.textContent = hintText();
        requestAnimationFrame(function () {
            if (target && target.win) aimAt(target.win, 800);
            else if (chosen.length) aim(at, 800); else applyPan(Z, pan = clampPan({ x: 0, y: 0 }), 800);
            if (target && target.then) setTimeout(function () { if (state === 'looking') target.then(); }, 820);
        });
        // don't start pushing until the zoom-in has settled and the pointer has moved
        aimPt = null;
    }
    function lower() {
        if (state === 'off') return;
        if (state === 'scene') leaveScene(true);
        state = 'off';
        document.body.classList.add('peep-settling');                 // (no shadows on the skyline until it's back to size: see ground-city.js)
        clearTimeout(lower.t);
        lower.t = setTimeout(function () { document.body.classList.remove('peep-settling'); }, 1150);
        document.body.classList.remove('peep-view', 'peep-close');
        document.documentElement.classList.remove('peep-touch');
        ground.style.transition = 'transform 1s cubic-bezier(.3,.6,.2,1), opacity .9s';
        ground.style.transform = '';
        Sky.releaseTime();
        btn.focus({ preventScroll: true });
    }
    function lookUp() {
        state = 'sky';
        document.body.classList.remove('peep-view');
        document.documentElement.classList.remove('peep-touch');
        ground.style.transition = '';
        ground.style.transform = '';                     // the sky view moves the city out of the way itself
        Sky.openSkyView({
            mode: 'scope',
            exitLabel: 'back to the windows',
            onClose: function () { state = 'off'; lookThrough(); }
        });
    }

    /* ---------------- a window, up close ---------------- */
    function fillScene(i) {
        var sc = scenes[i];
        viewEl.innerHTML = '';
        viewEl.appendChild(Sky.makeMedia(sc.file));
        titleEl.textContent = sc.title;
        if (sc.captionUrl) fetch(sc.captionUrl, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
            t = t.trim();
            if (!t || /<html/i.test(t) || at !== i) return;
            var lines = t.split(/\r?\n/);
            titleEl.textContent = lines.shift();
            if (lines.join(' ').trim()) {
                var sm = document.createElement('small');
                sm.textContent = ' · ' + lines.join(' ').trim();
                titleEl.appendChild(sm);
            }
        });
    }
    function peek(i) {
        if (state !== 'looking' || !chosen[i]) return;
        at = i;
        state = 'scene';
        var deep = 26;
        applyPan(deep, panFor(chosen[i], deep), 700);     // rush in toward the window
        fillScene(i);
        scene.classList.remove('drawn');
        document.body.classList.add('peep-close');
        document.body.classList.remove('peep-view');
        setTimeout(function () { if (state === 'scene') scene.classList.add('drawn'); }, 750);    // the curtains part
        note.textContent = scenes[i].title;
    }
    function leaveScene(quiet) {
        var wasMel = scene.classList.contains('mel');
        melRun++; hoboStop();
        scene.querySelectorAll('.mel-call, .mel-climb').forEach(function (b) { b.remove(); });
        scene.classList.remove('climbing');
        document.body.classList.remove('peep-mel');
        scene.classList.remove('drawn', 'mel', 'in', 'void', 'jolt');
        scene.querySelectorAll('.mel-scare').forEach(function (b) { b.remove(); });
        scene.querySelectorAll('.mel-planks').forEach(function (b) { b.remove(); });
        document.body.classList.remove('peep-close');
        viewEl.querySelectorAll('video').forEach(function (v) { v.pause(); });
        if (quiet) return;
        state = 'looking';
        document.body.classList.add('peep-view');
        if (wasMel && melWin) { aimAt(melWin, 650); note.textContent = hintText(); }
        else { aim(at, 650); note.textContent = scenes[at] ? scenes[at].title : hintText(); }
    }
    btn.addEventListener('click', function () { lookThrough(); });

    /* ---------------- mel's window ---------------- */
    var melState = { knocks: 0, off: 0 };
    try { if (sessionStorage.getItem('mel-in') === '1') { melState.off = MEL.boards; document.body.classList.add('mel-in'); } } catch (e) {}
    var SCARE = '<svg viewBox="0 0 120 150" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
        '<path d="M6 150 Q10 96 34 86 Q60 78 86 86 Q112 96 116 150 Z" fill="#141010"/>' +
        '<path d="M22 60 Q14 22 44 12 Q60 2 78 12 Q108 22 98 62 Q104 78 90 92 Q60 108 30 92 Q16 78 22 60 Z" fill="#1c1614"/>' +      // matted hair
        '<path d="M34 56 Q34 30 60 28 Q86 30 86 56 Q88 82 60 90 Q32 82 34 56 Z" fill="#4a3a34"/>' +                                 // a filthy, burnt face
        '<path d="M40 46 Q50 40 56 48 M64 48 Q70 40 80 46" stroke="#140e0c" stroke-width="3" fill="none"/>' +
        '<ellipse cx="49" cy="54" rx="6" ry="4.5" fill="#d9d2c4"/><ellipse cx="71" cy="54" rx="6" ry="4.5" fill="#d9d2c4"/>' +
        '<circle cx="50" cy="54" r="2" fill="#0a0808"/><circle cx="70" cy="54" r="2" fill="#0a0808"/>' +
        '<path d="M46 74 Q60 68 74 74 Q60 82 46 74 Z" fill="#0a0808"/><path d="M50 74 v3 M56 72 v4 M64 72 v4 M70 74 v3" stroke="#8a8070" stroke-width="1.4"/>' +
        '<g fill="#1c1614"><path d="M30 40 L18 20 L32 32 Z M90 40 L104 22 L88 32 Z M44 20 L40 2 L52 16 Z"/></g></svg>';

    var melRun = 0;
    function later(run, ms, fn) { setTimeout(function () { if (run === melRun && scene.classList.contains('mel')) fn(); }, ms); }
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }
    function art(slot, fallback, box) {
        box.innerHTML = fallback;
        Sky.findAsset(slot, function (url) {
            if (!url) return;                                             // (even if it isn't on the page yet: the scare waits in the dark till its moment)
            if (/\.(webm|mp4)$/i.test(url)) { box.innerHTML = ''; box.appendChild(Sky.makeMedia({ name: url.split('/').pop(), url: url })); }
            else box.innerHTML = '<img alt="" src="' + url + '">';
        });
    }
    // her room, live: Mel's own (schizophyllu.me.room/, with ?peek: no telescope, no sound, nothing to click),
    // scaled to fill the window
    var ROOM = 'schizophyllu.me.room/index.html';
    function buildRoom() {
        var box = document.createElement('div');
        box.className = 'mel-live';
        box.setAttribute('role', 'button');
        box.setAttribute('aria-label', 'climb in through the window');
        var f = document.createElement('iframe');
        f.title = 'mel\u2019s room'; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true');
        f.src = ROOM + '?peek';
        box.appendChild(f);
        function fit() { var k = Math.max(box.clientWidth / 1600, box.clientHeight / 900) || 0.3; f.style.transform = 'translate(-50%, -50%) scale(' + k.toFixed(4) + ')'; }
        requestAnimationFrame(fit);
        box._fit = fit;
        box.addEventListener('click', climbIn);
        return box;
    }
    window.addEventListener('resize', function () { var b = viewEl.querySelector('.mel-live'); if (b) b._fit(); });
    // in through the window: into her room, for real (its own page; its "back to the rooftop" brings them back here)
    function climbIn(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!scene.classList.contains('in') || scene.classList.contains('climbing')) return;
        scene.classList.add('climbing');
        sfx('step', { size: 0.5 }); setTimeout(function () { sfx('step', { size: 0.6 }); }, 380);
        var t = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'mel-through' }));
        requestAnimationFrame(function () { t.classList.add('on'); });
        setTimeout(function () { location.href = ROOM + '?from=dav-nky'; }, 1100);
    }
    // in through the window: (the very first time) the dark, the wrong sound, the face; then mel.
    // the scare: once per browser, ever ("mel-scared" in localStorage: not forgotten at a reset, nor by "forget your stay")
    function scaredYet() { try { return localStorage.getItem('mel-scared') === '1'; } catch (e) { return false; } }
    var hoboUrl = null, hobo = null, boardsOffAt = 0;
    Sky.findAsset('assets/sounds/hobo.ogg|assets/sounds/hobo.mp3', function (u) { hoboUrl = u || null; });
    function hoboStart() {                                            // the soundtrack: from the moment the last board comes off
        boardsOffAt = performance.now();
        if (scaredYet()) return;
        if (!hoboUrl) { sfx('unnerve'); return; }
        try { hobo = new Audio(hoboUrl); hobo.volume = Sky.sounds ? Math.max(.2, Sky.sounds.sfxVolume) : .8; hobo.play().catch(function () {}); } catch (e) {}
    }
    function hoboStop() { if (hobo) { var h = hobo; hobo = null; var v = h.volume, iv = setInterval(function () { v -= .08; if (v <= 0) { clearInterval(iv); h.pause(); } else h.volume = v; }, 60); } }
    function melScene(fresh) {
        var run = ++melRun;
        if (!scaredYet()) {
            if (!boardsOffAt || !fresh) hoboStart();                  // (back after leaving before it happened: from the top)
            scene.classList.add('void');
            note.textContent = '';
            var frame = scene.querySelector('.ps-frame');
            // pitch black. all you can do is call out
            var calls = document.createElement('div');
            calls.className = 'mel-calls';
            viewEl.appendChild(calls);
            var call = document.createElement('button');
            call.type = 'button';
            call.className = 'mel-call';
            call.textContent = MEL.call;
            frame.appendChild(call);
            var said = 0;
            call.addEventListener('click', function (e) {
                e.stopPropagation();
                var b = document.createElement('span');
                b.className = 'mel-said';
                b.textContent = MEL.calls[said++ % MEL.calls.length];
                b.style.left = (22 + Math.random() * 40) + '%';
                b.style.top = (18 + Math.random() * 50) + '%';
                calls.appendChild(b);
                setTimeout(function () { b.remove(); }, 3100);
            });
            var wait = Math.max(0, MEL.dark_secs * 1000 - (performance.now() - boardsOffAt));
            var boo = document.createElement('div');
            boo.className = 'mel-scare';
            art('assets/city/mel-scare', SCARE, boo);
            later(run, wait, function () {
                try { localStorage.setItem('mel-scared', '1'); } catch (e) {}
                call.remove(); calls.remove();
                viewEl.appendChild(boo);                                // (inside the window: as it slides away, the wall hides it)
                sfx('scare');                                         // the sting, on top of the soundtrack
                boo.classList.add('boo');
                scene.classList.remove('jolt'); void scene.offsetWidth; scene.classList.add('jolt');
                var fl = document.querySelector('.mel-flash') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'mel-flash' }));
                fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
            });
            later(run, wait + 1300, function () {                   // it holds there a moment… then slides off into the dark
                boo.classList.add('away');
                hoboStop();
            });
            later(run, wait + 1300 + 3500, function () {            // and there's the room, lit
                boo.remove();
                scene.classList.remove('void');
                lightsUp(run);
            });
            return;
        }
        lightsUp(run);
    }
    function lightsUp(run) {
        var room = viewEl.querySelector('.mel-live');
        if (!room) { room = buildRoom(); viewEl.insertBefore(room, viewEl.firstChild); }
        scene.classList.add('in');
        titleEl.textContent = MEL.inside;
        note.textContent = MEL.lit;
        var go = scene.querySelector('.mel-climb');
        if (!go) {
            go = document.createElement('button');
            go.type = 'button';
            go.className = 'mel-climb';
            go.textContent = MEL.climb;
            go.addEventListener('click', climbIn);
            scene.querySelector('.ps-frame').appendChild(go);
        }
    }
    function melPeek() {
        if (state !== 'looking' || !melWin) return;
        state = 'scene';
        applyPan(26, panFor(melWin, 26), 700);
        viewEl.innerHTML = '';
        if (scaredYet()) viewEl.appendChild(buildRoom());
        viewEl.insertAdjacentHTML('beforeend', '<div class="mel-dark"></div>');
        titleEl.textContent = melState.off >= MEL.boards ? MEL.inside : 'a boarded-up window';
        scene.classList.add('mel');
        scene.classList.remove('in', 'void');
        var frame = scene.querySelector('.ps-frame'), wrap = document.createElement('div');
        wrap.className = 'mel-planks';
        wrap.setAttribute('role', 'button');
        wrap.setAttribute('aria-label', 'knock on the boards');
        var tilts = [-6, 4, -3, 7, -5, 3, -4];
        for (var b = 0; b < MEL.boards; b++) {
            var d = document.createElement('div');
            d.className = 'mel-board' + (b < melState.off ? ' gone' : '');
            d.style.top = (6 + b * (84 / MEL.boards)) + '%';
            d.style.transform = 'rotate(' + tilts[b % tilts.length] + 'deg)';
            d.dataset.asset = 'assets/city/mel-board';
            wrap.appendChild(d);
        }
        if (melState.off >= MEL.boards) wrap.style.pointerEvents = 'none';
        frame.appendChild(wrap);
        Sky.fillAssets(wrap);
        wrap.addEventListener('click', knockKnock);
        document.body.classList.add('peep-close', 'peep-mel');
        document.body.classList.remove('peep-view');
        note.textContent = melState.off >= MEL.boards ? '' : 'click the boards to knock';
        if (melState.off >= MEL.boards) setTimeout(function () { if (scene.classList.contains('mel')) { boardsOffAt = 0; melScene(false); } }, 750);
    }
    function knockKnock() {
        if (!scene.classList.contains('mel') || melState.off >= MEL.boards) return;
        var boards = scene.querySelectorAll('.mel-board');
        boards.forEach(function (b) { if (!b.classList.contains('gone')) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } });
        melState.knocks++;
        if (melState.knocks === 1) {                                // the first time, just a knock
            if (Sky.sounds) Sky.sounds.sfx('knock');
            note.textContent = MEL.first;
            return;
        }
        var board = boards[melState.off];                            // then a board comes off with each one, from the top
        if (Sky.sounds) Sky.sounds.sfx('crack');
        var fall = (melState.off % 2 ? 1 : -1);
        board.style.transform = 'translate(' + (fall * 30) + '%, 260%) rotate(' + (fall * (40 + Math.random() * 30)) + 'deg)';
        board.classList.add('gone');
        melState.off++;
        note.textContent = MEL.more[Math.min(MEL.more.length - 1, melState.off - 1)] || '';
        if (melState.off >= MEL.boards) {                            // in
            try { sessionStorage.setItem('mel-in', '1'); } catch (e) {}
            document.body.classList.add('mel-in');
            scene.querySelector('.mel-planks').style.pointerEvents = 'none';
            hoboStart();
            setTimeout(function () { if (scene.classList.contains('mel')) melScene(true); }, 700);
        }
    }

    /* ---------------- click a window with the telescope down: it comes up, aimed right at it ---------------- */
    function windowAt(cx, cy) {
        var fr = frontInfo();
        if (!fr) return null;
        frontSvg = fr.svg;
        function d(w) { var b = baseXY(w); return Math.hypot(b.x - cx, b.y - cy); }
        var best = null, bd = 1e9;
        chosen.forEach(function (w, i) { var k = d(w); if (k < 16 && k < bd) { bd = k; best = { win: w, scene: i }; } });
        if (melWin && d(melWin) < 16 && d(melWin) < bd) { bd = d(melWin); best = { win: melWin, mel: true }; }
        if (best) return best;
        fr.windows.forEach(function (w) { var k = d(w); if (k < 10 && k < bd) { bd = k; best = { win: w }; } });
        return best;
    }
    function offTarget(e) {
        if (state !== 'off' || document.body.classList.contains('sky-view')) return null;
        if (e.target.closest && e.target.closest('button, a, input, .character, .scene-character, .cp, .signpost, .place-tabs, .ui-button, .sky-link, .polaris, .city-roof .groove')) return null;
        var r = ground.getBoundingClientRect(), roof = Sky.city.roof && Sky.city.roof.getBoundingClientRect();
        if (e.clientY < r.top) return null;
        if (roof && roof.height && e.clientY > roof.top + roof.height * 0.44) return null;      // behind the rooftop
        return windowAt(e.clientX, e.clientY);
    }
    Sky.peeper = { windowAt: windowAt, look: function (t) { lookThrough(t); } };
    // back out of Mel's room with "look through the telescope again" (schizophyllu.me.room/): the telescope comes
    // straight up, aimed at her window
    try {
        if (sessionStorage.getItem('dav-peek-mel') === '1') {
            sessionStorage.removeItem('dav-peek-mel');
            (function wait(n) {
                var fr = frontInfo();
                if (fr && fr.mel && state === 'off') lookThrough({ win: fr.mel, then: melPeek });
                else if (n < 60) setTimeout(function () { wait(n + 1); }, 150);
            })(0);
        }
    } catch (e) {}
    document.addEventListener('click', function (e) {
        var t = offTarget(e);
        if (!t) return;
        e.preventDefault();
        if (t.scene != null) { at = t.scene; t.then = function () { peek(t.scene); }; }
        if (t.mel) t.then = melPeek;
        lookThrough(t);
    });
    document.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse' || state !== 'off') { document.body.classList.remove('city-aim'); return; }
        document.body.classList.toggle('city-aim', !!offTarget(e));
    });
    ui.querySelector('.pu-leave').addEventListener('click', function () { state === 'scene' ? leaveScene() : lower(); });
    ui.querySelector('.pu-up').addEventListener('click', function () { if (state === 'scene') leaveScene(true); lookUp(); });
    document.addEventListener('keydown', function (e) {
        if (state === 'looking' || state === 'scene') {
            if (e.key === 'Escape') { e.stopImmediatePropagation(); state === 'scene' ? leaveScene() : lower(); }
        }
    }, true);
    // the leave button's words follow what you're doing
    var leaveBtn = ui.querySelector('.pu-leave');
    new MutationObserver(function () {
        leaveBtn.textContent = document.body.classList.contains('peep-close') ? 'back to the skyline' : 'lower the telescope';
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    /* ---------------- the scenes, from the folder ---------------- */
    Sky.listFolder(btn.dataset.folder, MEDIA.concat(['txt']), function (files) {
        var caps = {};
        files.forEach(function (f) { if (/\.txt$/i.test(f.name)) caps[f.name.replace(/\.txt$/i, '').toLowerCase()] = f.url; });
        scenes = Sky.sortByName(files.filter(function (f) { return !/\.txt$/i.test(f.name); })).map(function (f) {
            return { file: f, title: Sky.fileTitle(f.name), captionUrl: caps[f.name.replace(/\.[^.]+$/, '').toLowerCase()] };
        });
        placeSpots();
        if (state === 'looking') note.textContent = hintText();
    });
})();

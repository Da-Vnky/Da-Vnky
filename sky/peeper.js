/* =====================================================================
   peeper.js — the city telescope. Look across the lit skyline; some
   windows glow a little warmer. Each one holds a scene from a folder
   (one file = one window). Click one and the telescope zooms right in.
   From the telescope you can also look up at the sky (Polaris, the
   constellations and the day/night player).

       <button class="ui-button telescope-btn" data-folder="content/city/"> … </button>
       <script src="sky/peeper.js"></script>     (after sky/sky.js and sky/ground-city.js)

   Click a window on the skyline (telescope down) and it comes up already aimed at
   it. There are no arrows: you find the rooms by looking.

   MEL'S WINDOW: one building on the front row is abandoned, every window dark,
   except one that's boarded up. Click it: knock, and keep knocking, and the boards
   come off one by one until you're in. Behind the last board: darkness, a wrong
   sound… and something at the window (once a visit), that slowly slides away.
   Then Mel, typing away. She turns round, furious you barged in; you ask Claube
   to fix the place up, he's thrilled to, and it's clean (for the rest of the visit).
   Mira's there too. slots:
       assets/city/mel-room        her room, the mess (a picture, a GIF, or a .webm / .mp4)
       assets/city/mel-room-clean  her room, tidied
       assets/city/mel-board       one board (a plank, wider than tall; it's stretched)
       assets/city/mel-scare       what's waiting behind the boards (a transparent PNG/GIF)
       assets/city/mel-typing      Mel at her desk, her back to you (a GIF can type)
       assets/city/mel-angry       Mel turned round, cross
       assets/city/claube          Claube
       assets/city/mira            Mira
   sounds: assets/sounds/knock, crack, unnerve, scare, typing, sparkle
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
        typing: 'clack clack clack',
        // once she's noticed you. who: mel, claube, mira or you (the words go under the window).
        // then: 'clean' tidies the room as that line's said.
        script: [
            { who: 'mel', say: 'HEY! who said you could just barge in here?!', ms: 2800 },
            { who: 'you', say: 'um\u2026 Claube? could you fix this place up a bit?', ms: 2800 },
            { who: 'claube', say: 'YES!! ON IT!!', ms: 1500 },
            { who: 'mel', say: 'don\u2019t you DARE\u2014', ms: 1300, then: 'clean' },
            { who: 'mira', say: 'oh, it\u2019s lovely.', ms: 2000 },
            { who: 'mel', say: '\u2026fine. it\u2019s nice. now get out.', ms: 2800 }
        ],
        after: 'mel\u2019s room (tidied)'                        // its name once it's clean
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
        '.peep-scene.mel .ps-view > .mel-dark { position: absolute; inset: 0; background: #000; opacity: .82; transition: opacity 1.8s; pointer-events: none; }' +
        '.peep-scene.mel.in .ps-view > .mel-dark { opacity: 0; }' +
        '.peep-scene.mel .ps-view > svg { width: 100%; height: 100%; display: block; }' +
        '.peep-scene.mel.void .ps-view > .mel-dark { opacity: 1 !important; transition: opacity .3s; }' +
        // the stage: her room (the mess, or clean), and the three of them in it
        '.ps-view > .mel-stage { position: absolute; inset: 0; padding: 0; overflow: hidden; max-height: none; }' +
        '.mel-stage .ms-bg { position: absolute; inset: 0; transition: opacity 1.4s; }' +
        '.mel-stage .ms-bg > svg, .mel-stage .ms-bg > img, .mel-stage .ms-bg > video { width: 100%; height: 100%; object-fit: cover; display: block; }' +
        '.mel-stage .ms-bg.clean { opacity: 0; }' +
        '.mel-stage.clean .ms-bg.clean { opacity: 1; } .mel-stage.clean .ms-bg.mess { opacity: 0; }' +
        '.mel-stage .ms-fig { position: absolute; bottom: 6%; opacity: 0; transition: opacity 1.2s; }' +
        '.peep-scene.mel.in .mel-stage .ms-fig { opacity: 1; }' +
        '.mel-stage .ms-art { position: absolute; inset: 0; }' +
        '.mel-stage .ms-art > svg, .mel-stage .ms-art > img { width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; display: block; }' +
        '.mel-stage .ms-fig.mel { left: 55%; bottom: 23%; height: 40%; aspect-ratio: 50 / 100; }' +
        '.mel-stage .ms-fig.claube { left: 33%; height: 30%; aspect-ratio: 40 / 52; }' +
        '.mel-stage .ms-fig.mira { left: 11%; height: 58%; aspect-ratio: 44 / 110; }' +
        '.mel-stage .ms-fig.mel .ms-art.angry { opacity: 0; }' +
        '.mel-stage .ms-fig.mel.turned .ms-art.angry { opacity: 1; } .mel-stage .ms-fig.mel.turned .ms-art.typing { opacity: 0; }' +
        '.mel-stage .ms-fig.mel.typing .ms-art.typing { animation: ms-type .22s steps(2) infinite; }' +
        '@keyframes ms-type { 0% { transform: translateY(0); } 50% { transform: translateY(1.5%) rotate(.6deg); } }' +
        '.mel-stage .ms-fig.mel.turned { animation: ms-turn .35s ease-out; }' +
        '@keyframes ms-turn { 0% { transform: scaleX(.2); } 100% { transform: none; } }' +
        '.mel-stage .ms-fig.claube.thrilled { animation: ms-hop .32s ease-in-out 5 alternate; }' +
        '@keyframes ms-hop { from { transform: translateY(0); } to { transform: translateY(-18%) rotate(4deg); } }' +
        '.mel-stage .ms-say { position: absolute; left: 50%; bottom: calc(100% + 4px); transform: translateX(-50%); width: max-content; max-width: 16em; padding: 4px 10px; border-radius: 10px;' +
            'background: #f6ecd2; color: #2a1d14; font: italic clamp(.7rem, 1.6vh, .95rem)/1.25 "IM Fell English", Georgia, serif; text-align: center; box-shadow: 0 3px 8px rgba(0,0,0,.5);' +
            'opacity: 0; transition: opacity .25s; pointer-events: none; z-index: 2; }' +
        '.mel-stage .ms-say.on { opacity: 1; }' +
        '.mel-stage .ms-fig.mel .ms-say { color: #8a1c10; font-style: normal; font-weight: bold; }' +
        '.mel-stage .ms-fig.mira .ms-say { left: 80%; }' +
        '.mel-stage .ms-magic { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(circle at 50% 60%, rgba(255,250,220,.95), rgba(255,236,170,.4) 40%, transparent 70%); }' +
        '.mel-stage.tidying .ms-magic { animation: ms-magic 1.6s ease-in-out; }' +
        '@keyframes ms-magic { 0% { opacity: 0; } 40% { opacity: 1; } 100% { opacity: 0; } }' +
        '.mel-stage .ms-star { position: absolute; color: #fff2b0; text-shadow: 0 0 6px #fff; font-size: 16px; pointer-events: none; }' +
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
        '.mel-scare.boo { opacity: 1; animation: mel-boo .16s ease-out; }' +
        '@keyframes mel-boo { from { transform: scale(1.5) translateY(10%); } to { transform: none; } }' +
        '.mel-scare.away { opacity: 1; transform: translateX(-125%); transition: transform 3.4s cubic-bezier(.45,0,.55,1); }' +
        '.peep-scene.jolt .ps-frame { animation: mel-jolt .45s linear; }' +
        '@keyframes mel-jolt { 0%, 100% { translate: 0 0; } 20% { translate: -9px 4px; } 40% { translate: 8px -5px; } 60% { translate: -5px 3px; } 80% { translate: 3px -2px; } }' +
        '.mel-flash { position: fixed; inset: 0; z-index: 8; pointer-events: none; background: #fff; opacity: 0; }' +
        '.mel-flash.on { animation: mel-flash .5s ease-out; }' +
        '@keyframes mel-flash { 0% { opacity: .9; } 100% { opacity: 0; } }' +
        '@media (prefers-reduced-motion: reduce) { .peep-scene.jolt .ps-frame, .mel-scare.boo, .mel-stage .ms-fig { animation: none !important; } }' +
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
        melRun++; clearInterval(typer); hoboStop();
        scene.querySelectorAll('.mel-call').forEach(function (b) { b.remove(); });
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
    var MEL_ROOM = '<svg viewBox="0 0 300 236" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
        '<rect width="300" height="236" fill="#2b2430"/><rect y="176" width="300" height="60" fill="#221c24"/>' +
        '<rect x="18" y="26" width="46" height="60" fill="#3b3240"/><rect x="22" y="30" width="38" height="52" fill="#4a3f52" opacity=".7"/>' +      // a poster, peeling
        '<path d="M60 30 l4 8 l-6 0 Z" fill="#2b2430"/>' +
        '<rect x="150" y="104" width="112" height="8" fill="#3a2c24"/><rect x="156" y="112" width="6" height="66" fill="#3a2c24"/><rect x="250" y="112" width="6" height="66" fill="#3a2c24"/>' +   // the desk
        '<rect x="176" y="64" width="54" height="38" rx="3" fill="#15161c"/><rect x="180" y="68" width="46" height="30" fill="#5fa8c8"/>' +                 // the monitor, the only light
        '<path d="M180 68 h46 v30 h-46 Z" fill="url(#mel-glow)" opacity=".6"/><rect x="198" y="102" width="10" height="4" fill="#15161c"/>' +
        '<defs><radialGradient id="mel-glow"><stop offset="0" stop-color="#bfe8ff"/><stop offset="1" stop-color="#5fa8c8" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="mel-spill" cx=".5" cy=".3" r=".6"><stop offset="0" stop-color="rgba(120,190,230,.35)"/><stop offset="1" stop-color="rgba(120,190,230,0)"/></radialGradient></defs>' +
        '<rect x="110" y="40" width="190" height="196" fill="url(#mel-spill)"/>' +
        // (mel herself is her own picture now, in front of this: MEL_TYPING)
        '<rect x="176" y="176" width="46" height="6" fill="#2a2020"/>' +
        // the garbage: bags, pizza boxes, cans, a mattress on the floor
        '<rect x="12" y="186" width="92" height="22" rx="4" fill="#4b4150"/><rect x="12" y="182" width="92" height="8" rx="3" fill="#5a4e60"/>' +
        '<g fill="#17151a"><ellipse cx="42" cy="206" rx="22" ry="16"/><ellipse cx="66" cy="214" rx="18" ry="13"/><ellipse cx="120" cy="208" rx="20" ry="17"/><ellipse cx="276" cy="200" rx="24" ry="20"/><ellipse cx="258" cy="216" rx="17" ry="12"/></g>' +
        '<g fill="#23202a"><path d="M40 190 l-4 -8 l8 2 Z"/><path d="M120 191 l-3 -8 l7 3 Z"/><path d="M276 180 l-3 -9 l8 3 Z"/></g>' +
        '<g fill="#a88a5a"><rect x="126" y="176" width="34" height="6"/><rect x="128" y="170" width="32" height="6"/><rect x="125" y="164" width="34" height="6"/><rect x="230" y="96" width="26" height="5"/></g>' +
        '<g fill="#8a6c44" opacity=".8"><rect x="126" y="176" width="34" height="1.5"/><rect x="128" y="170" width="32" height="1.5"/><rect x="125" y="164" width="34" height="1.5"/></g>' +
        '<g fill="#9aa4ad"><rect x="162" y="96" width="5" height="8" rx="1"/><rect x="238" y="88" width="5" height="8" rx="1"/><rect x="92" y="222" width="8" height="5" rx="1" transform="rotate(-70 96 224)"/><rect x="226" y="224" width="8" height="5" rx="1"/><rect x="146" y="226" width="8" height="5" rx="1" transform="rotate(20 150 228)"/></g>' +
        '<g fill="#c44a3a"><rect x="162" y="96" width="5" height="2"/><rect x="238" y="88" width="5" height="2"/></g>' +
        '<g stroke="#15161c" stroke-width="1.5" fill="none" opacity=".7"><path d="M214 110 q30 10 26 60 q-4 30 20 50"/><path d="M160 108 q-20 40 -60 60"/></g>' +     // cables
        '</svg>';
    // her room once Claube's been at it: the same room, the rubbish gone, a lamp on, the bed made, a plant
    var MEL_CLEAN = '<svg viewBox="0 0 300 236" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
        '<defs><radialGradient id="mc-lamp" cx=".2" cy=".35" r=".7"><stop offset="0" stop-color="rgba(255,214,150,.55)"/><stop offset="1" stop-color="rgba(255,214,150,0)"/></radialGradient>' +
        '<radialGradient id="mc-glow"><stop offset="0" stop-color="#bfe8ff"/><stop offset="1" stop-color="#5fa8c8" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="300" height="236" fill="#5a4a5e"/><rect y="176" width="300" height="60" fill="#6e5a48"/>' +
        '<g stroke="#5e4a3a" stroke-width="1"><path d="M0 190 H300 M0 206 H300 M0 222 H300"/></g>' +
        '<rect x="18" y="26" width="46" height="60" fill="#c49a52"/><rect x="22" y="30" width="38" height="52" fill="#7aa3b8"/><circle cx="41" cy="48" r="8" fill="#f3e6c2"/>' +   // a poster, framed now
        '<rect x="150" y="104" width="112" height="8" fill="#6e4a30"/><rect x="156" y="112" width="6" height="66" fill="#6e4a30"/><rect x="250" y="112" width="6" height="66" fill="#6e4a30"/>' +
        '<rect x="176" y="64" width="54" height="38" rx="3" fill="#15161c"/><rect x="180" y="68" width="46" height="30" fill="#5fa8c8"/><path d="M180 68 h46 v30 h-46 Z" fill="url(#mc-glow)" opacity=".6"/><rect x="198" y="102" width="10" height="4" fill="#15161c"/>' +
        '<rect x="234" y="88" width="16" height="16" rx="3" fill="#b8402a"/><path d="M242 88 q-8 -14 0 -22 q8 8 0 22" fill="#4a8a4a"/>' +          // a potted plant on the desk
        '<rect x="12" y="180" width="96" height="26" rx="4" fill="#9a3b1f"/><rect x="12" y="176" width="96" height="10" rx="4" fill="#e9dcc2"/><rect x="16" y="172" width="26" height="10" rx="4" fill="#f6ecd2"/>' +   // the bed, made
        '<rect x="112" y="120" width="10" height="56" fill="#3a2716"/><path d="M104 108 h26 l-6 -18 h-14 Z" fill="#e8c890"/>' +      // a lamp
        '<rect x="0" y="0" width="300" height="236" fill="url(#mc-lamp)"/>' +
        '<rect x="176" y="176" width="46" height="6" fill="#2a2020"/>' +
        '<ellipse cx="150" cy="222" rx="70" ry="9" fill="#8a3b4a" opacity=".6"/>' +          // a rug
        '</svg>';
    // mel, at the desk with her back to you, hunched in a hoodie (your own: assets/city/mel-typing)
    var MEL_TYPING = '<svg viewBox="166 78 54 104" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
        '<path d="M214 178 v-40 q0 -14 -12 -16 l-18 -2 q-14 2 -14 18 v40 Z" fill="#3f4a5c"/>' +
        '<ellipse cx="196" cy="108" rx="13" ry="15" fill="#2a2228"/><path d="M184 110 q-2 22 6 34 l14 -2 q4 -18 2 -30 Z" fill="#2a2228"/>' +
        '<path d="M183 100 q13 -16 27 0 q-2 -18 -14 -18 q-12 0 -13 18 Z" fill="#4d5a6e"/>' +
        '<path d="M172 150 q-4 -10 6 -14 M214 150 q6 -10 -4 -14" stroke="#3f4a5c" stroke-width="6" fill="none" stroke-linecap="round"/>' +
        '<rect x="176" y="176" width="46" height="6" fill="#2a2020"/></svg>';
    // mel, turned round in her chair, cross (your own: assets/city/mel-angry)
    var MEL_ANGRY = '<svg viewBox="166 78 54 104" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
        '<path d="M214 178 v-40 q0 -14 -12 -16 l-18 -2 q-14 2 -14 18 v40 Z" fill="#3f4a5c"/>' +
        '<path d="M181 104 q-4 30 4 44 l22 0 q8 -14 4 -44 Z" fill="#2a2228"/>' +                                  // hair
        '<ellipse cx="196" cy="108" rx="11" ry="13" fill="#e8c7a8"/>' +
        '<path d="M184 104 q12 -14 24 0 q-2 -16 -12 -16 q-10 0 -12 16 Z" fill="#4d5a6e"/>' +                       // hood
        '<path d="M188 104 l6 3 M204 104 l-6 3" stroke="#2a1410" stroke-width="1.8" stroke-linecap="round"/>' +      // cross eyebrows
        '<circle cx="191.5" cy="108" r="1.5" fill="#2a1410"/><circle cx="200.5" cy="108" r="1.5" fill="#2a1410"/>' +
        '<path d="M191 116 q5 -3 10 0" stroke="#2a1410" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
        '<path d="M172 146 l-6 -14 M214 146 q10 -6 6 -18" stroke="#3f4a5c" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="166" cy="131" r="3" fill="#e8c7a8"/>' +
        '<rect x="176" y="176" width="46" height="6" fill="#2a2020"/></svg>';
    // claube (your own: assets/city/claube)
    var CLAUBE = '<svg viewBox="0 0 40 52" aria-hidden="true">' +
        '<path d="M8 26 Q2 22 3 14 M32 26 Q38 22 37 14" stroke="#a84e2c" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
        '<path d="M13 44 V50 H18 M27 44 V50 H22" stroke="#6e3018" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<ellipse cx="20" cy="30" rx="14" ry="16" fill="#c8643b"/><ellipse cx="15" cy="24" rx="5" ry="6" fill="#e08a5e" opacity=".55"/>' +
        '<path d="M20 14 Q18 6 22 3 M20 14 Q24 8 27 7" stroke="#6e3018" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
        '<circle cx="15" cy="29" r="2.3" fill="#2a1410"/><circle cx="25" cy="29" r="2.3" fill="#2a1410"/><circle cx="15.7" cy="28.3" r=".7" fill="#fff"/><circle cx="25.7" cy="28.3" r=".7" fill="#fff"/>' +
        '<path d="M15 35 Q20 40 25 35 Z" fill="#5a1d14"/></svg>';
    // mira (your own: assets/city/mira)
    var MIRA = '<svg viewBox="0 0 44 110" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
        '<path d="M12 106 V74 M32 106 V74" stroke="#2a2430" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="M8 36 Q22 30 36 36 L40 80 H4 Z" fill="#6a8a6e"/>' +                                             // a long green coat
        '<path d="M8 40 Q2 58 8 70 M36 40 Q42 58 36 70" stroke="#6a8a6e" stroke-width="6" fill="none" stroke-linecap="round"/>' +
        '<path d="M10 22 Q8 40 14 44 H30 Q36 40 34 22 Z" fill="#d9b36a"/>' +                                      // fair hair, to the shoulders
        '<ellipse cx="22" cy="20" rx="9" ry="10.5" fill="#f0d2b0"/>' +
        '<path d="M12 18 Q14 6 22 7 Q31 6 32 18 Q26 12 18 14 Z" fill="#d9b36a"/>' +
        '<circle cx="18.5" cy="20" r="1.4" fill="#2a1410"/><circle cx="25.5" cy="20" r="1.4" fill="#2a1410"/><path d="M19 25 Q22 27.5 25 25" stroke="#2a1410" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>';
    // what's waiting behind the boards (your own: assets/city/mel-scare)
    var SCARE = '<svg viewBox="0 0 120 150" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
        '<path d="M6 150 Q10 96 34 86 Q60 78 86 86 Q112 96 116 150 Z" fill="#141010"/>' +
        '<path d="M22 60 Q14 22 44 12 Q60 2 78 12 Q108 22 98 62 Q104 78 90 92 Q60 108 30 92 Q16 78 22 60 Z" fill="#1c1614"/>' +      // matted hair
        '<path d="M34 56 Q34 30 60 28 Q86 30 86 56 Q88 82 60 90 Q32 82 34 56 Z" fill="#4a3a34"/>' +                                 // a filthy, burnt face
        '<path d="M40 46 Q50 40 56 48 M64 48 Q70 40 80 46" stroke="#140e0c" stroke-width="3" fill="none"/>' +
        '<ellipse cx="49" cy="54" rx="6" ry="4.5" fill="#d9d2c4"/><ellipse cx="71" cy="54" rx="6" ry="4.5" fill="#d9d2c4"/>' +
        '<circle cx="50" cy="54" r="2" fill="#0a0808"/><circle cx="70" cy="54" r="2" fill="#0a0808"/>' +
        '<path d="M46 74 Q60 68 74 74 Q60 82 46 74 Z" fill="#0a0808"/><path d="M50 74 v3 M56 72 v4 M64 72 v4 M70 74 v3" stroke="#8a8070" stroke-width="1.4"/>' +
        '<g fill="#1c1614"><path d="M30 40 L18 20 L32 32 Z M90 40 L104 22 L88 32 Z M44 20 L40 2 L52 16 Z"/></g></svg>';

    var melRun = 0, typer = 0;
    function later(run, ms, fn) { setTimeout(function () { if (run === melRun && scene.classList.contains('mel')) fn(); }, ms); }
    function melClean() { try { return sessionStorage.getItem('mel-clean') === '1'; } catch (e) { return false; } }
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }
    function art(slot, fallback, box) {
        box.innerHTML = fallback;
        Sky.findAsset(slot, function (url) {
            if (!url || !box.isConnected) return;
            if (/\.(webm|mp4)$/i.test(url)) { box.innerHTML = ''; box.appendChild(Sky.makeMedia({ name: url.split('/').pop(), url: url })); }
            else box.innerHTML = '<img alt="" src="' + url + '">';
        });
    }
    function buildStage() {
        var st = document.createElement('div');
        st.className = 'mel-stage' + (melClean() ? ' clean' : '');
        st.innerHTML = '<div class="ms-bg mess"></div><div class="ms-bg clean"></div>' +
            '<div class="ms-fig mira"><div class="ms-art"></div><span class="ms-say"></span></div>' +
            '<div class="ms-fig claube"><div class="ms-art"></div><span class="ms-say"></span></div>' +
            '<div class="ms-fig mel"><div class="ms-art typing"></div><div class="ms-art angry"></div><span class="ms-say"></span></div>' +
            '<div class="ms-magic"></div>';
        art('assets/city/mel-room|assets/city/mel-room.webm|assets/city/mel-room.mp4', MEL_ROOM, st.querySelector('.ms-bg.mess'));
        art('assets/city/mel-room-clean|assets/city/mel-room-clean.webm|assets/city/mel-room-clean.mp4', MEL_CLEAN, st.querySelector('.ms-bg.clean'));
        art('assets/city/mel-typing', MEL_TYPING, st.querySelector('.ms-fig.mel .typing'));
        art('assets/city/mel-angry', MEL_ANGRY, st.querySelector('.ms-fig.mel .angry'));
        art('assets/city/claube', CLAUBE, st.querySelector('.ms-fig.claube .ms-art'));
        art('assets/city/mira', MIRA, st.querySelector('.ms-fig.mira .ms-art'));
        return st;
    }
    function stageSay(who, text, ms) {
        if (who === 'you') { note.textContent = text; return; }
        var b = viewEl.querySelector('.ms-fig.' + who + ' .ms-say');
        if (!b) return;
        b.textContent = text;
        b.classList.add('on');
        clearTimeout(b._t);
        b._t = setTimeout(function () { b.classList.remove('on'); }, ms);
    }
    function typing(on) {
        clearInterval(typer);
        var m = viewEl.querySelector('.ms-fig.mel');
        if (m) m.classList.toggle('typing', on);
        if (!on) return;
        sfx('typing');
        typer = setInterval(function () { if (scene.classList.contains('mel')) sfx('typing'); else clearInterval(typer); }, 2100);
    }
    function tidy() {
        var st = viewEl.querySelector('.mel-stage');
        if (!st) return;
        sfx('sparkle');
        st.classList.add('tidying');
        for (var i = 0; i < 16; i++) {
            var star = document.createElement('span');
            star.className = 'ms-star'; star.textContent = '\u2726';
            star.style.left = (10 + Math.random() * 80) + '%'; star.style.top = (20 + Math.random() * 70) + '%';
            st.appendChild(star);
            star.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.3) rotate(40deg)', offset: .4 }, { opacity: 0, transform: 'scale(.5) translateY(-20px) rotate(90deg)' }],
                { duration: 1200 + Math.random() * 600, delay: Math.random() * 500, fill: 'forwards' }).onfinish = (function (e) { return function () { e.remove(); }; })(star);
        }
        setTimeout(function () { st.classList.add('clean'); }, 600);
        setTimeout(function () { st.classList.remove('tidying'); }, 1700);
        try { sessionStorage.setItem('mel-clean', '1'); } catch (e) {}
        titleEl.textContent = MEL.after;
    }
    // in through the window: (the first time this visit) the dark, the wrong sound, the face; then mel
    // the scare: once per browser (it stays scared until "forget your stay" wipes it), in localStorage
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
                if (!hoboUrl) sfx('scare');
                boo.classList.add('boo');
                scene.classList.remove('jolt'); void scene.offsetWidth; scene.classList.add('jolt');
                var fl = document.querySelector('.mel-flash') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'mel-flash' }));
                fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
            });
            later(run, wait + 1300, function () { boo.classList.remove('boo'); boo.classList.add('away'); });         // and then, slowly, it slides out of sight
            later(run, wait + 4900, function () { boo.remove(); scene.classList.remove('void', 'jolt'); lightsUp(run); });
            return;
        }
        lightsUp(run);
    }
    function lightsUp(run) {
        scene.classList.add('in');
        titleEl.textContent = melClean() ? MEL.after : MEL.inside;
        note.textContent = MEL.typing;
        typing(true);
        if (melClean()) { later(run, 3000, function () { typing(false); note.textContent = ''; }); return; }   // already tidied: she just gets on with it
        later(run, 3200, function () {
            typing(false);
            note.textContent = '';
            var m = viewEl.querySelector('.ms-fig.mel');
            if (m) m.classList.add('turned');
            var t = 400;
            MEL.script.forEach(function (line) {
                later(run, t, function () {
                    stageSay(line.who, line.say, line.ms);
                    if (line.who === 'claube') { var c = viewEl.querySelector('.ms-fig.claube'); if (c) { c.classList.remove('thrilled'); void c.offsetWidth; c.classList.add('thrilled'); } }
                    if (line.then === 'clean') later(run, 500, tidy);
                });
                t += line.ms + 250;
            });
            later(run, t, function () {                                  // and back to it
                note.textContent = '';
                var m2 = viewEl.querySelector('.ms-fig.mel');
                if (m2) m2.classList.remove('turned');
                typing(true);
                later(run, 2500, function () { typing(false); });
            });
        });
    }
    function melPeek() {
        if (state !== 'looking' || !melWin) return;
        state = 'scene';
        applyPan(26, panFor(melWin, 26), 700);
        viewEl.innerHTML = '';
        viewEl.appendChild(buildStage());
        viewEl.insertAdjacentHTML('beforeend', '<div class="mel-dark"></div>');
        titleEl.textContent = melState.off >= MEL.boards ? (melClean() ? MEL.after : MEL.inside) : 'a boarded-up window';
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

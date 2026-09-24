/* =====================================================================
   peeper.js — the city telescope. Look across the lit skyline; some
   windows glow a little warmer. Each one holds a scene from a folder
   (one file = one window). Click one and the telescope zooms right in.
   From the telescope you can also look up at the sky (Polaris, the
   constellations and the day/night player).

       <button class="ui-button telescope-btn" data-folder="content/city/"> … </button>
       <script src="sky/peeper.js"></script>     (after sky/sky.js and sky/ground-city.js)

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
        '.peep-ui .pu-step { position: absolute; top: 48%; width: 44px; height: 44px; margin-top: -22px; border-radius: 50%;' +
            'background: rgba(234,220,185,.9); color: #3a2716; font-size: 1.4rem; font-style: normal; line-height: 44px; box-shadow: 0 4px 10px rgba(0,0,0,.4); }' +
        '.peep-ui .pu-step:hover { background: #eadcb9; }' +
        '.peep-ui .pu-prev { left: calc(50% - min(45vh, 46vw) + 14px); }' +
        '.peep-ui .pu-next { left: calc(50% + min(45vh, 46vw) - 58px); }' +
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
        '<button type="button" class="pu-step pu-prev" aria-label="previous window">‹</button>' +
        '<button type="button" class="pu-step pu-next" aria-label="next window">›</button>' +
        '<div class="pu-note"></div>';
    document.body.appendChild(ui);
    var note = ui.querySelector('.pu-note');

    var scene = document.createElement('div');
    scene.className = 'peep-scene';
    scene.innerHTML = '<div class="ps-frame"><div class="ps-view"></div><div class="ps-curtain l"></div><div class="ps-curtain r"></div><div class="ps-title"></div></div>';
    document.body.appendChild(scene);
    var viewEl = scene.querySelector('.ps-view'), titleEl = scene.querySelector('.ps-title');

    var scenes = [], chosen = [], at = 0, state = 'off';
    var Z = 2.8, pan = { x: 0, y: 0 };

    function frontInfo() { return Sky.city.front; }
    // pick one lit window per scene, spread across the width of the skyline
    function placeSpots() {
        spots.innerHTML = '';
        chosen = [];
        var fr = frontInfo();
        if (!fr || !scenes.length) return;
        frontSvg = fr.svg;
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
            s.addEventListener('focus', function () { if (state === 'looking') { at = i; aim(i); note.textContent = sc.title; } });
            spots.appendChild(s);
        });
    }
    Sky.city.onBuild = placeSpots;
    Sky.onFrame(function () { if (frontSvg) spots.style.transform = frontSvg.style.transform; });

    function hintText() {
        if (!scenes.length) return 'no windows lit yet. scenes go in content/city/';
        return (fine.matches ? 'point where you want to look: the further from the middle, the faster it turns.' : 'drag to look around.') +
            ' the brightest windows have something to see (' + scenes.length + ')';
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
        if (ms !== 0) holdUntil = performance.now() + (ms || 1100);
        ground.style.transition = ms === 0 ? 'none' : 'transform ' + (ms || 1100) + 'ms cubic-bezier(.3,.6,.2,1), opacity .9s';
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
        pan = clampPan(panFor(chosen[i], Z));
        applyPan(Z, pan, ms);
    }

    /* ---------------- moving the view ----------------
       with a mouse: no clicking needed. point where you want to look: the telescope turns
       that way, faster the further your pointer is from the middle of the lens (and not
       at all near the middle, so you can rest there). on a touch screen: drag to look around. */
    var REST = 0.14;              // this close to the middle (1 = the rim), it stays still
    var PUSH = 340;               // px per second with the pointer at the rim or beyond
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
            k = Math.pow(k, 1.25);                               // slow near the middle, building toward the rim
            if (dist > 0) { tx = dx / dist * PUSH * k; ty = dy / dist * PUSH * k; }
        }
        // ease into and out of the movement, like turning a heavy brass telescope
        var ease = Math.min(1, dt * 4);
        vel.x += (tx - vel.x) * ease; vel.y += (ty - vel.y) * ease;
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
        if (e.pointerType === 'mouse' && fine.matches) return;            // the mouse steers by the rim instead
        if (state !== 'looking' || e.button !== 0 || e.target.closest('button, a, .signpost, .polaris')) return;
        drag = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, id: e.pointerId };
        dragged = false;
    });
    document.addEventListener('touchmove', function (e) { if (state === 'looking' || state === 'scene') e.preventDefault(); }, { passive: false });
    document.addEventListener('pointercancel', function () { drag = null; document.body.classList.remove('peep-dragging'); });
    document.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!dragged && Math.hypot(dx, dy) < 4) return;
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
    function lookThrough() {
        if (state !== 'off') return;
        state = 'looking';
        Z = vw() < 620 ? 3.4 : 2.8;
        document.body.classList.add('peep-view');
        document.documentElement.classList.add('peep-touch');
        Sky.setTime(EVENING, 1400);                      // night falls, and stays when you lower it
        placeSpots();
        note.textContent = hintText();
        requestAnimationFrame(function () { chosen.length ? aim(at, 1300) : applyPan(Z, pan = clampPan({ x: 0, y: 0 }), 1300); });
        // don't start pushing until the zoom-in has settled and the pointer has moved
        aimPt = null;
    }
    function lower() {
        if (state === 'off') return;
        if (state === 'scene') leaveScene(true);
        state = 'off';
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
        applyPan(deep, panFor(chosen[i], deep), 1000);    // rush in toward the window
        fillScene(i);
        scene.classList.remove('drawn');
        document.body.classList.add('peep-close');
        document.body.classList.remove('peep-view');
        setTimeout(function () { if (state === 'scene') scene.classList.add('drawn'); }, 1100);   // the curtains part
        note.textContent = scenes[i].title;
    }
    function leaveScene(quiet) {
        scene.classList.remove('drawn');
        document.body.classList.remove('peep-close');
        viewEl.querySelectorAll('video').forEach(function (v) { v.pause(); });
        if (quiet) return;
        state = 'looking';
        document.body.classList.add('peep-view');
        aim(at, 1000);
        note.textContent = scenes[at].title;
    }
    function step(d) {
        if (!scenes.length) return;
        if (state === 'scene') {                          // curtains close, the next window, curtains open
            scene.classList.remove('drawn');
            var next = (at + d + scenes.length) % scenes.length;
            setTimeout(function () {
                if (state !== 'scene') return;
                at = next;
                fillScene(at);
                applyPan(26, panFor(chosen[at], 26), 0);
                setTimeout(function () { if (state === 'scene') scene.classList.add('drawn'); }, 250);
            }, 700);
            return;
        }
        at = (at + d + scenes.length) % scenes.length;
        aim(at, 900);
        note.textContent = scenes[at].title;
    }

    btn.addEventListener('click', lookThrough);
    ui.querySelector('.pu-leave').addEventListener('click', function () { state === 'scene' ? leaveScene() : lower(); });
    ui.querySelector('.pu-up').addEventListener('click', function () { if (state === 'scene') leaveScene(true); lookUp(); });
    ui.querySelector('.pu-prev').addEventListener('click', function () { step(-1); });
    ui.querySelector('.pu-next').addEventListener('click', function () { step(1); });
    document.addEventListener('keydown', function (e) {
        if (state === 'looking' || state === 'scene') {
            if (e.key === 'Escape') { e.stopImmediatePropagation(); state === 'scene' ? leaveScene() : lower(); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
            else if (e.key === 'Enter' && state === 'looking' && document.activeElement === document.body) { peek(at); }
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
        if (state === 'looking') { placeSpots(); note.textContent = hintText(); aim(at, 900); }
    });
})();

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

   SKIZY'S WINDOW: one building on the front row is abandoned, every window dark,
   except one that's boarded up. Click it: knock, and keep knocking, and the boards
   come off one by one until you're in. Behind the last board it's dark for a
   moment (SKIZY.dark_secs), then the room fades up out of the black: skizy's room, her
   own (schizophyllu.me.room/, she made it), there through the glass. "[ climb in ]"
   and you're in it, on its own page; its "back to the rooftop" brings you back here.
   (there used to be a jump scare in the dark, before reset 3 became ingestion: gone.)
   slots:
       assets/city/skizy-board       one board (a plank, wider than tall; it's stretched)
   sounds: assets/sounds/knock, crack
   the words (and who says them): SKIZY near the top of this file. on your own skyline art, say where her
   window is: "skizy": [x%, y%, w%, h%] in assets/city/skyline-front-windows.json

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
    var SKIZY = {
        title: 'skizy\u2019s room',
        boards: 5,                                  // how many boards to pull off
        first: 'knock knock\u2026 nobody answers. try again?',
        more: ['something shifts behind the boards.', 'a board splinters.', 'the wood gives a little more.', 'one more\u2026', ''],
        inside: 'skizy\u2019s room',
        dark_secs: 1.5,                                    // how long it's dark in there after the last board, before the room fades up
        lit: 'something inside is lit.',
        climb: '[ climb in ]'
    };

    // (its look is in sky/css/peeper.css, linked from each page's head)

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

    var scenes = [], chosen = [], at = 0, state = 'off', skizyWin = null;
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
        skizyWin = fr.skizy || null;
        if (skizyWin) {
            var m = document.createElement('button');
            m.type = 'button';
            m.className = 'peep-spot skizy';
            m.style.left = (skizyWin.x - 0.5) + 'px'; m.style.top = (skizyWin.y - 0.5) + 'px';
            m.style.width = (skizyWin.w + 1) + 'px'; m.style.height = (skizyWin.h + 1) + 'px';
            m.setAttribute('aria-label', 'a boarded-up window');
            m.addEventListener('click', function (e) { e.stopPropagation(); if (!dragged) skizyPeek(); });
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
        var wasSkizy = scene.classList.contains('skizy');
        skizyRun++;
        viewEl.querySelectorAll('.skizy-live').forEach(function (b) { b.remove(); });   // (her room, live: closed, not left running out of sight)
        scene.querySelectorAll('.skizy-climb').forEach(function (b) { b.remove(); });
        scene.classList.remove('climbing');
        document.body.classList.remove('peep-skizy');
        scene.classList.remove('drawn', 'skizy', 'in', 'void');
        scene.querySelectorAll('.skizy-planks').forEach(function (b) { b.remove(); });
        document.body.classList.remove('peep-close');
        viewEl.querySelectorAll('video').forEach(function (v) { v.pause(); });
        if (quiet) return;
        state = 'looking';
        document.body.classList.add('peep-view');
        if (wasSkizy && skizyWin) { aimAt(skizyWin, 650); note.textContent = hintText(); }
        else { aim(at, 650); note.textContent = scenes[at] ? scenes[at].title : hintText(); }
    }
    btn.addEventListener('click', function () { lookThrough(); });

    /* ---------------- skizy's window ---------------- */
    var skizyState = { knocks: 0, off: 0 };
    try { if (sessionStorage.getItem('skizy-in') === '1') { skizyState.off = SKIZY.boards; document.body.classList.add('skizy-in'); } } catch (e) {}
    var skizyRun = 0;
    function later(run, ms, fn) { setTimeout(function () { if (run === skizyRun && scene.classList.contains('skizy')) fn(); }, ms); }
    var sfx = Sky.sfx;
    function art(slot, fallback, box) {
        box.innerHTML = fallback;
        box.dataset.slot = slot;                                      // (where it sits: the asset manager's map)
        Sky.findAsset(slot, function (url) {
            if (!url) return;
            if (/\.(webm|mp4)$/i.test(url)) { box.innerHTML = ''; box.appendChild(Sky.makeMedia({ name: url.split('/').pop(), url: url })); }
            else box.innerHTML = '<img alt="" src="' + url + '">';
        });
    }
    // her room, live: skizy's own (schizophyllu.me.room/, with ?peek: no telescope, no sound, nothing to click),
    // scaled to fill the window
    var ROOM = 'schizophyllu.me.room/index.html';
    function buildRoom() {
        var box = document.createElement('div');
        box.className = 'skizy-live';
        box.setAttribute('role', 'button');
        box.setAttribute('aria-label', 'climb in through the window');
        var f = document.createElement('iframe');
        f.title = 'skizy\u2019s room'; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true');
        f.src = ROOM + '?peek';
        box.appendChild(f);
        function fit() { var k = Math.max(box.clientWidth / 1600, box.clientHeight / 900) || 0.3; f.style.transform = 'translate(-50%, -50%) scale(' + k.toFixed(4) + ')'; }
        requestAnimationFrame(fit);
        box._fit = fit;
        box.addEventListener('click', climbIn);
        return box;
    }
    window.addEventListener('resize', function () { var b = viewEl.querySelector('.skizy-live'); if (b) b._fit(); });
    // in through the window: into her room, for real (its own page; its "back to the rooftop" brings them back here)
    function climbIn(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!scene.classList.contains('in') || scene.classList.contains('climbing')) return;
        scene.classList.add('climbing');
        sfx('step', { size: 0.5 }); setTimeout(function () { sfx('step', { size: 0.6 }); }, 380);
        var t = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'skizy-through' }));
        requestAnimationFrame(function () { t.classList.add('on'); });
        setTimeout(function () { location.href = ROOM + '?from=dav-nky'; }, 1100);
    }
    // in through the window: a moment's dark, and then her room fades up out of the black
    function skizyScene(fresh) {
        var run = ++skizyRun;
        scene.classList.add('void');
        note.textContent = '';
        later(run, fresh ? SKIZY.dark_secs * 1000 : 250, function () {
            scene.classList.remove('void');                             // (.skizy-dark fades out over the room: see the css above)
            lightsUp(run);
        });
    }
    function lightsUp(run) {
        var room = viewEl.querySelector('.skizy-live');
        if (!room) { room = buildRoom(); viewEl.insertBefore(room, viewEl.firstChild); }
        scene.classList.add('in');
        titleEl.textContent = SKIZY.inside;
        note.textContent = SKIZY.lit;
        var go = scene.querySelector('.skizy-climb');
        if (!go) {
            go = document.createElement('button');
            go.type = 'button';
            go.className = 'skizy-climb';
            go.textContent = SKIZY.climb;
            go.addEventListener('click', climbIn);
            scene.querySelector('.ps-frame').appendChild(go);
        }
    }
    function skizyPeek() {
        if (state !== 'looking' || !skizyWin) return;
        state = 'scene';
        applyPan(26, panFor(skizyWin, 26), 700);
        viewEl.innerHTML = '';
        viewEl.appendChild(buildRoom());                                 // (behind the boards and the dark, till it's lit)
        viewEl.insertAdjacentHTML('beforeend', '<div class="skizy-dark"></div>');
        titleEl.textContent = skizyState.off >= SKIZY.boards ? SKIZY.inside : 'a boarded-up window';
        scene.classList.add('skizy');
        scene.classList.remove('in', 'void');
        var frame = scene.querySelector('.ps-frame'), wrap = document.createElement('div');
        wrap.className = 'skizy-planks';
        wrap.setAttribute('role', 'button');
        wrap.setAttribute('aria-label', 'knock on the boards');
        var tilts = [-6, 4, -3, 7, -5, 3, -4];
        for (var b = 0; b < SKIZY.boards; b++) {
            var d = document.createElement('div');
            d.className = 'skizy-board' + (b < skizyState.off ? ' gone' : '');
            d.style.top = (6 + b * (84 / SKIZY.boards)) + '%';
            d.style.transform = 'rotate(' + tilts[b % tilts.length] + 'deg)';
            d.dataset.asset = 'assets/city/skizy-board';
            wrap.appendChild(d);
        }
        if (skizyState.off >= SKIZY.boards) wrap.style.pointerEvents = 'none';
        frame.appendChild(wrap);
        Sky.fillAssets(wrap);
        wrap.addEventListener('click', knockKnock);
        document.body.classList.add('peep-close', 'peep-skizy');
        document.body.classList.remove('peep-view');
        note.textContent = skizyState.off >= SKIZY.boards ? '' : 'click the boards to knock';
        if (skizyState.off >= SKIZY.boards) setTimeout(function () { if (scene.classList.contains('skizy')) skizyScene(false); }, 750);
    }
    function knockKnock() {
        if (!scene.classList.contains('skizy') || skizyState.off >= SKIZY.boards) return;
        var boards = scene.querySelectorAll('.skizy-board');
        boards.forEach(function (b) { if (!b.classList.contains('gone')) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } });
        skizyState.knocks++;
        if (skizyState.knocks === 1) {                                // the first time, just a knock
            Sky.sfx('knock');
            note.textContent = SKIZY.first;
            return;
        }
        var board = boards[skizyState.off];                            // then a board comes off with each one, from the top
        Sky.sfx('crack');
        var fall = (skizyState.off % 2 ? 1 : -1);
        board.style.transform = 'translate(' + (fall * 30) + '%, 260%) rotate(' + (fall * (40 + Math.random() * 30)) + 'deg)';
        board.classList.add('gone');
        skizyState.off++;
        note.textContent = SKIZY.more[Math.min(SKIZY.more.length - 1, skizyState.off - 1)] || '';
        if (skizyState.off >= SKIZY.boards) {                            // in
            try { sessionStorage.setItem('skizy-in', '1'); } catch (e) {}
            document.body.classList.add('skizy-in');
            scene.querySelector('.skizy-planks').style.pointerEvents = 'none';
            setTimeout(function () { if (scene.classList.contains('skizy')) skizyScene(true); }, 700);
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
        if (skizyWin && d(skizyWin) < 16 && d(skizyWin) < bd) { bd = d(skizyWin); best = { win: skizyWin, skizy: true }; }
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
        if (t.skizy) t.then = skizyPeek;
        lookThrough(t);
    });
    document.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse' || state !== 'off') { document.body.classList.remove('city-aim'); return; }
        document.body.classList.toggle('city-aim', !!offTarget(e));
    });
    ui.querySelector('.pu-leave').addEventListener('click', function () { state === 'scene' ? leaveScene() : lower(); });
    ui.querySelector('.pu-up').addEventListener('click', function () { if (state === 'scene') leaveScene(true); lookUp(); });
    Sky.escape(function () { return state === 'looking' || state === 'scene'; }, function () { state === 'scene' ? leaveScene() : lower(); });
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

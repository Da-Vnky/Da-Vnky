/* =====================================================================
   ground-sea.js — Hokusai-style paper-cut sea, with a ship you can pick up.
   Load after sky/sky.js.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var sfx = Sky && Sky.sfx;

    // (its look is in sky/css/ground-sea.css, linked from each page's head)

    /* ---------------- markup ---------------- */
    // each wave: data-base = trough line (fraction of the sea's height from the top),
    // data-h = crest height (fraction), data-w = crest width in px
    function wave(n, base, h, w, off) {
        return '<svg class="layer wave wave-' + n + '" data-base="' + base + '" data-h="' + h + '" data-w="' + w + '" data-off="' + off + '" data-seed="' + n + '">' +
               '<path class="body" fill="currentColor"/><path class="lines"/><path class="foam"/></svg>';
    }
    var sea = document.createElement('div');
    sea.className = 'ground ground-sea';
    sea.setAttribute('aria-hidden', 'true');
    sea.innerHTML =
        wave(1, .36, .15, 135, 40) +
        // the dock (drawn by buildDock below): pilings, deck, bollard, lamp, and the signpost's post
        '<svg class="dock" data-slot="assets/sea/dock">' +
            '<path class="d-shade"/><path class="d-wood"/><path class="d-light"/><path class="d-rope"/>' +
            '<defs><radialGradient id="dock-glow"><stop offset="0" stop-color="rgba(255,205,120,.6)"/><stop offset="1" stop-color="rgba(255,205,120,0)"/></radialGradient></defs>' +
            '<circle class="d-glow" fill="url(#dock-glow)"/><path class="d-flame"/>' +
        '</svg>' +
        // the letters board on the dock (sky/letters.js fills it): assets/sea/letter-board
        '<div class="dock-board" data-asset="assets/sea/letter-board" role="button" tabindex="0" aria-label="the letters board">' +
            '<svg class="placeholder" viewBox="0 0 72 86" aria-hidden="true">' +
                '<rect x="9" y="34" width="6" height="52" fill="#4a2f1c"/><rect x="57" y="34" width="6" height="52" fill="#4a2f1c"/>' +
                '<path d="M0 14 L36 2 L72 14 L72 18 L0 18 Z" fill="#5a3a24"/>' +
                '<rect x="3" y="16" width="66" height="42" rx="2" fill="#6e4a30"/><rect x="7" y="20" width="58" height="34" fill="#b8875a"/>' +
                '<g fill="#efe3c6"><rect x="12" y="23" width="15" height="20" transform="rotate(-6 19 33)"/><rect x="30" y="22" width="14" height="19" transform="rotate(4 37 31)"/>' +
                    '<rect x="47" y="25" width="14" height="19" transform="rotate(-3 54 34)"/></g>' +
                '<g fill="#9a3b1f"><circle cx="19" cy="24" r="1.6"/><circle cx="37" cy="23" r="1.6"/><circle cx="54" cy="26" r="1.6"/></g>' +
                '<g stroke="#8a7550" stroke-width=".8"><path d="M14 30h10M14 33h9M14 36h10M32 28h9M32 31h10M32 34h8M49 31h10M49 34h9M49 37h10"/></g>' +
            '</svg><span class="db-count"></span><span class="db-hint">the letters</span></div>' +
        // friends on the dock who dance when music plays: assets/sea/crab, assets/sea/gull
        '<div class="groove dock-crab" data-groove="crab" data-asset="assets/sea/crab"></div>' +
        '<div class="groove dock-gull" data-groove="gull" data-asset="assets/sea/gull"></div>' +
        wave(2, .53, .15, 155, 110) +
        // the traveller: rides in the ship, steps onto the dock at nightfall. they sit in front of
        // the second row of waves (so they're never lost behind it climbing aboard) and behind the
        // ship's hull (so it hides their legs when they're aboard).
        // put your own at assets/characters/sea.(gif|png|webp|svg)
        '<div class="character sea-char" data-asset="assets/characters/sea" data-say="ahoy! where to?" aria-label="the traveller"></div>' +
        // slot: assets/sea/ship (a 1200 x 1000 canvas, facing right, keel about 90% down; ship-glow = lit at night)
        '<svg class="ship" viewBox="0 0 120 100" data-slot="assets/sea/ship"><g class="hull" fill="currentColor">' +
            '<path d="M8 72 L112 72 L98 90 L22 90 Z"/><rect x="58" y="10" width="3" height="62"/>' +
            '<path d="M62 14 C 84 26, 90 48, 86 66 L62 66 Z"/><path d="M57 20 C 40 32, 36 50, 40 66 L57 66 Z"/>' +
            '<path d="M61 8 L76 12 L61 16 Z"/>' +
        '</g>' +
        // (after reset 2: the anchor that keeps it from being lifted high. yours: assets/sea/anchor, about 1:1.3)
        '<g class="ship-anchor"><path d="M101 70 Q106 84 104 100" fill="none" stroke="#3a3530" stroke-width="1.8" stroke-dasharray="2.6 1.2"/>' +
            '<g class="anc-art" fill="#2e2e34" stroke="#18181c" stroke-width=".6"><circle cx="104" cy="75.5" r="2.4" fill="none" stroke-width="1.6" stroke="#2e2e34"/><rect x="102.8" y="77.5" width="2.6" height="14"/><rect x="99" y="80" width="10" height="2.2"/>' +
            '<path d="M96 88 Q97 96 104 97 Q111 96 112 88 L109.5 89.5 Q108.5 93.5 104 94 Q99.5 93.5 98.5 89.5 Z"/></g></g>' +
        '</svg>' +
        wave(3, .71, .14, 145, 75) +
        wave(4, .87, .12, 125, 20);
    document.body.appendChild(sea);

    var splashLayer = document.createElement('div');
    splashLayer.className = 'splash-layer';
    splashLayer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(splashLayer);

    /* ---------------- the waves ---------------- */
    // each crest: long back slope rising into a lip that curls forward and hooks
    // back under itself, capped with clawed foam, then a steep front face.
    // drawn in real pixels so they never stretch on wide or narrow screens.
    function rand(i, seed) {
        var x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
        return x - Math.floor(x);
    }
    function crest(x0, w, B, H) {
        function pt(fx, fy) { return (x0 + w * fx).toFixed(1) + ' ' + (B - H * fy).toFixed(1); }
        return {
            body:
                'C ' + pt(.25, 0)    + ' ' + pt(.40, .55) + ' ' + pt(.55, .92) +
               ' C ' + pt(.60, 1.02) + ' ' + pt(.74, 1.06) + ' ' + pt(.82, .90) +
               ' C ' + pt(.88, .77)  + ' ' + pt(.83, .58) + ' ' + pt(.74, .62) +
               ' C ' + pt(.70, .64)  + ' ' + pt(.68, .54) + ' ' + pt(.73, .49) +
               ' C ' + pt(.79, .42)  + ' ' + pt(.86, .10) + ' ' + pt(1, 0) + ' ',
            lines:
                'M ' + pt(.20, .06) + ' C ' + pt(.33, .10) + ' ' + pt(.45, .46) + ' ' + pt(.57, .72) +
               ' M ' + pt(.34, .05) + ' C ' + pt(.44, .10) + ' ' + pt(.53, .34) + ' ' + pt(.62, .48) + ' ',
            foam:
                'M ' + pt(.50, .82) +
               ' C ' + pt(.58, 1.00) + ' ' + pt(.74, 1.06) + ' ' + pt(.82, .90) +
               ' C ' + pt(.88, .77)  + ' ' + pt(.83, .58) + ' ' + pt(.74, .62) +
               ' L ' + pt(.78, .70) + ' L ' + pt(.72, .72) + ' L ' + pt(.75, .80) +
               ' L ' + pt(.68, .80) + ' L ' + pt(.67, .88) + ' L ' + pt(.61, .86) +
               ' L ' + pt(.57, .92) + ' Z '
        };
    }

    var waves = Array.prototype.slice.call(sea.querySelectorAll('.wave'));
    function buildWaves() {
        var narrow = window.innerWidth < 620 ? 0.7 : 1;
        waves.forEach(function (svg) {
            var Wpx = svg.clientWidth, S = svg.clientHeight - 12;
            var B = S * +svg.dataset.base, H = S * +svg.dataset.h,
                w = +svg.dataset.w * narrow, off = +svg.dataset.off * narrow, seed = +svg.dataset.seed;
            var body = 'M ' + (-off) + ' ' + B + ' ', lines = '', foam = '';
            for (var i = 0, x = -off; x < Wpx; i++, x += w) {
                var c = crest(x, w, B, H * (0.8 + 0.4 * rand(i, seed)));
                body += c.body; lines += c.lines; foam += c.foam;
            }
            body += 'L ' + (x + 10) + ' ' + (S + 12) + ' L ' + (-off - 10) + ' ' + (S + 12) + ' Z';
            svg.setAttribute('viewBox', '0 0 ' + Wpx + ' ' + (S + 12));
            svg.querySelector('.body').setAttribute('d', body);
            svg.querySelector('.lines').setAttribute('d', lines);
            svg.querySelector('.foam').setAttribute('d', foam);
        });
    }
    buildWaves();
    window.addEventListener('resize', buildWaves);
    // slots: assets/sea/wave-1 (furthest back) … assets/sea/wave-4 (nearest)
    waves.forEach(function (svg, i) {
        var name = 'assets/sea/wave-' + (i + 1);
        svg.dataset.slot = name;
        Sky.findAsset(name, function (url) {
            if (!url) return;
            svg.classList.add('has-art');
            svg.style.backgroundImage = 'url("' + url + '")';
        });
    });
    // slot: the ship
    Sky.svgArt(sea.querySelector('.ship .hull'), 'assets/sea/ship', [0, 0, 120, 100]);

    /* ---------------- the dock, on the right ---------------- */
    var dock = sea.querySelector('.dock'), dockAt = null;
    // slot: assets/sea/dock. your dock is anchored bottom-right at the sea's full height;
    // draw the top of the deck 30% down from the top of the picture, running off the right edge.
    // (dock-glow fades in at dusk: a lit lamp.) the signpost's post is still drawn for you.
    var dockArt = null;
    Sky.findAsset('assets/sea/dock', function (url, img) {
        if (!url) return;
        dockArt = { url: url, ratio: img.naturalWidth / img.naturalHeight || 1.6 };
        Sky.findAsset(url.replace(/\.\w+$/, '') + '-glow', function (g) { dockArt.glow = g; buildDock(); });
        dock.classList.add('has-art');
        buildDock();
        Sky.refresh();
    });
    function R(x, y, w, h) { return 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'h' + w.toFixed(1) + 'v' + h.toFixed(1) + 'h' + (-w).toFixed(1) + 'Z'; }
    function buildDock() {
        var W = sea.clientWidth, S = sea.clientHeight, small = W < 620;
        var dw = small ? 200 : 360, x0 = W - dw, y = S * 0.30, dh = small ? 11 : 14;
        var wood = '', shade = '', light = '', rope = '';
        dock.querySelectorAll('image').forEach(function (im) { im.remove(); });
        if (dockArt) {
            var aw = S * dockArt.ratio;
            dw = aw - 20; x0 = W - aw;
            [[dockArt.url, 'art'], [dockArt.glow, 'art glow-layer']].forEach(function (a) {
                if (!a[0]) return;
                var im = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                im.setAttribute('href', a[0]); im.setAttribute('class', a[1]);
                im.setAttribute('x', x0); im.setAttribute('y', 0); im.setAttribute('width', aw); im.setAttribute('height', S);
                im.setAttribute('preserveAspectRatio', 'none');
                dock.insertBefore(im, dock.querySelector('.d-wood'));
            });
            dock.querySelector('.d-flame').setAttribute('d', '');
            dock.querySelector('.d-glow').setAttribute('r', 0);
        } else {

            // pilings and cross-braces (mostly hidden by the front waves)
            var step = small ? 52 : 70, xs = [];
            for (var x = x0 + 12; x < W + 20; x += step) {
                xs.push(x);
                shade += R(x, y + dh - 2, small ? 10 : 13, S - y + 20);
        }
        for (var i = 0; i + 1 < xs.length; i += 2) {
            var a = xs[i] + 6, b = xs[i + 1] + 6, top = y + dh + 6, bot = y + dh + (small ? 40 : 56);
            shade += 'M' + a + ' ' + top + 'L' + (a + 4) + ' ' + top + 'L' + (b + 4) + ' ' + bot + 'L' + b + ' ' + bot + 'Z';
            shade += 'M' + b + ' ' + top + 'L' + (b + 4) + ' ' + top + 'L' + (a + 4) + ' ' + bot + 'L' + a + ' ' + bot + 'Z';
        }

        // deck, with plank seams and a lighter top edge
        wood  += R(x0, y, dw + 20, dh);
        shade += R(x0, y + dh - 3, dw + 20, 3);
        light += R(x0, y, dw + 20, 2.5);
        for (var sx = x0 + 22; sx < W; sx += 22) shade += R(sx, y + 2.5, 1.2, dh - 5);

        // bollard with a mooring rope
        var bx = x0 + (small ? 28 : 40), bh = small ? 14 : 20;
        wood  += R(bx, y - bh, 12, bh + 1);
        shade += R(bx - 2, y - bh - 4, 16, 5);
        rope  += 'M' + (bx + 6) + ' ' + (y - bh + 6) + ' C' + (bx - 14) + ' ' + (y + 4) + ' ' + (bx - 26) + ' ' + (y + 30) + ' ' + (bx - 22) + ' ' + (y + 64);
        rope  += 'M' + (bx + 26) + ' ' + (y - 3) + ' a9 4 0 1 0 18 0 a9 4 0 1 0 -18 0 M' + (bx + 29) + ' ' + (y - 4) + ' a6 2.5 0 1 0 12 0';

        // lamp post at the end of the dock
        var lx = x0 + (small ? 8 : 12), lh = small ? 70 : 100, ly = y - lh;
        wood  += R(lx, ly, 6, lh);
        wood  += R(lx, ly, small ? 18 : 24, 4);
        var kx = lx + (small ? 12 : 17), ky = ly + 4;
        shade += R(kx - 1, ky, 2, 5);
        wood  += 'M' + (kx - 9) + ' ' + (ky + 5) + 'h18l-3 4h-12z';
        shade += R(kx - 8, ky + 9, 2, 18) + R(kx + 6, ky + 9, 2, 18) + R(kx - 9, ky + 27, 18, 3);
        dock.querySelector('.d-flame').setAttribute('d', R(kx - 6, ky + 9, 12, 18));
        var g = dock.querySelector('.d-glow');
        g.setAttribute('cx', kx); g.setAttribute('cy', ky + 18); g.setAttribute('r', small ? 40 : 60);
        }

        // on wide screens the signpost's post stands on the dock, reaching up to the planks
        if (W > 1100) {
            var vh = window.innerHeight, pTop = vh * 0.27 - 26 - (vh - S), px = W - 68;
            wood  += 'M' + px + ' ' + (y + 1) + 'V' + (pTop + 9) + 'a9 9 0 0 1 18 0V' + (y + 1) + 'Z';
            shade += R(px + 13, pTop + 9, 5, y - pTop - 9);
            for (var ry = pTop + 30; ry < y - 10; ry += 30) shade += R(px, ry, 18, 1.2);
        }

        dockAt = { W: W, S: S, x0: x0, dw: dw, deck: y, small: small, post: W > 1100 ? W - 68 : null };
        // the letters board stands on the deck
        var lb = sea.querySelector('.dock-board');
        lb.style.left = (x0 + dw * (small ? 0.3 : 0.34)) + 'px'; lb.style.bottom = (S - y - 1) + 'px';
        // the crab strolls the deck; the gull sits on the bollard (or the deck, on a dock of your own)
        var crab = sea.querySelector('.dock-crab'), gull = sea.querySelector('.dock-gull');
        crab.style.left = (x0 + dw * 0.58) + 'px'; crab.style.bottom = (S - y - 2) + 'px';
        if (dockArt) { gull.style.left = (x0 + dw * 0.3) + 'px'; gull.style.bottom = (S - y - 2) + 'px'; }
        else { gull.style.left = (x0 + (small ? 28 : 40) - 12) + 'px'; gull.style.bottom = (S - y + (small ? 14 : 20) + 3) + 'px'; }
        dock.setAttribute('viewBox', '0 0 ' + W + ' ' + S);
        dock.querySelector('.d-wood').setAttribute('d', wood);
        dock.querySelector('.d-shade').setAttribute('d', shade);
        dock.querySelector('.d-light').setAttribute('d', light);
        dock.querySelector('.d-rope').setAttribute('d', rope);
    }
    buildDock();
    window.addEventListener('resize', buildDock);

    function paintDock(p) {
        var dusk = Sky.smooth(Sky.ramp(p, 0.3, 0.85)), lit = Sky.smooth(Sky.ramp(p, 0.42, 0.6));
        dock.querySelector('.d-wood').setAttribute('fill', Sky.mix('#8a5c3a', '#3a2b2a', dusk));
        dock.querySelector('.d-shade').setAttribute('fill', Sky.mix('#5a3920', '#1f1719', dusk));
        dock.querySelector('.d-light').setAttribute('fill', Sky.mix('#b88c5e', '#4b3b36', dusk));
        dock.querySelector('.d-rope').style.stroke = Sky.mix('#c9b184', '#5a5048', dusk);
        dock.querySelector('.d-flame').style.opacity = 0.25 + 0.75 * lit;
        dock.querySelector('.d-glow').style.opacity = lit;
    }

    // how much each layer sways: [cycles over the whole scroll, phase, % sideways, px up/down]
    var SWAY = [[0.9, 0.0, 2.0, 3], [1.1, 1.3, 2.6, 4], [0.8, 2.1, 3.2, 5], [1.3, 0.7, 3.8, 5]];

    /* ---------------- the ship: sails with the scroll, and can be picked up ---------------- */
    var ship = sea.querySelector('.ship');
    // sx = how far it has sailed off toward the right edge when you leave the page
    var drag = { x: 0, y: 0, dip: 0, s: 1, sx: 0 }, held = false, grab = { x: 0, y: 0 }, tweenId = 0;

    // the voyage: from the left edge at midday to a berth beside the dock at midnight
    function shipLeft(p) {
        var W = sea.clientWidth, start = W * 0.03;
        var end = dockAt ? dockAt.x0 - ship.clientWidth * 0.93 + 4 : W * 0.97 - ship.clientWidth;
        return start + (end - start) * p;
    }
    var shipBob = { x: 0, y: 0 };
    function placeShip() {
        var p = Sky.progress, r = p * Math.PI * 2.4;
        var rock = held ? 0 : Math.sin(r + 0.8) * 3;
        var bob = Math.sin(r) * 5;
        if (drag.sx) {                                   // under way: pitch and heave with the swell
            var t = performance.now() / 1000;
            rock += Math.sin(t * 5.5) * 3.5 - 2;
            bob += Math.sin(t * 5.5 + 1.2) * 4;
            paintWaves(p, (performance.now() - (sailStart || performance.now())) / 1000);
        }
        ship.style.left = shipLeft(p) + 'px';
        shipBob.x = drag.x + drag.sx;
        shipBob.y = drag.y + drag.dip + bob;
        ship.style.transform =
            'translate(' + (drag.x + drag.sx) + 'px, ' + (drag.y + drag.dip + bob) + 'px) ' +
            'rotate(' + rock + 'deg) scale(' + drag.s + ')';
        if (typeof placeMateAboard === 'function') placeMateAboard();
    }

    function tween(to, ms, ease, id, done) {
        var from = {}, t0 = performance.now();
        for (var k in to) from[k] = drag[k];
        (function frame(now) {
            if (id !== tweenId) return;
            var t = Math.min(1, (now - t0) / ms), e = ease(t);
            for (var k in to) drag[k] = from[k] + (to[k] - from[k]) * e;
            placeShip();
            if (t < 1) requestAnimationFrame(frame);
            else if (done) done();
        })(t0);
    }
    function easeOut(t)  { return 1 - (1 - t) * (1 - t); }
    function easeIn(t)   { return t * t; }
    function easeBack(t) { var c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }

    /* ---------------- the ship through the resets (sky/state.js) ----------------
       reset 1: let go, and it swings back where it was. reset 2: it falls where you let it go,
       straight down, and anyone under it is crushed (then it drifts back, in its own time).
       after that: an anchor, too heavy to lift it more than a little. */
    var SV = window.davSave;
    function shipMode() { return !SV ? 'snap' : SV.live('boat') ? 'drop' : SV.patched('boat') ? 'anchor' : 'snap'; }
    var ANCHOR_LIFT = 34;                                          // px the anchor lets it rise
    if (shipMode() === 'anchor') {
        ship.classList.add('anchored');
        Sky.svgArt(ship.querySelector('.anc-art'), 'assets/sea/anchor', [95, 72, 18, 26]);
    }
    function crushMate() {
        var was = crew.state === 'aboard' ? 'aboard' : 'ashore';
        cancelCrew();
        var run = crew.run;
        crew.state = 'dead';
        mate.classList.remove('talking', 'walking', 'held');
        var mr = mate.getBoundingClientRect();
        sfx('boat-crash', { or: 'land' }); sfx('scream');
        Sky.gore.splat(mate, mr.left + mr.width / 2, mr.bottom, function () {
            if (run !== crew.run) return;
            Sky.gore.respawn(mate);
            settle(was);
        });
    }
    function dropShip() {
        var id = ++tweenId, vy = 0, last = performance.now(), crushed = false, h0 = -drag.y;
        var mr = mate.getBoundingClientRect(), sr0 = ship.getBoundingClientRect();
        var under = Sky.gore && !/^(aboard|dead|held|falling|diving|swimming|surfacing)$/.test(crew.state) && !mate.classList.contains('under') &&
            sr0.left + sr0.width * 0.12 < mr.right && sr0.right - sr0.width * 0.12 > mr.left && sr0.bottom < mr.top + mr.height * 0.5 &&
            h0 > Math.max(110, window.innerHeight * 0.18);
        if (under && Sky.lives && Sky.lives.refuse('boat')) under = false;     // (from reset 2, not before the key: it misses)
        (function fall(now) {
            if (id !== tweenId) return;
            var dt = Math.min(0.05, (now - last) / 1000); last = now;
            vy += 2600 * dt;
            drag.y = Math.min(0, drag.y + vy * dt);
            drag.s += (1 - drag.s) * 0.2;
            placeShip();
            if (under && !crushed && ship.getBoundingClientRect().bottom >= mr.top + mr.height * 0.35) { crushed = true; crushMate(); }
            if (drag.y < 0) return requestAnimationFrame(fall);
            drag.s = 1;
            splash(ship, 1.3);
            drag.dip = 22;
            tween({ dip: 0 }, 650, easeBack, id, function () {
                setTimeout(function () { if (id === tweenId && !held) tween({ x: 0 }, 4200, function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }, id); }, 7000);
            });
        })(last);
    }

    ship.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        held = true;
        ship.setPointerCapture(e.pointerId);
        grab.x = e.clientX - drag.x;
        grab.y = e.clientY - drag.y;
        ship.classList.add('held');
        tween({ s: 1.12, dip: 0 }, 180, easeOut, ++tweenId);
    });
    // it stays on the screen: since reset 2 it stays where it's dropped, so it can't be dragged off either side
    // (on the right it can still reach over the dock: that's where the traveller stands at night)
    function keepOnScreen() {
        var r = ship.getBoundingClientRect(), W = document.documentElement.clientWidth || window.innerWidth, m = Math.max(8, W * 0.01);
        if (r.right > W - m) drag.x -= r.right - (W - m);
        else if (r.left < m) drag.x += m - r.left;
        else return;
        placeShip();
    }
    ship.addEventListener('pointermove', function (e) {
        if (!held) return;
        drag.x = e.clientX - grab.x;
        drag.y = e.clientY - grab.y;
        if (ship.classList.contains('anchored')) drag.y = Math.max(-ANCHOR_LIFT, drag.y);     // (too heavy)
        placeShip();
        keepOnScreen();
    });
    function release() {
        if (!held) return;
        held = false;
        ship.classList.remove('held');
        if (shipMode() === 'drop' && drag.y < -20) { dropShip(); return; }
        var dist = Math.hypot(drag.x, drag.y), id = ++tweenId;
        tween({ x: 0, y: 0, s: 1 }, Math.min(520, 220 + dist * 0.6), easeIn, id, function () {
            splash(ship, 1);
            drag.dip = 16;
            tween({ dip: 0 }, 650, easeBack, id);
        });
    }
    ship.addEventListener('pointerup', release);
    ship.addEventListener('pointercancel', release);

    // a splash at a point on screen (size 1 = the ship's own)
    function splashAt(cx, cy, size, spread, sound) {
        // the sound: a bottle's is small and bright, the traveller's deeper, the ship's deepest of all
        if (Sky.sounds && sound !== false) Sky.sounds.sfx('splash', { size: sound === undefined ? Math.min(1, size) : sound });
        var ring = document.createElement('div');
        ring.className = 'ring';
        ring.style.left = cx + 'px';
        ring.style.top = cy + 'px';
        splashLayer.appendChild(ring);
        ring.animate([
            { width: '0px', height: '0px', opacity: 1, transform: 'translate(-50%, -50%)' },
            { width: (spread * 1.2) + 'px', height: (26 * size) + 'px', opacity: 0, transform: 'translate(-50%, -50%)' }
        ], { duration: 700, easing: 'ease-out' }).onfinish = function () { ring.remove(); };

        var n = Math.round(8 + 10 * Math.min(1, size));
        for (var i = 0; i < n; i++) {
            var d = document.createElement('div');
            var w = (4 + Math.random() * 6) * Math.max(size, .6);
            d.className = 'drop';
            d.style.width = w + 'px';
            d.style.height = (w * 1.25) + 'px';
            d.style.left = (cx + (Math.random() - 0.5) * spread * 0.7) + 'px';
            d.style.top = cy + 'px';
            d.style.background = i % 3 ? '#e2d9c6' : '#8a97a3';
            splashLayer.appendChild(d);
            var dx = (Math.random() - 0.5) * 220 * size,
                up = -(50 + Math.random() * 110) * size,
                spin = (Math.random() - 0.5) * 180;
            d.animate([
                { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
                { transform: 'translate(' + dx * 0.55 + 'px, ' + up + 'px) rotate(' + spin / 2 + 'deg) scale(1)', opacity: 1, offset: 0.45 },
                { transform: 'translate(' + dx + 'px, ' + (40 * size) + 'px) rotate(' + spin + 'deg) scale(.5)', opacity: 0 }
            ], { duration: 700 + Math.random() * 350, easing: 'cubic-bezier(.25,.6,.45,1)' })
             .onfinish = (function (el) { return function () { el.remove(); }; })(d);
        }
    }
    function splash(el, sound) {
        var b = el.getBoundingClientRect();
        splashAt(b.left + b.width / 2, b.top + b.height * 0.86, b.width / 230, b.width, sound);
    }

    /* ---------------- the waves (by scroll, and rolling by the clock while under way) ---------------- */
    var sailStart = 0;
    function paintWaves(p, sailing) {
        waves.forEach(function (w, i) {
            var k = SWAY[i], a = p * Math.PI * k[0] + k[1] + (sailing || 0) * (2.2 + i * 0.5);
            var lift = sailing ? 1 + Math.min(1, sailing) * 1.4 : 1;          // a livelier swell once we're moving
            w.style.transform = 'translate(' + (Math.sin(a) * k[2]) + '%, ' + (Math.cos(a) * k[3] * lift) + 'px)';
        });
    }

    /* ---------------- the traveller ----------------
       aboard by day, ashore at the dock by night. can be picked up and dropped:
       onto the dock, back into the ship, or into the sea (then they swim back).
       easter egg: sail away while they're ashore and they dive in after you,
       surfacing about 5 seconds later to climb aboard.
       while held they complain, and after a few seconds they wriggle free and fall. */
    var SWIM_AFTER_SHIP = 5000;       // the easter egg: ms underwater before they surface
    var SWIM_AFTER_DROP = 5000;       // dropped in the sea by you: a shorter swim
    var mate = sea.querySelector('.sea-char');
    var crew = { state: 'aboard', x: 0, b: 0, run: 0, timer: 0 };   // x = left px, b = bottom px (in the sea box)

    // what they say (the words are all here, easy to change)
    var LEFT_BEHIND = 'Hey?! Wait for me!';
    // held up in the air, they get angrier: [what they say, how angry (0 to 4)]
    var HELD_LINES = [
        ['Hey! Put me down!', 0],
        ["I'm serious!!", 1],
        ['PUT. ME. DOWN.', 2],
        ['F$#K YOU!!', 3],
        ['LET GO OF ME, YOU &%$#@ING %$#@!!', 4]
    ];
    var HELD_LINE_MS = 1100;          // each complaint shows this long
    var BREAK_FREE_MS = 5600;         // held this long, they wriggle loose and fall
    var STARTLE_MS = 1400;            // the double-take before they chase the ship

    // speech: shout(text) shows a line in their bubble; hush() puts it away again
    var sayId = 0;
    function bubble() { return mate.querySelector('.bubble'); }
    function shout(text, anger) {
        var b = bubble();
        if (!b) return;
        sayId++;
        b.textContent = text;
        b.dataset.anger = anger || 0;
        b.classList.add('shout');
        b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
        clearTimeout(b.popTimer);
        b.popTimer = setTimeout(function () { b.classList.remove('pop'); }, 340);   // then it can shake
        mate.classList.add('talking');
    }
    function hush(after) {
        var id = ++sayId;
        setTimeout(function () {
            if (id !== sayId) return;
            var b = bubble();
            if (!b || !b.classList.contains('shout')) return;
            mate.classList.remove('talking');
            setTimeout(function () {                           // once it's faded, back to their usual line
                if (id !== sayId) return;
                b.classList.remove('shout', 'pop');
                b.dataset.anger = 0;
                b.textContent = mate.dataset.say || '';
            }, 300);
        }, after || 0);
    }

    function mateW() { return mate.offsetWidth || mate.offsetHeight * 0.5; }
    function mateH() { return mate.offsetHeight || 70; }
    function aboardSpot() {                                    // standing in the stern, legs hidden by the hull
        var sw = ship.clientWidth, sh = sw * 100 / 120, S = sea.clientHeight;
        return {
            x: shipLeft(Sky.progress) + shipBob.x + sw * 0.24 - mateW() / 2,
            b: S * 0.30 + sh * 0.28 - mateH() * 0.34 - shipBob.y
        };
    }
    function deckB() { return dockAt ? dockAt.S - dockAt.deck : 0; }
    function landSpot() { return { x: dockAt.x0 + (dockAt.small ? 14 : 22), b: deckB() }; }
    function talkSpot() {
        var x = dockAt.post ? dockAt.post - mateW() - 18 : dockAt.x0 + dockAt.dw * 0.5 - mateW() / 2;
        return { x: x, b: deckB() };
    }
    function underB() { return -mateH() * 0.2; }               // below the second wave: out of sight
    function surfaceB() { return sea.clientHeight * 0.47 - mateH() * 0.55; }   // head and shoulders above the swell
    function shipDocked() { return Sky.progress >= 0.965 && !drag.sx && !held; }
    function shipBox() {
        var l = shipLeft(Sky.progress) + shipBob.x, sw = ship.clientWidth;
        return { l: l + sw * 0.07, r: l + sw * 0.93 };
    }

    function putMate(x, b) {
        crew.x = x; crew.b = b;
        mate.style.left = x.toFixed(1) + 'px';
        mate.style.bottom = b.toFixed(1) + 'px';
    }
    function placeMateAboard() {
        if (!crew || !mate || crew.state !== 'aboard') return;
        var s = aboardSpot();
        putMate(s.x, s.b);
    }
    function mateSplash(size, quiet) {                          // quiet: the splash is seen but makes its own sound
        var r = sea.getBoundingClientRect();
        splashAt(r.left + crew.x + mateW() / 2, r.bottom - (sea.clientHeight * 0.47), size, mateW() * 2.4, quiet ? false : 0.5);
    }

    // move to a spot (which may itself be moving, like the bobbing ship): hop, walk or fall
    function moveTo(spot, ms, hop, run, done, fall) {
        var fx = crew.x, fb = crew.b, t0 = performance.now();
        mate.classList.toggle('walking', !hop && !fall);
        (function frame(now) {
            if (run !== crew.run) return;
            var t = Math.min(1, (now - t0) / ms), to = spot();
            var e = fall ? t * t : (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
            var x = fx + (to.x - fx) * (hop || fall ? e : t), b = fb + (to.b - fb) * e;
            if (hop) b += Math.sin(t * Math.PI) * hop;
            if (Math.abs(to.x - fx) > 2) mate.classList.toggle('face-left', to.x < fx);
            putMate(x, b);
            if (t < 1) requestAnimationFrame(frame);
            else { mate.classList.remove('walking'); if (done) done(); }
        })(t0);
    }
    function walkTime(a, b) { return Math.max(250, Math.abs(a - b) / 90 * 1000); }
    function hopH() { return dockAt && dockAt.small ? 34 : 50; }
    function settle(state) {
        crew.state = state;
        mate.classList.remove('face-left', 'walking', 'under');
        if (state === 'aboard') placeMateAboard();
        // look around: is the ship at the dock, or sailing off without them?
        setTimeout(function () { tendCrew(Sky.progress); }, 60);
    }
    function cancelCrew() {
        crew.run++;
        clearTimeout(crew.timer);
        mate.classList.remove('startled');
    }
    function shipGone() { return dockAt && landSpot().x - shipBox().r > 50; }
    // the double-take: they see the ship going without them
    function startle(run, done) {
        mate.classList.remove('talking', 'walking', 'startled');
        mate.classList.add('face-left');
        void mate.offsetWidth;
        mate.classList.add('startled');
        shout(LEFT_BEHIND, 1);
        crew.timer = setTimeout(function () {
            if (run !== crew.run) return;
            mate.classList.remove('startled');
            done();
        }, STARTLE_MS);
    }

    function goAshore() {
        cancelCrew();
        var run = crew.run;
        crew.state = 'landing';
        drag.dip = 7;                                          // the hull bumps the dock
        tween({ dip: 0 }, 700, easeBack, ++tweenId);
        crew.timer = setTimeout(function () {
            if (run !== crew.run) return;
            moveTo(landSpot, 620, hopH(), run, function () { walkToTalk(run); });
        }, 450);
    }
    function walkToTalk(run) {
        var to = talkSpot();
        moveTo(talkSpot, walkTime(crew.x, to.x), 0, run, function () {
            settle('ashore');
            mate.classList.add('talking');
        });
    }
    // back to the ship from the dock: hop aboard if it's still close, otherwise dive in after it
    function goAboard(fast, done) {
        cancelCrew();
        var run = crew.run;
        crew.state = 'boarding';
        mate.classList.remove('talking');
        var land = landSpot(), k = fast ? 0.35 : 1;
        if (fast) hush();
        function toEdge(speed, then) { moveTo(landSpot, walkTime(crew.x, landSpot().x) * speed, 0, run, then); }
        function leap() {
            if (!fast && shipGone()) { dive(run, SWIM_AFTER_SHIP); return; }
            moveTo(aboardSpot, 620 * k, hopH(), run, function () { sfx('land', { size: 0.8 }); hush(600); settle('aboard'); if (done) done(); });
        }
        // left behind? a double-take and a shout, then a dash to the edge and a dive
        if (!fast && shipGone()) { startle(run, function () { toEdge(0.45, leap); }); return; }
        toEdge(k, function () {
            if (!fast && shipGone()) { startle(run, leap); return; }
            leap();
        });
    }
    function dive(run, swimFor) {
        crew.state = 'diving';
        hush(250);                                             // the shout stays on the dock, not under the waves
        mate.classList.add('face-left');
        var from = { x: crew.x, b: crew.b };
        moveTo(function () { return { x: from.x - mateW() * 1.6, b: underB() }; }, 760, 46, run, function () {
            goUnder(run, swimFor);
        });
        // the splash as they hit the water
        setTimeout(function () { if (run === crew.run) mateSplash(0.55); }, 520);
    }
    function goUnder(run, swimFor) {
        crew.state = 'swimming';
        hush();
        mate.classList.add('under');
        mate.classList.remove('talking');
        crew.timer = setTimeout(function () { if (run === crew.run) surface(run); }, swimFor);
    }
    // up they come: beside the dock if the ship is berthed (then climb up), else beside the ship (then climb in)
    function surface(run) {
        var toDock = shipDocked() && dockAt;
        var popX = toDock ? landSpot().x - mateW() * 1.4 : shipBox().l - mateW() * 0.9;
        putMate(popX, underB());
        mate.classList.remove('under');
        mate.classList.toggle('face-left', false);
        crew.state = 'surfacing';
        mateSplash(0.4, true);
        sfx('surface');
        moveTo(function () { return { x: popX, b: surfaceB() }; }, 520, 0, run, function () {
            setTimeout(function () {                           // a breath, a shake, then climb
                if (run !== crew.run) return;
                sfx('climb-out');
                if (toDock && shipDocked()) {
                    moveTo(landSpot, 700, hopH() * 0.7, run, function () { walkToTalk(run); });
                } else {
                    moveTo(aboardSpot, 700, hopH() * 0.9, run, function () { settle('aboard'); });
                }
            }, 700);
        });
    }

    function tendCrew(p) {
        if (!dockAt || held || crew.state === 'held') return;
        var ashore = crew.state === 'landing' || crew.state === 'ashore';
        if (p >= 0.965) crew.stay = false;                     // (walked in from another page: they wait on the dock until the ship comes in)
        if (p >= 0.965 && crew.state === 'aboard' && !drag.sx) goAshore();
        else if (p < 0.94 && ashore && !crew.stay) goAboard(false);
        placeMateAboard();
    }

    /* ---------------- picking the traveller up ---------------- */
    var pick = null, eatClick = false;
    mate.addEventListener('pointerdown', function (e) {
        if (crew.state === 'swimming' || crew.state === 'diving' || crew.state === 'surfacing' || crew.state === 'dead') return;
        e.preventDefault();
        mate.setPointerCapture(e.pointerId);
        pick = { x: e.clientX, y: e.clientY, on: false, dx: 0, db: 0, id: e.pointerId };
    });
    mate.addEventListener('pointermove', function (e) {
        if (!pick) return;
        var r = sea.getBoundingClientRect();
        if (!pick.on) {
            if (Math.hypot(e.clientX - pick.x, e.clientY - pick.y) < 6) return;
            pick.on = true;                                    // it's a drag, not a click
            cancelCrew();
            crew.stay = false;
            crew.state = 'held';
            mate.classList.remove('talking', 'walking', 'under');
            mate.classList.add('held');
            pick.dx = e.clientX - (r.left + crew.x);
            pick.db = (r.bottom - crew.b) - e.clientY;
            complain(pick);
        }
        if (pick.freed) return;
        putMate(e.clientX - r.left - pick.dx, r.bottom - e.clientY - pick.db);
    });
    // while held: "put me down!" ... and after BREAK_FREE_MS they wriggle loose and drop
    // with each line, an angry chitter (assets/sounds/angry), wilder as they get angrier
    function chitter(anger) { sfx('angry', { size: anger / 4 }); }
    function complain(p) {
        var i = 0;
        shout(HELD_LINES[0][0], HELD_LINES[0][1]);
        chitter(HELD_LINES[0][1]);
        p.lines = setInterval(function () {
            if (pick !== p) { clearInterval(p.lines); return; }
            i = Math.min(i + 1, HELD_LINES.length - 1);
            shout(HELD_LINES[i][0], HELD_LINES[i][1]);
            chitter(HELD_LINES[i][1]);
            if (i === HELD_LINES.length - 1) clearInterval(p.lines);
        }, HELD_LINE_MS);
        p.free = setTimeout(function () {
            if (pick !== p) return;
            p.freed = true;                                    // your hand stays down, but they're gone
            clearInterval(p.lines);
            try { mate.releasePointerCapture(p.id); } catch (err) {}
            mate.classList.remove('held');
            drop();
            hush(1400);
        }, BREAK_FREE_MS);
    }
    function letGo() {
        if (!pick) return;
        var p = pick, was = p.on;
        pick = null;
        clearInterval(p.lines);
        clearTimeout(p.free);
        if (!was) return;                                      // a plain click: let it show the speech bubble
        eatClick = true;
        setTimeout(function () { eatClick = false; }, 0);
        if (p.freed) return;                                   // they already broke free
        mate.classList.remove('held');
        hush(500);
        drop();
    }
    mate.addEventListener('pointerup', letGo);
    mate.addEventListener('pointercancel', letGo);
    mate.addEventListener('click', function (e) { if (eatClick) { e.stopImmediatePropagation(); eatClick = false; } }, true);

    // dropped from too high onto the deck or the dock: splat (see sky/gore.js). they're back a moment later.
    // SPLAT_HEIGHT: how far they have to fall, as a share of the screen's height
    var SPLAT_HEIGHT = 0.3;
    function tooHigh(from, to) { return !!Sky.gore && from - to > Math.max(170, window.innerHeight * SPLAT_HEIGHT); }
    function splatMate(run, spot, after) {
        crew.state = 'dead';
        mate.classList.remove('talking', 'walking', 'held');
        var r = sea.getBoundingClientRect(), s = spot();
        Sky.gore.splat(mate, r.left + s.x + mateW() / 2, r.bottom - s.b, function () {
            if (run !== crew.run) return;
            var s2 = spot();
            putMate(s2.x, s2.b);
            Sky.gore.respawn(mate);
            after();
        });
    }
    // where did they land? the ship, the dock, or the sea
    function drop() {
        cancelCrew();
        var run = crew.run, cx = crew.x + mateW() / 2, box = shipBox();
        if (cx > box.l && cx < box.r && crew.b > aboardSpot().b - 30) {             // back into the ship
            crew.state = 'falling';
            if (tooHigh(crew.b, aboardSpot().b)) {
                hush(); sfx('scream');
                moveTo(aboardSpot, 300 + (crew.b - aboardSpot().b) / 2.2, 0, run, function () {
                    splatMate(run, aboardSpot, function () { settle('aboard'); });
                }, true);
                return;
            }
            moveTo(aboardSpot, 380, 0, run, function () { settle('aboard'); }, true);
            return;
        }
        if (dockAt && cx > dockAt.x0 && crew.b > deckB() - 10) {                     // onto the dock
            crew.state = 'falling';
            var spotX = Math.min(crew.x, dockAt.W - mateW() - 6), deadly = tooHigh(crew.b, deckB());
            var onDeck = function () { return { x: spotX, b: deckB() }; };
            if (deadly) { hush(); sfx('scream'); }
            moveTo(onDeck, 300 + Math.max(0, crew.b - deckB()) / (deadly ? 2.2 : 2), 0, run, function () {
                var carryOn = function () { if (shipDocked()) walkToTalk(run); else settle('ashore'); };   // ship's away: they'll go after it
                if (deadly) { splatMate(run, onDeck, carryOn); return; }
                sfx('land', { size: 1 });
                carryOn();
            }, true);
            return;
        }
        crew.state = 'falling';                                // into the sea
        moveTo(function () { return { x: crew.x, b: underB() }; }, 300 + Math.max(0, crew.b) / 2.2, 0, run, function () {
            goUnder(run, SWIM_AFTER_DROP);
        }, true);
        var fallMs = 300 + Math.max(0, crew.b - surfaceB()) / 2.2;
        setTimeout(function () { if (run === crew.run) mateSplash(0.5); }, Math.max(120, fallMs * 0.75));
    }

    Sky.onFrame(function (p) {
        paintWaves(p, 0);
        paintDock(p);
        placeShip();
        tendCrew(p);
    });

    // leaving for another page (a sign or a tab): the traveller walks off along the dock, off the right-hand edge.
    // aboard at sea? the ship pulls in to the dock first, and they hop off. (only in the water, or mid-fall,
    // does the ship still sail off with them, the old way.)
    var WALK_OFF_SPEED = 300;                                  // px a second: a brisk walk
    function easeInOut(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    Sky.onLeave(function (go) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
        held = false;
        ship.classList.remove('held');
        var st = crew.state;
        function walkOff() {
            cancelCrew();
            var run = crew.run, endX = sea.clientWidth + mateW() + 30;
            crew.state = 'leaving';
            mate.classList.remove('talking');
            hush();
            moveTo(function () { return { x: endX, b: deckB() }; }, Math.max(450, (endX - crew.x) / WALK_OFF_SPEED * 1000), 0, run, go);
        }
        if (dockAt && (st === 'ashore' || st === 'landing' || st === 'boarding')) { walkOff(); return true; }
        if (dockAt && st === 'aboard') {
            cancelCrew();
            var run = crew.run, gap = dockAt.x0 - shipBox().r + 12;
            var hopOff = function () {
                if (run !== crew.run) return;
                crew.state = 'landing';
                moveTo(landSpot, 450, hopH(), run, function () { sfx('land', { size: 0.6 }); walkOff(); });
            };
            if (gap > 4) {                                     // pull in alongside
                sailStart = performance.now();
                tween({ sx: drag.sx + gap, x: 0, y: 0, s: 1 }, Math.min(1300, 350 + gap * 1.6), easeInOut, ++tweenId, function () {
                    drag.dip = 7; tween({ dip: 0 }, 500, easeBack, ++tweenId); hopOff();
                });
            } else hopOff();
            return true;
        }
        // in the water or in the air: the ship sails off (and they're aboard by the next page)
        sailStart = performance.now();
        var r = ship.getBoundingClientRect();
        tween({ sx: window.innerWidth - r.left + 60 - drag.x, x: 0, y: 0, dip: 0, s: 1 }, 1700, easeInOut, ++tweenId, go);
        return true;
    });

    // coming back from another page: they walk in along the dock from the right-hand edge, and wait there
    var arrived = Sky.takeArrival ? Sky.takeArrival() : null;
    if (arrived) {
        crew.stay = true;
        mate.style.visibility = 'hidden';
        (function walkIn() {
            if (!dockAt) { setTimeout(walkIn, 80); return; }
            cancelCrew();
            var run = crew.run, W = sea.clientWidth;
            crew.state = 'landing';
            putMate(W + 10, deckB());
            mate.style.visibility = '';
            var to = talkSpot();
            moveTo(talkSpot, Math.max(700, (W + 10 - to.x) / 150 * 1000), 0, run, function () {
                settle('ashore');
                mate.classList.add('talking');
            });
        })();
    }

    // coming back with the browser's back button: put everyone back where they belong
    window.addEventListener('pageshow', function (e) {
        if (!e.persisted) return;
        tweenId++;
        sailStart = 0;
        drag.sx = drag.x = drag.y = drag.dip = 0;
        drag.s = 1;
        cancelCrew();
        mate.classList.remove('talking', 'held');
        hush();
        settle('aboard');
        placeShip();
        paintWaves(Sky.progress, 0);
    });

    // for letters.js: where to float today's bottle (and a peek at the traveller, for testing)
    // the revolver (sky/revolver.js): they take it to themselves, and are back a moment later where they were
    function kill() {
        if (!Sky.gore || !Sky.gore.shot || /^(dead|held|falling|diving|swimming|surfacing)$/.test(crew.state)) return false;
        var was = crew.state === 'aboard' ? 'aboard' : 'ashore';
        cancelCrew();
        crew.state = 'dead';
        var run = crew.run;
        mate.classList.remove('talking', 'walking');
        Sky.gore.shot(mate, function () {
            if (run !== crew.run) return;
            Sky.gore.respawn(mate);
            settle(was);
        });
        return true;
    }
    Sky.sea = { el: sea, front: sea.querySelector('.wave-4'), splash: splash, crew: crew, mate: mate, kill: kill };
})();

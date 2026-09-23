/* =====================================================================
   ground-sea.js — Hokusai-style paper-cut sea, with a ship you can pick up.
   Load after sky/sky.js.
   ===================================================================== */

(function () {
    var Sky = window.Sky;

    Sky.css(
        '.ground-sea { height: 30vh; min-height: 200px; }' +
        '.ground-sea .wave-1 { color: #56636f; filter: drop-shadow(0 -3px 5px rgba(0,0,0,.35)); }' +
        '.ground-sea .wave-2 { color: #45525e; filter: drop-shadow(0 -4px 6px rgba(0,0,0,.4)); }' +
        '.ground-sea .wave-3 { color: #36424d; filter: drop-shadow(0 -5px 7px rgba(0,0,0,.45)); }' +
        '.ground-sea .wave-4 { color: #28323b; filter: drop-shadow(0 -6px 9px rgba(0,0,0,.5)); }' +
        '.ground-sea .lines { fill: none; stroke: rgba(255,255,255,.13); stroke-width: 1.4; stroke-linecap: round; }' +
        '.ground-sea .foam  { fill: #e2d9c6; }' +
        '.ground-sea::after { content: ""; position: absolute; inset: 0; pointer-events: none;' +
            'background: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3CfeColorMatrix values=\'0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.09 0\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E");' +
            '-webkit-mask-image: linear-gradient(to top, #000 60%, transparent 100%); mask-image: linear-gradient(to top, #000 60%, transparent 100%); }' +

        '.ground-sea .dock { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 -3px 5px rgba(0,0,0,.3)); }' +
        '.ground-sea .d-rope  { fill: none; stroke: #c9b184; stroke-width: 2.4; stroke-linecap: round; }' +
        '.ground-sea .d-flame { fill: #ffd98a; }' +
        

        '.ship { position: absolute; left: 3vw; bottom: 30%; width: 230px; color: #cbbd9c;' +
            'filter: drop-shadow(0 3px 4px rgba(0,0,0,.45)); transform-origin: 50% 90%;' +
            'pointer-events: auto; cursor: grab; touch-action: none; -webkit-user-select: none; user-select: none; transition: filter .2s; }' +
        '.ship .hull { transform-box: fill-box; transform-origin: 50% 85%; }' +
        '.ship { pointer-events: none !important; } .ship .hull, .ship .hull * { pointer-events: visiblePainted; }' +
        '.ship.held { cursor: grabbing; filter: drop-shadow(0 22px 16px rgba(0,0,0,.4)); }' +
        '.ship.held .hull { animation: ship-shake .09s linear infinite alternate; }' +
        '@keyframes ship-shake { from { transform: rotate(-3.5deg) translateX(-1.5px); } to { transform: rotate(3.5deg) translateX(1.5px); } }' +

        '.ground-sea .sea-char { height: 70px; pointer-events: auto; transform-origin: 50% 100%; cursor: grab; touch-action: none; transition: opacity .25s; }' +
        '.ground-sea .sea-char.held { cursor: grabbing; filter: drop-shadow(0 16px 10px rgba(0,0,0,.35)); z-index: 5; }' +
        '.ground-sea .sea-char.held .placeholder, .ground-sea .sea-char.held .art { animation: ship-shake .09s linear infinite alternate; }' +
        '.ground-sea .sea-char.under { opacity: 0; pointer-events: none; }' +
        '@media (max-width: 620px) { .ground-sea .sea-char { height: 46px; } }' +
        '.splash-layer { position: fixed; inset: 0; z-index: 1; pointer-events: none; }' +
        '.splash-layer .drop { position: absolute; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; box-shadow: 0 1px 2px rgba(0,0,0,.3); }' +
        '.splash-layer .ring { position: absolute; border: 3px solid #e2d9c6; border-radius: 50%; }' +
        '@media (max-width: 620px) { .ship { width: 140px; } }'
    );

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
        '<svg class="dock">' +
            '<path class="d-shade"/><path class="d-wood"/><path class="d-light"/><path class="d-rope"/>' +
            '<defs><radialGradient id="dock-glow"><stop offset="0" stop-color="rgba(255,205,120,.6)"/><stop offset="1" stop-color="rgba(255,205,120,0)"/></radialGradient></defs>' +
            '<circle class="d-glow" fill="url(#dock-glow)"/><path class="d-flame"/>' +
        '</svg>' +
        // the traveller: rides in the ship, steps onto the dock at nightfall.
        // put your own at assets/characters/sea.(gif|png|webp|svg)
        '<div class="character sea-char" data-asset="assets/characters/sea" data-say="ahoy! where to?" aria-label="the traveller"></div>' +
        wave(2, .53, .15, 155, 110) +
        '<svg class="ship" viewBox="0 0 120 100"><g class="hull" fill="currentColor">' +
            '<path d="M8 72 L112 72 L98 90 L22 90 Z"/><rect x="58" y="10" width="3" height="62"/>' +
            '<path d="M62 14 C 84 26, 90 48, 86 66 L62 66 Z"/><path d="M57 20 C 40 32, 36 50, 40 66 L57 66 Z"/>' +
            '<path d="M61 8 L76 12 L61 16 Z"/>' +
        '</g></svg>' +
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

    /* ---------------- the dock, on the right ---------------- */
    var dock = sea.querySelector('.dock'), dockAt = null;
    function R(x, y, w, h) { return 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'h' + w.toFixed(1) + 'v' + h.toFixed(1) + 'h' + (-w).toFixed(1) + 'Z'; }
    function buildDock() {
        var W = sea.clientWidth, S = sea.clientHeight, small = W < 620;
        var dw = small ? 200 : 360, x0 = W - dw, y = S * 0.30, dh = small ? 11 : 14;
        var wood = '', shade = '', light = '', rope = '';

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

        // on wide screens the signpost's post stands on the dock, reaching up to the planks
        if (W > 1100) {
            var vh = window.innerHeight, pTop = vh * 0.27 - 26 - (vh - S), px = W - 68;
            wood  += 'M' + px + ' ' + (y + 1) + 'V' + (pTop + 9) + 'a9 9 0 0 1 18 0V' + (y + 1) + 'Z';
            shade += R(px + 13, pTop + 9, 5, y - pTop - 9);
            for (var ry = pTop + 30; ry < y - 10; ry += 30) shade += R(px, ry, 18, 1.2);
        }

        dockAt = { W: W, S: S, x0: x0, dw: dw, deck: y, small: small, post: W > 1100 ? W - 68 : null };
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

    ship.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        held = true;
        ship.setPointerCapture(e.pointerId);
        grab.x = e.clientX - drag.x;
        grab.y = e.clientY - drag.y;
        ship.classList.add('held');
        tween({ s: 1.12, dip: 0 }, 180, easeOut, ++tweenId);
    });
    ship.addEventListener('pointermove', function (e) {
        if (!held) return;
        drag.x = e.clientX - grab.x;
        drag.y = e.clientY - grab.y;
        placeShip();
    });
    function release() {
        if (!held) return;
        held = false;
        ship.classList.remove('held');
        var dist = Math.hypot(drag.x, drag.y), id = ++tweenId;
        tween({ x: 0, y: 0, s: 1 }, Math.min(520, 220 + dist * 0.6), easeIn, id, function () {
            splash(ship);
            drag.dip = 16;
            tween({ dip: 0 }, 650, easeBack, id);
        });
    }
    ship.addEventListener('pointerup', release);
    ship.addEventListener('pointercancel', release);

    // a splash at a point on screen (size 1 = the ship's own)
    function splashAt(cx, cy, size, spread) {
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
    function splash(el) {
        var b = el.getBoundingClientRect();
        splashAt(b.left + b.width / 2, b.top + b.height * 0.86, b.width / 230, b.width);
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
       surfacing about 20 seconds later to climb aboard. */
    var SWIM_AFTER_SHIP = 20000;      // the easter egg: ms underwater before they surface
    var SWIM_AFTER_DROP = 5000;       // dropped in the sea by you: a shorter swim
    var mate = sea.querySelector('.sea-char');
    var crew = { state: 'aboard', x: 0, b: 0, run: 0, timer: 0 };   // x = left px, b = bottom px (in the sea box)

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
    function mateSplash(size) {
        var r = sea.getBoundingClientRect();
        splashAt(r.left + crew.x + mateW() / 2, r.bottom - (sea.clientHeight * 0.47), size, mateW() * 2.4);
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
        moveTo(landSpot, walkTime(crew.x, land.x) * k, 0, run, function () {
            var gap = landSpot().x - shipBox().r;
            if (!fast && gap > 50) { dive(run, SWIM_AFTER_SHIP); return; }
            moveTo(aboardSpot, 620 * k, hopH(), run, function () { settle('aboard'); if (done) done(); });
        });
    }
    function dive(run, swimFor) {
        crew.state = 'diving';
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
        mateSplash(0.4);
        moveTo(function () { return { x: popX, b: surfaceB() }; }, 520, 0, run, function () {
            setTimeout(function () {                           // a breath, a shake, then climb
                if (run !== crew.run) return;
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
        if (p >= 0.965 && crew.state === 'aboard' && !drag.sx) goAshore();
        else if (p < 0.94 && ashore) goAboard(false);
        placeMateAboard();
    }

    /* ---------------- picking the traveller up ---------------- */
    var pick = null, eatClick = false;
    mate.addEventListener('pointerdown', function (e) {
        if (crew.state === 'swimming' || crew.state === 'diving' || crew.state === 'surfacing') return;
        e.preventDefault();
        mate.setPointerCapture(e.pointerId);
        pick = { x: e.clientX, y: e.clientY, on: false, dx: 0, db: 0 };
    });
    mate.addEventListener('pointermove', function (e) {
        if (!pick) return;
        var r = sea.getBoundingClientRect();
        if (!pick.on) {
            if (Math.hypot(e.clientX - pick.x, e.clientY - pick.y) < 6) return;
            pick.on = true;                                    // it's a drag, not a click
            cancelCrew();
            crew.state = 'held';
            mate.classList.remove('talking', 'walking', 'under');
            mate.classList.add('held');
            pick.dx = e.clientX - (r.left + crew.x);
            pick.db = (r.bottom - crew.b) - e.clientY;
        }
        putMate(e.clientX - r.left - pick.dx, r.bottom - e.clientY - pick.db);
    });
    function letGo() {
        if (!pick) return;
        var was = pick.on;
        pick = null;
        if (!was) return;                                      // a plain click: let it show the speech bubble
        eatClick = true;
        setTimeout(function () { eatClick = false; }, 0);
        mate.classList.remove('held');
        drop();
    }
    mate.addEventListener('pointerup', letGo);
    mate.addEventListener('pointercancel', letGo);
    mate.addEventListener('click', function (e) { if (eatClick) { e.stopImmediatePropagation(); eatClick = false; } }, true);

    // where did they land? the ship, the dock, or the sea
    function drop() {
        cancelCrew();
        var run = crew.run, cx = crew.x + mateW() / 2, box = shipBox();
        if (cx > box.l && cx < box.r && crew.b > aboardSpot().b - 30) {             // back into the ship
            crew.state = 'falling';
            moveTo(aboardSpot, 380, 0, run, function () { settle('aboard'); }, true);
            return;
        }
        if (dockAt && cx > dockAt.x0 && crew.b > deckB() - 10) {                     // onto the dock
            crew.state = 'falling';
            var spotX = Math.min(crew.x, dockAt.W - mateW() - 6);
            moveTo(function () { return { x: spotX, b: deckB() }; }, 300 + Math.max(0, crew.b - deckB()) / 2, 0, run, function () {
                if (shipDocked()) walkToTalk(run);
                else settle('ashore');                         // ship's away: they'll go after it
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

    // clicking a sign or a constellation: the traveller hurries aboard, the waves pick up,
    // and the ship sails off the right edge before the page changes
    function easeInOut(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    Sky.onLeave(function (go) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
        held = false;
        ship.classList.remove('held');
        function sail() {
            var r = ship.getBoundingClientRect();
            var dist = window.innerWidth - r.left + 60 - drag.x;
            sailStart = performance.now();
            tween({ sx: dist, x: 0, y: 0, dip: 0, s: 1 }, 1700, easeInOut, ++tweenId, go);
        }
        var onDock = crew.state === 'landing' || crew.state === 'ashore' || crew.state === 'boarding';
        if (onDock && dockAt) goAboard(true, sail); else sail();
        return true;
    });
    // coming back with the browser's back button: put everyone back where they belong
    window.addEventListener('pageshow', function (e) {
        if (!e.persisted) return;
        tweenId++;
        sailStart = 0;
        drag.sx = drag.x = drag.y = drag.dip = 0;
        drag.s = 1;
        cancelCrew();
        mate.classList.remove('talking', 'held');
        settle('aboard');
        placeShip();
        paintWaves(Sky.progress, 0);
    });

    // for letters.js: where to float today's bottle (and a peek at the traveller, for testing)
    Sky.sea = { el: sea, front: sea.querySelector('.wave-4'), splash: splash, crew: crew };
})();

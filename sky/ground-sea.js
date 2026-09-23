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

        '.ship { position: absolute; left: 3vw; bottom: 30%; width: 230px; color: #cbbd9c;' +
            'filter: drop-shadow(0 3px 4px rgba(0,0,0,.45)); transform-origin: 50% 90%;' +
            'pointer-events: auto; cursor: grab; touch-action: none; -webkit-user-select: none; user-select: none; transition: filter .2s; }' +
        '.ship .hull { transform-box: fill-box; transform-origin: 50% 85%; }' +
        '.ship.held { cursor: grabbing; filter: drop-shadow(0 22px 16px rgba(0,0,0,.4)); }' +
        '.ship.held .hull { animation: ship-shake .09s linear infinite alternate; }' +
        '@keyframes ship-shake { from { transform: rotate(-3.5deg) translateX(-1.5px); } to { transform: rotate(3.5deg) translateX(1.5px); } }' +

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

    // how much each layer sways: [cycles over the whole scroll, phase, % sideways, px up/down]
    var SWAY = [[0.9, 0.0, 2.0, 3], [1.1, 1.3, 2.6, 4], [0.8, 2.1, 3.2, 5], [1.3, 0.7, 3.8, 5]];

    /* ---------------- the ship: sails with the scroll, and can be picked up ---------------- */
    var ship = sea.querySelector('.ship');
    var drag = { x: 0, y: 0, dip: 0, s: 1 }, held = false, grab = { x: 0, y: 0 }, tweenId = 0;

    function placeShip() {
        var p = Sky.progress, r = p * Math.PI * 2.4;
        var rock = held ? 0 : Math.sin(r + 0.8) * 3;
        ship.style.left = 'calc(3vw + (94vw - ' + ship.clientWidth + 'px) * ' + p.toFixed(4) + ')';
        ship.style.transform =
            'translate(' + drag.x + 'px, ' + (drag.y + drag.dip + Math.sin(r) * 5) + 'px) ' +
            'rotate(' + rock + 'deg) scale(' + drag.s + ')';
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

    function splash(el) {
        var b = el.getBoundingClientRect();
        var cx = b.left + b.width / 2, cy = b.top + b.height * 0.86, size = b.width / 230;

        var ring = document.createElement('div');
        ring.className = 'ring';
        ring.style.left = cx + 'px';
        ring.style.top = cy + 'px';
        splashLayer.appendChild(ring);
        ring.animate([
            { width: '0px', height: '0px', opacity: 1, transform: 'translate(-50%, -50%)' },
            { width: (b.width * 1.2) + 'px', height: (26 * size) + 'px', opacity: 0, transform: 'translate(-50%, -50%)' }
        ], { duration: 700, easing: 'ease-out' }).onfinish = function () { ring.remove(); };

        for (var i = 0; i < 18; i++) {
            var d = document.createElement('div');
            var w = (4 + Math.random() * 6) * size;
            d.className = 'drop';
            d.style.width = w + 'px';
            d.style.height = (w * 1.25) + 'px';
            d.style.left = (cx + (Math.random() - 0.5) * b.width * 0.7) + 'px';
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

    Sky.onFrame(function (p) {
        waves.forEach(function (w, i) {
            var k = SWAY[i], a = p * Math.PI * k[0] + k[1];
            w.style.transform = 'translate(' + (Math.sin(a) * k[2]) + '%, ' + (Math.cos(a) * k[3]) + 'px)';
        });
        placeShip();
    });

    // for letters.js: where to float today's bottle
    Sky.sea = { el: sea, front: sea.querySelector('.wave-4'), splash: splash };
})();

/* =====================================================================
   ground-city.js — a paper-cut skyline in three layers. Windows switch on
   one by one as the sun goes down; antenna lights blink at night.
   Load after sky/sky.js.
   ===================================================================== */

(function () {
    var Sky = window.Sky;

    Sky.css(
        '.ground-city { height: 40vh; min-height: 240px; }' +
        '.ground-city .layer { overflow: visible; }' +
        '.ground-city .c1 { filter: drop-shadow(0 -2px 4px rgba(0,0,0,.2)); }' +
        '.ground-city .c2 { filter: drop-shadow(0 -3px 6px rgba(0,0,0,.28)); }' +
        '.ground-city .c3 { filter: drop-shadow(0 -5px 8px rgba(0,0,0,.34)); }' +
        '.ground-city .glass { fill: rgba(255,255,255,.14); }' +
        '.ground-city .lit { fill: #ffd98a; }' +
        '.ground-city .beacon { fill: #ff5a4a; animation: city-blink 2.4s steps(1) infinite; }' +
        // the derelict building: every window dark, some broken or boarded; one boarded window has someone behind it
        '.ground-city .dead { fill: #06080f; }' +
        '.ground-city .boards { fill: #4a3526; }' +
        '.ground-city .cracks { fill: none; stroke: rgba(0,0,0,.45); stroke-width: 1; }' +
        '.ground-city .mel-leak { fill: #ffb866; filter: drop-shadow(0 0 3px rgba(255,170,90,.9)); animation: mel-flicker 3.4s ease-in-out infinite; }' +
        '.ground-city .mel-boards { fill: #5b4030; }' +
        'body.mel-in .ground-city .mel-boards { display: none; }' +
        'body.mel-in .ground-city .mel-leak { fill: #ffd28a; animation: none; }' +
        // looking through the telescope the skyline is blown up many times over: the soft shadows go (a shadow on
        // something that big is more than the browser will draw, and whole rows of buildings would blink out)
        'body.peep-view .ground-city .layer, body.peep-close .ground-city .layer, body.peep-settling .ground-city .layer,' +
        'body.peep-view .ground-city .mel-leak, body.peep-close .ground-city .mel-leak, body.peep-settling .ground-city .mel-leak { filter: none !important; }' +
        '@keyframes mel-flicker { 0%, 100% { opacity: .55; } 40% { opacity: .85; } 47% { opacity: .35; } 52% { opacity: .8; } }' +
        '@keyframes city-blink { 0%, 60% { opacity: 1; } 61%, 100% { opacity: .15; } }' +
        '@media (prefers-reduced-motion: reduce) { .ground-city .beacon { animation: none; } }' +

        /* the rooftop the traveller stands on, in front of the skyline */
        '.city-roof { position: fixed; left: 0; right: 0; bottom: 0; z-index: 2; height: 20vh; min-height: 130px; pointer-events: none;' +
            'filter: drop-shadow(0 -6px 10px rgba(0,0,0,.35)); transition: transform .9s cubic-bezier(.55,0,.25,1), opacity .6s; }' +
        '.city-roof .placeholder { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }' +
        '.city-roof > .art { position: absolute; left: 0; bottom: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 100%; }' +
        '.city-roof > .art:not(.glow-layer) { filter: brightness(calc(1 - .55 * var(--dusk))) saturate(calc(1 - .3 * var(--dusk))); }' +
        '.city-roof > .glow-layer { opacity: var(--dusk); }' +
        '.city-roof .r-bulb { fill: #fff0c4; }' +
        '.city-roof .groove { width: 46px; } .city-roof .roof-pigeon { width: 30px; } .city-roof .roof-pigeon.two { width: 26px; }' +
        '.city-roof .groove > .art:not(.glow-layer), .city-roof .groove > .placeholder { filter: brightness(calc(1 - .5 * var(--dusk))); }' +
        '@media (max-width: 620px) { .city-roof .groove { width: 34px; } .city-roof .roof-pigeon { width: 22px; } .city-roof .roof-pigeon.two { width: 19px; } }' +
        '.city-roof .r-halo { fill: url(#roof-glow); }' +
        '.city-roof .roof-door, .city-roof .roof-door:hover { position: absolute; left: 43%; bottom: 44%; height: 58%; aspect-ratio: 110 / 120; padding: 0; background: none; pointer-events: auto; cursor: pointer; }' +
        '.city-roof .roof-door > svg, .city-roof .roof-door > .art { display: block; width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; }' +
        '.city-roof .roof-door > svg, .city-roof .roof-door > .art:not(.glow-layer) { filter: brightness(calc(1 - .5 * var(--dusk))); }' +
        '.city-roof .roof-door:hover > svg, .city-roof .roof-door:hover > .art { filter: brightness(calc(1.08 - .45 * var(--dusk))) drop-shadow(0 0 8px rgba(255,220,150,.5)); }' +
        '.city-roof .roof-door .rd-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap; font-style: italic; font-size: .95rem;' +
            'color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.8); opacity: 0; transition: opacity .25s; pointer-events: none; }' +
        '.city-roof .roof-door:hover .rd-hint { opacity: 1; }' +
        '.city-roof .roof-door .leaf { transform-box: fill-box; transform-origin: 0 50%; transition: transform .4s cubic-bezier(.5,0,.3,1); }' +
        '.city-roof .roof-door.open .leaf { transform: scaleX(.12); }' +
        '@media (max-width: 620px) { .city-roof .roof-door { left: 38%; height: 50%; } }' +
        'body.peep-view .city-roof, body.peep-close .city-roof, body.sky-view .city-roof, body.scope-view .city-roof { transform: translateY(110%); opacity: 0; }' +
        '@media (max-width: 620px) { .city-roof { height: 17vh; min-height: 110px; } }'
    );

    // back to front. top/bottom = how tall buildings get (fraction of the ground's height),
    // w = building width range in px, windows = draw windows, drift = sideways parallax
    var LAYERS = [
        { lo: .45, hi: .95, w: [34, 80],  day: '#a7b3c3', night: '#26304a', windows: false, drift: .5, seed: 11 },
        { lo: .32, hi: .75, w: [44, 104], day: '#7f8ca0', night: '#1b2339', windows: true,  drift: 1.0, seed: 12 },
        { lo: .18, hi: .50, w: [52, 120], day: '#5b6880', night: '#111829', windows: true,  drift: 1.8, seed: 13 }
    ];
    var BUCKETS = 6;   // windows switch on in this many waves through the evening

    var ground = document.createElement('div');
    ground.className = 'ground ground-city';
    ground.setAttribute('aria-hidden', 'true');
    ground.innerHTML = LAYERS.map(function (L, i) {
        var lit = '';
        for (var b = 0; b < BUCKETS; b++) lit += '<path class="lit" data-b="' + b + '"/>';
        return '<svg class="layer c' + (i + 1) + '"><path class="body"/><path class="glass"/>' + lit + '<path class="beacon"/>' +
            (i === LAYERS.length - 1 ? '<path class="dead"/><path class="cracks"/><path class="boards"/><path class="mel-leak"/><path class="mel-boards"/>' : '') + '</svg>';
    }).join('');
    document.body.appendChild(ground);

    var svgs = Array.prototype.slice.call(ground.querySelectorAll('.layer'));

    /* ---------------- the rooftop in front (slot: assets/city/foreground) ----------------
       your picture fills the strip along the bottom (20% of the screen's height), anchored to
       the bottom edge; the traveller's feet are about 55% of the way down it. -glow = its lights. */
    var roof = document.createElement('div');
    roof.className = 'city-roof';
    roof.setAttribute('aria-hidden', 'true');
    roof.dataset.asset = 'assets/city/foreground';
    roof.innerHTML = '<svg class="placeholder">' +
        '<defs><radialGradient id="roof-glow"><stop offset="0" stop-color="rgba(255,214,140,.75)"/><stop offset="1" stop-color="rgba(255,214,140,0)"/></radialGradient></defs>' +
        '<path class="r-far"/><path class="r-top"/><path class="r-cap"/><path class="r-face"/><path class="r-mortar"/>' +
        '<path class="r-metal"/><path class="r-glass"/><path class="r-warm"/><path class="r-pot"/><path class="r-leaf"/><path class="r-wire"/>' +
        '<g class="r-lights"></g></svg>' +
        // rooftop friends who dance when music plays: assets/city/cat, assets/city/pigeon
        // the roof access door: back down the stairs to the hallway. your own: assets/city/roof-door
        '<a class="roof-door exit" href="living.html#hallway" data-walk="to-door" data-sound="door-metal" data-arrive-via=".hall-door.to-roof" data-asset="assets/city/roof-door" aria-label="the roof access door, down to the hallway">' +
            '<svg class="placeholder" viewBox="0 0 110 120" aria-hidden="true">' +
            '<path d="M4 120 V26 L55 6 L106 26 V120 Z" fill="#7d4a36"/><path d="M4 26 L55 6 L106 26 L106 32 L55 12 L4 32 Z" fill="#5a3326"/>' +
            '<g stroke="#5f3526" stroke-width="1.2" opacity=".6"><path d="M4 44 H106 M4 62 H106 M4 80 H106 M4 98 H106"/><path d="M30 26 V44 M78 26 V44 M16 44 V62 M54 44 V62 M92 44 V62 M30 62 V80 M78 62 V80 M16 80 V98 M92 80 V98 M30 98 V120 M78 98 V120"/></g>' +
            '<rect x="33" y="48" width="44" height="72" fill="#1c1d22"/><g class="leaf"><rect x="36" y="51" width="38" height="69" fill="#5d6570"/>' +
            '<path d="M36 70 H74 M36 100 H74" stroke="#4a515b" stroke-width="1.5"/><rect x="66" y="84" width="6" height="3" rx="1.5" fill="#c9ccd0"/></g>' +
            '<rect x="30" y="30" width="50" height="14" rx="2" fill="#b8402a"/>' +
            '<text x="55" y="40.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="8.5" fill="#fff">ROOF ACCESS</text>' +
            '<circle cx="55" cy="22" r="3" fill="#ffd98a" class="r-bulb"/></svg><span class="rd-hint">down to the hallway</span></a>' +
        '<div class="groove roof-cat" data-groove="cat" data-asset="assets/city/cat"></div>' +
        '<div class="groove roof-pigeon" data-groove="pigeon" data-asset="assets/city/pigeon"></div>' +
        '<div class="groove roof-pigeon two" data-groove="pigeon" data-asset="assets/city/pigeon"></div>';
    document.body.appendChild(roof);
    var ROOF = {
        'r-far':   ['#8e7f78', '#26222c'],   // the back of the roof, a shade darker
        'r-top':   ['#a29385', '#2f2b35'],   // the roof you stand on
        'r-cap':   ['#cdbfa9', '#43404a'],   // stone coping along the edge
        'r-face':  ['#8d523b', '#2b1b1d'],   // brick
        'r-mortar':['#6f3d2b', '#1e1315'],
        'r-metal': ['#6d7580', '#22252d'],   // chimney pots, pipes, poles
        'r-glass': ['#b9d0dc', '#27344f'],
        'r-pot':   ['#a65b3b', '#341d18'],
        'r-leaf':  ['#5f804f', '#18241e'],
        'r-wire':  ['#3a302a', '#141014']
    };
    function buildRoof() {
        var W = roof.clientWidth, H = roof.clientHeight, k = W < 620 ? .72 : 1;
        var top = H * 0.44, feet = H * 0.55;              // the roof's back edge, and where feet stand
        var cap = H * 0.62, face = cap + 9 * k;
        // the cat sits on the chimney, the pigeons on the ledge
        var cat = roof.querySelector('.roof-cat'), pg = roof.querySelectorAll('.roof-pigeon');
        cat.style.left = (W * 0.07 + 4 * k) + 'px'; cat.style.bottom = (H - (feet - 96 * k - 8 * k)) + 'px';
        pg[0].style.left = (W * 0.38) + 'px'; pg[0].style.bottom = (H - cap - 1) + 'px';
        pg[1].style.left = (W * 0.38 + 34 * k) + 'px'; pg[1].style.bottom = (H - cap - 1) + 'px';
        var svg = roof.querySelector('svg.placeholder');
        if (!svg) return;
        var d = {}; for (var c in ROOF) d[c] = '';
        function R(x, y, w, h) { return 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'h' + w.toFixed(1) + 'v' + h.toFixed(1) + 'h' + (-w).toFixed(1) + 'Z'; }
        d['r-far'] += R(0, top, W, 5 * k);
        d['r-top'] += R(0, top + 4 * k, W, cap - top - 4 * k);
        d['r-cap'] += R(0, cap, W, 10 * k);
        d['r-face'] += R(0, face, W, H - face + 2);
        for (var row = 0, y = face + 9 * k; y < H; row++, y += 11 * k) {                  // brickwork
            d['r-mortar'] += R(0, y, W, 1.4);
            for (var x = (row % 2 ? 13 : 0) * k; x < W; x += 26 * k) d['r-mortar'] += R(x, y - 11 * k, 1.4, 11 * k);
        }
        // a chimney stack with two pots
        var cx = W * 0.07, cw = 54 * k, ch = 96 * k;
        d['r-face'] += R(cx, feet - ch, cw, ch + 2);
        for (var cy = feet - ch + 10 * k; cy < feet; cy += 11 * k) d['r-mortar'] += R(cx, cy, cw, 1.2);
        d['r-cap'] += R(cx - 5 * k, feet - ch - 8 * k, cw + 10 * k, 9 * k);
        d['r-pot'] += R(cx + 8 * k, feet - ch - 26 * k, 14 * k, 19 * k) + R(cx + 31 * k, feet - ch - 21 * k, 13 * k, 14 * k);
        // a skylight
        var sx = W * 0.3, sw = 86 * k;
        d['r-cap'] += R(sx, feet - 22 * k, sw, 24 * k);
        d['r-glass'] += 'M' + (sx + 4 * k) + ' ' + (feet - 22 * k) + 'L' + (sx + 14 * k) + ' ' + (feet - 38 * k) + 'H' + (sx + sw - 14 * k) + 'L' + (sx + sw - 4 * k) + ' ' + (feet - 22 * k) + 'Z';
        // a vent pipe with a cap
        var vx = W * 0.46;
        d['r-metal'] += R(vx, feet - 48 * k, 9 * k, 50 * k) + R(vx - 6 * k, feet - 55 * k, 21 * k, 8 * k);
        // a pole for the string of lights
        var px = W * 0.58, ph = 120 * k;
        d['r-metal'] += R(px, feet - ph, 5 * k, ph + 2) + R(px - 7 * k, feet - ph, 19 * k, 3 * k);
        // a potted plant
        var gx = W * 0.66;
        d['r-pot'] += 'M' + (gx - 14 * k) + ' ' + (feet - 22 * k) + 'h' + (28 * k) + 'l' + (-4 * k) + ' ' + (24 * k) + 'h' + (-20 * k) + 'Z';
        d['r-leaf'] += 'M' + gx + ' ' + (feet - 20 * k) + 'q' + (-26 * k) + ' ' + (-8 * k) + ' ' + (-20 * k) + ' ' + (-34 * k) + 'q' + (12 * k) + ' ' + (14 * k) + ' ' + (20 * k) + ' ' + (34 * k) + 'Z' +
                       'M' + gx + ' ' + (feet - 20 * k) + 'q' + (4 * k) + ' ' + (-30 * k) + ' ' + (22 * k) + ' ' + (-40 * k) + 'q' + (-8 * k) + ' ' + (20 * k) + ' ' + (-22 * k) + ' ' + (40 * k) + 'Z' +
                       'M' + gx + ' ' + (feet - 20 * k) + 'q' + (-4 * k) + ' ' + (-26 * k) + ' ' + (4 * k) + ' ' + (-46 * k) + 'q' + (2 * k) + ' ' + (22 * k) + ' ' + (-4 * k) + ' ' + (46 * k) + 'Z';
        // an old TV aerial far right
        var ax = W * 0.95, ah = 92 * k;
        d['r-metal'] += R(ax, feet - ah, 3 * k, ah + 2) + R(ax - 18 * k, feet - ah + 8 * k, 39 * k, 2.5 * k) + R(ax - 12 * k, feet - ah + 20 * k, 27 * k, 2.5 * k);
        // the string of lights: sags from the chimney to the pole
        var x1 = cx + cw, y1 = feet - ch + 16 * k, x2 = px, y2 = feet - ph + 4 * k, sag = 46 * k;
        var mx = (x1 + x2) / 2, my = Math.max(y1, y2) + sag;
        d['r-wire'] += 'M' + x1 + ' ' + y1 + ' Q' + mx + ' ' + (2 * my - (y1 + y2) / 2) + ' ' + x2 + ' ' + y2;
        var lights = '', n = Math.max(6, Math.round((x2 - x1) / (38 * k)));
        for (var i = 1; i < n; i++) {
            var t = i / n, qx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2,
                qy = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * (2 * my - (y1 + y2) / 2) + t * t * y2;
            lights += '<circle class="r-halo" cx="' + qx.toFixed(1) + '" cy="' + (qy + 5 * k).toFixed(1) + '" r="' + (16 * k).toFixed(1) + '"/>' +
                      '<circle class="r-bulb" cx="' + qx.toFixed(1) + '" cy="' + (qy + 5 * k).toFixed(1) + '" r="' + (3.2 * k).toFixed(1) + '"/>';
        }
        svg.querySelector('.r-lights').innerHTML = lights;
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        for (c in d) svg.querySelector('.' + c).setAttribute('d', d[c]);
        svg.querySelector('.r-warm').setAttribute('d', d['r-glass']);
        svg.querySelector('.r-warm').setAttribute('fill', '#ffd98a');
        svg.querySelector('.r-wire').setAttribute('fill', 'none');
        svg.querySelector('.r-wire').setAttribute('stroke-width', 1.4);
    }
    buildRoof();
    window.addEventListener('resize', buildRoof);
    function paintRoof(p) {
        var svg = roof.querySelector('svg.placeholder');
        if (!svg) return;
        var dusk = Sky.smooth(Sky.ramp(p, 0.3, 0.85)), lit = Sky.smooth(Sky.ramp(p, 0.4, 0.55));
        for (var c in ROOF) {
            var el = svg.querySelector('.' + c), col = Sky.mix(ROOF[c][0], ROOF[c][1], dusk);
            if (c === 'r-wire') el.setAttribute('stroke', col); else el.setAttribute('fill', col);
        }
        svg.querySelector('.r-warm').style.opacity = lit * 0.85;             // a lamp on below the skylight
        svg.querySelector('.r-lights').style.opacity = 0.15 + 0.85 * lit;
    }

    /* ---------------- your own skyline: three slots, back to front ----------------
       assets/city/skyline-back, skyline-middle, skyline-front (each with an optional -glow
       twin for lit windows). the front row is where the telescope looks: say where its
       windows are in assets/city/skyline-front-windows.json (see assets/README.txt). */
    var SKYLINE = ['assets/city/skyline-back', 'assets/city/skyline-middle', 'assets/city/skyline-front'];
    var frontArt = null;          // { w, h, windows: [[x%, y%, w%, h%], …] } once your front row is in

    var front = null;           // the nearest row of buildings and its windows (for the telescope)
    function f(n) { return n.toFixed(1); }
    function rect(x, y, w, h) { return 'M ' + f(x) + ' ' + f(y) + ' h ' + f(w) + ' v ' + f(h) + ' h ' + f(-w) + ' Z '; }

    function build() {
        var small = window.innerWidth < 620 ? 0.7 : 1;
        svgs.forEach(function (svg, i) {
            var L = LAYERS[i], W = svg.clientWidth, S = svg.clientHeight - 12, B = S + 12;
            var rnd = Sky.seeded(L.seed * 7919);
            var body = '', glass = '', beacon = '', lit = [], wins = [];
            var dead = '', cracks = '', boards = '', melLeak = '', melBoards = '', mel = null, derelict = false;
            var aim = W * (W < 620 ? 0.3 : 0.36);             // the derelict building: the first tall-enough one past here
            for (var b = 0; b < BUCKETS; b++) lit.push('');

            for (var x = -10; x < W; ) {
                var bw = (L.w[0] + rnd() * (L.w[1] - L.w[0])) * small;
                var bh = S * (L.lo + rnd() * (L.hi - L.lo));
                // mel's building: an old tenement, tall enough to stand over the rooftop you're on
                var dz = i === LAYERS.length - 1 && !derelict && !frontArt && x + bw / 2 > aim && bw >= 44 * small;
                if (dz) bh = Math.max(bh, S * 0.6);
                var top = B - bh;
                body += rect(x, top, bw, bh);

                var roof = rnd();
                if (roof < 0.25) {                                  // stepped top
                    body += rect(x + bw * .2, top - bh * .12, bw * .6, bh * .12 + 1);
                    top -= bh * .12;
                } else if (roof < 0.4) {                            // pointed roof
                    body += 'M ' + f(x) + ' ' + f(top + 1) + ' L ' + f(x + bw / 2) + ' ' + f(top - bw * .45) + ' L ' + f(x + bw) + ' ' + f(top + 1) + ' Z ';
                } else if (roof < 0.55 && i === 2) {                // water tower
                    var tx = x + bw * .55, tw = 22 * small;
                    body += rect(tx, top - 10 * small, 2, 11 * small) + rect(tx + tw - 2, top - 10 * small, 2, 11 * small);
                    body += rect(tx - 2, top - 30 * small, tw + 4, 21 * small);
                    body += 'M ' + f(tx - 4) + ' ' + f(top - 29 * small) + ' L ' + f(tx + tw / 2) + ' ' + f(top - 40 * small) + ' L ' + f(tx + tw + 4) + ' ' + f(top - 29 * small) + ' Z ';
                }
                if (rnd() < 0.3) {                                  // antenna with a beacon
                    var ax = x + bw * (0.3 + rnd() * 0.4), ah = (18 + rnd() * 26) * small;
                    body += rect(ax - 1, top - ah, 2, ah + 1);
                    beacon += 'M ' + f(ax - 2.5) + ' ' + f(top - ah) + ' a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0 Z ';
                }

                if (L.windows) {                                    // a grid of windows
                    var ww = 5 * small + i, wh = 7 * small + i, gx = 11 * small + i * 2, gy = 15 * small + i * 2;
                    var cols = Math.floor((bw - 10) / gx), rows = Math.floor((bh - 18) / gy);
                    var ox = x + (bw - (cols - 1) * gx - ww) / 2;
                    // mel's building: abandoned, not a light on, except behind one boarded-up window
                    var isDead = dz && rows >= 3 && cols >= 2;
                    if (isDead) {
                        derelict = true;
                        var mr = 1, mc = cols > 2 ? 1 : 0;          // near the top, where the rooftop you stand on doesn't hide it
                        var crnd = Sky.seeded(4242);
                        cracks += 'M ' + f(x + bw * .2) + ' ' + f(B - bh + 4) + ' l 3 9 l -2 7 l 4 10 M ' + f(x + bw * .78) + ' ' + f(B - bh * .5) + ' l -4 8 l 3 6 ';
                    }
                    for (var r = 0; r < rows; r++) {
                        for (var c = 0; c < cols; c++) {
                            var wx = ox + c * gx, wy = B - bh + 12 + r * gy;
                            var w = rect(wx, wy, ww, wh);
                            var isLit = rnd() < 0.78, bucket = isLit ? Math.floor(rnd() * BUCKETS) : 0;
                            if (isDead) {                           // (the dice still roll, so the rest of the city stays put)
                                if (r === mr && c === mc) {
                                    mel = { x: wx, y: wy, w: ww, h: wh, lit: false, top: B - bh, mel: true };
                                    dead += w;
                                    melLeak += rect(wx + ww * .12, wy + wh * .2, ww * .76, wh * .7);
                                    melBoards += rect(wx - 1, wy + wh * .08, ww + 2, wh * .26) + rect(wx - 1, wy + wh * .42, ww + 2, wh * .24) + rect(wx - 1, wy + wh * .74, ww + 2, wh * .24);
                                } else {
                                    var roll = crnd();
                                    if (roll < 0.22) boards += rect(wx - .5, wy + wh * .15, ww + 1, wh * .3) + rect(wx - .5, wy + wh * .6, ww + 1, wh * .3);
                                    else if (roll < 0.4) dead += 'M ' + f(wx) + ' ' + f(wy) + ' h ' + f(ww) + ' l ' + f(-ww * .45) + ' ' + f(wh * .5) + ' l ' + f(ww * .45) + ' ' + f(wh * .5) + ' h ' + f(-ww) + ' Z ';
                                    else dead += w;
                                }
                                continue;
                            }
                            glass += w;
                            if (isLit) lit[bucket] += w;
                            if (i === LAYERS.length - 1) wins.push({ x: wx, y: wy, w: ww, h: wh, lit: isLit, top: B - bh });
                        }
                    }
                }
                x += bw + (rnd() < 0.3 ? rnd() * 14 * small : -2);
            }

            if (i === LAYERS.length - 1) {
                if (frontArt) mel = artMel(W, B);
                front = { svg: svg, windows: frontArt ? artWindows(W, B) : wins, W: W, H: B, mel: mel };
                svg.querySelector('.dead').setAttribute('d', dead);
                svg.querySelector('.cracks').setAttribute('d', cracks);
                svg.querySelector('.boards').setAttribute('d', boards);
                svg.querySelector('.mel-leak').setAttribute('d', frontArt ? '' : melLeak);
                svg.querySelector('.mel-boards').setAttribute('d', frontArt ? '' : melBoards);
            }
            svg.setAttribute('viewBox', '0 0 ' + W + ' ' + B);
            svg.querySelector('.body').setAttribute('d', body);
            svg.querySelector('.glass').setAttribute('d', glass);
            svg.querySelector('.beacon').setAttribute('d', beacon);
            svg.querySelectorAll('.lit').forEach(function (el, b) { el.setAttribute('d', lit[b]); });
        });
    }
    // the telescope's windows on your own front row: from the .json, or spread along it
    function artWindows(W, B) {
        var sc = Math.max(W / frontArt.w, B / frontArt.h), iw = frontArt.w * sc, ih = frontArt.h * sc;
        var ox = (W - iw) / 2, oy = B - ih, list = frontArt.windows, out = [];
        if (!list || !list.length) {                                      // no map: a row across the middle
            list = [];
            for (var i = 0; i < 24; i++) list.push([6 + i * 3.9, 62, 0.9, 1.6]);
        }
        list.forEach(function (w) {
            var ww = (w[2] || 0.9) / 100 * iw, wh = (w[3] || 1.6) / 100 * ih;
            var x = ox + w[0] / 100 * iw - ww / 2, y = oy + w[1] / 100 * ih - wh / 2;
            if (x > 0 && x + ww < W) out.push({ x: x, y: y, w: ww, h: wh, lit: true, top: y - 20 });
        });
        return out;
    }
    // mel's window on your own front row: "mel": [x%, y%, w%, h%] in skyline-front-windows.json
    function artMel(W, B) {
        var m = frontArt && frontArt.mel;
        if (!m || m.length < 2) return null;
        var sc = Math.max(W / frontArt.w, B / frontArt.h), iw = frontArt.w * sc, ih = frontArt.h * sc;
        var ww = (m[2] || 0.9) / 100 * iw, wh = (m[3] || 1.6) / 100 * ih;
        return { x: (W - iw) / 2 + m[0] / 100 * iw - ww / 2, y: B - ih + m[1] / 100 * ih - wh / 2, w: ww, h: wh, lit: false, top: 0, mel: true };
    }
    build();
    function rebuild() { build(); svgs.forEach(Sky.fitLayerArt); Sky.refresh(); if (Sky.city.onBuild) Sky.city.onBuild(); }
    window.addEventListener('resize', rebuild);
    svgs.forEach(function (svg, i) {
        Sky.layerArt(svg, SKYLINE[i], i === svgs.length - 1 ? function (url, img) {
            frontArt = { w: img.naturalWidth || 1920, h: img.naturalHeight || 800, windows: null };
            rebuild();
            Sky.findAsset(SKYLINE[i] + '-windows.json', function (u, data) {
                if (!u) return;
                frontArt.windows = Array.isArray(data) ? data : (data && data.windows) || null;
                frontArt.mel = data && !Array.isArray(data) ? data.mel || null : null;
                rebuild();
            });
        } : null);
    });
    Sky.city = { el: ground, roof: roof, get front() { return front; }, onBuild: null };

    Sky.onFrame(function (p) {
        paintRoof(p);
        var dusk = Sky.smooth(Sky.ramp(p, 0.3, 0.85));
        svgs.forEach(function (svg, i) {
            var L = LAYERS[i];
            svg.querySelector('.body').setAttribute('fill', Sky.mix(L.day, L.night, dusk));
            svg.querySelector('.glass').style.opacity = 1 - dusk * 0.6;
            svg.querySelectorAll('.lit').forEach(function (el, b) {
                var start = 0.4 + b * 0.07;                         // each wave of windows lights a little later
                el.style.opacity = Sky.smooth(Sky.ramp(p, start, start + 0.05));
            });
            svg.querySelector('.beacon').style.visibility = p > 0.55 ? 'visible' : 'hidden';
            svg.style.transform = 'translateX(' + ((0.5 - p) * L.drift * 2).toFixed(2) + '%)';
        });
    });
})();

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
        '@keyframes city-blink { 0%, 60% { opacity: 1; } 61%, 100% { opacity: .15; } }' +
        '@media (prefers-reduced-motion: reduce) { .ground-city .beacon { animation: none; } }'
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
        return '<svg class="layer c' + (i + 1) + '"><path class="body"/><path class="glass"/>' + lit + '<path class="beacon"/></svg>';
    }).join('');
    document.body.appendChild(ground);

    var svgs = Array.prototype.slice.call(ground.querySelectorAll('.layer'));
    var front = null;           // the nearest row of buildings and its windows (for the telescope)
    function f(n) { return n.toFixed(1); }
    function rect(x, y, w, h) { return 'M ' + f(x) + ' ' + f(y) + ' h ' + f(w) + ' v ' + f(h) + ' h ' + f(-w) + ' Z '; }

    function build() {
        var small = window.innerWidth < 620 ? 0.7 : 1;
        svgs.forEach(function (svg, i) {
            var L = LAYERS[i], W = svg.clientWidth, S = svg.clientHeight - 12, B = S + 12;
            var rnd = Sky.seeded(L.seed * 7919);
            var body = '', glass = '', beacon = '', lit = [], wins = [];
            for (var b = 0; b < BUCKETS; b++) lit.push('');

            for (var x = -10; x < W; ) {
                var bw = (L.w[0] + rnd() * (L.w[1] - L.w[0])) * small;
                var bh = S * (L.lo + rnd() * (L.hi - L.lo));
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
                    for (var r = 0; r < rows; r++) {
                        for (var c = 0; c < cols; c++) {
                            var wx = ox + c * gx, wy = B - bh + 12 + r * gy;
                            var w = rect(wx, wy, ww, wh);
                            glass += w;
                            var isLit = rnd() < 0.78;
                            if (isLit) lit[Math.floor(rnd() * BUCKETS)] += w;
                            if (i === LAYERS.length - 1) wins.push({ x: wx, y: wy, w: ww, h: wh, lit: isLit, top: B - bh });
                        }
                    }
                }
                x += bw + (rnd() < 0.3 ? rnd() * 14 * small : -2);
            }

            if (i === LAYERS.length - 1) front = { svg: svg, windows: wins, W: W, H: B };
            svg.setAttribute('viewBox', '0 0 ' + W + ' ' + B);
            svg.querySelector('.body').setAttribute('d', body);
            svg.querySelector('.glass').setAttribute('d', glass);
            svg.querySelector('.beacon').setAttribute('d', beacon);
            svg.querySelectorAll('.lit').forEach(function (el, b) { el.setAttribute('d', lit[b]); });
        });
    }
    build();
    window.addEventListener('resize', function () { build(); Sky.refresh(); if (Sky.city.onBuild) Sky.city.onBuild(); });
    Sky.city = { el: ground, get front() { return front; }, onBuild: null };

    Sky.onFrame(function (p) {
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

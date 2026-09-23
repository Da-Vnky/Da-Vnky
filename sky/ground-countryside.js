/* =====================================================================
   ground-countryside.js — paper-cut rolling hills, trees, a windmill
   whose sails turn as you scroll, and a farmhouse that lights up at dusk.
   Load after sky/sky.js.
   ===================================================================== */

(function () {
    var Sky = window.Sky;

    Sky.css(
        '.ground-country { height: 34vh; min-height: 220px; }' +
        '.ground-country .layer { overflow: visible; }' +
        '.ground-country .l1 { filter: drop-shadow(0 -2px 4px rgba(0,0,0,.18)); }' +
        '.ground-country .l2 { filter: drop-shadow(0 -3px 5px rgba(0,0,0,.22)); }' +
        '.ground-country .l3 { filter: drop-shadow(0 -4px 7px rgba(0,0,0,.28)); }' +
        '.ground-country .l4 { filter: drop-shadow(0 -5px 8px rgba(0,0,0,.32)); }' +
        '.ground-country .lights { fill: #ffd98a; filter: drop-shadow(0 0 4px rgba(255,200,110,.9)); }'
    );

    // back to front. base = where the hill line sits (fraction of the ground's height from the top),
    // h = how tall the rolls are, day/night = paper colours, drift = sideways parallax
    var LAYERS = [
        { base: .34, h: .26, day: '#a9c49c', night: '#28364a', drift: .6, seed: 1, trees: 4 },
        { base: .52, h: .22, day: '#86ab7b', night: '#1f2c3d', drift: 1.0, seed: 2, trees: 7, windmill: .2 },
        { base: .70, h: .16, day: '#648f5b', night: '#172231', drift: 1.6, seed: 3, trees: 5, house: .7 },
        { base: .88, h: .08, day: '#4a7442', night: '#101a26', drift: 2.4, seed: 4, trees: 0 }
    ];

    var ground = document.createElement('div');
    ground.className = 'ground ground-country';
    ground.setAttribute('aria-hidden', 'true');
    ground.innerHTML = LAYERS.map(function (L, i) {
        return '<svg class="layer l' + (i + 1) + '"><path class="body"/><g class="sails"></g><path class="lights"/></svg>';
    }).join('');
    document.body.appendChild(ground);

    var svgs = Array.prototype.slice.call(ground.querySelectorAll('.layer'));
    var hubs = [];

    function f(n) { return n.toFixed(1); }

    function build() {
        var small = window.innerWidth < 620 ? 0.7 : 1;
        svgs.forEach(function (svg, i) {
            var L = LAYERS[i], W = svg.clientWidth, S = svg.clientHeight - 12;
            var rnd = Sky.seeded(L.seed * 977);
            var a = L.seed * 1.7;
            function y(x) {
                var u = x / W * Math.PI * 2;
                var v = .55 * Math.sin(u * 1.3 + a) + .3 * Math.sin(u * 2.9 + a * 2.1) + .15 * Math.sin(u * 6.1 + a * 3.3);
                return S * L.base - S * L.h * (.5 + .5 * v);
            }

            // the hill
            var d = 'M 0 ' + f(y(0));
            for (var x = 8; x <= W; x += 8) d += ' L ' + x + ' ' + f(y(x));
            d += ' L ' + W + ' ' + (S + 12) + ' L 0 ' + (S + 12) + ' Z ';

            // trees
            for (var t = 0; t < L.trees; t++) {
                var tx = W * (0.05 + 0.9 * rnd()), ty = y(tx) + 3, s = (22 + rnd() * 20) * small * (0.7 + i * 0.2);
                if (rnd() < 0.5) {   // pine
                    d += 'M ' + f(tx - s * .32) + ' ' + f(ty) + ' L ' + f(tx) + ' ' + f(ty - s * 1.5) + ' L ' + f(tx + s * .32) + ' ' + f(ty) + ' Z ';
                    d += 'M ' + f(tx - s * .24) + ' ' + f(ty - s * .5) + ' L ' + f(tx) + ' ' + f(ty - s * 1.9) + ' L ' + f(tx + s * .24) + ' ' + f(ty - s * .5) + ' Z ';
                } else {             // round tree
                    var r = s * .45;
                    d += 'M ' + f(tx - 2) + ' ' + f(ty) + ' L ' + f(tx - 2) + ' ' + f(ty - s * .7) + ' L ' + f(tx + 2) + ' ' + f(ty - s * .7) + ' L ' + f(tx + 2) + ' ' + f(ty) + ' Z ';
                    d += 'M ' + f(tx - r) + ' ' + f(ty - s * .7 - r * .6) + ' a ' + f(r) + ' ' + f(r) + ' 0 1 0 ' + f(2 * r) + ' 0 a ' + f(r) + ' ' + f(r) + ' 0 1 0 ' + f(-2 * r) + ' 0 Z ';
                }
            }

            var lights = '';
            // farmhouse
            if (L.house) {
                var hx = W * L.house, hw = 64 * small, hh = 38 * small, hy = Math.max(y(hx - hw / 2), y(hx + hw / 2)) + 6;
                d += 'M ' + f(hx - hw / 2) + ' ' + f(hy) + ' V ' + f(hy - hh) + ' H ' + f(hx + hw / 2) + ' V ' + f(hy) + ' Z ';
                d += 'M ' + f(hx - hw / 2 - 8 * small) + ' ' + f(hy - hh + 1) + ' L ' + f(hx) + ' ' + f(hy - hh - 30 * small) + ' L ' + f(hx + hw / 2 + 8 * small) + ' ' + f(hy - hh + 1) + ' Z ';
                d += 'M ' + f(hx + hw * .22) + ' ' + f(hy - hh - 10 * small) + ' V ' + f(hy - hh - 30 * small) + ' h ' + f(9 * small) + ' V ' + f(hy - hh - 4 * small) + ' Z ';
                var ww = 11 * small, wh = 12 * small, wy = hy - hh + 10 * small;
                lights += 'M ' + f(hx - hw * .32) + ' ' + f(wy) + ' h ' + f(ww) + ' v ' + f(wh) + ' h ' + f(-ww) + ' Z ';
                lights += 'M ' + f(hx + hw * .32 - ww) + ' ' + f(wy) + ' h ' + f(ww) + ' v ' + f(wh) + ' h ' + f(-ww) + ' Z ';
                lights += 'M ' + f(hx - 5 * small) + ' ' + f(hy - 20 * small) + ' h ' + f(10 * small) + ' v ' + f(14 * small) + ' h ' + f(-10 * small) + ' Z ';
            }

            // windmill tower (the sails are drawn separately so they can turn)
            var sails = svg.querySelector('.sails');
            sails.innerHTML = '';
            hubs[i] = null;
            if (L.windmill) {
                var mx = W * L.windmill, my = y(mx) + 6, th = 86 * small;
                d += 'M ' + f(mx - 15 * small) + ' ' + f(my) + ' L ' + f(mx - 8 * small) + ' ' + f(my - th) + ' L ' + f(mx + 8 * small) + ' ' + f(my - th) + ' L ' + f(mx + 15 * small) + ' ' + f(my) + ' Z ';
                d += 'M ' + f(mx - 11 * small) + ' ' + f(my - th + 1) + ' Q ' + f(mx) + ' ' + f(my - th - 18 * small) + ' ' + f(mx + 11 * small) + ' ' + f(my - th + 1) + ' Z ';
                var hubY = my - th - 4 * small, len = 52 * small, bw = 9 * small;
                var blade = '';
                for (var k = 0; k < 4; k++) {
                    blade += '<g transform="rotate(' + (k * 90) + ' ' + f(mx) + ' ' + f(hubY) + ')">' +
                             '<rect x="' + f(mx - 1.5) + '" y="' + f(hubY - len) + '" width="3" height="' + f(len) + '"/>' +
                             '<rect x="' + f(mx + 1.5) + '" y="' + f(hubY - len) + '" width="' + f(bw) + '" height="' + f(len * .72) + '" opacity=".85"/>' +
                             '</g>';
                }
                sails.innerHTML = blade + '<circle cx="' + f(mx) + '" cy="' + f(hubY) + '" r="' + f(4 * small) + '"/>';
                hubs[i] = [mx, hubY];
            }

            svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (S + 12));
            svg.querySelector('.body').setAttribute('d', d);
            svg.querySelector('.lights').setAttribute('d', lights);
        });
    }
    build();
    window.addEventListener('resize', function () { build(); Sky.refresh(); });

    Sky.onFrame(function (p) {
        var dusk = Sky.smooth(Sky.ramp(p, 0.3, 0.85));
        var lit = Sky.smooth(Sky.ramp(p, 0.45, 0.6));
        svgs.forEach(function (svg, i) {
            var L = LAYERS[i], col = Sky.mix(L.day, L.night, dusk);
            svg.querySelector('.body').setAttribute('fill', col);
            var sails = svg.querySelector('.sails');
            sails.setAttribute('fill', col);
            if (hubs[i]) sails.setAttribute('transform', 'rotate(' + (p * 1080).toFixed(1) + ' ' + hubs[i][0].toFixed(1) + ' ' + hubs[i][1].toFixed(1) + ')');
            svg.querySelector('.lights').style.opacity = lit;
            svg.style.transform = 'translateX(' + ((0.5 - p) * L.drift * 2).toFixed(2) + '%)';
        });
    });
})();

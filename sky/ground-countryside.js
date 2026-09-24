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
        { base: .70, h: .16, day: '#648f5b', night: '#172231', drift: 1.6, seed: 3, trees: 5, house: .7, sheep: 5, fence: .4 },
        { base: .88, h: .08, day: '#4a7442', night: '#101a26', drift: 2.4, seed: 4, trees: 0 }
    ];

    var ground = document.createElement('div');
    ground.className = 'ground ground-country';
    ground.setAttribute('aria-hidden', 'true');
    ground.innerHTML = LAYERS.map(function (L, i) {
        return '<svg class="layer l' + (i + 1) + '"><path class="body"/><g class="sails"></g><path class="lights"/>' + (L.sheep ? '<g class="flock"></g>' : '') + '</svg>';
    }).join('');
    document.body.appendChild(ground);

    var svgs = Array.prototype.slice.call(ground.querySelectorAll('.layer'));
    var hubs = [], hill = [], small = 1;

    function f(n) { return n.toFixed(1); }

    function build() {
        small = window.innerWidth < 620 ? 0.7 : 1;
        svgs.forEach(function (svg, i) {
            var L = LAYERS[i], W = svg.clientWidth, S = svg.clientHeight - 12;
            var rnd = Sky.seeded(L.seed * 977);
            var a = L.seed * 1.7;
            function y(x) {
                var u = x / W * Math.PI * 2;
                var v = .55 * Math.sin(u * 1.3 + a) + .3 * Math.sin(u * 2.9 + a * 2.1) + .15 * Math.sin(u * 6.1 + a * 3.3);
                return S * L.base - S * L.h * (.5 + .5 * v);
            }

            hill[i] = { y: y, W: W };
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

            // a little fence for the sheep to jump
            if (L.fence) {
                var fx = W * L.fence, fh = 13 * small;
                for (var q = -2; q <= 2; q++) {
                    var px = fx + q * 9 * small, py = y(px) + 2;
                    d += 'M ' + f(px - 1.3) + ' ' + f(py) + ' V ' + f(py - fh) + ' h 2.6 V ' + f(py) + ' Z ';
                }
                var fl = fx - 20 * small, fr = fx + 20 * small;
                d += 'M ' + f(fl) + ' ' + f(y(fl) - fh * .45) + ' L ' + f(fr) + ' ' + f(y(fr) - fh * .45) + ' L ' + f(fr) + ' ' + f(y(fr) - fh * .45 + 2) + ' L ' + f(fl) + ' ' + f(y(fl) - fh * .45 + 2) + ' Z ';
                d += 'M ' + f(fl) + ' ' + f(y(fl) - fh * .85) + ' L ' + f(fr) + ' ' + f(y(fr) - fh * .85) + ' L ' + f(fr) + ' ' + f(y(fr) - fh * .85 + 2) + ' L ' + f(fl) + ' ' + f(y(fl) - fh * .85 + 2) + ' Z ';
                hill[i].fence = fx;
            }

            svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (S + 12));
            svg.querySelector('.body').setAttribute('d', d);
            svg.querySelector('.lights').setAttribute('d', lights);
        });
    }
    build();
    window.addEventListener('resize', function () { build(); svgs.forEach(Sky.fitLayerArt); Sky.refresh(); });
    // slots, back to front: assets/countryside/hills-1 … hills-4 (each can have a -glow twin for lit windows)
    svgs.forEach(function (svg, i) { Sky.layerArt(svg, 'assets/countryside/hills-' + (i + 1)); });

    /* ---------------- the sheep: they graze, amble along, and hop the fence one by one ----------------
       your own sheep: assets/countryside/sheep (facing RIGHT, feet at the bottom, about 3:2),
       and if you like assets/countryside/sheep-jumping for mid-leap. */
    var flockLayer = LAYERS.findIndex ? LAYERS.findIndex(function (L) { return L.sheep; }) : 2;
    var flockEl = flockLayer >= 0 ? svgs[flockLayer].querySelector('.flock') : null;
    var sheepArt = null, jumpArt = null, dusk = 0;
    var calmSheep = window.matchMedia('(prefers-reduced-motion: reduce)');
    var SHEEP = '<g class="wool"><ellipse cx="0" cy="-9" rx="11" ry="7"/><circle cx="-7" cy="-12" r="4.5"/><circle cx="0" cy="-15" r="5"/><circle cx="7" cy="-12.5" r="4.5"/></g>' +
        '<g class="skin"><rect class="leg lf" x="4.5" y="-5" width="2.2" height="6" rx="1"/><rect class="leg lb" x="-7" y="-5" width="2.2" height="6" rx="1"/>' +
        '<ellipse class="head" cx="12.5" cy="-12" rx="4.2" ry="3.3"/><ellipse cx="11" cy="-15" rx="2.2" ry="1.2" transform="rotate(-30 11 -15)"/></g>';
    var flock = [];
    function makeFlock() {
        if (!flockEl) return;
        var L = LAYERS[flockLayer], W = hill[flockLayer].W, rnd = Sky.seeded(77);
        flockEl.innerHTML = '';
        flock = [];
        for (var n = 0; n < L.sheep; n++) {
            var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.innerHTML = sheepArt ? '<image class="pic" width="36" height="24" x="-18" y="-24" preserveAspectRatio="xMidYMax meet" href="' + sheepArt + '"/>' : SHEEP;
            flockEl.appendChild(g);
            flock.push({ el: g, x: W * (0.05 + 0.8 * n / L.sheep) + rnd() * 30, speed: 14 + rnd() * 10, graze: 1 + rnd() * 4, walking: rnd() < 0.5,
                         size: (0.85 + rnd() * 0.3) * small, bob: rnd() * 6 });
        }
    }
    function tendFlock(now) {
        if (!flockEl || !hill[flockLayer]) return;
        var H = hill[flockLayer], t = now / 1000, W = H.W, fx = H.fence;
        var wool = Sky.mix('#f5f0e4', '#6b788c', dusk), skin = Sky.mix('#3a2a20', '#141c28', dusk);
        flock.forEach(function (sh) {
            var dt = sh.last ? Math.min(0.1, t - sh.last) : 0;
            sh.last = t;
            if (!calmSheep.matches) {
                if (sh.walking) { sh.x += sh.speed * dt * small; sh.graze -= dt; if (sh.graze <= 0) { sh.walking = false; sh.graze = 2 + Math.random() * 6; } }
                else { sh.graze -= dt; if (sh.graze <= 0) { sh.walking = true; sh.graze = 3 + Math.random() * 7; } }
                // never stop to graze on top of the fence
                if (!sh.walking && fx && Math.abs(sh.x - fx) < 40 * small) sh.walking = true;
                if (sh.x > W + 30) { sh.x = -30; }                  // off to the right, back round from the left
            }
            var y = H.y(sh.x) + 3, lift = 0, jumping = false;
            if (fx) {                                             // the leap: a neat arc over the fence
                var from = fx - 26 * small, to = fx + 26 * small;
                if (sh.x > from && sh.x < to) { var k = (sh.x - from) / (to - from); lift = Math.sin(Math.PI * k) * 26 * small; jumping = true; }
            }
            var step = sh.walking && !jumping ? Math.abs(Math.sin(t * 9 + sh.bob)) * 1.2 : 0;
            var nod = !sh.walking ? Math.sin(t * 2 + sh.bob) * 1.5 + 2 : 0;       // head down, nibbling
            sh.el.setAttribute('transform', 'translate(' + sh.x.toFixed(1) + ' ' + (y - lift - step).toFixed(1) + ') scale(' + sh.size.toFixed(2) + ')' +
                (jumping ? ' rotate(' + (lift > 0 ? (sh.x < fx ? -12 : 10) : 0) + ')' : ''));
            if (sheepArt) {
                var pic = sh.el.querySelector('.pic');
                pic.setAttribute('href', jumping && jumpArt ? jumpArt : sheepArt);
            } else {
                sh.el.querySelector('.wool').setAttribute('fill', wool);
                sh.el.querySelector('.skin').setAttribute('fill', skin);
                sh.el.querySelector('.head').setAttribute('transform', 'translate(0 ' + nod.toFixed(1) + ')');
                sh.el.querySelectorAll('.leg').forEach(function (l, j) {
                    l.setAttribute('transform', jumping ? 'rotate(' + (j ? -35 : 35) + ' ' + (j ? -6 : 5.5) + ' -5)' : 'rotate(' + (Math.sin(t * 9 + sh.bob + j * 3) * (sh.walking ? 18 : 0)).toFixed(1) + ' ' + (j ? -6 : 5.5) + ' -5)');
                });
            }
        });
    }
    makeFlock();
    window.addEventListener('resize', makeFlock);
    Sky.findAsset('assets/countryside/sheep', function (url) {
        if (!url) return;
        sheepArt = url;
        Sky.findAsset('assets/countryside/sheep-jumping', function (u2) { jumpArt = u2 || null; makeFlock(); });
    });
    (function loop(now) {
        if (!document.hidden) tendFlock(now);
        requestAnimationFrame(loop);
    })(performance.now());

    Sky.onFrame(function (p) {
        dusk = Sky.smooth(Sky.ramp(p, 0.3, 0.85));
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

/* =====================================================================
   ground-view.js — a ground made from YOUR picture.
   Shows the image named in data-view (without extension; .svg .gif .webp
   or .png are all found automatically), and a placeholder garden until
   that file exists.

       <script src="sky/ground-view.js" data-view="assets/living/view"></script>

   Optional night version: add "-night" to the name (assets/living/view-night.png)
   and it cross-fades in as the sun goes down. Without one, the day picture
   is simply dimmed for the evening.

   Picture tips: 1920 × 800 (SVG) or 3840 × 1600 (PNG/WebP). Leave the sky
   part TRANSPARENT so the real sky shows through; put the horizon around
   40% down from the top. It's anchored to the bottom of the screen.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var me = document.currentScript;
    var base = (me && me.dataset.view) || 'assets/view';

    // (its look is in sky/css/ground-view.css, linked from each page's head)

    var ground = document.createElement('div');
    ground.className = 'ground ground-view';
    ground.dataset.slot = base;                                       // (where it sits: the asset manager's map)
    ground.setAttribute('aria-hidden', 'true');
    ground.innerHTML =
        '<svg class="garden">' +
            '<defs><radialGradient id="garden-glow"><stop offset="0" stop-color="rgba(255,205,120,.55)"/><stop offset="1" stop-color="rgba(255,205,120,0)"/></radialGradient></defs>' +
            '<path class="g1"/><path class="g2"/><path class="g3"/><circle class="g-glow"/><path class="g-lamp"/><path class="g4"/>' +
        '</svg>';
    document.body.appendChild(ground);

    /* ---------------- the placeholder garden ---------------- */
    var svg = ground.querySelector('.garden');
    var COLORS = {
        g1: ['#9fbf94', '#26344a'],     // far hedges and a tree
        g2: ['#789f6c', '#1c2839'],     // near hedge
        g3: ['#e9dbb8', '#4b4a55'],     // picket fence
        g4: ['#56804c', '#111a25']      // lawn
    };
    function f(n) { return n.toFixed(1); }
    function build() {
        var W = ground.clientWidth, H = ground.clientHeight, small = W < 620;
        var d1 = '', d2 = '', d3 = '', d4 = '', lamp = '';
        // far hedges: a row of soft bumps
        var y1 = H * 0.42;
        d1 += 'M0 ' + f(H) + ' L0 ' + f(y1);
        for (var x = 0; x < W + 60; x += 60) d1 += ' Q' + f(x + 30) + ' ' + f(y1 - 34) + ' ' + f(x + 60) + ' ' + f(y1);
        d1 += ' L' + f(W + 60) + ' ' + f(H) + ' Z';
        // a round tree
        var tx = W * (small ? 0.78 : 0.7), ty = y1 + 4;
        d1 += 'M' + f(tx - 6) + ' ' + f(ty) + ' h12 v-' + f(H * 0.22) + ' h-12 Z';
        d1 += 'M' + f(tx - 60) + ' ' + f(ty - H * 0.3) + ' a60 52 0 1 0 120 0 a60 52 0 1 0 -120 0 Z';
        d1 += 'M' + f(tx - 34) + ' ' + f(ty - H * 0.45) + ' a40 36 0 1 0 80 0 a40 36 0 1 0 -80 0 Z';
        // near hedge
        var y2 = H * 0.62;
        d2 += 'M0 ' + f(H) + ' L0 ' + f(y2);
        for (x = 0; x < W + 44; x += 44) d2 += ' Q' + f(x + 22) + ' ' + f(y2 - 22) + ' ' + f(x + 44) + ' ' + f(y2);
        d2 += ' L' + f(W + 44) + ' ' + f(H) + ' Z';
        // picket fence
        var y3 = H * 0.68, ph = small ? 34 : 46, pw = small ? 9 : 12, gap = small ? 20 : 26;
        d3 += 'M0 ' + f(y3 + ph * 0.35) + ' h' + f(W) + ' v6 h-' + f(W) + ' Z';
        d3 += 'M0 ' + f(y3 + ph * 0.75) + ' h' + f(W) + ' v6 h-' + f(W) + ' Z';
        for (x = 6; x < W; x += gap) d3 += 'M' + f(x) + ' ' + f(y3 + ph) + ' V' + f(y3 + 6) + ' L' + f(x + pw / 2) + ' ' + f(y3) + ' L' + f(x + pw) + ' ' + f(y3 + 6) + ' V' + f(y3 + ph) + ' Z';
        // garden lamp post
        var lx = W * (small ? 0.2 : 0.24), lt = y3 - (small ? 40 : 60);
        d3 += 'M' + f(lx - 3) + ' ' + f(H) + ' V' + f(lt) + ' h6 V' + f(H) + ' Z';
        d3 += 'M' + f(lx - 12) + ' ' + f(lt - 4) + ' h24 l-4 -6 h-16 Z';
        lamp = 'M' + f(lx - 9) + ' ' + f(lt - 26) + ' h18 v22 h-18 Z';
        d3 += 'M' + f(lx - 11) + ' ' + f(lt - 30) + ' h22 l-11 -9 Z';
        var glow = svg.querySelector('.g-glow');
        glow.setAttribute('cx', f(lx)); glow.setAttribute('cy', f(lt - 15)); glow.setAttribute('r', small ? 50 : 80);
        // lawn
        var y4 = H * 0.86;
        d4 += 'M0 ' + f(H + 12) + ' L0 ' + f(y4) + ' Q' + f(W * 0.3) + ' ' + f(y4 - 14) + ' ' + f(W * 0.6) + ' ' + f(y4 - 4) + ' T' + f(W) + ' ' + f(y4 - 8) + ' L' + f(W) + ' ' + f(H + 12) + ' Z';

        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.querySelector('.g1').setAttribute('d', d1);
        svg.querySelector('.g2').setAttribute('d', d2);
        svg.querySelector('.g3').setAttribute('d', d3);
        svg.querySelector('.g4').setAttribute('d', d4);
        svg.querySelector('.g-lamp').setAttribute('d', lamp);
    }
    build();
    window.addEventListener('resize', build);

    /* ---------------- your picture, if it's there ---------------- */
    var day = null, night = null;
    Sky.findAsset(base, function (url) {
        if (!url) return;
        day = document.createElement('img');
        day.className = 'view-art';
        day.src = url;
        day.alt = '';
        ground.insertBefore(day, svg);
        svg.remove();
        Sky.findAsset(base + '-night', function (nurl) {
            if (!nurl) return;
            night = document.createElement('img');
            night.className = 'view-art view-night';
            night.src = nurl;
            night.alt = '';
            ground.appendChild(night);
        });
        Sky.refresh();
    });

    Sky.onFrame(function (p) {
        var dusk = Sky.smooth(Sky.ramp(p, 0.3, 0.85));
        if (day) {
            if (night) { night.style.opacity = dusk; day.style.filter = ''; }
            else day.style.filter = 'brightness(' + (1 - 0.6 * dusk).toFixed(3) + ') saturate(' + (1 - 0.35 * dusk).toFixed(3) + ')';
            return;
        }
        for (var k in COLORS) svg.querySelector('.' + k).setAttribute('fill', Sky.mix(COLORS[k][0], COLORS[k][1], dusk));
        var lit = Sky.smooth(Sky.ramp(p, 0.42, 0.6));
        svg.querySelector('.g-lamp').style.opacity = 0.2 + 0.8 * lit;
        svg.querySelector('.g-glow').style.opacity = lit;
    });
})();

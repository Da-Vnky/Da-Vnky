/* =====================================================================
   static.js — the screen's static: a veil of TV snow over the page, like the
   grain in skizy's room. Very faint in the dungeon, always (27 Sep, Victor). In
   reset 4 there's none till they've been down in the dungeon; then it creeps up
   the longer they stay, thicker with every Claube and every picture destroyed
   down there, until the false god's bullet, and while the inverted P(Doom) record
   plays (sky/claubes.js). One veil for the whole page; each thing that wants static
   says how much, and the most anyone wants is what shows.

       <script src="sky/static.js"></script>            (after sky/sky.js)
       <link rel="stylesheet" href="sky/css/static.css">

   Sky.staticNoise.want(who, amount)   0 … 1 (0 lets go). e.g. want('dungeon', .06)
   Sky.staticNoise.want(who, amount, true)   the same, at once (a level brought back from
                                       the page before; the false god's bullet)
   Sky.staticNoise.burst(amount, ms)   a surge for a moment (a scream, a shot)
   Sky.staticNoise.level               what shows now
   It thickens gradually (27 Sep, Victor): RISE a second at most, so each new
   wanting creeps in; it thins faster (FALL). A burst is always at once.

   Its look: sky/css/static.css (--static on <html>: the veil's strength).
   The snow is drawn once, here, as a small tile; nothing to replace.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.staticNoise) return;
    var root = document.documentElement;

    // the snow: one tile of grey specks, drawn once (skizy's room does it the same way)
    function tile(n, soft) {
        var c = document.createElement('canvas');
        c.width = c.height = n;
        var x = c.getContext('2d'), im = x.createImageData(n, n), d = im.data;
        for (var i = 0; i < d.length; i += 4) {
            var v = Math.random() * 255 | 0;
            d[i] = d[i + 1] = d[i + 2] = v;
            d[i + 3] = soft ? 255 : (Math.random() < 0.5 ? 255 : 0);
        }
        x.putImageData(im, 0, 0);
        return 'url(' + c.toDataURL() + ')';
    }
    try {
        root.style.setProperty('--static-snow', tile(128, true));
        root.style.setProperty('--static-specks', tile(96, false));
    } catch (e) { return; }

    var veil = document.createElement('div');
    veil.className = 'static-veil';
    veil.setAttribute('aria-hidden', 'true');
    veil.innerHTML = '<div class="sv-snow"></div><div class="sv-specks"></div><div class="sv-tear"></div>';
    document.body.appendChild(veil);

    var RISE = 0.025, FALL = 0.3;                         // how fast it thickens and thins (of 0 … 1, a second)
    var wants = {}, surge = 0, surgeT = null, shown = -1, cur = 0, raf = 0, last = 0;
    function goal() {
        var m = 0;
        for (var k in wants) if (wants[k] > m) m = wants[k];
        return Math.max(0, Math.min(1, m));
    }
    function level() { return Math.max(cur, Math.min(1, surge)); }
    function draw() {
        var v = level();
        if (Math.abs(v - shown) < 0.002) return;
        shown = v;
        root.style.setProperty('--static', v.toFixed(3));
        veil.classList.toggle('on', v > 0.001);
        veil.classList.toggle('heavy', v > 0.35);
    }
    function step(t) {
        raf = 0;
        var dt = last ? Math.min(0.1, (t - last) / 1000) : 0.016, g = goal();
        last = t;
        cur = cur < g ? Math.min(g, cur + RISE * dt) : Math.max(g, cur - FALL * dt);
        draw();
        if (cur !== g) raf = requestAnimationFrame(step); else last = 0;
    }
    function go() { if (!raf) raf = requestAnimationFrame(step); }
    Sky.staticNoise = {
        want: function (who, amount, now) {
            if (amount > 0) wants[who] = amount; else delete wants[who];
            if (now && amount > cur) cur = Math.min(1, amount);
            draw(); go();
        },
        burst: function (amount, ms) {
            surge = Math.max(surge, amount); draw();
            clearTimeout(surgeT);
            surgeT = setTimeout(function () { surge = 0; draw(); }, ms || 400);
        },
        get level() { return level(); }
    };
    draw();
})();

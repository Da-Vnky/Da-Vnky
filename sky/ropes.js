/* =====================================================================
   ropes.js — resets 1 and 2: the sky's a stage set, and its props (the sun,
   the moon, the clouds, the things that fly past) hang on ropes from the
   flies (sky.css, "props on ropes"). Here they swing a little (28 Sep, Victor):
     - carried along (the sun and moon across the sky as you scroll, a blimp
       setting off), a prop lags behind and swings back and forth, settling
     - the wind pushes them (the weather's wind), and there's always a faint
       breeze, so nothing hangs dead still
     - the pointer brushing past one gives it a nudge
   Each is a pendulum hung from above the top of the screen: the prop moves
   sideways, its rope tilts about where it's tied (--rope-a in sky.css), and
   the sun and moon, each on a single rope, tilt with it (--prop-tilt).

       <script src="sky/ropes.js"></script>     (every page, after sky/sky.js)

   Nothing to draw: your rope is still assets/sky/rope.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || !document.documentElement.classList.contains('stage-strings')) return;     // (resets 1 and 2: sky/state.js)
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var PROPS = '.sun, .moon, .cloud, .flyer-blimp, .flyer-balloon, .flyer-birds';
    var TILTS = /(^|\s)(sun|moon)(\s|$)/;          // (hung by one rope: the whole prop tilts with it)
    var PERIOD = 3.4;                               // seconds for one swing there and back
    var SETTLE = 0.45;                              // how quickly a swing dies away (bigger: sooner)
    var CARRY = 0.4;                                // how much being carried along sets it swinging
    var BREEZE = 5;                                 // the faint breeze, always there (px a second, roughly)
    var WIND = 55;                                  // and how much more the weather's wind adds, at its strongest
    var NUDGE = 0.22;                               // how much the pointer passing by pushes one
    var MAX = 36;                                   // about the furthest a prop swings out (px): it eases off before it gets there

    var K = Math.pow(2 * Math.PI / PERIOD, 2);
    var props = [];
    function gather() {
        Array.prototype.forEach.call(document.querySelectorAll(PROPS), function (el) {
            if (el._rope) return;
            el._rope = { s: 0, u: 0, x: null, v: 0, ph: Math.random() * 6.3, tilt: TILTS.test(el.className) };
            props.push(el);
        });
    }
    gather();
    setTimeout(gather, 2000);                       // (the flyers, made a little after the page)

    // the pointer, brushing past
    var px = null, py = 0, pt = 0;
    document.addEventListener('pointermove', function (e) {
        var now = performance.now();
        if (px !== null && now > pt) {
            var vx = (e.clientX - px) / ((now - pt) / 1000);
            props.forEach(function (el) {
                var r = el.getBoundingClientRect();
                if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
                el._rope.u += Math.max(-600, Math.min(600, vx)) * NUDGE;
            });
        }
        px = e.clientX; py = e.clientY; pt = now;
    }, { passive: true });

    var last = 0;
    function frame(now) {
        requestAnimationFrame(frame);
        var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
        last = now;
        if (document.hidden) return;
        var H = window.innerHeight, t = now / 1000;
        var wind = Sky.weather && Sky.weather.levels ? Sky.weather.levels.wind || 0 : 0;
        // every prop's place first (reading), then every swing (writing): no back and forth for the browser
        var at = props.map(function (el) { return el.isConnected ? el.getBoundingClientRect() : null; });
        props.forEach(function (el, i) {
            var r = at[i], st = el._rope;
            if (!r || !r.width) return;
            var x = r.left + r.width / 2 - (st.shown || 0);                   // where it would hang, straight down
            if (st.x === null || Math.abs(x - st.x) > 160) { st.x = x; st.v = 0; }   // (first look, or it jumped: the clouds going round)
            var v = (x - st.x) / dt, a = Math.max(-3000, Math.min(3000, (v - st.v) / dt));
            st.x = x; st.v += (v - st.v) * 0.5;
            var push = (BREEZE + wind * WIND) * (Math.sin(t * 0.63 + st.ph) + 0.5 * Math.sin(t * 1.71 + st.ph * 2.3));
            var acc = -K * st.s - 2 * SETTLE * st.u - CARRY * a + push;
            st.u += acc * dt;
            st.s += st.u * dt;
            if (Math.abs(st.s) > MAX * 3) { st.s = Math.sign(st.s) * MAX * 3; st.u = 0; }
            var shown = MAX * Math.tanh(st.s / MAX);                         // (big swings ease off, rather than hitting a wall)
            var L = r.top + r.height / 2 + H * 0.4;                          // down from a point above the top of the screen
            var ang = -Math.asin(Math.max(-0.5, Math.min(0.5, shown / Math.max(120, L))));
            st.shown = shown;
            el.style.translate = shown.toFixed(2) + 'px 0';
            el.style.setProperty('--rope-a', ang.toFixed(4) + 'rad');
            if (st.tilt) el.style.setProperty('--prop-tilt', ang.toFixed(4) + 'rad');
        });
        props = props.filter(function (el) { return el.isConnected; });
    }
    requestAnimationFrame(frame);

    Sky.ropes = { get props() { return props.slice(); } };
})();

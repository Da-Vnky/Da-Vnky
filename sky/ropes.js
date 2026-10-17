/* =====================================================================
   ropes.js — resets 1 and 2: the sky's a stage set, and its props (the sun,
   the moon, the clouds, the things that fly past) hang on ropes from the
   flies (sky.css, "props on ropes"). Here they swing (28 Sep), and since
   16 Oct the ropes themselves move like rope:
     - carried along (the sun and moon across the sky as you scroll, a blimp
       setting off), a prop lags behind and swings back and forth, settling
     - the wind pushes them (the weather's wind), and there's always a faint
       breeze, so nothing hangs dead still
     - the pointer brushing past one gives it a nudge
     - each rope is a taut string from the prop up to the flies: when its
       prop is jerked about, the rope bows behind it and a ripple runs up it
       and fades; the breeze bellies it a little; the pointer drawn across a
       rope plucks it
     - the birds (an animated picture of yours): every beat of their wings
       tugs them up on their rope, and the rope twitches
   Each prop is a pendulum hung from above the top of the screen: the prop moves
   sideways, its rope leans from where it's tied, and the sun and moon, each on a
   single rope, tilt with it (--prop-tilt).

       <script src="sky/ropes.js"></script>     (every page, after sky/sky.js)

   Nothing to draw: your rope is still assets/sky/rope (each rope is drawn in short
   pieces now, end to end, each piece showing your rope picture).
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var root = document.documentElement;
    if (!Sky || !root.classList.contains('stage-strings')) return;     // (resets 1 and 2: sky/state.js)
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var PROPS = '.sun, .moon, .cloud, .flyer-blimp, .flyer-balloon, .flyer-birds';
    var TILTS = /(^|\s)(sun|moon)(\s|$)/;          // (hung by one rope: the whole prop tilts with it)
    // the swing of the prop on its rope
    var PERIOD = 3.4;                               // seconds for one swing there and back
    var SETTLE = 0.45;                              // how quickly a swing dies away (bigger: sooner)
    var CARRY = 0.4;                                // how much being carried along sets it swinging
    var BREEZE = 5;                                 // the faint breeze, always there (px a second, roughly)
    var WIND = 55;                                  // and how much more the weather's wind adds, at its strongest
    var NUDGE = 0.22;                               // how much the pointer passing by pushes one
    var MAX = 36;                                   // about the furthest a prop swings out (px): it eases off before it gets there
    // the rope itself (a taut string between the prop and the flies)
    var PIECES = 12;                                // pieces from the prop to the top of the screen
    var RIPPLE = 1.7;                               // how fast a ripple runs up it (rope lengths a second)
    var CALM = 2.2;                                 // how quickly the rope settles again (bigger: sooner)
    var LAG = 0.5;                                  // how much it bows behind its prop when the prop's jerked about
    var PLUCK = 0.6;                               // how much the pointer drawn across it plucks it
    var BEND = 40;                                  // the most it bows from straight (px)
    // the birds' wingbeat
    var BEAT_LIFT = 4;                              // how far a beat tugs the birds up (px)
    var BEAT_KICK = 170;                             // and how hard it twitches their rope
    // where each rope is tied on, as shares of its prop's box (across, down): the same places as sky.css's drawn ropes
    var TIES = { sun: [[.5, .5]], moon: [[.27, .5]], cloud: [[.3, .6], [.7, .6]], 'flyer-blimp': [[.32, .4], [.68, .4]],
                 'flyer-balloon': [[.5, .38]], 'flyer-birds': [[.5, .45]] };
    var LIVE = !root.classList.contains('dav-map');  // (the asset manager's map: the ropes stay drawn the plain way, still)

    var K = Math.pow(2 * Math.PI / PERIOD, 2);
    var STIFF = Math.pow(RIPPLE * PIECES, 2);
    var props = [];
    function tiesOf(el) {
        for (var k in TIES) if (el.classList.contains(k)) return TIES[k];
        return [[.5, .5]];
    }
    function gather() {
        Array.prototype.forEach.call(document.querySelectorAll(PROPS), function (el) {
            if (el._rope) return;
            var st = el._rope = { s: 0, u: 0, x: null, v: 0, ph: Math.random() * 6.3, tilt: TILTS.test(el.className),
                                  chains: [], tx: null, tv: 0, ta: 0 };
            if (LIVE) tiesOf(el).forEach(function (t) { st.chains.push(chain(el, t)); });
            props.push(el);
        });
        if (LIVE) root.classList.add('ropes-live');                      // (sky.css: the drawn, straight ropes step aside)
    }

    /* ---------------- a rope, in pieces ---------------- */
    function chain(el, tie) {
        var box = document.createElement('i');
        box.className = 'rope-chain calm';
        box.setAttribute('aria-hidden', 'true');
        box.style.left = (tie[0] * 100) + '%';
        box.style.top = (tie[1] * 100) + '%';
        var bits = [];
        for (var k = 0; k <= PIECES; k++) {                              // (the last piece runs on up out of sight)
            var b = document.createElement('b');
            if (k === PIECES) b.className = 'rope-top';
            box.appendChild(b);
            bits.push(b);
        }
        el.insertBefore(box, el.firstChild);
        var w = [], v = [];
        for (var i = 0; i <= PIECES; i++) { w.push(0); v.push(0); }
        return { el: box, tie: tie, bits: bits, w: w, v: v, base: 0, shown: '', line: null, calm: true, bob: 0, bobv: 0, last: -1 };
    }
    // the string: each point pulled towards its neighbours (so a ripple runs along it), slowed a little, pushed by the forces
    function shake(c, dt, force) {
        var n = PIECES, steps = Math.ceil(dt / 0.008), h = dt / steps, k, w = c.w, v = c.v;
        for (var s = 0; s < steps; s++) {
            for (k = 1; k < n; k++) v[k] += (STIFF * (w[k + 1] - 2 * w[k] + w[k - 1]) - 2 * CALM * v[k] + force(k / n)) * h;
            for (k = 1; k < n; k++) {
                w[k] += v[k] * h;
                if (w[k] > BEND) { w[k] = BEND; v[k] = 0; } else if (w[k] < -BEND) { w[k] = -BEND; v[k] = 0; }
            }
        }
    }
    // lay the pieces end to end, up from the tie, each point pushed sideways by its bow. the chain itself is turned by
    // --rope-a (sky.css), so this is in the rope's own frame: straight up is up the rope. a rope at rest is one long piece
    // (.calm) and costs nothing: the pieces are only moved while it's bowing or rippling
    function draw(c, len) {
        var n = PIECES, seg = len / n, k, big = 0;
        for (k = 1; k < n; k++) big = Math.max(big, Math.abs(c.w[k]), Math.abs(c.v[k]) * 0.05);
        if (big < 0.25) {
            if (!c.calm) {
                for (k = 0; k <= n; k++) { c.w[k] = 0; c.v[k] = 0; }
                c.calm = true; c.shown = '';
                c.el.classList.add('calm');
                c.bits[n].style.transform = '';
            }
            return;
        }
        if (c.calm) { c.calm = false; c.el.classList.remove('calm'); }
        if (!c.base || Math.abs(seg / c.base - 1) > 0.12) {              // (each piece is drawn this long, and only stretched a little)
            c.base = Math.max(8, seg);
            for (var j = 0; j < n; j++) c.bits[j].style.height = (c.base + 1).toFixed(1) + 'px';
        }
        var key = '';
        for (k = 0; k <= n; k++) key += Math.round(c.w[k] * 4) + ',';
        key += Math.round(seg * 4);
        if (key === c.shown) return;                                     // (nothing moved enough to see: leave it be)
        c.shown = key;
        for (k = 0; k < n; k++) {
            var dx = c.w[k + 1] - c.w[k], l = Math.sqrt(dx * dx + seg * seg);
            c.bits[k].style.transform = 'translate(' + c.w[k].toFixed(2) + 'px,' + (-seg * k).toFixed(2) + 'px) rotate(' +
                Math.atan2(dx, seg).toFixed(4) + 'rad) scaleY(' + ((l + 0.6) / (c.base + 1)).toFixed(4) + ')';
        }
        c.bits[n].style.transform = 'translate(0px,' + (-seg * n).toFixed(2) + 'px)';
    }

    /* ---------------- the birds' wingbeat ----------------
       a page can't ask a moving picture which frame it's on, so: the birds' picture is read once (ImageDecoder: Chrome,
       Edge, Firefox 133 on), to find each frame's length and the frames where the wings come down (the top of the
       picture drops most from one frame to the next). sky.js flies it as a flock (Sky.flock) and starts each bird's
       picture again from its first frame at each flight, noting when (_t0), so each bird's clock and ours run together.
       each bird hangs on its own rope; at each beat it's tugged up and its rope twitches. no ImageDecoder: no beat. */
    var beat = { times: null, loop: 0 };
    function readBirds(img) {
        if (beat.reading || typeof ImageDecoder !== 'function' || !img || !img.src) return;
        beat.reading = true;
        var src = img.currentSrc || img.src;
        fetch(src).then(function (r) { return r.ok ? r.blob() : null; }).then(function (blob) {
            if (!blob) return;
            var type = blob.type || ({ webp: 'image/webp', gif: 'image/gif', png: 'image/png' })[(/\.(\w+)(\?|#|$)/.exec(src) || [])[1]];
            return blob.arrayBuffer().then(function (buf) {
                var dec = new ImageDecoder({ data: buf, type: type });
                return dec.tracks.ready.then(function () {
                    var n = dec.tracks.selectedTrack.frameCount, i = 0, tops = [], durs = [];
                    var cv = document.createElement('canvas'); cv.width = 96; cv.height = 64;
                    var cx = cv.getContext('2d', { willReadFrequently: true });
                    function next() {
                        if (i >= n) return done();
                        return dec.decode({ frameIndex: i }).then(function (res) {
                            var f = res.image;
                            durs.push((f.duration || 83000) / 1000);
                            cx.clearRect(0, 0, 96, 64); cx.drawImage(f, 0, 0, 96, 64); f.close();
                            var a = cx.getImageData(0, 0, 96, 64).data, top = 64;
                            for (var y = 0; y < 64 && top === 64; y++) for (var x = 0; x < 96; x++) if (a[(y * 96 + x) * 4 + 3] > 40) { top = y; break; }
                            tops.push(top);
                            i++;
                            return next();
                        });
                    }
                    function done() {
                        dec.close();
                        if (n < 2) return;
                        var at = 0, times = [];
                        for (var k = 0; k < n; k++) {
                            var drop = tops[k] - tops[(k + n - 1) % n];                 // (the top of the picture falling: the wings coming down)
                            if (drop > 64 * 0.15) times.push({ t: at, k: Math.min(1, drop / 16) });
                            at += durs[k];
                        }
                        beat.loop = at;
                        beat.times = times.length ? times : null;
                    }
                    return next();
                });
            });
        }).catch(function () {});
    }
    // the flock's ropes: one more chain for each bird sky.js adds, tied on just above its middle
    function flockRopes(el) {
        var st = el._rope;
        if (!st || !LIVE) return;
        var lay = (Sky.flock && Sky.flock.layout) || [];
        var members = Sky.flock ? Sky.flock.members(el) : [];
        members.forEach(function (im) {
            var m = lay[im._flock || 0];
            if (!m) return;
            var tie = [(m.x + m.w * .5) / 100, (m.y + m.w * .45) / 100];
            var c = st.chains.filter(function (ch) { return Math.abs(ch.tie[0] - tie[0]) < .001 && Math.abs(ch.tie[1] - tie[1]) < .001; })[0];
            if (!c) { c = chain(el, tie); st.chains.push(c); }
            c.member = im;
        });
        readBirds(members[0]);
    }
    function watchBirds() {
        var el = document.querySelector('.flyer-birds');
        if (!el || el._beat) return;
        el._beat = true;
        el.addEventListener('flock', function () { flockRopes(el); });
        if (el.querySelector(':scope > img.flock')) flockRopes(el);
    }
    function beats(now, el, st, dt) {
        if (!el.classList.contains('flyer-birds')) return;
        var flying = el.classList.contains('flying');
        st.chains.forEach(function (c) {
            var im = c.member;
            if (!im) return;
            if (beat.times && im._t0 && flying) {
                var since = now - im._t0, t = since % beat.loop, loopNo = Math.floor(since / beat.loop);
                beat.times.forEach(function (b, i) {
                    var id = loopNo * 100 + i;
                    if (t >= b.t && id > c.last) {
                        c.last = id;
                        c.bobv -= BEAT_LIFT * 13.4 * b.k;                      // (tugged up…)
                        var side = Math.random() < 0.5 ? -1 : 1;                 // (…and its rope twitches, from the bottom)
                        c.v[1] += side * BEAT_KICK * b.k; c.v[2] += side * BEAT_KICK * 0.5 * b.k;
                    }
                });
            }
            // (sprung back down)
            c.bobv += (-180 * c.bob - 14 * c.bobv) * dt;
            c.bob += c.bobv * dt;
            var y = Math.abs(c.bob) < 0.02 && Math.abs(c.bobv) < 0.05 ? '' : '0 ' + c.bob.toFixed(2) + 'px';
            if (y !== c.bobShown) { c.bobShown = y; im.style.translate = y; c.el.style.translate = y; }
        });
    }

    gather();
    watchBirds();
    setTimeout(function () { gather(); watchBirds(); }, 2000);            // (the flyers, made a little after the page)

    // the pointer, brushing past a prop, or drawn across a rope
    var px = null, py = 0, pt = 0;
    document.addEventListener('pointermove', function (e) {
        var now = performance.now();
        if (px !== null && now > pt) {
            var vx = Math.max(-600, Math.min(600, (e.clientX - px) / ((now - pt) / 1000)));
            props.forEach(function (el) {
                var st = el._rope;
                var r = el.getBoundingClientRect();
                if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) st.u += vx * NUDGE;
                st.chains.forEach(function (c) {
                    var L = c.line;                                              // (where the rope was last drawn, on the screen)
                    if (!L || e.clientY > L.y || e.clientY < 0) return;
                    var k = (L.y - e.clientY) / L.len;                           // (how far up the rope the pointer is, 0…1)
                    var rx = L.x + (L.y - e.clientY) * Math.tan(L.ang);
                    if ((px - rx) * (e.clientX - rx) > 0) return;                // (didn't cross it)
                    var i = Math.max(1, Math.min(PIECES - 1, Math.round(k * PIECES)));
                    c.v[i] += vx * PLUCK; c.v[i - 1] += vx * PLUCK * 0.5; if (i + 1 < PIECES) c.v[i + 1] += vx * PLUCK * 0.5;
                });
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
            var jumped = st.x === null || Math.abs(x - st.x) > 160;          // (first look, or it jumped: the clouds going round)
            if (jumped) { st.x = x; st.v = 0; }
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
            // the birds' wingbeats: each bird tugged up on its rope, sprung back down
            beats(now, el, st, dt);
            st.shown = shown;
            el.style.translate = shown.toFixed(2) + 'px 0';
            el.style.setProperty('--rope-a', ang.toFixed(4) + 'rad');
            if (st.tilt) el.style.setProperty('--prop-tilt', ang.toFixed(4) + 'rad');
            // the ropes: how the tie point itself is being thrown about (the prop carried, swinging, bobbing)
            var tx = r.left + r.width / 2 + shown;
            if (jumped || st.tx === null) { st.tx = tx; st.tv = 0; st.ta = 0; }
            var tv = (tx - st.tx) / dt;
            st.ta += (Math.max(-4000, Math.min(4000, (tv - st.tv) / dt)) - st.ta) * 0.5;
            st.tx = tx; st.tv = tv;
            st.chains.forEach(function (c) {
                if (jumped) for (var k = 0; k <= PIECES; k++) { c.w[k] = 0; c.v[k] = 0; }
                var tieY = r.top + c.tie[1] * r.height, len = Math.max(40, (tieY + 60) / Math.cos(ang));
                var ta = st.ta;
                // (in the rope's own frame: the bottom being thrown about leaves the middle behind)
                if (!c.calm || Math.abs(ta) > 60) shake(c, dt, function (s) { return -ta * LAG * (1 - s); });
                draw(c, len);
                c.line = { x: r.left + c.tie[0] * r.width, y: tieY, len: len * Math.cos(ang), ang: ang };
            });
        });
        props = props.filter(function (el) { return el.isConnected; });
    }
    requestAnimationFrame(frame);

    Sky.ropes = { get props() { return props.slice(); }, beat: beat };
})();

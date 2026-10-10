/* =====================================================================
   beyond.js — beyond.html: the end, for those who went home (reset 8: sky/
   gnosis.js; 5 Oct, Victor). once they've gone, every page of the site
   comes here (sky/state.js, localStorage "dav-ending" = "escaped"), till they
   take the Sophia path back, or "forget their stay" (clear the site's data).

     space         nothing but space: still, dark, the faintest stars, and silence.
                   (the drawn whoosh that used to fill it was too loud: gone, 10 Oct, Victor.)
                   sound: assets/sounds/beyond, only if you add one (yours, looped, softly);
                   picture: assets/ui/beyond (optional, behind the stars)
     the reprise   a few seconds after the first tap, once a visit: the music of resets 1 and 2,
                   far away, a last time. yours: assets/sounds/reprise (played once). or
                   without it, your own reset 1 and reset 2 ambience (assets/sounds/
                   ambient-bright, then ambient), played far off. or without those, the
                   page's own: reset 1's bright tune (C, G, A minor, F), slowed, then
                   reset 2's slow chords, both through a long echo.
     the button    the Sophia path: back, to stay and wake the others ("stayed": the
                   site in its colours, no more resets).

   (browsers only let a page make sound after a tap: "tap anywhere to listen" until then.)
   its look: sky/css/beyond.css. this page has none of the rest of the site's code, on purpose.
   ===================================================================== */

(function () {
    var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    var ending = null;
    try { ending = localStorage.getItem('dav-ending'); } catch (e) {}
    // (only for those who went: anyone else is sent to the beginning. on your own computer it always shows, to look at)
    if (ending !== 'escaped' && !LOCAL) { location.replace('index.html'); return; }
    var body = document.body, calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // which of your own files are in (each folder's list.txt, written by publishing)
    var lists = {};
    function have(folder, name) {
        if (!lists[folder]) lists[folder] = fetch('assets/' + folder + '/list.txt', { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { return /<html/i.test(t) ? '' : t; }).catch(function () { return ''; });
        return lists[folder].then(function (t) {
            var hit = t.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) { return l.indexOf(name + '.') === 0 && /\.(mp3|ogg|png|jpe?g|webp|gif|svg)$/i.test(l) && l.slice(name.length + 1).indexOf('.') === -1; })[0];
            return hit ? 'assets/' + folder + '/' + hit : null;
        });
    }
    have('ui', 'beyond').then(function (u) { if (u) { var s = body.querySelector('.by-space'); s.style.backgroundImage = 'url("' + u + '")'; s.classList.add('has-art'); } });

    /* ---------------- the stars: the faintest, hardly moving ---------------- */
    var cv = body.querySelector('.by-stars'), cx = cv.getContext('2d'), stars = [], W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    function size() {
        W = cv.width = Math.round(innerWidth * dpr); H = cv.height = Math.round(innerHeight * dpr);
        cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
        stars = [];
        var n = Math.round(innerWidth * innerHeight / 3400);
        for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() < 0.06 ? 1.4 : 0.6) * dpr * (0.6 + Math.random() * 0.6), a: 0.15 + Math.random() * 0.6, tw: Math.random() * 6.3, sp: 0.2 + Math.random() * 0.8 });
    }
    size();
    window.addEventListener('resize', size);
    (function draw(t) {
        cx.clearRect(0, 0, W, H);
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            if (!calm) { s.x -= s.sp * 0.02 * dpr; if (s.x < -4) s.x = W + 4; }
            cx.globalAlpha = s.a * (calm ? 1 : 0.75 + 0.25 * Math.sin(t / 1600 * s.sp + s.tw));
            cx.fillStyle = '#e8eeff';
            cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, 6.283); cx.fill();
        }
        requestAnimationFrame(draw);
    })(0);

    /* ---------------- the sound ---------------- */
    var ac = null, master = null, started = false;
    function node(type, f, q) { var n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; return n; }
    function amp(v) { var g = ac.createGain(); g.gain.value = v; return g; }
    function chain() { for (var i = 0; i + 1 < arguments.length; i++) arguments[i].connect(arguments[i + 1]); return arguments[arguments.length - 1]; }
    // a long echo: far away, in a great empty place
    function echo(secs) {
        var c = ac.createConvolver(), len = Math.round(ac.sampleRate * secs), b = ac.createBuffer(2, len, ac.sampleRate);
        for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
        c.buffer = b; return c;
    }
    function file(url, loop) { var a = new Audio(url); a.loop = !!loop; a.crossOrigin = 'anonymous'; return a; }

    // the sound of space: yours if you've added one (assets/sounds/beyond), kept soft; without it, silence
    function space() {
        have('sounds', 'beyond').then(function (u) {
            if (!u) return;
            var a = file(u, true);
            chain(ac.createMediaElementSource(a), amp(0.35), master);
            a.play().catch(function () {});
        });
    }
    // the reprise: far off, once
    function reprise() {
        var far = node('lowpass', 2200), dry = amp(0.35), wet = amp(0.75), rv = echo(4.5), out = amp(0);
        chain(far, dry, out); chain(far, rv, wet, out); out.connect(master);
        var t0 = ac.currentTime;
        out.gain.setValueAtTime(0, t0); out.gain.linearRampToValueAtTime(1, t0 + 6);
        have('sounds', 'reprise').then(function (u) {
            if (u) { var a = file(u, false); chain(ac.createMediaElementSource(a), amp(0.9), master); a.play().catch(function () {}); return; }
            Promise.all([have('sounds', 'ambient-bright'), have('sounds', 'ambient')]).then(function (h) {
                if (h[0] || h[1]) { yours(h[0], h[1], far, out); return; }
                drawnReprise(far, out);
            });
        });
    }
    // your own reset 1 and reset 2 ambience, one after the other, far off
    function yours(bright, slow, far, out) {
        var parts = [bright, slow].filter(Boolean), at = 0;
        parts.forEach(function (u, i) {
            setTimeout(function () {
                var a = file(u, true), g = amp(0);
                chain(ac.createMediaElementSource(a), g, far);
                a.play().catch(function () {});
                var t = ac.currentTime;
                g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 5); g.gain.setValueAtTime(1, t + 40); g.gain.linearRampToValueAtTime(0, t + 48);
                setTimeout(function () { a.pause(); }, 50000);
            }, at);
            at += 42000;
        });
        setTimeout(function () { out.gain.linearRampToValueAtTime(0, ac.currentTime + 6); }, at + 6000);
    }
    // the page's own: reset 1's tune, slower, then reset 2's chords (sky/panel.js, the ambience stand-ins)
    function pluck(dest, t, f, len, v) {
        [['triangle', 1, v], ['sine', 2, v * 0.25]].forEach(function (p) {
            var o = ac.createOscillator(), g = amp(0);
            o.type = p[0]; o.frequency.value = f * p[1];
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p[2], t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
            chain(o, g, dest); o.start(t); o.stop(t + len + 0.1);
        });
    }
    function pad(dest, t, f, len, v) {
        var o = ac.createOscillator(), g = amp(0);
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + len * 0.4); g.gain.linearRampToValueAtTime(0, t + len);
        chain(o, g, dest); o.start(t); o.stop(t + len + 0.1);
    }
    function drawnReprise(far, out) {
        var t = ac.currentTime + 1, STEP = 0.45;                                   // (reset 1's was 0.3 a note: slowed, a memory of it)
        var BRIGHT = [[261.63, 329.63, 392.00], [246.94, 293.66, 392.00], [220.00, 261.63, 329.63], [220.00, 261.63, 349.23]], BASS = [130.81, 98.00, 110.00, 87.31];
        var ARP = [0, 1, 2, 1, 0, 2, 1, 2];
        for (var c = 0; c < 4; c++) for (var s = 0; s < 16; s++) {
            var at = t + (c * 16 + s) * STEP;
            pluck(far, at, BRIGHT[c][ARP[s % 8]] * 2, 1.4, 0.07);
            if (s % 4 === 0) pad(far, at, BASS[c], STEP * 4, 0.05);
        }
        var end1 = t + 64 * STEP;
        pluck(far, end1, 523.25, 4, 0.08); pluck(far, end1 + 0.02, 659.25, 4, 0.05);  // (and its last chord, left ringing)
        // reset 2's: the slow warm chords drifting one into the next, and now and then a soft note
        var SLOW = [[87.3, 130.8, 164.8, 220, 261.6], [110, 130.8, 164.8, 196, 293.7], [73.4, 110, 174.6, 220, 261.6], [65.4, 130.8, 164.8, 196, 246.9]];
        var PENT = [523.3, 587.3, 659.3, 784, 880];
        var t2 = end1 + 4;
        SLOW.forEach(function (ch, i) { ch.forEach(function (f) { pad(far, t2 + i * 7, f, 9.5, 0.035); }); });
        for (var k = 0; k < 7; k++) pluck(far, t2 + 2 + k * 4 + Math.random() * 1.5, PENT[Math.floor(Math.random() * PENT.length)], 3, 0.03);
        var end2 = t2 + 4 * 7 + 3;
        out.gain.setValueAtTime(1, end2); out.gain.linearRampToValueAtTime(0, end2 + 8);
    }
    function start() {
        if (started) return;
        started = true;
        try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
        master = amp(0); master.connect(ac.destination);
        if (ac.state === 'suspended') ac.resume();
        master.gain.linearRampToValueAtTime(0.8, ac.currentTime + 5);
        body.classList.add('listening');
        space();
        setTimeout(reprise, 6000);                                  // (no whoosh now: not so long a silence first)
    }
    ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, start, { once: false }); });

    /* ---------------- the Sophia path ---------------- */
    body.querySelector('.by-sophia').addEventListener('click', function (e) {
        e.stopPropagation();
        try { localStorage.setItem('dav-ending', 'stayed'); } catch (e2) {}
        body.classList.add('leaving');
        if (ac && master) master.gain.linearRampToValueAtTime(0, ac.currentTime + 2.4);
        setTimeout(function () { location.href = 'index.html'; }, 2600);
    });
})();

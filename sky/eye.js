/* =====================================================================
   eye.js — the sun's eye. From reset 3 on (FROM below), the sun opens an
   eye: your animated eyeball, a pupil that follows the visitor's pointer,
   and (if you draw them) eyelids that close over the pupil as it blinks.
   The resets before keep the ordinary sun (assets/sky/sun).

   slots, all in assets/sky/:
     sun-eyeball   the eye: a GIF (it can blink), with no pupil painted on it.
                   400 x 400 like the sun, the eye in the middle.
     sun-pupil     the pupil on its own, see-through. any see-through margin round it
                   is trimmed off here, so it can sit in the middle of a big canvas.
                   (until you add one, a drawn pupil stands in)
     sun-eyelids   optional: a GIF with the same frames as the eyeball, only the
                   lids (and anything that should cover the pupil), see-through
                   everywhere else. it's laid over the pupil, so the lids really
                   close over it. without it, the pupil squashes and hides itself
                   in step with the blink instead (BLINK below).

   A web page can't ask a GIF which frame it's showing, so this reads the GIF's
   frames itself and plays them, one clock for the eyeball, the pupil and the
   lids: they can never drift apart.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.eye) return;

    var FROM = 3;                                  // the first reset the eye is in
    var SIZE = 'min(480px, 40vw)';                 // how big the eye is in the sky
    // the pupil: its centre in the eye (% across, % down), its width (% of the eye's width),
    // and how far it can look (% of the eye's width)
    var EYE = { x: 50, y: 50, size: 34, reach: 11 };
    // without eyelids: how tall the pupil is on each frame, counting from 1 as your animation program
    // does (1 = open, 0 = hidden). frames that aren't listed: open.
    var BLINK = { 4: 0.45, 5: 0.12, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0.5 };

    var S = window.davSave;
    if (S && S.reset < FROM) { Sky.eye = { on: false }; return; }
    var sun = document.querySelector('.sun');
    if (!sun) return;

    // its look is in sky/css/eye.css (linked from each page's head); these are the values it takes from here
    document.documentElement.style.setProperty('--eye-size', SIZE);
    document.documentElement.style.setProperty('--eye-pupil-x', EYE.x);
    document.documentElement.style.setProperty('--eye-pupil-y', EYE.y);
    document.documentElement.style.setProperty('--eye-pupil-size', EYE.size);

    // the drawn stand-in pupil: dark, a little soft at the edge, a glint
    var PUPIL = '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="e-pg" cx=".45" cy=".42" r=".6">' +
        '<stop offset="0" stop-color="#0a0503"/><stop offset=".78" stop-color="#140904"/><stop offset="1" stop-color="#2a1206" stop-opacity="0"/></radialGradient></defs>' +
        '<circle cx="50" cy="50" r="48" fill="url(#e-pg)"/><ellipse cx="36" cy="33" rx="9" ry="6" fill="#fff4d8" opacity=".55"/></svg>';

    /* ---------------- reading a GIF: its frames, their timing, how each one is laid down ---------------- */
    function lzw(data, minSize, n) {
        var out = new Uint8Array(n), clear = 1 << minSize, eoi = clear + 1;
        var size = minSize + 1, mask = (1 << size) - 1, next = eoi + 1;
        var prefix = new Int32Array(4096), suffix = new Uint8Array(4096), stack = new Uint8Array(4097);
        for (var i = 0; i < clear; i++) { prefix[i] = -1; suffix[i] = i; }
        var bits = 0, cur = 0, pos = 0, op = 0, old = -1, first = 0;
        while (op < n) {
            while (bits < size) { if (pos >= data.length) return out; cur |= data[pos++] << bits; bits += 8; }
            var code = cur & mask; cur >>>= size; bits -= size;
            if (code === clear) { size = minSize + 1; mask = (1 << size) - 1; next = eoi + 1; old = -1; continue; }
            if (code === eoi) break;
            if (old === -1) { out[op++] = suffix[code]; old = first = code; continue; }
            var sp = 0, c = code;
            if (code >= next) { stack[sp++] = first; c = old; }
            while (c >= clear) { stack[sp++] = suffix[c]; c = prefix[c]; }
            stack[sp++] = first = suffix[c];
            while (sp && op < n) out[op++] = stack[--sp];
            if (next < 4096) {
                prefix[next] = old; suffix[next] = first; next++;
                if ((next & mask) === 0 && next < 4096) { size++; mask = (1 << size) - 1; }
            }
            old = code;
        }
        return out;
    }
    function readGif(buf) {
        var b = new Uint8Array(buf), p = 6;
        if (b[0] !== 71 || b[1] !== 73 || b[2] !== 70) return null;             // "GIF"
        function u16() { var v = b[p] | (b[p + 1] << 8); p += 2; return v; }
        var W = u16(), H = u16(), f = b[p++]; p += 2;
        var gct = null;
        if (f & 0x80) { var n = 3 * (1 << ((f & 7) + 1)); gct = b.subarray(p, p + n); p += n; }
        var frames = [], gce = null;
        while (p < b.length) {
            var c = b[p++];
            if (c === 0x3B) break;                                                 // the end
            if (c === 0x21) {                                                      // an extension
                var label = b[p++];
                if (label === 0xF9) { p++; var fl = b[p++]; var delay = u16(), ti = b[p++]; p++; gce = { disposal: (fl >> 2) & 7, delay: delay, trans: fl & 1 ? ti : -1 }; }
                else { while (b[p]) p += b[p] + 1; p++; }
                continue;
            }
            if (c !== 0x2C) break;                                                 // (not a picture: stop)
            var x = u16(), y = u16(), w = u16(), h = u16(), ff = b[p++], ct = gct;
            if (ff & 0x80) { var n2 = 3 * (1 << ((ff & 7) + 1)); ct = b.subarray(p, p + n2); p += n2; }
            var minCode = b[p++], len = 0, q = p;
            while (b[q]) { len += b[q]; q += b[q] + 1; }
            var data = new Uint8Array(len), o = 0;
            while (b[p]) { var s = b[p++]; data.set(b.subarray(p, p + s), o); o += s; p += s; }
            p++;
            var g = gce || { disposal: 0, delay: 10, trans: -1 };
            frames.push({ x: x, y: y, w: w, h: h, ct: ct, interlaced: !!(ff & 0x40), idx: lzw(data, minCode, w * h),
                          delay: Math.max(20, (g.delay || 10) * 10), disposal: g.disposal, trans: g.trans });
            gce = null;
        }
        if (!frames.length) return null;
        // each frame as a small picture of its own, ready to lay down
        frames.forEach(function (fr) {
            var cv = document.createElement('canvas');
            cv.width = fr.w; cv.height = fr.h;
            var cx = cv.getContext('2d'), im = cx.createImageData(fr.w, fr.h), px = im.data;
            var rows = [];
            if (fr.interlaced) [[0, 8], [4, 8], [2, 4], [1, 2]].forEach(function (pass) { for (var r = pass[0]; r < fr.h; r += pass[1]) rows.push(r); });
            for (var i = 0; i < fr.idx.length; i++) {
                var k = fr.idx[i];
                if (k === fr.trans || !fr.ct) continue;
                var row = fr.interlaced ? rows[Math.floor(i / fr.w)] : Math.floor(i / fr.w), col = i % fr.w, d = (row * fr.w + col) * 4;
                px[d] = fr.ct[k * 3]; px[d + 1] = fr.ct[k * 3 + 1]; px[d + 2] = fr.ct[k * 3 + 2]; px[d + 3] = 255;
            }
            cx.putImageData(im, 0, 0);
            fr.pic = cv; fr.idx = null;
        });
        return { W: W, H: H, frames: frames, total: frames.reduce(function (a, fr) { return a + fr.delay; }, 0) };
    }
    // a GIF on a canvas, shown frame by frame (show(i) goes to frame i, in order)
    function gifPlayer(gif, cls) {
        var cv = document.createElement('canvas');
        cv.className = cls; cv.width = gif.W; cv.height = gif.H;
        var cx = cv.getContext('2d'), at = -1, saved = null;
        function lay(i) {
            var prev = gif.frames[at], fr = gif.frames[i];
            if (i === 0 || !prev) cx.clearRect(0, 0, gif.W, gif.H);
            else if (prev.disposal === 2) cx.clearRect(prev.x, prev.y, prev.w, prev.h);
            else if (prev.disposal === 3 && saved) cx.putImageData(saved, 0, 0);
            saved = fr.disposal === 3 ? cx.getImageData(0, 0, gif.W, gif.H) : null;
            cx.drawImage(fr.pic, fr.x, fr.y);
            at = i;
        }
        return { el: cv, show: function (i) {
            i = i % gif.frames.length;
            if (i === at) return;
            if (i < at || at < 0) { at = -1; for (var k = 0; k <= i; k++) lay(k); }   // (from the top)
            else while (at < i) lay(at + 1);
        } };
    }
    function fetchGif(url) {
        return fetch(url).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (b) { return b ? readGif(b) : null; }).catch(function () { return null; });
    }
    function find(slot) { return new Promise(function (ok) { Sky.findAsset(slot, function (u) { ok(u || null); }); }); }

    // your pupil, with the see-through margin round it cut away (a square, the pupil in its middle),
    // so EYE.size is the pupil's own size however big a canvas it was drawn on
    function trim(url, done) {
        var im = new Image();
        im.onload = function () {
            try {
                var w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas');
                c.width = w; c.height = h;
                var g = c.getContext('2d');
                g.drawImage(im, 0, 0);
                var px = g.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
                for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
                if (x1 < 0 || (x1 - x0 > w * 0.94 && y1 - y0 > h * 0.94)) { done(url); return; }      // (nothing to trim)
                var side = Math.max(x1 - x0, y1 - y0) + 3, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
                var o = document.createElement('canvas');
                o.width = o.height = side;
                o.getContext('2d').drawImage(im, cx - side / 2, cy - side / 2, side, side, 0, 0, side, side);
                done(o.toDataURL('image/png'));
            } catch (e) { done(url); }
        };
        im.onerror = function () { done(url); };
        im.src = url;
    }

    /* ---------------- the eye ---------------- */
    Promise.all([find('assets/sky/sun-eyeball'), find('assets/sky/sun-pupil'), find('assets/sky/sun-eyelids')]).then(function (u) {
        if (!u[0]) { Sky.eye = { on: false }; return; }                             // no eye drawn yet: the ordinary sun
        var isGif = function (x) { return x && /\.gif(\?|$)/i.test(x); };
        return Promise.all([isGif(u[0]) ? fetchGif(u[0]) : null, isGif(u[2]) ? fetchGif(u[2]) : null]).then(function (g) { build(u, g[0], g[1]); });
    });

    function build(u, ballGif, lidsGif) {
        var eye = document.createElement('div');
        eye.className = 'eye';
        var ball = ballGif ? gifPlayer(ballGif, 'e-ball') : null;
        eye.appendChild(ball ? ball.el : Object.assign(document.createElement('img'), { className: 'e-ball', alt: '', src: u[0] }));
        var pupil = document.createElement('div');
        pupil.className = 'e-pupil';
        pupil.innerHTML = '<div class="e-pin">' + (u[1] ? '<img alt="">' : PUPIL) + '</div>';
        if (u[1]) trim(u[1], function (src) { pupil.querySelector('img').src = src; });
        eye.appendChild(pupil);
        var pin = pupil.firstChild;
        var lids = lidsGif ? gifPlayer(lidsGif, 'e-lids') : null;
        if (lids) eye.appendChild(lids.el);
        else if (u[2] && !lidsGif) eye.appendChild(Object.assign(document.createElement('img'), { className: 'e-lids', alt: '', src: u[2] }));
        sun.appendChild(eye);
        sun.classList.add('eye-sun');

        // one clock for all of it: the eyeball's own frame timing
        if (ball) {
            var fr = 0, due = 0, last = 0;
            var tick = function (now) {
                if (!last) { last = now; due = now + ballGif.frames[0].delay; }
                if (now - last > 2000) due = now;                                  // (back from another tab: carry on from here)
                last = now;
                while (now >= due) { fr = (fr + 1) % ballGif.frames.length; due += ballGif.frames[fr].delay; }
                ball.show(fr);
                if (lids) lids.show(fr);
                else { var k = BLINK[fr + 1]; k = k === undefined ? 1 : k; pin.style.transform = k === 1 ? '' : 'scaleY(' + k + ')'; pin.style.opacity = k > 0 ? 1 : 0; }
                requestAnimationFrame(tick);
            };
            ball.show(0);
            requestAnimationFrame(tick);
        }

        // the pupil follows the pointer (and keeps looking as the sun moves across the sky)
        var want = null, queued = false;
        function look() {
            queued = false;
            if (!want) return;
            var r = eye.getBoundingClientRect();
            if (!r.width) return;
            var dx = want[0] - (r.left + r.width * EYE.x / 100), dy = want[1] - (r.top + r.height * EYE.y / 100);
            var d = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(1, d / 260) * r.width * EYE.reach / 100 / d;
            pupil.style.transform = 'translate(calc(-50% + ' + (dx * k).toFixed(1) + 'px), calc(-50% + ' + (dy * k).toFixed(1) + 'px))';
        }
        function aim(x, y) { want = [x, y]; if (!queued) { queued = true; requestAnimationFrame(look); } }
        document.addEventListener('pointermove', function (e) { aim(e.clientX, e.clientY); }, { passive: true });
        document.addEventListener('pointerdown', function (e) { aim(e.clientX, e.clientY); }, { passive: true });
        document.addEventListener('mouseleave', function () { want = null; pupil.style.transform = ''; });
        Sky.onFrame(function () { if (want && !queued) { queued = true; requestAnimationFrame(look); } });
        Sky.eye = { on: true, frames: ballGif ? ballGif.frames.length : 1, EYE: EYE, BLINK: BLINK };
    }
})();

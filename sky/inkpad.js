/* =====================================================================
   inkpad.js — write a letter by hand: a sheet of the letters' paper to
   write on with a pen (a drawing tablet's pressure makes the line thicker,
   the pen's other end rubs out), or a mouse, or a finger.

   What's written becomes a see-through picture the width of a letter's
   writing, and goes into the letter on a line of its own, as
       ![handwritten](content/sea/2026-10-11-handwritten.png)
   which the letters show straight on the paper: no tape, no tilt
   (DavEmbed.isHand / DavEmbed.handwritten in sky/embeds.js).

   Used by the desk (desk.html) and the content manager's letters page
   (tools/letters.html): DavInk.open({ base, done(blob), cancel() }).
   base: a handwritten picture to carry on writing on (its address).
   ===================================================================== */
(function () {
    var W = 636;                 // a letter's writing is this wide on the site (the sheet's 780, less its margins)
    var S = 2;                   // kept at twice that, so it's sharp on big and sharp screens
    var PAGE = 720;              // a fresh sheet's height; "more paper" (or writing near the bottom) adds MORE
    var MORE = 360;
    var LINE = 32;               // the ruled lines, as on the letters' paper (paper.css)
    var INKS = [['ink', '#3a2716'], ['black ink', '#1b120a'], ['faded ink', '#6e5236'], ['sanguine', '#9a3b1f'], ['night blue', '#22304a']];
    var SIZES = [['fine', 1.3], ['pen', 2.1], ['bold', 3.4], ['brush', 6]];
    var ERASER = 5;              // the rubber is this many times the pen's size
    var KEEP = 'dav-inkpad';     // the ink and size last used (this browser)

    var pad = null;

    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
    function remembered() { try { return JSON.parse(localStorage.getItem(KEEP)) || {}; } catch (e) { return {}; } }
    function remember(o) { try { localStorage.setItem(KEEP, JSON.stringify(o)); } catch (e) {} }

    /* ---------------- a stroke, drawn: the same way while writing and when it's all drawn again ---------------- */
    // points are in the sheet's own units (W wide); p is the pen's pressure, or null (a mouse: the size as it is)
    function widthAt(st, p) {
        var k = p === null || p === undefined ? 1 : 0.28 + 1.44 * Math.pow(Math.max(0, Math.min(1, p)), 0.85);
        return st.size * (st.erase ? ERASER : 1) * k;
    }
    function begin(ctx, st) {
        ctx.globalCompositeOperation = st.erase ? 'destination-out' : 'source-over';
        ctx.strokeStyle = ctx.fillStyle = st.erase ? '#000' : st.color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }
    function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, p: a.p === null ? null : (a.p + b.p) / 2 }; }
    // the piece of the stroke that point i completes: a curve through the middles, bent by the point before
    function piece(ctx, st, i) {
        var P = st.pts;
        begin(ctx, st);
        if (i === 0) {                                          // (the first touch: a dot, the pen's width)
            ctx.beginPath();
            ctx.arc(P[0].x, P[0].y, widthAt(st, P[0].p) / 2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }
        var from = i === 1 ? P[0] : mid(P[i - 2], P[i - 1]), to = mid(P[i - 1], P[i]);
        ctx.lineWidth = (widthAt(st, from.p) + widthAt(st, to.p)) / 2;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(P[i - 1].x, P[i - 1].y, to.x, to.y);
        ctx.stroke();
    }
    function finish(ctx, st) {                                  // (the last little bit, to where the pen lifted)
        var P = st.pts, n = P.length;
        if (n < 2) return;
        var from = mid(P[n - 2], P[n - 1]);
        begin(ctx, st);
        ctx.lineWidth = (widthAt(st, from.p) + widthAt(st, P[n - 1].p)) / 2;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(P[n - 1].x, P[n - 1].y);
        ctx.stroke();
    }
    function whole(ctx, st) {
        for (var i = 0; i < st.pts.length; i++) piece(ctx, st, i);
        finish(ctx, st);
    }

    /* ---------------- the pad ---------------- */
    function open(opts) {
        if (pad) return;
        opts = opts || {};
        var mem = remembered();
        var ink = INKS[mem.ink] ? mem.ink : 0, size = SIZES[mem.size] ? mem.size : 1, rubbing = false;
        var strokes = [], undone = [], cur = null, base = null, H = PAGE, k = 1, penSeen = false, busy = false;

        var root = el('div', 'ink-pad');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-label', 'write by hand');
        root.innerHTML =
            '<div class="ip-bar">' +
                '<span class="ip-title">write by hand</span>' +
                '<span class="ip-group ip-inks">' + INKS.map(function (c, i) {
                    return '<button type="button" class="ip-ink" data-ink="' + i + '" title="' + c[0] + '" aria-label="' + c[0] + '" style="--c:' + c[1] + '"></button>'; }).join('') + '</span>' +
                '<span class="ip-group ip-sizes">' + SIZES.map(function (s, i) {
                    return '<button type="button" class="ip-size" data-size="' + i + '" title="' + s[0] + '" aria-label="' + s[0] + '"><i style="--d:' + Math.min(14, 2 + s[1] * 1.8) + 'px"></i></button>'; }).join('') + '</span>' +
                '<span class="ip-group">' +
                    '<button type="button" class="ip-btn ip-rub" title="rub out (E; or turn the pen round)">rubber</button>' +
                    '<button type="button" class="ip-btn ip-undo" title="ctrl+z">undo</button>' +
                    '<button type="button" class="ip-btn ip-redo" title="ctrl+shift+z">redo</button>' +
                    '<button type="button" class="ip-btn ip-clear">clear</button>' +
                    '<label class="ip-lines-sw"><input type="checkbox" checked> lines</label>' +
                '</span>' +
                '<span class="ip-gap"></span>' +
                '<button type="button" class="ip-btn ip-cancel">cancel</button>' +
                '<button type="button" class="ip-btn ip-done">put it in the letter</button>' +
            '</div>' +
            '<div class="ip-scroll"><div class="ip-sheet"><canvas class="ip-canvas"></canvas><canvas class="ip-live"></canvas><div class="ip-tip"></div></div>' +
                '<button type="button" class="ip-btn ip-more">+ more paper</button>' +
                '<p class="ip-hint">it goes into the letter as wide as the writing on the site, so write at the size you’d like to see it. ' +
                    'a pen’s pressure makes the line thicker, its other end rubs out · ctrl+z undoes · [ and ] change the size</p></div>';
        document.body.appendChild(root);
        document.documentElement.classList.add('ink-pad-open');
        pad = root;

        // (desynchronized: the browser may show the canvas straight away, without waiting for the rest of the page. Chrome and
        //  Edge take it; Firefox ignores it)
        var sheet = root.querySelector('.ip-sheet'), cv = root.querySelector('.ip-canvas'), ctx = cv.getContext('2d', { desynchronized: true });
        // the last little bit of the line, from where it's been drawn to right under the pen (drawn again on every move, so
        // the line never trails behind the pen while it waits for the next point)
        var lv = root.querySelector('.ip-live'), lctx = lv.getContext('2d', { desynchronized: true }), tail = null;
        var tip = root.querySelector('.ip-tip'), scroller = root.querySelector('.ip-scroll');

        function fit() {                                         // (narrower than a letter: the sheet's shrunk to fit, the writing the same)
            k = Math.min(1, (scroller.clientWidth - 24) / W);
            sheet.style.width = W * k + 'px';
            sheet.style.height = H * k + 'px';
            sheet.style.setProperty('--line', LINE * k + 'px');
            box = null;
        }
        function size2canvas() {
            cv.width = lv.width = W * S;
            cv.height = lv.height = H * S;
            fit();
            redraw();
        }
        function redraw() {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.clearRect(0, 0, cv.width, cv.height);
            ctx.setTransform(S, 0, 0, S, 0, 0);
            if (base) ctx.drawImage(base, 0, 0, W, base.naturalHeight * W / base.naturalWidth);
            strokes.forEach(function (st) {
                if (st.clear) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(S, 0, 0, S, 0, 0); return; }
                whole(ctx, st);
            });
            if (cur) whole(ctx, cur);
            ctx.globalCompositeOperation = 'source-over';
            state();
        }
        function state() {
            root.querySelector('.ip-undo').disabled = !strokes.length;
            root.querySelector('.ip-redo').disabled = !undone.length;
            root.querySelectorAll('.ip-ink').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.ink === ink && !rubbing)); });
            root.querySelectorAll('.ip-size').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.size === size)); });
            root.querySelector('.ip-rub').setAttribute('aria-pressed', String(rubbing));
            var d = SIZES[size][1] * (rubbing ? ERASER : 1) * k;
            tip.style.setProperty('--tip', Math.max(4, d) + 'px');
            tip.classList.toggle('rub', rubbing);
            remember({ ink: ink, size: size });
        }
        function grow(by) { H += by; size2canvas(); }

        /* the pen */
        // where the paper is on the screen: measured when the pen goes down (and on scrolling), not at every point, so the
        // browser never has to stop and work out the page's layout in the middle of a line
        var box = null;
        function measure() { box = cv.getBoundingClientRect(); }
        function at(e) {
            var r = box || (measure(), box);
            return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k, p: e.pointerType === 'pen' || (e.pointerType === 'touch' && e.pressure && e.pressure !== 0.5) ? (e.pressure || 0.5) : null };
        }
        var smooth = null;
        function add(e) {
            var p = at(e);
            if (p.p !== null) { smooth = smooth === null ? p.p : smooth * 0.4 + p.p * 0.6; p.p = smooth; }
            var P = cur.pts, last = P[P.length - 1];
            if (last && Math.abs(last.x - p.x) < 0.35 && Math.abs(last.y - p.y) < 0.35) return;     // (no move: nothing to add)
            P.push(p);
            ctx.setTransform(S, 0, 0, S, 0, 0);
            piece(ctx, cur, P.length - 1);
            ctx.globalCompositeOperation = 'source-over';
        }
        function clearTail() {
            if (!tail) return;
            lctx.setTransform(1, 0, 0, 1, 0, 0);
            lctx.clearRect(tail[0], tail[1], tail[2], tail[3]);
            tail = null;
        }
        // from the middle of the last two points to the newest one (and on to where the browser guesses the pen's going)
        function drawTail(ahead) {
            clearTail();
            var P = cur.pts, n = P.length;
            if (cur.erase || n < 2) return;
            var from = { x: (P[n - 2].x + P[n - 1].x) / 2, y: (P[n - 2].y + P[n - 1].y) / 2, p: P[n - 1].p }, pts = [from, P[n - 1]].concat(ahead || []);
            lctx.setTransform(S, 0, 0, S, 0, 0);
            begin(lctx, cur);
            var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, wmax = 0;
            for (var i = 1; i < pts.length; i++) {
                var w = widthAt(cur, pts[i].p);
                lctx.lineWidth = w;
                lctx.beginPath();
                lctx.moveTo(pts[i - 1].x, pts[i - 1].y);
                lctx.lineTo(pts[i].x, pts[i].y);
                lctx.stroke();
                wmax = Math.max(wmax, w);
            }
            pts.forEach(function (q) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); });
            var pad = wmax + 2;
            tail = [Math.floor((x0 - pad) * S), Math.floor((y0 - pad) * S), Math.ceil((x1 - x0 + 2 * pad) * S), Math.ceil((y1 - y0 + 2 * pad) * S)];
        }
        cv.addEventListener('pointerdown', function (e) {
            if (busy) return;
            if (e.pointerType === 'pen') penSeen = true;
            else if (e.pointerType === 'touch' && penSeen) return;          // (a hand resting on the screen while the pen writes)
            if (e.button !== 0 && e.button !== 5) return;
            e.preventDefault();
            measure();
            try { cv.setPointerCapture(e.pointerId); } catch (err) {}    // (so the line carries on off the paper's edge)
            var erase = rubbing || e.button === 5 || (e.buttons & 32) === 32;  // (the pen turned round: its rubber end)
            cur = { pts: [], size: SIZES[size][1], color: INKS[ink][1], erase: erase, id: e.pointerId };
            smooth = null;
            add(e);
        });
        // the points: as soon as the tablet sends them where the browser can (pointerrawupdate: Chrome and Edge), else with
        // each frame's move (Firefox), with every point in between (getCoalescedEvents), not just one a frame
        function moved(e) {
            if (!cur || e.pointerId !== cur.id) return;
            if (e.type === 'pointerrawupdate') cur.raw = true;      // (then the frame-by-frame moves are left alone: no point twice)
            else if (cur.raw) return;
            var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
            if (!list.length) list = [e];
            list.forEach(add);
            var guess = e.getPredictedEvents ? e.getPredictedEvents() : [];
            drawTail(guess.slice(0, 2).map(function (g) { var q = at(g); if (q.p !== null) q.p = smooth; return q; }));
        }
        cv.addEventListener('pointerrawupdate', moved);
        var rubShown = false;
        cv.addEventListener('pointermove', function (e) {
            var r = box || (measure(), box);
            tip.style.transform = 'translate(' + (e.clientX - r.left) + 'px,' + (e.clientY - r.top) + 'px)';
            var rub = rubbing || (e.buttons & 32) === 32;
            if (rub !== rubShown) { rubShown = rub; tip.classList.toggle('rub', rub); }
            moved(e);
        });
        cv.addEventListener('pointerenter', measure);
        scroller.addEventListener('scroll', function () { box = null; }, { passive: true });
        window.addEventListener('resize', function () { box = null; });
        function lift(e) {
            if (!cur || (e && e.pointerId !== cur.id)) return;
            clearTail();
            ctx.setTransform(S, 0, 0, S, 0, 0);
            finish(ctx, cur);
            ctx.globalCompositeOperation = 'source-over';
            strokes.push(cur);
            undone = [];
            var low = Math.max.apply(null, cur.pts.map(function (p) { return p.y; }));
            cur = null;
            if (low > H - 140) grow(MORE);                       // (writing near the bottom: more paper underneath)
            else state();
        }
        cv.addEventListener('pointerup', lift);
        cv.addEventListener('pointercancel', lift);
        cv.addEventListener('pointerenter', function () { tip.hidden = false; });
        cv.addEventListener('pointerleave', function () { tip.hidden = true; });
        cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        /* the buttons */
        root.querySelectorAll('.ip-ink').forEach(function (b) { b.addEventListener('click', function () { ink = +b.dataset.ink; rubbing = false; state(); }); });
        root.querySelectorAll('.ip-size').forEach(function (b) { b.addEventListener('click', function () { size = +b.dataset.size; state(); }); });
        function undo() { if (strokes.length) { undone.push(strokes.pop()); redraw(); } }
        function redo() { if (undone.length) { strokes.push(undone.pop()); redraw(); } }
        root.querySelector('.ip-rub').addEventListener('click', function () { rubbing = !rubbing; state(); });
        root.querySelector('.ip-undo').addEventListener('click', undo);
        root.querySelector('.ip-redo').addEventListener('click', redo);
        root.querySelector('.ip-clear').addEventListener('click', function () {
            if (!strokes.length && !base) return;
            strokes.push({ clear: true }); undone = []; redraw();
        });
        root.querySelector('.ip-lines-sw input').addEventListener('change', function () { sheet.classList.toggle('no-lines', !this.checked); });
        root.querySelector('.ip-more').addEventListener('click', function () { grow(MORE); scroller.scrollTop = scroller.scrollHeight; });
        root.querySelector('.ip-cancel').addEventListener('click', function () { leave(true); });
        root.querySelector('.ip-done').addEventListener('click', done);

        function written() { return strokes.some(function (s) { return !s.clear; }) || !!base; }
        function close() {
            window.removeEventListener('keydown', keys, true);
            window.removeEventListener('resize', fit);
            root.remove();
            document.documentElement.classList.remove('ink-pad-open');
            pad = null;
        }
        function leave(ask) {
            if (ask && strokes.length && !confirm('throw away what you’ve written here?')) return;
            close();
            if (opts.cancel) opts.cancel();
        }
        // the writing, as a picture: the paper's full width (so it shows at the size it was written), from just above
        // the first ink to just below the last
        function done() {
            if (busy) return;
            var out = document.createElement('canvas');
            out.width = cv.width; out.height = cv.height;
            var o = out.getContext('2d');
            o.drawImage(cv, 0, 0);
            var data, top = -1, bottom = -1, w = out.width;
            try { data = o.getImageData(0, 0, out.width, out.height).data; }
            catch (err) { alert('the writing you carried on from can’t be read back here, so this can’t be saved. start a fresh one?'); return; }
            for (var y = 0; y < out.height && top < 0; y++) for (var x = 3; x < w * 4; x += 4) if (data[y * w * 4 + x] > 8) { top = y; break; }
            for (y = out.height - 1; y >= 0 && bottom < 0; y--) for (x = 3; x < w * 4; x += 4) if (data[y * w * 4 + x] > 8) { bottom = y; break; }
            if (top < 0) { leave(false); return; }                 // (nothing written: nothing to put in)
            top = Math.max(0, top - 10 * S);
            bottom = Math.min(out.height - 1, bottom + 18 * S);
            var cut = document.createElement('canvas');
            cut.width = w; cut.height = bottom - top + 1;
            cut.getContext('2d').drawImage(out, 0, top, w, cut.height, 0, 0, w, cut.height);
            busy = true;
            root.classList.add('ip-busy');
            cut.toBlob(function (blob) {
                busy = false;
                root.classList.remove('ip-busy');
                if (!blob) { alert('couldn’t make the picture of it, sorry'); return; }
                close();
                if (opts.done) opts.done(blob);
            }, 'image/png');
        }
        function keys(e) {
            var c = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
            if (c && key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
            else if (c && key === 'y') { e.preventDefault(); redo(); }
            else if (c && key === 's') { e.preventDefault(); done(); }
            else if (key === 'escape') { e.preventDefault(); leave(true); }
            else if (!c && key === 'e') { rubbing = !rubbing; state(); }
            else if (!c && key === '[') { size = Math.max(0, size - 1); state(); }
            else if (!c && key === ']') { size = Math.min(SIZES.length - 1, size + 1); state(); }
            else return;
            e.stopPropagation();
        }
        window.addEventListener('keydown', keys, true);
        window.addEventListener('resize', fit);

        // carrying on with one written before: it's the first thing on the sheet (and can be rubbed out like the rest)
        if (opts.base) {
            var im = new Image();
            im.crossOrigin = 'anonymous';                          // (the desk's copies come from Supabase: so it can be saved again)
            im.onload = function () {
                base = im;
                H = Math.max(PAGE, Math.ceil(im.naturalHeight * W / im.naturalWidth) + MORE / 2);
                size2canvas();
            };
            im.onerror = function () { size2canvas(); };
            im.src = opts.base;
        }
        size2canvas();
        tip.hidden = true;
    }

    window.DavInk = { open: open, isOpen: function () { return !!pad; }, W: W };
})();

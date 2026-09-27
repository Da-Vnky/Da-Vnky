/* =====================================================================
   textures.js — your canvas and paper, under everything painted or written.
   Every painting (in the frames, on the easel, in the portfolio and the
   gallery, up close) gets your canvas texture laid over it, multiplied in,
   so the paint looks like it's on the weave. Every letter (the homepage's
   letters, bottle messages, the pile of letters, the note in the dungeon)
   is written on your paper: the sheet is your picture, torn edges and all,
   and the writing is multiplied into it like ink.

   Your textures live in assets/textures/ (the asset manager, or by hand):
       canvas-1, canvas-2 …          the canvas for paintings
       letter-1, letter-2 …          the paper for letters
       dungeonletter-1, -2 …         the paper for the hidden letters: anything in the
                                     hidden pool (the dungeon's note, and any paper marked
                                     data-paper="hidden" later)
   with more than one of a kind, each painting or letter takes one of them
   (always the same one for the same thing, picked from its name).
   Without any, everything looks as it did.

   The paper keeps its own shape: a letter is always at least one whole sheet of
   your paper (its width and height in the same proportions as your picture, never
   squashed into a strip). A note that opens up (the dungeon's, a bottle's, one from
   the pile) is exactly one sheet, as big as fits the screen; longer writing scrolls
   on it. The canvas lies over just the painting itself, not the empty space around
   a painting that doesn't fill its easel.

   STRENGTH: how strongly the canvas shows through a painting (0 … 1).
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.textures) return;
    var STRENGTH = 0.9;
    var root = document.documentElement;

    // what's a painting, what's a letter (what's a hidden letter)
    var PAINTINGS = '.gallery-frame .gf-pic, .easel .easel-canvas, .gallery .face .art';
    var PAINT_IMGS = '.frame-zoom figure img, .vv-card img, .vv-zoom img';          // (these get a wrapper to carry the canvas)
    var LETTERS = '.sheet, .uncork .u-card, .bv-card, .pv-card';
    var HIDDEN = '.paper-view .pv-sheet, [data-paper=hidden]';

    // (its look is in sky/css/textures.css, linked from each page's head)
    root.style.setProperty('--tx-strength', STRENGTH);

    /* ---------------- your textures ---------------- */
    var kinds = { canvas: [], letter: [], dungeonletter: [] };
    function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
    function pick(kind, key) { var l = kinds[kind]; return l.length ? l[hash(key || '') % l.length] : null; }
    function keyOf(el) {
        var im = el.querySelector && el.querySelector('img, video');
        return (im && (im.getAttribute('src') || '')) || el.dataset.frame || el.className || '';
    }

    // each paper picture's own proportions (width ÷ height), once it's loaded, and where the paper itself starts
    // inside it: a torn edge is see-through, so the real edge is a little way in (top, bottom, left, right, as a
    // share of the picture). the scroll's rolls sit on that edge, not on the picture's border
    var shapes = {};
    function edgesOf(im) {
        var e = { t: 0, b: 0, l: 0, r: 0 };
        try {
            var W = 200, H = Math.max(1, Math.round(W * im.naturalHeight / im.naturalWidth));
            var c = document.createElement('canvas'); c.width = W; c.height = H;
            var g = c.getContext('2d'); g.drawImage(im, 0, 0, W, H);
            var d = g.getImageData(0, 0, W, H).data;
            var a = function (x, y) { return d[(y * W + x) * 4 + 3] / 255; };
            // a row (or column) counts as paper once most of its middle is solid
            var row = function (y) { var s = 0, n = 0; for (var x = Math.round(W * .2); x < W * .8; x++, n++) s += a(x, y); return s / n; };
            var col = function (x) { var s = 0, n = 0; for (var y = Math.round(H * .2); y < H * .8; y++, n++) s += a(x, y); return s / n; };
            var lim = .6, i;
            for (i = 0; i < H / 4 && row(i) < lim; i++); e.t = i / H;
            for (i = 0; i < H / 4 && row(H - 1 - i) < lim; i++); e.b = i / H;
            for (i = 0; i < W / 4 && col(i) < lim; i++); e.l = i / W;
            for (i = 0; i < W / 4 && col(W - 1 - i) < lim; i++); e.r = i / W;
        } catch (err) {}                                        // (a picture from elsewhere can't be looked into: no matter)
        return e;
    }
    function shapeOf(u, cb) {
        var sh = shapes[u];
        if (sh && !Array.isArray(sh)) { cb(sh); return; }
        if (sh) { sh.push(cb); return; }
        var waiting = shapes[u] = [cb], im = new Image();
        im.onload = function () {
            var done = { ratio: im.naturalWidth && im.naturalHeight ? im.naturalWidth / im.naturalHeight : .8, edge: edgesOf(im) };
            shapes[u] = done; waiting.forEach(function (f) { f(done); });
        };
        im.onerror = function () { var done = { ratio: .8, edge: { t: 0, b: 0, l: 0, r: 0 } }; shapes[u] = done; waiting.forEach(function (f) { f(done); }); };
        im.src = u;
    }

    // where the painting itself is, inside its box (a picture that doesn't fill it leaves empty space around it)
    function fitCanvas(el) {
        var m = el.querySelector('img, video');
        if (!m || !el.offsetWidth) { ['--tx-l', '--tx-t', '--tx-w', '--tx-h'].forEach(function (k) { el.style.removeProperty(k); }); return; }
        var box = el.getBoundingClientRect(), r = m.getBoundingClientRect();
        var k = box.width ? el.offsetWidth / box.width : 1;                     // (in case it's shown scaled up or down)
        var x = r.left, y = r.top, w = r.width, h = r.height;
        var nw = m.naturalWidth || m.videoWidth, nh = m.naturalHeight || m.videoHeight;
        if (nw && nh && getComputedStyle(m).objectFit === 'contain') {
            var s = Math.min(w / nw, h / nh), cw = nw * s, ch = nh * s;
            x += (w - cw) / 2; y += (h - ch) / 2; w = cw; h = ch;
        }
        el.style.setProperty('--tx-l', ((x - box.left) * k).toFixed(1) + 'px');
        el.style.setProperty('--tx-t', ((y - box.top) * k).toFixed(1) + 'px');
        el.style.setProperty('--tx-w', (w * k).toFixed(1) + 'px');
        el.style.setProperty('--tx-h', (h * k).toFixed(1) + 'px');
    }
    var watched = typeof ResizeObserver === 'function' ? new ResizeObserver(function (es) { es.forEach(function (e) { fitCanvas(e.target); }); }) : null;
    function dressPainting(el) {
        var u = pick('canvas', keyOf(el) + '|' + (el.closest('[data-frame]') ? el.closest('[data-frame]').dataset.frame : ''));
        if (!u) return;
        el.classList.add('tx-canvas');
        el.style.setProperty('--tx-pick', 'url("' + u + '")');
        var m = el.querySelector('img, video');
        if (m && !m._txFit) {
            m._txFit = true;
            m.addEventListener('load', function () { fitCanvas(el); });
            m.addEventListener('loadedmetadata', function () { fitCanvas(el); });
        }
        if (watched && !el._txWatched) { el._txWatched = true; watched.observe(el); }
        fitCanvas(el);
    }
    function wrapImg(img) {
        if (img.parentNode.classList && img.parentNode.classList.contains('tx-wrap')) { dressPainting(img.parentNode); return; }
        var w = document.createElement('span');
        w.className = 'tx-wrap';
        img.parentNode.insertBefore(w, img);
        w.appendChild(img);
        dressPainting(w);
    }
    function dressLetter(el, hidden) {
        var u = hidden ? pick('dungeonletter', keyOf(el)) || pick('letter', keyOf(el)) : pick('letter', keyOf(el));
        if (!u) return;
        el.classList.add('tx-paper');
        el.style.setProperty('--tx-pick', 'url("' + u + '")');
        shapeOf(u, function (sh) {
            el.style.setProperty('--tx-ratio', sh.ratio.toFixed(4));
            // a letter with rolls (the homepage's): they go on the paper's real top and bottom edge
            var holder = el.classList.contains('sheet') && el.parentNode && el.parentNode.querySelector('.curl') ? el.parentNode : null;
            if (holder) {
                holder.classList.add('tx-rolled');
                [['t', sh.edge.t], ['b', sh.edge.b], ['l', sh.edge.l], ['r', sh.edge.r]].forEach(function (k) {
                    holder.style.setProperty('--tx-e' + k[0], (k[1] * 100).toFixed(2) + '%');
                });
            }
        });
    }
    function sweep(scope) {
        if (!scope.querySelectorAll) return;
        var all = function (sel, fn) {
            if (scope.matches && scope.matches(sel)) fn(scope);
            scope.querySelectorAll(sel).forEach(fn);
        };
        if (kinds.canvas.length) { all(PAINTINGS, dressPainting); all(PAINT_IMGS, wrapImg); }
        if (kinds.letter.length || kinds.dungeonletter.length) {
            all(HIDDEN, function (el) { dressLetter(el, true); });
            if (kinds.letter.length) all(LETTERS, function (el) { if (!el.matches(HIDDEN)) dressLetter(el, false); });
        }
    }

    Sky.listFolder('assets/textures/', ['webp', 'png', 'jpg', 'jpeg'], function (files) {
        files.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
        files.forEach(function (f) {
            var m = /^(canvas|letter|dungeonletter)(-\d+)?\.[a-z]+$/i.exec(f.name);
            if (m) kinds[m[1].toLowerCase()].push(new URL(f.url, location.href).href);
        });
        if (!kinds.canvas.length && !kinds.letter.length && !kinds.dungeonletter.length) return;
        sweep(document);
        // anything opened or drawn later (a letter unrolled, a picture zoomed, a painting that loads in)
        var queued = false;
        new MutationObserver(function (list) {
            if (queued) return;
            queued = true;
            requestAnimationFrame(function () { queued = false; sweep(document); });
        }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    });

    Sky.textures = { get kinds() { return kinds; }, refresh: function () { sweep(document); } };
})();

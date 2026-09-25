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

    Sky.css(
        '.tx-canvas { position: relative; }' +
        '.tx-canvas::after { content: ""; position: absolute; inset: 0; z-index: 3; pointer-events: none; background: var(--tx-pick) center / 100% 100% no-repeat;' +
            'mix-blend-mode: multiply; opacity: var(--tx-strength, .9); }' +
        '.tx-wrap { position: relative; display: block; line-height: 0; }' +
        '.frame-zoom .tx-wrap, .vv-zoom .tx-wrap { width: fit-content; margin: 0 auto 12px; }' +
        '.frame-zoom .tx-wrap img, .vv-zoom .tx-wrap img { margin: 0 !important; }' +
        // a letter: the sheet is your paper, and whatever's on it is inked into it
        '.tx-paper { background: var(--tx-pick) center / 100% 100% no-repeat !important; background-attachment: local !important; box-shadow: none !important;' +
            'filter: drop-shadow(0 14px 22px rgba(0,0,0,.5)); }' +
        '.tx-paper > *, .tx-paper .paper > *, .tx-paper .u-body > * { mix-blend-mode: multiply; }' +
        '.tx-paper .u-foot { border-top-color: transparent !important; }' +
        '.tx-paper.pv-sheet::before { display: none; }' +
        // never squashed into a strip: a sheet keeps (at least) a paper's proportions, and the writing stays off the torn edges
        '.paper-view .pv-sheet.tx-paper { min-height: min(80vh, calc(min(560px, 92vw) * 1.25)); padding: 11% 11% 9% !important; }' +
        '.uncork .u-card.tx-paper { min-height: min(72vh, calc(min(460px, 86vw) * 1.2)); padding: 4% 5%; }' +
        '.bv-card.tx-paper { min-height: min(72vh, calc(min(560px, 92vw) * 1.1)); padding: 4% 5%; }' +
        '.pv-card.tx-paper { min-height: min(72vh, calc(min(520px, 100vw - 120px) * 1.1)); padding: 4% 5%; }'
    );
    root.style.setProperty('--tx-strength', STRENGTH);

    /* ---------------- your textures ---------------- */
    var kinds = { canvas: [], letter: [], dungeonletter: [] };
    function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
    function pick(kind, key) { var l = kinds[kind]; return l.length ? l[hash(key || '') % l.length] : null; }
    function keyOf(el) {
        var im = el.querySelector && el.querySelector('img, video');
        return (im && (im.getAttribute('src') || '')) || el.dataset.frame || el.className || '';
    }

    function dressPainting(el) {
        var u = pick('canvas', keyOf(el) + '|' + (el.closest('[data-frame]') ? el.closest('[data-frame]').dataset.frame : ''));
        if (!u) return;
        el.classList.add('tx-canvas');
        el.style.setProperty('--tx-pick', 'url("' + u + '")');
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

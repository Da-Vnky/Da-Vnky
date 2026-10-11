/* map.js: where each slot sits on a page, and its outline drawn over it.
   Used by the asset manager's map of a scene (tools/assets.html: the page in a frame, the outlines over it) and by
   tools/templates.py (the template pictures for your art program: the page with the outlines drawn on, saved as a PNG).

   A slot is found on the page by:
     data-asset="assets/…"   (the usual: an element that's filled with your picture; "a|b" = either name)
     data-slot="assets/…"    (a piece a script fills itself marks where it is with this; "a b" = several, in one place)
     data-art="room/objects/<room>/<thing>.svg"   (skizy's room: that thing's slot is assets/skizy-room/<room>-<thing>)
   It only counts what's showing: on the screen, and not hidden (display: none, invisible, see-through). */
(function () {
    function names(el) {
        if (el.dataset.asset) return el.dataset.asset.split('|');
        if (el.dataset.slot) return el.dataset.slot.trim().split(/[\s|]+/);
        var m = /objects\/([a-z0-9]+)\/([a-z0-9-]+)\.svg$/i.exec(el.getAttribute('data-art') || '');
        return m ? ['assets/skizy-room/' + (m[1] + '-' + m[2]).toLowerCase()] : [];
    }
    function showing(win, el) {
        if (win.getComputedStyle(el).visibility === 'hidden') return false;
        for (var a = el; a && a.nodeType === 1; a = a.parentElement) {
            var c = win.getComputedStyle(a);
            if (c.display === 'none' || +c.opacity < 0.04) return false;
        }
        return true;
    }
    // every slot showing on the page in window win: [{ slot, x, y, w, h, el }] in the page's own pixels, the biggest
    // first (so the small ones are drawn on top). wanted(name) says whether a name counts (and can rename it); none = all
    function boxes(win, wanted) {
        var doc = win.document, W = win.innerWidth, H = win.innerHeight, out = [];
        doc.querySelectorAll('[data-asset], [data-slot], [data-art]').forEach(function (el, i) {
            var all = names(el), slot = null;
            for (var k = 0; k < all.length && !slot; k++) slot = wanted ? wanted(all[k]) : all[k];
            if (!slot) return;
            var r = el.getBoundingClientRect();
            var x = Math.max(0, r.left), y = Math.max(0, r.top), x2 = Math.min(W, r.right), y2 = Math.min(H, r.bottom);
            if (x2 - x < 3 || y2 - y < 3 || !showing(win, el)) return;
            out.push({ slot: slot, x: x, y: y, w: x2 - x, h: y2 - y, full: { w: r.width, h: r.height }, el: el, order: i });
        });
        out.sort(function (a, b) { return b.w * b.h - a.w * a.h || a.order - b.order; });
        return out;
    }
    // the outlines: one .dm-box each, in layer (which is the page's size, scaled by s). opts.label(box) gives each one's
    // label (none: no label), opts.kind(box) its look: 'mine' (your picture's in) / 'stand' (still the stand-in) / 'other'
    function draw(layer, list, s, opts) {
        opts = opts || {};
        var doc = layer.ownerDocument, W = layer.clientWidth / s, H = layer.clientHeight / s;
        layer.innerHTML = '';
        list.forEach(function (b, i) {
            var d = doc.createElement('div');
            d.className = 'dm-box ' + (opts.kind ? opts.kind(b) : 'stand') + (b.w * b.h > 0.4 * W * H ? ' big' : '') + (b === opts.hot ? ' hot' : '');
            d.style.left = b.x * s + 'px'; d.style.top = b.y * s + 'px';
            d.style.width = b.w * s + 'px'; d.style.height = b.h * s + 'px';
            var label = opts.label ? opts.label(b) : '';
            if (label) {
                var t = doc.createElement('span');
                t.className = 'dm-tag';
                t.innerHTML = label;
                d.appendChild(t);
            }
            b.div = d;
            layer.appendChild(d);
        });
        // names that would cover each other: the smaller pieces keep the best spot, the others move (to the box's
        // bottom corner, its other top corner, just below the name that's in the way…)
        var taken = [], lr = layer.getBoundingClientRect();
        list.slice().sort(function (a, b) { return a.w * a.h - b.w * b.h; }).forEach(function (b) {
            var t = b.div && b.div.querySelector('.dm-tag');
            if (!t) return;
            var spots = [{ left: '-2px', top: '-2px' }, { left: '-2px', top: 'auto', bottom: '-2px' }, { left: 'auto', right: '-2px', top: '-2px' },
                         { left: 'auto', right: '-2px', top: 'auto', bottom: '-2px' }, { left: '-2px', top: '18px' }, { left: '-2px', top: '38px' }];
            for (var k = 0; k < spots.length; k++) {
                t.style.left = spots[k].left; t.style.top = spots[k].top; t.style.right = spots[k].right || 'auto'; t.style.bottom = spots[k].bottom || 'auto';
                var r = t.getBoundingClientRect();
                if (!taken.some(function (o) { return r.left < o.right && r.right > o.left && r.top < o.bottom && r.bottom > o.top; }) &&
                    r.left >= lr.left - 1 && r.right <= lr.right + 1 && r.top >= lr.top - 1 && r.bottom <= lr.bottom + 1) break;
                if (k === spots.length - 1) { t.style.left = spots[0].left; t.style.top = spots[0].top; t.style.right = t.style.bottom = 'auto'; r = t.getBoundingClientRect(); }
            }
            taken.push(r);
        });
    }
    // the smallest box under a point (in the page's pixels): the one you most likely mean
    function at(list, x, y) {
        var hit = null;
        list.forEach(function (b) {
            if (x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h && (!hit || b.w * b.h < hit.w * hit.h)) hit = b;
        });
        return hit;
    }
    // the size, in the page's pixels at the size it's drawn (1920 x 1080 for the templates)
    function dims(b) { return Math.round(b.full.w) + ' × ' + Math.round(b.full.h); }
    window.DavMap = { boxes: boxes, draw: draw, at: at, dims: dims, names: names };
})();

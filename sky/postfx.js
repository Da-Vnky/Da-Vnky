/* postfx.js: what the artist added to a scene in Blender, on the page (24 Oct).

   The asset manager's "open this scene in Blender" lays a scene's slots out in Blender, each at its own distance from the
   camera; "post-processing → site" (tools/scenes.py, tools/blender/scene_post.py) reads what was done there and leaves,
   in the scene's own folder:
     assets/<folder>/post-<scene>.json     what to do here:
       slots    { "<slot>": { blur, haze } }   each picture's depth of field (blur, px on a 1920-wide screen: the browser's
                                              own blur(), drawn by the graphics card) and fog (haze 0…1, towards "fog", the
                                              fog's colour: a small SVG colour filter), laid on the picture that's there
                                              now, so it fits any screen and the pictures themselves stay as drawn
                { hidden: true }              a layer switched off in Blender
                { baked: true }               its picture is a 3D render from Blender with the focus and fog in it: left be
       mine     [slots]                       the scene's own pictures
       ownBlur  false                         the page's own hand-made blur (the sea's rock: blur(7px) in ground-sea.css)
                                              taken off this scene's pictures, so Blender's depth of field is the only one
       overlays [{ slot, name, blend }]       light, mist and glow: a picture each over the scene (blend "screen" for glow)
       bokeh    [{ x, y, size, colour, strength, pulse, drift, day }]   soft discs of light: x, y a share of the screen,
                                              size in px (1920 wide), breathing every `pulse` s, wandering `drift` px,
                                              `day` how much of it shows by day (it's all there at dusk); `on`, `ox`, `oy`:
                                              the picture it hangs on and where in its box, so it moves with it; `behind`:
                                              further away than that picture, so drawn behind it (the city's lamps)
       camera   { lens, film, unit, fstop,       the camera (25 Oct): its lens and film (mm), F-stop and focus (how far away), and
                  focus, dof, toy }             the toy camera's settings (tools/blender/toycam.py): see "the toy camera" below
       depths   { "<slot>": distance }        how far away each picture is, the page's other things too (the traveller, the sky)
     assets/<folder>/post-<scene>-1.webp …   the overlays' pictures
   Nothing's done in the asset manager's ?map (the pages it photographs must stay as drawn, or the next "open in Blender"
   would blur what's already blurred). Looks: sky/css/postfx.css. */
(function () {
    'use strict';
    var Sky = window.Sky;
    if (!Sky || !Sky.findAsset || document.documentElement.classList.contains('dav-map')) return;

    // each page's scenes, and the folder their post-processing is in (a new scene with a map: add it here)
    var SCENES = {
        'index.html': [['sea', 'sea']],
        'workshop.html': [['workshop', 'workshop']],
        'city.html': [['city', 'city']],
        'template.html': [['everywhere', 'sky']],
        'living.html': [['living', 'living'], ['bathroom', 'living'], ['hallway', 'living'], ['attic', 'living'], ['kitchen', 'living'],
                        ['porch', 'living'], ['front', 'living'], ['dungeon', 'living'], ['companion', 'characters']]
    };
    // the house's rooms (sky/house.js) each living.html scene is in: its light and bokeh show only there
    var ROOM = { living: 'living', bathroom: 'bath', hallway: 'hall', attic: 'attic', kitchen: 'kitchen', porch: 'porch', front: 'front',
                 dungeon: 'dungeon', companion: '' };
    var page = location.pathname.split('/').pop() || 'index.html';
    var mine = SCENES[page];
    if (!mine) return;
    var NS = 'http://www.w3.org/2000/svg', svg = null, count = 0, done = [];
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    function names(el) {
        if (el.dataset.asset) return el.dataset.asset.split('|');
        if (el.dataset.slot) return el.dataset.slot.trim().split(/[\s|]+/);
        return [];
    }
    function slotEls(slot) {
        return Array.prototype.filter.call(document.querySelectorAll('[data-asset], [data-slot]'), function (el) {
            return names(el).indexOf(slot) !== -1;
        });
    }
    // the fog's tint, one SVG filter per amount: the colour drawn towards the fog's (see-through parts stay see-through).
    // the blur itself is the browser's own blur() (drawn by the graphics card), scaled to the screen in refit()
    function tintFor(haze, fog) {
        if (!(haze > 0 && fog)) return '';
        if (!svg) {
            svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('class', 'postfx-defs');
            svg.setAttribute('aria-hidden', 'true');
            document.body.appendChild(svg);
        }
        var id = 'postfx-' + (++count), f = document.createElementNS(NS, 'filter');
        f.id = id;
        f.setAttribute('color-interpolation-filters', 'sRGB');
        var m = document.createElementNS(NS, 'feColorMatrix'), k = 1 - haze, c = fog.map(function (x) { return (x / 255 * haze).toFixed(4); });
        m.setAttribute('type', 'matrix');
        m.setAttribute('values', [k, 0, 0, 0, c[0], 0, k, 0, 0, c[1], 0, 0, k, 0, c[2], 0, 0, 0, 1, 0].join(' '));
        f.appendChild(m);
        svg.appendChild(f);
        return 'url(#' + id + ')';
    }

    // a picture's own filter (a drop shadow, the night's dimming: from the page's styles, or set by a script) stays, and
    // this goes after it; looked at again every second, since those change with the time of day. noOwnBlur: the page's
    // own hand-made blur on it (the sea's rock: blur(7px)) taken out, so Blender's depth of field is the only one
    var laid = [];
    function lay(el, blur, tint, noOwnBlur) {
        if (el.postfx) { el.postfx.blur = blur; el.postfx.tint = tint; el.postfx.noOwn = noOwnBlur; refit(el); return; }
        el.postfx = { blur: blur, tint: tint, noOwn: noOwnBlur, was: el.style.filter || '', set: null };
        el.classList.add('postfx');
        laid.push(el);
        refit(el);
    }
    function refit(el) {
        var p = el.postfx, cs = getComputedStyle(el), tr = el.style.transition;
        if (p.set !== null && el.style.filter !== p.set) p.was = el.style.filter;    // (a script changed it meanwhile)
        el.style.transition = 'none';                   // (looking doesn't set off its own filter's fade)
        el.style.filter = p.was;
        var own = cs.filter;
        own = own && own !== 'none' ? own : '';
        if (p.noOwn) own = own.replace(/blur\([^)]*\)/g, '');
        p.own = own;
        put(el);
        void cs.filter;                                 // (settled, still with no fade, before the fade's put back)
        el.style.transition = tr;
    }
    // its own filter (as last looked at), then the blur, then the fog: straight on (the toy camera's focus, as it moves)
    function put(el) {
        var p = el.postfx, px = p.blur > .02 ? 'blur(' + (p.blur * innerWidth / 1920).toFixed(2) + 'px)' : '';
        el.style.filter = (p.own + ' ' + px + ' ' + p.tint).replace(/\s+/g, ' ').trim() || 'none';
        p.set = el.style.filter;                        // (as the browser writes it back, to tell a script's change from ours)
    }
    setInterval(function () { laid.forEach(refit); }, 1000);
    window.addEventListener('resize', function () { laid.forEach(refit); });

    // ---------------- the toy camera (25 Oct) ----------------
    // the artist: the page "as if viewed through a camera", the set looking like toys and props, as in Blender with the depth of
    // field. From Blender (post-<scene>.json "camera", "depths"): the lens, the focus, the F-stop, each picture's distance, and
    // the toy camera's settings (tools/blender/toycam.py). Here:
    //   it slides: as the pointer moves (on a phone, slowly by itself) the camera moves a little sideways and up and down, and
    //     turns to keep the focus where it is, so what's nearer slides one way and what's further the other, each by exactly as
    //     much as Blender's camera would show (move, in Blender units); "handheld" adds a faint sway
    //   the focus follows what the visitor points at (rest a moment on the rock, the ship, the city), taking "rack" seconds,
    //     and goes back to Blender's own focus once they point at nothing; each picture's blur from the lens, as scene_post.py
    //   the lens: darker corners, grain, a touch of warmth (or cool), and "punch" (more colour and contrast)
    // Only translate, opacity and the pictures' own blur() change (the graphics card's work: nothing is drawn again), and the
    // slide is added on top of whatever else moves the picture (a Web Animation with composite "add": the sea's drift, the
    // waves' swell, the rock's lean all go on as before). No picture slides so far that the edge of the screen shows past it.
    var canAdd = typeof KeyframeEffect !== 'undefined' && 'composite' in KeyframeEffect.prototype;
    var grainTile = null;
    function grain() {                                  // (a tile of grey specks, drawn once, like the static's)
        if (grainTile) return grainTile;
        var c = document.createElement('canvas'), n = 128;
        c.width = c.height = n;
        var x = c.getContext('2d'), img = x.createImageData(n, n), d = img.data;
        for (var i = 0; i < d.length; i += 4) {
            var v = 128 + (Math.random() + Math.random() + Math.random() - 1.5) * 120 | 0;
            d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, v));
            d[i + 3] = 255;
        }
        x.putImageData(img, 0, 0);
        return (grainTile = 'url(' + c.toDataURL() + ')');
    }

    function toyCamera(data, showing) {
        var cam = data.camera, toy = cam.toy, unit = cam.unit || 1;
        var f = cam.lens / 1000 / unit, film = cam.film / 1000 / unit, fstop = Math.max(.01, cam.fstop || 1);
        var rest = cam.focus || 16, focus = rest;
        var hover = !(window.matchMedia && matchMedia('(hover: none)').matches);
        // how blurred something d away is with the focus s away (px on a 1920-wide screen): as scene_post.py's blur_px
        function blurAt(d, s) {
            if (!cam.dof || d <= 0 || s <= f) return 0;
            return (f / fstop) * f * Math.abs(d - s) / (d * (s - f)) / film * 1920 / 3;
        }
        // every picture with a distance (one inside another picture, like the bottle's cork, moves with it)
        var items = [];
        Object.keys(data.depths).forEach(function (slot) {
            var e = data.slots[slot] || {};
            if (e.hidden) return;
            slotEls(slot).forEach(function (el) {
                if (el.ownerSVGElement || el.toy) return;
                el.toy = { el: el, slot: slot, d: data.depths[slot], x: 0, y: 0, anim: null, box: null,
                           // the sky's pictures (every page's) slide but keep sharp; a baked 3D picture has its focus in it
                           blurs: cam.dof && !/^assets\/sky\//.test(slot) && !e.baked };
                items.push(el.toy);
            });
        });
        items.forEach(function (it) {
            for (var p = it.el.parentElement; p; p = p.parentElement) if (p.toy) { it.up = p.toy; break; }
            if (it.blurs) lay(it.el, blurAt(it.d, rest), it.el.postfx ? it.el.postfx.tint : '', data.ownBlur === false);
        });

        // the slide: px on this screen for a camera moved by (cx, cy) Blender units, turned to keep the focus put
        var K = cam.lens / cam.film;                    // (a thing 1 unit across, 1 unit away, is this many screen-widths)
        function slide(it, cx, cy) {
            var k = K * innerWidth * (1 / focus - 1 / it.d);
            var x = cx * k, y = cy * k, b = it.box;
            if (b) {                                    // (never so far that the screen's edge shows past it)
                x = Math.max(b.x0, Math.min(b.x1, x));
                y = Math.max(b.y0, Math.min(b.y1, y));
            }
            return [x, y];
        }
        // how far each picture can slide each way: one reaching past an edge of the screen, only as far as it reaches past it
        function measure() {
            items.forEach(function (it) {
                var r = it.el.getBoundingClientRect(), W = innerWidth, H = innerHeight;
                if (!r.width || !r.height || r.right < 0 || r.left > W || r.bottom < 0 || r.top > H) { it.box = null; return; }
                var L = r.left - it.x, R = r.right - it.x, T = r.top - it.y, B = r.bottom - it.y;
                it.box = { x0: R > W - 1 ? -(R - W) : -1e9, x1: L < 1 ? -L : 1e9, y0: B > H - 1 ? -(B - H) : -1e9, y1: T < 1 ? -T : 1e9 };
            });
        }
        function move(it, x, y) {
            var ox = x, oy = y;
            if (it.up) { ox -= it.up.x; oy -= it.up.y; }  // (its picture has slid already)
            if (Math.abs(x - it.x) < .05 && Math.abs(y - it.y) < .05 && it.anim) return;
            it.x = x; it.y = y;
            var v = ox.toFixed(2) + 'px ' + oy.toFixed(2) + 'px';
            if (!it.anim) {
                it.anim = it.el.animate([{ translate: v }, { translate: v }], { duration: 1000, fill: 'both', composite: 'add' });
                it.anim.pause();
            } else it.anim.effect.setKeyframes([{ translate: v }, { translate: v }]);
        }

        // the focus: to what the visitor rests on, and back to Blender's own after a while on nothing
        var from = rest, to = rest, t0 = 0, racking = false, wait = null;
        function refocus() {
            items.forEach(function (it) {
                if (!it.blurs || !it.el.postfx) return;
                it.el.postfx.blur = blurAt(it.d, focus);
                put(it.el);
            });
        }
        function rackTo(d) {
            if (Math.abs(d - to) < .05) return;
            from = focus; to = d; t0 = performance.now();
            if (!toy.rack || still) { focus = d; racking = false; refocus(); return; }
            racking = true;
            if (still || !canAdd) { (function step() { if (tick(performance.now())) requestAnimationFrame(step); })(); }
        }
        // what's under the pointer: most of the scene lets clicks through, so it's found by where each picture is actually
        // painted (nearest first): the artist's pictures by their own see-through pixels, the drawn stand-ins by their shapes
        function onWhat(x, y) {
            var hits = items.filter(function (it) {
                if (!it.blurs) return false;
                var r = it.el.getBoundingClientRect();
                return r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
            }).sort(function (a, b) { return a.d - b.d; });
            if (!hits.length) return null;
            var shapes = null;
            for (var i = 0; i < hits.length; i++) {
                var p = painted(hits[i].el, x, y);
                if (p === null) {                       // (a drawn stand-in: is one of its shapes under the pointer?)
                    if (!shapes) {
                        document.documentElement.classList.add('toycam-picking');
                        shapes = document.elementsFromPoint(x, y);
                        document.documentElement.classList.remove('toycam-picking');
                    }
                    p = shapes.some(function (s) { return s !== hits[i].el && hits[i].el.contains(s) && s instanceof SVGGeometryElement; });
                }
                if (p) return hits[i];
            }
            return null;
        }
        // true / false: the artist's picture is (or isn't) painted at x, y; null: it's a drawn stand-in
        function painted(el, x, y) {
            var cs = getComputedStyle(el), bg = /url\("?([^")]+)"?\)/.exec(cs.backgroundImage);
            if (bg && cs.backgroundSize === 'auto 100%') {   // (the waves: a strip repeating sideways)
                var r = el.getBoundingClientRect(), a = alphaOf(bg[1]);
                if (!a) return true;
                var tw = r.height * a.w / a.h, px = (parseFloat(cs.backgroundPositionX) || 0) / 100;
                var u = ((x - r.left - (r.width - tw) * px) % tw + tw) % tw / tw;
                return a.at(u, (y - r.top) / r.height);
            }
            var im = el.tagName === 'IMG' ? el : el.querySelector('img.art, image');
            if (!im) return null;
            var src = im.currentSrc || im.getAttribute('src') || im.getAttribute('href'), b = im.getBoundingClientRect(), al = alphaOf(src);
            if (!al || !b.width) return true;
            var fit = 'none', ax = .5, ay = .5;
            if (im.tagName === 'IMG') {
                var ics = getComputedStyle(im), op = ics.objectPosition.split(' ');
                fit = ics.objectFit === 'contain' ? 'meet' : ics.objectFit === 'cover' ? 'slice' : 'none';
                ax = (parseFloat(op[0]) || 0) / 100; ay = (parseFloat(op[1]) || 0) / 100;
            } else {
                var par = (im.getAttribute('preserveAspectRatio') || 'xMidYMid meet').split(' ');
                if (par[0] !== 'none') {
                    fit = par[1] || 'meet';
                    ax = /xMin/.test(par[0]) ? 0 : /xMax/.test(par[0]) ? 1 : .5;
                    ay = /YMin/.test(par[0]) ? 0 : /YMax/.test(par[0]) ? 1 : .5;
                }
            }
            var cw = b.width, ch = b.height;
            if (fit !== 'none') {
                var s = (fit === 'meet' ? Math.min : Math.max)(b.width / al.w, b.height / al.h);
                cw = al.w * s; ch = al.h * s;
            }
            var u2 = (x - b.left - (b.width - cw) * ax) / cw, v2 = (y - b.top - (b.height - ch) * ay) / ch;
            return u2 >= 0 && u2 <= 1 && v2 >= 0 && v2 <= 1 && al.at(u2, v2);
        }
        // a picture's see-through pixels, small (at most 256 across), read once; until it's read, everything counts as painted
        var alphas = {};
        function alphaOf(src) {
            if (!src) return null;
            if (src in alphas) return alphas[src];
            alphas[src] = null;
            var img = new Image();
            img.onload = function () {
                var k = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.max(1, Math.round(img.naturalWidth * k)),
                    h = Math.max(1, Math.round(img.naturalHeight * k)), c = document.createElement('canvas');
                c.width = w; c.height = h;
                try {
                    var g = c.getContext('2d');
                    g.drawImage(img, 0, 0, w, h);
                    var d = g.getImageData(0, 0, w, h).data;
                    alphas[src] = { w: img.naturalWidth, h: img.naturalHeight, at: function (u, v) {
                        var i = Math.min(h - 1, Math.max(0, v * h | 0)) * w + Math.min(w - 1, Math.max(0, u * w | 0));
                        return d[i * 4 + 3] > 40;
                    } };
                } catch (e) { /* (a picture from elsewhere can't be read: it counts as painted) */ }
            };
            img.src = src;
            return null;
        }
        var mx = -1, my = -1;
        function aim(now) {
            if (!toy.rack || !cam.dof || mx < 0) return;
            clearTimeout(wait);
            wait = setTimeout(function () {
                var it = onWhat(mx, my);
                if (it) return rackTo(it.d);
                wait = setTimeout(function () { rackTo(rest); }, now ? 0 : 2100);   // (on nothing a while: back to Blender's focus)
            }, now ? 0 : 350);
        }

        // the camera's place: the pointer (eased), the sway, and on a phone a slow wander of its own
        var px = 0, py = 0, cx = 0, cy = 0, last = 0;
        function tick(now) {
            var dt = Math.min(.1, (now - (last || now)) / 1000), s = now / 1000;
            last = now;
            if (racking) {
                var k = Math.min(1, (now - t0) / (toy.rack * 1000)), e = k < .5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
                focus = from + (to - from) * e;
                refocus();
                if (k >= 1) racking = false;
            }
            if (still || !canAdd) return racking;
            if (!showing()) return true;
            var tx = px, ty = py;
            if (!hover) { tx = Math.sin(s * .13) * .7 + Math.sin(s * .041 + 2) * .3; ty = Math.sin(s * .09 + 1) * .5; }
            var ease = 1 - Math.exp(-dt * 3);
            cx += (tx * toy.move - cx) * ease;
            cy += (ty * toy.move * .5 - cy) * ease;
            var sw = toy.handheld * .08;                 // (the sway, Blender units: a slow, uneven drift, never a loop)
            var sx = sw * (Math.sin(s * .53) * .55 + Math.sin(s * 1.27 + 1.3) * .3 + Math.sin(s * 2.9 + .4) * .15);
            var sy = sw * (Math.sin(s * .41 + 2.1) * .5 + Math.sin(s * 1.13 + .7) * .35 + Math.sin(s * 3.3) * .15) * .7;
            items.forEach(function (it) { var v = slide(it, cx + sx, cy + sy); move(it, v[0], v[1]); });
            return true;
        }
        if (!still && canAdd) {
            measure();
            setInterval(measure, 1000);
            window.addEventListener('resize', measure);
            (function frame(now) { tick(now); requestAnimationFrame(frame); })(performance.now());
        }
        if (hover) window.addEventListener('pointermove', function (e) {
            if (e.pointerType === 'touch') return;
            px = e.clientX / innerWidth * 2 - 1;
            py = e.clientY / innerHeight * 2 - 1;
            mx = e.clientX; my = e.clientY;
            aim();
        }, { passive: true });
        window.addEventListener('pointerdown', function (e) { mx = e.clientX; my = e.clientY; aim(true); }, { passive: true });
        document.addEventListener('mouseout', function (e) {
            if (e.relatedTarget) return;
            px = py = 0;                                 // (off the page: the camera comes back to the middle, the focus home)
            clearTimeout(wait);
            wait = setTimeout(function () { rackTo(rest); }, 1500);
        });

        // the lens, over the scene: corners, colour, grain (and punch, if asked for)
        var lens = document.createElement('div');
        lens.className = 'toycam' + (toy.punch > 0 ? ' punch' : '') + (toy.warmth < 0 ? ' cool' : '');
        lens.style.setProperty('--tc-vignette', toy.vignette);
        lens.style.setProperty('--tc-warmth', Math.abs(toy.warmth));
        lens.style.setProperty('--tc-punch', toy.punch);
        lens.style.setProperty('--tc-grain', toy.grain);
        ['tc-grade', 'tc-vignette'].concat(toy.grain > 0 ? ['tc-grain'] : []).forEach(function (c) {
            var i = document.createElement('i');
            i.className = c;
            lens.appendChild(i);
        });
        if (toy.grain > 0) lens.style.setProperty('--tc-tile', grain());
        Sky.postfx.camera = {
            get focus() { return focus; }, rest: rest, items: items, rackTo: rackTo, blurAt: blurAt, pick: onWhat,
            get at() { return [cx, cy]; }
        };
        return lens;
    }

    // where the scene's light goes: the room it's in (it slides with it), or over the whole page
    function hostFor(els) {
        var a = els[0];
        if (!a) return document.body;
        for (var p = a; p && p !== document.body; p = p.parentElement) {
            if (!els.every(function (e) { return p.contains(e); })) continue;
            var r = p.getBoundingClientRect(), cs = getComputedStyle(p);
            if (cs.position !== 'static' && r.width >= innerWidth * .9 && r.height >= innerHeight * .9) return p;
        }
        return document.body;
    }

    function apply(id, data) {
        if (!data || !data.slots) return;
        var all = [];
        var noOwn = data.ownBlur === false;
        // the page's own blur off on all this scene's pictures (data.mine), even those Blender doesn't blur
        if (noOwn) (data.mine || []).forEach(function (slot) {
            slotEls(slot).forEach(function (el) { if (/blur\(/.test(getComputedStyle(el).filter)) lay(el, 0, '', true); });
        });
        Object.keys(data.slots).forEach(function (slot) {
            var e = data.slots[slot], els = slotEls(slot);
            all = all.concat(els);
            els.forEach(function (el) {
                if (e.hidden) { el.classList.add('postfx-hidden'); return; }
                if (e.baked) return;                    // (its picture is a 3D render with the focus and fog in it already)
                if (e.blur || e.haze) lay(el, e.blur || 0, tintFor(e.haze || 0, data.fog), noOwn);
            });
        });
        var over = (data.overlays || []), bokeh = (data.bokeh || []);
        var toy = data.camera && data.camera.toy && data.camera.toy.on && data.depths;
        if (!over.length && !bokeh.length && !toy) return;
        var host = hostFor(all.length ? all : slotEls(Object.keys(data.slots)[0] || '')), layer = document.createElement('div');
        layer.className = 'postfx-layer' + (host === document.body ? ' on-page' : '');
        layer.setAttribute('aria-hidden', 'true');
        layer.dataset.scene = id;
        over.forEach(function (o) {
            Sky.findAsset(o.slot, function (url) {
                if (!url) return;
                var im = document.createElement('img');
                im.className = 'postfx-over' + (o.blend && o.blend !== 'normal' ? ' blend-' + o.blend : '');
                im.alt = '';
                im.src = url;
                layer.insertBefore(im, layer.querySelector('.postfx-bokeh'));
            });
        });
        bokeh.forEach(function (b, i) {
            var d = document.createElement('i');
            // on the picture it hangs on (it moves with it: the port city as the sea pans), if that can hold it
            var on = b.on && slotEls(b.on)[0];
            if (on && !/^(IMG|SVG|CANVAS|VIDEO)$/i.test(on.tagName) && getComputedStyle(on).position !== 'static') {
                d.style.setProperty('--bk-x', (b.ox * 100).toFixed(2) + '%');
                d.style.setProperty('--bk-y', (b.oy * 100).toFixed(2) + '%');
                d.classList.add('on-slot');
                if (b.behind) {                         // (further away than the picture: behind it, inside its own box)
                    d.classList.add('behind');
                    on.style.isolation = 'isolate';
                    on.insertBefore(d, on.firstChild);
                } else on.appendChild(d);
            } else {
                d.style.setProperty('--bk-x', (b.x * 100).toFixed(2) + '%');
                d.style.setProperty('--bk-y', (b.y * 100).toFixed(2) + '%');
                layer.appendChild(d);
            }
            d.className = 'postfx-bokeh';
            var c = (b.colour || [255, 220, 170]).join(', ');
            d.style.setProperty('--bk-size', (b.size / 19.2).toFixed(3) + 'vw');
            d.style.setProperty('--bk-c', c);
            d.style.setProperty('--bk-s', b.strength == null ? .7 : b.strength);
            d.style.setProperty('--bk-day', b.day == null ? .35 : b.day);
            d.style.setProperty('--bk-pulse', (still || !b.pulse ? 0 : b.pulse) + 's');
            d.style.setProperty('--bk-drift', (still ? 0 : (b.drift == null ? 6 : b.drift) / 19.2).toFixed(3) + 'vw');
            d.style.setProperty('--bk-delay', (-(i * 1.37) % (b.pulse || 5)).toFixed(2) + 's');
            if (!still && b.pulse) d.classList.add('breathes');
        });
        if (toy) layer.appendChild(toyCamera(data, function () { return !layer.classList.contains('away'); }));
        if (!over.length && !layer.children.length) { done.push(id); return; }
        if (host === document.body && all.length) {
            // over the whole page: just in front of the scene, and behind the buttons and signs that come after it (at the
            // scene's own z-index, straight after the last piece of the page that holds some of it)
            var tops = [];
            all.forEach(function (e) { while (e.parentElement && e.parentElement !== document.body) e = e.parentElement; if (tops.indexOf(e) < 0) tops.push(e); });
            tops.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
            var z = 0;
            tops.forEach(function (e) { var v = parseInt(getComputedStyle(e).zIndex, 10); if (v > z) z = v; });
            layer.style.zIndex = z;
            tops[tops.length - 1].after(layer);
        } else host.appendChild(layer);
        // on living.html a scene's light shows only in its own room (the rooms slide; the page stays)
        var room = ROOM[id];
        if (room !== undefined && Sky.house) {
            var check = function () { layer.classList.toggle('away', !!room && Sky.house.where() !== room); };
            Sky.house.on(function () { setTimeout(check, 0); });
            check();
            setInterval(check, 1500);
        }
        done.push(id);
    }

    mine.forEach(function (sf) {
        Sky.findAsset('assets/' + sf[1] + '/post-' + sf[0] + '.json', function (url, data) { if (url) apply(sf[0], data); });
    });
    Sky.postfx = { get scenes() { return done.slice(); } };
})();

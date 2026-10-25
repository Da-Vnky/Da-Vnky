/* postfx.js: what the artist added to a scene in Blender, on the page (24 Oct).

   The asset manager's "open this scene in Blender" lays a scene's slots out in Blender, each at its own distance from the
   camera; "post-processing → site" (tools/scenes.py, tools/blender/scene_post.py) reads what was done there and leaves,
   in the scene's own folder:
     assets/<folder>/post-<scene>.json     what to do here:
       slots    { "<slot>": { blur, haze } }   each picture's depth of field (blur, px on a 1920-wide screen) and fog
                                              (haze 0…1, towards "fog", the fog's colour), laid on the picture that's there
                                              now, so it fits any screen and the pictures themselves stay as drawn
                { hidden: true }              a layer switched off in Blender
       overlays [{ slot, name, blend }]       light, mist and glow: a picture each over the scene (blend "screen" for glow)
       bokeh    [{ x, y, size, colour, strength, pulse, drift, day }]   soft discs of light: x, y a share of the screen,
                                              size in px (1920 wide), breathing every `pulse` s, wandering `drift` px,
                                              `day` how much of it shows by day (it's all there at dusk)
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
    // one SVG filter per look: the blur, then the colour drawn towards the fog's (see-through parts stay see-through)
    function filterFor(blur, haze, fog) {
        if (!svg) {
            svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('class', 'postfx-defs');
            svg.setAttribute('aria-hidden', 'true');
            document.body.appendChild(svg);
        }
        var id = 'postfx-' + (++count), f = document.createElementNS(NS, 'filter');
        f.id = id;
        f.setAttribute('x', '-20%'); f.setAttribute('y', '-20%'); f.setAttribute('width', '140%'); f.setAttribute('height', '140%');
        f.setAttribute('color-interpolation-filters', 'sRGB');
        if (blur > 0) {
            var g = document.createElementNS(NS, 'feGaussianBlur');
            g.setAttribute('class', 'pf-blur');
            g.dataset.px = blur;
            f.appendChild(g);
        }
        if (haze > 0 && fog) {
            var m = document.createElementNS(NS, 'feColorMatrix'), k = 1 - haze, c = fog.map(function (x) { return (x / 255 * haze).toFixed(4); });
            m.setAttribute('type', 'matrix');
            m.setAttribute('values', [k, 0, 0, 0, c[0], 0, k, 0, 0, c[1], 0, 0, k, 0, c[2], 0, 0, 0, 1, 0].join(' '));
            f.appendChild(m);
        }
        svg.appendChild(f);
        size();
        return 'url(#' + id + ')';
    }
    // the blur follows the screen's width (it was measured on a 1920-wide one)
    function size() {
        if (!svg) return;
        var k = innerWidth / 1920;
        svg.querySelectorAll('.pf-blur').forEach(function (g) { g.setAttribute('stdDeviation', (+g.dataset.px * k).toFixed(2)); });
    }
    window.addEventListener('resize', size);

    // a picture's own filter (a drop shadow, the night's dimming: from the page's styles, or set by a script) stays, and
    // this goes after it; looked at again every second, since those change with the time of day
    var laid = [];
    function lay(el, look) {
        el.postfx = { look: look, was: el.style.filter || '', set: null };
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
        el.style.filter = ((own && own !== 'none' ? own : '') + ' ' + p.look).trim();
        p.set = el.style.filter;                        // (as the browser writes it back, to tell a script's change from ours)
        void cs.filter;                                 // (settled, still with no fade, before the fade's put back)
        el.style.transition = tr;
    }
    setInterval(function () { laid.forEach(refit); }, 1000);

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
        Object.keys(data.slots).forEach(function (slot) {
            var e = data.slots[slot], els = slotEls(slot);
            all = all.concat(els);
            els.forEach(function (el) {
                if (e.hidden) { el.classList.add('postfx-hidden'); return; }
                if (e.blur || e.haze) lay(el, filterFor(e.blur || 0, e.haze || 0, data.fog));
            });
        });
        var over = (data.overlays || []), bokeh = (data.bokeh || []);
        if (!over.length && !bokeh.length) return;
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
            d.className = 'postfx-bokeh';
            var c = (b.colour || [255, 220, 170]).join(', ');
            d.style.setProperty('--bk-x', (b.x * 100).toFixed(2) + '%');
            d.style.setProperty('--bk-y', (b.y * 100).toFixed(2) + '%');
            d.style.setProperty('--bk-size', (b.size / 19.2).toFixed(3) + 'vw');
            d.style.setProperty('--bk-c', c);
            d.style.setProperty('--bk-s', b.strength == null ? .7 : b.strength);
            d.style.setProperty('--bk-day', b.day == null ? .35 : b.day);
            d.style.setProperty('--bk-pulse', (still || !b.pulse ? 0 : b.pulse) + 's');
            d.style.setProperty('--bk-drift', (still ? 0 : (b.drift == null ? 6 : b.drift) / 19.2).toFixed(3) + 'vw');
            d.style.setProperty('--bk-delay', (-(i * 1.37) % (b.pulse || 5)).toFixed(2) + 's');
            if (!still && b.pulse) d.classList.add('breathes');
            layer.appendChild(d);
        });
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

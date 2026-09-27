/* =====================================================================
   state.js — the game underneath the site: what a visitor's browser
   remembers, and the resets.

   There are seven resets (the seven spheres) and an eighth, the grand
   mystery. Each visitor starts in reset 1. Losing every life sends them on
   to the next reset: everything they did in this one is forgotten, and the
   world changes around them. Only a few things carry on:

     FOREVER   which reset they're in, the P(Doom) record once it's theirs,
               how far Mel's room has come back, and their settings (volumes,
               the brush, the weather …)
     A RESET   everything in RUN below: the hidden key, the hearts, the dungeon
               found … gone at the next reset
     A VISIT   sessionStorage (the wall open, what's in the bag …): gone when
               the tab closes, and at every reset

   RESETS below is the plan for each: its theme, its one way to die (DEATHS:
   one death a reset, one heart: 27 Sep, Mel and Victor, so the easter egg
   can be reached), and where its key is hidden (until it's found, every way
   to die is off: curious clicking can't kill the traveller). Its own art (the key, the mirror, the note, the world getting more
   twisted) lives in assets/resets/reset-<n>/: the content manager's
   "resets" tabs.

   For you, testing: the content manager's debug page (tools/debug.html, never
   published), or ?reset=3 on any page's address in the content manager's
   preview (localhost only: the live site ignores it).

   This runs first on every page (after sky/loader.js), and the content manager
   reads RESETS and DEATHS from it too.
   ===================================================================== */

(function () {
    var MAX = 8;

    // the ways to die that come and go: which resets they're live in (after the last one, they're "patched")
    var DEATHS = {
        // reset 1: the revolver on yourself (sky/revolver.js). from reset 2 it jams, whoever's holding it (there's one to
        // play with in the living space, and the one on the roof)
        revolver: { name: 'the revolver, on yourself',                live: [1], patch: 'it jams: a toy to shoot things with',
                    slots: ['assets/city/revolver'], patchSlots: [] },
        // reset 2: the boat dropped on the traveller (sky/ground-sea.js). after it, an anchor
        boat:     { name: 'the boat, dropped on the traveller',       live: [2], patch: 'a heavy anchor: the boat can’t be lifted high',
                    slots: ['assets/sea/ship'], patchSlots: ['assets/sea/anchor'] },
        // reset 3, ingestion: the pills (Mel's room across the street: take a bottle from her bathroom cabinet and talk her
        // into them; when the lights go out, the visitor can't live with it, and goes off the roof. schizophyllu.me.room/
        // room/room.js, the end, and sky/resets.js melDeath: the next reset starts on the porch). after reset 3 her room
        // stays quiet until the P(Doom) record brings it back (5 visits). (the kitchen's serpent, from reset 3 on, is only
        // a serpent: sky/kitchen.js)
        pills:    { name: 'the pills, in Mel\u2019s room (then the roof)', live: [3], patch: 'Mel\u2019s room stays quiet (give her the P(Doom) record, and visit)',
                    slots: [], patchSlots: [] },
        // reset 4: the book that opens the dungeon is missing; the grimoire in the attic: the pact, dragged down to the
        // brimstone and the voice (sky/hell.js), back with a white revolver; the Claubes and the six pictures round the
        // false god; and the false god sends the last bullet back (sky/claubes.js). only that bullet is the death
        diagram:  { name: 'the last bullet, sent back by the false god', live: [4], patch: 'the diagram just swallows the bullets',
                    slots: [], patchSlots: [] },
        // (not a death: the way in to reset 4's. from reset 5 the grimoire's on the living-room shelf, only a book)
        grimoire: { name: 'the pact in the grimoire, in the attic (reset 4: the way to the false god)', live: [4], notDeath: true,
                    patch: 'the grimoire on the living-room bookshelf, only a book',
                    slots: ['assets/living/grimoire', 'assets/living/grimoire-open', 'assets/living/pact-hand'], patchSlots: ['assets/living/shelf-grimoire'] },
        // PLACEHOLDERS: the ways to die still to be designed, one a reset. each is a bubble on a page (a dashed circle with
        // a skull: sky/resets.js) that kills the traveller when clicked, so every reset can be played through to its end.
        // page: sea, workshop, city, living; in: which part of the page; left/top: where in it (%).
        // when you design the real one, give it its own entry above and take the placeholder out.
        r5: { name: 'reset 5’s way to die (to come)', live: [5], placeholder: { page: 'city',     in: 'body',  left: 40, top: 42 } },
        r6: { name: 'reset 6’s way to die (to come)', live: [6], placeholder: { page: 'workshop', in: '.room', left: 38, top: 30 } },
        r7: { name: 'reset 7’s way to die (to come)', live: [7], placeholder: { page: 'living',   in: '.room', left: 24, top: 26 } },
        r8: { name: 'reset 8’s way to die (to come)', live: [8], placeholder: { page: 'sea',      in: 'body',  left: 30, top: 42 } }
    };
    Object.keys(DEATHS).forEach(function (k) { var d = DEATHS[k]; d.patch = d.patch || ''; d.slots = d.slots || []; d.patchSlots = d.patchSlots || []; });
    // (one heart: sky/lives.js. every way to die is off until the reset's key is found; each reset's is its only one)

    // key: where the reset's key is hidden. page: sea, workshop, city, living; in: which part of the page
    // (a selector); left/top: where in it; where: said in the content manager.
    // or drop: something in the game drops it instead ('claubes': sky/claubes.js), wherever that happens
    var RESETS = [
        { n: 1, name: 'items',       theme: 'the gun',                                deaths: ['revolver'],
          key: { page: 'workshop', in: '.room',     left: 12,   top: 55.4, where: 'the workshop, between the jars on the shelf' } },
        { n: 2, name: 'environmental', theme: 'the world itself: the boat',           deaths: ['boat'],
          key: { page: 'city',     in: 'body',      left: 69.4, top: 89.6, where: 'the rooftop, by the potted plant' } },
        { n: 3, name: 'ingestion',   theme: 'the pills (and the fall)',               deaths: ['pills'],
          // (stuck in the apple pie in the kitchen fridge, its ring sticking out: sky/kitchen.js. the junk drawer has a hint)
          key: { page: 'living',   in: '.kitchen-pie', left: 40, top: 30, where: 'the kitchen, in the fridge: stuck in the apple pie' } },
        { n: 4, name: 'dark witchcraft', theme: 'the grimoire, the Claubes and the false god', deaths: ['diagram'],
          key: { page: 'living',   drop: 'hell', where: 'below (after the grimoire\u2019s pact): shoot the eye with the white revolver and it drops at your feet' } },
        { n: 5, name: '',            theme: '',                               deaths: ['r5'],
          key: { page: 'workshop', in: '.room',     left: 93.5, top: 61,   where: 'the workshop, on top of the notes board' } },
        { n: 6, name: '',            theme: '',                               deaths: ['r6'],
          key: { page: 'living',   in: '.hallway',  left: 70,   top: 94,   where: 'the hallway, on the floor' } },
        { n: 7, name: '',            theme: '',                               deaths: ['r7'],
          key: { page: 'living',   in: '.dungeon',  left: 83,   top: 93,   where: 'the dungeon, under the rack' } },
        { n: 8, name: 'the grand mystery', tab: 'mystery', theme: 'the truth',                deaths: ['r8'],
          key: { page: 'city',     in: 'body',      left: 9,    top: 76.5, where: 'the rooftop, on top of the chimney' } }
    ];

    // what a reset forgets (the old names these always had, plus anything saved as "run:…")
    var RUN = ['lives-shown', 'lives-left', 'lives-unlocked', 'lives-lost', 'suicides', 'dungeon-found'];
    var RESET_KEY = 'dav-reset';                                        // how many resets they've been through (0 = still in reset 1)

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function put(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, String(v)); } catch (e) {} }
    function done() { return Math.max(0, Math.min(MAX - 1, +get(RESET_KEY) || 0)); }
    function sphere() { return done() + 1; }

    // (from before the resets: "dav-resets" counted presses of the clear-cache button. not a reset.)
    if (get('dav-resets') !== null) put('dav-resets', null);

    function forgetRun() {
        RUN.forEach(function (k) { put(k, null); });
        try { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && k.indexOf('run:') === 0) localStorage.removeItem(k); } } catch (e) {}
        try { sessionStorage.clear(); } catch (e) {}
    }
    // on to the next reset (or, in the grand mystery, the same one again)
    function nextReset() {
        forgetRun();
        put(RESET_KEY, Math.min(MAX - 1, done() + 1));
        document.dispatchEvent(new CustomEvent('dav:reset', { detail: { reset: sphere() } }));
        return sphere();
    }
    // straight to the start of a reset (the content manager's debug page)
    function goTo(n) {
        n = Math.max(1, Math.min(MAX, +n || 1));
        forgetRun();
        put(RESET_KEY, n - 1);
        return n;
    }
    // testing, on your own computer only (the content manager): ?reset=3 → the start of reset 3.
    // (on the live site it does nothing)
    var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    try {
        var m = LOCAL && /[?&]reset=(\d)/.exec(location.search);
        if (m && +m[1] >= 1 && +m[1] <= MAX) {
            goTo(+m[1]);
            try { sessionStorage.setItem('dav-loaded', '1'); } catch (e) {}
            history.replaceState(null, '', location.pathname + location.search.replace(/[?&]reset=\d/, '').replace(/^&/, '?') + location.hash);
        }
    } catch (e) {}

    // the technical fallback ("Forget your stay… (Clear cache)"): the site's copy of itself, and this
    // visit, are thrown away. what they've done in the game (and which reset they're in) stays.
    function clearCache() {
        put('dav-seen', null); put('dav-have', null);
        try { sessionStorage.clear(); } catch (e) {}
        return window.caches ? caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }).catch(function () {}) : Promise.resolve();
    }

    /* ---------------- art for one reset: assets/resets/reset-<n>/… ----------------
       assets/resets/index.txt names every file in there (tools/update-lists.sh and the content manager
       write it). a picture swapped in one reset stays swapped in the ones after, until another swaps it again. */
    var overrides = null;
    function loadOverrides() {
        if (!overrides) overrides = fetch('assets/resets/index.txt', { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.text() : ''; })
            .then(function (t) {
                var have = {};
                if (/<html/i.test(t)) return have;
                t.split(/\r?\n/).forEach(function (l) { l = l.trim(); if (l && l.charAt(0) !== '#') have[l] = 1; });
                return have;
            }).catch(function () { return {}; });
        return overrides;
    }
    // "assets/sky/sun" → "assets/resets/reset-3/sky/sun.gif", if reset 3 (or an earlier one, down to 1) swapped it
    function swapFor(slot, have) {
        var m = /^assets\/([a-z0-9-]+)\/([a-z0-9-]+)(\.[a-z0-9]+)?$/i.exec(slot);
        if (!m || m[1] === 'resets') return null;
        for (var r = sphere(); r >= 1; r--) {
            var pre = 'reset-' + r + '/' + m[1] + '/' + m[2];
            if (m[3]) { if (have[pre + m[3]]) return 'assets/resets/' + pre + m[3]; continue; }
            var hits = Object.keys(have).filter(function (p) { return p.indexOf(pre + '.') === 0 && p.lastIndexOf('/') === pre.lastIndexOf('/'); });
            if (hits.length) return 'assets/resets/' + hits[0];
        }
        return null;
    }
    // one reset's own things (its key, its note): assets/resets/reset-<n>/<name>
    function ownFile(name, have, n) {
        var pre = 'reset-' + (n || sphere()) + '/' + name;
        var hits = Object.keys(have).filter(function (p) { return p === pre || p.indexOf(pre + '.') === 0; });
        return hits.length ? 'assets/resets/' + hits[0] : null;
    }

    // resets 1 and 2: the sky's a stage set, its props hung on strings (sky/sky.css)
    if (sphere() <= 2) document.documentElement.classList.add('stage-strings');
    document.documentElement.setAttribute('data-reset', sphere());          // (for the pages' own styles: html[data-reset="4"] …)

    window.DAV_RESETS = RESETS;
    window.DAV_DEATHS = DEATHS;
    window.davSave = {
        MAX: MAX, RESETS: RESETS, DEATHS: DEATHS,
        get reset() { return sphere(); },                              // 1 … 8
        get info() { return RESETS[sphere() - 1]; },
        live: function (d) { return !!DEATHS[d] && DEATHS[d].live.indexOf(sphere()) !== -1; },
        patched: function (d) { return !!DEATHS[d] && sphere() > Math.max.apply(null, DEATHS[d].live); },
        before: function (d) { return !!DEATHS[d] && sphere() < Math.min.apply(null, DEATHS[d].live); },
        get: function (k) { return get('run:' + k); },
        set: function (k, v) { put('run:' + k, v); },
        nextReset: nextReset,
        goTo: LOCAL ? goTo : function () {},
        RUN: RUN,
        clearCache: clearCache,
        overrides: loadOverrides,
        swapFor: swapFor,
        ownFile: ownFile
    };
})();

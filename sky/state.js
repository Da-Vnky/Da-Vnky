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

// ?map: the asset manager's map of a scene (tools/assets.html shows the page small, with every slot outlined on it).
// On your own computer only. The page is shown, not played: nothing it does is kept (every save goes to a scratch
// copy that's forgotten when it closes, so a look at the porch doesn't bring the watcher a step closer), and it
// makes no sound. html.dav-map for the page's own CSS.
(function () {
    if (!/[?&]map(?:[=&]|$)/.test(location.search) || !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
    window.DAV_MAP = true;
    document.documentElement.classList.add('dav-map');
    // the storage: reads see the real one, writes go to a scratch copy
    var P = Storage.prototype, real = { get: P.getItem, set: P.setItem, del: P.removeItem, key: P.key, len: Object.getOwnPropertyDescriptor(P, 'length').get };
    var scratch = new Map();
    function over(s) { if (!scratch.has(s)) scratch.set(s, {}); return scratch.get(s); }
    function keys(s) {
        var o = over(s), out = [], n = real.len.call(s), i, k;
        for (i = 0; i < n; i++) { k = real.key.call(s, i); if (!(k in o)) out.push(k); }
        for (k in o) if (o[k] !== null) out.push(k);
        return out;
    }
    P.getItem = function (k) { var o = over(this); k = String(k); return k in o ? o[k] : real.get.call(this, k); };
    P.setItem = function (k, v) { over(this)[String(k)] = String(v); };
    P.removeItem = function (k) { over(this)[String(k)] = null; };
    P.clear = function () { var o = over(this); keys(this).forEach(function (k) { o[k] = null; }); };
    P.key = function (i) { var k = keys(this); return i < k.length ? k[i] : null; };
    Object.defineProperty(P, 'length', { configurable: true, get: function () { return keys(this).length; } });
    // no sound: nothing starts playing, and the sound engines stay asleep
    HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
    ['AudioContext', 'webkitAudioContext'].forEach(function (n) {
        var AC = window[n];
        if (!AC) return;
        var Quiet = function (o) { var c = new AC(o); try { c.suspend(); } catch (e) {} c.resume = function () { return Promise.resolve(); }; return c; };
        Quiet.prototype = AC.prototype;
        window[n] = Quiet;
    });
})();

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
        // reset 5, the veil: the painted sky over the rooftop has come unstuck at one corner. pull it and the sky tears open
        // onto what's behind it (nothing: the black, and the lines it's written in), and the traveller is pulled through
        // (sky/veil.js). after it, the corner's sewn shut
        veil:     { name: 'the sky, torn open over the rooftop',      live: [5], patch: 'sewn shut with big, clumsy stitches',
                    slots: ['assets/city/sky-seam', 'assets/city/behind-the-sky'], patchSlots: ['assets/city/sky-stitched'] },
        // reset 6, the watchers: eyes open in the house's dark places. through the telescope, looking up, the sky opens one
        // too; meet its gaze and it burns the traveller where they stand (sky/watchers.js). after it, it's painted over
        gaze:     { name: 'the eye in the sky, met through the telescope', live: [6], patch: 'painted over, from the other side',
                    slots: ['assets/city/sky-eye', 'assets/ui/watcher-eye'], patchSlots: ['assets/city/sky-eye-painted'] },
        // reset 7, the loop: the workshop timer, started, doesn't count down minutes. it counts down everything: days and
        // years race past the window and the traveller ages to dust (sky/loop.js). after it, it has no hands
        timer:    { name: 'the workshop timer, run to the end of time', live: [7], patch: 'it has no hands any more',
                    slots: ['assets/workshop/timer-racing'], patchSlots: [] },
        // (PLACEHOLDERS: a way to die not designed yet can be a bubble on a page, { placeholder: { page, in, left, top } }:
        // a dashed circle with a skull that kills the traveller when clicked (sky/resets.js). none now: reset 8 has no death,
        // every one before it is patched by then, and its way on is knowing: sky/gnosis.js)
    };
    Object.keys(DEATHS).forEach(function (k) { var d = DEATHS[k]; d.patch = d.patch || ''; d.slots = d.slots || []; d.patchSlots = d.patchSlots || []; });
    // (one heart: sky/lives.js. every way to die is off until the reset's key is found; each reset's is its only one)

    // key: where the reset's key is hidden. page: sea, workshop, city, living; in: which part of the page
    // (a selector); left/top: where in it; where: said in the content manager.
    // or drop: something in the game drops it instead ('claubes': sky/claubes.js), wherever that happens.
    // after: what the traveller says once it's found (a nudge towards the reset's way out)
    // phrase: what the reset's death leaves them with, written on the white as the world resets (sky/forget.js), one line
    //   of the answer to the Demiurge at the end (sky/gnosis.js). claim: what the Demiurge says that line answers: each
    //   sphere's ruler claims something of them (their hands, the world, their appetite …), and each phrase denies it
    var RESETS = [
        { n: 1, name: 'items',       theme: 'the gun',                                deaths: ['revolver'],
          phrase: 'I am not the hand that held it.',  claim: 'Your hands held my things. Your hands are mine.',
          key: { page: 'workshop', in: '.room',     left: 12,   top: 55.4, where: 'the workshop, between the jars on the shelf' } },
        { n: 2, name: 'environmental', theme: 'the world itself: the boat',           deaths: ['boat'],
          phrase: 'I am not the weight that fell.',   claim: 'My world fell on you. You are of my world.',
          key: { page: 'city',     in: 'body',      left: 69.4, top: 89.6, where: 'the rooftop, by the potted plant' } },
        { n: 3, name: 'ingestion',   theme: 'the pills (and the fall)',               deaths: ['pills'],
          phrase: 'I am not what I swallowed.',       claim: 'You swallowed what I gave you. It is in you still.',
          // (stuck in the apple pie in the kitchen fridge, its ring sticking out: sky/kitchen.js. the junk drawer has a hint)
          key: { page: 'living',   in: '.kitchen-pie', left: 40, top: 30, where: 'the kitchen, in the fridge: stuck in the apple pie' } },
        { n: 4, name: 'dark witchcraft', theme: 'the grimoire, the Claubes and the false god', deaths: ['diagram'],
          phrase: 'I am not its fire.',               claim: 'You signed my book in blood. My fire is in you.',
          key: { page: 'living',   drop: 'hell', where: 'below (after the grimoire\u2019s pact): shoot the eye with the white revolver and it drops at your feet' } },
        // 5 to 7 (5 Oct): the world uncovering itself, a layer a reset. the sky cracks a little more each time (sky/veil.js)
        { n: 5, name: 'the veil',    theme: 'the world is painted on, and it\u2019s coming unstuck', deaths: ['veil'],
          phrase: 'I am not the painted sky.',        claim: 'I painted every sky you ever saw. You are under it.',
          // (behind the wallpaper peeling off the living-room wall: sky/veil.js)
          key: { page: 'living',   in: '.wall-peel', left: 62, top: 50, where: 'the living space: behind the wallpaper peeling off the wall' },
          after: '\u2026And the sky over the rooftop. One corner of it has come loose.' },
        { n: 6, name: 'the watchers', theme: 'someone keeps it all running, and watches', deaths: ['gaze'],
          phrase: 'I am not what it sees.',           claim: 'I have watched you every moment. What I see, I own.',
          key: { page: 'living',   drop: 'watcher', where: 'the hallway: the one eye in the wall that never blinks. click it and it weeps the key' },
          after: '\u2026Something up there is looking down. Through the telescope, I\u2019d see it looking.' },
        { n: 7, name: 'the loop',    theme: 'time is the cage: it has always been the same day', deaths: ['timer'],
          phrase: 'I am not its hours.',              claim: 'Every hour you have lived, I counted. Your time is mine.',
          key: { page: 'living',   drop: 'microwave', where: 'the kitchen: run the microwave. it counts the wrong way, and the key is on the plate' },
          after: '\u2026The timer in the workshop. It\u2019s been waiting for me the whole time.' },
        // 8 (5 Oct): no key and no death. the serpent's pie gives gnosis (they remember every phrase), and on the sea they
        // answer the Demiurge with them; it goes blind, and they choose: go home, or stay and wake the others (sky/gnosis.js)
        { n: 8, name: 'the grand mystery', tab: 'mystery', theme: 'the truth: the world in black and white, its source code showing', deaths: [],
          key: { page: 'living', drop: 'gnosis', where: 'none: the way on is knowing. the serpent in the kitchen, the pie in the fridge, then the sea' } }
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

    /* ---------------- the end (reset 8, sky/gnosis.js) ----------------
       localStorage "dav-ending": "escaped" (they went home: every page of the site is beyond.html from then on, its button
       the way back onto the Sophia path) or "stayed" (they stayed to wake the others: the world in its colours again, no more
       resets: html.free-world). like the reset number, it's kept between visits till "forget your stay" */
    function ending() { var e = get('dav-ending'); return e === 'escaped' || e === 'stayed' ? e : ''; }
    try {                                                               // (testing, your own computer only: ?ending=stayed / escaped / none)
        var me = LOCAL && /[?&]ending=(stayed|escaped|none)/.exec(location.search);
        if (me) {
            put('dav-ending', me[1] === 'none' ? null : me[1]);
            history.replaceState(null, '', location.pathname + location.search.replace(/[?&]ending=[a-z]+/, '').replace(/^&/, '?') + location.hash);
        }
    } catch (e) {}
    // (gone home, but leaving a message: anyone can always leave one. beyond.html's "leave a message" opens the sea with
    // the bottle desk out (index.html#message, sky/post.js), and back to beyond.html once it's thrown)
    var posting = ending() === 'escaped' && /(^|\/)(index\.html)?$/.test(location.pathname) && location.hash === '#message';
    if (posting) document.documentElement.classList.add('posting-only');
    if (ending() === 'escaped' && !posting && !/\/(beyond|window-sky)\.html$|\/tools\/|schizophyllu\.me\.room/.test(location.pathname)) {
        var here = document.currentScript && document.currentScript.src;
        try { location.replace(new URL('../beyond.html', here || location.href).href); } catch (e) { location.replace('beyond.html'); }
    }
    if (ending() === 'stayed' || posting) document.documentElement.classList.add('free-world');

    // resets 1 and 2: the sky's a stage set, its props hung on strings (sky/sky.css)
    if (sphere() <= 2) document.documentElement.classList.add('stage-strings');
    document.documentElement.setAttribute('data-reset', sphere());          // (for the pages' own styles: html[data-reset="4"] …)

    window.DAV_RESETS = RESETS;
    window.DAV_DEATHS = DEATHS;
    window.davSave = {
        MAX: MAX, RESETS: RESETS, DEATHS: DEATHS,
        get reset() { return sphere(); },                              // 1 … 8
        get info() { return RESETS[sphere() - 1]; },
        get ending() { return ending(); },                             // '' / 'escaped' / 'stayed' (the end: sky/gnosis.js)
        get free() { return ending() === 'stayed' || posting; },      // stayed: the world as it is, no more resets (gone home and
                                                                        // back for a message: the same, for that one moment)
        get posting() { return posting; },
        setEnding: function (e) { put('dav-ending', e === 'escaped' || e === 'stayed' ? e : null); },
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

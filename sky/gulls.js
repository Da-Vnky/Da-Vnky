/* =====================================================================
   gulls.js — seagulls over the sea (index.html). Load after sky/ground-sea.js.

   (31 Oct, the artist: "slots for seagulls for the sea scene … in both the foreground out of focus and in the
   background", and their own sound.)

   far off: a few small gulls wheel slowly over the water and round the port city, gliding and now and then
     flapping, and now and then one crosses the whole sea. they're in the sea's own layer, in front of the far wave,
     behind the city, the dock and the nearer waves, so they drift with the scene. slot assets/sea/seagull-far
     (facing right; a GIF or animated WebP can flap).
   up close: now and then a big gull goes right past the camera, out of focus like the rock: it sweeps across the top
     of the screen, or hangs in the wind near a top corner for a while and peels away. it never stops over the ship,
     the traveller, the dock or the signpost, and never takes a click (it's only there to look at). slot
     assets/sea/seagull-near (facing right; draw it sharp: the page blurs it).
   by day they're all about; at dusk fewer, and slower to come; at night they've gone to roost. on the asset
   manager's map they're shown still (one up close, parked top left), and for those who'd rather nothing moved the far
   ones stay still and the near one never comes.
   their calls: assets/sounds/seagulls (a recording of yours, played now and then: far ones quietly, the near one when
   it passes), else a drawn cry (sky/panel.js "gull-cry"). nothing before the visitor's first click, nothing while the
   site's hushed, never more than one at a time. (the sky's birds have their own sound: sky/sky.js)

   resets 1 and 2 (31 Oct: the world's a stage set there): they're props on sticks from below, low along the horizon,
   pushed along a track at a steady speed and bobbing in an even sine wave, turning sharply at each end, like a shooting
   gallery's (TRACK below; gulls.css "stage"). the big one past the camera is a puppet on a stick too, swept across the same
   mechanical way (and never hangs in the wind).

   moving is all CSS (sky/css/gulls.css): this only decides when the next one comes.
   ===================================================================== */

(function () {
    var Sky = window.Sky, sea = Sky && Sky.sea && Sky.sea.el;
    if (!sea || Sky.gulls) return;
    var root = document.documentElement, body = document.body;
    var MAP = root.classList.contains('dav-map');
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var NEAR_EVERY = [28, 70];      // seconds between big gulls going past the camera (more at dusk: see dusky())
    var CROSS_EVERY = [35, 80];     // seconds between far gulls crossing the whole sea
    var CALL_EVERY = [9, 26];       // seconds between far-off calls while they're about
    var FAR = [                     // the wheeling ones: where (% of their layer), how wide a loop (vw), how long (s), when (s)
        { x: 66, y: 24, r: 6, h: 3.4, s: 19, d: -3 },
        { x: 82, y: 12, r: 4.2, h: 2.4, s: 15, d: -11 },
        { x: 44, y: 40, r: 7.5, h: 3, s: 23, d: -7, dusk: true },   // (dusk: it's the first to go)
        { x: 26, y: 30, r: 5, h: 2.6, s: 17, d: -14, dusk: true }
    ];
    // resets 1 and 2: each one's track instead. x where it starts (% across), w how far it goes (vw), s how long one way
    // takes (s), h how high its row is over the horizon (vh), b one bob (s), a how far it bobs (vh)
    var TRACK = [
        { x: 54, w: 30, s: 16, h: 2.2, b: 1.1, a: .7 },
        { x: 70, w: 24, s: 12, h: 6.5, b: .9, a: .5 },
        { x: 22, w: 36, s: 21, h: .6, b: 1.4, a: .8 },
        { x: 8, w: 26, s: 14, h: 4.2, b: 1.2, a: .6 }
    ];
    var STAGE = root.classList.contains('stage-strings');        // (sky/state.js: resets 1 and 2)

    // the drawn gull: white body, grey back and wings with black tips, a yellow beak (the dock's gull's kind), facing
    // right, wings up in the middle of a beat. its two wings beat round their shoulders (gulls.css .sg-wing)
    function gullArt(near) {
        return '<svg class="placeholder" viewBox="0 0 100 46" aria-hidden="true">' +
            '<g class="sg-wing far-wing"><path d="M47 25 C40 16 33 9 26 9 C18 9 10 14 2 21 C11 19 20 19 28 20 C36 21 42 24 47 28 Z" fill="#8e979f"/>' +
                '<path d="M2 21 C7 17 12 14 17 12 L15 18 C10 18 6 19 2 21 Z" fill="#2d2c2b"/></g>' +
            '<path d="M33 27 L24 24 L25 30 Z" fill="#e9e4d8"/><path d="M27 25 L24 24 L25 28 Z" fill="#2d2c2b"/>' +
            '<path d="M32 28 C36 23 48 21 58 22 C64 22 68 24 69 27 C66 31 56 33 46 32 C40 32 35 31 32 28 Z" fill="#f3efe4"/>' +
            '<path d="M38 26 C46 23 56 23 62 25 C55 25 46 26 38 26 Z" fill="#a4acb3"/>' +
            '<circle cx="66" cy="23.6" r="4.4" fill="#f3efe4"/>' +
            '<path d="M70 23 L77 24.4 L70 25.8 Z" fill="#e0a030"/>' +
            (near ? '<path d="M73.5 24.6 l1.4 .9" stroke="#c0452a" stroke-width=".9"/><circle cx="67.6" cy="22.6" r=".9" fill="#2a1d14"/>' +
                '<path d="M40 30 C46 31 54 31 60 29" fill="none" stroke="#d6d0c2" stroke-width=".8"/>' : '<circle cx="67.4" cy="22.8" r=".8" fill="#2a1d14"/>') +
            '<g class="sg-wing near-wing"><path d="M50 26 C46 16 46 8 50 3 C55 -1 63 0 70 6 C64 6 58 8 55 12 C53 17 53 22 54 27 Z" fill="#b1b9c0"/>' +
                '<path d="M70 6 C66 2 60 0 55 1 L57 6 C61 5 66 5 70 6 Z" fill="#2d2c2b"/>' +
                (near ? '<path d="M52 20 C51 14 52 9 55 6 M55 22 C55 16 57 11 61 8" fill="none" stroke="#959ea6" stroke-width=".7"/>' : '') + '</g>' +
            '</svg>';
    }
    function gull(cls, slot, near) {
        var g = document.createElement('div');
        g.className = 'sea-gull ' + cls;
        g.setAttribute('aria-hidden', 'true');
        g.innerHTML = '<div class="sg-body" data-asset="' + slot + '">' + gullArt(near) + '</div>';
        return g;
    }

    /* ---------------- far off: in the sea's layer, just after the far wave ---------------- */
    var far = document.createElement('div');
    far.className = 'sea-gulls';
    far.setAttribute('aria-hidden', 'true');
    FAR.forEach(function (f, i) {
        var g = gull('far wheel g' + (i + 1) + (f.dusk ? ' early' : ''), 'assets/sea/seagull-far', false);
        var t = TRACK[i];
        g.style.cssText = '--gx:' + f.x + '%;--gy:' + f.y + '%;--gr:' + f.r + 'vw;--gh:' + f.h + 'vh;--gs:' + f.s + 's;--gd:' + f.d + 's;' +
            '--gf:' + (1.9 + i * 0.37).toFixed(2) + 's;' +
            '--sx:' + t.x + '%;--sw:' + t.w + 'vw;--st:' + t.s + 's;--sh:' + t.h + 'vh;--sb:' + t.b + 's;--sa:' + t.a + 'vh';
        far.appendChild(g);
    });
    var crosser = gull('far crossing', 'assets/sea/seagull-far', false);
    far.appendChild(crosser);
    var city = sea.querySelector('.sea-city');
    sea.insertBefore(far, city || sea.firstChild);

    /* ---------------- up close: over the page, like the rock ---------------- */
    var nearLayer = document.createElement('div');
    nearLayer.className = 'sea-gulls-near';
    nearLayer.setAttribute('aria-hidden', 'true');
    var near = gull('near', 'assets/sea/seagull-near', true);
    nearLayer.appendChild(near);
    body.appendChild(nearLayer);
    if (Sky.fillAssets) { Sky.fillAssets(far); Sky.fillAssets(nearLayer); }

    if (MAP) { near.classList.add('parked'); return publish(); }   // (the asset manager's map: still, and all of them showing)

    /* ---------------- when ---------------- */
    function rnd(a) { return a[0] + Math.random() * (a[1] - a[0]); }
    function num(name) { return parseFloat(getComputedStyle(root).getPropertyValue(name)) || 0; }
    function dusky() { return num('--dusk'); }
    function roosting() { return num('--night') > 0.45 || dusky() > 0.85; }
    function away() {                                            // (looking up, through the telescope, or the tab's hidden)
        return document.hidden || body.classList.contains('sky-view') || body.classList.contains('scope-view');
    }
    function later(fn, range, slower) { return setTimeout(fn, rnd(range) * 1000 * (1 + (slower ? 1.6 * dusky() : 0))); }

    // a far one crossing the whole sea, one way or the other, at a height of its own
    function cross() {
        later(cross, CROSS_EVERY, true);
        if (calm || roosting() || away() || crosser.classList.contains('going')) return;
        crosser.style.setProperty('--gy', (8 + Math.random() * 34).toFixed(1) + '%');
        crosser.style.setProperty('--gc', (24 + Math.random() * 10).toFixed(1) + 's');
        crosser.classList.toggle('leftward', Math.random() < 0.5);
        crosser.classList.remove('going'); void crosser.offsetWidth; crosser.classList.add('going');
        if (Math.random() < 0.5) setTimeout(function () { call(0.15, 0.25); }, 3000 + Math.random() * 6000);
    }
    crosser.addEventListener('animationend', function (e) { if (e.target === crosser) crosser.classList.remove('going'); });

    // a big one past the camera: a sweep across the top, or a while hanging in the wind near a top corner
    var MOVES = STAGE ? ['sweep'] : ['sweep', 'sweep', 'hang'];
    function pass() {
        later(pass, NEAR_EVERY, true);
        if (calm || roosting() || away() || near.className.indexOf(' go-') !== -1) return;
        if (dusky() > 0.4 && Math.random() < dusky()) return;          // (fewer as the light goes)
        var move = MOVES[Math.floor(Math.random() * MOVES.length)], right = Math.random() < 0.5;
        near.style.setProperty('--ny', (move === 'hang' ? 5 + Math.random() * 7 : 4 + Math.random() * 16).toFixed(1) + 'vh');
        nearLayer.classList.toggle('from-right', right);             // (from the right: the whole flight mirrored, gulls.css)
        near.className = 'sea-gull near go-' + move;
        setTimeout(function () { call(move === 'hang' ? 0.85 : 0.95, move === 'hang' ? 0.55 : 0.75); }, move === 'hang' ? 2200 : 900);
    }
    near.addEventListener('animationend', function (e) {
        if (e.target === near) near.className = 'sea-gull near';
    });

    // their calls (sky/panel.js): one at a time, not before the first click, not while hushed
    var calling = 0;
    function heard() { return !navigator.userActivation || navigator.userActivation.hasBeenActive; }
    function call(size, volume) {
        if (!Sky.sfx || !heard() || away() || roosting() || Date.now() < calling) return;
        if (Sky.sounds && Sky.sounds.hushed) return;
        calling = Date.now() + 2500;
        Sky.sfx('seagulls', { or: 'gull-cry', size: size, volume: volume * (1 - 0.6 * dusky()) });
    }
    function chatter() {
        later(chatter, CALL_EVERY, true);
        call(0.1 + Math.random() * 0.25, 0.22 + Math.random() * 0.12);
    }

    if (!calm) {
        later(cross, [8, 20]);
        later(pass, [12, 30]);
    }
    later(chatter, [5, 12]);

    function publish() {
        Sky.gulls = { far: far, near: near, crosser: crosser,
                      pass: function (move) {                    // (for checking: a big one past the camera, now)
                          near.style.setProperty('--ny', '8vh');
                          near.className = 'sea-gull near go-' + (move || 'sweep');
                      },
                      cross: function () { crosser.classList.remove('going'); void crosser.offsetWidth; crosser.classList.add('going'); } };
    }
    publish();
})();

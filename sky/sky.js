/* =====================================================================
   sky.js — the shared sky: daylight → sunset → midnight as you scroll,
   sun, moon, clouds, stars, Ursa Minor, the night-sky links, and Polaris,
   which is always visible and always takes you home.

   Load it at the END of <body>, before any ground script:
       <script src="sky/sky.js"></script>
       <script src="sky/ground-sea.js"></script>   (or -countryside / -city)

   Page options (attributes on <body>):
       data-page="home"      this page IS the homepage (Polaris scrolls back up
                             to daylight instead of reloading)
       data-place="workshop" which of the PLACES below this page is, so its
                             sign reads "you are here"
       data-voyage="110"     (homepage) how much empty sky to scroll through after
                             your content, in % of the screen height. more = slower sunset.
       data-time="0"         (every other page) the hour it stays at: 0 = midday,
                             0.5 = sunset, 1 = midnight. without it, the page follows
                             the visitor's own clock (see CLOCK below). only the
                             homepage's scroll turns the day; elsewhere the sky view
                             (a window, a telescope) does, and a page can set it
                             (Sky.setTime).
       data-scroll-time      give any page the homepage's scroll-driven day instead
   ===================================================================== */

(function () {

    /* ======================= settings you can edit ======================= */

    // where Polaris takes you
    var HOME = 'https://dav-nky.pleroma.nexus/';
    // previewing on your own computer (tools/preview): home stays on your computer too
    if (location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/.test(location.hostname)) HOME = 'index.html';

    // every place on the site. on every page but the homepage it's a tab on the
    // right edge with a little picture of the place (slot: assets/ui/place-<id>;
    // a new place without one gets a plain door). the homepage has a signpost
    // instead (right side, on the dock): a wooden sign for each place that isn't
    // tabOnly. since 27 Sep (Victor) that's just the sea and "visit home", which
    // takes you to the front of the house (living.html#front, sky/front.js): the
    // workshop, the rooftop and the rooms are reached from inside the house.
    //   tabOnly: a tab, but no sign on the homepage    signOnly: a sign, but no tab
    // to add a place: add a line here, in the order you want them.
    var PLACES = [
        { id: 'sea',      name: 'the sea',          href: HOME },
        { id: 'home',     name: 'visit home',       href: 'living.html#front', signOnly: true },
        { id: 'workshop', name: 'the workshop',     href: 'workshop.html', tabOnly: true },
        { id: 'city',     name: 'the rooftop',      href: 'city.html', tabOnly: true },
        { id: 'living',   name: 'the living space', href: 'living.html', tabOnly: true },
        { id: 'kitchen',  name: 'the kitchen',      href: 'living.html#kitchen', tabOnly: true }
    ];

    // the constellations: they come out at night, on every page. each one is a link
    // to somewhere else on the web, or an easter egg (a little surprise, see EGGS
    // further down). neither yet? it's a placeholder that just twinkles.
    //   id     its drawing's slot: assets/sky/constellation-<id> (a transparent PNG or
    //          SVG, 150 x 80 or the same shape; the stars glow, the rest see-through)
    //   name   shown under it
    //   href   a web address (opens in a new tab)      egg   an easter egg's name
    //   shape  which of the drawn star patterns it uses until you add your own (1–7)
    // up to seven show at once (in the positions l1…l7 in sky/sky.css).
    var CONSTELLATIONS = [
        { id: 'pleroma', name: 'pleroma.nexus',  href: 'https://pleroma.nexus', shape: 1 },
        { id: 'wish',    name: 'make a wish',    egg: 'shooting-star',          shape: 2 },
        { id: 'lantern', name: 'the lantern',    egg: 'lantern',                shape: 3 },
        { id: 'harp',    name: 'the harp',       href: '',                      shape: 4 },
        { id: 'kite',    name: 'the kite',       href: '',                      shape: 5 },
        { id: 'whale',   name: 'the whale',      egg: 'whale',                  shape: 6 },
        { id: 'key',     name: 'the key',        egg: 'key',                    shape: 7 }
    ];

    // your Forgejo repo's API address. if Mel's Forgejo allows it, the site asks it
    // which files are in each content folder (one of three ways it finds new files).
    var REPO_API = 'https://members.pleroma.nexus/api/v1/repos/subdomains/DaV-nky';

    // where visitors' messages in bottles are sent for you to read and approve.
    // a FormSubmit address (see content/README.txt, "your post office"), e.g.
    //   'https://formsubmit.co/1a2b3c4d5e6f…'
    // leave it '' and bottles still get tossed, but nothing is delivered.
    var BOTTLE_INBOX = 'https://formsubmit.co/2c5dbeae55bf1f0a6f5f746a90c805ac';

    // your post office on Supabase: bottles and paintings are sent straight into your own
    // database (pictures and all), and the content manager (tools\content.bat) collects them.
    // url: your project's URL (https://xxxx.supabase.co). key: its PUBLISHABLE key
    // (sb_publishable_…, or the older "anon" key). that one is made to be public: all it can
    // do is send post in; only your secret key (kept in the content manager, never here) reads it.
    // leave url '' and post goes by FormSubmit instead, as before.
    // with Supabase set, FormSubmit (BOTTLE_INBOX) just emails you a short "something arrived";
    // set NOTIFY_BY_EMAIL = false to stop those.
    var SUPABASE = { url: 'https://hemevjpsdjesolnpwkry.supabase.co', key: 'sb_publishable_9-1CFzAUiC8-_mIfvvmHCg_-6IaG_PQ' };
    var NOTIFY_BY_EMAIL = true;

    // every page but the homepage shows the sky as it is right now for the visitor
    // (the sun and moon where they'd really be, by their own clock). false = midday,
    // or whatever hour a page sets with data-time="…".
    var CLOCK = true;

    // the site's own mouse cursors. each is a slot, assets/ui/<name> (a 32 x 32 PNG is best,
    // 64 at most); the numbers are its hotspot: the pixel that does the pointing, from the top left.
    //   cursor           everywhere                     cursor-pointer   over things you can click
    //   cursor-star      over the constellations        cursor-grab      over things you can pick up
    //   cursor-grabbing  while holding something        cursor-look      over things to look into
    //   cursor-brush     over the easel you paint on (its tip is the hotspot, bottom left)
    // set CURSORS = null to keep the computer's usual cursors.
    var CURSORS = {
        'cursor': [3, 2], 'cursor-pointer': [4, 3], 'cursor-star': [16, 16],
        'cursor-grab': [16, 14], 'cursor-grabbing': [16, 14], 'cursor-look': [12, 12], 'cursor-brush': [3, 29]
    };

    // things that cross the sky while you're looking at it (the sky view):
    // each is a slot, assets/sky/<name>, drawn for now as a placeholder.
    //   when: 'day' or 'night'   every: about how many seconds apart
    //   speed: px per second     size: px wide   high: [top, bottom] of its path, % down the screen
    var FLYERS = [
        { name: 'blimp',         when: 'day',   every: 45, speed: 26,  size: 230, high: [12, 30] },
        { name: 'birds',         when: 'day',   every: 20, speed: 70,  size: 120, high: [10, 42] },
        { name: 'balloon',       when: 'day',   every: 60, speed: 16,  size: 74,  high: [18, 46] },
        { name: 'shooting-star', when: 'night', every: 14, speed: 950, size: 150, high: [6, 34] }
    ];

    // sky colours along the scroll: [position 0–1, top of sky, horizon]
    var SKY = [
        [0.00, '#5fa8dc', '#bfe3f5'],   // daylight
        [0.22, '#4f95cf', '#a9d6ee'],
        [0.33, '#6f9cc8', '#f1d49a'],   // golden hour
        [0.42, '#e8935a', '#f8cf86'],   // sunset orange
        [0.58, '#8a3f6e', '#d2566a'],   // reddish purple
        [0.76, '#1c2a5e', '#3d3f7a'],   // deep blue
        [1.00, '#0b1022', '#1b2238']    // midnight
    ];

    /* ===================================================================== */

    function clamp(v) { return Math.max(0, Math.min(1, v)); }
    function ramp(p, a, b) { return clamp((p - a) / (b - a)); }
    function smooth(t) { return t * t * (3 - 2 * t); }
    function hex(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
    function mix(a, b, t) {
        var A = hex(a), B = hex(b);
        return 'rgb(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t); }).join(',') + ')';
    }
    function hashStr(s) {
        var h = 2166136261;
        for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
        return h >>> 0;
    }
    function seeded(seed) {
        return function () {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    function css(text) {
        var s = document.createElement('style');
        s.textContent = text;
        document.head.appendChild(s);
    }
    function skyAt(p) {
        for (var i = 1; i < SKY.length; i++) {
            if (p <= SKY[i][0]) {
                var s0 = SKY[i - 1], s1 = SKY[i];
                var t = smooth((p - s0[0]) / (s1[0] - s0[0]));
                return [mix(s0[1], s1[1], t), mix(s0[2], s1[2], t)];
            }
        }
        var last = SKY[SKY.length - 1];
        return [last[1], last[2]];
    }

    var body = document.body, root = document.documentElement;
    var isHome = body.dataset.page === 'home';

    /* ---------------- which art files exist (see findAsset, further down) ---------------- */
    // several names can be given, best first: "assets/sky/cloud-2|assets/sky/cloud"
    //
    // each assets/<folder>/ has a list.txt naming its files (tools/update-lists.sh writes them
    // on every commit), and the server's listing and the Forgejo repo are asked too, just like
    // the content folders. so the site only asks for pictures that are really there. a folder
    // it can't find out about gets each file type tried in turn instead.
    var EXTS = ['svg', 'gif', 'webp', 'png', 'jpg'];
    var assetDirs = {}, assetMemo = {};
    function assetDir(dir) {
        // (a reset's own folder: assets/resets/index.txt already says what's in it)
        if (!assetDirs[dir] && /^assets\/resets\//.test(dir) && window.davSave) assetDirs[dir] = window.davSave.overrides().then(function (have) {
            var names = {}, pre = dir.replace(/^assets\/resets\//, '');
            Object.keys(have).forEach(function (p) { if (p.indexOf(pre) === 0 && p.slice(pre.length).indexOf('/') === -1) names[p.slice(pre.length)] = 1; });
            return names;
        });
        // (the folder's list.txt, once; without one, asked around: sky.js listFolder)
        if (!assetDirs[dir]) assetDirs[dir] = fetch(dir + 'list.txt', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; }).then(function (t) {
            var names = {};
            if (t && !/<html/i.test(t)) {
                t.split(/\r?\n/).forEach(function (l) { l = l.trim(); if (l && l.charAt(0) !== '#' && l !== 'list.txt') names[l] = 1; });
                return names;
            }
            return new Promise(function (done) { listFolder(dir, EXTS.concat(['jpeg', 'json', 'mp3', 'ogg', 'webm', 'mp4', 'woff', 'woff2', 'ttf', 'otf']), done); }).then(function (files) {
                files.forEach(function (f) { names[f.name] = 1; });
                return files.length ? names : null;                   // null: we don't know, so try each file
            });
        });
        return assetDirs[dir];
    }

    /* ---------------- build the sky ---------------- */
    var rays = '';
    for (var a = 0; a < 360; a += 30) {
        rays += '<path d="M-4 -30 L0 -46 L4 -30 Z" transform="rotate(' + a + ')"/>';
    }

    var backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML =
        '<svg width="0" height="0" style="position:absolute"><defs><symbol id="sky-cloud" viewBox="0 0 200 90">' +
            '<path fill="currentColor" d="M20 72 C4 72 4 48 24 46 C22 28 46 20 58 32 C66 12 100 8 110 30 C122 18 150 22 150 42 C172 38 190 56 177 72 Z"/>' +
        '</symbol></defs></svg>' +
        '<div class="stars"></div>' +
        // Ursa Minor, rotated so it hangs below Polaris (Polaris itself is the link drawn on top)
        // Ursa Minor (slot: assets/sky/ursa-minor, 240 x 228, transparent: Polaris sits just above the top edge, 36% across)
        '<svg class="ursa" data-asset="assets/sky/ursa-minor" viewBox="-86 12 240 228">' +
            '<g transform="rotate(55 34 40)">' +
                '<g fill="none" stroke="rgba(225,232,255,.45)" stroke-width="1" stroke-dasharray="3 4" stroke-linecap="round">' +
                    '<path d="M34 40 L78 50 L114 66 L146 80"/><path d="M146 80 L198 60 L222 94 L168 110 Z"/>' +
                '</g>' +
                '<g fill="#e8edff">' +
                    '<circle cx="78" cy="50" r="1.8"/><circle cx="114" cy="66" r="2"/><circle cx="146" cy="80" r="2.2"/>' +
                    '<circle cx="198" cy="60" r="3"/><circle cx="222" cy="94" r="2.6"/><circle cx="168" cy="110" r="2"/>' +
                '</g>' +
            '</g>' +
            '<text x="44" y="234" text-anchor="end" font-size="11" font-style="italic" font-family="\'IM Fell English\', Georgia, serif" fill="rgba(225,232,255,.6)">Ursa Minor</text>' +
        '</svg>' +
        // slots: assets/sky/sun (+ sun-glow, the setting sun), assets/sky/moon, assets/sky/cloud (or cloud-1 … cloud-5)
        '<div class="sun" data-asset="assets/sky/sun"><svg class="placeholder" viewBox="-50 -50 100 100"><g fill="currentColor"><circle r="24"/>' + rays + '</g></svg></div>' +
        '<div class="moon" data-asset="assets/sky/moon"><svg class="placeholder" viewBox="0 0 60 60"><path fill="currentColor" d="M30 2 A28 28 0 0 0 30 58 A36 36 0 0 1 30 2 Z"/></svg></div>' +
        // (their widths: twice what they were, 27 Sep, Victor; never more than a share of a narrow screen)
        [['', '-1', 'left:3%;  top:14%; width:min(380px, 58vw)'], ['', '1', 'right:5%; top:26%; width:min(300px, 46vw)'], [' hide-small', '1', 'left:24%; top:5%;  width:min(260px, 40vw)'],
         [' hide-small', '-1', 'right:22%; top:9%; width:min(340px, 52vw)'], [' hide-small', '-1', 'left:12%; top:34%; width:min(220px, 34vw)']].map(function (c, i) {
            return '<div class="cloud' + c[0] + '" data-dir="' + c[1] + '" style="' + c[2] + '" data-asset="assets/sky/cloud-' + (i + 1) + '|assets/sky/cloud">' +
                   '<svg class="placeholder" viewBox="0 0 200 90"><use href="#sky-cloud"/></svg></div>';
        }).join('');
    body.insertBefore(backdrop, body.firstChild);

    /* ---------------- a painted sky of your own (optional) ----------------
       paint the sky at a few times of day and the site crossfades between them as the day turns
       (sun, moon, stars, clouds and weather still move on top). any you leave out are skipped:
         assets/sky/skybox-day      noon                     assets/sky/skybox-golden   late afternoon
         assets/sky/skybox-sunset   sunset                   assets/sky/skybox-dusk     after sunset
         assets/sky/skybox-night    midnight
       or just one, assets/sky/skybox: it's tinted toward evening and night by itself.
       wide pictures (1920 x 1080 or bigger) that can be cropped at the sides; horizon low.
       FROM RESET 4 (27 Sep, Victor): the sky of the Demiurge's false world, red as his fire. your own: the same names
       with -hell (assets/sky/skybox-hell, or skybox-hell-day … skybox-hell-night). until there's one, whatever sky
       there is (painted or drawn) is washed red (html.hell-sky, sky.css). */
    var SKYBOX = [['day', 0], ['golden', 0.33], ['sunset', 0.5], ['dusk', 0.6], ['night', 0.9]];
    // where each picture is at its fullest, on the sky's time (0 = noon, 0.5 = sunset, 1 = midnight). two numbers:
    // it holds between them. on the visitor's real clock: day until an hour and 20 minutes before sunset, golden
    // hour for the last hour before it, the sunset picture at sunset, dusk half an hour after (sunClock below)
    var SKY_AT = { day: [0, 0.29], golden: [0.33, 0.42], sunset: [0.5], dusk: [0.6], night: [0.9] };
    var skybox = document.createElement('div');
    skybox.className = 'skybox';
    skybox.innerHTML = SKYBOX.map(function (k) { return '<div data-sky="' + k[0] + '"></div>'; }).join('') + '<div data-sky="one"></div><div class="skybox-tint"></div><div class="hell-veil"></div>';
    backdrop.insertBefore(skybox, backdrop.firstChild);
    var skyLayers = [], skyOne = null;
    // one set of painted skies (base: assets/sky/skybox or assets/sky/skybox-hell); done(found any) once all are looked for
    function paintedSky(base, done) {
        var left = SKYBOX.length + 1, found = false;
        function one(url) { if (url) found = true; if (--left === 0 && done) done(found); }
        SKYBOX.forEach(function (k) {
            findAsset(base + '-' + k[0], function (url) {
                if (url) {
                    var el = skybox.querySelector('[data-sky="' + k[0] + '"]');
                    el.style.backgroundImage = 'url("' + new URL(url, location.href).href + '")';
                    SKY_AT[k[0]].forEach(function (at) { skyLayers.push({ el: el, at: at }); });
                    skyLayers.sort(function (a, b) { return a.at - b.at; });
                    body.classList.add('has-skybox');
                    kick();
                }
                one(url);
            });
        });
        findAsset(base, function (url) {
            if (url) {
                skyOne = skybox.querySelector('[data-sky="one"]');
                skyOne.style.backgroundImage = 'url("' + new URL(url, location.href).href + '")';
                body.classList.add('has-skybox');
                kick();
            }
            one(url);
        });
    }
    if (window.davSave && window.davSave.reset >= 4) {
        paintedSky('assets/sky/skybox-hell', function (found) {
            if (found) return;
            document.documentElement.classList.add('hell-sky');           // (no hell sky painted yet: the usual one, washed red)
            paintedSky('assets/sky/skybox');
        });
    } else paintedSky('assets/sky/skybox');
    function paintSkybox(p) {
        if (skyLayers.length) {                                       // the two nearest times of day, blended
            var lo = skyLayers[0], hi = null;
            for (var i = 0; i < skyLayers.length; i++) if (skyLayers[i].at <= p) lo = skyLayers[i];
            for (i = skyLayers.length - 1; i >= 0; i--) if (skyLayers[i].at >= p) hi = skyLayers[i];
            skyLayers.forEach(function (L) { L.el.style.opacity = 0; });
            lo.el.style.opacity = 1;
            if (hi && hi !== lo && hi.el !== lo.el) hi.el.style.opacity = smooth(clamp((p - lo.at) / (hi.at - lo.at))).toFixed(3);
            skybox.querySelector('.skybox-tint').style.opacity = 0;
        } else if (skyOne) {                                          // one picture, tinted as the day goes
            skyOne.style.opacity = 1;
            skybox.querySelector('.skybox-tint').style.opacity = (smooth(ramp(p, 0.3, 0.95)) * 0.85).toFixed(3);
        }
    }

    /* ---------------- Polaris ----------------
       the north star, at the top of Ursa Minor. it comes out at night like the constellations,
       and it's an easter egg too: EGGS.polaris below (a placeholder that twinkles for now). */
    var polaris = document.createElement('a');
    polaris.className = 'polaris';
    polaris.href = '#';
    polaris.setAttribute('role', 'button');
    polaris.setAttribute('aria-label', 'Polaris');
    polaris.innerHTML =
        // by night: Polaris (slot: assets/sky/polaris)
        '<span class="p-star" data-asset="assets/sky/polaris" aria-hidden="true"><svg class="placeholder" viewBox="-26 -26 52 52">' +
            '<g class="rays">' +
                '<line x1="0" y1="-18" x2="0" y2="18"/><line x1="-18" y1="0" x2="18" y2="0"/>' +
                '<line x1="-8" y1="-8" x2="8" y2="8" opacity=".6"/><line x1="-8" y1="8" x2="8" y2="-8" opacity=".6"/>' +
            '</g>' +
            '<circle class="core" r="4.6"/>' +
        '</svg></span>' +
        '<span class="polaris-name">Polaris</span>' +
        '<span class="polaris-hint">a secret…</span>';
    body.appendChild(polaris);
    polaris.addEventListener('click', function (e) {
        e.preventDefault();
        if (EGGS.polaris) { EGGS.polaris(polaris); return; }
        polaris.classList.remove('flare'); void polaris.offsetWidth; polaris.classList.add('flare');
        polaris.querySelector('.polaris-hint').textContent = 'not yet… something will happen here someday';
        if (window.Sky && Sky.sounds) Sky.sounds.sfx('twinkle');
        clearTimeout(polaris._tw);
        polaris._tw = setTimeout(function () { polaris.classList.remove('flare'); }, 2400);
    });

    /* ---------------- the constellations: links and easter eggs in the night sky ---------------- */
    var SHAPES = [
        '<polyline class="ln" points="10,30 40,55 70,30 100,58 135,22"/><g class="st"><circle cx="10" cy="30" r="2.4"/><circle cx="40" cy="55" r="2"/><circle cx="70" cy="30" r="2.8"/><circle cx="100" cy="58" r="2.2"/><circle cx="135" cy="22" r="2.6"/></g>',
        '<path class="ln" d="M75 8 L55 38 L95 38 Z M55 38 L62 70 L90 68 L95 38"/><g class="st"><circle cx="75" cy="8" r="3.2"/><circle cx="55" cy="38" r="2"/><circle cx="95" cy="38" r="2.2"/><circle cx="62" cy="70" r="2"/><circle cx="90" cy="68" r="2.4"/></g>',
        '<path class="ln" d="M45 8 L58 40 L78 45 L98 50 L110 12 M58 40 L50 76 M98 50 L106 78"/><g class="st"><circle cx="45" cy="8" r="3"/><circle cx="110" cy="12" r="2.6"/><circle cx="58" cy="40" r="2"/><circle cx="78" cy="45" r="2"/><circle cx="98" cy="50" r="2"/><circle cx="50" cy="76" r="2.4"/><circle cx="106" cy="78" r="2.8"/></g>',
        '<path class="ln" d="M12 62 L50 46 L90 32 L134 16 M90 32 L80 12 M90 32 L102 50"/><g class="st"><circle cx="12" cy="62" r="2"/><circle cx="50" cy="46" r="2.2"/><circle cx="90" cy="32" r="2.8"/><circle cx="134" cy="16" r="2.4"/><circle cx="80" cy="12" r="1.8"/><circle cx="102" cy="50" r="1.8"/></g>',
        '<path class="ln" d="M75 6 L108 38 L75 70 L42 38 Z M75 70 Q70 78 80 84"/><g class="st"><circle cx="75" cy="6" r="2.8"/><circle cx="108" cy="38" r="2.2"/><circle cx="75" cy="70" r="2.4"/><circle cx="42" cy="38" r="2"/><circle cx="80" cy="84" r="1.6"/></g>',
        '<path class="ln" d="M14 44 Q40 22 72 30 Q104 36 120 52 L138 38 M120 52 L136 64 M40 34 L36 22"/><g class="st"><circle cx="14" cy="44" r="2.6"/><circle cx="72" cy="30" r="2.2"/><circle cx="120" cy="52" r="2.8"/><circle cx="138" cy="38" r="1.8"/><circle cx="136" cy="64" r="1.8"/><circle cx="36" cy="22" r="1.6"/></g>',
        '<path class="ln" d="M22 40 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0 M34 40 L128 40 M110 40 L110 54 M124 40 L124 50"/><g class="st"><circle cx="10" cy="40" r="2"/><circle cx="34" cy="40" r="2.6"/><circle cx="80" cy="40" r="2.2"/><circle cx="128" cy="40" r="2.4"/><circle cx="110" cy="54" r="1.8"/><circle cx="124" cy="50" r="1.8"/></g>'
    ];
    var here = body.dataset.place || (isHome ? PLACES[0].id : '');
    var nav = document.createElement('nav');
    nav.className = 'sky-links';
    nav.setAttribute('aria-label', 'constellations');
    CONSTELLATIONS.slice(0, 7).forEach(function (c, i) {
        var a = document.createElement('a');
        a.className = 'sky-link l' + (i + 1) + (c.href || c.egg ? '' : ' unwritten');
        a.dataset.star = c.id;
        if (c.href) { a.href = c.href; a.target = '_blank'; a.rel = 'noopener'; }
        else { a.href = '#'; a.setAttribute('role', 'button'); }
        var shape = SHAPES[((c.shape || i + 1) - 1) % SHAPES.length];
        a.innerHTML = '<span class="sl-art" data-asset="assets/sky/constellation-' + c.id + '"><svg class="placeholder" viewBox="0 0 150 90" aria-hidden="true">' + shape + '</svg></span>' +
            '<span class="sl-name"></span>' + (c.href ? '' : '<span class="sl-note">' + (c.egg ? 'a secret…' : 'a link waits here') + '</span>');
        a.querySelector('.sl-name').textContent = c.name;
        if (c.href) a.title = c.href.replace(/^https?:\/\//, '').replace(/\/$/, '');
        a.addEventListener('click', function (e) {
            if (c.href) return;                                   // off it goes, in a new tab
            e.preventDefault();
            if (c.egg && EGGS[c.egg]) { EGGS[c.egg](a, c); return; }
            twinkle(a, c.egg ? 'not yet… something will happen here someday' : 'a link will go here someday');
        });
        nav.appendChild(a);
    });
    body.appendChild(nav);

    // a placeholder's answer: its stars flare, a soft chime, and a whisper under it
    function twinkle(a, msg) {
        a.classList.remove('flare'); void a.offsetWidth; a.classList.add('flare');
        var note = a.querySelector('.sl-note');
        if (note && msg) note.textContent = msg;
        if (window.Sky && Sky.sounds) Sky.sounds.sfx('twinkle');
        clearTimeout(a._tw);
        a._tw = setTimeout(function () { a.classList.remove('flare'); }, 2400);
    }

    /* ---------------- easter eggs ----------------
       a constellation with egg: 'name' runs EGGS[name](the constellation, its settings)
       when clicked. write your own here, or from any page's script:
           Sky.egg('lantern', function (star) { … });
       until one exists, clicking just twinkles. Polaris is one too: EGGS.polaris. */
    var EGGS = {
        // a shooting star streaks away from the constellation: make a wish
        'shooting-star': function (a) {
            twinkle(a, 'make a wish…');
            var r = a.getBoundingClientRect(), el = document.createElement('div');
            el.className = 'egg-star';
            el.innerHTML = FLYER_ART['shooting-star'] || '';
            el.style.left = (r.left + r.width / 2 - 150) + 'px';
            el.style.top = (r.top + r.height * 0.3) + 'px';
            body.appendChild(el);
            var dx = (r.left > window.innerWidth / 2 ? -1 : 1) * window.innerWidth * 0.45;
            el.animate([
                { transform: 'translate(0,0) scaleX(' + (dx < 0 ? -1 : 1) + ')', opacity: 0 },
                { opacity: 1, offset: 0.12 },
                { transform: 'translate(' + dx + 'px,' + (Math.abs(dx) * 0.3) + 'px) scaleX(' + (dx < 0 ? -1 : 1) + ')', opacity: 0 }
            ], { duration: 1500, easing: 'cubic-bezier(.3,.1,.7,1)' }).onfinish = function () { el.remove(); };
            if (window.Sky && Sky.sounds) Sky.sounds.sfx('wish');
        }
    };

    /* ---------------- the signpost: wooden arrow planks on the right ---------------- */
    var sign = document.createElement('nav');
    sign.className = 'signpost';
    sign.setAttribute('aria-label', 'places');
    sign.innerHTML = '<div class="post" aria-hidden="true"></div>';
    var TILTS = [-1.6, 1.2, -0.8, 1.8, -1.3, 0.9];
    PLACES.filter(function (pl) { return !pl.tabOnly; }).forEach(function (pl, i) {
        var el = document.createElement(pl.id === here ? 'span' : 'a');
        el.className = 'plank' + (pl.id === here ? ' here' : '');
        el.style.setProperty('--tilt', TILTS[i % TILTS.length] + 'deg');
        el.dataset.place = pl.id;
        if (pl.id === here) {
            el.setAttribute('aria-current', 'page');
            el.title = 'you are here';
        } else {
            el.href = pl.href;
        }
        el.innerHTML = '<span></span>';
        el.firstChild.textContent = pl.name;
        sign.appendChild(el);
    });
    // the signpost stands on the homepage's dock; everywhere else there are tabs (below)
    // (and Polaris, always, takes you home)
    if (isHome) body.appendChild(sign);
    // slots: assets/sky/plank (every sign) and assets/sky/plank-here (the one you're standing at)
    sign.dataset.slot = 'assets/sky/plank assets/sky/plank-here';
    findAsset('assets/sky/plank', function (url) {
        if (!url) return;
        sign.classList.add('has-plank-art', 'has-art');
        sign.style.setProperty('--plank-art', 'url("' + new URL(url, location.href).href + '")');
        findAsset('assets/sky/plank-here', function (u2) { if (u2) sign.style.setProperty('--plank-here-art', 'url("' + new URL(u2, location.href).href + '")'); });
    });

    /* ---------------- away from the homepage: index tabs on the right edge ----------------
       like the tabs on a notebook's edge, one per place, each with a little picture of
       it (slots: assets/ui/place-sea, place-workshop, place-city, place-living … a
       transparent PNG or SVG, square). hover (or tap) and the tab slides out with its name. */
    var PLACE_ICONS = {
        // a little ship on the waves
        sea: '<path d="M8 34 Q14 30 20 34 T32 34 T44 34" fill="none" stroke="#36526a" stroke-width="2.4" stroke-linecap="round"/>' +
            '<path d="M11 27 H37 L33 32 H15 Z" fill="#6e4a30"/><path d="M24 8 V27" stroke="#3a2716" stroke-width="2"/>' +
            '<path d="M25.5 10 Q34 17 33 25 H25.5 Z" fill="#f6ecd2" stroke="#3a2716" stroke-width="1.3"/><path d="M22.5 13 Q16 19 17 25 H22.5 Z" fill="#f6ecd2" stroke="#3a2716" stroke-width="1.3"/>' +
            '<path d="M24 8 L30 10 L24 12" fill="#9a3b1f"/>',
        // a paintbrush, red-chalk tip
        workshop: '<path d="M36 7 L41 12 L22 31 L17 26 Z" fill="#6e4a30" stroke="#3a2716" stroke-width="1.2" stroke-linejoin="round"/>' +
            '<path d="M17 26 L22 31 L19.5 33.5 L14.5 28.5 Z" fill="#c49a52" stroke="#3a2716" stroke-width="1.2" stroke-linejoin="round"/>' +
            '<path d="M14.5 28.5 L19.5 33.5 C17 38 12 41 7 41 C7 36 10 31 14.5 28.5 Z" fill="#9a3b1f" stroke="#3a2716" stroke-width="1.2" stroke-linejoin="round"/>' +
            '<path d="M37 9 L39.5 11.5" stroke="#f3e6c2" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>',
        // a telescope on its tripod
        city: '<path d="M8 22 L36 10 L39 17 L11 29 Z" fill="#c49a52" stroke="#3a2716" stroke-width="1.3" stroke-linejoin="round"/>' +
            '<path d="M36 10 L41 8 L44 15 L39 17 Z" fill="#6e4a30" stroke="#3a2716" stroke-width="1.3" stroke-linejoin="round"/>' +
            '<path d="M6 23 L9 29" stroke="#3a2716" stroke-width="2.4" stroke-linecap="round"/>' +
            '<path d="M24 21 L16 42 M24 21 L32 42 M24 21 L24 42" stroke="#3a2716" stroke-width="1.8" stroke-linecap="round"/>' +
            '<circle cx="24" cy="21" r="2.2" fill="#3a2716"/>',
        // a record player
        living: '<rect x="6" y="14" width="36" height="24" rx="3" fill="#6e4a30" stroke="#3a2716" stroke-width="1.3"/>' +
            '<circle cx="21" cy="26" r="9.5" fill="#2a1d14"/><circle cx="21" cy="26" r="6.5" fill="none" stroke="#5a4535" stroke-width=".7"/>' +
            '<circle cx="21" cy="26" r="2.6" fill="#9a3b1f"/><circle cx="36.5" cy="18.5" r="2" fill="#c49a52"/>' +
            '<path d="M36.5 18.5 L35 30 L29 33" fill="none" stroke="#c49a52" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
        // a pie on the sill, still warm
        kitchen: '<path d="M8 30 H40" stroke="#3a2716" stroke-width="1.6" stroke-linecap="round"/>' +
            '<path d="M9 29 Q9 21 24 20 Q39 21 39 29 Z" fill="#d8a45a" stroke="#3a2716" stroke-width="1.3"/>' +
            '<path d="M13 25 L35 25 M16 22.5 L32 27.5 M32 22.5 L16 27.5" stroke="#9a5a24" stroke-width="1.2" stroke-linecap="round"/>' +
            '<path d="M11 29 L14 34 H34 L37 29" fill="#c49a52" stroke="#3a2716" stroke-width="1.3" stroke-linejoin="round"/>' +
            '<path d="M19 17 Q17 13 19 10 M24 16 Q22 11 24 7 M29 17 Q27 13 29 10" fill="none" stroke="#9a8a7a" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>',
        // any new place: a door
        door: '<path d="M14 42 V20 a10 10 0 0 1 20 0 V42 Z" fill="#6e4a30" stroke="#3a2716" stroke-width="1.3"/>' +
            '<path d="M24 12 V42" stroke="#3a2716" stroke-width="1" opacity=".5"/><circle cx="29" cy="30" r="1.6" fill="#c49a52"/><path d="M10 42 H38" stroke="#3a2716" stroke-width="1.6" stroke-linecap="round"/>'
    };
    var tabs = document.createElement('nav');
    tabs.className = 'place-tabs';
    tabs.setAttribute('aria-label', 'places');
    PLACES.filter(function (pl) { return !pl.signOnly; }).forEach(function (pl) {
        var el = document.createElement(pl.id === here ? 'span' : 'a');
        el.className = 'place-tab' + (pl.id === here ? ' here' : '');
        el.dataset.place = pl.id;
        if (pl.id === here) el.setAttribute('aria-current', 'page'); else el.href = pl.href;
        el.innerHTML = '<span class="pt-pic" data-asset="assets/ui/place-' + pl.id + '"><svg class="placeholder" viewBox="0 0 48 48" aria-hidden="true">' +
            (PLACE_ICONS[pl.id] || PLACE_ICONS.door) + '</svg></span><span class="pt-name"></span>';
        el.querySelector('.pt-name').textContent = pl.name + (pl.id === here ? ' · you are here' : '');
        tabs.appendChild(el);
    });
    if (!isHome) body.appendChild(tabs);

    // on narrow screens the signpost tucks mostly off the edge; a tap pulls it out
    var compact = window.matchMedia('(max-width: 1100px)');
    sign.addEventListener('click', function (e) {
        if (compact.matches && !sign.classList.contains('open')) {
            e.preventDefault();
            sign.classList.add('open');
        }
    }, true);
    document.addEventListener('click', function (e) {
        if (!sign.contains(e.target)) sign.classList.remove('open');
    });

    /* ---------------- leaving the page (scenes can play a little send-off first) ---------------- */
    var leaveHooks = [], leaving = false;
    function leave(href) {
        if (leaving) return;
        leaving = true;
        // (the next page knows you walked in from here: the homepage walks the traveller onto the dock)
        var had = null;
        try { had = JSON.parse(sessionStorage.getItem('arrive') || 'null'); } catch (e) {}
        if (!had || had.page !== pageOf(href) || Date.now() - had.t > 30000) setArrival(href, 'edge');
        var waiting = 0, gone = false;
        function go() { if (gone) return; gone = true; location.href = href; }
        // each send-off gets its own "done"; the page changes once they're all done (or after 4.2 s at most)
        leaveHooks.forEach(function (fn) {
            var called = false;
            if (fn(function () { if (called) return; called = true; if (--waiting <= 0) go(); })) waiting++;
            else called = true;
        });
        if (waiting > 0) { body.classList.add('leaving'); setTimeout(go, 4200); } else go();
    }
    function onPlaceClick(e) {
        var a = e.target.closest('a[data-place]');
        if (!a || e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // new tab etc.
        e.preventDefault();
        if (a.dataset.place === here) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        leave(a.href);
    }
    sign.addEventListener('click', onPlaceClick);
    tabs.addEventListener('click', onPlaceClick);
    window.addEventListener('pageshow', function (e) {         // coming back with the browser's back button
        if (e.persisted) { leaving = false; sign.classList.remove('open'); body.classList.remove('leaving'); }
    });

    /* ---------------- the stretch of sky after the content ---------------- */
    // only the homepage (or a page with data-scroll-time) turns the day as you scroll;
    // every other page stays at its own hour (data-time) until the sky view changes it
    var still = !isHome && !body.hasAttribute('data-scroll-time');
    var baseTime = still ? (parseFloat(body.dataset.time) || 0) : 0;
    // the visitor's clock: angle 0 = noon, π/2 = 6pm (setting, right), π = midnight, 3π/2 = 6am (rising, left)
    var clockMode = still && CLOCK && !body.hasAttribute('data-time');
    function clockTheta() {
        var t = sunClock(new Date());
        if (t) return t;
        var d = new Date(), h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;   // (the sun's times unknown: noon and midnight on the clock)
        return ((h - 12) / 24 * 2 * Math.PI + 2 * Math.PI) % (2 * Math.PI);
    }

    /* ---------------- the real sun, where the visitor is ----------------
       sunrise and sunset worked out for today (no asking anyone: it's the same sums an almanac does),
       from where the visitor is: the place the weather found from their time zone ("America/Phoenix" →
       Phoenix), or their exact spot if they gave it; until then, a guess from their clock's offset.
       the sky's time then follows the real sun:
         the first hour after sunrise and the last hour before sunset: golden hour
         sunrise / sunset themselves: the sunset sky (mirrored in the morning)
         half an hour either side: dusk (dawn), and night an hour and 40 minutes out */
    var RAD = Math.PI / 180;
    function sunTimes(date, lat, lon) {
        var J1970 = 2440588, J2000 = 2451545, E = RAD * 23.4397, J0 = 0.0009;
        var toDays = function (d) { return d.valueOf() / 864e5 - 0.5 + J1970 - J2000; };
        var fromJ = function (j) { return new Date((j + 0.5 - J1970) * 864e5); };
        var lw = RAD * -lon, phi = RAD * lat, d = toDays(date);
        var n = Math.round(d - J0 - lw / (2 * Math.PI)), ds = J0 + lw / (2 * Math.PI) + n;
        var M = RAD * (357.5291 + 0.98560028 * ds);
        var L = M + RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + RAD * 102.9372 + Math.PI;
        var dec = Math.asin(Math.sin(E) * Math.sin(L));
        var noon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
        var w = Math.acos((Math.sin(RAD * -0.833) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
        var out = { noon: fromJ(noon) };
        if (isNaN(w)) return out;                                               // (the midnight sun, or the polar night)
        var set = J2000 + J0 + (w + lw) / (2 * Math.PI) + n + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
        out.set = fromJ(set); out.rise = fromJ(noon - (set - noon));
        return out;
    }
    var PLACE_KEY = 'weather-place';                                           // (sky/weather.js keeps it too)
    function visitorPlace() {
        try { var pl = JSON.parse(localStorage.getItem(PLACE_KEY) || 'null'); if (pl && isFinite(pl.lat) && isFinite(pl.lon)) return pl; } catch (e) {}
        return null;
    }
    var looking = false;
    function findPlace() {                                                     // once: the city their time zone names
        if (looking || visitorPlace()) return;
        looking = true;
        var zone = '';
        try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
        if (!zone || /^(UTC|GMT|Etc\/)/.test(zone)) return;
        fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=' + encodeURIComponent(zone.split('/').pop().replace(/_/g, ' ')))
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) {
                var r = j && j.results && j.results[0];
                if (!r || visitorPlace()) return;
                try { localStorage.setItem(PLACE_KEY, JSON.stringify({ lat: +(+r.latitude).toFixed(2), lon: +(+r.longitude).toFixed(2), name: r.name, zone: zone, exact: false, t: Date.now() })); } catch (e) {}
                if (clockMode) followClock();
            }, function () {});
    }
    var sunCache = { day: '', t: null };
    function sunClock(now) {
        var pl = visitorPlace();
        if (!pl) findPlace();
        var lat = pl ? pl.lat : 35, lon = pl ? pl.lon : -now.getTimezoneOffset() / 4;   // (a guess: 15° of longitude per hour of offset)
        var key = now.toDateString() + '|' + lat + '|' + lon;
        if (sunCache.day !== key) {
            var mid = new Date(now); mid.setHours(12, 0, 0, 0);
            sunCache = { day: key, t: sunTimes(mid, lat, lon) };
        }
        var st = sunCache.t;
        if (!st.rise || !st.set) return null;
        var H = 36e5, M = 6e4, t = now.valueOf(), N = st.noon.valueOf(), R = st.rise.valueOf(), S = st.set.valueOf();
        var evening = t >= N && t < N + 12 * H;
        var at = evening
            ? [[N, 0], [S - 80 * M, 0.29], [S - 60 * M, 0.33], [S - 10 * M, 0.42], [S, 0.5], [S + 30 * M, 0.6], [S + 100 * M, 0.9], [N + 12 * H, 1]]
            : [[N - 12 * H, 1], [R - 100 * M, 0.9], [R - 30 * M, 0.6], [R, 0.5], [R + 10 * M, 0.42], [R + 60 * M, 0.33], [R + 80 * M, 0.29], [N, 0]];
        if (!evening && t >= N + 12 * H) at = at.map(function (a) { return [a[0] + 24 * H, a[1]]; });   // (after solar midnight: tomorrow's morning)
        at = at.filter(function (a, i) { return i === 0 || a[0] > at[i - 1][0]; });   // (in a very long or short day, anything out of order is skipped)
        var p = at[at.length - 1][1];
        for (var i = 1; i < at.length; i++) if (t < at[i][0]) { var a = at[i - 1], b = at[i]; p = a[1] + (b[1] - a[1]) * Math.max(0, (t - a[0]) / (b[0] - a[0])); break; }
        return evening ? p * Math.PI : 2 * Math.PI - p * Math.PI;
    }
    if (still) body.classList.add('still-time');
    var voyage = document.createElement('div');
    voyage.className = 'voyage';
    voyage.setAttribute('aria-hidden', 'true');
    if (body.dataset.voyage) voyage.style.height = (+body.dataset.voyage) + 'vh';
    if (!still) body.appendChild(voyage);

    /* ---------------- the scroll engine (with a time override for the sky view) ---------------- */
    var stars = backdrop.querySelector('.stars');
    var ursa  = backdrop.querySelector('.ursa');
    var sun   = backdrop.querySelector('.sun');
    var moon  = backdrop.querySelector('.moon');
    var clouds = Array.prototype.slice.call(backdrop.querySelectorAll('.cloud'));
    var links  = Array.prototype.slice.call(nav.querySelectorAll('.sky-link'));
    var hooks = [];
    var override = null;          // when set, time follows this instead of the scroll position

    function progress() {
        if (override !== null) return override;
        if (still) return baseTime;
        var max = root.scrollHeight - window.innerHeight;
        return max > 0 ? clamp(window.scrollY / max) : 1;
    }

    function render(p) {
        if (!ursa.isConnected) ursa = backdrop.querySelector('.ursa');      // (your own Ursa Minor took its place)
        var sky = skyAt(p);
        root.style.setProperty('--sky-top', sky[0]);
        root.style.setProperty('--sky-bottom', sky[1]);
        root.style.setProperty('--dusk', smooth(ramp(p, 0.3, 0.8)).toFixed(3));
        root.style.setProperty('--night', smooth(ramp(p, 0.8, 0.97)).toFixed(3));
        root.style.background = sky[0];

        paintSkybox(p);
        stars.style.opacity = smooth(ramp(p, 0.66, 0.9));
        ursa.style.opacity  = smooth(ramp(p, 0.82, 0.97));

        // two ways the sun and moon can move, blended by celest.w:
        //  0 = the scroll's story: the sun sinks on the right, the moon rises on the left
        //  1 = the loop's sky: both travel full circles, rising left, setting right
        var phone = window.innerWidth < 620;
        var s = ramp(p, 0, 0.52);
        var sunA = [80 + 10 * s, 12 + 80 * s * s], sunHeat = ramp(p, 0.28, 0.5);
        var m = ramp(p, 0.5, 0.95), moonEnd = phone ? 30 : 14;
        var moonA = [7 + 9 * m, 92 - (92 - moonEnd) * (1 - (1 - m) * (1 - m))];
        var w = celest.w;
        if (w > 0) {
            var th = celest.theta !== null ? celest.theta : p * Math.PI;
            var sunB = orbit(th, 20), moonB = orbit(th + Math.PI + 0.55, phone ? 32 : 26);
            sunA = [sunA[0] + (sunB[0] - sunA[0]) * w, sunA[1] + (sunB[1] - sunA[1]) * w];
            moonA = [moonA[0] + (moonB[0] - moonA[0]) * w, moonA[1] + (moonB[1] - moonA[1]) * w];
            sunHeat += (ramp(sunB[1], 48, 88) - sunHeat) * w;
        }
        sun.style.left  = sunA[0] + 'vw';
        sun.style.top   = sunA[1] + 'vh';
        sun.style.color = mix('#f7d35e', '#e8683c', sunHeat);
        moon.style.left = moonA[0] + 'vw';
        moon.style.top  = moonA[1] + 'vh';
        skybox.classList.toggle('mirror', sunA[0] < 50);             // (the sun's coming up on the left: the evening skies flipped)

        // clouds fade out through sunset. on the homepage's scroll they drift apart;
        // anywhere the day turns by itself they sail steadily left to right, round and round
        var cf = ramp(p, 0.3, 0.6);
        clouds.forEach(function (c) {
            c.dataset.base = 1 - cf;
            c.style.opacity = (1 - cf) * cloudiness;
            if (!sailing()) c.style.transform = 'translateX(' + (+c.dataset.dir * p * 160) + 'px)';
        });

        // links fade in with Ursa Minor and only become clickable once visible
        var lo = smooth(ramp(p, 0.86, 0.98));
        links.forEach(function (a) {
            a.style.opacity = lo;
            a.style.visibility = lo > 0.01 ? 'visible' : 'hidden';
        });
        nav.classList.toggle('live', lo > 0.6);
        polaris.classList.toggle('live', lo > 0.6);

        if (player) player.time.textContent = timeName(p, celest.theta);
        for (var i = 0; i < hooks.length; i++) hooks[i](p);
    }

    // the scene eases toward its target instead of snapping to it,
    // so a fast flick of the wheel reads as a smooth swell, not a jitter
    var player = null;
    var target = progress(), shown = target, running = false;
    function step() {
        shown += (target - shown) * 0.1;
        if (Math.abs(target - shown) < 0.0004) shown = target;
        render(shown);
        if (shown !== target) requestAnimationFrame(step);
        else running = false;
    }
    function kick() {
        target = progress();
        if (!running) { running = true; requestAnimationFrame(step); }
    }
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);

    // a body on a circle across the sky: angle 0 = high overhead, π/2 = setting on the right,
    // π = straight below, 3π/2 = rising on the left. returns [vw, vh]
    function orbit(a, zenith) {
        // through the telescope the view is narrower, so the path is too
        var scope = body.classList.contains('scope-view'), amp = scope ? 17 : 46, low = scope ? 84 : 100;
        return [50 + amp * Math.sin(a), low - (low - zenith) * Math.cos(a)];
    }
    var celest = { w: 0, theta: null };
    function followClock() {
        if (!clockMode || view) return;
        celest.theta = clockTheta();
        celest.w = 1;
        baseTime = dayPart(celest.theta);
        kick();
    }
    if (clockMode) { followClock(); target = shown = progress(); setInterval(followClock, 20000); }

    function timeName(p, theta) {
        var rising = theta !== null && theta !== undefined && ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) > Math.PI;
        if (rising) {
            return p < .18 ? 'midday' : p < .29 ? 'morning' : p < .45 ? 'golden hour' : p < .56 ? 'sunrise' : p < .64 ? 'dawn'
                 : p < .8 ? 'first light' : p < .95 ? 'small hours' : 'midnight';
        }
        return p < .18 ? 'midday' : p < .29 ? 'afternoon' : p < .45 ? 'golden hour' : p < .56 ? 'sunset'
             : p < .64 ? 'dusk' : p < .82 ? 'twilight' : p < .95 ? 'night' : 'midnight';
    }

    /* the placeholder flyers (your own art replaces each: assets/sky/blimp.png …) */
    var FLYER_ART = {
        // a steampunk airship: riveted envelope, brass bands, a gondola and a spinning propeller
        blimp: '<svg class="placeholder" viewBox="0 0 240 120">' +
            '<path d="M22 44 L4 22 L30 30 Z M22 52 L4 74 L30 64 Z" fill="#8a5a36"/>' +
            '<ellipse cx="116" cy="47" rx="96" ry="33" fill="#cdb68c"/>' +
            '<path d="M36 47 H206" stroke="#a88a58" stroke-width="2"/>' +
            '<g fill="none" stroke="#8f7446" stroke-width="1.6"><path d="M60 19 Q52 47 60 75"/><path d="M90 15 Q84 47 90 79"/><path d="M122 14 Q118 47 122 80"/><path d="M154 16 Q150 47 154 78"/><path d="M184 24 Q180 47 184 70"/></g>' +
            '<path d="M204 34 Q222 47 204 60" fill="#c49a52"/><circle cx="213" cy="47" r="3" fill="#8a6a30"/>' +
            '<rect x="52" y="30" width="6" height="34" rx="2" fill="#c49a52"/><rect x="170" y="27" width="6" height="40" rx="2" fill="#c49a52"/>' +
            '<g stroke="#5a3f2a" stroke-width="1.3"><path d="M88 78 L94 94 M144 78 L138 94 M116 80 V94"/></g>' +
            '<rect x="84" y="93" width="64" height="18" rx="4" fill="#6e4a30"/><rect x="84" y="93" width="64" height="4" fill="#c49a52"/>' +
            '<g class="glow-bits" fill="#ffe0a0"><rect x="92" y="100" width="8" height="6" rx="1"/><rect x="106" y="100" width="8" height="6" rx="1"/><rect x="120" y="100" width="8" height="6" rx="1"/><rect x="134" y="100" width="8" height="6" rx="1"/></g>' +
            '<path d="M84 102 H70" stroke="#5a3f2a" stroke-width="2.4"/>' +
            '<g class="prop" style="transform-origin: 68px 102px"><ellipse cx="68" cy="102" rx="3" ry="13" fill="#3a2716"/></g>' +
            '<path d="M148 99 L156 96 L156 106 L148 104 Z" fill="#9a3b1f"/>' +
            '</svg>',
        // a little flock, flapping
        birds: '<svg class="placeholder" viewBox="0 0 120 60">' +
            ['18,30,1', '52,16,.8', '70,40,.9', '98,26,.7'].map(function (b, i) {
                var v = b.split(','), x = +v[0], y = +v[1], k = +v[2];
                return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><g class="wing" style="animation-delay:' + (-i * .17) + 's">' +
                       '<path d="M-14 -2 Q-7 -9 0 0 Q7 -9 14 -2 Q7 -5 0 3 Q-7 -5 -14 -2 Z" fill="#3a2716"/></g></g>';
            }).join('') + '</svg>',
        // a patched hot-air balloon
        balloon: '<svg class="placeholder" viewBox="0 0 80 120">' +
            '<path d="M40 4 C12 4 4 30 10 50 C15 66 30 74 33 84 H47 C50 74 65 66 70 50 C76 30 68 4 40 4 Z" fill="#eadcb9"/>' +
            '<path d="M40 4 C28 6 24 30 28 52 C30 66 34 76 36 84 H44 C46 76 50 66 52 52 C56 30 52 6 40 4 Z" fill="#9a3b1f"/>' +
            '<path d="M11 40 H69" stroke="#c49a52" stroke-width="3"/>' +
            '<g stroke="#5a3f2a" stroke-width="1.2"><path d="M34 84 L35 100 M46 84 L45 100"/></g>' +
            '<rect x="31" y="99" width="18" height="13" rx="2" fill="#6e4a30"/><rect x="31" y="99" width="18" height="3" fill="#8a5a36"/>' +
            '</svg>',
        // a streak of light, falling down to the right
        'shooting-star': '<svg class="placeholder" viewBox="0 0 150 40">' +
            '<defs><linearGradient id="ss-tail" x1="0" x2="1"><stop offset="0" stop-color="rgba(255,248,220,0)"/><stop offset="1" stop-color="rgba(255,248,220,.95)"/></linearGradient></defs>' +
            '<g transform="rotate(16 140 20)"><path d="M0 20 L140 17 L140 23 Z" fill="url(#ss-tail)"/><circle cx="140" cy="20" r="4" fill="#fffbe8"/></g>' +
            '</svg>'
    };

    // how many of the fair-weather clouds are out (the weather sets this: none on a clear day)
    var cloudiness = 1;
    function setCloudiness(v) {
        if (Math.abs(v - cloudiness) < 0.002) return;
        cloudiness = v;
        clouds.forEach(function (c) { c.style.opacity = (c.dataset.base === undefined ? 1 : +c.dataset.base) * v; });
    }

    /* ---------------- clouds that sail round, and things that fly past ---------------- */
    var drift = 0, ambientOn = false, ambientLast = 0;
    function sailing() { return still || !!view; }
    function sailClouds() {
        var W = window.innerWidth;
        clouds.forEach(function (c) {
            if (!c.offsetWidth) return;
            var cw = c.offsetWidth, home = c.offsetLeft;
            var k = 0.55 + cw / 680;                               // bigger clouds are nearer, so faster
            var span = W + cw * 2;
            var x = ((home + cw + drift * k) % span + span) % span - cw;
            c.style.transform = 'translateX(' + (x - home).toFixed(1) + 'px)';
        });
    }
    var flyLayer = document.createElement('div');
    flyLayer.className = 'flyers';
    flyLayer.setAttribute('aria-hidden', 'true');
    backdrop.appendChild(flyLayer);
    var flyers = FLYERS.map(function (f) {
        var el = document.createElement('div');
        el.className = 'flyer flyer-' + f.name;
        el.dataset.asset = 'assets/sky/' + f.name;
        el.style.width = f.size + 'px';
        el.innerHTML = FLYER_ART[f.name] || '';                 // a new flyer waits for its picture
        flyLayer.appendChild(el);
        return { cfg: f, el: el, x: 0, y: 0, on: false, next: 0 };
    });
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function ambient(now) {
        if (!sailing()) { ambientOn = false; flyers.forEach(function (f) { f.on = false; f.el.classList.remove('flying'); }); return; }
        var dt = Math.min(0.1, (now - ambientLast) / 1000);
        ambientLast = now;
        // clouds sail faster while the day is being played
        drift += dt * (clock.playing ? 60 * 60 / SPEEDS[clock.speed].half : 7);
        sailClouds();
        var p = override !== null ? override : baseTime, W = window.innerWidth, H = window.innerHeight, t = now / 1000;
        flyers.forEach(function (f) {
            var c = f.cfg, day = p < 0.42, night = p > 0.8;
            if (!f.on) {
                if (!view || reduceMotion.matches || !(c.when === 'night' ? night : day)) return;
                if (!FLYER_ART[c.name] && !f.el.classList.contains('has-art')) return;
                if (!f.next) f.next = t + 2 + Math.random() * Math.min(12, c.every * 0.4);   // soon after you look up
                if (t < f.next) return;
                f.on = true;
                f.x = c.name === 'shooting-star' ? W * (0.05 + Math.random() * 0.55) : -c.size - 20;
                f.x0 = f.x;
                f.y = H * (c.high[0] + Math.random() * (c.high[1] - c.high[0])) / 100;
                f.born = t;
                f.el.classList.add('flying');
            }
            f.x += c.speed * dt;
            var bob = c.name === 'shooting-star' ? (f.x - f.x0) * 0.28 : Math.sin(t * 0.9 + f.born) * 6;
            f.el.style.transform = 'translate(' + f.x.toFixed(1) + 'px,' + (f.y + bob).toFixed(1) + 'px)';
            if (c.name === 'shooting-star') f.el.style.opacity = Math.max(0, 1 - (t - f.born) / 1.6);
            if (f.x > W + 40 || (c.name === 'shooting-star' && t - f.born > 1.6)) {
                f.on = false;
                f.el.classList.remove('flying');
                f.el.style.opacity = '';
                f.next = t + c.every * (0.6 + Math.random() * 0.8);
            }
        });
        requestAnimationFrame(ambient);
    }
    function startAmbient() {
        if (ambientOn || !sailing()) return;
        ambientOn = true;
        ambientLast = performance.now();
        requestAnimationFrame(ambient);
    }

    /* ---------------- the sky view: look at the sky, let the day turn ---------------- */
    // opened by a room's window, a telescope, or anything with class="sky-viewer".
    // it lets night fall, then offers a player that loops day ⇄ night, gently.
    var SPEEDS = [
        { name: 'slow',   half: 120 },     // seconds from midday to midnight (a full day is twice that)
        { name: 'gentle', half: 60 },
        { name: 'brisk',  half: 25 }
    ];
    var view = null;                       // { onClose, mode }
    var clock = { playing: false, speed: 1, phase: 0, last: 0, fade: null };

    var exitBtn = document.createElement('button');
    exitBtn.className = 'back-inside';
    exitBtn.type = 'button';
    exitBtn.innerHTML =
        '<span class="bi-ic" data-asset="assets/ui/back-inside"><svg class="placeholder" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 21V4.5L14 2v19H5zm10 0V4h4v17h-4zM11 12.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg></span>' +
        '<span>back inside</span>';
    body.appendChild(exitBtn);

    var playerEl = document.createElement('div');
    playerEl.className = 'sky-player';
    playerEl.setAttribute('role', 'group');
    playerEl.setAttribute('aria-label', 'day and night');
    playerEl.innerHTML =
        '<button type="button" class="sp-play" aria-label="play">' +
            '<svg class="i-play"  viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4 L16 10 L6 16 Z"/></svg>' +
            '<svg class="i-pause" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z"/></svg>' +
        '</button>' +
        '<span class="sp-speeds">' + SPEEDS.map(function (s, i) {
            return '<button type="button" data-speed="' + i + '">' + s.name + '</button>';
        }).join('') + '</span>' +
        '<span class="sp-time"></span>';
    body.appendChild(playerEl);

    var lens = document.createElement('div');                // the telescope's circle (shown in scope view)
    lens.className = 'scope-lens';
    lens.setAttribute('aria-hidden', 'true');
    body.appendChild(lens);

    player ={ el: playerEl, time: playerEl.querySelector('.sp-time'), play: playerEl.querySelector('.sp-play') };

    function setSpeed(i) {
        clock.speed = i;
        playerEl.querySelectorAll('[data-speed]').forEach(function (b) {
            b.setAttribute('aria-pressed', String(+b.dataset.speed === i));
        });
    }
    setSpeed(1);

    function setPlaying(on) {
        clock.playing = on;
        playerEl.classList.toggle('playing', on);
        player.play.setAttribute('aria-label', on ? 'pause' : 'play');
        body.classList.toggle('sky-playing', on);
        if (on) {
            clock.fade = null;
            celest.w = 1;
            if (celest.theta === null) celest.theta = (override === null ? shown : override) * Math.PI;   // pick up where the sky is now
            ensureLoop();
        }
    }
    // the sky's brightness for an angle: midday 0 → midnight 1 → back to 0 by the next midday
    function dayPart(theta) {
        var t = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        return t <= Math.PI ? t / Math.PI : 2 - t / Math.PI;
    }
    function ensureLoop() {
        if (clock.looping) return;
        clock.looping = true;
        clock.last = performance.now();
        requestAnimationFrame(tick);
    }
    player.play.addEventListener('click', function () { setPlaying(!clock.playing); });
    playerEl.querySelector('.sp-speeds').addEventListener('click', function (e) {
        var b = e.target.closest('[data-speed]');
        if (b) setSpeed(+b.dataset.speed);
    });

    // the loop: the sun and moon keep turning the same way, a full circle each day,
    // so the sky goes midday → sunset → midnight → sunrise → midday, for ever
    function tick(now) {
        var blending = celest.blend;
        if ((!view && !blending) || (!clock.fade && !clock.playing && !blending)) { clock.looping = false; return; }
        var dt = Math.min(0.1, (now - clock.last) / 1000);
        clock.last = now;
        if (blending) {                                       // easing between the scroll's paths and the circles
            var bt = Math.min(1, (now - blending.t0) / blending.ms);
            celest.w = blending.from + (blending.to - blending.from) * (bt < .5 ? 2 * bt * bt : 1 - Math.pow(-2 * bt + 2, 2) / 2);
            if (bt >= 1) celest.blend = null;
            kick();
        }
        if (view && clock.fade) {                             // the opening nightfall
            var f = clock.fade, t = Math.min(1, (now - f.t0) / f.ms);
            var e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            if (f.th0 !== undefined) {                        // on the clock: the sun and moon turn on to midnight
                celest.theta = f.th0 + (f.th1 - f.th0) * e;
                override = dayPart(celest.theta);
            } else override = f.from + (f.to - f.from) * e;
            kick();
            if (t >= 1) { clock.fade = null; celest.theta = Math.PI; }
        } else if (view && clock.playing) {
            celest.theta += dt * Math.PI / SPEEDS[clock.speed].half;
            override = dayPart(celest.theta);
            kick();
        }
        requestAnimationFrame(tick);
    }
    function blendCelest(to, ms) {
        celest.blend = { from: celest.w, to: to, t0: performance.now(), ms: ms };
        ensureLoop();
    }

    function openSkyView(opts) {
        if (view) return;
        view = opts || {};
        holdId++;
        body.classList.add('sky-view');
        if (view.mode) body.classList.add(view.mode + '-view');
        exitBtn.querySelector('span:not(.bi-ic)').textContent = view.exitLabel || 'back inside';
        setPlaying(false);
        var from = override === null ? shown : override;
        override = from;
        var th0 = clockMode ? celest.theta : undefined;
        celest.theta = clockMode ? th0 : null;
        var ms = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 2400;
        clock.fade = { from: from, to: 1, t0: performance.now(), ms: ms, th0: th0, th1: th0 !== undefined ? (th0 <= Math.PI ? Math.PI : 3 * Math.PI) : undefined };
        blendCelest(1, ms);
        ensureLoop();
        flyers.forEach(function (f) { f.next = 0; });
        startAmbient();
    }
    function closeSkyView() {
        if (!view) return;
        var v = view;
        view = null;
        clock.playing = false;
        clock.fade = null;
        playerEl.classList.remove('playing');
        body.classList.remove('sky-view', 'sky-playing');
        celest.theta = null;
        blendCelest(0, 1400);
        if (clockMode) { celest.blend = null; celest.w = 1; followClock(); }
        else if (still && celest.frozen !== undefined) { celest.theta = celest.frozen; celest.blend = null; celest.w = 1; }
        if (v.mode) body.classList.remove(v.mode + '-view');
        override = null;                                      // back to the time the scroll (or the page) says
        kick();
        if (v.onClose) v.onClose();
    }
    exitBtn.addEventListener('click', closeSkyView);
    escape(function () { return !!view; }, closeSkyView);
    document.addEventListener('keydown', function (e) {
        if (view && e.key === ' ' && e.target === body) { e.preventDefault(); setPlaying(!clock.playing); }
    });

    // anything marked class="sky-viewer" (a telescope, a hatch …) opens the sky view
    document.addEventListener('click', function (e) {
        var v = e.target.closest('.sky-viewer');
        if (!v) return;
        e.preventDefault();
        openSkyView({ mode: v.dataset.viewMode || 'open', exitLabel: v.dataset.exitLabel || 'back' });
    });

    /* ---------------- rooms: a window you can step out of ---------------- */
    var room = document.querySelector('.room');
    if (room) {
        var win = room.querySelector('.window');
        body.classList.add('has-room');
        // slots: assets/<place>/wall (the wallpaper; the window is cut out of it for you)
        //        assets/<place>/window (the frame, drawn around transparent glass)
        var place = body.dataset.place;
        if (place) {
            room.dataset.slot = 'assets/' + place + '/wall';
            findAsset(room.dataset.slot, function (url) {
                if (!url) return;
                room.classList.add('has-wall', 'has-art');
                room.style.setProperty('--wall-art', 'url("' + new URL(url, location.href).href + '")');
            });
            if (win && !win.dataset.asset) win.dataset.asset = 'assets/' + place + '/window';
        }
        // the floor: runs to the very bottom of the screen, however tall the window is
        // (a taller window just shows more floor). your own: assets/<place>/floor, stretched
        // across the bottom. its height: --floor-h on the .room (default 9vh). no floor: <div class="room" data-floor="none">
        if (room.dataset.floor !== 'none' && !room.querySelector('.room-floor')) {
            var floor = document.createElement('div');
            floor.className = 'room-floor';
            floor.setAttribute('aria-hidden', 'true');
            floor.innerHTML = '<div class="placeholder"></div>';
            if (place) floor.dataset.asset = 'assets/' + place + '/floor';
            room.insertBefore(floor, room.firstChild);
        }
        var fitWindow = function () {
            if (!win) return;
            if (room.classList.contains('outside')) return;
            var r = win.getBoundingClientRect(), rr = room.getBoundingClientRect();
            // (set on the whole page so the night-sky links can be clipped to the glass too)
            root.style.setProperty('--wx', (r.left - rr.left) + 'px');
            root.style.setProperty('--wy', (r.top - rr.top) + 'px');
            root.style.setProperty('--ww', r.width + 'px');
            root.style.setProperty('--wh', r.height + 'px');
            // how far to raise the ground so its bottom lines up with the bottom of the glass
            root.style.setProperty('--win-lift', (window.innerHeight - (r.bottom - 12)) + 'px');
        };
        fitWindow();
        window.addEventListener('resize', fitWindow);
        // (a taskbar that hides itself, fullscreen, a zoom change … the room follows the real screen)
        if (window.ResizeObserver) new ResizeObserver(function () { fitWindow(); }).observe(room);
        if (window.visualViewport) window.visualViewport.addEventListener('resize', fitWindow);

        // stepping outside lets night fall (so Polaris and the constellations come out)
        // and brings up the day/night player; going back inside returns to the scroll's time
        if (win) {
            win.addEventListener('click', function (e) {
                e.preventDefault();
                fitWindow();
                var r = win.getBoundingClientRect();
                room.style.transformOrigin = (r.left + r.width / 2) + 'px ' + (r.top + r.height / 2) + 'px';
                room.classList.add('outside');
                body.classList.add('is-outside');
                openSkyView({
                    mode: 'window',
                    exitLabel: 'back inside',
                    onClose: function () {
                        room.classList.remove('outside');
                        body.classList.remove('is-outside');
                    }
                });
            });
        }
    }

    /* ---------------- asset slots: drop a file in, it replaces the placeholder ---------------- */
    // any element with data-asset="assets/workshop/bench" looks for
    // bench.svg, bench.gif, bench.webp or bench.png (first one found wins).
    // if found it replaces the drawn placeholder; if not, the placeholder stays.
    // a matching bench-glow.(svg|png|webp|gif) is laid on top and fades in at dusk.
    // several names can be given, best first: "assets/sky/cloud-2|assets/sky/cloud"
    function findAsset(base, cb) {
        if (!assetMemo[base]) assetMemo[base] = (window.davSave ? window.davSave.overrides() : Promise.resolve({})).then(function (have) {
            var list = [];
            base.split('|').forEach(function (b) {
                b = b.trim();
                // this reset's own version of it, if it has one (sky/state.js: assets/resets/reset-<n>/…)
                var swap = window.davSave && window.davSave.swapFor(b, have);
                if (swap) list.push(swap);
                if (/\.(svg|gif|webp|png|jpe?g|json|mp3|ogg|webm|mp4|woff2?|ttf|otf)$/i.test(b)) list.push(b);
                else EXTS.forEach(function (x) { list.push(b + '.' + x); });
            });
            var dirs = {};
            list.forEach(function (u) { dirs[u.replace(/[^\/]*$/, '')] = 1; });
            return Promise.all(Object.keys(dirs).map(function (d) { return assetDir(d).then(function (n) { dirs[d] = n; }); })).then(function () {
                return list.filter(function (u) {
                    var d = u.replace(/[^\/]*$/, ''), n = dirs[d];
                    return !n || n[u.slice(d.length)];
                });
            });
        }).then(function (list) {
            return new Promise(function (done) {
                var i = 0;
                (function next() {
                    if (i >= list.length) return done(null);
                    var url = list[i++];
                    if (/\.(mp3|ogg|webm|mp4|woff2?|ttf|otf)$/i.test(url)) {        // a sound, a video or a font: just check it's there
                        fetch(url, { method: 'HEAD', cache: 'no-cache' }).then(function (r) { r.ok ? done({ url: url }) : next(); }, next);
                        return;
                    }
                    if (/\.json$/i.test(url)) {
                        fetch(url, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : Promise.reject(); })
                            .then(function (j) { done({ url: url, data: j }); }, next);
                        return;
                    }
                    var im = new Image();
                    im.onload = function () { done({ url: url, img: im }); };
                    im.onerror = next;
                    im.src = url;
                })();
            });
        });
        assetMemo[base].then(function (hit) { hit ? cb(hit.url, hit.img || hit.data) : cb(null); });
    }
    function glowOf(url) { return url.replace(/\.\w+$/, '') + '-glow'; }
    // put art into a drawn SVG group, keeping the group (and anything animating it):
    // the picture is laid on the same canvas as the drawing (x, y, w, h in its viewBox)
    function svgArt(g, base, box, done) {
        if (!g.closest('[data-slot="' + base + '"]')) g.setAttribute('data-slot', base);   // (where it sits: the asset manager's map)
        findAsset(base, function (url) {
            if (!url) { if (done) done(null); return; }
            var NS = 'http://www.w3.org/2000/svg';
            function image(u, cls) {
                var im = document.createElementNS(NS, 'image');
                im.setAttribute('href', u);
                im.setAttribute('x', box[0]); im.setAttribute('y', box[1]);
                im.setAttribute('width', box[2]); im.setAttribute('height', box[3]);
                im.setAttribute('preserveAspectRatio', box[4] || 'xMidYMid meet');
                if (cls) im.setAttribute('class', cls);
                return im;
            }
            while (g.firstChild) g.removeChild(g.firstChild);
            var main = image(url, 'art');
            g.appendChild(main);
            g.classList.add('has-art');
            findAsset(glowOf(url), function (gu) {
                if (!gu) return;
                var glow = main.cloneNode();                      // same place and size as the main picture
                glow.setAttribute('href', gu);
                glow.setAttribute('class', 'art glow-layer');
                g.appendChild(glow);
            });
            if (done) done(url);
        });
    }
    // a whole layer of scenery (a row of hills, a row of buildings) as one picture:
    // it fills the layer's width, sits on its bottom edge, and keeps the layer's drift and night dimming
    function layerArt(svg, name, onFound) {
        svg.dataset.slot = name;
        findAsset(name, function (url, img) {
            if (!url) return;
            var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'layer-art');
            svg.appendChild(g);
            svg.classList.add('has-art');
            svgArt(g, name, [0, 0, 1, 1, 'xMidYMax slice'], function () {
                fitLayerArt(svg);
                if (onFound) onFound(url, img);
            });
        });
    }
    function fitLayerArt(svg) {
        var vb = svg.viewBox && svg.viewBox.baseVal;
        if (!vb || !vb.width) return;
        svg.querySelectorAll('.layer-art image').forEach(function (im) {
            im.setAttribute('x', vb.x); im.setAttribute('y', vb.y);
            im.setAttribute('width', vb.width); im.setAttribute('height', vb.height);
        });
    }
    function fillSlot(el) {
        var base = el.dataset.asset;
        if (!base || el.dataset.assetDone) return;
        el.dataset.assetDone = '1';
        if (el.classList.contains('character') || el.classList.contains('groove')) addPoses(el, base.split('|')[0]);
        findAsset(base, function (url) {
            if (!url) return;                                         // keep the placeholder
            var img = document.createElement('img');
            img.src = url;
            img.alt = el.getAttribute('aria-label') || '';
            img.decoding = 'async';
            if (el.classList.contains('character')) {                 // characters keep their speech bubble
                var ph = el.querySelector('.placeholder');
                if (ph) ph.replaceWith(img); else el.insertBefore(img, el.firstChild);
                img.className = 'art';
            } else if (el.tagName.toLowerCase() === 'svg') {           // a drawn prop: swap it for the image
                img.className = el.getAttribute('class');
                img.setAttribute('style', el.getAttribute('style') || '');
                img.dataset.asset = base;
                el.replaceWith(img);
                el = img;
            } else {                                                   // a box (button, div): fill it
                var ph2 = el.querySelector('.placeholder');
                if (ph2) ph2.replaceWith(img); else el.appendChild(img);
                img.className = 'art';
            }
            el.classList.add('has-art');
            el.dispatchEvent(new CustomEvent('asset', { detail: { url: url, img: img } }));
            if (/-glow$/.test(base)) return;
            findAsset(glowOf(url), function (gurl) {
                if (!gurl) return;
                var g = document.createElement('img');
                g.src = gurl;
                g.alt = '';
                g.setAttribute('aria-hidden', 'true');
                if (img.className === 'art') { g.className = 'art glow-layer'; img.parentNode.appendChild(g); }
                else { g.className = img.className + ' glow-layer'; g.setAttribute('style', img.getAttribute('style') || ''); img.after(g); }
            });
        });
    }
    // extra poses for a character, each its own optional file next to the main one:
    //   <name>-held       shown while they're picked up (e.g. a struggling GIF)
    //   <name>-startled   the double-take when the ship leaves without them
    //   <name>-dancing    shown while music plays (a GIF of them dancing)
    //   <name>-walking    shown while they walk somewhere (a GIF of them walking, facing right)
    // a pose appears whenever the character has the matching class (.held, .startled, .walking),
    // and the dancing one whenever the page has music playing
    var POSES = ['held', 'startled', 'dancing', 'walking'];
    function addPoses(el, base) {
        POSES.forEach(function (pose) {
            findAsset(base + '-' + pose, function (url) {
                if (!url) return;
                var img = document.createElement('img');
                img.src = url;
                img.alt = '';
                img.className = 'pose pose-' + pose;
                img.setAttribute('aria-hidden', 'true');
                el.insertBefore(img, el.querySelector('.bubble'));
                if (pose === 'dancing' && el.classList.contains('groove')) img.style.display = '';
                el.classList.add('has-' + pose);
            });
        });
    }

    function fillAssets(scope) {
        (scope || document).querySelectorAll('[data-asset]').forEach(fillSlot);
    }

    /* ---------------- the bottle: three pieces of art on one 2000 x 900 canvas ---------------- */
    //   assets/sea/bottle         the glass, empty
    //   assets/sea/bottle-scroll  the rolled message inside it (slides out when it's opened)
    //   assets/sea/bottle-cork    the cork (pulled out and tossed away)
    function dressBottle(svg) {
        if (svg.dataset.dressed) return;
        svg.dataset.dressed = '1';
        var box = [0, 0, 200, 90];
        [['.b-glass', 'assets/sea/bottle'], ['.b-scroll', 'assets/sea/bottle-scroll'], ['.b-cork', 'assets/sea/bottle-cork']].forEach(function (part) {
            var g = svg.querySelector(part[0]);
            if (g) svgArt(g, part[1], box);
        });
    }
    function dressBottles(scope) { (scope || document).querySelectorAll('svg[data-bottle]').forEach(dressBottle); }
    new MutationObserver(function (list) {
        list.forEach(function (m) {
            m.addedNodes.forEach(function (n) {
                if (n.nodeType !== 1) return;
                if (n.matches('svg[data-bottle]')) dressBottle(n); else dressBottles(n);
            });
        });
    }).observe(document.documentElement, { childList: true, subtree: true });

    /* ---------------- the cursors ---------------- */
    var CURSOR_ART = {
        'cursor': '<path d="M3 2 L3 24 L9 18.5 L13 28 L17.5 26 L13.5 16.8 L21.5 16.8 Z" fill="#2a1d14" stroke="#f3e6c2" stroke-width="1.6" stroke-linejoin="round"/>',
        'cursor-pointer': '<path d="M4 3 L16 7 L26 17 L21 22 L17 26 L7 16 Z" fill="#c49a52" stroke="#2a1d14" stroke-width="1.6" stroke-linejoin="round"/>' +
            '<path d="M4 3 L14 13" stroke="#2a1d14" stroke-width="1.4"/><circle cx="14.5" cy="13.5" r="1.8" fill="#2a1d14"/>' +
            '<path d="M21 22 L26 27" stroke="#9a3b1f" stroke-width="3" stroke-linecap="round"/>',
        'cursor-star': '<path d="M16 2 C17 11 21 15 30 16 C21 17 17 21 16 30 C15 21 11 17 2 16 C11 15 15 11 16 2 Z" fill="#fff0bf" stroke="#2a1d14" stroke-width="1.3" stroke-linejoin="round"/>' +
            '<circle cx="16" cy="16" r="2" fill="#e8b33c"/><circle cx="26" cy="6" r="1.4" fill="#fff0bf" stroke="#2a1d14" stroke-width=".8"/>',
        'cursor-grab': '<path d="M9 17 V9 a2 2 0 0 1 4 0 V15 V6.5 a2 2 0 0 1 4 0 V15 V7.5 a2 2 0 0 1 4 0 V16 V10.5 a2 2 0 0 1 4 0 V20 c0 5-3.5 9-8.5 9 h-1.5 c-3 0-5-1.5-6.5-4 l-3.5-6 a2 2 0 0 1 3.4-2.1 Z" fill="#f3e6c2" stroke="#2a1d14" stroke-width="1.5" stroke-linejoin="round"/>',
        'cursor-grabbing': '<path d="M9 14 a2.2 2.2 0 0 1 4-1 a2.2 2.2 0 0 1 4-.6 a2.2 2.2 0 0 1 4 0 a2.2 2.2 0 0 1 4 1.3 V20 c0 5-3.5 9-8.5 9 h-1.5 c-4 0-7-3-7-7 Z" fill="#f3e6c2" stroke="#2a1d14" stroke-width="1.5" stroke-linejoin="round"/>' +
            '<path d="M13 13 v3 M17 12.5 v3 M21 13 v3" stroke="#2a1d14" stroke-width="1.1" stroke-linecap="round"/>',
        'cursor-look': '<path d="M18.5 18.5 L28 28" stroke="#2a1d14" stroke-width="4.5" stroke-linecap="round"/><path d="M19 19 L27 27" stroke="#6e4a30" stroke-width="2.2" stroke-linecap="round"/>' +
            '<circle cx="12" cy="12" r="8.5" fill="rgba(220,235,245,.45)" stroke="#c49a52" stroke-width="3"/><circle cx="12" cy="12" r="8.5" fill="none" stroke="#2a1d14" stroke-width="1" opacity=".6"/>' +
            '<path d="M8 9 a5 5 0 0 1 4 -3" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
    };
    CURSOR_ART['cursor-brush'] =
        '<path d="M27 2.5 L29.5 5 L15.5 19 L13 16.5 Z" fill="#8a5a34" stroke="#2a1d14" stroke-width="1.2" stroke-linejoin="round"/>' +
        '<path d="M13 16.5 L15.5 19 L13.5 21 L11 18.5 Z" fill="#c49a52" stroke="#2a1d14" stroke-width="1.1" stroke-linejoin="round"/>' +
        '<path d="M11 18.5 L13.5 21 C11.5 25.5 7.5 28.5 3 29 C3.5 24.5 6.5 20.5 11 18.5 Z" fill="#9a3b1f" stroke="#2a1d14" stroke-width="1.1" stroke-linejoin="round"/>';
    var CURSOR_FALLBACK = { 'cursor-brush': 'crosshair', 'cursor': 'auto', 'cursor-pointer': 'pointer', 'cursor-star': 'pointer', 'cursor-grab': 'grab', 'cursor-grabbing': 'grabbing', 'cursor-look': 'zoom-in' };
    function setupCursors() {
        if (!CURSORS) return;
        Object.keys(CURSORS).forEach(function (name) {
            var h = CURSORS[name], svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' + (CURSOR_ART[name] || CURSOR_ART.cursor) + '</svg>';
            root.style.setProperty('--' + name, 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") ' + h[0] + ' ' + h[1] + ', ' + CURSOR_FALLBACK[name]);
            findAsset('assets/ui/' + name, function (url) {
                if (url) root.style.setProperty('--' + name, 'url("' + new URL(url, location.href).href + '") ' + h[0] + ' ' + h[1] + ', ' + CURSOR_FALLBACK[name]);
            });
        });
        var st = document.createElement('style');                  // last in line, so it wins
        st.textContent =
            'html, body { cursor: var(--cursor) !important; }' +
            'a, button, summary, label, select, input[type=range], input[type=checkbox], [role=button], .plank, .character, .bottle-wrap, .easel, .peep-spot, .dock-board,' +
            ' .rp-sleeve, .letter-pile, .noise-machine, .turntable, .bottle-crate { cursor: var(--cursor-pointer) !important; }' +
            'input[type=text], input[type=password], textarea { cursor: text !important; }' +
            '.sky-link, .sky-link *, .polaris, .polaris * { cursor: var(--cursor-star) !important; }' +
            '.sea-char, .sea-char *, .ship .hull, .ship .hull *, .b-cork, .b-cork * { cursor: var(--cursor-grab) !important; }' +
            '.sea-char.held, .sea-char.held *, .ship.held .hull, .ship.held .hull *, body.peep-dragging, body.peep-dragging * { cursor: var(--cursor-grabbing) !important; }' +
            '.pinboard, .room .window, body.peep-view, body.peep-view .ground, body.peep-view .ground * { cursor: var(--cursor-look) !important; }' +
            'body.peep-view .peep-spot { cursor: var(--cursor-pointer) !important; }' +
            '.note-draw { cursor: crosshair !important; }' +
            '.paint-easel, .paint-easel * { cursor: var(--cursor-brush) !important; }';
        document.head.appendChild(st);
    }

    /* ---------------- ?slots: see every slot on the page and whether it has art yet ---------------- */
    // open any page with ?slots on the end (…/city.html?slots) to get a list of its slots
    function showSlots() {
        if (!/[?&]slots\b/.test(location.search)) return;
        body.classList.add('show-slots');                               // (its look: sky.css, "?slots")
        var panel = document.createElement('div');
        panel.className = 'slot-panel';
        body.appendChild(panel);
        function list() {
            var seen = {}, rows = [];
            document.querySelectorAll('[data-asset], [data-slot]').forEach(function (el) {
                (el.dataset.asset || el.dataset.slot).split(' ').forEach(function (name) {
                    if (!name || seen[name]) return;
                    seen[name] = 1;
                    var on = el.classList.contains('has-art') || !!el.querySelector('.has-art');
                    rows.push('<div class="' + (on ? 'on' : 'off') + '">' + (on ? '✓ ' : '· ') + name.split('|').join(' or ') + '</div>');
                });
            });
            panel.innerHTML = '<b>slots on this page (✓ = your art is in)</b>' + rows.join('');
        }
        setTimeout(list, 1500);
        setTimeout(list, 4000);
        panel.addEventListener('click', list);
    }

    /* ---------------- characters: click one and it speaks ---------------- */
    // <div class="character" data-asset="assets/characters/workshop" data-say="hello!">
    var FIGURE =
        '<svg class="placeholder" viewBox="0 0 60 120" aria-hidden="true">' +
            '<path d="M8 40 Q30 32 52 40 L50 44 Q30 38 10 44 Z" fill="#3a2716"/>' +          // hat brim
            '<path d="M17 40 Q18 22 30 21 Q42 22 43 40 Z" fill="#3a2716"/>' +                 // hat crown
            '<circle cx="30" cy="50" r="9" fill="#f0dfbd"/>' +                                // face
            '<path d="M16 62 Q30 56 44 62 L48 100 L12 100 Z" fill="#9a3b1f"/>' +             // coat
            '<path d="M29 62 L31 62 L31 100 L29 100 Z" fill="#6e2a16"/>' +
            '<path d="M18 100 H27 V118 H18 Z M33 100 H42 V118 H33 Z" fill="#3a2716"/>' +     // legs
            '<path d="M14 116 H28 V120 H14 Z M32 116 H46 V120 H32 Z" fill="#24170c"/>' +     // boots
        '</svg>';
    function setupCharacter(el) {
        if (el.dataset.charDone) return;
        el.dataset.charDone = '1';
        if (!el.querySelector('.placeholder, img')) el.insertAdjacentHTML('afterbegin', FIGURE);
        var say = el.dataset.say;
        if (say) {
            var b = document.createElement('span');
            b.className = 'bubble';
            b.textContent = say;
            el.appendChild(b);
        }
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', el.getAttribute('aria-label') || 'a traveller');
        function toggle() { el.classList.toggle('talking'); }
        el.addEventListener('click', toggle);
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    }
    // walking about: a character strolls sideways from where it stands (dx px; 0 = back to its spot).
    // works however the page places it, since it only nudges it with a transform
    function stroll(el, dx, done) {
        var cur = el._dx || 0, dist = Math.abs(dx - cur), W = window.innerWidth;
        var secs = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.01 : Math.max(0.35, Math.min(2.4, dist / Math.max(240, W * 0.28)));
        el.classList.toggle('face-left', dx < cur);
        el.classList.add('walking');
        el.classList.remove('talking');
        el.style.transition = 'transform ' + secs + 's linear, opacity .3s';
        el.style.transform = 'translateX(' + dx.toFixed(1) + 'px)';
        el._dx = dx;
        var steps = setInterval(function () { if (window.Sky && window.Sky.sounds) window.Sky.sounds.sfx('step', { size: 0.5 + Math.random() * 0.3 }); }, 380);
        setTimeout(function () {
            clearInterval(steps);
            el.classList.remove('walking');
            if (dx === 0) { el.classList.remove('face-left'); el.style.transform = ''; }
            if (done) done();
        }, secs * 1000 + 30);
    }
    function restX(el) { var r = el.getBoundingClientRect(); return r.left + r.width / 2 - (el._dx || 0); }
    // coming through a door: the next page walks the traveller in from where you came
    // (data-arrive-via on the link: "right", "left", or a door on that page, like ".roof-door")
    function pageOf(href) { return (href || '').split('#')[0].split('?')[0].split('/').pop() || 'index.html'; }
    function setArrival(href, via) {
        try { sessionStorage.setItem('arrive', JSON.stringify({ page: pageOf(href), via: via, t: Date.now() })); } catch (e) {}
    }
    function takeArrival() {
        var a = null;
        try { a = JSON.parse(sessionStorage.getItem('arrive') || 'null'); } catch (e) {}
        if (!a || a.page !== pageOf(location.pathname) || Date.now() - a.t > 30000) return null;
        try { sessionStorage.removeItem('arrive'); } catch (e) {}
        return a;
    }
    function doorSound(door) { if (window.Sky && window.Sky.sounds && door && door.dataset.sound) window.Sky.sounds.sfx(door.dataset.sound); }
    function arrive() {
        var a = takeArrival(), ch = document.querySelector('.scene-character');
        if (!a || !ch || a.via === 'edge') return;          // (just passing through: nothing to walk)
        var r = ch.getBoundingClientRect(), rest = r.left + r.width / 2, W = window.innerWidth, dx, door = null;
        if (a.via === 'right') dx = W + r.width * 0.7 - rest;
        else if (a.via === 'left') dx = -(rest + r.width * 0.7);
        else {
            door = document.querySelector(a.via);
            if (!door) return;
            var d = door.getBoundingClientRect();
            dx = d.left + d.width / 2 - rest;
        }
        ch.style.transition = 'none';
        ch.style.transform = 'translateX(' + dx.toFixed(1) + 'px)';
        ch._dx = dx;
        if (door) { ch.style.opacity = 0; door.classList.add('open'); }
        setTimeout(function () {
            if (door) { doorSound(door); ch.style.transition = 'opacity .3s'; ch.style.opacity = ''; }
            setTimeout(function () {
                stroll(ch, 0);
                if (door) setTimeout(function () { door.classList.remove('open'); }, 600);
            }, door ? 350 : 0);
        }, 450);
    }
    // an arrow or a door that leads to another page (<a class="room-arrow exit" href="living.html#hallway">): the send-offs play first.
    // data-walk: "off-right" / "off-left" (the traveller walks off that edge first) or "to-door" (walks to the link itself)
    // data-sound: the door's sound; data-arrive-via: where they turn up on the next page; data-under-tabs: sit under the place tabs
    var ARROW_ART = '<svg class="placeholder" viewBox="0 0 60 60" aria-hidden="true">' +
        '<circle cx="30" cy="30" r="27" fill="rgba(243,230,194,.16)" stroke="rgba(243,230,194,.55)" stroke-width="2"/>' +
        '<path d="M22 16 L38 30 L22 44" fill="none" stroke="#f3e6c2" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    function underTabs() {
        var tabs = document.querySelector('.place-tabs');
        document.querySelectorAll('.room-arrow[data-under-tabs]').forEach(function (a) {
            if (!tabs) return;
            var r = tabs.getBoundingClientRect(), h = a.offsetHeight || 54, top = r.bottom + 18;
            if (top + h > window.innerHeight - 12) top = r.top - h - 14;
            a.style.top = Math.round(top) + 'px';
            a.style.right = '8px';
            a.style.left = 'auto';
        });
    }
    function setupExits() {
        document.querySelectorAll('a.exit[href]').forEach(function (a) {
            if (a.dataset.exitDone) return;
            a.dataset.exitDone = '1';
            if (a.classList.contains('room-arrow') && !a.querySelector('.placeholder, img')) a.insertAdjacentHTML('afterbegin', ARROW_ART);
            if (a.dataset.hint && !a.querySelector('.ra-hint')) { var h = document.createElement('span'); h.className = 'ra-hint'; h.textContent = a.dataset.hint; a.appendChild(h); }
            a.addEventListener('click', function (e) {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
                e.preventDefault();
                if (a._busy) return;
                a._busy = true;
                var href = a.getAttribute('href');
                if (a.dataset.arriveVia) setArrival(href, a.dataset.arriveVia);
                function through() {
                    doorSound(a);
                    a.classList.add('open');
                    setTimeout(function () { leave(href); }, 450);
                }
                var ch = document.querySelector('.scene-character:not(.gore-hidden)'), walk = a.dataset.walk;
                if (!walk || !ch) return through();
                var r = ch.getBoundingClientRect(), rest = restX(ch), W = window.innerWidth, dx;
                if (walk === 'off-right') dx = W + r.width * 0.7 - rest;
                else if (walk === 'off-left') dx = -(rest + r.width * 0.7);
                else { var d = a.getBoundingClientRect(); dx = d.left + d.width / 2 - rest; }
                stroll(ch, dx, function () {
                    if (walk === 'to-door') { ch.style.transition = 'opacity .35s'; setTimeout(function () { ch.style.opacity = 0; }, 250); }
                    through();
                });
            });
        });
        underTabs();
        window.addEventListener('resize', underTabs);
        setTimeout(underTabs, 400);
    }
    window.addEventListener('pageshow', function (e) {             // back with the browser's back button: everyone where they were
        if (!e.persisted) return;
        document.querySelectorAll('a.exit.open').forEach(function (a) { a.classList.remove('open'); });
        document.querySelectorAll('.scene-character').forEach(function (c) { c.style.transform = ''; c.style.opacity = ''; c._dx = 0; c.classList.remove('walking', 'face-left'); });
        document.querySelectorAll('a.exit').forEach(function (a) { a._busy = false; });
    });
    function setupCharacters(scope) {
        (scope || document).querySelectorAll('.character').forEach(setupCharacter);
    }

    // run once every script on the page (grounds included) has built its pieces
    // the paper note pinned up in a room: assets/<room>/note (a sheet of paper, stretched behind the words)
    function dressNotes() {
        document.querySelectorAll('.furnish.pinned').forEach(function (n) {
            var room = body.dataset.place || 'room';
            n.dataset.slot = 'assets/' + room + '/note';
            findAsset('assets/' + room + '/note', function (url) {
                if (!url) return;
                n.style.background = 'url("' + new URL(url, location.href).href + '") center / 100% 100% no-repeat';
                n.style.boxShadow = 'none';
                n.classList.add('has-art');
            });
        });
    }
    document.addEventListener('DOMContentLoaded', function () { setupCharacters(); setupExits(); fillAssets(); showSlots(); setupCursors(); dressNotes(); arrive(); });
    startAmbient();

    render(shown);


    /* ---------------- content folders: what files are in content/<scene>/ ? ----------------
       a browser can't look inside a folder by itself, so three sources are asked and combined:
         1. content/<scene>/list.txt   written for you by tools/update-lists.sh (git hook)
         2. the server's own folder listing, if it shows one
         3. your Forgejo repo's API, if it answers browsers
       files that turn out to be missing are skipped. */
    var folderCache = {};
    function listFolder(dir, exts, cb) {
        dir = dir.replace(/\/?$/, '/');
        var key = dir + '|' + exts.join(',');
        if (folderCache[key]) return folderCache[key].then(cb);
        var want = new RegExp('\\.(' + exts.join('|') + ')$', 'i');
        function clean(names) {
            return names.map(function (n) { return decodeURIComponent(String(n).split(/[?#]/)[0]).replace(/^.*\//, '').trim(); })
                        .filter(function (n) { return n && n !== 'list.txt' && !/^[._]/.test(n) && want.test(n); });
        }
        function get(url, as) {
            return fetch(url, { cache: 'no-cache' }).then(function (r) {
                if (!r.ok) throw new Error(r.status);
                return as === 'json' ? r.json() : r.text();
            }).catch(function () { return null; });
        }
        // list.txt (written by publish) is the answer, straight from the visitor's own copy of the site.
        // only without one does it ask around: the server's folder listing, and the Forgejo API (both slow)
        var fromList = get(dir + 'list.txt').then(function (t) {
            if (!t || /<html/i.test(t)) return null;
            return clean(t.split(/\r?\n/).filter(function (l) { return l.trim() && !/^\s*#/.test(l); }));
        });
        folderCache[key] = fromList.then(function (listed) {
            if (listed) return listed.map(function (n) { return { name: n, url: dir + encodeURIComponent(n) }; });
            return askAround();
        });
        return folderCache[key].then(cb);
        function askAround() {
        var fromServer = get(dir).then(function (t) {
            if (!t) return [];
            var path = new URL(dir, location.href).pathname;
            var looksLikeListing = t.indexOf(path) !== -1 && /Index of|Directory listing|\.\.\/|parent directory/i.test(t);
            if (!looksLikeListing) return [];
            var out = [], re = /href\s*=\s*["']([^"']+)["']/gi, m;
            while ((m = re.exec(t))) if (m[1].indexOf('/') === -1 || m[1].indexOf(path) === 0) out.push(m[1]);
            return clean(out);
        });
        var fromRepo = !REPO_API || location.protocol === 'file:' ? Promise.resolve([]) :
            get(REPO_API + '/contents/' + new URL(dir, location.href).pathname.replace(/^\/|\/$/g, ''), 'json').then(function (j) {
                return Array.isArray(j) ? clean(j.filter(function (f) { return f.type === 'file'; }).map(function (f) { return f.name; })) : [];
            });
        return Promise.all([fromServer, fromRepo]).then(function (all) {
            var seen = {}, names = [];
            all.forEach(function (list) { list.forEach(function (n) { if (!seen[n]) { seen[n] = 1; names.push(n); } }); });
            // a list can be out of date: keep only the files that are really there
            return Promise.all(names.map(function (n) {
                var url = dir + encodeURIComponent(n);
                return fetch(url, { method: 'HEAD', cache: 'no-cache' })
                    .then(function (r) { return r.ok || r.status === 405 ? { name: n, url: url } : null; })
                    .catch(function () { return { name: n, url: url }; });
            })).then(function (found) { return found.filter(Boolean); });
        });
        }
    }

    // "2026-09-23-lighthouse_study.png" → date "2026-09-23", title "lighthouse study"
    function fileDate(name) { var m = /^(\d{4}-\d{2}-\d{2})/.exec(name); return m ? m[1] : ''; }
    function fileTitle(name) {
        return name.replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}-\d{2}[-_ ]*/, '').replace(/^\d+[-_. ]+/, '')
                   .replace(/[-_]+/g, ' ').trim();
    }
    // newest-dated first, then everything else in name order
    function sortNewest(files) {
        return files.slice().sort(function (a, b) {
            var da = fileDate(a.name), db = fileDate(b.name);
            if (da && db && da !== db) return db.localeCompare(da);
            if (da && !db) return -1;
            if (db && !da) return 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
    }
    function sortByName(files) {
        return files.slice().sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
    }
    // an <img>, <video> or html fragment for a file, by its extension
    function makeMedia(file, cls) {
        var ext = (/\.([^.]+)$/.exec(file.name) || [])[1] || '';
        ext = ext.toLowerCase();
        var el;
        if (ext === 'mp4' || ext === 'webm') {
            el = document.createElement('video');
            el.src = file.url; el.muted = true; el.loop = true; el.autoplay = true;
            el.setAttribute('playsinline', ''); el.setAttribute('muted', '');
        } else if (ext === 'html' || ext === 'txt') {
            el = document.createElement('div');
            fetch(file.url, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
                el.innerHTML = ext === 'txt' ? txtToHtml(t) : t;
            });
        } else {
            el = document.createElement('img');
            el.src = file.url; el.alt = fileTitle(file.name); el.decoding = 'async';
        }
        if (cls) el.className = cls;
        return el;
    }
    // plain-text letters: first line is the title, blank lines separate paragraphs,
    // *italic*, **bold**, [link](url), ![picture](url), --- for a rule, "~ " starts a sign-off
    function txtToHtml(t) {
        function esc(x) { return x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
        function inline(x) {
            return esc(x)
                .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">')
                .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>');
        }
        var blocks = t.replace(/\r/g, '').trim().split(/\n\s*\n/), out = '';
        blocks.forEach(function (b, i) {
            b = b.trim();
            if (i === 0) {
                var lines = b.split('\n'), title = lines.shift().replace(/^#+\s*/, '');
                out += '<h2>' + inline(title) + '</h2>';
                if (lines.length) out += '<p class="subtitle">' + inline(lines.join(' ')) + '</p>';
                return;
            }
            if (/^-{3,}$/.test(b)) { out += '<hr>'; return; }
            if (/^~\s/.test(b)) { out += '<p class="signoff">' + inline(b.replace(/^~\s*/, '')) + '</p>'; return; }
            out += '<p' + (i === 1 ? ' class="lede"' : '') + '>' + inline(b).replace(/\n/g, '<br>') + '</p>';
        });
        return out;
    }

    /* ---------------- holding the time of day (for views that want a set hour) ---------------- */
    var holdId = 0;
    function holdTime(to, ms) {
        var id = ++holdId, from = override === null ? shown : override, t0 = performance.now();
        (function frame(now) {
            if (id !== holdId) return;
            var t = Math.min(1, (now - t0) / (ms || 1)), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            override = from + (to - from) * e;
            kick();
            if (t < 1) requestAnimationFrame(frame);
        })(t0);
    }
    function releaseTime() { holdId++; override = null; kick(); }
    // a still page's own hour: glide to it and stay there (the city's telescope turns it to night).
    // on the homepage (whose hour belongs to the scroll) it holds the time instead.
    var baseId = 0;
    function setTime(to, ms) {
        if (!still) return holdTime(to, ms);
        var id = ++baseId, from = override === null ? shown : baseTime, t0 = performance.now();
        var th0 = celest.theta, th1 = null;
        if (celest.w > 0 && th0 !== null) {                   // the sun and moon are on their circles: turn them there
            clockMode = false;
            var a = to * Math.PI, b = 2 * Math.PI - to * Math.PI;
            th1 = Math.abs(th0 - a) <= Math.abs(th0 - b) ? a : b;
        }
        (function frame(now) {
            if (id !== baseId) return;
            var t = Math.min(1, (now - t0) / (ms || 1)), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            baseTime = from + (to - from) * e;
            if (th1 !== null && !view) { celest.theta = th0 + (th1 - th0) * e; celest.frozen = th1; }
            kick();
            if (t < 1) requestAnimationFrame(frame);
        })(t0);
    }

    /* ---------------- sending post: bottles and paintings from visitors ----------------
       Sky.sendPost({ kind: 'bottle' | 'art', from, message, title, file: Blob, filename })
       resolves 'sent', 'closed' (no post office set up) or 'failed' */
    function sbHeaders(extra) {
        var h = { apikey: SUPABASE.key };
        if (/^eyJ/.test(SUPABASE.key)) h.Authorization = 'Bearer ' + SUPABASE.key;   // an older "anon" key
        for (var k in extra) h[k] = extra[k];
        return h;
    }
    function viaSupabase(p) {
        var base = SUPABASE.url.replace(/\/+$/, ''), path = '';
        var upload = Promise.resolve();
        if (p.file) {
            var ext = (/\.[a-z0-9]+$/i.exec(p.filename || '') || ['.jpg'])[0].toLowerCase();
            path = p.kind + '/' + new Date().toISOString().slice(0, 10) + '-' + Math.random().toString(36).slice(2, 10) + ext;
            upload = fetch(base + '/storage/v1/object/post/' + path, {
                method: 'POST', body: p.file, headers: sbHeaders({ 'Content-Type': p.file.type || 'application/octet-stream', 'x-upsert': 'false' })
            }).then(function (r) { if (!r.ok) throw new Error('upload ' + r.status); });
        }
        return upload.then(function () {
            return fetch(base + '/rest/v1/post', {
                method: 'POST',
                headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
                body: JSON.stringify({ kind: p.kind, from_name: (p.from || '').slice(0, 40), message: (p.message || '').slice(0, 1000),
                                       title: (p.title || '').slice(0, 60), file_path: path, file_name: (p.filename || '').slice(0, 120), page: location.href.slice(0, 300) })
            });
        }).then(function (r) { if (!r.ok) throw new Error('insert ' + r.status); return 'sent'; });
    }
    function viaFormSubmit(p, withFile) {
        if (!BOTTLE_INBOX) return 'closed';
        var frame = document.querySelector('iframe[name="post-frame"]');
        if (!frame) {
            frame = document.createElement('iframe');
            frame.name = 'post-frame'; frame.title = 'post'; frame.hidden = true;
            body.appendChild(frame);
        }
        var f = document.createElement('form');
        f.action = BOTTLE_INBOX; f.method = 'POST'; f.enctype = 'multipart/form-data'; f.target = 'post-frame'; f.hidden = true;
        function field(n, v) { var i = document.createElement('input'); i.type = 'hidden'; i.name = n; i.value = v; f.appendChild(i); }
        var art = p.kind === 'art';
        field('_subject', (art ? 'art for the workshop' + (p.title ? ': “' + p.title + '”' : '') : 'a message in a bottle') + (p.from ? ' from ' + p.from : ''));
        field('_captcha', 'false'); field('_template', 'table'); field('_honey', '');
        field('from', p.from || '(no name)');
        if (art) field('title', p.title || '(untitled)'); else field('message', p.message || '(a drawing or picture)');
        if (!withFile) field('note', 'it’s waiting in the content manager (tools\\content.bat, visitors)');
        field('page', location.href);
        if (withFile && p.file) {
            var file = document.createElement('input');
            file.type = 'file'; file.name = 'attachment';
            try { var dt = new DataTransfer(); dt.items.add(new File([p.file], p.filename || 'post.jpg', { type: p.file.type })); file.files = dt.files; f.appendChild(file); } catch (e) {}
        }
        body.appendChild(f);
        f.submit();
        setTimeout(function () { f.remove(); }, 4000);
        return 'sent';
    }
    function sendPost(p) {
        if (SUPABASE.url && SUPABASE.key) {
            return viaSupabase(p).then(function (r) {
                if (NOTIFY_BY_EMAIL) try { viaFormSubmit(p, false); } catch (e) {}
                return r;
            }, function () { return 'failed'; });
        }
        return Promise.resolve(viaFormSubmit(p, true));
    }

    /* ---------------- what grounds and page scripts can use ---------------- */
    /* (the sun's eye, from reset 3 on, is sky/eye.js) */
    // (and pictures and links don't come loose to be dragged about: sky.css has the rest of this, for text)
    document.addEventListener('dragstart', function (e) { if (!(e.target.closest && e.target.closest('[draggable=true]'))) e.preventDefault(); });
    document.addEventListener('selectstart', function (e) { var t = e.target.nodeType === 1 ? e.target : e.target.parentElement; if (!(t && t.closest('input, textarea, select, [contenteditable]'))) e.preventDefault(); });
    // the rope the sky's props hang from in resets 1 and 2 (sky.css: props on ropes): your own, if you've drawn one
    findAsset('assets/sky/rope', function (url) {
        if (!url) return;
        root.style.setProperty('--rope-art', 'url("' + new URL(url, location.href).href + '")');
        root.classList.add('has-rope-art');
    });

    /* ---------------- the traveller's words, typed out in a box near the top; click (or wait) to move on ----------------
       Sky.speak(lines, done, opts): lines a string or a list of them. its look: .mc-say in sky.css (it used to live in
       sky/claubes.js, so everything that talked needed the Claubes) */
    // (opts.hold: how long the last line stays up once it's typed, in ms; opts.typed: called the moment it's all typed)
    function speak(lines, done, opts) {
        opts = opts || {};
        if (typeof lines === 'string') lines = [lines];
        var box = document.createElement('div');
        box.className = 'mc-say' + (opts.cls ? ' ' + opts.cls : '');
        box.setAttribute('role', 'status');
        box.innerHTML = '<b></b><span></span>';
        box.querySelector('b').textContent = opts.who || 'the traveller';      // (opts.who: someone else speaking; opts.cls: their look)
        body.appendChild(box);
        requestAnimationFrame(function () { box.classList.add('on'); });
        var t = box.querySelector('span'), i = 0, timer = null, typing = null;
        function line() {
            if (i >= lines.length) { box.classList.remove('on'); setTimeout(function () { box.remove(); if (done) done(); }, 400); return; }
            var text = lines[i++], n = 0;
            t.textContent = '';
            clearInterval(typing);
            typing = setInterval(function () {
                t.textContent = text.slice(0, ++n);
                if (n % 2 === 0 && text.charAt(n - 1) !== ' ') sfx(opts.blip || 'blip', { size: 0.25, or: opts.blipOr || 'blip' });
                if (n >= text.length) { clearInterval(typing); typing = null; typed(); }
            }, 38);
        }
        function typed() {
            var last = i >= lines.length;
            clearTimeout(timer);
            timer = setTimeout(line, last && opts.hold !== undefined ? opts.hold : 2600 + lines[i - 1].length * 30);
            if (last && opts.typed) { var f = opts.typed; opts.typed = null; f(); }
        }
        box.addEventListener('click', function () {
            if (typing) { clearInterval(typing); typing = null; t.textContent = lines[i - 1]; typed(); }
            else { clearTimeout(timer); line(); }
        });
        line();
    }

    // everything being said, stopped (something more important to say: sky/lives.js)
    speak.hush = function () { Array.prototype.forEach.call(document.querySelectorAll('.mc-say'), function (b) { b.remove(); }); };

    /* ---------------- Escape: one press, one thing ----------------
       (28 Sep: each view used to listen for Escape on its own, so one press could close the control panel and put the
       gun away, or shut a painting and walk out of the dungeon.) now each thing that Escape can close says so here:
           Sky.escape(isOpen, close, level)
       and a press closes only the open one on the highest level (the same level: the one added last). the levels:
           Sky.ESC.panel (the control panel, over everything) › view (something looked at up close: a book, a painting,
           the record player, a letter …) › hand (something held: the revolver) › room (the house: back the way you came) */
    var escapes, ESC = { room: 0, hand: 10, view: 20, panel: 30 };
    function escape(isOpen, close, level) {
        escapes = escapes || [];                              // (this file uses it before it gets down here)
        escapes.push({ open: isOpen, close: close, level: level === undefined ? 20 : level, n: escapes.length });
        escapes.sort(function (a, b) { return b.level - a.level || b.n - a.n; });
    }
    window.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || e.defaultPrevented || !escapes) return;
        for (var i = 0; i < escapes.length; i++) {
            var x = escapes[i], on = false;
            try { on = x.open(); } catch (err) {}
            if (!on) continue;
            e.preventDefault(); e.stopImmediatePropagation();
            x.close(e);
            return;
        }
    }, true);
    // the little things nearly every script wants: a sound effect (sky/panel.js), and a line said (sky/inventory.js)
    function sfx(name, opts) { if (window.Sky && Sky.sounds) return Sky.sounds.sfx(name, opts); }
    function say(text, ms) { if (window.Sky && Sky.inventory && Sky.inventory.say) Sky.inventory.say(text, ms); }

    window.Sky = {
        escape: escape, ESC: ESC, sfx: sfx, say: say, speak: speak, ARROW_ART: ARROW_ART,
        // run fn(p) every frame the scene changes; p goes 0 (noon) → 1 (midnight)
        onFrame: function (fn) { hooks.push(fn); fn(shown); },
        // run fn(go) when a sign or constellation is clicked; return true and
        // call go() yourself when your send-off animation is done
        onLeave: function (fn) { leaveHooks.push(fn); },
        // go to another page the way the signs do (the send-offs play, music carries on)
        leave: function (href) { leave(href); },
        stroll: stroll, setArrival: setArrival, takeArrival: takeArrival,
        openSkyView: openSkyView,
        closeSkyView: closeSkyView,
        listFolder: listFolder,
        inbox: BOTTLE_INBOX,
        sendPost: sendPost,
        // a glass bottle drawing (viewBox 0 0 200 90): .b-scroll (the note inside), .b-cork
        bottleSVG: function (cls) {
            return '<svg class="' + (cls || 'bottle') + '" viewBox="0 0 200 90" aria-hidden="true" data-bottle data-slot="assets/sea/bottle assets/sea/bottle-cork assets/sea/bottle-scroll">' +
                '<g class="b-scroll">' +
                    '<rect x="36" y="37" width="100" height="16" rx="7" fill="#e9dbb8"/>' +
                    '<rect x="36" y="37" width="100" height="5" rx="2.5" fill="#f6ecd2" opacity=".7"/>' +
                    '<rect x="36" y="48" width="100" height="5" rx="2.5" fill="#b89d6c" opacity=".6"/>' +
                    '<rect x="82" y="36" width="7" height="18" fill="#9a3b1f"/>' +
                '</g>' +
                '<g class="b-glass">' +
                '<path d="M32 20 H118 C135 20 142 30 152 36 H168 V54 H152 C142 60 135 70 118 70 H32 C18 70 10 58 10 45 C10 32 18 20 32 20 Z" fill="rgba(96,158,146,.5)" stroke="rgba(215,240,232,.75)" stroke-width="1.6"/>' +
                '<rect x="164" y="33" width="6" height="24" rx="2" fill="rgba(96,158,146,.75)" stroke="rgba(215,240,232,.75)" stroke-width="1.2"/>' +
                '<path d="M28 28 H108" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-linecap="round"/>' +
                '<path d="M22 60 Q16 50 20 38" stroke="rgba(255,255,255,.3)" stroke-width="2" fill="none" stroke-linecap="round"/>' +
                '</g>' +
                '<g class="b-cork"><rect x="168" y="37" width="18" height="16" rx="3" fill="#9a6b3c"/><path d="M174 39 V51 M180 39 V51" stroke="#7a4f28" stroke-width="1.2"/></g>' +
            '</svg>';
        },
        fileDate: fileDate, fileTitle: fileTitle,
        sortNewest: sortNewest, sortByName: sortByName,
        makeMedia: makeMedia, txtToHtml: txtToHtml,
        holdTime: holdTime, releaseTime: releaseTime, setTime: setTime,
        get still() { return still; },
        fillAssets: fillAssets,
        svgArt: svgArt, layerArt: layerArt, fitLayerArt: fitLayerArt, setCloudiness: setCloudiness,
        repoApi: REPO_API,
        findAsset: findAsset,
        setupCharacters: setupCharacters, restX: restX,
        save: window.davSave,
        figure: FIGURE,
        places: PLACES,
        constellations: CONSTELLATIONS,
        egg: function (name, fn) { EGGS[name] = fn; },
        twinkle: twinkle,
        here: here,
        get progress() { return shown; },
        refresh: kick,
        isHome: isHome,
        home: HOME,
        css: css,
        mix: mix, clamp: clamp, ramp: ramp, smooth: smooth,
        seeded: seeded, hashStr: hashStr
    };
})();

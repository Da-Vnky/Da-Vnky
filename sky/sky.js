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
       data-voyage="110"     how much empty sky to scroll through after your
                             content, in % of the screen height. more = slower sunset.
   ===================================================================== */

(function () {

    /* ======================= settings you can edit ======================= */

    // where Polaris takes you
    var HOME = 'https://dav-nky.pleroma.nexus/';

    // every place on the site. each one gets a wooden sign on the signpost
    // (right side of the screen) and a constellation in the night sky.
    // to add a place: add a line here, in the order you want the signs.
    // the first four also get constellations.
    var PLACES = [
        { id: 'sea',      name: 'the sea',          href: HOME },
        { id: 'workshop', name: 'the workshop',     href: 'workshop.html' },
        { id: 'city',     name: 'the city',         href: 'city.html' },
        { id: 'living',   name: 'the living space', href: 'living.html' }
    ];

    // your Forgejo repo's API address. if Mel's Forgejo allows it, the site asks it
    // which files are in each content folder (one of three ways it finds new files).
    var REPO_API = 'https://members.pleroma.nexus/api/v1/repos/subdomains/DaV-nky';

    // where visitors' messages in bottles are sent for you to read and approve.
    // a FormSubmit address (see content/README.txt, "your post office"), e.g.
    //   'https://formsubmit.co/1a2b3c4d5e6f…'
    // leave it '' and bottles still get tossed, but nothing is delivered.
    var BOTTLE_INBOX = 'https://formsubmit.co/pneumatichylic@proton.me';

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
        if (!assetDirs[dir]) assetDirs[dir] = Promise.all([
            fetch(dir + 'list.txt', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; }),
            new Promise(function (done) { listFolder(dir, EXTS.concat(['jpeg', 'json']), done); })
        ]).then(function (r) {
            var known = !!r[0] && !/<html/i.test(r[0]), names = {};
            r[1].forEach(function (f) { names[f.name] = 1; });
            return (known || r[1].length) ? names : null;             // null: we don't know, so try each file
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
        '<svg class="ursa" viewBox="-86 12 240 228">' +
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
        [['', '-1', 'left:3%;  top:14%; width:190px'], ['', '1', 'right:5%; top:26%; width:150px'], [' hide-small', '1', 'left:24%; top:5%;  width:130px'],
         [' hide-small', '-1', 'right:22%; top:9%; width:170px'], [' hide-small', '-1', 'left:12%; top:34%; width:110px']].map(function (c, i) {
            return '<div class="cloud' + c[0] + '" data-dir="' + c[1] + '" style="' + c[2] + '" data-asset="assets/sky/cloud-' + (i + 1) + '|assets/sky/cloud">' +
                   '<svg class="placeholder" viewBox="0 0 200 90"><use href="#sky-cloud"/></svg></div>';
        }).join('');
    body.insertBefore(backdrop, body.firstChild);

    /* ---------------- Polaris ---------------- */
    var polaris = document.createElement('a');
    polaris.className = 'polaris';
    polaris.href = HOME;
    polaris.setAttribute('aria-label', 'return home');
    polaris.title = 'return home';
    polaris.innerHTML =
        // by day: a little brass-and-paper compass, needle to the north (slot: assets/sky/compass)
        '<span class="p-compass" data-asset="assets/sky/compass" aria-hidden="true"><svg class="placeholder" viewBox="-26 -26 52 52">' +
            '<g>' +
                '<circle r="21" fill="#eadcb9" stroke="#8a6a30" stroke-width="2.4"/>' +
                '<circle r="17" fill="none" stroke="#6e5236" stroke-width=".6" stroke-dasharray="1.2 2.1"/>' +
                '<path d="M0 -15 L3 0 L0 15 L-3 0 Z M-15 0 L0 -3 L15 0 L0 3 Z" fill="#6e5236" opacity=".45"/>' +
                '<g class="needle"><path d="M0 -14 L3.4 0 L-3.4 0 Z" fill="#9a3b1f"/><path d="M0 14 L3.4 0 L-3.4 0 Z" fill="#3a2716"/></g>' +
                '<circle r="2" fill="#c49a52"/>' +
                '<text y="-22.5" text-anchor="middle" font-size="6" font-family="Georgia, serif" fill="#3a2716">N</text>' +
            '</g>' +
        '</svg></span>' +
        // by night: Polaris (slot: assets/sky/polaris)
        '<span class="p-star" data-asset="assets/sky/polaris" aria-hidden="true"><svg class="placeholder" viewBox="-26 -26 52 52">' +
            '<g class="rays">' +
                '<line x1="0" y1="-18" x2="0" y2="18"/><line x1="-18" y1="0" x2="18" y2="0"/>' +
                '<line x1="-8" y1="-8" x2="8" y2="8" opacity=".6"/><line x1="-8" y1="8" x2="8" y2="-8" opacity=".6"/>' +
            '</g>' +
            '<circle class="core" r="4.6"/>' +
        '</svg></span>' +
        '<span class="polaris-name">Polaris</span>' +
        '<span class="polaris-hint">return home</span>';
    body.appendChild(polaris);
    polaris.addEventListener('click', function (e) {
        if (!isHome) return;                                      // other pages: follow the link home
        e.preventDefault();                                       // homepage: sail back to daylight
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* ---------------- the night-sky links ---------------- */
    var SHAPES = [
        '<polyline class="ln" points="10,30 40,55 70,30 100,58 135,22"/><g class="st"><circle cx="10" cy="30" r="2.4"/><circle cx="40" cy="55" r="2"/><circle cx="70" cy="30" r="2.8"/><circle cx="100" cy="58" r="2.2"/><circle cx="135" cy="22" r="2.6"/></g>',
        '<path class="ln" d="M75 8 L55 38 L95 38 Z M55 38 L62 70 L90 68 L95 38"/><g class="st"><circle cx="75" cy="8" r="3.2"/><circle cx="55" cy="38" r="2"/><circle cx="95" cy="38" r="2.2"/><circle cx="62" cy="70" r="2"/><circle cx="90" cy="68" r="2.4"/></g>',
        '<path class="ln" d="M45 8 L58 40 L78 45 L98 50 L110 12 M58 40 L50 76 M98 50 L106 78"/><g class="st"><circle cx="45" cy="8" r="3"/><circle cx="110" cy="12" r="2.6"/><circle cx="58" cy="40" r="2"/><circle cx="78" cy="45" r="2"/><circle cx="98" cy="50" r="2"/><circle cx="50" cy="76" r="2.4"/><circle cx="106" cy="78" r="2.8"/></g>',
        '<path class="ln" d="M12 62 L50 46 L90 32 L134 16 M90 32 L80 12 M90 32 L102 50"/><g class="st"><circle cx="12" cy="62" r="2"/><circle cx="50" cy="46" r="2.2"/><circle cx="90" cy="32" r="2.8"/><circle cx="134" cy="16" r="2.4"/><circle cx="80" cy="12" r="1.8"/><circle cx="102" cy="50" r="1.8"/></g>'
    ];
    var here = body.dataset.place || (isHome ? PLACES[0].id : '');
    var nav = document.createElement('nav');
    nav.className = 'sky-links';
    nav.setAttribute('aria-label', 'places, among the stars');
    PLACES.slice(0, 4).forEach(function (pl, i) {
        var a = document.createElement('a');
        a.className = 'sky-link l' + (i + 1);
        a.href = pl.href;
        a.dataset.place = pl.id;
        a.innerHTML = '<svg viewBox="0 0 150 80" aria-hidden="true">' + SHAPES[i] + '</svg><span></span>';
        a.querySelector('span').textContent = pl.name;
        nav.appendChild(a);
    });
    body.appendChild(nav);

    /* ---------------- the signpost: wooden arrow planks on the right ---------------- */
    var sign = document.createElement('nav');
    sign.className = 'signpost';
    sign.setAttribute('aria-label', 'places');
    sign.innerHTML = '<div class="post" aria-hidden="true"></div>';
    var TILTS = [-1.6, 1.2, -0.8, 1.8, -1.3, 0.9];
    PLACES.forEach(function (pl, i) {
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
    body.appendChild(sign);
    // slots: assets/sky/plank (every sign) and assets/sky/plank-here (the one you're standing at)
    sign.dataset.slot = 'assets/sky/plank assets/sky/plank-here';
    findAsset('assets/sky/plank', function (url) {
        if (!url) return;
        sign.classList.add('has-plank-art', 'has-art');
        sign.style.setProperty('--plank-art', 'url("' + new URL(url, location.href).href + '")');
        findAsset('assets/sky/plank-here', function (u2) { if (u2) sign.style.setProperty('--plank-here-art', 'url("' + new URL(u2, location.href).href + '")'); });
    });

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
        var waiting = false, gone = false;
        function go() { if (gone) return; gone = true; location.href = href; }
        leaveHooks.forEach(function (fn) { if (fn(go)) waiting = true; });
        if (waiting) { body.classList.add('leaving'); setTimeout(go, 2600); } else go();
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
    nav.addEventListener('click', onPlaceClick);
    window.addEventListener('pageshow', function (e) {         // coming back with the browser's back button
        if (e.persisted) { leaving = false; sign.classList.remove('open'); body.classList.remove('leaving'); }
    });

    /* ---------------- the stretch of sky after the content ---------------- */
    var voyage = document.createElement('div');
    voyage.className = 'voyage';
    voyage.setAttribute('aria-hidden', 'true');
    if (body.dataset.voyage) voyage.style.height = (+body.dataset.voyage) + 'vh';
    body.appendChild(voyage);

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
        var max = root.scrollHeight - window.innerHeight;
        return max > 0 ? clamp(window.scrollY / max) : 1;
    }

    function render(p) {
        var sky = skyAt(p);
        root.style.setProperty('--sky-top', sky[0]);
        root.style.setProperty('--sky-bottom', sky[1]);
        root.style.setProperty('--dusk', smooth(ramp(p, 0.3, 0.8)).toFixed(3));
        root.style.setProperty('--night', smooth(ramp(p, 0.8, 0.97)).toFixed(3));
        root.style.background = sky[0];

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

        // clouds drift apart and fade out through sunset
        var cf = ramp(p, 0.3, 0.6);
        clouds.forEach(function (c) {
            c.style.opacity = 1 - cf;
            c.style.transform = 'translateX(' + (+c.dataset.dir * p * 160) + 'px)';
        });

        // links fade in with Ursa Minor and only become clickable once visible
        var lo = smooth(ramp(p, 0.86, 0.98));
        links.forEach(function (a) {
            a.style.opacity = lo;
            a.style.visibility = lo > 0.01 ? 'visible' : 'hidden';
        });
        nav.classList.toggle('live', lo > 0.6);

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

    function timeName(p, theta) {
        var rising = theta !== null && theta !== undefined && ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) > Math.PI;
        if (rising) {
            return p < .18 ? 'midday' : p < .3 ? 'morning' : p < .42 ? 'sunrise' : p < .6 ? 'dawn'
                 : p < .8 ? 'first light' : p < .95 ? 'small hours' : 'midnight';
        }
        return p < .18 ? 'midday' : p < .3 ? 'afternoon' : p < .38 ? 'golden hour' : p < .5 ? 'sunset'
             : p < .64 ? 'dusk' : p < .82 ? 'twilight' : p < .95 ? 'night' : 'midnight';
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
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 21V4.5L14 2v19H5zm10 0V4h4v17h-4zM11 12.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>' +
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
            override = f.from + (f.to - f.from) * e;
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
        exitBtn.querySelector('span').textContent = view.exitLabel || 'back inside';
        setPlaying(false);
        var from = override === null ? shown : override;
        override = from;
        celest.theta = null;
        var ms = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 2400;
        clock.fade = { from: from, to: 1, t0: performance.now(), ms: ms };
        blendCelest(1, ms);
        ensureLoop();
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
        if (v.mode) body.classList.remove(v.mode + '-view');
        override = null;                                      // back to the time the scroll says
        kick();
        if (v.onClose) v.onClose();
    }
    exitBtn.addEventListener('click', closeSkyView);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeSkyView();
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
        if (!assetMemo[base]) assetMemo[base] = Promise.resolve().then(function () {
            var list = [];
            base.split('|').forEach(function (b) {
                b = b.trim();
                if (/\.(svg|gif|webp|png|jpe?g|json)$/i.test(b)) list.push(b);
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
        if (el.classList.contains('character')) addPoses(el, base.split('|')[0]);
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
    // a pose appears whenever the character has the matching class (.held, .startled)
    var POSES = ['held', 'startled'];
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

    /* ---------------- ?slots: see every slot on the page and whether it has art yet ---------------- */
    // open any page with ?slots on the end (…/city.html?slots) to get a list of its slots
    function showSlots() {
        if (!/[?&]slots\b/.test(location.search)) return;
        body.classList.add('show-slots');
        css(
            'body.show-slots [data-asset], body.show-slots [data-slot] { outline: 2px dashed rgba(255,70,140,.9); outline-offset: 2px; }' +
            'body.show-slots .has-art[data-asset], body.show-slots .has-art[data-slot] { outline-color: rgba(60,220,140,.95); }' +
            '.slot-panel { position: fixed; left: 12px; bottom: 12px; z-index: 50; max-height: 60vh; overflow: auto; padding: 10px 14px; border-radius: 8px;' +
                'background: rgba(20,16,12,.92); color: #f3e6c2; font: 13px/1.5 ui-monospace, Menlo, monospace; box-shadow: 0 6px 20px rgba(0,0,0,.5); }' +
            '.slot-panel b { display: block; font: italic 15px Georgia, serif; margin-bottom: 4px; }' +
            '.slot-panel .on { color: #7fe0a8; } .slot-panel .off { color: #c9b89a; opacity: .8; }'
        );
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
    function setupCharacters(scope) {
        (scope || document).querySelectorAll('.character').forEach(setupCharacter);
    }

    // run once every script on the page (grounds included) has built its pieces
    document.addEventListener('DOMContentLoaded', function () { setupCharacters(); fillAssets(); showSlots(); });

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
        var fromList = get(dir + 'list.txt').then(function (t) {
            if (!t || /<html/i.test(t)) return [];
            return clean(t.split(/\r?\n/).filter(function (l) { return l.trim() && !/^\s*#/.test(l); }));
        });
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
        folderCache[key] = Promise.all([fromList, fromServer, fromRepo]).then(function (all) {
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
        return folderCache[key].then(cb);
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

    /* ---------------- what grounds and page scripts can use ---------------- */
    window.Sky = {
        // run fn(p) every frame the scene changes; p goes 0 (noon) → 1 (midnight)
        onFrame: function (fn) { hooks.push(fn); fn(shown); },
        // run fn(go) when a sign or constellation is clicked; return true and
        // call go() yourself when your send-off animation is done
        onLeave: function (fn) { leaveHooks.push(fn); },
        openSkyView: openSkyView,
        closeSkyView: closeSkyView,
        listFolder: listFolder,
        inbox: BOTTLE_INBOX,
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
        holdTime: holdTime, releaseTime: releaseTime,
        fillAssets: fillAssets,
        svgArt: svgArt, layerArt: layerArt, fitLayerArt: fitLayerArt,
        findAsset: findAsset,
        setupCharacters: setupCharacters,
        figure: FIGURE,
        places: PLACES,
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

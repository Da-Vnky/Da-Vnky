/* =====================================================================
   sky.js — the shared sky: daylight → sunset → midnight as you scroll,
   sun, moon, clouds, stars, Ursa Minor, the night-sky links, and Polaris,
   which is always visible and always takes you home.

   Load it at the END of <body>, before any ground script:
       <script src="sky/sky.js"></script>
       <script src="sky/ground-sea.js"></script>   (or -countryside / -city)

   Page options (attributes on <body>):
       data-page="home"   this page IS the homepage (Polaris scrolls back up
                          to daylight instead of reloading)
       data-voyage="110"  how much empty sky to scroll through after your
                          content, in % of the screen height. more = slower sunset.
   ===================================================================== */

(function () {

    /* ======================= settings you can edit ======================= */

    // where Polaris takes you
    var HOME = 'https://dav-nky.pleroma.nexus/';

    // the four constellation links in the night sky (same on every page)
    var LINKS = [
        { text: 'link one',   href: '#' },
        { text: 'link two',   href: '#' },
        { text: 'link three', href: '#' },
        { text: 'link four',  href: '#' }
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
        '<svg class="sun" viewBox="-50 -50 100 100"><g fill="currentColor"><circle r="24"/>' + rays + '</g></svg>' +
        '<svg class="moon" viewBox="0 0 60 60"><path fill="currentColor" d="M30 2 A28 28 0 0 0 30 58 A36 36 0 0 1 30 2 Z"/></svg>' +
        '<svg class="cloud" data-dir="-1" style="left:3%;  top:14%; width:190px"><use href="#sky-cloud"/></svg>' +
        '<svg class="cloud" data-dir="1"  style="right:5%; top:26%; width:150px"><use href="#sky-cloud"/></svg>' +
        '<svg class="cloud hide-small" data-dir="1"  style="left:24%; top:5%;  width:130px"><use href="#sky-cloud"/></svg>' +
        '<svg class="cloud hide-small" data-dir="-1" style="right:22%; top:9%; width:170px"><use href="#sky-cloud"/></svg>' +
        '<svg class="cloud hide-small" data-dir="-1" style="left:12%; top:34%; width:110px"><use href="#sky-cloud"/></svg>';
    body.insertBefore(backdrop, body.firstChild);

    /* ---------------- Polaris ---------------- */
    var polaris = document.createElement('a');
    polaris.className = 'polaris';
    polaris.href = HOME;
    polaris.setAttribute('aria-label', 'return home');
    polaris.innerHTML =
        '<svg viewBox="-26 -26 52 52" aria-hidden="true">' +
            '<g class="rays">' +
                '<line x1="0" y1="-18" x2="0" y2="18"/><line x1="-18" y1="0" x2="18" y2="0"/>' +
                '<line x1="-8" y1="-8" x2="8" y2="8" opacity=".6"/><line x1="-8" y1="8" x2="8" y2="-8" opacity=".6"/>' +
            '</g>' +
            '<circle class="core" r="4.6"/>' +
        '</svg>' +
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
    var nav = document.createElement('nav');
    nav.className = 'sky-links';
    nav.setAttribute('aria-label', 'links');
    LINKS.slice(0, 4).forEach(function (l, i) {
        var a = document.createElement('a');
        a.className = 'sky-link l' + (i + 1);
        a.href = l.href;
        a.innerHTML = '<svg viewBox="0 0 150 80" aria-hidden="true">' + SHAPES[i] + '</svg><span></span>';
        a.querySelector('span').textContent = l.text;
        nav.appendChild(a);
    });
    body.appendChild(nav);

    /* ---------------- the stretch of sky after the content ---------------- */
    var voyage = document.createElement('div');
    voyage.className = 'voyage';
    voyage.setAttribute('aria-hidden', 'true');
    if (body.dataset.voyage) voyage.style.height = (+body.dataset.voyage) + 'vh';
    body.appendChild(voyage);

    /* ---------------- rooms: a window you can step out of ---------------- */
    var room = document.querySelector('.room');
    if (room) {
        var win = room.querySelector('.window');
        var back = document.createElement('button');
        back.className = 'back-inside';
        back.type = 'button';
        back.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 21V4.5L14 2v19H5zm10 0V4h4v17h-4zM11 12.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>' +
            '<span>back inside</span>';
        body.appendChild(back);

        body.classList.add('has-room');
        var fitWindow = function () {
            if (!win) return;
            if (room.classList.contains('outside')) return;
            var r = win.getBoundingClientRect(), rr = room.getBoundingClientRect();
            room.style.setProperty('--wx', (r.left - rr.left) + 'px');
            room.style.setProperty('--wy', (r.top - rr.top) + 'px');
            room.style.setProperty('--ww', r.width + 'px');
            room.style.setProperty('--wh', r.height + 'px');
            // how far to raise the ground so its bottom lines up with the bottom of the glass
            root.style.setProperty('--win-lift', (window.innerHeight - (r.bottom - 12)) + 'px');
        };
        fitWindow();
        window.addEventListener('resize', fitWindow);

        if (win) {
            win.addEventListener('click', function (e) {
                e.preventDefault();
                fitWindow();
                var r = win.getBoundingClientRect();
                room.style.transformOrigin = (r.left + r.width / 2) + 'px ' + (r.top + r.height / 2) + 'px';
                room.classList.add('outside');
                body.classList.add('is-outside');
            });
        }
        back.addEventListener('click', function () {
            room.classList.remove('outside');
            body.classList.remove('is-outside');
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && body.classList.contains('is-outside')) back.click();
        });
    }

    /* ---------------- the scroll engine ---------------- */
    var stars = backdrop.querySelector('.stars');
    var ursa  = backdrop.querySelector('.ursa');
    var sun   = backdrop.querySelector('.sun');
    var moon  = backdrop.querySelector('.moon');
    var clouds = Array.prototype.slice.call(backdrop.querySelectorAll('.cloud'));
    var links  = Array.prototype.slice.call(nav.querySelectorAll('.sky-link'));
    var hooks = [];

    function progress() {
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

        // sun: high on the right, sinks below the horizon by sunset
        var s = ramp(p, 0, 0.52);
        sun.style.left  = (80 + 10 * s) + 'vw';
        sun.style.top   = (12 + 80 * s * s) + 'vh';
        sun.style.color = mix('#f7d35e', '#e8683c', ramp(p, 0.28, 0.5));

        // moon: rises on the left after sunset, ends high (lower on phones, clear of Polaris)
        var m = ramp(p, 0.5, 0.95), moonEnd = window.innerWidth < 620 ? 30 : 14;
        moon.style.left = (7 + 9 * m) + 'vw';
        moon.style.top  = (92 - (92 - moonEnd) * (1 - (1 - m) * (1 - m))) + 'vh';

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

        for (var i = 0; i < hooks.length; i++) hooks[i](p);
    }

    // the scene eases toward the scroll position instead of snapping to it,
    // so a fast flick of the wheel reads as a smooth swell, not a jitter
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
    render(shown);

    /* ---------------- what grounds and page scripts can use ---------------- */
    window.Sky = {
        // run fn(p) every frame the scene changes; p goes 0 (noon) → 1 (midnight)
        onFrame: function (fn) { hooks.push(fn); fn(shown); },
        get progress() { return shown; },
        refresh: kick,
        isHome: isHome,
        home: HOME,
        css: css,
        mix: mix, clamp: clamp, ramp: ramp, smooth: smooth,
        seeded: seeded, hashStr: hashStr
    };
})();

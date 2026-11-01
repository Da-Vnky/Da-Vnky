/* =====================================================================
   crt.js — reset 1 is on a television (1 Nov). the bright, cheerful,
   false world of the first reset is something being watched: the whole
   site seen on an old cathode-ray set, the way a broadcast would show it.
   from reset 2 there's no screen any more (the film grain and the sea's
   camera take over: sky/postfx.js); the end of reset 1 switches the set
   off before the white comes (sky/forget.js calls Sky.crt.off).

     the picture   scanlines, the red-green-blue stripes of the tube's mask, colour
                   fringes on the words and round the screen's edges (red one side,
                   blue the other, the way the phosphor smears out there), a bright
                   band rolling slowly down, a faint flicker, the glass's glare (a
                   band of light along the top that curves down at the corners), and
                   the tube's dark rounded corners
     the broadcast a blinking red "● REC" and "LIVE", which camera this is (each page
                   and room has its own number) and how long the visit's been on air
     switching on  once a visit, the first page: the picture opens out of a bright line
     switching off at the end of reset 1: the picture squeezes to a line, then a dot

   STRENGTH below turns the whole set up or down (1 = as it is; .5 = half as strong;
   0 = no television at all). none of it with ?map. reduced motion: no flicker, no
   rolling band, no switching on or off, just the still picture.

   slots: assets/ui/crt-glass (the set's glass, laid over the whole screen and stretched
          to fit: glare, a bezel, a reflection; see-through where the picture shows.
          drawn till then)
   sounds: crt-on (the set warming up), crt-off (the set switched off): stand-ins till then
   its look: sky/css/crt.css
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave, root = document.documentElement;
    if (!Sky || Sky.crt) return;
    var STRENGTH = 1;                                    // how strong the whole set looks
    var still = matchMedia('(prefers-reduced-motion: reduce)');
    var on = !!S && S.reset === 1 && !root.classList.contains('dav-map') && STRENGTH > 0;
    if (!on) { Sky.crt = { on: false, off: function (done) { if (done) done(); } }; return; }
    var body = document.body, sfx = Sky.sfx || function () {};
    function session(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

    root.classList.add('crt-on');
    root.style.setProperty('--crt', STRENGTH);

    // which camera this is: each page, and each of the house's rooms, its own
    var PAGE = (location.pathname.replace(/.*\//, '').replace(/\.html$/, '') || 'index');
    var CAMS = { index: 1, workshop: 2, city: 3, template: 9, living: 4, bath: 5, hall: 6, kitchen: 7, porch: 8, attic: 10, front: 11, dungeon: 12 };

    var set = document.createElement('div');
    set.className = 'crt';
    set.setAttribute('aria-hidden', 'true');
    set.dataset.slot = 'assets/ui/crt-glass';
    set.innerHTML = '<i class="crt-lines"></i><i class="crt-mask"></i><i class="crt-roll"></i><i class="crt-flick"></i>' +
        '<div class="crt-glass" data-asset="assets/ui/crt-glass"><i class="crt-glare placeholder"></i></div>' +
        '<i class="crt-tube"></i><i class="crt-fringe"></i><i class="crt-arc"></i><i class="crt-rim"></i>' +
        '<div class="crt-live"><span class="crt-rec"><b class="crt-dot">●</b> REC</span><span>LIVE</span><span class="crt-cam"></span><span class="crt-time"></span></div>';
    body.appendChild(set);
    if (Sky.fillAssets) Sky.fillAssets(set);
    var cam = set.querySelector('.crt-cam'), time = set.querySelector('.crt-time');
    function camFor(where) { cam.textContent = 'CAM ' + ('0' + (CAMS[where] || CAMS[PAGE] || 1)).slice(-2); }
    camFor(PAGE);

    // on air since the visit's first page
    var since = +(session('crt-since') || 0);
    if (!since) { since = Date.now(); session('crt-since', String(since)); }
    function tick() {
        var t = Math.floor((Date.now() - since) / 1000), two = function (n) { return (n < 10 ? '0' : '') + n; };
        time.textContent = two(Math.floor(t / 3600)) + ':' + two(Math.floor(t / 60) % 60) + ':' + two(t % 60);
        if (Sky.house && Sky.house.where) camFor(Sky.house.where());     // (the house: whichever room they're in now)
    }
    tick();
    setInterval(tick, 1000);

    // switching on: once a visit, the first page (the picture opens out of a bright line)
    if (!session('crt-warm') && !still.matches) {
        session('crt-warm', '1');
        var boot = document.createElement('div');
        boot.className = 'crt-power crt-boot';
        boot.innerHTML = '<i class="cp-top"></i><i class="cp-bot"></i><i class="cp-line"></i>';
        body.appendChild(boot);
        sfx('crt-on', { or: 'shimmer', size: 0.4, volume: 0.5 });
        setTimeout(function () { boot.remove(); }, 1400);
    } else session('crt-warm', '1');

    // switching off (the end of reset 1, sky/forget.js): the picture squeezes to a line, then a dot, then done()
    var going = false;
    function off(done) {
        if (going) return;
        going = true;
        if (still.matches) {
            var dark = document.createElement('div');
            dark.className = 'crt-power crt-fade';
            body.appendChild(dark);
            setTimeout(function () { if (done) done(); }, 450);
            return;
        }
        var p = document.createElement('div');
        p.className = 'crt-power crt-shut';
        p.innerHTML = '<i class="cp-top"></i><i class="cp-bot"></i><i class="cp-line"></i>';
        body.appendChild(p);
        sfx('crt-off', { or: 'zap', size: 0.3, volume: 0.6 });
        setTimeout(function () { if (done) done(); }, 1250);
    }

    Sky.crt = { on: true, off: off, el: set, get strength() { return STRENGTH; } };
})();

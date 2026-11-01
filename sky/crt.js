/* =====================================================================
   crt.js — reset 1 is on a television (1 Nov). the bright, cheerful,
   false world of the first reset is something being watched: the whole
   site seen on an old cathode-ray set, the way a broadcast would show it.
   from reset 2 there's no screen any more (the film grain and the sea's
   camera take over: sky/postfx.js); the end of reset 1 switches the set
   off before the white comes (sky/forget.js calls Sky.crt.off).

     the picture   as if the set were being filmed by a camera (1 Nov, the artist's photos of
                   old televisions on film): the red-green-blue stripes of the tube's mask,
                   rainbow ripples drifting over the picture where the camera's pixels and
                   the mask's stripes don't line up (moiré), a dark band rolling slowly up
                   (the camera and the set not quite in step), the colours brighter and the
                   bright parts glowing, red and blue coming apart towards the edges, a faint
                   flicker, and the tube's rounded corners. no scanlines (the band does their
                   work, and both together was too busy) and no glare on the glass
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
    var SPLIT = 3;                                       // how far apart (px) red and blue come at the very edges of the screen
    var SPLIT_MIDDLE = .2;                               // … and in the middle, as a share of that
    var PUNCH = 1.25;                                    // how much brighter the colours (1 = as they are)
    var GLOW = .3, GLOW_PX = 3;                          // how much the bright parts glow, and how far (px)
    // (1 Nov: on a phone, much less, and none in the middle, and no glow, or the words can't be read)
    if (matchMedia('(max-width: 620px), (max-height: 500px)').matches) { SPLIT = 1.5; SPLIT_MIDDLE = 0; PUNCH = 1.15; GLOW = 0; }
    var still = matchMedia('(prefers-reduced-motion: reduce)');
    var on = !!S && S.reset === 1 && !root.classList.contains('dav-map') && STRENGTH > 0;
    if (!on) { Sky.crt = { on: false, off: function (done) { if (done) done(); } }; return; }
    var body = document.body, sfx = Sky.sfx || function () {};
    function session(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

    root.classList.add('crt-on');
    root.style.setProperty('--crt', STRENGTH);

    // the colours coming apart (1 Nov, the artist: "the screen should have chromatic aberration slightly higher at the very
    // edges affecting those pixels"): the whole picture through an SVG filter (on html, crt.css): its red pushed one way and
    // its blue the other, along the line out from the middle of the screen, a little everywhere and most at the edges. how
    // far, at each point, is a small picture (the map) the filter stretches over the screen, drawn again when it's resized
    var NS = 'http://www.w3.org/2000/svg';
    function splitMap(w, h) {
        var c = document.createElement('canvas'), W = 192, H = Math.max(2, Math.round(192 * h / w));
        c.width = W; c.height = H;
        var g = c.getContext('2d'), im = g.createImageData(W, H), d = im.data;
        for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
            var dx = (x + .5) / W - .5, dy = (y + .5) / H - .5, len = Math.hypot(dx, dy) || 1;
            var r = Math.max(Math.abs(dx), Math.abs(dy)) * 2, t = Math.max(0, Math.min(1, (r - .55) / .45));
            var e = SPLIT_MIDDLE + (1 - SPLIT_MIDDLE) * t * t * (3 - 2 * t), k = (y * W + x) * 4;
            d[k] = 128 + 127 * e * dx / len; d[k + 1] = 128 + 127 * e * dy / len; d[k + 2] = 128; d[k + 3] = 255;
        }
        g.putImageData(im, 0, 0);
        return c.toDataURL('image/png');
    }
    function channel(keep) {                             // one colour of the picture (r, g or b), the others dark
        var m = { r: '1 0 0 0 0', g: '0 1 0 0 0', b: '0 0 1 0 0' }, z = '0 0 0 0 0';
        return [keep === 'r' ? m.r : z, keep === 'g' ? m.g : z, keep === 'b' ? m.b : z, '0 0 0 1 0'].join('  ');
    }
    var lens = null;
    function splitFilter() {
        var w = root.clientWidth || innerWidth, h = Math.max(root.clientHeight, innerHeight);
        if (!lens) {
            lens = document.createElementNS(NS, 'svg');
            lens.setAttribute('class', 'crt-defs');
            lens.setAttribute('aria-hidden', 'true');
            lens.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
            lens.innerHTML = '<filter id="crt-split" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
                '<feImage result="map" preserveAspectRatio="none"/>' +
                '<feColorMatrix in="SourceGraphic" type="matrix" values="' + channel('r') + '" result="r"/>' +
                '<feDisplacementMap in="r" in2="map" xChannelSelector="R" yChannelSelector="G" result="r2"/>' +
                '<feColorMatrix in="SourceGraphic" type="matrix" values="' + channel('g') + '" result="g"/>' +
                '<feColorMatrix in="SourceGraphic" type="matrix" values="' + channel('b') + '" result="b"/>' +
                '<feDisplacementMap in="b" in2="map" xChannelSelector="R" yChannelSelector="G" result="b2"/>' +
                '<feComposite in="r2" in2="g" operator="arithmetic" k2="1" k3="1" result="rg"/>' +
                '<feComposite in="rg" in2="b2" operator="arithmetic" k2="1" k3="1" result="pic"/>' +
                // (the colours as a camera films a television: fuller, a little more contrast)
                '<feColorMatrix in="pic" type="saturate" values="' + PUNCH + '" result="vivid"/>' +
                '<feComponentTransfer in="vivid" result="punchy">' + ['R', 'G', 'B'].map(function (c) {
                    return '<feFunc' + c + ' type="linear" slope="1.08" intercept="-0.03"/>'; }).join('') + '</feComponentTransfer>' +
                // (the glow: only the brightest parts, blurred and added back over the picture)
                (GLOW > 0 ? '<feComponentTransfer in="punchy" result="hot">' + ['R', 'G', 'B'].map(function (c) {
                    return '<feFunc' + c + ' type="linear" slope="2.6" intercept="-1.6"/>'; }).join('') + '</feComponentTransfer>' +
                    '<feGaussianBlur in="hot" stdDeviation="' + GLOW_PX + '" result="bloom"/>' +
                    '<feComposite in="punchy" in2="bloom" operator="arithmetic" k2="1" k3="' + (GLOW * STRENGTH) + '"/>' : '') +
                '</filter>';
            body.appendChild(lens);
        }
        var f = lens.querySelector('filter'), img = lens.querySelector('feImage'), maps = lens.querySelectorAll('feDisplacementMap');
        ['x', 'y'].forEach(function (a) { f.setAttribute(a, 0); img.setAttribute(a, 0); });
        f.setAttribute('width', w); f.setAttribute('height', h);
        img.setAttribute('width', w); img.setAttribute('height', h);
        img.setAttribute('href', splitMap(w, h));
        maps[0].setAttribute('scale', -2 * SPLIT * STRENGTH);         // red outwards
        maps[1].setAttribute('scale', 2 * SPLIT * STRENGTH);          // blue inwards
        root.classList.add('crt-split');
    }
    // it's the dearest part of the set to draw (the whole picture, every frame), so once a visit, on its first page, the
    // browser is timed with it and without it: if it slows things down a lot on this computer, it stays off for the visit
    // (sessionStorage crt-split: on / off) and the rest of the set carries on
    function frames(ms, done) {                          // the average time a frame takes, over ms
        var t0 = 0, n = 0;
        (function f(now) {
            if (!t0) t0 = now;
            else n++;
            if (now - t0 < ms) requestAnimationFrame(f);
            else done((now - t0) / Math.max(1, n));
        })(0);
    }
    function settle() {
        if (document.hidden) { document.addEventListener('visibilitychange', function again() { document.removeEventListener('visibilitychange', again); settle(); }); return; }
        setTimeout(function () {
            frames(1500, function (withIt) {
                if (withIt < 22) { session('crt-split', 'on'); return; }                 // (45 frames a second or better: fine)
                root.classList.remove('crt-split');
                frames(1500, function (without) {
                    var off = withIt > without * 1.35;
                    session('crt-split', off ? 'off' : 'on');
                    root.classList.toggle('crt-split', !off);
                });
            });
        }, 2500);                                                                     // (after the page has settled down)
    }
    var told = session('crt-split');
    if (SPLIT > 0 && told !== 'off') {
        splitFilter();
        var resized = null;
        addEventListener('resize', function () { clearTimeout(resized); resized = setTimeout(splitFilter, 250); });
        if (!told) settle();
    }

    // which camera this is: each page, and each of the house's rooms, its own
    var PAGE = (location.pathname.replace(/.*\//, '').replace(/\.html$/, '') || 'index');
    var CAMS = { index: 1, workshop: 2, city: 3, template: 9, living: 4, bath: 5, hall: 6, kitchen: 7, porch: 8, attic: 10, front: 11, dungeon: 12 };

    var set = document.createElement('div');
    set.className = 'crt';
    set.setAttribute('aria-hidden', 'true');
    set.dataset.slot = 'assets/ui/crt-glass';
    set.innerHTML = '<i class="crt-mask"></i><i class="crt-moire"></i><i class="crt-roll"></i><i class="crt-flick"></i>' +
        '<div class="crt-glass" data-asset="assets/ui/crt-glass"></div><i class="crt-tube"></i>' +
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

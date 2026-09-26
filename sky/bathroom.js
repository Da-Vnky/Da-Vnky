/* =====================================================================
   bathroom.js — the living space has a bathroom off to the right.
   The see-through arrow under the tabs sends the traveller walking over;
   the room slides away and the bathroom slides in. Click the mirror to
   look into it. The arrow on the left (or Escape) walks you back.

   Everything is a slot (see the comments in living.html):
     assets/living/arrow            the arrow (pointing right; flipped for the way back)
     assets/living/bath-wall, bath-floor, bath-mirror, bath-sink, bath-tub, bath-towel, bath-shelf, bath-mat
     assets/characters/living-walking     the traveller walking (living space)
     assets/characters/bathroom           the traveller in the bathroom (+ bathroom-walking)
     assets/characters/reflection         what you see in the mirror
     assets/living/mirror-close           the mirror's frame up close (a PNG with a see-through middle)
     assets/fonts/mirror.woff2            the lettering in the text box (or .woff / .ttf / .otf)
     assets/sounds/step, blip, shimmer    footsteps, the text typing out, looking into the mirror
   The words: data-say on the mirror in living.html.
   Open living.html#bathroom to start in there.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var bath = document.querySelector('.bathroom');
    var room = document.querySelector('.room');
    var go = document.querySelector('.room-arrow.to-bath');
    if (!Sky || !bath || !room || !go) return;
    var mirror = bath.querySelector('.bath-mirror');
    var home = room.querySelector('.scene-character');
    var me = bath.querySelector('.character');
    var body = document.body;

    var ARROW = '<svg class="placeholder" viewBox="0 0 60 60" aria-hidden="true">' +
        '<circle cx="30" cy="30" r="27" fill="rgba(243,230,194,.16)" stroke="rgba(243,230,194,.55)" stroke-width="2"/>' +
        '<path d="M22 16 L38 30 L22 44" fill="none" stroke="#f3e6c2" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    Array.prototype.forEach.call(document.querySelectorAll('.room-arrow'), function (a) { if (!a.querySelector('.placeholder, img')) a.insertAdjacentHTML('afterbegin', ARROW); });
    // door hints: the words on hover
    Array.prototype.forEach.call(document.querySelectorAll('.side-door[data-hint]'), function (d) {
        var h = document.createElement('span'); h.className = 'door-hint'; h.textContent = d.dataset.hint; d.appendChild(h);
    });

    Sky.css(
        // the arrows: see-through until you point at them
        '.room-arrow, .room-arrow:hover { padding: 0; background: none; text-shadow: none; }' +
        '.room-arrow { position: fixed; z-index: 5; width: 54px; height: 54px; display: block; opacity: .5; transition: opacity .25s, transform .25s, visibility 0s;' +
            'filter: drop-shadow(0 2px 4px rgba(0,0,0,.45)); -webkit-tap-highlight-color: transparent; }' +
        '.room-arrow:hover, .room-arrow:focus-visible { opacity: 1; transform: translateX(4px); outline: none; }' +
        '.room-arrow > svg, .room-arrow > .art { display: block; width: 100%; height: 100%; object-fit: contain; }' +
        '.room-arrow.to-bath { right: 14px; top: 60vh; }' +
        '.room-arrow.to-hall { left: 14px; top: 60vh; }' +
        '.room-arrow.to-hall > svg, .room-arrow.to-hall > .art { transform: scaleX(-1); }' +
        '.room-arrow.to-hall:hover, .room-arrow.to-hall:focus-visible { transform: translateX(-4px); }' +
        '.room-arrow.to-living { position: absolute; left: 14px; top: 50%; margin-top: -27px; }' +
        '.room-arrow.to-living > svg, .room-arrow.to-living > .art { transform: scaleX(-1); }' +
        '.room-arrow.to-living:hover, .room-arrow.to-living:focus-visible { transform: translateX(-4px); }' +
        '.room-arrow.back-right { position: absolute; right: 14px; top: 74%; margin-top: -27px; }' +
        'body.in-side .room-arrow.to-bath, body.in-side .room-arrow.to-hall, body.side-walking .room-arrow, body.leaving .room-arrow, body.sky-view .room-arrow, body.is-outside .room-arrow,' +
        'body.gallery-open .room-arrow, body.records-open .room-arrow, body.crate-open .room-arrow, body.frame-open .room-arrow, body.mirror-open .room-arrow,' +
        'body.art-open .room-arrow, body.visitors-open .room-arrow { opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .3s, visibility 0s .3s; }' +

        // the bathroom: waits off to the right, slides in as the living space slides out
        // (where they wait, hidden, is in sky/sky.css, so they're in place from the very first frame;
        //  the slide is only switched on once the page is ready: body.sides-ready)
        'body.sides-ready .bathroom, body.sides-ready .hallway { transition: transform .9s cubic-bezier(.55, 0, .25, 1), visibility 0s .9s; }' +
        '.bathroom { position: fixed; inset: 0; z-index: 3; overflow: hidden; transform: translateX(100%); visibility: hidden;' +
            '--bath-wall: #a9bfb6; --bath-tile: #e9ece5; --bath-grout: rgba(90,110,105,.35); --floor-h: 10vh;' +
            'background: linear-gradient(transparent 55%, rgba(0,0,0,.18) 55%, rgba(0,0,0,.18) calc(55% + 6px), transparent calc(55% + 6px)),' +
            'linear-gradient(var(--bath-wall) 55%, transparent 55%),' +
            'repeating-linear-gradient(to right, transparent 0 58px, var(--bath-grout) 58px 60px),' +
            'repeating-linear-gradient(to bottom, transparent 0 38px, var(--bath-grout) 38px 40px), var(--bath-tile); }' +
        '.bathroom > .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }' +
        '.bathroom::after { content: ""; position: absolute; inset: 0; z-index: 4; pointer-events: none;' +
            'background: linear-gradient(rgba(10,14,30,calc(.4 * var(--dusk))), rgba(10,14,30,calc(.4 * var(--dusk)))); }' +
        'body.in-bath .bathroom { transform: none; visibility: visible; transition: transform .9s cubic-bezier(.55, 0, .25, 1), visibility 0s; }' +
        'body.in-bath .room { transform: translateX(-100%); }' +
        'body.bath-panning .bathroom { visibility: visible; transition: transform .9s cubic-bezier(.55, 0, .25, 1), visibility 0s; }' +
        'body.in-side .sky-links, body.in-side .sky-links * { visibility: hidden !important; }' +      // (no sky through these walls)
        // the hallway: waits off to the left
        '.hallway { position: fixed; inset: 0; z-index: 3; overflow: hidden; transform: translateX(-100%); visibility: hidden; --floor-h: 11vh;' +
            'background: linear-gradient(transparent 62%, #3a2a1f 62%, #3a2a1f calc(62% + 10px), transparent calc(62% + 10px)),' +
            'repeating-linear-gradient(90deg, transparent 0 88px, rgba(0,0,0,.22) 88px 91px) 0 62% / 100% 38% no-repeat,' +
            'linear-gradient(#4d3a2c 62%, #5b4331 62%),' +
            'repeating-linear-gradient(90deg, rgba(255,230,190,.05) 0 26px, transparent 26px 52px); }' +
        '.hallway > .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }' +
        '.hallway::after { content: ""; position: absolute; inset: 0; z-index: 4; pointer-events: none;' +
            'background: radial-gradient(ellipse at 50% 12%, rgba(255,200,120,calc(.18 + .12 * var(--dusk))), transparent 55%), linear-gradient(rgba(10,14,30,calc(.35 * var(--dusk))), rgba(10,14,30,calc(.35 * var(--dusk)))); }' +
        'body.in-hall .hallway { transform: none; visibility: visible; transition: transform .9s cubic-bezier(.55, 0, .25, 1), visibility 0s; }' +
        'body.in-hall .room { transform: translateX(100%); }' +
        'body.hall-panning .hallway { visibility: visible; transition: transform .9s cubic-bezier(.55, 0, .25, 1), visibility 0s; }' +
        // the dungeon: waits underneath; the living space rises away as it comes up
        'body.sides-ready .dungeon { transition: transform 1.1s cubic-bezier(.55, 0, .25, 1), visibility 0s 1.1s; }' +
        'body.in-dungeon .dungeon { transform: none; visibility: visible; transition: transform 1.1s cubic-bezier(.55, 0, .25, 1), visibility 0s; }' +
        'body.in-dungeon .room { transform: translateY(-100%); transition: transform 1.1s cubic-bezier(.55, 0, .25, 1), visibility 0s; }' +
        'body.dungeon-panning .dungeon { visibility: visible; transition: transform 1.1s cubic-bezier(.55, 0, .25, 1), visibility 0s; }' +
        'body.dungeon-panning .room { transition: transform 1.1s cubic-bezier(.55, 0, .25, 1), visibility 0s; }' +
        '.room.rumble { animation: dg-rumble .09s linear infinite alternate; }' +
        '@keyframes dg-rumble { from { transform: translate(-1px, 1px); } to { transform: translate(1px, -1px); } }' +
        '.shelf-book { cursor: pointer; z-index: 3; transform-origin: 50% 100%; transition: transform .5s cubic-bezier(.3,1.6,.5,1), filter .25s; }' +
        '.shelf-book > svg, .shelf-book > .art { display: block; width: 100%; height: 100%; object-fit: contain; }' +
        '.shelf-book:hover, .shelf-book:focus-visible { filter: drop-shadow(0 0 6px rgba(255,220,150,.7)); outline: none; }' +
        '.shelf-book.pulled { transform: rotate(-24deg) translateX(-12%); }' +
        '.shelf-book .sb-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap; font-style: italic; font-size: .9rem;' +
            'color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.8); opacity: 0; transition: opacity .25s; pointer-events: none; }' +
        '.shelf-book:hover .sb-hint, .shelf-book:focus-visible .sb-hint { opacity: 1; }' +
        // the secret door: a panel of wall that slides away (behind the rest of the wall) on the stairs down
        '.secret-door .sd-hole, .secret-door .sd-panel { position: absolute; inset: 0; }' +
        '.secret-door .sd-hole > svg, .secret-door .sd-hole > .art, .secret-door .sd-panel > .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; display: block; }' +
        // closed, it's just the wall (and a hairline seam, if you look). opening, the wall slides away to the left,
        // uncovering the stairwell behind it. (your own panel picture, if you give one, covers it until it slides)
        '.secret-door .sd-hole { clip-path: inset(0 0 0 100%); transition: clip-path 2.4s cubic-bezier(.6,0,.35,1); }' +
        '.secret-door.open .sd-hole { clip-path: inset(0 0 0 0); }' +
        '.secret-door .sd-panel { transition: transform 2.4s cubic-bezier(.6,0,.35,1); z-index: 1; pointer-events: none; }' +
        '.secret-door .sd-panel > .placeholder { position: absolute; inset: 0; box-shadow: inset 0 0 0 1px rgba(0,0,0,.14); }' +
        '.secret-door .sd-panel::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: linear-gradient(90deg, rgba(0,0,0,.45), transparent); opacity: 0; transition: opacity .4s; }' +
        '.secret-door.open .sd-panel { transform: translateX(-100%); }' +
        '.secret-door.open .sd-panel > .placeholder { box-shadow: none; }' +
        '.secret-door.open { cursor: pointer; box-shadow: inset 0 0 0 3px #1f1610; }' +
        '.secret-door .sd-flame { position: absolute; left: 22.6%; top: 13%; width: 5%; aspect-ratio: 1 / 2.2; border-radius: 50% 50% 50% 50% / 64% 64% 36% 36%; opacity: 0;' +
            'background: radial-gradient(ellipse at 50% 72%, #fff8d8 0 18%, #ffd36a 34%, #ff8a2a 62%, rgba(255,90,20,0) 72%); filter: blur(.3px) drop-shadow(0 0 4px #ff9a40);' +
            'transform-origin: 50% 90%; animation: sd-flame 1.6s ease-in-out infinite; transition: opacity 1s 1.4s; }' +
        '.secret-door.open .sd-flame { opacity: 1; }' +
        '.secret-door .sd-hole.has-art .sd-flame, .secret-door .sd-hole:has(.art) ~ .sd-flame { display: none; }' +
        '@keyframes sd-flame { 0%, 100% { transform: rotate(-3deg) scaleY(1); } 33% { transform: rotate(3deg) scaleY(1.1); } 66% { transform: rotate(-1deg) scaleY(.92); } }' +
        // going down the stairs, and coming back up them
        '.room .scene-character.descending { animation: sd-down .9s ease-in forwards; }' +
        '.room .scene-character.ascending { animation: sd-down .9s ease-out .5s reverse both; }' +
        '@keyframes sd-down { from { translate: 0 0; scale: 1; opacity: 1; } to { translate: 0 6%; scale: .82; opacity: 0; } }' +
        '.room-arrow.to-upstairs { position: absolute; left: 14px; top: 50%; margin-top: -27px; }' +
        '.room-arrow.to-upstairs > svg, .room-arrow.to-upstairs > .art { transform: rotate(-90deg); }' +
        '.room-arrow.to-upstairs:hover, .room-arrow.to-upstairs:focus-visible { transform: translateY(-4px); }' +
        '.hallway .furnish { position: absolute; z-index: 2; }' +
        '.hallway .room-floor { position: absolute; left: 0; right: 0; bottom: 0; height: var(--floor-h); min-height: 34px; z-index: 1; pointer-events: none; }' +
        '.hallway .room-floor .placeholder, .hallway .room-floor > .art { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: fill; }' +
        '.hallway .room-floor .placeholder { border-top: 9px solid #2e2118; box-shadow: 0 -3px 8px rgba(0,0,0,.3);' +
            'background: linear-gradient(rgba(0,0,0,.3), transparent 45%), repeating-linear-gradient(to bottom, transparent 0 13px, rgba(0,0,0,.3) 13px 15px), repeating-linear-gradient(to right, transparent 0 138px, rgba(0,0,0,.22) 138px 140px), #4a3322; }' +
        '.side-door, .side-door:hover { padding: 0; background: none; text-shadow: none; cursor: pointer; }' +
        '.side-door > svg, .side-door > .art { display: block; width: 100%; height: 100%; object-fit: contain; }' +
        '.side-door .leaf { transform-box: fill-box; transform-origin: 0 50%; transition: transform .45s cubic-bezier(.5,0,.3,1); }' +
        '.side-door.open .leaf { transform: scaleX(.14); }' +
        '.side-door.open:not(.has-open) > .art { opacity: .35; transition: opacity .4s; }' +
        '.side-door .door-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap; font-style: italic;' +
            'font-size: .95rem; color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.7); opacity: 0; transition: opacity .25s; pointer-events: none; }' +
        '.side-door:hover .door-hint, .side-door:focus-visible .door-hint { opacity: 1; }' +
        '.side-door:hover, .side-door:focus-visible { filter: drop-shadow(0 0 10px rgba(255,220,150,.45)); outline: none; }' +
        '.hall-character { transition-property: left; transition-timing-function: linear; }' +
        '.bathroom .furnish { position: absolute; z-index: 2; }' +
        '.bathroom .room-floor { position: absolute; left: 0; right: 0; bottom: 0; height: var(--floor-h); min-height: 34px; z-index: 1; pointer-events: none; }' +
        '.bathroom .room-floor .placeholder, .bathroom .room-floor > .art { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: fill; }' +
        '.bathroom .room-floor .placeholder { border-top: 7px solid #d5d9d2; box-shadow: 0 -3px 8px rgba(0,0,0,.2);' +
            'background: linear-gradient(rgba(0,0,0,.22), transparent 45%), repeating-conic-gradient(#e4e0d4 0 25%, #3d3b36 0 50%) 0 0 / 44px 44px; }' +
        '.bath-mirror { cursor: zoom-in; filter: drop-shadow(0 6px 8px rgba(0,0,0,.35)); transition: transform .25s; }' +
        '.bath-mirror:hover, .bath-mirror:focus-visible { transform: translateY(-2px); outline: none; }' +
        '.bath-mirror > svg, .bath-mirror > .art { display: block; width: 100%; height: 100%; object-fit: contain; }' +
        '.bath-mirror .bm-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap; font-style: italic;' +
            'font-size: .9rem; color: #2a1d14; text-shadow: 0 1px 2px rgba(255,255,255,.6); opacity: 0; transition: opacity .25s; pointer-events: none; }' +
        '.bath-mirror:hover .bm-hint, .bath-mirror:focus-visible .bm-hint { opacity: 1; }' +
        '.bath-character { transition-property: left; transition-timing-function: linear; }' +
        '.room .scene-character { transition-property: left; transition-timing-function: linear; }' +

        // the mirror, up close
        '.mirror-view { position: fixed; inset: 0; z-index: 9; background: #000; display: grid; place-items: center; padding: 4vh 16px 26vh;' +
            'visibility: hidden; opacity: 0; transition: opacity .6s, visibility 0s .6s; cursor: pointer; }' +
        '.mirror-view.open { visibility: visible; opacity: 1; transition: opacity .6s; }' +
        '.mv-mirror { position: relative; height: min(62vh, 120vw); aspect-ratio: 3 / 4; }' +
        '.mv-glass { position: absolute; inset: 0; overflow: hidden; border-radius: 50% 50% 6px 6px / 38% 38% 6px 6px; border: 14px solid #b8862e;' +
            'box-shadow: inset 0 0 0 2px #7a5418, 0 0 60px rgba(255,255,255,.08); background: linear-gradient(160deg, #cfe0e2, #6f8f96); }' +
        '.mirror-view.has-frame .mv-glass { border: 0; box-shadow: none; inset: var(--mirror-inset, 12%); }' +
        '.mv-frame { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; pointer-events: none; }' +
        '.mv-reflection { position: absolute; left: 50%; bottom: 0; height: 86%; transform: translateX(-50%); }' +
        '.mv-reflection > svg, .mv-reflection > .art { display: block; height: 100%; width: auto; }' +
        '.mv-glass::after { content: ""; position: absolute; inset: 0; pointer-events: none;' +
            'background: linear-gradient(125deg, transparent 20%, rgba(255,255,255,.22) 26%, transparent 34%, transparent 44%, rgba(255,255,255,.12) 48%, transparent 54%); }' +
        '.mv-text { position: absolute; left: 50%; bottom: 5vh; transform: translateX(-50%); width: min(880px, calc(100vw - 32px)); box-sizing: border-box; min-height: 7.2em;' +
            'padding: 22px 30px; background: #000; border: 5px solid #fff; color: #fff; text-align: left;' +
            'font: 1.7rem/1.45 "mirror", "VT323", "Courier New", monospace; letter-spacing: .02em; }' +
        '.mv-text .mv-words::before { content: "* "; }' +
        '.mv-text .mv-more { position: absolute; right: 14px; bottom: 8px; font-size: 1rem; opacity: 0; transition: opacity .4s; }' +
        '.mirror-view.done .mv-more { opacity: .6; }' +
        'body.mirror-open .place-tabs, body.mirror-open .cp { opacity: 0; pointer-events: none; }' +
        '@media (max-width: 620px) { .mv-text { font-size: 1.25rem; padding: 16px 18px; } }' +
        '@media (prefers-reduced-motion: reduce) { .room.rumble { animation: none; } .bathroom, .hallway, .dungeon, .bath-character, .hall-character, .room .scene-character { transition-duration: 0s !important; } }'
    );

    /* ---------------- the arrows sit just under the tabs (the hallway's on the left) ---------------- */
    function placeArrows() {
        var tabs = document.querySelector('.place-tabs');
        if (!tabs) return;
        var r = tabs.getBoundingClientRect(), h = go.offsetHeight || 54;
        var top = r.bottom + 18;
        if (top + h > window.innerHeight - 12) top = r.top - h - 14;      // no room below (small screens): just above
        go.style.top = Math.round(top) + 'px';
        go.style.right = '8px';
        var left = document.querySelector('.room-arrow.to-hall');
        if (left) { left.style.top = Math.round(top) + 'px'; left.style.left = '8px'; }
        // and the arrows back from the side rooms: the same height, so going and coming back they don't jump about
        Array.prototype.forEach.call(document.querySelectorAll('.bathroom .room-arrow, .hallway .room-arrow, .dungeon .room-arrow'), function (a) {
            a.style.top = Math.round(top) + 'px';
            a.style.marginTop = '0';
            if (a.classList.contains('back-right')) a.style.right = '8px'; else a.style.left = '8px';
        });
    }
    placeArrows();
    window.addEventListener('resize', placeArrows);
    window.addEventListener('load', placeArrows);
    setTimeout(placeArrows, 400);

    /* ---------------- walking ---------------- */
    function leftPct(el) {
        var p = el.offsetParent || el.parentNode;
        return parseFloat(getComputedStyle(el).left) / (p.clientWidth || window.innerWidth) * 100;
    }
    function walkSecs(el, to) {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 0.01;
        var W = window.innerWidth, px = Math.abs(to - leftPct(el)) / 100 * W, speed = Math.max(260, W * 0.3);   // px a second
        return Math.max(0.3, Math.min(2.2, px / speed));
    }
    function walk(el, to, done) {
        var from = leftPct(el), secs = walkSecs(el, to);
        el.classList.toggle('face-left', to < from);
        el.classList.add('walking');
        el.classList.remove('talking');
        el.style.transitionDuration = secs + 's';
        void el.offsetWidth;
        el.style.left = to + '%';
        var steps = setInterval(function () { if (Sky.sounds) Sky.sounds.sfx('step', { size: 0.5 + Math.random() * 0.3 }); }, 380);
        setTimeout(function () {
            clearInterval(steps);
            el.classList.remove('walking');
            el.style.transitionDuration = '0s';
            if (done) done();
        }, secs * 1000 + 30);
    }
    function place(el, at, faceLeft) {
        el.style.transitionDuration = '0s';
        el.style.left = at + '%';
        el.classList.toggle('face-left', !!faceLeft);
        void el.offsetWidth;
    }

    /* ---------------- the rooms either side: the bathroom (right) and the hallway (left) ----------------
       the traveller walks off that edge, the living space slides away and the other room slides in;
       they walk in from the edge you'd expect. living.html#bathroom / #hallway starts you in there. */
    var SIDES = [
        { name: 'bath', el: bath, go: go, dir: 1, hash: '#bathroom' },
        { name: 'hall', el: document.querySelector('.hallway'), go: document.querySelector('.room-arrow.to-hall'), dir: -1, hash: '#hallway' },
        // the dungeon is underneath: pull the loose book on the bookshelf and down you go (dir 0: up and down, not sideways)
        { name: 'dungeon', el: document.querySelector('.dungeon'), go: document.querySelector('.shelf-book:not(.decoy)'), dir: 0, hash: '#dungeon', enterAt: 9 }
    ].filter(function (sd) { return sd.el && sd.go; });
    // the living space's tab only counts as "you are here" in the living space itself (and the bathroom),
    // not out in the hallway or down in the dungeon: from there, it takes you back in
    var livingTab = document.querySelector('.place-tab[data-place=living]');
    function tabHere(on) {
        if (!livingTab) return;
        livingTab.classList.toggle('here', on);
        if (on) livingTab.setAttribute('aria-current', 'page'); else livingTab.removeAttribute('aria-current');
        livingTab.setAttribute('role', on ? 'text' : 'link');
        livingTab.tabIndex = on ? -1 : 0;
        var nm = livingTab.querySelector('.pt-name');
        if (nm) nm.textContent = nm.textContent.replace(/ · you are here$/, '') + (on ? ' · you are here' : '');
    }
    if (livingTab) {
        livingTab.addEventListener('click', function (e) { if (inSide && inSide.name !== 'bath') { e.preventDefault(); goHome(); } });
        livingTab.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && inSide && inSide.name !== 'bath') { e.preventDefault(); goHome(); } });
    }
    var homeAt = home ? leftPct(home) : 34, busy = false, inSide = null;
    SIDES.forEach(function (sd) {
        sd.me = sd.el.querySelector('.character');
        sd.back = sd.el.querySelector('.room-arrow');
        sd.standAt = sd.me ? leftPct(sd.me) : 40;
    });
    var OFF = { '1': 104, '-1': -14 };                       // just past the right / left edge
    var secret = document.querySelector('.secret-door');
    function doorAt() { return (secret.offsetLeft + secret.offsetWidth / 2 - home.offsetWidth / 2) / (room.clientWidth || window.innerWidth) * 100; }
    function openDoor(quiet) {
        if (!secret || secret.classList.contains('open')) return;
        secret.classList.add('open');
        secret.setAttribute('role', 'button'); secret.tabIndex = 0;
        try { sessionStorage.setItem('secret-open', '1'); } catch (e) {}
        if (quiet) { var p = secret.querySelector('.sd-panel'), h = secret.querySelector('.sd-hole'); p.style.transition = h.style.transition = 'none'; void p.offsetWidth; setTimeout(function () { p.style.transition = h.style.transition = ''; }, 50); }
    }
    function closeDoor() {
        if (!secret || !secret.classList.contains('open')) return;
        secret.classList.remove('open');
        secret.removeAttribute('role'); secret.removeAttribute('tabindex');
        try { sessionStorage.removeItem('secret-open'); } catch (e) {}
    }
    // the book pulled again, with the wall open: it grinds shut
    function pullShut(sd) {
        if (busy || inSide) return;
        busy = true;
        body.classList.add('side-walking');
        var from = home ? leftPct(home) : 0, at = bookAt();
        if (Math.abs(from - at) < 8) from = at - 9;                      // (and then out of the way of the book, so it can be pulled again)
        var shut = function () {
            if (home) home.classList.remove('face-left');
            sd.go.classList.add('pulled');
            if (Sky.sounds) Sky.sounds.sfx('book');
            setTimeout(function () { room.classList.add('rumble'); closeDoor(); if (Sky.sounds) Sky.sounds.sfx('wall-slide'); }, 500);
            setTimeout(function () {
                room.classList.remove('rumble'); sd.go.classList.remove('pulled');
                var done = function () { busy = false; body.classList.remove('side-walking'); };
                if (home) walk(home, from, done); else done();
            }, 2900);
        };
        if (home) walk(home, at, shut); else shut();
    }
    try { if (sessionStorage.getItem('secret-open') === '1' || location.hash === '#dungeon') openDoor(true); } catch (e) {}
    function bookAt() { return (sd0().go.offsetLeft + sd0().go.offsetWidth / 2 - home.offsetWidth / 2) / (room.clientWidth || window.innerWidth) * 100; }
    function sd0() { return SIDES.filter(function (x) { return x.dir === 0; })[0]; }
    function goTo(sd, instant) {
        if (busy || inSide) return;
        busy = true; inSide = sd;
        body.classList.add('side-walking');
        homeAt = home ? leftPct(home) : homeAt;
        if (sd.name !== 'bath') tabHere(false);
        function slide() {
            sd.el.setAttribute('aria-hidden', 'false');
            if (sd.me) place(sd.me, sd.dir > 0 ? 2 : sd.dir < 0 ? 90 : sd.enterAt, sd.dir < 0);       // in from the edge (or the stairs) you came through
            body.classList.add(sd.name + '-panning', 'in-' + sd.name, 'in-side');
            fire('enter', sd);
            setTimeout(function () {
                body.classList.remove(sd.name + '-panning');
                var arrive = function () { busy = false; body.classList.remove('side-walking'); if (sd.me) sd.me.classList.remove('face-left'); };
                if (sd.me) walk(sd.me, sd.standAt, arrive); else arrive();
            }, instant ? 0 : 900);
            try { history.replaceState(null, '', sd.hash); } catch (e) {}
        }
        if (instant || !home) {
            if (instant) { sd.el.style.transition = room.style.transition = 'none'; }
            slide();
            if (instant) { void sd.el.offsetWidth; if (sd.me) place(sd.me, sd.standAt); setTimeout(function () { sd.el.style.transition = room.style.transition = ''; }, 50); }
            return;
        }
        if (sd.dir === 0) {
            // the stairs: over to the open wall, and down (the room rises away as they go)
            var down = function () {
                walk(home, doorAt(), function () {
                    home.classList.remove('face-left');
                    home.classList.add('descending');
                    if (Sky.sounds) Sky.sounds.sfx('step', { size: 0.4 });
                    setTimeout(function () { slide(); setTimeout(function () { home.classList.remove('descending'); }, 1200); }, 800);
                });
            };
            if (secret && secret.classList.contains('open')) { down(); return; }
            // first, over to the bookshelf and pull the book: the wall under the paintings grinds open
            walk(home, bookAt(), function () {
                home.classList.remove('face-left');
                sd.go.classList.add('pulled');
                if (Sky.sounds) Sky.sounds.sfx('book');
                setTimeout(function () { room.classList.add('rumble'); openDoor(); if (Sky.sounds) Sky.sounds.sfx('wall-slide'); }, 500);
                setTimeout(function () { room.classList.remove('rumble'); sd.go.classList.remove('pulled'); }, 2900);
                setTimeout(down, secret ? 3300 : 0);
            });
            return;
        }
        walk(home, OFF[sd.dir]);                             // off the edge; the room slides as they reach it
        setTimeout(slide, walkSecs(home, OFF[sd.dir]) * 700);
    }
    function goHome() {
        var sd = inSide;
        if (busy || !sd) return;
        busy = true;
        body.classList.add('side-walking');
        function slide() {
            if (home) place(home, sd.dir > 0 ? 98 : sd.dir < 0 ? -6 : (secret ? doorAt() : bookAt()), sd.dir > 0);
            if (sd.dir === 0) { sd.go.classList.remove('pulled'); if (home && secret) { home.classList.add('ascending'); setTimeout(function () { home.classList.remove('ascending'); }, 1900); } }
            body.classList.add(sd.name + '-panning');
            body.classList.remove('in-' + sd.name, 'in-side');
            sd.el.setAttribute('aria-hidden', 'true');
            inSide = null;
            tabHere(true);
            fire('leave', sd);
            try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
            setTimeout(function () {
                body.classList.remove(sd.name + '-panning');
                var arrive = function () { busy = false; body.classList.remove('side-walking'); if (home) home.classList.remove('face-left'); };
                if (home) walk(home, homeAt, arrive); else arrive();
            }, 900);
        }
        if (sd.dir === 0 && sd.me && !sd.me.classList.contains('gore-hidden')) { walk(sd.me, sd.enterAt, slide); return; }    // back to the foot of the stairs, then up
        if (sd.me && !sd.me.classList.contains('gore-hidden')) { walk(sd.me, OFF[-sd.dir]); setTimeout(slide, walkSecs(sd.me, OFF[-sd.dir]) * 700); } else slide();
    }
    if (secret) {
        var viaDoor = function (e) { if (!secret.classList.contains('open')) return; e.preventDefault(); goTo(sd0()); };
        secret.addEventListener('click', viaDoor);
        secret.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') viaDoor(e); });
    }
    var hooks = [];
    function fire(what, sd) { hooks.forEach(function (fn) { try { fn(what, sd.name); } catch (e) {} }); }
    SIDES.forEach(function (sd) {
        sd.go.addEventListener('click', function (e) {
            e.preventDefault();
            if (sd.dir === 0 && secret && secret.classList.contains('open')) pullShut(sd); else goTo(sd);
        });
        if (sd.back) sd.back.addEventListener('click', function (e) { e.preventDefault(); goHome(); });
        Array.prototype.forEach.call(sd.el.querySelectorAll('[data-goes-back]'), function (b) {
            b.addEventListener('click', function (e) { e.preventDefault(); goHome(); });
            b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); } });
        });
        if (location.hash !== sd.hash) return;
        goTo(sd, true);
        // back through one of this room's doors (from the workshop, off the roof): out of that door and back to their spot
        var a = Sky.takeArrival ? Sky.takeArrival() : null, door = a && sd.me ? sd.el.querySelector(a.via) : null;
        if (!door) return;
        sd.me.classList.add('gore-hidden');
        setTimeout(function () {
            busy = true;
            var at = (door.offsetLeft + door.offsetWidth / 2 - sd.me.offsetWidth / 2) / (sd.el.clientWidth || window.innerWidth) * 100;
            place(sd.me, at, at > sd.standAt);
            door.classList.add('open');
            setTimeout(function () {
                if (Sky.sounds) Sky.sounds.sfx(door.dataset.sound || 'door');
                sd.me.classList.remove('gore-hidden');
                walk(sd.me, sd.standAt, function () { busy = false; sd.me.classList.remove('face-left'); });
                setTimeout(function () { door.classList.remove('open'); }, 700);
            }, 350);
        }, 450);
    });
    // only now can the rooms slide (had it been on from the start, they'd have slid out from the middle as the page loaded)
    requestAnimationFrame(function () { requestAnimationFrame(function () { body.classList.add('sides-ready'); }); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && inSide && !body.classList.contains('mirror-open') && !body.classList.contains('inv-holding')) goHome();
    });
    // a door in a side room: walk up to it, it opens, and through you go
    Array.prototype.forEach.call(document.querySelectorAll('.side-door[href]'), function (door) {
        // your own door art can have an -open twin (hall-door-roof-open.png): it's swapped in as it opens
        if (door.dataset.asset) Sky.findAsset(door.dataset.asset + '-open', function (url) { if (url) { door.dataset.openArt = url; door.classList.add('has-open'); } });
        door.addEventListener('click', function (e) {
            e.preventDefault();
            if (busy) return;
            var sd = SIDES.filter(function (x) { return x.el.contains(door); })[0], href = door.getAttribute('href');
            busy = true;
            function open() {
                door.classList.add('open');
                var img = door.querySelector('img.art');
                if (img && door.dataset.openArt) { door.dataset.shutArt = img.src; img.src = door.dataset.openArt; }
                if (Sky.sounds) Sky.sounds.sfx(door.dataset.sound || 'door');
                if (door.dataset.arriveVia && Sky.setArrival) Sky.setArrival(href, door.dataset.arriveVia);   // they walk in from there on the next page
                setTimeout(function () { if (sd && sd.me) sd.me.classList.add('gore-hidden'); }, 450);
                setTimeout(function () { busy = false; Sky.leave ? Sky.leave(href) : (location.href = href); }, 700);
            }
            if (sd && sd.me) {
                var p = door.offsetParent || sd.el, at = (door.offsetLeft + door.offsetWidth / 2 - sd.me.offsetWidth / 2) / p.clientWidth * 100;
                walk(sd.me, at, open);
            } else open();
        });
    });
    window.addEventListener('pageshow', function (e) {         // back with the browser's back button: the doors are shut again
        if (!e.persisted) return;
        busy = false;
        Array.prototype.forEach.call(document.querySelectorAll('.side-door.open'), function (d) {
            d.classList.remove('open');
            var img = d.querySelector('img.art');
            if (img && d.dataset.shutArt) img.src = d.dataset.shutArt;
        });
        SIDES.forEach(function (sd) { if (sd.me) { sd.me.classList.remove('gore-hidden'); place(sd.me, sd.standAt); } });
    });
    // straight back to the living space, no walking and no sliding (for when the screen's black anyway)
    function homeNow() {
        var sd = inSide;
        if (!sd) return;
        sd.el.style.transition = room.style.transition = 'none';
        body.classList.remove('in-' + sd.name, 'in-side', sd.name + '-panning', 'side-walking');
        sd.el.setAttribute('aria-hidden', 'true');
        inSide = null; busy = false;
        tabHere(true);
        fire('leave', sd);
        if (sd.dir === 0) sd.go.classList.remove('pulled');
        if (sd.me) sd.me.classList.remove('gore-hidden');
        if (home) { home.classList.remove('descending', 'ascending', 'walking', 'gore-hidden'); home.style.transform = ''; place(home, homeAt, false); }
        try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
        void room.offsetWidth;
        setTimeout(function () { sd.el.style.transition = room.style.transition = ''; }, 60);
    }
    Sky.sides = { get inSide() { return inSide && inSide.name; }, get busy() { return busy; }, walk: walk, place: place, leftPct: leftPct,
                  on: function (fn) { hooks.push(fn); if (inSide) fn('enter', inSide.name); }, home: goHome, homeNow: homeNow,
                  goNow: function (name) { var sd = SIDES.filter(function (x) { return x.name === name; })[0]; if (sd && !inSide) goTo(sd, true); },
                  get me() { return home; } };

    /* ---------------- the mirror ---------------- */
    if (!mirror) return;
    var words = mirror.dataset.say || "Despite everything, it's still you.";
    mirror.setAttribute('role', 'button');
    mirror.setAttribute('tabindex', '0');
    mirror.setAttribute('aria-label', 'look in the mirror');
    var hint = document.createElement('span');
    hint.className = 'bm-hint';
    hint.textContent = 'the mirror';
    mirror.appendChild(hint);

    // your reflection: the traveller, a little softer (until assets/characters/reflection)
    var REFLECTION = '<svg class="placeholder" viewBox="4 16 52 104" aria-hidden="true" style="opacity:.92">' +
        '<path d="M8 40 Q30 32 52 40 L50 44 Q30 38 10 44 Z" fill="#3a2716"/>' +
        '<path d="M17 40 Q18 22 30 21 Q42 22 43 40 Z" fill="#3a2716"/>' +
        '<circle cx="30" cy="50" r="9" fill="#f0dfbd"/>' +
        '<path d="M16 62 Q30 56 44 62 L48 120 L12 120 Z" fill="#9a3b1f"/>' +
        '<path d="M29 62 L31 62 L31 120 L29 120 Z" fill="#6e2a16"/></svg>';

    var view = document.createElement('div');
    view.className = 'mirror-view';
    view.setAttribute('role', 'dialog');
    view.setAttribute('aria-label', 'the mirror');
    view.innerHTML = '<div class="mv-mirror"><div class="mv-glass"><div class="mv-reflection" data-asset="assets/characters/reflection">' + REFLECTION + '</div></div></div>' +
        '<div class="mv-text"><span class="mv-words"></span><span class="mv-more" aria-hidden="true">&#9660;</span></div>';
    body.appendChild(view);
    Sky.fillAssets(view);
    Sky.findAsset('assets/living/mirror-close', function (url) {
        if (!url) return;
        var f = document.createElement('img');
        f.className = 'mv-frame'; f.src = url; f.alt = '';
        view.querySelector('.mv-mirror').appendChild(f);
        view.classList.add('has-frame');
    });

    // the lettering: your font if there is one, otherwise a pixel font (fetched only when you first look)
    var fontReady = false;
    function loadFont() {
        if (fontReady) return;
        fontReady = true;
        Sky.findAsset('assets/fonts/mirror.woff2|assets/fonts/mirror.woff|assets/fonts/mirror.ttf|assets/fonts/mirror.otf', function (url) {
            if (url) { Sky.css('@font-face { font-family: "mirror"; src: url("' + url + '"); font-display: swap; }'); return; }
            var l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = 'https://fonts.googleapis.com/css2?family=VT323&display=swap';
            document.head.appendChild(l);
        });
    }
    mirror.addEventListener('pointerenter', loadFont);

    var typing = null, shown = 0;
    function typeOut() {
        if (!view.classList.contains('open')) return;
        view.querySelector('.mv-words').textContent = '';
        shown = 0;
        view.classList.remove('done');
        clearTimeout(typing);
        tick();
    }
    function tick() {                    // one letter at a time, with a pause after a comma or a full stop
        shown++;
        view.querySelector('.mv-words').textContent = words.slice(0, shown);
        var ch = words.charAt(shown - 1);
        if (/\S/.test(ch) && shown % 2 && Sky.sounds) Sky.sounds.sfx('blip');
        if (shown >= words.length) return finish();
        typing = setTimeout(tick, ch === ',' ? 320 : /[.!?]/.test(ch) ? 200 : 55);
    }
    function finish() {
        clearTimeout(typing);
        view.querySelector('.mv-words').textContent = words;
        shown = words.length;
        view.classList.add('done');
    }
    function look() {
        if (!body.classList.contains('in-bath') || body.classList.contains('bath-panning')) return;
        loadFont();
        view.classList.add('open');
        body.classList.add('mirror-open');
        if (Sky.sounds) Sky.sounds.sfx('shimmer');
        setTimeout(typeOut, 650);
    }
    function lookAway() {
        clearTimeout(typing);
        view.classList.remove('open', 'done');
        body.classList.remove('mirror-open');
    }
    // a click while it's typing shows the rest; once it's all there, a click steps away
    function next() { if (!view.classList.contains('open')) return; if (shown < words.length) finish(); else lookAway(); }
    mirror.addEventListener('click', look);
    mirror.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); look(); } });
    view.addEventListener('click', next);
    document.addEventListener('keydown', function (e) {
        if (!view.classList.contains('open')) return;
        if (e.key === 'Escape') lookAway();
        else if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') { e.preventDefault(); next(); }
    });
})();

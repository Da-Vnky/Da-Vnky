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
    var back = bath.querySelector('.room-arrow.to-living');
    var mirror = bath.querySelector('.bath-mirror');
    var home = room.querySelector('.scene-character');
    var me = bath.querySelector('.character');
    var body = document.body;

    var ARROW = '<svg class="placeholder" viewBox="0 0 60 60" aria-hidden="true">' +
        '<circle cx="30" cy="30" r="27" fill="rgba(243,230,194,.16)" stroke="rgba(243,230,194,.55)" stroke-width="2"/>' +
        '<path d="M22 16 L38 30 L22 44" fill="none" stroke="#f3e6c2" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    [go, back].forEach(function (a) { if (a && !a.querySelector('.placeholder, img')) a.insertAdjacentHTML('afterbegin', ARROW); });

    Sky.css(
        // the arrows: see-through until you point at them
        '.room-arrow, .room-arrow:hover { padding: 0; background: none; text-shadow: none; }' +
        '.room-arrow { position: fixed; z-index: 5; width: 54px; height: 54px; display: block; opacity: .5; transition: opacity .25s, transform .25s, visibility 0s;' +
            'filter: drop-shadow(0 2px 4px rgba(0,0,0,.45)); -webkit-tap-highlight-color: transparent; }' +
        '.room-arrow:hover, .room-arrow:focus-visible { opacity: 1; transform: translateX(4px); outline: none; }' +
        '.room-arrow > svg, .room-arrow > .art { display: block; width: 100%; height: 100%; object-fit: contain; }' +
        '.room-arrow.to-bath { right: 14px; top: 60vh; }' +
        '.room-arrow.to-living { position: absolute; left: 14px; top: 50%; margin-top: -27px; }' +
        '.room-arrow.to-living > svg, .room-arrow.to-living > .art { transform: scaleX(-1); }' +
        '.room-arrow.to-living:hover, .room-arrow.to-living:focus-visible { transform: translateX(-4px); }' +
        'body.in-bath .room-arrow.to-bath, body.bath-walking .room-arrow, body.leaving .room-arrow, body.sky-view .room-arrow.to-bath, body.is-outside .room-arrow.to-bath,' +
        'body.gallery-open .room-arrow, body.records-open .room-arrow, body.crate-open .room-arrow, body.frame-open .room-arrow, body.mirror-open .room-arrow,' +
        'body.art-open .room-arrow, body.visitors-open .room-arrow { opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .3s, visibility 0s .3s; }' +

        // the bathroom: waits off to the right, slides in as the living space slides out
        '.bathroom { position: fixed; inset: 0; z-index: 3; overflow: hidden; transform: translateX(100%); visibility: hidden;' +
            'transition: transform .9s cubic-bezier(.55, 0, .25, 1), visibility 0s .9s;' +
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
        'body.in-bath .sky-links { visibility: hidden; }' +
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
        '@media (prefers-reduced-motion: reduce) { .bathroom, .bath-character, .room .scene-character { transition-duration: 0s !important; } }'
    );

    /* ---------------- the arrow sits just under the tabs ---------------- */
    function placeArrow() {
        var tabs = document.querySelector('.place-tabs');
        if (!tabs) return;
        var r = tabs.getBoundingClientRect(), h = go.offsetHeight || 54;
        var top = r.bottom + 18;
        if (top + h > window.innerHeight - 12) top = r.top - h - 14;      // no room below (small screens): just above
        go.style.top = Math.round(top) + 'px';
        go.style.right = '8px';
    }
    placeArrow();
    window.addEventListener('resize', placeArrow);
    window.addEventListener('load', placeArrow);
    setTimeout(placeArrow, 400);

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

    var homeAt = home ? leftPct(home) : 34, standAt = me ? leftPct(me) : 28;
    var busy = false;

    function toBath(instant) {
        if (busy || body.classList.contains('in-bath')) return;
        busy = true;
        body.classList.add('bath-walking');
        homeAt = home ? leftPct(home) : homeAt;
        function slide() {
            bath.setAttribute('aria-hidden', 'false');
            if (me) place(me, 2);
            body.classList.add('bath-panning', 'in-bath');
            setTimeout(function () {
                body.classList.remove('bath-panning');
                var arrive = function () { busy = false; body.classList.remove('bath-walking'); if (me) me.classList.remove('face-left'); };
                if (me) walk(me, standAt, arrive); else arrive();
            }, instant ? 0 : 900);
            try { history.replaceState(null, '', '#bathroom'); } catch (e) {}
        }
        if (instant || !home) {
            if (instant) { bath.style.transition = room.style.transition = 'none'; }
            slide();
            if (instant) { void bath.offsetWidth; if (me) place(me, standAt); setTimeout(function () { bath.style.transition = room.style.transition = ''; }, 50); }
            return;
        }
        walk(home, 104);                         // off the right-hand edge; the room slides as they reach it
        setTimeout(slide, walkSecs(home, 104) * 700);
    }
    function toLiving() {
        if (busy || !body.classList.contains('in-bath')) return;
        busy = true;
        body.classList.add('bath-walking');
        function slide() {
            if (home) place(home, 98, true);
            body.classList.add('bath-panning');
            body.classList.remove('in-bath');
            bath.setAttribute('aria-hidden', 'true');
            try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
            setTimeout(function () {
                body.classList.remove('bath-panning');
                var arrive = function () { busy = false; body.classList.remove('bath-walking'); if (home) home.classList.remove('face-left'); };
                if (home) walk(home, homeAt, arrive); else arrive();
            }, 900);
        }
        if (me) { walk(me, -14); setTimeout(slide, walkSecs(me, -14) * 700); } else slide();
    }
    go.addEventListener('click', function (e) { e.preventDefault(); toBath(); });
    if (back) back.addEventListener('click', function (e) { e.preventDefault(); toLiving(); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && body.classList.contains('in-bath') && !body.classList.contains('mirror-open')) toLiving();
    });
    if (location.hash === '#bathroom') toBath(true);

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

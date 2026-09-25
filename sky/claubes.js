/* =====================================================================
   claubes.js — an easter egg. Put on "I'm Upping My P(Doom)" and little
   Claubes crawl out of the woodwork and dance. When the music stops they
   just stand there, beaming, happy to be alive. They stay (on every page,
   dancing to whatever plays) until one of these happens:
     • the traveller turns the revolver on themselves (sky/revolver.js)
     • the record is shot to pieces
     • you flick them away, one by one (the pointer turns into a flicking
       finger over them)
   A shot at one of them works too. And while that song plays (only that one),
   the party lights come on: colour washes on the beat, sweeping beams, a
   disco ball (assets/ui/disco-ball).

   The song: any track whose name or title has "p(doom)" in it (DOOM below).

   slots: assets/characters/mini-claube          standing about (and the fallback for the others)
          assets/characters/mini-claube-dancing  while a record plays (a GIF can dance on its own)
          assets/characters/mini-claube-happy    when the music stops
          assets/ui/cursor-flick                 the pointer over them (a small PNG)
   sounds: assets/sounds/flick
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.claubes) return;
    var body = document.body;
    var DOOM = /p\s*\(\s*doom\s*\)/i;          // the song that calls them out
    var HOW_MANY = 7;
    var KEY = 'claubes';
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }

    // the stand-in: a little round terracotta fellow; the happy face shows when the music stops
    var ART = '<svg class="placeholder" viewBox="0 0 40 52" aria-hidden="true">' +
        '<g class="mc-arm l"><path d="M8 26 Q2 22 3 14" stroke="#a84e2c" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>' +
        '<g class="mc-arm r"><path d="M32 26 Q38 22 37 14" stroke="#a84e2c" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>' +
        '<path d="M13 44 V50 H18 M27 44 V50 H22" stroke="#6e3018" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<ellipse cx="20" cy="30" rx="14" ry="16" fill="#c8643b"/>' +
        '<ellipse cx="15" cy="24" rx="5" ry="6" fill="#e08a5e" opacity=".55"/>' +
        '<path d="M20 14 Q18 6 22 3 M20 14 Q24 8 27 7" stroke="#6e3018" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
        '<g class="mc-face-plain"><circle cx="15" cy="29" r="2.2" fill="#2a1410"/><circle cx="25" cy="29" r="2.2" fill="#2a1410"/><circle cx="15.7" cy="28.3" r=".7" fill="#fff"/><circle cx="25.7" cy="28.3" r=".7" fill="#fff"/>' +
            '<path d="M16.5 35 Q20 38 23.5 35" stroke="#2a1410" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>' +
        '<g class="mc-face-happy"><path d="M12.5 30 Q15 26.5 17.5 30 M22.5 30 Q25 26.5 27.5 30" stroke="#2a1410" stroke-width="1.7" fill="none" stroke-linecap="round"/>' +
            '<path d="M14.5 34 Q20 41.5 25.5 34 Z" fill="#5a1d14"/><path d="M16.5 37 Q20 39.5 23.5 37" fill="#e0707a"/>' +
            '<ellipse cx="11.5" cy="34" rx="2.4" ry="1.5" fill="#f0a08a" opacity=".8"/><ellipse cx="28.5" cy="34" rx="2.4" ry="1.5" fill="#f0a08a" opacity=".8"/></g>' +
        '</svg>';
    var FLICK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M9 30 Q4 24 6 17 L8 12 Q9 10 11 11 L12 15 L13 6 Q14 3 16 4 Q17.5 5 17 8 L16.5 14 L22 6 Q24 4 25.5 5.5 Q26.5 7 25 9 L20 16 Q24 17 23 22 Q21 29 14 30 Z" fill="#f0d2b0" stroke="#3a2716" stroke-width="1.3" stroke-linejoin="round"/>' +
        '<path d="M26 3 L29 1 M27.5 7 L31 6.5 M24 1.5 L24.5 -1" stroke="#9a3b1f" stroke-width="1.4" stroke-linecap="round"/></svg>');
    var flickCursor = FLICK;
    Sky.findAsset('assets/ui/cursor-flick', function (url) { if (url) { flickCursor = url; crew.style.setProperty('--flick', 'url("' + url + '") 16 16, pointer'); } });

    Sky.css(
        '.claube-crew { position: fixed; left: 0; right: 0; bottom: var(--crew-floor, 2.4vh); height: 0; z-index: 5; pointer-events: none; transition: opacity .4s; --flick: url("' + FLICK + '") 16 16, pointer; }' +
        'body[data-place=city] .claube-crew { --crew-floor: calc(max(20vh, 130px) * .45 - 2px); }' +
        'body[data-place=sea] .claube-crew { --crew-floor: 1vh; }' +
        'body.sky-view .claube-crew, body.peep-view .claube-crew, body.peep-close .claube-crew, body.leaving .claube-crew, body.paint-open .claube-crew,' +
        'body.records-open .claube-crew, body.gallery-open .claube-crew, body.mirror-open .claube-crew { opacity: 0; }' +
        '.mini-claube { position: absolute; bottom: 0; width: 3.4vw; min-width: 34px; max-width: 64px; aspect-ratio: 40 / 52; margin-left: -1.7vw; pointer-events: auto; cursor: var(--flick); transition: left 1.6s linear; }' +
        'body.inv-holding .mini-claube { cursor: crosshair; }' +
        '.mini-claube .mc-body { position: absolute; inset: 0; transform-origin: 50% 100%; }' +
        '.mini-claube .mc-body > svg, .mini-claube .mc-body > img { display: block; width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; }' +
        '.mini-claube.flip .mc-body > svg, .mini-claube.flip .mc-body > img { transform: scaleX(-1); }' +
        '.mini-claube .mc-face-happy { display: none; }' +
        '.claube-crew.happy .mini-claube .mc-face-happy { display: inline; } .claube-crew.happy .mini-claube .mc-face-plain { display: none; }' +
        // crawling up out of the floor
        '.mini-claube.crawl .mc-body { animation: mc-crawl 1.1s cubic-bezier(.3,1.3,.5,1) both; }' +
        '@keyframes mc-crawl { 0% { transform: translateY(110%) rotate(-25deg) scaleY(.6); } 40% { transform: translateY(45%) rotate(18deg) scaleY(.8); }' +
            '70% { transform: translateY(8%) rotate(-10deg); } 100% { transform: none; } }' +
        '.mini-claube.scurry .mc-body { animation: mc-scurry .18s linear infinite alternate; }' +
        '@keyframes mc-scurry { from { transform: rotate(-9deg) translateY(-2px); } to { transform: rotate(9deg); } }' +
        // dancing: four hops a cycle, on the beat (sky/music.js keeps anything named g-… in time)
        '.claube-crew.dancing .mini-claube:not(.crawl):not(.scurry) .mc-body { animation: g-claube-bop 2s ease-in-out infinite; animation-delay: var(--d, 0s); }' +
        '@keyframes g-claube-bop { 0%, 50%, 100% { transform: translateY(0) rotate(0) scale(1.06, .94); } 12.5% { transform: translateY(-22%) rotate(-10deg) scale(.96, 1.05); }' +
            '25% { transform: translateY(0) rotate(0) scale(1.08, .92); } 37.5% { transform: translateY(-26%) rotate(12deg) scale(.95, 1.06); } 62.5% { transform: translateY(-18%) rotate(-6deg) scaleX(-1); }' +
            '75% { transform: translateY(0) scale(1.08, .92); } 87.5% { transform: translateY(-24%) rotate(8deg); } }' +
        '.claube-crew.dancing .mini-claube .mc-arm { animation: mc-arms .5s ease-in-out infinite alternate; transform-box: fill-box; }' +
        '.claube-crew.dancing .mini-claube .mc-arm.l { transform-origin: 100% 100%; } .claube-crew.dancing .mini-claube .mc-arm.r { transform-origin: 0 100%; animation-delay: -.25s; }' +
        '@keyframes mc-arms { from { transform: rotate(-30deg); } to { transform: rotate(35deg); } }' +
        // happy to be alive: a slow contented sway, a little sparkle now and then
        '.claube-crew.happy .mini-claube:not(.crawl):not(.scurry) .mc-body { animation: mc-glow 2.6s ease-in-out infinite; animation-delay: var(--d, 0s); }' +
        '@keyframes mc-glow { 0%, 100% { transform: rotate(-2deg) scale(1); } 50% { transform: rotate(2deg) scale(1.03, .98); } }' +
        '.mini-claube .mc-spark { position: absolute; left: 50%; top: -18%; font-size: 14px; color: #ffd66e; text-shadow: 0 0 4px #fff3b0; opacity: 0; pointer-events: none; }' +
        '.claube-crew.happy .mini-claube .mc-spark { animation: mc-spark 3.4s ease-out infinite; animation-delay: var(--d, 0s); }' +
        '@keyframes mc-spark { 0%, 60% { opacity: 0; transform: translate(-50%, 0) scale(.5); } 72% { opacity: 1; transform: translate(-50%, -8px) scale(1.1); } 100% { opacity: 0; transform: translate(-50%, -22px) scale(.7); } }' +
        '.mini-claube .mc-bubble { position: absolute; left: 50%; bottom: 105%; transform: translateX(-50%); white-space: nowrap; padding: 2px 8px; border-radius: 10px; background: #f3e6c2;' +
            'color: #3a2716; font: italic .8rem "IM Fell English", Georgia, serif; box-shadow: 0 2px 5px rgba(0,0,0,.3); opacity: 0; transition: opacity .3s; pointer-events: none; }' +
        '.mini-claube .mc-bubble.on { opacity: 1; }' +
        '.mc-pop { position: fixed; z-index: 6; width: 8px; height: 8px; border-radius: 50%; pointer-events: none; background: #c8643b; }' +
        // the party lights, while "I'm Upping My P(Doom)" plays (and only then). colour, not white flashes:
        // the washes change on the beat (in time: sky/music.js keeps anything named g-… on it), gently
        '.doom-lights { position: fixed; inset: 0; z-index: 4; pointer-events: none; overflow: hidden; opacity: 0; visibility: hidden; transition: opacity 1.2s, visibility 0s 1.2s; }' +
        'body.doom-party .doom-lights { opacity: 1; visibility: visible; transition: opacity .8s, visibility 0s; }' +
        'body.sky-view .doom-lights, body.peep-view .doom-lights, body.peep-close .doom-lights, body.paint-open .doom-lights { opacity: 0; }' +
        '.doom-lights .dl-wash { position: absolute; inset: 0; mix-blend-mode: screen; animation: g-party-wash 2s linear infinite; }' +
        '@keyframes g-party-wash { 0%, 23% { background: radial-gradient(ellipse at 20% 30%, rgba(255,40,160,.26), transparent 60%); }' +
            '25%, 48% { background: radial-gradient(ellipse at 80% 35%, rgba(40,200,255,.26), transparent 60%); }' +
            '50%, 73% { background: radial-gradient(ellipse at 35% 70%, rgba(140,255,60,.22), transparent 60%); }' +
            '75%, 98% { background: radial-gradient(ellipse at 70% 65%, rgba(255,190,30,.26), transparent 60%); } 100% { background: radial-gradient(ellipse at 20% 30%, rgba(255,40,160,.26), transparent 60%); } }' +
        '.doom-lights .dl-beam { position: absolute; top: -4vh; width: 22vw; height: 125vh; margin-left: -11vw; transform-origin: 50% 0; mix-blend-mode: screen; opacity: .42;' +
            'clip-path: polygon(46% 0, 54% 0, 100% 100%, 0 100%); background: linear-gradient(var(--c), transparent 85%); animation: dl-sweep var(--t, 5s) ease-in-out infinite alternate, dl-hue 6s linear infinite; }' +
        '@keyframes dl-sweep { from { transform: rotate(var(--a, -35deg)); } to { transform: rotate(var(--b, 35deg)); } }' +
        '@keyframes dl-hue { to { filter: hue-rotate(360deg); } }' +
        '.doom-lights .dl-ball { position: absolute; left: 50%; top: 0; width: 64px; margin-left: -32px; }' +
        '.doom-lights .dl-ball::before { content: ""; position: absolute; left: 50%; bottom: 100%; width: 2px; height: 30px; background: #888; }' +
        '.doom-lights .dl-ball > svg, .doom-lights .dl-ball > img { display: block; width: 100%; height: auto; }' +
        '.doom-lights .dl-ball .dlb-tiles { animation: dl-spin 3s linear infinite; }' +
        '@keyframes dl-spin { to { transform: translateX(-24px); } }' +
        '.doom-lights .dl-dots { position: absolute; left: 50%; top: 30px; width: 220vmax; height: 220vmax; margin: -110vmax 0 0 -110vmax; mix-blend-mode: screen; opacity: .5;' +
            'background: radial-gradient(circle, rgba(255,255,255,.9) 0 2px, transparent 3px) 0 0 / 70px 70px, radial-gradient(circle, rgba(255,120,220,.8) 0 2px, transparent 3px) 35px 35px / 70px 70px;' +
            'animation: dl-turn 24s linear infinite; }' +
        '@keyframes dl-turn { to { transform: rotate(360deg); } }' +
        '@media (prefers-reduced-motion: reduce) { .doom-lights .dl-wash, .doom-lights .dl-beam, .doom-lights .dl-dots, .doom-lights .dlb-tiles { animation: none !important; } }' +
        '@media (prefers-reduced-motion: reduce) { .mini-claube .mc-body, .mini-claube .mc-arm, .mini-claube .mc-spark { animation: none !important; } }'
    );

    // the lights (a disco ball of your own: assets/ui/disco-ball, see-through, about 1:1)
    var lights = document.createElement('div');
    lights.className = 'doom-lights';
    lights.setAttribute('aria-hidden', 'true');
    var BEAMS = [['#ff2aa0', '12%', '-40deg', '20deg', '4.2s'], ['#28c8ff', '32%', '30deg', '-25deg', '5.6s'], ['#8cff3c', '52%', '-20deg', '38deg', '3.8s'], ['#ffbe1e', '72%', '35deg', '-30deg', '6.2s'], ['#b04cff', '90%', '-30deg', '15deg', '4.8s']];
    lights.innerHTML = '<div class="dl-wash"></div><div class="dl-dots"></div>' + BEAMS.map(function (b) {
        return '<div class="dl-beam" style="--c:' + b[0] + '; left:' + b[1] + '; --a:' + b[2] + '; --b:' + b[3] + '; --t:' + b[4] + '"></div>';
    }).join('') + '<div class="dl-ball" data-asset="assets/ui/disco-ball"><svg class="placeholder" viewBox="0 0 64 64" aria-hidden="true"><defs><clipPath id="dlb-c"><circle cx="32" cy="32" r="28"/></clipPath>' +
        '<pattern id="dlb-p" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#9aa0aa"/><rect width="7" height="7" fill="#d8dde6"/><rect width="3" height="3" fill="#fff"/></pattern></defs>' +
        '<g clip-path="url(#dlb-c)"><rect class="dlb-tiles" x="0" y="0" width="100" height="64" fill="url(#dlb-p)"/><circle cx="32" cy="32" r="28" fill="url(#dlb-sh)" opacity=".5"/></g>' +
        '<circle cx="32" cy="32" r="28" fill="none" stroke="#555" stroke-width="1.5"/><circle cx="22" cy="20" r="6" fill="#fff" opacity=".7"/></svg></div>';
    body.appendChild(lights);
    if (Sky.fillAssets) Sky.fillAssets(lights);

    var crew = document.createElement('div');
    crew.className = 'claube-crew';
    crew.setAttribute('aria-hidden', 'true');
    body.appendChild(crew);

    /* ---------------- their pictures ---------------- */
    var art = { base: null, dancing: null, happy: null };
    function pic() {
        var mode = crew.classList.contains('dancing') ? 'dancing' : 'happy';
        var url = art[mode] || art.base;
        return url ? '<img alt="" src="' + url + '">' : ART;
    }
    function dress() { crew.querySelectorAll('.mc-body').forEach(function (b) { var want = pic(); if (b.dataset.pic !== want) { b.innerHTML = want; b.dataset.pic = want; } }); }
    Sky.findAsset('assets/characters/mini-claube', function (u) { art.base = u || null; dress(); });
    Sky.findAsset('assets/characters/mini-claube-dancing', function (u) { art.dancing = u || null; dress(); });
    Sky.findAsset('assets/characters/mini-claube-happy', function (u) { art.happy = u || null; dress(); });

    /* ---------------- who's out, and where (for the rest of the visit) ---------------- */
    var out = [];                                 // [{ x: % across }]
    try { out = JSON.parse(sessionStorage.getItem(KEY) || '[]') || []; } catch (e) {}
    function save() { try { if (out.length) sessionStorage.setItem(KEY, JSON.stringify(out)); else sessionStorage.removeItem(KEY); } catch (e) {} }
    var HAPPY_LINES = ['so happy to be alive', 'what a time to be alive!', ':)', 'again! again!', 'that was nice', 'i love it here'];

    function make(c, crawl, i) {
        var el = document.createElement('div');
        el.className = 'mini-claube' + (crawl ? ' crawl' : '') + (Math.random() < 0.5 ? ' flip' : '');
        el.style.left = c.x + '%';
        el.style.setProperty('--d', (-Math.random() * 2).toFixed(2) + 's');
        el.innerHTML = '<div class="mc-body"></div><span class="mc-spark">✦</span><span class="mc-bubble"></span>';
        el._c = c;
        crew.appendChild(el);
        if (crawl) setTimeout(function () { el.classList.remove('crawl'); }, 1150 + (i || 0) * 10);
        el.addEventListener('click', function (e) {
            if (body.classList.contains('inv-holding')) return;          // (holding something: sky/revolver.js has it)
            e.stopPropagation();
            flick(el, e.clientX, e.clientY);
        });
        return el;
    }
    function mood() {
        var on = !!(Sky.music && Sky.music.playing());
        crew.classList.toggle('dancing', on);
        crew.classList.toggle('happy', !on);
        body.classList.toggle('doom-party', on && isDoom(Sky.music.current()));        // the lights: only for this one song
        dress();
    }
    function show(crawling) {
        crew.innerHTML = '';
        out.forEach(function (c, i) {
            if (!crawling) { make(c, false); return; }
            setTimeout(function () { make(c, true, i); dress(); sfx('step', { size: 0.2 }); }, i * 260 + Math.random() * 180);
        });
        mood();
    }
    function callThemOut() {
        if (out.length) return;
        for (var i = 0; i < HOW_MANY; i++) out.push({ x: +(17 + (75 / (HOW_MANY - 1)) * i + (Math.random() - 0.5) * 6).toFixed(1) });
        out.sort(function () { return Math.random() - 0.5; });
        save();
        show(true);
    }
    function gone(el) {
        var i = out.indexOf(el._c);
        if (i !== -1) out.splice(i, 1);
        save();
        el.remove();
    }

    /* ---------------- flicked away ---------------- */
    function flick(el, px, py) {
        if (el._going) return;
        el._going = true;
        sfx('flick'); sfx('claube-flick', { delay: 0.04 });
        var r = el.getBoundingClientRect(), dir = px < r.left + r.width / 2 ? 1 : -1;
        var dx = dir * (window.innerWidth * (0.5 + Math.random() * 0.4)), up = -(window.innerHeight * (0.5 + Math.random() * 0.4));
        el.style.transition = 'none';
        var a = el.animate([
            { transform: 'translate(0,0) rotate(0)' },
            { transform: 'translate(' + dx * 0.5 + 'px,' + up + 'px) rotate(' + dir * 540 + 'deg)', offset: 0.55 },
            { transform: 'translate(' + dx + 'px,' + (up * 0.2) + 'px) rotate(' + dir * 1080 + 'deg) scale(.6)', opacity: 0 }
        ], { duration: 1100, easing: 'cubic-bezier(.2,.7,.5,1)', fill: 'forwards' });
        a.onfinish = function () { gone(el); };
    }
    /* ---------------- shot (sky/revolver.js) ---------------- */
    function shoot(el, x, y) {
        if (el._going) return;
        el._going = true;
        sfx('claube-shot', { delay: 0.05 });
        for (var i = 0; i < 12; i++) {
            var p = document.createElement('div');
            p.className = 'mc-pop';
            p.style.left = x + 'px'; p.style.top = y + 'px';
            body.appendChild(p);
            var a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 60;
            p.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * d + 'px,' + (Math.sin(a) * d + 30) + 'px) scale(.3)', opacity: 0 }],
                { duration: 600 + Math.random() * 300, easing: 'ease-out', fill: 'forwards' }).onfinish = (function (q) { return function () { q.remove(); }; })(p);
        }
        el.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.5, .2)', opacity: 0 }], { duration: 180, fill: 'forwards' }).onfinish = function () { gone(el); };
        // the others don't like that one bit
        crew.querySelectorAll('.mini-claube').forEach(function (o) { if (o !== el) say(o, 'eek!', 1200); });
    }
    /* ---------------- all of them, running for it ---------------- */
    function scatter(line) {
        var els = crew.querySelectorAll('.mini-claube');
        if (!els.length) { out = []; save(); return; }
        els.forEach(function (el, i) {
            el._going = true;
            if (line) say(el, line, 900);
            setTimeout(function () {
                el.classList.add('scurry');
                var toRight = parseFloat(el.style.left) > 50;
                el.classList.toggle('flip', !toRight);
                el.style.transition = 'left ' + (0.7 + Math.random() * 0.5).toFixed(2) + 's linear';
                el.style.left = toRight ? '112%' : '-12%';
                setTimeout(function () { el.remove(); }, 1400);
            }, 500 + i * 60);
        });
        out = []; save();
        if (line) sfx('angry', { size: 0.1 });
    }
    function say(el, text, ms) {
        var b = el.querySelector('.mc-bubble');
        if (!b) return;
        b.textContent = text;
        b.classList.add('on');
        clearTimeout(b._t);
        b._t = setTimeout(function () { b.classList.remove('on'); }, ms || 1800);
    }
    // happy now and then says so
    setInterval(function () {
        if (!crew.classList.contains('happy') || document.hidden) return;
        var els = crew.querySelectorAll('.mini-claube:not(.crawl)');
        if (!els.length || Math.random() < 0.5) return;
        say(els[Math.floor(Math.random() * els.length)], HAPPY_LINES[Math.floor(Math.random() * HAPPY_LINES.length)], 2200);
    }, 3500);

    /* ---------------- the music calls them out, and sets them dancing ---------------- */
    function isDoom(t) {
        if (!t) return false;
        var name = String(t.title || '') + ' ' + (function () { try { return decodeURIComponent(t.url || ''); } catch (e) { return t.url || ''; } })();
        return DOOM.test(name);
    }
    if (Sky.music) Sky.music.on(function (what) {
        if (what === 'play' && isDoom(Sky.music.current())) callThemOut();
        if (what === 'play' || what === 'pause' || what === 'stop') mood();
    });
    document.addEventListener('dav:traveller-shot', function () { scatter('!!!'); });
    document.addEventListener('dav:record-shot', function () { scatter('noooo'); });

    if (out.length) show(false);
    else if (Sky.music && Sky.music.playing() && isDoom(Sky.music.current())) callThemOut();
    mood();

    Sky.claubes = { shoot: shoot, flick: flick, callOut: callThemOut, scatter: scatter, get count() { return out.length; } };
})();

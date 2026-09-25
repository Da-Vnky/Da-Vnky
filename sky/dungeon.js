/* =====================================================================
   dungeon.js — the dungeon under the living space (pull the loose book on
   the bookshelf). Stone walls, a few candles, the hall of shame, and a sound
   of its own that takes over the moment you're down there: the record player
   and the noise machine hush, the weather outside goes unheard, and it all
   comes back as you climb the stairs.

   slots: assets/living/dungeon-wall, dungeon-floor, dungeon-stairs, dungeon-chains,
          dungeon-rack, candle (a GIF can flicker; the drawn one gets a flame)
   sound: assets/sounds/dungeon (.mp3/.ogg, loops). until then, a drawn drone:
          a hollow hum, a draught, drips, the odd chain.
   the sliding up and down is sky/bathroom.js (it's one of the living space's side rooms).
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var dg = document.querySelector('.dungeon');
    if (!Sky || !dg) return;
    var body = document.body;
    var LOUD = 0.85;                                  // how loud its sound plays (0 … 1)

    Sky.css(
        // the stones: rough blocks, darker at the top, a damp stain or two
        '.dungeon { --floor-h: 18vh; background:' +
            'radial-gradient(ellipse 30% 22% at 70% 64%, rgba(20,40,30,.35), transparent 70%),' +
            'radial-gradient(ellipse 18% 30% at 18% 40%, rgba(0,0,0,.35), transparent 70%),' +
            'repeating-linear-gradient(to bottom, transparent 0 54px, rgba(0,0,0,.55) 54px 57px),' +
            'repeating-linear-gradient(90deg, transparent 0 94px, rgba(0,0,0,.5) 94px 97px) 0 0 / 100% 114px,' +
            'repeating-linear-gradient(90deg, transparent 0 47px, rgba(0,0,0,.5) 47px 50px, transparent 50px 97px) 0 57px / 100% 114px,' +
            'linear-gradient(#1f1b1d, #3b3437 55%, #2f2a2c); }' +
        '.dungeon > .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }' +
        '.dungeon .furnish { position: absolute; z-index: 2; }' +
        '.dungeon .furnish > svg, .dungeon .furnish > .art { display: block; width: 100%; height: 100%; object-fit: contain; }' +
        '.dungeon .room-floor { position: absolute; left: 0; right: 0; bottom: 0; height: var(--floor-h); min-height: 34px; z-index: 1; pointer-events: none; }' +
        '.dungeon .room-floor .placeholder, .dungeon .room-floor > .art { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: fill; }' +
        '.dungeon .room-floor .placeholder { border-top: 6px solid #1a1617; box-shadow: 0 -3px 10px rgba(0,0,0,.5);' +
            'background: linear-gradient(rgba(0,0,0,.45), transparent 50%), repeating-linear-gradient(90deg, transparent 0 120px, rgba(0,0,0,.5) 120px 123px),' +
            'repeating-linear-gradient(to bottom, transparent 0 22px, rgba(0,0,0,.45) 22px 24px), #2c2729; }' +
        '.dungeon-stairs { filter: drop-shadow(4px 0 10px rgba(0,0,0,.6)); }' +
        '.dungeon-stairs:hover, .dungeon-stairs:focus-visible { filter: drop-shadow(0 0 12px rgba(255,210,140,.35)); outline: none; }' +
        // the dark: everything's dim but what the candles light
        '.dungeon::after { content: ""; position: absolute; inset: 0; z-index: 4; pointer-events: none;' +
            'background: radial-gradient(ellipse 70% 60% at 50% 45%, rgba(6,3,8,.42), rgba(6,3,8,.86) 80%); }' +
        '.dg-glow { position: absolute; z-index: 5; width: 22vw; height: 22vw; margin: -11vw 0 0 -11vw; border-radius: 50%; pointer-events: none;' +
            'background: radial-gradient(circle, rgba(255,160,80,.24), rgba(255,130,60,.07) 38%, transparent 66%); mix-blend-mode: screen;' +
            'animation: dg-flicker 3.1s ease-in-out infinite; }' +
        '.dg-glow.small { width: 15vw; height: 15vw; margin: -7.5vw 0 0 -7.5vw; }' +
        '@keyframes dg-flicker { 0%, 100% { opacity: .9; transform: scale(1); } 13% { opacity: .72; transform: scale(.97); } 21% { opacity: 1; }' +
            '47% { opacity: .8; transform: scale(1.02); } 62% { opacity: .95; } 71% { opacity: .7; transform: scale(.96); } 83% { opacity: 1; } }' +
        '.candle { z-index: 5 !important; pointer-events: none; filter: drop-shadow(0 0 3px rgba(255,170,90,.18)); }' +
        '.candle .cd-flame { position: absolute; left: 50%; top: 0; width: 46%; aspect-ratio: 1 / 2.2; transform: translate(-50%, -88%); transform-origin: 50% 90%;' +
            'border-radius: 50% 50% 50% 50% / 64% 64% 36% 36%; background: radial-gradient(ellipse at 50% 72%, #fff8d8 0 18%, #ffd36a 34%, #ff8a2a 62%, rgba(255,90,20,0) 72%);' +
            'filter: blur(.4px) drop-shadow(0 0 3px #ff9a40); animation: dg-flame 1.7s ease-in-out infinite; }' +
        '@keyframes dg-flame { 0%, 100% { transform: translate(-50%, -88%) rotate(-2deg) scaleY(1); } 25% { transform: translate(-52%, -90%) rotate(3deg) scaleY(1.08); }' +
            '50% { transform: translate(-48%, -86%) rotate(-4deg) scaleY(.94); } 75% { transform: translate(-51%, -91%) rotate(2deg) scaleY(1.05); } }' +
        '.candle.has-art .cd-flame { display: none; }' +
        '.dungeon .room-arrow.to-upstairs { z-index: 6; }' +
        '.dungeon .gallery-frame[data-look=lux] { z-index: 5 !important; } .dungeon .gallery-frame[data-look=lux] .gf-border { filter: brightness(.82); }' +                    // (the grand frame catches the candlelight)
        '.dungeon-pentagram { pointer-events: none; z-index: 5 !important; opacity: .8; filter: drop-shadow(0 0 2px rgba(120,0,0,.6)); }' +     // (over the dark: wet blood catches the candlelight)
        '.dungeon-pentagram > svg, .dungeon-pentagram > .art { object-fit: fill !important; }' +
        '.dungeon-paper { cursor: pointer; z-index: 3 !important; transform: rotate(-8deg); transition: transform .2s; filter: drop-shadow(0 2px 3px rgba(0,0,0,.6)); }' +
        '.dungeon-paper:hover, .dungeon-paper:focus-visible { transform: rotate(-8deg) translateY(-3px); outline: none; }' +
        '.dungeon-paper .dp-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%) rotate(8deg); white-space: nowrap; font-style: italic; font-size: .9rem;' +
            'color: #f3e6c2; text-shadow: 0 1px 3px #000; opacity: 0; transition: opacity .25s; pointer-events: none; }' +
        '.dungeon-paper:hover .dp-hint { opacity: 1; }' +
        // the paper, picked up and read
        '.paper-view { position: fixed; inset: 0; z-index: 9; display: grid; place-items: center; padding: 24px 16px; background: rgba(8,4,6,.86); cursor: pointer;' +
            'visibility: hidden; opacity: 0; transition: opacity .35s, visibility 0s .35s; }' +
        '.paper-view.open { visibility: visible; opacity: 1; transition: opacity .35s; }' +
        '.paper-view .pv-sheet { position: relative; width: min(560px, 92vw); max-height: 82vh; overflow: auto; padding: 38px 42px 34px; color: #2a1810; cursor: auto;' +
            'background: var(--paper-art, radial-gradient(ellipse at 30% 20%, #efe0bd, #d8c090 70%, #b89a64)) center / 100% 100% no-repeat;' +
            'box-shadow: 0 20px 50px rgba(0,0,0,.7), inset 0 0 50px rgba(90,50,20,.45); transform: rotate(-1.2deg); font: 1.15rem/1.6 "IM Fell English", Georgia, serif; }' +
        '.paper-view .pv-sheet::before { content: ""; position: absolute; right: 26px; top: 20px; width: 60px; height: 50px; pointer-events: none; opacity: .75;' +
            'background: radial-gradient(ellipse at 40% 40%, #7a0d10 0 30%, transparent 32%), radial-gradient(circle at 80% 75%, #7a0d10 0 9%, transparent 11%), radial-gradient(circle at 20% 85%, #7a0d10 0 6%, transparent 8%); }' +
        '.paper-view h2 { margin: 0 0 12px; font: normal 1.6rem "IM Fell English SC", Georgia, serif; color: #5a0d0d; }' +
        '.paper-view .pv-text { white-space: pre-wrap; }' +
        '.paper-view .pv-sign { margin-top: 18px; text-align: right; font-style: italic; }' +
        '.paper-view .pv-empty { font-style: italic; color: #6e5236; }' +
        'body.paper-open .place-tabs, body.paper-open .cp { opacity: 0; pointer-events: none; }' +
        // the books on the shelf that aren't the one
        '.shelf-book.decoy.nudge { animation: sb-nudge .5s ease-out; }' +
        '@keyframes sb-nudge { 0%, 100% { transform: none; } 35% { transform: rotate(-9deg) translateX(-8%); } 65% { transform: rotate(3deg); } }' +
        '.dungeon .character .bubble { color: #3a2716; }' +
        '@media (prefers-reduced-motion: reduce) { .dg-glow, .candle .cd-flame { animation: none; } }'
    );

    /* ---------------- the candles ---------------- */
    function candleArt(sconce) {
        return '<svg class="placeholder" viewBox="0 0 30 90" aria-hidden="true">' +
            (sconce ? '<path d="M-4 70 H34 L28 80 H2 Z" fill="#4a4446"/><path d="M15 80 V90" stroke="#4a4446" stroke-width="4"/>' : '<ellipse cx="15" cy="87" rx="12" ry="3" fill="#221d20"/><path d="M5 84 Q15 90 25 84 L23 80 H7 Z" fill="#1a1618"/>') +
            '<path d="M7 8 Q7 4 11 5 L19 4 Q23 4 23 8 V' + (sconce ? 70 : 82) + ' H7 Z" fill="#141113"/>' +                 // black wax
            '<path d="M8.5 8 H10.5 V' + (sconce ? 70 : 82) + ' H8.5 Z" fill="#3a3437" opacity=".8"/>' +                          // a dull sheen
            '<path d="M19 6 Q22 16 20 22 Q18 18 18 8 Z M9 6 Q6 12 8 15 Q10 12 10 6 Z" fill="#221d20"/>' +                     // drips
            '<path d="M15 5 V0" stroke="#bda98a" stroke-width="1.2"/></svg>';
    }
    var candles = Array.prototype.slice.call(dg.querySelectorAll('.candle'));
    var glows = candles.map(function (c) {
        if (!c.querySelector('.placeholder, img')) c.insertAdjacentHTML('afterbegin', candleArt(c.classList.contains('sconce')));
        c.insertAdjacentHTML('beforeend', '<span class="cd-flame" aria-hidden="true"></span>');
        var g = document.createElement('span');
        g.className = 'dg-glow' + (c.offsetWidth < 22 ? ' small' : '');
        g.style.animationDelay = (-Math.random() * 3).toFixed(2) + 's';
        g.style.animationDuration = (2.6 + Math.random() * 1.4).toFixed(2) + 's';
        dg.appendChild(g);
        return g;
    });
    // your own candle picture: no drawn flame on it (yours can flicker as a GIF)
    new MutationObserver(function () { candles.forEach(function (c) { c.classList.toggle('has-art', !!c.querySelector('img.art, .art')); }); })
        .observe(dg, { childList: true, subtree: true });
    function placeGlows() {
        candles.forEach(function (c, i) {
            var show = c.offsetWidth > 0;
            glows[i].style.display = show ? '' : 'none';
            glows[i].style.left = (c.offsetLeft + c.offsetWidth / 2) + 'px';
            glows[i].style.top = (c.offsetTop + c.offsetWidth * 0.2) + 'px';
        });
    }
    placeGlows();
    window.addEventListener('resize', placeGlows);
    window.addEventListener('load', placeGlows);
    setTimeout(placeGlows, 600);

    /* ---------------- the paper on the floor (write it in the content manager: notes -> the paper in the dungeon) ---------------- */
    var paperEl = dg.querySelector('.dungeon-paper');
    if (paperEl) {
        if (!paperEl.querySelector('.placeholder, img')) paperEl.insertAdjacentHTML('afterbegin', '<svg class="placeholder" viewBox="0 0 100 70" aria-hidden="true">' +
            '<path d="M4 8 L92 2 L96 60 Q60 66 8 68 Z" fill="#d9c79c"/><path d="M4 8 L92 2 L96 60 Q60 66 8 68 Z" fill="none" stroke="#8a7248" stroke-width="1"/>' +
            '<g stroke="#5a3a24" stroke-width="1.2" opacity=".55"><path d="M16 18 H70 M16 26 H80 M16 34 H62 M16 42 H76 M16 50 H54"/></g>' +
            '<path d="M70 44 q6 -4 10 2 q2 6 -6 8 q-8 0 -4 -10" fill="#7a0d10" opacity=".8"/></svg>');
        paperEl.insertAdjacentHTML('beforeend', '<span class="dp-hint">a note</span>');
        var pv = document.createElement('div');
        pv.className = 'paper-view';
        pv.setAttribute('role', 'dialog');
        pv.setAttribute('aria-label', 'the note');
        pv.innerHTML = '<div class="pv-sheet"><h2 hidden></h2><div class="pv-text"></div><div class="pv-sign" hidden></div></div>';
        body.appendChild(pv);
        Sky.findAsset('assets/living/dungeon-paper-open', function (url) { if (url) pv.querySelector('.pv-sheet').style.setProperty('--paper-art', 'url("' + new URL(url, location.href).href + '")'); });
        var readPaper = function () {
            fetch('content/dungeon/paper.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }).then(function (d) {
                var h = pv.querySelector('h2'), t = pv.querySelector('.pv-text'), sg = pv.querySelector('.pv-sign');
                h.textContent = d.title || ''; h.hidden = !d.title;
                t.textContent = d.text || '';
                t.classList.toggle('pv-empty', !d.text);
                if (!d.text) t.textContent = 'the page is blank… for now.';
                sg.textContent = d.sign ? '\u2014 ' + d.sign : ''; sg.hidden = !d.sign;
                pv.classList.add('open');
                body.classList.add('paper-open');
                if (Sky.sounds) Sky.sounds.sfx('paper-unroll');
            });
        };
        var closePaper = function () { if (!pv.classList.contains('open')) return; pv.classList.remove('open'); body.classList.remove('paper-open'); if (Sky.sounds) Sky.sounds.sfx('paper-roll'); };
        paperEl.addEventListener('click', function (e) { if (body.classList.contains('inv-holding')) return; e.stopPropagation(); readPaper(); });
        paperEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); readPaper(); } });
        pv.addEventListener('click', function (e) { if (!e.target.closest('.pv-sheet')) closePaper(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pv.classList.contains('open')) { e.stopImmediatePropagation(); closePaper(); } }, true);
    }

    /* ---------------- the decoy books on the shelf: just books ---------------- */
    var BOOK_LINES = ['just a book.', 'dusty.', 'nope.', 'a very boring book.', 'it doesn\u2019t budge.'];
    function bookArt(c1, c2) {
        return '<svg class="placeholder" viewBox="0 0 15 52" aria-hidden="true"><rect x="0.5" y="0.5" width="14" height="51" rx="1.5" fill="' + c1 + '" stroke="rgba(0,0,0,.5)"/>' +
            '<path d="M2 7 H13 M2 45 H13" stroke="' + c2 + '" stroke-width="1.4"/><rect x="4.5" y="18" width="6" height="16" rx="1" fill="rgba(0,0,0,.28)"/></svg>';
    }
    var COLORS = [['#2f4a3a', '#c49a52'], ['#3a2f55', '#d8c08a'], ['#6e4a20', '#e8d6a8'], ['#1f3550', '#c49a52']];
    Array.prototype.forEach.call(document.querySelectorAll('.shelf-book'), function (b, i) {
        if (!b.querySelector('.sb-hint')) b.insertAdjacentHTML('beforeend', '<span class="sb-hint">a book</span>');
        if (!b.classList.contains('decoy')) return;
        if (!b.querySelector('.placeholder, img')) b.insertAdjacentHTML('afterbegin', bookArt.apply(null, COLORS[i % COLORS.length]));
        // clicked: a book with pages opens (sky/books.js); one without is just a book
        b.addEventListener('click', function (e) {
            e.preventDefault();
            if (Sky.books && Sky.books.open(b)) return;
            b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge');
            if (Sky.sounds) Sky.sounds.sfx('land', { size: 0.12 });
            if (Sky.inventory) Sky.inventory.say(BOOK_LINES[Math.floor(Math.random() * BOOK_LINES.length)], 1600);
        });
    });

    /* ---------------- its sound, and the quiet it makes of everything else ---------------- */
    var ch = Sky.sounds ? Sky.sounds.channel('dungeon') : null;
    var down = false;
    function enter() {
        if (down) return;
        down = true;
        try { if (localStorage.getItem('dungeon-found') !== '1') { localStorage.setItem('dungeon-found', '1'); document.dispatchEvent(new CustomEvent('dav:dungeon-found')); } } catch (e) {}
        placeGlows();
        if (Sky.music && Sky.music.hush) Sky.music.hush(true);
        if (Sky.noise && Sky.noise.hush) Sky.noise.hush(true);
        if (ch) ch.set(LOUD, 0.05);
    }
    function leave() {
        if (!down) return;
        down = false;
        if (ch) ch.set(0, 0.5);
        if (Sky.noise && Sky.noise.hush) Sky.noise.hush(false);
        if (Sky.music && Sky.music.hush) Sky.music.hush(false);
    }
    if (Sky.sides && Sky.sides.on) Sky.sides.on(function (what, name) {
        if (name !== 'dungeon') return;
        if (what === 'enter') enter(); else leave();
    });
    // (off to another page from down here: the music picks up again over there; sky/music.js remembers it was on)
})();

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

    // (its look is in sky/css/dungeon.css, linked from each page's head)

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
            // this reset's own note (the content manager's resets tabs: assets/resets/reset-<n>/note.json), or the usual one
            var S = window.davSave;
            (S ? S.overrides().then(function (have) { return S.ownFile('note.json', have); }) : Promise.resolve(null)).then(function (own) {
                return fetch(own || 'content/dungeon/paper.json', { cache: 'no-cache' });
            }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }).then(function (d) {
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

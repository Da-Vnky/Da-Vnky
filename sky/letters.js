/* =====================================================================
   letters.js — turns each <article class="letter" data-date="…"> into an
   aged, curled paper letter. If the page has the sea (ground-sea.js),
   today's letter arrives corked in a bottle.
   Load after sky/sky.js and the ground script.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var section = document.querySelector('.letters');
    if (!section) return;

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

    /* ---------------- ink shapes ---------------- */
    var defs = document.createElement('div');
    defs.setAttribute('aria-hidden', 'true');
    defs.innerHTML =
        '<svg width="0" height="0" style="position:absolute"><defs>' +
            '<filter id="bleed" x="-20%" y="-20%" width="140%" height="140%">' +
                '<feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="4"/>' +
                '<feDisplacementMap in="SourceGraphic" scale="7"/>' +
            '</filter>' +
            '<symbol id="blot-a" viewBox="0 0 100 100"><g fill="currentColor" filter="url(#bleed)">' +
                '<path d="M50 22 C62 15 79 23 80 37 C91 42 88 57 78 61 C76 75 60 83 48 77 C35 84 20 74 23 62 C10 55 13 40 25 36 C25 24 38 17 50 22 Z"/>' +
                '<circle cx="90" cy="24" r="4"/><circle cx="12" cy="84" r="3"/><circle cx="84" cy="80" r="2"/><circle cx="96" cy="46" r="1.6"/>' +
            '</g></symbol>' +
            '<symbol id="blot-b" viewBox="0 0 100 100"><g fill="currentColor" filter="url(#bleed)">' +
                '<path d="M40 40 C48 30 62 34 64 44 C74 46 72 60 62 62 C58 72 42 70 40 60 C30 58 30 44 40 40 Z"/>' +
                '<path d="M62 52 C74 56 86 62 92 70 C84 68 72 64 62 58 Z"/>' +
                '<circle cx="94" cy="74" r="2.6"/><circle cx="24" cy="30" r="2"/><circle cx="30" cy="72" r="1.5"/>' +
            '</g></symbol>' +
            '<symbol id="splatter" viewBox="0 0 100 100"><g fill="currentColor" filter="url(#bleed)">' +
                '<circle cx="50" cy="50" r="7"/><circle cx="68" cy="42" r="3"/><circle cx="34" cy="60" r="2.4"/><circle cx="60" cy="68" r="2"/>' +
                '<circle cx="80" cy="30" r="1.6"/><circle cx="22" cy="40" r="1.4"/><circle cx="44" cy="80" r="1.2"/><circle cx="86" cy="58" r="1"/>' +
            '</g></symbol>' +
            '<symbol id="star-pen" viewBox="0 0 100 100"><path d="M50 10 L73 81 L13 37 L87 38 L27 82 Z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/></symbol>' +
            '<symbol id="star-twinkle" viewBox="0 0 100 100"><path d="M50 6 C53 38 62 47 94 50 C62 53 53 62 50 94 C47 62 38 53 6 50 C38 47 47 38 50 6 Z" fill="currentColor"/></symbol>' +
            '<symbol id="star-asterisk" viewBox="0 0 100 100"><g stroke="currentColor" stroke-width="5" stroke-linecap="round">' +
                '<line x1="50" y1="12" x2="50" y2="88"/><line x1="17" y1="31" x2="83" y2="69"/><line x1="17" y1="69" x2="83" y2="31"/>' +
            '</g></symbol>' +
        '</defs></svg>';
    document.body.insertBefore(defs, document.body.firstChild);

    /* ---------------- letters from the folder (content/sea/), plus any written into the page ---------------- */
    var folder = section.dataset.folder;
    if (folder) {
        Sky.listFolder(folder, ['html', 'txt'], function (files) {
            Promise.all(files.map(function (f) {
                return fetch(f.url, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : null; })
                    .catch(function () { return null; })
                    .then(function (text) {
                        if (text === null || /<html[\s>]/i.test(text)) return null;       // missing file, or a 404 page
                        var a = document.createElement('article');
                        a.className = 'letter';
                        a.dataset.id = f.name;
                        var d = Sky.fileDate(f.name);
                        if (d) a.dataset.date = d; else a.setAttribute('data-nodate', '');
                        a.innerHTML = /\.txt$/i.test(f.name) ? Sky.txtToHtml(text) : text;
                        return a;
                    });
            })).then(function (arts) {
                arts.forEach(function (a) { if (a) section.appendChild(a); });
                begin();
            });
        });
    } else begin();

    function begin() {
    /* ---------------- build the letters ---------------- */
    var today = ymd(new Date());
    var letters = Array.prototype.slice.call(section.querySelectorAll('article.letter'));
    var bottled = null;

    // newest first; undated letters keep their place at the end
    letters.sort(function (a, b) { return (b.dataset.date || '').localeCompare(a.dataset.date || ''); });
    letters.forEach(function (a) { section.appendChild(a); });

    var MARKS = ['blot-a', 'blot-b', 'splatter', 'star-pen', 'star-twinkle', 'star-asterisk', 'star-pen', 'star-twinkle'];

    function dateLabel(s) {
        var parts = s.split('-');
        if (parts.length !== 3) return '';
        var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase();
    }

    function buildLetter(a) {
        var date = a.dataset.date || '';
        var rnd = Sky.seeded(Sky.hashStr(date || a.textContent.slice(0, 40)));
        var marks = '';
        var n = 7 + Math.floor(rnd() * 5);
        for (var i = 0; i < n; i++) {
            var id = MARKS[Math.floor(rnd() * MARKS.length)];
            var isStar = id.indexOf('star') === 0;
            var size = isStar ? 8 + rnd() * 18 : (id === 'splatter' ? 30 + rnd() * 25 : 36 + rnd() * 70);
            var side = rnd() < 0.5 ? 'left' : 'right';
            var cls = isStar ? 'star' + (rnd() < 0.4 ? ' red' : '') : 'blot' + (rnd() < 0.4 ? ' faint' : '');
            if (i > 5) cls += ' hide-small';
            marks += '<svg class="' + cls + '" style="top:' + (3 + rnd() * 90).toFixed(1) + '%; ' + side + ':' +
                     ((isStar ? -2 : -5) + rnd() * (isStar ? 9 : 6)).toFixed(1) + '%; width:' + size.toFixed(0) + 'px; height:' +
                     size.toFixed(0) + 'px; transform:rotate(' + Math.floor(rnd() * 360) + 'deg)"><use href="#' + id + '"/></svg>';
        }
        var label = a.hasAttribute('data-nodate') ? '' : dateLabel(date);
        a.innerHTML =
            '<div class="curl curl-top"></div>' +
            '<div class="sheet">' +
                '<div class="marks" aria-hidden="true">' + marks + '</div>' +
                '<div class="content">' + (label ? '<p class="date">' + label + '</p>' : '') + a.innerHTML + '</div>' +
            '</div>' +
            '<div class="curl curl-bottom"></div>';
        a.dataset.rot = ((rnd() - 0.5) * 1.4).toFixed(2);
        a.style.transform = 'rotate(' + a.dataset.rot + 'deg)';
    }

    // which letters has this visitor already seen? a letter they haven't (a file you just
    // added, dated or not) arrives in the bottle. only one bottle at a time: the newest.
    var SEEN = 'letters-seen', seen = null;
    try { seen = JSON.parse(localStorage.getItem(SEEN)); } catch (e) {}
    var shown = [];
    letters.forEach(function (a) {
        var d = a.dataset.date || '';
        if (d && d > today) { a.style.display = 'none'; return; }    // not its day yet
        if (!a.dataset.id) a.dataset.id = 'page:' + d + ':' + a.textContent.trim().slice(0, 30);
        buildLetter(a);
        shown.push(a);
    });
    var ids = shown.map(function (a) { return a.dataset.id; });
    function markAllSeen() { try { localStorage.setItem(SEEN, JSON.stringify(ids)); } catch (e) {} }
    var board = Sky.sea && Sky.sea.el.querySelector('.dock-board');
    if (Sky.sea && shown.length) {
        if (location.hash === '#bottle' || !Array.isArray(seen)) bottled = shown[0];     // first visit (or #bottle): the newest
        else for (var si = 0; si < shown.length; si++) if (seen.indexOf(ids[si]) === -1) { bottled = shown[si]; break; }
    }
    if (bottled && bottled !== shown[0]) { shown.splice(shown.indexOf(bottled), 1); shown.unshift(bottled); }   // the new one goes on top
    if (!board) {                                                                       // no sea: the letters simply sit on the page
        shown.forEach(function (a) { section.appendChild(a); });
        Sky.refresh();
        markAllSeen();
        return;
    }

    /* ======================================================================
       by the sea, the letters aren't on the page: a new one arrives in a bottle
       and is read right there (the day and the ship stay just where they are).
       read, it goes onto the board on the dock, where all of them can be read.
       ====================================================================== */
    Sky.css(
        '.letter-open, .letters-view { position: fixed; inset: 0; z-index: 8; overflow-y: auto; overscroll-behavior: contain; visibility: hidden; opacity: 0;' +
            'transition: opacity .45s, visibility 0s .45s; }' +
        '.letter-open.open, .letters-view.open { visibility: visible; opacity: 1; transition: opacity .45s; }' +
        '.letter-open { background: radial-gradient(ellipse at 50% 42%, rgba(18,22,32,.3), rgba(8,10,16,.72) 80%); }' +
        '.letters-view { background: rgba(12,16,24,.84); }' +
        '.lo-inner, .lv-list { padding: 74px 16px 60px; }' +
        '.letter-open .letter, .letters-view .letter { margin: 0 auto 70px; }' +
        '.lo-close, .lv-close { position: fixed; top: 16px; left: 16px; z-index: 3; border: 0; cursor: pointer; padding: 8px 18px;' +
            'border-radius: 999px; font: italic 1.05rem "IM Fell English", Georgia, serif; background: #3a2716; color: #f3e6c2; box-shadow: 0 4px 12px rgba(0,0,0,.45); }' +
        '.lo-close:hover, .lv-close:hover { background: #9a3b1f; }' +
        '.lv-title { text-align: center; margin: 0 0 34px; font: normal 1.8rem "IM Fell English SC", Georgia, serif; color: #f3e6c2; text-shadow: 0 2px 6px rgba(0,0,0,.6); }' +
        'body.letter-reading .signpost, body.letter-reading .post-btn, body.letter-reading .cp { opacity: 0; pointer-events: none; transition: opacity .3s; }' +
        '.flying-scroll { z-index: 9 !important; }' +
        '.letters[hidden] { display: none; }' +
        '.letters-btn { left: 18px; top: 18px; bottom: auto; }' +
        'body.letter-reading .letters-btn, body.post-open .letters-btn, body.sky-view .letters-btn { opacity: 0; visibility: hidden; pointer-events: none; }'
    );
    section.hidden = true;

    // the credit goes to the very end of the voyage (and at the foot of the letters)
    var credit = document.querySelector('.credit');
    if (credit) document.body.appendChild(credit);

    var lo = document.createElement('div');
    lo.className = 'letter-open';
    lo.setAttribute('role', 'dialog');
    lo.setAttribute('aria-label', 'a letter');
    lo.innerHTML = '<button type="button" class="lo-close">roll it back up</button><div class="lo-inner"></div>';
    var lv = document.createElement('div');
    lv.className = 'letters-view';
    lv.setAttribute('role', 'dialog');
    lv.setAttribute('aria-label', 'every letter');
    lv.innerHTML = '<button type="button" class="lv-close">back to the sea</button><div class="lv-list"><h2 class="lv-title">letters from the sea</h2></div>';
    document.body.appendChild(lo);
    document.body.appendChild(lv);
    var list = lv.querySelector('.lv-list'), inner = lo.querySelector('.lo-inner');
    shown.forEach(function (a) { list.appendChild(a); });                               // they live on the board
    if (credit) list.appendChild(credit.cloneNode(true));

    function drawBoard() {
        board.querySelector('.db-count').textContent = shown.length;
        board.setAttribute('aria-label', 'the letters board: ' + shown.length + (shown.length === 1 ? ' letter' : ' letters'));
    }
    drawBoard();
    board.classList.toggle('show', !bottled);
    function openAll() {
        lv.scrollTop = 0;
        lv.classList.add('open');
        document.body.classList.add('letter-reading');
        lv.querySelector('.lv-close').focus({ preventScroll: true });
    }
    function closeAll() { lv.classList.remove('open'); document.body.classList.remove('letter-reading'); }
    board.addEventListener('click', openAll);

    // and a button in the corner, so the letters are one click away wherever you are on the voyage
    // (icon slot: assets/ui/letters)
    var lbtn = document.createElement('button');
    lbtn.type = 'button';
    lbtn.className = 'ui-button letters-btn';
    lbtn.innerHTML = '<span class="ui-icon" data-asset="assets/ui/letters"><svg class="placeholder" viewBox="0 0 32 32" aria-hidden="true">' +
        '<rect x="5" y="9" width="20" height="15" rx="1.5" fill="#efe3c6" transform="rotate(-8 15 16)"/>' +
        '<rect x="7" y="8" width="20" height="15" rx="1.5" fill="#f6ecd4" stroke="#6e5236" stroke-width=".8"/>' +
        '<path d="M10 12.5 H24 M10 15.5 H24 M10 18.5 H19" stroke="#6e5236" stroke-width="1" stroke-linecap="round"/>' +
        '<circle cx="24" cy="21" r="2.4" fill="#9a3b1f"/></svg></span><span class="lb-label"></span>';
    document.body.appendChild(lbtn);
    function labelBtn() { lbtn.querySelector('.lb-label').textContent = 'letters (' + shown.length + ')'; }
    labelBtn();
    lbtn.addEventListener('click', openAll);
    board.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAll(); } });
    lv.querySelector('.lv-close').addEventListener('click', closeAll);
    lv.addEventListener('click', function (e) { if (e.target === lv || e.target === list) closeAll(); });

    var reading = null;
    // read one letter over the sea
    function openLetter(a, from) {
        reading = a;
        inner.appendChild(a);
        lo.scrollTop = 0;
        lo.classList.add('open');
        document.body.classList.add('letter-reading');
        lo.querySelector('.lo-close').focus({ preventScroll: true });
        if (from) requestAnimationFrame(function () { from(a); });
    }
    // roll it back up: it flies to the board on the dock, which (if it wasn't there yet) pops up
    function closeLetter() {
        var a = reading;
        if (!a) return;
        reading = null;
        if (Sky.sounds) Sky.sounds.sfx('paper-roll');
        markAllSeen();
        var wasHidden = !board.classList.contains('show');
        board.classList.add('show');
        var r = a.getBoundingClientRect(), b = board.getBoundingClientRect();
        var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        function done() {
            a.getAnimations().forEach(function (x) { x.cancel(); });
            list.insertBefore(a, list.children[1] || null);
            lo.classList.remove('open');
            document.body.classList.remove('letter-reading');
            if (wasHidden && !calm) board.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: .7 }, { transform: 'scale(1)' }],
                { duration: 500, easing: 'cubic-bezier(.3,.7,.4,1.3)' });
            else if (!calm) board.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 380 });
        }
        if (calm) { done(); return; }
        lo.style.transition = 'opacity .5s .25s, visibility 0s .75s';
        lo.classList.remove('open');
        lo.style.visibility = 'visible';
        var k = Math.max(0.03, b.width / r.width * 0.5);
        a.animate([
            { transform: 'rotate(' + (+a.dataset.rot || 0) + 'deg)', opacity: 1 },
            { transform: 'translate(' + (b.left + b.width / 2 - (r.left + r.width / 2)) + 'px,' + (b.top + b.height * 0.35 - (r.top + r.height / 2)) + 'px) scale(' + k + ') rotate(-8deg)', opacity: 0.7 }
        ], { duration: 800, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).onfinish = function () {
            lo.style.transition = ''; lo.style.visibility = '';
            done();
        };
    }
    lo.querySelector('.lo-close').addEventListener('click', closeLetter);
    lo.addEventListener('click', function (e) { if (e.target === lo || e.target === inner) closeLetter(); });
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (lo.classList.contains('open')) { e.stopImmediatePropagation(); closeLetter(); }
        else if (lv.classList.contains('open')) { e.stopImmediatePropagation(); closeAll(); }
    }, true);

    if (!bottled) { markAllSeen(); return; }

    /* ---------------- today's bottle ---------------- */
    var hint = document.createElement('p');
    hint.className = 'bottle-hint';
    hint.innerHTML = 'a bottle washed in<small>pull its cork, or just click it</small>';

    var bottleWrap = document.createElement('div');
    bottleWrap.className = 'bottle-wrap';
    bottleWrap.title = 'pull the cork';
    bottleWrap.innerHTML = Sky.bottleSVG('bottle');
    Sky.sea.el.insertBefore(bottleWrap, Sky.sea.front);
    Sky.sea.el.appendChild(hint);

    var bottleSvg = bottleWrap.querySelector('.bottle');
    var cork      = bottleWrap.querySelector('.b-cork');
    var rolled    = bottleWrap.querySelector('.b-scroll');
    var opening = false, corkDrag = null, bottleAngle = -12;

    Sky.onFrame(function (p) {
        if (!bottleWrap) return;
        var br = p * Math.PI * 3.1;
        bottleAngle = -12 + Math.sin(br) * 6;
        bottleWrap.style.transform = 'translateY(' + (Math.sin(br + 1) * 5) + 'px) rotate(' + bottleAngle + 'deg)';
    });

    function bottleScale() { return bottleWrap.offsetWidth / 200; }

    // pull the cork: it follows your pointer a little, then pops once pulled far enough
    cork.addEventListener('pointerdown', function (e) {
        if (opening) return;
        e.preventDefault();
        e.stopPropagation();
        cork.setPointerCapture(e.pointerId);
        corkDrag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
    });
    cork.addEventListener('pointermove', function (e) {
        if (!corkDrag) return;
        var s = bottleScale();
        corkDrag.dx = (e.clientX - corkDrag.x) / s;
        corkDrag.dy = (e.clientY - corkDrag.y) / s;
        if (Math.hypot(corkDrag.dx, corkDrag.dy) > 34) { uncork(); return; }
        cork.style.transform = 'translate(' + corkDrag.dx + 'px, ' + corkDrag.dy + 'px)';
    });
    cork.addEventListener('pointerup', function () { if (corkDrag) uncork(); });
    bottleWrap.addEventListener('click', function () { uncork(); });

    function uncork() {
        if (opening) return;
        opening = true;
        var fx = corkDrag ? corkDrag.dx : 0, fy = corkDrag ? corkDrag.dy : 0;
        corkDrag = null;
        // 1. the cork pops off and tumbles away
        cork.animate([
            { transform: 'translate(' + fx + 'px, ' + fy + 'px) rotate(0deg)', opacity: 1 },
            { transform: 'translate(' + (fx + 70) + 'px, ' + (fy - 110) + 'px) rotate(460deg)', opacity: 0 }
        ], { duration: 800, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
        hint.style.opacity = 0;
        if (Sky.sounds) Sky.sounds.sfx('cork-pop');
        // 2. the rolled letter slides out of the neck (right where you are: the day doesn't change)
        rolled.animate([{ transform: 'translateX(0px)' }, { transform: 'translateX(120px)' }],
            { duration: 650, easing: 'ease-in', fill: 'forwards' }).onfinish = function () {
            bottled.classList.add('corked');
            openLetter(bottled, fly);
        };
    }

    // 3. the roll flies up and becomes the letter's top edge; the empty bottle sinks
    function fly(letter) {
        var s = bottleScale();
        var r = rolled.getBoundingClientRect();
        var L = 100 * s, T = Math.max(10, 16 * s);
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        rolled.style.opacity = 0;

        var bar = document.createElement('div');
        bar.className = 'flying-scroll';
        document.body.appendChild(bar);

        var lr = letter.getBoundingClientRect();
        var rot = +letter.dataset.rot || 0;
        bar.animate([
            { left: (cx - L / 2) + 'px', top: (cy - T / 2) + 'px', width: L + 'px', height: T + 'px', transform: 'rotate(' + bottleAngle + 'deg)' },
            { left: ((cx - L * 0.75) + (lr.left - 12)) / 2 + 'px', top: Math.min(cy, lr.top) - 90 + 'px', width: (L * 1.5) + 'px', height: '20px', transform: 'rotate(' + (bottleAngle / 3) + 'deg)', offset: 0.45 },
            { left: (lr.left - 12) + 'px', top: (lr.top - 12) + 'px', width: (lr.width + 24) + 'px', height: '24px', transform: 'rotate(' + rot + 'deg)' }
        ], { duration: 1050, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' })
           .onfinish = function () { unroll(letter, bar, lr); };
        setTimeout(function () { bar.classList.add('untied'); }, 450);

        bottleSvg.animate([
            { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
            { transform: 'translateY(70px) rotate(28deg)', opacity: 0 }
        ], { duration: 1600, delay: 300, easing: 'ease-in', fill: 'forwards' })
         .onfinish = function () { bottleWrap.remove(); bottleWrap = null; hint.remove(); };
    }

    // 4. the letter unrolls downward (the roll and the reveal move together)
    function unroll(letter, bar, lr) {
        var bottom = Math.min(lr.bottom, window.innerHeight + 40);
        var dur = 1150, ease = 'cubic-bezier(.45,.05,.35,1)';
        if (Sky.sounds) Sky.sounds.sfx('paper-unroll');
        var reveal = letter.animate([
            { clipPath: 'inset(-40px -100px 100% -100px)' },
            { clipPath: 'inset(-40px -100px 0% -100px)' }
        ], { duration: dur, easing: ease, fill: 'forwards' });
        bar.animate([{ top: (lr.top - 12) + 'px' }, { top: (bottom - 12) + 'px' }],
            { duration: dur, easing: ease, fill: 'forwards' });
        reveal.onfinish = function () {
            letter.classList.remove('corked');
            reveal.cancel();
            bar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' })
               .onfinish = function () { bar.remove(); };
        };
    }
    }   // begin()
})();

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
    if (Sky.sea && shown.length) {
        if (location.hash === '#bottle' || !Array.isArray(seen)) bottled = shown[0];     // first visit (or #bottle): the newest
        else for (var si = 0; si < shown.length; si++) if (seen.indexOf(ids[si]) === -1) { bottled = shown[si]; break; }
    }
    if (bottled && bottled !== shown[0]) section.insertBefore(bottled, shown[0]);      // the new one goes on top
    Sky.refresh();

    if (!bottled) { markAllSeen(); return; }

    /* ---------------- today's bottle ---------------- */
    bottled.classList.add('corked');

    var hint = document.createElement('p');
    hint.className = 'bottle-hint';
    hint.innerHTML = 'a bottle washed in<small>pull its cork, or just click it</small>';

    // while it's corked, keep the older letters below the fold so the sea stays clear
    function reserveSea() {
        if (!bottled.classList.contains('corked')) return;
        bottled.style.marginBottom = '';
        var bottom = bottled.getBoundingClientRect().bottom + window.scrollY;
        bottled.style.marginBottom = Math.max(110, window.innerHeight + 40 - bottom) + 'px';
    }
    reserveSea();
    window.addEventListener('resize', reserveSea);

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

    function whenAtTop(cb) {
        if (window.scrollY < 4) return cb();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        var t0 = performance.now();
        (function check() {
            if (window.scrollY < 4 || performance.now() - t0 > 1800) cb();
            else requestAnimationFrame(check);
        })();
    }

    function uncork() {
        if (opening) return;
        opening = true;
        markAllSeen();
        var fx = corkDrag ? corkDrag.dx : 0, fy = corkDrag ? corkDrag.dy : 0;
        corkDrag = null;

        // 1. the cork pops off and tumbles away
        cork.animate([
            { transform: 'translate(' + fx + 'px, ' + fy + 'px) rotate(0deg)', opacity: 1 },
            { transform: 'translate(' + (fx + 70) + 'px, ' + (fy - 110) + 'px) rotate(460deg)', opacity: 0 }
        ], { duration: 800, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
        hint.style.opacity = 0;

        // 2. the rolled letter slides out of the neck
        whenAtTop(function () {
            rolled.animate([{ transform: 'translateX(0px)' }, { transform: 'translateX(120px)' }],
                { duration: 650, easing: 'ease-in', fill: 'forwards' }).onfinish = fly;
        });
    }

    // 3. the roll flies up and becomes the letter's top edge; the empty bottle sinks
    function fly() {
        var s = bottleScale();
        var r = rolled.getBoundingClientRect();
        var L = 100 * s, T = Math.max(10, 16 * s);
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        rolled.style.opacity = 0;

        var bar = document.createElement('div');
        bar.className = 'flying-scroll';
        document.body.appendChild(bar);

        var lr = bottled.getBoundingClientRect();
        var rot = +bottled.dataset.rot || 0;
        bar.animate([
            { left: (cx - L / 2) + 'px', top: (cy - T / 2) + 'px', width: L + 'px', height: T + 'px', transform: 'rotate(' + bottleAngle + 'deg)' },
            { left: ((cx - L * 0.75) + (lr.left - 12)) / 2 + 'px', top: Math.min(cy, lr.top) - 90 + 'px', width: (L * 1.5) + 'px', height: '20px', transform: 'rotate(' + (bottleAngle / 3) + 'deg)', offset: 0.45 },
            { left: (lr.left - 12) + 'px', top: (lr.top - 12) + 'px', width: (lr.width + 24) + 'px', height: '24px', transform: 'rotate(' + rot + 'deg)' }
        ], { duration: 1050, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' })
           .onfinish = function () { unroll(bar, lr); };
        setTimeout(function () { bar.classList.add('untied'); }, 450);

        bottleSvg.animate([
            { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
            { transform: 'translateY(70px) rotate(28deg)', opacity: 0 }
        ], { duration: 1600, delay: 300, easing: 'ease-in', fill: 'forwards' })
         .onfinish = function () { bottleWrap.remove(); bottleWrap = null; };
    }

    // 4. the letter unrolls downward (the roll and the reveal move together)
    function unroll(bar, lr) {
        var dur = 1150, ease = 'cubic-bezier(.45,.05,.35,1)';
        var reveal = bottled.animate([
            { clipPath: 'inset(-40px -100px 100% -100px)' },
            { clipPath: 'inset(-40px -100px 0% -100px)' }
        ], { duration: dur, easing: ease, fill: 'forwards' });
        bar.animate([{ top: (lr.top - 12) + 'px' }, { top: (lr.bottom - 12) + 'px' }],
            { duration: dur, easing: ease, fill: 'forwards' });
        reveal.onfinish = function () {
            bottled.classList.remove('corked');
            reveal.cancel();
            bar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' })
               .onfinish = function () { bar.remove(); };
            hint.remove();
            bottled.style.transition = 'margin-bottom 1s ease';
            bottled.style.marginBottom = '110px';
            setTimeout(Sky.refresh, 1050);
        };
    }
    }   // begin()
})();

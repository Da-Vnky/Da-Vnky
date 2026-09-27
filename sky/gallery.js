/* =====================================================================
   gallery.js — the workshop easel. Paintings and drawings come from a
   folder (every image in it is a page on the easel's pad). Click the easel
   to step up close; flip pages up for the next, down for the one before.

       <div class="furnish easel" data-folder="content/workshop/"> … </div>
       <script src="sky/gallery.js"></script>          (after sky/sky.js)

   files: .png .jpg .jpeg .webp .gif .svg (and .mp4 .webm for moving pieces)
   order: names starting with a date (2026-09-23-…) newest first, then the rest by name.
   caption: from the file name, or a .txt file with the same name beside it.
   a painting hung in one of the workshop's frames (content/workshop/frames.json)
   is on the wall instead, so it leaves the easel until it's taken down.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var easel = document.querySelector('.easel[data-folder]');
    if (!easel) return;
    var IMG = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'mp4', 'webm'];

    // (its look is in sky/css/gallery.css, linked from each page's head)

    /* ---------------- the easel on the floor ---------------- */
    var canvas = document.createElement('div');
    canvas.className = 'easel-canvas';
    canvas.innerHTML = '<span class="blank"></span>';
    easel.appendChild(canvas);
    var hint = document.createElement('span');
    hint.className = 'easel-hint';
    hint.textContent = 'look closer';
    easel.appendChild(hint);
    easel.setAttribute('role', 'button');
    easel.setAttribute('tabindex', '0');
    easel.setAttribute('aria-label', 'the easel: look at the paintings');

    /* ---------------- the close-up ---------------- */
    var gal = document.createElement('div');
    gal.className = 'gallery';
    gal.setAttribute('role', 'dialog');
    gal.setAttribute('aria-label', 'paintings and drawings');
    gal.innerHTML =
        '<button type="button" class="leave">step back</button>' +
        '<div class="pad"><div class="board"></div><div class="stack"></div><div class="clip"></div></div>' +
        '<div class="bar">' +
            '<button type="button" class="prev" aria-label="previous page"><svg viewBox="0 0 16 16"><path d="M8 13 L2 5 H14 Z"/></svg>back</button>' +
            '<span class="count"></span>' +
            '<button type="button" class="next" aria-label="next page">next<svg viewBox="0 0 16 16"><path d="M8 3 L14 11 H2 Z"/></svg></button>' +
        '</div>';
    document.body.appendChild(gal);
    var pad = gal.querySelector('.pad'), stack = gal.querySelector('.stack');
    var prevBtn = gal.querySelector('.prev'), nextBtn = gal.querySelector('.next'), count = gal.querySelector('.count');

    var works = [], at = 0, busy = false;

    function pageFor(i) {
        var page = document.createElement('div');
        page.className = 'page';
        var front = document.createElement('div'), back = document.createElement('div');
        front.className = 'face front';
        back.className = 'face back';
        page.appendChild(front);
        page.appendChild(back);
        if (!works.length) {
            front.classList.add('empty');
            front.innerHTML = '<div class="art">the pad is blank for now.<br>paintings and drawings go in content/workshop/</div>';
            return page;
        }
        var w = works[i], art = document.createElement('div');
        art.className = 'art';
        art.appendChild(Sky.makeMedia(w.file));
        front.appendChild(art);
        var cap = document.createElement('div');
        cap.className = 'caption';
        cap.textContent = w.title;
        if (w.date) {
            var sm = document.createElement('small');
            sm.textContent = w.date;
            cap.appendChild(sm);
        }
        front.appendChild(cap);
        if (w.captionUrl) {
            fetch(w.captionUrl, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
                t = t.trim();
                if (!t || /<html/i.test(t)) return;
                var lines = t.split(/\r?\n/);
                cap.firstChild.textContent = lines.shift();
                if (lines.join(' ').trim()) {
                    var more = document.createElement('small');
                    more.textContent = lines.join(' ').trim();
                    cap.appendChild(more);
                }
            });
        }
        return page;
    }
    function updateBar() {
        count.textContent = works.length ? (at + 1) + ' / ' + works.length : '';
        prevBtn.disabled = busy || at <= 0;
        nextBtn.disabled = busy || at >= works.length - 1;
    }
    function show(i) {
        stack.innerHTML = '';
        stack.appendChild(pageFor(i));
        updateBar();
    }

    // next: the page lifts from the bottom and flips up over the top of the pad
    function next() {
        if (busy || at >= works.length - 1) return;
        busy = true;
        var old = stack.lastChild;
        at++;
        stack.insertBefore(pageFor(at), old);
        updateBar();
        old.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(172deg)', offset: .92 }, { transform: 'rotateX(180deg)', opacity: 0 }],
            { duration: 820, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' })
            .onfinish = function () { old.remove(); busy = false; updateBar(); };
    }
    // back: the page before comes down over the top and settles
    function prev() {
        if (busy || at <= 0) return;
        busy = true;
        at--;
        var page = pageFor(at);
        stack.appendChild(page);
        updateBar();
        page.animate([{ transform: 'rotateX(180deg)', opacity: 0 }, { transform: 'rotateX(172deg)', opacity: 1, offset: .08 }, { transform: 'rotateX(0deg)' }],
            { duration: 820, easing: 'cubic-bezier(.45,.05,.35,1)' })
            .onfinish = function () { while (stack.children.length > 1) stack.firstChild.remove(); busy = false; updateBar(); };
    }

    function open() {
        if (gal.classList.contains('open')) return;
        show(at);
        gal.classList.add('open');
        document.body.classList.add('gallery-open');
        // grow out of the little canvas on the easel
        var a = canvas.getBoundingClientRect(), b = pad.getBoundingClientRect();
        pad.animate([
            { transform: 'translate(' + (a.left + a.width / 2 - (b.left + b.width / 2)) + 'px,' + (a.top + a.height / 2 - (b.top + b.height / 2)) + 'px) scale(' + (a.width / b.width) + ')' },
            { transform: 'none' }
        ], { duration: 650, easing: 'cubic-bezier(.3,.7,.25,1)' });
        nextBtn.focus({ preventScroll: true });
    }
    function close() {
        if (!gal.classList.contains('open')) return;
        gal.classList.remove('open');
        document.body.classList.remove('gallery-open');
        paintEasel();
        easel.focus({ preventScroll: true });
    }

    easel.addEventListener('click', open);
    easel.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    gal.querySelector('.leave').addEventListener('click', close);
    nextBtn.addEventListener('click', next);
    prevBtn.addEventListener('click', prev);
    gal.addEventListener('click', function (e) { if (e.target === gal) close(); });
    document.addEventListener('keydown', function (e) {
        if (!gal.classList.contains('open')) return;
        if (e.key === 'Escape') { e.stopPropagation(); close(); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    }, true);
    // the mouse wheel and swipes flip pages too (swipe up = next)
    var wheelLock = 0;
    gal.addEventListener('wheel', function (e) {
        e.preventDefault();
        var now = Date.now();
        if (now < wheelLock || Math.abs(e.deltaY) < 8) return;
        wheelLock = now + 700;
        if (e.deltaY > 0) next(); else prev();
    }, { passive: false });
    var touchY = null;
    pad.addEventListener('pointerdown', function (e) { touchY = e.clientY; });
    pad.addEventListener('pointerup', function (e) {
        if (touchY === null) return;
        var dy = e.clientY - touchY;
        touchY = null;
        if (dy < -40) next(); else if (dy > 40) prev();
    });

    // the painting on the easel is whichever page you last looked at
    function paintEasel() {
        canvas.innerHTML = '';
        if (!works.length) { canvas.innerHTML = '<span class="blank"></span>'; return; }
        canvas.appendChild(Sky.makeMedia(works[at].file));
    }

    // what hangs on this room's walls (content/workshop/frames.json) isn't on the easel too
    var FOLDER = easel.dataset.folder.replace(/\/?$/, '/');
    var onWall = fetch(FOLDER + 'frames.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    Sky.listFolder(easel.dataset.folder, IMG.concat(['txt']), function (files) { onWall.then(function (map) {
        var hung = {};
        Object.keys(map || {}).forEach(function (k) {
            var v = typeof map[k] === 'string' ? map[k].trim() : '';
            if (v.indexOf(FOLDER) === 0) v = v.slice(FOLDER.length);
            if (v && v.indexOf('/') === -1) hung[v.toLowerCase()] = 1;
        });
        var captions = {};
        files.forEach(function (f) { if (/\.txt$/i.test(f.name)) captions[f.name.replace(/\.txt$/i, '').toLowerCase()] = f.url; });
        works = Sky.sortNewest(files.filter(function (f) { return !/\.txt$/i.test(f.name) && !hung[f.name.toLowerCase()]; })).map(function (f) {
            return {
                file: f,
                title: Sky.fileTitle(f.name),
                date: Sky.fileDate(f.name),
                captionUrl: captions[f.name.replace(/\.[^.]+$/, '').toLowerCase()]
            };
        });
        at = 0;
        paintEasel();
    }); });
})();

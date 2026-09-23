/* =====================================================================
   gallery.js — the workshop easel. Paintings and drawings come from a
   folder (every image in it is a page on the easel's pad). Click the easel
   to step up close; flip pages up for the next, down for the one before.

       <div class="furnish easel" data-folder="content/workshop/"> … </div>
       <script src="sky/gallery.js"></script>          (after sky/sky.js)

   files: .png .jpg .jpeg .webp .gif .svg (and .mp4 .webm for moving pieces)
   order: names starting with a date (2026-09-23-…) newest first, then the rest by name.
   caption: from the file name, or a .txt file with the same name beside it.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var easel = document.querySelector('.easel[data-folder]');
    if (!easel) return;
    var IMG = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'mp4', 'webm'];

    Sky.css(
        '.easel { cursor: zoom-in; }' +
        '.easel .easel-art { position: absolute; inset: 0; width: 100%; height: 100%; }' +
        '.easel .easel-canvas { position: absolute; left: 17%; top: 6%; width: 66%; height: 50%; overflow: hidden;' +
            'background: #efe3c6; box-shadow: 0 3px 6px rgba(0,0,0,.35), inset 0 0 14px rgba(120,80,30,.25); }' +
        '.easel .easel-canvas img, .easel .easel-canvas video { width: 100%; height: 100%; object-fit: contain; display: block; }' +
        '.easel .easel-canvas .blank { position: absolute; inset: 12%; border: 1px dashed rgba(110,82,54,.4); }' +
        '.easel:hover .easel-canvas { box-shadow: 0 3px 6px rgba(0,0,0,.35), 0 0 16px rgba(255,220,150,.55); }' +
        '.easel .easel-hint { position: absolute; left: 50%; top: -1.6em; transform: translateX(-50%); white-space: nowrap;' +
            'font-style: italic; font-size: .95rem; color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.6); opacity: 0; transition: opacity .25s; }' +
        '.easel:hover .easel-hint { opacity: 1; }' +

        /* the close-up */
        '.gallery { position: fixed; inset: 0; z-index: 8; display: grid; place-items: center; visibility: hidden;' +
            'background: radial-gradient(ellipse at 50% 45%, rgba(58,39,22,.72), rgba(14,9,5,.95) 75%); opacity: 0; transition: opacity .5s, visibility 0s .5s; }' +
        '.gallery.open { visibility: visible; opacity: 1; transition: opacity .5s; }' +
        '.gallery .pad { position: relative; width: min(78vw, 74vh); height: min(88vh, 84vw); perspective: 1600px; }' +
        '.gallery .board { position: absolute; inset: 3% -3% -2%; border-radius: 6px;' +
            'background: repeating-linear-gradient(90deg, rgba(0,0,0,.08) 0 2px, transparent 2px 22px), linear-gradient(#86583a, #6d4628);' +
            'box-shadow: 0 30px 60px rgba(0,0,0,.6); }' +
        '.gallery .clip { position: absolute; left: 50%; top: -1.2%; z-index: 5; width: 34%; height: 5.5%; transform: translateX(-50%);' +
            'border-radius: 5px 5px 10px 10px; background: linear-gradient(#d8b46a, #9a7434); box-shadow: 0 4px 6px rgba(0,0,0,.45); }' +
        '.gallery .page { position: absolute; inset: 1.5% 0 0; transform-origin: 50% 0; transform-style: preserve-3d; }' +
        '.gallery .face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden;' +
            'background: #efe3c6 radial-gradient(ellipse at 50% 40%, #f6ecd4, transparent 70%);' +
            'box-shadow: 0 2px 5px rgba(0,0,0,.25), inset 0 0 40px rgba(120,80,30,.22); }' +
        '.gallery .back { transform: rotateX(180deg); background: #e2d3b0; }' +
        '.gallery .face .art { position: absolute; left: 7%; right: 7%; top: 8%; bottom: 15%; display: grid; place-items: center; }' +
        '.gallery .face .art img, .gallery .face .art video { max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 2px 8px rgba(60,40,20,.3); }' +
        '.gallery .face .caption { position: absolute; left: 7%; right: 7%; bottom: 5%; text-align: center; font-style: italic;' +
            'color: #3a2716; font-size: clamp(.95rem, 2.2vh, 1.25rem); line-height: 1.3; }' +
        '.gallery .face .caption small { display: block; color: #6e5236; font-size: .8em; }' +
        '.gallery .face.empty .art { color: #6e5236; font-style: italic; text-align: center; padding: 0 10%; }' +
        '.gallery .bar { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 9; display: flex; align-items: center; gap: 6px;' +
            'padding: 6px 8px; border-radius: 999px; background: #eadcb9; box-shadow: 0 8px 18px rgba(0,0,0,.45), inset 0 0 18px rgba(120,80,30,.25);' +
            'font: italic 1rem "IM Fell English", Georgia, serif; color: #3a2716; }' +
        '.gallery .bar button { display: flex; align-items: center; gap: 6px; border: 0; background: none; font: inherit; color: inherit; cursor: pointer;' +
            'padding: 6px 12px; border-radius: 999px; }' +
        '.gallery .bar button:hover:not(:disabled) { background: rgba(110,82,54,.14); }' +
        '.gallery .bar button:disabled { opacity: .35; cursor: default; }' +
        '.gallery .bar .count { min-width: 4.5em; text-align: center; color: #6e5236; }' +
        '.gallery .bar svg { width: 16px; height: 16px; fill: currentColor; }' +
        '.gallery .leave { position: fixed; left: 18px; top: 18px; z-index: 9; display: flex; align-items: center; gap: 8px; border: 0; cursor: pointer;' +
            'padding: 8px 14px 8px 12px; border-radius: 999px; background: rgba(40,28,18,.8); color: #f3e6c2; font: italic 1rem "IM Fell English", Georgia, serif; }' +
        '.gallery .leave:hover { background: rgba(40,28,18,.95); }' +
        'body.gallery-open .signpost, body.gallery-open .polaris { opacity: 0; pointer-events: none; }' +
        '@media (max-width: 620px) { .gallery .pad { width: 88vw; height: 64vh; } .gallery .bar { bottom: 12px; } }'
    );

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

    Sky.listFolder(easel.dataset.folder, IMG.concat(['txt']), function (files) {
        var captions = {};
        files.forEach(function (f) { if (/\.txt$/i.test(f.name)) captions[f.name.replace(/\.txt$/i, '').toLowerCase()] = f.url; });
        works = Sky.sortNewest(files.filter(function (f) { return !/\.txt$/i.test(f.name); })).map(function (f) {
            return {
                file: f,
                title: Sky.fileTitle(f.name),
                date: Sky.fileDate(f.name),
                captionUrl: captions[f.name.replace(/\.[^.]+$/, '').toLowerCase()]
            };
        });
        at = 0;
        paintEasel();
    });
})();

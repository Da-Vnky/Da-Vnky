/* =====================================================================
   books.js — the books on the living space's shelf (the decoys around the
   one that opens the dungeon). Give one pages and it opens: you flip
   through them like a book. A book with no pages is just a book.

   Each book's pages are a folder: content/books/book-1/ … book-4/
       pictures (.png .jpg .webp .gif .svg) or short videos (.mp4 .webm),
       in file-name order (001-…, 002-…: the content manager numbers them)
       a caption for a page: a .txt with the same name beside it
       the book's title (shown when you point at it): title.txt
   Add pages from the content manager: your things -> the books (a PDF goes in
   as one picture per page, since the server doesn't take .pdf files).

       <a class="furnish shelf-book decoy" data-book="content/books/book-1/" …></a>

   slots: assets/living/book-open (the open book's pages, behind each page; optional)
   sound: assets/sounds/page-turn
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var books = Array.prototype.slice.call(document.querySelectorAll('.shelf-book[data-book]'));
    if (!Sky || !books.length) return;
    var body = document.body;
    var MEDIA = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'mp4', 'webm'];
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }

    Sky.css(
        '.book-view { position: fixed; inset: 0; z-index: 9; display: grid; place-items: center; padding: 50px 14px 30px; background: rgba(10,6,3,.88);' +
            'visibility: hidden; opacity: 0; transition: opacity .35s, visibility 0s .35s; font-family: "IM Fell English", Georgia, serif; color: #f3e6c2; }' +
        '.book-view.open { visibility: visible; opacity: 1; transition: opacity .35s; }' +
        '.book-view .bk-title { position: absolute; left: 50%; top: 14px; transform: translateX(-50%); max-width: 80vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' +
            'font: normal 1.35rem "IM Fell English SC", Georgia, serif; letter-spacing: .03em; }' +
        '.book-view .bk-close { position: absolute; right: 16px; top: 12px; padding: 6px 14px; border: 1px solid rgba(243,230,194,.35); border-radius: 999px; background: none; color: inherit; cursor: pointer; font: italic 1rem inherit; }' +
        '.book-view .bk-book { position: relative; width: min(92vw, 78vh * .78); aspect-ratio: .78; padding: 14px 14px 14px 22px; border-radius: 6px 12px 12px 6px; perspective: 1600px;' +
            'background: linear-gradient(90deg, #3a1f12, #6e3a22 6%, #5a2e1a 60%, #4a2414); box-shadow: 0 24px 60px rgba(0,0,0,.7), inset 0 0 0 2px rgba(200,150,80,.25); }' +
        '.book-view .bk-page { position: absolute; inset: 14px 14px 14px 22px; display: grid; grid-template-rows: 1fr auto; gap: 8px; padding: 18px 20px 14px; border-radius: 2px 6px 6px 2px;' +
            'background: var(--book-art, linear-gradient(90deg, #d8c79c, #f3e8cc 7%, #f6ecd4 60%, #eadcb9)) center / 100% 100%; color: #3a2716; box-shadow: inset 8px 0 14px -8px rgba(60,30,10,.5);' +
            'transform-origin: 0 50%; backface-visibility: hidden; transition: transform .55s cubic-bezier(.5,.05,.4,1), opacity .55s; }' +
        '.book-view .bk-page.out-next { transform: rotateY(-105deg); opacity: 0; }' +
        '.book-view .bk-page.in-prev { transform: rotateY(-105deg); opacity: 0; transition: none; }' +
        '.book-view .bk-page > .bk-media { display: grid; place-items: center; min-height: 0; overflow: hidden; }' +
        '.book-view .bk-page img, .book-view .bk-page video { max-width: 100%; max-height: 100%; object-fit: contain; display: block; box-shadow: 0 2px 6px rgba(0,0,0,.25); }' +
        '.book-view .bk-cap { margin: 0; text-align: center; font-style: italic; font-size: 1rem; white-space: pre-wrap; }' +
        '.book-view .bk-cap:empty { display: none; }' +
        '.book-view .bk-nav { position: absolute; top: 50%; width: 48px; height: 48px; margin-top: -24px; border: 0; border-radius: 50%; background: rgba(243,230,194,.14); color: #f3e6c2; cursor: pointer; font-size: 1.6rem; }' +
        '.book-view .bk-nav:hover { background: rgba(243,230,194,.28); } .book-view .bk-nav:disabled { opacity: .2; cursor: default; }' +
        '.book-view .bk-prev { left: max(6px, calc(50% - min(92vw, 78vh * .78) / 2 - 58px)); } .book-view .bk-next { right: max(6px, calc(50% - min(92vw, 78vh * .78) / 2 - 58px)); }' +
        '.book-view .bk-count { position: absolute; left: 50%; bottom: 6px; transform: translateX(-50%); font-style: italic; font-size: .9rem; opacity: .75; }' +
        'body.book-open .place-tabs, body.book-open .cp { opacity: 0; pointer-events: none; }' +
        '@media (prefers-reduced-motion: reduce) { .book-view .bk-page { transition: none; } }'
    );

    /* ---------------- what's in each book ---------------- */
    books.forEach(function (b) {
        var dir = b.dataset.book.replace(/\/?$/, '/');
        Sky.listFolder(dir, MEDIA.concat(['txt']), function (files) {
            var caps = {}, pages = [];
            files.forEach(function (f) {
                var stem = f.name.replace(/\.[^.]+$/, ''), ext = f.name.split('.').pop().toLowerCase();
                if (ext === 'txt') { if (stem !== 'title') caps[stem] = f.url; }
                else pages.push({ name: f.name, url: f.url, stem: stem, video: /^(mp4|webm)$/.test(ext) });
            });
            pages.sort(function (x, y) { return x.name.toLowerCase() < y.name.toLowerCase() ? -1 : 1; });
            pages.forEach(function (p) { p.cap = caps[p.stem] || null; });
            b._book = { pages: pages, title: '' };
            if (!pages.length) return;
            if (files.some(function (f) { return f.name === 'title.txt'; })) fetch(dir + 'title.txt', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
                t = (t || '').trim();
                if (!t || /<html/i.test(t)) return;
                b._book.title = t;
                var h = b.querySelector('.sb-hint');
                if (h) h.textContent = t;
                b.setAttribute('aria-label', 'a book: ' + t);
            }).catch(function () {});
        });
    });

    /* ---------------- open, and flip through ---------------- */
    var view = document.createElement('div');
    view.className = 'book-view';
    view.setAttribute('role', 'dialog');
    view.innerHTML = '<div class="bk-title"></div><button type="button" class="bk-close">close</button>' +
        '<button type="button" class="bk-nav bk-prev" aria-label="the page before">‹</button><div class="bk-book"></div>' +
        '<button type="button" class="bk-nav bk-next" aria-label="the next page">›</button><div class="bk-count"></div>';
    body.appendChild(view);
    Sky.findAsset('assets/living/book-open', function (url) { if (url) view.style.setProperty('--book-art', 'url("' + new URL(url, location.href).href + '")'); });
    var bookEl = view.querySelector('.bk-book'), cur = null, at = 0, busy = false;
    function pageEl(p) {
        var el = document.createElement('div');
        el.className = 'bk-page';
        el.innerHTML = '<div class="bk-media"></div><p class="bk-cap"></p>';
        var m = p.video ? document.createElement('video') : new Image();
        if (p.video) { m.muted = true; m.loop = true; m.autoplay = true; m.playsInline = true; m.controls = true; }
        m.src = p.url;
        m.alt = '';
        el.querySelector('.bk-media').appendChild(m);
        if (p.cap) fetch(p.cap, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { if (t && !/<html/i.test(t)) el.querySelector('.bk-cap').textContent = t.trim(); }).catch(function () {});
        return el;
    }
    function show(i, dir) {
        if (!cur || busy || i < 0 || i >= cur.pages.length) return;
        var old = bookEl.querySelector('.bk-page:last-child'), el = pageEl(cur.pages[i]);
        at = i;
        if (!old || !dir) { bookEl.innerHTML = ''; bookEl.appendChild(el); }
        else if (dir > 0) {                                        // turn the page over: the next one's underneath
            busy = true;
            bookEl.insertBefore(el, old);
            requestAnimationFrame(function () { old.classList.add('out-next'); });
            setTimeout(function () { old.remove(); busy = false; }, 560);
            sfx('page-turn');
        } else {                                                   // back: the page before turns back over it
            busy = true;
            el.classList.add('in-prev');
            bookEl.appendChild(el);
            void el.offsetWidth;
            el.style.transition = ''; el.classList.remove('in-prev');
            setTimeout(function () { old.remove(); busy = false; }, 560);
            sfx('page-turn');
        }
        view.querySelector('.bk-prev').disabled = i === 0;
        view.querySelector('.bk-next').disabled = i === cur.pages.length - 1;
        view.querySelector('.bk-count').textContent = (i + 1) + ' / ' + cur.pages.length;
    }
    function open(b) {
        var bk = b._book;
        if (!bk || !bk.pages.length) return false;
        cur = bk;
        view.querySelector('.bk-title').textContent = bk.title || '';
        bookEl.innerHTML = '';
        show(0);
        view.classList.add('open');
        body.classList.add('book-open');
        sfx('page-turn');
        return true;
    }
    function close() {
        if (!view.classList.contains('open')) return;
        view.classList.remove('open');
        body.classList.remove('book-open');
        view.querySelectorAll('video').forEach(function (v) { v.pause(); });
        cur = null;
    }
    view.querySelector('.bk-close').addEventListener('click', close);
    view.querySelector('.bk-prev').addEventListener('click', function () { show(at - 1, -1); });
    view.querySelector('.bk-next').addEventListener('click', function () { show(at + 1, 1); });
    view.addEventListener('click', function (e) { if (e.target === view) close(); });
    document.addEventListener('keydown', function (e) {
        if (!view.classList.contains('open')) return;
        if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); }
        if (e.key === 'ArrowRight') show(at + 1, 1);
        if (e.key === 'ArrowLeft') show(at - 1, -1);
    }, true);
    var sx = null;                                                 // a swipe, on a phone
    bookEl.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    bookEl.addEventListener('pointerup', function (e) {
        if (sx === null) return;
        var dx = e.clientX - sx; sx = null;
        if (Math.abs(dx) > 40) show(at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });

    Sky.books = { open: open, close: close };
})();

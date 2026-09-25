/* =====================================================================
   loader.js — the loading screen, and the copy of the site kept in the
   visitor's browser. The first time someone comes, it fetches every file
   on the site (with a progress bar) and keeps them: every page, picture
   and song after that comes straight from their own computer (sw.js).
   It stays kept between visits. Each new visit it checks manifest.txt
   (tools\publish.bat writes it, with a checksum for every file) and
   fetches only what you've changed since, drops what you've deleted,
   and if the page they're on was one of the changes, shows it fresh.

   "Forget your stay" (the control panel) wipes it all: see forgetStay below.
   Your own loading picture: assets/ui/loading (a GIF can walk, spin, …)

       <script src="sky/loader.js"></script>     (first thing in each page's <head>)
   ===================================================================== */

(function () {
    var KEY = 'dav-loaded', CACHE = 'dav-site';
    var ok = 'serviceWorker' in navigator && 'caches' in window && /^https?:$/.test(location.protocol);
    /* ---------------- forget your stay: everything this site kept in this browser, gone ---------------- */
    // (all but the count of how many times it's been done: localStorage "dav-resets", for later)
    window.davForget = function () {
        var resets = 0;
        try { resets = (+localStorage.getItem('dav-resets') || 0) + 1; } catch (e) {}
        try { localStorage.clear(); localStorage.setItem('dav-resets', String(resets)); } catch (e) {}
        try { sessionStorage.clear(); } catch (e) {}
        return (window.caches ? caches.delete(CACHE).catch(function () {}) : Promise.resolve()).then(function () { return resets; });
    };
    if (!ok) return;
    var fresh = true;
    try { fresh = !sessionStorage.getItem(KEY); } catch (e) {}
    function register() { return navigator.serviceWorker.register('sw.js').catch(function () {}); }
    if (!fresh) { register(); return; }

    /* ---------------- the screen ---------------- */
    var css = document.createElement('style');
    css.textContent =
        '#dav-loader { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; padding: 24px;' +
            'background: radial-gradient(ellipse at 50% 40%, #3a2a1d, #1a120c 75%); color: #f3e6c2; font-family: "IM Fell English", Georgia, serif;' +
            'transition: opacity .6s, visibility 0s .6s; }' +
        '#dav-loader.gone { opacity: 0; visibility: hidden; }' +
        '#dav-loader .dl-box { width: min(440px, 100%); text-align: center; }' +
        '#dav-loader .dl-art { height: 130px; display: grid; place-items: end center; margin-bottom: 10px; }' +
        '#dav-loader .dl-art img, #dav-loader .dl-art svg { max-height: 130px; max-width: 100%; }' +
        '#dav-loader .dl-walk { animation: dl-bob .42s ease-in-out infinite alternate; transform-origin: 50% 100%; }' +
        '@keyframes dl-bob { from { transform: translateY(0) rotate(-2deg); } to { transform: translateY(-5px) rotate(2deg); } }' +
        '#dav-loader .dl-title { font: normal 2rem "IM Fell English SC", Georgia, serif; letter-spacing: .04em; margin-bottom: 14px; }' +
        '#dav-loader .dl-bar { position: relative; height: 10px; border-radius: 99px; background: rgba(243,230,194,.14); overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,.5); }' +
        '#dav-loader .dl-bar i { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 99px; background: linear-gradient(90deg, #9a3b1f, #e0b070); transition: width .25s; }' +
        '#dav-loader .dl-note { margin-top: 10px; font-style: italic; font-size: .95rem; color: rgba(243,230,194,.75); min-height: 1.4em; }' +
        '#dav-loader .dl-go { margin-top: 16px; padding: 7px 18px; border: 1px solid rgba(243,230,194,.35); border-radius: 999px; background: none; color: #f3e6c2;' +
            'font: italic 1rem "IM Fell English", Georgia, serif; cursor: pointer; opacity: 0; transition: opacity .6s; }' +
        '#dav-loader .dl-go.on { opacity: 1; }' +
        '#dav-loader .dl-go:hover { background: rgba(243,230,194,.1); }' +
        '@media (prefers-reduced-motion: reduce) { #dav-loader .dl-walk { animation: none; } }';

    // the stand-in: the traveller, walking along with a trunk
    var WALKER = '<svg class="dl-walk" viewBox="0 0 110 120" width="110" height="120" aria-hidden="true">' +
        '<path d="M8 40 Q30 32 52 40 L50 44 Q30 38 10 44 Z" fill="#3a2716" stroke="#f3e6c2" stroke-width=".6"/><path d="M17 40 Q18 22 30 21 Q42 22 43 40 Z" fill="#3a2716" stroke="#f3e6c2" stroke-width=".6"/>' +
        '<circle cx="30" cy="50" r="9" fill="#f0dfbd"/><path d="M16 62 Q30 56 44 62 L48 100 L12 100 Z" fill="#9a3b1f"/>' +
        '<path d="M18 100 H27 V118 H18 Z M33 100 H42 V118 H33 Z" fill="#3a2716" stroke="#f3e6c2" stroke-width=".5"/>' +
        '<rect x="54" y="78" width="50" height="36" rx="4" fill="#6e4a30" stroke="#f3e6c2" stroke-width=".6"/><path d="M54 90 H104 M66 78 V114 M92 78 V114" stroke="#3a2716" stroke-width="2"/>' +
        '<path d="M70 78 Q79 68 88 78" fill="none" stroke="#c49a52" stroke-width="3"/><path d="M44 72 Q52 76 58 80" stroke="#9a3b1f" stroke-width="5" stroke-linecap="round"/></svg>';
    var el = null, bar, note, go, done = false;
    function screen(title) {                                                // (only when there's something to fetch)
        if (el) return;
        document.head.appendChild(css);
        el = document.createElement('div');
        el.id = 'dav-loader';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.innerHTML = '<div class="dl-box"><div class="dl-art">' + WALKER + '</div><div class="dl-title">DaV-nky</div>' +
            '<div class="dl-bar"><i></i></div><div class="dl-note"></div>' +
            '<button type="button" class="dl-go">go in now (the rest keeps loading)</button></div>';
        document.documentElement.appendChild(el);
        bar = el.querySelector('.dl-bar i'); note = el.querySelector('.dl-note'); go = el.querySelector('.dl-go');
        note.textContent = title;
        go.addEventListener('click', finish);
        setTimeout(function () { go.classList.add('on'); }, 4000);
        if (art) el.querySelector('.dl-art').innerHTML = '<img alt="" src="' + art + '">';
    }
    function finish() {
        if (done) return;
        done = true;
        try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
        if (!el) return;
        el.classList.add('gone');
        setTimeout(function () { el.remove(); }, 700);
    }
    function mb(n) { return (n / 1048576).toFixed(n > 10485760 ? 0 : 1); }

    /* ---------------- what's on the site, and what this browser already has ---------------- */
    // manifest.txt lines: "path size checksum" (older ones: "path size")
    function list(text) {
        var out = [];
        text.replace(/\r/g, '').split('\n').forEach(function (line) {
            line = line.trim();
            if (!line || line.charAt(0) === '#') return;
            var parts = line.split(' '), sum = '', size = 0;
            if (parts.length >= 3 && /^\d+$/.test(parts[parts.length - 1]) && /^\d+$/.test(parts[parts.length - 2])) { sum = parts.pop(); size = +parts.pop(); }
            else if (parts.length >= 2 && /^\d+$/.test(parts[parts.length - 1])) size = +parts.pop();
            var path = parts.join(' ');
            out.push({ path: path, url: path.split('/').map(encodeURIComponent).join('/'), size: size, id: size + ':' + sum });
        });
        return out;
    }
    // pages and code first, then pictures, then sounds and videos (the biggest)
    function rank(f) { return /\.(html|js|css|json|txt)$/i.test(f.url) ? 0 : /\.(mp3|ogg|mp4|webm)$/i.test(f.url) ? 2 : 1; }
    var HAVE = 'dav-have';                                                  // what's in this browser's copy: { path: "size:checksum" }
    function have() { try { return JSON.parse(localStorage.getItem(HAVE) || 'null'); } catch (e) { return null; } }
    function keep(m) { try { localStorage.setItem(HAVE, JSON.stringify(m)); } catch (e) {} }
    var art = null;
    var here = decodeURIComponent(location.pathname.replace(/^.*\//, '')) || 'index.html';
    if (!have()) screen('packing everything up\u2026');                     // (a first visit: the screen straight away)

    register()
        .then(function () { return caches.open(CACHE); })
        .then(function (cache) {
            return fetch('manifest.txt?' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (text) {
                var files = list(text);
                if (files.length < 3) { finish(); return; }                   // (no manifest yet: nothing to do)
                var loadingArt = files.filter(function (f) { return /^assets\/ui\/loading\.(gif|png|webp|svg|jpe?g)$/i.test(f.path); })[0];
                if (loadingArt) art = loadingArt.url;
                var had = have(), first = !had, now = {}, need = [];
                files.forEach(function (f) { now[f.path] = f.id; if (first || had[f.path] !== f.id) need.push(f); });
                if (first) need.push({ path: '', url: './', size: 0, id: '' });
                // gone from the site: gone from the copy
                var drop = had ? Object.keys(had).filter(function (p) { return !(p in now); }) : [];
                drop.forEach(function (p) { cache.delete(p.split('/').map(encodeURIComponent).join('/'), { ignoreSearch: true }); });
                if (!need.length) { keep(now); finish(); return; }
                // what they're looking at right now came from the old copy if it's among the changes
                var stale = !first && need.some(function (f) { return f.path === here || /^sky\//.test(f.path); });
                screen(first ? 'packing everything up…' : 'unpacking what’s new…');
                need.sort(function (a, b) { return rank(a) - rank(b); });
                var total = 0, got = 0, n = 0, i = 0;
                need.forEach(function (f) { total += f.size; });
                function show() {
                    var k = total ? got / total : n / need.length;
                    bar.style.width = (k * 100).toFixed(1) + '%';
                    note.textContent = (first ? 'packing everything up… ' : 'unpacking what’s new… ') + n + ' of ' + need.length + (total ? ' · ' + mb(got) + ' of ' + mb(total) + ' MB' : '');
                }
                function next() {
                    if (i >= need.length) return Promise.resolve();
                    var f = need[i++];
                    return fetch(f.url, { cache: 'reload' }).then(function (r) {
                        return r.ok ? cache.put(f.url, r) : null;
                    }).catch(function () {}).then(function () { n++; got += f.size; show(); return next(); });
                }
                show();
                var lanes = [];
                for (var k = 0; k < 6; k++) lanes.push(next());
                return Promise.all(lanes).then(function () {
                    keep(now);
                    note.textContent = first ? 'all packed. in you go.' : 'all up to date.';
                    bar.style.width = '100%';
                    if (stale) { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} setTimeout(function () { location.reload(); }, 300); return; }
                    setTimeout(finish, 350);
                });
            });
        })
        .catch(finish);
    setTimeout(finish, 90000);                                              // (never stuck behind it)

})();

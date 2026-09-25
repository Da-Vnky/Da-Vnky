/* =====================================================================
   sw.js — keeps a copy of the site in the visitor's browser, between visits.

   Nothing big is fetched up front any more. The first time someone comes,
   sky/loader.js fetches only the skeleton of the site (the pages, the code,
   the folder lists: about a megabyte). Every picture, song and video is
   kept the first time the visitor actually comes across it, and from then
   on it comes straight from their own computer (cache first, the site only
   if it isn't kept yet). Two parts of a page asking for the same thing at
   once share one download.

   Each new visit, sky/loader.js reads catalog.txt (written by tools\publish.bat
   with a checksum for every file) and drops whatever you've changed or
   deleted since, so the next time it's needed it comes fresh from the site.

   It has to live at the top of the site, next to index.html.
   ===================================================================== */

var CACHE = 'dav-site';
var HEAVY = /\.(png|jpe?g|gif|webp|mp3|ogg|mp4|webm)$/i;

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

// one name per file, whatever ?v=… a page asks for it with
function keyOf(url) { return url.origin + url.pathname; }

// a piece of a kept file (audio asks for its songs in ranges, so it can skip about)
function ranged(req, hit) {
    return hit.blob().then(function (blob) {
        var m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || ''), size = blob.size;
        var start = m && m[1] ? parseInt(m[1], 10) : 0;
        var end = m && m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
        if (m && !m[1] && m[2]) { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }   // the last n bytes
        if (start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
        return new Response(blob.slice(start, end + 1), {
            status: 206,
            statusText: 'Partial Content',
            headers: {
                'Content-Type': hit.headers.get('Content-Type') || blob.type || 'application/octet-stream',
                'Content-Length': String(end - start + 1),
                'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
                'Accept-Ranges': 'bytes'
            }
        });
    });
}
function serve(req, hit) { return req.headers.get('range') ? ranged(req, hit) : hit; }

// from the site, and kept. the page gets it as it streams in (it doesn't wait for the keeping);
// anything else asking for the same file meanwhile waits for this one download instead of starting its own
var inflight = {};
function download(c, key) {
    var net = fetch(key, { cache: 'no-cache', credentials: 'same-origin' });
    var kept = net.then(function (res) {
        if (!(res.ok && res.status === 200 && res.type === 'basic') || res.redirected) return false;
        return c.put(key, res.clone()).then(function () { return true; }, function () { return false; });
    }, function () { return false; });
    inflight[key] = kept;
    kept.then(function () { delete inflight[key]; });
    return net;
}
function keptOrFetched(req, url) {
    var key = keyOf(url);
    return caches.open(CACHE).then(function (c) {
        return c.match(key, { ignoreSearch: true }).then(function (hit) {
            if (hit) return serve(req, hit);
            var range = req.headers.get('range');
            // a piece from the middle (a player checking a song's length at its far end, or skipping ahead)
            // before the whole thing's kept: just that piece, straight from the site, without waiting
            if (range && !/^bytes=0-/.test(range.trim())) return fetch(req);
            if (inflight[key]) {                                          // already on its way
                return inflight[key].then(function (ok) { return ok ? c.match(key, { ignoreSearch: true }) : null; })
                    .then(function (hit2) { return hit2 ? serve(req, hit2) : fetch(req); });
            }
            // a song starting from the top ("bytes=0-"): fetch it whole and keep it; the player's happy with the whole thing.
            // (just its first part, "bytes=0-2500000": that part, from the site)
            if (range && !/^bytes=0-$/.test(range.trim())) return fetch(req);
            return download(c, key).then(function (res) {
                // (a page that's moved: the browser has to be told, not handed the new one under the old name)
                return res.redirected && req.mode === 'navigate' ? Response.redirect(res.url, 302) : res;
            });
        });
    });
}

self.addEventListener('fetch', function (e) {
    var req = e.request, url = new URL(req.url);
    if (url.origin !== self.location.origin) return;              // (Supabase, fonts … go straight out)
    if (req.method === 'HEAD') {                                    // "is this file there?": answer from the copy if we have it
        e.respondWith(caches.open(CACHE).then(function (c) { return c.match(keyOf(url), { ignoreSearch: true }); }).then(function (hit) {
            return hit ? new Response(null, { status: 200, headers: hit.headers }) : fetch(req);
        }));
        return;
    }
    if (req.method !== 'GET') return;
    // the lists of files the loader checks against: always from the site
    if (/\/(catalog|manifest|files)\.txt$/.test(url.pathname)) return;
    // (an older loading screen, from before this one, fetching everything up front with cache: 'reload'.
    //  it still gets the pages and code, which it needs to bring itself up to date; the big things are
    //  turned down (and forgotten, so they're fetched fresh when they're next needed) instead of all
    //  being downloaded at once. this only happens once per visitor, the first visit after this update.)
    if (req.cache === 'reload') {
        if (HEAVY.test(url.pathname)) {
            e.respondWith(caches.open(CACHE).then(function (c) { return c.delete(keyOf(url), { ignoreSearch: true }); })
                .then(function () { return Response.error(); }, function () { return Response.error(); }));
            return;
        }
        e.respondWith(caches.open(CACHE).then(function (c) {
            return c.delete(keyOf(url), { ignoreSearch: true }).then(function () { return download(c, keyOf(url)); });
        }).catch(function () { return fetch(req); }));
        return;
    }
    // a folder asked for by name (the pages peek, in case the server lists folders): if we have its
    // list.txt, that's the answer already, so don't keep the page waiting on the site for a "no"
    if (req.mode !== 'navigate' && /\/$/.test(url.pathname) && url.pathname !== self.registration.scope.replace(/^https?:\/\/[^\/]+/, '')) {
        e.respondWith(caches.open(CACHE).then(function (c) {
            return c.match(url.origin + url.pathname + 'list.txt', { ignoreSearch: true }).then(function (hit) {
                return hit ? new Response('', { status: 404, statusText: 'Not Found' }) : fetch(req);
            });
        }).catch(function () { return fetch(req); }));
        return;
    }
    // everything else: the kept copy first, the site if it isn't kept yet (and then it's kept)
    e.respondWith(keptOrFetched(req, url).catch(function () { return fetch(req); }));
});

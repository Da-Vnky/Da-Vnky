/* =====================================================================
   sw.js — keeps a copy of the whole site in the visitor's browser for
   the length of a visit, so every page, picture and song after the
   loading screen comes straight from their own computer.
   sky/loader.js fills it, and each new visit brings it up to date with just
   what you've changed (manifest.txt); it stays between visits.
   It has to live at the top of the site, next to index.html.
   ===================================================================== */

var CACHE = 'dav-site';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

// a piece of a cached file (audio asks for its songs in ranges, so it can skip about)
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

self.addEventListener('fetch', function (e) {
    var req = e.request, url = new URL(req.url);
    if (url.origin !== self.location.origin) return;              // (Supabase, fonts … go straight out)
    if (req.method === 'HEAD') {                                    // "is this file there?": answer from the copy if we have it
        e.respondWith(caches.open(CACHE).then(function (c) { return c.match(req.url, { ignoreSearch: true }); }).then(function (hit) {
            return hit ? new Response(null, { status: 200, headers: hit.headers }) : fetch(req);
        }));
        return;
    }
    if (req.method !== 'GET') return;
    // asked for fresh (the loading screen fetching what's changed, and the lists the pages read with
    // "no-cache"): from the site first, kept for next time, and only from the copy if the site can't be reached
    if (req.cache === 'reload' || req.cache === 'no-cache' || req.cache === 'no-store' || /\/manifest\.txt$/.test(url.pathname)) {
        e.respondWith(fetch(req).then(function (res) {
            if (res.ok && res.status === 200 && res.type === 'basic' && !req.headers.get('range') && !/\/manifest\.txt$/.test(url.pathname)) {
                var copy = res.clone();
                caches.open(CACHE).then(function (c) { c.put(req, copy); });
            }
            return res;
        }).catch(function () {
            return caches.open(CACHE).then(function (c) { return c.match(req, { ignoreSearch: true }); }).then(function (hit) { return hit || Response.error(); });
        }));
        return;
    }
    e.respondWith(caches.open(CACHE).then(function (c) {
        return c.match(req, { ignoreSearch: true }).then(function (hit) {
            if (hit) return req.headers.get('range') ? ranged(req, hit) : hit;
            return fetch(req).then(function (res) {
                // anything the loading screen missed is kept too (whole files only)
                if (res.ok && res.status === 200 && res.type === 'basic' && !req.headers.get('range')) c.put(req, res.clone());
                return res;
            });
        });
    }).catch(function () { return fetch(req); }));
});

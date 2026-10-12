/* =====================================================================
   desk.js — the desk (desk.html): the artist's letters, the visitors' post,
   the bottles, the paintings and the frames, from any browser, signed in.

   how it works, in short:
   - signing in is Supabase's own (email and password). the browser keeps the
     sign-in (localStorage "dav-desk-session") until "sign out".
   - Supabase only lets the desk's owner change anything (tools/supabase-desk.sql:
     the desk_owner table, and every rule asks dav_is_owner()).
   - a change here is a file: its place on the site (content/sea/2026-10-12-hi.txt)
     and its new copy in the "desk" storage, listed in the "desk" table; or, for a
     deleted file, a line saying it's gone. the site shows them at once, over
     what's published (sky.js: Sky.desk).
   - the next publish from the computer copies them into the repo (tools/desk.py),
     and the publish after that tidies them off the desk.
   it does what the content manager's letters and visitors pages do, the same way
   (the same file names, board.json, frames.json), so the two never disagree.
   ===================================================================== */

(function () {
    'use strict';

    /* ---------------- little helpers ---------------- */
    function $(s, el) { return (el || document).querySelector(s); }
    function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
    function esc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function dateOf(name) { var m = /^(\d{4}-\d{2}-\d{2})/.exec(name || ''); return m ? m[1] : ''; }
    function niceDate(d, long) {
        if (!d) return 'no date';
        var p = d.split('-'), t = new Date(+p[0], +p[1] - 1, +p[2]);
        return t.toLocaleDateString('en-GB', long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase();
    }
    // the same as the content manager's slug(): plain lowercase words joined by dashes
    function slug(text, dflt) {
        var t = String(text || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\x00-\x7f]/g, '').toLowerCase();
        return t.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || (dflt === undefined ? 'letter' : dflt);
    }
    // the same as the content manager's clean_name(): a file's own name, minus what Windows won't have
    function cleanStem(stem) {
        return (String(stem || '').replace(/[\\/:*?"<>|#%]+/g, '').trim().replace(/^\.+|\.+$/g, '').slice(0, 80)) || 'untitled';
    }
    function extOf(name) { var m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; }
    function stemOf(name) { return String(name).replace(/\.[^.]+$/, ''); }
    function titleOf(name) {
        return stemOf(name).replace(/^\d{4}-\d{2}-\d{2}[-_ ]*/, '').replace(/[-_]+/g, ' ').trim() || 'untitled';
    }
    function describe(name) {
        var base = stemOf(String(name).replace(/^.*\//, '')).replace(/^\d{4}-\d{2}-\d{2}[-_ ]*/, '');
        var m = /^(.*?)[-_ ]by[-_ ](.+)$/i.exec(base);
        return { title: ((m ? m[1] : base).replace(/[-_]+/g, ' ').trim()) || 'untitled', by: m ? m[2].replace(/[-_]+/g, ' ').trim() : '' };
    }

    var toastTimer = 0;
    function toast(text, bad) {
        var t = $('.dk-toast');
        t.textContent = text || '';
        t.classList.toggle('bad', !!bad);
        t.classList.toggle('show', !!text);
        clearTimeout(toastTimer);
        if (text) toastTimer = setTimeout(function () { t.classList.remove('show'); }, bad ? 9000 : 4200);
    }
    function oops(e) { toast((e && e.message) || String(e), true); }
    // anything that goes wrong without saying so says so here (a button that seemed to do nothing, 11 Oct)
    window.addEventListener('error', function (e) { if (e.message) toast('something went wrong: ' + e.message + ' (reloading the page often helps)', true); });
    window.addEventListener('unhandledrejection', function (e) { var r = e.reason; toast('something went wrong: ' + ((r && r.message) || r) + ' (reloading the page often helps)', true); });

    // one change at a time: buttons wait while something's being saved
    var busy = 0;
    function work(label, fn) {
        if (busy) { toast('one moment: still saving the last thing.'); return Promise.resolve(); }
        busy++;
        document.body.classList.add('dk-busy');
        if (label) toast(label);
        return Promise.resolve().then(fn).then(function (r) { return r; }, function (e) { oops(e); })
            .then(function (r) { busy--; document.body.classList.remove('dk-busy'); drawWaiting(); return r; });
    }

    /* ---------------- Supabase: where it is (read from sky/sky.js, so it's only written once) ---------------- */
    var SB = null;
    function config() {
        return fetch('sky/sky.js', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (t) {
            var m = /var SUPABASE = \{\s*url:\s*'([^']*)',\s*key:\s*'([^']*)'\s*\}/.exec(t);
            if (!m || !m[1] || !m[2]) throw new Error('the desk needs Supabase: SUPABASE near the top of sky/sky.js is empty.');
            SB = { url: m[1].replace(/\/+$/, ''), key: m[2] };
        });
    }

    /* ---------------- signing in ---------------- */
    var SESSION = 'dav-desk-session';
    var session = null, refreshing = null;
    try { session = JSON.parse(localStorage.getItem(SESSION)); } catch (e) {}
    function keepSession(s) {
        session = s;
        try { if (s) localStorage.setItem(SESSION, JSON.stringify(s)); else localStorage.removeItem(SESSION); } catch (e) {}
    }
    function authCall(grant, body) {
        return fetch(SB.url + '/auth/v1/token?grant_type=' + grant, {
            method: 'POST', headers: { apikey: SB.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (j) {
                if (!r.ok) {
                    var why = j.error_description || j.msg || j.message || j.error || '';
                    if (/invalid login|invalid_grant|credentials/i.test(why)) why = 'that email and password don’t match an account.';
                    throw new Error(why || 'Supabase said no (' + r.status + ')');
                }
                return j;
            });
        });
    }
    function tookSession(j) {
        keepSession({ access: j.access_token, refresh: j.refresh_token, until: Date.now() + (j.expires_in || 3600) * 1000,
                      id: j.user && j.user.id, email: j.user && j.user.email });
    }
    // a pass that still works (refreshed a minute before it runs out)
    function pass() {
        if (!session) return Promise.reject(new Error('you’re signed out.'));
        if (session.until - Date.now() > 60000) return Promise.resolve(session.access);
        if (!refreshing) {
            refreshing = authCall('refresh_token', { refresh_token: session.refresh }).then(function (j) {
                tookSession(j); refreshing = null; return session.access;
            }, function (e) {
                refreshing = null;
                keepSession(null);
                showSignIn('you’ve been signed out: please sign in again.');
                throw e;
            });
        }
        return refreshing;
    }
    // a call to Supabase, signed in. opts: body (object = JSON, Blob, string), headers, as ('blob' | 'none')
    function sb(method, path, opts) {
        opts = opts || {};
        return pass().then(function (tok) {
            var h = { apikey: SB.key, Authorization: 'Bearer ' + tok }, body = opts.body;
            Object.keys(opts.headers || {}).forEach(function (k) { h[k] = opts.headers[k]; });
            if (body !== undefined && !(body instanceof Blob) && typeof body !== 'string') { body = JSON.stringify(body); h['Content-Type'] = h['Content-Type'] || 'application/json'; }
            return fetch(SB.url + path, { method: method, headers: h, body: body, cache: 'no-store' });
        }).then(function (r) {
            if (!r.ok) return r.text().then(function (t) {
                var msg = t;
                try { var j = JSON.parse(t); msg = j.message || j.error_description || j.error || j.msg || t; } catch (e) {}
                if ((r.status === 401 || /jwt expired/i.test(msg)) && !opts.again) {        // (the pass ran out on the way: once more)
                    session.until = 0; opts.again = true;
                    return sb(method, path, opts);
                }
                throw new Error(msg || 'Supabase said ' + r.status);
            });
            if (opts.as === 'blob') return r.blob();
            if (opts.as === 'none' || r.status === 204) return null;
            return r.text().then(function (t) { return t ? JSON.parse(t) : null; });
        });
    }

    /* ---------------- what's on the site: published, and on the desk ---------------- */
    var FOLDERS = { sea: 'content/sea/', bottles: 'content/living/bottles/', easel: 'content/workshop/', art: 'content/workshop/visitors/', walls: 'content/frames/' };
    var LETTER_RE = /\.(txt|html)$/i, BOTTLE_RE = /\.(png|jpe?g|webp|gif|svg|txt)$/i;
    var KINDS = { easel: /\.(png|jpe?g|webp|gif|svg|mp4|webm)$/i, walls: /\.(png|jpe?g|webp|gif|svg)$/i, art: /\.(png|jpe?g|webp|gif|svg)$/i };
    var TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
                  txt: 'text/plain', html: 'text/html', json: 'application/json', mp4: 'video/mp4', webm: 'video/webm' };
    // the walls with frames: where a name alone comes from (as tools/content.py's WALLS)
    var WALLS = [
        { id: 'living', label: 'the living space', page: 'living.html', folder: 'content/workshop/visitors/' },
        { id: 'workshop', label: 'the workshop', page: 'workshop.html', folder: 'content/workshop/' },
        { id: 'shame', label: 'the hall of shame', page: 'living.html', folder: 'content/workshop/visitors/' }
    ];
    var repo = {};          // a folder → its published files (its list.txt)
    var rows = {};          // a file's place → its line on the desk
    var frameNums = {};     // a wall → [{ n, name }]

    function loadRepo(folder) {
        return fetch(folder + 'list.txt', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; })
            .then(function (t) {
                if (/<html/i.test(t)) t = '';
                repo[folder] = t.split(/\r?\n/).map(function (s) { return s.trim(); })
                    .filter(function (n) { return n && n.charAt(0) !== '#' && n !== 'list.txt' && !/^[._]/.test(n) && !/^readme/i.test(n); });
            });
    }
    function loadRows() {
        return sb('GET', '/rest/v1/desk?select=*').then(function (list) {
            rows = {};
            (list || []).forEach(function (r) { rows[r.path] = r; });
        });
    }
    function loadFrames() {
        var pages = {};
        WALLS.forEach(function (w) { pages[w.page] = 1; });
        return Promise.all(Object.keys(pages).map(function (page) {
            return fetch(page, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; }).then(function (t) {
                var home = page.replace(/\.html$/, '');
                (t.match(/<div[^>]*\bgallery-frame\b[^>]*>/g) || []).forEach(function (tag) {
                    var n = /data-frame="(\d+)"/.exec(tag), w = /data-wall="([a-z0-9-]+)"/.exec(tag), nm = /data-frame-name="([^"]{1,40})"/.exec(tag);
                    if (!n) return;
                    var wall = w ? w[1] : home;
                    if (!WALLS.some(function (x) { return x.id === wall; })) return;
                    (frameNums[wall] = frameNums[wall] || []).push({ n: n[1], name: nm ? nm[1] : '' });
                });
            });
        })).then(function () {
            Object.keys(frameNums).forEach(function (k) {
                var seen = {};
                frameNums[k] = frameNums[k].filter(function (f) { return !seen[f.n] && (seen[f.n] = 1); }).sort(function (a, b) { return a.n - b.n; });
            });
        });
    }
    function split(path) { var i = path.lastIndexOf('/') + 1; return [path.slice(0, i), path.slice(i)]; }
    function inRepo(path) { var p = split(path); return (repo[p[0]] || []).indexOf(p[1]) !== -1; }
    function exists(path) { var r = rows[path]; return r ? !r.gone && !!r.obj : inRepo(path); }
    function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }
    function publicUrl(obj) { return SB.url + '/storage/v1/object/public/desk/' + encPath(obj); }
    // where to see a file now: the desk's copy, else the published one
    function urlOf(path) {
        var r = rows[path];
        if (r) return r.gone || !r.obj ? null : publicUrl(r.obj);
        return encPath(path);
    }
    function onDesk(path) { var r = rows[path]; return !!(r && !r.filed_at); }
    // a folder's files now (published, with the desk's new and deleted ones)
    function names(folder, re) {
        var out = (repo[folder] || []).slice();
        Object.keys(rows).forEach(function (p) {
            var s = split(p);
            if (s[0] === folder && out.indexOf(s[1]) === -1) out.push(s[1]);
        });
        return out.filter(function (n) { return exists(folder + n) && (!re || re.test(n)); });
    }
    function taken(folder, name) {
        var low = name.toLowerCase();                                 // (Windows can't tell a.png from A.png)
        return names(folder).some(function (n) { return n.toLowerCase() === low; });
    }
    function unique(folder, stem, ext) {
        var n = stem + ext, i = 2;
        while (taken(folder, n)) { n = stem + '-' + i + ext; i++; }
        return n;
    }
    function readText(path) {
        var u = urlOf(path);
        return u ? fetch(u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; }) : Promise.resolve('');
    }
    function readJson(path, dflt) {
        return readText(path).then(function (t) { try { var j = JSON.parse(t); return j && typeof j === 'object' ? j : dflt; } catch (e) { return dflt; } });
    }
    function readBlob(path) {
        var u = urlOf(path);
        if (!u) return Promise.reject(new Error('that file isn’t there any more'));
        return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('couldn’t fetch ' + path); return r.blob(); });
    }

    /* ---------------- writing on the desk ---------------- */
    function stamp() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
    // where a file's copy goes in storage: its folder, a fresh name each time (so nothing old is ever served from a cache)
    function objFor(path) {
        var p = split(path), ext = extOf(p[1]);
        return p[0] + stamp() + '-' + slug(stemOf(p[1]), 'file').slice(0, 40) + (ext ? '.' + ext : '');
    }
    function upsertRow(r) {
        return sb('POST', '/rest/v1/desk?on_conflict=path', { body: r, headers: { Prefer: 'resolution=merge-duplicates,return=representation' } })
            .then(function (list) { rows[r.path] = (list && list[0]) || r; });
    }
    function dropObj(obj) {
        if (!obj) return Promise.resolve();
        return sb('DELETE', '/storage/v1/object/desk', { body: { prefixes: [obj] } }).catch(function () {});
    }
    // put a file on the desk (new, or a new version)
    function put(path, blob, type) {
        var old = rows[path], obj = objFor(path);
        type = type || TYPES[extOf(path)] || blob.type || 'application/octet-stream';
        return sb('POST', '/storage/v1/object/desk/' + encPath(obj), {
            body: blob, headers: { 'Content-Type': type, 'cache-control': 'max-age=31536000', 'x-upsert': 'false' }
        }).then(function () {
            return upsertRow({ path: path, gone: false, obj: obj, at: new Date().toISOString(), filed_at: null });
        }).then(function () { if (old && old.obj && old.obj !== obj) return dropObj(old.obj); });
    }
    function putText(path, text) { return put(path, new Blob([text], { type: TYPES[extOf(path)] || 'text/plain' })); }
    function putJson(path, obj) { return put(path, new Blob([JSON.stringify(obj, null, 2) + '\n'], { type: 'application/json' }), 'application/json'); }
    // take a file off the site (a file only ever on the desk just goes; a published one is marked gone)
    function remove(path) {
        var old = rows[path], go;
        if (old && !old.filed_at && !inRepo(path)) {
            go = sb('DELETE', '/rest/v1/desk?path=eq.' + encodeURIComponent(path), { as: 'none' }).then(function () { delete rows[path]; });
        } else {
            go = upsertRow({ path: path, gone: true, obj: '', at: new Date().toISOString(), filed_at: null });
        }
        return go.then(function () { if (old && old.obj) return dropObj(old.obj); });
    }
    function copyTo(from, to) { return readBlob(from).then(function (b) { return put(to, b); }); }

    /* ---------------- the frames' lists (frames.json), as the content manager keeps them ---------------- */
    function wallById(id) { return WALLS.filter(function (w) { return w.id === id; })[0]; }
    function framesPath(wall) { return 'content/' + wall + '/frames.json'; }
    function wallRef(path, wall) {
        var f = wallById(wall).folder;
        var rest = path.indexOf(f) === 0 ? path.slice(f.length) : null;
        return rest && rest.indexOf('/') === -1 ? rest : path;
    }
    function refPath(ref, wall) { return ref.indexOf('/') !== -1 ? ref : wallById(wall).folder + ref; }
    var framesNow = {};
    function loadFrameLists() {
        return Promise.all(WALLS.map(function (w) {
            return readJson(framesPath(w.id), {}).then(function (m) {
                var out = {};
                Object.keys(m || {}).forEach(function (k) { if (typeof m[k] === 'string') out[String(k)] = m[k]; });
                framesNow[w.id] = out;
            });
        }));
    }
    function sortedFrames(m) {
        var out = {};
        Object.keys(m).sort(function (a, b) { return (+a || 0) - (+b || 0); }).forEach(function (k) { out[k] = m[k]; });
        return out;
    }
    function writeFrames(wall) { return putJson(framesPath(wall), sortedFrames(framesNow[wall])); }
    // hang a picture (its place on the site) in a frame of a wall, or take it down (frame ''); one frame per wall
    function hang(path, wall, frame) {
        var m = framesNow[wall] = framesNow[wall] || {}, ref = wallRef(path, wall), changed = false;
        Object.keys(m).forEach(function (k) { if (m[k] === ref && k !== String(frame)) { m[k] = ''; changed = true; } });
        if (frame && m[String(frame)] !== ref) { m[String(frame)] = ref; changed = true; }
        return changed ? writeFrames(wall) : Promise.resolve();
    }
    function hungWhere(path, wall) {
        var m = framesNow[wall] || {}, ref = wallRef(path, wall);
        return Object.keys(m).filter(function (k) { return m[k] === ref; })[0] || '';
    }
    // a picture moved: every frame it hung in keeps it (as the content manager's moved())
    function moved(from, to) {
        return WALLS.reduce(function (p, w) {
            return p.then(function () {
                var m = framesNow[w.id] || {}, a = wallRef(from, w.id), b = wallRef(to, w.id), changed = false;
                Object.keys(m).forEach(function (k) { if (m[k] === a) { m[k] = b; changed = true; } });
                return changed ? writeFrames(w.id) : null;
            });
        }, Promise.resolve());
    }
    function unhangEverywhere(path) {
        return WALLS.reduce(function (p, w) {
            return p.then(function () {
                var m = framesNow[w.id] || {}, a = wallRef(path, w.id), changed = false;
                Object.keys(m).forEach(function (k) { if (m[k] === a) { m[k] = ''; changed = true; } });
                return changed ? writeFrames(w.id) : null;
            });
        }, Promise.resolve());
    }

    /* ---------------- the board (content/living/bottles/board.json) ---------------- */
    var BOARD = FOLDERS.bottles + 'board.json';
    var board = { pinned: [], pile: [] };
    function loadBoard() {
        return readJson(BOARD, {}).then(function (b) {
            board = { pinned: (b.pinned || []).filter(function (n) { return typeof n === 'string'; }), pile: (b.pile || []).filter(function (n) { return typeof n === 'string'; }) };
        });
    }
    function whereIs(name) { return board.pinned.indexOf(name) !== -1 ? 'pinned' : board.pile.indexOf(name) !== -1 ? 'pile' : 'crate'; }
    function place(name, where) {
        board.pinned = board.pinned.filter(function (n) { return n !== name; });
        board.pile = board.pile.filter(function (n) { return n !== name; });
        if (where === 'pinned') board.pinned.unshift(name);
        if (where === 'pile') board.pile.unshift(name);
        return putJson(BOARD, board);
    }

    /* =====================================================================
       the page
       ===================================================================== */
    var tab = 'letters';
    try { tab = localStorage.getItem('dav-desk-tab') || 'letters'; } catch (e) {}
    function show(which) {
        ['dk-signin', 'dk-claim'].forEach(function (c) { $('.' + c).hidden = c !== which; });
        var inside = which === 'desk';
        $('.dk-tabs').hidden = $('.dk-main-area').hidden = !inside;
        $('.dk-who').hidden = !session;
        if (session) $('.dk-email').textContent = session.email || '';
        document.body.classList.toggle('dk-out', !inside);
        if (!inside) $('.dk-waiting').hidden = true;
    }
    function showSignIn(msg) {
        show('dk-signin');
        $('.dk-signin .dk-say').textContent = msg || '';
        setTimeout(function () { ($('.dk-in-email').value ? $('.dk-in-pass') : $('.dk-in-email')).focus(); }, 50);
    }
    $('.dk-signin-card').addEventListener('submit', function (e) {
        e.preventDefault();
        var say = $('.dk-signin .dk-say');
        say.textContent = 'signing in…';
        authCall('password', { email: $('.dk-in-email').value.trim(), password: $('.dk-in-pass').value }).then(function (j) {
            tookSession(j);
            $('.dk-in-pass').value = '';
            say.textContent = '';
            enter();
        }, function (err) { say.textContent = err.message; });
    });
    $('.dk-signout').addEventListener('click', function () {
        if (session) fetch(SB.url + '/auth/v1/logout', { method: 'POST', headers: { apikey: SB.key, Authorization: 'Bearer ' + session.access } }).catch(function () {});
        keepSession(null);
        showSignIn('signed out.');
    });
    $('.dk-claim-copy').addEventListener('click', function () {
        var t = $('.dk-claim-sql');
        t.select();
        (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(function () { toast('copied.'); }, function () { document.execCommand('copy'); toast('copied.'); });
    });
    $('.dk-claim-again').addEventListener('click', function () { enter(); });

    // in: is this the desk's owner? then everything, fresh
    function enter() {
        if (!session) { showSignIn(); return; }
        $('.dk-who').hidden = false;
        $('.dk-email').textContent = session.email || '';
        return sb('POST', '/rest/v1/rpc/dav_is_owner', { body: {} }).then(function (yes) {
            if (yes !== true) {
                show('dk-claim');
                $('.dk-claim-sql').value = "insert into public.desk_owner (uid) values ('" + session.id + "') on conflict do nothing;";
                $('.dk-claim-why').textContent = 'this account: ' + (session.email || session.id);
                return;
            }
            show('desk');
            return refresh().then(function () { openTab(tab); });
        }, function (e) {
            if (/dav_is_owner|could not find the function|404/i.test(e.message)) {
                show('dk-claim');
                $('.dk-claim-sql').value = '-- first run everything in tools/supabase-desk.sql (from your DaV-nky folder) in the SQL Editor,\n-- then come back here and press "done".';
                $('.dk-claim-why').textContent = 'Supabase doesn’t have the desk set up yet.';
                return;
            }
            oops(e);
        });
    }
    function refresh() {
        return Promise.all([loadRows(), Promise.all(Object.keys(FOLDERS).map(function (k) { return loadRepo(FOLDERS[k]); })),
                            frameNums.living ? null : loadFrames()])
            .then(function () { return Promise.all([loadBoard(), loadFrameLists(), loadWritten(), countPost()]); })
            .then(drawWaiting);
    }
    // "N changes on the desk": live on the site, not in the folder yet
    function drawWaiting() {
        var n = Object.keys(rows).filter(function (p) { return !rows[p].filed_at; }).length, w = $('.dk-waiting');
        w.hidden = !n || $('.dk-main-area').hidden;
        w.innerHTML = n ? '<b>' + n + (n === 1 ? ' change' : ' changes') + ' on the desk</b>, on the site now. ' +
            'the next time you publish from your computer, the content manager copies ' + (n === 1 ? 'it' : 'them') + ' into your folder.' : '';
    }

    /* ---------------- the tabs ---------------- */
    $$('.dk-tabs button').forEach(function (b) { b.addEventListener('click', function () { openTab(b.dataset.tab); }); });
    var DRAW = {};
    function openTab(which) {
        if (!DRAW[which]) which = 'letters';
        if (tab === 'letters' && which !== 'letters' && letterDirty() && !confirm('this letter has changes that aren’t saved. leave it anyway?')) return;
        tab = which;
        try { localStorage.setItem('dav-desk-tab', which); } catch (e) {}
        $$('.dk-tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === which); });
        $$('.dk-pane').forEach(function (p) { p.hidden = p.dataset.pane !== which; });
        DRAW[which]($('.dk-pane[data-pane="' + which + '"]'));
    }
    function redraw() { DRAW[tab]($('.dk-pane[data-pane="' + tab + '"]')); }

    // a picture, a video or a bit of text for a file, small
    function thumb(path, cls) {
        var u = urlOf(path), ext = extOf(path), box = el('div', 'dk-thumb' + (cls ? ' ' + cls : ''));
        if (!u) return box;
        if (ext === 'mp4' || ext === 'webm') {
            var v = el('video'); v.src = u; v.muted = true; v.loop = true; v.autoplay = true; v.setAttribute('playsinline', ''); box.appendChild(v);
        } else if (ext === 'txt' || ext === 'html') {
            box.classList.add('dk-words');
            readText(path).then(function (t) { box.textContent = ext === 'html' ? t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : t.trim(); });
        } else {
            var im = el('img'); im.loading = 'lazy'; im.decoding = 'async'; im.alt = ''; im.src = u; box.appendChild(im);
        }
        return box;
    }
    function button(label, fn, cls) {
        var b = el('button', 'dk-btn' + (cls ? ' ' + cls : ''));
        b.type = 'button';
        b.innerHTML = label;
        b.addEventListener('click', fn);
        return b;
    }
    function deskMark(path) { return onDesk(path) ? '<span class="dk-ondesk" title="changed at the desk: on the site now, in your folder after the next publish">on the desk</span>' : ''; }

    /* =====================================================================
       letters (content/sea/)
       ===================================================================== */
    var L = { cur: null, kind: 'txt', dirty: false, titles: {} };
    function letterDirty() { return L.dirty; }
    function letterList() {
        return names(FOLDERS.sea, LETTER_RE).map(function (n) {
            var path = FOLDERS.sea + n;
            return { name: n, path: path, date: dateOf(n), kind: extOf(n), later: !!(dateOf(n) && dateOf(n) > today()), written: written[n] || '' };
        }).sort(function (a, b) {
            return (b.date || '0000').localeCompare(a.date || '0000') || b.written.localeCompare(a.written) || b.name.localeCompare(a.name);
        });
    }
    // when each letter was written (content/sea/written.json, as the content manager keeps it): the same day's
    // letters go newest first by it, here and on the sea (sky/letters.js)
    var WRITTEN = FOLDERS.sea + 'written.json', written = {};
    function loadWritten() {
        return readJson(WRITTEN, {}).then(function (j) {
            written = {};
            Object.keys(j || {}).forEach(function (k) { if (typeof j[k] === 'string') written[k] = j[k]; });
        });
    }
    function noteWritten(name, from) {
        if (from && from !== name) { written[name] = written[from] || new Date().toISOString(); delete written[from]; }
        else if (!written[name]) written[name] = new Date().toISOString();
        else return Promise.resolve();
        return putJson(WRITTEN, written);
    }
    function forgetWritten(name) {
        if (!(name in written)) return Promise.resolve();
        delete written[name];
        return putJson(WRITTEN, written);
    }
    function letterTitle(item) {
        var key = item.path + '|' + (rows[item.path] ? rows[item.path].obj : '');
        if (L.titles[key]) return Promise.resolve(L.titles[key]);
        return readText(item.path).then(function (t) {
            var title;
            if (item.kind === 'html') { var m = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/i.exec(t); title = m ? m[1].replace(/<[^>]+>/g, '').trim() : ''; }
            else title = (t.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); })[0] || '').replace(/^#+\s*/, '').trim();
            return (L.titles[key] = title || titleOf(item.name));
        });
    }
    DRAW.letters = function (pane) {
        if (pane.dataset.built !== '1') {
            pane.dataset.built = '1';
            pane.innerHTML =
                '<div class="dk-letters">' +
                    '<aside class="dk-sheet dk-list-sheet"><div class="dk-row"><h2>your letters</h2>' +
                        '<button type="button" class="dk-btn dk-main dk-new">+ a new letter</button></div>' +
                        '<p class="dk-hint">the letters on the sea. a new one washes up in a bottle for everyone who hasn’t read it.</p>' +
                        '<div class="dk-list"></div></aside>' +
                    '<section class="dk-sheet dk-edit" hidden>' +
                        '<label class="dk-txt">title (the letter’s first line)<input type="text" class="dk-l-title dk-big" maxlength="120" placeholder="a message in a bottle"></label>' +
                        '<div class="dk-two"><label class="dk-txt">a line under the title (optional)<input type="text" class="dk-l-sub" maxlength="200"></label>' +
                            '<label>date<input type="date" class="dk-l-date"></label></div>' +
                        '<p class="dk-hint dk-later" hidden>this date is in the future: the letter stays hidden until that day, then arrives in a bottle.</p>' +
                        '<div class="dk-tools dk-txt">' +
                            '<button type="button" data-wrap="*"><i>italic</i></button><button type="button" data-wrap="**"><b>bold</b></button>' +
                            '<button type="button" data-do="link">link</button>' +
                            '<button type="button" data-do="hand" class="dk-hand" title="write with a pen (a drawing tablet\u2019s pressure works), a mouse or a finger. with the cursor on a page you wrote by hand: carry on with that one">\u270e write by hand</button>' +
                            '<button type="button" data-do="picture">picture…</button>' +
                            '<button type="button" data-do="song" title="a song of your own (.mp3 / .ogg), as a record in its sleeve. it can play by itself, and fall out of the letter into the reader\u2019s record player. with the cursor on a song\u2019s line: change it">\u266B a song…</button>' +
                            '<button type="button" data-do="embed">embed a link…</button><button type="button" data-do="line">a line ——</button><button type="button" data-do="signoff">sign-off</button>' +
                            '<input type="file" class="dk-l-pic" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" hidden></div>' +
                        '<textarea class="dk-l-body" spellcheck="true" placeholder="write your letter here.\n\na blank line starts a new paragraph."></textarea>' +
                        '<p class="dk-hint dk-txt">a blank line = a new paragraph · <code>*italics*</code> · <code>**bold**</code> · <code>[words](https://…)</code> a link · ' +
                            '<code>---</code> alone = a drawn line · <code>~ bye</code> alone = a sign-off · a link alone on its line = embedded (a video, a song, a post…) · its \u25B7 in the preview: click, and it plays by itself when the letter\u2019s opened</p>' +
                        '<p class="dk-hint dk-htmlnote" hidden>this letter is written in HTML (a .html file): edit the code as it is.</p>' +
                        '<div class="dk-actions"><button type="button" class="dk-btn dk-main dk-l-save">save it to the site</button>' +
                            '<button type="button" class="dk-btn dk-l-look">preview</button>' +
                            '<button type="button" class="dk-btn dk-danger dk-l-del">delete</button><span class="dk-l-state"></span></div>' +
                    '</section>' +
                    '<section class="dk-preview"><div class="dk-empty">pick a letter, or write a new one.</div></section>' +
                '</div>';
            wireLetters(pane);
        }
        drawLetterList(pane);
    };
    function drawLetterList(pane) {
        var list = $('.dk-list', pane), items = letterList();
        list.innerHTML = items.length ? '' : '<p class="dk-hint">no letters yet.</p>';
        items.forEach(function (it) {
            var b = el('button', 'dk-item' + (it.path === L.cur ? ' on' : ''));
            b.type = 'button';
            b.innerHTML = '<b>…</b><small>' + niceDate(it.date) + (it.later ? ' · <span class="dk-later-tag">waiting for its day</span>' : '') +
                (it.kind === 'html' ? ' · html' : '') + '</small>' + deskMark(it.path);
            letterTitle(it).then(function (t) { b.querySelector('b').textContent = t; });
            b.addEventListener('click', function () { openLetter(pane, it.path); });
            list.appendChild(b);
        });
    }
    function wireLetters(pane) {
        var t = $('.dk-l-title', pane), s = $('.dk-l-sub', pane), d = $('.dk-l-date', pane), body = $('.dk-l-body', pane);
        [t, s, d, body].forEach(function (x) { x.addEventListener('input', function () { setLetterDirty(pane, true); renderLetter(pane); }); });
        $('.dk-new', pane).addEventListener('click', function () { newLetter(pane); });
        $('.dk-l-save', pane).addEventListener('click', function () { saveLetter(pane); });
        $('.dk-l-del', pane).addEventListener('click', function () { deleteLetter(pane); });
        $('.dk-l-look', pane).addEventListener('click', function () {
            var on = !pane.classList.contains('dk-looking');
            pane.classList.toggle('dk-looking', on);
            this.textContent = on ? 'hide the preview' : 'preview';
            if (on) $('.dk-preview', pane).scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        function insert(before, after, placeholder) {
            var a = body.selectionStart, z = body.selectionEnd, v = body.value, mid = v.slice(a, z) || placeholder || '';
            body.value = v.slice(0, a) + before + mid + after + v.slice(z);
            body.focus();
            body.setSelectionRange(a + before.length, a + before.length + mid.length);
            setLetterDirty(pane, true); renderLetter(pane);
        }
        function block(text) {
            var v = body.value, end = v.indexOf('\n\n', body.selectionEnd), at = end === -1 ? v.length : end;
            var pre = v.slice(0, at).replace(/\s*$/, ''), post = v.slice(at).replace(/^\s*/, '');
            body.value = pre + (pre ? '\n\n' : '') + text + (post ? '\n\n' + post : '');
            var c = pre.length + (pre ? 2 : 0) + text.length;
            body.focus(); body.setSelectionRange(c, c);
            setLetterDirty(pane, true); renderLetter(pane);
        }
        $$('[data-wrap]', pane).forEach(function (b) { b.addEventListener('click', function () { insert(b.dataset.wrap, b.dataset.wrap, 'these words'); }); });
        // a link pasted on an empty line: on a line of its own, with space round it, so it's embedded
        body.addEventListener('paste', function (e) {
            var t = (e.clipboardData && e.clipboardData.getData('text/plain') || '').trim();
            if (!window.DavEmbed || !DavEmbed.lone(t) || /\s/.test(t)) return;
            var v = body.value, a = body.selectionStart, z = body.selectionEnd;
            var lineStart = v.lastIndexOf('\n', a - 1) + 1, lineEnd = v.indexOf('\n', z);
            if (v.slice(lineStart, a).trim() || v.slice(z, lineEnd === -1 ? v.length : lineEnd).trim()) return;   // (in a sentence: just a link)
            e.preventDefault();
            var pre = v.slice(0, lineStart).replace(/\s*$/, ''), post = v.slice(lineEnd === -1 ? v.length : lineEnd).replace(/^\s*/, '');
            body.value = pre + (pre ? '\n\n' : '') + t + '\n\n' + post;
            var c = pre.length + (pre ? 2 : 0) + t.length + 2;
            body.setSelectionRange(c, c);
            setLetterDirty(pane, true); renderLetter(pane);
        });
        var pic = $('.dk-l-pic', pane);
        $$('[data-do]', pane).forEach(function (b) {
            b.addEventListener('click', function () {
                var w = b.dataset.do;
                if (w === 'link') { var u = prompt('the web address to link to:', 'https://'); if (u && u !== 'https://') insert('[', '](' + u.trim() + ')', 'these words'); }
                if (w === 'embed') {
                    var e = prompt('a link to a video, a song, a post… (it goes on a line of its own and plays right there in the letter):', 'https://');
                    if (e && /^https?:\/\/\S+$/.test(e.trim())) block(e.trim());                // (the ▷ on it in the preview: click to make it start by itself)
                }
                if (w === 'line') block('---');
                if (w === 'signoff') { var so = prompt('sign off with:', 'more soon'); if (so) block('~ ' + so); }
                if (w === 'picture') pic.click();
                if (w === 'hand') byHand(handAt(body.value, body.selectionStart));
                if (w === 'song') songHere();
            });
        });
        // writing by hand (sky/inkpad.js): a page of it, put on the desk as a picture beside the letters
        // the paragraph the cursor's in, if it's a page written by hand (so the button carries on with that one)
        function handAt(v, c) {
            var a = v.lastIndexOf('\n\n', Math.max(0, c - 1)), z = v.indexOf('\n\n', c);
            a = a < 0 ? 0 : a + 2; z = z < 0 ? v.length : z;
            var m = /^!\[handwritten[^\]]*\]\(([^)\s]+)\)$/i.exec(v.slice(a, z).trim());
            return m ? { a: a, z: z, path: m[1] } : null;
        }
        function byHand(at) {
            if (!window.DavInk || L.kind !== 'txt') return;
            DavInk.open({ base: at ? urlOf(decodeURIComponent(at.path)) : null, done: function (blob) {
                work('putting your handwriting in…', function () {
                    var path = FOLDERS.sea + unique(FOLDERS.sea, today() + '-handwritten', '.png');
                    return put(path, blob, 'image/png').then(function () {
                        var line = '![handwritten](' + path + ')';
                        if (at) {                                          // (in place of the one it carried on from)
                            var v = body.value;
                            body.value = v.slice(0, at.a) + line + v.slice(at.z);
                            body.setSelectionRange(at.a + line.length, at.a + line.length);
                            setLetterDirty(pane, true); renderLetter(pane);
                        } else block(line);
                        toast('your handwriting’s on the desk. save the letter to put it up.');
                    });
                });
            } });
        }
        // a song of your own (sky/songpad.js): the song and its sleeve put on the desk beside the letters, its line written
        function paraAt(v, c) {
            var a = v.lastIndexOf('\n\n', Math.max(0, c - 1)), z = v.indexOf('\n\n', c);
            a = a < 0 ? 0 : a + 2; z = z < 0 ? v.length : z;
            return { a: a, z: z, text: v.slice(a, z).trim() };
        }
        function putFile(file, kind) {
            var ext = (/\.[a-z0-9]+$/i.exec(file.name) || [''])[0].toLowerCase().replace('.jpeg', '.jpg');
            var path = FOLDERS.sea + unique(FOLDERS.sea, today() + '-' + slug(stemOf(file.name), kind), ext);
            // (a song's type by its name: Firefox calls an .ogg video/ogg or application/ogg, which the desk's storage won't take)
            var type = ext === '.ogg' ? 'audio/ogg' : ext === '.mp3' ? 'audio/mpeg' : file.type || 'application/octet-stream';
            return put(path, file, type)
                .then(function () { return path; }, function (e) {
                    if (kind === 'song' && /mime|type|not supported|invalid/i.test(String(e && e.message || e)))
                        throw new Error('the desk can\u2019t take songs yet: run tools/supabase-desk.sql in Supabase\u2019s SQL editor once more (it lets songs in now), then try again');
                    throw e;
                });
        }
        function songHere() {
            if (L.kind !== 'txt') { toast('a song goes in a letter written as words (.txt): this one\u2019s html', true); return; }
            if (!window.DavSong || !window.DavEmbed || !DavEmbed.song) { toast('the desk\u2019s code is out of date in this browser: reload the page (ctrl+shift+r) and try again', true); return; }
            var at = paraAt(body.value, body.selectionStart), was = DavEmbed.song(at.text);
            DavSong.open({ was: was, where: function (x) { return /^content\//.test(x) ? urlOf(decodeURIComponent(x)) || '' : x; }, done: function (r) {
                work(r.file ? 'putting the song in… (a big one takes a moment)' : 'changing it…', function () {
                    return Promise.all([r.file ? putFile(r.file, 'song') : was.src, r.sleeveFile ? putFile(r.sleeveFile, 'sleeve') : r.sleeve]).then(function (got) {
                        var line = DavEmbed.songLine({ title: r.title, src: got[0], sleeve: got[1] || '', autoplay: r.autoplay, gift: r.gift });
                        if (was) {
                            var v = body.value;
                            body.value = v.slice(0, at.a) + line + v.slice(at.z);
                            body.setSelectionRange(at.a + line.length, at.a + line.length);
                            setLetterDirty(pane, true); renderLetter(pane);
                        } else block(line);
                        toast('the song\u2019s on the desk. save the letter to put it up.');
                    });
                });
            } });
        }
        // a page written by hand, clicked in the preview: carry on writing on it
        $('.dk-preview', pane).addEventListener('click', function (e) {
            var f = e.target.closest && e.target.closest('figure.handwritten'), im = f && f.querySelector('img');
            if (!im || L.kind !== 'txt') return;
            var v = body.value, re = /!\[handwritten[^\]]*\]\(([^)\s]+)\)/gi, m;
            while ((m = re.exec(v))) if (urlOf(decodeURIComponent(m[1])) === im.getAttribute('src')) { byHand(handAt(v, m.index)); return; }
        });
        pic.addEventListener('change', function () {
            var f = pic.files[0];
            pic.value = '';
            if (!f) return;
            var ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg' }[f.type];
            if (!ext) { toast('pictures can be png, jpg, gif, webp or svg', true); return; }
            if (f.size > 4 * 1024 * 1024) { toast('that picture is over 4 MB: save it smaller first', true); return; }
            work('adding the picture…', function () {
                var name = unique(FOLDERS.sea, today() + '-' + slug(stemOf(f.name), 'picture'), ext), path = FOLDERS.sea + name;
                return put(path, f, f.type).then(function () {
                    block('![' + titleOf(f.name) + '](' + path + ')');
                    toast('the picture’s on the desk. save the letter to put it up.');
                });
            });
        });
        document.addEventListener('keydown', function (e) {
            if (tab === 'letters' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveLetter(pane); }
        });
        window.addEventListener('beforeunload', function (e) { if (L.dirty) { e.preventDefault(); e.returnValue = ''; } });
    }
    function setLetterDirty(pane, d) {
        L.dirty = d;
        var st = $('.dk-l-state', pane);
        st.classList.toggle('dirty', d);
        st.textContent = d ? 'not saved yet' : '';
    }
    function showEditor(pane, kind) {
        L.kind = kind;
        $('.dk-edit', pane).hidden = false;
        pane.classList.add('dk-writing');
        $$('.dk-txt', pane).forEach(function (x) { x.hidden = kind !== 'txt'; });
        $('.dk-htmlnote', pane).hidden = kind !== 'html';
        $('.dk-l-body', pane).classList.toggle('dk-code', kind === 'html');
        $('.dk-l-del', pane).hidden = !L.cur;
    }
    function openLetter(pane, path) {
        if (path === L.cur) return;
        if (L.dirty && !confirm('this letter has changes that aren’t saved. leave it anyway?')) return;
        readText(path).then(function (text) {
            L.cur = path;
            var name = split(path)[1], kind = extOf(name) === 'html' ? 'html' : 'txt', t = text.replace(/\r/g, '');
            $('.dk-l-date', pane).value = dateOf(name);
            if (kind === 'txt') {
                var blocks = t.replace(/^\s+/, '').split(/\n\s*\n/), first = (blocks.shift() || '').split('\n');
                $('.dk-l-title', pane).value = (first.shift() || '').replace(/^#+\s*/, '');
                $('.dk-l-sub', pane).value = first.join(' ');
                $('.dk-l-body', pane).value = blocks.join('\n\n').replace(/\s+$/, '');
            } else {
                var m = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/i.exec(t);
                $('.dk-l-title', pane).value = m ? m[1].replace(/<[^>]+>/g, '').trim() : titleOf(name);
                $('.dk-l-sub', pane).value = '';
                $('.dk-l-body', pane).value = t.replace(/\s+$/, '');
            }
            showEditor(pane, kind);
            setLetterDirty(pane, false);
            renderLetter(pane);
            drawLetterList(pane);
            if (window.innerWidth < 900) $('.dk-edit', pane).scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    function newLetter(pane) {
        if (L.dirty && !confirm('this letter has changes that aren’t saved. leave it anyway?')) return;
        L.cur = null;
        $('.dk-l-title', pane).value = ''; $('.dk-l-sub', pane).value = ''; $('.dk-l-body', pane).value = '';
        $('.dk-l-date', pane).value = today();
        showEditor(pane, 'txt');
        setLetterDirty(pane, false);
        renderLetter(pane);
        drawLetterList(pane);
        $('.dk-edit', pane).scrollIntoView({ behavior: 'smooth', block: 'start' });
        $('.dk-l-title', pane).focus();
    }
    // the preview, on the site's own paper (the same rules as Sky.txtToHtml in sky/sky.js)
    function inline(x) {
        return esc(x)
            .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, src) {
                var u = /^content\//.test(src) ? urlOf(decodeURIComponent(src)) || '' : src;
                return '<img src="' + u + '" alt="' + alt + '">';
            })
            .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    }
    function txtToHtml(title, sub, body) {
        var out = '<h2>' + inline(title || 'untitled') + '</h2>' + (sub ? '<p class="subtitle">' + inline(sub) + '</p>' : '');
        body.replace(/\r/g, '').trim().split(/\n\s*\n/).forEach(function (b, i) {
            b = b.trim();
            if (!b) return;
            if (/^-{3,}$/.test(b)) { out += '<hr>'; return; }
            if (/^~\s/.test(b)) { out += '<p class="signoff">' + inline(b.replace(/^~\s*/, '')) + '</p>'; return; }
            var sg = window.DavEmbed && DavEmbed.song(b);                   // (a song of your own: a record in its sleeve)
            if (sg) { out += DavEmbed.songHtml(sg, function (p) { return /^content\//.test(p) ? urlOf(decodeURIComponent(p)) || '' : p; }); return; }
            var link = window.DavEmbed && DavEmbed.lone(b);                 // (a link on its own: its player, sky/embeds.js)
            if (link) { out += DavEmbed.html(link, { autoplay: DavEmbed.plays(b) }); return; }
            if (window.DavEmbed && DavEmbed.isHand(b)) { out += DavEmbed.handwritten(inline(b)); return; }      // (written by hand: sky/inkpad.js)
            if (window.DavEmbed && /^!\[[^\]]*\]\([^)\s]+\)$/.test(b)) { out += DavEmbed.taped(inline(b), b); return; }   // (a picture alone: taped on)
            out += '<p' + (i === 0 ? ' class="lede"' : '') + '>' + inline(b).replace(/\n/g, '<br>') + '</p>';
        });
        return out;
    }
    function renderLetter(pane) {
        var prev = $('.dk-preview', pane), d = $('.dk-l-date', pane).value;
        if ($('.dk-edit', pane).hidden) return;
        var html = L.kind === 'txt' ? txtToHtml($('.dk-l-title', pane).value, $('.dk-l-sub', pane).value, $('.dk-l-body', pane).value)
            : $('.dk-l-body', pane).value.replace(/(<img[^>]+src=")(content\/[^"]+)"/gi, function (m, a, src) { return a + (urlOf(decodeURIComponent(src)) || '') + '"'; })
                                       .replace(/<script[\s\S]*?<\/script>/gi, '');
        var label = d ? niceDate(d, true) : '', inner = (label ? '<p class="date">' + label + '</p>' : '') + html;
        // (drawn again around the players already there, so a video doesn't start over at every key: sky/embeds.js)
        var content = $('.letter .content', prev);
        if (content && window.DavEmbed) { DavEmbed.patch(content, inner); }
        else {
            prev.innerHTML = '<p class="dk-note">how it looks on the site</p><article class="letter"><div class="curl curl-top"></div><div class="sheet"><div class="content">' +
                inner + '</div></div><div class="curl curl-bottom"></div></article>';
            if (window.DavEmbed) DavEmbed.dress(prev);
        }
        // ▷ on each player and song: click it, it plays by itself when the letter's opened (sky/embeds.js)
        if (window.DavEmbed && DavEmbed.autoButtons && L.kind === 'txt') {
            DavEmbed.autoButtons(prev);
            DavEmbed.autoSwitch(prev, $('.dk-l-body', pane), function () { setLetterDirty(pane, true); renderLetter(pane); });
        }
        $('.dk-later', pane).hidden = !(d && d > today());
    }
    function saveLetter(pane) {
        if ($('.dk-edit', pane).hidden) return;
        var kind = L.kind, date = $('.dk-l-date', pane).value, title = $('.dk-l-title', pane).value.trim().replace(/\n/g, ' ');
        var body = $('.dk-l-body', pane).value.replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, ''), text;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('pick a date for the letter', true); return; }
        if (kind === 'txt') {
            if (!title) { toast('give the letter a title first (its first line)', true); $('.dk-l-title', pane).focus(); return; }
            var sub = $('.dk-l-sub', pane).value.trim().replace(/\n/g, ' ');
            text = title + (sub ? '\n' + sub : '') + '\n\n' + body + '\n';
        } else text = body + '\n';
        var old = L.cur, oldName = old ? split(old)[1] : null, base;
        if (old) {
            // an existing letter keeps its name (visitors' browsers know it by name: a new one would wash up in a bottle
            // again); only a new date changes the date at its front
            var rest = stemOf(oldName).replace(/^\d{4}-\d{2}-\d{2}-?/, '');
            kind = extOf(oldName);
            base = date + (rest ? '-' + rest : '');
        } else base = date + '-' + slug(title);
        var name = base + '.' + kind, i = 2;
        while (name !== oldName && taken(FOLDERS.sea, name)) { name = base + '-' + i + '.' + kind; i++; }
        var path = FOLDERS.sea + name;
        work('saving…', function () {
            return putText(path, text).then(function () {
                if (old && old !== path) return remove(old);
            }).then(function () {
                // (a new letter: written now. one renamed by its date keeps when it was first written; an edit changes nothing)
                return old ? (old !== path ? noteWritten(name, split(old)[1]) : null) : noteWritten(name);
            }).then(function () {
                var renamed = old && old !== path;
                L.cur = path;
                setLetterDirty(pane, false);
                $('.dk-l-del', pane).hidden = false;
                toast((renamed ? 'saved (its date changed, so its name did too): ' : 'saved: ') + 'it’s on the sea now' + (date > today() ? ', hidden until ' + niceDate(date) + '.' : '.'));
                drawLetterList(pane);
            });
        });
    }
    function deleteLetter(pane) {
        if (!L.cur || !confirm('delete “' + ($('.dk-l-title', pane).value || split(L.cur)[1]) + '”? it goes from the site now.')) return;
        var path = L.cur;
        work('deleting…', function () {
            return remove(path).then(function () { return forgetWritten(split(path)[1]); }).then(function () {
                L.cur = null; L.dirty = false;
                $('.dk-edit', pane).hidden = true;
                pane.classList.remove('dk-writing', 'dk-looking');
                $('.dk-preview', pane).innerHTML = '<div class="dk-empty">deleted. pick another letter, or write a new one.</div>';
                toast('deleted.');
                drawLetterList(pane);
            });
        });
    }

    /* =====================================================================
       the post: what visitors sent (the "post" table, pictures in the private "post" storage)
       ===================================================================== */
    var post = [];
    function countPost() {
        return sb('GET', '/rest/v1/post?select=*&order=created_at.desc&limit=500').then(function (list) {
            post = list || [];
            var c = $('.dk-tabs .dk-count');
            c.hidden = !post.length;
            c.textContent = post.length;
        }, function () { post = []; });
    }
    function postPicture(row, img) {
        if (!row.file_path) return;
        sb('POST', '/storage/v1/object/sign/post/' + encPath(row.file_path), { body: { expiresIn: 3600 } }).then(function (j) {
            var u = j && (j.signedURL || j.signedUrl);
            if (u) img.src = /^https?:/.test(u) ? u : SB.url + '/storage/v1' + u;
        }).catch(function () { img.alt = '(the picture couldn’t be fetched)'; });
    }
    DRAW.post = function (pane) {
        pane.innerHTML = '<div class="dk-sheet dk-wide"><div class="dk-row"><h2>the post</h2>' +
            '<button type="button" class="dk-btn dk-check">check again</button>' +
            '<button type="button" class="dk-btn dk-main dk-keep-all"' + (post.length ? '' : ' hidden') + '>keep everything</button></div>' +
            '<p class="dk-hint">bottles and paintings visitors sent. keep one and it’s on the site at once (bottles go in the crate in the living space, paintings in the workshop’s portfolio); throw it back and it’s gone.</p>' +
            '<div class="dk-grid dk-inbox"></div></div>';
        $('.dk-check', pane).addEventListener('click', function () { work('checking…', function () { return countPost().then(function () { toast(post.length ? post.length + ' waiting.' : 'nothing new.'); DRAW.post(pane); }); }); });
        $('.dk-keep-all', pane).addEventListener('click', function () {
            if (!confirm('keep all ' + post.length + '?')) return;
            work('keeping everything…', function () {
                return post.slice().reduce(function (p, row) { return p.then(function () { return keepPost(row).catch(function (e) { toast(e.message, true); }); }); }, Promise.resolve())
                    .then(function () { return countPost(); }).then(function () { DRAW.post(pane); toast('kept.'); });
            });
        });
        var grid = $('.dk-inbox', pane);
        if (!post.length) grid.innerHTML = '<p class="dk-empty-note">nothing waiting. (new post shows up here, and on your phone if notifications are set up.)</p>';
        post.forEach(function (row) {
            var card = el('div', 'dk-card dk-post-card ' + (row.kind === 'art' ? 'is-art' : 'is-bottle'));
            card.innerHTML = '<div class="dk-kind">' + (row.kind === 'art' ? 'a painting' : 'a bottle') + '</div>' +
                (row.file_path ? '<div class="dk-thumb"><img alt="" loading="lazy"></div>' : '') +
                (row.title ? '<h3>' + esc(row.title) + '</h3>' : '') +
                (row.message ? '<div class="dk-words">' + esc(row.message) + '</div>' : '') +
                '<p class="dk-from">' + (row.from_name ? 'from ' + esc(row.from_name) : 'unsigned') + ' · ' + niceDate((row.created_at || '').slice(0, 10)) + '</p>' +
                '<div class="dk-actions"></div>';
            if (row.file_path) postPicture(row, $('img', card));
            var acts = $('.dk-actions', card);
            acts.appendChild(button('keep it', function () {
                work('keeping…', function () { return keepPost(row).then(function (name) { return countPost().then(function () { DRAW.post(pane); toast('kept: ' + name + '. it’s on the site now.'); }); }); });
            }, 'dk-main'));
            acts.appendChild(button('throw it back', function () {
                if (!confirm('throw it back? it’s gone for good.')) return;
                work('throwing it back…', function () { return clearPost(row).then(function () { return countPost(); }).then(function () { DRAW.post(pane); toast('thrown back.'); }); });
            }, 'dk-danger'));
            grid.appendChild(card);
        });
    };
    function clearPost(row) {
        return (row.file_path ? sb('DELETE', '/storage/v1/object/post/' + encPath(row.file_path), { as: 'none' }).catch(function () {}) : Promise.resolve())
            .then(function () { return sb('DELETE', '/rest/v1/post?id=eq.' + encodeURIComponent(row.id), { as: 'none' }); });
    }
    // keep a piece of post: onto the site, named as the content manager names them (its keep())
    function keepPost(row) {
        var date = (row.created_at || '').slice(0, 10) || today(), who = (row.from_name || '').trim(), text = (row.message || '').trim();
        var pic = row.file_path ? sb('GET', '/storage/v1/object/authenticated/post/' + encPath(row.file_path), { as: 'blob' }) : Promise.resolve(null);
        return pic.then(function (blob) {
            var folder, name, put1;
            if (row.kind === 'art') {
                if (!blob) throw new Error('that painting has no picture to keep');
                folder = FOLDERS.art;
                name = unique(folder, date + '-' + slug(row.title || 'untitled') + (who ? '-by-' + slug(who) : ''), '.' + (extOf(row.file_path) || 'jpg'));
                put1 = put(folder + name, blob);
            } else {
                folder = FOLDERS.bottles;
                var stem = date + '-' + (who ? 'from-' + slug(who) : 'a-bottle');
                if (blob) {
                    name = unique(folder, stem, '.' + (extOf(row.file_path) || 'jpg'));
                    put1 = put(folder + name, blob);
                } else {
                    if (!text || text === '(a drawing or picture)') throw new Error('that bottle is empty');
                    name = unique(folder, stem, '.txt');
                    put1 = putText(folder + name, 'a message in a bottle\n\n' + text.replace(/\r\n/g, '\n') + (who ? '\n\n~ ' + who : '') + '\n');
                }
            }
            return put1.then(function () { return clearPost(row); }).then(function () { return name; });
        });
    }

    /* =====================================================================
       bottles (content/living/bottles/): the crate, the board, the pile
       ===================================================================== */
    DRAW.bottles = function (pane) {
        var all = names(FOLDERS.bottles, BOTTLE_RE).sort(function (a, b) { return (dateOf(b) || '').localeCompare(dateOf(a) || '') || a.localeCompare(b); });
        pane.innerHTML = '<div class="dk-sheet dk-wide"><h2>bottles</h2>' +
            '<p class="dk-hint">the bottles you kept, in the living space. pin one to the board, put it on the pile of letters, or leave it in the crate for anyone to uncork.</p>' +
            '<h3 class="dk-group">on the board</h3><div class="dk-grid" data-where="pinned"></div>' +
            '<h3 class="dk-group">on the pile</h3><div class="dk-grid" data-where="pile"></div>' +
            '<h3 class="dk-group">in the crate</h3><div class="dk-grid" data-where="crate"></div></div>';
        var groups = { pinned: [], pile: [], crate: [] };
        all.forEach(function (n) { groups[whereIs(n)].push(n); });
        groups.pinned.sort(function (a, b) { return board.pinned.indexOf(a) - board.pinned.indexOf(b); });
        groups.pile.sort(function (a, b) { return board.pile.indexOf(a) - board.pile.indexOf(b); });
        Object.keys(groups).forEach(function (g) {
            var grid = $('[data-where="' + g + '"]', pane);
            if (!groups[g].length) grid.innerHTML = '<p class="dk-empty-note">' + (g === 'crate' ? 'the crate’s empty.' : 'nothing ' + (g === 'pinned' ? 'pinned.' : 'on the pile.')) + '</p>';
            groups[g].forEach(function (n) {
                var path = FOLDERS.bottles + n, card = el('div', 'dk-card');
                card.appendChild(thumb(path));
                card.appendChild(el('p', 'dk-from', esc(n) + deskMark(path)));
                var acts = el('div', 'dk-actions');
                [['pinned', 'pin it'], ['pile', 'on the pile'], ['crate', 'in the crate']].forEach(function (w) {
                    if (w[0] === g) return;
                    acts.appendChild(button(w[1], function () { work('moving it…', function () { return place(n, w[0]).then(function () { DRAW.bottles(pane); toast('done: on the site now.'); }); }); }));
                });
                acts.appendChild(button('delete', function () {
                    if (!confirm('delete this bottle from the site?')) return;
                    work('deleting…', function () {
                        return remove(path).then(function () {
                            if (whereIs(n) !== 'crate') return place(n, 'gone');
                        }).then(function () { DRAW.bottles(pane); toast('deleted.'); });
                    });
                }, 'dk-danger'));
                card.appendChild(acts);
                grid.appendChild(card);
            });
        });
    };

    /* =====================================================================
       paintings: the easel (content/workshop/), the pictures for the walls (content/frames/), visitors' art
       ===================================================================== */
    var SHELF = [
        { id: 'easel', label: 'on the easel', folder: FOLDERS.easel, add: true, caption: true,
          hint: 'your paintings, on the workshop’s easel (one hung in a workshop frame leaves the easel while it’s up).' },
        { id: 'walls', label: 'pictures for the walls', folder: FOLDERS.walls, add: true, caption: true,
          hint: 'hidden everywhere else: only in the frames you hang them in.' },
        { id: 'art', label: 'visitors’ art', folder: FOLDERS.art, add: false, caption: false,
          hint: 'kept from the post, in the workshop’s portfolio.' }
    ];
    DRAW.paintings = function (pane) {
        pane.innerHTML = '';
        SHELF.forEach(function (sh) {
            var sec = el('div', 'dk-sheet dk-wide');
            sec.innerHTML = '<div class="dk-row"><h2>' + sh.label + '</h2>' +
                (sh.add ? '<label class="dk-btn dk-main dk-upload">+ add pictures<input type="file" multiple accept="' +
                    (sh.id === 'easel' ? 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml,video/mp4,video/webm' : 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml') + '" hidden></label>' : '') +
                '</div><p class="dk-hint">' + sh.hint + '</p><div class="dk-grid"></div>';
            pane.appendChild(sec);
            if (sh.add) $('input[type=file]', sec).addEventListener('change', function () {
                var files = Array.prototype.slice.call(this.files);
                this.value = '';
                if (!files.length) return;
                work('adding ' + (files.length === 1 ? 'it' : files.length + ' pictures') + '…', function () {
                    return files.reduce(function (p, f) {
                        return p.then(function () {
                            var ext = extOf(f.name);
                            if (!KINDS[sh.id].test('.' + ext)) { toast(f.name + ': that kind of file can’t go there', true); return; }
                            if (f.size > 30 * 1024 * 1024) { toast(f.name + ' is over 30 MB', true); return; }
                            return put(sh.folder + unique(sh.folder, cleanStem(stemOf(f.name)), '.' + ext), f);
                        });
                    }, Promise.resolve()).then(function () { DRAW.paintings(pane); toast('added: on the site now.'); });
                });
            });
            var grid = $('.dk-grid', sec), list = names(sh.folder, KINDS[sh.id])
                .sort(function (a, b) { return (dateOf(b) || '0000').localeCompare(dateOf(a) || '0000') || a.localeCompare(b); });
            if (!list.length) grid.innerHTML = '<p class="dk-empty-note">nothing here yet.</p>';
            list.forEach(function (n) { grid.appendChild(paintingCard(pane, sh, n)); });
        });
    };
    function paintingCard(pane, sh, n) {
        var path = sh.folder + n, d = describe(n), card = el('div', 'dk-card');
        card.appendChild(thumb(path));
        card.appendChild(el('h3', '', esc(d.title) + (d.by ? ' <small>by ' + esc(d.by) + '</small>' : '')));
        card.appendChild(el('p', 'dk-from', esc(n) + deskMark(path)));
        var capPath = sh.folder + stemOf(n) + '.txt';
        if (sh.caption) {
            var cap = el('p', 'dk-caption');
            if (exists(capPath)) readText(capPath).then(function (t) { cap.textContent = t.trim(); });
            card.appendChild(cap);
        }
        // where it hangs: a frame on each wall
        var hangs = el('div', 'dk-hangs');
        WALLS.forEach(function (w) {
            var nums = frameNums[w.id] || [];
            if (!nums.length) return;
            var lab = el('label', 'dk-hang'), sel = el('select');
            sel.innerHTML = '<option value="">—</option>' + nums.map(function (f) { return '<option value="' + f.n + '">' + f.n + (f.name ? ' (' + esc(f.name) + ')' : '') + '</option>'; }).join('');
            sel.value = hungWhere(path, w.id);
            sel.addEventListener('change', function () {
                var to = sel.value;
                work(to ? 'hanging it…' : 'taking it down…', function () { return hang(path, w.id, to).then(function () { toast(to ? 'hung in ' + w.label + ', frame ' + to + '.' : 'taken down.'); DRAW.paintings(pane); }); });
            });
            lab.appendChild(document.createTextNode(w.label.replace(/^the /, '') + ' '));
            lab.appendChild(sel);
            hangs.appendChild(lab);
        });
        card.appendChild(hangs);
        var acts = el('div', 'dk-actions');
        if (sh.caption) acts.appendChild(button('caption', function () {
            readText(capPath).then(function (old) {
                var t = prompt('a caption (blank: none):', exists(capPath) ? old.trim() : '');
                if (t === null) return;
                work('saving the caption…', function () {
                    return (t.trim() ? putText(capPath, t.trim() + '\n') : exists(capPath) ? remove(capPath) : Promise.resolve())
                        .then(function () { DRAW.paintings(pane); toast('caption saved.'); });
                });
            });
        }));
        var moves = sh.id === 'easel' ? [['walls', 'to the walls pool']] : sh.id === 'walls' ? [['easel', 'onto the easel']] : [['walls', 'to the walls pool']];
        moves.forEach(function (m) {
            acts.appendChild(button(m[1], function () {
                var dest = SHELF.filter(function (x) { return x.id === m[0]; })[0];
                if (!KINDS[dest.id].test(n)) { toast('that kind of file can’t go there', true); return; }
                work('moving it…', function () {
                    var to = dest.folder + unique(dest.folder, stemOf(n), '.' + extOf(n)), capTo = dest.folder + stemOf(split(to)[1]) + '.txt';
                    return copyTo(path, to).then(function () {
                        return exists(capPath) ? copyTo(capPath, capTo).then(function () { return remove(capPath); }) : null;
                    }).then(function () { return remove(path); }).then(function () { return moved(path, to); })
                      .then(function () { DRAW.paintings(pane); toast('moved: ' + dest.label + '.'); });
                });
            }));
        });
        acts.appendChild(button('delete', function () {
            if (!confirm('delete “' + d.title + '” from the site? (it comes down from any frame too)')) return;
            work('deleting…', function () {
                return remove(path).then(function () { return exists(capPath) ? remove(capPath) : null; })
                    .then(function () { return unhangEverywhere(path); }).then(function () { DRAW.paintings(pane); toast('deleted.'); });
            });
        }, 'dk-danger'));
        card.appendChild(acts);
        return card;
    }

    /* =====================================================================
       frames: what hangs where, wall by wall
       ===================================================================== */
    function hangables(wall) {
        // everything that can hang on this wall: its own folder first (a name alone), then the others (a path)
        var out = [], own = wallById(wall).folder;
        [own].concat([FOLDERS.art, FOLDERS.easel, FOLDERS.walls].filter(function (f) { return f !== own; })).forEach(function (f) {
            var re = f === FOLDERS.easel ? KINDS.walls : KINDS[f === FOLDERS.art ? 'art' : 'walls'];
            names(f, re).forEach(function (n) { out.push(f + n); });
        });
        return out;
    }
    function folderLabel(path) {
        return path.indexOf(FOLDERS.art) === 0 ? 'visitors' : path.indexOf(FOLDERS.walls) === 0 ? 'walls pool' : path.indexOf(FOLDERS.easel) === 0 ? 'easel' : '';
    }
    DRAW.frames = function (pane) {
        pane.innerHTML = '';
        WALLS.forEach(function (w) {
            var nums = frameNums[w.id] || [], m = framesNow[w.id] || {}, sec = el('div', 'dk-sheet dk-wide');
            sec.innerHTML = '<h2>' + w.label + '</h2><div class="dk-grid dk-frames"></div>';
            pane.appendChild(sec);
            var grid = $('.dk-frames', sec), choices = hangables(w.id);
            if (!nums.length) grid.innerHTML = '<p class="dk-empty-note">(no frames found on ' + w.page + ')</p>';
            nums.forEach(function (f) {
                var ref = typeof m[f.n] === 'string' ? m[f.n].trim() : '', path = ref ? refPath(ref, w.id) : '', card = el('div', 'dk-card dk-frame');
                card.appendChild(el('div', 'dk-frame-no', 'frame ' + f.n + (f.name ? ' <small>' + esc(f.name) + '</small>' : '')));
                var box = el('div', 'dk-frame-pic');
                if (path && exists(path)) box.appendChild(thumb(path));
                else box.innerHTML = '<span>' + (path ? 'missing: ' + esc(ref) : 'empty') + '</span>';
                card.appendChild(box);
                var sel = el('select', 'dk-frame-pick');
                sel.innerHTML = '<option value="">empty</option>' + choices.map(function (p) {
                    var dd = describe(p);
                    return '<option value="' + esc(p) + '">' + esc(dd.title) + (dd.by ? ' — ' + esc(dd.by) : '') + ' (' + folderLabel(p) + ')</option>';
                }).join('') + (path && choices.indexOf(path) === -1 ? '<option value="' + esc(path) + '">' + esc(ref) + '</option>' : '');
                sel.value = path;
                sel.addEventListener('change', function () {
                    var to = sel.value;
                    work('changing frame ' + f.n + '…', function () {
                        var go = to ? hang(to, w.id, f.n) : (function () { m[f.n] = ''; return writeFrames(w.id); })();
                        return go.then(function () { DRAW.frames(pane); toast('frame ' + f.n + ': on the site now.'); });
                    });
                });
                card.appendChild(sel);
                grid.appendChild(card);
            });
        });
    };

    /* ---------------- off we go ---------------- */
    config().then(function () {
        if (!session) { showSignIn(); return; }
        return enter();
    }).catch(function (e) {
        show('dk-signin');
        $('.dk-signin .dk-say').textContent = e.message;
    });
})();

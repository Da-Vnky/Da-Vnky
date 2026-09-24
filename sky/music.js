/* =====================================================================
   music.js — the site's music, shared by every page. The record player
   in the living space puts a record on; wander off to another page and
   the song carries on in a little player in the corner (pause, skip, or
   close it to stop the music altogether).

       <script src="sky/music.js"></script>          (on every page, after sky/panel.js)

   A page can't keep sound going while the browser loads the next one, so
   the song is picked up again where it was, a moment later. If a browser
   won't let sound start by itself, the panel asks for a tap.

   While music plays, <body> has the class "music-playing": anything can
   dance along (see .groove in sky.css, and the -dancing pose slots).
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.music) return;
    var KEY = 'music-now';
    var LIVING = 'living.html';                 // where the record player lives

    Sky.css(
        '@keyframes rp-spin { to { transform: rotate(360deg); } }' +
        '.cp .mu-now { display: flex; gap: 12px; align-items: center; }' +
        '.cp .mu-disc { flex: none; width: 64px; height: 64px; }' +
        '.cp .mu-disc svg { width: 100%; height: 100%; display: block; }' +
        'body.music-playing .cp .mu-disc svg { animation: rp-spin 4.5s linear infinite; }' +
        '.cp .mu-info { flex: 1; min-width: 0; line-height: 1.25; }' +
        '.cp .mu-title { font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
        '.cp .mu-artist { font-size: .88rem; font-style: italic; color: #6e5236; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-height: 1.1em; }' +
        '.cp .mu-seek { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: .8rem; color: #6e5236; font-variant-numeric: tabular-nums; }' +
        '.cp .mu-controls { display: flex; align-items: center; gap: 4px; margin-top: 6px; }' +
        '.cp .mu-controls .mu-stop { margin-left: auto; width: auto; padding: 0 10px; border-radius: 999px; font: italic .9rem "IM Fell English", Georgia, serif; color: #6e5236; }' +
        '.cp .mu-i-pause, body.music-playing .cp .mu-i-play { display: none; }' +
        'body.music-playing .cp .mu-i-pause { display: block; }' +
        '.cp .mu-empty { display: none; }' +
        '.cp .mu-layer.empty .mu-empty { display: block; } .cp .mu-layer.empty .mu-full { display: none; }' +
        '@media (prefers-reduced-motion: reduce) { body.music-playing .cp .mu-disc svg { animation: none; } }'
    );

    /* ---------------- a record, drawn: grooves, a label (your sleeve's picture), spindle hole ---------------- */
    var uid = 0;
    function disc(color, pic, cls) {
        var id = 'mdisc' + (++uid);
        return '<svg class="rp-disc ' + (cls || '') + '" viewBox="0 0 100 100" aria-hidden="true">' +
            '<defs><clipPath id="' + id + '"><circle cx="50" cy="50" r="17"/></clipPath>' +
            '<radialGradient id="' + id + 's" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#3a3a3f"/><stop offset=".6" stop-color="#151518"/><stop offset="1" stop-color="#0c0c0e"/></radialGradient></defs>' +
            '<circle cx="50" cy="50" r="49" fill="url(#' + id + 's)"/>' +
            '<g fill="none" stroke="rgba(255,255,255,.07)" stroke-width=".6">' +
                '<circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="39"/><circle cx="50" cy="50" r="34"/><circle cx="50" cy="50" r="29"/><circle cx="50" cy="50" r="24"/>' +
            '</g>' +
            '<path d="M22 20 A40 40 0 0 1 58 11" stroke="rgba(255,255,255,.22)" stroke-width="3" fill="none" stroke-linecap="round"/>' +
            '<circle cx="50" cy="50" r="17" fill="' + (color || '#9a3b1f') + '"/>' +
            (pic ? '<image href="' + pic + '" x="33" y="33" width="34" height="34" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + id + ')"/>' : '') +
            '<circle cx="50" cy="50" r="17" fill="none" stroke="rgba(0,0,0,.25)"/>' +
            '<circle cx="50" cy="50" r="2" fill="#0c0c0e"/>' +
            '</svg>';
    }

    /* ---------------- reading a song's own tags (ID3v2): title, artist, cover picture ---------------- */
    function readTags(url) {
        return fetch(url, { cache: 'force-cache' }).then(function (res) {
            if (!res.ok || !res.body) return null;
            var reader = res.body.getReader(), chunks = [], got = 0, need = 10, LIMIT = 1 << 20;
            function pump() {
                return reader.read().then(function (r) {
                    if (r.value) { chunks.push(r.value); got += r.value.length; }
                    if (got >= 10 && need === 10) {
                        var head = join();
                        if (head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) { reader.cancel(); return null; }   // no "ID3"
                        need = 10 + ((head[6] & 127) << 21 | (head[7] & 127) << 14 | (head[8] & 127) << 7 | (head[9] & 127));
                    }
                    if (r.done || got >= Math.min(need, LIMIT)) { reader.cancel(); return got >= 10 ? join() : null; }
                    return pump();
                });
            }
            function join() {
                var out = new Uint8Array(got), o = 0;
                chunks.forEach(function (c) { out.set(c, o); o += c.length; });
                return out;
            }
            return pump();
        }).then(function (b) { return b ? parseID3(b) : null; }).catch(function () { return null; });
    }
    function parseID3(b) {
        if (b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return null;
        var v = b[3], flags = b[5], end = Math.min(b.length, 10 + ((b[6] & 127) << 21 | (b[7] & 127) << 14 | (b[8] & 127) << 7 | (b[9] & 127)));
        var p = 10, out = {};
        if (flags & 0x40 && v >= 3) {
            var ext = v === 4 ? ((b[p] & 127) << 21 | (b[p + 1] & 127) << 14 | (b[p + 2] & 127) << 7 | (b[p + 3] & 127)) : ((b[p] << 24 | b[p + 1] << 16 | b[p + 2] << 8 | b[p + 3]) + 4);
            p += ext;
        }
        function text(enc, s, e) {
            var bytes = b.subarray(s, e), label = ['iso-8859-1', 'utf-16', 'utf-16be', 'utf-8'][enc] || 'iso-8859-1';
            try { return new TextDecoder(label).decode(bytes).replace(/\u0000+$/, '').split('\u0000')[0].trim(); } catch (e2) { return ''; }
        }
        function nulEnd(s, enc) {
            if (enc === 1 || enc === 2) { for (var i = s; i + 1 < end; i += 2) if (!b[i] && !b[i + 1]) return i + 2; }
            else { for (var j = s; j < end; j++) if (!b[j]) return j + 1; }
            return end;
        }
        while (p + (v === 2 ? 6 : 10) <= end) {
            var id, size, h;
            if (v === 2) { id = String.fromCharCode(b[p], b[p + 1], b[p + 2]); size = b[p + 3] << 16 | b[p + 4] << 8 | b[p + 5]; h = 6; }
            else {
                id = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]);
                size = v === 4 ? ((b[p + 4] & 127) << 21 | (b[p + 5] & 127) << 14 | (b[p + 6] & 127) << 7 | (b[p + 7] & 127))
                               : (b[p + 4] << 24 | b[p + 5] << 16 | b[p + 6] << 8 | b[p + 7]);
                h = 10;
            }
            if (!/^[A-Z0-9]{3,4}$/.test(id) || size <= 0) break;
            var s = p + h, e = Math.min(end, s + size), enc = b[s];
            if (id === 'TIT2' || id === 'TT2') out.title = text(enc, s + 1, e);
            else if (id === 'TPE1' || id === 'TP1') out.artist = text(enc, s + 1, e);
            else if ((id === 'APIC' || id === 'PIC') && !out.picture) {
                var q = s + 1, mime;
                if (id === 'PIC') { mime = 'image/' + String.fromCharCode(b[q], b[q + 1], b[q + 2]).toLowerCase().replace('jpg', 'jpeg'); q += 3; }
                else { var me = nulEnd(q, 0); mime = text(0, q, me - 1) || 'image/jpeg'; q = me; }
                q += 1;
                q = nulEnd(q, enc);
                if (q < e) out.picture = URL.createObjectURL(new Blob([b.slice(q, e)], { type: mime }));
            }
            p = e;
        }
        return out;
    }

    /* ---------------- the one audio element, and what's on ---------------- */
    var audio = new Audio();
    audio.preload = 'auto';
    var tracks = [], at = -1, listeners = [], wantPlay = false;
    try { var v0 = localStorage.getItem('records-volume'); if (v0 !== null) audio.volume = Math.max(0, Math.min(1, v0 / 100)); } catch (e) {}

    function emit(what) { listeners.forEach(function (fn) { try { fn(what); } catch (e) {} }); }
    function current() { return tracks[at] || null; }
    function playing() { return !audio.paused && !audio.ended; }

    function save() {
        var t = current();
        try {
            if (!t) { sessionStorage.removeItem(KEY); return; }
            sessionStorage.setItem(KEY, JSON.stringify({
                tracks: tracks.map(function (x) { return { url: x.url, title: x.title, artist: x.artist || '', color: x.color, pic: /^blob:/.test(x.pic || '') ? '' : (x.pic || '') }; }),
                at: at, time: audio.currentTime || 0, playing: playing() || wantPlay, savedAt: Date.now()
            }));
        } catch (e) {}
    }
    function absolute(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }

    function load(i, play, startAt) {
        if (!tracks.length) return;
        at = (i + tracks.length) % tracks.length;
        var t = tracks[at];
        if (audio.src !== absolute(t.url)) audio.src = t.url;
        if (startAt) {
            var go = function () { try { audio.currentTime = Math.min(startAt, (audio.duration || startAt + 1) - 0.5); } catch (e) {} };
            if (audio.readyState >= 1) go(); else audio.addEventListener('loadedmetadata', go, { once: true });
        }
        media(t);
        emit('track');
        if (play) start();
        save();
    }
    function start() {
        wantPlay = true;
        var p = audio.play();
        if (p && p.catch) p.catch(function () {
            // this browser wants a tap before sound starts: wait for one, anywhere
            document.body.classList.add('music-waiting');
            emit('waiting');
            var go = function () {
                document.removeEventListener('pointerdown', go, true);
                document.removeEventListener('keydown', go, true);
                document.body.classList.remove('music-waiting');
                if (wantPlay) audio.play().catch(function () {});
            };
            document.addEventListener('pointerdown', go, true);
            document.addEventListener('keydown', go, true);
        });
    }
    function pause() { wantPlay = false; audio.pause(); save(); }
    function toggle() {
        if (!tracks.length) return;
        if (at < 0) return load(0, true);
        if (audio.paused) start(); else pause();
    }
    function next() { load(at + 1, playing() || wantPlay || at < 0); }
    function prev() {
        if (audio.currentTime > 3) { audio.currentTime = 0; return; }    // like a real player: first back to the start
        load(at - 1, playing() || wantPlay || at < 0);
    }
    // close the music altogether
    function stop() {
        wantPlay = false;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        at = -1;
        try { sessionStorage.removeItem(KEY); } catch (e) {}
        emit('stop');
    }
    // the record player hands over its crate (keeps whatever's on, if it's in there)
    function setTracks(list) {
        var on = current(), keep = on ? list.findIndex(function (x) { return absolute(x.url) === absolute(on.url); }) : -1;
        tracks = list;
        if (keep !== -1) at = keep; else if (on) { /* the song on isn't in this crate: leave it playing */ tracks = list.concat([on]); at = tracks.length - 1; }
        emit('tracks');
        save();
    }
    function setVolume(v) {
        audio.volume = Math.max(0, Math.min(1, v));
        try { localStorage.setItem('records-volume', Math.round(audio.volume * 100)); } catch (e) {}
    }

    function sync() {
        var on = playing();
        document.body.classList.toggle('music-playing', on);
        document.body.classList.toggle('records-playing', on);
        if (on) document.body.classList.remove('music-waiting');
        emit(on ? 'play' : 'pause');
    }
    audio.addEventListener('play', sync);
    audio.addEventListener('playing', sync);
    audio.addEventListener('pause', function () { sync(); save(); });
    audio.addEventListener('ended', function () {
        if (tracks.length > 1) load(at + 1, true); else { wantPlay = false; sync(); save(); }
    });
    var lastSave = 0;
    audio.addEventListener('timeupdate', function () {
        emit('time');
        var n = Date.now();
        if (n - lastSave > 1500) { lastSave = n; save(); }
    });
    window.addEventListener('pagehide', save);

    // the phone's lock screen / the computer's media keys
    function media(t) {
        if (!('mediaSession' in navigator) || !t) return;
        try {
            navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || 'DaV-nky', album: 'the living space',
                artwork: t.pic && !/^blob:/.test(t.pic) ? [{ src: absolute(t.pic) }] : [] });
            navigator.mediaSession.setActionHandler('play', start);
            navigator.mediaSession.setActionHandler('pause', pause);
            navigator.mediaSession.setActionHandler('nexttrack', next);
            navigator.mediaSession.setActionHandler('previoustrack', prev);
        } catch (e) {}
    }

    /* ---------------- picking up the song from the last page ---------------- */
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) {}
    if (saved && saved.tracks && saved.tracks.length && saved.at >= 0) {
        tracks = saved.tracks;
        var gone = saved.playing ? (Date.now() - saved.savedAt) / 1000 : 0;
        load(saved.at, !!saved.playing, (saved.time || 0) + (gone < 30 ? gone : 0));
        // a cover picture that lived inside the file: read it again
        var t0 = current();
        if (t0 && !t0.pic && /\.mp3$/i.test(t0.url)) readTags(t0.url).then(function (tags) {
            if (tags && tags.picture && current() === t0) { t0.pic = tags.picture; emit('track'); }
        });
    }

    /* ---------------- the music layer of the control panel (top right, every page) ---------------- */
    var onDeckPage = !!document.querySelector('.turntable[data-folder]');
    var DISC_ICON = '<svg class="placeholder" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1c1c20"/>' +
        '<circle cx="12" cy="12" r="7.5" fill="none" stroke="rgba(255,255,255,.12)"/><circle cx="12" cy="12" r="4.2" fill="#9a3b1f"/><circle cx="12" cy="12" r="1" fill="#1c1c20"/></svg>';
    function mmss(t) { if (!isFinite(t)) return '0:00'; t = Math.floor(t); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
    var ui = {};
    if (Sky.panel) Sky.panel.add({
        id: 'music', title: 'music', order: 10, icon: DISC_ICON,
        build: function (body) {
            body.classList.add('mu-layer');
            body.innerHTML =
                '<p class="cp-note mu-empty">nothing on. ' + (onDeckPage ? 'click the record player to pick a record.' : 'put a record on in <a href="' + LIVING + '">the living space</a>; it keeps playing as you wander.') + '</p>' +
                '<div class="mu-full">' +
                    '<div class="mu-now"><a class="mu-disc" href="' + LIVING + '" title="to the record player"></a>' +
                        '<div class="mu-info"><div class="mu-title"></div><div class="mu-artist"></div>' +
                        '<div class="mu-seek"><span class="mu-cur">0:00</span><input type="range" min="0" max="1000" value="0" aria-label="position in the song"><span class="mu-dur">0:00</span></div></div></div>' +
                    '<div class="mu-controls">' +
                        '<button type="button" class="cp-btn mu-prev" aria-label="previous song"><svg viewBox="0 0 20 20"><path d="M4 4h2v12H4zM16 4 L7 10 L16 16 Z"/></svg></button>' +
                        '<button type="button" class="cp-btn big mu-play" aria-label="play or pause"><svg class="mu-i-play" viewBox="0 0 20 20"><path d="M6 4 L16 10 L6 16 Z"/></svg><svg class="mu-i-pause" viewBox="0 0 20 20"><path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z"/></svg></button>' +
                        '<button type="button" class="cp-btn mu-next" aria-label="next song"><svg viewBox="0 0 20 20"><path d="M14 4h2v12h-2zM4 4 L13 10 L4 16 Z"/></svg></button>' +
                        '<button type="button" class="cp-btn mu-stop" aria-label="stop the music">stop ✕</button>' +
                    '</div>' +
                    '<label class="cp-range">volume <input type="range" class="mu-vol" min="0" max="100" aria-label="music volume"></label>' +
                '</div>';
            ui.body = body;
            ui.disc = body.querySelector('.mu-disc'); ui.title = body.querySelector('.mu-title'); ui.artist = body.querySelector('.mu-artist');
            ui.seek = body.querySelector('.mu-seek input'); ui.cur = body.querySelector('.mu-cur'); ui.dur = body.querySelector('.mu-dur');
            ui.vol = body.querySelector('.mu-vol');
            ui.vol.value = Math.round(audio.volume * 100);
            body.querySelector('.mu-play').addEventListener('click', toggle);
            body.querySelector('.mu-next').addEventListener('click', next);
            body.querySelector('.mu-prev').addEventListener('click', prev);
            body.querySelector('.mu-stop').addEventListener('click', stop);
            ui.seek.addEventListener('input', function () { ui.seeking = true; ui.cur.textContent = mmss(ui.seek.value / 1000 * (audio.duration || 0)); });
            ui.seek.addEventListener('change', function () { if (audio.duration) audio.currentTime = ui.seek.value / 1000 * audio.duration; ui.seeking = false; });
            ui.vol.addEventListener('input', function () { setVolume(ui.vol.value / 100); });
            drawLayer('track');
        },
        status: function () {
            var t = current();
            if (!t) return 'nothing on';
            if (document.body.classList.contains('music-waiting')) return 'tap anywhere to keep listening';
            return t.title + (playing() ? ' · playing' : ' · paused');
        },
        active: function () { return playing() || document.body.classList.contains('music-waiting'); },
        badge: function () { return DISC_ICON.replace('class="placeholder"', 'class="spin"'); }
    });
    function drawLayer(what) {
        if (!ui.body) return;
        var t = current();
        ui.body.classList.toggle('empty', !t);
        if (t && what === 'time') {
            ui.cur.textContent = mmss(audio.currentTime);
            if (!ui.seeking && audio.duration) ui.seek.value = Math.round(audio.currentTime / audio.duration * 1000);
            return;
        }
        if (t) {
            ui.disc.innerHTML = disc(t.color, t.pic);
            ui.title.textContent = t.title;
            ui.artist.textContent = t.artist || '';
        }
        if (Sky.panel) Sky.panel.refresh('music');
    }
    listeners.push(drawLayer);
    audio.addEventListener('loadedmetadata', function () { if (ui.dur) ui.dur.textContent = mmss(audio.duration); });

    /* ---------------- things that dance while music plays ----------------
       <div class="groove" data-groove="cat" data-asset="assets/living/cat" style="…"></div>
       a placeholder is drawn for each kind below until your picture is in its slot. your
       picture then moves as a whole (data-move: bob, sway, hop, step, wobble), or give it a
       -dancing twin (cat-dancing.gif) that's shown instead while the music plays. */
    var GROOVES = {
        cat: { move: '', art: '<svg class="placeholder" viewBox="0 0 90 70">' +
            '<g class="g-tail" style="transform-origin: 70px 58px"><path d="M68 60 C86 58 90 40 80 30 C78 28 75 30 77 33 C83 42 80 52 66 54 Z" fill="#2a1d14"/></g>' +
            '<path d="M20 66 C14 48 24 30 44 30 C62 30 72 44 70 66 Z" fill="#2a1d14"/>' +
            '<g class="g-head" style="transform-origin: 30px 36px"><path d="M14 30 L12 10 L22 18 Q30 14 38 18 L46 10 L45 30 Q44 42 30 42 Q16 42 14 30 Z" fill="#2a1d14"/>' +
                '<circle cx="23" cy="27" r="2.4" fill="#ffd98a"/><circle cx="36" cy="27" r="2.4" fill="#ffd98a"/></g>' +
            '</svg>' },
        plant: { move: '', art: '<svg class="placeholder" viewBox="0 0 80 110">' +
            '<g class="g-sway" style="transform-origin: 40px 78px">' +
                '<path d="M40 78 C30 60 10 58 6 40 C22 40 36 54 40 78 Z" fill="#4f7a45"/><path d="M40 78 C48 56 70 52 76 32 C58 34 44 52 40 78 Z" fill="#5f8a52"/>' +
                '<path d="M40 78 C36 50 44 26 38 6 C54 22 50 52 40 78 Z" fill="#6c9a5c"/><path d="M40 78 C26 70 16 76 8 70 C18 62 32 66 40 78 Z" fill="#48703f"/>' +
            '</g>' +
            '<path d="M24 76 H56 L52 108 H28 Z" fill="#a65b3b"/><rect x="21" y="74" width="38" height="7" rx="2" fill="#b86a47"/>' +
            '</svg>' },
        crab: { move: 'step', art: '<svg class="placeholder" viewBox="0 0 70 44">' +
            '<g stroke="#9a3b1f" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M20 30 L10 40 M26 32 L20 43 M44 32 L50 43 M50 30 L60 40"/></g>' +
            '<g class="g-claw" style="transform-origin: 18px 24px"><path d="M18 24 L8 12" stroke="#b8482a" stroke-width="3" stroke-linecap="round"/><path d="M2 10 C2 2 12 0 12 8 L8 9 L10 4 C6 4 5 8 6 11 Z" fill="#c1502e"/></g>' +
            '<g class="g-claw r" style="transform-origin: 52px 24px"><path d="M52 24 L62 12" stroke="#b8482a" stroke-width="3" stroke-linecap="round"/><path d="M68 10 C68 2 58 0 58 8 L62 9 L60 4 C64 4 65 8 64 11 Z" fill="#c1502e"/></g>' +
            '<ellipse cx="35" cy="28" rx="20" ry="12" fill="#c1502e"/><path d="M30 17 V12 M40 17 V12" stroke="#9a3b1f" stroke-width="2"/>' +
            '<circle cx="30" cy="11" r="2.6" fill="#2a1d14"/><circle cx="40" cy="11" r="2.6" fill="#2a1d14"/>' +
            '</svg>' },
        gull: { move: '', art: '<svg class="placeholder" viewBox="0 0 60 56">' +
            '<path d="M24 50 V56 M32 50 V56" stroke="#e0a030" stroke-width="2.4"/>' +
            '<path d="M8 36 C8 24 22 18 36 22 C46 26 48 40 38 48 C28 54 12 50 8 36 Z" fill="#f1ece0"/>' +
            '<path d="M8 36 L0 30 L10 32 Z" fill="#8a929a"/><path d="M14 30 C22 26 34 28 40 36 C30 40 20 38 14 30 Z" fill="#8a929a"/>' +
            '<g class="g-head" style="transform-origin: 38px 24px"><circle cx="44" cy="16" r="9" fill="#f1ece0"/><path d="M52 15 L60 18 L52 19 Z" fill="#e0a030"/><circle cx="47" cy="14" r="1.6" fill="#2a1d14"/></g>' +
            '</svg>' },
        pigeon: { move: '', art: '<svg class="placeholder" viewBox="0 0 50 44">' +
            '<path d="M20 38 V44 M26 38 V44" stroke="#c06a50" stroke-width="2"/>' +
            '<path d="M6 26 C6 16 18 12 30 14 C40 16 42 30 34 36 C24 42 8 38 6 26 Z" fill="#7d8591"/>' +
            '<path d="M6 26 L0 22 L8 22 Z" fill="#5d6570"/><path d="M12 22 C20 18 30 20 34 28 C26 30 18 30 12 22 Z" fill="#646c78"/>' +
            '<g class="g-head" style="transform-origin: 32px 18px"><circle cx="37" cy="11" r="7" fill="#6b7380"/><path d="M36 17 C40 18 42 22 40 24 C36 22 34 20 36 17 Z" fill="#6f9a8a"/>' +
                '<path d="M43 10 L48 12 L43 13 Z" fill="#3a3030"/><circle cx="39" cy="9" r="1.4" fill="#e08030"/></g>' +
            '</svg>' },
        manikin: { move: 'hop', art: '<svg class="placeholder" viewBox="0 0 50 110">' +
            '<rect x="22" y="94" width="6" height="12" fill="#8a6440"/><rect x="10" y="104" width="30" height="5" rx="2" fill="#8a6440"/>' +
            '<g fill="#c99a62"><ellipse cx="25" cy="12" rx="7" ry="8"/><rect x="22.5" y="19" width="5" height="5"/><ellipse cx="25" cy="36" rx="9" ry="13"/>' +
                '<ellipse cx="25" cy="54" rx="7" ry="6"/></g>' +
            '<g class="g-arm" style="transform-origin: 17px 28px"><path d="M17 28 L8 42 L4 56" stroke="#c99a62" stroke-width="5" stroke-linecap="round" fill="none"/></g>' +
            '<g class="g-arm r" style="transform-origin: 33px 28px"><path d="M33 28 L42 42 L46 56" stroke="#c99a62" stroke-width="5" stroke-linecap="round" fill="none"/></g>' +
            '<g class="g-leg" style="transform-origin: 21px 58px"><path d="M21 58 L18 76 L20 94" stroke="#b8894f" stroke-width="5.5" stroke-linecap="round" fill="none"/></g>' +
            '<g class="g-leg r" style="transform-origin: 29px 58px"><path d="M29 58 L32 76 L30 94" stroke="#b8894f" stroke-width="5.5" stroke-linecap="round" fill="none"/></g>' +
            '</svg>' },
        metronome: { move: '', art: '<svg class="placeholder" viewBox="0 0 44 64">' +
            '<path d="M14 4 H30 L42 62 H2 Z" fill="#6e4a30"/><path d="M17 10 H27 L32 50 H12 Z" fill="#eadcb9"/>' +
            '<g class="g-tick" style="transform-origin: 22px 50px"><rect x="21" y="10" width="2" height="41" fill="#3a2716"/><rect x="18" y="20" width="8" height="6" rx="1" fill="#c49a52"/></g>' +
            '<rect x="2" y="56" width="40" height="6" fill="#5a3a24"/>' +
            '</svg>' }
    };
    Sky.css(
        '.groove { position: absolute; pointer-events: none; z-index: 2; }' +
        '.groove .placeholder, .groove > .art { display: block; width: 100%; height: auto; overflow: visible; }' +
        '.groove g { transform-box: view-box; }' +
        '.groove .pose { display: none; }' +
        'body.music-playing .groove.has-dancing > .pose-dancing { display: block; width: 100%; height: auto; }' +
        'body.music-playing .groove.has-dancing > .placeholder, body.music-playing .groove.has-dancing > .art { display: none; }' +
        // the moves (about 120 beats a minute)
        'body.music-playing .groove .g-head { animation: g-nod .5s ease-in-out infinite alternate; }' +
        'body.music-playing .groove .g-tail { animation: g-swish 1s ease-in-out infinite alternate; }' +
        'body.music-playing .groove .g-sway { animation: g-sway 1s ease-in-out infinite alternate; }' +
        'body.music-playing .groove .g-claw { animation: g-claw .25s ease-in-out infinite alternate; }' +
        'body.music-playing .groove .g-claw.r { animation-delay: -.25s; }' +
        'body.music-playing .groove .g-arm { animation: g-arm .5s ease-in-out infinite alternate; }' +
        'body.music-playing .groove .g-arm.r { animation-name: g-arm-r; }' +
        'body.music-playing .groove .g-leg { animation: g-leg .5s ease-in-out infinite alternate; }' +
        'body.music-playing .groove .g-leg.r { animation-delay: -.5s; }' +
        'body.music-playing .groove .g-tick { animation: g-tick .5s ease-in-out infinite alternate; }' +
        'body.music-playing .groove[data-move="bob"]:not(.has-dancing) { animation: g-bob .5s ease-in-out infinite alternate; }' +
        'body.music-playing .groove[data-move="sway"]:not(.has-dancing) { animation: g-sway 1s ease-in-out infinite alternate; transform-origin: 50% 100%; }' +
        'body.music-playing .groove[data-move="hop"]:not(.has-dancing) { animation: g-hop .5s cubic-bezier(.3,.6,.4,1) infinite alternate; }' +
        'body.music-playing .groove[data-move="step"]:not(.has-dancing) { animation: g-step 1s ease-in-out infinite alternate; }' +
        'body.music-playing .groove[data-move="wobble"]:not(.has-dancing) { animation: g-wobble 1s ease-in-out infinite alternate; transform-origin: 50% 0; }' +
        '@keyframes g-nod { from { transform: rotate(0); } to { transform: rotate(12deg) translateY(2px); } }' +
        '@keyframes g-swish { from { transform: rotate(-14deg); } to { transform: rotate(16deg); } }' +
        '@keyframes g-sway { from { transform: rotate(-4deg); } to { transform: rotate(4deg); } }' +
        '@keyframes g-claw { from { transform: rotate(-18deg); } to { transform: rotate(10deg); } }' +
        '@keyframes g-arm { from { transform: rotate(10deg); } to { transform: rotate(150deg); } }' +
        '@keyframes g-arm-r { from { transform: rotate(-10deg); } to { transform: rotate(-150deg); } }' +
        '@keyframes g-leg { from { transform: rotate(-12deg); } to { transform: rotate(12deg); } }' +
        '@keyframes g-tick { from { transform: rotate(-26deg); } to { transform: rotate(26deg); } }' +
        '@keyframes g-bob { from { transform: translateY(0); } to { transform: translateY(-6%); } }' +
        '@keyframes g-hop { from { transform: translateY(0) rotate(-3deg); } to { transform: translateY(-12%) rotate(3deg); } }' +
        '@keyframes g-step { from { transform: translateX(-10px); } to { transform: translateX(10px); } }' +
        '@keyframes g-wobble { from { transform: rotate(-2.5deg); } to { transform: rotate(2.5deg); } }' +
        // everyone who stands still in a scene sways along (unless they have a -dancing pose of their own)
        'body.music-playing .scene-character:not(.has-dancing):not(.walking):not(.held) > .placeholder,' +
        'body.music-playing .scene-character:not(.has-dancing):not(.walking):not(.held) > .art,' +
        'body.music-playing .sea-char:not(.has-dancing):not(.walking):not(.held):not(.startled) > .placeholder,' +
        'body.music-playing .sea-char:not(.has-dancing):not(.walking):not(.held):not(.startled) > .art { animation: char-groove 1s ease-in-out infinite; transform-origin: 50% 100%; }' +
        '@keyframes char-groove { 0%, 100% { transform: translateY(0) rotate(-3deg); } 25% { transform: translateY(-4%) rotate(0); } 50% { transform: translateY(0) rotate(3deg); } 75% { transform: translateY(-4%) rotate(0); } }' +
        'body.music-playing .character.face-left:not(.has-dancing) > .placeholder { animation-name: char-groove-left; }' +
        '@keyframes char-groove-left { 0%, 100% { transform: scaleX(-1) translateY(0) rotate(-3deg); } 25% { transform: scaleX(-1) translateY(-4%); } 50% { transform: scaleX(-1) rotate(3deg); } 75% { transform: scaleX(-1) translateY(-4%); } }' +
        'body.music-playing .character.has-dancing > .pose-dancing { display: block; }' +
        'body.music-playing .character.has-dancing > .placeholder, body.music-playing .character.has-dancing > .art { display: none; }' +
        // anything else in a room can join in: class="sways" or "wobbles"
        'body.music-playing .sways { animation: g-sway 1s ease-in-out infinite alternate; transform-origin: 50% 100%; }' +
        'body.music-playing .wobbles { animation: g-wobble 1s ease-in-out infinite alternate; transform-origin: 50% 0; }' +
        '@media (prefers-reduced-motion: reduce) { body.music-playing .groove, body.music-playing .groove *, body.music-playing .sways, body.music-playing .wobbles,' +
            'body.music-playing .character > * { animation: none !important; } }'
    );
    function dressGrooves(scope) {
        (scope || document).querySelectorAll('.groove[data-groove]').forEach(function (el) {
            var g = GROOVES[el.dataset.groove];
            if (!g || el.dataset.dressed) return;
            el.dataset.dressed = '1';
            if (!el.querySelector('.placeholder, img')) el.insertAdjacentHTML('afterbegin', g.art);
            if (!el.dataset.move && g.move) el.dataset.move = g.move;
            el.setAttribute('aria-hidden', 'true');
        });
    }
    dressGrooves();

    Sky.music = {
        audio: audio, disc: disc, readTags: readTags,
        get tracks() { return tracks; }, get at() { return at; },
        current: current, playing: playing,
        load: load, play: function (i) { if (i === undefined) start(); else load(i, true); },
        pause: pause, toggle: toggle, next: next, prev: prev, stop: stop,
        setTracks: setTracks, setVolume: setVolume, dressGrooves: dressGrooves,
        on: function (fn) { listeners.push(fn); }
    };
})();

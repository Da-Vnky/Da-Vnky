/* =====================================================================
   records.js — the living space's record player. Every .mp3 (or .ogg)
   in the folder becomes a record in the crate. Click the turntable to
   open the player: pick a record, play, pause, skip, seek, set the volume.

       <div class="furnish turntable" data-folder="content/living/"> … </div>
       <script src="sky/records.js"></script>          (after sky/sky.js)

   title & artist: read from the file's own tags (ID3) when it has them,
   otherwise from the file name ("01-my-song.mp3" → "my song").
   the record's label shows the file's cover art if it has one, or a
   picture with the same name (my-song.jpg / .png / .webp) beside it.
   order: by file name, so 01-, 02-, … sets the running order.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var deck = document.querySelector('.turntable[data-folder]');
    if (!deck) return;
    var AUDIO = ['mp3', 'ogg'], PICS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    var LABELS = ['#9a3b1f', '#c49a52', '#3f5a55', '#6e2f24', '#56636f', '#8a3f6e', '#b88c5e', '#28323b'];

    Sky.css(
        '.turntable { cursor: pointer; }' +
        '.turntable .tt-art, .turntable > .art { position: absolute; inset: 0; width: 100%; height: 100%; }' +
        '.turntable .tt-playing { position: absolute; inset: 0; width: 100%; height: 100%; display: none; }' +
        'body.records-playing .turntable.has-playing .tt-playing { display: block; }' +
        'body.records-playing .turntable.has-playing > .art, body.records-playing .turntable.has-playing > .placeholder { visibility: hidden; }' +
        '.turntable .tt-disc { transform-box: fill-box; transform-origin: 50% 50%; }' +
        '.turntable .tt-arm { transform-box: view-box; transform-origin: 83% 22%; transition: transform 1.1s cubic-bezier(.4,.1,.3,1); }' +
        'body.records-playing .turntable .tt-arm { transform: rotate(24deg); }' +
        'body.records-playing .turntable .tt-disc, body.records-playing .rp-now .rp-disc { animation: rp-spin 1.8s linear infinite; }' +
        '@keyframes rp-spin { to { transform: rotate(360deg); } }' +
        '.turntable .tt-hint { position: absolute; left: 50%; top: -1.6em; transform: translateX(-50%); white-space: nowrap; font-style: italic;' +
            'font-size: .95rem; color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.6); opacity: 0; transition: opacity .25s; }' +
        '.turntable:hover .tt-hint, .turntable:focus-visible .tt-hint { opacity: 1; }' +
        '.turntable .tt-notes { position: absolute; right: 8%; top: -10%; font-size: 1.1rem; color: #ffd98a; opacity: 0; pointer-events: none; }' +
        'body.records-playing .turntable .tt-notes { animation: rp-notes 3.2s ease-in-out infinite; }' +
        '@keyframes rp-notes { 0% { opacity: 0; transform: translate(0,10px) rotate(-8deg); } 30% { opacity: .9; } 100% { opacity: 0; transform: translate(14px,-34px) rotate(10deg); } }' +

        /* the player */
        '.records { position: fixed; left: 50%; bottom: 0; z-index: 8; width: min(760px, 100vw); max-height: 88vh; overflow: auto;' +
            'transform: translate(-50%, 105%); transition: transform .5s cubic-bezier(.3,.7,.25,1); padding: 22px 26px 20px;' +
            'border-radius: 18px 18px 0 0; background: #eadcb9; color: #3a2716; box-shadow: 0 -12px 30px rgba(0,0,0,.45), inset 0 0 30px rgba(120,80,30,.25);' +
            'font-family: "IM Fell English", Georgia, serif; }' +
        '.records.open { transform: translate(-50%, 0); }' +
        '.records h2 { margin: 0 0 14px; font: normal 1.5rem "IM Fell English SC", Georgia, serif; }' +
        '.records .rp-close { position: absolute; right: 14px; top: 12px; border: 0; background: none; font: italic 1rem "IM Fell English", Georgia, serif;' +
            'color: #6e5236; cursor: pointer; padding: 6px 10px; border-radius: 999px; }' +
        '.records .rp-close:hover { background: rgba(110,82,54,.14); color: #3a2716; }' +
        '.rp-now { display: flex; gap: 20px; align-items: center; }' +
        '.rp-now .rp-disc { flex: none; width: 128px; height: 128px; }' +
        '.rp-info { flex: 1; min-width: 0; }' +
        '.rp-title { font-size: 1.35rem; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
        '.rp-artist { font-style: italic; color: #6e5236; min-height: 1.3em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
        '.rp-seek { display: flex; align-items: center; gap: 10px; margin: 10px 0 6px; font-size: .9rem; color: #6e5236; font-variant-numeric: tabular-nums; }' +
        '.rp-seek input { flex: 1; }' +
        '.rp-controls { display: flex; align-items: center; gap: 6px; }' +
        '.rp-controls button { display: grid; place-items: center; width: 38px; height: 38px; border: 0; border-radius: 50%; background: none;' +
            'color: #3a2716; cursor: pointer; }' +
        '.rp-controls button:hover { background: rgba(110,82,54,.14); }' +
        '.rp-controls .rp-play { width: 46px; height: 46px; background: #3a2716; color: #f3e6c2; }' +
        '.rp-controls .rp-play:hover { background: #9a3b1f; }' +
        '.rp-controls svg { width: 18px; height: 18px; fill: currentColor; }' +
        '.rp-controls .i-pause, .records.playing .rp-controls .i-play { display: none; }' +
        '.records.playing .rp-controls .i-pause { display: block; }' +
        '.rp-vol { display: flex; align-items: center; gap: 6px; margin-left: auto; color: #6e5236; }' +
        '.rp-vol input { width: 96px; }' +
        '.records input[type=range] { accent-color: #9a3b1f; }' +
        '.rp-crate-title { margin: 20px 0 8px; font-style: italic; color: #6e5236; }' +
        '.rp-crate { display: flex; gap: 14px; overflow-x: auto; padding: 6px 2px 12px; scroll-snap-type: x proximity; }' +
        '.rp-rec { flex: none; width: 104px; border: 0; background: none; padding: 0; cursor: pointer; text-align: center; scroll-snap-align: start;' +
            'font: inherit; color: inherit; }' +
        '.rp-rec .rp-disc { width: 96px; height: 96px; margin: 0 auto 6px; display: block; transition: transform .25s ease; }' +
        '.rp-rec:hover .rp-disc { transform: translateY(-6px) rotate(20deg); }' +
        '.rp-rec .rp-name { display: block; font-size: .92rem; line-height: 1.2; max-height: 2.4em; overflow: hidden; }' +
        '.rp-rec.on .rp-name { color: #9a3b1f; }' +
        '.rp-rec.on .rp-disc { filter: drop-shadow(0 0 8px rgba(154,59,31,.55)); }' +
        '.rp-empty { font-style: italic; color: #6e5236; }' +
        'body.records-open .signpost { opacity: 0; pointer-events: none; }' +
        '@media (max-width: 620px) { .records { padding: 18px 16px 16px; } .rp-now .rp-disc { width: 92px; height: 92px; } .rp-vol { display: none; } }'
    );

    /* ---------------- a record, drawn: grooves, label, spindle hole ---------------- */
    var uid = 0;
    function discSVG(color, pic, cls) {
        var id = 'rp' + (++uid);
        return '<svg class="rp-disc ' + (cls || '') + '" viewBox="0 0 100 100" aria-hidden="true">' +
            '<defs><clipPath id="' + id + '"><circle cx="50" cy="50" r="17"/></clipPath>' +
            '<radialGradient id="' + id + 's" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#3a3a3f"/><stop offset=".6" stop-color="#151518"/><stop offset="1" stop-color="#0c0c0e"/></radialGradient></defs>' +
            '<circle cx="50" cy="50" r="49" fill="url(#' + id + 's)"/>' +
            '<g fill="none" stroke="rgba(255,255,255,.07)" stroke-width=".6">' +
                '<circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="39"/><circle cx="50" cy="50" r="34"/><circle cx="50" cy="50" r="29"/><circle cx="50" cy="50" r="24"/>' +
            '</g>' +
            '<path d="M22 20 A40 40 0 0 1 58 11" stroke="rgba(255,255,255,.22)" stroke-width="3" fill="none" stroke-linecap="round"/>' +
            '<circle cx="50" cy="50" r="17" fill="' + color + '"/>' +
            (pic ? '<image href="' + pic + '" x="33" y="33" width="34" height="34" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + id + ')"/>' : '') +
            '<circle cx="50" cy="50" r="17" fill="none" stroke="rgba(0,0,0,.25)"/>' +
            '<circle cx="50" cy="50" r="2" fill="#0c0c0e"/>' +
            '</svg>';
    }

    /* ---------------- reading a file's tags (ID3v2): title, artist, cover ---------------- */
    function readTags(url) {
        return fetch(url, { cache: 'no-cache' }).then(function (res) {
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
        if (flags & 0x40 && v >= 3) {                                  // skip an extended header
            var ext = v === 4 ? ((b[p] & 127) << 21 | (b[p + 1] & 127) << 14 | (b[p + 2] & 127) << 7 | (b[p + 3] & 127)) : ((b[p] << 24 | b[p + 1] << 16 | b[p + 2] << 8 | b[p + 3]) + 4);
            p += ext;
        }
        function text(enc, s, e) {
            var bytes = b.subarray(s, e), label = ['iso-8859-1', 'utf-16', 'utf-16be', 'utf-8'][enc] || 'iso-8859-1';
            try { return new TextDecoder(label).decode(bytes).replace(/\u0000+$/, '').split('\u0000')[0].trim(); } catch (e2) { return ''; }
        }
        function nulEnd(s, enc) {                                      // index just past a null terminator
            if (enc === 1 || enc === 2) { for (var i = s; i + 1 < end; i += 2) if (!b[i] && !b[i + 1]) return i + 2; }
            else { for (var j = s; j < end; j++) if (!b[j]) return j + 1; }
            return end;
        }
        while (p + (v === 2 ? 6 : 10) <= end) {
            var id, size, h;
            if (v === 2) {
                id = String.fromCharCode(b[p], b[p + 1], b[p + 2]);
                size = b[p + 3] << 16 | b[p + 4] << 8 | b[p + 5]; h = 6;
            } else {
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
                q += 1;                                                // picture type
                q = nulEnd(q, enc);                                    // description
                if (q < e) out.picture = URL.createObjectURL(new Blob([b.slice(q, e)], { type: mime }));
            }
            p = e;
        }
        return out;
    }

    /* ---------------- the turntable in the room ---------------- */
    deck.setAttribute('role', 'button');
    deck.setAttribute('tabindex', '0');
    deck.setAttribute('aria-label', 'the record player');
    deck.insertAdjacentHTML('beforeend', '<span class="tt-hint">the record player</span><span class="tt-notes" aria-hidden="true">♪</span>');
    // your own art for while it plays (e.g. a spinning GIF): <asset>-playing.(gif|png|webp|svg)
    if (deck.dataset.asset) Sky.findAsset(deck.dataset.asset + '-playing', function (url) {
        if (!url) return;
        var im = document.createElement('img');
        im.src = url; im.alt = ''; im.className = 'tt-playing';
        deck.insertBefore(im, deck.querySelector('.tt-hint'));
        deck.classList.add('has-playing');
    });

    /* ---------------- the player ---------------- */
    var box = document.createElement('section');
    box.className = 'records';
    box.setAttribute('aria-label', 'the record player');
    box.innerHTML =
        '<button type="button" class="rp-close">close ✕</button>' +
        '<h2>the record player</h2>' +
        '<div class="rp-now">' +
            '<span class="rp-now-disc"></span>' +
            '<div class="rp-info">' +
                '<div class="rp-title">no record on</div><div class="rp-artist"></div>' +
                '<div class="rp-seek"><span class="rp-cur">0:00</span><input type="range" min="0" max="1000" value="0" aria-label="position in the song"><span class="rp-dur">0:00</span></div>' +
                '<div class="rp-controls">' +
                    '<button type="button" class="rp-prev" aria-label="previous record"><svg viewBox="0 0 20 20"><path d="M4 4h2v12H4zM16 4 L7 10 L16 16 Z"/></svg></button>' +
                    '<button type="button" class="rp-play" aria-label="play"><svg class="i-play" viewBox="0 0 20 20"><path d="M6 4 L16 10 L6 16 Z"/></svg><svg class="i-pause" viewBox="0 0 20 20"><path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z"/></svg></button>' +
                    '<button type="button" class="rp-next" aria-label="next record"><svg viewBox="0 0 20 20"><path d="M14 4h2v12h-2zM4 4 L13 10 L4 16 Z"/></svg></button>' +
                    '<label class="rp-vol"><svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M3 8h3l5-4v12l-5-4H3z"/><path d="M13.5 7a4 4 0 0 1 0 6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>' +
                        '<input type="range" min="0" max="100" value="80" aria-label="volume"></label>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="rp-crate-title">the crate: pick a record</div>' +
        '<div class="rp-crate"></div>';
    document.body.appendChild(box);

    var audio = new Audio();
    audio.preload = 'metadata';
    var tracks = [], at = -1, seeking = false;
    var nowDisc = box.querySelector('.rp-now-disc'), titleEl = box.querySelector('.rp-title'), artistEl = box.querySelector('.rp-artist');
    var seek = box.querySelector('.rp-seek input'), cur = box.querySelector('.rp-cur'), dur = box.querySelector('.rp-dur');
    var vol = box.querySelector('.rp-vol input'), crate = box.querySelector('.rp-crate'), playBtn = box.querySelector('.rp-play');
    var deckDisc = deck.querySelector('.tt-label');

    try { var v0 = localStorage.getItem('records-volume'); if (v0 !== null) vol.value = v0; } catch (e) {}
    audio.volume = vol.value / 100;

    function mmss(t) { if (!isFinite(t)) return '0:00'; t = Math.floor(t); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }

    function drawNow() {
        var t = tracks[at];
        nowDisc.innerHTML = discSVG(t ? t.color : '#6e5236', t && t.pic);
        titleEl.textContent = t ? t.title : 'no record on';
        artistEl.textContent = t ? (t.artist || '') : (tracks.length ? 'pick one from the crate' : '');
        if (deckDisc) deckDisc.setAttribute('fill', t ? t.color : '#9a3b1f');
        crate.querySelectorAll('.rp-rec').forEach(function (r, i) { r.classList.toggle('on', i === at); });
    }
    function drawCrate() {
        crate.innerHTML = '';
        if (!tracks.length) {
            crate.innerHTML = '<p class="rp-empty">the crate is empty. put .mp3 files in content/living/ and they turn up here as records.</p>';
            return;
        }
        tracks.forEach(function (t, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'rp-rec';
            b.innerHTML = discSVG(t.color, t.pic) + '<span class="rp-name"></span>';
            b.querySelector('.rp-name').textContent = t.title;
            b.title = t.artist ? t.title + ' · ' + t.artist : t.title;
            b.addEventListener('click', function () { load(i, true); });
            crate.appendChild(b);
        });
        drawNow();
    }

    function load(i, play) {
        if (!tracks.length) return;
        at = (i + tracks.length) % tracks.length;
        audio.src = tracks[at].url;
        drawNow();
        if (play) audio.play().catch(function () {});
    }
    function toggle() {
        if (!tracks.length) return;
        if (at < 0) return load(0, true);
        if (audio.paused) audio.play().catch(function () {}); else audio.pause();
    }
    function setPlaying(on) {
        box.classList.toggle('playing', on);
        document.body.classList.toggle('records-playing', on);
        playBtn.setAttribute('aria-label', on ? 'pause' : 'play');
    }
    audio.addEventListener('play', function () { setPlaying(true); });
    audio.addEventListener('pause', function () { setPlaying(false); });
    audio.addEventListener('ended', function () { if (tracks.length > 1 || at < tracks.length - 1) load(at + 1, true); else setPlaying(false); });
    audio.addEventListener('loadedmetadata', function () { dur.textContent = mmss(audio.duration); });
    audio.addEventListener('timeupdate', function () {
        cur.textContent = mmss(audio.currentTime);
        if (!seeking && audio.duration) seek.value = Math.round(audio.currentTime / audio.duration * 1000);
    });
    seek.addEventListener('input', function () { seeking = true; cur.textContent = mmss(seek.value / 1000 * (audio.duration || 0)); });
    seek.addEventListener('change', function () { if (audio.duration) audio.currentTime = seek.value / 1000 * audio.duration; seeking = false; });
    vol.addEventListener('input', function () {
        audio.volume = vol.value / 100;
        try { localStorage.setItem('records-volume', vol.value); } catch (e) {}
    });
    playBtn.addEventListener('click', toggle);
    box.querySelector('.rp-prev').addEventListener('click', function () {
        if (audio.currentTime > 3) { audio.currentTime = 0; return; }       // like a real player: first back to the start
        load(at - 1, !audio.paused || at < 0);
    });
    box.querySelector('.rp-next').addEventListener('click', function () { load(at + 1, !audio.paused || at < 0); });

    function open() {
        box.classList.add('open');
        document.body.classList.add('records-open');
        playBtn.focus({ preventScroll: true });
    }
    function close() {
        box.classList.remove('open');
        document.body.classList.remove('records-open');
    }
    deck.addEventListener('click', function () { box.classList.contains('open') ? close() : open(); });
    deck.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    box.querySelector('.rp-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
        if (!box.classList.contains('open')) return;
        if (e.key === 'Escape') { e.stopPropagation(); close(); }
        else if (e.key === ' ' && (e.target === document.body || e.target === playBtn)) { e.preventDefault(); if (e.target !== playBtn) toggle(); }
    }, true);
    document.addEventListener('pointerdown', function (e) {
        if (box.classList.contains('open') && !box.contains(e.target) && !deck.contains(e.target)) close();
    });

    /* ---------------- fill the crate from the folder ---------------- */
    Sky.listFolder(deck.dataset.folder, AUDIO.concat(PICS), function (files) {
        var pics = {};
        files.forEach(function (f) {
            if (/\.(jpe?g|png|webp|gif)$/i.test(f.name)) pics[f.name.replace(/\.[^.]+$/, '').toLowerCase()] = f.url;
        });
        tracks = Sky.sortByName(files.filter(function (f) { return /\.(mp3|ogg)$/i.test(f.name); })).map(function (f) {
            var base = f.name.replace(/\.[^.]+$/, '');
            return {
                url: f.url,
                title: Sky.fileTitle(f.name),
                artist: '',
                pic: pics[base.toLowerCase()] || null,
                color: LABELS[Sky.hashStr(f.name) % LABELS.length]
            };
        });
        drawCrate();
        tracks.forEach(function (t) {
            if (!/\.mp3$/i.test(t.url)) return;
            readTags(t.url).then(function (tags) {
                if (!tags) return;
                if (tags.title) t.title = tags.title;
                if (tags.artist) t.artist = tags.artist;
                if (tags.picture && !t.pic) t.pic = tags.picture;
                drawCrate();
            });
        });
    });
})();

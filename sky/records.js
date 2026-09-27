/* =====================================================================
   records.js — the living space's record player. Every .mp3 (or .ogg)
   in the folder is a record, in its own sleeve. Click the turntable to
   open the crate: the sleeves lean on each other; hover one and it lifts,
   click it and it floats up, the record slides out and is set down on
   the turntable, and the needle drops.

       <div class="furnish turntable" data-folder="content/living/"> … </div>
       <script src="sky/music.js"></script>            (after sky/sky.js)
       <script src="sky/records.js"></script>

   SLEEVE ART: a picture with the same name as the song, beside it:
       01-aerie.mp3  +  01-aerie.jpg   (or .png .webp .gif; square is best)
   Without one, the cover picture inside the mp3 is used; without that,
   a plain paper sleeve with the title on it. The middle of the record
   (its label) shows a round crop of the same picture.

   title & artist: from the song's own tags when it has them, otherwise
   the file name ("01-my-song.mp3" → "my song"). order: by file name.

   ALBUMS: a folder of songs in the same folder is one record with a whole
   album on it (content/living/albums.txt lists them: publishing and the
   content manager write it):
       06-my album/01-first song.mp3, 02-second song.mp3 …  + cover.jpg
   its sleeve and its record have a gold ring just inside the edge. while
   an album plays, its songs pop up under the player (pick one), and the
   usual ⏮ ⏭ (and the phone's media keys) go from song to song.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var deck = document.querySelector('.turntable[data-folder]');
    if (!deck || !Sky.music) return;
    var M = Sky.music, audio = M.audio;
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
        // (the records spin in the script below: slowly, winding up and slowing down like a real turntable)
        '' +
        '@keyframes rp-spin { to { transform: rotate(360deg); } }' +
        // the record on a turntable of your own drawing (where its platter is: --platter-x/-y/-w on .turntable)
        '.turntable .tt-record { position: absolute; left: calc(var(--platter-x, 40%) - var(--platter-w, 54%) / 2); top: var(--platter-y, 52.7%);' +
            'width: var(--platter-w, 54%); aspect-ratio: 1; transform: translateY(-50%) scaleY(.3); pointer-events: none; display: none; }' +
        '.turntable.has-art .tt-record.on { display: block; }' +
        '.turntable .tt-record svg { width: 100%; height: 100%; display: block; }' +
        '.turntable .tt-hint { position: absolute; left: 50%; top: -1.6em; transform: translateX(-50%); white-space: nowrap; font-style: italic;' +
            'font-size: .95rem; color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.6); opacity: 0; transition: opacity .25s; }' +
        '.turntable:hover .tt-hint, .turntable:focus-visible .tt-hint { opacity: 1; }' +
        '.turntable .tt-notes { position: absolute; right: 8%; top: -10%; font-size: 1.1rem; color: #ffd98a; opacity: 0; pointer-events: none; }' +
        '.turntable .tt-notes.n2 { right: 26%; font-size: .9rem; } .turntable .tt-notes.n3 { right: 44%; font-size: 1.2rem; }' +
        'body.records-playing .turntable .tt-notes { animation: rp-notes 3.2s ease-in-out infinite; }' +
        'body.records-playing .turntable .tt-notes.n2 { animation-delay: -1.1s; } body.records-playing .turntable .tt-notes.n3 { animation-delay: -2.2s; }' +
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
        '.rp-controls .i-pause, body.records-playing .rp-controls .i-play { display: none; }' +
        'body.records-playing .rp-controls .i-pause { display: block; }' +
        '.rp-controls .rp-stop { width: auto; height: 32px; padding: 0 12px; border-radius: 999px; font: italic .95rem "IM Fell English", Georgia, serif; color: #6e5236; }' +
        '.rp-vol { display: flex; align-items: center; gap: 6px; margin-left: auto; color: #6e5236; }' +
        '.rp-vol input { width: 96px; }' +
        '.records input[type=range] { accent-color: #9a3b1f; }' +
        '.rp-crate-title { margin: 20px 0 0; font-style: italic; color: #6e5236; }' +
        '.rp-empty { font-style: italic; color: #6e5236; }' +
        'body.records-open .signpost { opacity: 0; pointer-events: none; }' +

        /* the sleeves, leaning on each other */
        '.rp-sleeves { display: flex; overflow-x: auto; overflow-y: visible; padding: 34px 90px 34px 10px; margin: 0 -8px; scrollbar-width: thin; }' +
        '.rp-sleeve { position: relative; flex: none; width: 132px; height: 132px; margin-right: -62px; padding: 0; border: 0; background: none;' +
            'cursor: pointer; transform: rotate(var(--tilt, 0deg)); transition: transform .22s cubic-bezier(.3,.7,.3,1.5), margin .22s; font: inherit; color: inherit; }' +
        '.rp-sleeve:hover, .rp-sleeve:focus-visible { transform: translateY(-14px) rotate(calc(var(--tilt, 0deg) * .3)); z-index: 60 !important; outline: none; }' +
        '.rp-sleeve .sl-disc { position: absolute; left: 6%; top: 3%; width: 88%; height: 88%; transition: transform .3s ease; }' +
        '.rp-sleeve:hover .sl-disc { transform: translateY(-9%); }' +
        '.rp-sleeve.on .sl-disc { display: none; }' +
        '.rp-sleeve .sl-cover { position: absolute; inset: 0; overflow: hidden; border-radius: 2px; background: var(--sl, #9a3b1f);' +
            'box-shadow: 0 6px 12px rgba(0,0,0,.35), inset 0 0 0 1px rgba(0,0,0,.15), inset 0 0 26px rgba(0,0,0,.18); }' +
        '.rp-sleeve .sl-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }' +
        '.rp-sleeve .sl-cover .sl-plain { position: absolute; inset: 0; display: grid; place-items: center; padding: 12%; text-align: center;' +
            'color: #f3e6c2; font-style: italic; font-size: 1rem; line-height: 1.15;' +
            'background: radial-gradient(circle at 50% 50%, transparent 0 30%, rgba(255,240,210,.14) 30.5% 31.5%, transparent 32% 44%, rgba(255,240,210,.1) 44.5% 45.5%, transparent 46%),' +
            'linear-gradient(135deg, rgba(255,255,255,.12), rgba(0,0,0,.18)); }' +
        '.rp-sleeve .sl-name { position: absolute; left: 50%; top: calc(100% + 8px); transform: translateX(-50%); width: max-content; max-width: 180px;' +
            'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: .92rem; font-style: italic; opacity: 0; transition: opacity .2s; pointer-events: none; }' +
        '.rp-sleeve:hover .sl-name, .rp-sleeve:focus-visible .sl-name, .rp-sleeve.on .sl-name { opacity: 1; }' +
        '.rp-sleeve.on .sl-name { color: #9a3b1f; }' +
        '.rp-sleeve.on .sl-cover::after { content: "♪ on"; position: absolute; right: 6px; top: 6px; padding: 1px 7px; border-radius: 999px;' +
            'background: rgba(42,29,20,.82); color: #f3e6c2; font-size: .8rem; font-style: italic; }' +
        '.rp-sleeve.lifted { visibility: hidden; }' +
        // an album's sleeve: a gold border just inside its edge (brushed metal: light and dark bands, a bevel)
        '.rp-sleeve.album .sl-cover::before { content: ""; position: absolute; inset: 5%; z-index: 1; pointer-events: none; border: 3px solid transparent;' +
            'border-image: linear-gradient(135deg, #6e4c14, #e9c96a 14%, #fff4c8 24%, #b8892e 38%, #f6dd8e 52%, #8a6320 64%, #ffeaa8 78%, #c29636 90%, #5e400e) 1;' +
            'box-shadow: 0 0 0 1px rgba(50,32,6,.45), inset 0 0 0 1px rgba(50,32,6,.45), 0 0 6px rgba(255,220,120,.25); }' +
        '.rp-sleeve.album .sl-cover::after { z-index: 2; }' +
        '.rp-sleeve .sl-count { position: absolute; left: 50%; bottom: 9%; transform: translateX(-50%); z-index: 2; padding: 0 7px; border-radius: 999px;' +
            'background: rgba(42,29,20,.78); color: #f6dd8e; font-size: .72rem; font-style: italic; white-space: nowrap; }' +
        // the album's songs, while it plays
        '.rp-album { margin: 14px 0 0; padding: 10px 12px 8px; border-radius: 12px; background: rgba(110,82,54,.08); position: relative;' +
            'box-shadow: inset 0 0 0 1.5px rgba(196,154,82,.7), inset 0 0 0 3px rgba(255,240,190,.35); transform-origin: 50% 0; }' +
        '.rp-album[hidden] { display: none; }' +
        '.rp-album.pop { animation: rp-pop .35s cubic-bezier(.3,1.4,.5,1); }' +
        '@keyframes rp-pop { from { opacity: 0; transform: scaleY(.6) translateY(-8px); } to { opacity: 1; transform: none; } }' +
        '.rp-album h3 { margin: 0 0 6px; font: italic 1rem "IM Fell English", Georgia, serif; color: #8a6320; }' +
        '.rp-album ol { list-style: none; margin: 0; padding: 0; max-height: 200px; overflow: auto; columns: 2 220px; column-gap: 12px; }' +
        '.rp-album li { break-inside: avoid; }' +
        '.rp-album button { display: flex; gap: 8px; width: 100%; padding: 5px 8px; border: 0; border-radius: 8px; background: none; text-align: left; cursor: pointer;' +
            'font: inherit; font-size: .98rem; color: #3a2716; line-height: 1.25; }' +
        '.rp-album button:hover, .rp-album button:focus-visible { background: rgba(110,82,54,.16); outline: none; }' +
        '.rp-album button span { flex: none; min-width: 1.5em; color: #9a7a4a; font-variant-numeric: tabular-nums; }' +
        '.rp-album button.on { color: #9a3b1f; font-style: italic; }' +
        '.rp-album button.on span::before { content: "♪"; margin-right: 2px; }' +
        '.rp-fly { position: fixed; inset: 0; z-index: 9; pointer-events: none; }' +
        '.rp-fly > * { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }' +
        '.rp-fly .fly-disc svg { width: 100%; height: 100%; display: block; }' +
        '@media (max-width: 620px) { .records { padding: 18px 16px 16px; } .rp-now .rp-disc { width: 92px; height: 92px; } .rp-vol { display: none; }' +
            '.rp-sleeve { width: 104px; height: 104px; margin-right: -50px; } .rp-sleeves { padding: 30px 70px 30px 8px; } }'
    );

    /* ---------------- the turntable in the room ---------------- */
    deck.setAttribute('role', 'button');
    deck.setAttribute('tabindex', '0');
    deck.setAttribute('aria-label', 'the record player');
    deck.insertAdjacentHTML('beforeend', '<span class="tt-record" aria-hidden="true"></span><span class="tt-hint">the record player</span>' +
        '<span class="tt-notes" aria-hidden="true">♪</span><span class="tt-notes n2" aria-hidden="true">♫</span><span class="tt-notes n3" aria-hidden="true">♪</span>');
    var ttRecord = deck.querySelector('.tt-record');
    // your own art for while it plays (e.g. a spinning GIF): <asset>-playing.(gif|png|webp|svg)
    if (deck.dataset.asset) Sky.findAsset(deck.dataset.asset + '-playing', function (url) {
        if (!url) return;
        var im = document.createElement('img');
        im.src = url; im.alt = ''; im.className = 'tt-playing';
        deck.insertBefore(im, deck.querySelector('.tt-record'));
        deck.classList.add('has-playing');
    });
    // the drawn turntable: its record's label gets a round crop of the sleeve's picture
    var labelArt = null, labelDot = deck.querySelector('.tt-label');
    if (labelDot) {
        var NS = 'http://www.w3.org/2000/svg', svg = labelDot.ownerSVGElement;
        var defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS(NS, 'defs'), svg.firstChild);
        var clip = document.createElementNS(NS, 'clipPath');
        clip.id = 'tt-label-clip';
        clip.innerHTML = '<circle r="18"/>';
        defs.appendChild(clip);
        labelArt = document.createElementNS(NS, 'image');
        labelArt.setAttribute('x', -18); labelArt.setAttribute('y', -18); labelArt.setAttribute('width', 36); labelArt.setAttribute('height', 36);
        labelArt.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        labelArt.setAttribute('clip-path', 'url(#tt-label-clip)');
        labelDot.after(labelArt);
    }
    function drawDeck() {
        var t = M.current();
        if (labelDot) labelDot.setAttribute('fill', t ? t.color : '#9a3b1f');
        if (labelArt) { if (t && t.pic) labelArt.setAttribute('href', t.pic); else labelArt.removeAttribute('href'); }
        ttRecord.classList.toggle('on', !!t);
        ttRecord.innerHTML = t ? M.disc(t.color, t.pic, '', !!t.album) : '';
    }

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
                    '<button type="button" class="rp-play" aria-label="play or pause"><svg class="i-play" viewBox="0 0 20 20"><path d="M6 4 L16 10 L6 16 Z"/></svg><svg class="i-pause" viewBox="0 0 20 20"><path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z"/></svg></button>' +
                    '<button type="button" class="rp-next" aria-label="next record"><svg viewBox="0 0 20 20"><path d="M14 4h2v12h-2zM4 4 L13 10 L4 16 Z"/></svg></button>' +
                    '<button type="button" class="rp-stop" aria-label="take the record off">lift the needle</button>' +
                    '<label class="rp-vol"><svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M3 8h3l5-4v12l-5-4H3z"/><path d="M13.5 7a4 4 0 0 1 0 6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>' +
                        '<input type="range" min="0" max="100" value="80" aria-label="volume"></label>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="rp-album" hidden><h3></h3><ol></ol></div>' +
        '<div class="rp-crate-title">the crate: pick a record</div>' +
        '<div class="rp-sleeves"></div>';
    document.body.appendChild(box);

    // entries: the crate, in order (songs on their own, and albums: { kind: 'album', songs: […] });
    // tracks: every song in playing order (an album's songs one after another), the list the player plays through
    var entries = [], tracks = [], seeking = false;
    function songsOf(e) { return e.kind === 'album' ? e.songs : [e]; }
    function flatten() { tracks = []; entries.forEach(function (e) { songsOf(e).forEach(function (t) { tracks.push(t); }); }); }
    var albumBox = null;
    var nowDisc = box.querySelector('.rp-now-disc'), titleEl = box.querySelector('.rp-title'), artistEl = box.querySelector('.rp-artist');
    var seek = box.querySelector('.rp-seek input'), cur = box.querySelector('.rp-cur'), dur = box.querySelector('.rp-dur');
    var vol = box.querySelector('.rp-vol input'), sleeves = box.querySelector('.rp-sleeves'), playBtn = box.querySelector('.rp-play');
    vol.value = Math.round(audio.volume * 100);

    function mmss(t) { if (!isFinite(t)) return '0:00'; t = Math.floor(t); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
    var shownAlbum = null;
    function drawNow() {
        var t = M.current(), songs = M.albumSongs ? M.albumSongs(t) : [];
        nowDisc.innerHTML = M.disc(t ? t.color : '#6e5236', t && t.pic, '', !!(t && t.album));
        titleEl.textContent = t ? t.title : 'no record on';
        artistEl.textContent = t ? (songs.length ? (t.artist ? t.artist + ' · ' : '') + t.album.title + ' · ' + (songs.indexOf(t) + 1) + ' of ' + songs.length : (t.artist || ''))
                                 : (tracks.length ? 'pick one from the crate' : '');
        sleeves.querySelectorAll('.rp-sleeve').forEach(function (s, i) { s.classList.toggle('on', !!t && !!entries[i] && songsOf(entries[i]).indexOf(t) !== -1); });
        // an album on: its songs pop up, to pick from
        albumBox = albumBox || box.querySelector('.rp-album');
        var key = songs.length > 1 ? t.album.key : null;
        albumBox.hidden = !key;
        if (key) {
            if (key !== shownAlbum) { albumBox.classList.remove('pop'); void albumBox.offsetWidth; albumBox.classList.add('pop'); }
            albumBox.querySelector('h3').textContent = 'on this record: ' + t.album.title;
            var ol = albumBox.querySelector('ol');
            ol.innerHTML = '';
            songs.forEach(function (x, n) {
                var li = document.createElement('li'), b = document.createElement('button');
                b.type = 'button'; b.className = x === t ? 'on' : '';
                b.innerHTML = '<span>' + (n + 1) + '</span>';
                b.appendChild(document.createTextNode(x.title));
                b.setAttribute('aria-label', 'play ' + x.title);
                b.addEventListener('click', function () { if (x !== M.current()) M.load(M.tracks.indexOf(x), true); else if (!M.playing()) M.play(); });
                li.appendChild(b); ol.appendChild(li);
            });
        }
        shownAlbum = key;
        drawDeck();
    }
    function coverHTML(t) {
        return t.pic ? '<img src="' + t.pic + '" alt="">' : '<span class="sl-plain"></span>';
    }
    function drawSleeves() {
        sleeves.innerHTML = '';
        if (!tracks.length) {
            sleeves.innerHTML = '<p class="rp-empty">the crate is empty. put .mp3 files in content/living/ and they turn up here as records.</p>';
            return;
        }
        entries.forEach(function (t, i) {
            var album = t.kind === 'album';
            var s = document.createElement('button');
            s.type = 'button';
            s.className = 'rp-sleeve' + (album ? ' album' : '');
            s.style.zIndex = i + 1;
            s.style.setProperty('--tilt', (((Sky.hashStr(t.url || t.key || t.title) % 7) - 3) * 0.8).toFixed(1) + 'deg');
            s.style.setProperty('--sl', t.color);
            s.innerHTML = '<span class="sl-disc">' + M.disc(t.color, t.pic, '', album) + '</span><span class="sl-cover">' + coverHTML(t) +
                (album ? '<span class="sl-count">' + t.songs.length + ' songs</span>' : '') + '</span><span class="sl-name"></span>';
            var plain = s.querySelector('.sl-plain');
            if (plain) plain.textContent = t.title;
            s.querySelector('.sl-name').textContent = album ? t.title + ' · the album' : t.artist ? t.title + ' · ' + t.artist : t.title;
            s.setAttribute('aria-label', (album ? 'play the album ' : 'play ') + t.title);
            s.addEventListener('click', function () { pick(i, s); });
            sleeves.appendChild(s);
        });
        sleeves.lastChild.style.marginRight = '0';
        drawNow();
    }

    /* ---------------- picking a record: out of the sleeve and onto the turntable ---------------- */
    var busy = false;
    function platter() {
        var el = deck.classList.contains('has-art') ? ttRecord : deck.querySelector('.tt-disc');
        if (el === ttRecord) { ttRecord.classList.add('on'); }
        var r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
    }
    function pick(i, sleeve) {
        var e = entries[i], songs = songsOf(e), on = M.current();
        if (busy || !songs.length) return;
        if (songs.indexOf(on) !== -1) { if (!M.playing()) M.play(); return; }         // (already on: an album carries on where it was)
        var t = songs[0];
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { M.load(M.tracks.indexOf(t), true); return; }
        busy = true;
        var a = sleeve.getBoundingClientRect();
        var layer = document.createElement('div');
        layer.className = 'rp-fly';
        var d = document.createElement('div');
        d.className = 'fly-disc';
        d.innerHTML = M.disc(e.color, e.pic, '', e.kind === 'album');
        var c = document.createElement('div');
        c.className = 'rp-sleeve fly-cover' + (e.kind === 'album' ? ' album' : '');
        c.style.setProperty('--sl', e.color);
        c.innerHTML = '<span class="sl-cover">' + coverHTML(e) + '</span>';
        if (c.querySelector('.sl-plain')) c.querySelector('.sl-plain').textContent = e.title;
        var w = a.width, dw = w * 0.9;
        c.style.width = c.style.height = w + 'px';
        d.style.width = d.style.height = dw + 'px';
        layer.appendChild(d); layer.appendChild(c);
        document.body.appendChild(layer);
        sleeve.classList.add('lifted');
        var x0 = a.left, y0 = a.top, dx0 = a.left + (w - dw) / 2, dy0 = a.top + (w - dw) / 2;
        var ease = 'cubic-bezier(.2,.9,.3,1.35)';
        // 1. the sleeve snaps up
        c.animate([{ transform: 'translate(' + x0 + 'px,' + y0 + 'px)' }, { transform: 'translate(' + x0 + 'px,' + (y0 - 64) + 'px) scale(1.1)' }],
            { duration: 280, easing: ease, fill: 'forwards' });
        d.animate([{ transform: 'translate(' + dx0 + 'px,' + dy0 + 'px)' }, { transform: 'translate(' + dx0 + 'px,' + (dy0 - 64) + 'px) scale(1.1)' }],
            { duration: 280, easing: ease, fill: 'forwards' });
        setTimeout(function () {
            // 2. the record slides out of the top
            var outY = dy0 - 64 - dw * 0.78;
            d.animate([{ transform: 'translate(' + dx0 + 'px,' + (dy0 - 64) + 'px) scale(1.1)' }, { transform: 'translate(' + dx0 + 'px,' + outY + 'px) scale(1.1)' }],
                { duration: 380, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).onfinish = function () {
                layer.insertBefore(c, d);                               // the record is out: now it's in front
                // 3. the crate goes away, the sleeve settles back into it
                close();
                c.animate([{ transform: 'translate(' + x0 + 'px,' + (y0 - 64) + 'px) scale(1.1)', opacity: 1 },
                           { transform: 'translate(' + x0 + 'px,' + (y0 + 260) + 'px) scale(1)', opacity: 0 }],
                    { duration: 520, easing: 'cubic-bezier(.5,0,.8,.5)', fill: 'forwards' });
                // 4. the record is carried over and set down on the platter, spinning down flat
                setTimeout(function () {
                    var p = platter(), s1 = 1.1, s2 = p.w / dw;
                    var ex = p.x - dw / 2, ey = p.y - dw / 2;
                    var mx = (dx0 + ex) / 2, my = Math.min(outY, ey) - 110;
                    d.animate([
                        { transform: 'translate(' + dx0 + 'px,' + outY + 'px) scale(' + s1 + ') rotate(0deg)' },
                        { transform: 'translate(' + mx + 'px,' + my + 'px) scale(' + ((s1 + s2) / 2) + ', ' + ((s1 + s2 * 0.3) / 2) + ') rotate(200deg)', offset: .55 },
                        { transform: 'translate(' + ex + 'px,' + ey + 'px) scale(' + s2 + ', ' + (s2 * 0.3) + ') rotate(360deg)' }
                    ], { duration: 950, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' }).onfinish = function () {
                        M.load(M.tracks.indexOf(t), true);
                        drawNow();
                        setTimeout(function () { layer.remove(); sleeve.classList.remove('lifted'); busy = false; }, 60);
                    };
                }, 280);
            };
        }, 300);
    }

    /* ---------------- spinning: the needle drops and the record winds up; it lifts and the record runs down ----------------
       press play and the arm swings over; the moment the needle touches the record it starts to
       turn, and the music comes in with it, sliding up to pitch like a real turntable getting up
       to speed. pause or stop: the needle lifts, the music stops, and the record coasts to a halt. */
    var SPEED = 80;                        // degrees a second at full speed (a gentle 4.5 seconds a turn)
    var WIND_UP = 1.2;                     // seconds from still to full speed, once the needle's down
    var RUN_DOWN = 2.8;                    // seconds to coast to a stop, once it lifts
    var NEEDLE = 1000;                     // ms for the arm to swing over and set the needle down (the .tt-arm swing above)
    var calmSpin = window.matchMedia('(prefers-reduced-motion: reduce)'), pageStart = performance.now();
    var spin = { angle: 0, speed: M.playing() ? SPEED : 0, on: false, t: 0, landsAt: 0, was: M.playing() };
    try { audio.preservesPitch = false; audio.mozPreservesPitch = false; audio.webkitPreservesPitch = false; } catch (e) {}
    function spinFrame(t) {
        var dt = Math.min(0.1, (t - spin.t) / 1000);
        spin.t = t;
        var playing = M.playing(), down = playing && t >= spin.landsAt;
        if (down) spin.speed = Math.min(SPEED, spin.speed + SPEED / WIND_UP * dt);
        else spin.speed = Math.max(0, spin.speed - SPEED / RUN_DOWN * dt);
        // the sound: silent while the needle's still in the air, then up to pitch with the record
        if (playing) {
            audio.muted = !down;
            var rate = down ? 0.55 + 0.45 * spin.speed / SPEED : 1;
            if (Math.abs(audio.playbackRate - rate) > 0.004) audio.playbackRate = rate;
        }
        spin.angle = (spin.angle + spin.speed * dt) % 360;
        var r = 'rotate(' + spin.angle.toFixed(2) + 'deg)';
        var a = deck.querySelector('.tt-disc'), b = ttRecord.querySelector('svg'), c = nowDisc.querySelector('svg');
        if (a) a.style.transform = r;
        if (b) b.style.transform = r;
        if (c) c.style.transform = r;
        if (!playing && spin.speed === 0) { spin.on = false; audio.muted = false; audio.playbackRate = 1; return; }
        requestAnimationFrame(spinFrame);
    }
    function spinUp() {
        if (spin.on || calmSpin.matches) return;
        spin.on = true; spin.t = performance.now();
        requestAnimationFrame(spinFrame);
    }
    M.on(function (what) {
        if (what === 'play' || what === 'pause' || what === 'stop' || what === 'track') {
            var now = M.playing();
            if (now && !spin.was && !calmSpin.matches) {
                if (performance.now() - pageStart < 2500) spin.speed = SPEED;     // music carried over from another page: already going
                else spin.landsAt = performance.now() + NEEDLE;                    // the arm swings over first
            }
            spin.was = now;
            spinUp();
        }
    });
    if (M.playing()) spinUp();

    /* ---------------- the controls ---------------- */
    M.on(function (what) {
        if (what === 'time') {
            cur.textContent = mmss(audio.currentTime);
            if (!seeking && audio.duration) seek.value = Math.round(audio.currentTime / audio.duration * 1000);
            return;
        }
        if (what === 'track' || what === 'tracks' || what === 'stop') drawNow();
    });
    audio.addEventListener('loadedmetadata', function () { dur.textContent = mmss(audio.duration); });
    seek.addEventListener('input', function () { seeking = true; cur.textContent = mmss(seek.value / 1000 * (audio.duration || 0)); });
    seek.addEventListener('change', function () { if (audio.duration) audio.currentTime = seek.value / 1000 * audio.duration; seeking = false; });
    vol.addEventListener('input', function () { M.setVolume(vol.value / 100); });
    playBtn.addEventListener('click', function () { if (!M.current() && tracks.length) M.load(0, true); else M.toggle(); });
    box.querySelector('.rp-prev').addEventListener('click', M.prev);
    box.querySelector('.rp-next').addEventListener('click', M.next);
    box.querySelector('.rp-stop').addEventListener('click', M.stop);

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
    deck.addEventListener('asset', drawDeck);
    box.querySelector('.rp-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
        if (!box.classList.contains('open')) return;
        if (e.key === 'Escape') { e.stopPropagation(); close(); }
        else if (e.key === ' ' && (e.target === document.body || e.target === playBtn)) { e.preventDefault(); if (e.target !== playBtn) M.toggle(); }
    }, true);
    document.addEventListener('pointerdown', function (e) {
        if (box.classList.contains('open') && !box.contains(e.target) && !deck.contains(e.target)) close();
    });

    /* ---------------- records shot to pieces (sky/revolver.js): gone for the rest of the visit ---------------- */
    function abs(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }
    function wasShot(url) { try { return (JSON.parse(sessionStorage.getItem('records-shot') || '[]')).indexOf(abs(url)) !== -1; } catch (e) { return false; } }
    // what's in the crate: not a record shot to bits this visit (sky/revolver.js), and not a hidden
    // record you haven't found yet (sky/loot.js: the P(Doom) one's behind a picture in the hall of shame)
    var allEntries = [];
    function showing(t) { return !wasShot(t.url) && !(Sky.loot && Sky.loot.trackHidden(t.url, t.title)); }
    // the crate as it stands: without the shot and the still-hidden songs (an album with none left goes too).
    // the song that's on is the same record wherever it's listed: that one object, so the player knows it
    function visible() {
        var on = M.current();
        function same(t) { if (on && abs(on.url) === abs(t.url)) { if (!on.album && t.album) on.album = t.album; if (!on.pic) on.pic = t.pic; return on; } return t; }
        return allEntries.map(function (e) {
            if (e.kind !== 'album') return showing(e) ? same(e) : null;
            var songs = e.songs.filter(showing).map(same);
            return songs.length ? Object.assign({}, e, { songs: songs }) : null;
        }).filter(Boolean);
    }
    function refill() { entries = visible(); flatten(); M.setTracks(tracks.slice()); drawSleeves(); drawNow(); }
    Sky.records = {
        reload: refill,
        // shot: the whole record's gone (an album: every song on it)
        forget: function (url) {
            var hit = allEntries.filter(function (e) { return songsOf(e).some(function (t) { return abs(t.url) === abs(url); }); })[0];
            var urls = hit ? songsOf(hit).map(function (t) { return abs(t.url); }) : [abs(url)];
            try { var l = JSON.parse(sessionStorage.getItem('records-shot') || '[]'); urls.forEach(function (u) { if (l.indexOf(u) === -1) l.push(u); }); sessionStorage.setItem('records-shot', JSON.stringify(l)); } catch (e) {}
            refill();
        },
        deck: deck
    };

    /* ---------------- fill the crate from the folder (and its albums) ---------------- */
    drawNow();
    var folder = deck.dataset.folder.replace(/\/?$/, '/');
    function listed(dir) { return new Promise(function (ok) { Sky.listFolder(dir, AUDIO.concat(PICS), ok); }); }
    function picsOf(files) {
        var pics = {};
        files.forEach(function (f) { if (/\.(jpe?g|png|webp|gif)$/i.test(f.name)) pics[f.name.replace(/\.[^.]+$/, '').toLowerCase()] = f.url; });
        return pics;
    }
    function songsIn(files, pics, fallback, album, color) {
        return Sky.sortByName(files.filter(function (f) { return /\.(mp3|ogg)$/i.test(f.name); })).map(function (f) {
            var base = f.name.replace(/\.[^.]+$/, '');
            return { url: f.url, title: Sky.fileTitle(f.name), artist: '', pic: pics[base.toLowerCase()] || fallback || null,
                     color: color || LABELS[Sky.hashStr(f.name) % LABELS.length], album: album || null, name: f.name };
        });
    }
    var albumNames = fetch(folder + 'albums.txt', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; })
        .then(function (t) { return /<html/i.test(t) ? [] : t.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) { return l && l.charAt(0) !== '#'; }); });
    Promise.all([listed(folder), albumNames]).then(function (got) {
        var files = got[0], singles = songsIn(files, picsOf(files)).map(function (t) { t.kind = 'single'; return t; });
        return Promise.all(got[1].map(function (name) {
            return listed(folder + encodeURIComponent(name) + '/').then(function (fs) {
                var pics = picsOf(fs), cover = pics.cover || (fs.filter(function (f) { return /\.(jpe?g|png|webp|gif)$/i.test(f.name); })[0] || {}).url || null;
                var title = name.replace(/^\d+[-_. ]+/, '').replace(/[_]+/g, ' ').trim() || name;
                var color = LABELS[Sky.hashStr(name) % LABELS.length], album = { key: name, title: title };
                var songs = songsIn(fs, pics, cover, album, color);
                return songs.length ? { kind: 'album', name: name, key: name, title: title, pic: cover, color: color, songs: songs } : null;
            });
        })).then(function (albums) { return Sky.sortByName(singles.concat(albums.filter(Boolean))); });
    }).then(function (all) {
        allEntries = all;
        refill();
        // their own tags: title, artist, a picture (an album's cover stays its cover)
        tracks.forEach(function (t) {
            if (!/\.mp3$/i.test(t.url)) return;
            M.readTags(t.url).then(function (tags) {
                if (!tags) return;
                if (tags.title) t.title = tags.title;
                if (tags.artist) t.artist = tags.artist;
                if (tags.bpm) t.tagBpm = tags.bpm;
                if (tags.picture && !t.pic) { t.pic = tags.picture; if (t.kind === 'single') t.pic = tags.picture; }
                drawSleeves();
            });
        });
    });
})();

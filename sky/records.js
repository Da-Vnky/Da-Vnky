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

   P(DOOM)'S OWN SLOT: the record "I'm Upping My P(Doom)" (any song with p(doom) in
   its name) isn't with the others: it has a slot of its own at the end of the crate
   (Victor, 27 Sep):
     • resets 1-3: an empty slot, "???" under it, until it's found (sky/loot.js: behind the
       false god's picture); then P(Doom) sits in it, plain, its name underneath.
     • reset 4: P(Doom) goes missing, and the slot's empty ("???"), until the grimoire's pact
       (run:grimoire-pact). From then its INVERTED twin is there, glowing red and evil (colours
       turned inside out; a red staticky light instead of the party; its Claubes wear black
       robes, pull the book and run down to the dungeon: sky/claubes.js). So reset 4 always has
       the record that calls the Claubes, and only once they can be dealt with: nobody gets
       stuck. It plays Victor's reversed song, assets/sounds/evilrecord (.ogg or .mp3), or
       until he adds one, P(Doom) played backwards, made in the browser (sky/music.js).
     • reset 5 on: P(Doom) is back, found or not, purified: glowing rainbow, a rainbow ring
       on the record. Now it can be given to Mel (her room sets localStorage mel-remedy):
       then it's at her place, and the slot's empty, "at Mel's" under it.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var deck = document.querySelector('.turntable[data-folder]');
    if (!deck || !Sky.music) return;
    var M = Sky.music, audio = M.audio;
    var AUDIO = ['mp3', 'ogg'], PICS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
    var DOOM = /p\s*\(\s*doom\s*\)/i;
    function doomGiven() { try { return localStorage.getItem('mel-remedy') !== null; } catch (e) { return false; } }
    var invertedSong = null;
    Sky.findAsset('assets/sounds/evilrecord.ogg|assets/sounds/evilrecord.mp3', function (u) { invertedSong = u || null; if (doomEntry) refill(); });
    var LABELS = ['#9a3b1f', '#c49a52', '#3f5a55', '#6e2f24', '#56636f', '#8a3f6e', '#b88c5e', '#28323b'];

    // (its look is in sky/css/records.css, linked from each page's head)

    /* ---------------- the turntable in the room ---------------- */
    deck.setAttribute('role', 'button');
    deck.setAttribute('tabindex', '0');
    deck.setAttribute('aria-label', 'the record player');
    deck.insertAdjacentHTML('beforeend', '<span class="tt-record" aria-hidden="true"></span><span class="tt-hint">the record player</span>' +
        '<span class="tt-notes" aria-hidden="true">♪</span><span class="tt-notes n2" aria-hidden="true">♫</span><span class="tt-notes n3" aria-hidden="true">♪</span>');
    var ttRecord = deck.querySelector('.tt-record');

    /* ---------------- the lo-fi slider, on the front of the record player ----------------
       the bitcrush (sky/music.js, Sky.music.lofi): up is lo-fi, down is the song as it was recorded.
       click it and the knob slides, and the sound glides with it. slots: assets/living/lofi-fader (the slot
       it runs in, tall and thin, about 1:3) and assets/living/lofi-knob (the knob, about 5:3); where it sits
       on the record player: --lofi-x, --lofi-y, --lofi-w, --lofi-h on .turntable (sky/css/records.css) */
    if (M.lofi && M.lofi.can) {
        deck.insertAdjacentHTML('beforeend',
            '<button type="button" class="tt-lofi" aria-pressed="false">' +
                '<span class="tt-lofi-fader" data-asset="assets/living/lofi-fader"><svg class="placeholder" viewBox="0 0 30 90" preserveAspectRatio="none" aria-hidden="true">' +
                    '<rect x="1" y="1" width="28" height="88" rx="4" fill="#3b2618" stroke="#7a5132" stroke-width="1.5"/>' +
                    '<rect x="13" y="10" width="4" height="70" rx="2" fill="#140c08"/>' +
                    '<g stroke="#c49a52" stroke-width="1.2" opacity=".8"><path d="M5 10 H10 M5 27.5 H9 M5 45 H10 M5 62.5 H9 M5 80 H10 M20 10 H25 M21 27.5 H25 M20 45 H25 M21 62.5 H25 M20 80 H25"/></g>' +
                '</svg></span>' +
                '<span class="tt-lofi-knob" data-asset="assets/living/lofi-knob"><svg class="placeholder" viewBox="0 0 50 30" aria-hidden="true">' +
                    '<rect x="1" y="1" width="48" height="28" rx="4" fill="#c49a52" stroke="#6e4a20" stroke-width="1.5"/>' +
                    '<rect x="4" y="4" width="42" height="9" rx="2" fill="#f0d488" opacity=".7"/><rect x="3" y="14" width="44" height="2.4" fill="#3a2716"/>' +
                '</svg></span>' +
                '<span class="tt-lofi-hint"></span>' +
            '</button>');
        var lofiBtn = deck.querySelector('.tt-lofi');
        var drawLofi = function () {
            var on = M.lofi.on;
            lofiBtn.classList.toggle('on', on);
            lofiBtn.setAttribute('aria-pressed', String(on));
            lofiBtn.setAttribute('aria-label', 'the lo-fi slider (the bitcrush): ' + (on ? 'on' : 'off'));
            lofiBtn.querySelector('.tt-lofi-hint').textContent = on ? 'lo-fi · on' : 'lo-fi · off';
        };
        lofiBtn.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();                         // (not the crate: just the slider)
            M.lofi.set(!M.lofi.on);
            if (Sky.sounds) Sky.sounds.sfx('lofi-slide', { or: 'tap', size: 0.3 });
        });
        lofiBtn.addEventListener('keydown', function (e) { e.stopPropagation(); });
        M.on(function (what) { if (what === 'lofi') drawLofi(); });
        drawLofi();
        if (Sky.fillAssets) Sky.fillAssets(lofiBtn);
    }
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
    // the drawn turntable's own record: the real one (the record's vinyl, your vinyl texture, its sleeve on the label), laid into
    // the drawing's platter (a record-sized svg inside it, 108 across: the platter's size), turning with it
    var ttDisc = deck.querySelector('.tt-disc');
    function drawDeck() {
        var t = M.current();
        if (ttDisc && ttDisc.ownerSVGElement) ttDisc.innerHTML = M.discOf(t).replace('<svg ', '<svg x="-54" y="-54" width="108" height="108" ');
        else {
            if (labelDot) labelDot.setAttribute('fill', t ? t.color : '#9a3b1f');
            if (labelArt) { if (t && t.pic) labelArt.setAttribute('href', t.pic); else labelArt.removeAttribute('href'); }
        }
        ttRecord.classList.toggle('on', !!t);
        ttRecord.innerHTML = t ? M.discOf(t) : '';
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
    var entries = [], tracks = [], seeking = false, special = null, doomEntry = null;
    function songsOf(e) { return e.kind === 'album' ? e.songs : [e]; }
    function flatten() { tracks = []; entries.forEach(function (e) { songsOf(e).forEach(function (t) { tracks.push(t); }); }); if (special) tracks.push(special); }
    var albumBox = null;
    var nowDisc = box.querySelector('.rp-now-disc'), titleEl = box.querySelector('.rp-title'), artistEl = box.querySelector('.rp-artist');
    var seek = box.querySelector('.rp-seek input'), cur = box.querySelector('.rp-cur'), dur = box.querySelector('.rp-dur');
    var vol = box.querySelector('.rp-vol input'), sleeves = box.querySelector('.rp-sleeves'), playBtn = box.querySelector('.rp-play');
    vol.value = Math.round(audio.volume * 100);

    function mmss(t) { if (!isFinite(t)) return '0:00'; t = Math.floor(t); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
    var shownAlbum = null;
    function drawNow() {
        var t = M.current(), songs = M.albumSongs ? M.albumSongs(t) : [];
        nowDisc.innerHTML = M.discOf(t);
        titleEl.textContent = t ? t.title : 'no record on';
        artistEl.textContent = t ? (songs.length ? (t.artist ? t.artist + ' · ' : '') + t.album.title + ' · ' + (songs.indexOf(t) + 1) + ' of ' + songs.length : (t.artist || ''))
                                 : (tracks.length ? 'pick one from the crate' : '');
        var all = special ? entries.concat([special]) : entries;
        sleeves.querySelectorAll('.rp-sleeve').forEach(function (s, i) { s.classList.toggle('on', !!t && !!all[i] && songsOf(all[i]).indexOf(t) !== -1); });
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
        entries.forEach(function (t, i) { sleeves.appendChild(sleeveFor(t, i)); });
        if (sleeves.lastChild) sleeves.lastChild.style.marginRight = '0';
        drawSpecial();
        drawNow();
    }
    // P(Doom)'s own slot, at the end: P(Doom), or its inverted twin (empty only if the one there was shot to pieces this visit)
    function drawSpecial() {
        if (!doomEntry) return;
        var box = document.createElement('div');
        box.className = 'rp-special' + (special ? ' ' + special.special : ' waiting') + (pure() ? ' pure' : '');
        box.innerHTML = '<span class="rp-special-mark" aria-hidden="true">✦</span>';
        if (special) box.appendChild(sleeveFor(special, 0));
        else {
            var e = document.createElement('span');
            e.className = 'rp-special-empty';
            box.appendChild(e);
        }
        // its caption, always showing: the record's name, or ??? until it's found (at Mel's, once she has it)
        var cap = document.createElement('span');
        cap.className = 'rp-special-name';
        cap.textContent = special ? special.title : doomGiven() && pure() ? 'at Mel\u2019s' : '???';
        box.appendChild(cap);
        sleeves.appendChild(box);
    }
    function sleeveFor(t, i) {
            var album = t.kind === 'album';
            var s = document.createElement('button');
            s.type = 'button';
            s.className = 'rp-sleeve' + (album ? ' album' : '') + (t.special ? ' ' + t.special : '');
            s.style.zIndex = i + 1;
            s.style.setProperty('--tilt', (((Sky.hashStr(t.url || t.key || t.title) % 7) - 3) * 0.8).toFixed(1) + 'deg');
            s.style.setProperty('--sl', t.color);
            s.innerHTML = '<span class="sl-disc">' + M.discOf(t) + '</span><span class="sl-cover">' + coverHTML(t) +
                (album ? '<span class="sl-count">' + t.songs.length + ' songs</span>' : '') + '</span><span class="sl-name"></span>';
            var plain = s.querySelector('.sl-plain');
            if (plain) plain.textContent = t.title;
            s.querySelector('.sl-name').textContent = album ? t.title + ' · the album' : t.artist ? t.title + ' · ' + t.artist : t.title;
            s.setAttribute('aria-label', (album ? 'play the album ' : 'play ') + t.title);
            s.addEventListener('click', function () { pick(t, s); });
            return s;
    }

    /* ---------------- picking a record: out of the sleeve and onto the turntable ---------------- */
    var busy = false;
    function platter() {
        var el = deck.classList.contains('has-art') ? ttRecord : deck.querySelector('.tt-disc');
        if (el === ttRecord) { ttRecord.classList.add('on'); }
        var r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
    }
    function pick(e, sleeve) {
        var songs = songsOf(e), on = M.current();
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
        d.innerHTML = M.discOf(e);
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
        if (a) { a.style.transform = r; a.style.setProperty('--spin', spin.angle.toFixed(2)); }
        if (b) { b.style.transform = r; b.style.setProperty('--spin', spin.angle.toFixed(2)); }       // (the light on it stays still: --spin)
        if (c) { c.style.transform = r; c.style.setProperty('--spin', spin.angle.toFixed(2)); }
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
    function same(t) {
        var on = M.current();
        if (on && abs(on.url) === abs(t.url)) { if (!on.album && t.album) on.album = t.album; if (!on.pic) on.pic = t.pic; on.skin = t.skin; on.discCls = t.discCls; on.special = t.special; on.title = t.title; return on; }
        return t;
    }
    // the special slot: P(Doom) while it's theirs (found, not given, not shot this visit) and it isn't reset 4; else its inverted twin
    function resetNo() { return window.davSave ? window.davSave.reset : 1; }
    function pure() { return resetNo() >= 5; }                        // (after reset 4: purified, glowing rainbow)
    function specialNow() {
        if (!doomEntry) return null;
        if (resetNo() !== 4) {
            doomEntry.discCls = pure() ? 'doom' : '';
            if (pure()) return doomGiven() || wasShot(doomEntry.url) ? null : same(doomEntry);      // (back, found or not; unless she has it)
            return showing(doomEntry) ? same(doomEntry) : null;                                    // (resets 1-3: once it's found)
        }
        // reset 4: missing until the grimoire's pact; then the inverted twin
        if (!window.davSave || window.davSave.get('grimoire-pact') !== '1') return null;
        var inv = { kind: 'single', special: 'inverted', discCls: 'inverted', name: doomEntry.name, artist: '',
                    url: invertedSong || doomEntry.url + '#inverted', pic: doomEntry.pic, color: '#1a0606',
                    reverse: !invertedSong, from: invertedSong ? '' : doomEntry.url,
                    title: '\u202E' + doomEntry.title + '\u202C' };
        return wasShot(inv.url) ? null : same(inv);
    }
    function visible() {
        return allEntries.map(function (e) {
            if (e.kind !== 'album') return showing(e) ? same(e) : null;
            var songs = e.songs.filter(showing).map(same);
            return songs.length ? Object.assign({}, e, { songs: songs }) : null;
        }).filter(Boolean);
    }
    function refill() { entries = visible(); special = specialNow(); flatten(); M.setTracks(tracks.slice()); drawSleeves(); drawNow(); evilGlow(); }
    // reset 4, once the pact's made and till the inverted record's been put on (27 Sep, Victor): the record player glows red
    // and evil, calling them to it (body.evil-waiting, records.css). putting it on calls the robed Claubes out (sky/claubes.js),
    // and until then the book won't open the dungeon (sky/bathroom.js says why)
    function evilWaiting() {
        var S = window.davSave;
        return resetNo() === 4 && !!S && S.get('grimoire-pact') === '1' && S.get('claubes-robed') !== '1' && !!special && special.special === 'inverted';
    }
    function evilGlow() {
        var on = evilWaiting(), hint = deck && deck.querySelector('.tt-hint');
        document.body.classList.toggle('evil-waiting', on);
        if (hint) hint.textContent = on ? 'something is waiting in the record player' : 'the record player';
    }
    setInterval(evilGlow, 1500);
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
    // the pictures beside the songs, by name without the type: "01-aerie" (its sleeve), "01-aerie.vinyl" (its own vinyl)
    function picsOf(files) {
        var pics = {};
        files.forEach(function (f) { if (/\.(jpe?g|png|webp|gif|svg)$/i.test(f.name)) pics[f.name.replace(/\.[^.]+$/, '').toLowerCase()] = f.url; });
        return pics;
    }
    function isVinyl(name) { return /(^|\.)vinyl\.[a-z]+$/i.test(name); }
    function songsIn(files, pics, fallback, album, color, skin) {
        return Sky.sortByName(files.filter(function (f) { return /\.(mp3|ogg)$/i.test(f.name); })).map(function (f) {
            var base = f.name.replace(/\.[^.]+$/, '');
            return { url: f.url, title: Sky.fileTitle(f.name), artist: '', pic: pics[base.toLowerCase()] || fallback || null,
                     color: color || LABELS[Sky.hashStr(f.name) % LABELS.length], album: album || null, name: f.name,
                     skin: skin || pics[base.toLowerCase() + '.vinyl'] || null };
        });
    }
    var albumNames = fetch(folder + 'albums.txt', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; })
        .then(function (t) { return /<html/i.test(t) ? [] : t.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) { return l && l.charAt(0) !== '#'; }); });
    Promise.all([listed(folder), albumNames]).then(function (got) {
        var files = got[0], singles = songsIn(files, picsOf(files)).map(function (t) { t.kind = 'single'; return t; });
        return Promise.all(got[1].map(function (name) {
            return listed(folder + encodeURIComponent(name) + '/').then(function (fs) {
                var pics = picsOf(fs), cover = pics.cover || (fs.filter(function (f) { return /\.(jpe?g|png|webp|gif)$/i.test(f.name) && !isVinyl(f.name); })[0] || {}).url || null;
                var title = name.replace(/^\d+[-_. ]+/, '').replace(/[_]+/g, ' ').trim() || name;
                var color = LABELS[Sky.hashStr(name) % LABELS.length], album = { key: name, title: title };
                var skin = pics.vinyl || null, songs = songsIn(fs, pics, cover, album, color, skin);
                return songs.length ? { kind: 'album', name: name, key: name, title: title, pic: cover, color: color, skin: skin, songs: songs } : null;
            });
        })).then(function (albums) { return Sky.sortByName(singles.concat(albums.filter(Boolean))); });
    }).then(function (all) {
        // P(Doom) leaves the row for its own slot
        doomEntry = all.filter(function (e) { return e.kind !== 'album' && DOOM.test(e.title + ' ' + e.name); })[0] || null;
        if (doomEntry) { doomEntry.special = 'doom'; all = all.filter(function (e) { return e !== doomEntry; }); }
        allEntries = all;
        refill();
        // their own tags: title, artist, a picture (an album's cover stays its cover)
        tracks.forEach(function (t) {
            if (!/\.mp3$/i.test(t.url) || t.special === 'inverted') return;
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

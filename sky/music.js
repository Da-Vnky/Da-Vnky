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

   LO-FI (27 Sep, Victor): every song plays through a bitcrush, live: every
   4th sample held (a quarter of 44.1 kHz) and rounded to 8 bits, the same as
   Victor's plugin (measured against his "Aerie" / "Aerie-bitcrush": the
   same tones, to a tenth of a decibel). The lo-fi slider (the record player's,
   and the music panel's) turns it off and on: over LOFI_MS the sample rate
   climbs and the bits grow (or the other way), so it glides rather than cuts,
   and the song never skips (it's the one song, only its sound changes).
   Remembered per visitor (localStorage records-lofi; on unless they turn it
   off). Songs uploaded clean come out crushed; ones already crushed sound the
   same either way. Needs a browser with AudioWorklet on https (every current
   one); without it, songs just play as they are and the slider hides.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.music) return;
    var KEY = 'music-now';
    var LIVING = 'living.html';                 // where the record player lives

    // (its look is in sky/css/music.css, linked from each page's head)

    /* ---------------- a record, drawn: the vinyl, a label (your sleeve's picture), the light on it ----------------
       three layers, bottom to top:
         the vinyl: the record's own (a song's "01-name.vinyl.png", an album's "vinyl.png": records.js finds them), else
                    the usual one (the slot assets/living/record: a square picture of the disc, see-through round it),
                    else the drawn one
         the label: the sleeve's picture, a round crop in the middle third. with a record's own vinyl the label goes
                    UNDER it: leave the middle of your vinyl see-through and the sleeve shows there; paint a label on
                    it and yours shows instead
         the light: the texture laid over every record (the slot assets/living/vinyl-texture, a .webp or .png the size
                    of the record, mostly see-through: fine grooves, the sheen, dust). it stays still while the record
                    turns (records.js hands the angle over as --spin), like light on a real one
       an album's record has a gold ring; P(Doom)'s record and its inverted twin have their own classes (records.css) */
    var uid = 0;
    var recordArt = null, textureArt = null;
    Sky.findAsset('assets/living/record', function (url) { if (url) { recordArt = url; emit('track'); } });
    Sky.findAsset('assets/living/vinyl-texture', function (url) { if (url) { textureArt = url; emit('track'); } });
    // an album (a record with a whole album on it) has a gold ring just inside its edge, and round its label:
    // brushed metal, light and dark bands round it, a bright rim outside and a shadow line inside
    function goldRing(id) {
        return '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1">' +
                '<stop offset="0" stop-color="#6e4c14"/><stop offset=".14" stop-color="#e9c96a"/><stop offset=".26" stop-color="#fff4c8"/>' +
                '<stop offset=".38" stop-color="#b8892e"/><stop offset=".52" stop-color="#f6dd8e"/><stop offset=".64" stop-color="#8a6320"/>' +
                '<stop offset=".78" stop-color="#ffeaa8"/><stop offset=".9" stop-color="#c29636"/><stop offset="1" stop-color="#5e400e"/></linearGradient>' +
            '<linearGradient id="' + id + 'h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8dc" stop-opacity=".9"/><stop offset=".5" stop-color="#fff8dc" stop-opacity="0"/></linearGradient></defs>' +
            '<g class="rp-gold" fill="none">' +
                '<circle cx="50" cy="50" r="46.4" stroke="url(#' + id + 'g)" stroke-width="2.6"/>' +
                '<circle cx="50" cy="50" r="47.75" stroke="rgba(255,244,200,.45)" stroke-width=".35"/>' +
                '<circle cx="50" cy="50" r="45.05" stroke="rgba(50,32,6,.75)" stroke-width=".4"/>' +
                '<path d="M14 30 A40 40 0 0 1 40 6.5" stroke="url(#' + id + 'h)" stroke-width="1.6" stroke-linecap="round" transform="translate(0 0)"/>' +
                '<circle cx="50" cy="50" r="17.7" stroke="url(#' + id + 'g)" stroke-width="1.3"/>' +
                '<circle cx="50" cy="50" r="18.45" stroke="rgba(50,32,6,.6)" stroke-width=".3"/>' +
            '</g>';
    }
    // the drawn vinyl (until assets/living/record)
    function drawnVinyl(id) {
        return '<radialGradient id="' + id + 's" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#34343a"/><stop offset=".6" stop-color="#151518"/><stop offset="1" stop-color="#0b0b0d"/></radialGradient>';
    }
    // the light on it, drawn (until assets/living/vinyl-texture): bands of fine grooves,
    // the smooth bands at the lead-in and the run-out, and two soft wedges of sheen opposite each other
    var RINGS = (function () {                     // (bands of grooves, a little uneven, like tracks cut one after another)
        var out = '<g fill="none">', r = 20.4, n = 0;
        while (r < 47.4) {
            var w = 0.22 + ((n * 37) % 5) * 0.07, a = 0.025 + ((n * 29) % 6) * 0.012;
            out += '<circle cx="50" cy="50" r="' + r.toFixed(2) + '" stroke="rgba(255,255,255,' + a.toFixed(3) + ')" stroke-width="' + w.toFixed(2) + '"/>';
            r += 0.55 + ((n * 53) % 7) * 0.13; n++;
        }
        return out + '</g>';
    })();
    var RING = 'M50 1.5 A48.5 48.5 0 1 1 49.99 1.5 Z M50 31.5 A18.5 18.5 0 1 0 50.01 31.5 Z';
    function drawnLight(id) {
        return '<defs>' +
                '<radialGradient id="' + id + 'w" gradientUnits="userSpaceOnUse" cx="50" cy="50" r="48.5">' +
                    '<stop offset=".36" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#fff" stop-opacity=".5"/><stop offset=".86" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
                '<filter id="' + id + 'b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>' +
                '<clipPath id="' + id + 'k"><path d="' + RING + '" clip-rule="evenodd"/></clipPath>' +
            '</defs>' +
            '<g clip-path="url(#' + id + 'k)">' +
                RINGS +
                '<g fill="none" stroke-width="1.1"><circle cx="50" cy="50" r="47.2" stroke="rgba(255,255,255,.05)"/><circle cx="50" cy="50" r="20.2" stroke="rgba(255,255,255,.06)"/>' +
                    '<circle cx="50" cy="50" r="33" stroke="rgba(0,0,0,.18)" stroke-width=".5"/></g>' +
                '<g filter="url(#' + id + 'b)" fill="url(#' + id + 'w)" opacity=".42">' +
                    '<path d="M50 50 L10.6 21.7 A48.5 48.5 0 0 1 21.7 10.6 Z"/><path d="M50 50 L89.4 78.3 A48.5 48.5 0 0 1 78.3 89.4 Z"/>' +
                '</g>' +
            '</g>' +
            '<circle cx="50" cy="50" r="48.6" fill="none" stroke="rgba(255,255,255,.14)" stroke-width=".35"/>';
    }
    // P(Doom)'s record: a ring of every colour just inside its edge and round its label (it turns through them: records.css)
    var RAINBOW = (function () {
        var C = ['#ff2a4a', '#ff8a1e', '#ffe23a', '#52e05a', '#28c8ff', '#5a6cff', '#c04cff'], out = '<g class="rp-rainbow" fill="none">';
        [[46.4, 2.6], [17.9, 1.4]].forEach(function (ring) {
            var len = 2 * Math.PI * ring[0], seg = len / C.length;
            C.forEach(function (c, i) {
                out += '<circle cx="50" cy="50" r="' + ring[0] + '" stroke="' + c + '" stroke-width="' + ring[1] + '" stroke-dasharray="' + seg.toFixed(2) + ' ' + (len - seg).toFixed(2) + '" stroke-dashoffset="' + (-seg * i).toFixed(2) + '"/>';
            });
        });
        return out + '</g>';
    })();
    // o (optional): { skin: the record's own vinyl, cls: more classes (doom, inverted) }
    function disc(color, pic, cls, album, o) {
        o = o || {};
        var id = 'mdisc' + (++uid), skin = o.skin || null;
        var label = '<circle cx="50" cy="50" r="17" fill="' + (color || '#9a3b1f') + '"/>' +
            (pic ? '<image href="' + pic + '" x="33" y="33" width="34" height="34" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + id + ')"/>' : '') +
            '<circle cx="50" cy="50" r="17" fill="none" stroke="rgba(0,0,0,.25)"/>';
        var vinyl;
        if (skin) vinyl = label + '<image class="rp-skin" href="' + skin + '" x="0" y="0" width="100" height="100"/>';
        else if (recordArt) vinyl = '<image href="' + recordArt + '" x="0" y="0" width="100" height="100"/>' +
            (pic ? '<image href="' + pic + '" x="33" y="33" width="34" height="34" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + id + ')"/>' : '');
        else vinyl = '<circle cx="50" cy="50" r="49" fill="url(#' + id + 's)"/>' + label;
        var light = textureArt ? '<image href="' + textureArt + '" x="0" y="0" width="100" height="100"/>' : drawnLight(id + 'l');
        return '<svg class="rp-disc ' + (cls || '') + (album ? ' album' : '') + (o.cls ? ' ' + o.cls : '') + (skin ? ' own-vinyl' : '') +
                '" viewBox="0 0 100 100" aria-hidden="true" data-slot="' + (skin ? 'its own vinyl' : 'assets/living/record') + '">' +
            '<defs><clipPath id="' + id + '"><circle cx="50" cy="50" r="17"/></clipPath>' + (skin || recordArt ? '' : drawnVinyl(id)) + '</defs>' +
            vinyl +
            (album ? goldRing(id) : '') +
            (/\bdoom\b/.test(o.cls || '') ? RAINBOW : '') +
            '<g class="rp-light" data-slot="assets/living/vinyl-texture">' + light + '</g>' +
            (skin || recordArt ? '' : '<circle cx="50" cy="50" r="2" fill="#0c0c0e"/>') +
            '</svg>';
    }
    // a record as the crate and the player know it (t: a single, an album, or a song on one)
    function discOf(t, cls) {
        if (!t) return disc('#6e5236', null, cls);
        return disc(t.color, t.pic, cls, !!t.album || t.kind === 'album', { skin: t.skin, cls: t.discCls });
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
            else if (id === 'TBPM' || id === 'TBP') { var bp = parseFloat(text(enc, s + 1, e)); if (bp > 30 && bp < 300) out.bpm = bp; }
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
    // the songs on the same album as t (in playing order), or [] for a single
    function albumSongs(t) { return t && t.album ? tracks.filter(function (x) { return x.album && x.album.key === t.album.key; }) : []; }
    function current() { return tracks[at] || null; }
    function playing() { return !audio.paused && !audio.ended; }

    function save() {
        var t = current();
        try {
            if (!t) { sessionStorage.removeItem(KEY); return; }
            sessionStorage.setItem(KEY, JSON.stringify({
                tracks: tracks.map(function (x) { return { url: x.url, title: x.title, artist: x.artist || '', color: x.color, pic: /^blob:/.test(x.pic || '') ? '' : (x.pic || ''), skin: x.skin || '', discCls: x.discCls || '', special: x.special || '',
                                                           album: x.album ? { key: x.album.key, title: x.album.title } : null }; }),
                at: at, time: audio.currentTime || 0, playing: playing() || wantPlay || (hushed && hushedOn), savedAt: Date.now()
            }));
        } catch (e) {}
    }
    function absolute(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }

    /* ---------------- lo-fi: the bitcrush, live ---------------- */
    var LOFI_KEY = 'records-lofi', LOFI_MS = 1200;     // how long the slider takes, and the sound with it
    var LOFI_RATE = 11025, LOFI_BITS = 8;              // Victor's plugin: a quarter of 44.1 kHz, 8 bits
    // the effect itself, sample by sample (it runs in the browser's audio thread: an AudioWorklet)
    var LOFI_PROC = [
        "// the lo-fi effect, sample by sample (runs in the browser's audio thread: an AudioWorklet)",
        "//   amount 1: every 4th sample held (a quarter of 44.1 kHz: 11025) and rounded to 8 bits, like Victor's plugin",
        "//   amount 0: the song untouched. in between, the sample rate climbs and the bits grow as the slider comes down",
        "class DavLofi extends AudioWorkletProcessor {",
        "    static get parameterDescriptors() { return [{ name: 'amount', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'a-rate' }]; }",
        "    constructor(o) {",
        "        super();",
        "        var p = (o && o.processorOptions) || {};",
        "        this.rate = p.rate || 11025; this.bits = p.bits || 8;",
        "        this.phase = [1, 1]; this.held = [0, 0];",
        "    }",
        "    process(inputs, outputs, params) {",
        "        var inp = inputs[0], out = outputs[0], am = params.amount, sr = sampleRate;",
        "        for (var ch = 0; ch < out.length; ch++) {",
        "            var y = out[ch], x = inp[ch] || inp[0];",
        "            if (!x) { y.fill(0); continue; }",
        "            var ph = this.phase[ch], h = this.held[ch];",
        "            for (var i = 0; i < y.length; i++) {",
        "                var a = am.length > 1 ? am[i] : am[0];",
        "                if (a <= 0.0005) { y[i] = x[i]; ph = 1; h = x[i]; continue; }",
        "                ph += Math.pow(this.rate / sr, a);",
        "                if (ph >= 1) { ph -= Math.floor(ph); h = x[i]; }",
        "                var q = 2 / Math.pow(2, 16 - (16 - this.bits) * a);",
        "                y[i] = Math.round(h / q) * q;",
        "            }",
        "            this.phase[ch] = ph; this.held[ch] = h;",
        "        }",
        "        return true;",
        "    }",
        "}",
        "registerProcessor('dav-lofi', DavLofi);"
    ].join('\n');
    var lofi = { on: true, ctx: null, node: null, ready: null, built: false, failed: false };
    try { lofi.on = localStorage.getItem(LOFI_KEY) !== '0'; } catch (e) {}
    function lofiCan() { return !!(window.AudioWorkletNode && window.isSecureContext && (window.AudioContext || window.webkitAudioContext)); }
    function lofiCtx() {
        if (lofi.ctx || lofi.failed) return lofi.ctx;
        var C = window.AudioContext || window.webkitAudioContext;
        try { lofi.ctx = new C({ sampleRate: 44100, latencyHint: 'playback' }); }              // (44.1 kHz: then "every 4th sample" is exact)
        catch (e) { try { lofi.ctx = new C(); } catch (e2) { lofi.failed = true; } }
        return lofi.ctx;
    }
    // the song's sound goes through the effect from now on (only once the browser's sound is running: before
    // that, routing it would silence it)
    function lofiBuild() {
        if (lofi.ready) return lofi.ready;
        var ctx = lofiCtx();
        if (!ctx) return Promise.resolve(false);
        lofi.ready = ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([LOFI_PROC], { type: 'application/javascript' }))).then(function () {
            lofi.node = new AudioWorkletNode(ctx, 'dav-lofi', { outputChannelCount: [2], processorOptions: { rate: LOFI_RATE, bits: LOFI_BITS } });
            lofi.node.parameters.get('amount').value = lofi.on ? 1 : 0;
            ctx.createMediaElementSource(audio).connect(lofi.node).connect(ctx.destination);
            lofi.built = true;
            return true;
        }).catch(function () { lofi.failed = true; return false; });
        return lofi.ready;
    }
    // then fn(): once the effect's in place, or straight away if it can't be yet (gesture: we're inside a click or a key,
    // when the browser lets its sound start)
    function lofiThen(fn, gesture) {
        if (!lofiCan() || lofi.failed) return fn();
        var ctx = lofiCtx();
        if (!ctx) return fn();
        if (ctx.state !== 'running') {
            if (!gesture) return fn();                                         // (not allowed yet: the song asks for a tap as ever)
            var p = ctx.resume();
            return p.then(function () { return lofiBuild(); }, function () {}).then(function () { fn(); });
        }
        if (lofi.built) return fn();
        lofiBuild().then(function () { fn(); });
    }
    // the first click or key on a page: the browser's sound can start, and the song goes through the effect
    function lofiWake() {
        if (!lofiCan() || lofi.failed) return;
        var ctx = lofiCtx();
        if (!ctx) return;
        var go = function () { if (!playing() || lofi.built) return; lofiBuild(); };
        if (ctx.state !== 'running') ctx.resume().then(go, function () {}); else go();
    }
    document.addEventListener('pointerdown', lofiWake, true);
    document.addEventListener('keydown', lofiWake, true);
    function setLofi(on) {
        lofi.on = !!on;
        try { localStorage.setItem(LOFI_KEY, lofi.on ? '1' : '0'); } catch (e) {}
        var prm = lofi.node && lofi.node.parameters.get('amount');
        if (prm) {
            var t = lofi.ctx.currentTime;
            if (prm.cancelAndHoldAtTime) prm.cancelAndHoldAtTime(t); else { var v = prm.value; prm.cancelScheduledValues(t); prm.setValueAtTime(v, t); }
            prm.linearRampToValueAtTime(lofi.on ? 1 : 0, t + LOFI_MS / 1000);
        }
        emit('lofi');
    }

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
    // hushed: silenced for a while (the dungeon has its own sound) without forgetting it was on
    var hushed = false, hushedOn = false;
    function hush(on) {
        if (on === hushed) return;
        if (on) { hushedOn = playing() || wantPlay; hushed = true; wantPlay = false; audio.pause(); save(); }
        else { hushed = false; if (hushedOn) start(); hushedOn = false; }
        emit('hush');
    }
    function start() {
        hushed = false;
        wantPlay = true;
        lofiThen(play1);
    }
    function play1() {
        if (!wantPlay) return;
        var p = audio.play();
        if (p && p.catch) p.catch(function () {
            // this browser wants a tap before sound starts: wait for one, anywhere
            document.body.classList.add('music-waiting');
            emit('waiting');
            var go = function () {
                document.removeEventListener('pointerdown', go, true);
                document.removeEventListener('keydown', go, true);
                document.body.classList.remove('music-waiting');
                if (wantPlay) lofiThen(function () { if (wantPlay) audio.play().catch(function () {}); }, true);
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

    // going to another page: the music fades out as you leave and back in on the next page,
    // so the moment the browser swaps pages reads as a soft breath rather than a cut
    function fade(to, ms, done) {
        var from = audio.volume, t0 = performance.now();
        (function step(now) {
            var k = Math.min(1, (now - t0) / ms);
            audio.volume = Math.max(0, Math.min(1, from + (to - from) * k));
            if (k < 1) requestAnimationFrame(step); else if (done) done();
        })(t0);
    }
    function wanted() { try { var v = localStorage.getItem('records-volume'); return v === null ? 1 : Math.max(0, Math.min(1, +v / 100)); } catch (e) { return 1; } }
    if (Sky.onLeave) Sky.onLeave(function (done) {
        if (!playing()) return false;
        save();
        fade(0, 450, done);
        return true;
    });
    window.addEventListener('pageshow', function (e) { if (e.persisted) audio.volume = wanted(); });   // back with the browser's back button

    /* ---------------- in time with the song: everything that dances follows its beat ----------------
       each song is listened to once (the first minute or so), its tempo (BPM) and where its beats
       fall are worked out, and remembered in this browser. then every dance on the page (the cat,
       the manikin, the frames, the traveller …) is timed to those beats. the dances are drawn at
       120 BPM, so a song at 90 BPM slows them to 3/4 speed, one at 140 speeds them up.
       a song that says its own tempo in its tags (TBPM) is taken at its word. */
    var DANCES = /^(g-|char-groove|frame-swing)/;
    var beat = { bpm: 0, phase: 0, url: '' };
    function beatKey(u) { return 'beat:' + absolute(u).replace(/^https?:\/\/[^/]+/, ''); }
    function analyse(url) {
        return fetch(url, { headers: { Range: 'bytes=0-2500000' } })     // the first minute or two is plenty
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
            .then(function (buf) {
                var Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
                if (!Ctx) throw new Error('no audio');
                var oc = new Ctx(1, 1, 22050);
                return new Promise(function (res, rej) { oc.decodeAudioData(buf, res, rej); });
            })
            .then(function (ab) {
                var x = ab.getChannelData(0), sr = ab.sampleRate, hop = Math.round(sr / 100);
                var n = Math.floor(x.length / hop), env = new Float32Array(n), on = new Float32Array(n);
                for (var i = 0; i < n; i++) { var e = 0; for (var j = i * hop, k = j + hop; j < k; j++) e += x[j] * x[j]; env[i] = Math.log(1e-6 + e / hop); }
                for (i = 1; i < n; i++) on[i] = Math.max(0, env[i] - env[i - 1]);   // how suddenly it got louder: the onsets
                var from = Math.min(Math.floor(n / 5), 800), to = Math.min(n, from + 6000);
                if (to - from < 1000) { from = 0; to = n; }
                var best = 0, bestLag = 50, score = {};
                for (var lag = 33; lag <= 100; lag++) {                        // 60 … 180 BPM
                    var sum = 0;
                    for (i = from; i < to - lag; i++) sum += on[i] * on[i + lag];
                    var bpm = 6000 / lag, w = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.8, 2));   // lean toward a comfortable tempo
                    score[lag] = sum;
                    if (sum * w > best) { best = sum * w; bestLag = lag; }
                }
                var a = score[bestLag - 1] || 0, b = score[bestLag], c = score[bestLag + 1] || 0, d = (a - 2 * b + c);
                var exact = bestLag + (d ? 0.5 * (a - c) / d : 0);          // between two frames
                var bestP = 0, pScore = -1, per = exact;
                for (var p = 0; p < Math.round(per); p++) {                    // where the beats fall
                    var t = 0;
                    for (var q = from + p; q < to; q += per) t += on[Math.round(q)] || 0;
                    if (t > pScore) { pScore = t; bestP = p; }
                }
                var bpmFound = 6000 / exact;
                return { bpm: bpmFound, phase: ((from + bestP) / 100) % (60 / bpmFound) };
            });
    }
    function tempoOf(t) {
        if (!t) return Promise.resolve(null);
        var key = beatKey(t.url);
        try { var c = JSON.parse(localStorage.getItem(key)); if (c && c.bpm) return Promise.resolve(c); } catch (e) {}
        if (navigator.deviceMemory && navigator.deviceMemory < 2) return Promise.resolve(null);   // a small phone: skip it
        return analyse(t.url).then(function (r) {
            if (t.tagBpm) r.bpm = t.tagBpm;
            try { localStorage.setItem(key, JSON.stringify(r)); } catch (e) {}
            return r;
        }).catch(function () { return null; });
    }
    function danceBpm() {                                         // the dance steps take a comfortable speed: halve a frantic song, double a slow one
        var b = beat.bpm;
        while (b > 150) b /= 2;
        while (b && b < 70) b *= 2;
        return b;
    }
    function syncDances() {
        if (!beat.bpm || !playing() || !document.getAnimations) return;
        var b = danceBpm(), rate = b / 120, beats = (audio.currentTime - beat.phase) / (60 / b);
        document.getAnimations().forEach(function (an) {
            if (!an.animationName || !DANCES.test(an.animationName)) return;
            if (Math.abs(an.playbackRate - rate) > 0.001) an.playbackRate = rate;
            var want = beats * 500, now = an.currentTime || 0, cycle = 2000;
            var off = ((want - now) % cycle + cycle) % cycle;             // only nudge when it's drifted
            if (off > 40 && off < cycle - 40) an.currentTime = want;
        });
    }
    function onTrack() {
        var t = current();
        if (!t || beat.url === t.url) return;
        beat = { bpm: 0, phase: 0, url: t.url };
        tempoOf(t).then(function (r) { if (r && current() === t) { beat.bpm = r.bpm; beat.phase = r.phase; requestAnimationFrame(syncDances); } });
    }
    listeners.push(function (what) {
        if (what === 'track') onTrack();
        if (what === 'play') { onTrack(); requestAnimationFrame(function () { requestAnimationFrame(syncDances); }); }
    });
    audio.addEventListener('seeked', function () { requestAnimationFrame(syncDances); });
    setInterval(syncDances, 3000);                                // keep them on the beat (and catch any that just started)
    Sky.beat = function () { return { bpm: beat.bpm, dance: danceBpm(), phase: beat.phase }; };

    /* ---------------- the stars keep time too ----------------
       at night (once the constellations are out), while a record plays, one of them (now and then two)
       pulses on every beat of the song: a quick swell and a glow, a different one each time */
    // (its look is in sky/css/music.css, linked from each page's head)
    var starBeat = -1, lastStar = null;
    (function starsOnTheBeat() {
        requestAnimationFrame(starsOnTheBeat);
        if (!beat.bpm || !playing()) return;
        var nav = document.querySelector('.sky-links.live');               // (only once they're out: night)
        if (!nav) return;
        var b = danceBpm(), n = Math.floor((audio.currentTime - beat.phase) / (60 / b));
        if (n === starBeat) return;
        starBeat = n;
        var out = Array.prototype.filter.call(nav.querySelectorAll('.sky-link'), function (a) { return a.style.visibility !== 'hidden' && a !== lastStar; });
        if (!out.length) return;
        for (var k = Math.random() < 0.25 ? 2 : 1; k > 0 && out.length; k--) {
            var a = out.splice(Math.floor(Math.random() * out.length), 1)[0];
            a.style.setProperty('--sl-beat', (60 / b * 0.95).toFixed(3) + 's');
            a.classList.remove('sl-beat'); void a.offsetWidth; a.classList.add('sl-beat');
            lastStar = a;
        }
    })();
    var fadeIn = false;
    audio.addEventListener('playing', function () {
        if (!fadeIn) return;
        fadeIn = false;
        audio.volume = 0;
        fade(wanted(), 900);
    });

    // the phone's lock screen / the computer's media keys
    function media(t) {
        if (!('mediaSession' in navigator) || !t) return;
        try {
            navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || 'DaV-nky', album: t.album ? t.album.title : 'the living space',
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
    // P(Doom) given to Mel (her room sets mel-remedy): it's at her place now, not in the list (sky/records.js)
    try {
        if (saved && saved.tracks && localStorage.getItem('mel-remedy') !== null) {
            var was = saved.tracks[saved.at];
            saved.tracks = saved.tracks.filter(function (x) { return x.special !== 'doom'; });
            saved.at = was && was.special !== 'doom' ? saved.tracks.indexOf(was) : -1;
        }
    } catch (e) {}
    if (saved && saved.tracks && saved.tracks.length && saved.at >= 0) {
        tracks = saved.tracks;
        var gone = saved.playing ? (Date.now() - saved.savedAt) / 1000 : 0;
        if (saved.playing) fadeIn = true;                          // coming from another page: ease back in
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
                        '<button type="button" class="cp-btn mu-songs" aria-label="the album’s songs" aria-expanded="false">songs ▾</button>' +
                        '<button type="button" class="cp-btn mu-stop" aria-label="stop the music">stop ✕</button>' +
                    '</div>' +
                    '<ol class="mu-album"></ol>' +
                    '<label class="cp-range">volume <input type="range" class="mu-vol" min="0" max="100" aria-label="music volume"></label>' +
                    '<button type="button" class="mu-lofi" aria-pressed="false"><span class="mu-lofi-name">lo-fi</span>' +
                        '<span class="mu-lofi-track" aria-hidden="true"><span class="mu-lofi-knob"></span></span><span class="mu-lofi-state"></span></button>' +
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
            ui.songsBtn = body.querySelector('.mu-songs'); ui.album = body.querySelector('.mu-album');
            ui.songsBtn.addEventListener('click', function () {
                var open = !ui.body.classList.contains('album-open');
                ui.body.classList.toggle('album-open', open);
                ui.songsBtn.setAttribute('aria-expanded', String(open));
            });
            ui.album.addEventListener('click', function (e) {
                var li = e.target.closest('li[data-i]');
                if (li) load(+li.dataset.i, true);
            });
            ui.seek.addEventListener('input', function () { ui.seeking = true; ui.cur.textContent = mmss(ui.seek.value / 1000 * (audio.duration || 0)); });
            ui.seek.addEventListener('change', function () { if (audio.duration) audio.currentTime = ui.seek.value / 1000 * audio.duration; ui.seeking = false; });
            ui.vol.addEventListener('input', function () { setVolume(ui.vol.value / 100); });
            ui.lofi = body.querySelector('.mu-lofi');
            ui.lofi.hidden = !lofiCan();
            ui.lofi.addEventListener('click', function () { setLofi(!lofi.on); });
            drawLofi();
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
            ui.disc.innerHTML = discOf(t);
            ui.title.textContent = t.title;
            var songs = albumSongs(t);
            ui.artist.textContent = songs.length ? (t.artist ? t.artist + ' · ' : '') + t.album.title + ' · ' + (songs.indexOf(t) + 1) + ' of ' + songs.length : (t.artist || '');
            ui.body.classList.toggle('on-album', songs.length > 1);
            ui.album.innerHTML = songs.map(function (x, n) {
                return '<li data-i="' + tracks.indexOf(x) + '"' + (x === t ? ' class="on" aria-current="true"' : '') + '><span>' + (n + 1) + '</span></li>';
            }).join('');
            ui.album.querySelectorAll('li').forEach(function (li, n) { li.appendChild(document.createTextNode(songs[n].title)); });
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
        // the kitchen: a kettle on the hob (its lid bobbing), salt and pepper stepping side to side
        kettle: { move: 'hop', art: '<svg class="placeholder" viewBox="0 0 60 50">' +
            '<path d="M44 26 C52 22 56 16 58 12 L54 11 C52 16 48 20 42 22 Z" fill="#9a3b1f"/>' +
            '<path d="M10 46 C4 34 10 18 30 18 C50 18 56 34 50 46 Z" fill="#b8482a" stroke="#6e2a18" stroke-width="1.5"/>' +
            '<path d="M14 26 C12 16 22 6 30 6 C38 6 48 16 46 26" fill="none" stroke="#3a2716" stroke-width="3" stroke-linecap="round"/>' +
            '<path d="M16 32 C20 28 26 27 30 27" stroke="#e8866a" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
            '<g class="g-head" style="transform-origin: 30px 19px"><ellipse cx="30" cy="18" rx="10" ry="2.6" fill="#8a3420"/><circle cx="30" cy="14.5" r="2.6" fill="#3a2716"/></g>' +
            '<rect x="8" y="45" width="44" height="3" rx="1.5" fill="#6e2a18"/>' +
            '</svg>' },
        shakers: { move: '', art: '<svg class="placeholder" viewBox="0 0 40 40">' +
            '<g class="g-leg" style="transform-origin: 11px 40px"><path d="M5 40 L6 16 Q6 8 11 8 Q16 8 16 16 L17 40 Z" fill="#f4f0e4" stroke="#a8a294" stroke-width="1.2"/>' +
                '<rect x="6" y="6" width="10" height="5" rx="2" fill="#b0aa9a"/><g fill="#6a645a"><circle cx="9" cy="7.5" r=".7"/><circle cx="11" cy="7" r=".7"/><circle cx="13" cy="7.5" r=".7"/></g></g>' +
            '<g class="g-leg r" style="transform-origin: 29px 40px"><path d="M23 40 L24 16 Q24 8 29 8 Q34 8 34 16 L35 40 Z" fill="#3a3630" stroke="#1a1814" stroke-width="1.2"/>' +
                '<rect x="24" y="6" width="10" height="5" rx="2" fill="#b0aa9a"/><g fill="#1a1814"><circle cx="27" cy="7.5" r=".7"/><circle cx="29" cy="7" r=".7"/><circle cx="31" cy="7.5" r=".7"/></g></g>' +
            '</svg>' },
        // the attic: a rocking horse, rocking; a music box's dancer, turning
        'rocking-horse': { move: 'rock', art: '<svg class="placeholder" viewBox="0 0 90 70">' +
            '<path d="M4 58 Q45 76 86 58" fill="none" stroke="#6e4a30" stroke-width="4" stroke-linecap="round"/>' +
            '<g stroke="#8a5e3a" stroke-width="3.2" stroke-linecap="round"><path d="M26 40 L20 62 M34 40 L32 64 M58 40 L60 64 M66 40 L72 61"/></g>' +
            '<path d="M22 26 Q24 42 44 42 Q66 42 70 30 Q70 22 60 22 H34 Q24 22 22 26 Z" fill="#c9a06a" stroke="#6e4a30" stroke-width="1.6"/>' +
            '<g class="g-head" style="transform-origin: 66px 26px"><path d="M62 24 Q64 8 74 4 Q82 4 84 12 Q84 18 78 18 Q74 18 72 26 Z" fill="#c9a06a" stroke="#6e4a30" stroke-width="1.6"/>' +
                '<circle cx="77" cy="10" r="1.6" fill="#2a1d14"/><path d="M64 10 Q60 16 62 24" stroke="#5a3a24" stroke-width="3" fill="none"/></g>' +
            '<path d="M22 26 Q12 30 10 40" stroke="#5a3a24" stroke-width="3" fill="none" stroke-linecap="round"/>' +
            '<rect x="38" y="18" width="14" height="6" rx="2" fill="#9a3b1f"/>' +
            '</svg>' },
        'music-box': { move: '', art: '<svg class="placeholder" viewBox="0 0 44 64">' +
            '<path d="M2 44 H42 V62 H2 Z" fill="#6e2f24" stroke="#3a1a12" stroke-width="1.2"/><path d="M2 44 L6 38 H38 L42 44 Z" fill="#8a3f30"/>' +
            '<path d="M8 52 H36" stroke="#c49a52" stroke-width="1.2"/><circle cx="40" cy="54" r="2" fill="#c49a52"/>' +
            '<g class="g-spin" style="transform-origin: 22px 40px">' +
                '<path d="M22 40 V30" stroke="#f0e8d8" stroke-width="1.6"/><path d="M14 30 Q22 22 30 30 Q22 33 14 30 Z" fill="#f0c0c8"/>' +
                '<path d="M22 24 V16" stroke="#f0e8d8" stroke-width="2.4"/><circle cx="22" cy="12" r="3" fill="#f0e8d8"/>' +
                '<path d="M22 18 Q14 10 12 4 M22 18 Q30 10 32 4" stroke="#f0e8d8" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
            '</g>' +
            '</svg>' },
        // the porch: wind chimes under the eave, a garden gnome by the steps
        'wind-chimes': { move: 'wobble', art: '<svg class="placeholder" viewBox="0 0 40 80">' +
            '<path d="M20 0 V10" stroke="#3a2716" stroke-width="1"/><ellipse cx="20" cy="12" rx="14" ry="3" fill="#8a5e3a"/>' +
            '<g stroke="#5a4a3a" stroke-width=".6"><path d="M9 13 V20 M15 14 V18 M20 14 V22 M25 14 V18 M31 13 V20"/></g>' +
            '<g class="g-leg" style="transform-origin: 9px 20px"><rect x="7.5" y="20" width="3" height="34" rx="1.5" fill="#c8ccd0" stroke="#8a929a" stroke-width=".6"/></g>' +
            '<g class="g-leg r" style="transform-origin: 15px 18px"><rect x="13.5" y="18" width="3" height="44" rx="1.5" fill="#c8ccd0" stroke="#8a929a" stroke-width=".6"/></g>' +
            '<g class="g-leg" style="transform-origin: 25px 18px"><rect x="23.5" y="18" width="3" height="40" rx="1.5" fill="#c8ccd0" stroke="#8a929a" stroke-width=".6"/></g>' +
            '<g class="g-leg r" style="transform-origin: 31px 20px"><rect x="29.5" y="20" width="3" height="30" rx="1.5" fill="#c8ccd0" stroke="#8a929a" stroke-width=".6"/></g>' +
            '<path d="M20 22 V66" stroke="#5a4a3a" stroke-width=".6"/><circle cx="20" cy="46" r="3.2" fill="#8a5e3a"/><path d="M16 68 H24 L20 78 Z" fill="#c49a52"/>' +
            '</svg>' },
        gnome: { move: 'hop', art: '<svg class="placeholder" viewBox="0 0 40 60">' +
            '<ellipse cx="20" cy="58" rx="14" ry="2.4" fill="rgba(0,0,0,.25)"/>' +
            '<path d="M8 56 Q6 38 20 36 Q34 38 32 56 Z" fill="#3f6a8a"/><path d="M12 56 V50 M28 56 V50" stroke="#2a1d14" stroke-width="3"/>' +
            '<g class="g-head" style="transform-origin: 20px 36px"><path d="M10 34 Q20 50 30 34 Q28 28 20 28 Q12 28 10 34 Z" fill="#f4f0e4"/>' +
                '<circle cx="20" cy="28" r="6" fill="#e8b89a"/><circle cx="20" cy="30" r="1.8" fill="#d0806a"/>' +
                '<path d="M12 26 Q20 -2 28 26 Z" fill="#b8302a"/></g>' +
            '</svg>' },
        metronome: { move: '', art: '<svg class="placeholder" viewBox="0 0 44 64">' +
            '<path d="M14 4 H30 L42 62 H2 Z" fill="#6e4a30"/><path d="M17 10 H27 L32 50 H12 Z" fill="#eadcb9"/>' +
            '<g class="g-tick" style="transform-origin: 22px 50px"><rect x="21" y="10" width="2" height="41" fill="#3a2716"/><rect x="18" y="20" width="8" height="6" rx="1" fill="#c49a52"/></g>' +
            '<rect x="2" y="56" width="40" height="6" fill="#5a3a24"/>' +
            '</svg>' }
    };
    // (its look is in sky/css/music.css, linked from each page's head)
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

    // the panel's lo-fi switch: its knob slides as the sound changes (sky/css/music.css)
    function drawLofi() {
        if (!ui.lofi) return;
        ui.lofi.classList.toggle('on', lofi.on);
        ui.lofi.setAttribute('aria-pressed', String(lofi.on));
        ui.lofi.setAttribute('aria-label', 'lo-fi (the bitcrush): ' + (lofi.on ? 'on' : 'off'));
        ui.lofi.querySelector('.mu-lofi-state').textContent = lofi.on ? 'on' : 'off';
    }
    listeners.push(function (what) { if (what === 'lofi') drawLofi(); });
    document.documentElement.style.setProperty('--lofi-ms', LOFI_MS + 'ms');

    Sky.music = {
        audio: audio, disc: disc, discOf: discOf, readTags: readTags, albumSongs: albumSongs,
        get tracks() { return tracks; }, get at() { return at; },
        current: current, playing: playing,
        // (for the ambience, sky/ambient.js: a record is on or about to be, and whether a place has hushed the music)
        get busy() { return playing() || wantPlay; }, get hushed() { return hushed; },
        load: load, play: function (i) { if (i === undefined) start(); else load(i, true); },
        pause: pause, toggle: toggle, next: next, prev: prev, stop: stop, hush: hush,
        setTracks: setTracks, setVolume: setVolume, dressGrooves: dressGrooves,
        // the lo-fi slider: Sky.music.lofi.on, .set(true / false), .can (this browser can do it), .ms (how long it slides)
        lofi: { get on() { return lofi.on; }, set: setLofi, get can() { return lofiCan(); }, ms: LOFI_MS,
                get live() { return lofi.built && !!lofi.ctx && lofi.ctx.state === 'running'; }, get node() { return lofi.node; } },
        on: function (fn) { listeners.push(fn); }
    };
})();

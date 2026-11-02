/* =====================================================================
   babble.js — the little voices (Sky.babble): gibberish said one
   syllable at a time, the way little game characters talk. made for the
   companion in the house (sky/kotodama.js), but anything can use it.

     a voice     the companion's (una's), the Claubes' (claube), the robed
                 Claubes' and their chants (imp): VOICES below. how
                 high it sits, the scale its tune keeps to, how long its
                 syllables are, how bright or hollow it sounds, how much
                 its pitch bounces about, a little room around it.
     its sound   two ways of making it:
                   a recording of your own: assets/sounds/kotodama-<voice>
                   (a "sheet": every syllable sung once on its own note,
                   with a gap between each; the companion's midi sings the
                   one it was made from: 30 syllables at A4, then again at
                   C5, then at G4). the sheet is cut up here, in the
                   visitor's browser, wherever it goes quiet, and each
                   syllable is played back nudged to the note it's wanted on.
                   no sheet: a made-up voice, built from scratch every
                   syllable (two oscillators, a chirp of fm, three formant
                   filters shaped like a mouth saying the vowel, a puff of
                   noise for the consonant). this part is Argon's synth
                   (the KOTODAMA voice lab), tidied up.
     what it says  plan(voice, { kind, words | text }): a string of made-up
                 words in that voice's favourite syllables (or real words
                 turned into syllables: the same word always comes out the
                 same), with a tune over the whole line for what kind of
                 line it is: say, ask (up at the end), exclaim, muse ("mm…"),
                 giggle, sigh, gasp, hum (a little sung run)
     saying it   say(voice, plan, { syl, done }): every syllable scheduled on
                 the sound's own clock up front, and syl(event) called as each
                 one sounds (to open a mouth, type a letter, bob)
     a wheee     whee(voice, { pitch }): a squeal flying off, swooping up and
                 falling away into the distance (a Claube flicked away)
     body sounds squish(voice, 'jump' | 'land', how hard): a quiet little
                 gel squish for hopping about (yours, if you add
                 assets/sounds/kotodama-hop / kotodama-land)

   nothing makes a sound before the visitor's first click or key (browsers
   insist), in the asset manager's map, or with the sound effects slider at
   nothing; the timers still run, so whatever's talking still moves its mouth.
   ===================================================================== */

(function () {
    var Sky = window.Sky = window.Sky || {};
    if (Sky.babble) return;
    var root = document.documentElement;
    var MAPPING = root.classList.contains('dav-map');           // (the asset manager's map: no sound)
    var LEVEL = 0.75;                                            // how loud, against the other sound effects

    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function safeHz(f) { return clamp(+f || 440, 20, 18000); }
    // a little random number maker that gives the same numbers for the same seed
    function seeded(seed) {
        var s = (seed >>> 0) || 1;
        return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }
    function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

    /* ======================================================================
       the voices
       ====================================================================== */
    // scales, as steps up from the voice's own note (semitones)
    var SCALES = {
        majpent:   [0, 2, 4, 7, 9],              // sunny, can't go wrong
        phrygdom:  [0, 1, 4, 5, 7, 8, 10],       // mischief (the imp's)
        sugar:    [0, 2, 4, 7, 9]               // the sugar scale (below): A B C# E F#, heard as A6/9
    };

    /* the sugar scale: the sugar drop's own way of singing its words. it's made only of notes the sheet has (A major
       pentatonic, every note sung, so nothing is ever bent): A B C# E F#, heard as one soft A6/9 chord, so any note
       goes with any other. (17 Oct: the artist's call) its home is the octave from C4, and it never goes more than an
       octave either side of it: C3 to B5, so the sheet's E3 to B5 (its top C#6 is never used). what makes it sweet is
       how it moves:
         it lives round A4, F#4 and C#4, the middle of a girl's voice: warm, not squeaky
         it mostly steps, one note at a time; now and then it lifts a little leap up, and always falls back a step after
           (the little "aww" of a sigh)
         a remark comes to rest on A4 or C#4 (the home note and the third: warm, settled)
         a question floats up and stops on B4 or F#5 (the ninth and the sixth: open, curious, never finished)
         an exclamation starts up on E5 and tumbles down to A4 or E4; a giggle climbs, up to B5 at most; a gasp is one
           high E5; a hum rocks like a lullaby round A4
         a sigh drifts down from A4 to C#4; a thinking "mm…" stays low, F#3 to C#4
       SUGAR_NOTES are the sheet's rows (E3 to C#6), and the plan gives each syllable one of them exactly */
    var SUGAR_NOTES = [164.81, 185, 220, 246.94, 277.18, 329.63, 369.99, 440, 493.88, 554.37, 659.26, 739.99, 880, 987.77, 1108.73];
    var SUGAR_LOW = 0, SUGAR_HIGH = 13;           // (rows: E3 to B5, inside an octave either side of C4)
    var SUGAR = {    //  [lowest, highest] (rows), where it starts, where it can end
        say:     { range: [3, 9],  start: [6, 7],   end: [7, 4] },
        ask:     { range: [5, 11], start: [5, 6],   end: [8, 11] },
        exclaim: { range: [6, 12], start: [10, 9],  end: [7, 5] },
        muse:    { range: [1, 4],  start: [3, 4],   end: [2] },
        giggle:  { range: [6, 13], start: [7, 8],   end: null },
        sigh:    { range: [3, 7],  start: [7],      end: [4] },
        gasp:    { range: [9, 12], start: [10],     end: null },
        hum:     { range: [3, 9],  start: [7],      end: [4, 6] }
    };
    function sugarLine(kind, n, r) {
        var S = SUGAR[kind] || SUGAR.say, lo = S.range[0], hi = S.range[1], at = S.start[Math.floor(r() * S.start.length)], out = [at];
        var lullaby = [0, -1, -1, 1, -1, -1, 1, 1];
        for (var i = 1; i < n; i++) {
            var prev = out[i - 1], leapt = i > 1 && prev - out[i - 2] >= 2, step;
            if (kind === 'giggle') step = 1;                                     // (up the stairs)
            else if (kind === 'exclaim') step = r() < 0.75 ? -1 : 0;             // (tumbling down)
            else if (kind === 'hum') step = lullaby[i % lullaby.length];         // (rocking)
            else if (leapt) step = -1;                                           // (after a little leap up, a step back down)
            else {
                var x = r();                                                     // (mostly steps, the odd little leap up)
                step = x < 0.34 ? -1 : x < 0.66 ? 1 : x < 0.78 ? 0 : x < 0.9 ? 2 : x < 0.96 ? -2 : 3;
            }
            out.push(Math.max(lo, Math.min(hi, prev + step)));
        }
        if (S.end && n > 1) {                                                   // (where the line comes to rest)
            var last = out[n - 1], best = S.end[0];
            S.end.forEach(function (e) { if (Math.abs(e - last) < Math.abs(best - last) || (Math.abs(e - last) === Math.abs(best - last) && r() < 0.5)) best = e; });
            out[n - 1] = best;
            if (n > 2 && Math.abs(out[n - 2] - best) > 3) out[n - 2] = best + (out[n - 2] > best ? 1 : -1);   // (and gets there by a step)
        }
        return out;
    }
    // a row's note; a pitch slider moves it by whole rows of the sheet (about 2.4 semitones each), never past C3 to B5
    function sugarHz(row, pitch) {
        row = Math.max(SUGAR_LOW, Math.min(SUGAR_HIGH, row + Math.round((pitch || 0) / 2.4)));
        return SUGAR_NOTES[row];
    }
    // where a mouth rings for each vowel (the made-up voice's filters)
    var VOWELS = {
        a: { f1: 800, f2: 1200, f3: 2600 }, e: { f1: 530, f2: 1850, f3: 2650 }, i: { f1: 300, f2: 2350, f3: 3000 },
        o: { f1: 500, f2: 920, f3: 2450 },  u: { f1: 340, f2: 950, f3: 2350 }
    };
    // the syllables a sheet holds, in the order the companion's midi sings them, and the notes it sings them on
    var SHEET_SYL = 'a i u e o ka ki ku ke ko ma mi mu me mo pa pi pu pe po ta te to na ni no ra ri ru ro'.split(' ');
    var SHEET_ROWS = [440, 523.25, 392];          // A4, then C5, then G4
    // the notes each known sheet sings its rows on, by how many syllables it has (30 a row): the first midi (90),
    // and the sugar drop's full one (450: A major pentatonic, E3 to C#6, lowest first)
    var SHEET_LAYOUTS = { 30: [440], 90: SHEET_ROWS,
        450: [164.81, 185, 220, 246.94, 277.18, 329.63, 369.99, 440, 493.88, 554.37, 659.26, 739.99, 880, 987.77, 1108.73] };
    var SYLLABLES = SHEET_SYL;                    // what every voice's words are made of

    // base: its note (Hz). formant: how small its mouth is (bigger number, smaller creature). q: how
    // ringing the mouth is. bounce: how far each syllable's pitch swoops (minus: down). fm / fmRatio: the
    // chirp at the start of each syllable. dur / gap: a syllable's length and the pause after it (ms).
    // plosive: the puff of a consonant. chirp2: % chance of a second little chirp. vib, vibRate: vibrato
    // when it hums or sings. gliss: how long a sung note slides from the last (ms). erratic: its bounce
    // sometimes goes the other way. favour: the syllables it likes best. squish: the sound of its hops.
    var VOICES = {
        una: {                                     // the sugar drop: your Vocaloid sheet (AI Una Sugar), else a sweet made-up voice
            name: 'una sugar', base: 440, scale: 'sugar', wave: 'tri-sine', formant: 1.5, q: 6.5, hpf: 200, lpf: 9000,
            detune: 6, bounce: 22, fm: 80, fmRatio: 2.5, dur: 84, gap: 36, plosive: 32, chirp2: 16, reverb: 0.16,
            vib: 26, vibRate: 6.2, gliss: 75, erratic: true, color: 0,
            // with the sheet: breathe (0-1) how much of each sung syllable it lets ring out and fade by itself, so
            // they flow into each other instead of being chopped off; pace (ms) a syllable to the next; air (0-1) a
            // made-up breath at the end of each word (none here: the voicebank's own breaths are in the sheet);
            // nopitch: every syllable played exactly as sung, at its own note (the sheet has the notes it needs)
            breathe: 1, pace: 230, air: 0, nopitch: true, melody: 'sugar',
            favour: 'pu mi ra ko no pi ma ni ru'.split(' '), squish: 'sugar'
        },
        // the little Claubes (sky/claubes.js, 31 Oct): high, quick, squeaky toy chirps, a small mouth. gain: how loud
        // against the others (there are seven of them). assets/sounds/kotodama-claube, a sheet of your own, replaces it
        claube: {
            name: 'claube', base: 560, scale: 'majpent', wave: 'pulse-blend', formant: 1.8, q: 8, hpf: 280, lpf: 8800,
            detune: 10, bounce: 32, fm: 150, fmRatio: 3, dur: 54, gap: 34, plosive: 50, chirp2: 26, reverb: 0.12,
            vib: 30, vibRate: 7, gliss: 55, erratic: true, color: 0, gain: 0.6,
            favour: 'ku ro pu ko pi po'.split(' ')
        },
        // the imp (Argon's corrupted one, the companion's evil voice until 21 Oct): the robed Claubes' voice in reset 4,
        // and every Claube's as it chants on the diagram. assets/sounds/kotodama-imp replaces it
        imp: {
            name: 'imp', base: 290, scale: 'phrygdom', wave: 'dual-evil', formant: 1.45, q: 12.5, hpf: 180, lpf: 6400,
            detune: 38, bounce: -42, fm: 320, fmRatio: 1.4, dur: 75, gap: 48, plosive: 75, chirp2: 15, reverb: 0.22,
            vib: 54, vibRate: 7.6, gliss: 145, erratic: true, color: 0.3, gain: 0.7,
            favour: 'ke ki ka ta te ku'.split(' ')
        }
    };
    function voiceOf(name) { return VOICES[name] || VOICES.una; }
    function sheetSlot(name) { return 'assets/sounds/kotodama-' + (VOICES[name] ? name : 'una'); }

    /* ======================================================================
       the sound engine: one for every voice, made on the visitor's first click or key
       ====================================================================== */
    var E = null, awake = false;
    function engine() {
        if (E || MAPPING || !awake) return E;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { E = build((window.Sky && Sky.crush && Sky.crush.context()) || new AC(), level()); } catch (e) { return null; }   // (reset 1: the page's one shared engine)
        return E;
    }
    // the parts every voice plays through: its loudness, a gentle limiter, a small room, a puff of noise
    function build(ctx, gain) {
        var master = ctx.createGain(), limit = ctx.createDynamicsCompressor();
        limit.threshold.value = -8; limit.knee.value = 6; limit.ratio.value = 6; limit.attack.value = 0.003; limit.release.value = 0.12;
        master.gain.value = gain;
        master.connect(limit);
        if (window.Sky && Sky.crush) Sky.crush.out(ctx, limit); else limit.connect(ctx.destination);   // (reset 1: through the bitcrush)
        // a small room: the same for everyone, each voice sends to it as much as it likes
        var hall = ctx.createConvolver(), wet = ctx.createGain();
        var len = Math.floor(ctx.sampleRate * 1.4), ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.1); }
        hall.buffer = ir; wet.gain.value = 0.85;
        hall.connect(wet); wet.connect(master);
        var noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate), nd = noise.getChannelData(0);
        for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
        return { ctx: ctx, master: master, hall: hall, noise: noise };
    }
    function level() {
        var v = Sky.sounds ? Sky.sounds.sfxVolume : 0.7;
        if (v === undefined) v = 0.7;
        if (Sky.sounds && Sky.sounds.hushed) return 0;
        return LEVEL * v / 0.7;
    }
    function running() {
        var e = engine();
        if (!e || document.hidden) return null;
        if (e.ctx.state === 'suspended') { try { e.ctx.resume(); } catch (x) {} }
        if (e.ctx.state !== 'running') return null;
        e.master.gain.setTargetAtTime(level(), e.ctx.currentTime, 0.03);
        return level() > 0.001 ? e : null;
    }
    function wake() {
        if (awake) return;
        awake = true;
        var e = engine();
        if (e && e.ctx.state === 'suspended') { try { e.ctx.resume(); } catch (x) {} }
        Object.keys(wanted).forEach(loadSheet);
    }
    if (!MAPPING) {
        window.addEventListener('pointerdown', wake, true);
        window.addEventListener('keydown', wake, true);
    }

    /* ======================================================================
       a sheet of your own: found, cut up where it goes quiet, each syllable's note measured
       ====================================================================== */
    var sheets = {}, wanted = {};
    // the companion says which voices it'll use; their sheets load once the sound's allowed
    function want(name) { if (!VOICES[name]) return; wanted[name] = 1; if (awake) loadSheet(name); }
    function findSheet(slot, cb) {
        if (Sky.findAsset) return Sky.findAsset(slot + '.ogg|' + slot + '.mp3', function (url) { cb(url); });   // (a sound: say which kinds of file)
        // (outside the site, the content manager's companion page: just try the two kinds of sound file)
        var base = window.BABBLE_BASE || '', tries = [base + slot + '.ogg', base + slot + '.mp3'];
        (function next() {
            var u = tries.shift();
            if (!u) return cb(null);
            fetch(u, { method: 'HEAD', cache: 'no-cache' }).then(function (r) { r.ok ? cb(u) : next(); }, next);
        })();
    }
    function loadSheet(name) {
        if (sheets[name]) return sheets[name];
        var e = engine();
        if (!e) return null;
        sheets[name] = new Promise(function (done) {
            findSheet(sheetSlot(name), function (url) {
                if (!url) return done(null);
                fetch(url).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(function (ab) {
                    return new Promise(function (ok, no) { var p = e.ctx.decodeAudioData(ab, ok, no); if (p && p.then) p.then(ok, no); });
                }).then(function (buf) {
                    var s = chop(buf);
                    s.url = url;
                    VOICES[name].sheetReady = s.slices.length > 0;
                    done(s.slices.length ? s : null);
                }).catch(function () { done(null); });
            });
        });
        sheets[name].then(function (s) { sheets[name].value = s; });
        return sheets[name];
    }
    function sheetNow(name) { var p = sheets[name]; return p && p.value; }

    // cut a sheet wherever it goes quiet (more than 60 ms under 2% of its loudest), keeping a little
    // either side so a soft consonant isn't clipped; then measure each piece's note and loudness
    function chop(buf) {
        var sr = buf.sampleRate, n = buf.length, x = buf.getChannelData(0);
        if (buf.numberOfChannels > 1) {
            var r = buf.getChannelData(1), m = new Float32Array(n);
            for (var i = 0; i < n; i++) m[i] = (x[i] + r[i]) * 0.5;
            x = m;
        }
        var hop = Math.max(1, Math.round(sr * 0.005)), env = [], top = 0;
        for (var a = 0; a + hop <= n; a += hop) {
            var s = 0;
            for (var k = a; k < a + hop; k++) s += x[k] * x[k];
            s = Math.sqrt(s / hop); env.push(s); if (s > top) top = s;
        }
        var thr = Math.max(top * 0.02, 1e-4), segs = [], st = -1, gap = 0;
        for (var h = 0; h < env.length; h++) {
            if (env[h] > thr) { if (st < 0) st = h; gap = 0; }
            else if (st >= 0 && ++gap > 12) { segs.push([st, h - gap + 1]); st = -1; gap = 0; }
        }
        if (st >= 0) segs.push([st, env.length]);
        // each piece's loudest moment; the quiet ones are breaths (the voicebank breathing in or out between notes):
        // each is kept as the tail of the syllable before it, so a syllable played out to its end breathes
        segs = segs.filter(function (g) { return (g[1] - g[0]) * hop / sr > 0.03; }).map(function (g) {
            var pk = 0; for (var q = g[0]; q < g[1]; q++) if (env[q] > pk) pk = env[q];
            return { a: g[0], b: g[1], core: [g[0], g[1]], pk: pk };
        });
        var peaks = segs.map(function (g) { return g.pk; }).sort(function (x, y) { return x - y; }), med = peaks[Math.floor(peaks.length / 2)] || 0;
        var kept = [];
        segs.forEach(function (g) {
            var prev = kept[kept.length - 1];
            if (g.pk < med * 0.3) {
                if (prev && (g.a - prev.b) * hop / sr < 0.5) prev.b = g.b;          // (a breath: onto the end of the syllable before)
                return;                                                            // (a breath before the very first note: dropped)
            }
            kept.push(g);
        });
        var layout = SHEET_LAYOUTS[kept.length];
        var slices = kept.map(function (g, idx) {
            var from = Math.max(0, g.a * hop - Math.round(sr * 0.03)), to = Math.min(n, g.b * hop + Math.round(sr * 0.02));
            var c0 = g.core[0] * hop, c1 = g.core[1] * hop;                        // (the sung part, without its breath)
            var hz = pitchOf(x, sr, c0, c1), rms = 0;
            var r0 = c0 + Math.floor((c1 - c0) * 0.25), r1 = c0 + Math.floor((c1 - c0) * 0.75);
            for (var q = r0; q < r1; q++) rms += x[q] * x[q];
            rms = Math.sqrt(rms / Math.max(1, r1 - r0));
            var label = SHEET_SYL[idx % SHEET_SYL.length], row = Math.floor(idx / SHEET_SYL.length);
            // the note it was sung on: as measured, unless that's far from where the midi put it (an octave slip)
            var want = layout && layout[row];
            if (want && (!hz || Math.abs(12 * Math.log(hz / want) / Math.LN2) > 1.5)) hz = want;
            if (!hz) hz = 440;
            return { syl: label, vowel: label.slice(-1), start: from / sr, dur: (to - from) / sr, sung: (c1 - from) / sr, hz: hz,
                     norm: clamp(0.3 / Math.max(rms, 1e-4), 0.5, 8) };
        });
        // a sheet that isn't 30 or 90 syllables: we don't know which is which, so every piece is just "a sound"
        if (slices.length % SHEET_SYL.length) slices.forEach(function (sl, i) { sl.syl = '?'; sl.vowel = 'aeiou'[i % 5]; });
        return { buffer: buf, slices: slices };
    }
    // a piece's note, by autocorrelation across its middle
    function pitchOf(x, sr, from, to) {
        var mid = Math.floor((from + to) / 2), N = Math.min(2048, to - from), a = Math.max(from, mid - (N >> 1));
        if (N < 512) return 0;
        var lo = Math.floor(sr / 1000), hi = Math.floor(sr / 70), best = 0, bestLag = 0;
        for (var lag = lo; lag < hi && lag < N; lag++) {
            var s = 0;
            for (var i = 0; i < N - lag; i += 2) s += x[a + i] * x[a + i + lag];
            if (s > best) { best = s; bestLag = lag; }
        }
        return bestLag ? sr / bestLag : 0;
    }

    /* ======================================================================
       what it says: a plan of syllables, each with its note, length and time
       ====================================================================== */
    // the tune over a line, by what kind of line it is: u goes 0…1 across the line, the answer is scale
    // steps above the voice's middle (2 steps up its scale)
    var TUNES = {
        say:     function (u) { return Math.sin(u * Math.PI) * 2.2 - u * 1.2; },                 // up and back down
        ask:     function (u) { return u < 0.7 ? Math.sin(u / 0.7 * Math.PI) * 1.4 : (u - 0.7) / 0.3 * 4; },  // and up at the end
        exclaim: function (u) { return 3.2 - u * 2.6; },                                          // starts high, tumbles
        muse:    function (u) { return -1.5 + Math.sin(u * Math.PI) * 0.8; },                     // low and wandering
        giggle:  function (u) { return 1 + u * 3; },                                              // up the stairs
        sigh:    function (u) { return 1 - u * 4; },                                              // all the way down
        gasp:    function (u) { return 3 + u; },
        hum:     function (u) { return Math.round(Math.sin(u * Math.PI * 1.5) * 3); }             // a little tune
    };
    var LENGTH = { say: 1, ask: 1, exclaim: 0.85, muse: 2.6, giggle: 0.6, sigh: 2.4, gasp: 1.3, hum: 2.1 };
    var LOUD = { say: 0.9, ask: 0.9, exclaim: 1.1, muse: 0.55, giggle: 0.85, sigh: 0.7, gasp: 1, hum: 0.75 };
    var MARK = { say: '.', ask: '?', exclaim: '!', muse: '…', giggle: '!', sigh: '…', gasp: '!', hum: '~' };

    // a made-up word, from the voice's favourite syllables (a favourite is three times as likely)
    function word(V, r, n) {
        var w = [], pool = SYLLABLES.concat(V.favour || [], V.favour || [], V.favour || []);
        for (var i = 0; i < n; i++) {
            var s = pool[Math.floor(r() * pool.length)];
            if (i && r() < 0.18 && w[i - 1].length > 1) s = w[i - 1];   // (puu-pu: doubled now and then)
            else if (i && s.length === 1) {                              // (a bare vowel only starts a word: "aa" reads oddly)
                var v = s, fit = SYLLABLES.filter(function (x) { return x.length > 1 && x.slice(-1) === v; });
                s = fit[Math.floor(r() * fit.length)];
            }
            w.push(s);
        }
        return w;
    }
    // a real word as syllables: the same word always comes out the same, its vowels kept where they can be
    function wordOfText(w, V) {
        var letters = w.toLowerCase().replace(/[^a-z0-9]/g, ''), h = hash(letters), r = seeded(h);
        var n = clamp(Math.ceil(letters.length / 2.4), 1, 4), vowels = letters.replace(/[^aeiou]/g, ''), out = [];
        for (var i = 0; i < n; i++) {
            var want = vowels[i] || 'aeiou'[(h >> (i * 3)) % 5];
            var fits = SYLLABLES.filter(function (s) { return s.slice(-1) === want; });
            out.push(fits[Math.floor(r() * fits.length)] || 'a');
        }
        return out;
    }
    function scaleNote(V, step) {
        var sc = SCALES[V.scale] || SCALES.majpent, len = sc.length;
        var oct = Math.floor(step / len), deg = ((step % len) + len) % len;
        return sc[deg] + 12 * oct;
    }

    // plan(voice, { kind, words, text, seed, speed, pitch })
    //   kind   say | ask | exclaim | muse | giggle | sigh | gasp | hum
    //   words  how many made-up words (else 1-4, by kind); text: real words instead
    //   speed  1 = its usual pace; pitch: semitones up (or down) for the whole line
    // gives { voice, kind, events: [{ t, syl, txt, hz, dur, vowel, loud, sing, muse, first, last }], total, text }
    function plan(name, o) {
        o = o || {};
        var V = voiceOf(name), kind = TUNES[o.kind] ? o.kind : 'say';
        var r = seeded(o.seed !== undefined ? o.seed : (Math.random() * 4294967296) >>> 0);
        var words = [], marks = [];
        if (o.text) {
            String(o.text).split(/\s+/).filter(Boolean).forEach(function (tok) {
                var bare = tok.replace(/[^\w'’]/g, '');
                if (!bare) { if (marks.length) marks[marks.length - 1] += tok; return; }
                words.push({ syl: wordOfText(bare, V), show: tok.replace(/[^\w'’]+$/, '') });
                marks.push((tok.match(/[^\w'’]+$/) || [''])[0]);
            });
        } else if (kind === 'muse') {
            words = [{ syl: ['mu'], show: 'mm' }];
            if (r() < 0.6) words.push({ syl: ['mu', 'mu'], show: 'hmm' });
            marks = words.map(function () { return '…'; });
        } else if (kind === 'giggle') {
            var g = 2 + Math.floor(r() * 3), gs = r() < 0.5 ? 'e' : 'i', gw = [];
            for (var gi = 0; gi < g; gi++) gw.push(gi ? 'ki' : gs);
            words = [{ syl: gw, show: gs + gw.slice(1).map(function () { return gs === 'e' ? 'he' : 'hi'; }).join('') }];
            marks = ['!'];
        } else if (kind === 'sigh') {
            words = [{ syl: ['a', 'u'], show: 'haa' }]; marks = ['…'];
        } else if (kind === 'gasp') {
            var gp = r() < 0.5 ? 'o' : 'a';
            words = [{ syl: [gp], show: gp }]; marks = ['!'];
        } else {
            var nw = o.words || ({ say: 2 + Math.floor(r() * 3), ask: 1 + Math.floor(r() * 3), exclaim: 1 + Math.floor(r() * 2), hum: 2 }[kind] || 2);
            for (var wi = 0; wi < nw; wi++) {
                var sy = word(V, r, kind === 'hum' ? 2 + Math.floor(r() * 2) : 1 + Math.floor(r() * (r() < 0.3 ? 3 : 2)));
                words.push({ syl: sy, show: sy.join('') });
                marks.push(wi === nw - 1 ? MARK[kind] : (r() < 0.15 ? ',' : ''));
            }
            if (kind === 'hum') words.forEach(function (w) { w.show = w.syl.join('-'); });
        }
        // timing and tune
        var all = 0; words.forEach(function (w) { all += w.syl.length; });
        // (talking with its sheet, a voice that breathes keeps its own pace: sung syllables are longer than made-up chirps)
        var pace = V.sheetReady && V.pace ? V.pace : V.dur + V.gap;
        var speed = (o.speed || 1), step = pace / 1000 / speed * (LENGTH[kind] || 1);
        var events = [], t = V.sheetReady && V.air ? 0.16 : 0, i = 0, mid = 2, lastHz = 0, text = '';   // (room for a breath in first)
        var sing = kind === 'hum' || kind === 'muse' || kind === 'sigh';
        var sweet = V.melody === 'sugar' ? sugarLine(kind, all, r) : null;
        words.forEach(function (w, wi) {
            var shown = '';
            w.syl.forEach(function (s, si) {
                var u = all > 1 ? i / (all - 1) : 0.5;
                var lift = TUNES[kind](u) + (kind === 'say' || kind === 'ask' ? (r() - 0.5) * 1.6 : 0);
                var semi = scaleNote(V, Math.round(mid + lift)) + (o.pitch || 0);
                var hz = sweet ? sugarHz(sweet[i], o.pitch) : V.base * Math.pow(2, semi / 12);
                var first = si === 0, last = si === w.syl.length - 1;
                var dur = step * (sing ? 0.95 : 0.62) * (last && wi === words.length - 1 ? 1.5 : 1) * (0.9 + r() * 0.2);
                // the letters shown as this syllable sounds (the shown word, shared out across its syllables)
                var cut = Math.round(w.show.length * (si + 1) / w.syl.length), piece = w.show.slice(shown.length, cut);
                shown += piece;
                var txt = (first && wi ? ' ' : '') + piece + (last ? marks[wi] || '' : '');
                text += txt;
                events.push({ t: t, syl: s, txt: txt, hz: hz, dur: dur, vowel: s.slice(-1), loud: LOUD[kind] * (kind === 'exclaim' && first ? 1.1 : 1),
                              sing: sing, muse: kind === 'muse', glideFrom: lastHz || hz * 0.94, first: first, last: last,
                              ask: kind === 'ask' && last && wi === words.length - 1, exclaim: kind === 'exclaim' || kind === 'gasp', word: wi });
                lastHz = hz; i++;
                t += step * (sweet ? 0.8 + r() * 0.4 : 0.88 + r() * 0.24);   // (the sugar drop's pace wanders more: it's thinking as it talks)
            });
            var m = marks[wi] || '';
            t += /[.!?…]/.test(m) ? step * 2.2 : (/,/.test(m) ? step * 1.5 : step * (sing ? 0.3 : 0.7));
        });
        events.forEach(function (ev, k) { var nx = events[k + 1]; ev.next = nx ? nx.t - ev.t : null; ev.wordEnd = ev.last; ev.lineStart = k === 0; });
        var tail = events.length ? events[events.length - 1] : null;
        return { voice: name, kind: kind, events: events, total: tail ? tail.t + tail.dur + 0.1 : 0.2, text: text.trim() };
    }

    /* ======================================================================
       saying it: everything scheduled up front, and syl(event) called as each syllable sounds
       ====================================================================== */
    function say(name, P, hooks) {
        hooks = hooks || {};
        if (typeof P === 'string' || !P || !P.events) P = plan(name, typeof P === 'string' ? { kind: P } : P);
        var V = voiceOf(name), e = running(), timers = [], bus = null, done = false;
        var lead = 0.05;
        if (e) {
            var now = e.ctx.currentTime + lead, sheet = sheetNow(name);
            bus = e.ctx.createGain(); bus.gain.value = V.gain || 1;
            var send = e.ctx.createGain(); send.gain.value = V.reverb;
            bus.connect(e.master); bus.connect(send); send.connect(e.hall);
            P.events.forEach(function (ev) {
                try { (sheet ? sampleSyl : synthSyl)(e, V, ev, now + ev.t, bus, sheet); } catch (x) {}
            });
        }
        P.events.forEach(function (ev) {
            timers.push(setTimeout(function () { if (hooks.syl) hooks.syl(ev, P); }, (lead + ev.t) * 1000));
        });
        timers.push(setTimeout(finish, (lead + P.total) * 1000));
        function finish() { if (done) return; done = true; if (hooks.done) hooks.done(P); }
        return {
            plan: P, total: P.total,
            stop: function () {
                timers.forEach(clearTimeout); timers = [];
                if (bus && e) { var t = e.ctx.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(0, t + 0.06); }
                done = true;
            }
        };
    }

    // whee(voice, { pitch, dur }): a squeal flying off, "wheeee": one long ee that swoops up an octave in its first fifth,
    // then falls away below where it started, fading and dulling as it goes (a Claube flicked away: sky/claubes.js)
    function whee(name, o) {
        o = o || {};
        var V = voiceOf(name), f = V.base * 1.6 * Math.pow(2, (o.pitch || 0) / 12), dur = o.dur || 1.1;
        var ev = { t: 0, syl: 'i', txt: 'wheee!', hz: f, dur: dur, vowel: 'i', loud: 1.5, exclaim: true, away: true,
                   path: [[0, f * 0.75], [0.18, f * 1.6], [0.45, f * 1.2], [1, f * 0.5]], first: true, last: true, word: 0, next: null, wordEnd: true, lineStart: true };
        return say(name, { voice: name, kind: 'whee', events: [ev], total: dur + 0.1, text: 'wheee!' }, o);
    }

    // one syllable, made up: two oscillators, an fm chirp, three mouth filters, a puff for the consonant
    function synthSyl(e, V, ev, t, out) {
        var ctx = e.ctx, f0 = safeHz(ev.hz), dur = clamp(ev.dur, 0.03, 2.5);
        var startF, endF, glide;
        if (ev.sing) {
            startF = safeHz(ev.glideFrom); endF = f0; glide = Math.min(dur * 0.55, V.gliss / 1000);
        } else {
            var b = V.bounce;
            if (V.erratic && Math.random() < 0.3) b = -b * 0.8;
            if (ev.ask) b = Math.abs(b) + 38; else if (ev.exclaim) b = Math.abs(b) + 24;
            startF = safeHz(b >= 0 ? f0 / (1 + b / 140) : f0 * (1 + Math.abs(b) / 110));
            endF = safeHz(b >= 0 ? f0 * (1 + b / 100) : f0 * Math.max(0.45, 1 - Math.abs(b) / 110));
            glide = dur * 0.92;
        }
        var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain(), two = true, sub = 1;
        switch (V.wave) {
            case 'pulse-blend': o1.type = 'triangle'; o2.type = 'square';   g2.gain.value = 0.38; break;
            case 'dual-evil':   o1.type = 'sawtooth'; o2.type = 'square';   g2.gain.value = 0.65; break;
            case 'tri-sine':   o1.type = 'triangle'; o2.type = 'sine';     g2.gain.value = 0.5; break;
            default:            o1.type = V.wave || 'sawtooth'; o2.type = o1.type; g2.gain.value = 0.55; two = V.detune > 0;
        }
        if (ev.path) {
            // a pitch path of its own ([share of the syllable, Hz], …): the wheee
            [o1].concat(two ? [o2] : []).forEach(function (o, n) {
                var k = n ? sub : 1;
                ev.path.forEach(function (p, i) { if (i) o.frequency.exponentialRampToValueAtTime(safeHz(p[1] * k), t + p[0] * dur); else o.frequency.setValueAtTime(safeHz(p[1] * k), t); });
            });
            if (two) o2.detune.setValueAtTime(V.detune, t);
        } else {
            o1.frequency.setValueAtTime(startF, t); o1.frequency.exponentialRampToValueAtTime(endF, t + glide);
            if (two) {
                o2.frequency.setValueAtTime(safeHz(startF * sub), t); o2.frequency.exponentialRampToValueAtTime(safeHz(endF * sub), t + glide);
                o2.detune.setValueAtTime(V.detune, t);
            }
        }
        // vibrato on a held note
        if ((ev.sing || ev.path) && V.vib > 0) {
            var vo = ctx.createOscillator(), vg = ctx.createGain();
            vo.frequency.value = V.vibRate; vg.gain.setValueAtTime(0.001, t); vg.gain.linearRampToValueAtTime(V.vib, t + Math.min(dur * 0.3, 0.12) + 0.05);
            vo.connect(vg); vg.connect(o1.detune); if (two) vg.connect(o2.detune);
            vo.start(t); vo.stop(t + dur + 0.03);
        }
        // the chirp: a quick wobble of fm at the start of the syllable
        var fm = ctx.createOscillator(), fg = ctx.createGain(), chirp = ev.sing ? V.fm * 0.22 : V.fm;
        fm.frequency.value = safeHz(f0 * V.fmRatio);
        fg.gain.setValueAtTime(Math.max(0.1, chirp), t); fg.gain.exponentialRampToValueAtTime(Math.max(0.1, chirp * 0.12), t + dur);
        fm.connect(fg); fg.connect(o1.frequency); if (two) fg.connect(o2.frequency);
        // the mouth: three filters where the vowel rings, a little dry tone under them
        var vw = VOWELS[ev.muse ? 'u' : ev.vowel] || VOWELS.a, hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = safeHz(V.hpf);
        lp.type = 'lowpass'; lp.frequency.value = safeHz(ev.muse ? Math.min(V.lpf, 1400) : V.lpf);
        var boost = Math.min(2.2, 1.1 + V.q / 14), dry = ctx.createGain();
        dry.gain.value = V.formant < 0.7 ? 0.34 : 0.24;
        o1.connect(hp); if (two) { o2.connect(g2); g2.connect(hp); }
        hp.connect(dry); dry.connect(lp);
        [[vw.f1, 1, 1.45], [vw.f2, 1.15, 1.22], [vw.f3, 1.25, 0.55]].forEach(function (f) {
            var bp = ctx.createBiquadFilter(), gg = ctx.createGain();
            bp.type = 'bandpass'; bp.frequency.value = safeHz(f[0] * V.formant); bp.Q.value = clamp(V.q * f[1], 0.5, 25);
            gg.gain.value = f[2] * boost;
            hp.connect(bp); bp.connect(gg); gg.connect(lp);
        });
        var env = ctx.createGain(), att = ev.sing ? Math.min(0.04, dur * 0.14) : 0.006, rel = ev.sing ? Math.min(0.16, dur * 0.4) : Math.min(0.032, dur * 0.36);
        var peak = 0.5 * (ev.loud || 1);
        env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(peak, t + att);
        if (ev.away) {
            // flying off into the distance: fading the whole way, and duller as it goes
            env.gain.exponentialRampToValueAtTime(peak * 0.6, t + dur * 0.3); env.gain.exponentialRampToValueAtTime(peak * 0.25, t + dur * 0.7); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            lp.frequency.setValueAtTime(lp.frequency.value, t + dur * 0.25); lp.frequency.exponentialRampToValueAtTime(1200, t + dur);
        } else {
            env.gain.setValueAtTime(peak * 0.9, t + Math.max(att, dur - rel)); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        }
        lp.connect(env); env.connect(out);
        consonant(e, V, ev, t, out, vw);
        o1.start(t); fm.start(t); o1.stop(t + dur + 0.03); fm.stop(t + dur + 0.03);
        if (two) { o2.start(t); o2.stop(t + dur + 0.03); }
        // and now and then a second little chirp, a fourth up
        if (!ev.sing && !ev.path && !ev.second && V.chirp2 && Math.random() * 100 < V.chirp2) {
            synthSyl(e, V, { hz: f0 * Math.pow(2, 5 / 12), dur: dur * 0.55, vowel: 'i', syl: 'i', loud: (ev.loud || 1) * 0.7, second: true }, t + dur * 0.78, out);
        }
    }
    // the consonant: a puff of noise, sharp for p t k, soft for m n r, none for a bare vowel
    function consonant(e, V, ev, t, out, vw) {
        var c = ev.syl && ev.syl.length > 1 ? ev.syl[0] : '';
        if (!c || !V.plosive) return;
        var hard = /[ptkc]/.test(c) ? 1 : (/[bdg]/.test(c) ? 0.7 : 0.3);
        var ctx = e.ctx, src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = e.noise;
        bp.type = 'bandpass'; bp.frequency.value = safeHz(vw.f2 * V.formant * (c === 's' || c === 'c' ? 2.4 : 1.4)); bp.Q.value = 2.5;
        var amt = Math.max(0.001, V.plosive / 100 * (ev.sing ? 0.08 : 0.34) * hard), len = hard < 0.5 ? 0.03 : 0.014;
        g.gain.setValueAtTime(amt, t); g.gain.exponentialRampToValueAtTime(0.0005, t + len);
        src.connect(bp); bp.connect(g); g.connect(out);
        src.start(t); src.stop(t + len + 0.005);
    }

    // one syllable from a sheet: the piece that says it, sung nearest the note it's wanted on, nudged there
    function sampleSyl(e, V, ev, t, out, sheet) {
        var ctx = e.ctx, f0 = safeHz(ev.hz), list = sheet.slices.filter(function (s) { return s.syl === ev.syl; });
        if (!list.length) list = sheet.slices.filter(function (s) { return s.vowel === ev.vowel; });
        if (!list.length) list = sheet.slices;
        var sl = list[0], best = Infinity;
        list.forEach(function (s) { var d = Math.abs(Math.log(f0 / s.hz)); if (d < best) { best = d; sl = s; } });
        var rate = V.nopitch ? 1 : clamp(f0 / sl.hz, 0.6, 1.6), dur = clamp(ev.dur, 0.05, 2.5);
        var src = ctx.createBufferSource();
        src.buffer = sheet.buffer;
        var held = ev.sing || ev.muse, natural = sl.dur / rate;
        if (V.nopitch) {
            // exactly as sung: its own note, its own vibrato, its own breath. a held note is the syllable sung out to the
            // end; a quick one rings into the next and fades there (the whole of it, breath and all, at a word's end)
            var br = clamp(V.breathe || 0, 0, 1), whole = natural * (0.5 + 0.5 * br);
            dur = br >= 1 || held || ev.wordEnd || ev.next === null ? whole : Math.max(Math.min(whole, ev.next + 0.05 + 0.12 * br), Math.min(natural, ev.dur));
        } else if (ev.path) {
            // the wheee: the vowel's steady middle looped, carried along the pitch path
            src.loop = true; src.loopStart = sl.start + sl.dur * 0.32; src.loopEnd = sl.start + sl.dur * 0.72;
            ev.path.forEach(function (p, i) {
                var r = clamp(p[1] / sl.hz, 0.5, 2.5);
                if (i) src.playbackRate.exponentialRampToValueAtTime(r, t + p[0] * dur); else src.playbackRate.setValueAtTime(r, t);
            });
        } else if (held && dur > natural * 0.8) {
            // a held note: loop the steady middle of the vowel, with vibrato
            src.loop = true; src.loopStart = sl.start + sl.dur * 0.32; src.loopEnd = sl.start + sl.dur * 0.72;
            var fromRate = clamp(safeHz(ev.glideFrom) / sl.hz, 0.6, 1.6);
            src.playbackRate.setValueAtTime(fromRate, t); src.playbackRate.exponentialRampToValueAtTime(rate, t + Math.min(dur * 0.5, V.gliss / 1000));
            if (V.vib > 0) {
                var vo = ctx.createOscillator(), vg = ctx.createGain();
                vo.frequency.value = V.vibRate; vg.gain.setValueAtTime(0.001, t); vg.gain.linearRampToValueAtTime(V.vib * 0.8, t + Math.min(dur * 0.4, 0.2));
                vo.connect(vg); vg.connect(src.detune); vo.start(t); vo.stop(t + dur + 0.05);
            }
        } else {
            // talking: a little swoop through the syllable, as the made-up voice does (gentler on a voice that breathes)
            var breathe = clamp(V.breathe || 0, 0, 1), b = V.bounce * 0.6 * (1 - breathe * 0.6);
            if (V.erratic && Math.random() < 0.3) b = -b * 0.8;
            if (ev.ask) b = Math.abs(b) + 30; else if (ev.exclaim) b = Math.abs(b) + 16;
            var r0 = clamp(b >= 0 ? rate / (1 + b / 160) : rate * (1 + Math.abs(b) / 130), 0.5, 2), r1 = clamp(b >= 0 ? rate * (1 + b / 120) : rate * Math.max(0.5, 1 - Math.abs(b) / 130), 0.5, 2);
            src.playbackRate.setValueAtTime(r0, t); src.playbackRate.exponentialRampToValueAtTime(r1, t + dur * 0.9);
            if (breathe > 0) {
                // breathing: most of the syllable as it was sung, ringing on into the start of the next one and fading
                // there on its own, all of it at the end of a word (its tail is the breath out)
                var keep = natural * (0.45 + 0.55 * breathe);
                dur = ev.wordEnd || ev.next === null ? keep : Math.min(keep, ev.next + 0.05 + 0.1 * breathe);
                dur = Math.max(dur, Math.min(natural, ev.dur));
            } else dur = Math.min(dur * 1.35, natural);        // (the syllable as sung, cut short if the line's quick)
        }
        var hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), env = ctx.createGain();
        hp.type = 'highpass'; hp.frequency.value = safeHz(Math.min(V.hpf, 160));
        lp.type = 'lowpass'; lp.frequency.value = safeHz(ev.muse ? 1100 : Math.max(V.lpf, 7000));
        src.connect(hp); hp.connect(lp);
        // a touch of the voice's own mouth colour over the recording
        if (V.color > 0) {
            var vw = VOWELS[ev.vowel] || VOWELS.a, bp = ctx.createBiquadFilter(), cg = ctx.createGain();
            bp.type = 'bandpass'; bp.frequency.value = safeHz(vw.f2 * V.formant * 0.8); bp.Q.value = 4;
            cg.gain.value = V.color * 2;
            hp.connect(bp); bp.connect(cg); cg.connect(lp);
        }
        var soft = clamp(V.breathe || 0, 0, 1);
        var peak = clamp(0.9 * sl.norm * (ev.loud || 1), 0, 3), att = held ? 0.03 : 0.004 + 0.008 * soft;
        var rel = held ? Math.min(0.18, dur * 0.4) : (soft ? Math.min(dur * 0.55, 0.05 + 0.13 * soft) : Math.min(0.03, dur * 0.3));
        env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(peak, t + att);
        if (ev.away) {                                     // (flying off: fading the whole way, duller as it goes)
            env.gain.exponentialRampToValueAtTime(peak * 0.6, t + dur * 0.3); env.gain.exponentialRampToValueAtTime(peak * 0.25, t + dur * 0.7); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            lp.frequency.setValueAtTime(lp.frequency.value, t + dur * 0.25); lp.frequency.exponentialRampToValueAtTime(1200, t + dur);
        } else {
            env.gain.setValueAtTime(peak * 0.92, t + Math.max(att, dur - rel));
            if (soft && (!held || V.nopitch)) { env.gain.setTargetAtTime(0.0001, t + Math.max(att, dur - rel), rel / 3.2); dur += 0.02; }   // (a natural fade, not a cut)
            else env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        }
        lp.connect(env); env.connect(out);
        if (V.air && (ev.wordEnd || ev.lineStart)) breath(e, V, ev, ev.lineStart && !ev.wordEnd ? t - 0.16 : t + dur * 0.55, out, ev.lineStart && !ev.wordEnd);
        if (src.loop) src.start(t, sl.start); else src.start(t, sl.start, Math.min(sl.dur, dur * Math.max(rate, 1) * 1.3 + 0.02));
        src.stop(t + dur + 0.03);
    }

    // a soft breath: a little air through the mouth, out at the end of a word (in, just before it starts talking)
    function breath(e, V, ev, t, out, inhale) {
        var ctx = e.ctx;
        if (t < ctx.currentTime) t = ctx.currentTime;
        var src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
        var len = inhale ? 0.14 : 0.18, vw = VOWELS[ev.vowel] || VOWELS.a;
        var noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate), nd = noise.getChannelData(0);
        for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        src.buffer = noise;
        bp.type = 'bandpass'; bp.frequency.value = safeHz(inhale ? 2200 : vw.f2 * 1.1); bp.Q.value = 0.9;
        hp.type = 'highpass'; hp.frequency.value = 700;
        var amt = 0.05 * clamp(V.air, 0, 1) * (ev.loud || 1);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(amt, t + len * (inhale ? 0.6 : 0.25));
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(out);
        src.start(t); src.stop(t + len + 0.01);
    }

    // the same line made into a recording (a sound file's worth of samples), without playing it: for
    // the content manager's companion page ("save it as a sound") and for checking how it sounds
    function render(name, P) {
        if (!P || !P.events) P = plan(name, P);
        var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, sr = 44100;
        var ctx = new OAC(2, Math.ceil(sr * (P.total + 1.6)), sr), e = build(ctx, LEVEL), V = voiceOf(name), sheet = sheetNow(name);
        var bus = ctx.createGain(), send = ctx.createGain();
        bus.gain.value = V.gain || 1;
        send.gain.value = V.reverb;
        bus.connect(e.master); bus.connect(send); send.connect(e.hall);
        P.events.forEach(function (ev) { (sheet ? sampleSyl : synthSyl)(e, V, ev, 0.05 + ev.t, bus, sheet); });
        return ctx.startRendering();
    }

    /* ======================================================================
       the body's sounds: a quiet little squish as it hops up and lands (Argon's gel squishes)
       ====================================================================== */
    var lastSquish = 0, ownSquish = {};
    ['hop', 'land'].forEach(function (k) {
        var slot = 'assets/sounds/kotodama-' + k;
        if (Sky.findAsset && !MAPPING) Sky.findAsset(slot + '.ogg|' + slot + '.mp3', function (url) { ownSquish[k] = !!url; });
    });
    var SQUISH = {
        // [wave, sub wave, start, middle, end (Hz, jump), the same landing, sub gain, filter from, to, Q]
        sugar:  ['sine', 'triangle', [520, 880, 1180], [900, 620, 980], 0.24, [1600, 2600], 5.2]     // a sugary little pip
    };
    function squish(name, phase, k) {
        var now = performance.now();
        if (now - lastSquish < 110) return;
        lastSquish = now;
        var jump = phase === 'jump', own = jump ? 'hop' : 'land';
        if (ownSquish[own] && Sky.sfx) { Sky.sfx('kotodama-' + own, { volume: clamp(0.25 + (k || 0.7) * 0.5, 0, 1) }); return; }
        var e = running();
        if (!e) return;
        var V = voiceOf(name), S = SQUISH[V.squish] || SQUISH.sugar, ctx = e.ctx, t = ctx.currentTime;
        var vel = clamp(k || 0.7, 0.2, 1.4), peak = 0.06 * vel, dur = 0.12;
        var f = jump ? S[2] : S[3], o = ctx.createOscillator(), s = ctx.createOscillator(), sg = ctx.createGain(), bp = ctx.createBiquadFilter(), env = ctx.createGain();
        o.type = S[0]; s.type = S[1]; sg.gain.value = S[4];
        o.frequency.setValueAtTime(f[0], t); o.frequency.exponentialRampToValueAtTime(f[1], t + dur * 0.4); o.frequency.exponentialRampToValueAtTime(f[2], t + dur);
        s.frequency.setValueAtTime(f[0] * 1.5, t); s.frequency.exponentialRampToValueAtTime(f[2] * 1.4, t + dur);
        bp.type = 'bandpass'; bp.Q.value = S[6];
        bp.frequency.setValueAtTime(S[5][0], t); bp.frequency.exponentialRampToValueAtTime(S[5][1], t + dur);
        env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(peak, t + 0.012); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(bp); s.connect(sg); sg.connect(bp); bp.connect(env); env.connect(e.master);
        o.start(t); s.start(t); o.stop(t + dur + 0.02); s.stop(t + dur + 0.02);
        // the sugar drop's landing tinkles, a crystal of sugar against the floor
        if (V.squish === 'sugar' && !jump) {
            var tk = ctx.createOscillator(), tg = ctx.createGain();
            tk.type = 'sine'; tk.frequency.value = 2400 + Math.random() * 900;
            tg.gain.setValueAtTime(0.0001, t + 0.02); tg.gain.linearRampToValueAtTime(peak * 0.35, t + 0.026); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
            tk.connect(tg); tg.connect(e.master); tk.start(t + 0.02); tk.stop(t + 0.22);
        }
    }

    Sky.babble = {
        voices: VOICES, scales: SCALES, syllables: SYLLABLES,
        voice: voiceOf, plan: plan, say: say, whee: whee, render: render, squish: squish, want: want, wake: wake, chop: chop,
        sheet: function (name) { want(name); return sheets[name] || Promise.resolve(null); },
        get awake() { return awake; }, get ctx() { return E && E.ctx; }
    };
})();

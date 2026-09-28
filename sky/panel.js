/* =====================================================================
   panel.js — the control panel in the top-right corner, and the sound
   engine the weather and the noise machine share.

       <script src="sky/panel.js"></script>     (every page, after sky/sky.js,
                                                 before music.js / weather.js / noise.js)

   THE PANEL is a stack of LAYERS (music, weather, the noise machine …).
   Each is its own file that adds itself; to add another one later:

       Sky.panel.add({
           id: 'lights', title: 'fairy lights', order: 40,
           icon: '<svg …>…</svg>',                 // drawn icon (slot: assets/ui/lights)
           build: function (body) { … },           // fill the layer's box once
           status: function () { return 'on'; },   // the little line under its title
           active: function () { return true; },   // is it doing something right now?
           badge: function () { return '<svg …>'; } // shown on the closed panel while active
       });
       Sky.panel.refresh('lights');                 // call when its status changes
       Sky.panel.open('lights');                    // open the panel at this layer

   ART: assets/ui/panel (the button), assets/ui/<layer id> (each layer's icon).

   SOUNDS: Sky.sounds.channel('rain') is a sound you can turn up and down.
   Each is made right here, unless there's a recording of your own at
   assets/sounds/<name>.mp3 (or .ogg), which is used instead (looped).
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.panel) return;

    /* ======================================================================
       the sound engine
       ====================================================================== */
    var ctx = null, master = null, wanted = false;
    function ac() {
        if (ctx) return ctx;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.connect(ctx.destination);
        ctx.onstatechange = function () { refreshAll(); };
        return ctx;
    }
    // browsers only let sound start once you've clicked or tapped the page
    var pendingFiles = [];
    function wake() {
        if (ctx && ctx.state !== 'running') ctx.resume().then(refreshAll, function () {});
        pendingFiles.splice(0).forEach(function (a) { if (!a._ch || a._ch.level > 0.001) a.play().catch(function () {}); });   // (not one that's been turned down since)
        channels.forEach(function (c) { c.blocked = false; });
    }
    ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { document.addEventListener(ev, wake, { capture: true, passive: true }); });

    var bufs = {};
    function noiseBuf(color, seconds) {
        var key = color + seconds;
        if (bufs[key]) return bufs[key];
        var n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
        var last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (var i = 0; i < n; i++) {
            var w = Math.random() * 2 - 1;
            if (color === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
            else if (color === 'pink') {
                b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
                b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
                d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
            } else if (color === 'crackle') {
                d[i] = 0;
            } else d[i] = w;
        }
        if (color === 'crackle') {                                  // pops and snaps, scattered
            for (var c = 0; c < seconds * 9; c++) {
                var at = Math.floor(Math.random() * (n - 2000)), len = 40 + Math.floor(Math.random() * 500), amp = 0.2 + Math.random() * 0.8;
                for (var j = 0; j < len; j++) d[at + j] += (Math.random() * 2 - 1) * amp * Math.pow(1 - j / len, 3);
            }
        }
        // soften the loop's seam
        var fade = Math.min(2000, n / 4);
        for (var f = 0; f < fade; f++) { var k = f / fade; d[f] *= k; d[n - 1 - f] *= k; }
        return (bufs[key] = buf);
    }
    function loop(color, seconds) {
        var s = ctx.createBufferSource();
        s.buffer = noiseBuf(color, seconds);
        s.loop = true;
        s.start(ctx.currentTime + Math.random() * 0.05);
        return s;
    }
    function filter(type, freq, q) {
        var f = ctx.createBiquadFilter();
        f.type = type; f.frequency.value = freq;
        if (q) f.Q.value = q;
        return f;
    }
    function gain(v) { var g = ctx.createGain(); g.gain.value = v; return g; }
    function lfo(hz, depth, target) {                               // a slow wobble on a setting
        var o = ctx.createOscillator(), g = gain(depth);
        o.frequency.value = hz;
        o.connect(g); g.connect(target);
        o.start();
        return o;
    }
    function chain() { for (var i = 0; i + 1 < arguments.length; i++) arguments[i].connect(arguments[i + 1]); return arguments[arguments.length - 1]; }

    // each sound, made from noise and filters. out = where it goes. returns an optional tick(level) for timed things
    var SYNTHS = {
        white: function (out) { chain(loop('white', 3), gain(0.35), out); },
        pink:  function (out) { chain(loop('pink', 4), gain(0.9), out); },
        brown: function (out) { chain(loop('brown', 5), gain(0.9), out); },
        rain: function (out) {
            chain(loop('white', 3), filter('highpass', 400), filter('lowpass', 6000), gain(0.55), out);
            chain(loop('brown', 4), filter('lowpass', 500), gain(0.6), out);
        },
        // rain heard from inside: drops tapping the glass, a thin wash, now and then a trickle
        windowrain: function (out) {
            chain(loop('white', 3), filter('highpass', 1800), filter('lowpass', 5500), gain(0.09), out);
            chain(loop('pink', 4), filter('bandpass', 700, 0.7), gain(0.12), out);
            return function (level) {
                if (level < 0.02 || !ctx) return;
                var t0 = ctx.currentTime, n = Math.round(6 + level * 46);
                for (var i = 0; i < n; i++) {                       // taps on the pane
                    var t = t0 + Math.random(), f = 2200 + Math.random() * 3200;
                    tone(out, t, 'sine', f, f * 0.7, 0.018 + Math.random() * 0.02, (0.02 + Math.random() * 0.05) * (0.4 + level));
                    if (Math.random() < 0.3) noiseHit(out, t, 0.015, 'bandpass', 3500 + Math.random() * 2000, 2, 0.05 * level);
                }
                if (Math.random() < 0.25 * level) {                 // a trickle running down
                    var tr = noiseHit(out, t0 + Math.random() * 0.5, 0.6, 'bandpass', 900, 3, 0.05, 0.2);
                    tr.frequency.exponentialRampToValueAtTime(1600, t0 + 1.1);
                }
            };
        },
        // the bathtub's tap running, and its plughole gurgling (sky/tub.js turns them up and down)
        'tub-tap': function (out) {
            var bp = filter('bandpass', 1500, 0.7);
            chain(loop('white', 3), bp, gain(0.45), out);
            chain(loop('pink', 4), filter('lowpass', 600), gain(0.25), out);
            lfo(0.7, 160, bp.frequency);
        },
        'tub-drain': function (out) {
            var bp = filter('bandpass', 300, 2.2), g = gain(0.8);
            chain(loop('brown', 4), bp, g, out);
            lfo(0.9, 140, bp.frequency);
            return function (level) {                                // glugs
                if (level < 0.02 || !ctx) return;
                var t0 = ctx.currentTime;
                for (var i = 0; i < 4; i++) if (Math.random() < 0.7) { var t = t0 + Math.random(), f = 160 + Math.random() * 240; tone(out, t, 'sine', f, f * 2.4, 0.08, 0.14 * level); }
            };
        },
        // the dungeon: a low hollow drone, a draught through the stones, drips and the odd clink of a chain
        dungeon: function (out) {
            [55, 55.4, 82.6].forEach(function (f, i) {
                var o = ctx.createOscillator(), g = gain(0), lf = ctx.createOscillator(), lg = gain(0.05);
                o.type = i === 2 ? 'sine' : 'sawtooth'; o.frequency.value = f;
                lf.frequency.value = 0.07 + i * 0.03; lf.connect(lg); lg.connect(g.gain);
                g.gain.value = i === 2 ? 0.1 : 0.07;
                chain(o, filter('lowpass', 240, 1.5), g, out);
                o.start(); lf.start();
            });
            chain(loop('brown', 6), filter('bandpass', 180, 0.8), gain(0.35), out);
            return function (level) {
                if (level < 0.02 || !ctx) return;
                var t0 = ctx.currentTime;
                if (Math.random() < 0.6) {                               // a drip, echoing
                    var t = t0 + Math.random(), f = 900 + Math.random() * 900;
                    tone(out, t, 'sine', f, f * 0.55, 0.06, 0.08 * level);
                    tone(out, t + 0.28, 'sine', f, f * 0.55, 0.06, 0.03 * level);
                }
                if (Math.random() < 0.08) {                              // a chain, somewhere
                    var c = t0 + Math.random();
                    for (var i = 0; i < 4; i++) tone(out, c + i * 0.07, 'triangle', 1900 + Math.random() * 900, 1500, 0.12, 0.03 * level);
                }
            };
        },
        // the grimoire, open: a low, wrong chord that breathes, a draught through the pages, and now and then
        // something like a whisper, or a heartbeat (your own: assets/sounds/grimoire, loops)
        grimoire: function (out) {
            [[41.2, 'sawtooth', 0.05], [58.3, 'sawtooth', 0.04], [61.7, 'triangle', 0.06], [87.3, 'sine', 0.05]].forEach(function (v, i) {
                var o = ctx.createOscillator(), g = gain(v[2]), lf = ctx.createOscillator(), lg = gain(v[2] * 0.9);
                o.type = v[1]; o.frequency.value = v[0]; o.detune.value = (i - 1.5) * 7;
                lf.frequency.value = 0.05 + i * 0.037; lf.connect(lg); lg.connect(g.gain);
                chain(o, filter('lowpass', 320, 2), g, out);
                o.start(); lf.start();
            });
            var br = gain(0.0), blf = ctx.createOscillator(), blg = gain(0.22);
            blf.frequency.value = 0.11; blf.connect(blg); blg.connect(br.gain);
            chain(loop('pink', 5), filter('bandpass', 700, 0.7), br, out); blf.start();
            return function (level) {
                if (level < 0.02 || !ctx) return;
                var t0 = ctx.currentTime;
                if (Math.random() < 0.28) {                              // a whisper: a breath of hiss, shaped like a word
                    var n = ctx.createBufferSource(), g = gain(0), f = filter('bandpass', 1400 + Math.random() * 1800, 5);
                    n.buffer = noiseBuf('white', 2); chain(n, f, g, out);
                    var t = t0 + Math.random() * 0.8, len = 0.35 + Math.random() * 0.6;
                    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09 * level, t + len * 0.3); g.gain.linearRampToValueAtTime(0, t + len);
                    f.frequency.setValueAtTime(1200 + Math.random() * 2400, t); f.frequency.linearRampToValueAtTime(900 + Math.random() * 2000, t + len);
                    n.start(t); n.stop(t + len + 0.05);
                }
                if (Math.random() < 0.12) {                              // a heartbeat, far off
                    tone(out, t0 + 0.2, 'sine', 62, 38, 0.18, 0.22 * level);
                    tone(out, t0 + 0.5, 'sine', 58, 36, 0.2, 0.16 * level);
                }
            };
        },
        // down there (reset 4, sky/hell.js): a vast low drone that swells and sinks, a choir of wrong voices far off,
        // fire crackling under everything, and now and then a boom from deep below (your own: assets/sounds/hell, loops)
        hell: function (out) {
            [[36.7, 'sawtooth', 0.07], [38.9, 'sawtooth', 0.06], [55, 'triangle', 0.08], [73.4, 'sine', 0.05]].forEach(function (v, i) {
                var o = ctx.createOscillator(), g = gain(v[2]), lf = ctx.createOscillator(), lg = gain(v[2] * 0.8);
                o.type = v[1]; o.frequency.value = v[0]; o.detune.value = (i - 1.5) * 9;
                lf.frequency.value = 0.04 + i * 0.023; lf.connect(lg); lg.connect(g.gain);
                chain(o, filter('lowpass', 260, 2.5), g, out);
                o.start(); lf.start();
            });
            [[220, 233.1], [329.6, 349.2], [440, 466.2]].forEach(function (pr, i) {        // the far choir: close, beating pairs, breathing in and out
                var cg = gain(0), clf = ctx.createOscillator(), clg = gain(0.018);
                clf.frequency.value = 0.07 + i * 0.05; clf.connect(clg); clg.connect(cg.gain);
                pr.forEach(function (f) { var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; chain(o, filter('bandpass', f * 2.2, 6), cg); o.start(); });
                chain(cg, filter('lowpass', 1400, 0.7), out); clf.start();
            });
            chain(loop('crackle', 6), filter('bandpass', 900, 0.6), gain(0.5), out);
            chain(loop('brown', 5), filter('lowpass', 180), gain(0.8), out);
            return function (level) {
                if (level < 0.02 || !ctx) return;
                var t0 = ctx.currentTime;
                if (Math.random() < 0.1) { tone(out, t0 + Math.random(), 'sine', 48, 22, 2.4, 0.5 * level); }          // a boom, far below
                if (Math.random() < 0.18) {                                                                     // a moan, rising
                    var o = ctx.createOscillator(), g = gain(0), f0 = 140 + Math.random() * 120, at = t0 + Math.random() * 0.6;
                    o.type = 'triangle'; o.frequency.setValueAtTime(f0, at); o.frequency.linearRampToValueAtTime(f0 * 1.5, at + 2.2);
                    chain(o, filter('lowpass', 800, 3), g, out);
                    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.05 * level, at + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, at + 2.4);
                    o.start(at); o.stop(at + 2.5);
                }
            };
        },
        // the ambience (sky/ambient.js), when no record's on: a slow warm haze of chords that drift one into the next,
        // the hush of the house under it, and now and then a soft note, like something far off in another room
        // (your own: assets/sounds/ambient, loops)
        ambient: function (out) {
            var CHORDS = [[87.3, 130.8, 164.8, 220, 261.6], [110, 130.8, 164.8, 196, 293.7], [73.4, 110, 174.6, 220, 261.6], [65.4, 130.8, 164.8, 196, 246.9]];
            var PENT = [523.3, 587.3, 659.3, 784, 880, 1046.5];
            var voices = CHORDS[0].map(function (f, i) {
                var o = ctx.createOscillator(), g = gain(i ? 0.035 : 0.05), lf = ctx.createOscillator(), lg = gain(0.018);
                o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 2) * 4;
                lf.frequency.value = 0.05 + i * 0.021; lf.connect(lg); lg.connect(g.gain);
                chain(o, filter('lowpass', 900, 0.5), g, out);
                o.start(); lf.start();
                return o;
            });
            chain(loop('pink', 6), filter('lowpass', 420), gain(0.05), out);       // the house, breathing
            var n = 0, chord = 0;
            return function (level) {
                if (level < 0.02 || !ctx) return;
                var t0 = ctx.currentTime;
                if (++n % 9 === 0) {                                                  // on to the next chord, slowly
                    chord = (chord + 1) % CHORDS.length;
                    voices.forEach(function (o, i) { o.frequency.setTargetAtTime(CHORDS[chord][i], t0, 2.2); });
                }
                if (Math.random() < 0.22) {                                          // a soft note, far off
                    var f = PENT[Math.floor(Math.random() * PENT.length)], t = t0 + Math.random() * 0.8;
                    tone(out, t, 'sine', f, f * 0.999, 2.6, 0.025 * (0.5 + level));
                    tone(out, t + 0.35, 'sine', f, f * 0.999, 2.2, 0.009 * (0.5 + level));
                }
            };
        },
        storm: function (out, ch) {
            chain(loop('white', 3), filter('highpass', 350), filter('lowpass', 5200), gain(0.7), out);
            chain(loop('brown', 5), filter('lowpass', 420), gain(1.0), out);
            var next = 0;
            return function (level) {                                // thunder now and then
                if (level < 0.02) return;
                var t = performance.now();
                if (!next) next = t + 5000 + Math.random() * 10000;
                if (t > next) { thunder(level * 0.8, 0.2, out); next = t + 12000 + Math.random() * 22000; }
            };
        },
        ocean: function (out) {
            var body = gain(0.5), foam = gain(0.18);
            chain(loop('brown', 6), filter('lowpass', 650), body, out);
            chain(loop('white', 3), filter('bandpass', 1400, 0.6), foam, out);
            lfo(0.085, 0.45, body.gain);                             // the swell rolling in and out
            lfo(0.085, 0.16, foam.gain);
        },
        wind: function (out) {
            var bp = filter('bandpass', 480, 0.9), g = gain(1.1);
            chain(loop('pink', 5), bp, g, out);
            lfo(0.06, 260, bp.frequency);
            lfo(0.13, 0.45, g.gain);
        },
        fire: function (out) {
            chain(loop('brown', 5), filter('lowpass', 260), gain(0.55), out);
            chain(loop('crackle', 6), filter('highpass', 1300), gain(0.9), out);
        }
    };

    // a sound you can turn up and down. opts.muffled: a function that says "we're indoors"
    function channel(name, opts) {
        opts = opts || {};
        var ch = { name: name, level: 0, file: undefined, built: false, out: null, lp: null, el: null, tick: null };
        Sky.findAsset('assets/sounds/' + name + '.mp3|assets/sounds/' + name + '.ogg', function (url) {
            if (url || !opts.orFile) { ch.file = url || null; if (ch.level > 0) build(); return; }
            // no recording of its own: borrow another (a storm = your rain recording, with thunder on top)
            Sky.findAsset('assets/sounds/' + opts.orFile + '.mp3|assets/sounds/' + opts.orFile + '.ogg', function (u2) {
                ch.file = u2 || null; ch.borrowed = !!u2; if (ch.level > 0) build();
            });
        });
        function build() {
            if (ch.built || ch.file === undefined || !ac()) return;
            ch.built = true;
            ch.lp = filter('lowpass', 20000);
            ch.out = gain(0);
            ch.lp.connect(ch.out); ch.out.connect(master);
            if (ch.file) {                                           // your recording
                ch.el = new Audio(ch.file);
                ch.el._ch = ch;
                ch.el.loop = true;
                ch.el.crossOrigin = 'anonymous';
                try { ctx.createMediaElementSource(ch.el).connect(ch.lp); } catch (e) { ch.el.volume = 1; }
                if (ch.borrowed && opts.withThunder) ch.tick = thunderNowAndThen(ch.lp);
            } else if (SYNTHS[name]) ch.tick = SYNTHS[name](ch.lp, ch) || null;
            apply(0.3);
        }
        function apply(ramp) {
            if (!ch.built) return;
            var t = ctx.currentTime, inside = opts.muffled && opts.muffled();
            ch.out.gain.setTargetAtTime(ch.level * (inside ? 0.7 : 1), t, ramp || 0.25);
            ch.lp.frequency.setTargetAtTime(inside ? 2200 : 20000, t, 0.3);
            if (ch.el) {
                if (ch.level > 0.001 && ch.el.paused && !ch.trying && !ch.blocked) {
                    ch.trying = true;
                    ch.el.play().then(function () { ch.trying = false; if (ch.level <= 0.001) ch.el.pause(); }, function (err) {
                        ch.trying = false;
                        if (err && err.name === 'AbortError') return;          // (turned down again before it got going: not blocked)
                        ch.blocked = true; if (pendingFiles.indexOf(ch.el) === -1) pendingFiles.push(ch.el);
                    });
                }
                if (ch.level <= 0.001 && !ch.el.paused) ch.el.pause();
            }
        }
        ch.set = function (v, ramp) {
            var was = ch.level;
            ch.level = Math.max(0, Math.min(1, v));
            if (ch.level > 0) { wanted = true; build(); }
            apply(ramp);
            // its timed things (taps on the glass, thunder…) go once a second, below: here only as it starts.
            // (some things set a channel every frame: the rain does. a tick each time was hundreds of little sounds
            //  a second, and the browser's sound gave up under them, taking every other sound with it)
            if (ch.tick && was <= 0.001 && ch.level > 0.001 && ctx && ctx.state === 'running') ch.tick(ch.level);
        };
        ch.refresh = function () { apply(); };
        channels.push(ch);
        return ch;
    }
    var channels = [];
    function thunderNowAndThen(out) {
        var next = 0;
        return function (level) {
            if (level < 0.02) return;
            var t = performance.now();
            if (!next) next = t + 5000 + Math.random() * 10000;
            if (t > next) { thunder(level * 0.8, 0.2, out); next = t + 12000 + Math.random() * 22000; }
        };
    }
    setInterval(function () { channels.forEach(function (ch) { if (ch.tick && ctx && ctx.state === 'running') ch.tick(ch.level); }); }, 1000);

    // one roll of thunder (your own: assets/sounds/thunder.mp3)
    var thunderFile;
    Sky.findAsset('assets/sounds/thunder.mp3|assets/sounds/thunder.ogg', function (url) { thunderFile = url || null; });
    function thunder(loud, delay, out, muffled) {
        if (!ac() || ctx.state !== 'running') return;
        loud = Math.max(0, Math.min(1, loud)) * (muffled ? 0.6 : 1);
        if (thunderFile) {
            setTimeout(function () { var a = new Audio(thunderFile); a.volume = loud; a.play().catch(function () {}); }, (delay || 0) * 1000);
            return;
        }
        var dest = out || master, t = ctx.currentTime + (delay || 0), len = 3 + Math.random() * 2.5;
        var c = ctx.createBufferSource(); c.buffer = noiseBuf('white', 3);
        var cg = gain(0); cg.gain.setValueAtTime(0, t); cg.gain.linearRampToValueAtTime(0.25 * loud * (delay < 1 ? 1 : 0.3), t + 0.01); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        chain(c, filter('highpass', 1200), cg, dest); c.start(t); c.stop(t + 0.4);
        var r = ctx.createBufferSource(); r.buffer = noiseBuf('brown', 5);
        var rl = filter('lowpass', 260); rl.frequency.setValueAtTime(260, t); rl.frequency.linearRampToValueAtTime(90, t + len);
        var rg = gain(0); rg.gain.setValueAtTime(0, t);
        rg.gain.linearRampToValueAtTime(1.4 * loud, t + 0.15); rg.gain.linearRampToValueAtTime(0.9 * loud, t + 0.8);
        rg.gain.linearRampToValueAtTime(1.1 * loud, t + 1.3); rg.gain.exponentialRampToValueAtTime(0.001, t + len);
        chain(r, rl, rg, dest); r.start(t); r.stop(t + len + 0.2);
    }

    /* ---------------- little sound effects ----------------
       Sky.sounds.sfx('cork-pop') … each made here, or your recording at
       assets/sounds/<name>.mp3. splashes take a size (0 small … 1 big): the
       bigger the thing, the deeper and longer the splash (your splash.mp3 is
       played slower for big ones). */
    var SFX_KEY = 'sfx-volume', sfxVol = 0.7;
    try { var sv = localStorage.getItem(SFX_KEY); if (sv !== null) sfxVol = Math.max(0, Math.min(1, +sv)); } catch (e) {}
    var sfxFiles = {};
    ['cork-pop', 'cork-in', 'paper-unroll', 'paper-roll', 'throw', 'splash', 'surface', 'climb-out', 'land', 'twinkle', 'wish', 'portfolio', 'brush', 'step', 'blip', 'shimmer', 'chime', 'knock', 'crack', 'scream', 'splat', 'zap', 'respawn', 'pickup', 'tap', 'fizz', 'door', 'door-metal', 'angry', 'unnerve', 'scare', 'typing', 'sparkle', 'bang', 'flick', 'shatter', 'book', 'claube-flick', 'claube-shot', 'loot', 'record-in', 'page-turn', 'flashbang', 'lives-found', 'wall-slide', 'jammed', 'key', 'boat-crash', 'fall-wind'].forEach(function (n) {
        Sky.findAsset('assets/sounds/' + n + '.mp3|assets/sounds/' + n + '.ogg', function (url) { sfxFiles[n] = url || null; });
    });
    function env(g, t, peak, attack, decay) {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    }
    function noiseHit(dest, t, len, type, freq, q, peak, attack) {
        var n = ctx.createBufferSource(); n.buffer = noiseBuf('white', 3);
        var f = filter(type, freq, q), g = gain(0);
        chain(n, f, g, dest);
        env(g, t, peak, attack || 0.005, len);
        n.start(t, Math.random() * 2); n.stop(t + (attack || 0.005) + len + 0.05);
        return f;
    }
    function tone(dest, t, type, f0, f1, len, peak) {
        var o = ctx.createOscillator(), g = gain(0);
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f1, t + len);
        chain(o, g, dest);
        env(g, t, peak, 0.004, len);
        o.start(t); o.stop(t + len + 0.05);
    }
    var SFX = {
        'cork-pop': function (out, t) {                                // a hollow pop, and a little squeak before it
            tone(out, t, 'triangle', 520, 780, 0.07, 0.12);
            tone(out, t + 0.08, 'sine', 900, 260, 0.09, 0.8);
            noiseHit(out, t + 0.08, 0.05, 'highpass', 2500, 0, 0.35);
        },
        'cork-in': function (out, t) {                                 // squeak, squeak, thunk
            tone(out, t, 'triangle', 480, 620, 0.09, 0.14);
            tone(out, t + 0.12, 'triangle', 540, 700, 0.08, 0.12);
            tone(out, t + 0.24, 'sine', 180, 90, 0.08, 0.5);
            noiseHit(out, t + 0.24, 0.05, 'lowpass', 900, 0, 0.3);
        },
        'paper-unroll': function (out, t) { rustle(out, t, 1.1, 2400); },
        'paper-roll': function (out, t) { rustle(out, t, 0.8, 1800); },
        'throw': function (out, t) {                                   // a whoosh through the air
            var f = noiseHit(out, t, 0.55, 'bandpass', 500, 1.2, 0.5, 0.18);
            f.frequency.setValueAtTime(400, t);
            f.frequency.exponentialRampToValueAtTime(1900, t + 0.25);
            f.frequency.exponentialRampToValueAtTime(600, t + 0.7);
        },
        'surface': function (out, t) {                                 // bobbing up: a soft slosh, a gasp of air, a few drips
            var f = noiseHit(out, t, 0.5, 'lowpass', 700, 0.6, 0.28, 0.12);
            f.frequency.setValueAtTime(350, t); f.frequency.linearRampToValueAtTime(900, t + 0.25); f.frequency.linearRampToValueAtTime(400, t + 0.6);
            tone(out, t + 0.05, 'sine', 260, 520, 0.12, 0.12);         // the bubble breaking the surface
            noiseHit(out, t + 0.32, 0.18, 'bandpass', 1600, 1.5, 0.1, 0.06);   // the breath
            drips(out, t + 0.45, 3, 0.7);
        },
        'climb-out': function (out, t) {                               // hauling out: water pouring off, then dripping onto the boards
            var f = noiseHit(out, t, 0.7, 'lowpass', 2200, 0.4, 0.3, 0.05);
            f.frequency.exponentialRampToValueAtTime(500, t + 0.7);
            knock(out, t + 0.55, 0.8);
            drips(out, t + 0.7, 6, 1.4);
        },
        'land': function (out, t, size) {                              // feet on wooden boards: a hollow thump
            knock(out, t, size === undefined ? 1 : size);
        },
        'twinkle': function (out, t) {                                 // a star's soft chime
            [1568, 2093, 2637].forEach(function (f, i) { tone(out, t + i * 0.09, 'sine', f, f * 0.998, 0.9, 0.12); });
        },
        'wish': function (out, t) {                                    // a shooting star: a rising sparkle
            for (var i = 0; i < 9; i++) tone(out, t + i * 0.06, 'sine', 1200 + i * 190, 1200 + i * 190, 0.5, 0.07);
            var f = noiseHit(out, t, 1.1, 'highpass', 5000, 0, 0.06, 0.2);
            f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(9000, t + 1);
        },
        'portfolio': function (out, t) {                               // a sheet slipped into the portfolio: a papery slide, a soft flap
            rustle(out, t, 0.35, 1400);
            knock(out, t + 0.36, 0.3);
        },
        'step': function (out, t, size) {                              // a soft footstep on floorboards
            var loud = size === undefined ? 1 : size;
            tone(out, t, 'sine', 110, 70, 0.07, 0.22 * loud);
            noiseHit(out, t, 0.05, 'lowpass', 700, 0.5, 0.12 * loud);
        },
        'knock': function (out, t) {                                   // knuckles on a boarded-up window: knock, knock
            knock(out, t, 1); knock(out, t + 0.2, 0.85);
        },
        'wall-slide': function (out, t) {                              // a stone wall grinding aside
            var n = ctx.createBufferSource(); n.buffer = noiseBuf('brown', 4);
            var f = filter('lowpass', 320), g = gain(0);
            chain(n, f, g, out);
            g.gain.setValueAtTime(0.0001, t);
            for (var i = 0; i <= 48; i++) g.gain.linearRampToValueAtTime((i < 4 ? i / 4 : 1) * (0.5 + Math.random() * 0.5) * (i > 40 ? (48 - i) / 8 : 1), t + 2.4 * i / 48);
            n.start(t); n.stop(t + 2.5);
            knock(out, t + 2.35, 0.8);                                 // and it stops against something
        },
        'crack': function (out, t) {                                   // a board splintering off and clattering down
            var f = noiseHit(out, t, 0.18, 'bandpass', 2600, 0.7, 0.55, 0.004);
            f.frequency.exponentialRampToValueAtTime(900, t + 0.18);
            for (var i = 0; i < 5; i++) noiseHit(out, t + 0.02 + Math.random() * 0.12, 0.03, 'highpass', 3000, 0, 0.25, 0.002);
            knock(out, t + 0.42, 0.55); knock(out, t + 0.58, 0.3);
        },
        'scream': function (out, t) {                                  // a cartoon "AAAAAH": a wobbly voice through two vowel formants, falling away
            var len = 1.25, o = ctx.createOscillator(), o2 = ctx.createOscillator(), vib = ctx.createOscillator(), vg = gain(0);
            o.type = 'sawtooth'; o2.type = 'square';
            o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(760, t + 0.18); o.frequency.exponentialRampToValueAtTime(300, t + len);
            o2.frequency.setValueAtTime(523, t); o2.frequency.linearRampToValueAtTime(765, t + 0.18); o2.frequency.exponentialRampToValueAtTime(302, t + len);
            vib.frequency.value = 7; vg.gain.value = 22; vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
            var f1 = filter('bandpass', 850, 6), f2 = filter('bandpass', 1300, 7), g = gain(0), mix = gain(0.5);
            o.connect(f1); o.connect(f2); o2.connect(f1); f1.connect(mix); f2.connect(mix); mix.connect(g); g.connect(out);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.06);
            g.gain.setValueAtTime(0.9, t + len * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
            [o, o2, vib].forEach(function (x) { x.start(t); x.stop(t + len + 0.05); });
        },
        'splat': function (out, t) {                                   // a wet splat, a squelch, and bits pattering down
            var f = noiseHit(out, t, 0.35, 'lowpass', 900, 1.5, 0.9, 0.003);
            f.frequency.exponentialRampToValueAtTime(180, t + 0.35);
            tone(out, t, 'sine', 130, 45, 0.22, 0.8);
            tone(out, t + 0.05, 'triangle', 420, 90, 0.16, 0.25);          // the squelch
            for (var i = 0; i < 9; i++) {                                   // giblets landing
                var d = t + 0.15 + Math.random() * 0.8;
                noiseHit(out, d, 0.06, 'bandpass', 500 + Math.random() * 700, 1.2, 0.18 + Math.random() * 0.15, 0.003);
                tone(out, d, 'sine', 180 + Math.random() * 160, 70, 0.06, 0.12);
            }
        },
        'zap': function (out, t) {                                     // electrocution: a mains buzz with crackling arcs
            var len = 1.6, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = gain(0), am = ctx.createOscillator(), ag = gain(0.5);
            o.type = 'sawtooth'; o.frequency.value = 120; o2.type = 'square'; o2.frequency.value = 180.5;
            am.type = 'square'; am.frequency.value = 23; am.connect(ag); ag.connect(g.gain);
            var f = filter('highpass', 300);
            o.connect(f); o2.connect(f); f.connect(g); g.connect(out);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
            g.gain.setValueAtTime(0.35, t + len - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
            [o, o2, am].forEach(function (x) { x.start(t); x.stop(t + len + 0.05); });
            for (var i = 0; i < 22; i++) noiseHit(out, t + Math.random() * len, 0.02 + Math.random() * 0.05, 'highpass', 2500, 0, 0.3 + Math.random() * 0.4, 0.001);
            tone(out, t + len - 0.1, 'sine', 900, 60, 0.3, 0.4);            // the pop as it shorts out
        },
        'respawn': function (out, t) {                                 // back again: a quick rising arpeggio and a shimmer
            [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(out, t + i * 0.07, 'triangle', f, f, 0.35, 0.16); });
            var f = noiseHit(out, t + 0.1, 0.6, 'highpass', 5000, 0, 0.05, 0.2);
            f.frequency.exponentialRampToValueAtTime(9000, t + 0.6);
        },
        'pickup': function (out, t) {                                  // into your pocket
            tone(out, t, 'square', 660, 660, 0.06, 0.08); tone(out, t + 0.07, 'square', 990, 990, 0.1, 0.08);
        },
        'tap': function (out, t, size) {                               // the tap running (size = how long, in seconds)
            var len = Math.max(0.6, size || 3);
            var n = ctx.createBufferSource(); n.buffer = noiseBuf('white', 3); n.loop = true;
            var f = filter('bandpass', 1400, 0.6), g = gain(0);
            chain(n, f, g, out);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.15);
            f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(700, t + len);   // the pitch drops as it fills
            g.gain.setValueAtTime(0.22, t + len - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
            n.start(t); n.stop(t + len + 0.05);
            tone(out, t, 'triangle', 700, 900, 0.08, 0.1);                 // the squeak of the handle
        },
        'angry': function (out, t, size) {                             // picked up and furious: squirrelly chittering, a gremlin growl when it's bad
            var anger = Math.max(0, Math.min(1, size === undefined ? 0.3 : size));
            if (anger > 0.45) {                                         // the growl underneath
                var gl = 0.22 + anger * 0.3, g = ctx.createOscillator(), trem = ctx.createOscillator(), tg = gain(0.6), gg = gain(0);
                g.type = 'sawtooth'; g.frequency.setValueAtTime(150 + anger * 60, t); g.frequency.linearRampToValueAtTime(110, t + gl);
                trem.frequency.value = 28; trem.connect(tg); tg.connect(gg.gain);
                var gf = filter('lowpass', 900, 3);
                chain(g, gf, gg, out);
                gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.35, t + 0.03); gg.gain.exponentialRampToValueAtTime(0.0001, t + gl);
                g.start(t); trem.start(t); g.stop(t + gl + 0.05); trem.stop(t + gl + 0.05);
            }
            var n = 5 + Math.round(anger * 9), at = t + (anger > 0.45 ? 0.12 : 0), base = 750 + anger * 650;
            for (var i = 0; i < n; i++) {                               // chk-chk-chkkk: little rising-and-falling chirps
                var len = 0.035 + Math.random() * 0.04, f0 = base * (0.8 + Math.random() * 0.5), o = ctx.createOscillator(), og = gain(0);
                o.type = Math.random() < 0.5 ? 'square' : 'sawtooth';
                o.frequency.setValueAtTime(f0, at);
                o.frequency.exponentialRampToValueAtTime(f0 * (1.4 + Math.random() * 0.5), at + len * 0.4);
                o.frequency.exponentialRampToValueAtTime(f0 * 0.7, at + len);
                var bf = filter('bandpass', 2200 + Math.random() * 1200, 2.5);
                chain(o, bf, og, out);
                env(og, at, 0.28 + anger * 0.18, 0.004, len);
                o.start(at); o.stop(at + len + 0.05);
                noiseHit(out, at, len * 0.6, 'highpass', 4000, 0, 0.05 + anger * 0.06, 0.002);   // the rasp
                at += len + 0.02 + Math.random() * (0.06 - anger * 0.03);
            }
        },
        'door-metal': function (out, t) {                              // a heavy steel door: the push bar clanks, the hinge squeals, it booms shut
            [[520, 0.2], [1370, 0.12], [2260, 0.08], [3810, 0.05]].forEach(function (h) { tone(out, t, 'sine', h[0], h[0] * 0.995, 0.5, h[1]); });   // clank
            noiseHit(out, t, 0.05, 'bandpass', 3000, 3, 0.4, 0.001);
            var sq = ctx.createOscillator(), sg = gain(0), vib = ctx.createOscillator(), vg = gain(40);
            sq.type = 'sawtooth'; sq.frequency.setValueAtTime(700, t + 0.15); sq.frequency.linearRampToValueAtTime(980, t + 0.7);
            vib.frequency.value = 11; vib.connect(vg); vg.connect(sq.frequency);
            var sf = filter('bandpass', 1800, 6);
            chain(sq, sf, sg, out);
            sg.gain.setValueAtTime(0.0001, t + 0.15); sg.gain.exponentialRampToValueAtTime(0.12, t + 0.25); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
            sq.start(t + 0.15); vib.start(t + 0.15); sq.stop(t + 0.8); vib.stop(t + 0.8);                          // the squeal
            tone(out, t + 0.85, 'sine', 95, 45, 0.5, 0.9);                                                        // the boom as it shuts
            noiseHit(out, t + 0.85, 0.12, 'lowpass', 600, 0.6, 0.5, 0.002);
            [[180, 0.15], [433, 0.08], [760, 0.05]].forEach(function (h) { tone(out, t + 0.86, 'sine', h[0], h[0] * 0.99, 1.1, h[1]); });   // and rings
        },
        'unnerve': function (out, t) {                                 // something's wrong: a slow dissonant swell, a heartbeat under it (about 4 s)
            var len = 4.2;
            [[98, 104.2], [146.8, 155.6], [392, 415.3]].forEach(function (pr, i) {
                pr.forEach(function (f) {
                    var o = ctx.createOscillator(), g = gain(0);
                    o.type = i === 2 ? 'sine' : 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 1.06, t + len);
                    chain(o, filter('lowpass', 600 + i * 400, 1), g, out);
                    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(i === 2 ? 0.05 : 0.09, t + len * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.2);
                    o.start(t); o.stop(t + len + 0.3);
                });
            });
            for (var b = 0; b < 5; b++) { var at = t + 0.5 + b * 0.75 - b * b * 0.02; tone(out, at, 'sine', 60, 40, 0.18, 0.5); tone(out, at + 0.22, 'sine', 55, 38, 0.16, 0.35); }
        },
        'scare': function (out, t) {                                   // the jump scare: a shrieking stab
            [[233, 0.5], [247, 0.5], [466, 0.35], [990, 0.2], [1480, 0.12]].forEach(function (h) {
                var o = ctx.createOscillator(), g = gain(0);
                o.type = 'sawtooth'; o.frequency.setValueAtTime(h[0] * 1.02, t); o.frequency.exponentialRampToValueAtTime(h[0] * 0.9, t + 1.4);
                chain(o, g, out);
                g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(h[1], t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
                o.start(t); o.stop(t + 1.6);
            });
            noiseHit(out, t, 0.9, 'highpass', 1200, 0, 0.6, 0.005);
            tone(out, t, 'sine', 80, 30, 0.8, 1);
        },
        'dread': function (out, t) {                                   // the grimoire opening: a deep boom, a rushing breath in, and a chord that's all wrong (about 3 s)
            tone(out, t, 'sine', 55, 26, 2.2, 1);                                   // the boom
            tone(out, t, 'triangle', 110, 50, 0.9, 0.35);
            var n = ctx.createBufferSource(); n.buffer = noiseBuf('white', 3);      // a breath, drawn in backwards
            var f = filter('bandpass', 500, 0.8), g = gain(0);
            chain(n, f, g, out);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
            f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.95);
            n.start(t, Math.random() * 2); n.stop(t + 1.2);
            [[73.4, 0.14], [77.8, 0.14], [110, 0.1], [155.6, 0.09], [233, 0.05], [311, 0.035]].forEach(function (h) {   // the chord
                var o = ctx.createOscillator(), og = gain(0);
                o.type = 'sawtooth'; o.frequency.setValueAtTime(h[0], t + 0.95); o.frequency.linearRampToValueAtTime(h[0] * 0.97, t + 3.2);
                chain(o, filter('lowpass', 900, 1.5), og, out);
                og.gain.setValueAtTime(0.0001, t + 0.95); og.gain.exponentialRampToValueAtTime(h[1], t + 1.0); og.gain.exponentialRampToValueAtTime(0.0001, t + 3.3);
                o.start(t + 0.95); o.stop(t + 3.4);
            });
            noiseHit(out, t + 0.95, 1.4, 'highpass', 3000, 0, 0.12, 0.004);         // and a hiss, like a whisper
        },
        'typing': function (out, t) {                                  // fingers on a mechanical keyboard, a couple of seconds
            var at = t;
            for (var i = 0; i < 18; i++) {
                noiseHit(out, at, 0.02, 'bandpass', 2500 + Math.random() * 2500, 3, 0.18 + Math.random() * 0.12, 0.001);
                tone(out, at, 'square', 180 + Math.random() * 60, 120, 0.02, 0.04);
                at += 0.06 + Math.random() * 0.12 + (Math.random() < 0.12 ? 0.25 : 0);
            }
        },
        'sparkle': function (out, t) {                                 // tidied up, as if by magic
            for (var i = 0; i < 14; i++) { var f = 1200 + Math.random() * 2600; tone(out, t + i * 0.05 + Math.random() * 0.03, 'sine', f, f * 1.01, 0.5, 0.06); }
            [523, 659, 784, 1047].forEach(function (f, i) { tone(out, t + 0.4 + i * 0.09, 'triangle', f, f, 0.6, 0.12); });
        },
        'bang': function (out, t) {                                    // a revolver shot: a crack, a boom, a ringing tail
            noiseHit(out, t, 0.08, 'highpass', 1500, 0, 1, 0.001);
            var f = noiseHit(out, t, 0.6, 'lowpass', 3000, 0.7, 0.8, 0.002);
            f.frequency.exponentialRampToValueAtTime(200, t + 0.6);
            tone(out, t, 'sine', 140, 40, 0.35, 1);
            tone(out, t + 0.05, 'sine', 4200, 4150, 1.2, 0.02);            // your ears ringing
        },
        'flick': function (out, t) {                                   // flicked away: a quick whoosh and a tiny "wheee"
            var f = noiseHit(out, t, 0.3, 'bandpass', 800, 1.5, 0.35, 0.02);
            f.frequency.exponentialRampToValueAtTime(3000, t + 0.3);
            tone(out, t + 0.05, 'triangle', 900, 1800, 0.35, 0.08);
        },
        'claube-flick': function (out, t) {                            // a little claube flicked away: a thwip, then a squeaky "wheeeee" going off into the distance
            noiseHit(out, t, 0.06, 'bandpass', 2400, 2, 0.4, 0.002);
            var o = ctx.createOscillator(), g = gain(0), v = ctx.createOscillator(), vg = gain(60);
            o.type = 'square'; v.frequency.value = 22; v.connect(vg); vg.connect(o.frequency);
            o.frequency.setValueAtTime(1300, t + 0.04); o.frequency.exponentialRampToValueAtTime(2600, t + 0.25); o.frequency.exponentialRampToValueAtTime(700, t + 1.1);
            g.gain.setValueAtTime(0.0001, t + 0.04); g.gain.exponentialRampToValueAtTime(0.07, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
            chain(o, filter('lowpass', 3500), g, out);
            o.start(t + 0.04); v.start(t + 0.04); o.stop(t + 1.2); v.stop(t + 1.2);
        },
        'claube-shot': function (out, t) {                             // a little claube, shot: a squeak cut short, and a wet little pop
            tone(out, t, 'square', 1800, 2400, 0.07, 0.07);
            tone(out, t + 0.05, 'sine', 900, 120, 0.16, 0.25);
            noiseHit(out, t + 0.05, 0.12, 'lowpass', 1200, 0.8, 0.5, 0.002);
            for (var i = 0; i < 5; i++) tone(out, t + 0.2 + Math.random() * 0.3, 'sine', 400 + Math.random() * 400, 200, 0.05, 0.05);
        },
        'flashbang': function (out, t) {                              // a flashbang: a crack, a boom, and the ears ringing after
            noiseHit(out, t, 0.08, 'highpass', 1800, 0.3, 1.0, 0.001);
            noiseHit(out, t + 0.01, 0.9, 'lowpass', 900, 0.4, 0.9, 0.004);
            tone(out, t, 'sine', 90, 30, 0.6, 0.7);
            var o = ctx.createOscillator(), g = gain(0);                  // the ringing
            o.type = 'sine'; o.frequency.setValueAtTime(3150, t + 0.05); o.frequency.linearRampToValueAtTime(3080, t + 3.2);
            g.gain.setValueAtTime(0.0001, t + 0.05); g.gain.exponentialRampToValueAtTime(0.09, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
            chain(o, g, out); o.start(t + 0.05); o.stop(t + 3.5);
        },
        'page-turn': function (out, t) {                              // a page of a book turned over
            var f = noiseHit(out, t, 0.22, 'bandpass', 2600, 0.7, 0.22, 0.04);
            f.frequency.exponentialRampToValueAtTime(900, t + 0.22);
            noiseHit(out, t + 0.2, 0.05, 'lowpass', 1400, 0.5, 0.12, 0.004);
        },
        'loot': function (out, t) {                                    // something hidden turns up: a little fanfare
            [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(out, t + i * 0.07, 'triangle', f, f, 0.35, 0.1); });
            for (var i = 0; i < 8; i++) { var f2 = 2000 + Math.random() * 2500; tone(out, t + 0.3 + i * 0.04, 'sine', f2, f2, 0.3, 0.03); }
        },
        'record-in': function (out, t) {                               // a record slid into the crate for keeps
            var f = noiseHit(out, t, 0.35, 'bandpass', 1400, 1, 0.3, 0.05);
            f.frequency.exponentialRampToValueAtTime(600, t + 0.35);
            knock(out, t + 0.36, 0.3);
            [784, 1047].forEach(function (fq, i) { tone(out, t + 0.45 + i * 0.1, 'triangle', fq, fq, 0.4, 0.09); });
        },
        'shatter': function (out, t) {                                 // a record blown apart
            for (var i = 0; i < 20; i++) { var d = t + Math.random() * 0.5; noiseHit(out, d, 0.04 + Math.random() * 0.06, 'highpass', 2500 + Math.random() * 3000, 0, 0.3, 0.001); tone(out, d, 'sine', 1500 + Math.random() * 3000, 1200, 0.1, 0.05); }
            knock(out, t + 0.1, 0.4);
        },
        'book': function (out, t) {                                    // a book tipped out, a click, then stone grinding as the shelf swings away
            rustle(out, t, 0.25, 1500);
            noiseHit(out, t + 0.3, 0.03, 'bandpass', 2400, 3, 0.4, 0.001);
            var n = ctx.createBufferSource(); n.buffer = noiseBuf('brown', 5);
            var g = gain(0), f = filter('lowpass', 300, 2);
            chain(n, f, g, out);
            g.gain.setValueAtTime(0.0001, t + 0.5); g.gain.exponentialRampToValueAtTime(0.9, t + 0.9);
            for (var k = 0; k < 10; k++) g.gain.linearRampToValueAtTime(0.4 + Math.random() * 0.5, t + 0.9 + k * 0.18);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
            n.start(t + 0.5); n.stop(t + 3.1);
            knock(out, t + 2.9, 1);
        },
        'door': function (out, t) {                                    // a door: the latch, a creak, and it swings
            noiseHit(out, t, 0.04, 'bandpass', 2200, 2, 0.35, 0.002);
            tone(out, t + 0.05, 'sawtooth', 190, 260, 0.45, 0.05);
            tone(out, t + 0.05, 'triangle', 380, 520, 0.4, 0.06);
            knock(out, t + 0.5, 0.25);
        },
        'fizz': function (out, t) {                                    // something electric hitting the water
            for (var i = 0; i < 12; i++) noiseHit(out, t + Math.random() * 0.6, 0.03, 'highpass', 3000, 0, 0.25, 0.001);
            var f = noiseHit(out, t, 0.7, 'bandpass', 3000, 0.8, 0.2, 0.01);
            f.frequency.exponentialRampToValueAtTime(800, t + 0.7);
        },
        'blip': function (out, t) {                                    // one letter of a text box typing out
            tone(out, t, 'square', 330, 330, 0.035, 0.05);
        },
        // a Claube, shot with the white revolver: a shriek that tears and falls away (about 1.5 s)
        'shriek': function (out, t) {
            [[1400, 0.22], [1870, 0.14], [2640, 0.08]].forEach(function (h, i) {
                var o = ctx.createOscillator(), g = gain(0), vib = ctx.createOscillator(), vg = gain(h[0] * 0.06);
                o.type = 'sawtooth'; o.frequency.setValueAtTime(h[0], t); o.frequency.exponentialRampToValueAtTime(h[0] * 1.25, t + 0.25); o.frequency.exponentialRampToValueAtTime(h[0] * 0.3, t + 1.4);
                vib.frequency.value = 23 + i * 7; vib.connect(vg); vg.connect(o.frequency);
                chain(o, filter('bandpass', h[0] * 1.4, 2), g, out);
                g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(h[1], t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
                o.start(t); vib.start(t); o.stop(t + 1.6); vib.stop(t + 1.6);
            });
            noiseHit(out, t, 0.6, 'bandpass', 3000, 1.2, 0.25, 0.01);
        },
        // the ground shaking (hell, as the voice finishes): a long deep roll, cracks in it (about 2.5 s)
        'quake': function (out, t) {
            var f = noiseHit(out, t, 2.3, 'lowpass', 140, 1.5, 0.9, 0.25);
            f.frequency.setValueAtTime(90, t); f.frequency.linearRampToValueAtTime(220, t + 1.2); f.frequency.linearRampToValueAtTime(70, t + 2.4);
            tone(out, t, 'sine', 38, 24, 2.4, 0.8);
            for (var i = 0; i < 6; i++) noiseHit(out, t + 0.2 + Math.random() * 2, 0.08, 'bandpass', 600 + Math.random() * 900, 1, 0.3, 0.003);
        },
        // the kitchen's hob: the igniter ticking, then the gas catching (whump) and a soft roar
        'burner': function (out, t) {
            for (var i = 0; i < 3; i++) noiseHit(out, t + i * 0.13, 0.02, 'highpass', 3500, 0, 0.35, 0.002);
            var f = noiseHit(out, t + 0.42, 0.9, 'lowpass', 300, 1, 0.5, 0.03);
            f.frequency.setValueAtTime(900, t + 0.42); f.frequency.exponentialRampToValueAtTime(260, t + 1.2);
            tone(out, t + 0.42, 'sine', 90, 55, 0.3, 0.35);
        },
        // the microwave: a clunk, then the hum of it running (six seconds), the fan's hiss under it
        'microwave': function (out, t) {
            knock(out, t, 0.5);
            [60, 120, 180].forEach(function (f, i) {
                var o = ctx.createOscillator(), g = gain(0);
                o.type = i ? 'sine' : 'triangle'; o.frequency.value = f;
                chain(o, g, out);
                g.gain.setValueAtTime(0.0001, t + 0.1); g.gain.exponentialRampToValueAtTime([0.16, 0.08, 0.03][i], t + 0.4);
                g.gain.setValueAtTime([0.16, 0.08, 0.03][i], t + 5.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 6.1);
                o.start(t + 0.1); o.stop(t + 6.2);
            });
            var n = ctx.createBufferSource(), ng = gain(0); n.buffer = noiseBuf('pink', 4); n.loop = true;
            chain(n, filter('bandpass', 1200, 0.6), ng, out);
            ng.gain.setValueAtTime(0.0001, t + 0.1); ng.gain.exponentialRampToValueAtTime(0.08, t + 0.5); ng.gain.setValueAtTime(0.08, t + 5.8); ng.gain.exponentialRampToValueAtTime(0.0001, t + 6.1);
            n.start(t + 0.1); n.stop(t + 6.2);
        },
        // done: ding
        'ding': function (out, t) {
            tone(out, t, 'sine', 1760, 1756, 1.4, 0.3);
            tone(out, t, 'sine', 3520, 3510, 0.6, 0.06);
        },
        // the voice's words, typed out: a low murmur a letter (a stand-in for assets/sounds/hell-voice)
        'murmur': function (out, t) {
            tone(out, t, 'sawtooth', 70 + Math.random() * 18, 58, 0.09, 0.12);
            noiseHit(out, t, 0.07, 'bandpass', 380 + Math.random() * 200, 3, 0.06, 0.01);
        },
        'shimmer': function (out, t) {                                 // looking into the mirror: a glassy shimmer
            [1318, 1760, 2349, 3136].forEach(function (f, i) { tone(out, t + i * 0.07, 'sine', f, f * 1.003, 1.2 - i * 0.15, 0.06); });
            var f = noiseHit(out, t, 1.0, 'highpass', 6000, 0, 0.03, 0.3);
            f.frequency.setValueAtTime(4000, t); f.frequency.exponentialRampToValueAtTime(9000, t + 0.9);
        },
        'chime': function (out, t) {                                   // the timer's done: a little bell, rung three times
            for (var r = 0; r < 3; r++) {
                var at = t + r * 0.55;
                [[880, 0.22], [1760, 0.08], [2637, 0.05], [3520, 0.03]].forEach(function (h) { tone(out, at, 'sine', h[0], h[0] * 0.997, 1.6, h[1]); });
            }
        },
        'brush': function (out, t) {                                   // a brush dabbed in paint
            var f = noiseHit(out, t, 0.18, 'bandpass', 1200, 0.9, 0.12, 0.03);
            f.frequency.exponentialRampToValueAtTime(700, t + 0.18);
        },
        'splash': function (out, t, size) {                           // a plop and a spray: bigger = deeper and longer
            size = Math.max(0, Math.min(1, size === undefined ? 0.5 : size));
            var deep = 1 - size;
            tone(out, t, 'sine', 140 + 380 * deep, 50 + 140 * deep, 0.12 + 0.25 * size, 0.45 + 0.4 * size);
            var f = noiseHit(out, t + 0.01, 0.25 + 0.9 * size, 'lowpass', 1400 + 4200 * deep, 0.3, 0.35 + 0.5 * size, 0.012);
            f.frequency.exponentialRampToValueAtTime(300 + 900 * deep, t + 0.3 + 0.8 * size);
            for (var i = 0; i < 3 + Math.round(4 * size); i++) {        // droplets falling back
                var d = t + 0.15 + Math.random() * (0.35 + 0.5 * size);
                tone(out, d, 'sine', 900 + Math.random() * 1400 * (0.6 + deep), 500 + Math.random() * 500, 0.04, 0.05 + 0.05 * Math.random());
            }
        }
    };
    function knock(out, t, loud) {                                  // a hollow knock on wood
        tone(out, t, 'sine', 150, 80, 0.16, 0.7 * loud);
        tone(out, t, 'triangle', 330, 210, 0.07, 0.25 * loud);
        noiseHit(out, t, 0.06, 'bandpass', 1100, 1.2, 0.35 * loud);
    }
    function drips(out, t, n, over) {                                // water drops falling one by one
        for (var i = 0; i < n; i++) {
            var d = t + Math.random() * over;
            tone(out, d, 'sine', 1300 + Math.random() * 900, 700 + Math.random() * 300, 0.035, 0.06 + 0.06 * Math.random());
        }
    }
    function rustle(out, t, len, band) {                              // paper: a crackly bandpassed hiss, in little bursts
        var n = ctx.createBufferSource(); n.buffer = noiseBuf('white', 3);
        var f = filter('bandpass', band, 0.8), f2 = filter('highpass', 900), g = gain(0);
        chain(n, f, f2, g, out);
        g.gain.setValueAtTime(0.0001, t);
        var steps = Math.round(len * 26);
        for (var i = 0; i <= steps; i++) {
            var at = t + len * i / steps, shape = Math.sin(Math.PI * i / steps);
            g.gain.linearRampToValueAtTime(0.05 + shape * (0.25 + Math.random() * 0.45), at);
        }
        g.gain.linearRampToValueAtTime(0.0001, t + len + 0.05);
        n.start(t, Math.random() * 2); n.stop(t + len + 0.1);
    }
    var looking = {};
    function sfx(name, opts) {
        opts = opts || {};
        if (sfxVol <= 0) return;
        // a name not looked for yet (the ones above are looked for as the page opens): is there a recording of yours?
        if (!(name in sfxFiles) && Sky.findAsset) {
            if (looking[name]) { looking[name].push(opts); return; }
            looking[name] = [opts];
            Sky.findAsset('assets/sounds/' + name + '.mp3|assets/sounds/' + name + '.ogg', function (url) {
                sfxFiles[name] = url || null;
                var q = looking[name]; delete looking[name];
                q.forEach(function (o) { sfx(name, o); });
            });
            return;
        }
        if (!sfxFiles[name] && !SFX[name] && opts.or) { name = opts.or; }   // (a sound of yours, or a stand-in until then)
        var size = opts.size, delay = opts.delay || 0;
        var vol = sfxVol * (opts.volume === undefined ? 1 : Math.max(0, Math.min(1, opts.volume)));   // (volume: a share of the usual loudness)
        if (sfxFiles[name]) {                                          // your recording
            setTimeout(function () {
                var a = new Audio(sfxFiles[name]);
                a.volume = vol;
                if (name === 'splash' && size !== undefined) { a.preservesPitch = false; a.mozPreservesPitch = false; a.playbackRate = 1.3 - 0.55 * size; }
                if (name === 'angry' && size !== undefined) { a.preservesPitch = false; a.mozPreservesPitch = false; a.playbackRate = 0.9 + 0.45 * size; }
                a.play().catch(function () {});
            }, delay * 1000);
            return;
        }
        if (!SFX[name] || !ac()) return;
        var play = function () {
            var out = gain(vol);
            out.connect(master);
            SFX[name](out, ctx.currentTime + delay + 0.01, size);
        };
        if (ctx.state === 'running') play();
        else ctx.resume().then(play, function () {});                   // (a click just woke it)
    }

    Sky.sounds = {
        channel: channel,
        thunder: thunder,
        sfx: sfx,
        get sfxVolume() { return sfxVol; },
        set sfxVolume(v) { sfxVol = Math.max(0, Math.min(1, v)); try { localStorage.setItem(SFX_KEY, sfxVol); } catch (e) {} },
        has: function (name) { return !!SYNTHS[name]; },
        // true when something wants to be heard but the browser is waiting for a tap
        get waiting() { return wanted && channels.some(function (c) { return c.level > 0; }) && (!ctx || ctx.state !== 'running'); }
    };

    /* ======================================================================
       the panel
       ====================================================================== */
    // (its look is in sky/css/panel.css, linked from each page's head)

    var PANEL_ICON = '<svg class="placeholder" viewBox="0 0 32 32" aria-hidden="true">' +
        '<circle cx="16" cy="16" r="14" fill="#3a2716"/><circle cx="16" cy="16" r="10.5" fill="none" stroke="#c49a52" stroke-width="1.2" stroke-dasharray="1.5 2.2"/>' +
        '<path d="M16 16 L16 7.5" stroke="#f3e6c2" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="16" r="3" fill="#9a3b1f"/>' +
        '<path d="M8 23 h16" stroke="#c49a52" stroke-width="1.4" stroke-linecap="round" opacity=".6"/></svg>';
    var CHEV = '<svg class="cp-chev" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5 L7 9 L11 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

    var root = document.createElement('div');
    root.className = 'cp';
    root.innerHTML =
        '<button type="button" class="cp-toggle" aria-expanded="false" aria-label="sounds and weather">' +
            '<span class="cp-ic" data-asset="assets/ui/panel">' + PANEL_ICON + '</span><span class="cp-badges"></span></button>' +
        '<span class="cp-wait">tap anywhere to hear it</span>' +
        '<div class="cp-box" role="dialog" aria-label="sounds and weather">' +
            '<div class="cp-head"><h2>sounds &amp; sky</h2><button type="button" class="cp-x">close ✕</button></div>' +
            '<div class="cp-layers"></div>' +
        '</div>';
    document.body.appendChild(root);
    var toggleBtn = root.querySelector('.cp-toggle'), layersEl = root.querySelector('.cp-layers'), badgesEl = root.querySelector('.cp-badges');

    var layers = [], openIds = [], lastBadges = null;
    try { openIds = JSON.parse(sessionStorage.getItem('panel-layers')) || []; } catch (e) {}
    function saveOpen() { try { sessionStorage.setItem('panel-layers', JSON.stringify(openIds)); } catch (e) {} }

    function add(L) {
        var el = document.createElement('section');
        el.className = 'cp-layer';
        el.dataset.layer = L.id;
        el.innerHTML = '<button type="button" class="cp-lh" aria-expanded="false">' +
            '<span class="cp-ic" data-asset="assets/ui/' + L.id + '">' + (L.icon || '') + '</span>' +
            '<span class="cp-lt"><b></b><i></i></span>' + CHEV + '</button><div class="cp-lb"></div>';
        el.querySelector('b').textContent = L.title;
        L.el = el;
        L.body = el.querySelector('.cp-lb');
        L.order = L.order || 50;
        layers.push(L);
        layers.sort(function (a, b) { return a.order - b.order; });
        layers.forEach(function (x) { layersEl.appendChild(x.el); });
        if (L.build) L.build(L.body);
        el.querySelector('.cp-lh').addEventListener('click', function () { expand(L.id, !el.classList.contains('open')); });
        if (openIds.indexOf(L.id) !== -1) expand(L.id, true, true);
        refresh(L.id);
        return L;
    }
    function find(id) { for (var i = 0; i < layers.length; i++) if (layers[i].id === id) return layers[i]; return null; }
    function expand(id, on, quiet) {
        var L = find(id);
        if (!L) return;
        L.el.classList.toggle('open', on);
        L.el.querySelector('.cp-lh').setAttribute('aria-expanded', String(on));
        var i = openIds.indexOf(id);
        if (on && i === -1) openIds.push(id);
        if (!on && i !== -1) openIds.splice(i, 1);
        if (!quiet) saveOpen();
        if (on && L.onOpen) L.onOpen();
    }
    function refresh(id) {
        (id ? [find(id)] : layers).forEach(function (L) {
            if (!L) return;
            var hidden = L.visible && !L.visible();
            L.el.style.display = hidden ? 'none' : '';
            L.el.querySelector('i').textContent = L.status ? L.status() : '';
            L.el.classList.toggle('on', !!(L.active && L.active()));
        });
        var b = layers.filter(function (L) { return L.active && L.active() && L.badge && !(L.visible && !L.visible()); }).map(function (L) { return L.badge(); }).join('');
        if (b !== lastBadges) { badgesEl.innerHTML = b; lastBadges = b; }
        root.classList.toggle('waiting', Sky.sounds.waiting || document.body.classList.contains('music-waiting'));
    }
    function refreshAll() { refresh(); }
    function setOpen(on) {
        root.classList.toggle('open', on);
        toggleBtn.setAttribute('aria-expanded', String(on));
        if (on) refresh();
    }
    function open(id) {
        setOpen(true);
        if (id) {
            expand(id, true);
            var L = find(id);
            if (L) setTimeout(function () { L.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
        }
    }
    toggleBtn.addEventListener('click', function () { setOpen(!root.classList.contains('open')); });
    root.querySelector('.cp-x').addEventListener('click', function () { setOpen(false); });
    document.addEventListener('pointerdown', function (e) { if (root.classList.contains('open') && !root.contains(e.target) && !e.target.closest('[data-opens-panel]')) setOpen(false); });
    Sky.escape(function () { return root.classList.contains('open'); }, function () { setOpen(false); }, Sky.ESC.panel);
    setInterval(refreshAll, 2000);

    // the sound effects (corks, paper, splashes): just a volume
    add({
        id: 'effects', title: 'sound effects', order: 40,
        icon: '<svg class="placeholder" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z" fill="#3a2716"/>' +
            '<path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="#9a3b1f" stroke-width="1.8" stroke-linecap="round"/></svg>',
        build: function (body) {
            body.innerHTML = '<label class="cp-range">volume <input type="range" min="0" max="100" aria-label="sound effects volume"></label>' +
                '<p class="cp-note">corks, paper, throws and splashes.</p>';
            var r = body.querySelector('input');
            r.value = Math.round(Sky.sounds.sfxVolume * 100);
            r.addEventListener('input', function () { Sky.sounds.sfxVolume = r.value / 100; refresh('effects'); });
            r.addEventListener('change', function () { Sky.sounds.sfx('cork-pop'); });
        },
        status: function () { var v = Math.round(Sky.sounds.sfxVolume * 100); return v ? 'on, at ' + v + '%' : 'off'; }
    });

    Sky.panel = {
        add: add, refresh: refresh, open: open, expand: expand,
        close: function () { setOpen(false); },
        get el() { return root; }
    };
})();

/* =====================================================================
   bee.js — the bee in the front garden (living.html#front): skizy's
   BeeLLM ("Scintilla BeeLLM 42P Chaos", made by skizy), living over the
   roses by the steps. click it and you can talk to it. from the porch
   (living.html#porch) it's there too, out over the yard past the railing:
   the same bee (it moves itself to whichever of the two you're in)

     its brain    skizy's own model, run right here in the visitor's browser:
                  content/bee/beellm.json (written from her .gguf by
                  tools/bee-model.py; the server can't hand out .gguf files).
                  every word the bee says comes out of it, one at a time.
                  (it's a real little llama-style transformer. skizy's has its
                  attention and feed-forward parts set to nothing, so what it
                  says next hangs only on the word it just said: after "b" it
                  nearly always buzzes on, and once it's shouting in CAPS it
                  tends to keep shouting)
     its heart    what you say to it changes how it feels (happy, excited,
                  smitten, furious, sad, frightened, sleepy, curious, or calm),
                  and how it feels changes which words it reaches for (the
                  model's own odds, nudged), how it sounds and how it moves.
                  it remembers, roughly, whether you've been kind to it before
                  (localStorage bee-heart), until "forget your stay".
     its voice    talk: each word it says is one buzz, played the moment it's
                  said. its pitch and speed rise and fall over the whole reply
                  (more so the longer the reply), each z draws its buzz out and
                  bends it (up when it's happy, down when it's sad), CAPS shout.
                  sing (the switch in its menu): it plays its words like a toy
                  keyboard instead, every key in one five-note scale (by mood),
                  so whatever order it sings them in, it sounds nice.
                  the buzz is made here (a warm, squelchy little tone) unless
                  there's a recording of your own: assets/sounds/bee-voice
                  (one steady buzz, a second or two: it's played at every pitch)
     its body     a drawn stand-in bee that hovers, flaps, bobs and squashes with
                  every buzz, makes faces for its moods, and puffs out hearts,
                  tears, steam, zZz… slots (assets/living/, with the rest of the
                  front garden): bee (the bee itself, facing right), bee-<mood>
                  (happy, excited, loving, angry, sad, scared, sleepy, curious),
                  bee-buzzing / bee-<mood>-buzzing (while a buzz sounds), and the
                  little puffs: bee-fx-heart, -tear, -steam, -sweat, -zzz, -spark,
                  -question, -zap
     the revolver it won't be shot (sky/revolver.js asks it first: aimedAt / shot).
                  shoot at it and it weaves out of the way: every shot misses.
                  keep at it: frightened (two shots), furious (two more), then it stings you and takes the gun
                  off you (sessionStorage bee-gun, for the visit, like the bag).
                  it keeps it, pointed at you and buzzing crossly, till you tell it
                  you're sorry; singing, all that while, it sings dread (a dark
                  scale, low and slow, a heartbeat under it). given back, shoot at
                  it once more and it stings the gun to pieces (gone for the visit:
                  sessionStorage bee-broke) and it never forgives you: angry at
                  every visit after (localStorage bee-grudge, till "forget your stay")
                  slots: bee-gun (the gun it points at you, muzzle on), bee-sing
                  (the menu's sing switch, a music note)
     sounds       bee-voice (above). everything else here is the bee's own voice.

   its look: sky/css/bee.css
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var front = document.querySelector('.front'), stage = front && front.querySelector('.front-stage');
    var porch = document.querySelector('.porch');
    if (!Sky || !stage || Sky.bee) return;
    var body = document.body, root = document.documentElement;
    var MODEL = 'content/bee/beellm.json';
    var MAPPING = root.classList.contains('dav-map');         // (the asset manager's map: no sound, nothing kept)
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

    /* ======================================================================
       its brain: the model, run here
       ====================================================================== */
    function floats(b64) {
        var bin = atob(b64), n = bin.length, bytes = new Uint8Array(n);
        for (var i = 0; i < n; i++) bytes[i] = bin.charCodeAt(i);
        return new Float32Array(bytes.buffer);                 // (little-endian, like every computer that runs a browser)
    }
    function Brain(m) {
        var c = m.config, T = {};
        Object.keys(m.tensors).forEach(function (k) { var t = m.tensors[k]; T[k] = { rows: t.rows, cols: t.cols, w: floats(t.data) }; });
        var E = c.n_embd, NH = c.n_head, NKV = c.n_head_kv || NH, HD = E / NH, RD = Math.min(c.rope_dim || HD, HD), V = m.tokens.length;
        var emb = T['token_embd.weight'], outW = T['output.weight'] || emb;
        var keys = [], vals = [], pos = 0;
        function matvec(t, x) {
            var y = new Float32Array(t.rows), w = t.w, n = t.cols;
            for (var i = 0, o = 0; i < t.rows; i++, o += n) { var s = 0; for (var j = 0; j < n; j++) s += w[o + j] * x[j]; y[i] = s; }
            return y;
        }
        function norm(x, t) {
            var s = 0, y = new Float32Array(x.length);
            for (var i = 0; i < x.length; i++) s += x[i] * x[i];
            s = 1 / Math.sqrt(s / x.length + c.eps);
            for (var j = 0; j < x.length; j++) y[j] = x[j] * s * t.w[j];
            return y;
        }
        // where a word is in the sentence, twisted into its numbers (rotary positions: neighbouring pairs, llama's way)
        function rope(v, heads) {
            for (var h = 0; h < heads; h++) for (var i = 0; i < RD / 2; i++) {
                var a = pos * Math.pow(c.rope_base || 10000, -2 * i / RD), co = Math.cos(a), si = Math.sin(a), o = h * HD + 2 * i;
                var x0 = v[o], x1 = v[o + 1];
                v[o] = x0 * co - x1 * si; v[o + 1] = x0 * si + x1 * co;
            }
        }
        function reset() { keys = []; vals = []; pos = 0; for (var l = 0; l < c.n_layer; l++) { keys.push([]); vals.push([]); } }
        // one word in, the odds of every next word out
        function step(tok) {
            if (pos >= (c.ctx || 2048)) reset();
            var x = new Float32Array(E), w = emb.w;
            for (var i = 0; i < E; i++) x[i] = w[tok * E + i];
            for (var l = 0; l < c.n_layer; l++) {
                var p = 'blk.' + l + '.';
                var h = norm(x, T[p + 'attn_norm.weight']);
                var q = matvec(T[p + 'attn_q.weight'], h), k = matvec(T[p + 'attn_k.weight'], h), v = matvec(T[p + 'attn_v.weight'], h);
                rope(q, NH); rope(k, NKV);
                keys[l].push(k); vals[l].push(v);
                var att = new Float32Array(E), sc = new Float32Array(pos + 1);
                for (var hh = 0; hh < NH; hh++) {
                    var kv = Math.floor(hh * NKV / NH) * HD, qo = hh * HD, max = -Infinity, sum = 0;
                    for (var t = 0; t <= pos; t++) {
                        var s = 0, kt = keys[l][t];
                        for (var d = 0; d < HD; d++) s += q[qo + d] * kt[kv + d];
                        sc[t] = s / Math.sqrt(HD); if (sc[t] > max) max = sc[t];
                    }
                    for (var t2 = 0; t2 <= pos; t2++) { sc[t2] = Math.exp(sc[t2] - max); sum += sc[t2]; }
                    for (var t3 = 0; t3 <= pos; t3++) {
                        var pr = sc[t3] / sum, vt = vals[l][t3];
                        for (var d2 = 0; d2 < HD; d2++) att[qo + d2] += pr * vt[kv + d2];
                    }
                }
                var o2 = matvec(T[p + 'attn_output.weight'], att);
                for (var a1 = 0; a1 < E; a1++) x[a1] += o2[a1];
                var h2 = norm(x, T[p + 'ffn_norm.weight']);
                var g = matvec(T[p + 'ffn_gate.weight'], h2), u = matvec(T[p + 'ffn_up.weight'], h2);
                for (var f = 0; f < g.length; f++) g[f] = g[f] / (1 + Math.exp(-g[f])) * u[f];
                var dn = matvec(T[p + 'ffn_down.weight'], g);
                for (var a2 = 0; a2 < E; a2++) x[a2] += dn[a2];
            }
            pos++;
            return matvec(outW, norm(x, T['output_norm.weight']));
        }
        reset();
        return { step: step, reset: reset, size: V };
    }

    // its words. (types: 1 ordinary, 2 unknown, 3 control (<s>, </s>), 6 a raw byte)
    var model = null, brain = null, words = null, ids = {}, normal = [], longest = 1, loading = null;
    function load() {
        if (loading) return loading;
        loading = fetch(MODEL).then(function (r) { if (!r.ok) throw new Error('no bee'); return r.json(); }).then(function (m) {
            model = m;
            brain = Brain(m);
            words = m.tokens.map(function (t) { return t.replace(/▁/g, ' '); });
            m.tokens.forEach(function (t, i) {
                if ((m.types[i] || 1) !== 1) return;
                ids[t] = i; normal.push(i);
                longest = Math.max(longest, t.length);
            });
            return true;
        }).catch(function () { return false; });           // (no brain: it gets by on instinct, below)
        return loading;
    }
    // text → its words (the longest one that fits each time; spaces are ▁, like the model's own)
    function encode(text) {
        var s = text.replace(/ /g, '▁'), out = [], i = 0;
        while (i < s.length) {
            var hit = 0;
            for (var n = Math.min(longest, s.length - i); n > 0; n--) if (ids[s.substr(i, n)] !== undefined) { hit = n; break; }
            if (hit) { out.push(ids[s.substr(i, hit)]); i += hit; } else i++;   // (a letter it doesn't know: left out)
        }
        return out;
    }

    // picking each next word: its own odds, nudged by how it feels, a little randomness (temperature), only the likelier
    // ones (top 40, then the top 95% of the chances), and a little less of whatever it's just said (so it doesn't drone)
    function pick(logits, o) {
        var l = Array.prototype.slice.call(logits), i;
        for (i = 0; i < l.length; i++) if (!o.allowed[i]) l[i] = -Infinity; else l[i] += o.bias[i] || 0;
        if (o.noEnd) l[model.eos] = -Infinity;
        if (o.noSpace) l[ids['▁']] = -Infinity;
        var seen = {};
        o.recent.slice(-12).forEach(function (t) { if (seen[t]) return; seen[t] = 1; l[t] = l[t] > 0 ? l[t] / 1.1 : l[t] * 1.1; });
        var c = [];
        for (i = 0; i < l.length; i++) if (l[i] > -Infinity) c.push(i);
        c.sort(function (a, b) { return l[b] - l[a]; });
        c = c.slice(0, 40);
        var max = l[c[0]], p = c.map(function (t) { return Math.exp((l[t] - max) / Math.max(0.05, o.temp)); });
        var sum = p.reduce(function (a, b) { return a + b; }, 0), acc = 0, keep = c.length;
        for (i = 0; i < c.length; i++) { acc += p[i] / sum; if (acc >= 0.95) { keep = i + 1; break; } }
        sum = 0; for (i = 0; i < keep; i++) sum += p[i];
        var r = Math.random() * sum;
        for (i = 0; i < keep; i++) { r -= p[i]; if (r <= 0) return c[i]; }
        return c[0];
    }

    // a whole reply: the words it says, from a few words to start it off (the visitor's own buzzing, or how it feels)
    function think(mood, opts) {
        var M = MOODS[mood], n = Math.round(rnd(opts.len[0], opts.len[1]));
        if (!brain) return instinct(mood, n);
        var bias = biasFor(mood), allowed = new Uint8Array(model.tokens.length);
        normal.forEach(function (i) { allowed[i] = 1; });
        allowed[model.eos] = 1;
        brain.reset();
        var start = [model.bos].concat(opts.seed.map(function (w) { return encode(w); }).reduce(function (a, b) { return a.concat(b); }, []));
        var logits = null;
        start.forEach(function (t) { logits = brain.step(t); });
        var out = [], recent = start.slice();
        while (out.length < n) {
            var t = pick(logits, { bias: bias, allowed: allowed, temp: opts.temp || M.temp, recent: recent,
                                   noEnd: out.length < opts.len[0], noSpace: !out.length || words[out[out.length - 1]] === ' ' });
            if (t === model.eos) break;
            out.push(t); recent.push(t);
            logits = brain.step(t);
        }
        while (out.length && words[out[out.length - 1]] === ' ') out.pop();
        if (opts.sting && !out.some(function (t) { return /stings/i.test(words[t]); })) out.push(ids['▁'], ids['*STINGS▁YOU*']);
        return out.map(function (t) { return words[t]; }).filter(function (w) { return w !== undefined; });
    }
    // no brain to hand (the file's missing, say): the same words, picked by feel alone
    var WORDS = ['b', 'bu', 'bz', 'buzz', 'bzzz', 'z', 'zz', 'zzz', 'B', 'BU', 'BZ', 'BUZZ', 'BZZZ', 'Z', 'ZZ', 'ZZZ', '~', '!', '*stings you*', '*STINGS YOU*', ' '];
    function instinct(mood, n) {
        var B = BIAS[mood] || {}, out = [];
        var w = WORDS.map(function (x) { return Math.exp(groupBias(B, x.replace(/ /g, '▁'))) * (x === ' ' ? 2 : /stings/i.test(x) ? .2 : 1); });
        for (var i = 0; i < n; i++) {
            var sum = w.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * sum, j = 0;
            for (; j < w.length; j++) { r -= w[j]; if (r <= 0) break; }
            var x = WORDS[Math.min(j, WORDS.length - 1)];
            if (x === ' ' && (!out.length || out[out.length - 1] === ' ')) continue;
            out.push(x);
        }
        while (out.length && out[out.length - 1] === ' ') out.pop();
        return out.length ? out : ['bz'];
    }

    /* ======================================================================
       its heart: how it feels, and what it's been told
       ====================================================================== */
    var MAJ = [0, 2, 4, 7, 9], MIN = [0, 3, 5, 7, 10], DREAMY = [0, 2, 4, 6, 9];
    // for each mood: how it seems (the menu), its voice (hz, the scale it's in, how long a letter takes, how buzzy, its
    // wobble, the shape of a reply's tune, how each z bends a buzz, how loud, how bright), how it picks its words
    // (temperature, how many), what it starts from, and how it moves (wingbeat, how long one lap of hovering takes)
    var MOODS = {
        calm:    { seems: 'calm',                    hz: 277, scale: MAJ,    unit: .095, buzz: .4,  vib: [5, .010],   shape: 'arch',   slide: 0,    gain: .8,  bright: .95, follow: .10, rit: 0,    temp: .9,  len: [5, 12],  seed: ['bz', 'buzz'],     flap: .11,  hover: 5,   fx: null },
        happy:   { seems: 'happy',                   hz: 330, scale: MAJ,    unit: .085, buzz: .45, vib: [5.5, .012], shape: 'lilt',   slide: .8,   gain: .9,  bright: 1,   follow: .15, rit: 0,    temp: 1,   len: [6, 14],  seed: ['buzz', 'bz'],     flap: .085, hover: 4,   fx: 'spark' },
        excited: { seems: 'buzzing with excitement', hz: 392, scale: MAJ,    unit: .065, buzz: .6,  vib: [6.5, .015], shape: 'climb',  slide: 1.2,  gain: 1,   bright: 1.15, follow: .25, rit: -.15, temp: 1.15, len: [10, 22], seed: ['BZ', 'buzz'],    flap: .06,  hover: 2.2, fx: 'spark' },
        loving:  { seems: 'smitten',                 hz: 294, scale: DREAMY, unit: .11,  buzz: .25, vib: [4.5, .018], shape: 'arch',   slide: .5,   gain: .75, bright: .85, follow: .10, rit: .1,   temp: .85, len: [6, 12],  seed: ['~', 'buzz'],      flap: .1,   hover: 5.5, fx: 'heart' },
        angry:   { seems: 'furious',                 hz: 233, scale: MIN,    unit: .07,  buzz: .95, vib: [9, .02],    shape: 'stomp',  slide: 0,    gain: 1,   bright: 1.3, follow: .10, rit: 0,    temp: 1.05, len: [8, 18], seed: ['BZ', 'ZZ'],       flap: .05,  hover: 1.8, fx: 'steam', growl: .5 },
        sad:     { seems: 'sad',                     hz: 220, scale: MIN,    unit: .13,  buzz: .3,  vib: [4, .02],    shape: 'droop',  slide: -1.2, gain: .65, bright: .8,  follow: .10, rit: .35,  temp: .8,  len: [3, 8],   seed: ['zzz', '~'],       flap: .14,  hover: 7,   fx: 'tear' },
        scared:  { seems: 'frightened',              hz: 440, scale: MIN,    unit: .06,  buzz: .5,  vib: [11, .03],   shape: 'jitter', slide: .6,   gain: .8,  bright: 1,   follow: .20, rit: 0,    temp: 1.25, len: [4, 10], seed: ['b', 'bu'],        flap: .045, hover: 1.1, fx: 'sweat', pauses: true },
        sleepy:  { seems: 'sleepy',                  hz: 196, scale: MIN,    unit: .16,  buzz: .2,  vib: [3.5, .010], shape: 'sink',   slide: -1.5, gain: .5,  bright: .7,  follow: .05, rit: .4,   temp: .7,  len: [3, 7],   seed: ['zzz', 'z'],       flap: .2,   hover: 8,   fx: 'zzz' },
        curious: { seems: 'curious',                 hz: 311, scale: DREAMY, unit: .09,  buzz: .4,  vib: [5, .012],   shape: 'ask',    slide: 1,    gain: .85, bright: 1,   follow: .15, rit: 0,    temp: .95, len: [5, 11],  seed: ['bu', 'buzz'],     flap: .09,  hover: 4.5, fx: 'question' }
    };
    var ORDER = Object.keys(MOODS);
    // which of its words each mood reaches for (+) or shies from (−): nudges on the model's own odds.
    // CAPS = its shouting words, lower = its ordinary ones, sting / STING = *stings you* / *STINGS YOU*
    var BIAS = {
        calm:    { CAPS: -.8, sting: -1.5, STING: -2 },
        happy:   { buzz: 1.2, bz: .6, '!': .6, '~': .4, CAPS: -1.5, sting: -3, STING: -4 },
        excited: { '!': 1.6, BZ: .8, BUZZ: .9, bzzz: .6, buzz: .8, ' ': -.5, sting: -2, STING: -3 },
        loving:  { '~': 1.6, buzz: .9, bu: .8, ' ': .3, '!': -.3, CAPS: -3, sting: -5, STING: -6 },
        angry:   { CAPS: 2.2, STING: 1, sting: .5, '!': .8, '~': -2, lower: -1 },
        sad:     { zzz: .9, '~': 1.1, ' ': .8, bu: .6, z: .5, '!': -2.5, CAPS: -4, sting: -4, STING: -5 },
        scared:  { b: 1.2, bu: .9, z: .5, '!': 1, ' ': .8, zzz: -.8, bzzz: -.5, CAPS: -.5, sting: -2, STING: -2 },
        sleepy:  { zzz: 1.8, z: .7, '~': .8, ' ': .6, '!': -3, CAPS: -4, sting: -5, STING: -5 },
        curious: { bu: 1, buzz: .6, '~': .8, bz: .3, '!': -.3, CAPS: -1.5, sting: -3, STING: -3 }
    };
    function groupBias(B, piece) {
        var w = piece.replace(/▁/g, ' '), b = B[w] || 0;
        if (/stings/.test(w)) return b + (B.sting || 0);
        if (/STINGS/.test(w)) return b + (B.STING || 0);
        if (/^[A-Z]+$/.test(w)) b += B.CAPS || 0;
        if (/^[a-z]+$/.test(w)) b += B.lower || 0;
        return b;
    }
    var biasMemo = {};
    function biasFor(mood) {
        if (biasMemo[mood]) return biasMemo[mood];
        var B = BIAS[mood] || {}, out = new Float32Array(model.tokens.length);
        normal.forEach(function (i) { out[i] = groupBias(B, model.tokens[i]); });
        return (biasMemo[mood] = out);
    }

    // what it hears in what you say. each line: words (whole words, lowercased), the feeling, and how strongly
    var FEEL = [
        [/^(hi+|hey+|hello+|hiya|howdy|yo|heya|sup|greetings|morning|evening)$/, 'happy', .7],
        [/^(good|great|nice|awesome|cool|fun|happy|glad|yay+|smile|smiling|wonderful|lovely|delight\w*|joy\w*|sunny|sun|sunshine|summer|spring|bloom\w*|flowers?|garden\w*|roses?|daisy|daisies|tulips?|lavender|clover|meadows?|nectar|pollen|honey\w*|hive|thanks|thank|ty|haha+|hehe+|lol|lmao|lmfao|rofl|best|brilliant|perfect|bzz+|buzz+)$/, 'happy', .8],
        [/^(wow+|omg|amazing|incredible|party|dance|dancing|woo+|woohoo+|yippee|hooray|hurray|epic|excit\w*|hype\w*|whee+|yeah+|yes+|fast|zoom\w*|fly|flying)$/, 'excited', 1],
        [/^(love\w*|luv|adore\w*|cute\w*|sweet\w*|darling|baby|babe|hugs?|cuddl\w*|kiss\w*|pretty|beautiful|precious|bestie|bff|friends?|friendly|xoxo|pat|pats|pet|boop|aww+|adorable|smol|marry|heart)$/, 'loving', 1.1],
        [/^(hate\w*|stupid|dumb|idiot\w*|ugly|annoying|kill\w*|die|dies|squash\w*|swat|pest\w*|stink\w*|gross|wasps?|hornets?|raid|poison\w*|destroy\w*|fight\w*|punch\w*|suck\w*|shut|loser|trash|garbage|worst|fuck\w*|shit\w*|damn\w*|bitch\w*|crap|smash\w*|stomp\w*|bad|evil|angry|mad|rage|furious|grr+|steal\w*|stole)$/, 'angry', 1],
        [/^(kill\w*|squash\w*|spray\w*|swat\w*|swatter|smoke)$/, 'scared', .6],
        [/^(sad\w*|cry\w*|cries|tears?|sorry|alone|lonely|miss\w*|lost|dead|died|death|rip|gone|goodbye|bye+|hurt\w*|pain\w*|rainy?|cold|winter|broken|depress\w*|sick|ill|nobody|unhappy|sigh\w*|grief|funeral|wilt\w*|wither\w*)$/, 'sad', 1],
        [/^(scar\w*|afraid|fear\w*|boo+|monsters?|ghosts?|spiders?|birds?|frogs?|bears?|nets?|jars?|traps?|danger\w*|run|help|hide|eek+|ah+|aa+h*|creep\w*|thunder\w*|storms?|horror|terrif\w*|panic\w*|hunt\w*|chase\w*)$/, 'scared', 1],
        [/^(sleep\w*|tired|naps?|bed\w*|night|goodnight|gn|nini|yawn\w*|dream\w*|zzz+|rest\w*|late|moon\w*|quiet|shh+|hush|lullaby|exhausted|drowsy|snooze)$/, 'sleepy', 1],
        [/^(what|why|how|who|where|when|which|wonder\w*|curious|guess|riddle|secrets?|really|hm+|huh|interesting|tell|explain|think)$/, 'curious', .6],
        [/^(calm|ok|okay|fine|chill|relax\w*|peace\w*|breathe|alright|k|kk|sure)$/, 'calm', .7]
    ];
    var EMOJI = [
        [/[\u{1F600}-\u{1F604}\u{1F60A}\u{1F642}\u{1F638}\u{1F338}\u{1F33C}\u{1F33B}\u{1F337}\u{1F36F}☀\u{1F31E}✨\u{1F41D}]/u, 'happy', 1],
        [/[\u{1F606}\u{1F929}\u{1F973}\u{1F389}\u{1F38A}\u{1F64C}‼]/u, 'excited', 1],
        [/[\u{1F60D}\u{1F970}\u{1F618}\u{1F495}\u{1F496}\u{1F497}\u{1F49B}❤♥\u{1FAF6}\u{1F917}]|<3/u, 'loving', 1.2],
        [/[\u{1F620}\u{1F621}\u{1F92C}\u{1F47F}\u{1F4A2}\u{1F595}]/u, 'angry', 1.2],
        [/[\u{1F622}\u{1F62D}\u{1F61E}\u{1F614}\u{1F97A}\u{1F494}☹\u{1F641}]|:\(|;\(|:'\(/u, 'sad', 1.2],
        [/[\u{1F631}\u{1F628}\u{1F630}\u{1F633}\u{1F47B}\u{1F577}\u{1F426}]/u, 'scared', 1],
        [/[\u{1F634}\u{1F971}\u{1F4A4}\u{1F319}]/u, 'sleepy', 1],
        [/[\u{1F914}❓]/u, 'curious', .8],
        [/:\)|:D|:-\)|=\)|\^\^|:3/, 'happy', .8]
    ];
    var NOT = /^(not|no|never|dont|don't|do not|isnt|isn't|aint|ain't|wasnt|wasn't|cant|can't|wont|won't|nothing|nobody|didnt|didn't|doesnt|doesn't)$/;
    var FLIP = { happy: 'sad', excited: 'calm', loving: 'sad', angry: 'calm', sad: 'happy', scared: 'calm', sleepy: 'excited', curious: 'curious', calm: 'scared' };
    var BEE_WORD = /^(\*stings you\*|[bzu]+|[~!]+)$/i;

    function hear(text) {
        var add = {}, raw = text.trim(), low = raw.toLowerCase();
        function feel(m, w) { add[m] = (add[m] || 0) + w; }
        var list = low.replace(/[’]/g, "'").match(/[a-z']+|[~!?]+|\*[^*]*\*/g) || [];
        // spoken in bee? then it answers in kind (and feels whatever that says)
        var bee = list.filter(function (w) { return BEE_WORD.test(w); }).length, beeTalk = list.length && bee / list.length >= 0.6;
        var seed = [];
        if (beeTalk) {
            var caps = (raw.match(/\b[BZU]{2,}\b/g) || []).length;
            if (caps) feel('angry', Math.min(1.5, .45 * caps));
            if (/~/.test(raw)) feel('loving', .6);
            if (/!/.test(raw)) feel('excited', .4);
            if (/zzz/i.test(raw) && !caps) feel('sleepy', .5);
            if (/stings/i.test(raw)) feel('angry', 1.2);
            if (!caps && !/stings/i.test(raw)) feel('happy', .8);              // (someone speaks bee!)
            seed = raw.replace(/\s+/g, ' ').split(' ').slice(-4);
        } else {
            list.forEach(function (w, i) {
                var flip = (i > 0 && NOT.test(list[i - 1])) || (i > 1 && NOT.test(list[i - 2]));
                var long = /(.)\1\1/.test(w) ? 1.2 : 1;                          // ("sooo")
                var plain = w.replace(/(.)\1{2,}/g, '$1$1');
                FEEL.forEach(function (f) {
                    if (f[0].test(w) || f[0].test(plain)) feel(flip ? FLIP[f[1]] : f[1], f[2] * long);
                });
            });
            EMOJI.forEach(function (f) { var m = raw.match(new RegExp(f[0].source, 'gu')); if (m) feel(f[1], f[2] * Math.min(2, m.length)); });
        }
        var q = (raw.match(/\?/g) || []).length;
        if (q) feel('curious', .5 + .25 * Math.min(q, 3));
        var bang = Math.min((raw.match(/!/g) || []).length, 3);
        if (bang) {
            var loud = ['angry', 'excited', 'happy', 'scared'].filter(function (m) { return add[m]; }).sort(function (a, b) { return add[b] - add[a]; })[0] || 'excited';
            feel(loud, .25 * bang);
        }
        var letters = raw.replace(/[^A-Za-z]/g, '');
        if (!beeTalk && letters.length >= 5 && letters.replace(/[^A-Z]/g, '').length / letters.length > .7) feel(add.angry || add.sad ? 'angry' : 'excited', .5);
        if (/\b(you|u|ya|bee|beebee|buzzy)\b/.test(low)) Object.keys(add).forEach(function (m) { add[m] *= 1.15; });
        if (!Object.keys(add).length) feel('curious', .35);                      // (it doesn't know what you mean, and wonders)
        return { add: add, seed: seed, bee: beeTalk, words: list.length };
    }

    function visit(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
    // the revolver (below): which gun it's taken off you (this visit), and whether it's never forgiving you
    var GUNS = { revolver: 'the revolver', 'white-revolver': 'the white revolver' };
    var gun = MAPPING ? null : visit('bee-gun'), grudge = !MAPPING && store('bee-grudge') === '1';
    if (!GUNS[gun]) gun = null;
    var heart = { calm: 0 }, lastFelt = Date.now(), fond = clamp(+(store('bee-heart') || 0) || 0, -1, 1);
    ORDER.forEach(function (m) { heart[m] = 0; });
    function settle() {                                                        // feelings fade (half of it a minute)
        var dt = (Date.now() - lastFelt) / 1000, k = Math.pow(.5, dt / 60);
        ORDER.forEach(function (m) { heart[m] *= k; });
        lastFelt = Date.now();
    }
    function feelAll(add) {
        settle();
        ORDER.forEach(function (m) { heart[m] *= .55; });
        var warm = (add.happy || 0) + (add.loving || 0) + (add.excited || 0);
        if (warm > 0) { heart.angry *= .6; heart.sad *= .6; heart.scared *= .8; }
        if (add.angry) { heart.loving *= .5; heart.happy *= .6; }
        if (add.sad) heart.excited *= .5;
        if (add.sleepy) heart.excited *= .4;
        Object.keys(add).forEach(function (m) { heart[m] = clamp((heart[m] || 0) + add[m], 0, 3); });
        fond = clamp(fond + .06 * ((add.happy || 0) + (add.loving || 0) + .5 * (add.excited || 0)) - .07 * (add.angry || 0), -1, 1);
        if (!MAPPING) store('bee-heart', fond.toFixed(3));
    }
    function mood() {
        settle();
        if (gun || grudge) return 'angry';                                     // (the revolver, below: it's not over it)
        var best = 'calm', top = 0;
        ORDER.forEach(function (m) { if (m !== 'calm' && heart[m] > top) { top = heart[m]; best = m; } });
        if (top >= .4) return best;
        return fond > .35 ? 'happy' : fond < -.35 ? 'sad' : 'calm';
    }

    /* ======================================================================
       its voice
       ====================================================================== */
    // a warm stereo hall for it to buzz in, made once (dark noise that fades, the highs fading first)
    function hall(ctx) {
        var sr = ctx.sampleRate, n = Math.floor(sr * 2.2), buf = ctx.createBuffer(2, n, sr);
        for (var ch = 0; ch < 2; ch++) {
            var d = buf.getChannelData(ch), y = 0, e = 0;
            for (var i = 0; i < n; i++) {
                var t = i / sr, a = .55 - .45 * Math.min(1, t / 1.6);               // (the lowpass closes as it fades)
                y += a * ((Math.random() * 2 - 1) - y);
                d[i] = y * Math.exp(-t / .55) * Math.min(1, t / .02);
                e += d[i] * d[i];
            }
            e = 1 / Math.sqrt(e);
            for (var j = 0; j < n; j++) d[j] *= e;
        }
        return buf;
    }
    // everything it says goes through this: a bus straight out, one to the hall, one to an echo that bounces side to side;
    // and at the end a limiter that only touches the rare peak (Victor: no squashing)
    function Engine(ctx) {
        var master = ctx.createGain(), limit = ctx.createDynamicsCompressor();
        limit.threshold.value = -3; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = .002; limit.release.value = .12;
        master.connect(limit); limit.connect(ctx.destination);
        var dry = ctx.createGain(); dry.connect(master);
        var verb = ctx.createConvolver(); verb.buffer = hall(ctx); verb.connect(master);
        var echo = ctx.createGain(), dl = ctx.createDelay(1), dr = ctx.createDelay(1), fl = ctx.createGain(), fr = ctx.createGain();
        dl.delayTime.value = .3; dr.delayTime.value = .3; fl.gain.value = .32; fr.gain.value = .32;
        echo.connect(dl); dl.connect(fl); fl.connect(dr); dr.connect(fr); fr.connect(dl);
        dl.connect(panner(ctx, -.6, master)); dr.connect(panner(ctx, .6, master));
        return { ctx: ctx, master: master, dry: dry, verb: verb, echo: echo };
    }
    function panner(ctx, p, to) {
        if (!ctx.createStereoPanner) { var g = ctx.createGain(); if (to) g.connect(to); return g; }
        var n = ctx.createStereoPanner(); n.pan.value = p; if (to) n.connect(to); return n;
    }
    // one reply's own way out (so it can be hushed mid-word): straight, to the hall, to the echo
    function bus(E, wet, echo) {
        var c = E.ctx, b = { dry: c.createGain(), verb: c.createGain(), echo: c.createGain() };
        b.verb.gain.value = wet; b.echo.gain.value = echo;
        b.dry.connect(E.dry); b.verb.connect(E.verb); b.echo.connect(E.echo);
        return b;
    }

    // Victor's own buzz (assets/sounds/bee-voice), played at every pitch, if there is one
    var sample = null;
    function pitchOf(buf) {                                       // (its note: where it best lines up with itself)
        var d = buf.getChannelData(0), sr = buf.sampleRate, n = Math.min(4096, d.length >> 1), at = Math.max(0, (d.length >> 1) - (n >> 1));
        var best = 0, lag = 0;
        for (var L = Math.floor(sr / 900); L < Math.floor(sr / 70); L++) {
            var s = 0, e1 = 0, e2 = 0;
            for (var i = 0; i < n; i++) { var a = d[at + i], b = d[at + i + L] || 0; s += a * b; e1 += a * a; e2 += b * b; }
            var r = s / Math.sqrt(e1 * e2 + 1e-9);
            if (r > best) { best = r; lag = L; }
        }
        return best > .5 && lag ? sr / lag : 262;
    }
    function loadVoice(E) {
        if (loadVoice.done) return;
        loadVoice.done = true;
        Sky.findAsset('assets/sounds/bee-voice.ogg|assets/sounds/bee-voice.mp3', function (url) {
            if (!url) return;
            fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (a) { return E.ctx.decodeAudioData(a); }).then(function (buf) {
                var len = buf.duration;
                sample = { buf: buf, hz: pitchOf(buf), from: len > .6 ? len * .25 : 0, to: len > .6 ? len * .75 : len };
            }).catch(function () {});
        });
    }

    // one buzz. o: t (when), dur, f (its note, Hz), gain, pan, buzz (0 smooth … 1 raspy), swoop (slides up into it: "bwoo"),
    // pluck (a crisp "b" start), slide (semitones it bends by the end), vib [speed, depth], bright, growl
    function buzz(E, B, o) {
        var c = E.ctx, t = o.t, end = t + o.dur, stop = end + .45, f = o.f, fp, src, k = 1;
        if (sample) {
            src = c.createBufferSource(); src.buffer = sample.buf; src.loop = true; src.loopStart = sample.from; src.loopEnd = sample.to;
            fp = src.playbackRate; k = 1 / sample.hz;
        } else {
            src = c.createOscillator(); src.type = 'sawtooth'; fp = src.frequency;
        }
        var into = o.swoop ? .14 : .05, from = f * Math.pow(2, (o.swoop ? -5 : -1.5) / 12), to = f * Math.pow(2, (o.slide || 0) / 12);
        function glide(p, kk) {
            p.setValueAtTime(from * kk, t);
            p.exponentialRampToValueAtTime(f * kk, t + into);
            p.exponentialRampToValueAtTime(Math.max(20 * kk, to * kk), Math.max(t + into + .01, end));
        }
        glide(fp, k);
        var vib = c.createOscillator(), vg = c.createGain();      // (its wobble)
        vib.frequency.value = o.vib[0]; vg.gain.value = f * o.vib[1] * k;
        vib.connect(vg); vg.connect(fp);
        var flap = .08 + .25 * o.buzz, a1 = c.createGain(), fl = c.createOscillator(), flg = c.createGain();
        a1.gain.value = 1 - flap; fl.frequency.value = 32; flg.gain.value = flap;   // (tiny wings beating)
        fl.connect(flg); flg.connect(a1.gain);
        var rasp = Math.min(.6, .25 * o.buzz + .25 * (o.growl || 0)), a2 = c.createGain(), sub = c.createOscillator(), sg = c.createGain();
        a2.gain.value = 1 - rasp; sg.gain.value = rasp;          // (a low growl under it, an octave down)
        glide(sub.frequency, .5);
        sub.connect(sg); sg.connect(a2.gain);
        var lp = c.createBiquadFilter(), br = o.bright || 1;      // (the squelchy part: a resonant filter that opens and closes)
        lp.type = 'lowpass'; lp.Q.value = 7;
        lp.frequency.setValueAtTime(Math.min(f * (2.2 + o.buzz + (o.swoop ? 7 : 5) + (o.pluck ? 6 : 0)) * br, 9000), t);
        lp.frequency.setTargetAtTime(Math.min(f * (2.2 + o.buzz) * br, 9000), t + .005, o.pluck ? .07 : .12);
        var env = c.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(o.gain, t + (o.pluck ? .004 : .015));
        env.gain.setValueAtTime(o.gain, Math.max(t + .02, end));
        env.gain.setTargetAtTime(0, Math.max(t + .02, end), .05);
        var pan = panner(c, o.pan || 0);
        src.connect(a1); a1.connect(a2); a2.connect(lp); lp.connect(env); env.connect(pan);
        pan.connect(B.dry); pan.connect(B.verb); pan.connect(B.echo);
        [src, vib, fl, sub].forEach(function (s) { s.start(t); s.stop(stop); });
    }

    function semis(M, s) {                                        // a pitch, onto the mood's own scale (nothing sour)
        var best = 0, gap = 99;
        for (var oc = -3; oc <= 3; oc++) M.scale.forEach(function (d) { var x = d + 12 * oc; if (Math.abs(x - s) < gap) { gap = Math.abs(x - s); best = x; } });
        return best;
    }
    function hash(i) { var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
    // the tune of a whole reply, in semitones, over x = 0 … 1 (k: how far it goes; more for a longer reply)
    var SHAPES = {
        arch:   function (x, k) { return k * 3 * Math.sin(Math.PI * x); },
        lilt:   function (x, k) { return k * (2.5 * Math.sin(Math.PI * x) + 2 * x); },
        climb:  function (x, k, i) { return k * 6 * x + 1.5 * Math.sin(4 * Math.PI * x) + (hash(i) - .5) * 2; },
        stomp:  function (x, k, i) { return 2 + k * 1.5 * Math.sin(2 * Math.PI * x) + (hash(i) > .7 ? 3 : 0); },
        droop:  function (x, k) { return k * (1 - 7 * x); },
        jitter: function (x, k, i) { return k * 2 * x + (hash(i) - .5) * 7; },
        sink:   function (x, k) { return -k * 5 * x; },
        ask:    function (x, k) { return k * (1.5 * Math.sin(Math.PI * x * .8) + 8 * Math.pow(x, 4)); }
    };
    var OFFSET = { b: 3, bu: 1, bz: 2, z: 4, zz: 2, zzz: 0, bzzz: -1, buzz: 1 };

    // talking: each word a buzz, as it's said; the tune and the speed rise and fall over the reply, each z draws it out
    function composeTalk(w, mood) {
        var M = MOODS[mood], ev = [], at = 0;
        var sounding = w.filter(function (x) { return x !== ' '; }), n = sounding.length, k = clamp(n / 10, .6, 1.7);
        var si = 0, last = 0, lastF = M.hz;
        w.forEach(function (x, idx) {
            var pos = n > 1 ? si / (n - 1) : .5, cont = SHAPES[M.shape](pos, k, idx + n * 7);
            var tempo = clamp((1 - M.follow * cont / 8) * (1 + M.rit * pos), .55, 1.9), u = M.unit * tempo;
            if (x === ' ') { ev.push({ at: at, dur: u, word: x, rest: true }); at += u * (M.pauses && Math.random() < .3 ? 2.6 : .9); return; }
            si++;
            var lw = x.toLowerCase(), caps = x !== lw && /^[A-Z*]/.test(x), zc = (lw.match(/z/g) || []).length;
            var note = { gain: .36 * M.gain * (caps ? 1.3 : 1), buzz: Math.min(1, M.buzz + (caps ? .3 : 0)), vib: M.vib, bright: M.bright * (caps ? 1.2 : 1), growl: (M.growl || 0) + (caps ? .3 : 0) };
            var s, dur, e = { at: at, word: x, caps: caps };
            if (lw === '~') {                                      // a wobbly hum
                s = semis(M, last + 1); dur = u * 2.2;
                note.vib = [7, .05]; note.slide = 0;
                e.fx = 'wobble';
            } else if (lw === '!') {                               // a chirp
                s = semis(M, last + 5); dur = u * 1.1;
                note.slide = 5; note.pluck = true; note.gain *= 1.2;
                e.fx = 'chirp';
            } else if (/stings/.test(lw)) {                        // a dive-bomb
                s = semis(M, last + 10); dur = .45 + (caps ? .15 : 0);
                note.slide = caps ? -18 : -14; note.pluck = true; note.buzz = 1; note.gain *= 1.2;
                e.fx = 'zap';
            } else if (OFFSET[lw] !== undefined) {                 // one of its words
                s = semis(M, cont + OFFSET[lw] + (caps ? 3 : 0));
                dur = u * (1 + .85 * zc + (lw[0] === 'b' ? .4 : 0) + (lw.indexOf('u') >= 0 ? .3 : 0));
                note.slide = M.slide * Math.min(zc, 3) + (M.shape === 'ask' && pos > .85 ? 3 : 0);
                note.swoop = lw.indexOf('u') >= 0; note.pluck = lw[0] === 'b';
            } else {                                               // something else: a tiny bip
                s = semis(M, cont + 2); dur = u * .6; note.pluck = true; note.gain *= .6;
            }
            var f = M.hz * Math.pow(2, s / 12);
            note.f = f; note.dur = dur; note.pan = clamp(s / 14, -.45, .45);
            e.dur = dur; e.notes = [note];
            e.lift = clamp(s * 2.2, -20, 26); e.tilt = clamp((f / lastF - 1) * 60, -16, 16);
            e.mouth = clamp(.35 + .2 * zc + (caps ? .3 : 0), .3, 1);
            ev.push(e);
            last = s; lastF = f;
            at += dur + u * .25;
        });
        return { events: ev, total: at, wet: .9, echo: .5 };
    }

    // singing: its words as keys on a little keyboard (every key in one five-note scale: any order sounds nice).
    // each mood has its own keyboard (Victor: the notes it sings fit how it feels):
    //   scale   the five keys (semitones above the root). each is a "mode" with its own colour:
    //           major pentatonic = sunny; the maj9 chord's own notes = dreamy and warm; minor with the flat 6 = sad;
    //           diminished (stacked minor thirds) with a semitone rub = suspense; the suspended pentatonic (no 3rd, so
    //           neither happy nor sad) = drifting; lydian's raised 4th = wonder; a minor blues with the flat 5 = mean
    //   base    the root (a MIDI note: 60 is middle C): high for happy and frightened, low for sad, sleepy and cross
    //   beat    seconds per step; art: how long each note rings against that (under 1 bouncy and clipped, over 1 legato)
    //   chord   what a shouted (CAPS) word plays, in semitones over its note: major, major 7th, minor, diminished,
    //           sus2, a lydian #4, an add9, or a bare power chord (root, fifth, octave) when it's furious
    //   bed     what plays under the whole song: a soft held chord (pad), an oom-pah (bounce), a pounding root (chug),
    //           a shivering high pair (shiver), or nothing
    //   drift   how the tune wanders over the song (in keys): up when it's excited or curious, down when sad or sleepy
    //   (and its voice for the song: buzz, growl, wobble, how notes bend and swoop into place)
    var SING = {
        calm:    { scale: [0, 2, 4, 7, 9],   base: 55, beat: .1,   art: 1.1, gain: .28, chord: [0, 4, 7],      bed: 'pad',    drift: 0,    vib: [5, .01] },
        happy:   { scale: [0, 2, 4, 7, 9],   base: 60, beat: .085, art: .7,  gain: .3,  chord: [0, 4, 7],      bed: 'bounce', drift: .15,  vib: [6, .012], pluck: true },
        excited: { scale: [0, 2, 4, 7, 9],   base: 62, beat: .065, art: .6,  gain: .32, chord: [0, 4, 7, 14],  bed: 'bounce', drift: .45,  vib: [6.5, .015], pluck: true, swoop: true },
        loving:  { scale: [0, 4, 7, 11, 14], base: 57, beat: .13,  art: 1.8, gain: .25, chord: [0, 4, 7, 11],  bed: 'pad',    drift: 0,    vib: [4.5, .02], swoop: true, buzz: .25 },
        angry:   { scale: [0, 3, 5, 6, 7],   base: 45, beat: .075, art: .55, gain: .34, chord: [0, 7, 12],     bed: 'chug',   drift: 0,    vib: [9, .02], pluck: true, buzz: 1, growl: .7 },
        sad:     { scale: [0, 2, 3, 7, 8],   base: 52, beat: .15,  art: 1.7, gain: .24, chord: [0, 3, 7],      bed: 'pad',    drift: -.4,  vib: [4, .022], slide: -.6, buzz: .3 },
        scared:  { scale: [0, 1, 3, 6, 9],   base: 64, beat: .06,  art: .5,  gain: .22, chord: [0, 3, 6],      bed: 'shiver', drift: 0,    vib: [11, .03], pluck: true, jitter: true },
        sleepy:  { scale: [0, 2, 5, 7, 10],  base: 50, beat: .2,   art: 2.2, gain: .2,  chord: [0, 2, 7],      bed: 'pad',    drift: -.25, vib: [3.5, .01], slide: -.3, buzz: .2 },
        curious: { scale: [0, 2, 4, 6, 9],   base: 58, beat: .1,   art: 1,   gain: .27, chord: [0, 4, 6],      bed: 'none',   drift: .3,   vib: [5, .012], swoop: true, endUp: true }
    };
    // dread (the revolver, below: while it's pointing it at you, or never forgiving you): a dark five (root, a semitone
    // up, a minor third, the tritone, the fifth), low and slow, every note sagging and growling, the shouted chords
    // crushed into clusters, and a heartbeat under the whole song
    var DREAD = [0, 1, 3, 6, 7];
    var DREADED = { scale: DREAD, base: 46, beat: .13, art: 1.6, gain: .3, chord: [0, 1, 6], bed: 'heart', drift: -.15, vib: [7, .02], slide: -.7, buzz: .9, growl: .7, bright: .85 };
    var NOTE = { b: 0, bu: 1, bz: 2, buzz: 3, bzzz: 4, z: 5, zz: 6, zzz: 7 };
    function composeSing(w, mood, dread) {
        var M = MOODS[mood], P = dread ? DREADED : SING[mood] || SING.calm, sc = P.scale, unit = P.beat, ev = [], at = 0;
        var n = w.filter(function (x) { return x !== ' '; }).length, si = 0;
        function hz(step, semis) { return 440 * Math.pow(2, (P.base + sc[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5) + (semis || 0) - 69) / 12); }
        function one(step, len, extra) {
            var nn = { f: hz(step), dur: len * P.art, gain: P.gain, buzz: P.buzz !== undefined ? P.buzz : M.buzz, vib: P.vib,
                       bright: P.bright || M.bright, growl: P.growl !== undefined ? P.growl : M.growl || 0, slide: P.slide || 0,
                       pan: (step - 3.5) / 3.5 * .35, pluck: !!P.pluck, swoop: !!P.swoop };
            if (P.jitter) nn.f *= 1 + (Math.random() - .5) * .012;                  // (a voice that won't hold still)
            for (var k in extra) nn[k] = extra[k];
            return nn;
        }
        w.forEach(function (x) {
            var lw = x.toLowerCase(), caps = x !== lw && /^[A-Z*]/.test(x), zc = (lw.match(/z/g) || []).length, e = { at: at, word: x, caps: caps }, gap;
            var pos = n > 1 ? si / (n - 1) : .5, shift = Math.round(P.drift * 6 * pos) + (P.endUp && pos > .8 ? 3 : 0);
            if (x !== ' ') si++;
            if (x === ' ') { e.rest = true; e.dur = unit; gap = P.jitter && Math.random() < .3 ? 3 : 1; }      // (frightened: it freezes now and then)
            else if (lw === '~') {
                e.notes = [3, 4, 5, 6].map(function (st, i) { var nn = one(st + shift, .05, { pluck: true, gain: P.gain * .8 }); nn.off = i * unit * .7; return nn; });
                e.dur = .3; e.fx = 'wobble'; e.step = 6 + shift; gap = 2.5;
            } else if (lw === '!') {
                e.notes = [one(8 + shift, .1, { swoop: true, pluck: true, gain: P.gain * 1.2 })]; e.dur = .14; e.fx = 'chirp'; e.step = 8 + shift; gap = 2;
            } else if (/stings/.test(lw)) {
                e.notes = [one(caps ? 9 : 7, (caps ? .45 : .3) / P.art, { pluck: true, slide: caps ? -14 : -9, buzz: 1, gain: P.gain * 1.2 })]; e.dur = .45; e.fx = 'zap'; e.step = 9; gap = .45 / unit + 1;
            } else if (NOTE[lw] !== undefined) {
                var len = .05 + .08 * zc, st = NOTE[lw] + shift, sw = lw.indexOf('u') >= 0;
                if (caps) {                                        // a little swarm, buzzing the mood's chord
                    e.notes = P.chord.map(function (semi, i) { var nn = one(st, len + .08, { swoop: sw || !!P.swoop, gain: P.gain * .7 }); nn.f = hz(st, semi); nn.off = i * .025; nn.f *= 1 + .004 * (i - 1); return nn; });
                } else e.notes = [one(st, len, { swoop: sw || !!P.swoop, pluck: lw[0] === 'b' || !!P.pluck })];
                e.step = st;
                e.dur = len * P.art + (caps ? .08 : 0);
                gap = Math.max(1, lw.length - 1) + (caps ? 1 : 0);
            } else { e.notes = [one(hashStep(x) + shift, .04, { pluck: true, gain: P.gain * .6 })]; e.dur = .05; e.step = 3 + shift; gap = 1; }
            if (e.notes) { e.lift = clamp((e.step - 3.5) * 4, -18, 26); e.tilt = 0; e.mouth = clamp(.4 + .2 * zc + (caps ? .3 : 0), .3, 1); }
            ev.push(e);
            at += gap * unit;
        });
        // what plays under it (all scheduled with the first word)
        var under = [], end = at + .2, root = hz(-5), bar = unit * 8;
        function bed(f, dur, gain, extra) { var o = { f: f, dur: dur, gain: gain, buzz: .25, vib: [.8, .006], bright: .55, growl: 0, pan: 0 }; for (var k in extra) o[k] = extra[k]; under.push(o); return o; }
        if (P.bed === 'pad') P.chord.forEach(function (semi, i) {                       // a soft held chord, an octave down
            bed(hz(-5, semi), end, .045, { off: i * .04, pan: (i - 1) * .3, vib: [.7 + i * .2, .008] });
        });
        else if (P.bed === 'bounce') for (var t = 0; t < end; t += bar / 2) {         // oom (the root) … pah (the chord)
            bed(root, unit * 1.2, .13, { off: t, pluck: true, bright: .9 });
            P.chord.slice(1, 3).forEach(function (semi) { bed(hz(0, semi), unit * .8, .07, { off: t + bar / 4, pluck: true, bright: 1 }); });
        }
        else if (P.bed === 'chug') for (var c = 0; c < end; c += unit * 2) {          // a pounding low root and fifth
            bed(root, unit * 1.3, .15, { off: c, pluck: true, buzz: 1, growl: .8, bright: 1 });
            if ((c / (unit * 2)) % 4 === 3) bed(hz(-5, 7), unit * 1.3, .11, { off: c, pluck: true, buzz: 1, growl: .6, bright: 1 });
        }
        else if (P.bed === 'shiver') [0, 6].forEach(function (semi, i) {               // a high pair, a tritone apart, trembling
            bed(hz(5, semi), end, .03, { off: 0, vib: [13 + i * 2, .025], bright: .7, pan: i ? .35 : -.35 });
        });
        else if (P.bed === 'heart') {                                                   // the heartbeat: dun-dun, low, all the way through
            for (var h = 0; h < end; h += .95) {
                bed(hz(0), .13, .34, { off: h, pluck: true, buzz: .7, growl: .8, bright: 1, slide: -1, vib: [3, .004] });
                bed(hz(0), .1, .24, { off: h + .24, pluck: true, buzz: .7, growl: .8, bright: .9, slide: -1, vib: [3, .004] });
            }
            bed(hz(-2), end, .07, { buzz: .5, growl: .4, bright: .5, vib: [.6, .01] });   // (and a low tritone, humming)
        }
        if (under.length && ev.length) ev[0].notes = (ev[0].notes || []).concat(under);
        var wet = { loving: 1.4, sad: 1.4, sleepy: 1.5, scared: 1.2, angry: .8, excited: 1, happy: 1 }[mood] || 1.1;
        return { events: ev, total: at + .3, wet: dread ? 1.4 : wet, echo: dread ? .8 : .7 };
    }
    function hashStep(x) { var s = 0; for (var i = 0; i < x.length; i++) s += x.charCodeAt(i); return s % 8; }

    var E = null;                                                 // the live voice (made on the first click: browsers insist)
    function voice() {
        if (E || MAPPING) return E;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { E = Engine(new AC()); } catch (e) { return null; }
        loadVoice(E);
        return E;
    }
    function level() { var v = Sky.sounds ? Sky.sounds.sfxVolume : .7; return .9 * (v === undefined ? .7 : v) / .7; }

    // saying a planned reply: every buzz scheduled on the sound's own clock, and each word shown and acted out as it sounds
    var run = null;
    function perform(plan, onWord, onDone) {
        hush();
        var me = run = { timers: [], bus: null };
        var V = plan.silent ? null : voice(), lead = .09;
        if (V) {
            if (V.ctx.state !== 'running') V.ctx.resume().catch(function () {});
            V.master.gain.value = Math.min(1.4, level());
            var t0 = V.ctx.currentTime + lead;
            me.bus = bus(V, plan.wet * .3, plan.echo * .3);
            plan.events.forEach(function (e) {
                (e.notes || []).forEach(function (n) {
                    var o = {}; for (var k in n) o[k] = n[k];
                    o.t = t0 + e.at + (n.off || 0);
                    try { buzz(V, me.bus, o); } catch (err) {}
                });
            });
        }
        plan.events.forEach(function (e) {
            me.timers.push(setTimeout(function () { if (run === me) onWord(e); }, (lead + e.at) * 1000));
        });
        me.timers.push(setTimeout(function () { if (run !== me) return; run = null; if (onDone) onDone(); }, (lead + plan.total + .35) * 1000));
    }
    function hush() {
        if (!run) return;
        run.timers.forEach(clearTimeout);
        if (run.bus && E) {
            var t = E.ctx.currentTime;
            ['dry', 'verb', 'echo'].forEach(function (k) { run.bus[k].gain.cancelScheduledValues(t); run.bus[k].gain.setTargetAtTime(0, t, .03); });
        }
        run = null;
        talking(false);
    }

    /* ======================================================================
       its body: the stand-in bee, and how it moves
       ====================================================================== */
    var DRAWN =
        '<svg class="placeholder bee-drawn" viewBox="0 0 120 100" aria-hidden="true">' +
            '<defs><clipPath id="bee-body-clip"><ellipse cx="54" cy="60" rx="34" ry="25"/></clipPath></defs>' +
            '<g class="b-wing w-back"><ellipse cx="48" cy="30" rx="14" ry="22" transform="rotate(-24 48 30)" fill="#dff1fb" fill-opacity=".5" stroke="#2a1d14" stroke-width="1.6"/></g>' +
            '<g class="b-legs" stroke="#2a1d14" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M42 82 q-2 7 -6 9"/><path d="M56 84 q0 7 -3 10"/><path d="M70 81 q3 7 1 11"/></g>' +
            '<path class="b-sting" d="M22 60 L7 64 L22 69 Z" fill="#2a1d14"/>' +
            '<g class="b-body">' +
                '<ellipse cx="54" cy="60" rx="34" ry="25" fill="var(--bee-y)"/>' +
                '<g clip-path="url(#bee-body-clip)" fill="#2a1d14"><rect x="33" y="30" width="9" height="60"/><rect x="50" y="30" width="9" height="60"/></g>' +
                '<ellipse cx="54" cy="60" rx="34" ry="25" fill="none" stroke="#2a1d14" stroke-width="2.4"/>' +
                '<ellipse cx="45" cy="47" rx="11" ry="4.5" fill="#fff" opacity=".35"/>' +
            '</g>' +
            '<g class="b-head">' +
                '<g class="b-ant" stroke="#2a1d14" stroke-width="2" stroke-linecap="round" fill="none">' +
                    '<path class="ant-l" d="M84 36 Q80 21 72 17"/><path class="ant-r" d="M93 35 Q98 20 106 16"/>' +
                    '<circle cx="72" cy="17" r="3.2" fill="#2a1d14"/><circle cx="106" cy="16" r="3.2" fill="#2a1d14"/></g>' +
                '<circle cx="88" cy="53" r="19" fill="var(--bee-y)" stroke="#2a1d14" stroke-width="2.4"/>' +
                '<ellipse class="b-cheek" cx="98" cy="61" rx="5" ry="3.2" fill="#ef7f86"/>' +
                '<g class="b-eye e-open"><ellipse cx="94" cy="48" rx="6.2" ry="7.6" fill="#fff" stroke="#2a1d14" stroke-width="1.4"/>' +
                    '<circle class="b-pupil" cx="95.6" cy="49" r="3.7" fill="#2a1d14"/><circle cx="97" cy="47.2" r="1.25" fill="#fff"/></g>' +
                '<path class="b-eye e-happy" d="M88 50 Q94 42 100 50" fill="none" stroke="#2a1d14" stroke-width="2.6" stroke-linecap="round"/>' +
                '<path class="b-eye e-shut" d="M88 49 Q94 54 100 49" fill="none" stroke="#2a1d14" stroke-width="2.6" stroke-linecap="round"/>' +
                '<path class="b-eye e-heart" d="M94 55 C85 49 87 41 94 45.5 C101 41 103 49 94 55 Z" fill="#d6455b" stroke="#2a1d14" stroke-width="1.3"/>' +
                '<path class="b-brow" d="M87 38.5 Q94 35 101 38.5" fill="none" stroke="#2a1d14" stroke-width="2.4" stroke-linecap="round"/>' +
                '<path class="b-mouth" d="M93 64 Q97 67.5 101.5 63" fill="none" stroke="#2a1d14" stroke-width="2" stroke-linecap="round"/>' +
                '<ellipse class="b-mouth-open" cx="97.5" cy="65" rx="3.4" ry="3" fill="#6a2620" stroke="#2a1d14" stroke-width="1.3"/>' +
                '<path class="b-tear" d="M95 56 q-3 5 0 7.5 q3-2.5 0-7.5z" fill="#8fd0f2" stroke="#2a1d14" stroke-width=".7"/>' +
                '<path class="b-sweat" d="M109 37 q-3.5 5.5 0 8 q3.5-2.5 0-8z" fill="#c8ecfd" stroke="#2a1d14" stroke-width=".8"/>' +
            '</g>' +
            '<g class="b-wing w-front"><ellipse cx="62" cy="28" rx="15" ry="24" transform="rotate(16 62 28)" fill="#eef8ff" fill-opacity=".7" stroke="#2a1d14" stroke-width="1.6"/></g>' +
        '</svg>';
    // the little puffs it lets off (each a slot: assets/living/bee-fx-<name>)
    var FX = {
        heart: '<svg viewBox="0 0 24 24"><path d="M12 21 C3 14 1 9 5 5.5 C8 3 11 5 12 7 C13 5 16 3 19 5.5 C23 9 21 14 12 21 Z" fill="#e2566c" stroke="#2a1d14" stroke-width="1.3"/></svg>',
        tear: '<svg viewBox="0 0 24 24"><path d="M12 3 C8 10 6 13 6 16 a6 6 0 0 0 12 0 C18 13 16 10 12 3 Z" fill="#8fd0f2" stroke="#2a1d14" stroke-width="1.2"/></svg>',
        steam: '<svg viewBox="0 0 24 24"><path d="M5 18 q-3-4 1-7 q-1-5 5-5 q3-4 7 0 q5 1 3 6 q3 4-2 6 Z" fill="#f3e6c2" fill-opacity=".85" stroke="#9a3b1f" stroke-width="1.2"/></svg>',
        sweat: '<svg viewBox="0 0 24 24"><path d="M12 3 C9 9 7 12 7 15 a5 5 0 0 0 10 0 C17 12 15 9 12 3 Z" fill="#c8ecfd" stroke="#2a1d14" stroke-width="1.1"/></svg>',
        zzz: '<svg viewBox="0 0 24 24"><text x="12" y="18" text-anchor="middle" font-family="IM Fell English, Georgia, serif" font-style="italic" font-size="18" fill="#f3e6c2" stroke="#2a1d14" stroke-width=".7">z</text></svg>',
        spark: '<svg viewBox="0 0 24 24"><path d="M12 2 C12.8 9 15 11.2 22 12 C15 12.8 12.8 15 12 22 C11.2 15 9 12.8 2 12 C9 11.2 11.2 9 12 2 Z" fill="#fff0bf" stroke="#2a1d14" stroke-width="1"/></svg>',
        question: '<svg viewBox="0 0 24 24"><text x="12" y="19" text-anchor="middle" font-family="IM Fell English, Georgia, serif" font-size="20" fill="#f3e6c2" stroke="#2a1d14" stroke-width=".8">?</text></svg>',
        zap: '<svg viewBox="0 0 24 24"><path d="M14 2 L5 13 h6 l-2 9 l9-12 h-6 Z" fill="#ffe14d" stroke="#2a1d14" stroke-width="1.2" stroke-linejoin="round"/></svg>'
    };
    var fxArt = {};
    Object.keys(FX).forEach(function (k) { Sky.findAsset('assets/living/bee-fx-' + k, function (url) { if (url) fxArt[k] = url; }); });
    // your revolver, in its little hands, seen from the front: the muzzle pointed straight at you (slot: assets/living/bee-gun)
    var GUN_ART = '<svg class="placeholder" viewBox="0 0 60 66">' +
        '<path d="M33 40 L44 60 Q46 64 41 64 L31 64 Q27 64 27 60 L25 42 Z" fill="#6e4a2c" stroke="#2a1d14" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<ellipse cx="30" cy="51" rx="7" ry="5" fill="none" stroke="#2a1d14" stroke-width="2"/>' +
        '<circle cx="30" cy="34" r="17" fill="#8d8f96" stroke="#2a1d14" stroke-width="1.8"/>' +
        [30, 90, 150, 210, 330].map(function (a) {
            var r = a * Math.PI / 180;
            return '<circle cx="' + (30 + 11 * Math.cos(r)).toFixed(1) + '" cy="' + (34 + 11 * Math.sin(r)).toFixed(1) + '" r="3.4" fill="#3a3a40"/>';
        }).join('') +
        '<rect x="24" y="9" width="12" height="16" rx="3" fill="#a6a8ae" stroke="#2a1d14" stroke-width="1.6"/>' +
        '<circle cx="30" cy="23" r="10" fill="#c3c5cb" stroke="#2a1d14" stroke-width="1.8"/>' +
        '<circle cx="30" cy="23" r="6" fill="#0d0a08"/>' +
        '<path d="M24.5 17.5 A8 8 0 0 1 31 15" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>' +
        '<rect x="28.5" y="9" width="3" height="4" fill="#2a1d14"/>' +
        '<path d="M8 40 Q16 33 21 37 M52 40 Q44 33 39 37" fill="none" stroke="#2a1d14" stroke-width="2.4" stroke-linecap="round"/></svg>';

    var home = document.createElement('div');
    home.className = 'bee-home';
    home.dataset.mood = 'calm';
    home.innerHTML =
        '<div class="bee-bubble" aria-hidden="true"><span></span></div>' +
        '<button type="button" class="bee" aria-label="the bee: talk to it">' +
            '<span class="bee-fly"><span class="bee-pose"><span class="bee-art" data-slot="assets/living/bee">' + DRAWN + '<img class="art" alt="" hidden></span></span>' +
            '<span class="bee-gun" aria-hidden="true">' + GUN_ART + '</span>' +
            '<span class="bee-fx" aria-hidden="true"></span></span>' +
            '<span class="kh-hint">the bee</span>' +
        '</button>';
    stage.appendChild(home);
    var beeBtn = home.querySelector('.bee'), pose = home.querySelector('.bee-pose'), art = home.querySelector('.bee-art'),
        artImg = art.querySelector('img'), fxBox = home.querySelector('.bee-fx'), bubble = home.querySelector('.bee-bubble span'),
        gunEl = home.querySelector('.bee-gun');
    Sky.findAsset('assets/living/bee-gun', function (url) { if (url) gunEl.innerHTML = '<img alt="" src="' + url + '">'; });

    // Victor's pictures, if he's drawn the bee: the one for how it feels (and while it buzzes), else his plain one, else mine
    var artKey = '';
    function dress() {
        var m = home.dataset.mood, b = home.classList.contains('buzzing'), key = m + (b ? '+' : '');
        if (key === artKey) return;
        artKey = key;
        var names = (b ? ['bee-' + m + '-buzzing', 'bee-buzzing'] : []).concat(['bee-' + m, 'bee']).map(function (n) { return 'assets/living/' + n; });
        Sky.findAsset(names.join('|'), function (url) {
            if (artKey !== key) return;
            if (url) { if (artImg.getAttribute('src') !== url) artImg.src = url; artImg.hidden = false; art.classList.add('has-art'); }
            else { artImg.hidden = true; art.classList.remove('has-art'); }
        });
    }
    function setMood(m) {
        if (home.dataset.mood === m) return;
        home.dataset.mood = m;
        var M = MOODS[m];
        home.style.setProperty('--flap', M.flap + 's');
        home.style.setProperty('--hover', M.hover + 's');
        dress();
        if (menu) menu.querySelector('.bt-mood').textContent = 'seems ' + M.seems;
    }
    function puff(kind, n) {
        if (!kind || MAPPING) return;
        for (var i = 0; i < (n || 1); i++) {
            var p = document.createElement('span');
            p.className = 'bee-p fx-' + kind;
            p.innerHTML = fxArt[kind] ? '<img alt="" src="' + fxArt[kind] + '">' : FX[kind];
            p.style.setProperty('--dx', rnd(-40, 40).toFixed(0) + '%');
            p.style.setProperty('--dy', rnd(-120, -60).toFixed(0) + '%');
            p.style.setProperty('--r', rnd(-25, 25).toFixed(0) + 'deg');
            p.style.animationDelay = (i * .12).toFixed(2) + 's';
            fxBox.appendChild(p);
            setTimeout(function (q) { q.remove(); }.bind(null, p), 2200 + i * 120);
        }
    }
    var mouthT = null;
    // one word, acted out: up for a high buzz, down for a low one, leaning into a slide, a squash on every buzz, the mouth open
    function act(e) {
        if (e.rest) { home.style.setProperty('--mouth', 0); return; }
        home.style.setProperty('--lift', (e.lift || 0).toFixed(1));
        home.style.setProperty('--tilt', (e.tilt || 0).toFixed(1));
        home.style.setProperty('--mouth', (e.mouth || .4).toFixed(2));
        pose.classList.remove('squash'); void pose.offsetWidth; pose.classList.add('squash');
        clearTimeout(mouthT);
        mouthT = setTimeout(function () { home.style.setProperty('--mouth', 0); }, Math.max(80, (e.dur || .1) * 900));
        var M = MOODS[home.dataset.mood];
        if (e.fx === 'zap') { puff('zap', 3); stung(); }
        else if (e.fx === 'chirp') puff(M.fx || 'spark', 1);
        else if (e.caps && home.dataset.mood === 'angry') puff('steam', 1);
        else if (M.fx && Math.random() < .28) puff(M.fx, 1);
    }
    function talking(on) {
        home.classList.toggle('buzzing', on);
        body.classList.toggle('bee-buzzing', on);
        if (!on) { home.style.setProperty('--lift', 0); home.style.setProperty('--tilt', 0); home.style.setProperty('--mouth', 0); }
        dress();
    }
    var stungAt = 0;
    function stung(force) {                                       // (it's only a cartoon sting)
        if (!force && Date.now() - stungAt < 20000) return;
        stungAt = Date.now();
        setTimeout(function () { Sky.say(['Ow.', 'Ow! Rude.', 'Ouch.'][Math.floor(Math.random() * 3)], 1800); }, 350);
    }
    home.style.setProperty('--flap', MOODS.calm.flap + 's');
    home.style.setProperty('--hover', MOODS.calm.hover + 's');
    dress();

    /* ======================================================================
       talking to it: the menu
       ====================================================================== */
    // the sing switch is a little music note (slot: assets/living/bee-sing; drawn in the colour of the button's words,
    // so it's light on dark when it's switched on)
    var NOTE_ART = '<svg class="placeholder" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M9 17.5 V5.2 L19 3 V15" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<path d="M9 7.8 L19 5.6" stroke="currentColor" stroke-width="2.4"/>' +
        '<ellipse cx="6.4" cy="17.8" rx="3.3" ry="2.5" transform="rotate(-22 6.4 17.8)" fill="currentColor"/>' +
        '<ellipse cx="16.4" cy="15.3" rx="3.3" ry="2.5" transform="rotate(-22 16.4 15.3)" fill="currentColor"/></svg>';
    var menu = null, log = null, input = null, mode = store('bee-mode') === 'sing' ? 'sing' : 'talk', open = false, line = null, met = !!store('bee-met');
    function build() {
        menu = document.createElement('div');
        menu.className = 'bee-talk';
        menu.setAttribute('role', 'dialog');
        menu.setAttribute('aria-label', 'talking with the bee');
        menu.innerHTML =
            '<div class="bt-head">' +
                '<div class="bt-title"><b>the bee</b><i class="bt-mood"></i></div>' +
                '<div class="bt-modes" role="group" aria-label="how it answers">' +
                    '<button type="button" data-mode="talk">talk</button>' +
                    '<button type="button" data-mode="sing" aria-label="sing" title="sing"><span class="bt-sing-ic" data-asset="assets/living/bee-sing">' + NOTE_ART + '</span></button></div>' +
                '<button type="button" class="bt-x" aria-label="close">✕</button>' +
            '</div>' +
            '<div class="bt-log" aria-live="polite"></div>' +
            '<form class="bt-say"><input type="text" maxlength="200" autocomplete="off" spellcheck="false" placeholder="say something to the bee…" aria-label="say something to the bee">' +
                '<button type="submit">say</button></form>' +
            '<div class="bt-row"><button type="button" class="bt-sing">♪ sing me something</button><button type="button" class="bt-hush" hidden>shh</button></div>' +
            '<p class="bt-foot"><span class="bt-quiet" hidden>(sound effects are off in the control panel, so it buzzes in silence) </span>' +
                'its brain is <i>BeeLLM 42P Chaos</i>, by skizy, thinking right here in your browser</p>';
        body.appendChild(menu);
        log = menu.querySelector('.bt-log'); input = menu.querySelector('input');
        if (Sky.fillAssets) Sky.fillAssets(menu);
        menu.querySelector('.bt-mood').textContent = 'seems ' + MOODS[home.dataset.mood].seems;
        menu.querySelector('.bt-x').addEventListener('click', close);
        menu.querySelector('form').addEventListener('submit', function (ev) { ev.preventDefault(); send(input.value); });
        menu.querySelector('.bt-sing').addEventListener('click', function () { reply(null, { song: true }); });
        menu.querySelector('.bt-hush').addEventListener('click', function () { hush(); finishLine(); });
        menu.querySelectorAll('.bt-modes button').forEach(function (b) {
            b.addEventListener('click', function () { setMode(b.dataset.mode); });
        });
        setMode(mode, true);
    }
    function setMode(m, quiet) {
        mode = m;
        if (!MAPPING) store('bee-mode', m);
        menu.classList.toggle('singing', m === 'sing');
        menu.querySelectorAll('.bt-modes button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === m)); });
        if (!quiet) note(m === 'sing' ? 'it\u2019ll sing its answers now.' : 'it\u2019ll talk again now.');
    }
    function entry(cls, text) {
        var p = document.createElement('p');
        p.className = cls;
        if (text) p.textContent = text;
        log.appendChild(p);
        while (log.children.length > 40) log.removeChild(log.firstChild);
        log.scrollTop = log.scrollHeight;
        return p;
    }
    function note(t) { entry('bt-note', t); }

    function openMenu() {
        if (open || !here()) return;
        open = true;
        if (!menu) build();
        voice();
        menu.querySelector('.bt-quiet').hidden = !(Sky.sounds && Sky.sounds.sfxVolume <= 0);
        body.classList.add('bee-talking');
        requestAnimationFrame(function () { menu.classList.add('on'); });
        if (!matchMedia('(pointer: coarse)').matches) setTimeout(function () { input.focus(); }, 350);
        load().then(function () {
            if (!open) return;
            // hello: how glad it is to see you depends on how you've treated it
            var m = !met ? 'curious' : fond > .35 ? 'happy' : fond < -.35 ? (fond < -.6 ? 'angry' : 'sad') : mood();
            if (!met) { met = true; if (!MAPPING) store('bee-met', '1'); }
            feelAll(m === 'calm' ? {} : (function () { var o = {}; o[m] = .6; return o; })());
            if (gun) note('it’s still pointing ' + mine(gun) + ' at you.');
            else if (grudge) note('it hasn’t forgiven you for the revolver. it never will.');
            reply(null, { len: [3, 6], mood: mood() });
        });
    }
    function close() {
        if (!open) return;
        open = false;
        hush();
        finishLine();
        body.classList.remove('bee-talking');
        menu.classList.remove('on');
        if (document.activeElement && menu.contains(document.activeElement)) document.activeElement.blur();
    }
    function send(text) {
        text = (text || '').trim();
        if (!text) return;
        input.value = '';
        entry('bt-you', text);
        var h = hear(text);
        if (gun) {                                                // (it's got your gun: only one thing it wants to hear)
            var sorry = SORRY.test(text), nope = sorry && NOT_SORRY.test(text);
            if (sorry && !nope) { forgive(h); return; }
            h.add = { angry: nope ? 1.5 : .6 };
            if (++unsorry === 2 || nope) setTimeout(function () { note('(it seems to be waiting for an apology.)'); }, 1200);
        }
        feelAll(h.add);
        load().then(function () { reply(h); });
    }

    // its answer: what it feels, what it says (from the model), and saying it
    function reply(h, opts) {
        opts = opts || {};
        var m = opts.mood || mood();
        setMood(m);
        var M = MOODS[m], sing = !opts.talk && (opts.song || mode === 'sing'), dread = sing && !!(gun || grudge);
        var len = opts.len || (sing ? (dread ? [16, 26] : [24, 40]) : [M.len[0], M.len[1] + Math.min(6, Math.floor(((h && h.words) || 0) / 5))]);
        var seed = h && h.seed && h.seed.length ? h.seed : [M.seed[Math.floor(Math.random() * M.seed.length)]];
        var w = think(m, { len: len, seed: seed, sting: opts.sting, temp: sing ? M.temp + .1 : M.temp });
        var plan = sing ? composeSing(w, m, dread) : composeTalk(w, m);
        if (!menu) build();
        finishLine();
        line = entry('bt-bee' + (sing ? ' sung' : '') + (dread ? ' dread' : ''));
        line.dataset.mood = m;
        bubble.textContent = '';
        home.classList.add('saying');
        menu.querySelector('.bt-hush').hidden = false;
        perform(plan, function (e) {
            line.textContent += e.word;
            bubble.textContent = (bubble.textContent + e.word).slice(-48);
            log.scrollTop = log.scrollHeight;
            act(e);
        }, function () { talking(false); finishLine(); });
        talking(true);
    }
    function finishLine() {
        if (menu) menu.querySelector('.bt-hush').hidden = true;
        line = null;
        clearTimeout(finishLine.t);
        finishLine.t = setTimeout(function () { if (!line) home.classList.remove('saying'); }, 2600);
    }

    // a poke: a giggle, then less patience, then a sting
    var pokes = [];
    function poke() {
        var now = Date.now();
        pokes = pokes.filter(function (t) { return now - t < 6000; });
        pokes.push(now);
        var n = pokes.length, add = {};
        if (home.dataset.mood === 'sleepy') add.angry = .6;
        else if (n <= 2) add[fond < -.3 ? 'angry' : 'happy'] = .5;
        else if (n <= 4) add.angry = .7;
        else add.angry = 1.6;
        feelAll(add);
        if (open && menu && !run) entry('bt-poke', 'you poke the bee.');
        reply(null, { len: n > 4 ? [3, 6] : [2, 4], sting: n > 4 });
    }
    beeBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (!open) openMenu(); else poke();
    });

    /* ======================================================================
       the revolver: it won't be shot (sky/revolver.js asks aimedAt, then calls shot)
       ====================================================================== */
    var I = Sky.inventory;
    var SORRY = /\b(sorry|sowwy|sowy|sorr+y+|soz|sry|apolog\w*|forgive|my bad|pardon|i was wrong|regret\w*)\b/i;
    var NOT_SORRY = /\b(not|never|no|nt)\s+(even\s+|really\s+|at all\s+)?(sorry|apolog\w*|regret\w*)|n['’]?t\s+(be\s+)?(sorry|apolog\w*)/i;
    var shots = [], unsorry = 0, returned = !MAPPING && visit('bee-returned') === '1';
    function mine(id) { return GUNS[id].replace(/^the /, 'your '); }
    // (in the garden, or out on the porch: either way it's there to see)
    function here() { return !!((Sky.front && Sky.front.here) || (porch && Sky.porch && Sky.porch.outside)); }

    // weaving: only when you actually fire. the shot sends it jinking out of the way (a quick zig and zag, then back
    // over its roses); the rest of the time it just hovers, gun or no gun
    var dodge = { x: 0, y: 0 }, ptr = null, jink = { x: 0, y: 0, at: -1e9 }, weaving = 0, side = 1;
    function centre() { var r = home.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, R: Math.max(70, r.width * 1.5) }; }
    function weave() {
        weaving = 0;
        var t = performance.now() - jink.at, j = Math.max(0, 1 - t / 900), tx = 0, ty = 0;
        if (j) {
            var zig = Math.sin(t / 1000 * 2 * Math.PI * 3.2) * .3 * j;                  // (side to side as it goes)
            tx = jink.x * j - jink.y * zig; ty = jink.y * j + jink.x * zig;
        }
        dodge.x += (tx - dodge.x) * (t < 120 ? .55 : .2); dodge.y += (ty - dodge.y) * (t < 120 ? .55 : .2);
        if (!j && Math.abs(dodge.x) < .3 && Math.abs(dodge.y) < .3) dodge.x = dodge.y = 0;
        home.style.setProperty('--dodge-x', dodge.x.toFixed(1) + 'px');
        home.style.setProperty('--dodge-y', dodge.y.toFixed(1) + 'px');
        if (j || dodge.x || dodge.y) weaving = requestAnimationFrame(weave);
    }
    function weaveOn() { if (!weaving) weaving = requestAnimationFrame(weave); }
    document.addEventListener('pointermove', function (e) {
        ptr = { x: e.clientX, y: e.clientY };
        if (gun && here()) {                                       // (and with yours, it follows you)
            var c = centre();
            home.style.setProperty('--aim-x', clamp((ptr.x - c.x) / (window.innerWidth * .4), -1, 1).toFixed(2));
            home.style.setProperty('--aim-y', clamp((ptr.y - c.y) / (window.innerHeight * .4), -1, 1).toFixed(2));
        }
    }, { passive: true });
    root.addEventListener('pointerleave', function () { ptr = null; });

    // was that shot meant for it? (anywhere near where it lives, or at it, wherever it's dodged to)
    function aimedAt(x, y, target) {
        if (!here() || MAPPING) return false;
        if (target && target.closest && target.closest('.bee-talk')) return false;          // (its menu: still just a menu)
        if (target && target.closest && target.closest('.bee-home')) return true;
        var c = centre();
        return Math.hypot(x - c.x - dodge.x, y - c.y - dodge.y) < c.R * .6;
    }
    // a shot: it's missed (always). then, by how many there've been lately: frightened, furious, and then it's had enough
    function shot(x, y, id) {
        if (!menu) build();
        var c = centre(), dx = c.x + dodge.x - x, dy = c.y + dodge.y - y, d = Math.max(1, Math.hypot(dx, dy));
        side = Math.random() < .5 ? -1 : 1;
        jink = { x: (dx / d * .6 - dy / d * side) * c.R * 1.1, y: (dy / d * .6 + dx / d * side) * c.R * .8 - c.R * .3, at: performance.now() };
        weaveOn();
        var now = Date.now();
        shots = shots.filter(function (t) { return now - t < 120000; });
        shots.push(now);
        var n = shots.length;
        if (I) I.say('missed.', 1200);
        if (gun) {                                                  // (it's got one already: you've another?)
            entry('bt-poke', 'you shoot at the bee. it doesn’t even flinch.');
            feelAll({ angry: 2 });
            load().then(function () { reply(null, { len: [4, 7], talk: true }); });
            return;
        }
        if (returned) { breakIt(id); return; }                      // (it gave it back, and you did it again)
        var stage = n >= 5 ? 'grab' : grudge || n >= 3 ? 'angry' : 'scared';
        entry('bt-poke', [
            'you shoot at the bee. it weaves out of the way.',
            'you shoot at it again. missed: it’s too quick.',
            'another shot. it dodges, and now it’s cross.',
            'missed again. it’s furious.',
            'missed. the bee comes straight at you…'][Math.min(n, 5) - 1]);
        if (stage === 'scared') { feelAll({ scared: 2.4 }); puff('sweat', 2); }
        else feelAll({ angry: 2.4 });
        load().then(function () {
            if (stage !== 'grab') { reply(null, { mood: stage, len: stage === 'scared' ? [3, 6] : [6, 10], talk: true }); return; }
            reply(null, { mood: 'angry', len: [3, 5], sting: true, talk: true });
            dive();
            setTimeout(function () { stung(true); grab(id); }, 650);
        });
    }
    function dive() { home.classList.remove('diving'); void home.offsetWidth; home.classList.add('diving'); puff('zap', 3); setTimeout(function () { home.classList.remove('diving'); }, 900); }
    function pickups(withBee) {                                     // (the gun's spot on the wall or the roof stays empty while it's got it)
        document.querySelectorAll('.pickup[data-item="revolver"], .pickup[data-item="white-revolver"]').forEach(function (p) {
            p.classList.toggle('with-bee', !!withBee && p.dataset.item === withBee);
        });
    }
    function arm(on) {
        home.classList.toggle('armed', on);
        body.classList.toggle('bee-armed', on);
        beeBtn.setAttribute('aria-label', on ? 'the bee, pointing ' + mine(gun) + ' at you: talk to it' : 'the bee: talk to it');
        pickups(on && gun);
        if (on) { artKey = ''; setMood('angry'); grumbleSoon(); } else clearTimeout(grumbleSoon.t);
    }
    // it takes the gun off you
    function grab(id) {
        if (!GUNS[id]) return;
        gun = id; shots = []; unsorry = 0;
        if (!MAPPING) visit('bee-gun', id);
        if (I && I.has(id)) I.remove(id);
        arm(true);
        entry('bt-note', 'it stings you, and takes ' + mine(id) + ' out of your hand. it’s pointing it at you. it won’t give it back until you say you’re sorry.');
        setTimeout(function () { Sky.say('It took my gun. I think it wants an apology.', 3400); }, 2200);
    }
    // "sorry": it gives it back (it's still not happy about it)
    function forgive(h) {
        var id = gun;
        gun = null; shots = []; unsorry = 0; returned = true;
        if (!MAPPING) { visit('bee-gun', null); visit('bee-returned', '1'); }
        arm(false);
        settle();
        heart.angry = 0; heart.scared = 0;
        feelAll({ calm: .8, sad: .5 });
        var S = window.davSave, back = id === 'white-revolver' ? !S || S.get('white-revolver') === 'taken' : !S || S.reset !== 4;
        if (back && I) {
            if (!I.has(id) && I.add(id, { quiet: true })) { if (Sky.sfx) Sky.sfx('pickup'); I.say('the bee gives you ' + mine(id) + ' back.', 2800); }
            note('it gives you ' + mine(id) + ' back, slowly. it doesn’t take its eyes off you.');
        } else note('it drops ' + mine(id) + ' in the roses. it’s gone.');
        load().then(function () { reply(h, { mood: 'sad', len: [3, 6], talk: true }); });
    }
    // shot at again, after all that: it stings the gun to pieces, and it'll never forgive you
    function breakIt(id) {
        entry('bt-poke', 'missed. you shoot at it again, after all that.');
        feelAll({ angry: 3 });
        stungAt = Date.now();                                       // (it's the gun it stings, this time, not you)
        load().then(function () {
            reply(null, { mood: 'angry', len: [4, 7], sting: true, talk: true });
            dive();
            setTimeout(function () {
                if (I && I.has(id)) I.remove(id);
                if (Sky.sfx) { Sky.sfx('jammed', { or: 'tap' }); Sky.sfx('shatter', { delay: .08 }); }
                scrap(ptr ? ptr.x : window.innerWidth / 2, ptr ? ptr.y : window.innerHeight * .7);
                if (I) I.say('the bee stung ' + mine(id) + '. it’s broken.', 3200);
                returned = false; grudge = true;
                if (!MAPPING) {
                    visit('bee-returned', null); store('bee-grudge', '1');
                    var broke = (visit('bee-broke') || '').split(' ').filter(Boolean);
                    if (broke.indexOf(id) === -1) broke.push(id);
                    visit('bee-broke', broke.join(' '));
                }
                document.querySelectorAll('.pickup[data-item="' + id + '"]').forEach(function (p) { p.classList.add('with-bee'); });
                setMood('angry');
                note('it stings ' + mine(id) + ' to pieces. it will never forgive you for this.');
                setTimeout(function () { Sky.say('It broke it. With its sting.', 2800); }, 1600);
            }, 650);
        });
    }
    function scrap(x, y) {                                          // (bits of gun, falling)
        for (var i = 0; i < 12; i++) {
            var b = document.createElement('span');
            b.className = 'bee-scrap';
            b.style.left = x + 'px'; b.style.top = y + 'px';
            body.appendChild(b);
            var a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 90;
            b.animate([
                { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
                { transform: 'translate(' + (Math.cos(a) * d) + 'px,' + (Math.sin(a) * d * .5 + 160) + 'px) rotate(' + (Math.random() * 600 - 300) + 'deg)', opacity: 0 }
            ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' }).onfinish = (function (el) { return function () { el.remove(); }; })(b);
        }
    }
    // while it's got your gun: a cross little buzz every so often (shown over its head; not in the menu's log)
    function grumbleSoon() { clearTimeout(grumbleSoon.t); if (gun) grumbleSoon.t = setTimeout(grumble, rnd(6000, 11000)); }
    function grumble() {
        if (gun && here() && !run && !document.hidden) {
            var heard = E || (navigator.userActivation && navigator.userActivation.hasBeenActive);
            load().then(function () {
                if (run || !gun) return;
                var plan = composeTalk(think('angry', { len: [2, 5], seed: ['BZ'] }), 'angry');
                plan.silent = !heard || MAPPING;
                bubble.textContent = '';
                home.classList.add('saying');
                perform(plan, function (e) { bubble.textContent = (bubble.textContent + e.word).slice(-48); act(e); }, function () { talking(false); finishLine(); });
                talking(true);
            });
        }
        grumbleSoon();
    }
    if (gun) arm(true); else if (grudge) setMood('angry');

    // gone from the garden: it stops talking
    // where it is: over its roses in the garden, or, seen from the porch, out over the yard (the roses are left of the steps
    // from there: from the garden you're facing the house, from the porch you're facing the street). one bee: it's moved
    // to whichever you're in (behind the porch's posts and railing, in front of the street)
    function perch(where) {
        var host = where === 'porch' && porch ? porch : stage;
        if (home.parentNode === host) return;
        close();
        if (host === porch) porch.insertBefore(home, porch.querySelector('.porch-frame'));
        else stage.appendChild(home);
    }
    if (Sky.house && Sky.house.on) Sky.house.on(function (what, name) {
        if ((name === 'front' || name === 'porch') && what === 'leave') close();
        if ((name === 'front' || name === 'porch') && what === 'enter') perch(name);
    });
    Sky.escape(function () { return open; }, close);

    Sky.bee = {
        open: openMenu, close: close, say: send, poke: poke,
        aimedAt: aimedAt, shot: shot, get gun() { return gun; }, get grudge() { return grudge; },   // (sky/revolver.js)
        get mood() { return mood(); }, get fond() { return fond; },
        // (for testing and for the asset manager: what it'd say, and a reply played into any sound context)
        think: function (m, len) { return load().then(function () { return think(m || mood(), { len: len || MOODS[m || 'calm'].len, seed: [MOODS[m || 'calm'].seed[0]] }); }); },
        plan: function (w, m, sing, dread) { return sing ? composeSing(w, m, dread) : composeTalk(w, m); },
        render: function (ctx, plan) { var V = Engine(ctx), B = bus(V, plan.wet * .3, plan.echo * .3); plan.events.forEach(function (e) { (e.notes || []).forEach(function (n) { var o = {}; for (var k in n) o[k] = n[k]; o.t = .05 + e.at + (n.off || 0); buzz(V, B, o); }); }); return V; },
        hear: hear, moods: MOODS, brain: function () { return load().then(function () { return brain; }); }
    };
})();

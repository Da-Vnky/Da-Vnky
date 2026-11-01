/* =====================================================================
   gnosis.js — the end of reset 8 (5 Oct). the world is black and
   white, its source showing (sky/source.js). nothing can kill the traveller
   here any more: every death was patched on the way. the way on is knowing.

     the phrases   every reset's death left a phrase on the white as the world
                   reset (sky/forget.js, sky/state.js RESETS[n].phrase): "I am not
                   the hand that held it", "I am not the weight that fell" … seven,
                   one for each sphere's ruler, each denying what it claimed of them.
     the serpent   in the kitchen it's always said "eat. and you will know." in reset
                   8, eat the pie in the fridge: gnosis. the screen goes dark and
                   they remember all seven phrases, in colour for the first time in
                   reset 8 (localStorage "gnosis": kept for good).
     the Demiurge  then, on the sea where it all began, the false sun comes down: a
                   lion-faced eye. "I am God, and there is no other beside me." it
                   claims them, seven times, sphere by sphere, and the visitor answers
                   each claim with the phrase that denies it. with each claim, what it
                   used on them in that sphere comes up out of the sea beside it (the
                   revolver, the boat, the pills, the grimoire, the sky's corner, the
                   sky's eye, the timer: RELICS), and the right phrase blanches it,
                   cracks it and sinks it. a wrong one: it laughs, its cracks seem to
                   close for a moment, and the answers shuffle; two wrong in a row and
                   the serpent from the kitchen hisses the start of the right one.
                   after the seventh: "Then name me." the seven rulers' names were
                   scratched into the dungeon's circles, one more each reset (sky/
                   dungeon.js), and spoken in the remembering: it's Samael, the blind
                   one (the other two offered are its sons: it laughs). then "You are
                   mistaken, Samael. You are blind." it goes blind, the grey lifts, the
                   code in the sky stops.
     the choice    a door of light on the horizon. go home: "escaped", and from then
                   on the whole site is beyond.html (sky/beyond.js): space, and the
                   last of the music. or stay, and wake the others (skizy): "stayed",
                   the world in its colours again, no more resets (sky/state.js
                   davSave.ending / free). both are kept between visits
                   till "forget your stay".

   slots: assets/sky/demiurge (the Demiurge come down: a lion-faced eye, see-through
          round it), assets/ui/gnosis (behind the remembering, optional)
          the relics are the things' own slots (assets/city/revolver, assets/sea/ship,
          assets/items/pills, assets/living/grimoire, assets/city/sky-seam, assets/city/sky-eye,
          assets/workshop/timer), drawn here till then; the serpent is assets/living/serpent
   sounds: eat, gnosis (each phrase remembered), demiurge-voice (its words), demiurge-hurt
           (each phrase that lands), relic-sink (a relic going under), demiurge-blind, door-open
   its look: sky/css/gnosis.css
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    if (!Sky || !S || Sky.gnosis) return;
    var body = document.body, sfx = Sky.sfx, R = S.reset;
    var PAGE = (location.pathname.replace(/.*\//, '').replace(/\.html$/, '') || 'index').replace(/^index$/, 'sea');
    function say(t, ms) { Sky.say(t, ms || 2800); }
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function knows() { return get('gnosis') === '1'; }
    function speak(lines, done, who) {
        var o = { hold: 2200 };
        if (who === 'demiurge') { o.who = 'the Demiurge'; o.cls = 'voice low demiurge'; o.blip = 'demiurge-voice'; o.blipOr = 'murmur'; }
        if (who === 'serpent') { o.who = 'the serpent'; o.cls = 'voice low'; o.blipOr = 'murmur'; }
        Sky.speak(lines, done, o);
    }
    if (R !== 8) { Sky.gnosis = {}; return; }

    // the seven phrases, the spheres they were won in, and what the Demiurge claims of them (sky/state.js RESETS)
    var SPHERES = ['the Moon', 'Mercury', 'Venus', 'the Sun', 'Mars', 'Jupiter', 'Saturn'];
    var GLYPHS = ['☾', '☿', '♀', '☉', '♂', '♃', '♄'];
    // the seven rulers (the Ophites' names, the Moon's up to Saturn's), as scratched into the dungeon's circles (sky/dungeon.js)
    var RULERS = ['Horaios', 'Ailoaios', 'Astaphaios', 'Adonaios', 'Sabaoth', 'Iao', 'Ialdabaoth'];
    var PHRASES = S.RESETS.slice(0, 7).map(function (r) { return r.phrase; });
    var CLAIMS = S.RESETS.slice(0, 7).map(function (r) { return r.claim; });
    var LAST = 'I came from the Light, and to the Light I am going.';

    /* ---------------- the stayed world: quiet, and a nudge towards skizy ---------------- */
    if (S.free) {
        if (get('free-said') !== '1' && !S.posting) setTimeout(function () {
            put('free-said', '1');
            Sky.speak(['It’s quiet. The sky’s only the sky now.', 'skizy’s still in the dark, across from the rooftop. Someone has to bring her back.'], null, { hold: 3000 });
        }, 4000);
        Sky.gnosis = { knows: true };
        return;
    }

    /* ---------------- a nudge, the first time round (before they know) ---------------- */
    setTimeout(function () {
        if (knows() || S.get('deja-vu') !== '1' || S.get('gnosis-nudge') === '1') return;
        S.set('gnosis-nudge', '1');
        Sky.speak('There was a serpent in the kitchen. It always said the same thing. …Eat, and you will know.', null, { hold: 2600 });
    }, 9000);

    /* ---------------- the serpent, and the pie (the kitchen) ---------------- */
    var serpent = document.querySelector('.kitchen-serpent');
    if (serpent) serpent.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        S.set('gnosis-nudge', '1');                                 // (heard it from the serpent itself: no need to be reminded)
        if (knows()) { speak('You know now. Go.', null, 'serpent'); return; }
        speak(['Eat.', 'Eat, and you will know.', 'It’s in the cold box. It always was.'], null, 'serpent');
    });
    var eating = false;
    function eat(pie) {
        if (eating) return;
        if (knows()) { say('I already know. It’s waiting on the sea.', 2600); return; }
        eating = true;
        if (pie) pie.classList.add('eaten');
        sfx('eat', { or: 'tap', size: 0.5 });
        say('I eat. It tastes of apples, and of something older.', 2400);
        setTimeout(remember, 2600);
    }
    // the remembering: the dark, and the seven phrases come back, one sphere at a time
    function remember() {
        var g = document.createElement('div');
        g.className = 'gnosis';
        g.dataset.slot = 'assets/ui/gnosis';
        g.innerHTML = '<div class="gn-back" data-asset="assets/ui/gnosis"></div><div class="gn-lines"></div>';
        body.appendChild(g);
        if (Sky.fillAssets) Sky.fillAssets(g);
        var box = g.querySelector('.gn-lines');
        requestAnimationFrame(function () { g.classList.add('on'); });
        var all = PHRASES.map(function (p, i) { return { sphere: GLYPHS[i] + ' ' + SPHERES[i] + ' · ' + RULERS[i] + (i === 6 ? ', the blind one: Samael' : ''), text: p }; })
            .concat([{ sphere: '', text: LAST, last: true }]);
        all.forEach(function (l, i) {
            setTimeout(function () {
                var d = document.createElement('div');
                d.className = 'gn-line' + (l.last ? ' last' : '');
                d.innerHTML = (l.sphere ? '<small></small>' : '') + '<span></span>';
                if (l.sphere) d.querySelector('small').textContent = l.sphere;
                d.querySelector('span').textContent = l.text;
                box.appendChild(d);
                sfx('gnosis', { or: 'shimmer', size: l.last ? 1 : 0.4, volume: l.last ? 0.9 : 0.5 });
            }, 1400 + i * 2300);
        });
        setTimeout(function () {
            put('gnosis', '1');
            g.classList.remove('on');
            setTimeout(function () {
                g.remove();
                eating = false;
                Sky.speak(['I remember. All of it. Every time.', 'And it’s still up there, pretending to be the sun. Back where all this began: the sea.'], null, { hold: 3200 });
            }, 1600);
        }, 1400 + all.length * 2300 + 2600);
    }

    /* ---------------- the Demiurge (the sea, once they know) ---------------- */
    var EYE = (function () {
        var mane = '';
        for (var i = 0; i < 30; i++) {
            var a = i / 30 * Math.PI * 2, b = a + Math.PI / 30, r1 = 118, r2 = 176 + (i % 3) * 14;
            mane += '<path d="M' + (200 + Math.cos(a - .06) * r1).toFixed(1) + ' ' + (200 + Math.sin(a - .06) * r1).toFixed(1) + ' L' + (200 + Math.cos(b) * r2).toFixed(1) + ' ' + (200 + Math.sin(b) * r2).toFixed(1) +
                ' L' + (200 + Math.cos(a + .14) * r1).toFixed(1) + ' ' + (200 + Math.sin(a + .14) * r1).toFixed(1) + ' Z"/>';
        }
        var cracks = ['M200 128 L188 150 L196 166', 'M262 170 L246 180 L250 196', 'M138 172 L152 184 L146 200', 'M222 262 L214 246 L226 236', 'M176 260 L184 244 L172 232',
                      'M290 204 L270 206 L262 218', 'M110 200 L130 204 L136 218'];
        return '<svg class="placeholder" viewBox="0 0 400 400" aria-hidden="true">' +
            '<defs><radialGradient id="dm-iris" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe08a"/><stop offset=".45" stop-color="#e08a22"/><stop offset="1" stop-color="#5a1a06"/></radialGradient>' +
            '<radialGradient id="dm-face" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f0b84a"/><stop offset="1" stop-color="#a8521a"/></radialGradient>' +
            '<clipPath id="dm-clip"><path d="M70 200 Q200 96 330 200 Q200 304 70 200 Z"/></clipPath></defs>' +
            '<g class="dm-mane" fill="#c0601c" stroke="#5a2408" stroke-width="2">' + mane + '</g>' +
            '<circle cx="200" cy="200" r="124" fill="url(#dm-face)" stroke="#5a2408" stroke-width="3"/>' +
            '<path d="M70 200 Q200 96 330 200 Q200 304 70 200 Z" fill="#f2e6c8"/>' +
            '<g clip-path="url(#dm-clip)"><g class="dm-look"><circle cx="200" cy="200" r="62" fill="url(#dm-iris)"/>' +
            '<ellipse class="dm-pupil" cx="200" cy="200" rx="12" ry="46" fill="#080303"/></g>' +
            '<g class="dm-cracks" fill="none" stroke="#2a0f05" stroke-width="3" stroke-linecap="round">' +
            cracks.map(function (d, i) { return '<path class="k' + (i + 1) + '" d="' + d + '"/>'; }).join('') + '</g>' +
            '<path class="dm-film" d="M70 200 Q200 96 330 200 Q200 304 70 200 Z" fill="#f4f2ec"/></g>' +
            '<path class="dm-lid" d="M70 200 Q200 96 330 200" fill="none" stroke="#2a0f05" stroke-width="7" stroke-linecap="round"/>' +
            '<path d="M70 200 Q200 304 330 200" fill="none" stroke="#2a0f05" stroke-width="4" stroke-linecap="round"/></svg>';
    })();
    var NO = ['No. That is mine too.', 'Is it? Look again.', 'You do not even know what you are.', 'Ha. Try again, little spark.'];
    // what it used on them, sphere by sphere: each comes up out of the sea beside it with its claim (the things' own slots;
    // drawn here till then, on a 100 x 100 box)
    var RELICS = [
        ['assets/city/revolver', 'the revolver', '<path d="M8 42 H70 L74 36 H84 V48 H70 L66 54 H44 L38 74 Q36 82 26 82 H18 Q12 82 14 74 L22 54 H8 Z" fill="#3a3a40" stroke="#121216" stroke-width="2"/><circle cx="50" cy="48" r="8" fill="#55555c" stroke="#121216" stroke-width="2"/><path d="M84 40 H94" stroke="#121216" stroke-width="5"/>'],
        ['assets/sea/ship', 'the boat', '<path d="M8 66 H92 L80 82 H20 Z" fill="#7a4a24" stroke="#3a220e" stroke-width="2"/><path d="M50 14 V66" stroke="#3a220e" stroke-width="3"/><path d="M52 16 L84 58 H52 Z" fill="#efe4c8" stroke="#8a7a5a" stroke-width="1.5"/><path d="M48 22 L22 58 H48 Z" fill="#e6d8b8" stroke="#8a7a5a" stroke-width="1.5"/>'],
        ['assets/items/pills', 'the pills', '<rect x="30" y="30" width="40" height="56" rx="6" fill="#d8862a" opacity=".85" stroke="#7a4a14" stroke-width="2"/><rect x="26" y="16" width="48" height="16" rx="3" fill="#f2efe6" stroke="#8a867a" stroke-width="2"/><rect x="34" y="44" width="32" height="22" fill="#f6f0dc"/><path d="M38 52 H62 M38 58 H56" stroke="#8a7a5a" stroke-width="2"/>'],
        ['assets/living/grimoire', 'the grimoire', '<path d="M14 20 L50 26 L86 20 V82 L50 88 L14 82 Z" fill="#2a0e10" stroke="#120406" stroke-width="2"/><path d="M50 26 V88" stroke="#5a1a1e" stroke-width="2"/><circle cx="68" cy="52" r="10" fill="none" stroke="#a8201e" stroke-width="2"/><path d="M68 42 L68 62 M58 52 H78" stroke="#a8201e" stroke-width="1.5"/>'],
        ['assets/city/sky-seam', 'the sky’s loose corner', '<path d="M10 10 H90 V90 H10 Z" fill="#7aa6c8"/><path d="M90 10 V62 Q74 56 62 38 Q56 24 40 10 Z" fill="#0a0a0c"/><path d="M40 10 Q56 24 62 38 Q74 56 90 62 Q70 70 56 56 Q44 40 40 10 Z" fill="#a8c8e0" stroke="#5a7a94" stroke-width="1.5"/>'],
        ['assets/city/sky-eye', 'the sky’s eye', '<path d="M8 50 Q50 14 92 50 Q50 86 8 50 Z" fill="#f2e6c8" stroke="#2a1a10" stroke-width="3"/><circle cx="50" cy="50" r="18" fill="#3a6a8a"/><circle cx="50" cy="50" r="8" fill="#050505"/>'],
        ['assets/workshop/timer', 'the timer', '<circle cx="50" cy="54" r="34" fill="#e8dcc0" stroke="#5a4a32" stroke-width="3"/><rect x="44" y="12" width="12" height="8" rx="2" fill="#5a4a32"/><path d="M50 54 V30 M50 54 L66 62" stroke="#2a1a10" stroke-width="3" stroke-linecap="round"/>']
    ];
    var SERPENT = '<svg class="placeholder" viewBox="0 0 120 80" aria-hidden="true"><path d="M8 66 Q26 40 48 58 Q70 76 84 50 Q96 26 108 34" fill="none" stroke="#3a5a2a" stroke-width="11" stroke-linecap="round"/>' +
        '<path d="M8 66 Q26 40 48 58 Q70 76 84 50 Q96 26 108 34" fill="none" stroke="#7aa04a" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 6"/><ellipse cx="110" cy="32" rx="9" ry="6" fill="#4a6a32"/><circle cx="113" cy="30" r="1.6" fill="#f2d24a"/>' +
        '<path d="M118 33 l6 -2 M118 33 l6 2" stroke="#a8201e" stroke-width="1.5"/></svg>';
    // the three names it's offered at the end: its own, and two of its sons'
    var NAMES = [['Samael', true], ['Sabaoth', false], ['Iao', false]];
    var SONS = ['That is one of my sons. Not me.', 'My son? He bows to me. Try again.'];
    var touch = matchMedia('(hover: none)');
    // the artist's sun eye (sky/eye.js), into a box whose own slot has no picture yet
    function sunEye(box, put) {
        Sky.findAsset(box.dataset.asset, function (u) {
            if (u || !Sky.eye || !Sky.eye.make) return;
            Sky.eye.make().then(function (e) { if (e && box.isConnected) put(e); });
        });
    }
    function confront() {
        body.classList.add('demiurge-here');
        var dark = document.createElement('div');
        dark.className = 'dm-dark';
        body.appendChild(dark);
        var dm = document.createElement('div');
        dm.className = 'demiurge';
        dm.dataset.asset = 'assets/sky/demiurge';
        dm.innerHTML = EYE;
        body.appendChild(dm);
        // no Demiurge of its own (assets/sky/demiurge)? then the sun's eye, the artist's (sky/eye.js: sun-eyeball, sun-pupil),
        // come down: it's the same false sun. the cracks and the white film go over it
        sunEye(dm, function (eye) {
            dm.classList.add('sun-eye');
            dm.appendChild(eye);
            dm.insertAdjacentHTML('beforeend', '<svg class="dm-over" viewBox="0 0 400 400" aria-hidden="true">' + dm.querySelector('.dm-cracks').outerHTML +
                '<circle class="dm-film" cx="200" cy="200" r="150" fill="#f4f2ec"/></svg>');
        });
        // where the thing it's claiming with comes up
        var relic = document.createElement('div');
        relic.className = 'gn-relic';
        relic.setAttribute('aria-hidden', 'true');
        relic.innerHTML = '<div class="gr-thing"></div><svg class="gr-cracks" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4 L44 30 L56 44 L46 70 L54 96 M44 30 L22 38 M56 44 L80 50 M46 70 L28 84" fill="none" stroke="#1a0a04" stroke-width="3" stroke-linecap="round"/></svg><div class="gr-sphere"></div>';
        body.appendChild(relic);
        var serpent = document.createElement('div');
        serpent.className = 'gn-serpent';
        serpent.dataset.asset = 'assets/living/serpent';
        serpent.setAttribute('aria-hidden', 'true');
        serpent.innerHTML = SERPENT;
        body.appendChild(serpent);
        if (Sky.fillAssets) Sky.fillAssets(body);
        // its pupil follows the pointer (on a touch screen: the traveller)
        var px = 0, py = 0;
        document.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || e.pointerType === 'pen') { px = e.clientX; py = e.clientY; } }, { passive: true });
        var lookT = setInterval(function () {
            if (touch.matches) {
                var me = document.querySelector('.scene-character'), mr = me && me.getBoundingClientRect();
                if (mr && mr.width) { px = mr.left + mr.width / 2; py = mr.top + mr.height * 0.25; }
            }
            var r = dm.getBoundingClientRect(), dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1;
            dm.style.setProperty('--lx', (dx / d * Math.min(1, d / 300) * 20).toFixed(1) + 'px');
            dm.style.setProperty('--ly', (dy / d * Math.min(1, d / 300) * 10).toFixed(1) + 'px');
        }, 60);
        requestAnimationFrame(function () { dark.classList.add('on'); dm.classList.add('down'); });
        sfx('quake', { size: 0.5 });
        var panel = document.createElement('div');
        panel.className = 'gn-answers';
        panel.setAttribute('role', 'group');
        panel.setAttribute('aria-label', 'answer it');
        body.appendChild(panel);
        PHRASES.forEach(function (p, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.dataset.i = i;
            b.textContent = p;
            panel.appendChild(b);
        });
        function shuffle() {
            var bs = Array.prototype.slice.call(panel.children);
            for (var i = bs.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = bs[i]; bs[i] = bs[j]; bs[j] = t; }
            bs.forEach(function (b) { panel.appendChild(b); });
        }
        shuffle();
        var at = 0, busy = true, wrongs = 0;
        setTimeout(function () {
            speak(['So. You remember.', 'It changes nothing.', 'I am God, and there is no other beside me.'], claim, 'demiurge');
        }, 2600);
        // the thing for this claim, up out of the sea
        function raise(i) {
            var R0 = RELICS[i], thing = relic.querySelector('.gr-thing');
            relic.className = 'gn-relic';
            thing.dataset.asset = R0[0];
            thing.innerHTML = '<svg class="placeholder" viewBox="0 0 100 100" aria-hidden="true">' + R0[2] + '</svg>';
            relic.querySelector('.gr-sphere').textContent = GLYPHS[i] + ' ' + SPHERES[i] + ': ' + R0[1];
            if (Sky.fillAssets) Sky.fillAssets(relic);
            if (i === 5) sunEye(thing, function (eye) { if (thing.dataset.asset === R0[0]) { thing.innerHTML = ''; thing.appendChild(eye); } });   // (the sky's eye: the sun's)
            void relic.offsetWidth;
            relic.classList.add('up');
        }
        function claim() {
            if (at >= 7) { relic.className = 'gn-relic'; name(); return; }
            raise(at);
            speak(CLAIMS[at], function () { busy = false; panel.classList.add('on'); }, 'demiurge');
        }
        panel.addEventListener('click', function (e) {
            var b = e.target.closest('button');
            if (!b || busy || b.disabled) return;
            if (+b.dataset.i === at) {
                busy = true;
                wrongs = 0;
                b.disabled = true;
                b.classList.add('spoken');
                panel.classList.remove('on');
                serpent.classList.remove('on');
                Sky.speak(PHRASES[at], function () {
                    at++;
                    dm.dataset.cracks = at;
                    dm.classList.remove('hurt'); void dm.offsetWidth; dm.classList.add('hurt');
                    sfx('demiurge-hurt', { or: 'crack', size: 0.6 });
                    relic.classList.add('spent');                      // (blanched, cracked, and down it goes)
                    setTimeout(function () { relic.classList.add('sunk'); sfx('relic-sink', { or: 'splash', size: 0.5, volume: 0.6 }); }, 900);
                    setTimeout(claim, 2300);
                }, { hold: 1200 });
            } else {
                b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
                dm.classList.remove('laughs', 'mends'); void dm.offsetWidth; dm.classList.add('laughs', 'mends');
                wrongs++;
                busy = true;
                setTimeout(function () { panel.classList.remove('on'); }, 500);     // (after the shake: away while it laughs, back shuffled)
                speak(NO[Math.floor(Math.random() * NO.length)], function () {
                    setTimeout(function () {
                        shuffle();
                        panel.classList.add('on');
                        busy = false;
                        if (wrongs >= 2) hint();
                    }, 450);
                }, 'demiurge');
            }
        });
        // two wrong in a row: the serpent from the kitchen, coiled at the water's edge, hisses the start of the right one
        function hint() {
            wrongs = 0;
            serpent.classList.add('on');
            var w = PHRASES[at].replace(/[.…]+$/, '').split(' ');
            speak('“' + w.slice(0, Math.min(w.length - 1, 5)).join(' ') + '…”', null, 'serpent');
        }
        // after the seventh: it dares them to name it (its own name, or one of its sons')
        function name() {
            panel.classList.remove('on');
            setTimeout(function () { panel.remove(); }, 600);
            serpent.classList.remove('on');
            var names = document.createElement('div');
            names.className = 'gn-answers gn-names';
            names.setAttribute('role', 'group');
            names.setAttribute('aria-label', 'name it');
            NAMES.slice().sort(function () { return Math.random() - 0.5; }).forEach(function (n) {
                var b = document.createElement('button');
                b.type = 'button';
                b.textContent = n[0];
                if (n[1]) b.dataset.right = '1';
                names.appendChild(b);
            });
            body.appendChild(names);
            var asked = false;
            speak(['Seven words. Very well.', 'But you cannot unmake what you cannot name.', 'Name me, then. If you know me.'], function () { asked = true; names.classList.add('on'); }, 'demiurge');
            names.addEventListener('click', function (e) {
                var b = e.target.closest('button');
                if (!b || !asked || b.disabled) return;
                if (b.dataset.right) {
                    asked = false;
                    names.classList.remove('on');
                    setTimeout(function () { names.remove(); }, 600);
                    blind();
                    return;
                }
                b.disabled = true;
                b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
                dm.classList.remove('laughs'); void dm.offsetWidth; dm.classList.add('laughs');
                speak(SONS[Math.floor(Math.random() * SONS.length)], null, 'demiurge');
            });
        }
        // named: it goes blind
        function blind() {
            Sky.speak(['You are mistaken, Samael.', 'You are blind.'], function () {
                clearInterval(lookT);
                dm.classList.add('blind');
                relic.remove();
                serpent.classList.add('on', 'leaving');
                sfx('demiurge-blind', { or: 'shatter' });
                if (Sky.staticNoise && Sky.staticNoise.burst) Sky.staticNoise.burst(0.8, 600);
                setTimeout(function () {
                    dm.classList.add('gone');
                    dark.classList.remove('on');
                    serpent.remove();
                    if (Sky.source && Sky.source.lift) Sky.source.lift();
                    document.documentElement.classList.add('sky-clearing');     // the red goes out of the sky too
                }, 2600);
                setTimeout(choice, 7400);
            }, { hold: 1600 });
        }
    }
    // the door of light, and what they do with it
    function choice() {
        var door = document.createElement('div');
        door.className = 'gn-door';
        door.setAttribute('aria-hidden', 'true');
        body.appendChild(door);
        requestAnimationFrame(function () { door.classList.add('open'); });
        sfx('door-open', { or: 'shimmer' });
        Sky.speak(['It can’t see me any more.', 'The door’s open. I could go home.', '…But skizy’s still asleep in there. They all are.'], function () {
            var c = document.createElement('div');
            c.className = 'gn-choice';
            c.innerHTML = '<button type="button" class="gn-go">go home</button><button type="button" class="gn-stay">stay, and wake the others</button>';
            body.appendChild(c);
            requestAnimationFrame(function () { c.classList.add('on'); });
            c.querySelector('.gn-go').addEventListener('click', function () {
                c.remove();
                S.setEnding('escaped');
                var w = document.createElement('div');
                w.className = 'gn-flood';
                body.appendChild(w);
                requestAnimationFrame(function () { w.classList.add('on'); });
                sfx('door-open', { or: 'shimmer', size: 1 });
                setTimeout(function () { location.href = 'beyond.html'; }, 3200);
            });
            c.querySelector('.gn-stay').addEventListener('click', function () {
                c.remove();
                S.setEnding('stayed');
                door.classList.remove('open');
                Sky.speak(['Not yet. Not without them.'], function () { location.reload(); }, { hold: 1800 });
            });
        }, { hold: 1400 });
    }
    if (PAGE === 'sea' && knows() && !S.ending) {
        var tries = 0;
        (function when() {                                          // (after the loading screen, if there is one)
            if (document.getElementById('dav-loader') && ++tries < 120) { setTimeout(when, 250); return; }
            setTimeout(confront, 2500);
        })();
    }

    Sky.gnosis = { eat: eat, knows: knows, confront: confront };
})();

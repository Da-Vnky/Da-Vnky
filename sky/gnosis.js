/* =====================================================================
   gnosis.js — the end of reset 8 (5 Oct, Victor). the world is black and
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
                   each claim with the phrase that denies it (any order of choices;
                   a wrong one and it laughs). after the seventh: "You are mistaken,
                   Samael. You are blind." it goes blind, the grey lifts, the code in
                   the sky stops.
     the choice    a door of light on the horizon. go home: "escaped", and from then
                   on the whole site is beyond.html (sky/beyond.js): space, and the
                   last of the music. or stay, and wake the others (skizy): "stayed",
                   the world in its colours again, no more resets (html.free-world;
                   sky/state.js davSave.ending / free). both are kept between visits
                   till "forget your stay".

   slots: assets/sky/demiurge (the Demiurge come down: a lion-faced eye, see-through
          round it), assets/ui/gnosis (behind the remembering, optional)
   sounds: eat, gnosis (each phrase remembered), demiurge-voice (its words), demiurge-hurt
           (each phrase that lands), demiurge-blind, door-open
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
        var all = PHRASES.map(function (p, i) { return { sphere: SPHERES[i], text: p }; }).concat([{ sphere: '', text: LAST, last: true }]);
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
        if (Sky.fillAssets) Sky.fillAssets(body);
        var px = 0, py = 0;
        document.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
        var lookT = setInterval(function () {
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
        var order = PHRASES.map(function (p, i) { return i; }).sort(function () { return Math.random() - 0.5; });
        order.forEach(function (i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.dataset.i = i;
            b.textContent = PHRASES[i];
            panel.appendChild(b);
        });
        var at = 0, busy = true;
        setTimeout(function () {
            speak(['So. You remember.', 'It changes nothing.', 'I am God, and there is no other beside me.'], claim, 'demiurge');
        }, 2600);
        function claim() {
            if (at >= 7) { blind(); return; }
            speak(CLAIMS[at], function () { busy = false; panel.classList.add('on'); }, 'demiurge');
        }
        panel.addEventListener('click', function (e) {
            var b = e.target.closest('button');
            if (!b || busy || b.disabled) return;
            if (+b.dataset.i === at) {
                busy = true;
                b.disabled = true;
                b.classList.add('spoken');
                panel.classList.remove('on');
                Sky.speak(PHRASES[at], function () {
                    at++;
                    dm.dataset.cracks = at;
                    dm.classList.remove('hurt'); void dm.offsetWidth; dm.classList.add('hurt');
                    sfx('demiurge-hurt', { or: 'crack', size: 0.6 });
                    setTimeout(claim, 1300);
                }, { hold: 1200 });
            } else {
                b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
                dm.classList.remove('laughs'); void dm.offsetWidth; dm.classList.add('laughs');
                speak(NO[Math.floor(Math.random() * NO.length)], null, 'demiurge');
            }
        });
        // the seventh lands: the name, and it goes blind
        function blind() {
            Sky.speak(['You are mistaken, Samael.', 'You are blind.'], function () {
                clearInterval(lookT);
                dm.classList.add('blind');
                sfx('demiurge-blind', { or: 'shatter' });
                if (Sky.staticNoise && Sky.staticNoise.burst) Sky.staticNoise.burst(0.8, 600);
                setTimeout(function () {
                    dm.classList.add('gone');
                    dark.classList.remove('on');
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

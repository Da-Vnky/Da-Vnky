/* =====================================================================
   porch.js — out of the front door (living.html): the arrow at the bottom of
   the hallway. The traveller walks out, the hallway lifts away and the porch
   comes up: the roof's edge, the railing, a rocking chair, the mailbox, and
   over the railing the street and the houses across it under the site's own
   sky (the sun, the moon, the clouds, the constellations: the porch is open
   to them). The arrow on the left, the front door, or Escape: back inside.
   living.html#porch starts out here.

   FROM RESET 3 ON, THINGS OUT HERE AREN'T RIGHT:
     the watcher   someone standing under the streetlight across the road,
                   perfectly still. every time you come out he's closer:
                   in the road, at the gate, at the top of the steps. then
                   he's gone, and something knocks on the front door: from
                   the inside. (run:porch-watcher: it starts over after that)
     and, one at a time while you stay out here (EVENTS below):
       the neighbours  in their window across the street, waving. they
                   don't stop. then the window's empty.
       the walker  a man walks past on the far pavement. then again, the
                   same man, the same step. and again.
       the crows   on the wire: all of them turn to look at you at once.
       the mail    the mailbox's flag goes up by itself. inside, a note in
                   the traveller's own handwriting.
       the chair   the rocking chair starts rocking. nobody's in it.
   Before reset 3 it's just a porch: the neighbours wave, once, and mean it.

   slots (assets/living/): porch-frame, porch-street, porch-floor, porch-door, porch-lamp,
          porch-chair, porch-mailbox, porch-mailbox-flag, porch-crow, porch-watcher,
          porch-walker, porch-neighbour; assets/characters/porch (+ porch-walking)
   sounds: creak, caw, knock, dread, door (stand-ins till then)
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    var body = document.body, hall = document.querySelector('.hallway'), porch = document.querySelector('.porch');
    if (!Sky || !hall || !porch || Sky.porch) return;
    var out = hall.querySelector('.hall-out'), back = porch.querySelector('.porch-back'), door = porch.querySelector('.porch-door');
    var hallMe = hall.querySelector('.hall-character'), me = porch.querySelector('.porch-character');
    var chair = porch.querySelector('.porch-chair'), mailbox = porch.querySelector('.porch-mailbox');
    var watcher = porch.querySelector('.porch-watcher'), walker = porch.querySelector('.porch-walker');
    var neighbour = porch.querySelector('.porch-neighbour'), crows = porch.querySelector('.porch-crows');
    var DOOR = 5, STAND = 38;                               // where the traveller comes out (the door) and stands (% across)
    var reset = S ? S.reset : 1, creepy = reset >= 3;
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }
    function say(t, ms) { if (Sky.inventory && Sky.inventory.say) Sky.inventory.say(t, ms || 2800); }

    Sky.css(
        // the way out, at the bottom of the hallway (the arrow's drawn pointing right: turned to point down)
        '.hallway .room-arrow.hall-out { position: absolute; left: 57%; top: auto; bottom: 1.5vh; margin-left: -27px; }' +
        '.hallway .room-arrow.hall-out > svg, .hallway .room-arrow.hall-out > .art { transform: rotate(90deg); }' +
        '.hallway .room-arrow.hall-out:hover, .hallway .room-arrow.hall-out:focus-visible { transform: translateY(4px); }' +
        '.hallway .hall-character.stepping-out { animation: pc-out .6s ease-in forwards; }' +
        '@keyframes pc-out { to { translate: 0 8%; scale: 1.12; opacity: 0; } }' +
        '.porch-back > svg, .porch-back > .art { transform: scaleX(-1); }' +
        '.porch .room-arrow.porch-back:hover, .porch .room-arrow.porch-back:focus-visible { transform: translateX(-4px); }' +

        // the porch: waits below, comes up as the hallway lifts away. open at the top: the site's sky shows through
        '.porch { position: fixed; inset: 0; z-index: 3; overflow: hidden; transform: translateY(100%); visibility: hidden;' +
            '--floor-h: 14vh; --pd: calc(1 - .55 * var(--dusk, 0)); }' +
        'body.in-porch .porch, body.porch-panning .porch { visibility: visible; transition: transform .9s cubic-bezier(.55,0,.25,1), visibility 0s; }' +
        'body.in-porch .porch { transform: none; }' +
        'body.in-porch .hallway { translate: 0 -100%; }' +
        'body.porch-now .porch, body.porch-now .hallway { transition: none !important; }' +
        'body.in-porch .sky-links, body.in-porch .sky-links * { visibility: visible !important; }' +     // (the sky's open out here)
        '.porch > * { position: absolute; }' +
        '.porch .porch-street { left: 0; right: 0; bottom: 22vh; height: 40vh; z-index: 1; filter: brightness(var(--pd)); pointer-events: none; }' +
        '.porch .porch-street > svg, .porch .porch-street > .art { display: block; width: 100%; height: 100%; object-fit: fill; }' +
        '.porch .ps-lamp { opacity: calc(.15 + .85 * var(--dusk, 0)); } .porch .ps-windows { opacity: calc(.2 + .8 * var(--dusk, 0)); }' +
        '.porch .porch-frame { inset: 0; z-index: 2; filter: brightness(var(--pd)); pointer-events: none; }' +
        '.porch .porch-frame > svg, .porch .porch-frame > .art { display: block; width: 100%; height: 100%; object-fit: fill; }' +
        '.porch .room-floor { left: 0; right: 0; bottom: 0; height: var(--floor-h); z-index: 2; pointer-events: none; filter: brightness(var(--pd)); }' +
        '.porch .room-floor .placeholder, .porch .room-floor > .art { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: fill; }' +
        '.porch .room-floor .placeholder { border-top: 7px solid #5a3e28; background: linear-gradient(rgba(0,0,0,.28), transparent 40%),' +
            'repeating-linear-gradient(to right, transparent 0 118px, rgba(0,0,0,.28) 118px 121px), repeating-linear-gradient(to bottom, #8a6444 0 18px, #7a563a 18px 20px); }' +
        // the things on the porch
        '.porch .furnish { z-index: 3; padding: 0; border: 0; background: none; filter: brightness(var(--pd)); }' +
        '.porch button.furnish { cursor: pointer; }' +
        '.porch button.furnish:hover, .porch button.furnish:focus-visible { outline: none; filter: brightness(var(--pd)) drop-shadow(0 0 8px rgba(255,220,150,.55)); }' +
        '.porch .furnish > svg, .porch .furnish > .art { display: block; width: 100%; height: 100%; object-fit: contain; }' +
        '.porch .kh-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap; z-index: 6;' +
            'font: italic .95rem "IM Fell English", Georgia, serif; color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.9); opacity: 0; transition: opacity .2s; pointer-events: none; }' +
        '.porch button:hover .kh-hint, .porch button:focus-visible .kh-hint, .porch .porch-neighbour:hover .kh-hint, .porch .porch-watcher:hover .kh-hint { opacity: 1; }' +
        '.porch .porch-door { left: 1.6%; bottom: calc(var(--floor-h) - 1vh); width: 7.6%; height: 54vh; }' +
        '.porch .porch-door > svg, .porch .porch-door > .art { object-fit: fill; }' +
        '.porch .porch-lamp { left: 9.4%; bottom: 46vh; width: 2.2vw; min-width: 22px; aspect-ratio: 30 / 50; pointer-events: none; }' +
        '.porch .porch-lamp .pl-glass { opacity: calc(.3 + .7 * var(--dusk, 0)); }' +
        '.porch .porch-lamp::after { content: ""; position: absolute; left: 50%; top: 50%; width: 900%; aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%;' +
            'background: radial-gradient(circle, rgba(255,214,140,.32), rgba(255,214,140,0) 62%); opacity: var(--dusk, 0); pointer-events: none; }' +
        '.porch .porch-chair { left: 17%; bottom: 4vh; height: 27vh; aspect-ratio: 120 / 170; transform-origin: 50% 92%; }' +
        '.porch .porch-chair.rock { animation: pc-rock 1.5s ease-in-out 3; }' +
        '.porch .porch-chair.rocking { animation: pc-rock 1.7s ease-in-out infinite; }' +
        '@keyframes pc-rock { 0%, 100% { rotate: 0deg; } 25% { rotate: -5deg; } 75% { rotate: 4deg; } }' +
        '.porch .porch-mailbox { left: 81.6%; bottom: 44vh; width: 5.4vw; min-width: 54px; aspect-ratio: 70 / 50; overflow: visible; }' +
        '.porch .porch-flag { position: absolute; right: -4%; bottom: 26%; height: 78%; aspect-ratio: 10 / 40; transform-origin: 50% 88%; rotate: 90deg; transition: rotate .7s cubic-bezier(.5,1.6,.5,1); }' +
        '.porch .porch-flag > svg, .porch .porch-flag > .art { display: block; width: 100%; height: 100%; }' +
        '.porch .porch-mailbox.up .porch-flag { rotate: 0deg; }' +
        // across the street: the neighbours in their window, the crows on the wire, the man walking by, the one who watches
        '.porch .porch-neighbour { left: 73.8%; bottom: 42vh; width: 2.9%; height: 4vh; z-index: 1; opacity: 0; transition: opacity .4s; }' +
        '.porch .porch-neighbour > svg, .porch .porch-neighbour > .art { display: block; width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; }' +
        '.porch .porch-neighbour.on { opacity: 1; }' +
        '.porch .porch-neighbour .pn-arm { transform-box: fill-box; transform-origin: 0% 100%; }' +
        '.porch .porch-neighbour.on .pn-arm { animation: pn-wave .5s ease-in-out infinite alternate; }' +
        '.porch .porch-neighbour.on:has(> .art) { animation: none; }' +
        '@keyframes pn-wave { from { rotate: -18deg; } to { rotate: 22deg; } }' +
        '.porch .porch-crows { inset: 0; z-index: 1; pointer-events: none; }' +
        '.porch .porch-crow { position: absolute; bottom: 55.7vh; height: 3vh; aspect-ratio: 40 / 30; filter: brightness(var(--pd)); transition: transform .12s; }' +
        '.porch .porch-crow > svg, .porch .porch-crow > .art { display: block; width: 100%; height: 100%; }' +
        '.porch .porch-crow.c1 { left: 45%; } .porch .porch-crow.c2 { left: 49.5%; bottom: 55.4vh; } .porch .porch-crow.c3 { left: 53%; bottom: 55.3vh; }' +
        '.porch .porch-crow.c4 { left: 57.6%; bottom: 55.4vh; } .porch .porch-crow.c5 { left: 61%; }' +
        '.porch .porch-crow.flip { transform: scaleX(-1); }' +
        '.porch .porch-crows.stare .pc-eye { fill: #f4f0e0; r: 1.6; }' +
        '.porch .porch-walker { left: -8%; bottom: 36vh; height: 10vh; aspect-ratio: 40 / 110; z-index: 1; filter: brightness(var(--pd)); pointer-events: none; }' +
        '.porch .porch-walker > svg, .porch .porch-walker > .art { display: block; width: 100%; height: 100%; object-fit: contain; }' +
        '.porch .porch-walker .pw-l, .porch .porch-walker .pw-r { transform-box: fill-box; transform-origin: 50% 0; }' +
        '.porch .porch-walker.going .pw-l { animation: pw-step .6s ease-in-out infinite alternate; } .porch .porch-walker.going .pw-r { animation: pw-step .6s ease-in-out infinite alternate-reverse; }' +
        '@keyframes pw-step { from { rotate: -16deg; } to { rotate: 16deg; } }' +
        '.porch .porch-watcher { aspect-ratio: 40 / 140; z-index: 1; display: none; cursor: default; }' +
        '.porch .porch-watcher > svg, .porch .porch-watcher > .art { display: block; width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; }' +
        '.porch .porch-watcher.w0 { display: block; left: 26.4%; bottom: 35.6vh; height: 8vh; }' +
        '.porch .porch-watcher.w1 { display: block; left: 60%; bottom: 31.4vh; height: 11.5vh; }' +
        '.porch .porch-watcher.w2 { display: block; left: 47.6%; bottom: 21vh; height: 17vh; }' +
        '.porch .porch-watcher.w3 { display: block; left: 47.2%; bottom: 10vh; height: 31vh; z-index: 4; }' +
        '.porch .porch-character { left: ' + STAND + '%; bottom: 3vh; height: 25vh; z-index: 5; }' +
        '@media (max-width: 620px) { .porch .porch-character { height: 15vh; } .porch .porch-chair { height: 17vh; } .porch .porch-door { width: 12%; height: 40vh; } }' +
        '@media (prefers-reduced-motion: reduce) { .porch .porch-chair.rocking, .porch .porch-neighbour.on .pn-arm, .porch .porch-walker .pw-l, .porch .porch-walker .pw-r { animation: none !important; } }'
    );

    /* ---------------- out of the front door, and back in ---------------- */
    var busy = false, outside = false;
    function walk(ch, x, done) { if (Sky.sides && Sky.sides.walk) Sky.sides.walk(ch, x, done); else { ch.style.left = x + '%'; if (done) setTimeout(done, 300); } }
    function place(ch, x, left) { if (Sky.sides && Sky.sides.place) Sky.sides.place(ch, x, left); else ch.style.left = x + '%'; }
    function pctOf(el, host) { var r = el.getBoundingClientRect(), hr = host.getBoundingClientRect(); return (r.left + r.width / 2 - hr.left) / (hr.width || window.innerWidth) * 100; }
    function standAt(ch, x) { return x - (ch.offsetWidth / 2) / (ch.parentNode.clientWidth || window.innerWidth) * 100; }
    function elsewhere() {
        return !body.classList.contains('in-hall') || body.classList.contains('in-attic') || body.classList.contains('in-kitchen') ||
               (Sky.sides && Sky.sides.busy) || (Sky.kitchen && Sky.kitchen.inside);
    }
    function goOut() {
        if (busy || outside || elsewhere()) return;
        busy = true;
        body.classList.add('side-walking');
        var step = function () {
            if (hallMe) hallMe.classList.add('stepping-out');
            sfx('door', { size: 0.5 });
            setTimeout(function () { openPorch(false); }, 450);
        };
        if (hallMe) walk(hallMe, standAt(hallMe, pctOf(out, hall)), function () { hallMe.classList.remove('face-left'); step(); }); else step();
    }
    function openPorch(now) {
        outside = true;
        body.classList.add(now ? 'porch-now' : 'porch-panning', 'in-porch');
        porch.setAttribute('aria-hidden', 'false');
        try { history.replaceState(null, '', '#porch'); } catch (e) {}
        if (Sky.fillAssets) Sky.fillAssets(porch);
        if (hallMe) hallMe.classList.remove('stepping-out');
        if (now) {
            place(me, STAND);
            setTimeout(function () { body.classList.remove('porch-now', 'side-walking'); busy = false; arrived(); }, 60);
            return;
        }
        place(me, DOOR);
        setTimeout(function () {
            body.classList.remove('porch-panning');
            walk(me, STAND, function () { busy = false; body.classList.remove('side-walking'); arrived(); });
        }, 900);
    }
    function goIn(now) {
        if (!outside || (busy && !now)) return;
        var shut = function () {
            outside = false;
            quiet();
            body.classList.add(now ? 'porch-now' : 'porch-panning');
            body.classList.remove('in-porch');
            porch.setAttribute('aria-hidden', 'true');
            try { history.replaceState(null, '', body.classList.contains('in-hall') ? '#hallway' : location.pathname + location.search); } catch (e) {}
            var at = hallMe ? standAt(hallMe, pctOf(out, hall)) : 44;
            if (hallMe) place(hallMe, at);
            if (now) { setTimeout(function () { body.classList.remove('porch-panning', 'porch-now', 'side-walking'); busy = false; }, 60); return; }
            setTimeout(function () {
                body.classList.remove('porch-panning');
                var done = function () { busy = false; body.classList.remove('side-walking'); if (hallMe) hallMe.classList.remove('face-left'); };
                if (hallMe) walk(hallMe, 44, done); else done();
            }, 900);
        };
        if (now) { shut(); return; }
        busy = true;
        body.classList.add('side-walking');
        walk(me, DOOR, function () { sfx('door', { size: 0.5 }); shut(); });
    }
    if (out) out.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); goOut(); });
    if (back) back.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); goIn(false); });
    if (door) door.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); goIn(false); });
    document.addEventListener('keydown', function (e) {                   // (Escape out here: back into the hallway)
        if (e.key !== 'Escape' || !outside || body.classList.contains('inv-holding')) return;
        e.stopImmediatePropagation();
        goIn(false);
    }, true);
    (function hookSides(n) {                                                // (out of the hallway some other way: back in behind them)
        if (Sky.sides && Sky.sides.on) Sky.sides.on(function (what, name) { if (name === 'hall' && what === 'leave' && outside) goIn(true); });
        else if (n < 40) setTimeout(function () { hookSides(n + 1); }, 150);
    })(0);
    if (location.hash === '#porch') setTimeout(function () { if (Sky.sides && Sky.sides.goNow) Sky.sides.goNow('hall'); setTimeout(function () { openPorch(true); }, 80); }, 120);

    /* ---------------- what happens out here ---------------- */
    var timers = [];
    function later(ms, fn) { var t = setTimeout(function () { if (outside) fn(); }, ms); timers.push(t); return t; }
    // back inside: everything stops, and goes back to how it was
    function quiet() {
        timers.forEach(clearTimeout); timers = [];
        neighbour.classList.remove('on');
        walker.getAnimations().forEach(function (a) { a.cancel(); });
        walker.classList.remove('going');
        crows.classList.remove('stare');
        chair.classList.remove('rocking', 'rock');
        watcher.className = 'porch-watcher';
    }
    function crowIdle() {                                                   // (they shift about on the wire, now and then)
        var cs = crows.querySelectorAll('.porch-crow');
        cs.forEach(function (c) { c.classList.toggle('flip', Math.random() < 0.5); });
    }
    function arrived() {
        crowIdle();
        if (!creepy) {
            // just a porch. the neighbours wave, once a visit, and mean it
            if (!arrived.waved) { arrived.waved = true; later(2200, function () { neighbour.classList.add('on'); say('The neighbours wave. I wave back.', 2600); later(3600, function () { neighbour.classList.remove('on'); }); }); }
            (function idle() { later(9000 + Math.random() * 9000, function () { crowIdle(); idle(); }); })();
            return;
        }
        watch();
        later(9000, nextEvent);
    }

    // the watcher: closer every time you come out (0 under the streetlight, 1 in the road, 2 at the gate, 3 at the top of the steps, 4 gone)
    var WATCH_LINES = ['Someone’s standing under the streetlight. Just standing there.', 'He’s closer.', 'I didn’t see him move.', 'He’s at the steps.', 'He’s gone.'];
    function watch() {
        var step = Math.max(0, Math.min(4, +(S && S.get('porch-watcher')) || 0));
        if (S) S.set('porch-watcher', String(step >= 4 ? 0 : step + 1));      // (and next time, closer. after he's gone, it starts over)
        if (step < 4) watcher.classList.add('w' + step);
        later(1500, function () {
            say(WATCH_LINES[step], 2800);
            if (step >= 2) sfx('dread', { volume: step === 3 ? 0.9 : 0.5 });
        });
        if (step === 4) {                                                   // gone. and then, behind them: the front door
            later(5200, function () { sfx('knock', { size: 0.8 }); });
            later(5900, function () { sfx('knock', { size: 0.8 }); });
            later(6600, function () { sfx('knock', { size: 0.8 }); });
            later(7800, function () { say('…That came from inside the house.', 3200); });
        }
    }
    if (watcher) {
        watcher.setAttribute('aria-label', 'someone');
        watcher.addEventListener('click', function () { if (outside && !busy) say('I’m not going over there.', 2200); });
    }

    // the rest, one at a time (never the same one twice running)
    var EVENTS = {
        neighbours: function () {
            neighbour.classList.add('on');
            neighbour.querySelector('.kh-hint').textContent = 'they’re still waving';
            later(1400, function () { say('The neighbours are waving.', 2400); });
            later(8000, function () { say('…They haven’t stopped.', 2400); });
            later(15000, function () { neighbour.classList.remove('on'); neighbour.querySelector('.kh-hint').textContent = 'the neighbours'; });
            return 16000;
        },
        walker: function () {
            var PASS = 9000;
            function pass(i) {
                walker.classList.add('going');
                var a = walker.animate([{ left: '-8%' }, { left: '106%' }], { duration: PASS, easing: 'linear' });
                a.onfinish = function () { walker.classList.remove('going'); if (i < 2 && outside) pass(i + 1); };
                if (i === 1) later(2500, function () { say('Didn’t he just…', 2200); });
                if (i === 2) later(2500, function () { say('Same man. Same step.', 2400); });
            }
            pass(0);
            return PASS * 3 + 800;
        },
        crows: function () {
            var mx = me.getBoundingClientRect().left + me.offsetWidth / 2;
            sfx('caw', { or: 'tap', size: 0.3 });
            crows.querySelectorAll('.porch-crow').forEach(function (c, i) {
                setTimeout(function () {
                    var cx = c.getBoundingClientRect().left + c.offsetWidth / 2;
                    c.classList.toggle('flip', mx < cx);                        // (drawn facing right: flipped if the traveller's to the left)
                }, i * 60);
            });
            later(500, function () { crows.classList.add('stare'); });
            later(1600, function () { say('They’re all looking at me.', 2600); });
            later(14000, function () { crows.classList.remove('stare'); crowIdle(); });
            return 14000;
        },
        mail: function () {
            if (mailbox.classList.contains('up')) return 0;
            mailbox.classList.add('up');
            sfx('creak', { or: 'tap', size: 0.5 });
            later(1200, function () { say('The flag on the mailbox just went up.', 2600); });
            return 6000;
        },
        chair: function () {
            chair.classList.add('rocking');
            sfx('creak', { or: 'tap', size: 0.7 });
            later(1800, function () { say('…Nobody’s sitting in it.', 2400); });
            later(12000, function () { chair.classList.remove('rocking'); });
            return 12500;
        }
    };
    var last = null;
    function nextEvent() {
        if (busy) { later(3000, nextEvent); return; }
        var names = Object.keys(EVENTS).filter(function (n) { return n !== last; });
        var n = names[Math.floor(Math.random() * names.length)];
        last = n;
        var took = EVENTS[n]() || 0;
        later(took + 12000 + Math.random() * 14000, nextEvent);
    }

    /* ---------------- the things on the porch ---------------- */
    // the mailbox: bills, or (flag up, from reset 3) a note in the traveller's own handwriting
    var NOTES = { 3: '“You’ve been here before.”', 4: '“Don’t go up to the attic.”', 5: '“It gets worse.”', 6: '“Stop counting.”', 7: '“You were never alone in the house.”', 8: '“Almost.”' };
    mailbox.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (!outside || busy) return;
        if (mailbox.classList.contains('up')) {
            mailbox.classList.remove('up');
            sfx('page-turn', { size: 0.5 });
            say('A note. In my own handwriting: ' + (NOTES[Math.min(8, reset)] || NOTES[3]), 4200);
            return;
        }
        say(creepy ? 'Empty.' : 'Just bills.', 1800);
    });
    // the rocking chair: give it a push (from reset 3, when it's rocking all by itself, no)
    chair.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (!outside || busy) return;
        if (chair.classList.contains('rocking')) { say('I’m not sitting in that.', 2000); return; }
        chair.classList.remove('rock'); void chair.offsetWidth; chair.classList.add('rock');
        sfx('creak', { or: 'tap', size: 0.6 });
        say(creepy ? 'It creaks. It keeps creaking after it stops.' : 'It creaks.', 2200);
    });
    chair.addEventListener('animationend', function () { chair.classList.remove('rock'); });

    Sky.porch = { get outside() { return outside; }, out: goOut, in: goIn, inNow: function () { goIn(true); }, open: function () { openPorch(true); },
                  events: Object.keys(EVENTS), event: function (n) { if (outside && EVENTS[n]) EVENTS[n](); } };      // (the debug page: one of them, now)
})();

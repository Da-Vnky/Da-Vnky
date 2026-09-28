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

    // its look is in sky/css/porch.css (linked from each page's head); these are the values it takes from here
    document.documentElement.style.setProperty('--porch-stand', STAND);

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
    // the trip from room to room, and changing your mind on the way (sky/bathroom.js: "a trip from room to room")
    var T = function () { return Sky.sides || {}; };
    function ask(fn) { if (T().ask) T().ask(fn); else fn(); }
    function setOff(cancel) { if (T().setOff) T().setOff(cancel); }
    function through() { if (T().through) T().through(); }
    function land(el, to, settle) { if (T().land) T().land(el, to, settle); else if (el) walk(el, to, settle); else settle(); }
    function stop(el) { if (T().stop) T().stop(el); }
    function goOut() {
        if (busy || outside || elsewhere()) return;
        busy = true;
        body.classList.add('side-walking');
        var step = function () {
            through();
            if (hallMe) hallMe.classList.add('stepping-out');
            sfx('door', { size: 0.5 });
            setTimeout(function () { openPorch(false); }, 450);
        };
        if (!hallMe) { step(); return; }
        setOff(function () { stop(hallMe); busy = false; body.classList.remove('side-walking'); });
        walk(hallMe, standAt(hallMe, pctOf(out, hall)), function () { hallMe.classList.remove('face-left'); step(); });
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
        through();
        place(me, DOOR);
        setTimeout(function () {
            body.classList.remove('porch-panning');
            land(me, STAND, function () { busy = false; body.classList.remove('side-walking'); me.classList.remove('face-left'); arrived(); });
        }, 900);
    }
    function goIn(now) {
        if (!outside || (busy && !now)) return;
        var shut = function () {
            if (!now) through();
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
                land(hallMe, 44, function () { busy = false; body.classList.remove('side-walking'); if (hallMe) hallMe.classList.remove('face-left'); });
            }, 900);
        };
        if (now) { shut(); return; }
        busy = true;
        body.classList.add('side-walking');
        setOff(function () { stop(me); busy = false; body.classList.remove('side-walking'); });
        walk(me, DOOR, function () { sfx('door', { size: 0.5 }); shut(); });
    }
    function headFor(where, fallback) { ask(function () { if (T().nav) T().nav(where); else fallback(); }); }
    if (out) out.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); headFor('porch', goOut); });
    if (back) back.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); headFor('hall', function () { goIn(false); }); });
    if (door) door.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); headFor('hall', function () { goIn(false); }); });
    document.addEventListener('keydown', function (e) {                   // (Escape out here: back into the hallway)
        if (e.key !== 'Escape' || !outside || body.classList.contains('inv-holding')) return;
        e.stopImmediatePropagation();
        headFor('hall', function () { goIn(false); });
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

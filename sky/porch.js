/* =====================================================================
   porch.js — out of the front door (living.html): the arrow at the bottom of
   the hallway. The traveller walks out, the hallway lifts away and the porch
   comes up: the roof's edge, the railing, a rocking chair, the mailbox, and
   over the railing the street and the houses across it under the site's own
   sky (the sun, the moon, the clouds, the constellations: the porch is open
   to them). The arrow on the left, the front door, or Escape: back inside. The
   glow at the steps (the gap in the railing): down into the front garden (sky/front.js).
   living.html#porch starts out here. On an upright phone the porch is wider than the
   screen: the arrows at the sides (or a swipe) look along it (LOOKING below).

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
    if (!Sky || !Sky.house || !hall || !porch || Sky.porch) return;
    var out = hall.querySelector('.hall-out'), back = porch.querySelector('.porch-back'), door = porch.querySelector('.porch-door');
    var hallMe = hall.querySelector('.hall-character'), me = porch.querySelector('.porch-character');
    var chair = porch.querySelector('.porch-chair'), mailbox = porch.querySelector('.porch-mailbox');
    var watcher = porch.querySelector('.porch-watcher'), walker = porch.querySelector('.porch-walker');
    var neighbour = porch.querySelector('.porch-neighbour'), crows = porch.querySelector('.porch-crows');
    var DOOR = 5, STAND = 38;                               // where the traveller comes out (the door) and stands (% across)
    var reset = S ? S.reset : 1, creepy = reset >= 3;
    var H = Sky.house, sfx = Sky.sfx;
    function say(t, ms) { Sky.say(t, ms || 2800); }

    // its look is in sky/css/porch.css (linked from each page's head); these are the values it takes from here
    document.documentElement.style.setProperty('--porch-stand', STAND);

    /* ---------------- out of the front door, and back in (the trip between rooms: sky/house.js) ---------------- */
    var busy = false, outside = false;
    var walk = H.walk, place = H.place, stop = H.stop, pctOf = H.pctOf, standAt = H.standAt;
    function goOut() {
        if (busy || outside) return;
        busy = true;
        var step = function () {
            H.through();
            if (hallMe) hallMe.classList.add('stepping-out');
            sfx('door', { size: 0.5 });
            setTimeout(function () { openPorch(false); }, 450);
        };
        if (!hallMe) { step(); return; }
        H.setOff(function () { stop(hallMe); busy = false; });
        walk(hallMe, standAt(hallMe, pctOf(out, hall)), function () { hallMe.classList.remove('face-left'); step(); });
    }
    function openPorch(now) {
        outside = true;
        body.classList.add(now ? 'porch-now' : 'porch-panning', 'in-porch');
        porch.setAttribute('aria-hidden', 'false');
        try { history.replaceState(null, '', '#porch'); } catch (e) {}
        if (Sky.fillAssets) Sky.fillAssets(porch);
        if (hallMe) hallMe.classList.remove('stepping-out');
        H.fire('enter', 'porch');
        if (now) {
            place(me, STAND);
            look(viewOf(STAND), true);
            setTimeout(function () { body.classList.remove('porch-now'); busy = false; arrived(); }, 60);
            return;
        }
        place(me, DOOR);
        look(0, true);                                                      // (the door end, then along with them)
        setTimeout(function () {
            body.classList.remove('porch-panning');
            look(viewOf(STAND));
            H.land(me, STAND, function () { busy = false; me.classList.remove('face-left'); arrived(); });
        }, 900);
    }
    function goIn() {
        if (!outside || busy) return;
        var shut = function () {
            H.through();
            outside = false;
            quiet();
            body.classList.add('porch-panning');
            body.classList.remove('in-porch');
            porch.setAttribute('aria-hidden', 'true');
            try { history.replaceState(null, '', '#hallway'); } catch (e) {}
            H.fire('leave', 'porch');
            if (hallMe) place(hallMe, standAt(hallMe, pctOf(out, hall)));
            setTimeout(function () {
                body.classList.remove('porch-panning');
                H.land(hallMe, 44, function () { busy = false; if (hallMe) hallMe.classList.remove('face-left'); });
            }, 900);
        };
        busy = true;
        H.setOff(function () { stop(me); busy = false; });
        look(0);
        walk(me, DOOR, function () { sfx('door', { size: 0.5 }); shut(); });
    }
    H.room('porch', { parent: 'hall', here: function () { return outside; }, busy: function () { return busy; }, enter: goOut, leave: goIn });
    // down the steps (the gap in the railing, the arrow there): out into the front garden, the house seen from the path
    // (sky/front.js: the black, and the garden comes up out of it)
    var steps = porch.querySelector('.porch-steps'), STEPS = 50;
    function goDown() {
        if (!outside || busy || !Sky.front || !Sky.front.fromPorch) return;
        busy = true;
        H.setOff(function () { stop(me); busy = false; });
        look(viewOf(STEPS));
        walk(me, standAt(me, STEPS), function () {
            H.through();
            me.classList.remove('face-left');
            me.classList.add('going-down');
            sfx('step', { size: 0.4 });
            setTimeout(function () { sfx('step', { size: 0.35 }); }, 280);
            setTimeout(function () {
                Sky.front.fromPorch(function () {                 // (in the black: the porch put away, nothing moving)
                    outside = false;
                    quiet();
                    body.classList.remove('in-porch', 'porch-panning');
                    porch.setAttribute('aria-hidden', 'true');
                    me.classList.remove('going-down');
                    busy = false;
                    H.fire('leave', 'porch');
                    if (Sky.sides && Sky.sides.homeNow) Sky.sides.homeNow();
                });
            }, 420);
        });
    }
    if (steps) steps.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); H.ask(goDown); });
    function inside(e) { e.preventDefault(); e.stopPropagation(); H.go('hall'); }
    if (out) out.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); H.go('porch'); });
    if (back) back.addEventListener('click', inside);
    if (door) door.addEventListener('click', inside);
    if (location.hash === '#porch') setTimeout(function () { if (Sky.sides) Sky.sides.goNow('hall'); setTimeout(function () { openPorch(true); }, 80); }, 120);

    /* ---------------- LOOKING along the porch, on an upright phone (11 Oct) ----------------
       porch.css makes the porch wider than the screen there, so you see a part of it at a time: the door end, the steps,
       the mailbox end (VIEWS: how far along the part that doesn't fit; the middle one shows the bee over the yard, the
       traveller and the steps). the arrows at the screen's sides look along it,
       so does a swipe; when the traveller walks (out of the door, to the steps, back in) the view goes with them */
    var VIEWS = [0, .43, 1], view = 1, narrow = window.matchMedia('(max-width: 620px)');
    var lookL = document.querySelector('.porch-look.look-left'), lookR = document.querySelector('.porch-look.look-right');
    function spare() { return narrow.matches ? Math.max(0, porch.offsetWidth - window.innerWidth) : 0; }
    function look(i, now) {
        view = Math.max(0, Math.min(VIEWS.length - 1, i));
        var more = spare();
        if (now) body.classList.add('porch-look-now');
        porch.style.setProperty('--porch-pan', Math.round(VIEWS[view] * more));
        body.classList.toggle('porch-look-l', more > 0 && view > 0);
        body.classList.toggle('porch-look-r', more > 0 && view < VIEWS.length - 1);
        if (now) { void porch.offsetWidth; body.classList.remove('porch-look-now'); }
    }
    // the view that shows the traveller best, standing at pct (% across the porch)
    function viewOf(pct) {
        var more = spare(), w = porch.offsetWidth, x = (pct / 100) * w + me.offsetWidth / 2, best = view, d = Infinity;
        if (!more) return view;
        VIEWS.forEach(function (f, i) { var off = Math.abs(f * more + window.innerWidth / 2 - x); if (off < d) { d = off; best = i; } });
        return best;
    }
    function lookBy(n) { return function (e) { e.preventDefault(); e.stopPropagation(); if (outside) look(view + n); }; }
    if (lookL) lookL.addEventListener('click', lookBy(-1));
    if (lookR) lookR.addEventListener('click', lookBy(1));
    // a swipe across the porch (a finger, sideways more than down): look the other way, like dragging the view along
    var swipe = null;
    porch.addEventListener('pointerdown', function (e) { swipe = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }; }, true);
    porch.addEventListener('pointerup', function (e) {
        if (!swipe || !outside || body.classList.contains('bee-talking')) return;
        var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
        swipe = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && spare()) look(view + (dx < 0 ? 1 : -1));
    }, true);
    porch.addEventListener('pointercancel', function () { swipe = null; }, true);
    window.addEventListener('resize', function () { look(view, true); });
    look(view, true);

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
    var NOTES = { 3: '“You’ve been here before.”', 4: '“Don’t go up to the attic.”', 5: '“It gets worse.”', 6: '“You were never alone in the house.”', 7: '“Stop counting.”', 8: '“Almost.”' };
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

    Sky.porch = { get outside() { return outside; }, look: look, views: function () { return spare() ? VIEWS.length : 0; },
                  events: Object.keys(EVENTS), event: function (n) { if (outside && EVENTS[n]) EVENTS[n](); } };      // (the debug page: one of them, now)
})();

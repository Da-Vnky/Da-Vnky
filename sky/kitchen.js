/* =====================================================================
   kitchen.js — the kitchen, off to the left of the hallway (living.html):
   the arrow on the hallway's left, and a tab of its own on the right (the
   place tabs: sky/sky.js PLACES). The traveller walks off the hallway's left
   edge and the kitchen slides in; the arrow on the right (or Escape) goes back
   to the hallway. living.html#kitchen starts in there.

   THE FRIDGE: click it and it swings open (and again to shut it). An apple
   pie on the bottom shelf: in reset 3 the reset's key is stuck in it, its ring
   sticking out (RESETS in sky/state.js; the key itself is sky/resets.js's).
   THE DRAWERS: four under the worktop; click one and it slides out, again and
   it shuts. What's in each is a picture of its own (kitchen-drawer-1 … -4).
   THE STOVE, at the end of the counter: the hob lights (and goes out), the oven
   door drops open. THE MICROWAVE, on the worktop: it runs for a few seconds, empty,
   and dings (from reset 4 its clock says 6:66). Dancers while a record plays: a
   kettle on the hob, salt and pepper (sky/music.js GROOVES).

   THE BOWL: a fruit bowl on the worktop, and coiled round it a string of
   sausages (resets 1 and 2). From reset 3 on it's a serpent ("eat. and you
   will know": the serpent in Eden, the one who offered knowledge; in reset 3
   that's the pie in the fridge). The first time a visitor walks in each
   reset from 3 on, they see the sausages first, and then they turn. (There
   used to be an apple here, reset 3's death: that's skizy's pills now.)

   slots (assets/living/): kitchen-wall, kitchen-floor, kitchen-window, kitchen-counter,
          kitchen-drawer, kitchen-drawer-1 … -4, kitchen-fridge, kitchen-fridge-inside, kitchen-pie,
          fruit-bowl, serpent, sausages, kitchen-stove, kitchen-oven-door, kitchen-stove-flames,
          kitchen-microwave, kitchen-microwave-on, kitchen-kettle, kitchen-shakers; assets/ui/place-kitchen (its tab);
          assets/characters/kitchen (+ kitchen-walking)
   sounds: hiss, drawer, fridge-open, fridge-close, burner, oven-open, oven-close, microwave, ding (stand-ins till then)
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    var body = document.body, hall = document.querySelector('.hallway'), kit = document.querySelector('.kitchen');
    if (!Sky || !Sky.house || !hall || !kit || Sky.kitchen) return;
    var door = hall.querySelector('.hall-to-kitchen'), back = kit.querySelector('.kitchen-back');
    var hallMe = hall.querySelector('.character'), me = kit.querySelector('.kitchen-character');
    var serpent = kit.querySelector('.kitchen-serpent'), sausages = kit.querySelector('.kitchen-sausages');
    var ENTER = 78;                                        // where the traveller comes in (% across: the doorway's on the right, from here)
    // where they stand once in: just in from the doorway; on an upright phone, by the fridge (5 Oct: the kitchen fills the
    // narrow screen side to side, and anywhere else they hid the counter or the stove); on a phone held sideways, past the stove
    var UPRIGHT = window.matchMedia('(max-width: 620px)'), SIDEWAYS = window.matchMedia('(max-height: 500px)');
    function rest(n) { return UPRIGHT.matches ? 1 : SIDEWAYS.matches ? 85 : ENTER - n; }
    var H = Sky.house, sfx = Sky.sfx;
    function say(t, ms) { Sky.say(t, ms || 2600); }

    // its look is in sky/css/kitchen.css (linked from each page's head); these are the values it takes from here
    document.documentElement.style.setProperty('--kitchen-enter', ENTER);

    // what's round the bowl this reset: sausages (resets 1, 2), a serpent (3 on). the first time in, from 3 on, they turn
    var SERPENT = !!S && S.reset >= 3;
    kit.classList.add(!SERPENT ? 'bowl-sausages' : S.get('serpent-turned') === '1' ? 'bowl-serpent' : 'bowl-turning');
    function turnSerpent() {
        if (!kit.classList.contains('bowl-turning')) return;
        S.set('serpent-turned', '1');
        setTimeout(function () {
            kit.classList.add('turn');
            sfx('hiss', { or: 'fizz', size: 0.4, delay: 0.7 });
            setTimeout(function () { kit.classList.remove('bowl-turning', 'turn'); kit.classList.add('bowl-serpent'); }, 2700);
        }, 2200);
    }

    /* ---------------- through the doorway, and back (the trip between rooms: sky/house.js) ---------------- */
    var busy = false, inside = false;
    var walk = H.walk, place = H.place, stop = H.stop, pctOf = H.pctOf, standAt = H.standAt;
    function goIn() {
        if (busy || inside) return;
        busy = true;
        if (!hallMe) { openKitchen(false); return; }
        // off the hallway's left edge; the kitchen slides in as they reach it
        var secs = H.walkSecs(hallMe, -14), timer;
        H.setOff(function () { clearTimeout(timer); stop(hallMe); busy = false; });
        walk(hallMe, -14);
        timer = setTimeout(function () { openKitchen(false); }, Math.max(650, (secs - 0.8) * 1000));
    }
    function openKitchen(now) {
        inside = true;
        if (now) body.classList.add('kitchen-now'); else body.classList.add('kitchen-panning');
        body.classList.add('in-kitchen');
        kit.setAttribute('aria-hidden', 'false');
        try { history.replaceState(null, '', '#kitchen'); } catch (e) {}
        if (Sky.fillAssets) Sky.fillAssets(kit);
        H.fire('enter', 'kitchen');
        turnSerpent();
        if (now) { place(me, rest(20)); setTimeout(function () { body.classList.remove('kitchen-now'); busy = false; }, 60); return; }
        H.through();
        place(me, 96, true);
        setTimeout(function () {
            body.classList.remove('kitchen-panning');
            H.land(me, rest(14), function () { busy = false; me.classList.remove('face-left'); });
        }, 900);
    }
    function goOut() {
        if (!inside || busy) return;
        var shut = function () {
            H.through();
            inside = false;
            shutAll(true);
            body.classList.add('kitchen-panning');
            body.classList.remove('in-kitchen');
            kit.setAttribute('aria-hidden', 'true');
            try { history.replaceState(null, '', '#hallway'); } catch (e) {}
            H.fire('leave', 'kitchen');
            // back into the hallway from its left edge
            if (hallMe) place(hallMe, -6);
            setTimeout(function () {
                body.classList.remove('kitchen-panning');
                H.land(hallMe, 30, function () { busy = false; if (hallMe) hallMe.classList.remove('face-left'); });
            }, 900);
        };
        busy = true;
        H.setOff(function () { stop(me); busy = false; });
        walk(me, 94, function () { sfx('step', { size: 0.35 }); shut(); });
    }
    // its window: open to the real sky, and the moon's light through it by night (sky/moonlight.js)
    var light = Sky.moonlight && Sky.moonlight(kit, { glass: function () { return kit.querySelector('.kitchen-window'); },
                                                     inset: [8 / 160, 8 / 130, 8 / 160, 8 / 130], cut: true, slot: 'assets/living/kitchen-' });
    H.on(function (what, name) { if (name === 'kitchen' && light) light.fit(); });
    H.room('kitchen', { parent: 'hall', here: function () { return inside; }, busy: function () { return busy; }, enter: goIn, leave: goOut });
    if (door) door.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); H.go('kitchen'); });
    if (back) back.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); H.go('hall'); });
    if (location.hash === '#kitchen') setTimeout(function () { if (Sky.sides) Sky.sides.goNow('hall'); setTimeout(function () { openKitchen(true); }, 80); }, 120);

    /* ---------------- the fridge, and the pie in it ---------------- */
    var fridge = kit.querySelector('.kitchen-fridge'), pie = kit.querySelector('.kitchen-pie');
    function busyHands() { return body.classList.contains('inv-holding'); }
    // over to it first, then do it
    // side: 'left' / 'right' = stand beside it rather than in front (so they don't hide the thing they came to use)
    function reach(el, then, side) {
        if (busy || !inside || busyHands() || H.going) return;
        busy = true;
        var x = standAt(me, pctOf(el, kit)), at = H.leftPct(me);
        if (side) {
            var r = el.getBoundingClientRect(), kr = kit.getBoundingClientRect(), w = me.offsetWidth / (kr.width || window.innerWidth) * 100;
            x = side === 'left' ? (r.left - kr.left) / kr.width * 100 - w * 0.95 : (r.right - kr.left) / kr.width * 100 - w * 0.05;
        }
        var go = function () { H.drop(); busy = false; then(); };
        if (Math.abs(at - x) < 6) { go(); return; }
        H.setOff(function () { stop(me); busy = false; });                 // (off out instead, on the way over: that's fine)
        walk(me, Math.max(1, Math.min(90, x)), go);
    }
    function keyInPie() { return !!(pie && pie.querySelector('.reset-key')); }
    function fridgeOpen(on, quiet) {
        if (!fridge || fridge.classList.contains('open') === on) return;
        fridge.classList.toggle('open', on);
        if (!quiet) sfx(on ? 'fridge-open' : 'fridge-close', { or: on ? 'door' : 'tap', size: 0.5 });
        if (on && !quiet && keyInPie()) setTimeout(function () { say('There’s something stuck in the pie.', 2600); }, 700);
    }
    if (fridge) {
        fridge.querySelector('.kf-door').addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (fridge.classList.contains('open')) { fridgeOpen(false); return; }
            reach(fridge, function () { fridgeOpen(true); }, 'right');                  // (beside it, so the pie (and reset 3's key) can be seen)
        });
        fridge.querySelector('.kf-inside').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fridgeOpen(false); });
    }
    var PIE = { before: 'An apple pie. Someone’s already had a slice.', three: 'An apple pie. …Where did the slice go?', after: 'Apple pie. Again.' };
    if (pie) pie.addEventListener('click', function (e) {
        if (e.target.closest('.reset-key')) return;                       // (the key: sky/resets.js takes it)
        e.preventDefault(); e.stopPropagation();
        var n = S ? S.reset : 1;
        if (n === 8 && !S.ending && Sky.gnosis && Sky.gnosis.eat) { Sky.gnosis.eat(pie); return; }     // (reset 8: eat, and know. sky/gnosis.js)
        say(keyInPie() ? 'Something’s stuck in it. Something metal.' : n < 3 ? PIE.before : n === 3 ? PIE.three : PIE.after, 2600);
    });

    /* ---------------- the drawers ---------------- */
    // what the traveller says, looking in (the fourth changes from reset 3; the second has a hint while reset 3's key is still out there)
    function drawerLine(n) {
        var r = S ? S.reset : 1, keyOut = r === 3 && S.get('key') !== '1';
        if (n === 1) return 'Forks, knives, spoons. One of the spoons is bent.';
        if (n === 2) return keyOut ? 'The junk drawer. Rubber bands, dead batteries… and a note: “it’s in the fridge.”'
                                   : 'The junk drawer. Rubber bands, dead batteries, a menu for a place that closed years ago.';
        if (n === 3) return 'Tea towels, folded like someone cared.';
        return r < 3 ? 'Recipe cards in careful handwriting. “Apple pie” is underlined twice.' : 'Recipe cards. Every one of them is for apple pie.';
    }
    var drawers = Array.prototype.slice.call(kit.querySelectorAll('.kitchen-drawer'));
    function shutAll(quiet) {
        drawers.forEach(function (d) { d.classList.remove('open'); d.setAttribute('aria-expanded', 'false'); });
        if (fridge) fridgeOpen(false, quiet);
        hob(false, true); oven(false, true);
    }
    drawers.forEach(function (d) {
        d.setAttribute('aria-expanded', 'false');
        d.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (d.classList.contains('open')) { d.classList.remove('open'); d.setAttribute('aria-expanded', 'false'); sfx('drawer', { or: 'tap', size: 0.4 }); return; }
            reach(d, function () {
                d.classList.add('open'); d.setAttribute('aria-expanded', 'true');
                sfx('drawer', { or: 'tap', size: 0.6 });
                setTimeout(function () { say(drawerLine(+d.dataset.drawer), 3400); }, 350);
            });
        });
    });

    /* ---------------- the stove: the hob, and the oven ---------------- */
    var stove = kit.querySelector('.kitchen-stove');
    function hob(on, quiet) {
        if (!stove || stove.classList.contains('lit') === on) return;
        stove.classList.toggle('lit', on);
        if (!quiet) sfx(on ? 'burner' : 'tap', { size: 0.4 });
        if (on && !quiet) setTimeout(function () { say(hobLine(), 2600); }, 500);
    }
    function hobLine() {
        var r = S ? S.reset : 1;
        return r < 3 ? 'Click, click… whump. The burners catch.' : r === 3 ? 'The burners catch. For a moment it smells like apples.' : 'They light blue. Then, for a second, red.';
    }
    function oven(on, quiet) {
        if (!stove || stove.classList.contains('oven-open') === on) return;
        stove.classList.toggle('oven-open', on);
        if (!quiet) sfx(on ? 'oven-open' : 'oven-close', { or: on ? 'door-metal' : 'tap', size: 0.5 });
        if (on && !quiet) setTimeout(function () { say(ovenLine(), 2800); }, 600);
    }
    function ovenLine() {
        var r = S ? S.reset : 1;
        return r < 3 ? 'The oven. Warm, though nobody’s baking.' : r === 3 ? 'Warm in there. It smells of apple pie.' : 'It’s warm in there. Too warm. Nobody turned it on.';
    }
    if (stove) {
        stove.querySelector('.ks-hob').addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (stove.classList.contains('lit')) { hob(false); return; }
            reach(stove, function () { hob(true); }, 'left');
        });
        stove.querySelector('.ks-oven').addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (stove.classList.contains('oven-open')) { oven(false); return; }
            reach(stove, function () { oven(true); }, 'left');
        });
    }

    /* ---------------- the microwave: it runs, it hums, it dings. there's nothing in it ---------------- */
    var micro = kit.querySelector('.kitchen-microwave'), clock = micro && micro.querySelector('.km-clock');
    var RUN = 6, running = false;
    function idleClock() {                                               // (reset 4 on: the clock's wrong)
        if (!clock) return;
        clock.textContent = S && S.reset >= 4 ? '6:66' : '12:00';
        micro.classList.add('blink');
    }
    idleClock();
    function runMicro() {
        if (running || !micro) return;
        running = true;
        micro.classList.remove('blink');
        micro.classList.add('running');
        sfx('microwave', { size: 0.5 });
        // (reset 7, the loop: it counts the wrong way, up instead of down; and the first time, the reset's key is on the plate)
        var BACK = !!S && S.reset === 7, left = RUN;
        clock.textContent = '0:0' + (BACK ? 0 : left);
        var tick = setInterval(function () {
            left--;
            clock.textContent = '0:0' + (BACK ? RUN - Math.max(0, left) : Math.max(0, left));
            if (left > 0) return;
            clearInterval(tick);
            micro.classList.remove('running');
            sfx('ding', { size: 0.5 });
            clock.textContent = 'End';
            micro.classList.add('blink');
            if (BACK && S.get('key') !== '1') {
                var mr = micro.getBoundingClientRect();
                document.dispatchEvent(new CustomEvent('dav:drop-key', { detail: { by: 'microwave', host: kit, x: mr.left + mr.width * 0.42, y: mr.bottom - 4 } }));
            }
            if (inside) setTimeout(function () { say(microLine(), 2800); }, 400);
            setTimeout(function () { running = false; idleClock(); }, 3200);
        }, 1000);
    }
    function microLine() {
        var r = S ? S.reset : 1;
        if (r === 7) return 'Ding. It counted up, not down. …It keeps its own time.';
        return r < 3 ? 'Ding. There was nothing in it.' : r === 3 ? 'Ding. Nothing in it. …It’s warm anyway.' : 'Ding. Something in there is warm now.';
    }
    if (micro) micro.querySelector('.km-hit').addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        reach(micro, runMicro, 'right');
    });

    Sky.kitchen = { get inside() { return inside; }, open: function () { openKitchen(true); }, out: goOut, goIn: goIn,
                    fridge: function (on) { fridgeOpen(on !== false); } };
})();

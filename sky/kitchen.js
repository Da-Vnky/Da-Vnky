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

   THE BOWL: a fruit bowl on the worktop, and coiled round it a string of
   sausages (resets 1 and 2). From reset 3 on it's a serpent ("eat. and you
   will know": the serpent in Eden, the one who offered knowledge; in reset 3
   that's the pie in the fridge). The first time a visitor walks in each
   reset from 3 on, they see the sausages first, and then they turn. (There
   used to be an apple here, reset 3's death: that's Mel's pills now.)

   slots (assets/living/): kitchen-wall, kitchen-floor, kitchen-window, kitchen-counter,
          kitchen-drawer, kitchen-drawer-1 … -4, kitchen-fridge, kitchen-fridge-inside, kitchen-pie,
          fruit-bowl, serpent, sausages; assets/ui/place-kitchen (its tab);
          assets/characters/kitchen (+ kitchen-walking)
   sounds: hiss, drawer, fridge-open, fridge-close (stand-ins till then)
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    var body = document.body, hall = document.querySelector('.hallway'), kit = document.querySelector('.kitchen');
    if (!Sky || !hall || !kit || Sky.kitchen) return;
    var door = hall.querySelector('.hall-to-kitchen'), back = kit.querySelector('.kitchen-back');
    var hallMe = hall.querySelector('.character'), me = kit.querySelector('.kitchen-character');
    var serpent = kit.querySelector('.kitchen-serpent'), sausages = kit.querySelector('.kitchen-sausages');
    var ENTER = 78;                                        // where the traveller comes in (% across: the doorway's on the right, from here)
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }
    function say(t, ms) { if (Sky.inventory && Sky.inventory.say) Sky.inventory.say(t, ms || 2600); }

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

    /* ---------------- through the doorway, and back ---------------- */
    var busy = false, inside = false;
    function pctOf(el, host) { var r = el.getBoundingClientRect(), hr = host.getBoundingClientRect(); return (r.left + r.width / 2 - hr.left) / (hr.width || window.innerWidth) * 100; }
    function standAt(ch, x) { return x - (ch.offsetWidth / 2) / (ch.parentNode.clientWidth || window.innerWidth) * 100; }
    function walk(ch, x, done) { if (Sky.sides && Sky.sides.walk) Sky.sides.walk(ch, x, done); else { ch.style.left = x + '%'; if (done) setTimeout(done, 300); } }
    function place(ch, x, left) { if (Sky.sides && Sky.sides.place) Sky.sides.place(ch, x, left); else ch.style.left = x + '%'; }
    function sidesBusy() { return !!(Sky.sides && Sky.sides.busy); }
    function goIn() {
        if (busy || inside || !body.classList.contains('in-hall') || sidesBusy() || body.classList.contains('in-attic') || (Sky.porch && Sky.porch.outside)) return;
        busy = true;
        body.classList.add('side-walking');                                // (the arrows hide while they walk)
        // off the hallway's left edge; the kitchen slides in as they reach it
        if (hallMe) { walk(hallMe, -14); setTimeout(function () { openKitchen(false); }, 650); } else openKitchen(false);
    }
    // its tab, among the place tabs on the right: "you are here" while you're in here
    function tab() { return document.querySelector('.place-tab[data-place=kitchen]'); }
    function tabHere(on) {
        var t = tab();
        if (!t) return;
        t.classList.toggle('here', on);
        var nm = t.querySelector('.pt-name');
        if (nm) nm.textContent = 'the kitchen' + (on ? ' · you are here' : '');
        if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    }
    // the tab, clicked while on this page: straight here (from the hallway, walking; from anywhere else, the hallway first)
    window.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('.place-tab[data-place=kitchen]');
        if (!a) return;
        e.preventDefault(); e.stopPropagation();
        if (inside || busy) return;
        if (Sky.porch && Sky.porch.outside) Sky.porch.inNow();
        else if (!body.classList.contains('in-hall') && Sky.sides) {
            if (Sky.sides.inSide && Sky.sides.homeNow) Sky.sides.homeNow();
            if (Sky.sides.goNow) Sky.sides.goNow('hall');
        }
        // (once the traveller's settled in the hallway: they may still be walking in)
        var tries = 0;
        (function tryIn() {
            if (inside) return;
            if (body.classList.contains('in-hall') && !sidesBusy() && !busy) goIn();
            else if (tries++ < 30) setTimeout(tryIn, 150);
        })();
    }, true);
    function openKitchen(now) {
        inside = true;
        tabHere(true);
        if (now) body.classList.add('kitchen-now'); else body.classList.add('kitchen-panning');
        body.classList.add('in-kitchen');
        kit.setAttribute('aria-hidden', 'false');
        try { history.replaceState(null, '', '#kitchen'); } catch (e) {}
        if (Sky.fillAssets) Sky.fillAssets(kit);
        turnSerpent();
        if (now) { place(me, ENTER - 20); setTimeout(function () { body.classList.remove('kitchen-now'); busy = false; }, 60); return; }
        place(me, 96, true);
        setTimeout(function () {
            body.classList.remove('kitchen-panning', 'side-walking');
            walk(me, ENTER - 14, function () { busy = false; });
        }, 900);
    }
    function goOut(now) {
        if (!inside || (busy && !now)) return;
        var shut = function () {
            inside = false;
            tabHere(false);
            shutAll(true);
            if (now) body.classList.add('kitchen-now'); else body.classList.add('kitchen-panning');
            body.classList.remove('in-kitchen');
            kit.setAttribute('aria-hidden', 'true');
            try { history.replaceState(null, '', body.classList.contains('in-hall') ? '#hallway' : location.pathname + location.search); } catch (e) {}
            if (now) { if (hallMe) place(hallMe, 30); setTimeout(function () { body.classList.remove('kitchen-panning', 'kitchen-now'); busy = false; }, 60); return; }
            // back into the hallway from its left edge
            if (hallMe) place(hallMe, -6);
            body.classList.add('side-walking');
            setTimeout(function () {
                body.classList.remove('kitchen-panning');
                var done = function () { busy = false; body.classList.remove('side-walking'); if (hallMe) hallMe.classList.remove('face-left'); };
                if (hallMe) walk(hallMe, 30, done); else done();
            }, 900);
        };
        if (now) { shut(); return; }
        busy = true;
        walk(me, 94, function () { sfx('step', { size: 0.35 }); shut(); });
    }
    if (door) door.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); goIn(); });
    if (back) back.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); goOut(false); });
    document.addEventListener('keydown', function (e) {                   // (Escape in here: back to the hallway, not all the way home)
        if (e.key !== 'Escape' || !inside || body.classList.contains('inv-holding')) return;
        e.stopImmediatePropagation();
        goOut(false);
    }, true);
    (function hookSides(n) {                                                // (off out of the hallway some other way: shut behind them)
        if (Sky.sides && Sky.sides.on) Sky.sides.on(function (what, name) { if (name === 'hall' && what === 'leave' && inside) goOut(true); });
        else if (n < 40) setTimeout(function () { hookSides(n + 1); }, 150);
    })(0);
    if (location.hash === '#kitchen') setTimeout(function () { if (Sky.sides && Sky.sides.goNow) Sky.sides.goNow('hall'); setTimeout(function () { openKitchen(true); }, 80); }, 120);

    /* ---------------- the fridge, and the pie in it ---------------- */
    var fridge = kit.querySelector('.kitchen-fridge'), pie = kit.querySelector('.kitchen-pie');
    function busyHands() { return body.classList.contains('inv-holding'); }
    // over to it first, then do it
    function reach(el, then) {
        if (busy || !inside || busyHands()) return;
        busy = true;
        var x = standAt(me, pctOf(el, kit)), at = Sky.sides && Sky.sides.leftPct ? Sky.sides.leftPct(me) : x;
        var go = function () { busy = false; then(); };
        if (Math.abs(at - x) < 6) go(); else walk(me, Math.max(1, Math.min(90, x)), go);
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
            reach(fridge, function () { fridgeOpen(true); });
        });
        fridge.querySelector('.kf-inside').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fridgeOpen(false); });
    }
    var PIE = { before: 'An apple pie. Someone’s already had a slice.', three: 'An apple pie. …Where did the slice go?', after: 'Apple pie. Again.' };
    if (pie) pie.addEventListener('click', function (e) {
        if (e.target.closest('.reset-key')) return;                       // (the key: sky/resets.js takes it)
        e.preventDefault(); e.stopPropagation();
        var n = S ? S.reset : 1;
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

    Sky.kitchen = { get inside() { return inside; }, open: function () { openKitchen(true); }, out: goOut, goIn: goIn,
                    fridge: function (on) { fridgeOpen(on !== false); } };
})();

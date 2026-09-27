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

    Sky.css(
        // the arrow on the hallway's left: this way to the kitchen (flipped: the arrow's drawn pointing right)
        '.hallway .room-arrow.hall-to-kitchen > svg, .hallway .room-arrow.hall-to-kitchen > .art { transform: scaleX(-1); }' +
        '.hallway .room-arrow.hall-to-kitchen:hover, .hallway .room-arrow.hall-to-kitchen:focus-visible { transform: translateX(-4px); }' +
        '.room-arrow .ra-hint { position: absolute; top: 50%; transform: translateY(-50%); white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity .2s;' +
            'font: italic .95rem "IM Fell English", Georgia, serif; color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.9); }' +
        '.room-arrow .ra-hint { left: calc(100% + 8px); } .room-arrow.back-right .ra-hint { left: auto; right: calc(100% + 8px); }' +
        '.room-arrow:hover .ra-hint, .room-arrow:focus-visible .ra-hint { opacity: 1; }' +
        '.kitchen .kh-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap;' +
            'font: italic .95rem "IM Fell English", Georgia, serif; color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.9); opacity: 0; transition: opacity .2s; pointer-events: none; z-index: 6; }' +
        '.kitchen .kitchen-serpent:hover .kh-hint { opacity: 1; }' +
        '.kitchen .kitchen-serpent .kh-hint { color: #c8e0a0; }' +

        // the kitchen: over the hallway, sliding in from the left
        '.kitchen { position: fixed; inset: 0; z-index: 3; overflow: hidden; transform: translateX(-100%); visibility: hidden; --floor-h: 12vh; background: #b8a98a; }' +
        '.kitchen > .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }' +
        '.kitchen > .kitchen-wall { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; }' +
        '.kitchen:has(> .art) > .kitchen-wall { display: none; }' +
        'body.in-kitchen .kitchen, body.kitchen-panning .kitchen { visibility: visible; transition: transform .9s cubic-bezier(.55,0,.25,1), visibility 0s; }' +
        'body.in-kitchen .kitchen { transform: none; }' +
        'body.in-kitchen .hallway { translate: 100% 0; }' +
        'body.in-hall .hallway { transition: transform .9s cubic-bezier(.55,0,.25,1), translate .9s cubic-bezier(.55,0,.25,1), visibility 0s; }' +
        'body.kitchen-now .kitchen, body.kitchen-now .hallway { transition: none !important; }' +
        '.kitchen .furnish { position: absolute; z-index: 2; }' +
        '.kitchen .room-floor { position: absolute; left: 0; right: 0; bottom: 0; height: var(--floor-h); z-index: 1; pointer-events: none; }' +
        '.kitchen .room-floor .placeholder, .kitchen .room-floor > .art { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: fill; }' +
        '.kitchen .room-floor .placeholder { border-top: 6px solid #5a4a3a; background: repeating-conic-gradient(#e8e0cc 0 25%, #6a5a4a 0 50%) 0 0 / 64px 64px; box-shadow: inset 0 14px 20px rgba(0,0,0,.3); }' +
        '.kitchen .kitchen-window { left: 38%; top: 12%; width: 17%; min-width: 120px; }' +
        '.kitchen .kitchen-fridge { left: 3%; bottom: calc(var(--floor-h) - 1vh); height: 58vh; aspect-ratio: 120 / 300; z-index: 3; }' +
        '.kitchen .kitchen-fridge > .kf-inside, .kitchen .kitchen-fridge > .kf-door { position: absolute; inset: 0; }' +
        '.kitchen .kf-inside > svg, .kitchen .kf-inside > .art, .kitchen .kf-door > svg, .kitchen .kf-door > .art { display: block; width: 100%; height: 100%; object-fit: fill; }' +
        '.kitchen .kf-door { padding: 0; border: 0; background: none; cursor: pointer; z-index: 2; transform-origin: 0 50%; transition: transform .55s cubic-bezier(.5,0,.3,1), filter .25s; }' +
        '.kitchen .kf-door:hover, .kitchen .kf-door:focus-visible { outline: none; filter: drop-shadow(0 0 8px rgba(255,220,150,.55)); }' +
        '.kitchen .kf-door:hover .kh-hint, .kitchen .kf-door:focus-visible .kh-hint { opacity: 1; }' +
        '.kitchen .kitchen-fridge.open .kf-door { transform: perspective(900px) rotateY(-78deg); }' +
        '.kitchen .kitchen-fridge.open .kf-door .kh-hint { display: none; }' +
        '.kitchen .kitchen-fridge:not(.open) .kf-inside, .kitchen .kitchen-fridge:not(.open) .kitchen-pie { visibility: hidden; }' +
        '.kitchen .kf-inside { cursor: pointer; }' +
        // the pie, on the bottom shelf (and in reset 3 the key, stuck in it: its ring out, the rest of it in the pie)
        '.kitchen .kitchen-pie { position: absolute; left: 16%; width: 68%; bottom: 21.6%; aspect-ratio: 100 / 44; z-index: 1; cursor: pointer; }' +
        '.kitchen .kitchen-pie > svg, .kitchen .kitchen-pie > .art { display: block; width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; }' +
        '.kitchen .kitchen-pie:hover .kh-hint { opacity: 1; }' +
        '.kitchen .kitchen-pie .reset-key { width: 34%; transform: translate(-50%, -50%) rotate(78deg); clip-path: inset(0 42% 0 0); }' +
        '.kitchen .kitchen-pie .reset-key::after { left: 12%; top: 18%; }' +
        '.kitchen .kitchen-counter { left: 22%; right: 12%; bottom: calc(var(--floor-h) - 1vh); height: 24vh; }' +
        '.kitchen .kc-body { position: absolute; inset: 0; }' +
        '.kitchen .kc-body > svg, .kitchen .kc-body > .art { display: block; width: 100%; height: 100%; object-fit: fill; }' +
        // the drawers, in the strip under the worktop. open: the front comes out towards you, and you see into it
        '.kitchen .kitchen-drawer { position: absolute; top: 10.2%; height: 25.4%; width: 22.6%; padding: 0; border: 0; background: none; cursor: pointer; z-index: 2; }' +
        '.kitchen .kitchen-drawer.d1 { left: 2.3%; } .kitchen .kitchen-drawer.d2 { left: 26.1%; } .kitchen .kitchen-drawer.d3 { left: 49.9%; } .kitchen .kitchen-drawer.d4 { left: 73.7%; }' +
        '.kitchen .kd-front { position: absolute; inset: 0; transition: transform .4s cubic-bezier(.4,0,.3,1); z-index: 2; }' +
        '.kitchen .kd-front > svg, .kitchen .kd-front > .art { display: block; width: 100%; height: 100%; object-fit: fill; }' +
        '.kitchen .kd-inside { position: absolute; left: -3%; right: -3%; top: -34%; height: 118%; z-index: 1; clip-path: inset(100% 0 0 0);' +
            'transition: clip-path .4s cubic-bezier(.4,0,.3,1); pointer-events: none; }' +
        '.kitchen .kd-inside > svg, .kitchen .kd-inside > .art { display: block; width: 100%; height: 100%; object-fit: fill; }' +
        '.kitchen .kitchen-drawer.open { z-index: 5; }' +
        '.kitchen .kitchen-drawer.open .kd-front { transform: translateY(78%) scale(1.08); }' +
        '.kitchen .kitchen-drawer.open .kd-inside { clip-path: inset(0 0 0 0); }' +
        '.kitchen .kitchen-drawer:hover .kd-front, .kitchen .kitchen-drawer:focus-visible .kd-front { filter: drop-shadow(0 0 6px rgba(255,220,150,.6)); }' +
        '.kitchen .kitchen-drawer:focus-visible { outline: none; }' +
        '.kitchen .kitchen-drawer:hover .kh-hint { opacity: 1; } .kitchen .kitchen-drawer.open .kh-hint { display: none; }' +
        '.kitchen .kitchen-bowl { left: 44%; bottom: calc(var(--floor-h) - 1vh + 24vh * .93); width: 9vw; min-width: 80px; aspect-ratio: 120 / 60; z-index: 3; }' +
        '.kitchen .kitchen-bowl > svg, .kitchen .kitchen-bowl > .art { display: block; width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; }' +
        '.kitchen .kitchen-serpent { left: calc(44% - 2.2vw); bottom: calc(var(--floor-h) - 1vh + 24vh * .93 - 1.2vh); width: 13.5vw; min-width: 120px; aspect-ratio: 160 / 90; z-index: 4; display: none; }' +
        '.kitchen .kitchen-serpent > svg, .kitchen .kitchen-serpent > .art { display: block; width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; }' +
        '.kitchen .kitchen-serpent .ks-eye { animation: ks-glint 5s ease-in-out infinite; }' +
        '@keyframes ks-glint { 0%, 86%, 100% { fill: #f0d040; } 90% { fill: #fff8c0; } }' +
        // before reset 3: sausages where the serpent will be
        '.kitchen .kitchen-sausages { left: calc(44% - 2.2vw); bottom: calc(var(--floor-h) - 1vh + 24vh * .93 - 1.2vh); width: 13.5vw; min-width: 120px; aspect-ratio: 160 / 90; z-index: 4; display: none; }' +
        '.kitchen .kitchen-sausages > svg, .kitchen .kitchen-sausages > .art { display: block; width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; }' +
        '.kitchen .kitchen-sausages:hover .kh-hint { opacity: 1; }' +
        '.kitchen.bowl-serpent .kitchen-serpent, .kitchen.bowl-sausages .kitchen-sausages, .kitchen.bowl-turning .kitchen-sausages, .kitchen.bowl-turning .kitchen-serpent { display: block; }' +
        // (reset 3 on, the first time in: the sausages writhe, and they're a serpent)
        '.kitchen.bowl-turning .kitchen-serpent { opacity: 0; }' +
        '.kitchen.bowl-turning.turn .kitchen-sausages { animation: ks-writhe 2.6s ease-in forwards; }' +
        '.kitchen.bowl-turning.turn .kitchen-serpent { animation: ks-become 2.6s ease-in forwards; }' +
        '@keyframes ks-writhe { 0% { transform: none; filter: none; } 20% { transform: skewX(4deg); } 40% { transform: skewX(-5deg) scaleY(1.05); filter: hue-rotate(60deg); } 70% { transform: skewX(3deg); opacity: .6; filter: hue-rotate(90deg) saturate(.6); } 100% { opacity: 0; filter: hue-rotate(100deg); } }' +
        '@keyframes ks-become { 0%, 35% { opacity: 0; transform: skewX(-4deg); } 70% { opacity: .8; transform: skewX(3deg); } 100% { opacity: 1; transform: none; } }' +
        '.kitchen .kitchen-back { position: absolute; right: 14px; top: 74%; margin-top: -27px; border: 0; cursor: pointer; }' +
        '.kitchen .kitchen-character { left: ' + ENTER + '%; bottom: 3vh; height: 25vh; z-index: 5; }' +
        '@media (max-width: 620px) { .kitchen .kitchen-character { height: 14vh; } .kitchen .kitchen-counter { left: 26%; right: 4%; height: 18vh; }' +
            '.kitchen .kitchen-bowl { bottom: calc(var(--floor-h) - 1vh + 18vh * .93); }' +
            '.kitchen .kitchen-serpent, .kitchen .kitchen-sausages { bottom: calc(var(--floor-h) - 1vh + 18vh * .93 - 1vh); }' +
            '.kitchen .kitchen-bowl { left: 40%; width: 20vw; } .kitchen .kitchen-serpent, .kitchen .kitchen-sausages { left: calc(40% - 5vw); width: 30vw; }' +
            '.kitchen .kitchen-fridge { height: 40vh; } }' +
        '@media (prefers-reduced-motion: reduce) { .kitchen.bowl-turning.turn .kitchen-sausages, .kitchen.bowl-turning.turn .kitchen-serpent { animation-duration: .01s; } }'
    );

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

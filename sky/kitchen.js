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

   THE APPLE (reset 3, ingestion: DEATHS.apple in sky/state.js): a red apple by
   the fruit bowl, and a serpent coiled round the bowl ("eat. and you will know":
   the serpent in Eden, the one who offered knowledge). Click the apple: the
   traveller wants it, takes it, bites… it's sweet, and then it isn't. A death
   like any other (sky/gore.js respawn), and there's always another apple, just
   as red, for the rest of reset 3. From reset 2 on, not before the key
   (sky/lives.js refuse). Before reset 3, where the serpent will be, there's
   a string of sausages coiled round the bowl. After it, the fruit spills out
   of a cornucopia instead (the Mandela effect: it was never there, was it?).

   slots (assets/living/): kitchen-wall, kitchen-floor, kitchen-window, kitchen-counter,
          kitchen-drawer, kitchen-drawer-1 … -4, kitchen-fridge, kitchen-fridge-inside, kitchen-pie,
          fruit-bowl, apple, serpent, sausages, cornucopia; assets/ui/place-kitchen (its tab);
          assets/characters/kitchen (+ kitchen-walking)
   sounds: bite, hiss, choke, drawer, fridge-open, fridge-close (stand-ins till then)
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    var body = document.body, hall = document.querySelector('.hallway'), kit = document.querySelector('.kitchen');
    if (!Sky || !hall || !kit || Sky.kitchen) return;
    var door = hall.querySelector('.hall-to-kitchen'), back = kit.querySelector('.kitchen-back');
    var hallMe = hall.querySelector('.character'), me = kit.querySelector('.kitchen-character');
    var apple = kit.querySelector('.kitchen-apple'), serpent = kit.querySelector('.kitchen-serpent');
    var ENTER = 78;                                        // where the traveller comes in (% across: the doorway's on the right, from here)
    // what the traveller says, reaching for it (one of these each time)
    var WANT = ['It’s so red. I’m not even hungry… so why do I want it this badly?', 'Just one bite. What could one bite hurt?',
                'It’s the reddest thing I’ve ever seen.', 'I shouldn’t. I know I shouldn’t.'];
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
        '.kitchen .kitchen-apple:hover .kh-hint, .kitchen .kitchen-serpent:hover .kh-hint { opacity: 1; }' +
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
        '.kitchen .kitchen-apple { left: calc(44% + 9vw + 1vw); bottom: calc(var(--floor-h) - 1vh + 24vh * .93); width: 2.6vw; min-width: 26px; aspect-ratio: 40 / 44; z-index: 4; display: none;' +
            'padding: 0; border: 0; background: none; cursor: pointer; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }' +
        '.kitchen .kitchen-apple > svg, .kitchen .kitchen-apple > .art { display: block; width: 100%; height: 100%; object-fit: contain; }' +
        '.kitchen .kitchen-apple:hover, .kitchen .kitchen-apple:focus-visible { outline: none; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)) drop-shadow(0 0 8px rgba(255,60,60,.7)); }' +
        '.kitchen .kitchen-apple.gone { visibility: hidden; }' +
        '.kitchen .kitchen-apple.again { animation: ka-again 1.2s ease-out; } @keyframes ka-again { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: none; } }' +
        // before reset 3: sausages where the serpent will be; after it: a cornucopia instead of the bowl
        '.kitchen .kitchen-sausages { left: calc(44% - 2.2vw); bottom: calc(var(--floor-h) - 1vh + 24vh * .93 - 1.2vh); width: 13.5vw; min-width: 120px; aspect-ratio: 160 / 90; z-index: 4; display: none; }' +
        '.kitchen .kitchen-cornucopia { left: calc(44% - 4vw); bottom: calc(var(--floor-h) - 1vh + 24vh * .93 - .4vh); width: 17vw; min-width: 150px; aspect-ratio: 200 / 110; z-index: 3; display: none; }' +
        '.kitchen .kitchen-sausages > svg, .kitchen .kitchen-sausages > .art, .kitchen .kitchen-cornucopia > svg, .kitchen .kitchen-cornucopia > .art { display: block; width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; }' +
        '.kitchen .kitchen-sausages:hover .kh-hint, .kitchen .kitchen-cornucopia:hover .kh-hint { opacity: 1; }' +
        '.kitchen.apple-live .kitchen-serpent, .kitchen.apple-live .kitchen-apple, .kitchen.apple-before .kitchen-sausages, .kitchen.apple-gone .kitchen-cornucopia { display: block; }' +
        '.kitchen.apple-gone .kitchen-bowl { display: none; }' +
        '.kitchen .kitchen-back { position: absolute; right: 14px; top: 74%; margin-top: -27px; border: 0; cursor: pointer; }' +
        '.kitchen .kitchen-character { left: ' + ENTER + '%; bottom: 3vh; height: 25vh; z-index: 5; }' +
        // the apple, in their hand; the sweetness turning
        '.kt-bite { position: fixed; z-index: 6; pointer-events: none; }' +
        '.kt-bite > svg, .kt-bite > img { display: block; width: 100%; height: auto; }' +
        '.kt-poison { position: fixed; inset: 0; z-index: 7; pointer-events: none; opacity: 0; transition: opacity 2.4s;' +
            'background: radial-gradient(ellipse at 50% 60%, rgba(40,90,30,0), rgba(20,60,15,.55) 60%, rgba(5,20,5,.92)); }' +
        '.kt-poison.on { opacity: 1; }' +
        '.kt-poison.black { transition: opacity 1.2s; background: #000; }' +
        '.character.kt-sway { animation: kt-sway 1.6s ease-in-out infinite; transform-origin: 50% 100%; }' +
        '@keyframes kt-sway { 0%, 100% { rotate: -2deg; } 50% { rotate: 5deg; } }' +
        '@media (max-width: 620px) { .kitchen .kitchen-character { height: 14vh; } .kitchen .kitchen-counter { left: 26%; right: 4%; height: 18vh; }' +
            '.kitchen .kitchen-bowl, .kitchen .kitchen-apple, .kitchen .kitchen-cornucopia { bottom: calc(var(--floor-h) - 1vh + 18vh * .93); }' +
            '.kitchen .kitchen-serpent, .kitchen .kitchen-sausages { bottom: calc(var(--floor-h) - 1vh + 18vh * .93 - 1vh); }' +
            '.kitchen .kitchen-bowl { left: 40%; width: 20vw; } .kitchen .kitchen-serpent, .kitchen .kitchen-sausages { left: calc(40% - 5vw); width: 30vw; } .kitchen .kitchen-apple { left: calc(40% + 22vw); width: 6vw; }' +
            '.kitchen .kitchen-cornucopia { left: calc(40% - 8vw); width: 38vw; }' +
            '.kitchen .kitchen-fridge { height: 40vh; } }' +
        '@media (prefers-reduced-motion: reduce) { .character.kt-sway { animation: none; } }'
    );

    // what's on the counter this reset
    function stateOf() { return !S ? 'before' : S.live('apple') ? 'live' : S.patched('apple') ? 'gone' : 'before'; }
    kit.classList.add('apple-' + stateOf());

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

    /* ---------------- the apple ---------------- */
    function speak(line, then) {
        var sp = Sky.claubes && Sky.claubes.speak;
        if (sp) sp(line, null, { hold: 900, typed: function () { setTimeout(then, 500); } });
        else { say(line, 2400); setTimeout(then, 1400); }
    }
    function eat() {
        if (busy || !inside || stateOf() !== 'live' || body.classList.contains('inv-holding')) return;
        if (Sky.lives && Sky.lives.refuse('apple')) return;                  // (from reset 2, not before the key: sky/lives.js)
        busy = true;
        speak(WANT[Math.floor(Math.random() * WANT.length)], function () {
            walk(me, standAt(me, pctOf(apple, kit)) - 5, function () {
                me.classList.remove('face-left');
                bite();
            });
        });
    }
    function bite() {
        // the apple, up to their mouth
        var a = apple.getBoundingClientRect(), r = me.getBoundingClientRect();
        var held = document.createElement('div');
        held.className = 'kt-bite';
        held.style.width = a.width + 'px'; held.style.left = a.left + 'px'; held.style.top = a.top + 'px';
        var art = apple.querySelector('img.art');
        held.innerHTML = art ? '<img alt="" src="' + art.src + '">' : apple.querySelector('svg').outerHTML;
        body.appendChild(held);
        apple.classList.add('gone');
        var tx = r.left + r.width * 0.62 - a.left, ty = r.top + r.height * 0.22 - a.top;
        held.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(' + tx + 'px,' + ty + 'px) rotate(-20deg)' }], { duration: 650, easing: 'ease-out', fill: 'forwards' });
        setTimeout(function () { sfx('bite', { or: 'crack', size: 0.25 }); }, 750);
        setTimeout(function () { sfx('bite', { or: 'crack', size: 0.2 }); }, 1250);
        setTimeout(function () { say('…it’s sweet.', 1800); sfx('hiss', { or: 'fizz', size: 0.4 }); }, 1600);
        // and then it isn't
        var green = document.createElement('div');
        green.className = 'kt-poison';
        body.appendChild(green);
        setTimeout(function () {
            held.animate([{ opacity: 1 }, { opacity: 0, transform: 'translate(' + tx + 'px,' + (ty + 120) + 'px) rotate(80deg)' }], { duration: 700, easing: 'ease-in', fill: 'forwards' });
            green.classList.add('on');
            me.classList.add('kt-sway');
            sfx('choke', { or: 'unnerve' });
        }, 2800);
        setTimeout(function () {
            me.classList.remove('kt-sway');
            if (Sky.gore && Sky.gore.lieDown) Sky.gore.lieDown(me);
            sfx('land', { size: 0.9 });
            green.classList.add('black');
        }, 5600);
        setTimeout(function () {
            held.remove();
            green.style.opacity = '0';
            if (Sky.gore && Sky.gore.respawn) {                             // (a death like any other: sky/lives.js counts it)
                Sky.gore.respawn(me);
                setTimeout(function () { if (Sky.gore.getUp) Sky.gore.getUp(me, function () { busy = false; }); else busy = false; }, 1300);
            } else { document.dispatchEvent(new CustomEvent('dav:traveller-died')); busy = false; }
            // there's always another, just as red
            setTimeout(function () { apple.classList.remove('gone'); apple.classList.remove('again'); void apple.offsetWidth; apple.classList.add('again'); }, 2200);
            setTimeout(function () { green.remove(); }, 2600);
        }, 7400);
    }
    if (apple) apple.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); eat(); });

    Sky.kitchen = { get inside() { return inside; }, open: function () { openKitchen(true); }, out: goOut, eat: eat, goIn: goIn,
                    fridge: function (on) { fridgeOpen(on !== false); } };
})();

/* =====================================================================
   kitchen.js — the kitchen, through the doorway on the left of the hallway
   (living.html). The traveller walks through, the kitchen slides in from the
   left; the arrow on the right (or Escape) goes back to the hallway.
   living.html#kitchen starts in there.

   THE APPLE (reset 3, ingestion: DEATHS.apple in sky/state.js): a red apple by
   the fruit bowl, and a serpent coiled round the bowl ("eat. and you will know":
   the serpent in Eden, the one who offered knowledge). Click the apple: the
   traveller wants it, takes it, bites… it's sweet, and then it isn't. A death
   like any other (sky/gore.js respawn), and there's always another apple, just
   as red, for the rest of reset 3. From reset 2 on, not before the key
   (sky/lives.js refuse). Before reset 3 it's just a bowl of fruit; after it,
   only the core's left, and the serpent's shed skin.

   slots (assets/living/): hall-kitchen-door, kitchen-wall, kitchen-floor, kitchen-window,
          kitchen-counter, kitchen-fridge, fruit-bowl, apple, serpent, apple-core, serpent-skin;
          assets/characters/kitchen (+ kitchen-walking)
   sounds: bite, hiss, choke (stand-ins till then)
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    var body = document.body, hall = document.querySelector('.hallway'), kit = document.querySelector('.kitchen');
    if (!Sky || !hall || !kit || Sky.kitchen) return;
    var door = hall.querySelector('.hall-kitchen'), back = kit.querySelector('.kitchen-back');
    var hallMe = hall.querySelector('.character'), me = kit.querySelector('.kitchen-character');
    var apple = kit.querySelector('.kitchen-apple'), serpent = kit.querySelector('.kitchen-serpent');
    var ENTER = 78;                                        // where the traveller comes in (% across: the doorway's on the right, from here)
    // what the traveller says, reaching for it (one of these each time)
    var WANT = ['It’s so red. I’m not even hungry… so why do I want it this badly?', 'Just one bite. What could one bite hurt?',
                'It’s the reddest thing I’ve ever seen.', 'I shouldn’t. I know I shouldn’t.'];
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }
    function say(t, ms) { if (Sky.inventory && Sky.inventory.say) Sky.inventory.say(t, ms || 2600); }

    Sky.css(
        // the doorway, in the hallway
        '.hallway .hall-kitchen { z-index: 1; }' +
        '.hallway .hall-kitchen > svg, .hallway .hall-kitchen > .art { display: block; width: 100%; height: 100%; object-fit: fill; }' +
        '.hallway .hall-kitchen:hover, .hallway .hall-kitchen:focus-visible { outline: none; filter: drop-shadow(0 0 6px rgba(255,220,150,.55)); }' +
        '.hallway .hall-kitchen .door-hint, .kitchen .kh-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap;' +
            'font: italic .95rem "IM Fell English", Georgia, serif; color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.9); opacity: 0; transition: opacity .2s; pointer-events: none; }' +
        '.hallway .hall-kitchen:hover .door-hint, .hallway .hall-kitchen:focus-visible .door-hint, .kitchen .kitchen-apple:hover .kh-hint, .kitchen .kitchen-serpent:hover .kh-hint { opacity: 1; }' +
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
        '.kitchen .kitchen-fridge { left: 3%; bottom: calc(var(--floor-h) - 1vh); height: 58vh; aspect-ratio: 120 / 300; }' +
        '.kitchen .kitchen-counter { left: 22%; right: 12%; bottom: calc(var(--floor-h) - 1vh); height: 24vh; }' +
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
        '.kitchen .kitchen-core { left: calc(44% + 9vw + 1vw); bottom: calc(var(--floor-h) - 1vh + 24vh * .93); width: 2vw; min-width: 20px; z-index: 4; display: none; pointer-events: none; }' +
        '.kitchen .kitchen-skin { left: calc(44% - 3vw); bottom: calc(var(--floor-h) - 1vh + 24vh * .93 - .6vh); width: 12vw; min-width: 110px; z-index: 2; display: none; pointer-events: none; }' +
        '.kitchen.apple-live .kitchen-serpent, .kitchen.apple-live .kitchen-apple { display: block; }' +
        '.kitchen.apple-gone .kitchen-core, .kitchen.apple-gone .kitchen-skin { display: block; }' +
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
            '.kitchen .kitchen-bowl, .kitchen .kitchen-apple, .kitchen .kitchen-core { bottom: calc(var(--floor-h) - 1vh + 18vh * .93); }' +
            '.kitchen .kitchen-serpent { bottom: calc(var(--floor-h) - 1vh + 18vh * .93 - 1vh); } .kitchen .kitchen-skin { bottom: calc(var(--floor-h) - 1vh + 18vh * .93); }' +
            '.kitchen .kitchen-bowl { left: 40%; width: 20vw; } .kitchen .kitchen-serpent { left: calc(40% - 5vw); width: 30vw; } .kitchen .kitchen-apple, .kitchen .kitchen-core { left: calc(40% + 22vw); width: 6vw; }' +
            '.kitchen .kitchen-fridge { height: 40vh; } .hallway .hall-kitchen { height: 34vh; } }' +
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
        if (busy || inside || !body.classList.contains('in-hall') || sidesBusy() || body.classList.contains('in-attic')) return;
        busy = true;
        var go = function () { sfx('step', { size: 0.35 }); openKitchen(false); };
        if (hallMe) walk(hallMe, standAt(hallMe, pctOf(door, hall)), go); else go();
    }
    function openKitchen(now) {
        inside = true;
        if (now) body.classList.add('kitchen-now'); else body.classList.add('kitchen-panning');
        body.classList.add('in-kitchen');
        kit.setAttribute('aria-hidden', 'false');
        try { history.replaceState(null, '', '#kitchen'); } catch (e) {}
        if (Sky.fillAssets) Sky.fillAssets(kit);
        if (now) { place(me, ENTER - 20); setTimeout(function () { body.classList.remove('kitchen-now'); busy = false; }, 60); return; }
        place(me, 96, true);
        setTimeout(function () {
            body.classList.remove('kitchen-panning');
            walk(me, ENTER - 14, function () { busy = false; });
        }, 900);
    }
    function goOut(now) {
        if (!inside || (busy && !now)) return;
        var shut = function () {
            inside = false;
            if (now) body.classList.add('kitchen-now'); else body.classList.add('kitchen-panning');
            body.classList.remove('in-kitchen');
            kit.setAttribute('aria-hidden', 'true');
            try { history.replaceState(null, '', body.classList.contains('in-hall') ? '#hallway' : location.pathname + location.search); } catch (e) {}
            if (hallMe) place(hallMe, standAt(hallMe, pctOf(door, hall)) + 4);
            setTimeout(function () { body.classList.remove('kitchen-panning', 'kitchen-now'); busy = false; }, now ? 60 : 950);
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

    Sky.kitchen = { get inside() { return inside; }, open: function () { openKitchen(true); }, out: goOut, eat: eat };
})();

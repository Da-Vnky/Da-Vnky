/* =====================================================================
   beerush.js — "I'm just here for the bee" (12 Oct). For a while only: the
   bee's popular, and people come just for it.

   In the front garden (living.html#front: skizy's bee links straight
   there), a paper tag in the sky's corner, for everyone: one click and the
   revolver's in their hand (out of the bag if it's there already, else a
   new one), ready to point at the bee (sky/bee.js does the rest). Used
   once, it's gone for good (12 Oct: it came back after the bee took the gun).

   Switching it off: ON = false below (or take this file and
   sky/css/beerush.css out of living.html).
   ===================================================================== */
(function () {
    var ON = true;
    if (!ON || !window.Sky || !Sky.inventory) return;
    var I = Sky.inventory, body = document.body;

    // shown to anyone in the front garden who isn't already holding a gun (12 Oct: kept simple, any reset), until they've
    // used it once: then never again, on any visit (localStorage bee-rush-taken; "forget your stay" clears it)
    function taken() { try { return localStorage.getItem('bee-rush-taken') === '1'; } catch (e) { return false; } }
    function free() { return !taken() && I.holding !== 'revolver' && I.holding !== 'white-revolver'; }

    var tag = document.createElement('button');
    tag.type = 'button';
    tag.className = 'bee-rush';
    tag.setAttribute('aria-label', 'I’m just here for the bee: take the revolver');
    tag.innerHTML = '<span class="br-gun" aria-hidden="true"></span><span class="br-words">I’m just here for the bee</span>';
    body.appendChild(tag);
    function dress() { var gun = tag.querySelector('.br-gun'); if (!gun.innerHTML) gun.innerHTML = I.art('revolver') || ''; }

    function check() {
        var on = free();
        body.classList.toggle('bee-rush-on', on);
        if (on) dress();
    }
    tag.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!free()) { check(); return; }
        try { localStorage.setItem('bee-rush-taken', '1'); } catch (e) {}
        var gun = I.has('white-revolver') ? 'white-revolver' : 'revolver';
        if (!I.has(gun)) I.add(gun, { quiet: true });
        I.hold(gun);
        if (Sky.sfx) Sky.sfx('reload', { or: 'pickup' });
        I.say('the revolver’s in your hand. the bee is right there.', 4200);
        tempt();
        tag.classList.add('taken');
        setTimeout(function () { tag.classList.remove('taken'); check(); }, 700);
    });
    check();
    setInterval(check, 1000);      // (put away, or taken by the bee)
    Sky.beeRush = { check: check };

    /* ---------------- a little voice (12 Oct) ----------------
       once the tag's given them the gun: a voice egging them on to shoot the bee. then each shot at it (sky/bee.js counts
       them the same way: the last 2 minutes) has it turn on them: a monster, three times; the fourth, the bee itself has
       something to say; the fifth, the bee takes the gun (bee.js, as it always has), and the voice goes quiet. a shot cuts
       off whatever's being said. typed out a letter at a time with the text box's sound ('blip'; the bee's: 'bee-blip') */
    var VOICE = 'a little voice';
    var TEMPT = [
        'go on.',
        'it’s just a bee.',
        'nobody’s watching. probably.',
        'everyone else did. go on.',
        'point it at the bee and click. one little shot.',
        '…what are you waiting for?'
    ];
    var AFTER = [
        ['Oh my god why would you have done that you monster??', 'it was just FLYING there.'],
        ['What did the bee ever do to you?', 'it makes honey. it pollinates. it has a little face.'],
        ['How can you even look in the mirror?', 'you were raised better than this. probably.', '…it’s looking at you now.']
    ];
    var RANT = [
        'What the fuck did you just fucking shoot at me, you little shit? I’ll have you know I graduated top of my class in the Hive Corps, and I’ve been involved in numerous secret raids on the wasp nests, and I have over 300 confirmed stings.',
        'I am trained in gorilla pollination and I’m the top stinger in the entire colony. You are nothing to me but just another flower. I will sting you the fuck out with precision the likes of which has never been seen before in this garden, mark my fucking words.',
        'You think you can get away with shooting at me over the Internet? Think again, fucker. As we speak I am contacting my secret network of drones across the meadow and your IP is being traced by the swarm right now, so you better prepare for the storm, maggot.',
        'The swarm that wipes out the pathetic little thing you call your life. You’re fucking dead, kid. I can be anywhere, anytime, and I can sting you in over seven hundred ways, and that’s just with my bare stinger.',
        'Not only am I extensively trained in unarmed buzzing, but I have access to the entire arsenal of the Royal Honey Guard and I will use it to its full extent to wipe your miserable ass off the face of the lawn, you little shit.',
        'If only you could have known what unholy retribution your little trigger finger was about to bring down upon you, maybe you would have held your fucking fire. But you couldn’t, you didn’t, and now you’re paying the price, you goddamn idiot.',
        'I will shit honey all over you and you will drown in it. You’re fucking dead, kiddo.'
    ];

    // one box at a time; a new one (or quiet()) stops the last at once, typing and all
    var box = null, typing = 0, next = 0;
    function quiet() {
        clearInterval(typing); clearTimeout(next); typing = next = 0;
        if (box) { var b = box; box = null; b.classList.remove('on'); setTimeout(function () { b.remove(); }, 300); }
    }
    function talk(lines, who, cls, blip) {
        quiet();
        var b = box = document.createElement('div'), i = 0;
        b.className = 'mc-say bee-rush-say' + (cls ? ' ' + cls : '');
        b.setAttribute('role', 'status');
        b.innerHTML = '<b></b><span></span>';
        b.querySelector('b').textContent = who;
        body.appendChild(b);
        requestAnimationFrame(function () { b.classList.add('on'); });
        var t = b.querySelector('span');
        (function line() {
            if (box !== b) return;
            if (i >= lines.length) { quiet(); return; }
            var text = lines[i++], n = 0;
            t.textContent = '';
            typing = setInterval(function () {
                if (box !== b) { clearInterval(typing); return; }
                t.textContent = text.slice(0, ++n);
                if (n % 2 === 0 && text.charAt(n - 1) !== ' ' && Sky.sfx) Sky.sfx(blip || 'blip', { size: 0.25, or: 'blip' });
                if (n >= text.length) { clearInterval(typing); typing = 0; next = setTimeout(line, 1400 + text.length * 28); }
            }, cls ? 26 : 38);
        })();
    }
    var tempted = false;
    function tempt() {
        try { sessionStorage.setItem('bee-rush-used', '1'); } catch (e) {}
        if (tempted) return;
        tempted = true;
        setTimeout(function () { if (I.holding === 'revolver' || I.holding === 'white-revolver') talk(TEMPT, VOICE); }, 1200);
    }
    function used() { try { return sessionStorage.getItem('bee-rush-used') === '1'; } catch (e) { return false; } }

    // every shot at the bee (sky/revolver.js calls Sky.bee.shot): counted as bee.js counts them
    var shots = [];
    if (Sky.bee && Sky.bee.shot) {
        var beeShot = Sky.bee.shot;
        Sky.bee.shot = function () {
            var armed = !!Sky.bee.gun;
            var r = beeShot.apply(this, arguments);
            if (!used() || armed) return r;
            var now = Date.now();
            shots = shots.filter(function (t) { return now - t < 120000; });
            shots.push(now);
            var n = shots.length;
            if (n <= 3) talk(AFTER[n - 1], VOICE);
            else if (n === 4) talk(RANT, 'the bee', 'bee-rant', 'bee-blip');
            else quiet();
            return r;
        };
    }
    Sky.beeRush.quiet = quiet;

})();

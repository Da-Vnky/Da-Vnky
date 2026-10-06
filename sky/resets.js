/* =====================================================================
   resets.js — the pieces of each reset that live on the pages (the plan for
   them is in sky/state.js: RESETS and DEATHS).

     the key       one per reset, hidden somewhere (RESETS[…].key). click it
                   and the lock comes off the hearts (sky/lives.js): from then
                   on, dying costs a life. its picture: the reset's own
                   assets/resets/reset-<n>/key, or assets/ui/key for all of them.
                   a key with "drop" isn't hidden: something drops it where it
                   happens (none does now: reset 3's is in the pie in the fridge)
     the roof      the jump off the roof, and the street far below (a cutscene): no longer a death of
                   its own (27 Sep: one death a reset). it's how reset 3's ends: back from Mel's room,
                   the traveller goes off the edge (melDeath), and the next reset starts on the porch
                   (assets/city/street-below)
     placeholders  the ways to die not designed yet (DEATHS with a "placeholder" in
                   sky/state.js): a dashed bubble with a skull on a page. click it and
                   the traveller dies (a stand-in death: zapped), so the reset can be
                   played to its end. from reset 2, not before the key (sky/lives.js)
   one death a reset: reset 1 the revolver (sky/revolver.js), reset 2 the boat (sky/ground-sea.js),
   reset 3 the pills (Mel's room, then the roof: below), reset 4 the false god's reflected bullet
   (sky/claubes.js, after the grimoire: sky/attic.js, sky/hell.js). the note on the dungeon floor is
   sky/dungeon.js.

   sounds: assets/sounds/key, fall-wind (a stand-in from the page until then)
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    if (!Sky || !S || Sky.resets) return;
    var body = document.body;
    var PAGE = (location.pathname.replace(/.*\//, '').replace(/\.html$/, '') || 'index').replace(/^index$/, 'sea');
    var sfx = Sky.sfx;
    function say(t, ms) { Sky.say(t, ms || 2400); }
    function busyHands() { return body.classList.contains('inv-holding'); }

    // (its look is in sky/css/resets.css, linked from each page's head)

    /* ---------------- the key ---------------- */
    var KEY = '<svg viewBox="0 0 60 24" aria-hidden="true"><circle cx="11" cy="12" r="8.5" fill="none" stroke="#c49a52" stroke-width="4.5"/>' +
        '<circle cx="11" cy="12" r="8.5" fill="none" stroke="#7a5a22" stroke-width="1" opacity=".6"/>' +
        '<path d="M19 10 H56 V14.5 H52 V20 H47 V14.5 H43 V19 H39 V14.5 H19 Z" fill="#c49a52" stroke="#7a5a22" stroke-width="1"/></svg>';
    function keyFound() { return S.get('key') === '1'; }
    function makeKey(host, fixed) {
        var el = document.createElement('div');
        el.className = 'reset-key' + (fixed ? ' fixed' : '');
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', 'a small key');
        el.innerHTML = KEY;
        host.appendChild(el);
        Sky.findAsset('assets/resets/reset-' + S.reset + '/key|assets/ui/key', function (u) { if (u) el.innerHTML = '<img alt="" src="' + u + '">'; });
        function take(e) {
            if (busyHands()) return;
            e.preventDefault(); e.stopPropagation();
            S.set('key', '1');
            sfx('key', { or: 'pickup' });
            document.dispatchEvent(new CustomEvent('dav:key-found'));
            // off to the lock on the hearts
            var r = el.getBoundingClientRect(), lk = document.querySelector('.lives.on .l-lock');
            el.classList.remove('fixed');
            el.style.position = 'fixed'; el.style.left = (r.left + r.width / 2) + 'px'; el.style.top = r.bottom + 'px';
            body.appendChild(el);
            requestAnimationFrame(function () {
                el.classList.add('taken');
                if (lk) { var lr = lk.getBoundingClientRect(); el.style.left = (lr.left + lr.width / 2) + 'px'; el.style.top = (lr.bottom) + 'px'; el.style.width = '16px'; }
            });
            setTimeout(function () { el.remove(); if (Sky.lives) Sky.lives.unlock(); }, 850);
            say(lk ? 'a small key. the lock falls away.' : 'a small key. it must open something.', 3000);
            // (5 Oct: and a nudge towards this reset's way out: RESETS[n].after, sky/state.js)
            var after = S.info && S.info.after;
            if (after) setTimeout(function () { Sky.speak(after, null, { hold: 2600 }); }, 1600);
        }
        el.addEventListener('click', take);
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') take(e); });
        return el;
    }
    function placeKey() {
        var k = S.info && S.info.key;
        if (!k || k.drop || k.page !== PAGE || keyFound()) return;
        var host = document.querySelector(k.in);
        if (!host) return;
        var el = makeKey(host, k.in === 'body');
        el.style.left = k.in === 'body' ? k.left + 'vw' : k.left + '%';
        el.style.top = k.in === 'body' ? k.top + 'vh' : k.top + '%';
    }
    // dropped: it falls from where it was (x, y: on the screen) to the floor there, with a little bounce.
    // host: a room to drop it in (5 Oct: the hallway's eye, the kitchen's microwave), so it goes with the room as it slides
    document.addEventListener('dav:drop-key', function (e) {
        var k = S.info && S.info.key, d = e.detail || {};
        if (!k || k.drop !== d.by || keyFound()) return;
        var el;
        if (d.host) {
            var hr = d.host.getBoundingClientRect();
            el = makeKey(d.host, false);
            el.style.left = (d.x - hr.left) + 'px'; el.style.top = (d.y - hr.top) + 'px';
        } else {
            el = makeKey(body, true);
            el.style.left = d.x + 'px'; el.style.top = d.y + 'px';
        }
        el.style.zIndex = d.z || 6;                                         // (below, in reset 4: over everything down there)
        el.animate([{ translate: '0 -60px', opacity: 0 }, { translate: '0 -60px', opacity: 1, offset: 0.1 }, { translate: '0 0', offset: 0.55 },
                    { translate: '0 -14px', offset: 0.72 }, { translate: '0 0', offset: 0.86 }, { translate: '0 -3px', offset: 0.93 }, { translate: '0 0', opacity: 1 }],
                   { duration: 900, easing: 'ease-in' });
        setTimeout(function () { sfx('key-drop', { or: 'tap' }); }, 480);
        say('something small fell with a clink.', 2600);
    });
    // (found before the hearts turned up: they turn up unlocked)
    if (keyFound() && Sky.lives && !Sky.lives.unlocked) Sky.lives.unlock();

    /* ---------------- the roof (the city) ---------------- */
    var STREET = '<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
        '<defs><linearGradient id="rf-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0d10"/><stop offset=".7" stop-color="#1c1e22"/><stop offset="1" stop-color="#2a2c30"/></linearGradient></defs>' +
        '<rect width="1000" height="1000" fill="url(#rf-g)"/>' +
        '<g fill="#15161a"><rect x="0" y="0" width="160" height="820"/><rect x="840" y="0" width="160" height="820"/></g>' +
        '<g fill="#e8c56a" opacity=".5">' + [80, 200, 320, 440, 560, 680].map(function (y) { return '<rect x="40" y="' + y + '" width="30" height="40"/><rect x="90" y="' + (y + 20) + '" width="30" height="40"/><rect x="880" y="' + (y + 40) + '" width="30" height="40"/><rect x="930" y="' + y + '" width="30" height="40"/>'; }).join('') + '</g>' +
        '<rect x="0" y="820" width="1000" height="40" fill="#5a5c60"/><rect x="0" y="860" width="1000" height="140" fill="#2e3034"/>' +
        '<path d="M100 930 H220 M340 930 H460 M580 930 H700 M820 930 H940" stroke="#c9b25a" stroke-width="8" opacity=".6"/></svg>';
    // off the edge of the roof: over to it, up onto the ledge and off, and the street far below comes up to meet them.
    // then(ch) when it's over (the screen's the street, and black after it)
    function jumpOff(ch, x, then) {
        Sky.stroll(ch, x - Sky.restX(ch), function () {
            var r = ch.getBoundingClientRect(), c = ch.cloneNode(true);
            c.classList.remove('talking', 'walking');
            c.removeAttribute('data-asset');
            c.style.cssText = 'position: fixed; z-index: 4; left: ' + r.left + 'px; top: ' + r.top + 'px; width: ' + r.width + 'px; height: ' + r.height + 'px; right: auto; bottom: auto; margin: 0; transform: none;';
            body.appendChild(c);
            ch.classList.add('gore-hidden');
            sfx('fall-wind', { or: 'throw' });
            c.animate([
                { transform: 'translate(0, 0)' },
                { transform: 'translate(0, -' + (r.height * 0.35) + 'px)', offset: 0.35 },
                { transform: 'translate(0, -' + (r.height * 0.3) + 'px)', offset: 0.55 },
                { transform: 'translate(' + (r.width * 0.2) + 'px, ' + (window.innerHeight * 0.4) + 'px) scale(1.8) rotate(12deg)' }
            ], { duration: 1500, easing: 'ease-in', fill: 'forwards' });
            setTimeout(function () { sfx('scream'); }, 700);
            setTimeout(function () { c.remove(); fall(ch, then); }, 1400);
        });
    }
    function fall(ch, then) {
        // the cutscene: the street, far below. they come down out of the sky and land on it
        body.classList.add('cutscene');
        var f = document.createElement('div');
        f.className = 'roof-fall';
        f.innerHTML = '<div class="rf-street">' + STREET + '</div><div class="rf-body"></div>';
        body.appendChild(f);
        Sky.findAsset('assets/city/street-below', function (u) { if (u) f.querySelector('.rf-street').innerHTML = '<img alt="" src="' + u + '">'; });
        var b = f.querySelector('.rf-body'), art = ch.querySelector(':scope > .art, :scope > .placeholder, :scope > img, :scope > svg');
        if (art) b.appendChild(art.cloneNode(true));
        var H = window.innerHeight, bh = Math.max(60, H * 0.13), ground = H * 0.88;
        b.style.height = bh + 'px';
        requestAnimationFrame(function () { f.classList.add('on'); });
        var anim = b.animate([
            { top: -bh + 'px', transform: 'translateX(-50%) rotate(0deg)' },
            { top: (ground - bh) + 'px', transform: 'translateX(-50%) rotate(200deg)' }
        ], { duration: 1100, easing: 'cubic-bezier(.5,0,1,1)', fill: 'forwards', delay: 450 });
        anim.onfinish = function () {
            Sky.gore.splat(b, window.innerWidth / 2, ground, null);
            setTimeout(function () {
                f.style.transition = 'opacity .8s';
                f.classList.remove('on');
                setTimeout(function () {
                    f.remove();
                    body.classList.remove('cutscene');
                    if (then) then(ch);
                }, 850);
            }, 2600);
        };
    }

    /* ---------------- déjà vu: the start of every reset after the first ----------------
       the first page they see in a new reset, the traveller says it (typed out, in the box at the bottom:
       Sky.speak, sky/sky.js). once a reset (run:deja-vu). one line per reset, 2 to 8: */
    var DEJA = {
        2: 'Huh. I could swear I\u2019ve been here before.',
        3: 'This again? Why does all of this feel so\u2026 familiar?',
        4: 'I\u2019ve been here before. More than once. I know I have.',
        // (5 Oct: 5 to 8 to match their themes: the veil, the watchers, the loop, the source)
        5: 'Every time I come back, a little more of it feels\u2026 painted on.',
        6: 'Same sea. Same sky. And now I can feel it looking back.',
        7: 'I remember this. I remember all of it. Round and round and round.',
        8: 'Oh. So that\u2019s what it was made of, all along.'
    };
    function dejaVu() {
        var line = DEJA[S.reset];
        if (!line || S.get('deja-vu') === '1' || S.ending) return;         // (and not after the end: there's no loop to remember)
        var tries = 0;
        (function when() {                                           // (after the loading screen, if there is one)
            if (document.getElementById('dav-loader')) { if (++tries < 120) setTimeout(when, 250); return; }
            setTimeout(function () {
                if (S.get('deja-vu') === '1') return;
                S.set('deja-vu', '1');
                Sky.speak(line);
            }, 1800);
        })();
    }

    /* ---------------- placeholder ways to die (the ones still to be designed) ---------------- */
    var SKULL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 C6.6 2.5 3.5 6.2 3.5 10.4 C3.5 13 4.7 14.9 6.4 16 L6.4 19 C6.4 20 7.1 20.6 8 20.6 L16 20.6 C16.9 20.6 17.6 20 17.6 19 L17.6 16 C19.3 14.9 20.5 13 20.5 10.4 C20.5 6.2 17.4 2.5 12 2.5 Z" fill="#3a2716"/>' +
        '<ellipse cx="8.6" cy="11" rx="2.3" ry="2.6" fill="#f3e6c2"/><ellipse cx="15.4" cy="11" rx="2.3" ry="2.6" fill="#f3e6c2"/><path d="M12 13.6 L10.8 16 H13.2 Z" fill="#f3e6c2"/>' +
        '<path d="M9.4 20.6 V18.4 M12 20.6 V18.4 M14.6 20.6 V18.4" stroke="#f3e6c2" stroke-width="1"/></svg>';
    function placeholders() {
        Object.keys(S.DEATHS).forEach(function (id) {
            var d = S.DEATHS[id], ph = d.placeholder;
            if (!ph || !S.live(id) || ph.page !== PAGE) return;
            var host = document.querySelector(ph.in || 'body') || body, fixed = host === body;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'death-bubble' + (fixed ? ' fixed' : '');
            b.style.left = ph.left + '%'; b.style.top = ph.top + '%';
            b.title = 'placeholder: ' + d.name;
            b.setAttribute('aria-label', 'a way to die, still to come');
            b.innerHTML = SKULL + '<span class="db-t">a way to die<br>(to come)</span>';
            host.appendChild(b);
            var busy = false;
            b.addEventListener('click', function (e) {
                e.preventDefault(); e.stopPropagation();
                if (busy || busyHands()) return;
                if (Sky.lives && Sky.lives.refuse('placeholder:' + id)) return;             // (each bubble its own way to die: once a reset)
                // the sea's traveller has a death of its own (the revolver's); anywhere else, a stand-in: zapped
                if (PAGE === 'sea') { if (Sky.sea && Sky.sea.kill && Sky.sea.kill()) pop(); return; }
                var ch = Array.prototype.filter.call(document.querySelectorAll('.scene-character:not(.gore-hidden)'), function (c) { return c.getClientRects().length && c.getBoundingClientRect().right > 0 && c.getBoundingClientRect().left < window.innerWidth; })[0];
                if (!ch || !Sky.gore || !Sky.gore.zap) return;
                busy = true;
                pop();
                Sky.gore.zap(ch, function () { Sky.gore.respawn(ch); busy = false; });
            });
            function pop() { b.classList.add('popping'); sfx('fizz', { size: 0.3 }); setTimeout(function () { b.classList.remove('popping'); }, 2600); }
        });
    }

    /* ---------------- back from Mel's room, after the pills (reset 3: schizophyllu.me.room/room/room.js) ----------------
       the room sends the visitor back here (sessionStorage "dav-mel-death"): it was too much. out of the black, the
       traveller walks to the edge of the roof and goes off it (jumpOff: the street far below). it's reset 3's death:
       their one heart goes, and the next reset starts on the porch of the house (localStorage "dav-wake-at", read by
       sky/forget.js) instead of by the sea */
    function melDeath() {
        var was = null;
        try { was = sessionStorage.getItem('dav-mel-death'); sessionStorage.removeItem('dav-mel-death'); } catch (e) {}
        if (!was || PAGE !== 'city') return;
        var ch = document.querySelector('.scene-character');
        var blk = document.createElement('div');
        blk.className = 'mel-black';                                     // (its look: sky/css/resets.css)
        body.appendChild(blk);
        var wake = function () { if (Sky.lives && Sky.lives.unlocked) { try { localStorage.setItem('dav-wake-at', 'living.html#porch'); } catch (e) {} } };   // (they come to on the porch)
        setTimeout(function () {
            blk.classList.add('lifting');
            setTimeout(function () {
                blk.classList.add('gone');
                if (!ch || !Sky.gore || !Sky.stroll) { wake(); if (ch && Sky.gore) Sky.gore.respawn(ch); else document.dispatchEvent(new CustomEvent('dav:traveller-died')); blk.remove(); return; }
                body.classList.add('cutscene');
                var x = window.innerWidth * (Sky.restX(ch) < window.innerWidth * 0.5 ? 0.58 : 0.42);
                jumpOff(ch, x, function () {
                    wake();
                    Sky.gore.respawn(ch);                                                           // (a death: sky/lives.js)
                    blk.remove();
                });
            }, 2600);
        }, 1800);
    }

    function start() { placeKey(); placeholders(); melDeath(); dejaVu(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

    Sky.resets = { get reset() { return S.reset; }, live: S.live, patched: S.patched };
})();

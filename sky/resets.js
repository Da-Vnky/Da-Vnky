/* =====================================================================
   resets.js — the pieces of each reset that live on the pages (the plan for
   them is in sky/state.js: RESETS and DEATHS).

     the key       one per reset, hidden somewhere (RESETS[…].key). click it
                   and the lock comes off the hearts (sky/lives.js): from then
                   on, dying costs a life. its picture: the reset's own
                   assets/resets/reset-<n>/key, or assets/ui/key for all of them.
                   a key with "drop" isn't hidden: something drops it where it
                   happens (none does now: reset 3's is in the pie in the fridge)
     the scissors  the workshop bench (reset 1): the traveller takes them to
                   their neck. after reset 1, safety scissors hang on the wall
                   instead (assets/workshop/scissors, assets/workshop/safety-scissors)
     the roof      reset 2: the edge of the roof can be jumped from (the street
                   below: assets/city/street-below). after it, guard rails along
                   the edge (assets/city/guard-rail, repeated sideways)
     placeholders  the ways to die not designed yet (DEATHS with a "placeholder" in
                   sky/state.js): a dashed bubble with a skull on a page. click it and
                   the traveller dies (a stand-in death: zapped), so the reset can be
                   played to its end. from reset 2, not before the key (sky/lives.js)
   (the toaster's in sky/tub.js, the boat in sky/ground-sea.js, the note on the
    dungeon floor in sky/dungeon.js, the revolver's jam in sky/revolver.js)

   sounds: assets/sounds/key, stab, fall-wind (a stand-in from the page until then)
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    if (!Sky || !S || Sky.resets) return;
    var body = document.body;
    var PAGE = (location.pathname.replace(/.*\//, '').replace(/\.html$/, '') || 'index').replace(/^index$/, 'sea');
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }
    function say(t, ms) { if (Sky.inventory && Sky.inventory.say) Sky.inventory.say(t, ms || 2400); }
    function busyHands() { return body.classList.contains('inv-holding'); }

    Sky.css(
        '.reset-key { position: absolute; z-index: 4; width: 26px; cursor: pointer; transform: translate(-50%, -100%) rotate(-24deg); filter: drop-shadow(0 2px 2px rgba(0,0,0,.45)); }' +
        '.reset-key.fixed { position: fixed; }' +
        '.reset-key > svg, .reset-key > .art, .reset-key > img { display: block; width: 100%; height: auto; }' +
        '.reset-key::after { content: ""; position: absolute; left: 20%; top: 10%; width: 5px; height: 5px; border-radius: 50%; background: #fff; box-shadow: 0 0 6px 2px #fff6c0;' +
            'opacity: 0; animation: key-glint 7s ease-in-out infinite; }' +
        '@keyframes key-glint { 0%, 92%, 100% { opacity: 0; transform: scale(.3); } 95% { opacity: 1; transform: scale(1.2); } }' +
        '.reset-key:hover { filter: drop-shadow(0 2px 2px rgba(0,0,0,.45)) drop-shadow(0 0 6px rgba(255,220,140,.9)); }' +
        '.reset-key.taken { transition: left .8s cubic-bezier(.5,0,.3,1), top .8s cubic-bezier(.5,-.6,.3,1), opacity .3s .6s, width .8s; opacity: 0; pointer-events: none; }' +
        // the scissors, on the bench and (later) on the wall
        '.scissors { z-index: 3; width: 3.4%; min-width: 30px; cursor: pointer; transform: rotate(-6deg); filter: drop-shadow(0 3px 3px rgba(0,0,0,.4)); }' +
        '.scissors > svg, .scissors > .art { display: block; width: 100%; height: auto; }' +
        '.scissors:hover { transform: rotate(-6deg) translateY(-2px); }' +
        '.scissors.taken { visibility: hidden; }' +
        '.scissors.safety { cursor: default; width: 2.4%; min-width: 22px; transform: rotate(84deg); pointer-events: none; }' +
        '.scissors .sc-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%) rotate(6deg); white-space: nowrap; font-style: italic; font-size: .9rem;' +
            'color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.7); opacity: 0; transition: opacity .2s; pointer-events: none; }' +
        '.scissors:hover .sc-hint { opacity: 1; }' +
        // a way to die, still to be designed: a dashed bubble with a skull
        '.death-bubble { position: absolute; z-index: 6; width: 86px; height: 86px; margin: -43px 0 0 -43px; padding: 0; border-radius: 50%; cursor: pointer;' +
            'border: 2px dashed rgba(154,59,31,.8); background: radial-gradient(circle at 38% 32%, rgba(255,250,235,.9), rgba(243,230,194,.72) 60%, rgba(220,190,150,.6));' +
            'box-shadow: 0 4px 14px rgba(0,0,0,.35); color: #3a2716; display: grid; place-items: center; align-content: center; gap: 1px; animation: db-bob 3.2s ease-in-out infinite; }' +
        '.death-bubble.fixed { position: fixed; }' +
        '.death-bubble svg { width: 30px; height: 30px; display: block; }' +
        '.death-bubble .db-t { font: italic .72rem/1.05 "IM Fell English", Georgia, serif; text-align: center; }' +
        '.death-bubble:hover, .death-bubble:focus-visible { outline: none; border-style: solid; box-shadow: 0 4px 16px rgba(0,0,0,.35), 0 0 0 4px rgba(154,59,31,.2); }' +
        '.death-bubble.popping { animation: db-pop .35s ease-in forwards; pointer-events: none; }' +
        '@keyframes db-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }' +
        '@keyframes db-pop { to { transform: scale(1.4); opacity: 0; } }' +
        'body.leaving .death-bubble, body.sky-view .death-bubble, body.peep-view .death-bubble, body.in-side .room .death-bubble { opacity: 0; pointer-events: none; }' +
        '@media (prefers-reduced-motion: reduce) { .death-bubble { animation: none; } }' +
        // the roof's edge, and the rails that come later
        '.roof-edge { position: fixed; z-index: 4; left: 26%; right: 4%; bottom: 0; height: calc(max(20vh, 130px) * .38); cursor: pointer; }' +
        '.roof-edge .re-hint { position: absolute; left: var(--hx, 50%); top: -8px; transform: translate(-50%, -100%); white-space: nowrap; font-style: italic; font-size: .95rem; color: #f3e6c2;' +
            'text-shadow: 0 1px 3px rgba(0,0,0,.8); opacity: 0; transition: opacity .2s; pointer-events: none; }' +
        '.roof-edge:hover .re-hint { opacity: 1; }' +
        '.guard-rail { position: fixed; z-index: 4; left: 0; right: 0; bottom: calc(max(20vh, 130px) * .36); height: calc(max(20vh, 130px) * .34); pointer-events: none; background-repeat: repeat-x; background-position: left bottom; background-size: auto 100%; }' +
        '.guard-rail > svg { width: 100%; height: 100%; display: block; }' +
        '.guard-rail.has-art > svg { display: none; }' +
        '.roof-fall { position: fixed; inset: 0; z-index: 5; background: #111; opacity: 0; transition: opacity .35s; overflow: hidden; }' +
        '.roof-fall.on { opacity: 1; }' +
        '.roof-fall .rf-street { position: absolute; inset: 0; }' +
        '.roof-fall .rf-street > svg, .roof-fall .rf-street > img { width: 100%; height: 100%; object-fit: cover; display: block; }' +
        '.roof-fall .rf-body { position: absolute; left: 50%; top: -30%; transform: translateX(-50%); }' +
        '.roof-fall .rf-body > * { display: block; height: 100%; width: auto; }' +
        'body.cutscene .place-tabs, body.cutscene .inv-bar, body.cutscene .lives, body.cutscene .cp-toggle { opacity: 0; pointer-events: none; }'
    );

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
    // dropped: it falls from where it was (x, y: on the screen) to the floor there, with a little bounce
    document.addEventListener('dav:drop-key', function (e) {
        var k = S.info && S.info.key, d = e.detail || {};
        if (!k || k.drop !== d.by || keyFound()) return;
        var el = makeKey(body, true);
        el.style.left = d.x + 'px'; el.style.top = d.y + 'px';
        el.style.zIndex = 6;
        el.animate([{ translate: '0 -60px', opacity: 0 }, { translate: '0 -60px', opacity: 1, offset: 0.1 }, { translate: '0 0', offset: 0.55 },
                    { translate: '0 -14px', offset: 0.72 }, { translate: '0 0', offset: 0.86 }, { translate: '0 -3px', offset: 0.93 }, { translate: '0 0', opacity: 1 }],
                   { duration: 900, easing: 'ease-in' });
        setTimeout(function () { sfx('key-drop', { or: 'tap' }); }, 480);
        say('something small fell with a clink.', 2600);
    });
    // (found before the hearts turned up: they turn up unlocked)
    if (keyFound() && Sky.lives && !Sky.lives.unlocked) Sky.lives.unlock();

    /* ---------------- the scissors (the workshop) ---------------- */
    var SCISSORS = '<svg viewBox="0 0 100 40" aria-hidden="true"><path d="M40 18 L98 8 L96 13 L44 22 Z" fill="#c9ccd2" stroke="#6e737b" stroke-width="1"/>' +
        '<path d="M40 22 L98 30 L95 34 L44 26 Z" fill="#b7bac1" stroke="#6e737b" stroke-width="1"/><circle cx="42" cy="20" r="2.4" fill="#6e737b"/>' +
        '<ellipse cx="22" cy="12" rx="14" ry="9" fill="none" stroke="#9a3b1f" stroke-width="5"/><ellipse cx="22" cy="30" rx="14" ry="9" fill="none" stroke="#9a3b1f" stroke-width="5"/></svg>';
    var SAFETY = '<svg viewBox="0 0 100 40" aria-hidden="true"><path d="M40 17 Q70 10 94 13 Q98 16 94 19 L44 22 Z" fill="#dfe2e6" stroke="#8a8f96" stroke-width="1"/>' +
        '<path d="M40 23 L94 27 Q98 30 94 33 Q70 36 44 27 Z" fill="#cfd2d8" stroke="#8a8f96" stroke-width="1"/><circle cx="42" cy="20" r="2.4" fill="#8a8f96"/>' +
        '<ellipse cx="22" cy="12" rx="14" ry="9" fill="none" stroke="#4f8fd0" stroke-width="6"/><ellipse cx="22" cy="30" rx="14" ry="9" fill="none" stroke="#4f8fd0" stroke-width="6"/></svg>';
    function setupScissors() {
        var sc = document.querySelector('.scissors');
        if (!sc) return;
        if (S.patched('scissors')) {                                   // after reset 1: safety scissors, hung up out of the way
            sc.classList.add('safety');
            sc.setAttribute('aria-hidden', 'true');
            sc.style.left = sc.dataset.wallLeft || '46.6%'; sc.style.top = sc.dataset.wallTop || '17%';
            sc.innerHTML = SAFETY;
            Sky.findAsset('assets/workshop/safety-scissors', function (u) { if (u) sc.innerHTML = '<img class="art" alt="" src="' + u + '">'; });
            return;
        }
        if (!sc.querySelector('svg, img')) sc.insertAdjacentHTML('afterbegin', SCISSORS);
        Sky.findAsset('assets/workshop/scissors', function (u) { if (u) { var o = sc.querySelector('svg, img'); if (o) o.remove(); sc.insertAdjacentHTML('afterbegin', '<img class="art" alt="" src="' + u + '">'); } });
        if (!S.live('scissors')) { sc.style.pointerEvents = 'none'; return; }
        sc.setAttribute('role', 'button'); sc.tabIndex = 0; sc.setAttribute('aria-label', 'a pair of scissors');
        sc.insertAdjacentHTML('beforeend', '<span class="sc-hint">scissors</span>');
        var busy = false;
        function use(e) {
            if (busy || busyHands()) return;
            if (Sky.lives && Sky.lives.refuse('scissors')) { e.preventDefault(); e.stopPropagation(); return; }
            var ch = document.querySelector('.scene-character:not(.gore-hidden)');
            if (!ch || !Sky.gore || !Sky.gore.stab) return;
            e.preventDefault(); e.stopPropagation();
            busy = true;
            var r = sc.getBoundingClientRect(), dx = r.left + r.width / 2 - Sky.restX(ch);
            Sky.stroll(ch, dx, function () {
                sc.classList.add('taken');
                sfx('pickup', { or: 'tap' });
                setTimeout(function () {
                    Sky.gore.stab(ch, function () {
                        sc.classList.remove('taken');
                        Sky.gore.respawn(ch);
                        busy = false;
                    });
                }, 350);
            });
        }
        sc.addEventListener('click', use);
        sc.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') use(e); });
    }

    /* ---------------- the roof (the city) ---------------- */
    var RAIL = '<svg viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><g fill="#4a4f57" stroke="#2a2d33" stroke-width="1">' +
        '<rect x="0" y="4" width="400" height="6"/><rect x="0" y="30" width="400" height="4"/>' +
        [10, 90, 170, 250, 330].map(function (x) { return '<rect x="' + x + '" y="4" width="7" height="56"/>'; }).join('') + '</g></svg>';
    var STREET = '<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
        '<defs><linearGradient id="rf-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0d10"/><stop offset=".7" stop-color="#1c1e22"/><stop offset="1" stop-color="#2a2c30"/></linearGradient></defs>' +
        '<rect width="1000" height="1000" fill="url(#rf-g)"/>' +
        '<g fill="#15161a"><rect x="0" y="0" width="160" height="820"/><rect x="840" y="0" width="160" height="820"/></g>' +
        '<g fill="#e8c56a" opacity=".5">' + [80, 200, 320, 440, 560, 680].map(function (y) { return '<rect x="40" y="' + y + '" width="30" height="40"/><rect x="90" y="' + (y + 20) + '" width="30" height="40"/><rect x="880" y="' + (y + 40) + '" width="30" height="40"/><rect x="930" y="' + y + '" width="30" height="40"/>'; }).join('') + '</g>' +
        '<rect x="0" y="820" width="1000" height="40" fill="#5a5c60"/><rect x="0" y="860" width="1000" height="140" fill="#2e3034"/>' +
        '<path d="M100 930 H220 M340 930 H460 M580 930 H700 M820 930 H940" stroke="#c9b25a" stroke-width="8" opacity=".6"/></svg>';
    function setupRoof() {
        if (PAGE !== 'city') return;
        if (S.patched('roof')) {
            var g = document.createElement('div');
            g.className = 'guard-rail';
            g.dataset.asset = 'assets/city/guard-rail';
            g.innerHTML = RAIL;
            body.appendChild(g);
            Sky.findAsset('assets/city/guard-rail', function (u) { if (u) { g.classList.add('has-art'); g.style.backgroundImage = 'url("' + new URL(u, location.href).href + '")'; } });
            return;
        }
        if (!S.live('roof')) return;
        var edge = document.createElement('div');
        edge.className = 'roof-edge';
        edge.setAttribute('role', 'button'); edge.tabIndex = 0; edge.setAttribute('aria-label', 'the edge of the roof');
        edge.innerHTML = '<span class="re-hint">the edge</span>';
        body.appendChild(edge);
        edge.addEventListener('pointermove', function (e) { var r = edge.getBoundingClientRect(); edge.style.setProperty('--hx', (e.clientX - r.left) + 'px'); });
        var busy = false;
        function jump(e) {
            if (busy || busyHands() || body.classList.contains('peep-view')) return;
            if (Sky.lives && Sky.lives.refuse('roof')) { e.preventDefault(); return; }
            var ch = document.querySelector('.scene-character:not(.gore-hidden)');
            if (!ch || !Sky.gore) return;
            e.preventDefault();
            busy = true;
            var x = e.clientX || (edge.getBoundingClientRect().left + edge.offsetWidth / 2);
            Sky.stroll(ch, x - Sky.restX(ch), function () {
                // up onto the ledge, and off
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
                setTimeout(function () { c.remove(); fall(x, ch); }, 1400);
            });
        }
        function fall(x, ch) {
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
                        Sky.gore.respawn(ch);
                        busy = false;
                    }, 850);
                }, 2600);
            };
        }
        edge.addEventListener('click', jump);
        edge.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') jump(e); });
    }

    /* ---------------- déjà vu: the start of every reset after the first ----------------
       the first page they see in a new reset, the traveller says it (typed out, in the box at the bottom:
       sky/claubes.js speak). once a reset (run:deja-vu). one line per reset, 2 to 8: */
    var DEJA = {
        2: 'Huh. I could swear I\u2019ve been here before.',
        3: 'This again? Why does all of this feel so\u2026 familiar?',
        4: 'I\u2019ve been here before. More than once. I know I have.',
        5: 'Same sea. Same sky. How many times have I done this now?',
        6: 'Every time I come back, a little more of it feels\u2026 painted on.',
        7: 'I remember this. I remember all of it. Round and round and round.',
        8: 'Again. It\u2019s always again.'
    };
    function dejaVu() {
        var line = DEJA[S.reset];
        if (!line || S.get('deja-vu') === '1') return;
        var tries = 0;
        (function when() {                                           // (after the loading screen, if there is one)
            if (document.getElementById('dav-loader') || !(Sky.claubes && Sky.claubes.speak)) { if (++tries < 80) setTimeout(when, 250); return; }
            setTimeout(function () {
                if (S.get('deja-vu') === '1') return;
                S.set('deja-vu', '1');
                Sky.claubes.speak(line);
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
       the room sends the visitor back here (sessionStorage "dav-mel-death"): it was too much. the screen's
       black; the traveller comes to on the rooftop, and it counts as a death */
    function melDeath() {
        var was = null;
        try { was = sessionStorage.getItem('dav-mel-death'); sessionStorage.removeItem('dav-mel-death'); } catch (e) {}
        if (!was || PAGE !== 'city') return;
        var ch = document.querySelector('.scene-character');
        var blk = document.createElement('div');
        blk.className = 'mc-black on';
        blk.style.cssText = 'position:fixed;inset:0;z-index:2147482000;background:#000;opacity:1;transition:opacity 2.4s;pointer-events:all';
        body.appendChild(blk);
        if (ch && Sky.gore && Sky.gore.lieDown) Sky.gore.lieDown(ch);
        setTimeout(function () {
            blk.style.opacity = '0';
            if (ch && Sky.gore) { Sky.gore.respawn(ch); setTimeout(function () { Sky.gore.getUp(ch); }, 1500); }
            else document.dispatchEvent(new CustomEvent('dav:traveller-died'));
            setTimeout(function () { blk.remove(); }, 2600);
        }, 1800);
    }

    function start() { placeKey(); setupScissors(); setupRoof(); placeholders(); melDeath(); dejaVu(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

    Sky.resets = { get reset() { return S.reset; }, live: S.live, patched: S.patched };
})();

/* =====================================================================
   watchers.js — reset 6, the watchers: someone keeps it all running, and
   watches (5 Oct). the second of the resets where the world shows what it
   is (sky/veil.js has the plan).

     the eyes      from reset 6, eyes open in the dark places of the house and the
                   workshop: in the walls, the corners, the knots in the wood. they
                   follow you, they blink, and they shut when you come too close
                   (they don't like being looked at). they're the archons' eyes.
                   slot: assets/ui/watcher-eye (one eye, open, looking straight at
                   you: the page opens, closes and blinks it; the drawn one also looks about)
     the key       reset 6, the hallway: one eye that never blinks and never shuts.
                   click it and it closes for the first time, and weeps the key.
     the gaze      reset 6, the rooftop: look up at the sky through the telescope and
                   an eye opens up there, the size of the sky. once the key's found,
                   meet it (click it): it looks back, the lens floods white, and the
                   traveller burns where they stand. that's the reset's death.
                   from reset 7 it's been painted over.
                   slots: assets/city/sky-eye (the eye in the sky, open; its pupil
                   assets/city/sky-eye-pupil), assets/city/sky-eye-painted (painted over)
     sounds        eye-open (an eye opening), gaze (the look that burns), weep: stand-ins

   its look: sky/css/watchers.css
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    if (!Sky || !S || Sky.watchers) return;
    var body = document.body, R = S.reset, sfx = Sky.sfx;
    var PAGE = (location.pathname.replace(/.*\//, '').replace(/\.html$/, '') || 'index').replace(/^index$/, 'sea');
    function say(t, ms) { Sky.say(t, ms || 2800); }
    function busyHands() { return body.classList.contains('inv-holding'); }
    if (R < 6 || R > 7) { Sky.watchers = {}; return; }

    // an eye: the white, the iris and pupil (they move), and the lids (they close it)
    function eyeArt(id) {
        return '<svg class="placeholder" viewBox="0 0 60 32" aria-hidden="true">' +
            '<defs><clipPath id="' + id + '"><path d="M2 16 Q30 -4 58 16 Q30 36 2 16 Z"/></clipPath></defs>' +
            '<path d="M2 16 Q30 -4 58 16 Q30 36 2 16 Z" fill="#ece3cf"/>' +
            '<g clip-path="url(#' + id + ')"><g class="we-look"><circle cx="30" cy="16" r="10" fill="#6b2a12"/><circle cx="30" cy="16" r="10" fill="none" stroke="#2a0e05" stroke-width="1.4"/>' +
            '<circle cx="30" cy="16" r="4.6" fill="#0b0605"/><circle cx="27" cy="13" r="1.8" fill="#fff" opacity=".8"/></g>' +
            '<path d="M2 16 Q30 -4 58 16 Q30 2 2 16 Z" fill="rgba(60,30,10,.25)"/></g>' +
            '<path d="M2 16 Q30 -4 58 16" fill="none" stroke="#1a0d06" stroke-width="2.2" stroke-linecap="round"/>' +
            '<path d="M2 16 Q30 36 58 16" fill="none" stroke="#1a0d06" stroke-width="1.2" stroke-linecap="round"/></svg>';
    }
    var made = 0;
    function makeEye(host, left, top, cls) {
        var e = document.createElement('div');
        e.className = 'watcher' + (cls ? ' ' + cls : '');
        e.style.left = left + '%'; e.style.top = top + '%';
        e.dataset.asset = 'assets/ui/watcher-eye';
        e.innerHTML = eyeArt('we-c' + (++made));
        e.setAttribute('aria-hidden', 'true');
        host.appendChild(e);
        if (Sky.fillAssets) Sky.fillAssets(host);
        return e;
    }

    /* ---------------- the eyes in the rooms ---------------- */
    // where they open: the room (a selector), and spots in it (% across, % down). away from the furniture, in the walls
    var SPOTS = {
        living:   [['.room', [[40, 47], [93, 58], [6, 74]]], ['.bathroom', [[12, 22], [86, 26]]], ['.hallway', [[8, 34], [36, 20], [92, 46]]],
                   ['.kitchen', [[58, 8], [96, 40]]], ['.attic', [[18, 46], [70, 36]]], ['.dungeon', [[8, 18], [94, 30]]]],
        workshop: [['.room', [[62, 8], [33, 70], [97, 40]]]]
    };
    var eyes = [];
    (SPOTS[PAGE] || []).forEach(function (s) {
        var host = document.querySelector(s[0]);
        if (!host) return;
        s[1].forEach(function (p) { eyes.push({ el: makeEye(host, p[0], p[1]), open: false, next: performance.now() + 2000 + Math.random() * 9000 }); });
    });
    // the pointer: they look at it, and shut if it comes close
    var px = window.innerWidth / 2, py = window.innerHeight / 2;
    document.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
    function look(el, shy) {
        var r = el.getBoundingClientRect();
        if (!r.width) return false;
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1;
        el.style.setProperty('--lx', (dx / d * Math.min(1, d / 200) * 9).toFixed(2) + 'px');
        el.style.setProperty('--ly', (dy / d * Math.min(1, d / 200) * 4).toFixed(2) + 'px');
        return shy && d < Math.max(70, r.width * 1.6);
    }
    function blink(el) { el.classList.remove('blink'); void el.offsetWidth; el.classList.add('blink'); }
    setInterval(function () {
        var now = performance.now();
        eyes.forEach(function (w) {
            var near = look(w.el, true);
            if (w.open && near) { w.open = false; w.el.classList.remove('open'); w.next = now + 4000 + Math.random() * 6000; return; }
            if (now < w.next) { if (w.open && Math.random() < 0.012) blink(w.el); return; }
            w.open = !w.open && !near;
            w.el.classList.toggle('open', w.open);
            if (w.open && Math.random() < 0.3) sfx('eye-open', { or: 'unnerve', size: 0.15, volume: 0.25 });
            w.next = now + (w.open ? 4000 + Math.random() * 7000 : 3000 + Math.random() * 12000);
        });
        if (still) look(still, false);
    }, 120);

    /* ---------------- the key: the hallway's eye that never blinks (reset 6) ---------------- */
    var still = null;
    var hall = document.querySelector('.hallway');
    if (R === 6 && hall && S.get('key') !== '1') {
        still = makeEye(hall, 82, 30, 'still open');
        still.setAttribute('role', 'button');
        still.setAttribute('tabindex', '0');
        still.setAttribute('aria-label', 'an eye in the wall that never blinks');
        still.removeAttribute('aria-hidden');
        var weep = function (e) {
            if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
            if (busyHands() || still.classList.contains('weeping')) return;
            e.preventDefault(); e.stopPropagation();
            still.classList.add('weeping');
            say('It’s the only one that never blinks. …It’s closing.', 2600);
            sfx('weep', { or: 'shimmer', size: 0.4 });
            setTimeout(function () {
                var r = still.getBoundingClientRect();
                document.dispatchEvent(new CustomEvent('dav:drop-key', { detail: { by: 'watcher', host: hall, x: r.left + r.width / 2, y: r.bottom + 46 } }));
            }, 1500);
            setTimeout(function () { still.classList.add('gone'); }, 4000);
        };
        still.addEventListener('click', weep);
        still.addEventListener('keydown', weep);
    }

    /* ---------------- the eye in the sky (the rooftop, through the telescope) ---------------- */
    var BIG = '<svg class="placeholder" viewBox="0 0 200 110" aria-hidden="true">' +
        '<defs><radialGradient id="ge-iris" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f4c060"/><stop offset=".45" stop-color="#c46a1c"/><stop offset="1" stop-color="#4a1606"/></radialGradient>' +
        '<clipPath id="ge-clip"><path d="M4 55 Q100 -18 196 55 Q100 128 4 55 Z"/></clipPath></defs>' +
        '<path d="M4 55 Q100 -18 196 55 Q100 128 4 55 Z" fill="#eadfc4" opacity=".92"/>' +
        '<g clip-path="url(#ge-clip)"><g class="ge-look"><circle cx="100" cy="55" r="36" fill="url(#ge-iris)"/>' +
        '<g stroke="#5a2008" stroke-width=".8" opacity=".55">' + Array.apply(null, Array(24)).map(function (_, i) {
            var a = i / 24 * Math.PI * 2; return '<path d="M' + (100 + Math.cos(a) * 14).toFixed(1) + ' ' + (55 + Math.sin(a) * 14).toFixed(1) + ' L' + (100 + Math.cos(a) * 34).toFixed(1) + ' ' + (55 + Math.sin(a) * 34).toFixed(1) + '"/>';
        }).join('') + '</g>' +
        '<ellipse class="ge-pupil" cx="100" cy="55" rx="7" ry="22" fill="#060303"/></g></g>' +
        '<path d="M4 55 Q100 -18 196 55" fill="none" stroke="#120804" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M4 55 Q100 128 196 55" fill="none" stroke="#120804" stroke-width="2.5" stroke-linecap="round"/></svg>';
    var PAINTED = '<svg class="placeholder" viewBox="0 0 200 110" aria-hidden="true">' +
        '<path d="M14 50 Q40 20 90 26 Q150 18 186 48 Q170 84 110 88 Q50 96 22 74 Q6 64 14 50 Z" fill="#1d1a24"/>' +
        '<path d="M30 46 Q90 30 170 50 M26 62 Q100 50 176 66 M40 78 Q100 70 160 80" stroke="#2c2836" stroke-width="7" stroke-linecap="round" fill="none"/></svg>';
    var gaze = null, burning = false;
    if (PAGE === 'city') {
        var painted = R > 6;
        gaze = document.createElement('div');
        gaze.className = 'gaze' + (painted ? ' painted' : '');
        gaze.innerHTML = '<button type="button" class="ge-eye" data-asset="' + (painted ? 'assets/city/sky-eye-painted' : 'assets/city/sky-eye') + '" aria-label="' +
            (painted ? 'a patch of sky, painted over' : 'an eye, up in the sky') + '">' + (painted ? PAINTED : BIG) + '</button>';
        body.appendChild(gaze);
        if (Sky.fillAssets) Sky.fillAssets(gaze);
        var eye = gaze.querySelector('.ge-eye'), openT = null;
        // it opens a little while after you look up, and shuts if you meet it too soon
        new MutationObserver(function () {
            var up = body.classList.contains('scope-view');
            if (up === gaze.classList.contains('up')) return;
            gaze.classList.toggle('up', up);
            clearTimeout(openT);
            if (!up) { gaze.classList.remove('open'); return; }
            if (painted) return;
            openT = setTimeout(function () {
                if (!body.classList.contains('scope-view')) return;
                gaze.classList.add('open');
                sfx('eye-open', { or: 'dread', size: 0.5 });
                setTimeout(function () { if (gaze.classList.contains('open') && !burning) say('That isn’t a star. It’s an eye. It’s looking down at the city.', 3400); }, 1400);
            }, 2600);
        }).observe(body, { attributes: true, attributeFilter: ['class'] });
        setInterval(function () { if (gaze.classList.contains('open') && !burning) look(eye, false); }, 60);
        eye.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (burning || busyHands()) return;
            if (painted) { say('Someone’s painted over it. From the other side.', 2800); return; }
            if (!gaze.classList.contains('open')) return;
            if (Sky.lives && Sky.lives.refuse('gaze')) {
                gaze.classList.remove('open');
                clearTimeout(openT);
                openT = setTimeout(function () { if (body.classList.contains('scope-view')) gaze.classList.add('open'); }, 6000);
                return;
            }
            burn();
        });
    }
    // meeting its gaze: it looks back, the lens floods white, and the traveller on the roof burns where they stand
    function burn() {
        var ch = document.querySelector('.city-char');
        if (!ch || !Sky.gore) return;
        burning = true;
        body.classList.add('cutscene');
        eye.style.setProperty('--lx', '0px'); eye.style.setProperty('--ly', '0px');
        gaze.classList.add('staring');
        sfx('gaze', { or: 'dread' });
        var flash = document.createElement('div');
        flash.className = 'gaze-flash';
        body.appendChild(flash);
        setTimeout(function () { flash.classList.add('on'); sfx('gaze-burn', { or: 'flashbang' }); }, 1500);
        setTimeout(function () {
            // (under the white: down from the sky, and the telescope lowered)
            var back = document.querySelector('.back-inside'); if (back) back.click();
            setTimeout(function () { var lo = document.querySelector('.pu-leave'); if (lo) lo.click(); }, 120);
            ch.classList.add('burnt');
        }, 2300);
        setTimeout(function () { flash.classList.add('fading'); }, 3300);
        setTimeout(function () {
            // ash, lifting off them
            var made2 = 0, ash = setInterval(function () {
                var b = ch.getBoundingClientRect(), a = document.createElement('div');
                a.className = 'gaze-ash';
                a.style.left = (b.left + b.width * Math.random()) + 'px'; a.style.top = (b.top + b.height * Math.random()) + 'px';
                body.appendChild(a);
                a.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + (Math.random() * 60 - 30) + 'px,-' + (60 + Math.random() * 120) + 'px) rotate(' + (Math.random() * 360) + 'deg)', opacity: 0 }],
                          { duration: 1400 + Math.random() * 900, easing: 'ease-out', fill: 'forwards' }).onfinish = function () { a.remove(); };
                if (++made2 > 40) clearInterval(ash);
            }, 45);
            ch.classList.add('crumbling');
        }, 4600);
        setTimeout(function () {
            flash.remove();
            ch.classList.remove('burnt', 'crumbling');
            ch.classList.add('gore-hidden');
            Sky.gore.respawn(ch);                                           // (the reset's death: sky/lives.js)
            setTimeout(function () { body.classList.remove('cutscene'); gaze.classList.remove('staring', 'open'); burning = false; }, 2500);
        }, 6600);
    }

    Sky.watchers = { eyes: eyes };
})();

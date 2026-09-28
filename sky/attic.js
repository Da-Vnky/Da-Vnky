/* =====================================================================
   attic.js — the attic, above the hallway (living.html).

   THE WAY UP: in the hallway a cord hangs from the hatch in the ceiling, a light
   either side of it. Pull the cord down and the hatch swings open and a ladder
   slides down (open for the rest of the reset: run:hall-hatch).
   IN RESET 4 (only) there's no cord: the hatch has the hanging lamp under it
   instead, the hint that the attic's the place to look this time. Grab the lamp
   and pull it down, hard: it stretches on its cable… and comes away, drops and
   smashes on the floor, the hallway goes dim, the hatch creaks open and the ladder
   slides down. Broken for the rest of the reset (run:hall-lamp). LAMP_RESETS says
   which resets have the lamp. Click the ladder to climb up; the square hole in the
   attic floor (bottom right) goes back down.

   THE GRIMOIRE (reset 4: DEATHS.grimoire in sky/state.js): a black book on a
   lectern. Before it opens the traveller says how wrong it feels, and it opens with
   a horrible sound (sky/books.js: VIBES, QUIET). Open it, the first time: a ritual on
   the left page, and on the right a place to sign in your own blood (the pointer's a
   pricked finger; the ink runs red). "make the pact" (only once reset 4's key is found)
   and the book slams shut, rises in front of the traveller, something answers, they
   scream, and hands come up through the floor and drag them down: to the brimstone,
   the red sky, the eye, and the voice (sky/hell.js). Not a death. The ground shakes,
   and the hands push them back up through the attic floor (giveBack below); a white
   revolver appears in front of them, and the book that opens the dungeon is back on
   the living-room shelf. It happens once: after that (run:grimoire-pact) the grimoire
   is just a book of your pages (content/books/grimoire/, sky/books.js), a quieter sound
   as it opens, and the ritual page is gone. From reset 5 it's on the living-room
   bookshelf instead.

   slots (assets/living/): hall-cord, hall-light, hall-hatch, hall-hatch-open, attic-ladder, hall-lamp-broken, attic-wall,
          attic-floor, attic-window, attic-clutter, attic-lectern, attic-hole,
          grimoire, grimoire-open, grimoire-ritual, pact-hand;
          assets/characters/attic (+ attic-walking); assets/ui/cursor-blood
   sounds: cord, hatch, lamp-creak, lamp-snap, glass, ladder, quill, book-slam, pact, hands (stand-ins till then),
           and assets/sounds/grimoire (loops while the book's open; a drawn drone till then)
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    var body = document.body, hall = document.querySelector('.hallway'), attic = document.querySelector('.attic');
    if (!Sky || !Sky.house || !hall || !attic || Sky.attic) return;
    var H = Sky.house;
    var ladder = hall.querySelector('.hall-ladder'), cord = hall.querySelector('.hall-cord');
    var LAMP_RESETS = [4];                                 // the resets with the lamp that comes away (any other: the cord)
    var LAMP = !!S && LAMP_RESETS.indexOf(S.reset) !== -1;
    var CORD_PULL = 0.16;                                  // how far (a share of the cord's length) it's pulled before the hatch gives
    var hallMe = hall.querySelector('.character'), me = attic.querySelector('.attic-character');
    var hole = attic.querySelector('.attic-hole'), book = attic.querySelector('.attic-grimoire');
    var TUG = 0.42;                                        // how far (a share of the lamp's height) it stretches before it comes away
    var STAND = 30;                                        // where the traveller stands up here (% across)
    var sfx = Sky.sfx;
    function say(t, ms) { Sky.say(t, ms || 2600); }
    function get(k) { return S ? S.get(k) : null; }
    function set(k, v) { if (S) S.set(k, v); }

    var BLOOD_CURSOR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M4 30 Q2 22 6 16 L14 6 Q17 3 19.5 5 Q21.5 7 19 10.5 L12 20 Q10 26 4 30 Z" fill="#e8c4a4" stroke="#3a2716" stroke-width="1.2"/>' +
        '<path d="M16.5 6.5 Q19 5 20 7" stroke="#b08868" stroke-width="1" fill="none"/><circle cx="19.2" cy="6.8" r="2.2" fill="#8a0a0e"/><path d="M19.4 8.6 Q20.4 12 19.2 13.6 Q18 12 19.4 8.6 Z" fill="#8a0a0e"/></svg>');

    // its look is in sky/css/attic.css (linked from each page's head); these are the values it takes from here
    document.documentElement.style.setProperty('--attic-stand', STAND);

    var dark = document.createElement('div');
    dark.className = 'hall-dark';
    hall.appendChild(dark);

    /* ---------------- the cord or the lamp, the hatch, the ladder ---------------- */
    function broken() { return get('hall-lamp') === 'broken'; }
    function hatchOpen() { return LAMP ? broken() : get('hall-hatch') === 'open'; }
    if (!LAMP) body.classList.add('hall-cord-on');
    // as the page opens: already down if it's open, without sliding (hall-still: no sliding for a moment)
    body.classList.add('hall-still');
    if (hatchOpen()) { body.classList.add('ladder-down', 'hatch-open'); if (LAMP) body.classList.add('lamp-down'); }
    setTimeout(function () { requestAnimationFrame(function () { body.classList.remove('hall-still'); }); }, 300);
    // the hatch, open: your picture of it open (hall-hatch-open), or the shut one gone dark
    var openArt = null;
    Sky.findAsset('assets/living/hall-hatch-open', function (u) { openArt = u || null; if (hatchOpen()) showOpenHatch(); });
    function showOpenHatch() {
        body.classList.add('hatch-open');
        var h = hall.querySelector('.hall-hatch');
        if (!openArt || !h) return;
        if (h.tagName.toLowerCase() !== 'img') { var im = document.createElement('img'); im.className = h.getAttribute('class'); im.alt = ''; h.replaceWith(im); h = im; }
        h.src = openArt;
        h.classList.add('open-art');
    }
    function ladderDown() { sfx('ladder', { or: 'wall-slide' }); body.classList.add('ladder-down'); }
    var pull = null;
    function busy() { return H.busy || climbing; }
    function lampOf(e) { return e.target.closest && e.target.closest('.hall-lamp'); }       // (a picture of yours takes the drawn lamp's place, so it's looked for each time)
    hall.addEventListener('pointerdown', function (e) {
        var lamp = lampOf(e);
        if (!lamp || !LAMP || broken() || busy() || body.classList.contains('inv-holding') || e.button > 0) return;
        e.preventDefault();
        try { lamp.setPointerCapture(e.pointerId); } catch (x) {}
        var r = lamp.getBoundingClientRect();
        pull = { el: lamp, x: e.clientX, y: e.clientY, h: r.height || 150, creak: 0 };
        lamp.classList.add('pulling');
        lamp.style.transition = 'none';
    });
    hall.addEventListener('pointermove', function (e) {
        if (!pull) return;
        var lamp = pull.el;
        var dy = Math.max(0, e.clientY - pull.y), dx = e.clientX - pull.x;
        var stretch = Math.pow(dy / pull.h, 0.85) * 0.55;                   // (it gives, grudgingly)
        var ang = Math.max(-28, Math.min(28, -dx * 0.18));
        lamp.style.transform = 'rotate(' + ang.toFixed(1) + 'deg) scaleY(' + (1 + stretch).toFixed(3) + ')';
        if (stretch > pull.creak + 0.1) { pull.creak = stretch; sfx('lamp-creak', { or: 'tap', size: 0.3 + stretch }); }
        if (stretch >= TUG) snap(ang);
    });
    function letGo() {
        if (!pull) return;
        var lamp = pull.el;
        pull = null;
        lamp.classList.remove('pulling');
        lamp.style.transition = 'transform .7s cubic-bezier(.3,1.9,.5,1)';                      // back up it springs, swinging
        lamp.style.transform = '';
        setTimeout(function () { lamp.style.transition = ''; }, 720);
    }
    hall.addEventListener('pointerup', letGo);
    hall.addEventListener('pointercancel', letGo);

    // the cord: pull it down (or just click it) and the hatch gives
    var tug = null;
    function cordBack(el) {
        el.classList.remove('pulling');
        el.style.transition = 'transform .6s cubic-bezier(.3,1.8,.5,1)';                         // up it springs
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 620);
    }
    function openHatch() {
        set('hall-hatch', 'open');
        sfx('hatch', { or: 'door', size: 0.6 });
        showOpenHatch();
        say('the hatch swings open…', 2200);
        setTimeout(ladderDown, 450);
    }
    if (cord && !LAMP) {
        cord.addEventListener('pointerdown', function (e) {
            if (busy() || body.classList.contains('inv-holding') || e.button > 0) return;
            e.preventDefault();
            try { cord.setPointerCapture(e.pointerId); } catch (x) {}
            tug = { y: e.clientY, h: cord.getBoundingClientRect().height || 200, far: 0, done: false };
            cord.classList.add('pulling');
            cord.style.transition = 'none';
        });
        cord.addEventListener('pointermove', function (e) {
            if (!tug || tug.done) return;
            var dy = Math.max(0, e.clientY - tug.y);
            tug.far = Math.max(tug.far, dy);
            var k = Math.min(dy / tug.h, CORD_PULL * 1.15);
            cord.style.transform = 'scaleY(' + (1 + k).toFixed(3) + ')';
            if (k >= CORD_PULL) {
                tug.done = true;
                sfx('cord', { or: 'tap', size: 0.25 });
                if (!hatchOpen()) openHatch();
            }
        });
        var cordUp = function () {
            if (!tug) return;
            var t = tug; tug = null;
            if (!t.done && t.far < 6) { clickCord(); return; }            // (just a click: a tug of its own)
            cordBack(cord);
        };
        cord.addEventListener('pointerup', cordUp);
        cord.addEventListener('pointercancel', cordUp);
        cord.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickCord(); } });
    }
    function clickCord() {
        cord.classList.add('pulling');
        cord.style.transition = 'transform .16s ease-in';
        cord.style.transform = 'scaleY(' + (1 + CORD_PULL) + ')';
        sfx('cord', { or: 'tap', size: 0.25 });
        setTimeout(function () {
            if (!hatchOpen()) openHatch(); else say('it\u2019s open already.', 1400);
            cordBack(cord);
        }, 170);
    }
    function snap(ang) {
        var lamp = pull.el;
        pull = null;
        set('hall-lamp', 'broken');
        sfx('lamp-snap', { or: 'crack' });
        var r = lamp.getBoundingClientRect(), floorY = hall.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(hall).getPropertyValue('--floor-h')) || 11) / 100 * window.innerHeight;
        lamp.classList.remove('pulling');
        lamp.style.transformOrigin = '50% 60%';
        var drop = Math.max(40, floorY - r.bottom + r.height * 0.15);
        lamp.animate([{ transform: 'rotate(' + ang + 'deg) scaleY(1.2)' }, { transform: 'translateY(' + drop.toFixed(0) + 'px) rotate(' + (ang * 2 + (Math.random() < 0.5 ? -70 : 70)) + 'deg)' }],
            { duration: 560, easing: 'cubic-bezier(.5,0,1,1)', fill: 'forwards' }).onfinish = function () {
            sfx('glass', { or: 'shatter' });
            var cx = r.left + r.width / 2;
            for (var i = 0; i < 16; i++) {
                var g = document.createElement('div');
                g.className = 'glass-bit';
                g.style.left = cx + 'px'; g.style.top = floorY + 'px';
                body.appendChild(g);
                var a = -Math.PI * Math.random(), sp = 40 + Math.random() * 120;
                g.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * sp) + 'px,' + (Math.sin(a) * sp * 0.5 + 18) + 'px) rotate(' + (Math.random() * 500) + 'deg)', opacity: 0 }],
                    { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' }).onfinish = (function (q) { return function () { q.remove(); }; })(g);
            }
            lamp.getAnimations().forEach(function (an) { an.cancel(); });
            lamp.style.transform = ''; lamp.style.transformOrigin = '';
            body.classList.add('lamp-down');
            showOpenHatch();
            say('it came away in your hand… and something creaked open, up above.', 3400);
            setTimeout(ladderDown, 1100);
        };
    }

    /* ---------------- up the ladder, down the hole (the trip between rooms: sky/house.js) ---------------- */
    var climbing = false, up = false;
    var walk = H.walk, place = H.place, stop = H.stop, pctOf = H.pctOf, standAt = H.standAt;
    function climbUp() {
        if (climbing || up) return;
        climbing = true;
        var go = function () {
            H.through();
            if (hallMe) { hallMe.classList.remove('face-left'); hallMe.classList.add('up-ladder'); }
            var n = 0, steps = setInterval(function () { sfx('step', { size: 0.35 }); if (++n > 3) clearInterval(steps); }, 220);
            setTimeout(function () { openAttic(false); }, 750);
        };
        if (!hallMe) { go(); return; }
        H.setOff(function () { stop(hallMe); climbing = false; });
        walk(hallMe, standAt(hallMe, pctOf(ladder, hall)), go);
    }
    function openAttic(now) {
        up = true;
        if (now) body.classList.add('attic-now');
        body.classList.add('in-attic');
        if (!now) body.classList.add('attic-panning');
        attic.setAttribute('aria-hidden', 'false');
        try { history.replaceState(null, '', '#attic'); } catch (e) {}
        if (Sky.fillAssets) Sky.fillAssets(attic);
        H.fire('enter', 'attic');
        var holeX = standAt(me, pctOf(hole, attic));
        if (now) {
            place(me, STAND);
            setTimeout(function () { body.classList.remove('attic-now'); climbing = false; }, 60);
            if (hallMe) hallMe.classList.remove('up-ladder');
            return;
        }
        place(me, holeX, true);
        me.classList.add('out-of-hole');
        setTimeout(function () {
            body.classList.remove('attic-panning');
            if (hallMe) hallMe.classList.remove('up-ladder');
            me.classList.remove('out-of-hole');
            H.land(me, STAND, function () { me.classList.remove('face-left'); climbing = false; });
        }, 950);
    }
    function climbDown() {
        if (!up || climbing) return;
        var shut = function () {
            H.through();
            up = false;
            body.classList.remove('in-attic');
            body.classList.add('attic-panning');
            attic.setAttribute('aria-hidden', 'true');
            me.classList.remove('into-hole');
            closeBook(true);
            try { history.replaceState(null, '', '#hallway'); } catch (e) {}
            H.fire('leave', 'attic');
            if (hallMe) { place(hallMe, standAt(hallMe, pctOf(ladder, hall))); hallMe.classList.add('down-ladder'); }
            setTimeout(function () { body.classList.remove('attic-panning'); if (hallMe) hallMe.classList.remove('down-ladder'); H.land(null, 0, function () { climbing = false; }); }, 950);
        };
        climbing = true;
        H.setOff(function () { stop(me); climbing = false; });
        walk(me, standAt(me, pctOf(hole, attic)), function () {
            H.through();
            me.classList.add('into-hole');
            sfx('step', { size: 0.35 });
            setTimeout(shut, 650);
        });
    }
    H.room('attic', { parent: 'hall', here: function () { return up; }, busy: function () { return climbing; }, enter: climbUp, leave: climbDown });
    if (ladder) ladder.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); H.go('attic'); });
    if (hole) hole.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); H.go('hall'); });
    // living.html#attic: start up there (the debug page's preview)
    if (location.hash === '#attic') setTimeout(function () { if (Sky.sides) Sky.sides.goNow('hall'); setTimeout(function () { openAttic(true); }, 80); }, 120);

    /* ---------------- the grimoire ---------------- */
    var hasBook = !!S && S.live('grimoire');
    if (hasBook) attic.classList.add('has-grimoire');
    function pactMade() { return get('grimoire-pact') === '1'; }             // (once a reset: after that it's only a book)
    var FIRST_LOOK = 'Okay. I\u2019ve got a really, really bad feeling about this book.';
    var SIGIL = '<svg class="gr-sigil" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#6a0808" stroke-width="1.4">' +
        '<circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="38"/>' +
        '<path d="' + (function () { var d = ''; for (var i = 0; i < 7; i++) { var a = -Math.PI / 2 + i * 4 * Math.PI / 7; d += (i ? 'L' : 'M') + (50 + 38 * Math.cos(a)).toFixed(1) + ' ' + (50 + 38 * Math.sin(a)).toFixed(1); } return d + 'Z'; })() + '"/>' +
        '<circle cx="50" cy="50" r="9"/><path d="M50 41 V59 M41 50 H59"/></g></svg>';
    var grim = document.createElement('div');
    grim.className = 'grim-view';
    grim.setAttribute('role', 'dialog');
    grim.setAttribute('aria-label', 'the grimoire');
    grim.innerHTML = '<div class="grim-book"><div class="grim-page left"><h3>Of the Covenant</h3>' + SIGIL +
        '<p>Here beginneth the covenant of the Seventh Sphere, whereby one who would be free of the wheel may pass beyond the Archons that keep it.</p>' +
        '<p>Let the seeker give what is theirs alone: their name, written in their own blood upon this page. So shall the one who made the wheel know them, and they shall be known.</p>' +
        '<p>And what is written here cannot be unwritten.</p><div class="gr-ritual"></div></div>' +
        '<div class="grim-page right"><h3>Sign, in thine own blood</h3><div class="gr-sign"><canvas></canvas><span class="gr-quill" aria-hidden="true"></span></div>' +
        '<div class="gr-acts"><button type="button" class="gr-pact" disabled>make the pact</button><button type="button" class="gr-shut">close the book</button></div></div></div>';
    body.appendChild(grim);
    Sky.findAsset('assets/living/grimoire-open', function (u) { if (u) { grim.querySelector('.grim-book').style.setProperty('--grim-art', 'url("' + new URL(u, location.href).href + '") center / 100% 100% no-repeat'); grim.classList.add('has-art'); } });
    Sky.findAsset('assets/living/grimoire-ritual', function (u) {             // your ritual page takes the left page's place
        if (!u) return;
        var left = grim.querySelector('.grim-page.left');
        left.querySelectorAll(':scope > :not(.gr-ritual)').forEach(function (n) { n.remove(); });
        left.querySelector('.gr-ritual').innerHTML = '<img alt="" src="' + u + '">';
    });
    // the pointer over the page: a bloodied finger drawn by the page itself, not the browser's cursor (a cursor picture's
    // tip lands in a different place on different screens and browsers; this one is always exactly where the blood goes).
    // its tip is at 19 x 7 of its 32 x 32 (--quill-x / --quill-y in attic.css): your own assets/ui/cursor-blood, same.
    var quill = grim.querySelector('.gr-quill');
    quill.innerHTML = '<img alt="" src="' + BLOOD_CURSOR + '">';
    Sky.findAsset('assets/ui/cursor-blood', function (u) { if (u) quill.innerHTML = '<img alt="" src="' + u + '">'; });
    var drone = null;
    function hum(on) {
        if (!drone && Sky.sounds && Sky.sounds.channel) drone = Sky.sounds.channel('grimoire');
        if (drone) drone.set(on ? on : 0, on ? 1.2 : 0.8);
        if (Sky.music && Sky.music.hush) Sky.music.hush(!!on, 'grimoire');
    }

    // signing: the pointer draws in blood
    var pad = grim.querySelector('.gr-sign'), cv = pad.querySelector('canvas'), cx = cv.getContext('2d'), pactBtn = grim.querySelector('.gr-pact');
    var ink = 0, pen = null, lastScratch = 0;
    // (sized and read in the page's own units, so a book mid-animation, a zoomed page or a resized window can't shift the ink)
    function sizePad() {
        var k = window.devicePixelRatio || 1, w = pad.offsetWidth, h = pad.offsetHeight;
        if (ink > 0 && cv.width === Math.round(w * k) && cv.height === Math.round(h * k)) return;
        var old = ink > 0 ? cv.toDataURL() : null, ow = cv.width, oh = cv.height;
        cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
        cx.setTransform(k, 0, 0, k, 0, 0);
        cx.lineCap = 'round'; cx.lineJoin = 'round';
        if (old) { var im = new Image(); im.onload = function () { cx.drawImage(im, 0, 0, ow / k, oh / k, 0, 0, w, h); }; im.src = old; }  // (keep what's signed)
    }
    window.addEventListener('resize', function () { if (grim.classList.contains('open')) sizePad(); });
    function at(e) {
        var r = cv.getBoundingClientRect(), sx = cv.offsetWidth / (r.width || 1), sy = cv.offsetHeight / (r.height || 1);
        return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy, t: performance.now() };
    }
    function quillTo(e) {
        if (e.pointerType === 'touch') { quill.classList.remove('on'); return; }
        var p = at(e);
        quill.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
        quill.classList.add('on');
    }
    pad.addEventListener('pointerenter', quillTo);
    pad.addEventListener('pointermove', quillTo);
    pad.addEventListener('pointerleave', function () { if (!pen) quill.classList.remove('on'); });
    pad.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        try { pad.setPointerCapture(e.pointerId); } catch (x) {}
        pen = at(e);
        cx.fillStyle = '#6d0008';
        cx.beginPath(); cx.arc(pen.x, pen.y, 2.2, 0, Math.PI * 2); cx.fill();
    });
    pad.addEventListener('pointermove', function (e) {
        if (!pen) return;
        var p = at(e), d = Math.hypot(p.x - pen.x, p.y - pen.y);
        if (d < 1) return;
        var speed = d / Math.max(1, p.t - pen.t);
        cx.strokeStyle = 'rgba(' + (95 + Math.random() * 25 | 0) + ',0,' + (6 + Math.random() * 6 | 0) + ',' + (0.82 + Math.random() * 0.15).toFixed(2) + ')';
        cx.lineWidth = Math.max(1.6, Math.min(5.2, 5.4 - speed * 2.2));
        cx.beginPath(); cx.moveTo(pen.x, pen.y); cx.lineTo(p.x, p.y); cx.stroke();
        ink += d;
        if (p.t - lastScratch > 140) { lastScratch = p.t; sfx('quill', { or: 'brush', size: 0.25 }); }
        pen = p;
        if (ink > 140) pactBtn.disabled = false;
    });
    function lift() {
        if (!pen) return;
        if (Math.random() < 0.45) {                                         // a drop runs down from the end of the stroke
            var x = pen.x, y = pen.y, len = 6 + Math.random() * 16;
            cx.strokeStyle = 'rgba(100,0,8,.8)'; cx.lineWidth = 1.8;
            cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + (Math.random() - 0.5), y + len); cx.stroke();
            cx.fillStyle = 'rgba(100,0,8,.9)'; cx.beginPath(); cx.arc(x, y + len, 2.1, 0, Math.PI * 2); cx.fill();
        }
        pen = null;
    }
    pad.addEventListener('pointerup', lift);
    pad.addEventListener('pointercancel', lift);

    function openBook() {
        if (!hasBook || !up || climbing || pactMade() || grim.classList.contains('open')) return;
        grim.classList.remove('slam');
        grim.classList.add('open');
        body.classList.add('book-open');
        ink = 0; pactBtn.disabled = true;
        requestAnimationFrame(function () { sizePad(); cx.clearRect(0, 0, cv.width, cv.height); });
        hum(0.85);
    }
    function closeBook(quiet) {
        if (!grim.classList.contains('open')) return;
        grim.classList.remove('open');
        body.classList.remove('book-open');
        if (!quiet) sfx('page-turn');
        hum(0);
    }
    grim.querySelector('.gr-shut').addEventListener('click', function () { closeBook(); });
    grim.addEventListener('click', function (e) { if (e.target === grim) closeBook(); });
    Sky.escape(function () { return grim.classList.contains('open') && !grim.classList.contains('slam'); }, function () { closeBook(); });
    if (book) book.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (!hasBook || !up || climbing || H.going || body.classList.contains('inv-holding')) return;
        if (Sky.books && Sky.books.remarking) return;
        // over to the lectern (down the hole instead, on the way: that's fine)
        H.setOff(function () { stop(me); });
        walk(me, standAt(me, pctOf(book, attic)) - 6, function () {
            H.drop();
            me.classList.remove('face-left');
            // a word first (sky/books.js), then it opens: the ritual, loud, if its pact is still to be made; else only a book
            var first = get('grimoire-looked') !== '1';
            set('grimoire-looked', '1');
            // the pact's made but they came back up without the key (a reload down there): it pulls them straight back
            if (Sky.hell && Sky.hell.owed && !Sky.hell.open) {
                if (Sky.inventory) Sky.inventory.say(PULLED, 2600);
                setTimeout(function () { if (up && !H.going) rise(); }, 1400);
                return;
            }
            if (!Sky.books || !Sky.books.grimoire) { if (!pactMade()) openBook(); return; }
            if (pactMade()) Sky.books.grimoire();
            else Sky.books.grimoire({ line: first ? FIRST_LOOK : null, loud: true, open: openBook, still: function () { return up && !H.going; } });
        });
    });

    var PULLED = 'The ink on the page is still wet. It wants me back down there.';
    /* ---------------- the pact ---------------- */
    var HAND = '<svg viewBox="0 0 50 110" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><path d="M14 110 Q12 74 10 60 Q4 48 3 36 Q2 30 6 31 Q9 32 11 44 L13 28 Q12 14 14 8 Q17 4 19 9 L20 30 L22 6 Q24 0 27 4 Q29 8 27 30 L30 10 Q32 5 35 8 Q37 12 34 34 L38 22 Q41 18 43 22 Q44 28 40 44 Q38 60 36 74 Q35 92 36 110 Z" fill="#0c0808" stroke="#2a1414" stroke-width="1"/>' +
        '<path d="M16 70 Q24 76 32 70 M18 84 Q25 88 33 84" stroke="#241010" stroke-width="1.2" fill="none"/></svg>';
    var handArt = HAND;
    Sky.findAsset('assets/living/pact-hand', function (u) { if (u) handArt = '<img alt="" src="' + u + '">'; });
    pactBtn.addEventListener('click', function () {
        if (pactBtn.disabled || pactMade()) return;
        // (27 Sep: no key needed first any more. reset 4's key is down there now: sky/hell.js)
        pactBtn.disabled = true;
        set('grimoire-pact', '1');                                          // (it's made: this can't happen again this reset)
        grim.classList.add('slam');
        setTimeout(function () { sfx('book-slam', { or: 'land', size: 1 }); }, 380);
        setTimeout(function () { grim.classList.remove('open'); body.classList.remove('book-open'); rise(); }, 900);
    });
    var dk = null;                                                           // (the dark that comes down with the pact)
    function rise() {
        climbing = true;
        var r = me.getBoundingClientRect();
        // the book, shut, floating up in front of them
        var fb = document.createElement('div');
        fb.className = 'pact-book';
        fb.style.width = Math.max(70, r.height * 0.55) + 'px';
        fb.style.left = (r.left + r.width / 2 - Math.max(70, r.height * 0.55) / 2) + 'px';
        fb.style.top = (r.top + r.height * 0.42) + 'px';
        attic.classList.add('pact');                                        // (it's left the lectern)
        fb.innerHTML = book.querySelector('img.art') ? '<img alt="" src="' + book.querySelector('img.art').src + '">' : book.querySelector('svg').outerHTML;
        body.appendChild(fb);
        fb.animate([{ transform: 'translateY(40px) rotate(-8deg)', opacity: 0 }, { transform: 'translateY(-10px) rotate(3deg)', opacity: 1, offset: 0.5 }, { transform: 'translateY(0) rotate(-2deg)', opacity: 1 }],
            { duration: 1200, easing: 'ease-out', fill: 'forwards' });
        var bob = setTimeout(function () { fb.animate([{ transform: 'translateY(0) rotate(-2deg)' }, { transform: 'translateY(-8px) rotate(2deg)' }], { duration: 900, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }); }, 1200);
        dk = document.createElement('div');
        dk.className = 'pact-dark';
        body.appendChild(dk);
        requestAnimationFrame(function () { dk.classList.add('on'); });
        sfx('pact', { or: 'scare' }); setTimeout(function () { sfx('pact', { or: 'unnerve' }); }, 300);
        hum(1);
        me.classList.add('writhing');
        setTimeout(function () { sfx('scream'); }, 1300);
        // the hands, up through the boards around their feet
        var floorY = r.bottom - Math.max(2, r.height * 0.02), hands = [];
        var under = document.createElement('div');
        under.className = 'pact-floor';
        under.style.height = floorY + 'px';
        body.appendChild(under);
        setTimeout(function () {
            sfx('hands', { or: 'crack' });
            [-0.75, -0.3, 0.2, 0.62].forEach(function (k, i) {
                var h = document.createElement('div');
                h.className = 'pact-hand';
                h.innerHTML = handArt;
                var hw = Math.max(26, r.height * 0.26);
                h.style.width = hw + 'px'; h.style.height = (hw * 2.2) + 'px';
                h.style.left = (r.left + r.width / 2 + k * r.width - hw / 2) + 'px';
                h.style.top = (floorY - hw * 2.2) + 'px';
                h.style.transform = 'rotate(' + (k * 22) + 'deg)';
                under.appendChild(h);
                h.animate([{ translate: '0 100%' }, { translate: '0 12%', offset: 0.7 }, { translate: '0 22%' }], { duration: 600 + i * 90, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
                hands.push(h);
            });
        }, 1500);
        // and down they go
        setTimeout(function () {
            me.classList.remove('writhing');
            me.classList.add('dragged-down');
            hands.forEach(function (h) { h.animate([{ translate: '0 22%' }, { translate: '0 120%' }], { duration: 1500, easing: 'cubic-bezier(.5,0,.8,.5)', fill: 'forwards' }); });
            sfx('scream', { delay: 0.2 });
        }, 2500);
        setTimeout(function () {
            clearTimeout(bob);
            me.classList.add('gore-hidden');
            me.classList.remove('dragged-down');
            fb.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(30px)' }], { duration: 700, fill: 'forwards' }).onfinish = function () { fb.remove(); };
            hands.forEach(function (h) { h.remove(); });
            under.remove();
            hum(0);
            // down there (sky/hell.js), and then back up, the hands pushing them up through the boards
            var back = function () {
                attic.classList.remove('pact');
                giveBack(function () {
                    dk.classList.remove('on');
                    setTimeout(function () { dk.remove(); }, 1400);
                    climbing = false;
                    if (Sky.hell && Sky.hell.gift) Sky.hell.gift(me);
                });
            };
            if (Sky.hell && Sky.hell.enter) Sky.hell.enter(me, back); else setTimeout(back, 1500);
        }, 4200);
    }
    // the hands, the other way: up through the boards, the traveller held up in them, and back down without them
    function giveBack(done) {
        dk.classList.add('on');
        me.classList.remove('gore-hidden');
        me.classList.add('given-back');
        var mr = me.getBoundingClientRect(), floorY = mr.bottom - Math.max(2, mr.height * 0.02);
        var under = document.createElement('div'), hands = [];
        under.className = 'pact-floor';
        under.style.height = floorY + 'px';
        body.appendChild(under);
        sfx('hands', { or: 'crack' });
        [-0.62, -0.2, 0.3, 0.75].forEach(function (k, i) {
            var h = document.createElement('div');
            h.className = 'pact-hand';
            h.innerHTML = handArt;
            var hw = Math.max(26, mr.height * 0.26);
            h.style.width = hw + 'px'; h.style.height = (hw * 2.2) + 'px';
            h.style.left = (mr.left + mr.width / 2 + k * mr.width - hw / 2) + 'px';
            h.style.top = (floorY - hw * 2.2) + 'px';
            h.style.transform = 'rotate(' + (k * -18) + 'deg)';
            under.appendChild(h);
            h.animate([{ translate: '0 120%' }, { translate: '0 10%', offset: 0.55 }, { translate: '0 22%' }], { duration: 1500, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
            hands.push(h);
        });
        setTimeout(function () {
            sfx('hands', { or: 'crack', delay: 0.4 });
            hands.forEach(function (h, i) { h.animate([{ translate: '0 22%' }, { translate: '0 125%' }], { duration: 900 + i * 80, delay: 700, easing: 'cubic-bezier(.5,0,.8,.5)', fill: 'forwards' }); });
        }, 1500);
        setTimeout(function () {
            me.classList.remove('given-back');
            under.remove();
            if (done) done();
        }, 3300);
    }

    Sky.attic = { up: function () { return up; }, openBook: openBook, get lamp() { return LAMP; } };
})();

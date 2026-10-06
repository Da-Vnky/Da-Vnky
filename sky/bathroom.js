/* =====================================================================
   bathroom.js — the living space has a bathroom off to the right.
   The see-through arrow under the tabs sends the traveller walking over;
   the room slides away and the bathroom slides in. Click the mirror to
   look into it. The arrow on the left (or Escape) walks you back.

   Everything is a slot (see the comments in living.html):
     assets/living/arrow            the arrow (pointing right; flipped for the way back)
     assets/living/bath-wall, bath-floor, bath-mirror, bath-sink, bath-tub, bath-towel, bath-shelf, bath-mat
     assets/characters/living-walking     the traveller walking (living space)
     assets/characters/bathroom           the traveller in the bathroom (+ bathroom-walking)
     assets/characters/reflection         what you see in the mirror
     assets/living/mirror-close           the mirror's frame up close (a PNG with a see-through middle)
     assets/fonts/mirror.woff2            the lettering in the text box (or .woff / .ttf / .otf)
     assets/sounds/step, blip, shimmer    footsteps, the text typing out, looking into the mirror
   The words: data-say on the mirror in living.html.
   Open living.html#bathroom to start in there.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var bath = document.querySelector('.bathroom');
    var room = document.querySelector('.room');
    var go = document.querySelector('.room-arrow.to-bath');
    if (!Sky || !bath || !room || !go) return;
    var mirror = bath.querySelector('.bath-mirror');
    var home = room.querySelector('.scene-character');
    var me = bath.querySelector('.character');
    var body = document.body;

    var ARROW = Sky.ARROW_ART;                                // (the stand-in arrow: sky/sky.js)
    Array.prototype.forEach.call(document.querySelectorAll('.room-arrow'), function (a) { if (!a.querySelector('.placeholder, img')) a.insertAdjacentHTML('afterbegin', ARROW); });
    // door hints: the words on hover
    Array.prototype.forEach.call(document.querySelectorAll('.side-door[data-hint]'), function (d) {
        var h = document.createElement('span'); h.className = 'door-hint'; h.textContent = d.dataset.hint; d.appendChild(h);
    });

    // (its look is in sky/css/bathroom.css, linked from each page's head)

    /* ---------------- the arrows sit just under the tabs (the hallway's on the left) ---------------- */
    function placeArrows() {
        var tabs = document.querySelector('.place-tabs');
        if (!tabs || tabs.classList.contains('open')) return;          // (unfolded on a phone for a moment: it'll fold back)
        var r = tabs.getBoundingClientRect(), h = go.offsetHeight || 54;
        var top = r.bottom + 18;
        if (top + h > window.innerHeight - 12) top = r.top - h - 14;      // no room below (small screens): just above
        if (window.matchMedia('(max-width: 620px)').matches) top = window.innerHeight - h - 16;    // (an upright phone: the bottom corners)
        go.style.top = Math.round(top) + 'px';
        go.style.right = '8px';
        var left = document.querySelector('.room-arrow.to-hall');
        if (left) { left.style.top = Math.round(top) + 'px'; left.style.left = '8px'; }
        // and the arrows back from the side rooms: the same height, so going and coming back they don't jump about
        Array.prototype.forEach.call(document.querySelectorAll('.bathroom .room-arrow, .hallway .room-arrow:not(.hall-out), .dungeon .room-arrow, .kitchen .room-arrow, .porch .room-arrow'), function (a) {
            a.style.top = Math.round(top) + 'px';
            a.style.marginTop = '0';
            if (a.classList.contains('back-right')) a.style.right = '8px'; else a.style.left = '8px';
        });
    }
    placeArrows();
    window.addEventListener('resize', placeArrows);
    window.addEventListener('load', placeArrows);
    setTimeout(placeArrows, 400);

    /* ---------------- the rooms either side: the bathroom (right) and the hallway (left), and the dungeon below ----------------
       the traveller walks off that edge, the living space slides away and the other room slides in;
       they walk in from the edge you'd expect. living.html#bathroom / #hallway / #dungeon starts you in there.
       the walking, the trips between rooms and the place tabs: sky/house.js */
    var H = Sky.house;
    if (!H) return;
    var walk = H.walk, place = H.place, stop = H.stop, leftPct = H.leftPct, walkSecs = H.walkSecs, sfx = Sky.sfx;
    var SIDES = [
        { name: 'bath', el: bath, go: go, dir: 1, hash: '#bathroom' },
        { name: 'hall', el: document.querySelector('.hallway'), go: document.querySelector('.room-arrow.to-hall'), dir: -1, hash: '#hallway' },
        // the dungeon is underneath: pull the loose book on the bookshelf and down you go (dir 0: up and down, not sideways)
        { name: 'dungeon', el: document.querySelector('.dungeon'), go: document.querySelector('.shelf-book:not(.decoy)'), dir: 0, hash: '#dungeon', enterAt: 9 }
    ].filter(function (sd) { return sd.el && sd.go; });
    function side(name) { return SIDES.filter(function (x) { return x.name === name; })[0]; }
    var homeAt = home ? leftPct(home) : 34, busy = false, inSide = null;
    // reset 4: the book that opens the dungeon isn't on the shelf, until the grimoire's pact is made in the attic
    // (sky/attic.js, sky/hell.js). the way down's shut while it's gone: no book, no wall opening, no #dungeon
    var DS = window.davSave;
    function bookGone() { return !!DS && DS.reset === 4 && DS.get('grimoire-pact') !== '1'; }
    // and after the pact, the book won't open it till the inverted record's been put on and the robed Claubes are out
    // (27 Sep, Victor: so nobody goes down without summoning them). the record player glows red meanwhile (sky/records.js)
    function recordFirst() { return !!DS && DS.reset === 4 && DS.get('grimoire-pact') === '1' && DS.get('claubes-robed') !== '1'; }
    var NOT_YET = ['It won’t budge. Not by my hand, not yet.', 'The record player… something in it is waiting to be played.'];
    var tugging = false;
    function tugInVain(book) {
        if (tugging || busy || inSide) return;
        tugging = true;
        var from = home ? leftPct(home) : 0, at = home ? bookAt() : 0;
        if (Math.abs(from - at) < 8) from = at - 9;                      // (then back out of the way, so the book can be clicked again)
        var say = function () {
            if (home) home.classList.remove('face-left');
            book.classList.add('pulled');
            sfx('book', { volume: 0.5 });
            setTimeout(function () { book.classList.remove('pulled'); }, 450);
            setTimeout(function () { if (home && !inSide && !busy && !H.going) walk(home, from); }, 900);
            var done = function () { tugging = false; };
            Sky.speak(NOT_YET, done);
        };
        if (!home) { say(); return; }
        H.setOff(function () { stop(home); tugging = false; });             // (off somewhere else instead, on the way to the shelf)
        walk(home, bookAt(), function () { H.drop(); say(); });
    }
    var theBook = side('dungeon') && side('dungeon').go;
    if (theBook && bookGone()) theBook.classList.add('missing');
    SIDES.forEach(function (sd) {
        sd.me = sd.el.querySelector('.character');
        sd.back = sd.el.querySelector('.room-arrow');
        sd.standAt = sd.me ? leftPct(sd.me) : 40;
    });
    var OFF = { '1': 104, '-1': -14 };                       // just past the right / left edge
    var secret = document.querySelector('.secret-door');
    function doorAt() { return secret ? (secret.offsetLeft + secret.offsetWidth / 2 - home.offsetWidth / 2) / (room.clientWidth || window.innerWidth) * 100 : bookAt(); }
    function bookAt() { return theBook ? (theBook.offsetLeft + theBook.offsetWidth / 2 - home.offsetWidth / 2) / (room.clientWidth || window.innerWidth) * 100 : homeAt; }
    function openDoor(quiet) {
        if (!secret || secret.classList.contains('open')) return;
        secret.classList.add('open');
        secret.setAttribute('role', 'button'); secret.tabIndex = 0;
        try { sessionStorage.setItem('secret-open', '1'); } catch (e) {}
        if (quiet) { var p = secret.querySelector('.sd-panel'), h = secret.querySelector('.sd-hole'); p.style.transition = h.style.transition = 'none'; void p.offsetWidth; setTimeout(function () { p.style.transition = h.style.transition = ''; }, 50); }
    }
    function closeDoor() {
        if (!secret || !secret.classList.contains('open')) return;
        secret.classList.remove('open');
        secret.removeAttribute('role'); secret.removeAttribute('tabindex');
        try { sessionStorage.removeItem('secret-open'); } catch (e) {}
    }
    // the book pulled (by the traveller, or by the robed Claubes: pullBook): the wall under the paintings grinds open
    function grindOpen() {
        theBook.classList.add('pulled');
        sfx('book');
        setTimeout(function () { room.classList.add('rumble'); openDoor(); sfx('wall-slide'); }, 500);
        setTimeout(function () { room.classList.remove('rumble'); theBook.classList.remove('pulled'); }, 2900);
    }
    // the book pulled again, with the wall open: it grinds shut
    function pullShut() {
        if (busy || inSide) return;
        busy = true;
        var from = home ? leftPct(home) : 0, at = bookAt();
        if (Math.abs(from - at) < 8) from = at - 9;                      // (and then out of the way of the book, so it can be pulled again)
        var shut = function () {
            H.through();
            if (home) home.classList.remove('face-left');
            theBook.classList.add('pulled');
            sfx('book');
            setTimeout(function () { room.classList.add('rumble'); closeDoor(); sfx('wall-slide'); }, 500);
            setTimeout(function () {
                room.classList.remove('rumble'); theBook.classList.remove('pulled');
                H.land(home, from, function () { busy = false; });
            }, 2900);
        };
        H.setOff(function () { stop(home); busy = false; });
        if (home) walk(home, at, shut); else shut();
    }
    try { if (!bookGone() && !recordFirst() && (sessionStorage.getItem('secret-open') === '1' || location.hash === '#dungeon')) openDoor(true); } catch (e) {}

    // into a side room: over to that edge (or down the stairs behind the wall), and it slides in. instant: no walking, no sliding
    function goTo(sd, instant) {
        if (busy || inSide) return;
        if (sd.dir === 0 && (bookGone() || recordFirst())) return;
        busy = true; inSide = sd;
        var h = home ? leftPct(home) : homeAt;
        if (h > 2 && h < 92) homeAt = h;                     // (where they'll come back to: not the edge, when they only passed through)
        var timer = null;
        // somewhere else instead, on the way: they stop where they've got to, still in here
        function turnBack() {
            clearTimeout(timer);
            if (home) { stop(home); home.classList.remove('descending'); }
            busy = false; inSide = null;
        }
        function slide() {
            if (!instant) H.through();
            sd.el.setAttribute('aria-hidden', 'false');
            if (sd.me) place(sd.me, sd.dir > 0 ? 2 : sd.dir < 0 ? 90 : sd.enterAt, sd.dir < 0);       // in from the edge (or the stairs) you came through
            body.classList.add(sd.name + '-panning', 'in-' + sd.name, 'in-side');
            H.fire('enter', sd.name);
            var arrive = function () { busy = false; if (sd.me) sd.me.classList.remove('face-left'); };
            if (instant) { arrive(); setTimeout(function () { body.classList.remove(sd.name + '-panning'); }, 0); }
            else setTimeout(function () {
                body.classList.remove(sd.name + '-panning');
                H.land(sd.me, sd.standAt, arrive);
            }, 900);
            try { history.replaceState(null, '', sd.hash); } catch (e) {}
        }
        if (instant || !home) {
            if (instant) { sd.el.style.transition = room.style.transition = 'none'; }
            slide();
            if (instant) { void sd.el.offsetWidth; if (sd.me) place(sd.me, sd.standAt); setTimeout(function () { sd.el.style.transition = room.style.transition = ''; }, 50); }
            return;
        }
        if (sd.dir === 0) {
            // the stairs: over to the open wall, and down (the room rises away as they go)
            var down = function () {
                H.setOff(turnBack);
                walk(home, doorAt(), function () {
                    H.through();
                    home.classList.remove('face-left');
                    home.classList.add('descending');
                    sfx('step', { size: 0.4 });
                    setTimeout(function () { slide(); setTimeout(function () { home.classList.remove('descending'); }, 1200); }, 800);
                });
            };
            if (secret && secret.classList.contains('open')) { down(); return; }
            // first, over to the bookshelf and pull the book: the wall grinds open
            H.setOff(turnBack);
            walk(home, bookAt(), function () {
                H.through();
                home.classList.remove('face-left');
                grindOpen();
                setTimeout(down, secret ? 3300 : 0);
            });
            return;
        }
        var secs = walkSecs(home, OFF[sd.dir]);
        H.setOff(turnBack);
        walk(home, OFF[sd.dir]);                             // off the edge; the room slides as they reach it
        timer = setTimeout(slide, secs * 700);
    }
    // back to the living space: off the other edge (or up the stairs), and it slides back
    function goHome() {
        var sd = inSide;
        if (busy || !sd) return;
        busy = true;
        var timer = null, walker = sd.me && !sd.me.classList.contains('gore-hidden') ? sd.me : null;
        function slide() {
            H.through();
            if (home) place(home, sd.dir > 0 ? 98 : sd.dir < 0 ? -6 : doorAt(), sd.dir > 0);
            if (sd.dir === 0) { sd.go.classList.remove('pulled'); if (home && secret) { home.classList.add('ascending'); setTimeout(function () { home.classList.remove('ascending'); }, 1900); } }
            body.classList.add(sd.name + '-panning');
            body.classList.remove('in-' + sd.name, 'in-side');
            sd.el.setAttribute('aria-hidden', 'true');
            inSide = null;
            H.fire('leave', sd.name);
            try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
            setTimeout(function () {
                body.classList.remove(sd.name + '-panning');
                H.land(home, homeAt, function () { busy = false; if (home) home.classList.remove('face-left'); });
            }, 900);
        }
        if (!walker) { slide(); return; }
        // (somewhere else instead, on the way out: they stop where they've got to)
        H.setOff(function () { clearTimeout(timer); stop(walker); busy = false; });
        if (sd.dir === 0) { walk(walker, sd.enterAt, slide); return; }    // back to the foot of the stairs, then up
        var secs = walkSecs(walker, OFF[-sd.dir]);
        walk(walker, OFF[-sd.dir]);
        timer = setTimeout(slide, secs * 700);
    }
    function goNow(name) { var sd = side(name); if (sd && !inSide) goTo(sd, true); }
    SIDES.forEach(function (sd) {
        H.room(sd.name, { parent: 'living', here: function () { return inSide === sd; }, busy: function () { return busy; },
                          enter: function () { goTo(sd); }, leave: goHome });
    });

    if (secret) {
        var viaDoor = function (e) { if (!secret.classList.contains('open')) return; e.preventDefault(); H.go('dungeon'); };
        secret.addEventListener('click', viaDoor);
        secret.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') viaDoor(e); });
    }
    SIDES.forEach(function (sd) {
        sd.go.addEventListener('click', function (e) {
            e.preventDefault();
            if (sd.dir !== 0) return H.go(sd.name);
            H.ask(function () {
                if (H.where() !== 'living') return;                        // (the bookshelf's in the living space)
                if (recordFirst()) return tugInVain(sd.go);
                if (secret && secret.classList.contains('open')) pullShut(); else H.nav('dungeon');
            });
        });
        var back = function () { H.go('living'); };
        if (sd.back) sd.back.addEventListener('click', function (e) { e.preventDefault(); back(); });
        Array.prototype.forEach.call(sd.el.querySelectorAll('[data-goes-back]'), function (b) {
            b.addEventListener('click', function (e) { e.preventDefault(); back(); });
            b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); back(); } });
        });
        if (location.hash !== sd.hash) return;
        goTo(sd, true);
        // back through one of this room's doors (from the workshop, off the roof): out of that door and back to their spot
        var a = Sky.takeArrival ? Sky.takeArrival() : null, door = a && sd.me ? sd.el.querySelector(a.via) : null;
        if (!door) return;
        sd.me.classList.add('gore-hidden');
        busy = true;                                         // (till they're in: a click meanwhile waits)
        H.through();
        setTimeout(function () {
            var at = (door.offsetLeft + door.offsetWidth / 2 - sd.me.offsetWidth / 2) / (sd.el.clientWidth || window.innerWidth) * 100;
            place(sd.me, at, at > sd.standAt);
            door.classList.add('open');
            setTimeout(function () {
                sfx(door.dataset.sound || 'door');
                sd.me.classList.remove('gore-hidden');
                H.land(sd.me, sd.standAt, function () { busy = false; sd.me.classList.remove('face-left'); });
                setTimeout(function () { door.classList.remove('open'); }, 700);
            }, 350);
        }, 450);
    });
    H.tabs();
    // only now can the rooms slide (had it been on from the start, they'd have slid out from the middle as the page loaded)
    requestAnimationFrame(function () { requestAnimationFrame(function () { body.classList.add('sides-ready'); }); });
    // a door in a side room: walk up to it, it opens, and through you go
    Array.prototype.forEach.call(document.querySelectorAll('.side-door[href]'), function (door) {
        // your own door art can have an -open twin (hall-door-roof-open.png): it's swapped in as it opens
        if (door.dataset.asset) Sky.findAsset(door.dataset.asset + '-open', function (url) { if (url) { door.dataset.openArt = url; door.classList.add('has-open'); } });
        door.addEventListener('click', function (e) {
            e.preventDefault();
            H.ask(function () { throughDoor(door); });
        });
    });
    function throughDoor(door) {
        var sd = SIDES.filter(function (x) { return x.el.contains(door); })[0], href = door.getAttribute('href');
        if (busy || (sd && H.where() !== sd.name)) return;
        busy = true;
        function open() {
            H.through();
            door.classList.add('open');
            var img = door.querySelector('img.art');
            if (img && door.dataset.openArt) { door.dataset.shutArt = img.src; img.src = door.dataset.openArt; }
            sfx(door.dataset.sound || 'door');
            if (door.dataset.arriveVia && Sky.setArrival) Sky.setArrival(href, door.dataset.arriveVia);   // they walk in from there on the next page
            setTimeout(function () { if (sd && sd.me) sd.me.classList.add('gore-hidden'); }, 450);
            setTimeout(function () { busy = false; Sky.leave ? Sky.leave(href) : (location.href = href); }, 700);
        }
        if (sd && sd.me) {
            var p = door.offsetParent || sd.el, at = (door.offsetLeft + door.offsetWidth / 2 - sd.me.offsetWidth / 2) / p.clientWidth * 100;
            H.setOff(function () { stop(sd.me); busy = false; });
            walk(sd.me, at, open);
        } else open();
    }
    window.addEventListener('pageshow', function (e) {         // back with the browser's back button: the doors are shut again
        if (!e.persisted) return;
        busy = false;
        H.drop();
        Array.prototype.forEach.call(document.querySelectorAll('.side-door.open'), function (d) {
            d.classList.remove('open');
            var img = d.querySelector('img.art');
            if (img && d.dataset.shutArt) img.src = d.dataset.shutArt;
        });
        SIDES.forEach(function (sd) { if (sd.me) { sd.me.classList.remove('gore-hidden'); place(sd.me, sd.standAt); } });
    });
    Sky.sides = { get inSide() { return inSide && inSide.name; }, get busy() { return H.busy; }, goNow: goNow,
                  get me() { return home; },
                  // someone else pulls the book (sky/claubes.js: the robed Claubes): the wall grinds open. false while it can't
                  // (reset 4's book is missing until the pact); true if it's open, or opening
                  pullBook: function () {
                      if (!secret || bookGone() || inSide) return false;
                      if (!secret.classList.contains('open')) grindOpen();
                      return true;
                  },
                  get bookGone() { return bookGone(); },
                  get book() { return theBook; }, get wall() { return secret; } };

    /* ---------------- the mirror ---------------- */
    if (!mirror) return;
    var words = mirror.dataset.say || "Despite everything, it's still you.";
    mirror.setAttribute('role', 'button');
    mirror.setAttribute('tabindex', '0');
    mirror.setAttribute('aria-label', 'look in the mirror');
    var hint = document.createElement('span');
    hint.className = 'bm-hint';
    hint.textContent = 'the mirror';
    mirror.appendChild(hint);

    // your reflection: the traveller, a little softer (until assets/characters/reflection)
    var REFLECTION = '<svg class="placeholder" viewBox="4 16 52 104" aria-hidden="true" style="opacity:.92">' +
        '<path d="M8 40 Q30 32 52 40 L50 44 Q30 38 10 44 Z" fill="#3a2716"/>' +
        '<path d="M17 40 Q18 22 30 21 Q42 22 43 40 Z" fill="#3a2716"/>' +
        '<circle cx="30" cy="50" r="9" fill="#f0dfbd"/>' +
        '<path d="M16 62 Q30 56 44 62 L48 120 L12 120 Z" fill="#9a3b1f"/>' +
        '<path d="M29 62 L31 62 L31 120 L29 120 Z" fill="#6e2a16"/></svg>';

    var view = document.createElement('div');
    view.className = 'mirror-view';
    view.setAttribute('role', 'dialog');
    view.setAttribute('aria-label', 'the mirror');
    view.innerHTML = '<div class="mv-mirror"><div class="mv-glass"><div class="mv-reflection" data-asset="assets/characters/reflection">' + REFLECTION + '</div></div></div>' +
        '<div class="mv-text"><span class="mv-words"></span><span class="mv-more" aria-hidden="true">&#9660;</span></div>';
    body.appendChild(view);
    Sky.fillAssets(view);
    Sky.findAsset('assets/living/mirror-close', function (url) {
        if (!url) return;
        var f = document.createElement('img');
        f.className = 'mv-frame'; f.src = url; f.alt = '';
        view.querySelector('.mv-mirror').appendChild(f);
        view.classList.add('has-frame');
    });

    // the lettering: your font if there is one, otherwise a pixel font (fetched only when you first look)
    var fontReady = false;
    function loadFont() {
        if (fontReady) return;
        fontReady = true;
        Sky.findAsset('assets/fonts/mirror.woff2|assets/fonts/mirror.woff|assets/fonts/mirror.ttf|assets/fonts/mirror.otf', function (url) {
            if (url) { Sky.css('@font-face { font-family: "mirror"; src: url("' + url + '"); font-display: swap; }'); return; }
            var l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = 'https://fonts.googleapis.com/css2?family=VT323&display=swap';
            document.head.appendChild(l);
        });
    }
    mirror.addEventListener('pointerenter', loadFont);

    var typing = null, shown = 0;
    function typeOut() {
        if (!view.classList.contains('open')) return;
        view.querySelector('.mv-words').textContent = '';
        shown = 0;
        view.classList.remove('done');
        clearTimeout(typing);
        tick();
    }
    function tick() {                    // one letter at a time, with a pause after a comma or a full stop
        shown++;
        view.querySelector('.mv-words').textContent = words.slice(0, shown);
        var ch = words.charAt(shown - 1);
        if (/\S/.test(ch) && shown % 2 && Sky.sounds) Sky.sounds.sfx('blip');
        if (shown >= words.length) return finish();
        typing = setTimeout(tick, ch === ',' ? 320 : /[.!?]/.test(ch) ? 200 : 55);
    }
    function finish() {
        clearTimeout(typing);
        view.querySelector('.mv-words').textContent = words;
        shown = words.length;
        view.classList.add('done');
    }
    function look() {
        if (!body.classList.contains('in-bath') || body.classList.contains('bath-panning')) return;
        loadFont();
        view.classList.add('open');
        body.classList.add('mirror-open');
        Sky.sfx('shimmer');
        setTimeout(typeOut, 650);
    }
    function lookAway() {
        clearTimeout(typing);
        view.classList.remove('open', 'done');
        body.classList.remove('mirror-open');
    }
    // a click while it's typing shows the rest; once it's all there, a click steps away
    function next() { if (!view.classList.contains('open')) return; if (shown < words.length) finish(); else lookAway(); }
    mirror.addEventListener('click', look);
    mirror.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); look(); } });
    view.addEventListener('click', next);
    Sky.escape(function () { return view.classList.contains('open'); }, lookAway);
    document.addEventListener('keydown', function (e) {
        if (!view.classList.contains('open')) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') { e.preventDefault(); next(); }
    });
})();

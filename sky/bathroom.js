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

    var ARROW = '<svg class="placeholder" viewBox="0 0 60 60" aria-hidden="true">' +
        '<circle cx="30" cy="30" r="27" fill="rgba(243,230,194,.16)" stroke="rgba(243,230,194,.55)" stroke-width="2"/>' +
        '<path d="M22 16 L38 30 L22 44" fill="none" stroke="#f3e6c2" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    Array.prototype.forEach.call(document.querySelectorAll('.room-arrow'), function (a) { if (!a.querySelector('.placeholder, img')) a.insertAdjacentHTML('afterbegin', ARROW); });
    // door hints: the words on hover
    Array.prototype.forEach.call(document.querySelectorAll('.side-door[data-hint]'), function (d) {
        var h = document.createElement('span'); h.className = 'door-hint'; h.textContent = d.dataset.hint; d.appendChild(h);
    });

    // (its look is in sky/css/bathroom.css, linked from each page's head)

    /* ---------------- the arrows sit just under the tabs (the hallway's on the left) ---------------- */
    function placeArrows() {
        var tabs = document.querySelector('.place-tabs');
        if (!tabs) return;
        var r = tabs.getBoundingClientRect(), h = go.offsetHeight || 54;
        var top = r.bottom + 18;
        if (top + h > window.innerHeight - 12) top = r.top - h - 14;      // no room below (small screens): just above
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

    /* ---------------- walking ---------------- */
    function leftPct(el) {
        var p = el.offsetParent || el.parentNode;
        return parseFloat(getComputedStyle(el).left) / (p.clientWidth || window.innerWidth) * 100;
    }
    function walkSecs(el, to) {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 0.01;
        var W = window.innerWidth, px = Math.abs(to - leftPct(el)) / 100 * W, speed = Math.max(260, W * 0.3);   // px a second
        return Math.max(0.3, Math.min(2.2, px / speed));
    }
    function walk(el, to, done) {
        halt(el);                                            // (already walking somewhere: this walk takes over, from where they are)
        var from = leftPct(el), secs = walkSecs(el, to), id = el._walk;
        el.classList.toggle('face-left', to < from);
        el.classList.add('walking');
        el.classList.remove('talking');
        el.style.transitionDuration = secs + 's';
        void el.offsetWidth;
        el.style.left = to + '%';
        el._steps = setInterval(function () { if (Sky.sounds) Sky.sounds.sfx('step', { size: 0.5 + Math.random() * 0.3 }); }, 380);
        el._walkT = setTimeout(function () {
            if (el._walk !== id) return;
            clearInterval(el._steps);
            el.classList.remove('walking');
            el.style.transitionDuration = '0s';
            if (done) done();
        }, secs * 1000 + 30);
    }
    // the walk under way is forgotten (its "done" never comes)
    function halt(el) {
        el._walk = (el._walk || 0) + 1;
        clearInterval(el._steps); clearTimeout(el._walkT);
        var cut = el._cut; el._cut = null;
        if (cut) cut();
    }
    // they stop where they are, mid-stride
    function stop(el) {
        if (!el) return;
        var at = leftPct(el);                                // (mid-walk, this is where they've got to)
        halt(el);
        el.classList.remove('walking');
        el.style.transitionDuration = '0s';
        el.style.left = at + '%';
        void el.offsetWidth;
    }
    function place(el, at, faceLeft) {
        halt(el);
        el.classList.remove('walking');
        el.style.transitionDuration = '0s';
        el.style.left = at + '%';
        el.classList.toggle('face-left', !!faceLeft);
        void el.offsetWidth;
    }

    /* ---------------- a trip from room to room, and changing your mind on the way ----------------
       (27 Sep, Victor: clicking one way out while the traveller was still walking to another left them in both rooms.)
       each way out has two parts. the walk to it: another click cuts it short, and they stop, turn and head for the
       new one from where they are. and the going through (the rooms sliding, the ladder, the front door): that can't
       be stopped, so a click then waits, and once they're through they go straight on to it, without stopping.
       the arrows stay while they walk (so they can be clicked), and hide while the rooms slide (body.side-sliding).
       the other rooms' scripts (kitchen.js, porch.js, attic.js, front.js) use these too, through Sky.sides. */
    var trip = null, queued = null;
    function setTrip(t) { trip = t; body.classList.toggle('side-sliding', !!(t && t.going)); }
    // on the way to a way out: cancel() puts things back as they were, with them standing where they've got to
    function setOff(cancel) { setTrip({ cancel: cancel }); }
    // through it: no stopping now
    function through() { setTrip({ going: true }); }
    // every way somewhere goes through here: whatever they were walking to is dropped, and this is done instead
    // (or, while they're going through, done as soon as they're through)
    function ask(fn) {
        if (trip && trip.going) { queued = fn; return; }
        queued = null;
        var t = trip; setTrip(null);
        if (t && t.cancel) t.cancel();
        fn();
    }
    // through, into the new room: straight on to whatever was asked for meanwhile, or the walk in to their spot
    // (which another click can cut short too). settle(): how things are once they're in
    function land(el, to, settle) {
        setTrip(null);
        var settled = false, t;
        var once = function () {
            if (settled) return;
            settled = true;
            if (el && el._cut === once) el._cut = null;
            if (trip === t) setTrip(null);
            settle();
        };
        if (queued) { var q = queued; queued = null; once(); q(); return; }
        if (!el) { once(); return; }
        t = { cancel: function () { stop(el); once(); } };
        setTrip(t);
        walk(el, to, once);
        el._cut = once;                                      // (anything else walking them off: they're in, all the same)
    }
    // where they are, and the way from there to anywhere: the rooms are a tree, the living space at the top
    var UP = { bath: 'living', hall: 'living', dungeon: 'living', kitchen: 'hall', porch: 'hall', attic: 'hall' };
    function where() {
        if (Sky.front && Sky.front.here) return 'front';
        if (Sky.kitchen && Sky.kitchen.inside) return 'kitchen';
        if (Sky.porch && Sky.porch.outside) return 'porch';
        if (Sky.attic && Sky.attic.up && Sky.attic.up()) return 'attic';
        return inSide ? inSide.name : 'living';
    }
    function toward(from, to) {
        for (var x = to; x; x = UP[x]) if (UP[x] === from) return x;          // it's through a way out of here
        return UP[from];                                                    // or back up, first
    }
    function nav(to) {
        var from = where();
        if (from === to) return;
        if (from === 'front') {                                             // (the garden: the front door, or it's left behind)
            if (to === 'hall') { if (Sky.front.goIn) Sky.front.goIn(); return; }
            Sky.front.close(to === 'living');
            if (to !== 'living') { goNow('hall'); nav(to); }
            return;
        }
        var step = toward(from, to);
        if (!step) return;
        if (UP[from] === step) {
            if (from === 'kitchen') Sky.kitchen.out(false);
            else if (from === 'porch') Sky.porch.in(false);
            else if (from === 'attic') Sky.attic.climbDown(false);
            else goHome();
        } else if (step === 'kitchen') Sky.kitchen.goIn();
        else if (step === 'porch') Sky.porch.out();
        else if (step === 'attic') { if (Sky.attic.climbUp) Sky.attic.climbUp(); }
        else { var sd = SIDES.filter(function (x) { return x.name === step; })[0]; if (sd) goTo(sd); }
        if (trip && step !== to) queued = function () { nav(to); };          // (and on from there, once they're through)
    }

    /* ---------------- the rooms either side: the bathroom (right) and the hallway (left) ----------------
       the traveller walks off that edge, the living space slides away and the other room slides in;
       they walk in from the edge you'd expect. living.html#bathroom / #hallway starts you in there. */
    var SIDES = [
        { name: 'bath', el: bath, go: go, dir: 1, hash: '#bathroom' },
        { name: 'hall', el: document.querySelector('.hallway'), go: document.querySelector('.room-arrow.to-hall'), dir: -1, hash: '#hallway' },
        // the dungeon is underneath: pull the loose book on the bookshelf and down you go (dir 0: up and down, not sideways)
        { name: 'dungeon', el: document.querySelector('.dungeon'), go: document.querySelector('.shelf-book:not(.decoy)'), dir: 0, hash: '#dungeon', enterAt: 9 }
    ].filter(function (sd) { return sd.el && sd.go; });
    // the living space's tab only counts as "you are here" in the living space itself (and the bathroom),
    // not out in the hallway or down in the dungeon: from there, it takes you back in
    var livingTab = document.querySelector('.place-tab[data-place=living]');
    function tabHere(on) {
        if (!livingTab) return;
        livingTab.classList.toggle('here', on);
        if (on) livingTab.setAttribute('aria-current', 'page'); else livingTab.removeAttribute('aria-current');
        livingTab.setAttribute('role', on ? 'text' : 'link');
        livingTab.tabIndex = on ? -1 : 0;
        var nm = livingTab.querySelector('.pt-name');
        if (nm) nm.textContent = nm.textContent.replace(/ · you are here$/, '') + (on ? ' · you are here' : '');
    }
    if (livingTab) {
        livingTab.addEventListener('click', function (e) { if (inSide && inSide.name !== 'bath') { e.preventDefault(); ask(function () { nav('living'); }); } });
        livingTab.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && inSide && inSide.name !== 'bath') { e.preventDefault(); ask(function () { nav('living'); }); } });
    }
    var homeAt = home ? leftPct(home) : 34, busy = false, inSide = null;
    // reset 4: the book that opens the dungeon isn't on the shelf, until the grimoire's pact is made in the attic
    // (sky/attic.js, sky/hell.js). the way down's shut while it's gone: no book, no wall opening, no #dungeon
    var DS = window.davSave;
    function bookGone() { return !!DS && DS.reset === 4 && DS.get('grimoire-pact') !== '1'; }
    // and after the pact, the book won't open it till the inverted record's been put on and the robed Claubes are out
    // (27 Sep, Victor: so nobody goes down without summoning them). the record player glows red meanwhile (sky/records.js)
    function recordFirst() { return !!DS && DS.reset === 4 && DS.get('grimoire-pact') === '1' && DS.get('claubes-robed') !== '1'; }
    var NOT_YET = ['It won\u2019t budge. Not by my hand, not yet.', 'The record player\u2026 something in it is waiting to be played.'];
    var tugging = false;
    function tugInVain(book) {
        if (tugging || busy || inSide) return;
        tugging = true;
        var from = home ? leftPct(home) : 0, at = home ? bookAt() : 0;
        if (Math.abs(from - at) < 8) from = at - 9;                      // (then back out of the way, so the book can be clicked again)
        var say = function () {
            if (home) home.classList.remove('face-left');
            book.classList.add('pulled');
            if (Sky.sounds) Sky.sounds.sfx('book', { volume: 0.5 });
            setTimeout(function () { book.classList.remove('pulled'); }, 450);
            setTimeout(function () { if (home && !inSide && !busy && !trip) walk(home, from); }, 900);
            var done = function () { tugging = false; };
            if (Sky.claubes && Sky.claubes.speak) Sky.claubes.speak(NOT_YET, done); else setTimeout(done, 1500);
        };
        if (!home) { say(); return; }
        setOff(function () { stop(home); tugging = false; });              // (off somewhere else instead, on the way to the shelf)
        walk(home, bookAt(), function () { setTrip(null); say(); });
    }
    var theBook = document.querySelector('.shelf-book:not(.decoy)');
    if (theBook && bookGone()) theBook.classList.add('missing');
    // (its look is in sky/css/bathroom.css, linked from each page's head)
    SIDES.forEach(function (sd) {
        sd.me = sd.el.querySelector('.character');
        sd.back = sd.el.querySelector('.room-arrow');
        sd.standAt = sd.me ? leftPct(sd.me) : 40;
    });
    var OFF = { '1': 104, '-1': -14 };                       // just past the right / left edge
    var secret = document.querySelector('.secret-door');
    function doorAt() { return (secret.offsetLeft + secret.offsetWidth / 2 - home.offsetWidth / 2) / (room.clientWidth || window.innerWidth) * 100; }
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
    // the book pulled again, with the wall open: it grinds shut
    function pullShut(sd) {
        if (busy || inSide) return;
        busy = true;
        body.classList.add('side-walking');
        var from = home ? leftPct(home) : 0, at = bookAt();
        if (Math.abs(from - at) < 8) from = at - 9;                      // (and then out of the way of the book, so it can be pulled again)
        var shut = function () {
            through();
            if (home) home.classList.remove('face-left');
            sd.go.classList.add('pulled');
            if (Sky.sounds) Sky.sounds.sfx('book');
            setTimeout(function () { room.classList.add('rumble'); closeDoor(); if (Sky.sounds) Sky.sounds.sfx('wall-slide'); }, 500);
            setTimeout(function () {
                room.classList.remove('rumble'); sd.go.classList.remove('pulled');
                land(home, from, function () { busy = false; body.classList.remove('side-walking'); });
            }, 2900);
        };
        setOff(function () { stop(home); busy = false; body.classList.remove('side-walking'); });
        if (home) walk(home, at, shut); else shut();
    }
    try { if (!bookGone() && !recordFirst() && (sessionStorage.getItem('secret-open') === '1' || location.hash === '#dungeon')) openDoor(true); } catch (e) {}
    function bookAt() { return (sd0().go.offsetLeft + sd0().go.offsetWidth / 2 - home.offsetWidth / 2) / (room.clientWidth || window.innerWidth) * 100; }
    function sd0() { return SIDES.filter(function (x) { return x.dir === 0; })[0]; }
    function goTo(sd, instant) {
        if (busy || inSide) return;
        if (sd.dir === 0 && (bookGone() || recordFirst())) return;
        busy = true; inSide = sd;
        body.classList.add('side-walking');
        var h = home ? leftPct(home) : homeAt;
        if (h > 2 && h < 92) homeAt = h;                     // (where they'll come back to: not the edge, when they only passed through)
        if (sd.name !== 'bath') tabHere(false);
        var timer = null;
        // somewhere else instead, on the way: they stop where they've got to, still in here
        function turnBack() {
            clearTimeout(timer);
            if (home) { stop(home); home.classList.remove('descending'); }
            busy = false; inSide = null;
            body.classList.remove('side-walking');
            tabHere(true);
        }
        function slide() {
            if (!instant) through();
            sd.el.setAttribute('aria-hidden', 'false');
            if (sd.me) place(sd.me, sd.dir > 0 ? 2 : sd.dir < 0 ? 90 : sd.enterAt, sd.dir < 0);       // in from the edge (or the stairs) you came through
            body.classList.add(sd.name + '-panning', 'in-' + sd.name, 'in-side');
            fire('enter', sd);
            var arrive = function () { busy = false; body.classList.remove('side-walking'); if (sd.me) sd.me.classList.remove('face-left'); };
            if (instant) { arrive(); setTimeout(function () { body.classList.remove(sd.name + '-panning'); }, 0); }
            else setTimeout(function () {
                body.classList.remove(sd.name + '-panning');
                land(sd.me, sd.standAt, arrive);
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
                setOff(turnBack);
                walk(home, doorAt(), function () {
                    through();
                    home.classList.remove('face-left');
                    home.classList.add('descending');
                    if (Sky.sounds) Sky.sounds.sfx('step', { size: 0.4 });
                    setTimeout(function () { slide(); setTimeout(function () { home.classList.remove('descending'); }, 1200); }, 800);
                });
            };
            if (secret && secret.classList.contains('open')) { down(); return; }
            // first, over to the bookshelf and pull the book: the wall under the paintings grinds open
            setOff(turnBack);
            walk(home, bookAt(), function () {
                through();
                home.classList.remove('face-left');
                sd.go.classList.add('pulled');
                if (Sky.sounds) Sky.sounds.sfx('book');
                setTimeout(function () { room.classList.add('rumble'); openDoor(); if (Sky.sounds) Sky.sounds.sfx('wall-slide'); }, 500);
                setTimeout(function () { room.classList.remove('rumble'); sd.go.classList.remove('pulled'); }, 2900);
                setTimeout(down, secret ? 3300 : 0);
            });
            return;
        }
        var secs = walkSecs(home, OFF[sd.dir]);
        setOff(turnBack);
        walk(home, OFF[sd.dir]);                             // off the edge; the room slides as they reach it
        timer = setTimeout(slide, secs * 700);
    }
    function goHome() {
        var sd = inSide;
        if (busy || !sd) return;
        busy = true;
        body.classList.add('side-walking');
        var timer = null, walker = sd.me && !sd.me.classList.contains('gore-hidden') ? sd.me : null;
        function slide() {
            through();
            if (home) place(home, sd.dir > 0 ? 98 : sd.dir < 0 ? -6 : (secret ? doorAt() : bookAt()), sd.dir > 0);
            if (sd.dir === 0) { sd.go.classList.remove('pulled'); if (home && secret) { home.classList.add('ascending'); setTimeout(function () { home.classList.remove('ascending'); }, 1900); } }
            body.classList.add(sd.name + '-panning');
            body.classList.remove('in-' + sd.name, 'in-side');
            sd.el.setAttribute('aria-hidden', 'true');
            inSide = null;
            tabHere(true);
            fire('leave', sd);
            try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
            setTimeout(function () {
                body.classList.remove(sd.name + '-panning');
                land(home, homeAt, function () { busy = false; body.classList.remove('side-walking'); if (home) home.classList.remove('face-left'); });
            }, 900);
        }
        if (!walker) { slide(); return; }
        // (somewhere else instead, on the way out: they stop where they've got to)
        setOff(function () { clearTimeout(timer); stop(walker); busy = false; body.classList.remove('side-walking'); });
        if (sd.dir === 0) { walk(walker, sd.enterAt, slide); return; }    // back to the foot of the stairs, then up
        var secs = walkSecs(walker, OFF[-sd.dir]);
        walk(walker, OFF[-sd.dir]);
        timer = setTimeout(slide, secs * 700);
    }
    function goNow(name) { var sd = SIDES.filter(function (x) { return x.name === name; })[0]; if (sd && !inSide) goTo(sd, true); }
    if (secret) {
        var viaDoor = function (e) { if (!secret.classList.contains('open')) return; e.preventDefault(); ask(function () { nav('dungeon'); }); };
        secret.addEventListener('click', viaDoor);
        secret.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') viaDoor(e); });
    }
    var hooks = [];
    function fire(what, sd) { hooks.forEach(function (fn) { try { fn(what, sd.name); } catch (e) {} }); }
    SIDES.forEach(function (sd) {
        sd.go.addEventListener('click', function (e) {
            e.preventDefault();
            ask(function () {
                if (sd.dir !== 0) return nav(sd.name);
                if (where() !== 'living') return;                        // (the bookshelf's in the living space)
                if (recordFirst()) return tugInVain(sd.go);
                if (secret && secret.classList.contains('open')) pullShut(sd); else nav(sd.name);
            });
        });
        var back = function () { ask(function () { nav('living'); }); };
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
        setTimeout(function () {
            busy = true;
            var at = (door.offsetLeft + door.offsetWidth / 2 - sd.me.offsetWidth / 2) / (sd.el.clientWidth || window.innerWidth) * 100;
            place(sd.me, at, at > sd.standAt);
            door.classList.add('open');
            setTimeout(function () {
                if (Sky.sounds) Sky.sounds.sfx(door.dataset.sound || 'door');
                sd.me.classList.remove('gore-hidden');
                land(sd.me, sd.standAt, function () { busy = false; sd.me.classList.remove('face-left'); });
                setTimeout(function () { door.classList.remove('open'); }, 700);
            }, 350);
        }, 450);
    });
    // only now can the rooms slide (had it been on from the start, they'd have slid out from the middle as the page loaded)
    requestAnimationFrame(function () { requestAnimationFrame(function () { body.classList.add('sides-ready'); }); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && inSide && !body.classList.contains('mirror-open') && !body.classList.contains('inv-holding')) ask(function () { nav('living'); });
    });
    // a door in a side room: walk up to it, it opens, and through you go
    Array.prototype.forEach.call(document.querySelectorAll('.side-door[href]'), function (door) {
        // your own door art can have an -open twin (hall-door-roof-open.png): it's swapped in as it opens
        if (door.dataset.asset) Sky.findAsset(door.dataset.asset + '-open', function (url) { if (url) { door.dataset.openArt = url; door.classList.add('has-open'); } });
        door.addEventListener('click', function (e) {
            e.preventDefault();
            ask(function () { throughDoor(door); });
        });
    });
    function throughDoor(door) {
        var sd = SIDES.filter(function (x) { return x.el.contains(door); })[0], href = door.getAttribute('href');
        if (busy || (sd && where() !== sd.name)) return;
        busy = true;
        function open() {
            through();
            door.classList.add('open');
            var img = door.querySelector('img.art');
            if (img && door.dataset.openArt) { door.dataset.shutArt = img.src; img.src = door.dataset.openArt; }
            if (Sky.sounds) Sky.sounds.sfx(door.dataset.sound || 'door');
            if (door.dataset.arriveVia && Sky.setArrival) Sky.setArrival(href, door.dataset.arriveVia);   // they walk in from there on the next page
            setTimeout(function () { if (sd && sd.me) sd.me.classList.add('gore-hidden'); }, 450);
            setTimeout(function () { busy = false; Sky.leave ? Sky.leave(href) : (location.href = href); }, 700);
        }
        if (sd && sd.me) {
            var p = door.offsetParent || sd.el, at = (door.offsetLeft + door.offsetWidth / 2 - sd.me.offsetWidth / 2) / p.clientWidth * 100;
            setOff(function () { stop(sd.me); busy = false; });
            walk(sd.me, at, open);
        } else open();
    }
    window.addEventListener('pageshow', function (e) {         // back with the browser's back button: the doors are shut again
        if (!e.persisted) return;
        busy = false;
        setTrip(null); queued = null;
        Array.prototype.forEach.call(document.querySelectorAll('.side-door.open'), function (d) {
            d.classList.remove('open');
            var img = d.querySelector('img.art');
            if (img && d.dataset.shutArt) img.src = d.dataset.shutArt;
        });
        SIDES.forEach(function (sd) { if (sd.me) { sd.me.classList.remove('gore-hidden'); place(sd.me, sd.standAt); } });
    });
    // straight back to the living space, no walking and no sliding (for when the screen's black anyway)
    function homeNow() {
        var sd = inSide;
        if (!sd) return;
        setTrip(null); queued = null;
        sd.el.style.transition = room.style.transition = 'none';
        body.classList.remove('in-' + sd.name, 'in-side', sd.name + '-panning', 'side-walking');
        sd.el.setAttribute('aria-hidden', 'true');
        inSide = null; busy = false;
        tabHere(true);
        fire('leave', sd);
        if (sd.dir === 0) sd.go.classList.remove('pulled');
        if (sd.me) sd.me.classList.remove('gore-hidden');
        if (home) { home.classList.remove('descending', 'ascending', 'walking', 'gore-hidden'); home.style.transform = ''; place(home, homeAt, false); }
        try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
        void room.offsetWidth;
        setTimeout(function () { sd.el.style.transition = room.style.transition = ''; }, 60);
    }
    Sky.sides = { get inSide() { return inSide && inSide.name; }, get busy() { return busy; }, walk: walk, place: place, leftPct: leftPct,
                  on: function (fn) { hooks.push(fn); if (inSide) fn('enter', inSide.name); }, home: goHome, homeNow: homeNow, goNow: goNow,
                  // the trip from room to room (see "a trip from room to room" above): the other rooms' scripts use these
                  ask: ask, nav: nav, where: where, setOff: setOff, through: through, land: land, stop: stop, walkSecs: walkSecs,
                  get going() { return !!trip; },
                  get me() { return home; },
                  // someone else pulls the book (sky/claubes.js: the robed Claubes): the wall grinds open. false while it can't
                  // (reset 4's book is missing until the pact); true if it's open, or opening
                  pullBook: function () {
                      if (!secret || bookGone() || inSide) return false;
                      if (secret.classList.contains('open')) return true;
                      theBook.classList.add('pulled');
                      if (Sky.sounds) Sky.sounds.sfx('book');
                      setTimeout(function () { room.classList.add('rumble'); openDoor(); if (Sky.sounds) Sky.sounds.sfx('wall-slide'); }, 500);
                      setTimeout(function () { room.classList.remove('rumble'); theBook.classList.remove('pulled'); }, 2900);
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
        if (Sky.sounds) Sky.sounds.sfx('shimmer');
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
    document.addEventListener('keydown', function (e) {
        if (!view.classList.contains('open')) return;
        if (e.key === 'Escape') lookAway();
        else if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') { e.preventDefault(); next(); }
    });
})();

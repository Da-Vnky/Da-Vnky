/* =====================================================================
   house.js — the house (living.html): its rooms, and the traveller
   walking between them.

   The rooms are a tree, the living space at the top:
       living ─ bath, hall, dungeon           (sky/bathroom.js)
       hall   ─ kitchen (kitchen.js), porch (porch.js), attic (attic.js), front (front.js: the garden, outside)
   Each room's own script says how to get in and out of it:
       Sky.house.room('kitchen', { parent: 'hall', here: fn, enter: fn, leave: fn })
   and every way of going somewhere (the arrows, doors, the ladder, the place tabs, Escape) is just
       Sky.house.go('kitchen')
   which works out the way there from wherever the traveller is (bath → living → hall → kitchen), one room at a time.

   Changing your mind on the way (27 Sep, Victor): each way out has two parts. The walk to it: another click cuts it
   short, and they stop, turn and head for the new place from where they are. And the going through (the rooms
   sliding, the ladder, the front door): that can't be stopped, so a click then waits, and once they're through they
   carry straight on to it without stopping. The arrows stay while they walk (so they can be clicked) and hide while
   the rooms slide (body.side-sliding, sky/css/bathroom.css).

   A room's enter/leave is one "leg" of a trip, and uses these:
       setOff(cancel)        they've started walking to a way out; cancel() puts things back, with them standing where they got to
       through()             they're going through it: no stopping now
       land(el, to, settle)  they're through: they walk in to their spot (itself cancellable), or straight on to what was asked
                             for meanwhile. settle() sets things as they are once they're in
   and fire('enter' / 'leave', name) as the rooms slide, for whoever wants to know (on(fn): the marker, the Claubes …).
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.house) return;
    var body = document.body;

    /* ---------------- walking ---------------- */
    function leftPct(el) {
        var p = el.offsetParent || el.parentNode;
        return parseFloat(getComputedStyle(el).left) / (p.clientWidth || window.innerWidth) * 100;
    }
    // where something is, across a host (% of its width, from its middle)
    function pctOf(el, host) {
        var r = el.getBoundingClientRect(), hr = host ? host.getBoundingClientRect() : { left: 0, width: window.innerWidth };
        return (r.left + r.width / 2 - hr.left) / (hr.width || window.innerWidth) * 100;
    }
    // the left (%) a character stands at to be centred on x (%)
    function standAt(ch, x) { return x - (ch.offsetWidth / 2) / (ch.parentNode.clientWidth || window.innerWidth) * 100; }
    function walkSecs(el, to) {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 0.01;
        var W = window.innerWidth, px = Math.abs(to - leftPct(el)) / 100 * W, speed = Math.max(260, W * 0.3);   // px a second
        return Math.max(0.3, Math.min(2.2, px / speed));
    }
    function walk(el, to, done) {
        halt(el);                                            // (already walking somewhere: this walk takes over, from where they are)
        if (typeof el.beforeWalk === 'function') el.beforeWalk();          // (sky/tub.js: out of the bath first)
        var from = leftPct(el), secs = walkSecs(el, to), id = el._walk;
        el.classList.toggle('face-left', to < from);
        el.classList.add('walking');
        el.classList.remove('talking');
        el.style.transitionDuration = secs + 's';
        void el.offsetWidth;
        el.style.left = to + '%';
        el._steps = setInterval(function () { Sky.sfx('step', { size: 0.5 + Math.random() * 0.3 }); }, 380);
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

    /* ---------------- a trip, and changing your mind on the way ---------------- */
    var trip = null, queued = null;
    function setTrip(t) { trip = t; body.classList.toggle('side-sliding', !!(t && t.going)); }
    function setOff(cancel) { setTrip({ cancel: cancel }); }
    function through() { setTrip({ going: true }); }
    // do fn instead of whatever they were walking to (or, while they're going through, as soon as they're through)
    function ask(fn) {
        if (trip && trip.going) { queued = fn; return; }
        queued = null;
        var t = trip; setTrip(null);
        if (t && t.cancel) t.cancel();
        fn();
    }
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
        t = { into: true, cancel: function () { stop(el); once(); } };
        setTrip(t);
        walk(el, to, once);
        el._cut = once;                                      // (anything else walking them off: they're in, all the same)
    }
    // (for a leg that ends without landing anywhere: through a door to another page)
    function drop() { setTrip(null); queued = null; }

    /* ---------------- the rooms ---------------- */
    var ROOMS = { living: { parent: null, here: function () { return true; } } };
    function room(name, spec) { ROOMS[name] = spec; }
    function depth(name) { var n = 0; for (var x = ROOMS[name]; x && x.parent; x = ROOMS[x.parent]) n++; return n; }
    // the room they're in: the deepest one that says so
    function where() {
        var best = 'living', d = 0;
        Object.keys(ROOMS).forEach(function (k) {
            var r = ROOMS[k], dk;
            if (k === 'living' || !r.here || !r.here()) return;
            if ((dk = depth(k)) > d) { best = k; d = dk; }
        });
        return best;
    }
    // the next room on the way from one to another: through a way out of here, or back up first
    function toward(from, to) {
        for (var x = to; x && ROOMS[x]; x = ROOMS[x].parent) if (ROOMS[x].parent === from) return x;
        return ROOMS[from] && ROOMS[from].parent;
    }
    function nav(to) {
        var from = where();
        if (from === to || !ROOMS[to]) return;
        if (ROOMS[from].away && ROOMS[from].away(to)) return;             // (the garden: its own way of leaving)
        var step = toward(from, to);
        if (!step) return;
        var leg = ROOMS[from].parent === step ? ROOMS[from].leave : ROOMS[step].enter;
        if (leg) leg();
        if (trip && step !== to) queued = function () { nav(to); };      // (and on from there, once they're through)
    }
    function go(to) { ask(function () { nav(to); }); }

    /* ---------------- who wants to know: a room entered or left (as it slides) ---------------- */
    var hooks = [];
    // (fn(what, name). added once a room's already been entered, say by living.html#dungeon: told so, straight away)
    function on(fn) {
        hooks.push(fn);
        var chain = [];
        for (var x = where(); x && x !== 'living'; x = ROOMS[x].parent) chain.unshift(x);
        chain.forEach(function (name) { try { fn('enter', name); } catch (e) {} });
    }
    function fire(what, name) {
        hooks.forEach(function (fn) { try { fn(what, name); } catch (e) {} });
        tabs();
    }

    /* ---------------- the place tabs for the house's rooms ----------------
       the living space's tab is "you are here" in the living space and the bathroom; the kitchen's in the kitchen.
       from anywhere else in the house, clicking one walks the traveller there */
    var TABS = { living: ['living', 'bath'], kitchen: ['kitchen'] };
    function tabs() {
        var w = where();
        Object.keys(TABS).forEach(function (id) {
            var t = document.querySelector('.place-tab[data-place=' + id + ']');
            if (!t) return;
            var on = TABS[id].indexOf(w) !== -1;
            t.classList.toggle('here', on);
            if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
            t.setAttribute('role', on ? 'text' : 'link');
            t.tabIndex = on ? -1 : 0;
            var nm = t.querySelector('.pt-name');
            if (nm) nm.textContent = nm.textContent.replace(/ · you are here$/, '') + (on ? ' · you are here' : '');
        });
    }
    function tabClick(e) {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        var t = e.target.closest && e.target.closest('.place-tab');
        var id = t && t.dataset.place;
        if (!id || !TABS[id]) return;
        e.preventDefault(); e.stopPropagation();
        if (TABS[id].indexOf(where()) !== -1 && (!trip || trip.into)) return;   // (here already, or walking in)
        go(id === 'living' ? 'living' : TABS[id][0]);
    }
    window.addEventListener('click', tabClick, true);
    window.addEventListener('keydown', tabClick, true);

    // Escape: back the way you came, one room (the garden: nowhere)
    Sky.escape(function () { var w = where(); return w !== 'living' && !ROOMS[w].away; }, function () { go(ROOMS[where()].parent); }, Sky.ESC.room);

    Sky.house = {
        room: room, where: where, go: go, nav: nav, ask: ask, on: on, fire: fire, tabs: tabs,
        setOff: setOff, through: through, land: land, drop: drop,
        walk: walk, stop: stop, place: place, leftPct: leftPct, walkSecs: walkSecs, pctOf: pctOf, standAt: standAt,
        get going() { return !!trip; },
        // walking or going somewhere, or one of the rooms busy with something of its own
        get busy() { return !!trip || Object.keys(ROOMS).some(function (k) { return ROOMS[k].busy && ROOMS[k].busy(); }); }
    };
})();

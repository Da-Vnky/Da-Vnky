/* =====================================================================
   inventory.js — the hotbar (bottom middle, every page): eight slots,
   numbered 1 to 8, like Minecraft's. Things you pick up go in the next
   free slot and stay with you from page to page for the rest of the visit:
     the marker (the workshop's bench), the revolver (the rooftop, and a
     toy one in the living space), a bottle of Mel's pills (her bathroom, in
     reset 3), and whatever turns up from the hidden loot (sky/loot.js).
   Click a slot, or press its number, to hold that thing (or, for the
   marker and anything else you switch on, to switch it on); press it
   again, or Esc, to put it away.

   Anything on a page with data-item can be picked up:
       <div class="furnish pickup" data-item="marker" data-asset="assets/workshop/marker"></div>

   For scripts: Sky.inventory.add / remove / has / hold / letGo / say / define,
   and onUse(fn): fn(item, clickEvent) is asked first when you click while
   holding something (return true if it dealt with it).

   slots: assets/ui/inventory (the little bag at the hotbar's left end),
          assets/ui/hotbar-slot (one slot's box, square; optional),
          assets/ui/cursor-reticle (the pointer while holding the revolver);
          each thing's own picture is its slot (assets/city/revolver, …)
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.inventory) return;
    var body = document.body;
    var SLOTS = 8;
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }

    // what can go in the bag: its name, its picture's slot, and a drawn stand-in
    // (toggle: clicking it switches it on and off rather than putting it in your hand;
    //  cursor: what the pointer turns into while you hold it: 'art' (the thing itself) or 'reticle')
    var ITEMS = {
        marker: { name: 'the marker', slot: 'assets/workshop/marker', toggle: true, hint: 'draw on anything. Esc to stop.',
            art: '<svg viewBox="0 0 100 30" aria-hidden="true"><rect x="10" y="6" width="62" height="18" rx="4" fill="#2a2a2e"/><rect x="72" y="8" width="16" height="14" rx="2" fill="#1a1a1c"/>' +
                 '<path d="M88 11 L98 15 L88 19 Z" fill="#111"/><rect x="18" y="10" width="36" height="10" rx="2" fill="#f3e6c2"/><text x="36" y="18" text-anchor="middle" font-size="7" font-family="Arial" font-weight="bold" fill="#2a2a2e">PERM</text></svg>' },
        // a bottle of Mel's pills, taken from her bathroom cabinet (reset 3). it goes where you go for the rest of the
        // visit, but it's only any use back in her room (schizophyllu.me.room/room/davinv.js brings this bag in there)
        pills: { name: 'a bottle of skizy\u2019s pills', label: 'a pill bottle', slot: 'assets/items/pills',
            hint: /schizophyllu\.me\.room/.test(location.pathname) ? 'give it to her: click skizy' : 'it rattles. it\u2019s for skizy.',
            art: '<svg viewBox="0 0 40 60" aria-hidden="true"><rect x="8" y="4" width="24" height="10" rx="2" fill="#f3f0e6" stroke="#9a968a"/>' +
                 '<rect x="6" y="14" width="28" height="42" rx="4" fill="#e0782a" opacity=".92"/><rect x="10" y="24" width="20" height="18" fill="#f8f4ea"/>' +
                 '<path d="M13 30 H27 M13 35 H24" stroke="#8a8a8a" stroke-width="1.6"/><path d="M10 18 V52" stroke="#f7b070" stroke-width="2" opacity=".6"/></svg>' },
        revolver: { name: 'the revolver', slot: 'assets/city/revolver', hint: 'aim and click. Esc to put it away.', cursor: 'reticle', keep: true,
            art: '<svg viewBox="0 0 100 60" aria-hidden="true"><path d="M8 14 H70 V26 H8 Z" fill="#4a4f57"/><rect x="4" y="15" width="6" height="10" fill="#2f3339"/>' +
                 '<rect x="46" y="12" width="26" height="22" rx="5" fill="#5b616a"/><circle cx="52" cy="23" r="2" fill="#2f3339"/><circle cx="60" cy="23" r="2" fill="#2f3339"/><circle cx="68" cy="23" r="2" fill="#2f3339"/>' +
                 '<path d="M66 30 L86 30 L94 56 L76 58 Z" fill="#6e4a30"/><path d="M58 32 Q60 44 70 42" fill="none" stroke="#2f3339" stroke-width="3"/><rect x="70" y="8" width="6" height="6" fill="#2f3339"/></svg>' },
        // reset 4 only: the white revolver, given back with the traveller after the pact (sky/hell.js, sky/revolver.js). it's for
        // the Claubes, the pictures round the false god, and the false god: it won't point at the traveller
        'white-revolver': { name: 'the white revolver', slot: 'assets/items/white-revolver', hint: 'aim and click. it\u2019s for them, not for you. Esc to put it away.', cursor: 'reticle', keep: true,
            art: '<svg viewBox="0 0 100 60" aria-hidden="true"><path d="M8 14 H70 V26 H8 Z" fill="#f4f1ea" stroke="#b9b2a2" stroke-width="1"/><rect x="4" y="15" width="6" height="10" fill="#d8d2c4"/>' +
                 '<rect x="46" y="12" width="26" height="22" rx="5" fill="#fbf9f4" stroke="#b9b2a2" stroke-width="1"/><circle cx="52" cy="23" r="2" fill="#8a1a14"/><circle cx="60" cy="23" r="2" fill="#8a1a14"/><circle cx="68" cy="23" r="2" fill="#8a1a14"/>' +
                 '<path d="M66 30 L86 30 L94 56 L76 58 Z" fill="#ebe5d8" stroke="#b9b2a2" stroke-width="1"/><path d="M79 38 L85 50" stroke="#8a1a14" stroke-width="1.4"/><path d="M58 32 Q60 44 70 42" fill="none" stroke="#c9c2b2" stroke-width="3"/><rect x="70" y="8" width="6" height="6" fill="#d8d2c4"/></svg>' }
    };
    var BAG = '<svg class="placeholder" viewBox="0 0 40 40" aria-hidden="true"><path d="M8 14 Q20 8 32 14 L35 34 Q20 40 5 34 Z" fill="#8a5a34"/><path d="M14 13 Q20 3 26 13" stroke="#5a3a24" stroke-width="3" fill="none"/>' +
        '<path d="M9 18 Q20 22 31 18" stroke="#5a3a24" stroke-width="2" fill="none"/><circle cx="20" cy="21" r="2.2" fill="#c49a52"/></svg>';
    var RETICLE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g fill="none" stroke-linecap="round">' +
        '<circle cx="20" cy="20" r="12" stroke="#fff" stroke-width="4" opacity=".65"/><circle cx="20" cy="20" r="12" stroke="#b3261e" stroke-width="2"/>' +
        '<path d="M20 2 V12 M20 28 V38 M2 20 H12 M28 20 H38" stroke="#fff" stroke-width="4" opacity=".65"/><path d="M20 2 V12 M20 28 V38 M2 20 H12 M28 20 H38" stroke="#b3261e" stroke-width="2"/></g>' +
        '<circle cx="20" cy="20" r="1.8" fill="#b3261e"/></svg>');

    // (its look is in sky/css/inventory.css, linked from each page's head)
    body.style.setProperty('--reticle', 'url("' + RETICLE + '")');
    Sky.findAsset('assets/ui/cursor-reticle', function (url) { if (url) body.style.setProperty('--reticle', 'url("' + new URL(url, location.href).href + '")'); });

    /* ---------------- the bag: eight slots ---------------- */
    var bag = [];
    try { bag = JSON.parse(sessionStorage.getItem('inventory') || '[]'); } catch (e) {}
    if (!Array.isArray(bag)) bag = [];
    function save() { try { sessionStorage.setItem('inventory', JSON.stringify(bag)); } catch (e) {} }
    var bar = document.createElement('div');
    bar.className = 'hotbar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'your things (keys 1 to 8)');
    var h = '<span class="hb-bag" data-asset="assets/ui/inventory">' + BAG + '</span>';
    for (var i = 0; i < SLOTS; i++) h += '<button type="button" class="hb-slot" data-n="' + i + '"></button>';
    bar.innerHTML = h;
    body.appendChild(bar);
    Sky.findAsset('assets/ui/hotbar-slot', function (url) { if (url) bar.style.setProperty('--slot-art', 'url("' + new URL(url, location.href).href + '")'); });
    var cursor = document.createElement('div');
    cursor.className = 'inv-cursor';
    body.appendChild(cursor);
    var note = document.createElement('div');
    note.className = 'inv-note';
    body.appendChild(note);
    function lookUp(id) {
        var it = ITEMS[id];
        if (!it || it.looked) return;
        it.looked = true;
        if (it.slot) Sky.findAsset(it.slot, function (url) { if (url) { it.art = '<img alt="" src="' + url + '">'; draw(); } });
    }
    Object.keys(ITEMS).forEach(lookUp);

    var holding = null, active = null, noteTimer = 0, useFns = [], toggleFns = {}, wearing = [];      // (wearing: things put on, which stay on whatever else you do)
    function say(t, ms) {
        note.textContent = t;
        note.classList.add('on');
        clearTimeout(noteTimer);
        noteTimer = setTimeout(function () { note.classList.remove('on'); }, ms || 2600);
    }
    function draw() {
        var known = bag.filter(function (id) { return ITEMS[id]; });
        bar.querySelectorAll('.hb-slot').forEach(function (b, n) {
            var id = known[n];
            b.dataset.item = id || '';
            b.innerHTML = '<span class="hb-num">' + (n + 1) + '</span>' + (id ? ITEMS[id].art + '<span class="hb-name">' + ITEMS[id].name + '</span>' : '');
            b.classList.toggle('on', !!id && (holding === id || active === id || wearing.indexOf(id) !== -1));
            b.setAttribute('aria-label', (n + 1) + ': ' + (id ? ITEMS[id].name : 'empty'));
            b.setAttribute('aria-pressed', String(!!id && (holding === id || active === id || wearing.indexOf(id) !== -1)));
        });
        bar.classList.toggle('has', known.length > 0);
        body.classList.toggle('hotbar-on', known.length > 0);
        document.querySelectorAll('.pickup[data-item]').forEach(function (p) { p.classList.toggle('taken', bag.indexOf(p.dataset.item) !== -1); });
    }
    bar.addEventListener('click', function (e) {
        var b = e.target.closest('.hb-slot');
        if (!b) return;
        e.stopPropagation();
        if (b.dataset.item) pick(b.dataset.item); else { letGo(); stopActive(); draw(); }
    });
    function pick(id, quiet) {
        if (!ITEMS[id] || bag.indexOf(id) === -1) return;
        if (ITEMS[id].wear) {                                       // something to wear: on or off, and nothing else changes
            var w = wearing.indexOf(id) === -1;
            if (w) wearing.push(id); else wearing.splice(wearing.indexOf(id), 1);
            (toggleFns[id] || []).forEach(function (fn) { fn(w); });
            if (w && ITEMS[id].hint && !quiet) say(ITEMS[id].hint, 3000);
            draw();
            return;
        }
        if (ITEMS[id].toggle) {                                     // the marker, the suit: on or off
            var on = active !== id;
            letGo();
            stopActive();
            active = on ? id : null;
            (toggleFns[id] || []).forEach(function (fn) { fn(on); });
            if (on && ITEMS[id].hint && !quiet) say(ITEMS[id].hint, 3000);
            draw();
            return;
        }
        if (holding === id) { letGo(); return; }
        stopActive();
        holding = id;
        var reticle = ITEMS[id].cursor === 'reticle';
        cursor.innerHTML = reticle ? '' : ITEMS[id].art;
        body.classList.add('inv-holding');
        body.classList.toggle('inv-reticle', reticle);
        body.dataset.holding = id;
        if (ITEMS[id].hint) say(ITEMS[id].hint, 3000);
        draw();
    }
    function stopActive() {
        if (!active) return;
        var id = active;
        active = null;
        (toggleFns[id] || []).forEach(function (fn) { fn(false); });
    }
    function letGo() {
        holding = null;
        body.classList.remove('inv-holding', 'inv-reticle');
        delete body.dataset.holding;
        draw();
    }
    function add(id, opts) {
        if (!ITEMS[id] || bag.indexOf(id) !== -1) return false;
        if (bag.filter(function (x) { return ITEMS[x]; }).length >= SLOTS) { say('your hands are full (eight things at most)'); return false; }
        bag.push(id); save();
        if (!(opts && opts.quiet)) { sfx('pickup'); say(ITEMS[id].name + ' is in slot ' + (bag.filter(function (x) { return ITEMS[x]; }).indexOf(id) + 1) + ' (press ' + (bag.filter(function (x) { return ITEMS[x]; }).indexOf(id) + 1) + ')'); }
        draw();
        return true;
    }
    function remove(id) {
        var i = bag.indexOf(id);
        if (i === -1) return;
        bag.splice(i, 1); save();
        if (holding === id) letGo();
        if (active === id) stopActive();
        if (wearing.indexOf(id) !== -1) { wearing.splice(wearing.indexOf(id), 1); (toggleFns[id] || []).forEach(function (fn) { fn(false); }); }
        draw();
    }
    // a new kind of thing (sky/loot.js adds the hidden ones)
    function define(id, def) {
        if (ITEMS[id]) return;
        ITEMS[id] = def;
        lookUp(id);
        draw();
        setupPickups();
    }
    document.addEventListener('pointermove', function (e) { if (holding) { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; } });
    // a click while holding something: whoever can use it there, gets it
    document.addEventListener('click', function (e) {
        if (!holding || bar.contains(e.target)) return;
        var id = holding;
        for (var i = 0; i < useFns.length; i++) {
            if (useFns[i](id, e)) { e.preventDefault(); e.stopPropagation(); return; }
        }
        if (!ITEMS[id].keep) letGo();                                // (the revolver stays in your hand until Esc)
    }, true);
    // Escape: the thing in your hand put away (or whatever's switched on, off)
    function putAway() { if (holding) letGo(); else { stopActive(); draw(); } }
    if (Sky.escape) Sky.escape(function () { return !!(holding || active); }, putAway, Sky.ESC.hand);
    else document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && (holding || active)) { e.stopImmediatePropagation(); putAway(); } }, true);   // (Mel's room: no sky.js)
    function typing(t) { return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable); }
    document.addEventListener('keydown', function (e) {
        // 1 … 8: that slot (not while typing, or in the painting desk, which has its own number keys)
        if (!/^[1-8]$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
        if (/\b(paint-open|mirror-open|records-open|crate-open|frame-open|paper-open|book-open)\b/.test(body.className)) return;
        var id = bag.filter(function (x) { return ITEMS[x]; })[+e.key - 1];
        if (id) pick(id); else { letGo(); stopActive(); draw(); }
    }, true);

    // the buttons that live in the bottom corners (the telescope, "write a message"): on a narrow
    // screen, where they'd sit under it, the hotbar goes just above them
    function perch() {
        var W = window.innerWidth, barW = bar.offsetWidth || 440, left = (W - barW) / 2, right = left + barW, low = window.innerHeight;
        document.querySelectorAll('.ui-button').forEach(function (b) {
            if (getComputedStyle(b).position !== 'fixed') return;
            var r = b.getBoundingClientRect();
            if (r.width && r.right > left - 6 && r.left < right + 6 && r.bottom > window.innerHeight - 90) low = Math.min(low, r.top);
        });
        var bottom = low < window.innerHeight ? Math.round(window.innerHeight - low + 8) : 12;
        body.style.setProperty('--bar-bottom', bottom + 'px');
    }
    perch();
    window.addEventListener('resize', perch);
    window.addEventListener('load', perch);
    setTimeout(perch, 800);

    /* ---------------- things lying about to pick up ---------------- */
    function setupPickups() {
        document.querySelectorAll('.pickup[data-item]').forEach(function (p) {
            if (p.dataset.pickDone) return;
            var id = p.dataset.item, it = ITEMS[id];
            if (!it) return;
            p.dataset.pickDone = '1';
            if (!p.querySelector('.placeholder, img')) p.insertAdjacentHTML('afterbegin', it.art.replace('<svg', '<svg class="placeholder"'));
            p.insertAdjacentHTML('beforeend', '<span class="pk-hint">' + (it.label || it.name.replace(/^the /, 'a ')) + '</span>');
            p.setAttribute('role', 'button');
            p.setAttribute('tabindex', '0');
            p.setAttribute('aria-label', 'pick up ' + it.name);
            var take = function (e) {
                if (e) e.stopPropagation();
                if (add(id)) p.dispatchEvent(new CustomEvent('taken', { bubbles: true, detail: { item: id } }));
            };
            p.addEventListener('click', take);
            p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); take(); } });
        });
        draw();
    }
    setupPickups();
    document.addEventListener('DOMContentLoaded', setupPickups);

    Sky.inventory = {
        has: function (id) { return bag.indexOf(id) !== -1; },
        add: add, remove: remove, say: say, define: define,
        get holding() { return holding; }, get active() { return active; },
        hold: pick, letGo: letGo,
        onUse: function (fn) { useFns.push(fn); },
        onToggle: function (id, fn) { (toggleFns[id] = toggleFns[id] || []).push(fn); if (active === id || wearing.indexOf(id) !== -1) fn(true); },
        wearing: function (id) { return wearing.indexOf(id) !== -1; },
        art: function (id) { return ITEMS[id] ? ITEMS[id].art : ''; },
        item: function (id) { return ITEMS[id]; },
        refresh: setupPickups
    };
})();

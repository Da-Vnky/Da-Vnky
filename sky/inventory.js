/* =====================================================================
   inventory.js — the hotbar (bottom middle, every page): eight slots,
   numbered 1 to 8, like Minecraft's. Things you pick up go in the next
   free slot and stay with you from page to page for the rest of the visit:
     the toaster (living space floor), the marker (the workshop's bench),
     the revolver (the rooftop), a bottle of Mel's pills (her bathroom, in
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
          each thing's own picture is its slot (assets/living/toaster, …)
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
        toaster: { name: 'the toaster', slot: 'assets/living/toaster', hint: 'click the bathroom to let go of it',
            art: '<svg viewBox="0 0 100 70" aria-hidden="true"><rect x="8" y="14" width="84" height="50" rx="14" fill="#c9ccd0" stroke="#8d939a" stroke-width="2"/>' +
                 '<rect x="24" y="10" width="22" height="8" rx="2" fill="#2a2420"/><rect x="54" y="10" width="22" height="8" rx="2" fill="#2a2420"/>' +
                 '<path d="M26 12 Q35 2 44 12 Z M56 12 Q65 3 74 12 Z" fill="#d8a25a"/><circle cx="76" cy="46" r="4" fill="#9a3b1f"/></svg>' },
        marker: { name: 'the marker', slot: 'assets/workshop/marker', toggle: true, hint: 'draw on anything. Esc to stop.',
            art: '<svg viewBox="0 0 100 30" aria-hidden="true"><rect x="10" y="6" width="62" height="18" rx="4" fill="#2a2a2e"/><rect x="72" y="8" width="16" height="14" rx="2" fill="#1a1a1c"/>' +
                 '<path d="M88 11 L98 15 L88 19 Z" fill="#111"/><rect x="18" y="10" width="36" height="10" rx="2" fill="#f3e6c2"/><text x="36" y="18" text-anchor="middle" font-size="7" font-family="Arial" font-weight="bold" fill="#2a2a2e">PERM</text></svg>' },
        // a bottle of Mel's pills, taken from her bathroom cabinet (reset 3: schizophyllu.me.room/room/davinv.js has the
        // same). it goes where you go for the rest of the visit, but it's only any use back in her room
        pills: { name: 'a bottle of skizy\u2019s pills', label: 'a pill bottle', slot: 'assets/items/pills', hint: 'it rattles. it\u2019s for skizy.',
            art: '<svg viewBox="0 0 40 60" aria-hidden="true"><rect x="8" y="4" width="24" height="10" rx="2" fill="#f3f0e6" stroke="#9a968a"/>' +
                 '<rect x="6" y="14" width="28" height="42" rx="4" fill="#e0782a" opacity=".92"/><rect x="10" y="24" width="20" height="18" fill="#f8f4ea"/>' +
                 '<path d="M13 30 H27 M13 35 H24" stroke="#8a8a8a" stroke-width="1.6"/><path d="M10 18 V52" stroke="#f7b070" stroke-width="2" opacity=".6"/></svg>' },
        revolver: { name: 'the revolver', slot: 'assets/city/revolver', hint: 'aim and click. Esc to put it away.', cursor: 'reticle', keep: true,
            art: '<svg viewBox="0 0 100 60" aria-hidden="true"><path d="M8 14 H70 V26 H8 Z" fill="#4a4f57"/><rect x="4" y="15" width="6" height="10" fill="#2f3339"/>' +
                 '<rect x="46" y="12" width="26" height="22" rx="5" fill="#5b616a"/><circle cx="52" cy="23" r="2" fill="#2f3339"/><circle cx="60" cy="23" r="2" fill="#2f3339"/><circle cx="68" cy="23" r="2" fill="#2f3339"/>' +
                 '<path d="M66 30 L86 30 L94 56 L76 58 Z" fill="#6e4a30"/><path d="M58 32 Q60 44 70 42" fill="none" stroke="#2f3339" stroke-width="3"/><rect x="70" y="8" width="6" height="6" fill="#2f3339"/></svg>' }
    };
    var BAG = '<svg class="placeholder" viewBox="0 0 40 40" aria-hidden="true"><path d="M8 14 Q20 8 32 14 L35 34 Q20 40 5 34 Z" fill="#8a5a34"/><path d="M14 13 Q20 3 26 13" stroke="#5a3a24" stroke-width="3" fill="none"/>' +
        '<path d="M9 18 Q20 22 31 18" stroke="#5a3a24" stroke-width="2" fill="none"/><circle cx="20" cy="21" r="2.2" fill="#c49a52"/></svg>';
    var RETICLE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g fill="none" stroke-linecap="round">' +
        '<circle cx="20" cy="20" r="12" stroke="#fff" stroke-width="4" opacity=".65"/><circle cx="20" cy="20" r="12" stroke="#b3261e" stroke-width="2"/>' +
        '<path d="M20 2 V12 M20 28 V38 M2 20 H12 M28 20 H38" stroke="#fff" stroke-width="4" opacity=".65"/><path d="M20 2 V12 M20 28 V38 M2 20 H12 M28 20 H38" stroke="#b3261e" stroke-width="2"/></g>' +
        '<circle cx="20" cy="20" r="1.8" fill="#b3261e"/></svg>');

    Sky.css(
        '.hotbar { position: fixed; left: 50%; bottom: var(--bar-bottom, 12px); z-index: 10; display: flex; align-items: center; gap: 4px; padding: 5px 7px; border-radius: 12px;' +
            'background: rgba(26,18,12,.92); box-shadow: 0 6px 16px rgba(0,0,0,.45), inset 0 0 0 1px rgba(243,230,194,.18);' +
            'transform: translate(-50%, 170%); transition: transform .35s cubic-bezier(.3,1.4,.5,1), opacity .3s; font-family: "IM Fell English", Georgia, serif; }' +
        '.hotbar.has { transform: translate(-50%, 0); }' +
        '.hotbar .hb-bag { width: 30px; height: 30px; margin-right: 3px; flex: none; }' +
        '.hotbar .hb-bag > svg, .hotbar .hb-bag > .art { width: 100%; height: 100%; display: block; }' +
        '.hotbar .hb-slot { position: relative; width: 44px; height: 44px; padding: 4px; flex: none; border: 2px solid rgba(243,230,194,.28); border-radius: 6px;' +
            'background: rgba(243,230,194,.1) var(--slot-art, none) center / 100% 100% no-repeat; cursor: pointer; color: #f3e6c2; }' +
        '.hotbar .hb-slot:hover { border-color: rgba(243,230,194,.6); background-color: rgba(243,230,194,.16); }' +
        '.hotbar .hb-slot.on { border-color: #f3e6c2; box-shadow: 0 0 0 2px rgba(30,21,14,.9), 0 0 0 4px #f3e6c2; background-color: rgba(243,230,194,.22); }' +
        '.hotbar .hb-slot:empty::after, .hotbar .hb-slot.empty::after { content: ""; }' +
        '.hotbar .hb-slot > svg, .hotbar .hb-slot > img { width: 100%; height: 100%; display: block; object-fit: contain; pointer-events: none; }' +
        '.hotbar .hb-num { position: absolute; left: 3px; top: 0; font: bold 11px/1.2 Georgia, serif; color: rgba(243,230,194,.75); text-shadow: 0 1px 2px #000; pointer-events: none; }' +
        '.hotbar .hb-name { position: absolute; left: 50%; bottom: calc(100% + 10px); transform: translateX(-50%); white-space: nowrap; padding: 2px 10px; border-radius: 999px;' +
            'background: rgba(30,21,14,.85); color: #f3e6c2; font-style: italic; font-size: .85rem; opacity: 0; transition: opacity .2s; pointer-events: none; }' +
        '.hotbar .hb-slot:hover .hb-name { opacity: 1; }' +
        '@media (max-width: 620px) { body.hotbar-on .place-tabs { bottom: calc(var(--bar-bottom, 12px) + 62px); } }' +
        '@media (max-width: 620px) { .hotbar { gap: 2px; padding: 4px 5px; } .hotbar .hb-slot { width: 38px; height: 38px; padding: 3px; } .hotbar .hb-bag { display: none; } }' +
        '.inv-cursor { position: fixed; z-index: 11; width: 56px; pointer-events: none; transform: translate(-50%, -50%) rotate(-10deg); display: none; filter: drop-shadow(0 6px 6px rgba(0,0,0,.4)); }' +
        '.inv-cursor > svg, .inv-cursor > img { width: 100%; display: block; }' +
        'body.inv-holding:not(.inv-reticle) .inv-cursor { display: block; }' +
        'body.inv-holding, body.inv-holding * { cursor: crosshair !important; }' +
        'body.inv-reticle, body.inv-reticle * { cursor: var(--reticle) 20 20, crosshair !important; }' +
        '.inv-note { position: fixed; left: 50%; bottom: calc(var(--bar-bottom, 12px) + 72px); z-index: 10; transform: translateX(-50%); padding: 4px 14px; border-radius: 999px; background: rgba(40,28,18,.85);' +
            'color: #f3e6c2; font: italic .95rem "IM Fell English", Georgia, serif; opacity: 0; transition: opacity .3s; pointer-events: none; white-space: nowrap; max-width: 92vw; overflow: hidden; text-overflow: ellipsis; }' +
        '.inv-note.on { opacity: 1; }' +
        '@media (max-width: 620px) { .inv-note { white-space: normal; width: max-content; max-width: 88vw; text-align: center; border-radius: 14px; } }' +   // (a long line wraps on a phone, not cut off)
        // things you can pick up: a little glint now and then
        '.pickup { cursor: pointer; filter: drop-shadow(0 3px 4px rgba(0,0,0,.4)); transition: transform .2s; }' +
        '.pickup:hover, .pickup:focus-visible { transform: translateY(-3px) rotate(-4deg); outline: none; }' +
        '.pickup > svg, .pickup > .art { display: block; width: 100%; height: 100%; object-fit: contain; }' +
        '.pickup::after { content: ""; position: absolute; right: -4px; top: -6px; width: 10px; height: 10px; pointer-events: none;' +
            'background: radial-gradient(circle, #fff 0 20%, rgba(255,240,180,.8) 30%, transparent 70%); opacity: 0; animation: pk-glint 3.2s ease-in-out infinite; }' +
        '@keyframes pk-glint { 0%, 80%, 100% { opacity: 0; transform: scale(.4); } 88% { opacity: 1; transform: scale(1.3) rotate(45deg); } }' +
        '.pickup .pk-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap; font-style: italic; font-size: .9rem;' +
            'color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.8); opacity: 0; transition: opacity .25s; pointer-events: none; }' +
        '.pickup:hover .pk-hint { opacity: 1; }' +
        '.pickup.taken { display: none !important; }' +
        'body.mirror-open .hotbar, body.leaving .hotbar, body.sky-view .hotbar, body.records-open .hotbar, body.crate-open .hotbar,' +
        'body.peep-view .hotbar, body.peep-close .hotbar, body.paint-open .hotbar, body.frame-open .hotbar, body.paper-open .hotbar, body.book-open .hotbar { opacity: 0; pointer-events: none; }'
    );
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
    function typing(t) { return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable); }
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (holding) { letGo(); e.stopImmediatePropagation(); }
            else if (active) { stopActive(); draw(); e.stopImmediatePropagation(); }
            return;
        }
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

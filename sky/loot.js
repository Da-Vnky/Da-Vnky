/* =====================================================================
   loot.js — the hidden things, scattered about the site. Each one is a
   line in LOOT below: what it is, where it's hidden and how it comes out
   (shoot something, or click something a few times), and whether finding
   it lasts for this visit or for good.

     the P(Doom) record  hidden in the hall of shame (the dungeon): shoot the
                         picture in frame 6 ("the record") and it falls out in
                         its sleeve. carry it to the record player and it's in
                         your crate FOR GOOD: it stays yours on later visits
                         too (kept in the visitor's browser, apart from the
                         site's copy that's wiped each visit). until then it
                         isn't in the crate at all. the picture comes back next
                         visit; shooting it again once you have the record just
                         breaks the picture.
     Grok's Gimp suit    in the hallway: rummage in the coats on the hooks.
                         wear it (its hotbar slot) and the traveller wears it,
                         everywhere, until you take it off.

   To hide something new, add a line to LOOT:
     id      its name for the site (letters, numbers, dashes)
     name    what it's called ("the …" reads best)
     label   what its hint says while it's lying on the floor
     slot    its picture: assets/items/<id> (square-ish, see-through)
     keep    'visit' (found again each visit) or 'forever' (found once, kept)
     page    which page it's hidden on (living, workshop, city, sea)
     shoot   a selector: shoot that and it drops. or:
     click   a selector: click that `times` times and it drops
     say     what's said as it turns up
     kind    'record' (take it to the record player: track says which song
             in content/living/ it is), 'wearable' (switch it on and off),
             or 'thing' (just yours to carry)

   slots: assets/items/<id> for each; sounds: assets/sounds/loot, record-in
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.loot) return;
    var body = document.body, I = Sky.inventory;
    var PAGE = (location.pathname.replace(/.*\//, '').replace(/\.html$/, '') || 'index').replace(/^index$/, 'sea');

    var LOOT = [
        { id: 'doom-record', kind: 'record', name: 'the record “I’m Upping My P(Doom)”', label: 'a record, in its sleeve', slot: 'assets/items/doom-record',
          track: /p\s*\(\s*doom\s*\)/i, keep: 'forever', page: 'living', shoot: '.gallery-frame[data-wall=shame][data-frame="6"]',
          say: 'something slides out from behind the picture…', hint: 'take it to the record player',
          art: '<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="40" cy="30" r="19" fill="#141416"/><circle cx="40" cy="30" r="13" fill="none" stroke="rgba(255,255,255,.12)"/>' +
               '<circle cx="40" cy="30" r="6" fill="#c8643b"/><rect x="4" y="8" width="44" height="44" rx="2" fill="#2a1d2e"/><rect x="4" y="8" width="44" height="44" rx="2" fill="none" stroke="#8a3b6a" stroke-width="1.4"/>' +
               '<text x="26" y="28" text-anchor="middle" font-family="Georgia, serif" font-size="8" font-style="italic" fill="#ff5ab8">P(Doom)</text>' +
               '<path d="M12 40 H40 M12 44 H32" stroke="#8a3b6a" stroke-width="1.6"/><circle cx="36" cy="20" r="3" fill="#ffbe1e"/></svg>' },
        { id: 'gimp-suit', kind: 'wearable', name: 'Grok’s Gimp suit', label: 'something rubbery', slot: 'assets/items/gimp-suit',
          keep: 'visit', page: 'living', click: '.hall-hooks', times: 3, say: 'something black and rubbery falls out of the coats', hint: 'the traveller’s wearing it. press its number again to take it off.',
          art: '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M20 14 Q30 8 40 14 L44 26 L50 50 H10 L16 26 Z" fill="#0d0d10"/><circle cx="30" cy="12" r="9" fill="#0d0d10"/>' +
               '<path d="M25 11 h3 M32 11 h3" stroke="#e8e8ee" stroke-width="1.6" stroke-linecap="round"/><path d="M25 16 h10" stroke="#b8b8c0" stroke-width="1.2" stroke-dasharray="1.4 1"/>' +
               '<path d="M30 22 V48" stroke="#b8b8c0" stroke-width="1" stroke-dasharray="1.4 1"/><path d="M22 18 Q18 22 20 26 M38 18 Q42 22 40 26" stroke="#3a3a44" stroke-width="1.2" fill="none"/>' +
               '<circle cx="30" cy="24" r="2.2" fill="none" stroke="#b8b8c0" stroke-width="1"/></svg>' }
    ];
    var BY = {};
    LOOT.forEach(function (L) { BY[L.id] = L; });

    /* ---------------- what's been found: this visit (session) and for good (this browser) ---------------- */
    function get(store, k, d) { try { var v = JSON.parse(store.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } }
    function put(store, k, v) { try { store.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function owned(id) { return get(localStorage, 'loot-owned', []).indexOf(id) !== -1; }
    function own(id) { var l = get(localStorage, 'loot-owned', []); if (l.indexOf(id) === -1) { l.push(id); put(localStorage, 'loot-owned', l); } }
    function foundNow(id) { return get(sessionStorage, 'loot-found', []).indexOf(id) !== -1; }
    function markFound(id) { var l = get(sessionStorage, 'loot-found', []); if (l.indexOf(id) === -1) { l.push(id); put(sessionStorage, 'loot-found', l); } }
    // done with it: kept for good, or already found (and so in the bag, on the floor, or put to use) this visit
    function spent(L) { return (L.keep === 'forever' && owned(L.id)) || foundNow(L.id); }

    // the hidden records: out of the crate until they're yours (sky/records.js asks)
    function trackHidden(url, title) {
        var name = String(title || '') + ' ' + (function () { try { return decodeURIComponent(url || ''); } catch (e) { return url || ''; } })();
        return LOOT.some(function (L) { return L.kind === 'record' && L.track && L.track.test(name) && !owned(L.id); });
    }

    /* ---------------- into the hotbar ---------------- */
    LOOT.forEach(function (L) {
        if (I) I.define(L.id, { name: L.name, label: L.label, slot: L.slot, art: L.art, hint: L.hint, wear: L.kind === 'wearable' });
    });

    Sky.css(
        '.loot-drop { position: absolute; z-index: 4; width: 5vw; min-width: 44px; max-width: 80px; aspect-ratio: 1; }' +
        '.loot-drop.falling { pointer-events: none; }' +
        '.loot-drop > svg, .loot-drop > img { width: 100%; height: 100%; display: block; object-fit: contain; }' +
        '.loot-drop::before { content: ""; position: absolute; inset: -30%; z-index: -1; border-radius: 50%; pointer-events: none;' +
            'background: radial-gradient(circle, rgba(255,230,150,.45), transparent 65%); animation: loot-glow 1.8s ease-in-out infinite alternate; }' +
        '@keyframes loot-glow { from { opacity: .35; transform: scale(.85); } to { opacity: .9; transform: scale(1.1); } }' +
        // wearing the suit: every traveller on the page goes black and shiny, with a zipped mask
        'body.wearing-gimp .scene-character > .art, body.wearing-gimp .scene-character > .placeholder, body.wearing-gimp .scene-character > .pose,' +
        'body.wearing-gimp .sea-char > .art, body.wearing-gimp .sea-char > .placeholder, body.wearing-gimp .sea-char > .pose { filter: brightness(.16) saturate(0) contrast(1.4) drop-shadow(0 0 1px rgba(255,255,255,.35)); }' +
        '.gimp-worn { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; display: none; z-index: 1; }' +
        'body.wearing-gimp .gimp-worn { display: block; }' +
        '.gimp-worn > svg, .gimp-worn > img { display: block; width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; }' +
        '.gimp-worn.own ~ .art, .gimp-worn.own ~ .placeholder { visibility: hidden; }' +
        '.character.face-left .gimp-worn, .sea-char.face-left .gimp-worn { transform: scaleX(-1); }'
    );

    /* ---------------- turning up: it falls to the floor of whatever room it's in, and waits there ---------------- */
    function hostOf(el) { return (el && el.closest && el.closest('.dungeon, .hallway, .bathroom, .room')) || body; }
    function floorOf(host) {
        var fl = host.querySelector(':scope > .room-floor');
        return fl ? fl.offsetHeight * 0.5 : Math.round(window.innerHeight * 0.03);
    }
    function lay(L, host, xPct, fromTop) {
        var el = document.createElement('div');
        el.className = 'loot-drop pickup';
        el.dataset.item = L.id;
        el.dataset.asset = L.slot;
        host.appendChild(el);
        I.refresh();
        Sky.fillAssets(el);
        el.style.left = 'calc(' + xPct + '% - ' + (el.offsetWidth / 2) + 'px)';
        var bottom = floorOf(host);
        if (fromTop === undefined) { el.style.bottom = bottom + 'px'; return el; }
        el.classList.add('falling');                                     // from where it came out, down to the floor
        var H = host.clientHeight || window.innerHeight, y = fromTop, vy = -220, last = performance.now(), bounced = false, rot = 0, spin = (Math.random() - 0.5) * 300;
        (function step(now) {
            var dt = Math.min(0.04, (now - last) / 1000); last = now;
            vy += 2400 * dt; y += vy * dt; rot += spin * dt;
            var floorY = H - bottom - el.offsetHeight;
            if (y >= floorY) {
                y = floorY;
                if (!bounced && vy > 300) { bounced = true; vy = -vy * 0.3; spin *= -0.4; if (Sky.sounds) Sky.sounds.sfx('land', { size: 0.35 }); }
                else { el.style.top = ''; el.style.bottom = bottom + 'px'; el.style.transform = 'rotate(' + (rot % 20).toFixed(0) + 'deg)'; el.classList.remove('falling'); return; }
            }
            el.style.top = y + 'px';
            el.style.bottom = 'auto';
            el.style.transform = 'rotate(' + rot.toFixed(0) + 'deg)';
            requestAnimationFrame(step);
        })(last);
        return el;
    }
    function drop(L, from) {
        if (!I || spent(L)) return;
        markFound(L.id);
        var host = hostOf(from), hr = host.getBoundingClientRect(), fr = from.getBoundingClientRect();
        var xPct = Math.max(4, Math.min(96, (fr.left + fr.width / 2 - hr.left) / (hr.width || window.innerWidth) * 100));
        var el = lay(L, host, xPct, fr.top - hr.top + fr.height * 0.3);
        put(sessionStorage, 'loot-lying', Object.assign(get(sessionStorage, 'loot-lying', {}), (function () { var o = {}; o[L.id] = { page: PAGE, host: host.classList[0] || '', x: +xPct.toFixed(1) }; return o; })()));
        if (Sky.sounds) Sky.sounds.sfx('loot', { delay: 0.2 });
        if (L.say) I.say(L.say, 3200);
        return el;
    }
    // picked up off the floor: no longer lying about
    document.addEventListener('taken', function (e) {
        var id = e.detail && e.detail.item;
        if (!BY[id]) return;
        var lying = get(sessionStorage, 'loot-lying', {});
        delete lying[id];
        put(sessionStorage, 'loot-lying', lying);
        if (e.target && e.target.classList.contains('loot-drop')) e.target.remove();
    });
    // still lying where it fell (back on the page later in the same visit)
    var lying = get(sessionStorage, 'loot-lying', {});
    Object.keys(lying).forEach(function (id) {
        var L = BY[id], w = lying[id];
        if (!L || w.page !== PAGE || (I && I.has(id))) return;
        var host = (w.host && document.querySelector('.' + w.host)) || body;
        lay(L, host, w.x);
    });

    /* ---------------- how each one comes out ---------------- */
    function here(L) { return L.page === PAGE; }
    // shot at: the revolver tells us what it hit (a painting, or anything else)
    function shotAt(target) {
        LOOT.forEach(function (L) {
            if (!here(L) || !L.shoot || !target || !target.closest) return;
            var el = target.closest(L.shoot);
            if (el) setTimeout(function () { drop(L, el); }, 350);
        });
    }
    document.addEventListener('dav:painting-shot', function (e) { shotAt(e.detail && e.detail.frame); });
    document.addEventListener('dav:shot', function (e) { shotAt(e.detail && e.detail.target); });
    // clicked on, a few times
    var clicks = {};
    document.addEventListener('click', function (e) {
        if (body.classList.contains('inv-holding')) return;
        LOOT.forEach(function (L) {
            if (!here(L) || !L.click || spent(L)) return;
            var el = e.target.closest && e.target.closest(L.click);
            if (!el) return;
            clicks[L.id] = (clicks[L.id] || 0) + 1;
            el.animate && el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-3px) rotate(-2deg)' }, { transform: 'translateX(3px) rotate(2deg)' }, { transform: 'none' }], { duration: 260 });
            if (Sky.sounds) Sky.sounds.sfx('brush', { size: 0.2 });
            if (clicks[L.id] >= (L.times || 1)) drop(L, el);
            else I.say(clicks[L.id] === 1 ? 'you rummage…' : 'there’s something in there…', 1400);
        });
    });

    /* ---------------- using them ---------------- */
    // a record: take it to the record player and it's in your crate for good
    if (I) I.onUse(function (id, e) {
        var L = BY[id];
        if (!L || L.kind !== 'record') return false;
        if (!(e.target.closest && e.target.closest('.turntable'))) { I.say('the record player’s in the living space', 2000); return false; }
        own(L.id);
        I.remove(L.id);
        if (Sky.sounds) Sky.sounds.sfx('record-in');
        if (Sky.records && Sky.records.reload) Sky.records.reload();
        I.say('it’s in your crate now, for good. click the record player to put it on.', 3600);
        return true;
    });
    // a wearable: on and off (and still on, page to page, until you take it off)
    var worn = get(sessionStorage, 'loot-worn', []);
    function dressUp() {
        document.querySelectorAll('.scene-character, .sea-char').forEach(function (c) {
            if (c.querySelector(':scope > .gimp-worn')) return;
            var g = document.createElement('span');
            g.className = 'gimp-worn';
            // the stand-in: a zipped mask over the face (your own: assets/items/gimp-suit-worn, the same canvas as the traveller)
            g.innerHTML = '<svg viewBox="0 0 60 120" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
                '<g transform="translate(0 0)"><ellipse cx="30" cy="50" rx="8.6" ry="9.4" fill="#0b0b0e" stroke="rgba(255,255,255,.35)" stroke-width=".6"/>' +
                '<path d="M25 48.5 h3.4 M31.6 48.5 h3.4" stroke="#f2f2f6" stroke-width="1.5" stroke-linecap="round"/>' +
                '<path d="M25.5 54 h9" stroke="#c9c9d0" stroke-width="1" stroke-dasharray="1.1 .8"/><circle cx="35.6" cy="54" r=".9" fill="#c9c9d0"/>' +
                '<path d="M30 60 V104" stroke="#c9c9d0" stroke-width=".7" stroke-dasharray="1.2 1"/></g></svg>';
            c.insertBefore(g, c.firstChild);
            Sky.findAsset('assets/items/gimp-suit-worn', function (url) { if (url) { g.innerHTML = '<img alt="" src="' + url + '">'; g.classList.add('own'); } });
        });
    }
    LOOT.forEach(function (L) {
        if (L.kind !== 'wearable' || !I) return;
        I.onToggle(L.id, function (on) {
            var i = worn.indexOf(L.id);
            if (on && i === -1) worn.push(L.id);
            if (!on && i !== -1) worn.splice(i, 1);
            put(sessionStorage, 'loot-worn', worn);
            if (L.id === 'gimp-suit') { if (on) dressUp(); body.classList.toggle('wearing-gimp', on); }
        });
        if (worn.indexOf(L.id) !== -1 && I.has(L.id)) I.hold(L.id, true);     // still wearing it from the last page
    });

    Sky.loot = { list: LOOT, owned: owned, trackHidden: trackHidden, drop: function (id, from) { if (BY[id]) drop(BY[id], from); },
                 forget: function (id) { var l = get(localStorage, 'loot-owned', []).filter(function (x) { return x !== id; }); put(localStorage, 'loot-owned', l); } };
})();

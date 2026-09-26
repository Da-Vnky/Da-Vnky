/* =====================================================================
   revolver.js — the revolver, lying on the rooftop. Pick it up and it's
   in your bag; click it there and you're holding it (Esc puts it away).
   Then click:
     • the traveller — they take it to their own head. bang. back a
       moment later (-1), like after any other death here
     • the record player (while a record's on) — the record is shot to
       pieces, and gone from the crate for the rest of the visit
     • one of the little Claubes (sky/claubes.js) — pop
     • anything else — a bullet hole, for a while
     • a painting in a frame — it bursts into pieces, and the frame stays
       empty for the rest of the visit
   Six shots, then it reloads (RELOAD_MS): while it does, every bullet hole
   fades away, gone by the time it's loaded again. And the holes vanish when the
   view changes: the telescope comes up, or you look out of a window.
   It fires 'dav:traveller-shot', 'dav:record-shot', 'dav:painting-shot' and
   'dav:shot' (anything else) on the document,
   for anything else that wants to know.

   slots: assets/city/revolver (the gun: on the roof, in the bag, in their hand),
          assets/ui/bullet-hole (a small transparent PNG)
   sounds: assets/sounds/bang, shatter, reload
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || !Sky.inventory || Sky.revolver) return;
    var body = document.body, I = Sky.inventory;
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }
    var ROUNDS = 6, RELOAD_MS = 2600;                  // six in the cylinder; how long it takes to load six more
    function tell(name, detail) { try { document.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (e) {} }

    Sky.css(
        '.shot-layer { position: fixed; inset: 0; z-index: 6; pointer-events: none; overflow: hidden; }' +
        '.bullet-hole.reloading { transition: opacity ' + RELOAD_MS + 'ms linear; opacity: 0; }' +
        '.bullet-hole { position: absolute; width: 18px; height: 18px; margin: -9px 0 0 -9px; transition: opacity 2s; }' +
        '.bullet-hole > svg, .bullet-hole > img { display: block; width: 100%; height: 100%; }' +
        '.shot-flash { position: fixed; inset: 0; z-index: 7; pointer-events: none; background: #fff6d0; opacity: 0; }' +
        '.shot-flash.on { animation: shot-flash .14s ease-out; }' +
        '@keyframes shot-flash { from { opacity: .45; } to { opacity: 0; } }' +
        // a painting shot to bits: the empty frame it leaves (for the rest of the visit)
        '.gallery-frame.shot { cursor: default; }' +
        '.gallery-frame.shot .gf-pic > * { visibility: hidden; }' +
        '.gallery-frame.shot .gf-pic { background: radial-gradient(circle at var(--hx, 50%) var(--hy, 45%), #050303 0 5%, #2a1d14 6%, #1a120c 40%, #120c08) !important;' +
            'clip-path: polygon(0 0, 18% 4%, 30% 0, 52% 6%, 70% 1%, 100% 0, 96% 22%, 100% 48%, 94% 70%, 100% 100%, 72% 95%, 50% 100%, 26% 94%, 0 100%, 5% 72%, 0 46%, 4% 22%); }' +
        '.painting-bit { position: fixed; z-index: 7; pointer-events: none; background-repeat: no-repeat; box-shadow: 0 2px 4px rgba(0,0,0,.4); }' +
        '.shard { position: absolute; width: 16px; height: 16px; background: #141416; clip-path: polygon(0 0, 100% 30%, 40% 100%); }' +
        '.shard.label { background: #9a3b1f; }' +
        'body.recoil { animation: shot-recoil .16s ease-out; }' +
        '@keyframes shot-recoil { 0% { translate: 0 0; } 30% { translate: -3px 2px; } 100% { translate: 0 0; } }' +
        '@media (prefers-reduced-motion: reduce) { body.recoil { animation: none; } .shot-flash.on { animation: none; } }'
    );
    var layer = document.createElement('div');
    layer.className = 'shot-layer';
    layer.setAttribute('aria-hidden', 'true');
    body.appendChild(layer);
    var flash = document.createElement('div');
    flash.className = 'shot-flash';
    body.appendChild(flash);
    var HOLE = '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="rgba(40,30,20,.35)"/><circle cx="10" cy="10" r="4" fill="#0d0a08"/>' +
        '<path d="M10 2 L11 6 M18 10 L14 11 M10 18 L9 14 M2 10 L6 9 M4 4 L7 7 M16 16 L13 13" stroke="#2a2018" stroke-width="1"/></svg>';
    var holeArt = HOLE;
    Sky.findAsset('assets/ui/bullet-hole', function (url) { if (url) holeArt = '<img alt="" src="' + url + '">'; });

    function bang() {
        sfx('bang');
        flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
        body.classList.remove('recoil'); void body.offsetWidth; body.classList.add('recoil');
    }
    function hole(x, y) {
        var h = document.createElement('div');
        h.className = 'bullet-hole';
        h.style.left = x + 'px'; h.style.top = y + 'px';
        h.style.transform = 'rotate(' + Math.round(Math.random() * 360) + 'deg)';
        h.innerHTML = holeArt;
        layer.appendChild(h);
        setTimeout(function () { h.style.opacity = '0'; setTimeout(function () { h.remove(); }, 2100); }, 25000);
    }
    function shards(x, y) {
        for (var i = 0; i < 18; i++) {
            var s = document.createElement('div');
            s.className = 'shard' + (i % 5 === 0 ? ' label' : '');
            s.style.left = x + 'px'; s.style.top = y + 'px';
            layer.appendChild(s);
            var a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 160, sz = 0.5 + Math.random();
            s.animate([
                { transform: 'translate(-50%,-50%) scale(' + sz + ') rotate(0deg)', opacity: 1 },
                { transform: 'translate(' + (Math.cos(a) * d) + 'px,' + (Math.sin(a) * d * 0.6 + 120) + 'px) scale(' + sz + ') rotate(' + (Math.random() * 720 - 360) + 'deg)', opacity: 0 }
            ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' }).onfinish = (function (el) { return function () { el.remove(); }; })(s);
        }
    }

    /* ---------------- six shots, then it reloads (and the holes fade as it does) ---------------- */
    var FIRED = 'revolver-fired', reloading = false;
    function fired() { try { return +(sessionStorage.getItem(FIRED) || 0); } catch (e) { return 0; } }
    function setFired(n) { try { sessionStorage.setItem(FIRED, n); } catch (e) {} }
    function clearHoles(ms) {
        layer.querySelectorAll('.bullet-hole').forEach(function (h) {
            if (ms) { h.style.transition = 'opacity ' + ms + 'ms linear'; void h.offsetWidth; h.style.opacity = '0'; }
            setTimeout(function () { h.remove(); }, ms || 0);
        });
    }
    function reload() {
        reloading = true;
        sfx('reload', { or: 'pickup' });
        setTimeout(function () { sfx('reload-click', { or: 'tap' }); }, RELOAD_MS - 200);
        I.say('reloading…', RELOAD_MS);
        clearHoles(RELOAD_MS);
        setTimeout(function () { reloading = false; setFired(0); }, RELOAD_MS);
    }
    // a round goes: false if it's still reloading (nothing happens)
    function spend() {
        if (reloading) { I.say('reloading…', 900); return false; }
        var n = fired() + 1;
        setFired(n);
        if (n >= ROUNDS) setTimeout(reload, 350);
        return true;
    }
    if (fired() >= ROUNDS) reload();                                // (the page changed mid-reload: finish it)
    // the telescope comes up, or they look out of a window: the holes (on the glass, as it were) are gone
    new MutationObserver(function () {
        if (/\b(peep-view|peep-close|sky-view)\b/.test(body.className) && layer.firstChild) clearHoles(250);
    }).observe(body, { attributes: true, attributeFilter: ['class'] });

    /* ---------------- a painting in a frame: blown to pieces, for the rest of the visit ---------------- */
    var SHOT_KEY = 'paintings-shot';
    function frameKey(f) { return location.pathname.replace(/.*\//, '') + '|' + (f.dataset.wall || '') + '|' + f.dataset.frame; }
    function shotList() { try { return JSON.parse(sessionStorage.getItem(SHOT_KEY) || '[]'); } catch (e) { return []; } }
    shotList().forEach(function (k) {
        var p = k.split('|');
        if (p[0] !== location.pathname.replace(/.*\//, '')) return;
        var f = document.querySelector('.gallery-frame[data-frame="' + p[2] + '"]' + (p[1] ? '[data-wall="' + p[1] + '"]' : ':not([data-wall])'));
        if (f) f.classList.add('shot');
    });
    function shootPainting(f, x, y) {
        var pic = f.querySelector('.gf-pic');
        if (!pic || f.classList.contains('shot')) { bang(); hole(x, y); return; }
        bang();
        var r = pic.getBoundingClientRect(), img = pic.querySelector('img'), src = img ? img.src : '';
        var cols = 4, rows = 5, w = r.width / cols, h = r.height / rows;
        for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
            var b = document.createElement('div');
            b.className = 'painting-bit';
            b.style.left = (r.left + i * w) + 'px'; b.style.top = (r.top + j * h) + 'px';
            b.style.width = w + 'px'; b.style.height = h + 'px';
            if (src) { b.style.backgroundImage = 'url("' + src + '")'; b.style.backgroundSize = r.width + 'px ' + r.height + 'px'; b.style.backgroundPosition = (-i * w) + 'px ' + (-j * h) + 'px'; }
            else b.style.background = ['#e9dbb8', '#c9a878', '#9a3b1f', '#6e5236'][(i + j) % 4];
            var cut = [[0, 0, 100, 8, 88, 100, 6, 92], [10, 0, 100, 0, 92, 100, 0, 86], [0, 12, 94, 0, 100, 90, 8, 100]][(i * rows + j) % 3];
            b.style.clipPath = 'polygon(' + cut[0] + '% ' + cut[1] + '%, ' + cut[2] + '% ' + cut[3] + '%, ' + cut[4] + '% ' + cut[5] + '%, ' + cut[6] + '% ' + cut[7] + '%)';
            body.appendChild(b);
            var cx = r.left + (i + 0.5) * w - x, cy = r.top + (j + 0.5) * h - y, d = Math.max(1, Math.hypot(cx, cy)), sp = 180 + Math.random() * 260;
            var dx = cx / d * sp + (Math.random() - 0.5) * 60, dy = cy / d * sp * 0.6 - 60;
            b.animate([
                { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
                { transform: 'translate(' + dx * 0.6 + 'px,' + (dy * 0.6) + 'px) rotate(' + (Math.random() * 360 - 180) + 'deg)', opacity: 1, offset: 0.35 },
                { transform: 'translate(' + dx + 'px,' + (dy + window.innerHeight * 0.6) + 'px) rotate(' + (Math.random() * 720 - 360) + 'deg)', opacity: 0 }
            ], { duration: 1300 + Math.random() * 600, easing: 'cubic-bezier(.3,.1,.7,1)', fill: 'forwards' }).onfinish = (function (el) { return function () { el.remove(); }; })(b);
        }
        sfx('shatter', { delay: 0.03 });
        f.style.setProperty('--hx', ((x - r.left) / r.width * 100).toFixed(0) + '%');
        f.style.setProperty('--hy', ((y - r.top) / r.height * 100).toFixed(0) + '%');
        f.classList.add('shot');
        f.querySelector('.gf-hint') && (f.querySelector('.gf-hint').textContent = 'shot to pieces');
        var l = shotList(), k = frameKey(f);
        if (l.indexOf(k) === -1) { l.push(k); try { sessionStorage.setItem(SHOT_KEY, JSON.stringify(l)); } catch (e) {} }
        tell('dav:painting-shot', { frame: f, x: x, y: y });
    }
    // (a shot painting can't be looked at up close any more)
    document.addEventListener('click', function (e) { var f = e.target.closest && e.target.closest('.gallery-frame.shot'); if (f && !body.classList.contains('inv-holding')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);

    /* ---------------- who's the traveller on this page ---------------- */
    function traveller(t) {
        var c = t.closest && t.closest('.sea-char, .scene-character, .character');
        // (not offsetParent: on the rooftop the traveller is pinned to the screen, and that has none)
        if (!c || c.classList.contains('gore-hidden') || !c.getClientRects().length) return null;
        return c;
    }
    var dying = false;
    function takeIt(c) {
        if (dying) return;
        // the lock's off and there's more than one heart left: it won't fire (sky/lives.js)
        if (Sky.lives && Sky.lives.jammed) {
            if (Sky.sounds) Sky.sounds.sfx('jammed', { or: 'tap' });
            I.say('it’s jammed.', 1600);
            return;
        }
        if (!spend()) return;
        // the last heart: no falling down, no getting up. the world goes straight to white (sky/lives.js)
        if (Sky.lives && Sky.lives.last) { dying = true; bang(); Sky.lives.final(); return; }
        if (c.classList.contains('sea-char')) {                         // the homepage's traveller has a life of its own
            if (Sky.sea && Sky.sea.kill && Sky.sea.kill()) { dying = true; setTimeout(function () { dying = false; }, 4200); tell('dav:traveller-shot'); }
            return;
        }
        if (!Sky.gore || !Sky.gore.shot) return;
        dying = true;
        c.classList.add('held-still');
        Sky.gore.shot(c, function () {
            c.classList.remove('held-still');
            Sky.gore.respawn(c);
            dying = false;
        });
        setTimeout(function () { tell('dav:traveller-shot'); }, 700);
    }
    function shootRecord(x, y) {
        var M = Sky.music, on = M && M.current();
        bang();
        if (!on || !M.playing()) { hole(x, y); I.say('nothing on the turntable to shoot'); return; }
        M.stop();
        if (Sky.records && Sky.records.forget) Sky.records.forget(on.url);
        sfx('shatter', { delay: 0.05 });
        shards(x, y);
        I.say('“' + (on.title || 'that record') + '”: in pieces');
        tell('dav:record-shot', { url: on.url });
    }

    I.onUse(function (id, e) {
        if (id !== 'revolver') return false;
        var x = e.clientX, y = e.clientY, t = e.target;
        var c = traveller(t);
        if (c) { takeIt(c); return true; }                              // (it counts its own round: a jam doesn't use one)
        var claube = t.closest && t.closest('.mini-claube'), deck = t.closest && t.closest('.turntable'), frame = t.closest && t.closest('.gallery-frame[data-frame]');
        if (!claube && !deck && !frame && t.closest && t.closest('.cp, .place-tabs, .sky-links, .marker-tray, a[href], button')) return false;   // (the controls still work)
        if (!spend()) return true;
        if (claube && Sky.claubes) { bang(); Sky.claubes.shoot(claube, x, y); return true; }
        if (deck) { shootRecord(x, y); return true; }
        if (frame) { shootPainting(frame, x, y); return true; }
        bang();
        hole(x, y);
        tell('dav:shot', { target: t, x: x, y: y });
        return true;
    });

    Sky.revolver = { bang: bang, hole: hole, get left() { return reloading ? 0 : ROUNDS - fired(); }, get reloading() { return reloading; } };
})();

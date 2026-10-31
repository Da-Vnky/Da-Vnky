/* =====================================================================
   revolver.js — the revolver: on the rooftop in reset 1, hung on the living
   space's wall from reset 2 (never both; none in reset 4). Pick it up and it's
   in your bag; click it there and you're holding it (Esc puts it away).
   Then click:
     • the traveller — they take it to their own head. bang. back a
       moment later, like after any other death here. That's reset 1's death
       (sky/state.js): once reset 1's key is found it takes the one heart and
       the world resets. From reset 2 on it always jams on the traveller
       (JAMMED below): it's someone else's gun by then (reset 4's white
       revolver, sky/hell.js, is the one that matters)
   THE WHITE REVOLVER (reset 4, after the pact: sky/hell.js gives it) works the
   same way, with its own sound (white-bang), and three differences: it won't
   point at the traveller; at a Claube worshipping on the diagram it kills
   (sky/claubes.js); and the false god's frame (6) only breaks for it at the
   very end, when it sends the bullet back (sky/claubes.js whiteFrame).
   In reset 4 the false god's frame never bursts for the ordinary revolver: a
   hole, and the hidden record still falls out (sky/loot.js).
     • the record player (while a record's on) — the record is shot to
       pieces, and gone from the crate for the rest of the visit
     • one of the little Claubes (sky/claubes.js) — pop
     • the bee in the front garden (sky/bee.js) — it always misses: the bee
       weaves out of the way, and keeps count (bee.js aimedAt / shot)
     • anything else — a bullet hole, for a while
     • a painting in a frame — it bursts into pieces, and the frame stays
       empty for the rest of the visit
   Six shots, then it reloads (or press R, holding it, for the ones spent):
   the cylinder swings out, the empty casings drop, a round goes in for each
   (a click each), it snaps shut and the hammer's cocked; while it does, every
   bullet hole fades away, gone by the time it's loaded again. And the holes
   vanish when the view changes: the telescope comes up, or you look out of a
   window.
   THE CYLINDER (30 Oct): held, the gun is only the reticle, so its cylinder
   rides beside it, seen from behind: the rounds left in their chambers, a turn
   of a sixth as the hammer's cocked after each shot, the reload above played on
   it. Each step waits for the one before to sound (STEP: the recordings' own
   lengths).
   It fires 'dav:traveller-shot', 'dav:record-shot', 'dav:painting-shot' and
   'dav:shot' (anything else) on the document,
   for anything else that wants to know.

   slots: assets/city/revolver (the gun: on the roof, in the bag, in their hand),
          assets/ui/bullet-hole (a small transparent PNG)
          assets/items/white-revolver (the white one, reset 4)
          assets/ui/revolver-cylinder (-white), revolver-round, revolver-spent (the cylinder beside the reticle)
   sounds: assets/sounds/bang and bang-2 (taken in turn), white-bang, shatter, revolver-cock, revolver-open,
           revolver-load (-2, -3, -4: taken in turn), revolver-close
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || !Sky.inventory || Sky.revolver) return;
    var body = document.body, I = Sky.inventory;
    var sfx = Sky.sfx;
    var ROUNDS = 6;                                     // six in the cylinder
    // how long each step of handling it takes (ms): the artist's recordings' own lengths (30 Oct), so each sound has
    // finished, or nearly, before the next begins. shotCock: from the shot to the hammer pulled back for the next
    var STEP = { cock: 380, open: 480, load: 320, close: 340, settle: 250, shotCock: 260 };
    function tell(name, detail) { try { document.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (e) {} }

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

    var white = false;                                  // (the shot in hand is the white revolver's: sky/hell.js)
    function bang() {
        if (white) sfx('white-bang', { or: 'bang' }); else sfx(turns('bang'), { or: 'bang' });
        try { document.dispatchEvent(new CustomEvent('dav:bang', { detail: { white: white } })); } catch (e) {}   // (sky/claubes.js: the static, in a robed reset)
        flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
        body.classList.remove('recoil'); void body.offsetWidth; body.classList.add('recoil');
        again(cyl, 'fire');
    }
    function again(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

    /* ---------------- its sounds: some come in several takes, played in turn ---------------- */
    var TAKES = { bang: ['bang', 'bang-2'], 'revolver-load': ['revolver-load', 'revolver-load-2', 'revolver-load-3', 'revolver-load-4'] };
    var have = {}, turnOf = {}, warmed = false;
    function soundUrl(name, done) { Sky.findAsset('assets/sounds/' + name + '.mp3|assets/sounds/' + name + '.ogg', done); }
    Object.keys(TAKES).forEach(function (k) { TAKES[k].forEach(function (n) { soundUrl(n, function (url) { have[n] = !!url; }); }); });
    function turns(k) {                                 // the next take of k that's there (the first, until any are known)
        var l = TAKES[k].filter(function (n) { return have[n]; });
        if (!l.length) return k;
        turnOf[k] = ((turnOf[k] || 0) + 1 + (Math.random() < .3 ? 1 : 0)) % l.length;   // (in turn, now and then skipping one)
        return l[turnOf[k]];
    }
    // taken in hand: its sounds fetched now, so the first shot and the first reload aren't late
    function warm() {
        if (warmed) return;
        warmed = true;
        ['bang', 'bang-2', 'white-bang', 'revolver-cock', 'revolver-open', 'revolver-close', 'revolver-load', 'revolver-load-2', 'revolver-load-3', 'revolver-load-4'].forEach(function (n) {
            soundUrl(n, function (url) { if (url) { var a = new Audio(); a.preload = 'auto'; a.src = url; } });
        });
    }

    /* ---------------- the cylinder, beside the reticle (its look: sky/css/revolver.css) ---------------- */
    var DRUM = '<svg class="placeholder" viewBox="0 0 200 200" aria-hidden="true">' +
        '<circle cx="100" cy="100" r="94" fill="var(--rv-edge)"/><circle cx="100" cy="100" r="88" fill="var(--rv-metal)"/>' +
        [0, 1, 2, 3, 4, 5].map(function (k) {            // (the flutes between the chambers, then the chambers themselves)
            var a = (k * 60 + 30) * Math.PI / 180, b = k * 60 * Math.PI / 180;
            return '<ellipse cx="' + (100 + 86 * Math.sin(a)).toFixed(1) + '" cy="' + (100 - 86 * Math.cos(a)).toFixed(1) + '" rx="13" ry="20" fill="var(--rv-edge)" transform="rotate(' + (k * 60 + 30) + ' ' + (100 + 86 * Math.sin(a)).toFixed(1) + ' ' + (100 - 86 * Math.cos(a)).toFixed(1) + ')"/>' +
                '<circle cx="' + (100 + 56 * Math.sin(b)).toFixed(1) + '" cy="' + (100 - 56 * Math.cos(b)).toFixed(1) + '" r="23" fill="var(--rv-hole)" stroke="var(--rv-edge)" stroke-width="3"/>';
        }).join('') +
        '<circle cx="100" cy="100" r="17" fill="var(--rv-edge)"/><path d="M100 88 L104 96 L112 100 L104 104 L100 112 L96 104 L88 100 L96 96 Z" fill="var(--rv-metal)"/>' +
        '<path d="M40 52 A70 70 0 0 1 120 32" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="5" stroke-linecap="round"/></svg>';
    var cyl = document.createElement('div');
    cyl.className = 'rv-cyl';
    cyl.setAttribute('aria-hidden', 'true');
    cyl.innerHTML = '<div class="rv-swing"><div class="rv-turn"><div class="rv-drum" data-slot="assets/ui/revolver-cylinder">' + DRUM + '</div>' +
        [0, 1, 2, 3, 4, 5].map(function (k) { return '<i class="rv-ch" style="--a:' + k * 60 + 'deg"></i>'; }).join('') + '</div></div><i class="rv-flash"></i>';
    body.appendChild(cyl);
    var drum = cyl.querySelector('.rv-drum'), chEls = cyl.querySelectorAll('.rv-ch'), drumArt = {};
    // the artist's own: the cylinder (and the white one's), a live round, a spent casing
    function art(slot, done) { Sky.findAsset(slot, function (url) { if (url) done(new URL(url, location.href).href); }); }
    art('assets/ui/revolver-cylinder', function (u) { drumArt.plain = u; dress(); });
    art('assets/ui/revolver-cylinder-white', function (u) { drumArt.white = u; dress(); });
    art('assets/ui/revolver-round', function (u) { cyl.style.setProperty('--rv-round', 'url("' + u + '")'); cyl.classList.add('has-round'); });
    art('assets/ui/revolver-spent', function (u) { cyl.style.setProperty('--rv-spent', 'url("' + u + '")'); cyl.classList.add('has-spent'); });
    function dress() {
        var u = (white && drumArt.white) || (!white && drumArt.plain);
        cyl.classList.toggle('white', white);
        drum.innerHTML = u ? '<img class="art" alt="" src="' + u + '">' : DRUM;
    }
    // what's in each chamber: 'live', 'spent' (fired, still in till the reload) or '' (empty). the chamber under the
    // hammer is turn % 6, and the drum's turned -60° for each step of turn, so that chamber's at the top
    var chambers = [], turn = 0, cocking = 0;
    function show() {
        cyl.style.setProperty('--rv-turn', turn);
        chEls.forEach(function (c, k) { c.classList.toggle('live', chambers[k] === 'live'); c.classList.toggle('spent', chambers[k] === 'spent'); });
    }
    function cockNow(quietly) {                         // the hammer back: the cylinder turns the next chamber up
        clearTimeout(cocking); cocking = 0;
        turn++;
        show();
        if (!quietly) { sfx('revolver-cock', { or: 'tap', volume: .75 }); again(cyl, 'cock'); }
    }
    var hover = !(window.matchMedia && matchMedia('(hover: none)').matches);
    document.addEventListener('pointermove', function (e) {
        if (!hover || e.pointerType === 'touch') return;
        cyl.style.left = e.clientX + 'px'; cyl.style.top = e.clientY + 'px';
    }, { passive: true });
    if (!hover) cyl.classList.add('pinned');             // (no pointer to ride beside on a phone: it sits over the bag)
    // taken in hand (from the bag, the garden's tag, anywhere): the cylinder comes up, and the hammer's cocked
    var held = null;
    new MutationObserver(function () {
        var h = body.dataset.holding, gun = h === 'revolver' || h === 'white-revolver' ? h : null;
        if (gun === held) return;
        held = gun;
        cyl.classList.toggle('on', !!gun);
        if (!gun) return;
        white = gun === 'white-revolver';
        dress();
        warm();
        if (!reloading) { sfx('revolver-cock', { or: 'tap', volume: .75 }); again(cyl, 'cock'); }
    }).observe(body, { attributes: true, attributeFilter: ['data-holding'] });
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
    // (as the page opens: the ones fired this visit are spent, just behind the chamber under the hammer)
    turn = Math.min(ROUNDS, fired());
    for (var k = 0; k < ROUNDS; k++) chambers[k] = k < turn ? 'spent' : 'live';
    show();
    function clearHoles(ms) {
        layer.querySelectorAll('.bullet-hole').forEach(function (h) {
            if (ms) { h.style.transition = 'opacity ' + ms + 'ms linear'; void h.offsetWidth; h.style.opacity = '0'; }
            setTimeout(function () { h.remove(); }, ms || 0);
        });
    }
    // swing the cylinder out, the casings drop, a round into each empty chamber (the cylinder turned to it each
    // time), snap it shut, cock it. how long it takes depends on how many go in (6: about 3.3 s)
    function reload() {
        if (reloading) return;
        if (cocking) cockNow(true);
        reloading = true;
        var t = 0, at = function (ms, fn) { setTimeout(fn, ms); };
        sfx('revolver-open', { or: 'pickup' });
        cyl.classList.add('open');
        var tilt = (turn * 60 + 22) * Math.PI / 180;     // (the drum's turned and swung: "down" for a chamber is turned with it)
        chEls.forEach(function (c, k) {                  // (the spent ones fall out, down the screen, each its own way)
            if (chambers[k] !== 'spent') return;
            var dx = Math.random() * 40 - 10, dy = 70;
            c.style.setProperty('--ex', (dx * Math.cos(tilt) - dy * Math.sin(tilt)).toFixed(1) + 'px');
            c.style.setProperty('--ey', (dx * Math.sin(tilt) + dy * Math.cos(tilt)).toFixed(1) + 'px');
            c.style.setProperty('--er', (Math.random() * 300 - 150).toFixed(0) + 'deg');
            again(c, 'out');
        });
        t = STEP.open;
        at(t, function () { chambers = chambers.map(function (c) { return c === 'spent' ? '' : c; }); chEls.forEach(function (c) { c.classList.remove('out'); }); show(); });
        var empty = 0;
        for (var k = 0; k < ROUNDS; k++) if (chambers[k] !== 'live') empty++;
        for (var i = 0; i < empty; i++) at(t + i * STEP.load, function () {
            for (var s = 0; s < ROUNDS && chambers[turn % ROUNDS] === 'live'; s++) turn++;   // (the next empty one to the gate)
            var c = turn % ROUNDS;
            chambers[c] = 'live';
            show();
            again(chEls[c], 'in');
            sfx(turns('revolver-load'), { or: 'tap', volume: .85 });
        });
        t += empty * STEP.load + 40;
        at(t, function () { cyl.classList.remove('open'); sfx('revolver-close', { or: 'tap' }); });
        t += STEP.close;
        at(t, function () { sfx('revolver-cock', { or: 'tap', volume: .75 }); again(cyl, 'cock'); });
        t += STEP.cock - 130 + STEP.settle;
        I.say('reloading…', t);
        clearHoles(t);
        at(t, function () { reloading = false; setFired(0); });
    }
    // a round goes: false if it's still reloading (nothing happens)
    function spend() {
        if (reloading) { I.say('reloading…', 900); return false; }
        if (cocking) cockNow(true);                      // (fired again before the hammer was back: fanned, no sound)
        var n = fired() + 1;
        setFired(n);
        chambers[turn % ROUNDS] = 'spent';
        show();
        if (n >= ROUNDS) setTimeout(reload, 350);
        else cocking = setTimeout(function () { cockNow(); }, STEP.shotCock);
        return true;
    }
    if (fired() >= ROUNDS) reload();                                // (the page changed mid-reload: finish it)
    // R, while it's in hand: load the ones spent now, without emptying it first
    document.addEventListener('keydown', function (e) {
        if ((e.key !== 'r' && e.key !== 'R') || !held || reloading || e.ctrlKey || e.metaKey || e.altKey) return;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
        if (!fired()) { I.say('it’s full.', 1200); return; }
        reload();
    });
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
        var hint = f.querySelector('.gf-hint');
        if (hint) { f.dataset.hintWas = hint.textContent; hint.textContent = 'shot to pieces'; }
        var l = shotList(), k = frameKey(f);
        if (l.indexOf(k) === -1) { l.push(k); try { sessionStorage.setItem(SHOT_KEY, JSON.stringify(l)); } catch (e) {} }
        tell('dav:painting-shot', { frame: f, x: x, y: y });
    }
    // paintings put back together (sky/hell.js: the apparitions, back in their frames): which(wall, frame) says which
    function mend(which) {
        var here = location.pathname.replace(/.*\//, '');
        var l = shotList().filter(function (k) { var p = k.split('|'); return !which(p[1], p[2], p[0]); });
        try { sessionStorage.setItem(SHOT_KEY, JSON.stringify(l)); } catch (e) {}
        Array.prototype.forEach.call(document.querySelectorAll('.gallery-frame.shot'), function (f) {
            if (!which(f.dataset.wall || '', f.dataset.frame, here)) return;
            f.classList.remove('shot');
            var hint = f.querySelector('.gf-hint');
            if (hint && f.dataset.hintWas !== undefined) hint.textContent = f.dataset.hintWas;
        });
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
    var dying = false, jamAt = 0;
    // from reset 2 on, turned on the traveller it only ever jams (a line each time, in turn)
    var JAMMED = ['it\u2019s jammed.', 'click. nothing. it won\u2019t fire at me any more.', 'jammed again. it only fires at other things now.',
        'the hammer won\u2019t even come down.', 'click. this isn\u2019t how it ends. not this time.'];
    function takeIt(c) {
        if (dying) return;
        var S = window.davSave;
        if (S && !S.live('revolver')) {
            Sky.sfx('jammed', { or: 'tap' });
            I.say(JAMMED[jamAt++ % JAMMED.length], 2200);
            return;
        }
        if (Sky.lives && Sky.lives.refuse('revolver')) return;                    // (from reset 2, not before the key: sky/lives.js)
        // the lock's off and there's more than one heart left: it won't fire (sky/lives.js; with one heart, never)
        if (Sky.lives && Sky.lives.jammed) {
            Sky.sfx('jammed', { or: 'tap' });
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

    var WONT = ['It won\u2019t turn towards me. It knows what it\u2019s for.', 'My arm won\u2019t do it. This one isn\u2019t for me.', 'No. It\u2019s for them.'], wontAt = 0;
    I.onUse(function (id, e) {
        if (id !== 'revolver' && id !== 'white-revolver') return false;
        white = id === 'white-revolver';
        var x = e.clientX, y = e.clientY, t = e.target;
        var c = traveller(t);
        if (c && white) { I.say(WONT[wontAt++ % WONT.length], 2400); return true; }
        if (c) { takeIt(c); return true; }                              // (it counts its own round: a jam doesn't use one)
        // the bee in the front garden (sky/bee.js): it weaves out of the way, every time (and it remembers)
        if (Sky.bee && Sky.bee.aimedAt && Sky.bee.aimedAt(x, y, t)) { if (!spend()) return true; bang(); hole(x, y); Sky.bee.shot(x, y, id); return true; }
        var claube = t.closest && t.closest('.mini-claube'), deck = t.closest && t.closest('.turntable'), frame = t.closest && t.closest('.gallery-frame[data-frame]');
        if (!claube && !deck && !frame && t.closest && t.closest('.cp, .place-tabs, .sky-links, .marker-tray, .bee-talk, a[href], button')) return false;   // (the controls still work)
        if (!spend()) return true;
        // below, in reset 4: the eye (sky/hell.js). the white revolver bursts it and it gives up the key
        var eye = t.closest && t.closest('.hell .hl-eye');
        if (eye && Sky.hell && Sky.hell.shootEye) { bang(); if (!Sky.hell.shootEye(x, y, white)) hole(x, y); return true; }
        if (claube && Sky.claubes) { bang(); Sky.claubes.shoot(claube, x, y, { white: white }); return true; }
        if (deck) { shootRecord(x, y); return true; }
        var god = frame && frame.dataset.frame === '6' && frame.dataset.wall === 'shame';
        // the white revolver at the false god: the end of reset 4, or not yet (sky/claubes.js)
        if (god && white && Sky.claubes && Sky.claubes.whiteFrame) { bang(); if (!Sky.claubes.whiteFrame(frame, x, y)) { hole(x, y); tell('dav:shot', { target: t, x: x, y: y }); } return true; }
        if (god && Sky.claubes && Sky.claubes.guardFrame && Sky.claubes.guardFrame(x, y)) { bang(); return true; }   // (the false god's circle protects it)
        // reset 4: the false god's frame won't break for the ordinary revolver (a hole; the hidden record still falls out)
        if (god && window.davSave && window.davSave.live('diagram')) { bang(); hole(x, y); tell('dav:shot', { target: t, x: x, y: y }); return true; }
        if (frame) { shootPainting(frame, x, y); return true; }
        bang();
        hole(x, y);
        tell('dav:shot', { target: t, x: x, y: y });
        return true;
    });

    // where the ordinary revolver is (27 Sep): only ever one. reset 1: on the rooftop. from reset 2: hung on the
    // living-room wall (.wall-revolver, on its rack), where it only jams on the traveller: a thing to shoot things with.
    // reset 4 (so nothing can go wrong): nowhere, and not in the bag: the only revolver is the white one, from the pact
    // (and while the bee in the front garden has it, or once it's stung it to pieces, this visit: sky/bee.js)
    function withBee(id) { try { return sessionStorage.getItem('bee-gun') === id || (' ' + (sessionStorage.getItem('bee-broke') || '') + ' ').indexOf(' ' + id + ' ') !== -1; } catch (e) { return false; } }
    // and once the bee's had it for good (11 Oct: in reset 1 it takes it and shoots them with it; in 2 to 7, given
    // back and shot at again, it stings it to pieces), it's gone: off the wall till reset 8, where everything's as it was
    // (localStorage revolver-gone: bee / broken)
    function destroyed(r) { try { return r < 8 && !!localStorage.getItem('revolver-gone'); } catch (e) { return false; } }
    (function () {
        var S = window.davSave, r = S ? S.reset : 1, gone = r === 4 || destroyed(r);
        document.querySelectorAll('.pickup[data-item="revolver"]').forEach(function (p) {
            if (gone || (r === 1) === p.classList.contains('wall-revolver')) p.remove();
            else if (withBee('revolver')) p.classList.add('with-bee');
        });
        if (gone && I.has('revolver')) I.remove('revolver');
    })();
    // the revolver the front garden's "I'm just here for the bee" handed over (sky/beerush.js, 12 Oct) stays theirs: put
    // back in the bag each visit, so the rooftop's (or the wall's) stays empty. not in reset 4, not once it's gone, not
    // while the bee has it (localStorage bee-rush-taken)
    (function () {
        var S = window.davSave, r = S ? S.reset : 1, mine = false;
        try { mine = localStorage.getItem('bee-rush-taken') === '1'; } catch (e) {}
        if (mine && r !== 4 && !destroyed(r) && !withBee('revolver') && !I.has('revolver')) I.add('revolver', { quiet: true });
    })();
    // the white revolver stays theirs for the rest of reset 4 (the bag itself only lasts the visit)
    (function () {
        var S = window.davSave;
        if (S && S.get('white-revolver') === 'taken' && !I.has('white-revolver') && !withBee('white-revolver')) I.add('white-revolver', { quiet: true });
    })();

    Sky.revolver = { bang: bang, hole: hole, mend: mend, get left() { return reloading ? 0 : ROUNDS - fired(); }, get reloading() { return reloading; } };
})();

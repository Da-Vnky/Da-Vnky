/* =====================================================================
   tub.js — the bathroom's bathtub, the living space's toaster, and a
   little inventory to carry things between them.
     • the tap: click it and the tub fills (click again to turn it off;
       click a full tub's tap to pull the plug)
     • the toaster (on the living space's floor, by the plant): click it
       and it goes in your inventory (bottom left). click it there, then
       click the tub, and in it goes.
     • the traveller in the bathroom can be picked up (they struggle) and
       dropped in the tub. a full tub with the toaster in it: they're
       electrocuted down to a skeleton, and back a moment later (-1).
   the toaster comes back to the living space after.

   slots (stand-ins until yours are in):
     assets/living/toaster       the toaster, about 10:7
     assets/living/bath-water    the water's surface, stretched along the top of the tub
     assets/living/bath-outlet   the socket on the wall the toaster's plugged into
     assets/ui/inventory         the bag your things go in
   plus sky/gore.js's (the skeleton, the heart). sounds: assets/sounds/tap, fizz,
   pickup, splash, zap, scream, respawn.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var bath = document.querySelector('.bathroom');
    if (!Sky || !bath) return;
    var body = document.body;
    var me = bath.querySelector('.bath-character');
    function T() { return bath.querySelector('.bath-tub'); }        // (your art replaces the drawing, so look it up each time)
    var tub = T();
    var livingToaster = document.querySelector('.room .toaster');
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }

    // what the traveller says while held up (the words are all here)
    var HELD_LINES = ['Hey! Put me down!', 'Not the bath!', 'I SAID PUT ME DOWN!'];
    var TUB_LINES = { cold: 'It’s freezing!', dry: 'There’s no water in here.', toaster: 'Is that… plugged in?' };

    Sky.css(
        // the tap, the water, the stream
        '.tub-tap { position: absolute; z-index: 3; padding: 0; border: 0; background: none; cursor: pointer; border-radius: 50%; }' +
        '.tub-tap:hover, .tub-tap:focus-visible { background: radial-gradient(circle, rgba(255,255,255,.5), transparent 70%); outline: none; }' +
        '.tub-tap .tt-hint { position: absolute; left: 50%; bottom: calc(100% + 4px); transform: translateX(-50%); white-space: nowrap; font-style: italic; font-size: .9rem;' +
            'color: #2a1d14; text-shadow: 0 1px 2px rgba(255,255,255,.7); opacity: 0; transition: opacity .25s; pointer-events: none; }' +
        '.tub-tap:hover .tt-hint, .tub-tap:focus-visible .tt-hint { opacity: 1; }' +
        '.tub-water { position: absolute; z-index: 1; pointer-events: none; transform-origin: 50% 100%; transform: scaleY(0); border-radius: 40% 40% 6px 6px / 70% 70% 6px 6px;' +
            'background: linear-gradient(#d4f0f7, #8fc9dc 60%, #6fb2c9); box-shadow: inset 0 2px 0 rgba(255,255,255,.7); opacity: .92; }' +
        '.tub-water.has-art { background: var(--water-art) center / 100% 100% no-repeat; box-shadow: none; }' +
        '.tub-water::after { content: ""; position: absolute; left: 10%; right: 10%; top: 18%; height: 12%; border-radius: 50%; background: rgba(255,255,255,.45); animation: tub-ripple 2.6s ease-in-out infinite; }' +
        '@keyframes tub-ripple { 50% { transform: scaleX(.8) translateX(6%); opacity: .6; } }' +
        '.tub-stream { position: absolute; z-index: 1; width: 4px; margin-left: -2px; pointer-events: none; border-radius: 2px; opacity: 0; transition: opacity .2s;' +
            'background: repeating-linear-gradient(#c8ecf6 0 6px, #9fd6e6 6px 12px); background-size: 100% 12px; animation: tub-pour .3s linear infinite; }' +
        '.tub-stream.on { opacity: .9; }' +
        '@keyframes tub-pour { to { background-position: 0 12px; } }' +
        // the toaster: in the living space, in your bag, in the tub
        '.toaster { cursor: pointer; filter: drop-shadow(0 4px 5px rgba(0,0,0,.4)); transition: transform .2s; }' +
        '.toaster:hover, .toaster:focus-visible { transform: translateY(-3px) rotate(-3deg); outline: none; }' +
        '.toaster > svg, .toaster > .art, .tub-toaster > svg, .tub-toaster > .art { display: block; width: 100%; height: 100%; object-fit: contain; }' +
        '.toaster .ts-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap; font-style: italic; font-size: .9rem;' +
            'color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.7); opacity: 0; transition: opacity .25s; pointer-events: none; }' +
        '.toaster:hover .ts-hint { opacity: 1; }' +
        '.toaster.taken { visibility: hidden; }' +
        '.tub-toaster { position: absolute; z-index: 1; pointer-events: none; transform: rotate(-18deg); visibility: hidden; }' +
        '.tub-toaster.in { visibility: visible; }' +
        '.tub-cord { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: visible; visibility: hidden; }' +
        '.tub-cord.in { visibility: visible; }' +
        '.tub-cord path { fill: none; stroke: #1f1a18; stroke-width: 2.5; stroke-linecap: round; }' +
        '.bath-outlet { position: absolute; z-index: 2; pointer-events: none; }' +
        '.bath-outlet > svg, .bath-outlet > .art { display: block; width: 100%; height: 100%; }' +
        '.tub-sparks { position: absolute; z-index: 3; pointer-events: none; overflow: visible; }' +
        '.tub-sparks path { fill: none; stroke: #fff27a; stroke-width: 2; stroke-linecap: round; filter: drop-shadow(0 0 3px #7fd0ff); }' +
        // the traveller, held and dropped
        '.bath-character.held { cursor: grabbing; filter: drop-shadow(0 16px 10px rgba(0,0,0,.35)); z-index: 5 !important; }' +
        '.bath-character.held:not(.has-held) > .placeholder, .bath-character.held:not(.has-held) > .art { animation: tub-struggle .09s linear infinite alternate; }' +
        '@keyframes tub-struggle { from { transform: rotate(-7deg) translateX(-2px); } to { transform: rotate(7deg) translateX(2px); } }' +
        '.bath-character { touch-action: none; cursor: grab; }' +
        '.bath-character .bubble.shout { color: #9a3b1f; }' +
        // the inventory, bottom left
        '.inventory { position: fixed; left: 14px; bottom: 14px; z-index: 6; display: flex; align-items: center; gap: 8px; padding: 6px 10px 6px 6px; border-radius: 999px;' +
            'background: rgba(234,220,185,.92); box-shadow: 0 4px 12px rgba(0,0,0,.35); font: italic .9rem "IM Fell English", Georgia, serif; color: #3a2716;' +
            'transform: translateY(160%); transition: transform .35s cubic-bezier(.3,1.4,.5,1); }' +
        '.inventory.has { transform: none; }' +
        '.inventory .inv-bag { width: 34px; height: 34px; display: block; }' +
        '.inventory .inv-bag > svg, .inventory .inv-bag > .art { width: 100%; height: 100%; display: block; }' +
        '.inventory .inv-item { width: 44px; height: 34px; padding: 2px; border: 1.5px solid rgba(110,82,54,.35); border-radius: 8px; background: #f8f0dc; cursor: pointer; }' +
        '.inventory .inv-item:hover, .inventory .inv-item[aria-pressed=true] { border-color: #9a3b1f; background: #fff8e6; }' +
        '.inventory .inv-item > svg, .inventory .inv-item > img { width: 100%; height: 100%; display: block; object-fit: contain; }' +
        '.inv-cursor { position: fixed; z-index: 10; width: 56px; pointer-events: none; transform: translate(-50%, -50%) rotate(-10deg); display: none; filter: drop-shadow(0 6px 6px rgba(0,0,0,.4)); }' +
        '.inv-cursor > svg, .inv-cursor > img { width: 100%; display: block; }' +
        'body.inv-holding .inv-cursor { display: block; }' +
        'body.inv-holding .bath-tub { cursor: copy; }' +
        '.inv-note { position: fixed; left: 50%; bottom: 22px; z-index: 6; transform: translateX(-50%); padding: 4px 14px; border-radius: 999px; background: rgba(40,28,18,.85);' +
            'color: #f3e6c2; font: italic .95rem "IM Fell English", Georgia, serif; opacity: 0; transition: opacity .3s; pointer-events: none; }' +
        '.inv-note.on { opacity: 1; }' +
        'body.mirror-open .inventory, body.leaving .inventory, body.sky-view .inventory, body.records-open .inventory, body.crate-open .inventory { opacity: 0; pointer-events: none; }'
    );

    var TOASTER = '<svg class="placeholder" viewBox="0 0 100 70" aria-hidden="true">' +
        '<rect x="8" y="14" width="84" height="50" rx="14" fill="#c9ccd0"/><rect x="8" y="14" width="84" height="50" rx="14" fill="none" stroke="#8d939a" stroke-width="2"/>' +
        '<path d="M16 22 Q18 18 28 18" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>' +
        '<rect x="24" y="10" width="22" height="8" rx="2" fill="#2a2420"/><rect x="54" y="10" width="22" height="8" rx="2" fill="#2a2420"/>' +
        '<path d="M26 12 Q35 2 44 12 Z" fill="#d8a25a"/><path d="M56 12 Q65 3 74 12 Z" fill="#d8a25a"/>' +
        '<rect x="88" y="34" width="8" height="5" rx="2" fill="#2a2420"/><rect x="18" y="62" width="10" height="5" fill="#2a2420"/><rect x="72" y="62" width="10" height="5" fill="#2a2420"/>' +
        '<circle cx="76" cy="46" r="4" fill="#9a3b1f"/></svg>';
    var BAG = '<svg class="placeholder" viewBox="0 0 40 40" aria-hidden="true"><path d="M8 14 Q20 8 32 14 L35 34 Q20 40 5 34 Z" fill="#8a5a34"/><path d="M14 13 Q20 3 26 13" stroke="#5a3a24" stroke-width="3" fill="none"/>' +
        '<path d="M9 18 Q20 22 31 18" stroke="#5a3a24" stroke-width="2" fill="none"/><circle cx="20" cy="21" r="2.2" fill="#c49a52"/></svg>';
    var OUTLET = '<svg class="placeholder" viewBox="0 0 30 40" aria-hidden="true"><rect x="1" y="1" width="28" height="38" rx="4" fill="#f4f1ea" stroke="#b9b3a6"/>' +
        '<g fill="#3a3530"><rect x="9" y="10" width="3" height="7" rx="1"/><rect x="18" y="10" width="3" height="7" rx="1"/><rect x="9" y="24" width="3" height="7" rx="1"/><rect x="18" y="24" width="3" height="7" rx="1"/></g></svg>';

    /* ---------------- the state (this visit) ---------------- */
    var st = { level: 0, toaster: 'living', inTub: false };
    try { var saved = JSON.parse(sessionStorage.getItem('bath-state') || 'null'); if (saved) { st.level = +saved.level || 0; st.toaster = saved.toaster || 'living'; } } catch (e) {}
    function save() { try { sessionStorage.setItem('bath-state', JSON.stringify({ level: st.level, toaster: st.toaster })); } catch (e) {} }

    /* ---------------- the inventory ---------------- */
    var inv = document.createElement('div');
    inv.className = 'inventory';
    inv.setAttribute('aria-label', 'your things');
    inv.innerHTML = '<span class="inv-bag" data-asset="assets/ui/inventory">' + BAG + '</span><span class="inv-items"></span>';
    body.appendChild(inv);
    var cursor = document.createElement('div');
    cursor.className = 'inv-cursor';
    body.appendChild(cursor);
    var note = document.createElement('div');
    note.className = 'inv-note';
    body.appendChild(note);
    var toasterArt = TOASTER;
    Sky.findAsset('assets/living/toaster', function (url) { if (url) { toasterArt = '<img alt="" src="' + url + '">'; drawInv(); dressTubToaster(); } });
    var holding = null, noteTimer = 0;
    function say(t, ms) { note.textContent = t; note.classList.add('on'); clearTimeout(noteTimer); noteTimer = setTimeout(function () { note.classList.remove('on'); }, ms || 2600); }
    function drawInv() {
        var box = inv.querySelector('.inv-items');
        box.innerHTML = '';
        if (st.toaster === 'inv') {
            var b = document.createElement('button');
            b.type = 'button'; b.className = 'inv-item'; b.innerHTML = toasterArt;
            b.title = 'the toaster'; b.setAttribute('aria-label', 'the toaster');
            b.setAttribute('aria-pressed', String(holding === 'toaster'));
            b.addEventListener('click', function (e) { e.stopPropagation(); holding === 'toaster' ? letGoOfItem() : holdItem('toaster'); });
            box.appendChild(b);
        }
        inv.classList.toggle('has', st.toaster === 'inv');
    }
    function holdItem(id) {
        holding = id;
        cursor.innerHTML = toasterArt;
        body.classList.add('inv-holding');
        say(body.classList.contains('in-bath') ? 'click the bathtub to drop it in' : 'the bathroom’s through the arrow on the right', 3200);
        drawInv();
    }
    function letGoOfItem() { holding = null; body.classList.remove('inv-holding'); drawInv(); }
    document.addEventListener('pointermove', function (e) { if (holding) { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; } });
    document.addEventListener('click', function (e) {
        if (!holding || inv.contains(e.target)) return;
        if (T() && T().contains(e.target) || e.target.closest && e.target.closest('.bath-tub')) { e.preventDefault(); e.stopPropagation(); toasterIntoTub(); return; }
        letGoOfItem();
    }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && holding) letGoOfItem(); });

    /* ---------------- the toaster in the living space ---------------- */
    if (livingToaster) {
        if (!livingToaster.querySelector('.placeholder, img')) livingToaster.insertAdjacentHTML('afterbegin', TOASTER);
        livingToaster.insertAdjacentHTML('beforeend', '<span class="ts-hint">a toaster</span>');
        livingToaster.setAttribute('role', 'button');
        livingToaster.setAttribute('tabindex', '0');
        livingToaster.setAttribute('aria-label', 'take the toaster');
        var take = function () {
            if (st.toaster !== 'living') return;
            st.toaster = 'inv'; save();
            sfx('pickup');
            livingToaster.classList.add('taken');
            drawInv();
            say('the toaster’s in your bag (bottom left)');
        };
        livingToaster.addEventListener('click', take);
        livingToaster.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); take(); } });
    }
    function showLivingToaster() { if (livingToaster) livingToaster.classList.toggle('taken', st.toaster !== 'living'); }

    /* ---------------- the tub: tap, water, stream, the toaster in it ---------------- */
    if (!tub) { drawInv(); showLivingToaster(); return; }
    var tap = document.createElement('button');
    tap.type = 'button'; tap.className = 'tub-tap'; tap.setAttribute('aria-label', 'the tap');
    tap.innerHTML = '<span class="tt-hint">turn the tap</span>';
    var water = document.createElement('div'); water.className = 'tub-water'; water.dataset.slot = 'assets/living/bath-water';
    var stream = document.createElement('div'); stream.className = 'tub-stream';
    var tt = document.createElement('div'); tt.className = 'tub-toaster';
    var cord = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); cord.setAttribute('class', 'tub-cord'); cord.innerHTML = '<path/>';
    var outlet = document.createElement('div'); outlet.className = 'bath-outlet'; outlet.dataset.asset = 'assets/living/bath-outlet'; outlet.innerHTML = OUTLET;
    var sparks = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sparks.setAttribute('class', 'tub-sparks'); sparks.setAttribute('viewBox', '0 0 100 100'); sparks.setAttribute('preserveAspectRatio', 'none'); sparks.innerHTML = '<path/>';
    [water, stream, tt, cord, outlet, sparks, tap].forEach(function (x) { bath.appendChild(x); });
    Sky.fillAssets(outlet);
    Sky.findAsset('assets/living/bath-water', function (url) { if (url) { water.style.setProperty('--water-art', 'url("' + new URL(url, location.href).href + '")'); water.classList.add('has-art'); } });
    function dressTubToaster() { tt.innerHTML = toasterArt; }
    dressTubToaster();

    // everything is laid out from where the tub is (the drawn tub: the spout at 83% across, the rim 17% down)
    var box = {};
    function layout() {
        var t = T(), W = t.offsetWidth || (t.getBoundingClientRect && t.getBoundingClientRect().width), H = t.offsetHeight || t.getBoundingClientRect().height;
        if (!W) return;
        var br = bath.getBoundingClientRect(), tr = t.getBoundingClientRect(), L = tr.left - br.left, Tp = tr.top - br.top;
        box = { L: L, T: Tp, W: W, H: H };
        tap.style.left = (L + W * 0.78) + 'px'; tap.style.top = (Tp - H * 0.06) + 'px'; tap.style.width = (W * 0.16) + 'px'; tap.style.height = (H * 0.26) + 'px';
        water.style.left = (L + W * 0.05) + 'px'; water.style.width = (W * 0.9) + 'px'; water.style.top = (Tp + H * 0.08) + 'px'; water.style.height = (H * 0.12) + 'px';
        stream.style.left = (L + W * 0.827) + 'px'; stream.style.top = (Tp + H * 0.07) + 'px'; stream.style.height = (H * 0.14) + 'px';
        tt.style.left = (L + W * 0.2) + 'px'; tt.style.top = (Tp - H * 0.08) + 'px'; tt.style.width = (W * 0.2) + 'px'; tt.style.height = (W * 0.14) + 'px';
        outlet.style.left = (L - W * 0.07) + 'px'; outlet.style.top = (Tp - H * 0.62) + 'px'; outlet.style.width = (W * 0.045) + 'px'; outlet.style.height = (W * 0.06) + 'px';
        var ox = L - W * 0.07 + W * 0.0225, oy = Tp - H * 0.62 + W * 0.045, tx = L + W * 0.21, ty = Tp + H * 0.02;
        cord.querySelector('path').setAttribute('d', 'M ' + ox + ' ' + oy + ' C ' + (ox - 10) + ' ' + (oy + 60) + ', ' + (tx - 40) + ' ' + (ty - 50) + ', ' + tx + ' ' + ty);
        sparks.style.left = (L + W * 0.08) + 'px'; sparks.style.top = (Tp - H * 0.2) + 'px'; sparks.style.width = (W * 0.84) + 'px'; sparks.style.height = (H * 0.45) + 'px';
    }
    layout();
    window.addEventListener('resize', layout);
    window.addEventListener('load', layout);
    new MutationObserver(layout).observe(bath, { childList: true });
    if (window.ResizeObserver) new ResizeObserver(layout).observe(bath);
    document.addEventListener('transitionend', function (e) { if (e.target === bath) layout(); });

    function showWater() { water.style.transform = 'scaleY(' + Math.max(0, Math.min(1, st.level)).toFixed(3) + ')'; }
    function showToaster() {
        tt.classList.toggle('in', st.toaster === 'tub');
        cord.classList.toggle('in', st.toaster === 'tub');
        showLivingToaster();
        drawInv();
    }
    showWater(); showToaster();

    var running = null;          // { from, to, t0, ms }
    function runWater(to, ms) {
        running = { from: st.level, to: to, t0: performance.now(), ms: ms };
        stream.classList.toggle('on', to > st.level);
        (function step(now) {
            if (!running) return;
            var k = Math.min(1, (now - running.t0) / running.ms);
            st.level = running.from + (running.to - running.from) * k;
            showWater();
            if (st.level > 0.35 && st.toaster === 'tub') live();
            if (k < 1) requestAnimationFrame(step);
            else { running = null; stream.classList.remove('on'); save(); }
        })(performance.now());
    }
    tap.addEventListener('click', function (e) {
        e.stopPropagation();
        if (holding) { toasterIntoTub(); return; }
        if (running) { running = null; stream.classList.remove('on'); save(); sfx('land', { size: 0.15 }); return; }   // off
        if (st.level >= 0.98) { runWater(0, 2600); sfx('surface'); say('you pull the plug'); return; }                       // drain it
        var secs = (1 - st.level) * 4.5;
        runWater(1, secs * 1000);
        sfx('tap', { size: secs });
    });

    /* ---------------- danger ---------------- */
    function sparkPath() {
        var d = '';
        for (var k = 0; k < 5; k++) {
            var x = 10 + Math.random() * 80, y = 30 + Math.random() * 50;
            d += 'M ' + x.toFixed(0) + ' ' + y.toFixed(0);
            for (var j = 0; j < 4; j++) { x += (Math.random() - .5) * 20; y += (Math.random() - .5) * 20; d += ' L ' + x.toFixed(0) + ' ' + y.toFixed(0); }
            d += ' ';
        }
        return d;
    }
    function crackle(ms) {
        var p = sparks.querySelector('path'), until = performance.now() + (ms || 500);
        (function f() { if (performance.now() > until) { p.setAttribute('d', ''); return; } p.setAttribute('d', sparkPath()); setTimeout(f, 60); })();
    }
    // a live toaster in a full enough tub: it fizzes now and then, and anyone in there gets it
    var fizzTimer = 0;
    function live() {
        if (st.inTub && !zapping) return electrocute();
        if (fizzTimer) return;
        (function again() {
            if (st.toaster !== 'tub' || st.level < 0.35) { fizzTimer = 0; return; }
            if (body.classList.contains('in-bath')) { crackle(400); sfx('fizz'); }
            fizzTimer = setTimeout(again, 3500 + Math.random() * 4000);
        })();
    }
    function toasterIntoTub() {
        if (holding !== 'toaster') return;
        letGoOfItem();
        st.toaster = 'tub'; save();
        showToaster();
        if (st.level > 0.35) { sfx('splash', { size: 0.2 }); sfx('fizz', { delay: 0.15 }); crackle(900); say('it fizzes and sparks in the water'); }
        else { sfx('land', { size: 0.4 }); say('it sits in the tub, still plugged in'); }
        if (st.level > 0.35) live();
    }

    /* ---------------- the traveller: pick them up, drop them in ---------------- */
    var pick = null, zapping = false, fallId = 0;
    function hostRect() { return bath.getBoundingClientRect(); }
    function floorB() { return Math.round(window.innerHeight * 0.03); }
    function setPos(leftPx, bottomPx) { me.style.left = leftPx + 'px'; me.style.bottom = bottomPx + 'px'; }
    function bubble() {
        var b = me.querySelector('.bubble');
        if (!b) { b = document.createElement('span'); b.className = 'bubble'; me.appendChild(b); }
        return b;
    }
    function shout(t) { var b = bubble(); b.textContent = t; b.classList.add('shout'); me.classList.add('talking'); }
    function hush(ms) { setTimeout(function () { me.classList.remove('talking'); }, ms || 0); }

    me.addEventListener('pointerdown', function (e) {
        if (zapping || me.classList.contains('gore-hidden') || !body.classList.contains('in-bath') || (Sky.sides && Sky.sides.busy)) return;
        e.preventDefault();
        me.setPointerCapture(e.pointerId);
        pick = { x: e.clientX, y: e.clientY, on: false };
    });
    me.addEventListener('pointermove', function (e) {
        if (!pick) return;
        var r = hostRect();
        if (!pick.on) {
            if (Math.hypot(e.clientX - pick.x, e.clientY - pick.y) < 6) return;
            pick.on = true;
            fallId++;
            me.style.transitionDuration = '0s';
            me.style.zIndex = '';
            st.inTub = false;
            me.classList.remove('walking', 'face-left');
            me.classList.add('held');
            var mr = me.getBoundingClientRect();
            pick.dx = e.clientX - mr.left;
            pick.db = mr.bottom - e.clientY;
            var i = 0;
            shout(HELD_LINES[0]);
            pick.lines = setInterval(function () { i = Math.min(i + 1, HELD_LINES.length - 1); shout(HELD_LINES[i]); }, 1300);
        }
        setPos(e.clientX - r.left - pick.dx, r.bottom - e.clientY - pick.db);
    });
    function letGo() {
        if (!pick) return;
        var p = pick; pick = null;
        clearInterval(p.lines);
        if (!p.on) return;
        me.classList.remove('held');
        hush(300);
        drop();
    }
    me.addEventListener('pointerup', letGo);
    me.addEventListener('pointercancel', letGo);
    me.addEventListener('click', function (e) { e.stopImmediatePropagation(); }, true);   // (no "talking" toggle here)

    function fallTo(toB, done) {
        var id = ++fallId, fromB = parseFloat(me.style.bottom) || 0, t0 = performance.now(), ms = 220 + Math.max(0, fromB - toB) / 2.4;
        (function f(now) {
            if (id !== fallId) return;
            var k = Math.min(1, (now - t0) / ms);
            me.style.bottom = (fromB + (toB - fromB) * k * k).toFixed(1) + 'px';
            if (k < 1) requestAnimationFrame(f); else if (done) done();
        })(t0);
    }
    function drop() {
        var r = hostRect(), mr = me.getBoundingClientRect(), cx = mr.left + mr.width / 2, tr = T().getBoundingClientRect();
        var overTub = cx > tr.left + tr.width * 0.08 && cx < tr.right - tr.width * 0.12 && mr.bottom < tr.top + tr.height * 0.35;
        if (overTub) {
            var inB = r.bottom - (tr.top + tr.height * 0.66);
            me.style.zIndex = '1';                               // behind the tub's side: sitting in it
            fallTo(inB, function () {
                st.inTub = true;
                if (st.level > 0.35) { sfx('splash', { size: 0.45 }); } else sfx('land', { size: 0.6 });
                if (st.level > 0.35 && st.toaster === 'tub') { electrocute(); return; }
                shout(st.level > 0.35 ? (st.toaster === 'living' || st.toaster === 'inv' ? TUB_LINES.cold : TUB_LINES.cold) : (st.toaster === 'tub' ? TUB_LINES.toaster : TUB_LINES.dry));
                hush(1800);
            });
            return;
        }
        fallTo(floorB(), function () { sfx('land', { size: 0.7 }); });
    }
    function electrocute() {
        if (zapping || !Sky.gore) return;
        zapping = true;
        me.classList.remove('talking', 'held');
        crackle(1600);
        Sky.gore.zap(me, function () {
            // back again: standing by the mirror, the toaster back in the living space
            me.style.zIndex = '';
            me.style.bottom = '';
            if (Sky.sides) Sky.sides.place(me, 28); else me.style.left = '28%';
            st.inTub = false;
            st.toaster = 'living'; save();
            showToaster();
            zapping = false;
            Sky.gore.respawn(me);
        });
    }

    drawInv();
})();

/* =====================================================================
   tub.js — the bathroom's bathtub and the living space's toaster.
     • the tap: click it and the tub fills (click again to turn it off)
     • the plug (on its chain, at the tub's near end): pull it and the tub
       drains, gurgling; push it back in to keep the water in
     • the toaster (on the living space's floor, by the plant): click it and
       it goes in your bag (bottom left; sky/inventory.js). hold it (click it
       in the bag), click anywhere in the bathroom and you let go of it there:
       it falls. over the tub, in it goes (still plugged in); anywhere else,
       it clatters to the floor, where you can pick it up again. you can also
       fish it out of the tub.
     • the traveller in the bathroom can be picked up (they struggle) and
       dropped in the tub. a full tub with the toaster in it: they're
       electrocuted down to a skeleton, and back a moment later (-1).
   the toaster comes back to the living space after.

   slots (stand-ins until yours are in):
     assets/living/toaster       the toaster, about 10:7
     assets/living/bath-water    the water's surface, stretched along the top of the tub
     assets/living/bath-outlet   the socket on the wall the toaster's plugged into
     assets/living/bath-plug     the plug on its chain, about 1:2 (the chain hangs from the top)
   plus sky/gore.js's (the skeleton, the heart). sounds: assets/sounds/tub-tap and tub-drain
   (loops), and fizz, pickup, splash, land, zap, scream, respawn, cork-pop, cork-in.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var bath = document.querySelector('.bathroom');
    if (!Sky || !bath) return;
    var body = document.body;
    var I = Sky.inventory;                                          // the bag (sky/inventory.js)
    var me = bath.querySelector('.bath-character');
    function T() { return bath.querySelector('.bath-tub'); }        // (your art replaces the drawing, so look it up each time)
    var tub = T();
    var livingToaster = document.querySelector('.room .toaster');
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }
    function say(t, ms) { if (I) I.say(t, ms); }

    // what the traveller says while held up (the words are all here)
    var HELD_LINES = ['Hey! Put me down!', 'Not the bath!', 'I SAID PUT ME DOWN!'];
    var TUB_LINES = { cold: 'It’s freezing!', dry: 'There’s no water in here.', toaster: 'Is that… plugged in?' };
    var FILL_SECS = 4.5, DRAIN_SECS = 3.2;                           // an empty tub to full, a full one to empty

    Sky.css(
        // the tap, the water, the stream
        '.tub-tap { position: absolute; z-index: 3; padding: 0; border: 0; background: none; cursor: pointer; border-radius: 50%; }' +
        '.tub-tap:hover, .tub-tap:focus-visible { background: radial-gradient(circle, rgba(255,255,255,.5), transparent 70%); outline: none; }' +
        '.tub-tap .tt-hint, .tub-plug .tt-hint { position: absolute; left: 50%; bottom: calc(100% + 4px); transform: translateX(-50%); white-space: nowrap; font-style: italic; font-size: .9rem;' +
            'color: #2a1d14; text-shadow: 0 1px 2px rgba(255,255,255,.7); opacity: 0; transition: opacity .25s; pointer-events: none; }' +
        '.tub-tap:hover .tt-hint, .tub-tap:focus-visible .tt-hint, .tub-plug:hover .tt-hint, .tub-plug:focus-visible .tt-hint { opacity: 1; }' +
        '.tub-water { position: absolute; z-index: 1; pointer-events: none; transform-origin: 50% 100%; transform: scaleY(0); border-radius: 40% 40% 6px 6px / 70% 70% 6px 6px;' +
            'background: linear-gradient(#d4f0f7, #8fc9dc 60%, #6fb2c9); box-shadow: inset 0 2px 0 rgba(255,255,255,.7); opacity: .92; }' +
        '.tub-water.has-art { background: var(--water-art) center / 100% 100% no-repeat; box-shadow: none; }' +
        '.tub-water::after { content: ""; position: absolute; left: 10%; right: 10%; top: 18%; height: 12%; border-radius: 50%; background: rgba(255,255,255,.45); animation: tub-ripple 2.6s ease-in-out infinite; }' +
        '.tub-water.draining::before { content: ""; position: absolute; left: 12%; top: 10%; width: 12%; height: 50%; border-radius: 50%;' +
            'background: radial-gradient(ellipse, rgba(60,110,130,.55), transparent 70%); animation: tub-swirl .6s linear infinite; }' +
        '@keyframes tub-swirl { to { transform: rotate(360deg); } }' +
        '@keyframes tub-ripple { 50% { transform: scaleX(.8) translateX(6%); opacity: .6; } }' +
        '.tub-stream { position: absolute; z-index: 1; width: 4px; margin-left: -2px; pointer-events: none; border-radius: 2px; opacity: 0; transition: opacity .2s;' +
            'background: repeating-linear-gradient(#c8ecf6 0 6px, #9fd6e6 6px 12px); background-size: 100% 12px; animation: tub-pour .3s linear infinite; }' +
        '.tub-stream.on { opacity: .9; }' +
        '@keyframes tub-pour { to { background-position: 0 12px; } }' +
        // the plug on its chain: in (just the chain showing over the rim), or out (hanging over the side)
        '.tub-plug { position: absolute; z-index: 3; padding: 0; border: 0; background: none; cursor: pointer; }' +
        '.tub-plug > svg, .tub-plug > .art { display: block; width: 100%; height: 100%; object-fit: contain; transition: transform .35s cubic-bezier(.3,1.5,.5,1); transform-origin: 50% 0; }' +
        '.tub-plug:not(.out) > svg, .tub-plug:not(.out) > .art { transform: translateY(46%) scaleY(.55); }' +
        '.tub-plug:not(.out) .tp-plug { opacity: 0; }' +
        '.tub-plug.out > svg, .tub-plug.out > .art { transform: rotate(-14deg); }' +
        '.tub-plug:hover, .tub-plug:focus-visible { outline: none; filter: drop-shadow(0 0 5px rgba(255,255,255,.8)); }' +
        // the toaster: in the living space, in the tub, falling, on the bathroom floor
        '.toaster, .floor-toaster { cursor: pointer; filter: drop-shadow(0 4px 5px rgba(0,0,0,.4)); transition: transform .2s; }' +
        '.toaster:hover, .toaster:focus-visible, .floor-toaster:hover, .floor-toaster:focus-visible { transform: translateY(-3px) rotate(-3deg); outline: none; }' +
        '.toaster > svg, .toaster > .art, .toaster > img, .tub-toaster > svg, .tub-toaster > img, .falling-toaster > svg, .falling-toaster > img, .floor-toaster > svg, .floor-toaster > img' +
            ' { display: block; width: 100%; height: 100%; object-fit: contain; }' +
        '.toaster .ts-hint, .floor-toaster .ts-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap; font-style: italic; font-size: .9rem;' +
            'color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.7); opacity: 0; transition: opacity .25s; pointer-events: none; }' +
        '.toaster:hover .ts-hint, .floor-toaster:hover .ts-hint { opacity: 1; }' +
        '.toaster.taken { visibility: hidden; }' +
        '.tub-toaster { position: absolute; z-index: 1; pointer-events: none; transform: rotate(-18deg); visibility: hidden; cursor: pointer; }' +
        '.tub-toaster.in { visibility: visible; pointer-events: auto; }' +
        '.falling-toaster { position: absolute; z-index: 6; pointer-events: none; filter: drop-shadow(0 8px 6px rgba(0,0,0,.35)); }' +
        '.floor-toaster { position: absolute; z-index: 3; display: none; }' +
        '.floor-toaster.on { display: block; }' +
        '.tub-cord { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: visible; visibility: hidden; }' +
        '.tub-cord.in { visibility: visible; }' +
        '.tub-cord path { fill: none; stroke: #1f1a18; stroke-width: 2.5; stroke-linecap: round; }' +
        '.bath-outlet { position: absolute; z-index: 2; pointer-events: none; }' +
        '.bath-outlet > svg, .bath-outlet > .art { display: block; width: 100%; height: 100%; }' +
        '.tub-sparks { position: absolute; z-index: 3; pointer-events: none; overflow: visible; }' +
        '.tub-sparks path { fill: none; stroke: #fff27a; stroke-width: 2; stroke-linecap: round; filter: drop-shadow(0 0 3px #7fd0ff); }' +
        'body.in-bath[data-holding=toaster] .bathroom { cursor: copy; }' +
        // the traveller, held and dropped
        '.bath-character.held { cursor: grabbing; filter: drop-shadow(0 16px 10px rgba(0,0,0,.35)); z-index: 5 !important; }' +
        '.bath-character.held:not(.has-held) > .placeholder, .bath-character.held:not(.has-held) > .art { animation: tub-struggle .09s linear infinite alternate; }' +
        '@keyframes tub-struggle { from { transform: rotate(-7deg) translateX(-2px); } to { transform: rotate(7deg) translateX(2px); } }' +
        '.bath-character { touch-action: none; cursor: grab; }' +
        '.bath-character .bubble.shout { color: #9a3b1f; }'
    );

    var TOASTER = '<svg class="placeholder" viewBox="0 0 100 70" aria-hidden="true">' +
        '<rect x="8" y="14" width="84" height="50" rx="14" fill="#c9ccd0"/><rect x="8" y="14" width="84" height="50" rx="14" fill="none" stroke="#8d939a" stroke-width="2"/>' +
        '<path d="M16 22 Q18 18 28 18" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>' +
        '<rect x="24" y="10" width="22" height="8" rx="2" fill="#2a2420"/><rect x="54" y="10" width="22" height="8" rx="2" fill="#2a2420"/>' +
        '<path d="M26 12 Q35 2 44 12 Z" fill="#d8a25a"/><path d="M56 12 Q65 3 74 12 Z" fill="#d8a25a"/>' +
        '<rect x="88" y="34" width="8" height="5" rx="2" fill="#2a2420"/><rect x="18" y="62" width="10" height="5" fill="#2a2420"/><rect x="72" y="62" width="10" height="5" fill="#2a2420"/>' +
        '<circle cx="76" cy="46" r="4" fill="#9a3b1f"/></svg>';
    var OUTLET = '<svg class="placeholder" viewBox="0 0 30 40" aria-hidden="true"><rect x="1" y="1" width="28" height="38" rx="4" fill="#f4f1ea" stroke="#b9b3a6"/>' +
        '<g fill="#3a3530"><rect x="9" y="10" width="3" height="7" rx="1"/><rect x="18" y="10" width="3" height="7" rx="1"/><rect x="9" y="24" width="3" height="7" rx="1"/><rect x="18" y="24" width="3" height="7" rx="1"/></g></svg>';
    var PLUG = '<svg class="placeholder" viewBox="0 0 20 40" aria-hidden="true">' +
        '<g fill="none" stroke="#9aa0a6" stroke-width="1.6"><circle cx="10" cy="3" r="2.4"/><circle cx="10" cy="8" r="1.6"/><circle cx="10" cy="12.5" r="2.2"/><circle cx="10" cy="17.5" r="1.6"/><circle cx="10" cy="22" r="2.2"/><circle cx="10" cy="26.5" r="1.6"/></g>' +
        '<g class="tp-plug"><rect x="4.5" y="28" width="11" height="3" rx="1" fill="#6a6f75"/><path d="M4 31 H16 L14 39 H6 Z" fill="#2a2426"/><path d="M6 32 H9 L8.4 38 H6.8 Z" fill="#4a4446"/></g></svg>';

    /* ---------------- the state (this visit) ---------------- */
    // toaster: 'living' (by the plant) | 'inv' (in your bag) | 'tub' (in the bath) | 'floor' (on the bathroom floor, at floorX %)
    var st = { level: 0, toaster: 'living', floorX: 30, plug: 'in', tapOn: false, inTub: false };
    try {
        var saved = JSON.parse(sessionStorage.getItem('bath-state') || 'null');
        if (saved) { st.level = +saved.level || 0; st.toaster = saved.toaster || 'living'; st.floorX = +saved.floorX || 30; st.plug = saved.plug === 'out' ? 'out' : 'in'; }
    } catch (e) {}
    // the bag has the last word on whether it's in the bag
    if (I && I.has('toaster')) st.toaster = 'inv';
    else if (st.toaster === 'inv') st.toaster = 'living';
    function save() { try { sessionStorage.setItem('bath-state', JSON.stringify({ level: st.level, toaster: st.toaster, floorX: st.floorX, plug: st.plug })); } catch (e) {} }

    var toasterArt = TOASTER;
    Sky.findAsset('assets/living/toaster', function (url) { if (url) { toasterArt = '<img alt="" src="' + url + '">'; dressToasters(); } });
    function takeToaster() {
        st.toaster = 'inv'; save();
        if (I) I.add('toaster');
        showToaster();
    }

    /* ---------------- the toaster in the living space ---------------- */
    if (livingToaster) {
        if (!livingToaster.querySelector('.placeholder, img')) livingToaster.insertAdjacentHTML('afterbegin', TOASTER);
        livingToaster.insertAdjacentHTML('beforeend', '<span class="ts-hint">a toaster</span>');
        livingToaster.setAttribute('role', 'button');
        livingToaster.setAttribute('tabindex', '0');
        livingToaster.setAttribute('aria-label', 'take the toaster');
        var take = function () { if (st.toaster === 'living') takeToaster(); };
        livingToaster.addEventListener('click', take);
        livingToaster.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); take(); } });
    }
    function showLivingToaster() { if (livingToaster) livingToaster.classList.toggle('taken', st.toaster !== 'living'); }

    /* ---------------- the tub: tap, plug, water, stream, the toaster in it ---------------- */
    if (!tub) { showLivingToaster(); return; }
    var tap = document.createElement('button');
    tap.type = 'button'; tap.className = 'tub-tap'; tap.setAttribute('aria-label', 'the tap');
    tap.innerHTML = '<span class="tt-hint">turn the tap</span>';
    var plug = document.createElement('button');
    plug.type = 'button'; plug.className = 'tub-plug'; plug.dataset.asset = 'assets/living/bath-plug';
    plug.innerHTML = PLUG + '<span class="tt-hint"></span>';
    var water = document.createElement('div'); water.className = 'tub-water'; water.dataset.slot = 'assets/living/bath-water';
    var stream = document.createElement('div'); stream.className = 'tub-stream';
    var tt = document.createElement('div'); tt.className = 'tub-toaster'; tt.title = 'fish the toaster out';
    var ft = document.createElement('div'); ft.className = 'floor-toaster'; ft.setAttribute('role', 'button'); ft.setAttribute('tabindex', '0'); ft.setAttribute('aria-label', 'pick up the toaster');
    var cord = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); cord.setAttribute('class', 'tub-cord'); cord.innerHTML = '<path/>';
    var outlet = document.createElement('div'); outlet.className = 'bath-outlet'; outlet.dataset.asset = 'assets/living/bath-outlet'; outlet.innerHTML = OUTLET;
    var sparks = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sparks.setAttribute('class', 'tub-sparks'); sparks.setAttribute('viewBox', '0 0 100 100'); sparks.setAttribute('preserveAspectRatio', 'none'); sparks.innerHTML = '<path/>';
    [water, stream, tt, cord, outlet, sparks, tap, plug, ft].forEach(function (x) { bath.appendChild(x); });
    Sky.fillAssets(outlet);
    Sky.fillAssets(plug);
    Sky.findAsset('assets/living/bath-water', function (url) { if (url) { water.style.setProperty('--water-art', 'url("' + new URL(url, location.href).href + '")'); water.classList.add('has-art'); } });
    function dressToasters() { tt.innerHTML = toasterArt; ft.innerHTML = toasterArt + '<span class="ts-hint">the toaster</span>'; }
    dressToasters();

    // everything is laid out from where the tub is (the drawn tub: the spout at 83% across, the rim 17% down)
    var box = {};
    function layout() {
        var t = T(), W = t.offsetWidth || (t.getBoundingClientRect && t.getBoundingClientRect().width), H = t.offsetHeight || t.getBoundingClientRect().height;
        if (!W) return;
        var br = bath.getBoundingClientRect(), tr = t.getBoundingClientRect(), L = tr.left - br.left, Tp = tr.top - br.top;
        box = { L: L, T: Tp, W: W, H: H };
        tap.style.left = (L + W * 0.78) + 'px'; tap.style.top = (Tp - H * 0.06) + 'px'; tap.style.width = (W * 0.16) + 'px'; tap.style.height = (H * 0.26) + 'px';
        plug.style.left = (L + W * 0.065) + 'px'; plug.style.top = (Tp + H * 0.1) + 'px'; plug.style.width = (W * 0.06) + 'px'; plug.style.height = (W * 0.12) + 'px';
        water.style.left = (L + W * 0.05) + 'px'; water.style.width = (W * 0.9) + 'px'; water.style.top = (Tp + H * 0.08) + 'px'; water.style.height = (H * 0.12) + 'px';
        stream.style.left = (L + W * 0.827) + 'px'; stream.style.top = (Tp + H * 0.07) + 'px'; stream.style.height = (H * 0.14) + 'px';
        tt.style.left = (L + W * 0.2) + 'px'; tt.style.top = (Tp - H * 0.08) + 'px'; tt.style.width = (W * 0.2) + 'px'; tt.style.height = (W * 0.14) + 'px';
        ft.style.width = (W * 0.2) + 'px'; ft.style.height = (W * 0.14) + 'px'; ft.style.left = 'calc(' + st.floorX + '% - ' + (W * 0.1) + 'px)'; ft.style.bottom = floorB() + 'px';
        outlet.style.left = (L - W * 0.07) + 'px'; outlet.style.top = (Tp - H * 0.62) + 'px'; outlet.style.width = (W * 0.045) + 'px'; outlet.style.height = (W * 0.06) + 'px';
        var ox = L - W * 0.07 + W * 0.0225, oy = Tp - H * 0.62 + W * 0.045, tx = L + W * 0.21, ty = Tp + H * 0.02;
        cord.querySelector('path').setAttribute('d', 'M ' + ox + ' ' + oy + ' C ' + (ox - 10) + ' ' + (oy + 60) + ', ' + (tx - 40) + ' ' + (ty - 50) + ', ' + tx + ' ' + ty);
        sparks.style.left = (L + W * 0.08) + 'px'; sparks.style.top = (Tp - H * 0.2) + 'px'; sparks.style.width = (W * 0.84) + 'px'; sparks.style.height = (H * 0.45) + 'px';
    }
    function floorB() { return Math.round(window.innerHeight * 0.03); }
    layout();
    window.addEventListener('resize', layout);
    window.addEventListener('load', layout);
    new MutationObserver(layout).observe(bath, { childList: true });
    if (window.ResizeObserver) new ResizeObserver(layout).observe(bath);
    document.addEventListener('transitionend', function (e) { if (e.target === bath) layout(); });

    function showWater() { water.style.transform = 'scaleY(' + Math.max(0, Math.min(1, st.level)).toFixed(3) + ')'; }
    function showPlug() {
        plug.classList.toggle('out', st.plug === 'out');
        plug.querySelector('.tt-hint').textContent = st.plug === 'out' ? 'put the plug in' : 'pull the plug';
        plug.setAttribute('aria-label', st.plug === 'out' ? 'put the plug back in' : 'pull the plug');
    }
    function showToaster() {
        tt.classList.toggle('in', st.toaster === 'tub');
        cord.classList.toggle('in', st.toaster === 'tub');
        ft.classList.toggle('on', st.toaster === 'floor');
        ft.style.left = 'calc(' + st.floorX + '% - ' + ((box.W || 200) * 0.1) + 'px)';
        showLivingToaster();
    }
    showWater(); showPlug(); showToaster();

    /* ---------------- the water: the tap fills it, the open plughole drains it ---------------- */
    var tapCh = Sky.sounds ? Sky.sounds.channel('tub-tap') : null, drainCh = Sky.sounds ? Sky.sounds.channel('tub-drain') : null;
    var flowing = false, last = 0;
    function flow() {
        stream.classList.toggle('on', st.tapOn);
        var draining = st.plug === 'out' && st.level > 0.005;
        water.classList.toggle('draining', draining);
        if (tapCh) tapCh.set(st.tapOn && body.classList.contains('in-bath') ? 0.55 : st.tapOn ? 0.12 : 0, 0.15);
        if (drainCh) drainCh.set(draining && body.classList.contains('in-bath') ? 0.6 : 0, 0.3);
        if (flowing || !(st.tapOn || draining)) return;
        flowing = true; last = performance.now();
        (function step(now) {
            var dt = Math.min(0.1, (now - last) / 1000); last = now;
            var rate = (st.tapOn ? 1 / FILL_SECS : 0) - (st.plug === 'out' ? 1 / DRAIN_SECS : 0);
            st.level = Math.max(0, Math.min(1, st.level + rate * dt));
            showWater();
            if (st.level > 0.35 && st.toaster === 'tub') live();
            if (st.level >= 1 && st.tapOn) { st.tapOn = false; sfx('tap', { size: 0.1 }); say('the tub’s full'); }   // full: off it goes
            var still = st.tapOn || (st.plug === 'out' && st.level > 0.005);
            if (still) { requestAnimationFrame(step); return; }
            if (st.level < 0.01) st.level = 0;
            flowing = false; showWater(); save(); flow();
        })(last);
    }
    // stepping out of the bathroom: you hear it less (and it's still running when you come back)
    new MutationObserver(function () { if (tapCh || drainCh) flow(); }).observe(body, { attributes: true, attributeFilter: ['class'] });
    tap.addEventListener('click', function (e) {
        e.stopPropagation();
        st.tapOn = !st.tapOn;
        sfx('tap', { size: 0.1 });                                      // the squeak of the handle
        if (st.tapOn && st.level >= 0.99 && st.plug === 'in') { st.tapOn = false; say('it’s already full. pull the plug to drain it'); }
        save(); flow();
    });
    plug.addEventListener('click', function (e) {
        e.stopPropagation();
        st.plug = st.plug === 'out' ? 'in' : 'out';
        sfx(st.plug === 'out' ? 'cork-pop' : 'cork-in');
        if (st.plug === 'out' && st.level > 0.05) say('glug glug glug…');
        showPlug(); save(); flow();
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
    function toasterLandsInTub() {
        st.toaster = 'tub'; save();
        showToaster();
        if (st.level > 0.35) { sfx('splash', { size: 0.2 }); sfx('fizz', { delay: 0.15 }); crackle(900); say('it fizzes and sparks in the water'); live(); }
        else { sfx('land', { size: 0.4 }); say('it clunks into the tub, still plugged in'); }
    }

    /* ---------------- the toaster falls: let go of it anywhere in the bathroom ---------------- */
    var falling = null;
    function dropToaster(cx, cy) {
        if (falling) return;
        if (I) I.remove('toaster');
        st.toaster = 'falling';
        showToaster();
        var br = bath.getBoundingClientRect(), W = box.W || 200, w = W * 0.2, h = W * 0.14;
        var el = document.createElement('div');
        el.className = 'falling-toaster';
        el.innerHTML = toasterArt;
        el.style.width = w + 'px'; el.style.height = h + 'px';
        bath.appendChild(el);
        var x = cx - br.left, y = cy - br.top, vy = 0, vx = (Math.random() - 0.5) * 40, rot = -10, spin = (Math.random() - 0.5) * 240, bounced = false;
        var G = 2600, floorY = br.height - floorB(), t0 = performance.now();
        falling = el;
        function draw() { el.style.transform = 'translate(' + (x - w / 2).toFixed(1) + 'px,' + (y - h / 2).toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)'; }
        draw();
        (function step(now) {
            var dt = Math.min(0.04, (now - t0) / 1000); t0 = now;
            var y0 = y;
            vy += G * dt; y += vy * dt; x += vx * dt; rot += spin * dt;
            // over the tub, crossing its rim (or let go of right over it): in it goes
            var rimY = box.T + box.H * 0.2, inX = x > box.L + box.W * 0.1 && x < box.L + box.W * 0.9;
            if (inX && y + h * 0.3 >= rimY && y0 - h < box.T + box.H * 0.6) {
                el.remove(); falling = null;
                toasterLandsInTub();
                return;
            }
            if (y + h / 2 >= floorY) {                                  // the floor: a clatter and one little bounce
                y = floorY - h / 2;
                if (!bounced && vy > 300) { bounced = true; vy = -vy * 0.28; spin = -spin * 0.4; vx *= 0.5; sfx('land', { size: 0.5 }); }
                else {
                    el.remove(); falling = null;
                    st.floorX = Math.max(3, Math.min(97, x / br.width * 100));
                    st.toaster = 'floor'; save();
                    showToaster();
                    sfx('land', { size: 0.3 });
                    say('it clatters onto the floor');
                    return;
                }
            }
            draw();
            requestAnimationFrame(step);
        })(t0);
    }
    if (I) I.onUse(function (id, e) {
        if (id !== 'toaster' || !body.classList.contains('in-bath') || !bath.contains(e.target)) return false;
        dropToaster(e.clientX, e.clientY);
        I.letGo();
        return true;
    });
    // fish it out of the tub, or pick it up off the floor
    function pickBackUp(e) { if (e) e.stopPropagation(); if (st.toaster === 'tub' || st.toaster === 'floor') { takeToaster(); if (fizzTimer) { clearTimeout(fizzTimer); fizzTimer = 0; } } }
    tt.addEventListener('click', pickBackUp);
    ft.addEventListener('click', pickBackUp);
    ft.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickBackUp(); } });
    if (st.toaster === 'tub' && st.level > 0.35) live();
    if (st.plug === 'out' && st.level > 0) flow();

    /* ---------------- the traveller: pick them up, drop them in ---------------- */
    var pick = null, zapping = false, fallId = 0;
    function hostRect() { return bath.getBoundingClientRect(); }
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
            sfx('angry', { size: 0.2 });                        // chittering like an angry squirrel (assets/sounds/angry)
            pick.lines = setInterval(function () {
                i = Math.min(i + 1, HELD_LINES.length - 1);
                shout(HELD_LINES[i]);
                sfx('angry', { size: 0.2 + 0.4 * i });
            }, 1300);
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

})();

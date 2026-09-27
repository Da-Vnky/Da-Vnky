/* =====================================================================
   tub.js — the bathroom's bathtub.
     • the tap: click it and the tub fills (click again to turn it off)
     • the plug (on its chain, at the tub's near end): pull it and the tub
       drains, gurgling; push it back in to keep the water in
     • the traveller in the bathroom can be picked up (they struggle) and
       dropped in the tub (a cold one, or a dry one: nothing worse).
   (the toaster that used to go in it was taken out in September 2026: each
   reset has one death now, and the bath isn't one of them. sky/state.js)

   slots (stand-ins until yours are in):
     assets/living/bath-water    the water's surface, stretched along the top of the tub
     assets/living/bath-outlet   the socket on the wall by the tub
     assets/living/bath-plug     the plug on its chain, about 1:2 (the chain hangs from the top)
   sounds: assets/sounds/tub-tap and tub-drain (loops), and pickup, splash, land, cork-pop, cork-in.
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
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }
    function say(t, ms) { if (I) I.say(t, ms); }

    // what the traveller says while held up (the words are all here)
    var HELD_LINES = ['Hey! Put me down!', 'Not the bath!', 'I SAID PUT ME DOWN!'];
    var TUB_LINES = { cold: 'It’s freezing!', dry: 'There’s no water in here.' };
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
        '.bath-outlet { position: absolute; z-index: 2; pointer-events: none; }' +
        '.bath-outlet > svg, .bath-outlet > .art { display: block; width: 100%; height: 100%; }' +
        // the traveller, held and dropped
        '.bath-character.held { cursor: grabbing; filter: drop-shadow(0 16px 10px rgba(0,0,0,.35)); z-index: 5 !important; }' +
        '.bath-character.held:not(.has-held) > .placeholder, .bath-character.held:not(.has-held) > .art { animation: tub-struggle .09s linear infinite alternate; }' +
        '@keyframes tub-struggle { from { transform: rotate(-7deg) translateX(-2px); } to { transform: rotate(7deg) translateX(2px); } }' +
        '.bath-character { touch-action: none; cursor: grab; }' +
        '.bath-character .bubble.shout { color: #9a3b1f; }'
    );

    var OUTLET = '<svg class="placeholder" viewBox="0 0 30 40" aria-hidden="true"><rect x="1" y="1" width="28" height="38" rx="4" fill="#f4f1ea" stroke="#b9b3a6"/>' +
        '<g fill="#3a3530"><rect x="9" y="10" width="3" height="7" rx="1"/><rect x="18" y="10" width="3" height="7" rx="1"/><rect x="9" y="24" width="3" height="7" rx="1"/><rect x="18" y="24" width="3" height="7" rx="1"/></g></svg>';
    var PLUG = '<svg class="placeholder" viewBox="0 0 20 40" aria-hidden="true">' +
        '<g fill="none" stroke="#9aa0a6" stroke-width="1.6"><circle cx="10" cy="3" r="2.4"/><circle cx="10" cy="8" r="1.6"/><circle cx="10" cy="12.5" r="2.2"/><circle cx="10" cy="17.5" r="1.6"/><circle cx="10" cy="22" r="2.2"/><circle cx="10" cy="26.5" r="1.6"/></g>' +
        '<g class="tp-plug"><rect x="4.5" y="28" width="11" height="3" rx="1" fill="#6a6f75"/><path d="M4 31 H16 L14 39 H6 Z" fill="#2a2426"/><path d="M6 32 H9 L8.4 38 H6.8 Z" fill="#4a4446"/></g></svg>';

    /* ---------------- the state (this visit) ---------------- */
    var st = { level: 0, plug: 'in', tapOn: false, inTub: false };
    try {
        var saved = JSON.parse(sessionStorage.getItem('bath-state') || 'null');
        if (saved) { st.level = +saved.level || 0; st.plug = saved.plug === 'out' ? 'out' : 'in'; }
    } catch (e) {}
    if (I && I.has('toaster')) I.remove('toaster');                  // (a toaster still in the bag from before it was taken out)
    function save() { try { sessionStorage.setItem('bath-state', JSON.stringify({ level: st.level, plug: st.plug })); } catch (e) {} }


    /* ---------------- the tub: tap, plug, water, stream ---------------- */
    if (!tub) return;
    var tap = document.createElement('button');
    tap.type = 'button'; tap.className = 'tub-tap'; tap.setAttribute('aria-label', 'the tap');
    tap.innerHTML = '<span class="tt-hint">turn the tap</span>';
    var plug = document.createElement('button');
    plug.type = 'button'; plug.className = 'tub-plug'; plug.dataset.asset = 'assets/living/bath-plug';
    plug.innerHTML = PLUG + '<span class="tt-hint"></span>';
    var water = document.createElement('div'); water.className = 'tub-water'; water.dataset.slot = 'assets/living/bath-water';
    var stream = document.createElement('div'); stream.className = 'tub-stream';
    var outlet = document.createElement('div'); outlet.className = 'bath-outlet'; outlet.dataset.asset = 'assets/living/bath-outlet'; outlet.innerHTML = OUTLET;
    [water, stream, outlet, tap, plug].forEach(function (x) { bath.appendChild(x); });
    Sky.fillAssets(outlet);
    Sky.fillAssets(plug);
    Sky.findAsset('assets/living/bath-water', function (url) { if (url) { water.style.setProperty('--water-art', 'url("' + new URL(url, location.href).href + '")'); water.classList.add('has-art'); } });

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
        outlet.style.left = (L - W * 0.07) + 'px'; outlet.style.top = (Tp - H * 0.62) + 'px'; outlet.style.width = (W * 0.045) + 'px'; outlet.style.height = (W * 0.06) + 'px';
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
    showWater(); showPlug();

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

    if (st.plug === 'out' && st.level > 0) flow();

    /* ---------------- the traveller: pick them up, drop them in ---------------- */
    var pick = null, fallId = 0;
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
        if (me.classList.contains('gore-hidden') || !body.classList.contains('in-bath') || (Sky.sides && Sky.sides.busy)) return;
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
                shout(st.level > 0.35 ? TUB_LINES.cold : TUB_LINES.dry);
                hush(1800);
            });
            return;
        }
        fallTo(floorB(), function () { sfx('land', { size: 0.7 }); });
    }

})();

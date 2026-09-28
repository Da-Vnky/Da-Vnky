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
    var sfx = Sky.sfx, say = Sky.say;

    // what the traveller says while held up (the words are all here)
    var HELD_LINES = ['Hey! Put me down!', 'Not the bath!', 'I SAID PUT ME DOWN!'];
    var TUB_LINES = { cold: 'It’s freezing!', dry: 'There’s no water in here.' };
    var FILL_SECS = 4.5, DRAIN_SECS = 3.2;                           // an empty tub to full, a full one to empty

    // (its look is in sky/css/tub.css, linked from each page's head)

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
        if (me.classList.contains('gore-hidden') || !body.classList.contains('in-bath') || (Sky.house && Sky.house.busy)) return;
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
    // off somewhere (sky/house.js walks them): out of the tub (or down off wherever they were dropped) first
    me.beforeWalk = function () {
        if (!me.style.bottom && !st.inTub) return;
        fallId++;
        if (st.inTub) sfx('land', { size: 0.4 });
        st.inTub = false;
        me.style.bottom = ''; me.style.zIndex = '';
    };
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

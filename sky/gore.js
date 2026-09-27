/* =====================================================================
   gore.js — the traveller's misfortunes, shared by every scene:
     Sky.gore.splat(el, x, y, done)   a fall from too high: blood, giblets, a splat
     Sky.gore.zap(el, done)           electrocuted: sparks, an x-ray flicker, a skeleton
     Sky.gore.shot(el, done)          the revolver: a bang, they topple over, a pool of blood
     Sky.gore.respawn(el)             back again, with a -1 heart floating up
   (x, y = where they hit, on screen). Load after sky/sky.js and sky/panel.js.

   slots (everything here is a stand-in until you add yours):
     assets/characters/splat        the splat left where they landed (see-through around it)
     assets/characters/giblet-1 … giblet-6   bits that fly off (any you add join the stand-ins' places)
     assets/characters/skeleton     what's left after an electrocution (feet at the bottom, like the character)
     assets/characters/zapped       the x-ray frame flickered in while it happens (optional)
     assets/ui/heart                the heart in the "-1" that floats up when they come back
   sounds: assets/sounds/scream, splat, zap, respawn
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.gore) return;

    // (its look is in sky/css/gore.css, linked from each page's head)

    var layer = document.createElement('div');
    layer.className = 'gore-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    var flash = document.createElement('div');
    flash.className = 'gore-flash';
    document.body.appendChild(flash);
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }
    function art(slot, fallback, cb) { Sky.findAsset(slot, function (url) { cb(url ? '<img alt="" src="' + url + '">' : fallback); }); }

    /* ---------------- the stand-ins ---------------- */
    var SPLAT = '<svg viewBox="0 0 200 60" aria-hidden="true"><path fill="#7e0d10" d="M20 34 C10 26 30 20 42 24 C46 12 70 14 72 22 C84 8 118 10 120 22 C134 12 164 16 160 28 C184 26 192 38 172 42 C178 54 150 52 140 46 C130 58 96 56 90 48 C76 58 44 56 46 46 C28 50 8 44 20 34 Z"/>' +
        '<g fill="#9c1418"><circle cx="12" cy="20" r="4"/><circle cx="188" cy="24" r="3"/><circle cx="30" cy="54" r="3"/><circle cx="176" cy="54" r="4"/><circle cx="104" cy="6" r="3"/></g>' +
        '<path fill="#b02024" opacity=".6" d="M60 32 C70 26 90 28 96 34 C88 40 70 40 60 32 Z"/></svg>';
    var GIBLETS = [
        '<svg viewBox="0 0 40 20"><path d="M2 14 Q20 2 38 14 L36 18 Q20 8 4 18 Z" fill="#3a2716"/><path d="M11 13 Q12 3 20 3 Q28 3 29 13 Z" fill="#3a2716"/></svg>',   // the hat
        '<svg viewBox="0 0 24 16"><path d="M2 2 H12 V10 H22 V15 H2 Z" fill="#24170c"/></svg>',                                                      // a boot
        '<svg viewBox="0 0 24 24"><path d="M3 6 Q12 0 21 6 L18 20 Q12 24 6 20 Z" fill="#9a3b1f"/><path d="M11 3 H13 V21 H11 Z" fill="#6e2a16"/></svg>',   // a scrap of coat
        '<svg viewBox="0 0 30 12"><path d="M5 3 Q2 0 1 3 Q0 6 3 6 L27 6 Q30 6 29 3 Q28 0 25 3 Z M5 9 Q2 12 1 9 Q0 6 3 6 M25 9 Q28 12 29 9 Q30 6 27 6" fill="#efe6d2" stroke="#b8ab8e" stroke-width=".8"/></svg>',   // a bone
        '<svg viewBox="0 0 20 18"><path d="M3 9 Q2 2 9 3 Q13 0 17 5 Q20 11 14 15 Q8 18 5 14 Q1 13 3 9 Z" fill="#c9566a"/><path d="M6 8 Q10 6 13 9" stroke="#8e2a3c" fill="none" stroke-width="1.2"/></svg>',   // a pink bit
        '<svg viewBox="0 0 20 18"><path d="M2 10 Q4 2 11 3 Q19 4 18 11 Q16 17 9 16 Q2 15 2 10 Z" fill="#8e1a22"/><circle cx="8" cy="8" r="2" fill="#c9566a"/></svg>'   // a red lump
    ];
    var SKELETON = '<svg viewBox="0 0 60 120" aria-hidden="true"><g fill="#f4efe2" stroke="#9d9380" stroke-width="1">' +
        '<path d="M8 40 Q30 32 52 40 L50 44 Q30 38 10 44 Z" fill="#3a2716" stroke="none" opacity=".85"/>' +                               // the hat, singed
        '<path d="M19 50 Q19 38 30 38 Q41 38 41 50 Q41 56 37 58 L36 62 H24 L23 58 Q19 56 19 50 Z"/>' +                                      // skull
        '<circle cx="25.5" cy="50" r="3.2" fill="#1a1410" stroke="none"/><circle cx="34.5" cy="50" r="3.2" fill="#1a1410" stroke="none"/><path d="M29 54 L30 51.5 L31 54 Z" fill="#1a1410" stroke="none"/>' +
        '<path d="M26 60 V62 M28.5 60 V62.5 M31 60 V62.5 M33.5 60 V62" stroke="#1a1410" stroke-width=".8"/>' +
        '<rect x="28.8" y="62" width="2.4" height="36" rx="1"/>' +                                                                          // spine
        '<path d="M20 68 Q30 64 40 68 M19 74 Q30 70 41 74 M20 80 Q30 76 40 80 M21 86 Q30 82 39 86" fill="none" stroke-width="2.4"/>' +     // ribs
        '<path d="M22 66 L14 84 L12 98 M38 66 L46 84 L48 98" fill="none" stroke-width="2.6" stroke-linecap="round"/>' +                  // arms
        '<path d="M22 96 Q30 92 38 96 L36 102 H24 Z"/>' +                                                                                  // pelvis
        '<path d="M25 102 L23 118 M35 102 L37 118" fill="none" stroke-width="2.8" stroke-linecap="round"/>' +                             // legs
        '<path d="M18 118 H27 M33 118 H42" stroke="#24170c" stroke-width="3"/></g></svg>';
    var HEART = '<svg viewBox="0 0 20 18" aria-hidden="true"><path d="M10 17 L2.5 9.5 Q-.5 6 2 3 Q5 0 8 2.5 L10 4.5 L12 2.5 Q15 0 18 3 Q20.5 6 17.5 9.5 Z" fill="#d11f33" stroke="#7a0d18" stroke-width="1"/><path d="M5 4 Q3.5 5 4 7" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/></svg>';

    var gibArt = GIBLETS.slice();                                    // your own giblets replace the stand-ins' places
    GIBLETS.forEach(function (g, i) { Sky.findAsset('assets/characters/giblet-' + (i + 1), function (url) { if (url) gibArt[i] = '<img alt="" src="' + url + '">'; }); });

    /* ---------------- a little physics for the bits ---------------- */
    var bits = [], running = false;
    function tick(now) {
        var dt = Math.min(0.04, (now - (tick.last || now)) / 1000);
        tick.last = now;
        bits = bits.filter(function (b) {
            if (b.stuck) return false;
            b.vy += 1500 * dt;
            b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
            if (b.y >= b.floor && b.vy > 0) {
                if (b.bounce && Math.abs(b.vy) > 180) { b.vy *= -0.35; b.vx *= 0.6; b.vr *= 0.5; b.y = b.floor; b.bounce--; }
                else {                                                  // landed: flatten and stay a while
                    b.y = b.floor; b.stuck = true;
                    b.el.classList.add('stuck');
                    b.el.style.transform = 'translate(' + b.x.toFixed(1) + 'px,' + b.y.toFixed(1) + 'px) rotate(' + (b.drop ? 0 : b.r) + 'deg)' + (b.drop ? ' scale(1.6, .45)' : '');
                    setTimeout(function () { b.el.style.opacity = 0; setTimeout(function () { b.el.remove(); }, 1500); }, 2600 + Math.random() * 1400);
                    return false;
                }
            }
            b.el.style.transform = 'translate(' + b.x.toFixed(1) + 'px,' + b.y.toFixed(1) + 'px) rotate(' + b.r.toFixed(0) + 'deg)';
            return true;
        });
        if (bits.length) requestAnimationFrame(tick); else { running = false; tick.last = 0; }
    }
    function fling(b) { bits.push(b); if (!running) { running = true; requestAnimationFrame(tick); } }

    /* ---------------- splat ---------------- */
    function splat(el, x, y, done) {
        var h = el.offsetHeight || 80, w = el.offsetWidth || h * 0.5;
        el.classList.add('gore-hidden');
        sfx('splat');
        // the stain where they landed
        var s = document.createElement('div');
        s.className = 'gore-splat';
        s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.width = (w * 3.2) + 'px';
        art('assets/characters/splat', SPLAT, function (html) { s.innerHTML = html; });
        layer.appendChild(s);
        setTimeout(function () { s.style.opacity = 0; setTimeout(function () { s.remove(); }, 1700); }, 3600);
        // blood
        for (var i = 0; i < 34; i++) {
            var d = document.createElement('div'), sz = 3 + Math.random() * 7;
            d.className = 'gore-bit drop';
            d.style.width = sz + 'px'; d.style.height = sz * 1.2 + 'px';
            layer.appendChild(d);
            var a = -Math.PI * (0.08 + Math.random() * 0.84), sp = 180 + Math.random() * 520;
            fling({ el: d, x: x + (Math.random() - .5) * w, y: y - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 0, vr: 0, floor: y + (Math.random() - .3) * 10, drop: true, bounce: 0 });
        }
        // giblets
        gibArt.forEach(function (g, i) {
            var n = i >= 3 ? 2 : 1;                                     // two of the squishy ones
            for (var k = 0; k < n; k++) {
                var e = document.createElement('div'), sz2 = (i === 0 ? 0.6 : 0.28 + Math.random() * 0.14) * w * 1.1;
                e.className = 'gore-bit';
                e.style.width = sz2 + 'px'; e.style.height = sz2 + 'px';
                e.innerHTML = g;
                layer.appendChild(e);
                var a2 = -Math.PI * (0.15 + Math.random() * 0.7), sp2 = 260 + Math.random() * 420;
                fling({ el: e, x: x - sz2 / 2 + (Math.random() - .5) * w * .5, y: y - h * 0.3, vx: Math.cos(a2) * sp2, vy: Math.sin(a2) * sp2 - (i === 0 ? 200 : 0),
                        r: Math.random() * 360, vr: (Math.random() - .5) * 900, floor: y - sz2 * 0.6 + Math.random() * 6, bounce: 1 });
            }
        });
        if (done) setTimeout(done, 2200);
    }

    /* ---------------- electrocution ---------------- */
    function sparkPath() {
        var d = '';
        for (var k = 0; k < 7; k++) {
            var x = Math.random() * 100, y = Math.random() * 100;
            d += 'M ' + x.toFixed(0) + ' ' + y.toFixed(0);
            for (var j = 0; j < 4; j++) { x += (Math.random() - .5) * 26; y += (Math.random() - .5) * 26; d += ' L ' + x.toFixed(0) + ' ' + y.toFixed(0); }
            d += ' ';
        }
        return d;
    }
    function zap(el, done) {
        var r = el.getBoundingClientRect(), host = el.offsetParent || document.body, hr = host.getBoundingClientRect();
        var z = document.createElement('div');
        z.className = 'gore-zap flicker';
        z.style.left = (r.left - hr.left) + 'px'; z.style.top = (r.top - hr.top) + 'px';
        z.style.width = r.width + 'px'; z.style.height = r.height + 'px';
        z.style.zIndex = getComputedStyle(el).zIndex;
        z.innerHTML = '<div class="gz-skel"></div><svg class="gz-sparks" viewBox="0 0 100 100" preserveAspectRatio="none"><path/></svg><div class="gz-smoke"></div>';
        host.appendChild(z);
        var skel = z.querySelector('.gz-skel');
        art('assets/characters/zapped|assets/characters/skeleton', SKELETON, function (html) { skel.innerHTML = html; skel.firstChild.style.height = '100%'; skel.firstChild.style.width = 'auto'; });
        el.classList.add('gore-zapping');
        sfx('zap'); sfx('scream', { delay: 0.05 });
        flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
        var path = z.querySelector('path'), sp = setInterval(function () { path.setAttribute('d', sparkPath()); }, 70);
        var fl = setInterval(function () { el.style.visibility = el.style.visibility === 'hidden' ? '' : 'hidden'; }, 90);   // the x-ray flicker
        setTimeout(function () {
            clearInterval(sp); clearInterval(fl);
            path.setAttribute('d', '');
            el.style.visibility = '';
            el.classList.remove('gore-zapping');
            el.classList.add('gore-hidden');
            z.classList.remove('flicker');
            z.classList.add('done');
            art('assets/characters/skeleton', SKELETON, function (html) { skel.innerHTML = html; skel.firstChild.style.height = '100%'; skel.firstChild.style.width = 'auto'; });
            setTimeout(function () { z.style.transition = 'opacity .8s'; z.style.opacity = 0; setTimeout(function () { z.remove(); if (done) done(); }, 850); }, 2000);
        }, 1600);
    }

    /* ---------------- the revolver (sky/revolver.js) ----------------
       the gun comes up to their head, a bang and a flash, a spray of blood
       out the other side, and they topple over; then a pool, then gone. */
    var GUN = '<svg viewBox="0 0 100 60" aria-hidden="true"><path d="M8 14 H70 V26 H8 Z" fill="#4a4f57"/><rect x="4" y="15" width="6" height="10" fill="#2f3339"/>' +
        '<rect x="46" y="12" width="26" height="22" rx="5" fill="#5b616a"/><path d="M66 30 L86 30 L94 56 L76 58 Z" fill="#6e4a30"/><path d="M58 32 Q60 44 70 42" fill="none" stroke="#2f3339" stroke-width="3"/></svg>';
    var POOL = '<svg viewBox="0 0 200 40" aria-hidden="true"><path fill="#7e0d10" d="M14 22 C4 12 40 6 70 10 C100 2 150 6 176 14 C198 20 192 32 160 32 C130 40 60 38 36 32 C16 30 6 28 14 22 Z"/>' +
        '<path fill="#a3171c" opacity=".55" d="M50 18 C70 12 110 12 130 18 C110 24 70 24 50 18 Z"/></svg>';
    var gunArt = GUN;
    Sky.findAsset('assets/city/revolver', function (url) { if (url) gunArt = '<img alt="" src="' + url + '">'; });
    // (its look is in sky/css/gore.css, linked from each page's head)
    function shot(el, done) {
        var r = el.getBoundingClientRect(), h = r.height || 80, w = r.width || h * 0.5;
        var faceLeft = el.classList.contains('face-left'), dir = faceLeft ? -1 : 1;
        el.classList.remove('talking', 'walking');
        // the gun, to the side of the head
        var g = document.createElement('div');
        g.className = 'gore-gun';
        g.innerHTML = gunArt;
        var gw = Math.max(26, w * 0.55), hx = r.left + w / 2 + (faceLeft ? w * 0.34 : -w * 0.34), hy = r.top + h * 0.28;
        g.style.width = gw + 'px';
        g.style.left = (hx - (faceLeft ? 0 : gw)) + 'px'; g.style.top = (hy - gw * 0.3) + 'px';
        g.style.transform = 'scaleX(' + (faceLeft ? 1 : -1) + ') translateY(' + (h * 0.5) + 'px) rotate(30deg)';
        g.style.opacity = '0';
        layer.appendChild(g);
        requestAnimationFrame(function () { g.style.opacity = '1'; g.style.transform = 'scaleX(' + (faceLeft ? 1 : -1) + ')'; });
        setTimeout(function () {
            sfx('bang');
            flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
            setTimeout(function () { flash.classList.remove('on'); }, 150);
            var m = document.createElement('div'); m.className = 'gore-muzzle'; m.style.left = hx + 'px'; m.style.top = hy + 'px'; layer.appendChild(m);
            setTimeout(function () { m.remove(); }, 300);
            // out the other side
            for (var i = 0; i < 26; i++) {
                var d = document.createElement('div'), sz = 2.5 + Math.random() * 6;
                d.className = 'gore-bit drop';
                d.style.width = sz + 'px'; d.style.height = sz * 1.2 + 'px';
                layer.appendChild(d);
                var a = (Math.random() - 0.7) * 1.1, sp = 160 + Math.random() * 420;
                fling({ el: d, x: r.left + w / 2 + dir * w * 0.3, y: hy, vx: Math.cos(a) * sp * dir, vy: Math.sin(a) * sp, r: 0, vr: 0,
                        floor: r.bottom + (Math.random() - .5) * 8, drop: true, bounce: 0 });
            }
            g.style.transition = 'transform .5s ease-in, opacity .5s';
            g.style.transform = 'scaleX(' + (faceLeft ? 1 : -1) + ') translate(' + (-10) + 'px,' + h * 0.8 + 'px) rotate(-80deg)';
            g.style.opacity = '0';
            setTimeout(function () { g.remove(); }, 600);
            // they topple
            var inner = el.querySelector(':scope > .art, :scope > .placeholder, :scope > .pose') || el;
            el.style.transformOrigin = '50% 100%';
            inner.style.transformOrigin = (faceLeft ? '30%' : '70%') + ' 100%';
            inner.classList.add('gore-shot');
            inner.style.transform = 'rotate(' + (faceLeft ? -84 : 84) + 'deg)';
            setTimeout(function () {
                sfx('land', { size: 0.6 });
                var host = el.offsetParent || document.body, hr = host.getBoundingClientRect();
                var p = document.createElement('div');
                p.className = 'gore-pool';
                p.style.width = (h * 0.9) + 'px';
                p.style.left = (r.left - hr.left + w / 2 + dir * h * 0.35) + 'px';
                p.style.top = (r.bottom - hr.top - 3) + 'px';
                p.innerHTML = POOL;
                host.appendChild(p);
                requestAnimationFrame(function () { p.classList.add('spread'); });
                setTimeout(function () {
                    el.classList.add('gore-hidden');
                    inner.classList.remove('gore-shot');
                    inner.style.transform = ''; inner.style.transformOrigin = '';
                    p.style.opacity = '0';
                    setTimeout(function () { p.remove(); }, 1500);
                    if (done) done();
                }, 2300);
            }, 700);
        }, 650);
    }

    /* ---------------- respawn ---------------- */
    function respawn(el) {
        el.classList.remove('gore-hidden', 'gore-back');
        el.style.visibility = '';
        void el.offsetWidth;
        el.classList.add('gore-back');
        setTimeout(function () { el.classList.remove('gore-back'); }, 600);
        sfx('respawn');
        var host = el.offsetParent || document.body, r = el.getBoundingClientRect(), hr = host.getBoundingClientRect();
        var t = document.createElement('div');
        t.className = 'life-lost';
        t.innerHTML = '<span>-1</span><span class="heart">' + HEART + '</span>';
        t.style.left = (r.left - hr.left + r.width / 2) + 'px';
        t.style.top = (r.top - hr.top - 46) + 'px';
        host.appendChild(t);
        Sky.findAsset('assets/ui/heart', function (url) { if (url) t.querySelector('.heart').innerHTML = '<img alt="" src="' + url + '">'; });
        setTimeout(function () { t.remove(); }, 2300);
        try { var n = +(localStorage.getItem('lives-lost') || 0) + 1; localStorage.setItem('lives-lost', n); } catch (e) {}
        document.dispatchEvent(new CustomEvent('dav:traveller-died'));     // (every death ends here: sky/lives.js counts them)
    }

    /* ---------------- waking up on the floor, and getting up ----------------
       (after a death that sends them somewhere else: they come to lying flat, then push themselves up) */
    // (its look is in sky/css/gore.css, linked from each page's head)
    function lieDown(el) { el.classList.remove('getting-up', 'walking', 'talking'); el.classList.add('lying'); }
    function getUp(el, done) {
        el.classList.remove('lying');
        el.classList.add('getting-up');
        setTimeout(function () { sfx('step', { size: 0.4 }); }, 700);
        setTimeout(function () { el.classList.remove('getting-up'); if (done) done(); }, 1950);
    }

    Sky.gore = { splat: splat, zap: zap, shot: shot, respawn: respawn, scream: function () { sfx('scream'); }, lieDown: lieDown, getUp: getUp };
})();

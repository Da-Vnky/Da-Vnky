/* =====================================================================
   veil.js — reset 5, the veil: the world is painted on, and it's coming
   unstuck (5 Oct). the first of the three resets where the world starts to
   show what it really is (5 the veil, 6 the watchers: sky/watchers.js,
   7 the loop: sky/loop.js; and 8, the source: sky/source.js).

     the cracks    from reset 5 the painted sky has hairline cracks in it, more
                   each reset (5 a few, 6 more, 7 all over). on every page, behind
                   the sun, the moon and the clouds: it's the backdrop that's
                   cracking, not the things hung in front of it.
                   slot: assets/sky/cracks (one see-through picture of cracks over a
                   whole sky; a version per reset in the resets tabs if you like)
     the wallpaper reset 5, the living space: a corner of the wallpaper has come
                   away at the ceiling. pull it down: behind it there's no wall,
                   only the black and the lines it's all written in. the reset's
                   key is in there. from reset 6 it hangs open.
                   slots: assets/living/wall-peel (the curl of wallpaper, closed),
                   assets/living/wall-peel-open (hanging down), assets/living/behind-the-wall
     the sky       reset 5, the rooftop: one corner of the painted sky has come
                   unstuck. once the key's found, pull it: the sky tears open onto
                   what's behind it (nothing: the black, and the lines), and the
                   traveller is pulled up through the tear in scraps. that's the
                   reset's death. from reset 6 the corner's been sewn shut.
                   slots: assets/city/sky-seam (the loose corner), assets/city/sky-stitched
                   (sewn shut), assets/city/behind-the-sky (what the tear opens onto)
     sounds        sky-tear (the sky ripping), void-wind (the pull through it),
                   wall-peel (the wallpaper coming down): stand-ins until yours

   its look: sky/css/veil.css
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    if (!Sky || !S || Sky.veil) return;
    var body = document.body, R = S.reset, sfx = Sky.sfx;
    var PAGE = (location.pathname.replace(/.*\//, '').replace(/\.html$/, '') || 'index').replace(/^index$/, 'sea');
    function say(t, ms) { Sky.say(t, ms || 2800); }
    function busyHands() { return body.classList.contains('inv-holding'); }

    // the world's own lines, for what's behind the painted things (and reset 8's sky: sky/source.js)
    var codeText = null, codeWait = [];
    function code(fn) {
        if (codeText !== null) { fn(codeText); return; }
        codeWait.push(fn);
        if (codeWait.length > 1) return;
        Promise.all(['sky/state.js', 'sky/sky.js'].map(function (u) {
            return fetch(u, { cache: 'force-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; });
        })).then(function (t) {
            codeText = t.join('\n').split('\n').map(function (l) { return l.replace(/\s+$/, ''); }).filter(function (l) { return l.trim(); }).join('\n');
            codeWait.splice(0).forEach(function (f) { f(codeText); });
        });
    }
    // a black with the lines in it (behind the wallpaper, behind the sky)
    function voidInto(el, lines) {
        var pre = document.createElement('pre');
        pre.className = 'void-lines';
        pre.setAttribute('aria-hidden', 'true');
        el.appendChild(pre);
        code(function (t) {
            var all = t.split('\n'), from = Math.floor(Math.random() * Math.max(1, all.length - lines));
            pre.textContent = all.slice(from, from + lines).join('\n');
        });
        return pre;
    }

    /* ---------------- the cracks in the painted sky (resets 5, 6, 7) ---------------- */
    // drawn the same every time (a fixed seed): a few trunks running in from the edges, each branching
    function cracksArt() {
        var seed = 5;
        function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
        function crack(x, y, a, len, depth) {
            var d = 'M' + x.toFixed(0) + ' ' + y.toFixed(0), out = '';
            for (var i = 0; i < len; i++) {
                a += (rnd() - 0.5) * 0.9;
                var step = 14 + rnd() * 26;
                x += Math.cos(a) * step; y += Math.sin(a) * step;
                d += ' L' + x.toFixed(0) + ' ' + y.toFixed(0);
                if (depth < 2 && rnd() < 0.16) out += crack(x, y, a + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.7), Math.floor(len * 0.45), depth + 1);
            }
            return '<path d="' + d + '"/>' + out;
        }
        // [reset it shows from, where it starts, which way it runs, how long]
        var TRUNKS = [
            [5, 0, 180, -0.25, 14], [5, 1600, 120, 3.4, 12], [5, 760, 0, 1.75, 9],
            [6, 0, 520, -0.5, 16], [6, 1600, 430, 3.0, 15], [6, 420, 0, 1.2, 12], [6, 1180, 0, 1.9, 13],
            [7, 0, 300, 0.1, 20], [7, 1600, 640, 3.3, 18], [7, 260, 0, 1.0, 16], [7, 980, 0, 1.6, 17], [7, 1600, 60, 2.7, 16], [7, 600, 0, 2.2, 14]
        ];
        var g = { 5: '', 6: '', 7: '' };
        TRUNKS.forEach(function (t) { g[t[0]] += crack(t[1], t[2], t[3], t[4], 0); });
        return '<svg class="placeholder" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
            [5, 6, 7].map(function (n) { return '<g class="c' + n + '"><g class="cr-edge">' + g[n] + '</g><g class="cr-line">' + g[n] + '</g></g>'; }).join('') + '</svg>';
    }
    var skybox = document.querySelector('.skybox');
    if (skybox && R >= 5 && R <= 7) {
        var cr = document.createElement('span');
        cr.className = 'sky-cracks';
        cr.dataset.asset = 'assets/sky/cracks';
        cr.innerHTML = cracksArt();
        skybox.appendChild(cr);
        if (Sky.fillAssets) Sky.fillAssets(skybox);
    }

    /* ---------------- the wallpaper (the living space) ---------------- */
    // (both drawn on a 120 x 150 box, the top edge at the ceiling)
    var PEEL = '<svg class="placeholder" viewBox="0 0 120 150" aria-hidden="true">' +
        // a dog-ear: the corner of the paper has folded down off the wall, its plain back showing (the black behind it: .wp-behind)
        '<path d="M40 0 L120 70 L51 79 Z" fill="#e6dbc0" stroke="#8f7f62" stroke-width="1.2" stroke-linejoin="round"/>' +
        '<path d="M46 9 L110 66 M52 22 L98 64" stroke="#c4b591" stroke-width=".9"/>' +
        '<path d="M40 0 L120 70" stroke="rgba(0,0,0,.35)" stroke-width="2.2"/></svg>';
    var PEELED = '<svg class="placeholder" viewBox="0 0 120 150" aria-hidden="true">' +
        // the strip, come away in one piece and hanging off its last corner (the pattern side, torn ragged at the bottom)
        '<g transform="rotate(64 2 2)"><path d="M2 2 H86 V92 L78 100 L70 94 L60 104 L50 96 L40 106 L30 97 L20 104 L10 96 L2 100 Z" style="fill: var(--wall, #3f5a55)" stroke="rgba(0,0,0,.4)" stroke-width="1.2"/>' +
        '<path d="M14 2 V98 M40 2 V104 M66 2 V98" stroke="rgba(255,240,210,.1)" stroke-width="9"/></g></svg>';
    var room = document.querySelector('.room');
    var wallKeyHere = R === 5;
    if (room && PAGE === 'living' && R >= 5 && R <= 7) {
        var wp = document.createElement('div');
        wp.className = 'furnish wall-peel' + (R > 5 ? ' peeled' : '');
        wp.setAttribute('role', 'button');
        wp.setAttribute('tabindex', '0');
        wp.setAttribute('aria-label', 'the wallpaper, peeling');
        wp.dataset.slot = 'assets/living/wall-peel assets/living/wall-peel-open assets/living/behind-the-wall';
        wp.innerHTML = '<div class="wp-behind" data-asset="assets/living/behind-the-wall"></div>' +
            '<div class="wp-curl" data-asset="assets/living/wall-peel">' + PEEL + '</div>' +
            '<div class="wp-open" data-asset="assets/living/wall-peel-open">' + PEELED + '</div>';
        room.appendChild(wp);
        voidInto(wp.querySelector('.wp-behind'), 14);
        if (Sky.fillAssets) Sky.fillAssets(wp);
        try { if (sessionStorage.getItem('wall-peeled') === '1') wp.classList.add('peeled'); } catch (e) {}
        var peel = function (e) {
            if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
            if (busyHands() || e.target.closest('.reset-key')) return;
            e.preventDefault(); e.stopPropagation();
            if (wp.classList.contains('peeled')) {
                say(R === 5 ? 'Behind the wallpaper there’s no wall. Just the dark, and writing in it.' : 'It’s still hanging open. Nobody’s papered over it.', 3200);
                return;
            }
            wp.classList.add('peeled');
            try { sessionStorage.setItem('wall-peeled', '1'); } catch (e2) {}
            sfx('wall-peel', { or: 'paper-unroll' });
            setTimeout(function () { say('It came away in one long strip. There’s no wall behind it.', 3200); }, 500);
        };
        wp.addEventListener('click', peel);
        wp.addEventListener('keydown', peel);
    }

    /* ---------------- the sky over the rooftop ---------------- */
    var SEAM = '<svg class="placeholder" viewBox="0 0 100 100" aria-hidden="true">' +
        // the hairline the sky's split along, and the corner lifting off it (its back is plain paper)
        '<path d="M2 98 L22 76 L30 79 L44 60 L52 62 L64 44" fill="none" stroke="rgba(20,16,12,.55)" stroke-width="1.6"/>' +
        '<path d="M64 44 L98 44 L98 6 Z" fill="rgba(8,8,10,.92)"/>' +
        '<path d="M64 44 L98 6 Q74 12 70 24 Q66 34 64 44 Z" fill="#efe6cf" stroke="#9c8d70" stroke-width="1"/>' +
        '<path d="M70 30 Q78 20 92 12" stroke="#c9bb98" stroke-width=".8" fill="none"/></svg>';
    var STITCHED = '<svg class="placeholder" viewBox="0 0 100 100" aria-hidden="true">' +
        '<path d="M2 98 L22 76 L30 79 L44 60 L52 62 L64 44 L80 30 L98 6" fill="none" stroke="rgba(20,16,12,.6)" stroke-width="1.8"/>' +
        '<g stroke="#2b2118" stroke-width="2.2" stroke-linecap="round">' +
        [[10, 88], [24, 74], [38, 66], [50, 58], [60, 48], [72, 38], [84, 26], [94, 12]].map(function (p) {
            return '<path d="M' + (p[0] - 6) + ' ' + (p[1] - 5) + ' L' + (p[0] + 6) + ' ' + (p[1] + 5) + '"/>';
        }).join('') + '</g></svg>';
    if (PAGE === 'city' && R >= 5 && R <= 7) {
        var seam = document.createElement('button');
        seam.type = 'button';
        var stitched = R > 5;
        seam.className = 'sky-seam' + (stitched ? ' stitched' : '');
        seam.setAttribute('aria-label', stitched ? 'the sky, sewn shut' : 'a corner of the sky, coming loose');
        seam.dataset.asset = stitched ? 'assets/city/sky-stitched' : 'assets/city/sky-seam';
        seam.innerHTML = stitched ? STITCHED : SEAM;
        body.appendChild(seam);
        if (Sky.fillAssets) Sky.fillAssets(seam.parentNode);
        var tearing = false;
        seam.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (tearing || busyHands()) return;
            if (stitched) { say('Someone’s sewn the sky shut. Big, clumsy stitches.', 2800); return; }
            if (Sky.lives && Sky.lives.refuse('veil')) { seam.classList.remove('tug'); void seam.offsetWidth; seam.classList.add('tug'); return; }
            tear();
        });
    }
    function tear() {
        var ch = document.querySelector('.city-char');
        if (!ch || !Sky.gore) return;
        tearing = true;
        body.classList.add('cutscene', 'sky-torn');
        var sr = seam.getBoundingClientRect(), cx = sr.left + sr.width * 0.8, cy = sr.top + sr.height * 0.25;
        // what's behind the sky: in front of the painted backdrop, behind the city
        var t = document.createElement('div');
        t.className = 'veil-tear';
        t.setAttribute('aria-hidden', 'true');
        t.dataset.slot = 'assets/city/behind-the-sky';
        t.innerHTML = '<div class="vt-behind" data-asset="assets/city/behind-the-sky"></div><svg class="vt-rim" aria-hidden="true"><polygon/></svg>';
        voidInto(t.querySelector('.vt-behind'), 80);
        var ground = document.querySelector('.ground');
        if (ground) ground.parentNode.insertBefore(t, ground); else body.appendChild(t);
        if (Sky.fillAssets) Sky.fillAssets(t);
        seam.classList.add('gone');
        sfx('sky-tear', { or: 'crack' });
        setTimeout(function () { sfx('void-wind', { or: 'unnerve' }); }, 500);
        // the tear: a ragged hole, growing from the corner till it's taken the whole sky
        var N = 46, jag = [], W = window.innerWidth, H = window.innerHeight, big = Math.hypot(W, H) * 1.1, t0 = performance.now(), MS = 3200;
        for (var i = 0; i < N; i++) jag.push(0.72 + Math.random() * 0.5);
        var poly = t.querySelector('polygon');
        (function frame(now) {
            if (!t.isConnected) return;
            var k = Math.min(1, (now - t0) / MS), r = big * (k * k * (3 - 2 * k)) + 8, pts = [];
            for (var j = 0; j < N; j++) {
                var a = j / N * Math.PI * 2, rr = r * jag[j] * (0.94 + 0.06 * Math.sin(now / 90 + j));
                pts.push((cx + Math.cos(a) * rr).toFixed(1) + 'px ' + (cy + Math.sin(a) * rr * 0.8).toFixed(1) + 'px');
            }
            t.style.clipPath = 'polygon(' + pts.join(',') + ')';
            poly.setAttribute('points', pts.map(function (p) { return p.replace(/px/g, ''); }).join(' '));
            if (k < 1) requestAnimationFrame(frame);
        })(t0);
        // the traveller: lifted off the roof, up into it, coming apart like paper as they go
        setTimeout(function () {
            var r = ch.getBoundingClientRect(), dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
            ch.classList.remove('walking', 'talking');
            ch.animate([
                { transform: 'translate(0, 0) rotate(0)', opacity: 1 },
                { transform: 'translate(0, -' + (r.height * 0.25) + 'px) rotate(-8deg)', opacity: 1, offset: 0.25 },
                { transform: 'translate(' + dx + 'px, ' + dy + 'px) rotate(300deg) scale(.15)', opacity: 0 }
            ], { duration: 2200, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' });
            var made = 0, bits = setInterval(function () {
                var b = ch.getBoundingClientRect();
                scrap(b.left + b.width * Math.random(), b.top + b.height * Math.random(), cx, cy);
                if (++made > 34) clearInterval(bits);
            }, 55);
            setTimeout(function () { sfx('scream', { size: 0.6 }); }, 300);
        }, 1300);
        setTimeout(function () {
            ch.getAnimations().forEach(function (a) { a.cancel(); });
            ch.classList.add('gore-hidden');
            Sky.gore.respawn(ch);                                           // (the reset's death: sky/lives.js)
            // (if it didn't count, somehow: the sky mends itself and they're back)
            setTimeout(function () {
                if (!body.classList.contains('sky-torn')) return;
                t.style.transition = 'opacity 1.2s'; t.style.opacity = '0';
                setTimeout(function () { t.remove(); body.classList.remove('cutscene', 'sky-torn'); seam.classList.remove('gone'); tearing = false; }, 1300);
            }, 2500);
        }, 3900);
    }
    // a scrap of the traveller, torn off and sucked away into the tear
    function scrap(x, y, tx, ty) {
        var s = document.createElement('div');
        s.className = 'vt-scrap';
        s.style.left = x + 'px'; s.style.top = y + 'px';
        body.appendChild(s);
        s.animate([
            { transform: 'translate(0,0) rotate(0)', opacity: 1 },
            { transform: 'translate(' + (tx - x) + 'px,' + (ty - y) + 'px) rotate(' + (360 + Math.random() * 540) + 'deg) scale(.3)', opacity: 0 }
        ], { duration: 900 + Math.random() * 700, easing: 'cubic-bezier(.4,0,.9,.5)', fill: 'forwards' }).onfinish = function () { s.remove(); };
    }

    Sky.veil = { code: code, voidInto: voidInto, get keyBehindWall() { return wallKeyHere; } };
})();

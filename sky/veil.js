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
     the paint     reset 5: three places the paint's coming away (1 Nov). pull each
                   one away: behind it there's nothing, only the black and the lines
                   it's all written in, one of them lit up. the key falls out of the
                   last of the three opened (run:veil-seams keeps which, for the reset).
                   the wallpaper in the living space (from reset 6 it hangs open):
                     assets/living/wall-peel (the corner, folded down), wall-peel-open
                     (hanging down), assets/living/behind-the-wall
                   the canvas on the workshop's easel, at its top right corner:
                     assets/workshop/canvas-peel, canvas-peel-open
                   a seam along the sea's far wave (it drifts with the wave):
                     assets/sea/horizon-seam, horizon-seam-open
     the sky       reset 5, the rooftop: one corner of the painted sky has come
                   unstuck. once the key's found, pull it: the sky tears open onto
                   what's behind it (nothing: the black, and the lines), and the
                   traveller is pulled up through the tear in scraps. that's the
                   reset's death. from reset 6 the corner's been sewn shut.
                   slots: assets/city/sky-seam (the loose corner), assets/city/sky-stitched
                   (sewn shut), assets/city/behind-the-sky (what the tear opens onto)
     sounds        sky-tear (the sky ripping), void-wind (the pull through it),
                   wall-peel (the wallpaper coming down), paint-peel (the canvas's paint
                   and the sea's coming away): stand-ins until yours

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
    // a black with the lines in it (behind the wallpaper, behind the sky). mark: one line of its own, lit up (a <mark>),
    // on line number "at" (1 Nov: the three places the paint's come away each have one)
    function voidInto(el, lines, mark, at) {
        var pre = document.createElement('pre');
        pre.className = 'void-lines';
        pre.setAttribute('aria-hidden', 'true');
        var lit = null;
        if (mark) { lit = document.createElement('mark'); lit.textContent = mark; pre.appendChild(lit); }
        el.appendChild(pre);
        code(function (t) {
            var all = t.split('\n'), from = Math.floor(Math.random() * Math.max(1, all.length - lines)), got = all.slice(from, from + lines);
            if (!lit) { pre.textContent = got.join('\n'); return; }
            var i = Math.max(0, Math.min(got.length, at == null ? Math.floor(got.length / 2) : at));
            pre.textContent = '';
            pre.appendChild(document.createTextNode(got.slice(0, i).join('\n') + (i ? '\n' : '')));
            pre.appendChild(lit);
            pre.appendChild(document.createTextNode('\n' + got.slice(i).join('\n')));
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

    /* ---------------- three places the paint's coming away (reset 5) ----------------
       (1 Nov) the wallpaper in the living space, a corner of the canvas on the workshop's easel, and a seam along the
       sea's far wave. each one is taken hold of and pulled away (Sky.pull, like the wallpaper always was): behind it
       there's nothing, only the black and the lines it's all written in, one of them lit up. the reset remembers which
       are open (run:veil-seams, a list), and the key falls out of whichever is opened last, the third (sky/resets.js
       catches it; after a reload it's put back where it fell). from reset 6 the wallpaper still hangs open; the canvas
       and the sea have been painted over (they're gone) */
    var SEAMS = ['wall', 'canvas', 'horizon'];
    var places = {};                                                    // the ones on this page, by id
    function opened() {
        try {
            var l = JSON.parse(S.get('veil-seams') || '[]');
            return Array.isArray(l) ? l.filter(function (x) { return SEAMS.indexOf(x) !== -1; }) : [];
        } catch (e) { return []; }
    }
    function markOpen(id) {
        var l = opened();
        if (l.indexOf(id) === -1) l.push(id);
        S.set('veil-seams', JSON.stringify(l));
        return l;
    }
    // (a visit from before 1 Nov, with the wallpaper already down: it counts)
    try { if (R === 5 && sessionStorage.getItem('wall-peeled') === '1') { markOpen('wall'); sessionStorage.removeItem('wall-peeled'); } } catch (e) {}

    // the key, out of the last one opened: it falls where that one says (key: [left, top], in % of it)
    function dropKey(id, quiet) {
        var p = places[id];
        if (!p || S.get('key') === '1') return null;
        var d = { by: 'veil', host: p.el, left: p.key[0] + '%', top: p.key[1] + '%', quiet: !!quiet };
        if (!quiet) document.dispatchEvent(new CustomEvent('dav:drop-key', { detail: d }));
        return d;
    }
    // (after a reload: all three open, the key not taken. sky/resets.js asks, and puts it back where it fell)
    function keyLies() {
        var l = opened();
        if (R !== 5 || l.length < SEAMS.length) return null;
        return dropKey(l[l.length - 1], true);
    }

    // one place where the paint's come away, and how it's pulled:
    //   host   where it goes in the page;  cls   its classes (where it sits and how it looks: sky/css/veil.css)
    //   slots  [the corner, lifting; the strip, pulled away; what's behind it (optional)]
    //   o      id ('wall', 'canvas', 'horizon'), label, closed / opened (the drawn stand-ins), open (already open),
    //          line (the one line of the world's code that's lit up behind it), at (which line it's on), lines (how many),
    //          dir / need (which way it's pulled, and how far: px, or a function of the element), sound, key ([left, top]:
    //          where the key lands if it falls out of this one), and what the traveller says: tap (only clicked),
    //          gave (it came away), again (clicked once it's open)
    function peelable(host, cls, slots, o) {
        var el = document.createElement('div');
        el.className = cls + ' peel' + (o.open || opened().indexOf(o.id) !== -1 ? ' peeled' : '');
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', o.label);
        el.dataset.slot = slots.join(' ');
        el.dataset.peel = o.id;
        el.innerHTML = '<div class="pl-behind"' + (slots[2] ? ' data-asset="' + slots[2] + '"' : '') + '></div>' +
            '<div class="pl-curl" data-asset="' + slots[0] + '">' + o.closed + '</div>' +
            '<div class="pl-open" data-asset="' + slots[1] + '">' + o.opened + '</div>';
        host.appendChild(el);
        voidInto(el.querySelector('.pl-behind'), o.lines || 14, o.line, o.at);
        if (Sky.fillAssets) Sky.fillAssets(el);
        var place = places[o.id] = { el: el, key: o.key || [50, 70] };

        function tearDown() {
            el.style.removeProperty('--pull');
            if (el.classList.contains('peeled')) return;
            el.classList.add('peeled');
            sfx(o.sound || 'wall-peel', { or: 'paper-unroll' });
            if (R !== 5) { setTimeout(function () { say(o.gave, 3200); }, 500); return; }
            var l = markOpen(o.id), all = l.length >= SEAMS.length;
            setTimeout(function () { say(o.gave, 3200); }, 500);
            if (all) setTimeout(function () { if (el.isConnected) dropKey(o.id); }, 2400);
            // (more to find: said so, without saying where)
            else if (S.get('key') !== '1') setTimeout(function () { say(MORE[l.length] || MORE[1], 3400); }, 4000);
        }
        function poke(e) {
            if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
            if (busyHands() || (e.target.closest && e.target.closest('.reset-key'))) return;
            e.preventDefault(); e.stopPropagation();                         // (the workshop's easel under it mustn't open)
            if (el.classList.contains('peeled')) { say(o.again, 3200); return; }
            if (e.type === 'keydown') tearDown();                            // (by hand it's pulled: below)
        }
        el.addEventListener('click', poke);
        el.addEventListener('keydown', poke);
        // (11 Oct: grabbed, then pulled) take hold of the corner and pull: it lifts further off (--pull, 0 to 1: how it
        // lifts is in veil.css), and far enough it comes away. let go too soon and it settles back
        Sky.pull(el, {
            dir: o.dir,
            need: function () { return typeof o.need === 'function' ? o.need(el) : (o.need || 60); },
            can: function (e) { return !el.classList.contains('peeled') && !(e.target.closest && e.target.closest('.reset-key')); },
            move: function (k) { el.style.setProperty('--pull', k.toFixed(3)); },
            give: tearDown,
            back: function () { el.style.removeProperty('--pull'); },
            tap: function () { say(o.tap, 2600); }
        });
        return place;
    }
    // what the traveller says after one or two of the three (it can't be the only place)
    var MORE = {
        1: 'It can’t be the only place. The paint’s coming away somewhere else too, I can feel it.',
        2: 'Two. There’s one more somewhere. Somewhere the paint’s still lifting.'
    };

    // the wallpaper (the living space): a corner come away at the ceiling. (both drawn on a 120 x 150 box, the top edge at
    // the ceiling.) from reset 6 it hangs open
    var PEEL = '<svg class="placeholder" viewBox="0 0 120 150" aria-hidden="true">' +
        // a dog-ear: the corner of the paper has folded down off the wall, its plain back showing (the black behind it: .pl-behind)
        '<path d="M40 0 L120 70 L51 79 Z" fill="#e6dbc0" stroke="#8f7f62" stroke-width="1.2" stroke-linejoin="round"/>' +
        '<path d="M46 9 L110 66 M52 22 L98 64" stroke="#c4b591" stroke-width=".9"/>' +
        '<path d="M40 0 L120 70" stroke="rgba(0,0,0,.35)" stroke-width="2.2"/></svg>';
    var PEELED = '<svg class="placeholder" viewBox="0 0 120 150" aria-hidden="true">' +
        // the strip, come away in one piece and hanging off its last corner (the pattern side, torn ragged at the bottom)
        '<g transform="rotate(64 2 2)"><path d="M2 2 H86 V92 L78 100 L70 94 L60 104 L50 96 L40 106 L30 97 L20 104 L10 96 L2 100 Z" style="fill: var(--wall, #3f5a55)" stroke="rgba(0,0,0,.4)" stroke-width="1.2"/>' +
        '<path d="M14 2 V98 M40 2 V104 M66 2 V98" stroke="rgba(255,240,210,.1)" stroke-width="9"/></g></svg>';
    var room = document.querySelector('.room');
    if (room && PAGE === 'living' && R >= 5 && R <= 7) peelable(room, 'furnish wall-peel',
        ['assets/living/wall-peel', 'assets/living/wall-peel-open', 'assets/living/behind-the-wall'], {
            id: 'wall', open: R > 5, label: 'the wallpaper, peeling', closed: PEEL, opened: PEELED,
            line: '// only paper.', at: 3, lines: 14,
            dir: [0.25, 1], need: function (el) { return Math.max(50, el.offsetHeight * 0.55); },
            sound: 'wall-peel', key: [62, 50],
            tap: 'It’s coming away at the corner. You could pull it down.',
            gave: 'It came away in one long strip. There’s no wall behind it.',
            again: R === 5 ? 'Behind the wallpaper there’s no wall. Just the dark, and writing in it.' : 'It’s still hanging open. Nobody’s papered over it.'
        });

    // the canvas on the workshop's easel: the paint lifting at its top right corner, like a skin. (drawn on a 100 x 150 box,
    // its top right on the canvas's top right corner: the gap is the square at the top, the skin hangs down below it.)
    // reset 5 only
    var LIFT = '<svg class="placeholder" viewBox="0 0 100 150" aria-hidden="true">' +
        // the corner of the paint, folded down off the canvas: its back is bare, a little cracked
        '<path d="M45 0 L100 55 L45 55 Z" fill="#e9dcc0" stroke="#8a7656" stroke-width="1.2" stroke-linejoin="round"/>' +
        '<path d="M52 12 L54 50 M62 22 L64 50 M74 33 L76 50 M50 30 L80 40" stroke="#c7b48c" stroke-width=".8" fill="none"/>' +
        '<path d="M45 0 L100 55" stroke="rgba(0,0,0,.4)" stroke-width="2.2"/></svg>';
    var LIFTED = '<svg class="placeholder" viewBox="0 0 100 150" aria-hidden="true">' +
        // the skin of paint, come away and hanging off the bottom of the gap it left (the painted side: brushstrokes)
        '<g transform="rotate(10 2 100)"><path d="M2 100 H78 L76 118 L68 126 L60 121 L50 131 L40 124 L30 134 L20 126 L10 132 L2 126 Z" fill="#b98a4e" stroke="rgba(0,0,0,.4)" stroke-width="1.2"/>' +
        '<path d="M6 106 Q34 101 72 108 M4 116 Q30 111 70 119" stroke="#7d5a32" stroke-width="4" fill="none" opacity=".55"/>' +
        '<path d="M10 111 Q38 106 66 113 M8 122 Q26 118 52 124" stroke="#e2c58c" stroke-width="2.2" fill="none" opacity=".6"/></g></svg>';
    var easel = document.querySelector('.easel');
    if (easel && PAGE === 'workshop' && R === 5) peelable(easel, 'canvas-peel',
        ['assets/workshop/canvas-peel', 'assets/workshop/canvas-peel-open'], {
            id: 'canvas', label: 'the paint on the canvas, lifting at a corner', closed: LIFT, opened: LIFTED,
            line: '// someone\n// painted this.', at: 2, lines: 10,
            dir: [-0.6, 0.8], need: function (el) { return Math.max(44, el.offsetWidth * 0.75); },
            sound: 'paint-peel', key: [58, 52],
            tap: 'The paint’s lifting off the canvas at the corner. You could peel it back.',
            gave: 'The paint came away like a skin. There’s nothing under it. Not even canvas.',
            again: 'Behind the paint there’s no canvas. Just the dark, and that one line.'
        });

    // the sea: a seam along the far wave, the paint of the water lifting off it at one end. (drawn on a 160 x 60 box.) it's
    // in the far wave's own layer (sky/ground-sea.js), so it drifts and rocks with it. reset 5 only
    var SPLIT = '<svg class="placeholder" viewBox="0 0 160 60" aria-hidden="true">' +
        // the hairline the water's split along, and its right end lifting off (the back of the paint is bare)
        '<path d="M4 36 L20 33 L34 37 L52 31 L70 35 L88 30 L100 33" fill="none" stroke="rgba(14,12,10,.65)" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<path d="M100 33 L118 30 L134 34 L154 28 Q150 12 132 8 Q114 6 100 33 Z" fill="#e6dcc4" stroke="#8a7d64" stroke-width="1.1" stroke-linejoin="round"/>' +
        '<path d="M108 26 Q122 14 144 16" stroke="#c4b591" stroke-width=".8" fill="none"/></svg>';
    var SPLIT_OPEN = '<svg class="placeholder" viewBox="0 0 160 60" aria-hidden="true">' +
        // the strip of painted water, peeled down and hanging off its left end (wave colours, a line of foam)
        '<g transform="rotate(24 4 34)"><path d="M4 34 H118 L114 42 L104 39 L94 45 L82 40 L70 46 L58 41 L46 46 L34 41 L22 45 L10 40 L4 44 Z" fill="#56636f" stroke="rgba(0,0,0,.45)" stroke-width="1"/>' +
        '<path d="M8 37 Q30 34 54 37 T110 36" stroke="#e2d9c6" stroke-width="1.6" fill="none" opacity=".75"/></g></svg>';
    var far = PAGE === 'sea' && R === 5 && document.querySelector('.ground-sea .wave-move-1');
    if (far) {
        var seam5 = peelable(far, 'horizon-seam',
            ['assets/sea/horizon-seam', 'assets/sea/horizon-seam-open'], {
                id: 'horizon', label: 'the far sea, split along a seam', closed: SPLIT, opened: SPLIT_OPEN,
                line: '// the sea stops here.', at: 2, lines: 6,
                dir: [0, 1], need: 50,
                sound: 'paint-peel', key: [52, 74],
                tap: 'The far sea’s split along a seam, and the edge is lifting. You could pull it.',
                gave: 'The far sea peeled back like wet paper. There’s nothing past it.',
                again: 'The sea stops there. Behind it, only the dark, and the writing.'
            });
        ride(seam5.el);
    }
    // (the sea's toy camera, sky/postfx.js, slides the far wave's picture a little as the visitor looks about, and blurs it.
    // the seam's painted on that wave, so it slides with it, the same amount, and its paint blurs half as much: the black and
    // the writing behind it stay sharp. it waits a while for the camera, then gives up)
    function ride(el) {
        var it = null, tries = 0, was = '', blur = '';
        (function find() {
            var cam = Sky.postfx && Sky.postfx.camera;
            it = cam && (cam.items || []).filter(function (x) { return x.slot === 'assets/sea/wave-1'; })[0];
            if (it) return step();
            if (++tries < 40 && el.isConnected) setTimeout(find, 500);
        })();
        function step() {
            if (!el.isConnected) return;
            var v = it.x.toFixed(1) + 'px ' + it.y.toFixed(1) + 'px';
            if (v !== was) el.style.translate = was = v;
            var p = it.el.postfx, b = p ? (p.blur * innerWidth / 1920 / 2).toFixed(1) + 'px' : '0px';
            if (b !== blur) el.style.setProperty('--seam-blur', blur = b);
            requestAnimationFrame(step);
        }
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
        var tryTear = function () {
            if (Sky.lives && Sky.lives.refuse('veil')) { seam.classList.remove('tug'); void seam.offsetWidth; seam.classList.add('tug'); return false; }
            tear();
        };
        seam.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (tearing || busyHands()) return;
            if (stitched) { say('Someone’s sewn the sky shut. Big, clumsy stitches.', 2800); return; }
            if (e.detail === 0) tryTear();                                   // (from the keyboard. by hand it's pulled: below)
        });
        // (11 Oct: grabbed, then pulled) take hold of the loose corner and pull it away from the sky: it lifts and
        // stretches, and far enough it tears. let go too soon and it lies flat again
        var flap = function () { return seam.querySelector('svg, .art'); };
        Sky.pull(seam, {
            need: 80,
            can: function () { return !stitched && !tearing; },
            move: function (k, dx, dy) {
                var f = flap(); if (!f) return;
                f.style.transition = 'none';
                f.style.transformOrigin = '64% 44%';
                f.style.transform = 'translate(' + (dx * 0.18).toFixed(1) + 'px, ' + (dy * 0.18).toFixed(1) + 'px) scale(' + (1 + 0.2 * k).toFixed(3) + ')';
            },
            give: function () { var f = flap(); if (f) f.style.transition = f.style.transform = ''; return tryTear(); },
            back: function () { var f = flap(); if (f) { f.style.transition = 'transform .4s cubic-bezier(.3,1.8,.5,1)'; f.style.transform = ''; } },
            tap: function () { say('A corner of the sky is coming loose. You could pull it.', 2600); }
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
        // (reduced motion: no growing, no tumbling, no scraps: the sky fades to what's behind it, and they fade into it)
        var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (calm) { t.style.opacity = '0'; t.style.transition = 'opacity 1.6s'; requestAnimationFrame(function () { t.style.opacity = '1'; }); }
        if (!calm) (function frame(now) {
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
            if (calm) { ch.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1800, fill: 'forwards' }); return; }
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

    Sky.veil = { code: code, voidInto: voidInto, peelable: peelable, keyLies: keyLies, places: places,
                 get opened() { return opened(); } };
})();

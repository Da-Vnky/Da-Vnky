/* =====================================================================
   hell.js — reset 4: where the grimoire's pact takes the traveller, and what
   they're given to bring back (living.html).

   THE WAY DOWN: in the attic, "make the pact" (sky/attic.js): the hands drag the
   traveller down through the boards… and they land here. A red sky, a floor of
   brimstone with fire in its cracks, embers rising, and a great eye in the sky,
   inside an ouroboros (the serpent eating its own tail) that turns and turns. A
   voice nobody can see speaks (VOICE below): kill the Claubes.

   THE WHITE REVOLVER comes down in front of them, down there, glowing, and the voice
   says one more thing (GIFT_LINE). Pick it up: it's theirs for the rest of reset 4
   (run:white-revolver, sky/revolver.js). They can't leave yet: the eye is watching.
   SHOOT THE EYE with it (sky/revolver.js calls shootEye): it bursts, screeches, and
   reset 4's KEY drops at the traveller's feet (RESETS[3].key.drop = 'hell', sky/resets.js).
   Picking the key up unlocks the heart, the ground shakes, the dark comes back and the
   hands push them up through the attic floor again. Back up there the book that opens the
   dungeon is on the living-room shelf again (it went missing at the start of reset 4:
   sky/bathroom.js). (27 Sep, Victor: the pact no longer needs the key first; the key is
   down here now, so nobody can get stuck.)
   A reload down there (or leaving the page) before the key: the grimoire on the lectern
   pulls them straight back down (sky/attic.js), the eye as they left it (run:hell-eye).

   ITS APPARITIONS: the six pictures round the false god in the hall of shame (frames
   1–5 and 7). When the revolver comes, any of them already shot this visit are back
   in their frames. Each one shot after the pact is counted for the rest of the reset
   (run:apparitions) and stays broken; the false god only sends its bullet back once
   they're all gone and so are the seven Claubes (sky/claubes.js whiteFrame).

   slots (assets/hell/): sky        the red sky, the whole screen (1920 x 1080)
                         floor      the brimstone floor along the bottom (1920 x 360, see-through at the top edge)
                         eye        the great eye (about 2:1, see-through): it opens, blinks and closes
                         ouroboros  the serpent ring round the eye (square, see-through). an animated GIF / WebP
                                    loops on its own; the drawn stand-in turns
                         eye-burst  the eye bursting (optional; a GIF that plays once, the size of the eye)
         assets/characters/hell    the traveller down there (else the attic's)
         assets/items/white-revolver   the white revolver (sky/inventory.js)
   sounds: assets/sounds/hell (loops: the music down there; a drawn one till then),
           hell-voice (a letter of the voice's words), quake, white-appear, land,
           eye-burst, eye-screech (the eye, shot)
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    var body = document.body, attic = document.querySelector('.attic');
    if (!Sky || Sky.hell || !attic) return;
    var R4 = !!S && S.live('diagram');
    var sfx = Sky.sfx;
    function get(k) { return S ? S.get(k) : null; }
    function set(k, v) { if (S) S.set(k, v); }

    // what the voice says, down there (one box, click to go on)
    var VOICE = [
        'So. Another one signs.',
        'Do not be afraid. Afraid is for later.',
        'Under your house, the little ones kneel in a circle and sing to a picture. They call it god.',
        'It is not a god. It is a mouth. And they are feeding it.',
        'Kill the Claubes. Every one of them.'
    ];
    var WHO = 'a voice';
    // and when the white revolver comes
    var GIFT_LINE = 'Destroy its disciples and apparitions.';
    // the traveller, once it's in their hand: the way out is through the eye
    var EYE_HINT = ['That eye hasn\u2019t looked away from me once.', 'There\u2019s something in it. Something small and bright, in the black of it.'];
    var EYE_NO = 'It doesn\u2019t even blink. Not with that gun.';
    var AFTER_KEY = 'Go. Up, and then down, to where they kneel.';
    var APPARITIONS = ['1', '2', '3', '4', '5', '7'];

    /* ---------------- the stand-ins ---------------- */
    var EYE = '<svg class="placeholder" viewBox="0 0 400 200" aria-hidden="true"><defs>' +
            '<radialGradient id="hl-sclera" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#f6e6cc"/><stop offset=".7" stop-color="#e2b99a"/><stop offset="1" stop-color="#8a2a1a"/></radialGradient>' +
            '<radialGradient id="hl-iris" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe070"/><stop offset=".45" stop-color="#ff7a10"/><stop offset=".85" stop-color="#9a1204"/><stop offset="1" stop-color="#3a0402"/></radialGradient>' +
            '<clipPath id="hl-lids"><path d="M10 100 Q200 -40 390 100 Q200 240 10 100 Z"/></clipPath></defs>' +
        '<path d="M0 100 Q200 -58 400 100 Q200 258 0 100 Z" fill="#2a0604"/>' +
        '<g clip-path="url(#hl-lids)"><rect width="400" height="200" fill="url(#hl-sclera)"/>' +
            '<g stroke="#b3160c" stroke-width="1.6" fill="none" opacity=".75"><path d="M14 100 Q60 92 96 104 Q118 110 132 100"/><path d="M40 70 Q80 84 118 80"/><path d="M386 100 Q340 108 304 96 Q284 90 268 100"/>' +
            '<path d="M360 132 Q318 118 286 124"/><path d="M60 136 Q96 122 124 126"/><path d="M340 64 Q300 80 276 76"/></g>' +
            '<g class="hl-iris"><circle cx="200" cy="100" r="66" fill="url(#hl-iris)"/>' +
                '<g stroke="#5a0802" stroke-width="1.4" opacity=".6">' + (function () { var d = ''; for (var i = 0; i < 24; i++) { var a = i * Math.PI / 12; d += '<path d="M' + (200 + 26 * Math.cos(a)).toFixed(1) + ' ' + (100 + 26 * Math.sin(a)).toFixed(1) + ' L' + (200 + 62 * Math.cos(a)).toFixed(1) + ' ' + (100 + 62 * Math.sin(a)).toFixed(1) + '"/>'; } return d; })() + '</g>' +
                '<ellipse class="hl-pupil" cx="200" cy="100" rx="11" ry="54" fill="#0a0000"/><ellipse cx="178" cy="74" rx="12" ry="7" fill="#fff" opacity=".55"/></g>' +
            '<path d="M10 100 Q200 -40 390 100" fill="none" stroke="#1a0302" stroke-width="10"/><path d="M10 100 Q200 240 390 100" fill="none" stroke="#1a0302" stroke-width="6"/></g></svg>';
    var OURO = '<svg class="placeholder" viewBox="0 0 400 400" aria-hidden="true">' +
        '<circle cx="200" cy="200" r="168" fill="none" stroke="#1c1408" stroke-width="40"/>' +
        '<circle cx="200" cy="200" r="168" fill="none" stroke="#6e5a1a" stroke-width="30"/>' +
        '<circle cx="200" cy="200" r="168" fill="none" stroke="#c9a23a" stroke-width="6" stroke-dasharray="3 14" opacity=".8"/>' +
        '<circle cx="200" cy="200" r="178" fill="none" stroke="#3a2a0a" stroke-width="4" stroke-dasharray="10 8" opacity=".9"/>' +
        '<circle cx="200" cy="200" r="158" fill="none" stroke="#3a2a0a" stroke-width="4" stroke-dasharray="10 8" opacity=".9"/>' +
        '<g transform="translate(200 32)"><path d="M-6 -22 Q34 -30 52 -6 Q58 6 44 14 Q26 22 -4 20 Z" fill="#4e3e10" stroke="#1c1408" stroke-width="3"/>' +
            '<path d="M-2 18 Q10 8 -2 -2" fill="none" stroke="#1c1408" stroke-width="3"/><circle cx="30" cy="-8" r="5" fill="#ff3a10"/><circle cx="31" cy="-8" r="2" fill="#000"/>' +
            '<path d="M44 12 L40 24 M34 16 L32 26" stroke="#efe6d2" stroke-width="3"/></g>' +
        '<path d="M186 30 Q176 34 170 40 L178 44 Z" fill="#6e5a1a" stroke="#1c1408" stroke-width="3"/></svg>';
    var FLOOR = '<svg class="placeholder" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true"><defs>' +
            '<linearGradient id="hl-rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1a10"/><stop offset=".2" stop-color="#1e0c08"/><stop offset="1" stop-color="#0a0403"/></linearGradient></defs>' +
        '<path d="M0 30 Q60 12 130 26 Q210 6 300 24 Q380 10 470 28 Q560 8 650 22 Q740 4 830 26 Q920 12 1000 24 V200 H0 Z" fill="url(#hl-rock)"/>' +
        '<g class="hl-cracks" fill="none" stroke="#ff6a14" stroke-linecap="round">' +
            '<path d="M40 60 L90 84 L140 78 L200 120 L260 112" stroke-width="3"/><path d="M320 50 L360 90 L430 96 L470 150" stroke-width="4"/><path d="M520 70 L580 82 L610 130 L700 140" stroke-width="3"/>' +
            '<path d="M760 54 L800 100 L870 104 L930 160" stroke-width="4"/><path d="M120 150 L180 170 L240 164" stroke-width="2"/><path d="M620 170 L690 176 L760 190" stroke-width="2"/></g>' +
        '<g fill="#5a2a14" opacity=".7"><ellipse cx="220" cy="46" rx="40" ry="8"/><ellipse cx="560" cy="44" rx="56" ry="9"/><ellipse cx="880" cy="48" rx="34" ry="7"/></g></svg>';

    // (its look is in sky/css/hell.css, linked from each page's head)

    /* ---------------- down there ---------------- */
    var hellEl = null, music = null, eyeTrack = null;
    function build(me) {
        var h = document.createElement('div');
        h.className = 'hell';
        h.setAttribute('role', 'dialog');
        h.setAttribute('aria-label', 'somewhere below');
        h.innerHTML = '<div class="hl-sky" data-asset="assets/hell/sky"><div class="placeholder"></div></div><div class="hl-smoke"></div>' +
            '<div class="hl-ouro" data-asset="assets/hell/ouroboros">' + OURO + '</div>' +
            '<div class="hl-eye" data-asset="assets/hell/eye">' + EYE + '</div>' +
            '<div class="hl-floor" data-asset="assets/hell/floor">' + FLOOR + '</div>' +
            '<div class="hl-me" aria-label="the traveller"></div><div class="hl-flash"></div><div class="hl-black"></div>';
        for (var i = 0; i < 26; i++) {
            var e = document.createElement('span');
            e.className = 'hl-ember';
            e.style.left = (Math.random() * 100).toFixed(1) + '%';
            e.style.setProperty('--t', (4 + Math.random() * 5).toFixed(1) + 's');
            e.style.setProperty('--d', (-Math.random() * 8).toFixed(1) + 's');
            e.style.setProperty('--dx', ((Math.random() - 0.5) * 120).toFixed(0) + 'px');
            h.appendChild(e);
        }
        // the traveller: their own picture for down here, or the one from the attic
        var who = h.querySelector('.hl-me'), from = me && (me.querySelector('img.art') || me.querySelector('svg'));
        if (from) { var c = from.cloneNode(true); c.classList.add('placeholder'); c.classList.remove('art'); who.appendChild(c); }
        Sky.findAsset('assets/characters/hell', function (u) { if (u) who.innerHTML = '<img alt="" src="' + u + '">'; });
        if (Sky.fillAssets) Sky.fillAssets(h);
        // no eye of its own for down here (assets/hell/eye)? then the sun's eye (sky/eye.js: sun-eyeball, sun-pupil), if
        // it's drawn: the same one, its pupil following the pointer (27 Sep, Victor)
        Sky.findAsset('assets/hell/eye', function (u) {
            if (u || !Sky.eye || !Sky.eye.make) return;
            Sky.eye.make().then(function (e) {
                if (!e) return;
                var box = h.querySelector('.hl-eye');
                box.classList.add('sun-eye');
                box.appendChild(e);
            });
        });
        // the eye (the drawn one) looks at whatever moves
        var iris = h.querySelector('.hl-iris');
        eyeTrack = function (e) {
            if (!iris || !h.isConnected) return;
            var r = h.querySelector('.hl-eye').getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            var dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2))), dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));
            iris.style.transform = 'translate(' + (dx * 60).toFixed(0) + 'px,' + (dy * 22).toFixed(0) + 'px)';
        };
        h.addEventListener('pointermove', eyeTrack);
        return h;
    }
    function voice(lines, done, low) {
        var o = { who: WHO, cls: 'voice' + (low ? ' low' : ''), blip: 'hell-voice', blipOr: 'murmur', hold: 2400 };
        if (Sky.speak) { Sky.speak(lines, done, o); return; }
        if (typeof lines === 'string') lines = [lines];
        if (Sky.inventory) Sky.inventory.say(lines.join(' '), 6000);
        if (done) setTimeout(done, 6000);
    }
    // the traveller's been dragged down (sky/attic.js): here, then back (back())
    function enter(me, back) {
        if (hellEl) return;
        hellEl = build(me);
        body.appendChild(hellEl);
        body.classList.add('in-hell');
        if (Sky.music && Sky.music.hush) Sky.music.hush(true, 'hell');
        if (Sky.noise && Sky.noise.hush) Sky.noise.hush(true, 'hell');
        if (!music && Sky.sounds && Sky.sounds.channel) music = Sky.sounds.channel('hell');
        if (music) music.set(0.85, 2.5);
        var who = hellEl.querySelector('.hl-me');
        who.style.visibility = 'hidden';
        requestAnimationFrame(function () { hellEl.classList.add('on'); });
        setTimeout(function () {                                                // they drop in from above
            who.style.visibility = '';
            who.classList.add('falling');
            sfx('fall-wind', { or: 'unnerve', size: 0.4 });
        }, 1300);
        setTimeout(function () { who.classList.remove('falling'); who.classList.add('landed'); sfx('land', { size: 1 }); sfx('scream', { delay: 0.05 }); }, 2200);
        setTimeout(function () { who.classList.remove('landed'); who.classList.add('trembling'); }, 2800);
        setTimeout(function () { hellEl.classList.add('eye-open'); sfx('unnerve'); }, 3300);   // and above them, an eye opens
        backFn = back;
        var again = get('hell-eye') === 'shot';
        if (again) {                                                            // (back down after a reload: the eye's already gone)
            hellEl.classList.add('eye-gone');
            setTimeout(function () { if (get('white-revolver') !== 'taken') offer(); else dropKey(); }, 3300);
            return;
        }
        setTimeout(function () {
            voice(get('hell-visited') === '1' ? [VOICE[VOICE.length - 1]] : VOICE, offer, true);
            set('hell-visited', '1');
        }, 5200);
    }
    var backFn = null;
    // the white revolver comes down in front of them (unless they have it already)
    function offer() {
        if (!hellEl) return;
        if (get('white-revolver') === 'taken') { voice(GIFT_LINE, hint); return; }
        placeGift(true, hellEl);
        sfx('white-appear', { or: 'shimmer' });
        setTimeout(function () { voice(GIFT_LINE); }, 1800);
    }
    function hint() {
        if (!hellEl || get('hell-eye') === 'shot') return;
        setTimeout(function () { if (hellEl) Sky.speak(EYE_HINT); }, 900);
    }
    // shot, down here (sky/revolver.js): the eye, with the white revolver, bursts and gives up the key
    function shootEye(x, y, white) {
        if (!hellEl || get('hell-eye') === 'shot') return false;
        if (!white) { if (Sky.inventory) Sky.inventory.say(EYE_NO, 2600); return true; }
        set('hell-eye', 'shot');
        var eye = hellEl.querySelector('.hl-eye'), r = eye.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        hellEl.classList.add('eye-burst');
        sfx('eye-burst', { or: 'claube-burst', size: 1 });
        sfx('eye-screech', { or: 'shriek', delay: 0.1 });
        setTimeout(function () { sfx('eye-screech', { or: 'shriek' }); }, 700);
        Sky.findAsset('assets/hell/eye-burst', function (u) {
            if (!u || !hellEl) return;
            var b = document.createElement('img'); b.className = 'hl-burst-art'; b.alt = ''; b.src = u + (u.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now();
            b.style.left = r.left + 'px'; b.style.top = r.top + 'px'; b.style.width = r.width + 'px'; b.style.height = r.height + 'px';
            hellEl.appendChild(b);
        });
        // what's left of it, everywhere
        for (var i = 0; i < 46; i++) {
            var g = document.createElement('span');
            g.className = 'hl-gib' + (i % 3 ? '' : ' big');
            g.style.left = cx + 'px'; g.style.top = cy + 'px';
            hellEl.appendChild(g);
            var a = Math.random() * Math.PI * 2, d = 80 + Math.random() * Math.min(window.innerWidth, window.innerHeight) * 0.5;
            g.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
                       { transform: 'translate(calc(-50% + ' + (Math.cos(a) * d).toFixed(0) + 'px), calc(-50% + ' + (Math.sin(a) * d * 0.7 + 60).toFixed(0) + 'px)) scale(.5)', opacity: 1, offset: 0.7 },
                       { transform: 'translate(calc(-50% + ' + (Math.cos(a) * d * 1.1).toFixed(0) + 'px), calc(-50% + ' + (Math.sin(a) * d * 0.7 + 260).toFixed(0) + 'px)) scale(.4)', opacity: 0 }],
                      { duration: 1300 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
        }
        setTimeout(function () { hellEl && hellEl.querySelectorAll('.hl-gib').forEach(function (n) { n.remove(); }); }, 2400);
        setTimeout(function () { if (hellEl) hellEl.classList.add('eye-gone'); }, 900);
        setTimeout(dropKey, 1700);
        return true;
    }
    // the key, at their feet (sky/resets.js catches dav:drop-key)
    function dropKey() {
        if (!hellEl || (S && S.get('key') === '1')) { if (hellEl) keyTaken(); return; }
        var me = hellEl.querySelector('.hl-me').getBoundingClientRect();
        document.dispatchEvent(new CustomEvent('dav:drop-key', { detail: { by: 'hell', x: me.right + 18, y: me.bottom - 4, z: 2147481300 } }));
    }
    function keyTaken() {
        if (!hellEl || hellEl.classList.contains('leaving')) return;
        hellEl.classList.add('leaving');
        setTimeout(function () { voice(AFTER_KEY, function () { quake(backFn); }, true); }, 1300);
    }
    document.addEventListener('dav:key-found', function () { if (hellEl) keyTaken(); });
    function quake(back) {
        var h = hellEl;
        if (!h) return;
        h.classList.add('eye-wide');
        setTimeout(function () {
            h.classList.add('quake');
            sfx('quake');
            sfx('rumble', { or: 'quake', delay: 0.3 });
        }, 500);
        setTimeout(function () { h.classList.add('eye-shut'); }, 2400);
        setTimeout(function () { h.classList.add('going'); if (music) music.set(0, 1.2); }, 2700);
        setTimeout(function () {
            h.removeEventListener('pointermove', eyeTrack);
            h.remove();
            hellEl = null;
            body.classList.remove('in-hell');
            if (Sky.noise && Sky.noise.hush) Sky.noise.hush(false, 'hell');
            if (Sky.music && Sky.music.hush) Sky.music.hush(false, 'hell');
            if (back) back();
        }, 3900);
    }

    /* ---------------- back in the attic: the white revolver, the book back on the shelf ---------------- */
    var giftEl = null;
    // where: the attic (after), or down there (host: the .hell), in front of the traveller
    function placeGift(coming, host) {
        if (giftEl) giftEl.remove();
        host = host || attic;
        if (!host) return;
        var me = host === attic ? attic.querySelector('.attic-character') : host.querySelector('.hl-me');
        var g = document.createElement('div');
        g.className = 'white-gift' + (coming ? ' coming' : '');
        g.setAttribute('role', 'button');
        g.tabIndex = 0;
        g.setAttribute('aria-label', 'pick up the white revolver');
        var I = Sky.inventory, art = I && I.art ? I.art('white-revolver') : '';
        g.innerHTML = art + '<span class="wg-hint">a white revolver</span>';
        Sky.findAsset('assets/items/white-revolver', function (u) { if (u) { var s = g.querySelector('svg, img'); if (s) s.outerHTML = '<img alt="" src="' + u + '">'; } });
        // in front of the traveller, on the boards
        var left = 44, bottom = null;
        if (me) {
            var ar = host.getBoundingClientRect(), mr = me.getBoundingClientRect();
            left = Math.min(88, (mr.right - ar.left) / (ar.width || 1) * 100 + 3);
            bottom = ar.bottom - mr.bottom;
        }
        g.style.left = left.toFixed(1) + '%';
        g.style.bottom = (bottom === null ? '14vh' : Math.max(0, bottom).toFixed(0) + 'px');
        if (host !== attic) g.classList.add('below');
        host.appendChild(g);
        giftEl = g;
        var take = function (e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            if (!Sky.inventory) return;
            Sky.inventory.add('white-revolver');
            set('white-revolver', 'taken');
            g.remove(); giftEl = null;
            if (host !== attic) hint();
        };
        g.addEventListener('click', take);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') take(e); });
    }
    function bookBack() {
        var b = document.querySelector('.shelf-book:not(.decoy)');
        if (!b || !b.classList.contains('missing')) return;
        b.classList.remove('missing');
        b.classList.add('back-again');
        setTimeout(function () { b.classList.remove('back-again'); }, 7500);
    }
    // the apparitions: back in their frames, to be shot again (any broken this visit before the pact)
    // (only before any's been counted: coming back up again later, say through the lectern, doesn't undo the ones shot since)
    function apparitionsBack() {
        if (shotOnes().length) return;
        if (Sky.revolver && Sky.revolver.mend) Sky.revolver.mend(function (wall, frame) { return wall === 'shame' && APPARITIONS.indexOf(frame) !== -1; });
    }
    function gift(me) {
        bookBack();
        apparitionsBack();
        if (Sky.records && Sky.records.reload) Sky.records.reload();       // (the inverted record's in the record player now)
        if (get('white-revolver') !== 'taken') {                           // (it's normally in their bag by now: taken down there)
            set('white-revolver', 'lying');
            placeGift(true);
            sfx('white-appear', { or: 'shimmer' });
        }
    }

    /* ---------------- its apparitions, counted ---------------- */
    function shotOnes() { try { return JSON.parse(get('apparitions') || '[]') || []; } catch (e) { return []; } }
    document.addEventListener('dav:painting-shot', function (e) {
        var f = e.detail && e.detail.frame;
        if (!R4 || get('grimoire-pact') !== '1' || !f || f.dataset.wall !== 'shame' || APPARITIONS.indexOf(f.dataset.frame) === -1) return;
        var l = shotOnes();
        if (l.indexOf(f.dataset.frame) !== -1) return;
        l.push(f.dataset.frame);
        set('apparitions', JSON.stringify(l));
        if (l.length < APPARITIONS.length) return;
        setTimeout(function () {
            Sky.speak(Sky.claubes && Sky.claubes.slain ? 'That was the last of the pictures. Only the false god left now.' : 'That was the last of the pictures. Now the little ones.');
        }, 1400);
    });

    /* ---------------- coming back to it later in the reset ---------------- */
    if (R4 && get('grimoire-pact') === '1') {
        if (get('white-revolver') === 'lying') placeGift(false);
        // the apparitions shot since the pact stay broken
        shotOnes().forEach(function (n) {
            var f = document.querySelector('.gallery-frame[data-wall=shame][data-frame="' + n + '"]');
            if (f) f.classList.add('shot');
        });
    }

    Sky.hell = { enter: enter, gift: gift, voice: voice, shootEye: shootEye, get open() { return !!hellEl; },
                 // (sky/attic.js: the pact's made but the key's still down there: the book pulls them back)
                 get owed() { return R4 && get('grimoire-pact') === '1' && !(S && S.get('key') === '1'); } };
})();

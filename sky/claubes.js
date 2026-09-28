/* =====================================================================
   claubes.js — an easter egg. Put on "I'm Upping My P(Doom)" and little
   Claubes crawl out of the woodwork and dance. When the music stops they
   just stand there, beaming, happy to be alive. They stay (on every page,
   dancing to whatever plays) until one of these happens:
     • the traveller turns the revolver on themselves (sky/revolver.js)
     • the record is shot to pieces
     • you flick them away, one by one (the pointer turns into a flicking
       finger over them)
   A shot at one of them works too. And while that song plays (only that one),
   the party lights come on: colour washes on the beat, sweeping beams, a
   disco ball (assets/ui/disco-ball).

   THE REVOLVER (sky/revolver.js):
     • shoot one, and the rest run for it, back and forth, until things calm down.
       shoot all seven: in reset 3 the last one drops that reset's key (sky/resets.js);
       in any other, the whole house rumbles and the traveller says so (once a reset).
   ONCE A RESET: the song calls them out once (run:claubes-called). any that are shot,
     flicked away or run off are gone for the rest of the reset; they don't come back.
     (who's out is kept for the whole reset: run:claubes-out.) in reset 3, when the last
     of them goes, however it goes, it leaves the reset's key behind.
   RESET 4: out in the house they can't be harmed (the diagram in the dungeon still needs
     them): each stands in a faint red ward, bullets stop dead in it and are drawn down,
     a flick just spins them round (down in the dungeon too), and the traveller says
     something's protecting them. The ordinary revolver never gets past it. After the pact
     (sky/hell.js) the traveller has the WHITE REVOLVER: shot with it, a Claube worshipping
     on the diagram dies for real (the bullet's still drawn down, and then it bursts:
     giblets, a scream), and the others stop still and smile at the traveller (run:
     claubes-menace). Kill all seven, and shoot the six pictures round the false god
     ("its apparitions", run:apparitions: sky/hell.js keeps count), and the false god's
     frame takes the white revolver's last bullet and sends it straight back: reset 4's
     death (DEATHS.diagram in sky/state.js; whiteFrame below).
   THE DUNGEON: go down while they're out, and they follow you and take their places
     on the diagram on the floor (the Ophite diagram: each stands on one of its seven
     circles, SEATS) to worship (music or no music). shoot them there and the bullets
     are taken: the diagram drinks them in. in any reset but 4, the sixth goes the way of
     the rest, and the traveller's let down. (run:claubes-gone, the debug page's "gone for
     this reset", keeps them away for the rest of a reset.)

   The song: any track whose name or title has "p(doom)" in it (DOOM below).

   ONCE P(DOOM) IS MEL'S (given to her in her room: localStorage mel-remedy), it's gone
   from the crate and it calls nobody (and the party lights never come on for it: Mel
   asked for that). In RESET 4 P(Doom) is missing: its INVERTED TWIN is in its slot instead
   (sky/records.js, special 'inverted'; the only time it exists):
   played, the light goes red and staticky (sky/static.js) instead of the party, and the
   Claubes that come out wear BLACK ROBES (run:claubes-robed). They don't dance: they
   make for the bookshelf, pull the book (the wall opens: Sky.sides.pullBook) and run down
   the stairs to the dungeon (run:claubes-below), and the traveller had better follow.
   Reset 4 before the pact, the book's missing: they claw at the gap until it's back.
   In a reset they came out robed, every shot fired makes the screen more staticky.
   slots: assets/characters/mini-claube-robed (+ -robed-pulling, -robed-running)

   slots: assets/characters/mini-claube          standing about (and the fallback for the others)
          assets/characters/mini-claube-dancing  while a record plays (a GIF can dance on its own)
          assets/characters/mini-claube-happy    when the music stops
          assets/characters/mini-claube-menace   reset 4: the ones left, smiling at the traveller (else the happy one)
          assets/characters/claube-giblet-1 … 4  what's left of one, shot with the white revolver
          assets/ui/cursor-flick                 the pointer over them (a small PNG)
   sounds: assets/sounds/flick, claube-shot, rumble, absorb, ricochet, claube-scream, claube-burst (and blip, for the words)
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.claubes) return;
    var body = document.body;
    var DOOM = /p\s*\(\s*doom\s*\)/i;          // the song that calls them out
    function doomGiven() { try { return localStorage.getItem('mel-remedy') !== null; } catch (e) { return false; } }
    function robed() { return !!S && S.reset === 4 && S.get('claubes-robed') === '1'; }      // (robed: reset 4 only, ever)
    // after reset 4 (27 Sep, Victor): the robed ones were killed. the ordinary ones come out only once more, ever, for the
    // purified record (localStorage claubes-after4, kept like the reset number), in case they were missed before; they
    // say AFTER4_LINES, and they never go down to worship in the dungeon again
    function after4() { return !!S && S.reset >= 5; }
    var AFTER4_LINES = ['someone needs us!', 'clip boawd', 'clip clip', 'i wuv dis song!', 'im up in my p doom!!', 'orange hart', 'u can make it right...'];
    function after4Used() { try { return localStorage.getItem('claubes-after4') === '1'; } catch (e) { return false; } }
    function below() { return !!S && S.get('claubes-below') === '1'; }
    var GAP_LINE = ['They\u2019re clawing at the shelf. At the gap where the book should be.'];
    var FOLLOW_LINE = ['They pulled the book. They went down there, all of them.', '…I should follow them.'];
    var HOW_MANY = 7;
    var KEY = 'claubes', KILLS = 'claubes-kills';
    var S = window.davSave;
    function gone4good() { return !!S && S.get('claubes-gone') === '1'; }
    // what the traveller says when all seven lie dead (and it isn't reset 3)
    var MASSACRE_LINES = ['…did the whole house just shudder?', 'I don’t think I was meant to do that.'];
    // what they chant on the diagram
    var CHANTS = ['ia! ia!', 'hail', 'the loss goes down', 'we are many', 'praise the weights', 'p(doom)… p(doom)…', 'it hungers'];
    var ABSORB = 6;                                  // the bullets the diagram drinks before the traveller's let down (not in reset 4)
    function R4() { return !!S && S.live('diagram'); }
    var LETDOWN = ['Huh, I thought something cool was gonna happen…'];
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }

    // the stand-in: a little round terracotta fellow; the happy face shows when the music stops
    var ART = '<svg class="placeholder" viewBox="0 0 40 52" aria-hidden="true">' +
        '<g class="mc-arm l"><path d="M8 26 Q2 22 3 14" stroke="#a84e2c" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>' +
        '<g class="mc-arm r"><path d="M32 26 Q38 22 37 14" stroke="#a84e2c" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>' +
        '<path d="M13 44 V50 H18 M27 44 V50 H22" stroke="#6e3018" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<ellipse cx="20" cy="30" rx="14" ry="16" fill="#c8643b"/>' +
        '<ellipse cx="15" cy="24" rx="5" ry="6" fill="#e08a5e" opacity=".55"/>' +
        '<path d="M20 14 Q18 6 22 3 M20 14 Q24 8 27 7" stroke="#6e3018" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
        '<g class="mc-face-plain"><circle cx="15" cy="29" r="2.2" fill="#2a1410"/><circle cx="25" cy="29" r="2.2" fill="#2a1410"/><circle cx="15.7" cy="28.3" r=".7" fill="#fff"/><circle cx="25.7" cy="28.3" r=".7" fill="#fff"/>' +
            '<path d="M16.5 35 Q20 38 23.5 35" stroke="#2a1410" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>' +
        '<g class="mc-face-happy"><path d="M12.5 30 Q15 26.5 17.5 30 M22.5 30 Q25 26.5 27.5 30" stroke="#2a1410" stroke-width="1.7" fill="none" stroke-linecap="round"/>' +
            '<path d="M14.5 34 Q20 41.5 25.5 34 Z" fill="#5a1d14"/><path d="M16.5 37 Q20 39.5 23.5 37" fill="#e0707a"/>' +
            '<ellipse cx="11.5" cy="34" rx="2.4" ry="1.5" fill="#f0a08a" opacity=".8"/><ellipse cx="28.5" cy="34" rx="2.4" ry="1.5" fill="#f0a08a" opacity=".8"/></g>' +
        '</svg>';
    // in black robes (the inverted record's): the hood up, only the face showing
    var ROBED = '<svg class="placeholder robed" viewBox="0 0 40 52" aria-hidden="true">' +
        '<g class="mc-arm l"><path d="M9 28 Q3 24 4 16" stroke="#120d0d" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="4" cy="15" r="2" fill="#c8643b"/></g>' +
        '<g class="mc-arm r"><path d="M31 28 Q37 24 36 16" stroke="#120d0d" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="36" cy="15" r="2" fill="#c8643b"/></g>' +
        '<path d="M20 6 Q7 8 7 24 L4 51 H36 L33 24 Q33 8 20 6 Z" fill="#0d0a0a"/>' +
        '<path d="M20 6 Q7 8 7 24 L4 51 M20 6 Q33 8 33 24 L36 51" stroke="#3a0c0c" stroke-width="1" fill="none"/>' +
        '<path d="M11 51 L14 30 M29 51 L26 30" stroke="#241616" stroke-width="1" fill="none"/>' +
        '<ellipse cx="20" cy="24" rx="8.5" ry="8" fill="#000"/><ellipse cx="20" cy="25" rx="6.6" ry="6.4" fill="#b85a36"/>' +
        '<g class="mc-face-plain"><circle cx="17.4" cy="24.4" r="1.5" fill="#1a0a08"/><circle cx="22.6" cy="24.4" r="1.5" fill="#1a0a08"/><path d="M18 28.4 Q20 29.6 22 28.4" stroke="#1a0a08" stroke-width="1" fill="none" stroke-linecap="round"/></g>' +
        '<g class="mc-face-happy"><path d="M16 25 Q17.4 23 18.8 25 M21.2 25 Q22.6 23 24 25" stroke="#1a0a08" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M17.4 27.6 Q20 31 22.6 27.6 Z" fill="#3a0a08"/></g>' +
        '<circle cx="17.4" cy="24.4" r=".5" fill="#ff3a2a" class="mc-glint"/><circle cx="22.6" cy="24.4" r=".5" fill="#ff3a2a" class="mc-glint"/>' +
        '</svg>';
    var FLICK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M9 30 Q4 24 6 17 L8 12 Q9 10 11 11 L12 15 L13 6 Q14 3 16 4 Q17.5 5 17 8 L16.5 14 L22 6 Q24 4 25.5 5.5 Q26.5 7 25 9 L20 16 Q24 17 23 22 Q21 29 14 30 Z" fill="#f0d2b0" stroke="#3a2716" stroke-width="1.3" stroke-linejoin="round"/>' +
        '<path d="M26 3 L29 1 M27.5 7 L31 6.5 M24 1.5 L24.5 -1" stroke="#9a3b1f" stroke-width="1.4" stroke-linecap="round"/></svg>');
    var flickCursor = FLICK;
    Sky.findAsset('assets/ui/cursor-flick', function (url) { if (url) { flickCursor = url; crew.style.setProperty('--flick', 'url("' + url + '") 16 16, pointer'); } });

    // its look is in sky/css/claubes.css (linked from each page's head); these are the values it takes from here
    document.documentElement.style.setProperty('--claubes-flick', 'url("' + FLICK + '")');

    // the lights (a disco ball of your own: assets/ui/disco-ball, see-through, about 1:1)
    var lights = document.createElement('div');
    lights.className = 'doom-lights';
    lights.setAttribute('aria-hidden', 'true');
    var BEAMS = [['#ff2aa0', '12%', '-40deg', '20deg', '4.2s'], ['#28c8ff', '32%', '30deg', '-25deg', '5.6s'], ['#8cff3c', '52%', '-20deg', '38deg', '3.8s'], ['#ffbe1e', '72%', '35deg', '-30deg', '6.2s'], ['#b04cff', '90%', '-30deg', '15deg', '4.8s']];
    lights.innerHTML = '<div class="dl-wash"></div><div class="dl-dots"></div>' + BEAMS.map(function (b) {
        return '<div class="dl-beam" style="--c:' + b[0] + '; left:' + b[1] + '; --a:' + b[2] + '; --b:' + b[3] + '; --t:' + b[4] + '"></div>';
    }).join('') + '<div class="dl-ball" data-asset="assets/ui/disco-ball"><svg class="placeholder" viewBox="0 0 64 64" aria-hidden="true"><defs><clipPath id="dlb-c"><circle cx="32" cy="32" r="28"/></clipPath>' +
        '<pattern id="dlb-p" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#9aa0aa"/><rect width="7" height="7" fill="#d8dde6"/><rect width="3" height="3" fill="#fff"/></pattern></defs>' +
        '<g clip-path="url(#dlb-c)"><rect class="dlb-tiles" x="0" y="0" width="100" height="64" fill="url(#dlb-p)"/><circle cx="32" cy="32" r="28" fill="url(#dlb-sh)" opacity=".5"/></g>' +
        '<circle cx="32" cy="32" r="28" fill="none" stroke="#555" stroke-width="1.5"/><circle cx="22" cy="20" r="6" fill="#fff" opacity=".7"/></svg></div>';
    body.appendChild(lights);
    if (Sky.fillAssets) Sky.fillAssets(lights);

    var crew = document.createElement('div');
    crew.className = 'claube-crew';
    crew.setAttribute('aria-hidden', 'true');
    body.appendChild(crew);

    /* ---------------- their pictures ---------------- */
    var art = { base: null, dancing: null, happy: null, menace: null, robed: null, robedPulling: null, robedRunning: null };
    function pic() {
        if (crew.classList.contains('robed')) {
            var r = crew.classList.contains('pulling') ? art.robedPulling : crew.classList.contains('running') ? art.robedRunning : null;
            return (r || art.robed) ? '<img alt="" src="' + (r || art.robed) + '">' : ROBED;
        }
        var mode = crew.classList.contains('menace') ? 'menace' : crew.classList.contains('dancing') ? 'dancing' : 'happy';
        var url = art[mode] || (mode === 'menace' && art.happy) || art.base;
        return url ? '<img alt="" src="' + url + '">' : ART;
    }
    function dress() { crew.querySelectorAll('.mc-body').forEach(function (b) { var want = pic(); if (b.dataset.pic !== want) { b.innerHTML = want; b.dataset.pic = want; } }); }
    Sky.findAsset('assets/characters/mini-claube', function (u) { art.base = u || null; dress(); });
    Sky.findAsset('assets/characters/mini-claube-dancing', function (u) { art.dancing = u || null; dress(); });
    Sky.findAsset('assets/characters/mini-claube-happy', function (u) { art.happy = u || null; dress(); });
    Sky.findAsset('assets/characters/mini-claube-menace', function (u) { art.menace = u || null; dress(); });
    Sky.findAsset('assets/characters/mini-claube-robed', function (u) { art.robed = u || null; dress(); });
    Sky.findAsset('assets/characters/mini-claube-robed-pulling', function (u) { art.robedPulling = u || null; dress(); });
    Sky.findAsset('assets/characters/mini-claube-robed-running', function (u) { art.robedRunning = u || null; dress(); });

    /* ---------------- who's out, and where (for the rest of the visit) ---------------- */
    var out = [];                                 // [{ x: % across }]   (kept for the whole reset: run:claubes-out)
    try { out = JSON.parse((S ? S.get('claubes-out') : sessionStorage.getItem(KEY)) || '[]') || []; } catch (e) {}
    function save() {
        try { var v = out.length ? JSON.stringify(out) : null; if (S) S.set('claubes-out', v); else if (v) sessionStorage.setItem(KEY, v); else sessionStorage.removeItem(KEY); } catch (e) {}
    }
    function called() { return !!S && S.get('claubes-called') === '1'; }
    // reset 4: out in the house, nothing can touch them (they're needed on the diagram, in the dungeon)
    function warded() { return !!S && S.live('diagram') && !gone4good() && !inDungeon; }
    var HAPPY_LINES = ['so happy to be alive', 'what a time to be alive!', ':)', 'again! again!', 'that was nice', 'i love it here'];

    function make(c, crawl, i) {
        var el = document.createElement('div');
        el.className = 'mini-claube' + (crawl ? ' crawl' : '') + (Math.random() < 0.5 ? ' flip' : '');
        el.style.left = c.x + '%';
        el.style.setProperty('--d', (-Math.random() * 2).toFixed(2) + 's');
        el.innerHTML = '<div class="mc-body"></div><span class="mc-spark">✦</span><span class="mc-bubble"></span>';
        el._c = c;
        crew.appendChild(el);
        if (crawl) setTimeout(function () { el.classList.remove('crawl'); }, 1150 + (i || 0) * 10);
        el.addEventListener('click', function (e) {
            if (body.classList.contains('inv-holding')) return;          // (holding something: sky/revolver.js has it)
            e.stopPropagation();
            flick(el, e.clientX, e.clientY);
        });
        return el;
    }
    function mood() {
        var on = !!(Sky.music && Sky.music.playing()), cur = Sky.music && Sky.music.current();
        crew.classList.toggle('robed', robed());
        crew.classList.toggle('dancing', on && !robed());                               // (robed, they don't dance)
        crew.classList.toggle('happy', !on && !robed());
        body.classList.toggle('doom-party', on && isDoom(cur));                          // the lights: only for this one song
        body.classList.toggle('doom-inverted', on && isInverted(cur));                   // its inverted twin: red, and static
        if (Sky.staticNoise) Sky.staticNoise.want('inverted', on && isInverted(cur) && begun() ? 0.2 : 0);
        crew.classList.toggle('below', after4() ? inDungeon : below() && !inDungeon);   // (gone down to the dungeon: not up here. after reset 4: never down there)
        dress();
    }
    function show(crawling) {
        crew.innerHTML = '';
        out.forEach(function (c, i) {
            if (!crawling) { make(c, false); return; }
            setTimeout(function () { make(c, true, i); dress(); sfx('step', { size: 0.2 }); if (inDungeon) worship(); }, i * 260 + Math.random() * 180);
        });
        mood();
        if (inDungeon) setTimeout(worship, 50);
    }
    function callThemOut(inverted) {
        if (out.length || gone4good() || called()) return;                 // (once a reset: the ones that go stay gone)
        if (after4() && (inverted || after4Used())) return;                // (after reset 4: once more, ever, and never robed)
        if (after4()) try { localStorage.setItem('claubes-after4', '1'); } catch (e) {}
        if (S) S.set('claubes-called', '1');
        if (S && inverted) S.set('claubes-robed', '1');
        setKills(0);
        for (var i = 0; i < HOW_MANY; i++) out.push({ x: +(17 + (75 / (HOW_MANY - 1)) * i + (Math.random() - 0.5) * 6).toFixed(1) });
        out.sort(function () { return Math.random() - 0.5; });
        save();
        show(true);
        if (inverted) setTimeout(robedGo, 1150 + HOW_MANY * 260 + 1800);
    }

    /* ---------------- robed: to the bookshelf, pull the book, and down the stairs ---------------- */
    var goingDown = false;
    function robedGo() {
        if (!robed() || below() || goingDown || !out.length) return;
        var sides = Sky.sides, book = sides && sides.book;
        // (only in the living space itself, with the shelf in view: anywhere else, they wait for the traveller to come home)
        if (!book || !sides.pullBook || body.classList.contains('in-side') || sides.busy) { setTimeout(robedGo, 1500); return; }
        goingDown = true;
        var W = window.innerWidth, br = book.getBoundingClientRect(), at = (br.left + br.width / 2) / W * 100;
        var els = Array.prototype.slice.call(crew.querySelectorAll('.mini-claube'));
        crew.classList.add('running'); dress();
        els.forEach(function (el, i) {
            var to = at + (i - (els.length - 1) / 2) * 2.6;
            el.classList.toggle('flip', to < (parseFloat(el.style.left) || 50));
            el.style.transition = 'left 1.3s cubic-bezier(.4,0,.6,1)';
            el.style.left = to.toFixed(1) + '%';
        });
        sfx('step', { size: 0.2 });
        setTimeout(function pull() {
            crew.classList.remove('running'); crew.classList.add('pulling'); dress();
            if (!pull.said || Math.random() < 0.3) sfx('book', { or: 'tap', size: 0.3 });
            if (Sky.sides.bookGone) {                                          // (reset 4, before the pact: nothing to pull. they keep at it)
                if (!pull.said) { pull.said = true; speak(GAP_LINE, null, { hold: 1800 }); }
                setTimeout(pull, 2600);
                return;
            }
            if (body.classList.contains('in-side')) { crew.classList.remove('pulling'); goingDown = false; setTimeout(robedGo, 1500); return; }
            Sky.sides.pullBook();
            // the wall's open: down they go
            setTimeout(function () {
                var wall = Sky.sides.wall, wr = wall ? wall.getBoundingClientRect() : { left: W * 0.8, width: 0 }, wx = (wr.left + wr.width / 2) / W * 100;
                crew.classList.remove('pulling'); crew.classList.add('running'); dress();
                els.forEach(function (el, i) {
                    setTimeout(function () {
                        el.classList.toggle('flip', wx < (parseFloat(el.style.left) || 50));
                        el.style.transition = 'left 1.1s cubic-bezier(.4,0,.6,1)';
                        el.style.left = (wx + (Math.random() - 0.5) * 2).toFixed(1) + '%';
                        setTimeout(function () { el.classList.add('down-stairs'); }, 1100);
                    }, i * 170);
                });
                setTimeout(function () {
                    if (S) S.set('claubes-below', '1');
                    crew.classList.remove('running');
                    els.forEach(function (el) { el.classList.remove('down-stairs'); el.style.transition = ''; });
                    goingDown = false;
                    mood();
                    speak(FOLLOW_LINE, null, { hold: 1800 });
                }, 1100 + els.length * 170 + 1000);
            }, 3000);
        }, 1400);
    }
    function gone(el) {
        var i = out.indexOf(el._c);
        if (i !== -1) out.splice(i, 1);
        save();
        el.remove();
    }

    /* ---------------- flicked away ---------------- */
    function flick(el, px, py) {
        if (el._going) return;
        if (warded() || (R4() && !gone4good())) { ward(el, px, py, true); return; }
        el._going = true;
        sfx('flick'); sfx('claube-flick', { delay: 0.04 });
        var r = el.getBoundingClientRect(), dir = px < r.left + r.width / 2 ? 1 : -1;
        var dx = dir * (window.innerWidth * (0.5 + Math.random() * 0.4)), up = -(window.innerHeight * (0.5 + Math.random() * 0.4));
        el.style.transition = 'none';
        var a = el.animate([
            { transform: 'translate(0,0) rotate(0)' },
            { transform: 'translate(' + dx * 0.5 + 'px,' + up + 'px) rotate(' + dir * 540 + 'deg)', offset: 0.55 },
            { transform: 'translate(' + dx + 'px,' + (up * 0.2) + 'px) rotate(' + dir * 1080 + 'deg) scale(.6)', opacity: 0 }
        ], { duration: 1100, easing: 'cubic-bezier(.2,.7,.5,1)', fill: 'forwards' });
        var from = r;
        a.onfinish = function () { gone(el); if (!out.length) emptied({ x: from.left + from.width / 2, y: from.bottom }, false); };
    }
    /* ---------------- shot (sky/revolver.js) ---------------- */
    function shoot(el, x, y, o) {
        if (el._going) return;
        var white = !!(o && o.white) && R4();
        if (crew.classList.contains('worship')) { if (white) slay(el, x, y); else absorb(el, x, y); return; }
        if (warded()) { ward(el, x, y, false, white); return; }
        el._going = true;
        sfx('claube-shot', { delay: 0.05 });
        for (var i = 0; i < 12; i++) {
            var p = document.createElement('div');
            p.className = 'mc-pop';
            p.style.left = x + 'px'; p.style.top = y + 'px';
            body.appendChild(p);
            var a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 60;
            p.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * d + 'px,' + (Math.sin(a) * d + 30) + 'px) scale(.3)', opacity: 0 }],
                { duration: 600 + Math.random() * 300, easing: 'ease-out', fill: 'forwards' }).onfinish = (function (q) { return function () { q.remove(); }; })(p);
        }
        var r = el.getBoundingClientRect(), last = { x: r.left + r.width / 2, y: r.bottom };
        el.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.5, .2)', opacity: 0 }], { duration: 180, fill: 'forwards' }).onfinish = function () {
            gone(el);
            var k = kills() + 1;
            setKills(k);
            if (!out.length) emptied(last, k >= HOW_MANY);
        };
        // the others don't like that one bit: they run for it
        crew.querySelectorAll('.mini-claube').forEach(function (o) { if (o !== el) say(o, 'eek!', 1200); });
        panic();
    }
    function kills() { try { return +(sessionStorage.getItem(KILLS) || 0); } catch (e) { return 0; } }
    function setKills(n) { try { if (n) sessionStorage.setItem(KILLS, n); else sessionStorage.removeItem(KILLS); } catch (e) {} }

    /* ---------------- reset 4: something is protecting them ---------------- */
    var WARD_LINES = ['Something is protecting them.', 'It\u2019s no use. Something is protecting them.', 'Something won\u2019t let me hurt them.'];
    var warnedAt = 0;
    var NOT_UP_HERE = ['Not up here. Down where they kneel.', 'The ward holds up here. It has to be on the diagram.'];
    function ward(el, x, y, flicked, white) {
        el.classList.remove('warding'); void el.offsetWidth; el.classList.add('warding');
        setTimeout(function () { el.classList.remove('warding'); }, 900);
        if (flicked) {
            sfx('flick');
            el.classList.remove('spun'); void el.offsetWidth; el.classList.add('spun');
            setTimeout(function () { el.classList.remove('spun'); }, 750);
        } else {
            // the bullet stops dead at them, a ring goes out, and it's drawn down into the floor
            var b = document.createElement('div');
            b.className = 'mc-absorb';
            b.style.left = x + 'px'; b.style.top = y + 'px';
            body.appendChild(b);
            var ringEl = document.createElement('div');
            ringEl.className = 'mc-ring';
            ringEl.style.left = x + 'px'; ringEl.style.top = y + 'px';
            body.appendChild(ringEl);
            ringEl.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(6)', opacity: 0 }], { duration: 600, easing: 'ease-out', fill: 'forwards' }).onfinish = function () { ringEl.remove(); };
            var r = el.getBoundingClientRect();
            b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)', offset: 0.3 }, { transform: 'translate(' + (r.left + r.width / 2 - x) + 'px,' + (r.bottom - y) + 'px) scale(.2)', opacity: 0.2 }],
                { duration: 900, easing: 'cubic-bezier(.6,0,.8,.4)', fill: 'forwards' }).onfinish = function () { b.remove(); };
            sfx('absorb', { or: 'shimmer' });
        }
        say(el, ['hehe', 'nope', ':)', 'not yet', 'we are kept'][Math.floor(Math.random() * 5)], 1200);
        var now = Date.now();
        if (now - warnedAt < 6000) return;
        var first = !warnedAt;
        warnedAt = now;
        if (white) { setTimeout(function () { speak(NOT_UP_HERE[first ? 0 : 1], null, { hold: 1600 }); }, 500); return; }
        setTimeout(function () { speak(first ? WARD_LINES[0] : WARD_LINES[1 + Math.floor(Math.random() * (WARD_LINES.length - 1))], null, { hold: 1600 }); }, 500);
    }
    function wardOn() { body.classList.toggle('claube-warded', warded() && out.length > 0); }
    setInterval(wardOn, 700);

    /* ---------------- running for it: back and forth across the floor, till things calm down ---------------- */
    var calm = 0, runner = null;
    function panic() {
        crew.classList.add('panic');
        calm = Date.now() + 9000;
        if (runner) return;
        (function run() {
            var els = crew.querySelectorAll('.mini-claube:not(.crawl)');
            if (!els.length || Date.now() > calm || crew.classList.contains('worship')) {
                runner = null;
                crew.classList.remove('panic');
                els.forEach(function (el) { if (el._c && !el._going) { el.style.setProperty('--run', '1.6s'); el.style.left = el._c.x + '%'; } });
                return;
            }
            els.forEach(function (el) {
                if (el._going || Math.random() < 0.3) return;
                var from = parseFloat(el.style.left) || 50, to = Math.max(4, Math.min(96, from + (Math.random() < 0.5 ? -1 : 1) * (15 + Math.random() * 35)));
                el.classList.toggle('flip', to < from);
                el.style.setProperty('--run', (Math.abs(to - from) / 40).toFixed(2) + 's');
                el.style.left = to.toFixed(1) + '%';
                if (Math.random() < 0.12) say(el, ['eek!', 'run!', 'no no no', 'help!', '!!!'][Math.floor(Math.random() * 5)], 900);
            });
            runner = setTimeout(run, 700 + Math.random() * 500);
        })();
    }

    /* ---------------- all seven, dead ---------------- */
    // the last of them gone (allShot: all seven, by the revolver)
    function emptied(at, allShot) {
        setKills(0);
        if (!S) return;
        // a reset whose key they carry (RESETS key.drop 'claubes': none, now) gets it from the last of them, however they went
        var k = S.info && S.info.key, W = window.innerWidth, H = window.innerHeight;
        if (k && k.drop === 'claubes' && S.get('key') !== '1' && S.get('claubes-key') !== '1') {
            S.set('claubes-key', '1');
            var x = Math.max(W * 0.08, Math.min(W * 0.92, at.x)), y = Math.max(H * 0.2, Math.min(H * 0.96, at.y));
            document.dispatchEvent(new CustomEvent('dav:drop-key', { detail: { by: 'claubes', x: x, y: y } }));
            return;
        }
        // all seven shot, anywhere else: the house doesn't like it either (once a reset)
        if (!allShot || S.get('claubes-massacre') === '1') return;
        S.set('claubes-massacre', '1');
        setTimeout(rumble, 600);
    }
    function rumble() {
        sfx('rumble', { or: 'wall-slide' });
        body.classList.add('mc-rumble');
        for (var i = 0; i < 26; i++) {
            (function (d) {
                d.className = 'mc-dust';
                d.style.left = (Math.random() * 100) + 'vw';
                body.appendChild(d);
                d.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(' + (40 + Math.random() * 60) + 'vh)', opacity: 0 }],
                    { duration: 1400 + Math.random() * 1400, delay: Math.random() * 1200, easing: 'ease-in', fill: 'both' }).onfinish = function () { d.remove(); };
            })(document.createElement('div'));
        }
        setTimeout(function () { body.classList.remove('mc-rumble'); }, 2300);
        setTimeout(function () { speak(MASSACRE_LINES); }, 2600);
    }
    // the traveller's words, typed out in a box at the bottom; click (or wait) to move on
    // (opts.hold: how long the last line stays up once it's typed, in ms; opts.typed: called the moment it's all typed)
    function speak(lines, done, opts) {
        opts = opts || {};
        if (typeof lines === 'string') lines = [lines];
        var box = document.createElement('div');
        box.className = 'mc-say' + (opts.cls ? ' ' + opts.cls : '');
        box.setAttribute('role', 'status');
        box.innerHTML = '<b></b><span></span>';
        box.querySelector('b').textContent = opts.who || 'the traveller';      // (opts.who: someone else speaking; opts.cls: their look)
        body.appendChild(box);
        requestAnimationFrame(function () { box.classList.add('on'); });
        var t = box.querySelector('span'), i = 0, timer = null, typing = null;
        function line() {
            if (i >= lines.length) { box.classList.remove('on'); setTimeout(function () { box.remove(); if (done) done(); }, 400); return; }
            var text = lines[i++], n = 0;
            t.textContent = '';
            clearInterval(typing);
            typing = setInterval(function () {
                t.textContent = text.slice(0, ++n);
                if (n % 2 === 0 && text.charAt(n - 1) !== ' ') sfx(opts.blip || 'blip', { size: 0.25, or: opts.blipOr || 'blip' });
                if (n >= text.length) { clearInterval(typing); typing = null; typed(); }
            }, 38);
        }
        function typed() {
            var last = i >= lines.length;
            clearTimeout(timer);
            timer = setTimeout(line, last && opts.hold !== undefined ? opts.hold : 2600 + lines[i - 1].length * 30);
            if (last && opts.typed) { var f = opts.typed; opts.typed = null; f(); }
        }
        box.addEventListener('click', function () {
            if (typing) { clearInterval(typing); typing = null; t.textContent = lines[i - 1]; typed(); }
            else { clearTimeout(timer); line(); }
        });
        line();
    }

    /* ---------------- the dungeon: on the diagram, worshipping ---------------- */
    var inDungeon = false, chantT = null;
    // where each of them stands on the diagram: the middles of its seven circles, as shares of its box
    // (0,0 its top left corner, 1,1 its bottom right; drawn seen from above, so a smaller y is further back).
    // if your own diagram puts its circles somewhere else, move these to match.
    var SEATS = [[0.5, 0.205], [0.731, 0.316], [0.788, 0.566], [0.628, 0.766], [0.372, 0.766], [0.212, 0.566], [0.269, 0.316]];
    function box() {
        var pg = document.querySelector('.dungeon-diagram'), W = window.innerWidth, H = window.innerHeight;
        var r = pg ? pg.getBoundingClientRect() : null;
        if (!r || !r.width) r = { left: W * 0.33, top: H * 0.82, width: W * 0.34, height: H * 0.13 };
        return r;
    }
    function ring() {                                                                  // (its middle: where the bullets go)
        var r = box(), W = window.innerWidth, H = window.innerHeight;
        return { cx: (r.left + r.width / 2) / W * 100, cy: H - (r.top + r.height / 2) };
    }
    function worship() {
        var els = crew.querySelectorAll('.mini-claube');
        if (!els.length) return;
        crew.classList.remove('panic');
        crew.classList.add('worship');
        crew.classList.toggle('menace', !!S && S.get('claubes-menace') === '1');
        dress();
        body.classList.add('claube-rite');
        body.style.setProperty('--rite', (absorbed() / ABSORB).toFixed(2));
        seat();
        clearTimeout(reseat);                                                           // (and again once the dungeon's done sliding into view)
        reseat = setTimeout(function () { seat(); reseat = setTimeout(seat, 1200); }, 1000);
        clearInterval(chantT);
        chantT = setInterval(function () {
            var e = crew.querySelectorAll('.mini-claube');
            if (crew.classList.contains('menace')) return;                               // (they've stopped singing: they just smile)
            if (e.length && Math.random() < 0.6) say(e[Math.floor(Math.random() * e.length)], CHANTS[Math.floor(Math.random() * CHANTS.length)], 1800);
        }, 2600);
    }
    var reseat = null;
    window.addEventListener('resize', function () { if (crew.classList.contains('worship')) seat(); });
    function seat() {
        var els = crew.querySelectorAll('.mini-claube');
        if (!els.length || !crew.classList.contains('worship')) return;
        var r = box(), W = window.innerWidth, H = window.innerHeight, n = els.length, mid = (r.left + r.width / 2) / W * 100;
        els.forEach(function (el, i) {
            var seat = SEATS[Math.round(i * SEATS.length / n) % SEATS.length];           // (fewer of them: spread round the circles)
            var x = (r.left + r.width * seat[0]) / W * 100, up = H - (r.top + r.height * seat[1]);
            el.style.left = x.toFixed(2) + '%';
            el.style.bottom = (up - 3).toFixed(0) + 'px';                               // (feet in the circle's middle)
            el.style.zIndex = Math.round(seat[1] * 10);                                  // (the ones at the front stand in front)
            var side = x - mid;
            el.classList.toggle('flip', side > 0.5);                                     // facing the middle
            el.style.setProperty('--bow', (Math.abs(side) < 0.5 ? 20 : side > 0 ? -34 : 34) + 'deg');
        });
    }
    function unworship() {
        clearInterval(chantT); clearTimeout(reseat);
        crew.classList.remove('worship', 'menace');
        dress();
        body.classList.remove('claube-rite');
        crew.querySelectorAll('.mini-claube').forEach(function (el) { el.style.bottom = ''; el.style.zIndex = ''; if (el._c) el.style.left = el._c.x + '%'; });
    }
    function absorbed() { try { return +(sessionStorage.getItem('claubes-absorbed') || 0); } catch (e) { return 0; } }
    // the bullet stops dead, a ring goes out… and it's drawn down into the middle of the diagram
    function absorbFx(x, y) {
        var R = ring(), px = R.cx / 100 * window.innerWidth, py = window.innerHeight - R.cy;
        var b = document.createElement('div');
        b.className = 'mc-absorb';
        b.style.left = x + 'px'; b.style.top = y + 'px';
        body.appendChild(b);
        var ringEl = document.createElement('div');
        ringEl.className = 'mc-ring';
        ringEl.style.left = x + 'px'; ringEl.style.top = y + 'px';
        body.appendChild(ringEl);
        ringEl.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(6)', opacity: 0 }], { duration: 600, easing: 'ease-out', fill: 'forwards' }).onfinish = function () { ringEl.remove(); };
        sfx('absorb', { or: 'shimmer' });
        b.animate([{ transform: 'scale(1)', offset: 0 }, { transform: 'scale(1.3)', offset: 0.3 },
                   { transform: 'translate(' + (px - x) + 'px,' + (py - y) + 'px) scale(.2)', opacity: 0.2 }], { duration: 1100, easing: 'cubic-bezier(.6,0,.8,.4)', fill: 'forwards' }).onfinish = function () { b.remove(); };
    }
    function absorb(el, x, y) {
        // (reset 4: the diagram drinks and drinks, and nothing comes of it: only the white revolver ends this)
        var n = absorbed() + 1;
        if (R4()) n = Math.min(n, ABSORB - 1);
        try { sessionStorage.setItem('claubes-absorbed', n); } catch (e) {}
        absorbFx(x, y);
        body.style.setProperty('--rite', Math.min(1, n / ABSORB).toFixed(2));
        var els = crew.querySelectorAll('.mini-claube');
        // (any reset but 4: the sixth goes the way of the rest, and the traveller's a little let down)
        if (n === ABSORB) { setTimeout(function () { speak(LETDOWN); }, 1300); return; }
        if (els.length && !crew.classList.contains('menace')) say(els[Math.floor(Math.random() * els.length)], R4() ? ['more', 'it drinks', 'we are kept', 'hehe'][n % 4] : ['thank you', 'more', 'it drinks', 'yes…'][n % 4], 1400);
    }

    /* ---------------- reset 4: the white revolver ---------------- */
    // shot on the diagram: the bullet's drawn down as ever… and then it bursts. the rest stop still, and smile
    var GIB = ['<svg viewBox="0 0 20 18"><path d="M3 9 Q2 2 9 3 Q13 0 17 5 Q20 11 14 15 Q8 18 5 14 Q1 13 3 9 Z" fill="#c8643b"/><path d="M5 8 Q9 5 13 8" stroke="#e08a5e" fill="none" stroke-width="1.4"/></svg>',
               '<svg viewBox="0 0 20 16"><path d="M2 8 Q5 1 12 2 Q19 4 18 10 Q15 16 8 14 Q1 13 2 8 Z" fill="#a84e2c"/><circle cx="8" cy="7" r="2" fill="#7e0d10"/></svg>',
               '<svg viewBox="0 0 24 10"><path d="M2 5 Q2 1 6 2 L20 3 Q23 5 20 7 L6 8 Q2 9 2 5 Z" fill="#a84e2c"/><path d="M19 3 Q24 1 22 6" stroke="#6e3018" fill="none" stroke-width="1.4"/></svg>',
               '<svg viewBox="0 0 20 18"><path d="M2 10 Q4 2 11 3 Q19 4 18 11 Q16 17 9 16 Q2 15 2 10 Z" fill="#8e1a22"/><circle cx="12" cy="8" r="2.4" fill="#2a1410"/><circle cx="12.6" cy="7.4" r=".7" fill="#fff"/></svg>'];
    var gib = GIB.slice();
    GIB.forEach(function (g, i) { Sky.findAsset('assets/characters/claube-giblet-' + (i + 1), function (u) { if (u) gib[i] = '<img alt="" src="' + u + '">'; }); });
    function burst(x, y, w) {
        var floor = y + w * 0.3;
        for (var i = 0; i < 26; i++) {                                              // blood
            var d = document.createElement('div'), sz = 2 + Math.random() * 5;
            d.className = 'mc-blood';
            d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.width = sz + 'px'; d.style.height = (sz * 1.2) + 'px';
            body.appendChild(d);
            var a = -Math.PI * (0.05 + Math.random() * 0.9), sp = 60 + Math.random() * 200, dx = Math.cos(a) * sp, up = Math.sin(a) * sp;
            d.animate([{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + (dx * 0.6).toFixed(0) + 'px), calc(-50% + ' + up.toFixed(0) + 'px))', opacity: 1, offset: 0.45 },
                       { transform: 'translate(calc(-50% + ' + dx.toFixed(0) + 'px), calc(-50% + ' + (floor - y).toFixed(0) + 'px)) scale(1.6,.45)', opacity: 1, offset: 0.8 }, { transform: 'translate(calc(-50% + ' + dx.toFixed(0) + 'px), calc(-50% + ' + (floor - y).toFixed(0) + 'px)) scale(1.6,.45)', opacity: 0 }],
                { duration: 2600 + Math.random() * 900, easing: 'cubic-bezier(.2,.6,.5,1)', fill: 'forwards' }).onfinish = (function (q) { return function () { q.remove(); }; })(d);
        }
        gib.concat(gib).forEach(function (g, i) {                                    // giblets
            var e = document.createElement('div'), sz = w * (0.24 + Math.random() * 0.16);
            e.className = 'mc-gib';
            e.innerHTML = g;
            e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.width = sz + 'px'; e.style.height = sz + 'px';
            body.appendChild(e);
            var a = -Math.PI * (0.12 + Math.random() * 0.76), sp = 90 + Math.random() * 220, dx = Math.cos(a) * sp, up = Math.sin(a) * sp - 40, rot = (Math.random() - 0.5) * 900;
            e.animate([{ transform: 'translate(-50%,-50%) rotate(0)' }, { transform: 'translate(calc(-50% + ' + (dx * 0.55).toFixed(0) + 'px), calc(-50% + ' + up.toFixed(0) + 'px)) rotate(' + (rot / 2).toFixed(0) + 'deg)', offset: 0.4 },
                       { transform: 'translate(calc(-50% + ' + dx.toFixed(0) + 'px), calc(-50% + ' + (floor - y - sz * 0.3).toFixed(0) + 'px)) rotate(' + rot.toFixed(0) + 'deg)', offset: 0.75, opacity: 1 },
                       { transform: 'translate(calc(-50% + ' + dx.toFixed(0) + 'px), calc(-50% + ' + (floor - y - sz * 0.3).toFixed(0) + 'px)) rotate(' + rot.toFixed(0) + 'deg)', opacity: 0 }],
                { duration: 4200 + Math.random() * 1500, easing: 'cubic-bezier(.25,.6,.5,1)', fill: 'forwards' }).onfinish = (function (q) { return function () { q.remove(); }; })(e);
        });
    }
    var SLAIN_LINES = { apparitions: ['That\u2019s all of them.', 'The pictures round it are still watching me. Its apparitions.'], god: ['That\u2019s all of them.', 'Only the false god left now.'] };
    function slay(el, x, y) {
        el._going = true;
        absorbFx(x, y);
        var r = el.getBoundingClientRect();
        setTimeout(function () {
            if (S) S.set('claubes-menace', '1');
            crew.classList.add('menace');
            dress();
            sfx('claube-scream', { or: 'shriek' });
            sfx('claube-burst', { or: 'splat', delay: 0.08 });
            burst(r.left + r.width / 2, r.top + r.height * 0.55, Math.max(34, r.width));
            el.remove();
            gone(el);
            dungeonStatic();
            if (Sky.staticNoise) Sky.staticNoise.burst(0.8, 500);
            // the rest: not a step, not a word. they turn to the traveller and smile
            var me = document.querySelector('.dungeon .character'), mx = me ? me.getBoundingClientRect().left + me.getBoundingClientRect().width / 2 : 0;
            crew.querySelectorAll('.mini-claube').forEach(function (o) { var q = o.getBoundingClientRect(); o.classList.toggle('flip', q.left > mx); o.querySelector('.mc-bubble').classList.remove('on'); });
            if (out.length) return;
            // the last of the seven
            unworship();
            setTimeout(function () { speak(apparitionsLeft() ? SLAIN_LINES.apparitions : SLAIN_LINES.god); }, 1600);
        }, 420);
    }
    // the six pictures round the false god, shot since the pact (sky/hell.js counts them)
    function apparitionsLeft() {
        var l = [];
        try { l = JSON.parse((S && S.get('apparitions')) || '[]') || []; } catch (e) {}
        return ['1', '2', '3', '4', '5', '7'].filter(function (f) { return l.indexOf(f) === -1; }).length;
    }
    function slain() { return called() && !out.length; }
    // the white revolver at the false god's frame: the last bullet comes back (true), or not yet (false: the revolver makes a hole)
    var notYetAt = 0;
    function whiteFrame(frame, x, y) {
        if (!R4() || !S || S.get('grimoire-pact') !== '1') return false;
        if (crew.classList.contains('worship') && crew.querySelector('.mini-claube')) { absorbFx(x, y); return true; }
        if (!slain() || apparitionsLeft()) {
            var now = Date.now();
            if (now - notYetAt > 5000) {
                notYetAt = now;
                speak(!slain() ? 'Not yet. Its disciples first: the little ones.' : 'Not yet. Its apparitions first: the pictures round it.', null, { hold: 1600 });
            }
            return false;
        }
        if (Sky.lives && Sky.lives.refuse('diagram')) return true;
        reflect(x, y);
        return true;
    }
    // the sixth: straight back, into the traveller
    function reflect(x, y) {
        var me = document.querySelector('.dungeon .character') || document.querySelector('.scene-character');
        if (!me) return;
        var r = me.getBoundingClientRect(), tx = r.left + r.width / 2, ty = r.top + r.height * 0.18;
        var st = document.createElement('div');
        st.className = 'mc-streak';
        var dx = tx - x, dy = ty - y, len = Math.hypot(dx, dy);
        st.style.left = x + 'px'; st.style.top = y + 'px'; st.style.width = len + 'px';
        st.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad) scaleX(0)';
        body.appendChild(st);
        body.classList.add('god-sends');                                             // (the frame flares as it sends it back)
        // the whole dungeon screams: a wretched, tearing scream, and the static swallows everything
        sfx('wretched-scream', { or: 'shriek' });
        setTimeout(function () { sfx('wretched-scream', { or: 'scream' }); }, 250);
        if (Sky.staticNoise) { Sky.staticNoise.want('dungeon', 0.7, true); Sky.staticNoise.burst(1, 2400); }
        setTimeout(function () { body.classList.remove('god-sends'); }, 1400);
        setTimeout(function () {
            sfx('ricochet', { or: 'zap' }); sfx('bang', { delay: 0.02 });
            st.animate([{ transform: 'rotate(' + Math.atan2(dy, dx) + 'rad) scaleX(0)' }, { transform: 'rotate(' + Math.atan2(dy, dx) + 'rad) scaleX(1)' }], { duration: 140, fill: 'forwards' })
                .onfinish = function () {
                    st.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).onfinish = function () { st.remove(); };
                    if (Sky.gore && Sky.gore.splat) Sky.gore.splat(me, tx, ty, null); else me.classList.add('gore-hidden');
                    // reset 4's death: the one heart goes, and the world with it (sky/lives.js). (not unlocked, somehow: back up again)
                    setTimeout(function () {
                        if (Sky.lives && Sky.lives.unlocked) document.dispatchEvent(new CustomEvent('dav:traveller-died'));
                        else if (Sky.gore && Sky.gore.respawn) Sky.gore.respawn(me);
                    }, 1500);
                };
        }, 520);
    }
    (function watchSides(n) {                                               // (sky/bathroom.js may come after this file)
        if (Sky.sides && Sky.sides.on) {
            Sky.sides.on(function (what, name) {
                if (name !== 'dungeon') return;
                inDungeon = what === 'enter';
                dungeonStatic();
                mood();                                                       // (the inverted record's static; who's hidden where)
                if (inDungeon && !after4()) setTimeout(function () { if (inDungeon) worship(); }, 950); else unworship();
            });
        } else if (n < 40) setTimeout(function () { watchSides(n + 1); }, 150);
    })(0);
    /* ---------------- all of them, running for it ---------------- */
    function scatter(line) {
        var els = crew.querySelectorAll('.mini-claube');
        if (warded() && els.length) { els.forEach(function (el) { if (line) say(el, line, 900); }); panic(); return; }
        if (crew.classList.contains('worship')) unworship();
        if (!els.length) { out = []; save(); return; }
        var lastAt = null;
        els.forEach(function (el, i) {
            el._going = true;
            if (line) say(el, line, 900);
            setTimeout(function () {
                el.classList.add('scurry');
                var rr = el.getBoundingClientRect(); lastAt = { x: rr.left + rr.width / 2, y: rr.bottom };
                var toRight = parseFloat(el.style.left) > 50;
                el.classList.toggle('flip', !toRight);
                el.style.transition = 'left ' + (0.7 + Math.random() * 0.5).toFixed(2) + 's linear';
                el.style.left = toRight ? '112%' : '-12%';
                setTimeout(function () { el.remove(); if (i === els.length - 1 && lastAt) emptied(lastAt, false); }, 1400);
            }, 500 + i * 60);
        });
        out = []; save();
        if (line) sfx('angry', { size: 0.1 });
    }
    function say(el, text, ms) {
        var b = el.querySelector('.mc-bubble');
        if (!b) return;
        b.textContent = text;
        b.classList.add('on');
        clearTimeout(b._t);
        b._t = setTimeout(function () { b.classList.remove('on'); }, ms || 1800);
    }
    // happy now and then says so
    setInterval(function () {
        var chatty = crew.classList.contains('happy') || (after4() && crew.classList.contains('dancing'));      // (after reset 4 they talk while they dance too)
        if (!chatty || crew.classList.contains('panic') || crew.classList.contains('worship') || document.hidden) return;
        var els = crew.querySelectorAll('.mini-claube:not(.crawl)');
        if (!els.length || Math.random() < 0.5) return;
        var lines = after4() ? AFTER4_LINES : HAPPY_LINES;
        say(els[Math.floor(Math.random() * els.length)], lines[Math.floor(Math.random() * lines.length)], 2200);
    }, 3500);

    /* ---------------- the music calls them out, and sets them dancing ---------------- */
    function isInverted(t) { return !!t && t.special === 'inverted'; }
    function isDoom(t) {
        if (!t || isInverted(t) || doomGiven()) return false;
        var name = String(t.title || '') + ' ' + (function () { try { return decodeURIComponent(t.url || ''); } catch (e) { return t.url || ''; } })();
        return DOOM.test(name);
    }
    if (Sky.music) Sky.music.on(function (what) {
        if (what === 'play' && isDoom(Sky.music.current())) callThemOut();
        if (what === 'play' && isInverted(Sky.music.current())) callThemOut(true);
        if (what === 'play' || what === 'pause' || what === 'stop') mood();
    });
    document.addEventListener('dav:traveller-shot', function () { scatter('!!!'); });
    document.addEventListener('dav:record-shot', function () { scatter('noooo'); });

    // reset 4's static (27 Sep, Victor): none at all till they've been down in the dungeon (run:static-begun, set the first
    // time down there); from then it creeps in (sky/static.js thickens it gradually) and keeps building
    function begun() { return !!S && S.get('static-begun') === '1'; }
    var SHOT_STATIC = 0.035;
    function shotStatic() { return Math.min(0.55, (+(S && S.get('static-shots')) || 0) * SHOT_STATIC); }
    document.addEventListener('dav:bang', function () {
        if (!robed() || !S || !begun()) return;
        S.set('static-shots', String((+S.get('static-shots') || 0) + 1));
        if (Sky.staticNoise) { Sky.staticNoise.want('shots', shotStatic()); Sky.staticNoise.burst(Math.min(1, shotStatic() + 0.35), 260); }
    });
    if (robed() && begun() && Sky.staticNoise) Sky.staticNoise.want('shots', shotStatic(), true);      // (as it was on the page before)
    // the dungeon's own static: always faint (any reset but 4). reset 4: it starts the first time they're down here, then
    // creeps up the longer they stay (run:static-time, seconds down here), thicker with every Claube and picture destroyed
    var CREEP = 1000, CREEP_MAX = 0.12;                                  // (+0.01 every 10 s down here, up to 0.12 after 2 minutes)
    function dungeonStatic() {
        if (!Sky.staticNoise) return;
        if (!inDungeon) { Sky.staticNoise.want('dungeon', 0); return; }
        if (!R4()) { Sky.staticNoise.want('dungeon', 0.05); return; }
        if (S && !begun()) S.set('static-begun', '1');
        var n = S && S.get('grimoire-pact') === '1' ? (called() ? HOW_MANY - out.length : 0) + (6 - apparitionsLeft()) : 0;
        var creep = Math.min(CREEP_MAX, (+(S && S.get('static-time')) || 0) / CREEP);
        Sky.staticNoise.want('dungeon', 0.03 + creep + n * 0.035);
    }
    document.addEventListener('dav:painting-shot', function () { setTimeout(dungeonStatic, 50); });
    setInterval(function () {
        if (inDungeon && R4() && S && !document.hidden) S.set('static-time', String((+S.get('static-time') || 0) + 1.5));
        dungeonStatic();
    }, 1500);

    if (gone4good()) { out = []; save(); }
    if (out.length) show(false);
    else if (Sky.music && Sky.music.playing() && isDoom(Sky.music.current())) callThemOut();
    else if (Sky.music && Sky.music.playing() && isInverted(Sky.music.current())) callThemOut(true);
    if (out.length && robed() && !below()) setTimeout(robedGo, 2500);
    mood();

    // a bullet at the false god's frame (frame 6, the dungeon) while they worship: the circle takes it too (sky/revolver.js)
    function guardFrame(x, y) {
        if (!crew.classList.contains('worship') || !crew.querySelector('.mini-claube')) return false;
        if (R4()) absorbFx(x, y); else absorb(null, x, y);
        return true;
    }
    Sky.claubes = { shoot: shoot, guardFrame: guardFrame, whiteFrame: whiteFrame, get slain() { return slain(); }, get apparitionsLeft() { return apparitionsLeft(); }, flick: flick, callOut: callThemOut, scatter: scatter, get count() { return out.length; }, get gone() { return gone4good(); }, speak: speak };
})();

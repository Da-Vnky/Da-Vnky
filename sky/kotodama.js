/* =====================================================================
   kotodama.js — the little companion in the house (living.html): a small
   word-spirit that bounces along the floor after the traveller, room to
   room, thinks its little thoughts out loud in a bubble of pictures, and
   babbles to you about them in a voice of its own (sky/babble.js).

     which one    una, the sugar drop (voiced by your own Vocaloid sheet).
                  how it looks and its ways (how high it hops, how chatty
                  it is, how curious): sky/kotodama-look.js, and the asset
                  manager's companion tab, which can change them. (21 Oct:
                  the five others, a different one each day, and sunday's
                  one-in-every-room, were taken out: too much.)
     its body     drawn (sky/kotodama-look.js) until yours is in. slots (assets/characters/,
                  all on one square canvas, so they stack exactly; facing
                  right, its bottom on the canvas's bottom edge):
                    kotodama-<kind>          its body, no face
                    kotodama-<kind>-moving   the same, an animated loop (ears,
                                             wings, a swishing tail; keep the body
                                             itself still: the code does the hopping)
                    kotodama-<kind>-face     its everyday face, where its face sits
                    kotodama-<kind>-face-<how>  happy, curious, thinking, idea,
                                             puzzled, sleepy, startled, scared, giggle
                    kotodama-<kind>-face-talking  its mouth open (flashed per syllable)
                    kotodama-<kind>-face-blink    eyes shut for a blink
     how it moves every move is a hop: a crouch, a spring up (stretched),
                  an arc, a landing that squashes it and wobbles like jelly.
                  it keeps near the traveller, follows them through every door
                  (but stays inside when they go out into the garden, and is
                  glad when they're back), wanders off to look at things.
     its thoughts a thought cloud over its head, the "…" first, then little
                  pictures (assets/characters/kotodama-idea-<name>, drawn ink
                  sketches until yours): the record player gets a note, the cat
                  a heart, the fridge a pie, the dungeon an eye and a ghost (it
                  doesn't like it down there). then what it makes of the thought:
                  a lightbulb and an excited babble about it, a puzzled "?", a
                  happy little hop, a yawn.
     its voice    gibberish, one syllable at a time, each one bobbing it and
                  opening its mouth, typed into a speech bubble as it's said.
                  a question goes up at the end, an exclamation tumbles down.
     you          poke its body: it jumps, then giggles (poke it a lot and it
                  sulks). pat its head: hearts. at night, idle, it dozes off.
                  while a record plays it bops along. it sometimes thinks about
                  where the key is, when you've been stuck in the right room a
                  while (HINTS below).

   its look: sky/css/kotodama.css. its drawing, parts and colours: sky/kotodama-look.js.
   its voice: sky/babble.js
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || !Sky.house || !Sky.babble || !Sky.kotodamaLook || Sky.kotodama) return;
    var body = document.body, root = document.documentElement;
    var MAPPING = root.classList.contains('dav-map');
    var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    var still = matchMedia('(prefers-reduced-motion: reduce)');
    var LOOK = Sky.kotodamaLook;

    var HINTS = true;                 // it thinks about the key, now and then, when you've been stuck in its room a while
    var SAVED = null;                 // the asset manager's tweaks (assets/characters/kotodama-looks.json), once read

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function chance(p) { return Math.random() < p; }
    function now() { return performance.now(); }

    // a kind's whole look and ways: the defaults in sky/kotodama-look.js, with the asset manager's tweaks over them
    function spec(kind) { return LOOK.spec(kind, SAVED); }
    var FACES = LOOK.faces;


    /* ======================================================================
       the little pictures it thinks in (48 x 48 ink sketches) and the marks that puff out of it
       ====================================================================== */
    var INK = '#3b2a1a';
    function sk(inner) { return '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</g></svg>'; }
    var IDEAS = {
        star:    '<path d="M24 6 L29 18 L42 19 L32 28 L35 41 L24 34 L13 41 L16 28 L6 19 L19 18 Z" fill="#f2cf63"/>',
        heart:   '<path d="M24 40 C10 30 4 22 8 14 C12 7 21 8 24 15 C27 8 36 7 40 14 C44 22 38 30 24 40 Z" fill="#e8687f"/>',
        note:    '<path d="M18 34 V12 L36 8 V30"/><ellipse cx="13.5" cy="34.5" rx="5" ry="4" fill="' + INK + '"/><ellipse cx="31.5" cy="30.5" rx="5" ry="4" fill="' + INK + '"/>',
        sun:     '<circle cx="24" cy="24" r="8.5" fill="#f5c451"/><path d="M24 5 V10 M24 38 V43 M5 24 H10 M38 24 H43 M10.5 10.5 L14 14 M34 34 L37.5 37.5 M37.5 10.5 L34 14 M14 34 L10.5 37.5"/>',
        moon:    '<path d="M30 7 A17 17 0 1 0 40 33 A13 13 0 1 1 30 7 Z" fill="#efe2a8"/><circle cx="20" cy="22" r="1.6" fill="' + INK + '" stroke="none"/>',
        cloud:   '<path d="M12 33 C5 33 5 23 12.5 22.5 C13 14 24 12 27.5 19 C31.5 14 40.5 17 38.5 24.5 C44.5 25.5 43.5 33 37 33 Z" fill="#f4f1ea"/>',
        rain:    '<path d="M12 26 C6 26 6 18 12.5 17.5 C13 10 23 8.5 26 14.5 C29.5 10.5 38 13 36.5 19 C41.5 20 40.5 26 35 26 Z" fill="#dfe4e8"/><path d="M15 32 L13 38 M24 32 L22 40 M33 32 L31 38" stroke="#5b86b0"/>',
        pie:     '<path d="M14 14 C12 10 16 9 14 5 M24 13 C22 9 26 8 24 4 M34 14 C32 10 36 9 34 5" stroke-width="1.6" opacity=".7"/><path d="M6 27 H42 L38 37 H10 Z" fill="#c4863e"/><path d="M6 27 C10 16 38 16 42 27 Z" fill="#e8b765"/><path d="M16 22 L18 25 M24 20 L24 24 M32 22 L30 25" stroke-width="1.6"/>',
        cup:     '<path d="M18 13 C16 9 20 8 18 4 M26 13 C24 9 28 8 26 4" stroke-width="1.6" opacity=".7"/><path d="M11 17 H33 V33 C33 38 29 41 22 41 C15 41 11 38 11 33 Z" fill="#e9e3d6"/><path d="M33 21 C41 21 41 32 33 32"/>',
        flame:   '<path d="M24 5 C30 15 37 20 35 30 C33 38 28 42 24 42 C20 42 13 38 13 30 C13 22 22 18 24 5 Z" fill="#f39a3c"/><path d="M24 22 C27 28 29.5 31 28.5 35 C27.5 38.5 20.5 38.5 19.5 35 C18.5 31 22 28 24 22 Z" fill="#ffd76a" stroke="none"/>',
        fish:    '<path d="M7 24 C15 12 31 12 37 24 C31 36 15 36 7 24 Z" fill="#8fb8d8"/><path d="M37 24 L45 16 L45 32 Z" fill="#8fb8d8"/><circle cx="15" cy="22" r="1.6" fill="' + INK + '"/>',
        bottle:  '<path d="M20 9 H28 V15 C33.5 18 36 22 36 28 V40 C36 43 34 44 32 44 H16 C14 44 12 43 12 40 V28 C12 22 14.5 18 20 15 Z" fill="#a9cfc2"/><rect x="19" y="4" width="10" height="6" rx="1.5" fill="#9a6b3c"/><path d="M18 30 H30 V37 H18 Z" fill="#f1e6cc"/>',
        letter:  '<rect x="5" y="12" width="38" height="25" rx="2" fill="#f1e6cc"/><path d="M5 14 L24 28 L43 14"/><circle cx="24" cy="29" r="3.6" fill="#b8423a" stroke="none"/>',
        book:    '<path d="M24 14 C18 10 10 10 5 12 V38 C10 36 18 36 24 40 C30 36 38 36 43 38 V12 C38 10 30 10 24 14 Z" fill="#efe4c8"/><path d="M24 14 V40 M10 18 H19 M10 23 H19 M29 18 H38 M29 23 H38" stroke-width="1.5"/>',
        cat:     '<path d="M10 19 L13 6 L20.5 14 H27.5 L35 6 L38 19 C42 31 34 41 24 41 C14 41 6 31 10 19 Z" fill="#3a3530"/><circle cx="18" cy="24" r="2.4" fill="#f2c94c" stroke="none"/><circle cx="30" cy="24" r="2.4" fill="#f2c94c" stroke="none"/>',
        bird:    '<path d="M7 27 C13 18 26 18 32 24 L42 21 L36 28 C32 36 16 36 7 27 Z" fill="#40434a"/><path d="M15 26 C19 22 24 23 26 27" stroke="#9aa3ad"/><circle cx="30" cy="25" r="1.2" fill="#fff" stroke="none"/>',
        flower:  '<path d="M24 26 V44" stroke="#4a7a48"/><path d="M24 36 C30 32 34 34 36 30" stroke="#4a7a48"/>' + [0, 72, 144, 216, 288].map(function (a) { return '<ellipse cx="24" cy="13" rx="5" ry="7" transform="rotate(' + a + ' 24 20)" fill="#f2a6c0"/>'; }).join('') + '<circle cx="24" cy="20" r="4" fill="#f2cf63"/>',
        bubbles: '<circle cx="16" cy="28" r="10" fill="rgba(190,225,240,.6)"/><circle cx="32" cy="16" r="7" fill="rgba(190,225,240,.6)"/><circle cx="34" cy="36" r="4.5" fill="rgba(190,225,240,.6)"/><path d="M11 23 Q13 20 16 20 M29 12 Q30.5 10.5 32.5 10.5" stroke="#fff" stroke-width="2"/>',
        duck:    '<path d="M9 30 C9 23 19 22 23 26 C23 14 37 12 39 22 C39 26 37 28 35 28 C40 30 40 40 28 40 H17 C11 40 9 36 9 30 Z" fill="#f6d34a"/><path d="M39 21 L46 23 L39 25.5 Z" fill="#f08a2a"/><circle cx="33" cy="20" r="1.6" fill="' + INK + '"/>',
        key:     '<circle cx="14" cy="24" r="8" fill="#d9b45a"/><circle cx="14" cy="24" r="3" fill="#f4efe4"/><path d="M22 24 H43 M37 24 V31 M42 24 V29"/>',
        eye:     '<path d="M4 24 C14 10 34 10 44 24 C34 38 14 38 4 24 Z" fill="#f4efe4"/><circle cx="24" cy="24" r="7.5" fill="#7a3a8a"/><circle cx="24" cy="24" r="3" fill="' + INK + '"/>',
        ghost:   '<path d="M12 41 V20 C12 9 36 9 36 20 V41 L32 37 L28 41 L24 37 L20 41 L16 37 Z" fill="#f2f0ec"/><ellipse cx="19.5" cy="22" rx="2.2" ry="3" fill="' + INK + '"/><ellipse cx="28.5" cy="22" rx="2.2" ry="3" fill="' + INK + '"/>',
        hat:     '<path d="M13 27 C13 11 35 11 35 27 Z" fill="#4a3220"/><ellipse cx="24" cy="28.5" rx="21" ry="5" fill="#3d2a1c"/><path d="M14 23 H34" stroke="#b8423a" stroke-width="2.6"/>',
        zzz:     '<path d="M8 14 H20 L8 28 H20 M24 22 H32 L24 31 H32 M35 30 H41 L35 37 H41" stroke-width="2.6"/>',
        clock:   '<circle cx="24" cy="25" r="16" fill="#f4efe4"/><path d="M24 25 V15 M24 25 L31 29"/><path d="M14 7 L9 12 M34 7 L39 12"/>',
        brush:   '<path d="M38 8 L22 28" stroke-width="4" stroke="#8a5a2b"/><path d="M22 28 L18 32" stroke-width="5" stroke="#b8b0a0"/><path d="M18 32 C12 34 10 40 6 42 C12 43 19 41 20 34 Z" fill="#c75b4a"/>',
        bulb:    '<path d="M24 7 C15 7 11 14 11 20 C11 27 17 30 18 35 H30 C31 30 37 27 37 20 C37 14 33 7 24 7 Z" fill="#fff2a8"/><path d="M18.5 38.5 H29.5 M20 42 H28 M21 22 L24 27 L27 22"/><path d="M5 18 H2 M46 18 H43 M9 6 L7 4 M39 6 L41 4" stroke="#e0a82a"/>',
        house:   '<path d="M7 24 L24 9 L41 24" /><path d="M11 21 V40 H37 V21" fill="#efe4c8"/><rect x="20" y="28" width="8" height="12" fill="#8a5a2b"/>',
        question:'<path d="M17 16 C17 9 31 8 31 16 C31 22 24 22 24 29" stroke-width="3.6"/><circle cx="24" cy="37" r="2.4" fill="' + INK + '"/>',
        exclaim: '<path d="M24 8 V28" stroke-width="4.2"/><circle cx="24" cy="37" r="2.8" fill="' + INK + '"/>',
        spark:   '<path d="M24 4 L28 20 L44 24 L28 28 L24 44 L20 28 L4 24 L20 20 Z" fill="#fff4b8"/>',
        sweat:   '<path d="M24 6 C30 16 36 22 36 30 C36 37 30 42 24 42 C18 42 12 37 12 30 C12 22 18 16 24 6 Z" fill="#a8dcf5"/><path d="M18 30 C18 26 20 24 22 23" stroke="#fff" stroke-width="2"/>',
        vein:    '<g stroke="#d6334a" stroke-width="3.4"><path d="M10 18 C16 18 18 16 18 10 M38 18 C32 18 30 16 30 10 M10 30 C16 30 18 32 18 38 M38 30 C32 30 30 32 30 38"/></g>'
    };
    function sketch(name) { return sk(IDEAS[name] || IDEAS.question); }

    // what it thinks about in each room: [where, what it thinks of …]. 'sky' = the sun by day, the moon by night
    var ROOM_THOUGHTS = {
        living:  [['.turntable', 'note', 'heart'], ['.groove.cat', 'cat', 'heart'], ['.groove.plant', 'flower', 'sun'], ['.bottle-crate', 'bottle', 'letter'],
                  ['.armchair', 'zzz'], ['.shelf', 'book', 'star'], ['.window', 'sky', 'cloud'], ['.pinboard', 'letter', 'heart']],
        bath:    [['.bath-tub', 'bubbles', 'duck'], ['.bath-mirror', 'star', 'heart'], ['.bath-sink', 'bubbles', 'fish'], ['.bath-towel', 'cloud', 'zzz']],
        hall:    [['.hall-door.to-workshop', 'brush', 'star'], ['.hall-door.to-roof', 'moon', 'star'], ['.hall-hooks', 'hat', 'rain'], ['.hall-cord', 'bulb', 'question']],
        kitchen: [['.kitchen-fridge', 'pie', 'heart'], ['.kitchen-stove', 'cup', 'flame'], ['.kitchen-microwave', 'clock', 'question'], ['.kitchen-bowl', 'fish', 'question']],
        attic:   [['.attic-rocking-horse', 'star', 'heart'], ['.attic-music-box', 'note', 'moon'], ['.attic-hole', 'house', 'question']],
        dungeon: [['.dungeon-diagram', 'eye', 'ghost'], ['.candle.k1', 'flame', 'ghost'], ['.dungeon-paper', 'letter', 'question'], ['.dungeon-stairs', 'sun', 'house']],
        porch:   [['.porch-chair', 'zzz', 'moon'], ['.porch-mailbox', 'letter', 'question'], ['.porch-gnome', 'hat', 'question'], ['.porch-steps', 'flower', 'bird'], ['.porch-chimes', 'note']]
    };
    // and things it thinks about anywhere
    var IDLE_THOUGHTS = [['hat', 'heart'], ['star'], ['pie'], ['note'], ['sky'], ['cloud', 'rain'], ['fish'], ['bubbles'], ['flower'], ['heart'], ['cat'], ['letter']];
    // the key, for HINTS: in which reset, which room, near what, and what it thinks
    var HINT = {
        3: { room: 'kitchen', near: '.kitchen-fridge', ideas: ['key', 'pie'] },
        5: { room: 'living', near: '.wall-peel', ideas: ['key', 'question'] },
        6: { room: 'hall', near: '.watcher.still', ideas: ['eye', 'key'] },
        7: { room: 'kitchen', near: '.kitchen-microwave', ideas: ['key', 'clock'] },
        8: { room: 'kitchen', near: '.kitchen-serpent', ideas: ['pie', 'bulb'] }
    };

    /* ======================================================================
       the rooms it can be in (each one's own element), and the floor in each
       ====================================================================== */
    var ROOMS = {
        living:  { host: '.room',     floor: '1.8vh' },
        bath:    { host: '.bathroom', floor: '1.8vh' },
        hall:    { host: '.hallway',  floor: '1.8vh' },
        kitchen: { host: '.kitchen',  floor: '1.8vh' },
        attic:   { host: '.attic',    floor: '1.8vh' },
        dungeon: { host: '.dungeon',  floor: '6.6vh', scared: true, z: 5 },     // (over the dark, so its bubbles can be read: its body's dimmed instead)
        porch:   { host: '.porch',    floor: '1.8vh' }
    };
    // things it never stops on (it can hop over them): the way out of each room
    var KEEP_CLEAR = '.room-arrow, .attic-hole, .porch-steps, .hall-out';


    /* ======================================================================
       the companion (its kind: una). everything from here to the end of Companion is its own
       ====================================================================== */
    var made = 0;
    function Companion(kind) {
        /* ======================================================================
           building it
           ====================================================================== */
        var me = {
            kind: kind, K: spec(kind), room: null, host: null, trav: null, uid: 'k' + (++made),
            awake: false, placed: false,
            x: 50, h: 0, vx: 0, vh: 0, s: 0, sv: 0, facing: 1, tilt: 0,
            target: null, nextHop: 0, crouch: 0, flying: false, size: 100,
            face: 'calm', mood: 'calm', asleep: false, away: false,
            act: null, idleUntil: 0, lastTalk: 0, enteredAt: 0, lastHint: 0, pokes: [], greet: false
        };
        var home = document.createElement('div');
        home.className = 'kd-home';
        home.innerHTML =
            '<div class="kd-shadow"></div>' +
            '<div class="kd-hop"><div class="kd-squash"><div class="kd-breathe">' +
                '<div class="kd-art"><img class="kd-img kd-body-img" alt=""><img class="kd-img kd-face-img" alt=""><img class="kd-img kd-talk-img" alt=""><img class="kd-img kd-blink-img" alt=""></div>' +
                '<div class="kd-fx"></div>' +
            '</div></div><button type="button" class="kd-hit"></button></div>' +
            '<div class="kd-think" aria-hidden="true"><div class="kd-cloud"><span class="kd-dots"><i></i><i></i><i></i></span><span class="kd-ideas"></span></div><i class="kd-puff p1"></i><i class="kd-puff p2"></i></div>' +
            '<div class="kd-say" aria-live="polite"><span class="kd-say-ic"></span><span class="kd-words"></span></div>';
        var Q = function (s) { return home.querySelector(s); };
        var hopEl = Q('.kd-hop'), squashEl = Q('.kd-squash'), art = Q('.kd-art'), shadow = Q('.kd-shadow'), fx = Q('.kd-fx');
        var thinkEl = Q('.kd-think'), ideasEl = Q('.kd-ideas'), sayEl = Q('.kd-say'), wordsEl = Q('.kd-words'), sayIc = Q('.kd-say-ic'), hit = Q('.kd-hit');
        var bodyImg = Q('.kd-body-img'), faceImg = Q('.kd-face-img'), talkImg = Q('.kd-talk-img'), blinkImg = Q('.kd-blink-img');

        // dress it as a kind: the drawn one, then the artist's pictures as they're found
        var faceArt = {}, dressedAs = '';
        function dress(kind) {
            me.kind = kind; me.K = spec(kind);
            dressedAs = kind;
            home.dataset.kind = kind;
            home.style.setProperty('--kd-scale', me.K.scale);
            home.style.setProperty('--kd-glow', me.K.c.glow);
            hit.setAttribute('aria-label', me.K.name + ', the little companion: poke it, or pat its head');
            var old = art.querySelector('.kd-drawn');
            if (old) old.remove();
            art.insertAdjacentHTML('afterbegin', LOOK.svg(me.K, me.uid));
            art.classList.remove('has-art', 'has-face', 'has-talk', 'has-blink');
            art.setAttribute('data-slot', 'assets/characters/kotodama-' + kind);
            faceArt = {};
            var base = 'assets/characters/kotodama-' + kind;
            var bodies = still.matches ? base : base + '-moving|' + base;
            Sky.findAsset(bodies, function (url) {
                if (dressedAs !== kind || !url) return;
                bodyImg.src = url;
                art.classList.add('has-art');
                Sky.findAsset(base + '-face', function (u) { if (dressedAs === kind && u) { faceArt.calm = u; art.classList.add('has-face'); showFace(); } });
                FACES.forEach(function (f) {
                    if (f !== 'calm') Sky.findAsset(base + '-face-' + f, function (u) { if (dressedAs === kind && u) { faceArt[f] = u; showFace(); } });
                });
                Sky.findAsset(base + '-face-talking', function (u) { if (dressedAs === kind && u) { talkImg.src = u; art.classList.add('has-talk'); } });
                Sky.findAsset(base + '-face-blink', function (u) { if (dressedAs === kind && u) { blinkImg.src = u; art.classList.add('has-blink'); } });
            });
            Sky.babble.want(me.K.voice);
            sizeUp();
        }
        function showFace() {
            var u = faceArt[me.face] || faceArt.calm;
            if (u && faceImg.getAttribute('src') !== u) faceImg.src = u;
            faceImg.setAttribute('data-slot', 'assets/characters/kotodama-' + me.kind + '-face' + (faceArt[me.face] && me.face !== 'calm' ? '-' + me.face : ''));
        }
        function face(f) {
            if (!f || FACES.indexOf(f) === -1) f = 'calm';
            me.face = f;
            home.dataset.face = f;
            showFace();
        }

        // its pictures and puffs: the artist's if there's one, else the drawn sketch
        var ideaArt = {};
        function ideaNode(name, prefix) {
            var el = document.createElement('span'), slot = 'assets/characters/kotodama-' + (prefix || 'idea') + '-' + name;
            el.className = 'kd-pic';
            el.setAttribute('data-slot', slot);
            el.innerHTML = sketch(name);
            var put = function (u) { if (u) { el.innerHTML = ''; var im = new Image(); im.src = u; im.alt = ''; el.appendChild(im); } };
            if (ideaArt[slot] !== undefined) put(ideaArt[slot]);
            else Sky.findAsset(slot, function (u) { ideaArt[slot] = u || null; put(u); });
            return el;
        }
        function skyIdea() { return nightNow() > 0.5 ? 'moon' : 'sun'; }
        function idea(name) { return name === 'sky' ? skyIdea() : name; }

        /* ======================================================================
           where things are
           ====================================================================== */
        function travellerIn(host) {
            var all = host.querySelectorAll('.scene-character');
            for (var i = 0; i < all.length; i++) if (all[i].closest(ROOMS[me.room].host) === host) return all[i];
            return null;
        }
        function hostW() { return (me.host && me.host.clientWidth) || window.innerWidth; }
        // x (% across its room) of something's middle
        function xOf(el) {
            if (!el || !me.host) return null;
            var r = el.getBoundingClientRect(), hr = me.host.getBoundingClientRect();
            if (!r.width) return null;
            return (r.left + r.width / 2 - hr.left) / (hr.width || window.innerWidth) * 100;
        }
        function travX() { var x = xOf(me.trav); return x === null ? 50 : x; }
        // the part of the room the screen shows (on a phone the porch is wider than the screen), less a margin
        // (rooms sliding in or out are part off the screen for a moment: only a room wider than the screen counts that)
        function bounds() {
            var w = hostW(), pad = me.size * 0.7 / w * 100 + 2;
            if (w <= window.innerWidth * 1.05) return [pad, 100 - pad];
            var hr = me.host.getBoundingClientRect(), lo = (-hr.left) / w * 100, hi = (window.innerWidth - hr.left) / w * 100;
            lo = Math.max(lo, 0) + pad; hi = Math.min(hi, 100) - pad;
            return hi > lo ? [lo, hi] : [pad, 100 - pad];
        }
        function nightNow() { return parseFloat(getComputedStyle(root).getPropertyValue('--night')) || 0; }
        function musicOn() { try { return !!(Sky.music && Sky.music.playing && Sky.music.playing()); } catch (e) { return false; } }
        function walking() { return !!(me.trav && me.trav.classList.contains('walking')) || Sky.house.going; }
        // somewhere to stand near x that isn't on a way out
        function clearSpot(x) {
            var b = bounds(), w = hostW(), half = me.size * 0.45 / w * 100;
            x = clamp(x, b[0], b[1]);
            var blocks = [].slice.call(me.host.querySelectorAll(KEEP_CLEAR)).map(function (el) {
                var r = el.getBoundingClientRect(), hr = me.host.getBoundingClientRect();
                if (!r.width || r.top > window.innerHeight || r.bottom < window.innerHeight * 0.55) return null;
                return [(r.left - hr.left) / w * 100 - half, (r.right - hr.left) / w * 100 + half];
            }).filter(Boolean);
            for (var tries = 0; tries < 6; tries++) {
                var hitB = blocks.filter(function (bk) { return x > bk[0] && x < bk[1]; })[0];
                if (!hitB) return x;
                x = (x - hitB[0] < hitB[1] - x ? hitB[0] - 0.5 : hitB[1] + 0.5);
                x = clamp(x, b[0], b[1]);
            }
            return x;
        }

        /* ======================================================================
           hopping: a crouch, a spring up, an arc, a squashy landing (in px; x is % of the room)
           ====================================================================== */
        var raf = 0, lastT = 0;
        function sizeUp() { me.size = home.offsetWidth || 100; }
        function grav() { return me.size * 22; }
        function hopTo(x, quick) {
            if (x === null || x === undefined) return;
            me.target = clearSpot(x);
            if (quick) me.nextHop = 0;
            wakeLoop();
        }
        function launch() {
            var w = hostW(), dxPx = (me.target - me.x) / 100 * w, dist = Math.abs(dxPx);
            var H = me.size * 0.42 * me.K.hop * (dist < me.size * 0.3 ? 0.55 : 1) * (me.mood === 'scared' ? 0.6 : 1) * (me.mood === 'sleepy' ? 0.5 : 1);
            var g = grav(), v0 = Math.sqrt(2 * g * H), T = 2 * v0 / g;
            var hurry = me.act && me.act.name === 'follow' && dist > me.size * 2 ? 1.9 : 1;
            var step = Math.min(dist, me.size * 0.95 * me.K.pace * hurry * (me.mood === 'scared' ? 1.25 : 1));
            me.vh = v0; me.vx = (dxPx < 0 ? -1 : 1) * step / T / w * 100;
            me.flying = true; me.v0 = v0;
            if (Math.abs(dxPx) > 2) setFacing(dxPx < 0 ? -1 : 1);
            me.sv += 2.2 * me.K.spring;                                  // (it springs up: stretched)
            Sky.babble.squish(me.K.voice, 'jump', 0.5 + H / me.size);
        }
        function land() {
            var impact = Math.abs(me.vh) / (me.v0 || 1);
            me.h = 0; me.vh = 0; me.vx = 0; me.flying = false;
            me.sv -= (2.6 + 2.4 * impact) * me.K.spring;                 // squash, then wobble back like jelly
            Sky.babble.squish(me.K.voice, 'land', 0.45 + impact * 0.5);
            if (me.target !== null && Math.abs(me.target - me.x) < 0.4) { me.target = null; arrived(); }
            me.nextHop = now() + (110 + Math.random() * 110) / me.K.pace / (me.act && me.act.name === 'follow' ? 2 : 1);
        }
        function bounce(k) { me.sv += k * me.K.spring; wakeLoop(); }      // a little bob (each syllable, a giggle…)
        function smallHop(k) {                                            // a hop on the spot
            if (me.flying || still.matches) return bounce(1.5);
            var g = grav(), v0 = Math.sqrt(2 * g * me.size * 0.18 * (k || 1));
            me.vh = v0; me.v0 = v0; me.vx = 0; me.flying = true; me.sv += 1.6;
            wakeLoop();
        }
        function setFacing(f) {
            if (f === me.facing) return;
            me.facing = f;
            home.style.setProperty('--kd-dir', f);
        }
        function wakeLoop() { if (!raf && me.host) { lastT = now(); raf = requestAnimationFrame(tick); } }
        function tick(t) {
            raf = 0;
            var dt = Math.min(0.05, Math.max(0.001, (t - lastT) / 1000)); lastT = t;
            if (!me.host || me.away || document.hidden) return;
            var w = hostW();
            // where it's headed
            if (me.target !== null && !me.flying) {
                if (still.matches) {                                     // (less motion: it glides there instead)
                    var d = me.target - me.x, stepPct = 18 * me.K.pace * dt;
                    if (Math.abs(d) <= stepPct) { me.x = me.target; me.target = null; arrived(); }
                    else { me.x += Math.sign(d) * stepPct; setFacing(d < 0 ? -1 : 1); }
                } else if (now() >= me.nextHop) {
                    if (!me.crouch) { me.crouch = now() + 75; me.sv -= 1.6 * me.K.spring; }
                    else if (now() >= me.crouch) { me.crouch = 0; launch(); }
                }
            }
            if (me.flying) {
                me.vh -= grav() * dt; me.h += me.vh * dt; me.x += me.vx * dt;
                if (me.target !== null && ((me.vx > 0 && me.x > me.target) || (me.vx < 0 && me.x < me.target))) { me.x = me.target; me.vx = 0; }
                if (me.h <= 0) land();
            }
            // the jelly: a spring that wobbles back to its own shape
            var K = 150, C = 9 / me.K.spring;
            me.sv += (-K * me.s - C * me.sv) * dt; me.s += me.sv * dt;
            me.s = clamp(me.s, -0.32, 0.3);
            var sy, sx;
            if (me.flying && !still.matches) {
                var st = clamp(me.vh / (me.v0 || 1), -1, 1) * 0.12;
                sy = 1 + st + me.s * 0.4; sx = 1 / Math.sqrt(Math.max(0.6, sy));
                me.tilt += (clamp(me.vx * w / 100 / me.size * 7, -11, 11) - me.tilt) * Math.min(1, dt * 10);
            } else {
                sy = 1 + me.s; sx = 1 - me.s * 0.55;
                me.tilt += (0 - me.tilt) * Math.min(1, dt * 8);
            }
            if (still.matches) { sy = 1; sx = 1; me.tilt = 0; }
            draw(sx, sy);
            var moving = me.flying || me.target !== null || Math.abs(me.s) > 0.002 || Math.abs(me.sv) > 0.02 || Math.abs(me.tilt) > 0.05 || me.crouch;
            if (moving) raf = requestAnimationFrame(tick);
        }
        function draw(sx, sy) {
            home.style.left = me.x.toFixed(3) + '%';
            hopEl.style.transform = 'translateY(' + (-me.h).toFixed(1) + 'px)';
            squashEl.style.transform = 'rotate(' + me.tilt.toFixed(2) + 'deg) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
            var up = clamp(me.h / me.size, 0, 1.5);
            shadow.style.transform = 'translateX(-50%) scale(' + (1 - up * 0.45).toFixed(3) + ')';
            shadow.style.opacity = (1 - up * 0.55).toFixed(3);
        }

        /* ======================================================================
           saying things, and thinking them
           ====================================================================== */
        var voiceRun = null, sayHide = 0, mouthT = 0;
        // talk(kind, { icon, words, text, then, quiet })   kind: say ask exclaim muse giggle sigh gasp hum
        var TALK_FACE = { say: 'happy', ask: 'curious', exclaim: 'idea', muse: 'thinking', giggle: 'giggle', sigh: 'sleepy', gasp: 'startled', hum: 'happy' };
        function talk(kind, o) {
            o = o || {};
            hush();
            var plan = Sky.babble.plan(me.K.voice, { kind: kind, words: o.words, text: o.text, speed: me.mood === 'sleepy' ? 0.75 : 1 });
            me.lastTalk = now();
            var f = o.face || (me.mood === 'scared' ? 'scared' : TALK_FACE[kind]);
            face(f);
            if (!o.nobubble) {
                clearTimeout(sayHide);
                wordsEl.textContent = '';
                sayIc.innerHTML = '';
                if (o.icon) sayIc.appendChild(ideaNode(idea(o.icon)));
                home.classList.toggle('say-ic', !!o.icon);
                home.classList.add('saying');
                sayEl.dataset.kind = kind;
            }
            if (!me.act || me.act.until < now() + plan.total * 1000) doing(me.act ? me.act.name : 'talk', plan.total * 1000 + 500);
            voiceRun = Sky.babble.say(me.K.voice, plan, {
                syl: function (ev) {
                    if (!o.nobubble) { wordsEl.textContent += ev.txt; onScreen(sayEl, '--say-dx'); }
                    home.dataset.vowel = ev.vowel;
                    if (!ev.muse) {                                   // (a hum's "mm" keeps its mouth shut)
                        home.classList.add('mouth-open');
                        clearTimeout(mouthT);
                        mouthT = setTimeout(function () { home.classList.remove('mouth-open'); }, Math.max(60, ev.dur * 650));
                    }
                    if (kind === 'giggle' || kind === 'hum') bounce(1.4); else bounce(ev.first ? 1.1 : 0.6);
                    if (ev.exclaim && ev.first && ev.word === 0 && !me.flying) smallHop(0.6);
                    if (kind === 'hum' && ev.first && chance(0.5)) puff('note');
                },
                done: function () {
                    voiceRun = null;
                    home.classList.remove('mouth-open');
                    if (!o.hold) sayHide = setTimeout(function () { home.classList.remove('saying'); }, 1500);   // (hold: the bubble stays, for the map)
                    if (o.then) o.then();
                }
            });
            return voiceRun;
        }
        // nudge a bubble back onto the screen if it would hang off an edge
        function onScreen(el, prop) {
            var r = home.getBoundingClientRect(), w = el.offsetWidth, cx = r.left + r.width / 2, m = 10, dx = 0;
            if (!w) return;
            if (cx - w / 2 < m) dx = m - (cx - w / 2); else if (cx + w / 2 > window.innerWidth - m) dx = window.innerWidth - m - (cx + w / 2);
            home.style.setProperty(prop, Math.round(dx) + 'px');
        }
        function hush() {
            if (voiceRun) { voiceRun.stop(); voiceRun = null; }
            home.classList.remove('mouth-open');
        }
        // a little mark out of its head: question exclaim spark sweat heart note zzz bulb vein
        function puff(kind) {
            var p = ideaNode(kind, 'fx');
            p.className = 'kd-mark fx-' + kind;
            p.style.setProperty('--fx-x', (rnd(-0.5, 0.5)).toFixed(2));
            fx.appendChild(p);
            setTimeout(function () { p.remove(); }, 1900);
        }
        // a thought: the cloud, the "…", then the pictures one by one
        function thinkOf(ideas, glue) {
            ideasEl.innerHTML = '';
            home.classList.remove('thought-shown');
            home.classList.add('thinking');
            (ideas || []).forEach(function (name, i) {
                if (i && glue) { var g = document.createElement('span'); g.className = 'kd-glue'; g.textContent = glue; ideasEl.appendChild(g); }
                var n = ideaNode(idea(name)); n.style.setProperty('--i', i); ideasEl.appendChild(n);
            });
            requestAnimationFrame(function () { onScreen(thinkEl, '--think-dx'); });
            later(function () { home.classList.add('thought-shown'); onScreen(thinkEl, '--think-dx'); }, 650);
        }
        function unthink(pop) {
            home.classList.toggle('thought-pop', !!pop);
            home.classList.remove('thinking', 'thought-shown');
            later(function () { home.classList.remove('thought-pop'); }, 400);
        }

        /* ======================================================================
           what it's doing: one thing at a time, each a little sequence of timed steps (cut short by anything new)
           ====================================================================== */
        var timers = [];
        function later(fn, ms) { var id = setTimeout(function () { timers = timers.filter(function (x) { return x !== id; }); fn(); }, ms); timers.push(id); return id; }
        function stopAll() { timers.forEach(clearTimeout); timers = []; me.act = null; }
        function interrupt() {
            stopAll(); hush(); unthink(false);
            home.classList.remove('saying', 'napping');
        }
        function doing(name, ms) { me.act = { name: name, until: now() + ms }; }
        function idleFor(ms) { me.act = null; me.idleUntil = now() + ms; }
        function arrived() {
            if (me.onArrive) { var f = me.onArrive; me.onArrive = null; f(); }
        }
        function goTo(x, then) { me.onArrive = then || null; hopTo(x); }
        function faceTowards(x) { if (x !== null) setFacing(x < me.x ? -1 : 1); }
        function lookAt(x, y) { home.style.setProperty('--lx', clamp(x, -1, 1).toFixed(2)); home.style.setProperty('--ly', clamp(y, -1, 1).toFixed(2)); }

        // a whole thought: wonder, see it, then make something of it
        function muse(ideas, end, near) {
            interrupt();
            doing('muse', 9000);
            face('thinking'); lookAt(-0.5 * me.facing, -1);
            if (chance(0.45)) talk('muse', { nobubble: true, face: 'thinking' });
            thinkOf(ideas, ideas.length > 1 ? pick(['+', '→', '…', '']) : '');
            var hold = rnd(1700, 2600);
            later(function () { conclude(end || pick(endings()), ideas, near); }, hold);
        }
        function endings() {
            var e = ['idea', 'idea', 'love', 'puzzle', 'giggle'];
            if (me.mood === 'sleepy') e = ['sleepy', 'sleepy', 'love'];
            if (me.mood === 'scared') e = ['scared', 'scared', 'puzzle'];
            if (me.K.cheeky) e.push('giggle', 'idea');
            return e;
        }
        function conclude(end, ideas, near) {
            lookAt(0, 0);
            var main = idea(ideas[0]);
            switch (end) {
                case 'idea':          // the lightbulb: it's had a thought worth telling you about
                    unthink(true); face('idea'); puff(chance(0.5) ? 'bulb' : 'exclaim'); smallHop(0.7);
                    talk('gasp', { nobubble: true });
                    later(function () {
                        faceTowards(travX());
                        lookAt(0, -0.6);
                        talk(chance(0.7) ? 'exclaim' : 'say', { icon: main, words: 2 + Math.floor(Math.random() * 3), then: rest });
                    }, 520);
                    break;
                case 'puzzle':        // it can't work it out
                    face('puzzled'); puff('question');
                    talk('ask', { icon: main, words: 1, then: function () { unthink(false); rest(); } });
                    break;
                case 'love':          // it just likes the thought
                    unthink(true); face('happy'); puff('heart'); smallHop(0.5);
                    later(function () { talk(chance(0.5) ? 'hum' : 'giggle', { nobubble: chance(0.5), then: rest }); }, 300);
                    break;
                case 'giggle':
                    unthink(true); face('giggle');
                    talk('giggle', { then: rest });
                    break;
                case 'sleepy':
                    face('sleepy'); puff('zzz');
                    talk('sigh', { nobubble: true, then: function () { unthink(false); rest(); } });
                    break;
                case 'scared':        // something about this place: back to the traveller
                    face('scared'); puff('sweat'); unthink(false);
                    talk('gasp', { nobubble: true });
                    later(function () { hopTo(nearTraveller(4)); rest(); }, 400);
                    break;
                case 'hold': break;   // (it keeps thinking it: the asset manager's map)
                default: unthink(false); rest();
            }
        }
        function rest() {
            later(function () { face(me.mood === 'scared' ? 'scared' : (me.mood === 'sleepy' && chance(0.5) ? 'sleepy' : 'calm')); lookAt(0, 0); }, 1300);
            idleFor(gap());
        }
        // how long it leaves between doing things
        function gap() { return rnd(3200, 8200) / (0.6 + me.K.wonder * 0.6) * (me.mood === 'sleepy' ? 1.6 : 1); }
        // a spot beside the traveller, on whichever side it's on (in units of its own size)
        function nearTraveller(sizes) {
            var tx = travX(), w = hostW(), off = (sizes || 1.6) * me.size / w * 100 + (me.trav ? me.trav.offsetWidth * 0.18 / w * 100 : 0);
            var side = me.x < tx ? -1 : 1, b = bounds();
            if (tx + side * off > b[1] || tx + side * off < b[0]) side = -side;
            return tx + side * off * rnd(0.85, 1.2);
        }

        /* ======================================================================
           its little brain: every third of a second it looks round and decides
           ====================================================================== */
        function brain() {
            if (MAPPING || document.hidden) return;
            if (me.away) {                                                // (they've come in from the garden: some ways back say nothing)
                var w = Sky.house.where();
                if (w !== 'front' && ROOMS[w]) arrive(w);
                return;
            }
            if (!me.host) return;
            var t = now(), tx = travX(), w = hostW();
            var dist = Math.abs(me.x - tx) / 100 * w / me.size;          // (in units of its own size)
            moods();
            // following: they're off, or it's been left behind
            if (walking() || dist > 4.2) {
                if (me.asleep) wakeUp(false);
                if (me.act && me.act.name !== 'follow') interrupt();
                doing('follow', 600);
                if (me.target === null || Math.abs(me.target - nearTraveller(1.7)) > 6) hopTo(nearTraveller(1.7));
                return;
            }
            if (me.act && t < me.act.until) return;
            if (me.act) me.act = null;
            if (me.greet) { me.greet = false; return welcome(); }
            if (t < me.idleUntil || me.target !== null) return;
            if (me.asleep) return;
            if (dist > 3) { hopTo(nearTraveller(1.7)); idleFor(1800); return; }     // (wandered off too far: back to them)
            choose();
        }
        function moods() {
            var room = ROOMS[me.room] || {};
            var m = room.scared && !me.K.brave ? 'scared' : (musicOn() ? 'groove' : (nightNow() > 0.6 ? 'sleepy' : 'calm'));
            if (m !== me.mood) {
                me.mood = m;
                home.dataset.mood = m;
                if (m === 'scared') face('scared');
                else if (me.face === 'scared') face('calm');
            }
        }
        function choose() {
            var t = now(), w = [];
            // (what it might do, and how likely)
            if (me.mood === 'sleepy' && t - me.lastTalk > 15000) w.push(['nap', 3]);
            if (me.mood === 'groove') w.push(['bop', 5], ['hum', 2]);
            if (HINTS && hintDue()) w.push(['hint', 6]);
            w.push(['wander', 2 + me.K.wonder * 2], ['visit', 1 + me.K.wonder * 3], ['muse', 1 + me.K.wonder * 2], ['look', 2]);
            if (t - me.lastTalk > 14000) w.push(['chat', 1 + me.K.chat * 3]);
            if (me.mood === 'scared') w = [['cower', 4], ['muse', 2], ['look', 2]];
            var total = w.reduce(function (s, x) { return s + x[1]; }, 0), r = Math.random() * total;
            for (var i = 0; i < w.length; i++) { r -= w[i][1]; if (r <= 0) return DO[w[i][0]](); }
        }
        var DO = {
            wander: function () {                     // hop off a little way, not too far from them
                var b = bounds(), x = clamp(travX() + rnd(-2.6, 2.6) * me.size / hostW() * 100, b[0], b[1]);
                doing('wander', 4000);
                goTo(x, function () { face(chance(0.5) ? 'curious' : 'calm'); lookAt(rnd(-1, 1), rnd(-0.5, 0.3)); idleFor(gap()); });
            },
            visit: function () {                      // go and look at something in the room, and think about it
                var list = (ROOM_THOUGHTS[me.room] || []).filter(function (it) { var el = me.host.querySelector(it[0]); return el && el.getBoundingClientRect().width; });
                if (!list.length) return DO.muse();
                var it = pick(list), el = me.host.querySelector(it[0]), x = xOf(el);
                var b = bounds();
                if (x === null || x < b[0] - 4 || x > b[1] + 4) return DO.muse();
                doing('visit', 7000);
                var stand = x + (me.x < x ? -1 : 1) * rnd(2, 5);
                goTo(stand, function () {
                    faceTowards(x); face('curious');
                    var r = el.getBoundingClientRect(), mine = home.getBoundingClientRect();
                    lookAt(0, r.bottom < mine.top ? -1 : 0.2);
                    later(function () { muse(it.slice(1)); }, rnd(500, 1100));
                });
            },
            muse: function () {
                var t = pick(IDLE_THOUGHTS);
                if (me.mood === 'groove') t = ['note', 'heart'];
                if (me.mood === 'sleepy') t = pick([['moon', 'zzz'], ['zzz'], ['star', 'moon']]);
                if (me.mood === 'scared') t = pick([['ghost'], ['eye', 'question'], ['house', 'sun']]);
                muse(t);
            },
            look: function () {                       // looks round, at you (the pointer), at the traveller
                doing('look', 2200);
                face(chance(0.6) ? 'curious' : 'calm');
                if (pointer.near) { lookAt(pointer.lx, pointer.ly); faceTowards(pointer.x); }
                else { faceTowards(travX()); lookAt(0, -0.8); }
                later(function () { lookAt(0, 0); idleFor(gap() * 0.6); }, 2000);
            },
            chat: function () {                       // turns to the traveller and tells them something
                interrupt();
                doing('chat', 6000);
                faceTowards(travX()); lookAt(0, -0.7);
                var k = pick(['say', 'say', 'ask', 'exclaim']);
                talk(k, { icon: chance(0.35) ? pick(['heart', 'star', 'pie', 'note', 'sky', 'hat']) : null, then: rest });
            },
            hum: function () {
                interrupt(); doing('hum', 5000);
                talk('hum', { then: rest });
            },
            bop: function () {                        // bops along to the record
                doing('bop', 4200); face(chance(0.5) ? 'happy' : 'giggle');
                var beats = 0;
                (function beat() {
                    if (!me.act || me.act.name !== 'bop' || beats++ > 6 || !musicOn()) { rest(); return; }
                    smallHop(0.35 + Math.random() * 0.2);
                    if (chance(0.25)) puff('note');
                    later(beat, 520);
                })();
            },
            nap: function () {                        // at night, if it's been quiet a while
                interrupt(); doing('nap', 400);
                face('sleepy'); talk('sigh', { nobubble: true });
                later(function () { me.asleep = true; home.classList.add('napping'); snore(); }, 1600);
            },
            cower: function () {                      // down in the dungeon: stays close and shivers
                doing('cower', 3000);
                hopTo(nearTraveller(1.2));
                later(function () { face('scared'); if (chance(0.5)) puff('sweat'); idleFor(gap() * 0.7); }, 1200);
            },
            hint: function () {                       // the key: it goes and wonders about it
                var h = HINT[resetNow()], el = h && document.querySelector(h.near), x = xOf(el);
                me.lastHint = now();
                if (x === null) return DO.muse();
                doing('hint', 9000);
                goTo(x + (me.x < x ? -3 : 3), function () {
                    faceTowards(x); face('curious');
                    var r = el.getBoundingClientRect(), mine = home.getBoundingClientRect();
                    lookAt(0, r.bottom < mine.top ? -1 : 0);
                    later(function () { muse(h.ideas, 'puzzle'); }, 900);
                });
            }
        };
        function snore() {
            if (!me.asleep) return;
            puff('zzz'); bounce(-0.6);
            later(snore, rnd(2600, 3800));
        }
        function wakeUp(cross) {
            me.asleep = false;
            home.classList.remove('napping');
            stopAll();
            face('startled'); puff('exclaim');
            if (cross) later(function () { face('sleepy'); talk('sigh', { then: rest }); }, 700);
            else rest();
        }
        function resetNow() { return window.davSave ? window.davSave.reset : 1; }
        function hintDue() {
            var h = HINT[resetNow()];
            if (!h || h.room !== me.room || !window.davSave) return false;
            if (resetNow() === 8 ? store('gnosis') === '1' : window.davSave.get('key') === '1') return false;
            return now() - me.enteredAt > 70000 && now() - me.lastHint > 150000;
        }
        function store(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
        function welcome() {                          // they're back in from the garden (or into its room, for one that lives there)
            doing('welcome', 4000);
            faceTowards(travX()); face('idea'); puff('heart'); smallHop(1);
            later(function () { talk('exclaim', { icon: 'heart', then: rest }); }, 450);
        }

        /* ======================================================================
           you: poking it, patting its head, the pointer, a gunshot
           ====================================================================== */
        var pointer = { near: false, x: 50, lx: 0, ly: 0 };
        function onHead(e) {
            var r = art.getBoundingClientRect();
            return e.clientY < r.top + r.height * 0.5 && Math.abs(e.clientX - (r.left + r.width / 2)) < r.width * 0.36;
        }
        function holdingGun() { var h = Sky.inventory && Sky.inventory.holding; return !!h && /revolver/.test(h); }
        hit.addEventListener('pointermove', function (e) { home.classList.toggle('on-head', onHead(e)); });
        hit.addEventListener('pointerleave', function () { home.classList.remove('on-head'); });
        hit.addEventListener('click', function (e) {
            if (MAPPING) return;
            if (holdingGun()) return scared(e.clientX);
            if (e.detail && onHead(e)) pat(); else poke();
        });
        function poke() {
            var t = now();
            me.pokes = me.pokes.filter(function (p) { return t - p < 5000; }).concat(t);
            if (me.asleep) { wakeUp(true); return; }
            interrupt(); doing('poked', 2400);
            face('startled'); smallHop(0.9); puff(me.pokes.length > 3 ? 'vein' : 'exclaim');
            talk('gasp', { nobubble: true });
            if (me.pokes.length > 3) {                // that's enough poking: it sulks off a little way
                later(function () {
                    face('puzzled');
                    talk(me.K.cheeky ? 'exclaim' : 'ask', { then: function () { hopTo(me.x + (me.x < travX() ? -1 : 1) * 9); rest(); } });
                }, 600);
                return;
            }
            later(function () { talk(chance(0.65) ? 'giggle' : pick(['ask', 'say']), { then: rest }); }, 650);
        }
        function pat() {
            if (me.asleep) { me.asleep = false; home.classList.remove('napping'); }
            interrupt(); doing('patted', 2600);
            face('happy'); puff(chance(0.7) ? 'heart' : 'spark'); bounce(-2.2);
            later(function () { talk(chance(0.5) ? 'giggle' : 'hum', { nobubble: chance(0.4), then: rest }); }, 350);
        }
        function scared(fromX) {
            interrupt(); doing('scared', 2500);
            face('scared'); puff('sweat'); talk('gasp', { nobubble: true });
            var hr = me.host.getBoundingClientRect(), px = (fromX - hr.left) / hostW() * 100;
            hopTo(me.x + (me.x < px ? -1 : 1) * 14, true);
            later(rest, 1500);
        }
        // the eyes follow the pointer when it's close
        window.addEventListener('pointermove', function (e) {
            if (!me.host || me.away || me.asleep || MAPPING) return;
            var r = art.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.6;
            var dx = e.clientX - cx, dy = e.clientY - cy, d = Math.sqrt(dx * dx + dy * dy), reach = Math.max(260, window.innerWidth * 0.28);
            pointer.near = d < reach;
            pointer.x = (e.clientX - me.host.getBoundingClientRect().left) / hostW() * 100;
            pointer.lx = dx / reach * 1.6 * me.facing; pointer.ly = dy / reach * 1.6;
            if (pointer.near && (!me.act || /look|patted|poked/.test(me.act.name))) lookAt(pointer.lx, pointer.ly);
        }, { passive: true });
        document.addEventListener('dav:bang', function () {
            if (!me.host || me.away || MAPPING) return;
            if (me.asleep) wakeUp(false);
            interrupt(); doing('scared', 2600);
            face('scared'); puff('sweat'); smallHop(1.1);
            later(function () { hopTo(nearTraveller(1.1)); rest(); }, 500);
        });

        /* ======================================================================
           following them room to room
           ====================================================================== */
        function arrive(room, first) {
            var spec = ROOMS[room], host = spec && document.querySelector(spec.host);
            if (!host) return;
            var wasAway = me.away;
            me.away = false; home.classList.remove('kd-away');
            me.room = room; me.host = host;
            home.dataset.room = room;
            host.appendChild(home);
            me.trav = travellerIn(host);
            var tz = me.trav ? parseInt(getComputedStyle(me.trav).zIndex, 10) : 2;
            home.style.setProperty('--kd-z', spec.z || (isFinite(tz) ? tz : 2) + 1);
            home.style.setProperty('--kd-floor', spec.floor);
            sizeUp();
            me.enteredAt = now();
            interrupt();
            me.flying = false; me.h = 0; me.vh = 0; me.vx = 0; me.target = null; me.crouch = 0;
            if (me.asleep) { me.asleep = false; home.classList.remove('napping'); }
            moods();
            var tx = travX();
            if ((first || MAPPING) && xOf(me.trav) === null && !MAPPING && (arrive.tries = (arrive.tries || 0) + 1) < 20) {
                setTimeout(function () { if (me.room === room) arrive(room, true); }, 250);    // (its room isn't showing yet: in a moment)
                return;
            }
            if (first || MAPPING) {
                me.x = clearSpot(MAPPING ? 64 : tx + 9);
                draw(1, 1);
                face(me.mood === 'scared' ? 'scared' : 'calm');
                idleFor(MAPPING ? 1e9 : 2500);
                return;
            }
            // it comes in after them from the side they came in by, a moment later
            var b = bounds(), fromLeft = tx < 50;
            me.x = fromLeft ? b[0] - 12 : b[1] + 12;
            setFacing(fromLeft ? 1 : -1);
            draw(1, 1);
            me.greet = wasAway;
            doing('follow', 900);
            later(function () { hopTo(nearTraveller(1.7)); }, 420);
        }
        function away() {                              // the garden: it stays in, and waits
            interrupt();
            me.away = true; me.greet = false;
            home.classList.add('kd-away');
        }

        /* ======================================================================
           starting up (this one)
           ====================================================================== */
        dress(kind);
        face('calm');
        if (!MAPPING) setInterval(brain, 320);
        window.addEventListener('resize', function () { sizeUp(); if (me.host) draw(1, 1); });
        Sky.house.on(function (what, name) {
            if (what === 'leave' && name === 'front') { setTimeout(function () { if (me.away && ROOMS[Sky.house.where()]) arrive(Sky.house.where()); }, 60); return; }
            if (what !== 'enter') return;
            if (ROOMS[name]) arrive(name);
            else if (name === 'front') away();
        });
        var first = Sky.house.where();
        if (ROOMS[first]) arrive(first, true); else if (first === 'front') { arrive('hall', true); away(); }

        return {
            el: home,
            get kind() { return me.kind; }, get room() { return me.room; }, get mood() { return me.mood; }, get expression() { return me.face; },
            become: function (k) { if (!LOOK.kinds[k]) return; dress(k); face(me.face); if (me.room) arrive(me.room, true); },
            restyle: function () { dress(me.kind); face(me.face); },
            say: function (k, o) { interrupt(); return talk(k || 'say', o); },
            think: function (ideas, end) { muse([].concat(ideas || ['star']), end); },
            face: face, puff: puff, poke: poke, pat: pat,
            hop: function (x) { hopTo(x, true); }
        };
    }

    /* ======================================================================
       starting it: the asset manager's tweaks first (a missing file is fine: the defaults), then it's in
       ====================================================================== */
    var one = null, ready = false, waiting = [];
    function when(fn) { return function () { var a = arguments; if (ready) { return one ? fn.apply(one, [one].concat([].slice.call(a))) : undefined; } waiting.push(function () { if (one) fn.apply(one, [one].concat([].slice.call(a))); }); }; }
    Sky.findAsset(LOOK.file + '.json', function (url, data) {
        if (data && typeof data === 'object') SAVED = data;
        one = Companion('una');
        ready = true;
        waiting.splice(0).forEach(function (f) { f(); });
    });

    var kindsNow = {};
    Sky.kotodama = {
        get el() { return one ? one.el : null; },
        get ready() { return ready; },
        // every kind's look and ways as they are now (the defaults with your tweaks)
        get kinds() { Object.keys(LOOK.kinds).forEach(function (k) { kindsNow[k] = spec(k); }); return kindsNow; },
        ideas: Object.keys(IDEAS),
        get kind() { return one ? one.kind : null; }, get room() { return one ? one.room : null; },
        get mood() { return one ? one.mood : null; }, get expression() { return one ? one.expression : null; },
        // become another kind (the asset manager's map, the debug page)
        become: when(function (c, k) { c.become(k); }),
        say: when(function (c, k, o) { return c.say(k, o); }),
        think: when(function (c, ideas, end) { c.think(ideas, end); }),
        face: when(function (c, f) { c.face(f); }),
        puff: when(function (c, f) { c.puff(f); }),
        poke: when(function (c) { c.poke(); }), pat: when(function (c) { c.pat(); }),
        hop: when(function (c, x) { c.hop(x); }),
        // try a look without keeping it (the asset manager's menu, on its map): saved = the same shape as the looks file
        restyle: function (saved) { SAVED = saved || null; if (one) one.restyle(); }
    };
})();

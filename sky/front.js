/* =====================================================================
   front.js — the front of the house (living.html#front): where the
   homepage's "visit home" sign brings you. The house from the garden path,
   under the site's own sky (the sun, the moon, the clouds, the stars: the
   top of the picture is open). Click the front door: the traveller walks
   up the path, the door opens, they go in, and it's the hallway.
   Going anywhere else from here (a place tab) just leaves the garden behind.

   Its look: sky/css/front.css. The markup and its stand-ins: living.html.
   slots (assets/living/): front-house (the whole 1600 x 900 picture: house, garden, path,
          see-through where the sky is), front-door, front-door-open (each the whole
          1600 x 900 canvas too, see-through except the door: 770-830 across, 492-612 down);
          assets/characters/front (+ front-walking)
   sounds: door, step (stand-ins till then)
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var body = document.body, front = document.querySelector('.front');
    if (!Sky || !front || Sky.front) return;
    var me = front.querySelector('.front-character'), hit = front.querySelector('.front-door-hit');
    var hall = document.querySelector('.hallway'), hallMe = hall && hall.querySelector('.hall-character');
    var out = hall && hall.querySelector('.hall-out');
    var STAND = 44;                                        // where the traveller stands on the path (% across)
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }
    function say(t, ms) { if (Sky.inventory && Sky.inventory.say) Sky.inventory.say(t, ms || 2600); }
    function place(ch, x, left) { if (Sky.sides && Sky.sides.place) Sky.sides.place(ch, x, left); else ch.style.left = x + '%'; }
    function walk(ch, x, done) { if (Sky.sides && Sky.sides.walk) Sky.sides.walk(ch, x, done); else { ch.style.left = x + '%'; if (done) setTimeout(done, 300); } }
    function standAt(ch, x) { return x - (ch.offsetWidth / 2) / (ch.parentNode.clientWidth || window.innerWidth) * 100; }
    function pctOf(el) { var r = el.getBoundingClientRect(); return (r.left + r.width / 2) / window.innerWidth * 100; }

    // its look is in sky/css/front.css; this is the value it takes from here
    document.documentElement.style.setProperty('--front-stand', STAND);

    var here = false, busy = false;
    function open() {
        here = true;
        body.classList.add('in-front');
        front.setAttribute('aria-hidden', 'false');
        if (Sky.fillAssets) Sky.fillAssets(front);
        place(me, STAND);
        if (!open.said) { open.said = true; setTimeout(function () { if (here && !busy) say('Home.', 2200); }, 1400); }
    }
    // gone somewhere else: the garden's left behind (instantly, or fading as the hallway shows)
    function close(fade) {
        if (!here) return;
        here = false;
        front.setAttribute('aria-hidden', 'true');
        if (fade) {
            body.classList.add('front-leaving');
            body.classList.remove('in-front');
            setTimeout(function () { body.classList.remove('front-leaving'); front.classList.remove('door-open'); resetMe(); }, 950);
        } else {
            body.classList.remove('in-front', 'front-leaving');
            front.classList.remove('door-open');
            resetMe();
        }
    }
    function resetMe() {
        me.getAnimations().forEach(function (a) { a.cancel(); });
        me.classList.remove('walking', 'face-left');
        me.style.opacity = '';
        busy = false;
    }

    // the front door: up the path, the door opens, and in they go (to the hallway)
    // the trip from room to room, and changing your mind on the way (sky/bathroom.js: "a trip from room to room")
    var T = function () { return Sky.sides || {}; };
    function ask(fn) { if (T().ask) T().ask(fn); else fn(); }
    function goIn() {
        if (!here || busy) return;
        busy = true;
        var r = me.getBoundingClientRect(), d = hit.getBoundingClientRect();
        // (somewhere else instead, on the way to the path: they stop where they are)
        if (T().setOff) T().setOff(function () { if (T().stop) T().stop(me); busy = false; });
        walk(me, standAt(me, pctOf(hit)), function () {
            if (T().through) T().through();
            r = me.getBoundingClientRect();
            var scale = Math.max(0.2, Math.min(1, d.height * 0.95 / r.height));
            var dx = (d.left + d.width / 2) - (r.left + r.width / 2), dy = d.bottom - r.bottom;
            me.classList.add('walking');
            var steps = setInterval(function () { sfx('step', { size: 0.3 }); }, 380);
            var up = me.animate([
                { transform: 'translate(0, 0) scale(1)', transformOrigin: '50% 100%' },
                { transform: 'translate(' + dx.toFixed(0) + 'px, ' + dy.toFixed(0) + 'px) scale(' + scale.toFixed(3) + ')', transformOrigin: '50% 100%' }
            ], { duration: 2200, easing: 'cubic-bezier(.3,0,.6,1)', fill: 'forwards' });
            setTimeout(function () { front.classList.add('door-open'); sfx('door', { size: 0.5 }); }, 1500);
            up.onfinish = function () {
                clearInterval(steps);
                me.classList.remove('walking');
                me.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'forwards' }).onfinish = inside;
            };
        });
    }
    // in through the door (27 Sep, Victor: the hallway used to show up behind the see-through sky of the house while
    // the garden faded, and things slid): a short black, the hallway set up in it with nothing moving, and out of the
    // black the traveller steps in from the front door
    var black = document.createElement('div');
    black.className = 'front-black';
    black.setAttribute('aria-hidden', 'true');
    body.appendChild(black);
    function inside() {
        body.classList.add('front-going-in');
        setTimeout(function () {
            var root = document.documentElement;
            root.classList.add('front-snap');                              // (no transitions while it's all put in place)
            if (Sky.sides && Sky.sides.goNow) Sky.sides.goNow('hall');
            close(false);
            if (hallMe) place(hallMe, out ? standAt(hallMe, pctOf(out)) : 50);
            requestAnimationFrame(function () { requestAnimationFrame(function () {
                root.classList.remove('front-snap');
                body.classList.remove('front-going-in');
                busy = false;
                var settle = function () { if (hallMe) hallMe.classList.remove('face-left'); };
                setTimeout(function () {
                    if (hallMe) sfx('door', { size: 0.4 });
                    if (T().land) T().land(hallMe, 44, settle); else if (hallMe) walk(hallMe, 44, settle);
                }, 350);
            }); });
        }, 500);
    }
    if (hit) hit.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); ask(goIn); });

    // off somewhere else (a side room, a place tab): the garden's left behind
    (function hookSides(n) {
        if (Sky.sides && Sky.sides.on) Sky.sides.on(function (what) { if (what === 'enter' && here && !busy) close(false); });
        else if (n < 40) setTimeout(function () { hookSides(n + 1); }, 150);
    })(0);
    // the living space's own tab, clicked out here: into the living space
    document.addEventListener('click', function (e) {
        var t = e.target.closest && e.target.closest('.place-tab[data-place=living]');
        if (!t || !here) return;
        e.preventDefault(); e.stopPropagation();
        // (on the way in through the door already: into the hallway first, then on to the living space)
        ask(function () {
            if (!here) { if (T().nav) T().nav('living'); return; }
            close(true);
            try { history.replaceState(null, '', location.pathname + location.search); } catch (err) {}
        });
    }, true);

    if (location.hash === '#front') open();

    Sky.front = { open: open, close: close, goIn: goIn, get here() { return here; } };
})();

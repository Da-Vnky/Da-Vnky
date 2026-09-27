/* =====================================================================
   lives.js — three lives. Nobody sees them at first: they turn up (top left,
   locked) once a visitor has both found the dungeon and turned the revolver
   on themselves. They're locked: nothing's taken until the visitor has found
   this reset's hidden key (sky/resets.js calls Sky.lives.unlock()). From then on every death
   (the revolver, a fall, the toaster, the scissors …) costs a life
   (sky/gore.js tells it, 'dav:traveller-died'), and when the last one goes,
   the world resets: on to the next of the seven (sky/state.js).
   The revolver's jammed while the lock's off and there's more than one heart
   left (Sky.lives.jammed): it only fires on the last.

   FROM RESET 2 ON they're there from the start (locked), and every way to die is
   off until the key's found: try one and the traveller says why not (NOT_YET below,
   one line for each). That way no reset's one-time deaths (the pact, the diagram…)
   can be used up for free before the hearts count, and the reset can always end.
   (Reset 1 is as before: the deaths are free until the key, and the hearts turn up
   after the dungeon and the revolver.)

   Kept in the visitor's browser between visits (localStorage), until the next reset.
   slots: assets/ui/heart (a life), assets/ui/heart-empty (one lost),
          assets/ui/lives-lock (the lock on them), assets/ui/lives-frame (behind them)
   sounds: assets/sounds/life-lost, lives-found (the page makes a chime and a crack until then)
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.lives) return;
    var MAX = 3;
    var body = document.body, S = window.davSave;
    var ALWAYS = !!S && S.reset >= 2;                   // from reset 2: the hearts are always there, and locked till the key
    // what the traveller says trying a way to die before the key's found (from reset 2)
    var NOT_YET = {
        revolver:    'My finger won\u2019t pull the trigger. Not yet. Something here is still hidden.',
        scissors:    'I can\u2019t make my hand do it. Not until I\u2019ve found what\u2019s hidden.',
        toaster:     'I can\u2019t bring myself to drop it in. Something tells me to look around first.',
        boat:        'My arms won\u2019t let go of it. Not yet. I haven\u2019t found it yet, whatever it is.',
        roof:        'My feet won\u2019t step off the edge. Not until I find what\u2019s hidden here.',
        grimoire:    'My hand stops above the page. It won\u2019t let me sign. Not yet.',
        diagram:     'The circle drinks the bullet\u2026 and waits. It isn\u2019t time yet.',
        apple:       'I pick it up\u2026 and put it back. Not yet. There\u2019s something I haven\u2019t found.',
        placeholder: 'Not yet. There\u2019s something I have to find first.'
    };
    // each way to die costs a heart once a reset. tried again after that, it doesn't happen, and the traveller says why
    var DONE = {
        scissors:    'Not the scissors again. Once was enough, and it didn\u2019t take.',
        toaster:     'Not the bath again. It didn\u2019t work the first time.',
        boat:        'Not the boat again. It didn\u2019t stick the first time.',
        roof:        'I\u2019ve already jumped. The ground just gave me back.',
        grimoire:    'The pact\u2019s already made. The book has nothing more to ask.',
        diagram:     'The circle already took what it wanted.',
        apple:       'I\u2019ve already had a bite. I won\u2019t fall for it twice.',
        placeholder: 'Not that one again. It has to be something else.'
    };
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function put(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }

    var HEART = '<svg viewBox="0 0 20 18" aria-hidden="true"><path d="M10 17 L2.5 9.5 Q-.5 6 2 3 Q5 0 8 2.5 L10 4.5 L12 2.5 Q15 0 18 3 Q20.5 6 17.5 9.5 Z" fill="#d11f33" stroke="#5a0a12" stroke-width="1"/>' +
        '<path d="M5 4 Q3.5 5 4 7" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/></svg>';
    var EMPTY = '<svg viewBox="0 0 20 18" aria-hidden="true"><path d="M10 17 L2.5 9.5 Q-.5 6 2 3 Q5 0 8 2.5 L10 4.5 L12 2.5 Q15 0 18 3 Q20.5 6 17.5 9.5 Z" fill="#2a1d1f" stroke="#5a4a4c" stroke-width="1"/>' +
        '<path d="M10 4.5 L8.6 8 L11 10 L9 13" stroke="#5a4a4c" stroke-width="1" fill="none"/></svg>';
    var LOCK = '<svg viewBox="0 0 20 24" aria-hidden="true"><path d="M5 10 V7 A5 5 0 0 1 15 7 V10" fill="none" stroke="#9aa0a8" stroke-width="2.6"/>' +
        '<rect x="2" y="10" width="16" height="12" rx="2" fill="#c49a52" stroke="#6e4a10" stroke-width="1"/><circle cx="10" cy="15" r="2" fill="#3a2716"/><path d="M10 16 V19" stroke="#3a2716" stroke-width="1.6"/></svg>';

    Sky.css(
        '.lives { position: fixed; left: 14px; top: 14px; z-index: 7; display: none; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 999px;' +
            'background: rgba(30,21,14,.8) var(--lives-frame, none) center / 100% 100% no-repeat; box-shadow: 0 4px 12px rgba(0,0,0,.4); }' +
        'body[data-page=home] .lives { top: 78px; }' +
        '.lives.on { display: flex; }' +
        '.lives.arrive { animation: lives-arrive .9s cubic-bezier(.3,1.6,.5,1); }' +
        '@keyframes lives-arrive { from { transform: scale(.2) rotate(-12deg); opacity: 0; } to { transform: none; opacity: 1; } }' +
        '.lives .lf { position: relative; width: 26px; height: 24px; }' +
        '.lives .lf > svg, .lives .lf > img { width: 100%; height: 100%; display: block; object-fit: contain; }' +
        '.lives .lf.gone.just { animation: life-gone .9s ease-out; }' +
        '@keyframes life-gone { 0% { transform: scale(1.5); filter: brightness(2); } 40% { transform: scale(.8) rotate(-15deg); } 100% { transform: none; } }' +
        '.lives .l-lock { width: 20px; height: 24px; margin-left: 4px; }' +
        '.lives .l-lock > svg, .lives .l-lock > img { width: 100%; height: 100%; display: block; object-fit: contain; }' +
        '.lives.unlocked .l-lock { display: none; }' +
        'body.leaving .lives, body.sky-view .lives, body.peep-view .lives, body.peep-close .lives, body.mirror-open .lives, body.paint-open .lives { opacity: 0; pointer-events: none; }' +
        '.lives-note { position: fixed; left: 50%; top: 38%; z-index: 9; transform: translate(-50%, -50%); padding: 10px 22px; border-radius: 12px; background: rgba(20,10,10,.9);' +
            'color: #f3e6c2; font: italic 1.3rem "IM Fell English", Georgia, serif; text-align: center; pointer-events: none; animation: lives-note 3.2s ease-out forwards; }' +
        '@keyframes lives-note { 0% { opacity: 0; } 12%, 75% { opacity: 1; } 100% { opacity: 0; } }'
    );

    var el = document.createElement('div');
    el.className = 'lives';
    el.setAttribute('aria-label', 'your lives');
    body.appendChild(el);
    var art = { heart: HEART, empty: EMPTY, lock: LOCK };
    Sky.findAsset('assets/ui/heart', function (u) { if (u) { art.heart = '<img alt="" src="' + u + '">'; draw(); } });
    Sky.findAsset('assets/ui/heart-empty', function (u) { if (u) { art.empty = '<img alt="" src="' + u + '">'; draw(); } });
    Sky.findAsset('assets/ui/lives-lock', function (u) { if (u) { art.lock = '<img alt="" src="' + u + '">'; draw(); } });
    Sky.findAsset('assets/ui/lives-frame', function (u) { if (u) el.style.setProperty('--lives-frame', 'url("' + new URL(u, location.href).href + '")'); });

    function shown() { return ALWAYS || get('lives-shown') === '1'; }
    function left() { var n = get('lives-left'); return n === null ? MAX : Math.max(0, +n); }
    function draw(justLost) {
        el.classList.toggle('on', shown());
        el.classList.toggle('unlocked', get('lives-unlocked') === '1');
        var n = left(), h = '';
        for (var i = 0; i < MAX; i++) h += '<span class="lf' + (i < n ? '' : ' gone') + (i === justLost ? ' just' : '') + '">' + (i < n ? art.heart : art.empty) + '</span>';
        el.innerHTML = h + '<span class="l-lock" title="locked">' + art.lock + '</span>';
        el.setAttribute('aria-label', n + ' of ' + MAX + ' lives');
    }
    function say(t) {
        var d = document.createElement('div');
        d.className = 'lives-note';
        d.textContent = t;
        body.appendChild(d);
        setTimeout(function () { d.remove(); }, 3300);
    }
    // both found the dungeon, and done it once: they turn up
    function maybeShow() {
        if (shown() || get('dungeon-found') !== '1' || !(+get('suicides') > 0)) return;
        put('lives-shown', '1');
        put('lives-left', MAX);
        draw();
        el.classList.remove('arrive'); void el.offsetWidth; el.classList.add('arrive');
        sfx('lives-found', { or: 'chime' });
        setTimeout(function () { say('three lives. make them count.'); }, 400);
    }
    // the revolver on themselves: counted (the first one, once they've found the dungeon, brings the lives out)
    document.addEventListener('dav:traveller-shot', function () {
        put('suicides', (+get('suicides') || 0) + 1);
        if (!shown()) setTimeout(maybeShow, 3600);
    });
    // every death (the revolver, a fall, the toaster, the scissors …) costs a life,
    // but only once the lock's off (this reset's hidden key): until then they're safe
    function unlocked() { return get('lives-unlocked') === '1'; }
    // the way to die that's just been let through (refuse() below), so the death that follows can use it up for the reset
    var pending = null, lastDeath = 0;
    function kindOf(k) { return String(k || '').replace(/[^a-z0-9:-]/gi, ''); }
    function spent(kind) { return !!S && S.get('spent-' + kindOf(kind)) === '1'; }
    document.addEventListener('dav:traveller-died', function () {
        if (!(shown() && unlocked())) return;
        var now = Date.now();
        if (now - lastDeath < 4000) return;                           // (one death, one heart: never two for the same fall)
        lastDeath = now;
        if (pending && now - pending.at < 30000 && S) S.set('spent-' + kindOf(pending.kind), '1');
        pending = null;
        lose(300);
    });
    var resetting = false;
    function lose(after) {
        if (resetting) return;
        var n = left() - 1;
        put('lives-left', Math.max(0, n));
        setTimeout(function () {
            draw(Math.max(0, n));
            sfx('life-lost', { or: 'crack' });
            if (n > 0) { say(n === 1 ? 'one life left.' : n + ' lives left.'); return; }
            // the last one: everything goes
            resetting = true;
            say('no lives left.');
            setTimeout(function () {                                   // and on to the next reset (sky/state.js, sky/forget.js)
                if (Sky.stay && Sky.stay.reset) Sky.stay.reset();
                else if (window.davSave) { window.davSave.nextReset(); location.reload(); }
            }, 2600);
        }, after);
    }
    document.addEventListener('dav:dungeon-found', function () { maybeShow(); });
    // from reset 2: there from the first page of the reset
    if (ALWAYS && get('lives-shown') !== '1') {
        put('lives-shown', '1');
        if (get('lives-left') === null) put('lives-left', MAX);
        draw();
        el.classList.remove('arrive'); void el.offsetWidth; el.classList.add('arrive');
    }
    draw();
    // a way to die, tried before the key (from reset 2): it doesn't happen, and the traveller says why
    var saidAt = 0;
    // (and once the key's found: a way to die that's already cost a heart this reset is off too, with its own line)
    function refuse(kind) {
        var counts = shown() && unlocked(), base = String(kind || '').split(':')[0];
        if (counts && kind !== 'revolver' && spent(kind)) return no(DONE[base] || DONE.placeholder);
        if (!ALWAYS || unlocked()) {
            if (counts && kind !== 'revolver') pending = { kind: kind, at: Date.now() };
            return false;
        }
        return no(NOT_YET[base] || NOT_YET.placeholder);
    }
    function no(line) {
        var now = Date.now();
        if (now - saidAt > 2500) {
            saidAt = now;
            document.querySelectorAll('.mc-say').forEach(function (b) { b.remove(); });   // (this matters more than whatever they were saying)
            if (Sky.claubes && Sky.claubes.speak) Sky.claubes.speak(line, null, { hold: 1800 });
            else if (Sky.inventory && Sky.inventory.say) Sky.inventory.say(line, 3000);
            var lk = el.querySelector('.l-lock');                           // (and the lock on the hearts gives a little shake)
            if (lk) { lk.classList.remove('rattle'); void lk.offsetWidth; lk.classList.add('rattle'); }
        }
        return true;
    }

    Sky.css('.lives .l-lock.rattle { animation: lock-rattle .5s ease-in-out; }' +
        '@keyframes lock-rattle { 0%, 100% { transform: none; } 20% { transform: rotate(-14deg); } 45% { transform: rotate(11deg); } 70% { transform: rotate(-6deg); } }' +
        '.lives .l-lock.popping { animation: lock-pop .8s ease-in forwards; }' +
        '@keyframes lock-pop { 0% { transform: none; } 30% { transform: translateY(-6px) rotate(-12deg); } 100% { transform: translate(14px, 40px) rotate(70deg); opacity: 0; } }');
    Sky.lives = {
        get left() { return left(); }, get shown() { return shown(); }, get unlocked() { return unlocked(); },
        // the key (sky/resets.js): the lock comes off, and from now on they can die for real
        unlock: function () {
            if (unlocked()) return;
            put('lives-unlocked', '1');
            var lk = el.querySelector('.l-lock');
            if (lk && shown()) { lk.classList.add('popping'); setTimeout(draw, 800); } else draw();
        },
        // the revolver only fires on the last heart (once the lock's off: until then it's a free death)
        get jammed() { return shown() && unlocked() && left() > 1; },
        // on the last heart, the revolver doesn't kill them: it ends the reset, there and then
        get last() { return shown() && unlocked() && left() === 1; },
        // from reset 2, until the key: every way to die is off (true = refused, and the traveller's said why)
        get locked() { return ALWAYS && !unlocked(); },
        refuse: refuse,
        final: function () {
            if (resetting) return;
            resetting = true;
            put('lives-left', 0);
            draw(0);
            if (Sky.stay && Sky.stay.reset) Sky.stay.reset();
            else if (window.davSave) { window.davSave.nextReset(); location.reload(); }
        },
        give: function (k) { put('lives-left', Math.min(MAX, left() + (k || 1))); draw(); }
    };
})();

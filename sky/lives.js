/* =====================================================================
   lives.js — one life (one heart). Nobody sees it at first in reset 1: it turns
   up (top left, locked) once a visitor has both found the dungeon and turned the
   revolver on themselves. It's locked: nothing's taken until the visitor has found
   this reset's hidden key (sky/resets.js calls Sky.lives.unlock()). From then on
   this reset's one death (sky/state.js, RESETS[n].deaths: the revolver in reset 1,
   the boat in 2, skizy's pills in 3, the false god's bullet in 4 …) takes the heart
   (sky/gore.js tells it, 'dav:traveller-died'), and the world resets: on to the
   next reset (sky/state.js).

   FROM RESET 2 ON the heart's there from the start (locked), and the reset's death
   is off until the key's found: try it and the traveller says why not (NOT_YET below).
   (Reset 1 is as before: the revolver's a free death until the key, and the heart
   turns up after the dungeon and the revolver.) From reset 2 the ordinary revolver
   only ever jams on the traveller (sky/revolver.js).

   Kept in the visitor's browser between visits (localStorage), until the next reset.
   slots: assets/ui/heart (the life), assets/ui/heart-empty (lost),
          assets/ui/lives-lock (the lock on it), assets/ui/lives-frame (behind it)
   sounds: assets/sounds/lives-found (the page makes a chime until then)
   A death that takes the heart is instant (27 Sep, Victor): straight into the reset's white-out, "No more lives
   left" written on it (sky/forget.js). Deaths that don't count (before the key) bring the traveller back.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.lives) return;
    var MAX = 1;                                        // one heart: each reset has one death
    var body = document.body, S = window.davSave;
    var ALWAYS = !!S && S.reset >= 2 && S.reset < 8;    // from reset 2: the hearts are always there, and locked till the key
    // (reset 8: no heart at all. there's nothing left to kill there: its way on is knowing, sky/gnosis.js)
    if (S && S.reset >= 8) { Sky.lives = { left: 1, shown: false, unlocked: false, jammed: false, last: false, locked: false, counts: false,
        unlock: function () {}, refuse: function () { return false; }, final: function () {}, give: function () {} }; return; }
    // what the traveller says trying a way to die before the key's found (from reset 2)
    var NOT_YET = {
        revolver:    'My finger won’t pull the trigger. Not yet. Something here is still hidden.',
        boat:        'My arms won’t let go of it. Not yet. I haven’t found it yet, whatever it is.',
        pills:       'I can’t make myself swallow them. Not yet. Something here is still hidden.',
        grimoire:    'My hand stops above the page. It won’t let me sign. Not yet.',
        diagram:     'The circle drinks the bullet… and waits. It isn’t time yet.',
        // (5 Oct: resets 5 to 7. each one points at where its key is)
        veil:        'A corner of the sky’s come unstuck. My hand won’t pull it. Not yet. …The wallpaper at home was peeling too.',
        gaze:        'It shuts the moment I meet it. Not yet. …There was one in the hallway that never blinked.',
        timer:       'I know how this ends. I’ve watched it end a hundred times. Not yet. …Something in the kitchen keeps its own time.',
        placeholder: 'Not yet. There’s something I have to find first.'
    };
    // each way to die costs a heart once a reset. tried again after that, it doesn't happen, and the traveller says why
    var DONE = {
        boat:        'Not the boat again. It didn’t stick the first time.',
        pills:       'Not again. It didn’t take the first time.',
        grimoire:    'The pact’s already made. The book has nothing more to ask.',
        diagram:     'The circle already took what it wanted.',
        veil:        'It stitched itself shut behind me.',
        gaze:        'It’s already seen me. That was enough.',
        timer:       'The hands won’t move. It already ran out.',
        placeholder: 'Not that one again. It has to be something else.'
    };
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function put(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
    var sfx = Sky.sfx;

    var HEART = '<svg viewBox="0 0 20 18" aria-hidden="true"><path d="M10 17 L2.5 9.5 Q-.5 6 2 3 Q5 0 8 2.5 L10 4.5 L12 2.5 Q15 0 18 3 Q20.5 6 17.5 9.5 Z" fill="#d11f33" stroke="#5a0a12" stroke-width="1"/>' +
        '<path d="M5 4 Q3.5 5 4 7" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/></svg>';
    var EMPTY = '<svg viewBox="0 0 20 18" aria-hidden="true"><path d="M10 17 L2.5 9.5 Q-.5 6 2 3 Q5 0 8 2.5 L10 4.5 L12 2.5 Q15 0 18 3 Q20.5 6 17.5 9.5 Z" fill="#2a1d1f" stroke="#5a4a4c" stroke-width="1"/>' +
        '<path d="M10 4.5 L8.6 8 L11 10 L9 13" stroke="#5a4a4c" stroke-width="1" fill="none"/></svg>';
    var LOCK = '<svg viewBox="0 0 20 24" aria-hidden="true"><path d="M5 10 V7 A5 5 0 0 1 15 7 V10" fill="none" stroke="#9aa0a8" stroke-width="2.6"/>' +
        '<rect x="2" y="10" width="16" height="12" rx="2" fill="#c49a52" stroke="#6e4a10" stroke-width="1"/><circle cx="10" cy="15" r="2" fill="#3a2716"/><path d="M10 16 V19" stroke="#3a2716" stroke-width="1.6"/></svg>';

    // (its look is in sky/css/lives.css, linked from each page's head)

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
        el.setAttribute('aria-label', MAX === 1 ? (n ? 'your life' : 'no life left') : n + ' of ' + MAX + ' lives');
    }
    var GONE = 'No more lives left';                                   // what it says as the last one goes (Victor's words)
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
        setTimeout(function () { say('one life. make it count.'); }, 400);
    }
    // the revolver on themselves: counted (the first one, once they've found the dungeon, brings the lives out)
    document.addEventListener('dav:traveller-shot', function () {
        put('suicides', (+get('suicides') || 0) + 1);
        if (!shown()) setTimeout(maybeShow, 3600);
    });
    // this reset's death costs the heart,
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
        lose();
    });
    // the heart goes, and the world with it, there and then (27 Sep, Victor: an instant death, straight into the reset's
    // white-out, "No more lives left" written on it; no breaking heart, no wait)
    var resetting = false;
    function lose() {
        if (resetting) return;
        var n = left() - 1;
        put('lives-left', Math.max(0, n));
        draw();
        if (n > 0) { say(n === 1 ? 'one life left.' : n + ' lives left.'); return; }
        endReset();
    }
    function endReset() {
        resetting = true;
        put('lives-left', 0);
        draw();
        if (Sky.stay && Sky.stay.reset) Sky.stay.reset(GONE);             // on to the next reset (sky/state.js, sky/forget.js)
        else if (window.davSave) { window.davSave.nextReset(); location.reload(); }
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
            Sky.speak.hush();                                              // (this matters more than whatever they were saying)
            Sky.speak(line, null, { hold: 1800 });
            var lk = el.querySelector('.l-lock');                           // (and the lock on the hearts gives a little shake)
            if (lk) { lk.classList.remove('rattle'); void lk.offsetWidth; lk.classList.add('rattle'); }
        }
        return true;
    }

    // (its look is in sky/css/lives.css, linked from each page's head)
    Sky.lives = {
        get left() { return left(); }, get shown() { return shown(); }, get unlocked() { return unlocked(); },
        // the key (sky/resets.js): the lock comes off, and from now on they can die for real
        unlock: function () {
            if (unlocked()) return;
            put('lives-unlocked', '1');
            var lk = el.querySelector('.l-lock');
            if (lk && shown()) { lk.classList.add('popping'); setTimeout(draw, 800); } else draw();
        },
        // the revolver only fires on the last heart (with one heart this never jams it)
        get jammed() { return shown() && unlocked() && left() > 1; },
        // on the last heart, the revolver doesn't kill them: it ends the reset, there and then
        get last() { return shown() && unlocked() && left() === 1; },
        // from reset 2, until the key: every way to die is off (true = refused, and the traveller's said why)
        get locked() { return ALWAYS && !unlocked(); },
        refuse: refuse,
        final: function () { if (!resetting) endReset(); },
        // a death now would take the heart (and end the reset): sky/gore.js doesn't bring them back for it
        get counts() { return shown() && unlocked(); },
        give: function (k) { put('lives-left', Math.min(MAX, left() + (k || 1))); draw(); }
    };
})();

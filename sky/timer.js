/* =====================================================================
   timer.js — a pomodoro timer on the workbench. Click it: focus for 25
   minutes, then a short break (a long one every 4th round). It rings when
   time's up, keeps going if you reload or wander off to another page, and
   shows the time left in the tab's title while it runs.

       <div class="furnish pomodoro" data-asset="assets/workshop/timer"
            data-focus="25" data-short="5" data-long="15" data-rounds="4"></div>
       <script src="sky/timer.js"></script>          (after sky/sky.js and sky/panel.js)

   slots:  assets/workshop/timer          the timer (a tomato, until then)
           assets/workshop/timer-running  shown while it's running (a GIF can tick)
           assets/workshop/timer-panel    the card the buttons sit on (stretched)
           assets/sounds/chime            the ring (.mp3 / .ogg; a little bell until then)
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var el = document.querySelector('.pomodoro');
    if (!Sky || !el) return;

    var MIN = 60000;
    var LEN = {
        focus: (+el.dataset.focus || 25) * MIN,
        short: (+el.dataset.short || 5) * MIN,
        long:  (+el.dataset.long || 15) * MIN
    };
    var ROUNDS = +el.dataset.rounds || 4;
    var NAMES = { focus: 'focus', short: 'short break', long: 'long break' };
    var KEY = 'pomodoro';

    Sky.css(
        '.pomodoro { aspect-ratio: 1; z-index: 3; cursor: pointer; filter: drop-shadow(0 4px 5px rgba(0,0,0,.4)); transition: transform .2s; }' +
        '.pomodoro:hover, .pomodoro:focus-visible { transform: translateY(-3px); outline: none; }' +
        '.pomodoro > svg, .pomodoro > .art, .pomodoro > .pomo-run { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }' +
        '.pomodoro > .pomo-run { display: none; }' +
        '.pomodoro.running.has-run > .pomo-run { display: block; }' +
        '.pomodoro.running.has-run > .art, .pomodoro.running.has-run > svg { visibility: hidden; }' +
        '.pomodoro .pomo-dial { transform-box: fill-box; transform-origin: 50% 50%; transition: transform .6s; }' +
        '.pomodoro.ringing { animation: pomo-ring .09s linear 14 alternate; }' +
        '@keyframes pomo-ring { from { transform: rotate(-7deg); } to { transform: rotate(7deg); } }' +
        '.pomodoro .pomo-badge { position: absolute; left: 50%; bottom: calc(100% + 4px); transform: translateX(-50%); white-space: nowrap; padding: 1px 8px; border-radius: 999px;' +
            'background: rgba(42,29,20,.85); color: #f3e6c2; font: italic .82rem/1.5 "IM Fell English", Georgia, serif; font-variant-numeric: tabular-nums; pointer-events: none;' +
            'opacity: 0; transition: opacity .25s; }' +
        '.pomodoro.running .pomo-badge, .pomodoro.done .pomo-badge, .pomodoro:hover .pomo-badge { opacity: 1; }' +
        // the card
        '.pomo-panel { position: fixed; z-index: 7; width: 300px; padding: 16px 18px 14px; color: #3a2716; text-align: center; font-family: "IM Fell English", Georgia, serif;' +
            'background: #eadcb9 var(--panel-art, none) center / 100% 100% no-repeat; box-shadow: 0 10px 24px rgba(0,0,0,.45), inset 0 0 30px rgba(120,80,30,.25);' +
            'transform-origin: 50% 100%; transform: scale(.9) translateY(8px); opacity: 0; visibility: hidden; transition: opacity .2s, transform .2s, visibility 0s .2s; }' +
        '.pomo-panel.has-art { box-shadow: none; }' +
        '.pomo-panel.open { opacity: 1; visibility: visible; transform: none; transition: opacity .2s, transform .2s; }' +
        '.pomo-panel .pp-modes { display: flex; gap: 4px; justify-content: center; margin-bottom: 6px; }' +
        '.pomo-panel button { white-space: nowrap; font: italic .88rem "IM Fell English", Georgia, serif; color: #3a2716; background: #f8f0dc; border: 1px solid rgba(110,82,54,.35); border-radius: 999px; padding: 4px 10px; cursor: pointer; }' +
        '.pomo-panel button:hover { background: #fff8e6; }' +
        '.pomo-panel .pp-modes button[aria-pressed=true] { background: #3a2716; color: #f3e6c2; border-color: #3a2716; }' +
        '.pomo-panel .pp-time { font: normal 3.2rem/1.1 "IM Fell English SC", Georgia, serif; font-variant-numeric: tabular-nums; letter-spacing: .02em; margin: 4px 0 2px; }' +
        '.pomo-panel .pp-what { font-style: italic; font-size: .9rem; color: #6e5236; min-height: 1.3em; }' +
        '.pomo-panel .pp-dots { margin: 6px 0 10px; letter-spacing: 4px; color: #9a3b1f; font-size: .9rem; }' +
        '.pomo-panel .pp-acts { display: flex; gap: 6px; justify-content: center; }' +
        '.pomo-panel .pp-acts .go { background: #9a3b1f; color: #f3e6c2; border-color: #9a3b1f; min-width: 86px; }' +
        '.pomo-panel .pp-acts .go:hover { background: #b24a28; }' +
        '.pomo-panel .pp-x { position: absolute; top: 4px; right: 6px; border: 0; background: none; font-size: 1.1rem; padding: 2px 6px; }'
    );

    // the stand-in: a tomato kitchen timer (a pomodoro, after all)
    el.insertAdjacentHTML('afterbegin', '<svg class="placeholder" viewBox="0 0 100 100" aria-hidden="true">' +
        '<ellipse cx="50" cy="58" rx="42" ry="36" fill="#b8402a"/>' +
        '<ellipse cx="38" cy="46" rx="14" ry="9" fill="#e06a4c" opacity=".55"/>' +
        '<path d="M8 60 Q50 72 92 60" fill="none" stroke="#7a2616" stroke-width="2" opacity=".6"/>' +
        '<g class="pomo-dial"><path d="M50 22 L46 30 L54 30 Z" fill="#f3e6c2"/></g>' +
        '<path d="M50 24 C44 14 34 14 30 18 C38 18 42 22 46 26 Z M50 24 C56 14 66 14 70 18 C62 18 58 22 54 26 Z M50 24 C48 16 50 10 56 8 C54 14 54 20 52 26 Z" fill="#4f7a3a"/>' +
        '<g fill="#3a2716" opacity=".75"><rect x="49" y="62" width="2" height="5"/><rect x="30" y="60" width="2" height="4"/><rect x="68" y="60" width="2" height="4"/></g>' +
        '</svg><span class="pomo-badge"></span>');
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', 'a pomodoro timer');
    var badge = el.querySelector('.pomo-badge');

    Sky.findAsset('assets/workshop/timer-running', function (url) {
        if (!url) return;
        var im = document.createElement('img');
        im.className = 'pomo-run'; im.src = url; im.alt = '';
        el.insertBefore(im, badge);
        el.classList.add('has-run');
    });

    var panel = document.createElement('div');
    panel.className = 'pomo-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'pomodoro timer');
    panel.innerHTML = '<button type="button" class="pp-x" aria-label="close">&times;</button>' +
        '<div class="pp-modes"><button type="button" data-mode="focus">focus</button><button type="button" data-mode="short">short break</button><button type="button" data-mode="long">long break</button></div>' +
        '<div class="pp-time">25:00</div><div class="pp-what"></div><div class="pp-dots"></div>' +
        '<div class="pp-acts"><button type="button" class="go">start</button><button type="button" class="reset">reset</button></div>';
    document.body.appendChild(panel);
    Sky.findAsset('assets/workshop/timer-panel', function (url) {
        if (!url) return;
        panel.style.setProperty('--panel-art', 'url("' + new URL(url, location.href).href + '")');
        panel.classList.add('has-art');
    });

    /* ---------------- state (kept in this browser, so it runs on while you're elsewhere) ---------------- */
    var st = { mode: 'focus', endAt: 0, left: LEN.focus, rounds: 0, done: false };
    try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && LEN[saved.mode]) st = saved; } catch (e) {}
    function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
    function running() { return !!st.endAt; }
    function remaining() { return running() ? Math.max(0, st.endAt - Date.now()) : st.left; }
    function fmt(ms) {
        var s = Math.ceil(ms / 1000), m = Math.floor(s / 60);
        return (m < 10 ? '0' : '') + m + ':' + ((s % 60) < 10 ? '0' : '') + (s % 60);
    }

    var title = document.title;
    function draw() {
        var ms = remaining();
        panel.querySelector('.pp-time').textContent = fmt(ms);
        panel.querySelectorAll('.pp-modes button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === st.mode)); });
        panel.querySelector('.go').textContent = running() ? 'pause' : (ms < LEN[st.mode] ? 'carry on' : 'start');
        panel.querySelector('.pp-what').textContent = st.done ? 'time’s up. ' + (st.mode === 'focus' ? 'back to it?' : 'take a breather.') :
            running() ? (st.mode === 'focus' ? 'focusing…' : 'on a break…') : '';
        var dots = '';
        for (var i = 0; i < ROUNDS; i++) dots += i < st.rounds % ROUNDS || (st.rounds && st.rounds % ROUNDS === 0 && st.mode === 'long') ? '●' : '○';
        panel.querySelector('.pp-dots').textContent = dots;
        badge.textContent = st.done ? 'time’s up!' : running() ? fmt(ms) : (ms < LEN[st.mode] ? 'paused ' + fmt(ms) : 'a timer');
        el.classList.toggle('running', running());
        el.classList.toggle('done', st.done);
        var dial = el.querySelector('.pomo-dial');
        if (dial) dial.style.transform = 'rotate(' + (-360 * ms / LEN[st.mode]).toFixed(1) + 'deg)';
        document.title = running() ? fmt(ms) + ' · ' + NAMES[st.mode] + ' · ' + title : title;
    }

    function ring(quiet) {
        var wasFocus = st.mode === 'focus';
        if (wasFocus) st.rounds++;
        st.mode = wasFocus ? (st.rounds % ROUNDS === 0 ? 'long' : 'short') : 'focus';
        st.endAt = 0;
        st.left = LEN[st.mode];
        st.done = true;
        save();
        draw();
        if (quiet) return;
        if (Sky.sounds) Sky.sounds.sfx('chime');
        el.classList.remove('ringing'); void el.offsetWidth; el.classList.add('ringing');
    }
    // a timer that ran out while you were away just shows it's done (no bell out of nowhere)
    if (running() && remaining() <= 0) ring(true);

    setInterval(function () {
        if (running() && remaining() <= 0) ring();
        if (running() || panel.classList.contains('open')) draw();
    }, 250);

    function start() { st.endAt = Date.now() + st.left; st.done = false; save(); draw(); }
    function pause() { st.left = remaining(); st.endAt = 0; save(); draw(); }
    function reset() { st.endAt = 0; st.left = LEN[st.mode]; st.done = false; save(); draw(); }
    function pick(mode) { st.mode = mode; st.endAt = 0; st.left = LEN[mode]; st.done = false; save(); draw(); }

    panel.querySelector('.go').addEventListener('click', function () { running() ? pause() : start(); if (Sky.sounds) Sky.sounds.sfx('land', { size: 0.25 }); });
    panel.querySelector('.reset').addEventListener('click', function () {
        if (st.mode === 'focus' && !running() && st.left === LEN.focus) st.rounds = 0;   // reset twice: start the set over
        reset();
    });
    panel.querySelectorAll('.pp-modes button').forEach(function (b) { b.addEventListener('click', function () { pick(b.dataset.mode); }); });

    function place() {
        var r = el.getBoundingClientRect(), w = panel.offsetWidth || 300, h = panel.offsetHeight || 200;
        var left = Math.max(10, Math.min(window.innerWidth - w - 10, r.left + r.width / 2 - w / 2));
        var top = r.top - h - 14;
        if (top < 10) top = Math.min(window.innerHeight - h - 10, r.bottom + 14);
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
    }
    function open() { draw(); place(); panel.classList.add('open'); }
    function close() { if (!panel.classList.contains('open')) return; panel.classList.remove('open'); if (st.done) { st.done = false; save(); } draw(); }
    el.addEventListener('click', function () { panel.classList.contains('open') ? close() : open(); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    panel.querySelector('.pp-x').addEventListener('click', close);
    document.addEventListener('click', function (e) { if (panel.classList.contains('open') && !panel.contains(e.target) && !el.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', function () { if (panel.classList.contains('open')) place(); });
    draw();
})();

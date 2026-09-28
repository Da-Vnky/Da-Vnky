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

    // (its look is in sky/css/timer.css, linked from each page's head)

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
        Sky.sfx('chime');
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

    panel.querySelector('.go').addEventListener('click', function () { running() ? pause() : start(); Sky.sfx('land', { size: 0.25 }); });
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
    Sky.escape(function () { return panel.classList.contains('open'); }, close);
    window.addEventListener('resize', function () { if (panel.classList.contains('open')) place(); });
    draw();
})();

/* =====================================================================
   loop.js — reset 7, the loop: time is the cage; it has always been the
   same day (5 Oct). the outermost sphere, Saturn's, the old god of time who
   eats his children. the third of the resets where the world shows what it
   is (sky/veil.js has the plan).

     the skips     every minute or two, on any page, the world skips: a jolt, a hiss of
                   static, as if the same moment had come round twice.
                   sound: assets/sounds/skip (a stand-in until yours)
     the key       reset 7, the kitchen: run the microwave. it counts up instead of
                   down, and when it's done the key's on the plate (sky/kitchen.js).
     the timer     reset 7, the workshop: once the key's found, start the timer. it
                   doesn't count minutes: it counts everything. days, then years, race
                   past the window, the traveller grows old where they stand and
                   crumbles into sand. that's the reset's death. from reset 8 it
                   has no hands.
                   slots: assets/workshop/timer-racing (the timer while it races; a GIF
                   can spin), assets/workshop/sand (the little heap that's left of them)
                   sounds: time-rush (the years going by), crumble (the sand)

   its look: sky/css/loop.css
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    if (!Sky || !S || Sky.loop) return;
    var body = document.body, R = S.reset, sfx = Sky.sfx;
    var PAGE = (location.pathname.replace(/.*\//, '').replace(/\.html$/, '') || 'index').replace(/^index$/, 'sea');
    function say(t, ms) { Sky.say(t, ms || 2800); }

    /* ---------------- the skips (reset 7) ---------------- */
    if (R === 7) {
        var skip = function () {
            setTimeout(skip, 50000 + Math.random() * 60000);
            if (document.hidden || body.classList.contains('cutscene')) return;
            var html = document.documentElement;
            html.classList.remove('loop-skip'); void html.offsetWidth; html.classList.add('loop-skip');
            setTimeout(function () { html.classList.remove('loop-skip'); }, 560);
            if (Sky.staticNoise && Sky.staticNoise.burst) Sky.staticNoise.burst(0.45, 380);
            sfx('skip', { or: 'blip', size: 0.4, volume: 0.6 });
        };
        setTimeout(skip, 20000 + Math.random() * 30000);
    }

    /* ---------------- the workshop's timer (reset 7: the death; 8: no hands) ---------------- */
    var panel = document.querySelector('.pomo-panel'), timer = document.querySelector('.pomodoro');
    if (PAGE !== 'workshop' || !panel || !timer || R < 7) { Sky.loop = {}; return; }
    if (R > 7) timer.classList.add('no-hands');
    var racing = false;
    document.addEventListener('click', function (e) {
        var go = e.target.closest && e.target.closest('.pomo-panel .go');
        if (!go || timer.classList.contains('running')) return;           // (pausing a running one: as ever)
        e.preventDefault(); e.stopImmediatePropagation();
        if (racing) return;
        if (R > 7) { say('It has no hands any more. There’s no time left to count.', 3000); return; }
        if (Sky.lives && Sky.lives.refuse('timer')) return;
        race();
    }, true);

    // how long, in words, for a number of seconds that won't stop growing
    function words(sec) {
        var Y = 31557600;
        if (sec < 3600) { var m = Math.floor(sec / 60), s = Math.floor(sec % 60); return m + ':' + (s < 10 ? '0' : '') + s; }
        if (sec < 86400) return Math.floor(sec / 3600) + ' hours';
        if (sec < Y) return Math.floor(sec / 86400) + ' days';
        if (sec < Y * 1e6) return Math.floor(sec / Y).toLocaleString('en') + ' years';
        if (sec < Y * 1e9) return Math.floor(sec / Y / 1e6) + ' million years';
        return '∞';
    }
    function race() {
        var ch = document.querySelector('.room .scene-character');
        if (!ch || !Sky.gore) return;
        racing = true;
        body.classList.add('cutscene', 'loop-racing');
        timer.classList.add('racing');
        var time = panel.querySelector('.pp-time'), what = panel.querySelector('.pp-what');
        if (what) what.textContent = 'it isn’t counting minutes.';
        sfx('time-rush', { or: 'dread' });
        var t0 = performance.now(), MS = 6500, lastHold = 0;
        (function frame(now) {
            var k = Math.min(1, (now - t0) / MS), sec = 1500 * Math.pow(10, k * 11.5);
            if (time) time.textContent = words(sec);
            // the window: day, night, day, night, faster and faster
            if (Sky.holdTime && now - lastHold > 30) { lastHold = now; Sky.holdTime((1 - Math.cos((now - t0) / 1000 * (2 + k * 18))) / 2, 1); }
            if (k < 1) requestAnimationFrame(frame);
        })(t0);
        setTimeout(function () { ch.classList.add('ageing'); }, 1200);
        setTimeout(function () { say('My hands. Look at my hands.', 2200); }, 2600);
        setTimeout(function () {
            panel.classList.remove('open');
            // the sand they come apart into, pouring down to a little heap
            var r = ch.getBoundingClientRect(), host = ch.offsetParent || body, hr = host.getBoundingClientRect();
            var heap = document.createElement('div');
            heap.className = 'loop-sand';
            heap.dataset.asset = 'assets/workshop/sand';
            heap.innerHTML = '<svg class="placeholder" viewBox="0 0 100 30" aria-hidden="true"><path d="M2 30 Q20 22 34 12 Q50 2 66 12 Q80 22 98 30 Z" fill="#b8a27a"/><path d="M30 16 Q50 6 70 16" stroke="#d6c39a" stroke-width="2" fill="none"/></svg>';
            heap.style.left = (r.left - hr.left + r.width * 0.15) + 'px'; heap.style.width = (r.width * 0.7) + 'px';
            heap.style.top = (r.bottom - hr.top - r.width * 0.21) + 'px';
            host.appendChild(heap);
            if (Sky.fillAssets) Sky.fillAssets(host);
            ch.classList.add('crumbling');
            sfx('crumble', { or: 'wall-slide' });
            var n = 0, pour = setInterval(function () {
                var b = ch.getBoundingClientRect(), g = document.createElement('div');
                g.className = 'loop-grain';
                var x = b.left + b.width * (0.2 + Math.random() * 0.6), y = b.top + b.height * (0.15 + Math.random() * 0.6);
                g.style.left = x + 'px'; g.style.top = y + 'px';
                body.appendChild(g);
                g.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + (Math.random() * 20 - 10) + 'px,' + (r.bottom - y) + 'px)', opacity: 0.2 }],
                          { duration: 500 + Math.random() * 500, easing: 'cubic-bezier(.5,0,1,1)', fill: 'forwards' }).onfinish = function () { g.remove(); };
                if (++n > 70) clearInterval(pour);
            }, 30);
            heap.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 2200, easing: 'ease-out', fill: 'forwards' });
        }, 5200);
        setTimeout(function () {
            ch.classList.remove('ageing', 'crumbling');
            ch.classList.add('gore-hidden');
            if (Sky.releaseTime) Sky.releaseTime();
            Sky.gore.respawn(ch);                                           // (the reset's death: sky/lives.js)
            setTimeout(function () { body.classList.remove('cutscene', 'loop-racing'); timer.classList.remove('racing'); racing = false; }, 2500);
        }, 7900);
    }

    Sky.loop = { get racing() { return racing; } };
})();

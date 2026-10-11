/* =====================================================================
   forget.js — "Forget your stay… (Clear cache)", in the control panel, and
   the moment a reset happens.
   It asks first, then forgets everything: the site's copy of itself in the
   visitor's browser (sky/loader.js) and everything they've done here (which
   reset they're in, the hearts, the P(Doom) record, skizy's scare, the settings:
   sky/state.js). The white, and then the homepage, as a brand-new visitor.
   A reset (sky/lives.js, when the last heart goes) looks the same: a flashbang,
   the world goes white and shows what it really is, and then it starts again,
   one reset on, back at the beginning: the homepage, the sea (Sky.stay.reset()).

   THE RESET MANAGER (only in your preview, on your own computer: never on the
   live site): a "resets" layer in the control panel. The next reset, or straight
   to any reset 1-8, or starting over as a brand-new visitor: each one plays the
   reset exactly as a visitor would see it, and starts again at the homepage.

   slots: assets/ui/forget-screen (what the white turns into: the wireframe world;
          full screen, covers it), assets/ui/reset-screen (the same, for a reset;
          the forget screen if you leave it out), assets/ui/stay (the panel icon)
   sound: assets/sounds/flashbang
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || !Sky.panel || Sky.stay) return;
    var sfx = Sky.sfx;
    var ICON = '<svg class="placeholder" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3 H18 M6 21 H18 M7 3 C7 9 11 10 12 12 C11 14 7 15 7 21 M17 3 C17 9 13 10 12 12 C13 14 17 15 17 21"' +
        ' fill="none" stroke="#3a2716" stroke-width="1.8" stroke-linecap="round"/><path d="M9 19 C10 16 14 16 15 19 Z" fill="#9a3b1f"/></svg>';

    // (its look is in sky/css/forget.css, linked from each page's head)

    // the stand-in for what's under the white: a wireframe world, grey lines on white
    function wireframe() {
        var g = '';
        for (var i = -12; i <= 12; i++) g += '<path d="M' + (500 + i * 30) + ' 500 L' + (500 + i * 170) + ' 1000"/>';
        for (var j = 0; j < 12; j++) { var y = 500 + Math.pow(j / 11, 2.2) * 500; g += '<path d="M0 ' + y.toFixed(0) + ' H1000"/>'; }
        var sph = '';
        for (var k = 1; k < 6; k++) sph += '<ellipse cx="500" cy="300" rx="' + (k * 26) + '" ry="140"/><ellipse cx="500" cy="300" rx="140" ry="' + (k * 26) + '"/>';
        return '<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="1000" height="1000" fill="#fff"/>' +
            '<g fill="none" stroke="#b8bcc4" stroke-width="1.2">' + g + '<path d="M0 500 H1000" stroke="#8a9098"/></g>' +
            '<g fill="none" stroke="#9aa0a8" stroke-width="1.2">' + sph + '<circle cx="500" cy="300" r="140"/></g>' +
            '<g fill="none" stroke="#c8ccd2" stroke-width="1"><path d="M160 500 V330 L260 280 V450 Z M260 280 L300 300 V470 L260 450 M160 330 L200 350 L300 300"/>' +
            '<path d="M760 500 V360 L840 330 L900 360 V500 M760 360 L820 390 L900 360 M820 390 V500"/></g></svg>';
    }

    // the white, the world under it, and then the page again
    // where a reset starts again: the homepage (found next to this script, so it works from any page)
    var HOME = (function () {
        var me = document.querySelector('script[src*="sky/forget.js"]');
        try { return new URL('../index.html', me ? me.src : location.href).href; } catch (e) { return 'index.html'; }
    })();
    // phrase (5 Oct, Victor): what the reset's death leaves them with, written on the white under the caption (sky/state.js
    // RESETS[n].phrase): the white holds a little longer, to read it
    function whiteOut(slot, caption, work, to, phrase) {
        var w = document.createElement('div');
        w.className = 'forget-white';
        w.innerHTML = '<div class="fw-world">' + wireframe() + '</div>' + (caption ? '<div class="fw-caption">' + caption + '</div>' : '') +
            (phrase ? '<div class="fw-phrase"></div>' : '');
        if (phrase) w.querySelector('.fw-phrase').textContent = phrase;
        document.body.appendChild(w);
        Sky.findAsset(slot, function (url) {
            if (!url) return;
            var box = w.querySelector('.fw-world');
            if (/\.(mp4|webm)$/i.test(url)) { box.innerHTML = '<video muted autoplay playsinline loop></video>'; box.querySelector('video').src = url; }
            else box.innerHTML = '<img alt="" src="' + url + '">';
        });
        sfx('flashbang');
        if (Sky.music && Sky.music.stop) Sky.music.stop();
        requestAnimationFrame(function () { w.classList.add('on'); });
        var job = work();
        setTimeout(function () {
            job.then(function () { location.replace(to || location.pathname + location.search); });
        }, phrase ? 6800 : 3400);
    }
    function wipe() {
        try { localStorage.clear(); } catch (e) {}
        try { sessionStorage.clear(); } catch (e) {}
        var S = window.davSave;
        return window.davForget ? window.davForget() : S && S.clearCache ? S.clearCache() : Promise.resolve();
    }
    function forget() { whiteOut('assets/ui/forget-screen', '', wipe, HOME); }
    var busy = false;
    // a reset: the white, the world under it, and then the homepage (how = what changes in the save, while it's white).
    // a death can ask for somewhere else to come to (localStorage "dav-wake-at", a page of the site, e.g. reset 3's
    // "living.html#porch": sky/resets.js skizyDeath). once only
    function wakeAt() {
        var w = null;
        try { w = localStorage.getItem('dav-wake-at'); localStorage.removeItem('dav-wake-at'); } catch (e) {}
        if (!w || !/^[a-z0-9-]+\.html(#[a-z0-9-]+)?$/i.test(w)) return HOME;
        try { return new URL(w, HOME).href; } catch (e) { return HOME; }
    }
    function reset(how, caption) {
        var S = window.davSave;
        if (busy) return;
        busy = true;
        var to = wakeAt();
        // going on to the next reset (not a jump in the reset manager): this reset's phrase, kept for good in "gnosis-phrases"
        // (the reset numbers whose phrase they've seen: the end, sky/gnosis.js)
        var phrase = typeof how !== 'function' && S && S.info && S.info.phrase;
        if (phrase) {
            try {
                var had = JSON.parse(localStorage.getItem('gnosis-phrases') || '[]');
                if (had.indexOf(S.reset) === -1) had.push(S.reset);
                localStorage.setItem('gnosis-phrases', JSON.stringify(had));
            } catch (e) {}
        }
        whiteOut('assets/ui/reset-screen|assets/ui/forget-screen', caption || '', function () {
            if (typeof how === 'function') return Promise.resolve(how());
            if (S) S.nextReset();
            return Promise.resolve();
        }, to, phrase || '');
    }

    /* ---------------- the reset manager: in your preview only ---------------- */
    var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    var RICON = '<svg class="placeholder" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12 A7 7 0 1 1 16.5 6.6" fill="none" stroke="#3a2716" stroke-width="1.9" stroke-linecap="round"/>' +
        '<path d="M13.5 3.2 L17.8 6.3 L13.9 9.6" fill="none" stroke="#9a3b1f" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.8" fill="#3a2716"/></svg>';
    // (its look is in sky/css/forget.css, linked from each page's head)
    if (LOCAL && window.davSave) Sky.panel.add({
        id: 'resets', title: 'resets (preview only)', order: 96, icon: RICON,
        build: function (body) {
            var S = window.davSave, n = S.reset, grid = '';
            for (var i = 1; i <= 8; i++) grid += '<button type="button" data-n="' + i + '"' + (i === n ? ' class="now"' : '') + '>' + (i === 8 ? '8 ?' : i) + '</button>';
            body.innerHTML = '<p class="cp-note">only here in your preview, never on the live site. each one plays the reset as a visitor sees it, then starts again at the sea.</p>' +
                '<button type="button" class="rm-next">the next reset</button>' +
                '<p class="cp-note">or start one from the beginning:</p><div class="rm-grid">' + grid + '</div>' +
                '<button type="button" class="rm-fresh">start over: a brand-new visitor</button>' +
                '<p class="cp-note">(a brand-new visitor forgets everything: the reset, the P(Doom) record, skizy\u2019s scare, your settings.)</p>';
            body.querySelector('.rm-next').addEventListener('click', function () { reset(); });
            body.querySelectorAll('.rm-grid button').forEach(function (b) {
                b.addEventListener('click', function () { var k = +b.dataset.n; reset(function () { S.goTo(k); }); });
            });
            body.querySelector('.rm-fresh').addEventListener('click', function () {
                reset(wipe);
            });
        },
        status: function () { return window.davSave ? 'reset ' + window.davSave.reset : ''; }
    });

    Sky.panel.add({
        id: 'stay', title: 'your stay', order: 95, icon: ICON,
        build: function (body) {
            body.innerHTML = '<p class="cp-note">this place remembers you between visits: a copy of itself, and all you\u2019ve done here. forget it, and you start again from the very beginning.</p>' +
                '<button type="button" class="stay-forget">Forget your stay… (Clear cache)</button>' +
                '<div class="stay-sure" hidden><p class="cp-note">forget everything? the copy, and all you’ve done here: the resets, the hearts, what you’ve found. you’ll start again from the very beginning.</p>' +
                '<button type="button" class="stay-yes">yes, forget it all</button> <button type="button" class="stay-no">no</button></div>';
            var b = body.querySelector('.stay-forget'), sure = body.querySelector('.stay-sure');
            b.addEventListener('click', function () { b.hidden = true; sure.hidden = false; });
            body.querySelector('.stay-no').addEventListener('click', function () { sure.hidden = true; b.hidden = false; });
            body.querySelector('.stay-yes').addEventListener('click', forget);
        },
        status: function () { return ''; }
    });

    Sky.stay = { forget: forget, reset: function (caption) { reset(null, caption); }, get resets() { return window.davSave ? window.davSave.reset : 1; } };
})();

/* =====================================================================
   forget.js — "Forget your stay… (Clear cache)", in the control panel, and
   the moment a reset happens.
   The button is only for when something's gone wrong: it asks first, then
   throws away the site's copy of itself in the visitor's browser (sky/loader.js)
   and starts the page again. What they've done in the game stays (which reset
   they're in, the P(Doom) record…: sky/state.js).
   A reset (sky/lives.js, when the last heart goes) looks the same: a flashbang,
   the world goes white and shows what it really is, and then it starts again,
   one reset on (Sky.stay.reset()).

   slots: assets/ui/forget-screen (what the white turns into: the wireframe world;
          full screen, covers it), assets/ui/reset-screen (the same, for a reset;
          the forget screen if you leave it out), assets/ui/stay (the panel icon)
   sound: assets/sounds/flashbang
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || !Sky.panel || Sky.stay) return;
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }
    var ICON = '<svg class="placeholder" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3 H18 M6 21 H18 M7 3 C7 9 11 10 12 12 C11 14 7 15 7 21 M17 3 C17 9 13 10 12 12 C13 14 17 15 17 21"' +
        ' fill="none" stroke="#3a2716" stroke-width="1.8" stroke-linecap="round"/><path d="M9 19 C10 16 14 16 15 19 Z" fill="#9a3b1f"/></svg>';

    Sky.css(
        '.stay-forget { display: block; width: 100%; margin: 6px 0 2px; padding: 9px 12px; border: 1px solid #3a2716; border-radius: 999px; background: #3a2716; color: #f3e6c2;' +
            'font: italic 1rem "IM Fell English", Georgia, serif; cursor: pointer; }' +
        '.stay-forget:hover, .stay-forget:focus-visible { background: #9a3b1f; outline: none; animation: stay-tremble .09s linear infinite; }' +
        '@keyframes stay-tremble { 0% { transform: translate(0, 0) rotate(0); } 25% { transform: translate(-1.5px, .5px) rotate(-.6deg); }' +
            '50% { transform: translate(1px, -1px) rotate(.5deg); } 75% { transform: translate(-.5px, 1px) rotate(-.3deg); } 100% { transform: translate(1.5px, 0) rotate(.6deg); } }' +
        '@media (prefers-reduced-motion: reduce) { .stay-forget:hover { animation: none; } }' +
        '.forget-white { position: fixed; inset: 0; z-index: 2147483600; background: #fff; opacity: 0; pointer-events: all; transition: opacity .08s; }' +
        '.forget-white.on { opacity: 1; }' +
        '.forget-white .fw-world { position: absolute; inset: 0; opacity: 0; transition: opacity 1.6s ease-in .5s; }' +
        '.forget-white.on .fw-world { opacity: 1; }' +
        '.forget-white .fw-world > svg, .forget-white .fw-world > img, .forget-white .fw-world > video { width: 100%; height: 100%; object-fit: cover; display: block; }' +
        '.forget-white .fw-caption { position: absolute; left: 0; right: 0; bottom: 12%; text-align: center; font: italic 1.4rem "IM Fell English", Georgia, serif; color: #6a7078; opacity: 0; transition: opacity 1s ease-in 1.4s; }' +
        '.forget-white.on .fw-caption { opacity: 1; }' +
        '.stay-sure { margin-top: 6px; } .stay-sure button { margin: 4px 4px 0 0; padding: 6px 14px; border-radius: 999px; border: 1px solid #3a2716; background: #f3e6c2; color: #3a2716; font: italic 1rem "IM Fell English", Georgia, serif; cursor: pointer; }' +
        '.stay-sure .stay-yes { background: #9a3b1f; border-color: #9a3b1f; color: #f3e6c2; }'
    );

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
    function whiteOut(slot, caption, work) {
        var w = document.createElement('div');
        w.className = 'forget-white';
        w.innerHTML = '<div class="fw-world">' + wireframe() + '</div>' + (caption ? '<div class="fw-caption">' + caption + '</div>' : '');
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
            job.then(function () { location.replace(location.pathname + location.search); });
        }, 3400);
    }
    function forget() { whiteOut('assets/ui/forget-screen', '', function () { return window.davForget ? window.davForget() : Promise.resolve(); }); }
    function reset() {
        var S = window.davSave;
        whiteOut('assets/ui/reset-screen|assets/ui/forget-screen', '', function () {
            if (S) S.nextReset();
            return Promise.resolve();
        });
    }

    Sky.panel.add({
        id: 'stay', title: 'your stay', order: 95, icon: ICON,
        build: function (body) {
            body.innerHTML = '<p class="cp-note">this place keeps a copy of itself with you, between visits. if something looks broken, forgetting it can help.</p>' +
                '<button type="button" class="stay-forget">Forget your stay… (Clear cache)</button>' +
                '<div class="stay-sure" hidden><p class="cp-note">forget the copy and start the page again? (what you’ve done here stays.)</p>' +
                '<button type="button" class="stay-yes">yes, forget it</button> <button type="button" class="stay-no">no</button></div>';
            var b = body.querySelector('.stay-forget'), sure = body.querySelector('.stay-sure');
            b.addEventListener('click', function () { b.hidden = true; sure.hidden = false; });
            body.querySelector('.stay-no').addEventListener('click', function () { sure.hidden = true; b.hidden = false; });
            body.querySelector('.stay-yes').addEventListener('click', forget);
        },
        status: function () { return ''; }
    });

    Sky.stay = { forget: forget, reset: reset, get resets() { return window.davSave ? window.davSave.reset : 1; } };
})();

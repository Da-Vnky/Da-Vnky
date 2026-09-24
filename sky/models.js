/* =====================================================================
   models.js — a shelf of 3D models. Each spot on the shelf is a slot:
       assets/workshop/model-1, model-2, model-3 …
   A model can be:
     • a video of it turning (the best way to show a real 3D model here):
       model-1.webm (with a see-through background) or model-1.mp4.
       From Blender: a turntable render, 2–4 seconds, looping, exported as
       WebM with VP9 + alpha ("RGBA"), about 400 x 400.
     • a GIF of it turning, or any picture: model-1.gif / .png / .webp / .svg
   Until then, a little wireframe stands in and slowly turns.
   Click one to see it up close.

       <div class="furnish model-shelf"> <div class="model" data-model="1" title="…"></div> … </div>
       <script src="sky/models.js"></script>          (after sky/sky.js)
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var shelf = document.querySelector('.model-shelf');
    if (!Sky || !shelf) return;
    var room = document.body.dataset.place || 'workshop';

    Sky.css(
        '.model-shelf { display: flex; align-items: flex-end; justify-content: space-around; padding: 0 2%; z-index: 2; }' +
        '.model-shelf .ms-board { position: absolute; left: 0; right: 0; bottom: -10px; height: 16px; pointer-events: none; z-index: -1; }' +
        '.model-shelf .ms-board > .art, .model-shelf .ms-board .placeholder { width: 100%; height: 100%; display: block; }' +
        '.model-shelf .model { position: relative; flex: none; height: 92%; width: auto; aspect-ratio: 1; cursor: zoom-in; filter: drop-shadow(0 4px 4px rgba(0,0,0,.4)); transition: transform .25s; }' +
        '.model-shelf .model:hover { transform: translateY(-3px); }' +
        '.model-shelf .model > .art, .model-shelf .model > video, .model-shelf .model .placeholder { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }' +
        '.model-shelf .model .placeholder { overflow: visible; }' +
        '.model-shelf .model .spin { transform-box: fill-box; transform-origin: 50% 50%; animation: model-turn 7s linear infinite; }' +
        '@keyframes model-turn { 0% { transform: scaleX(1); } 25% { transform: scaleX(.35); } 50% { transform: scaleX(-1); } 75% { transform: scaleX(-.35); } 100% { transform: scaleX(1); } }' +
        '.model-shelf .model .m-hint { position: absolute; left: 50%; bottom: calc(100% + 4px); transform: translateX(-50%); white-space: nowrap; font-style: italic;' +
            'font-size: .85rem; color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.7); opacity: 0; transition: opacity .25s; pointer-events: none; }' +
        '.model-shelf .model:hover .m-hint { opacity: 1; }' +
        '.model-zoom { position: fixed; inset: 0; z-index: 8; display: grid; place-items: center; padding: 60px 16px 24px; visibility: hidden; opacity: 0; cursor: zoom-out;' +
            'background: radial-gradient(ellipse at 50% 45%, rgba(58,39,22,.75), rgba(14,9,5,.95) 75%); transition: opacity .35s, visibility 0s .35s; font-family: "IM Fell English", Georgia, serif; }' +
        '.model-zoom.open { visibility: visible; opacity: 1; transition: opacity .35s; }' +
        '.model-zoom figure { margin: 0; text-align: center; color: #f3e6c2; font-style: italic; }' +
        '.model-zoom .mz-pic { width: min(70vw, 70vh); aspect-ratio: 1; margin: 0 auto 10px; position: relative; }' +
        '.model-zoom .mz-pic > * { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }' +
        'body.model-open .place-tabs, body.model-open .cp { opacity: 0; pointer-events: none; }' +
        '.model-zoom .spin { transform-box: fill-box; transform-origin: 50% 50%; animation: model-turn 7s linear infinite; }' +
        '.model-zoom .placeholder * { vector-effect: non-scaling-stroke; stroke-width: 2.5px; }' +
        '@media (prefers-reduced-motion: reduce) { .model-shelf .model .spin { animation: none; } }'
    );

    // stand-ins: a cube, a gem and a little bust, as wireframes
    var WIRE = [
        '<g class="spin" fill="none" stroke="#e7d6ae" stroke-width="1.6" stroke-linejoin="round"><path d="M20 34 L50 20 L80 34 L80 70 L50 84 L20 70 Z M20 34 L50 48 L80 34 M50 48 V84"/><path d="M20 70 L50 56 L80 70 M50 20 V56" opacity=".35" stroke-dasharray="3 3"/></g>',
        '<g class="spin" fill="none" stroke="#e7d6ae" stroke-width="1.6" stroke-linejoin="round"><path d="M50 14 L82 40 L50 88 L18 40 Z M18 40 H82 M50 14 L36 40 L50 88 L64 40 Z"/></g>',
        '<g class="spin" fill="none" stroke="#e7d6ae" stroke-width="1.6" stroke-linejoin="round"><ellipse cx="50" cy="34" rx="15" ry="18"/><path d="M50 16 V52 M35 34 H65"/><path d="M42 52 L40 60 Q50 64 60 60 L58 52" /><path d="M26 86 Q28 64 50 62 Q72 64 74 86 Z"/><path d="M50 62 V86" opacity=".5"/></g>'
    ];

    // the board they stand on
    var board = document.createElement('div');
    board.className = 'ms-board';
    board.dataset.asset = 'assets/' + room + '/model-shelf';
    board.innerHTML = '<svg class="placeholder" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="0" width="300" height="8" fill="#3b2618"/>' +
        '<path d="M26 8 L38 8 L30 16 Z M262 8 L274 8 L270 16 Z" fill="#3b2618"/></svg>';
    shelf.appendChild(board);

    var zoom = document.createElement('div');
    zoom.className = 'model-zoom';
    zoom.innerHTML = '<figure><div class="mz-pic"></div><figcaption></figcaption></figure>';
    document.body.appendChild(zoom);
    function close() { zoom.classList.remove('open'); document.body.classList.remove('model-open'); var v = zoom.querySelector('video'); if (v) v.pause(); }
    zoom.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && zoom.classList.contains('open')) close(); });

    shelf.querySelectorAll('.model[data-model]').forEach(function (m, i) {
        var n = m.dataset.model, base = 'assets/' + room + '/model-' + n, name = m.getAttribute('title') || 'a model';
        m.removeAttribute('title');
        m.setAttribute('role', 'button');
        m.setAttribute('tabindex', '0');
        m.setAttribute('aria-label', name);
        m.innerHTML = '<svg class="placeholder" viewBox="0 0 100 100" aria-hidden="true">' + WIRE[i % WIRE.length] + '</svg><span class="m-hint"></span>';
        m.querySelector('.m-hint').textContent = name;
        function video(url) {
            var v = document.createElement('video');
            v.src = url; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
            v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
            return v;
        }
        // a turning video first, then a picture (the usual slot: .svg .gif .webp .png .jpg)
        Sky.findAsset(base + '.webm|' + base + '.mp4', function (url) {
            if (url) { m.querySelector('.placeholder').replaceWith(video(url)); m.classList.add('has-art'); m._show = function () { return video(url); }; return; }
            m.dataset.asset = base;
            Sky.fillAssets(shelf);
        });
        function open() {
            var pic = zoom.querySelector('.mz-pic');
            pic.innerHTML = '';
            var own = m.querySelector('video, .art');
            pic.appendChild(m._show ? m._show() : own ? own.cloneNode(true) : m.querySelector('.placeholder').cloneNode(true));
            zoom.querySelector('figcaption').textContent = name;
            zoom.classList.add('open');
            document.body.classList.add('model-open');
        }
        m.addEventListener('click', open);
        m.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    Sky.fillAssets(shelf);
})();

/* =====================================================================
   frames.js — picture frames on the wall, holding art from the visitors'
   portfolio (content/workshop/visitors/). Which piece hangs in which frame
   is kept in content/living/frames.json, set from the content manager's
   "hang in" buttons (tools\content.bat):
       { "1": "2026-09-24-sunny-pond-by-bo.png", "2": "", "3": "" }
   (a name alone is from the visitors' folder; a path like content/workshop/cat.png
   works too). An empty frame shows its stand-in painting.

   Each frame is one line in the page, placed like any furniture:
       <div class="furnish gallery-frame" data-frame="1" data-look="gilt"
            style="left:33%; top:37%; width:7%"></div>
   data-look: gilt, wood, dark, white or plain (just a thin line)
   or your own colours:  style="--frame:#6e4a30; --frame-w:10%; --mat:#efe3c6; --mat-w:6%"
   --frame-w / --mat-w are the border and the mat, as a share of the frame's width;
   aspect-ratio: 1 (square) or 5 / 4 (landscape) changes its shape (4 / 5 is the default).
   Your own frame art: assets/living/frame (every frame) or assets/living/frame-1, frame-2 …
   (a PNG with a see-through middle; the painting sits in the middle 76% unless you set
   --inset on the frame, e.g. --inset: 14%). A frame of your own replaces the drawn border.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var frames = Array.prototype.slice.call(document.querySelectorAll('.gallery-frame[data-frame]'));
    if (!Sky || !frames.length) return;
    var FILE = 'content/living/frames.json', ART = 'content/workshop/visitors/';

    Sky.css(
        '.gallery-frame * { box-sizing: border-box; }' +
        '.gallery-frame { --frame: #2a1d14; --frame-w: 9%; --mat: #efe3c6; --mat-w: 7%; --inset: 12%; aspect-ratio: 4 / 5; z-index: 2; cursor: zoom-in;' +
            'filter: drop-shadow(0 6px 7px rgba(0,0,0,.42)); transition: transform .25s; transform: rotate(var(--tilt, 0deg)); }' +
        '.gallery-frame:hover { transform: rotate(var(--tilt, 0deg)) translateY(-2px); }' +
        '.gallery-frame .gf-border { position: absolute; inset: 0; padding: var(--frame-w); background: var(--frame);' +
            'box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), inset 0 0 12px rgba(0,0,0,.45); }' +
        '.gallery-frame .gf-mat { width: 100%; height: 100%; padding: var(--mat-w); background: var(--mat); box-shadow: inset 0 0 6px rgba(0,0,0,.35); }' +
        '.gallery-frame .gf-pic { width: 100%; height: 100%; overflow: hidden; background: #e9dbb8; }' +
        '.gallery-frame .gf-pic img { width: 100%; height: 100%; object-fit: cover; display: block; }' +
        '.gallery-frame .gf-pic svg { width: 100%; height: 100%; display: block; }' +
        // your own frame art: the painting sits in its middle, the art on top
        '.gallery-frame.has-art .gf-border { padding: var(--inset); background: none; box-shadow: none; }' +
        '.gallery-frame.has-art .gf-mat { padding: 0; background: none; box-shadow: none; }' +
        '.gallery-frame > .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; z-index: 1; pointer-events: none; }' +
        // the looks
        '.gallery-frame[data-look=gilt] { --frame: linear-gradient(135deg, #b8862e, #f0cf7a 30%, #9a6a1c 55%, #e6bd62 80%, #8a5a14); --mat: #f3ead2; }' +
        '.gallery-frame[data-look=wood] { --frame: repeating-linear-gradient(90deg, #6e4a30 0 3px, #7d5638 3px 7px, #6a462c 7px 9px); --mat: #efe3c6; }' +
        '.gallery-frame[data-look=dark] { --frame: #1c140e; --mat: #e9dbb8; }' +
        '.gallery-frame[data-look=white] { --frame: #f4efe4; --mat: #faf6ec; }' +
        '.gallery-frame[data-look=plain] { --frame: #2a1d14; --frame-w: 3%; --mat-w: 0%; }' +
        '.gallery-frame .gf-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap; font-style: italic;' +
            'font-size: .9rem; color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.7); opacity: 0; transition: opacity .25s; pointer-events: none; z-index: 2; }' +
        '.gallery-frame:hover .gf-hint, .gallery-frame:focus-visible .gf-hint { opacity: 1; }' +
        '.frame-zoom { position: fixed; inset: 0; z-index: 8; display: grid; place-items: center; padding: 60px 16px 24px; background: rgba(14,9,5,.9);' +
            'visibility: hidden; opacity: 0; transition: opacity .35s, visibility 0s .35s; cursor: zoom-out; font-family: "IM Fell English", Georgia, serif; }' +
        '.frame-zoom.open { visibility: visible; opacity: 1; transition: opacity .35s; }' +
        '.frame-zoom figure { margin: 0; text-align: center; color: #f3e6c2; font-style: italic; }' +
        '.frame-zoom img { display: block; max-width: 90vw; max-height: 78vh; margin: 0 auto 12px; background: #efe3c6; box-shadow: 0 16px 40px rgba(0,0,0,.6); }' +
        'body.frame-open .place-tabs, body.frame-open .cp { opacity: 0; pointer-events: none; }'
    );

    // the stand-in painting for an empty frame: a little landscape
    var STAND_IN = '<svg class="placeholder" viewBox="0 0 80 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
        '<rect width="80" height="100" fill="#e9dbb8"/><circle cx="56" cy="30" r="9" fill="#9a3b1f" opacity=".7"/>' +
        '<path d="M0 72 C20 58 32 66 46 56 C58 48 70 54 80 50 V100 H0 Z" fill="#6e5236" opacity=".5"/>' +
        '<path d="M0 84 C22 76 40 82 80 74 V100 H0 Z" fill="#3a2716" opacity=".35"/></svg>';

    function describe(name) {
        var base = name.replace(/^.*\//, '').replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}-\d{2}[-_ ]*/, '');
        var m = /^(.*?)[-_ ]by[-_ ](.+)$/i.exec(base);
        return { title: ((m ? m[1] : base).replace(/[-_]+/g, ' ').trim()) || 'untitled', by: m ? m[2].replace(/[-_]+/g, ' ').trim() : '' };
    }

    frames.forEach(function (f) {
        var n = f.dataset.frame;
        f.innerHTML = '<div class="gf-border"><div class="gf-mat"><div class="gf-pic">' + STAND_IN + '</div></div></div><span class="gf-hint"></span>';
        f.setAttribute('role', 'button');
        f.setAttribute('tabindex', '0');
        f.setAttribute('aria-label', 'a painting on the wall');
        f.querySelector('.gf-hint').textContent = 'an empty frame';
        // your own frame art: frame-<n> for this one, or frame for all of them
        Sky.findAsset('assets/living/frame-' + n, function (url) {
            if (url) return dress(url);
            Sky.findAsset('assets/living/frame', function (u2) { if (u2) dress(u2); });
        });
        function dress(url) {
            var im = document.createElement('img');
            im.className = 'art';
            im.src = url;
            im.alt = '';
            f.appendChild(im);
            f.classList.add('has-art');
        }
    });

    // what hangs where
    var zoom = document.createElement('div');
    zoom.className = 'frame-zoom';
    zoom.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure>';
    document.body.appendChild(zoom);
    function closeZoom() { zoom.classList.remove('open'); document.body.classList.remove('frame-open'); }
    zoom.addEventListener('click', closeZoom);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && zoom.classList.contains('open')) closeZoom(); });

    fetch(FILE, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }).then(function (map) {
        frames.forEach(function (f) {
            var name = map && typeof map[f.dataset.frame] === 'string' ? map[f.dataset.frame].trim() : '';
            if (!name) return;
            var url = name.indexOf('/') !== -1 ? name : ART + encodeURIComponent(name), d = describe(name);
            var im = new Image();
            im.onload = function () {
                var pic = f.querySelector('.gf-pic');
                pic.innerHTML = '';
                im.alt = d.title;
                pic.appendChild(im);
                f.querySelector('.gf-hint').textContent = d.title + (d.by ? ', by ' + d.by : '');
                f.setAttribute('aria-label', d.title + (d.by ? ', by ' + d.by : ''));
                function open() {
                    zoom.querySelector('img').src = url;
                    zoom.querySelector('figcaption').textContent = d.title + (d.by ? ', by ' + d.by : '');
                    zoom.classList.add('open');
                    document.body.classList.add('frame-open');
                }
                f.addEventListener('click', open);
                f.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
            };
            im.src = url;
        });
    });
})();

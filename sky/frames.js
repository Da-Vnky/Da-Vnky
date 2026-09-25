/* =====================================================================
   frames.js — picture frames on the walls. Each room keeps its own list of
   what hangs where, set from the content manager's "hang in" buttons
   (tools\content.bat):
       the living space: content/living/frames.json   (visitors' art)
       the workshop:     content/workshop/frames.json (your own paintings)
       { "1": "2026-09-24-sunny-pond-by-bo.png", "2": "", "3": "" }
   A name alone is from the room's own art folder (visitors' art for the living
   space, content/workshop/ for the workshop); a path like content/city/x.png
   works anywhere. An empty frame shows its stand-in painting.

   Each frame is one line in the page, placed like any furniture:
       <div class="furnish gallery-frame" data-frame="1" data-look="gilt"
            style="left:33%; top:37%; width:7%"></div>
   data-look: gilt, wood, dark, white or plain (just a thin line)
   or your own colours:  style="--frame:#6e4a30; --frame-w:10%; --mat:#efe3c6; --mat-w:6%"
   --frame-w / --mat-w are the border and the mat, as a share of the frame's width;
   aspect-ratio: 1 (square) or 5 / 4 (landscape) changes its shape (4 / 5 is the default).
   Your own frame art: assets/<room>/frame (every frame in that room) or
   assets/<room>/frame-1, frame-2 … (a PNG with a see-through middle; the painting
   sits in the middle 76% unless you set --inset on the frame, e.g. --inset: 14%).
   They swing gently to the music.

   More than one wall on a page: data-wall="shame" on a frame puts it on its own
   wall with its own list (content/shame/frames.json) and its own numbers; its frame
   art is assets/<room>/shame-frame (or shame-frame-1 …). The hall of shame in the
   bathroom works this way.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var frames = Array.prototype.slice.call(document.querySelectorAll('.gallery-frame[data-frame]'));
    if (!Sky || !frames.length) return;
    // each room keeps its own list: content/<room>/frames.json. a name alone is from the room's
    // own art folder (the living space: visitors' art; the workshop: your paintings); a path works anywhere
    var ROOM = document.body.dataset.place || 'living';
    // each wall: its list, and the folder a name alone is from
    var FOLDER = { living: 'content/workshop/visitors/', shame: 'content/workshop/visitors/', workshop: 'content/workshop/', claude: 'content/claude/' };
    function wallOf(f) { return f.dataset.wall || ROOM; }
    function listOf(wall) {
        var f = frames.filter(function (x) { return wallOf(x) === wall && x.dataset.list; })[0];
        return f ? f.dataset.list : 'content/' + wall + '/frames.json';
    }
    function folderOf(wall) {
        var f = frames.filter(function (x) { return wallOf(x) === wall && x.dataset.folder; })[0];
        return f ? f.dataset.folder : FOLDER[wall] || 'content/' + wall + '/';
    }

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
        // lux: the grandest frame there is. thick carved gold, bead mouldings, rosettes at the corners,
        // a crest on top, crimson velvet round the picture, and it gleams
        '.gallery-frame[data-look=lux] { --frame: linear-gradient(135deg, #6e4a10, #f7dc8a 14%, #b8862e 28%, #fff2c0 42%, #a8761e 56%, #f0cf7a 72%, #8a5a14 86%, #e6bd62);' +
            '--frame-w: 14%; --mat: radial-gradient(ellipse at 50% 40%, #8e1424, #4a0612 75%); --mat-w: 8%; filter: drop-shadow(0 10px 14px rgba(0,0,0,.6)) drop-shadow(0 0 18px rgba(255,200,90,.28)); }' +
        '.gallery-frame[data-look=lux] .gf-border { box-shadow: inset 0 0 0 2px #fff3c0, inset 0 0 0 4px #7a5212, inset 0 0 0 6px #f0cf7a, inset 0 0 0 8px #6e4a10,' +
            'inset 0 0 18px rgba(80,40,0,.55), 0 0 0 2px #5a3a0c, 0 0 0 4px #e6bd62; }' +
        '.gallery-frame[data-look=lux] .gf-border::before { content: ""; position: absolute; inset: 0; pointer-events: none;' +
            'background: radial-gradient(circle at 7% 7%, #fff6d0 0 2.2%, #c9962e 2.8% 5.2%, #6e4a10 5.8% 6.4%, transparent 7%),' +
            'radial-gradient(circle at 93% 7%, #fff6d0 0 2.2%, #c9962e 2.8% 5.2%, #6e4a10 5.8% 6.4%, transparent 7%),' +
            'radial-gradient(circle at 7% 93%, #fff6d0 0 2.2%, #c9962e 2.8% 5.2%, #6e4a10 5.8% 6.4%, transparent 7%),' +
            'radial-gradient(circle at 93% 93%, #fff6d0 0 2.2%, #c9962e 2.8% 5.2%, #6e4a10 5.8% 6.4%, transparent 7%),' +
            'repeating-linear-gradient(90deg, transparent 0 5px, rgba(110,74,16,.35) 5px 6px) 0 0 / 100% 3.5% no-repeat,' +
            'repeating-linear-gradient(90deg, transparent 0 5px, rgba(110,74,16,.35) 5px 6px) 0 100% / 100% 3.5% no-repeat; }' +
        '.gallery-frame[data-look=lux] .gf-mat { box-shadow: inset 0 0 0 2px #d8b060, inset 0 0 14px rgba(0,0,0,.6); }' +
        '.gallery-frame[data-look=lux]::before { content: ""; position: absolute; left: 50%; bottom: 98%; width: 34%; aspect-ratio: 2 / 1; transform: translateX(-50%); pointer-events: none;' +
            'background: radial-gradient(circle at 50% 70%, #fff2c0 0 12%, #d8a640 14% 26%, transparent 28%),' +
            'radial-gradient(ellipse at 22% 88%, #e6bd62 0 18%, transparent 20%), radial-gradient(ellipse at 78% 88%, #e6bd62 0 18%, transparent 20%),' +
            'linear-gradient(135deg, #8a5a14, #f7dc8a 45%, #b8862e); clip-path: polygon(0 100%, 12% 55%, 30% 70%, 50% 0, 70% 70%, 88% 55%, 100% 100%); }' +
        '.gallery-frame[data-look=lux]::after { content: ""; position: absolute; inset: -6%; pointer-events: none; border-radius: 8%;' +
            'background: linear-gradient(115deg, transparent 38%, rgba(255,246,210,.35) 46%, transparent 54%) -120% 0 / 250% 100% no-repeat; animation: lux-gleam 7s ease-in-out infinite; mix-blend-mode: screen; }' +
        '@keyframes lux-gleam { 0%, 70% { background-position: -120% 0; } 100% { background-position: 220% 0; } }' +
        '@media (prefers-reduced-motion: reduce) { .gallery-frame[data-look=lux]::after { animation: none; } }' +
        '.gallery-frame .gf-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap; font-style: italic;' +
            'font-size: .9rem; color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.7); opacity: 0; transition: opacity .25s; pointer-events: none; z-index: 2; }' +
        '.gallery-frame:hover .gf-hint, .gallery-frame:focus-visible .gf-hint { opacity: 1; }' +
        '.frame-zoom { position: fixed; inset: 0; z-index: 8; display: grid; place-items: center; padding: 60px 16px 24px; background: rgba(14,9,5,.9);' +
            'visibility: hidden; opacity: 0; transition: opacity .35s, visibility 0s .35s; cursor: zoom-out; font-family: "IM Fell English", Georgia, serif; }' +
        '.frame-zoom.open { visibility: visible; opacity: 1; transition: opacity .35s; }' +
        '.frame-zoom figure { margin: 0; text-align: center; color: #f3e6c2; font-style: italic; }' +
        '.frame-zoom img { display: block; max-width: 90vw; max-height: 78vh; margin: 0 auto 12px; background: #efe3c6; box-shadow: 0 16px 40px rgba(0,0,0,.6); }' +
        'body.frame-open .place-tabs, body.frame-open .cp { opacity: 0; pointer-events: none; }' +
        // with music on, they swing gently from their nails (in time with the song: see sky/music.js)
        'body.music-playing .gallery-frame { animation: frame-swing 1s ease-in-out infinite alternate; transform-origin: 50% -3%; }' +
        '@keyframes frame-swing { from { rotate: -1.6deg; } to { rotate: 1.6deg; } }' +
        '@media (prefers-reduced-motion: reduce) { body.music-playing .gallery-frame { animation: none; } }'
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

    frames.forEach(function (f, i) {
        var n = f.dataset.frame;
        f.style.animationDelay = (-i * 0.37).toFixed(2) + 's';      // each one swings a little out of step
        f.innerHTML = '<div class="gf-border"><div class="gf-mat"><div class="gf-pic">' + STAND_IN + '</div></div></div><span class="gf-hint"></span>';
        f.setAttribute('role', 'button');
        f.setAttribute('tabindex', '0');
        f.setAttribute('aria-label', 'a painting on the wall');
        f.querySelector('.gf-hint').textContent = 'an empty frame';
        // your own frame art: frame-<n> for this one, or frame for all of them
        var art = 'assets/' + ROOM + '/' + (wallOf(f) === ROOM ? '' : wallOf(f) + '-') + 'frame';
        Sky.findAsset(art + '-' + n, function (url) {
            if (url) return dress(url);
            Sky.findAsset(art, function (u2) { if (u2) dress(u2); });
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

    var walls = {};
    frames.forEach(function (f) { walls[wallOf(f)] = 1; });
    Object.keys(walls).forEach(function (wall) {
      var ART = folderOf(wall);
      fetch(listOf(wall), { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }).then(function (map) {
        frames.filter(function (f) { return wallOf(f) === wall; }).forEach(function (f) {
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
    });
})();

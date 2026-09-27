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

    // (its look is in sky/css/frames.css, linked from each page's head)

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

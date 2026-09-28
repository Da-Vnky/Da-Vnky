/* =====================================================================
   marker.js — the permanent marker (pick it up off the workshop's bench;
   it goes in your bag). Click it in the bag and you're drawing: on the
   room, the people, the paintings, the sky … whatever's in the scene.
   Esc (or clicking it in the bag again) stops. Ctrl+Z takes back the
   last line. What you draw stays on that scene for the rest of the visit,
   and is gone next time.

   slots: assets/workshop/marker (the marker itself, on the bench and in the bag)
          assets/ui/cursor-marker (the pointer while drawing: a small PNG, its tip
          top left; drawn one until then)
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || !Sky.inventory || Sky.marker) return;
    var body = document.body, I = Sky.inventory;
    var COLORS = ['#141414', '#b3261e', '#1f4fa8', '#1d7a3a', '#f0f0ea'];     // the colours in the cap tray (the first is the default)
    var WIDTH = 5;                                                                // the line, in px (on a 1000px-wide screen; it scales)
    var KEY = 'marker-drawings';

    // the drawn pointer: a marker held at a slant, its tip at the very top left (2, 2), which is where the line goes
    var CURSOR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
        '<path d="M2 2 L9 5 L5 9 Z" fill="#111" stroke="#fff" stroke-width="1" stroke-linejoin="round"/>' +
        '<path d="M8 4 L12 8 L8 12 L4 8 Z" fill="#1a1a1c" stroke="#fff" stroke-width="1" stroke-linejoin="round"/>' +
        '<path d="M11 7 L29 25 Q31 28 28 29 Q26 30 25 28 L7 11 Z" fill="#2a2a2e" stroke="#fff" stroke-width="1" stroke-linejoin="round"/>' +
        '<path d="M14 12 L23 21 L21 23 L12 14 Z" fill="#f3e6c2"/></svg>');
    var cursorUrl = CURSOR, hot = '2 2';
    Sky.findAsset('assets/ui/cursor-marker', function (url) { if (url) { cursorUrl = new URL(url, location.href).href; hot = '1 1'; setCursor(); } });

    // (its look is in sky/css/marker.css, linked from each page's head)

    var cv = document.createElement('canvas');
    cv.className = 'marker-layer';
    cv.setAttribute('aria-hidden', 'true');
    body.appendChild(cv);
    var g = cv.getContext('2d');
    var tray = document.createElement('div');
    tray.className = 'marker-tray';
    tray.setAttribute('aria-label', 'marker colours');
    tray.innerHTML = COLORS.map(function (c, i) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="colour ' + (i + 1) + '"></button>'; }).join('') +
        '<button type="button" class="mk-act" data-act="undo">undo</button><button type="button" class="mk-act" data-act="wipe">wipe</button>';
    body.appendChild(tray);

    var all = {};
    try { all = JSON.parse(sessionStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    var color = COLORS[0];
    try { color = sessionStorage.getItem('marker-color') || color; } catch (e) {}
    function save() { try { sessionStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {} }
    // each scene keeps its own drawings: this page, and (in the living space) which room of it
    function scene() { var w = Sky.house ? Sky.house.where() : 'living'; return location.pathname.replace(/.*\//, '') + '#' + (w === 'living' ? 'main' : w); }
    function lines() { var k = scene(); return all[k] || (all[k] = []); }

    var W = 0, H = 0, dpr = 1;
    function size() {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = window.innerWidth; H = window.innerHeight;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        redraw();
    }
    function stroke(l) {
        var p = l.p;
        if (!p.length) return;
        g.strokeStyle = l.c; g.fillStyle = l.c;
        g.lineWidth = l.w * W / 1000 * dpr;
        g.lineCap = 'round'; g.lineJoin = 'round';
        if (p.length < 4) { g.beginPath(); g.arc(p[0] * W * dpr, p[1] * H * dpr, g.lineWidth / 2, 0, 7); g.fill(); return; }
        g.beginPath();
        g.moveTo(p[0] * W * dpr, p[1] * H * dpr);
        for (var i = 2; i < p.length - 2; i += 2) {                  // smoothed through the midpoints
            var mx = (p[i] + p[i + 2]) / 2, my = (p[i + 1] + p[i + 3]) / 2;
            g.quadraticCurveTo(p[i] * W * dpr, p[i + 1] * H * dpr, mx * W * dpr, my * H * dpr);
        }
        g.lineTo(p[p.length - 2] * W * dpr, p[p.length - 1] * H * dpr);
        g.stroke();
    }
    function redraw() { g.clearRect(0, 0, cv.width, cv.height); lines().forEach(stroke); }
    size();
    window.addEventListener('resize', size);
    if (Sky.house) Sky.house.on(function () { redraw(); setTimeout(redraw, 950); });   // (a different room: its own drawings)

    /* ---------------- drawing ---------------- */
    var on = false, cur = null;
    function setCursor() { cv.style.cursor = 'url("' + cursorUrl + '") ' + hot + ', crosshair'; }
    setCursor();
    function showTray() { tray.querySelectorAll('button[data-c]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.c === color)); }); }
    showTray();
    I.onToggle('marker', function (v) {
        on = v;
        body.classList.toggle('marker-on', v);
        if (v) redraw();
    });
    cv.addEventListener('pointerdown', function (e) {
        if (!on) return;
        e.preventDefault();
        cv.setPointerCapture(e.pointerId);
        cur = { c: color, w: WIDTH, p: [e.clientX / W, e.clientY / H] };
        lines().push(cur);
        stroke(cur);
        Sky.sfx('brush', { size: 0.1 });
    });
    cv.addEventListener('pointermove', function (e) {
        if (!cur) return;
        var ev = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        ev.forEach(function (q) {
            var x = q.clientX / W, y = q.clientY / H, n = cur.p.length;
            if (Math.hypot((x - cur.p[n - 2]) * W, (y - cur.p[n - 1]) * H) < 2) return;
            cur.p.push(+x.toFixed(4), +y.toFixed(4));
        });
        redraw();
    });
    function end() { if (!cur) return; cur = null; save(); }
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    function undo() { var l = lines(); if (l.length) { l.pop(); save(); redraw(); } }
    tray.addEventListener('click', function (e) {
        e.stopPropagation();
        var b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.c) { color = b.dataset.c; try { sessionStorage.setItem('marker-color', color); } catch (x) {} showTray(); }
        if (b.dataset.act === 'undo') undo();
        if (b.dataset.act === 'wipe') { all[scene()] = []; save(); redraw(); }
    });
    document.addEventListener('keydown', function (e) {
        if (on && (e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); }
    });

    Sky.marker = { redraw: redraw, get on() { return on; } };
})();

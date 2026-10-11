/* =====================================================================
   moonlight.js — the moon's light through the house's windows (28 Sep,
   Victor: like skizy's apartment). By night, a soft glow round the window
   and a beam falling from it into the room, onto the floor, slanting away
   from wherever the moon is. By day, nothing. And where a room's window
   is only painted on (the kitchen's, the attic's round one), a hole is cut
   in the wall behind the glass so the site's real sky shows through it:
   the sun, the moon, the clouds, the stars, day and night.

       Sky.moonlight(host, {
           glass: function () { return the window's element },
           inset: [left, top, right, bottom],   the glass inside it (shares of its width / height)
           pad: px,                             or the same in pixels, all round (the living room's frame)
           round: true,                         a round window (the hole's a circle)
           cut: '.kitchen-wall, .kitchen > .art',   the wall's pictures, to cut the hole in (none: it's already open)
           slot: 'assets/living/kitchen-'       its pictures: <slot>moonlight, <slot>moonbeam
       })

   Its look: sky/css/moonlight.css. How bright: the sky's --night (0 by day, 1 at night) times --moon-up (1 while the
   moon's above the horizon); which way the beam slants: --moon-x (sky.js sets all three).
   Your own art: assets/living/moonlight / moonbeam (the living room), kitchen-moonlight / kitchen-moonbeam,
   attic-moonlight / attic-moonbeam: drawn light on black or see-through, screened over the room (only light adds).
   The glow's box is 2½ times the glass, centred on it; the beam's is the glass's width, from the glass down to
   the floor (it's slanted for you).
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.moonlight) return;
    var n = 0;

    // the stand-ins: a soft blue-white glow, and a beam fading as it falls, with the window's panes lit on the floor
    function glowArt(id) {
        return '<svg class="placeholder" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
            '<defs><radialGradient id="' + id + '"><stop offset="0" stop-color="#c4d4ff" stop-opacity=".55"/>' +
            '<stop offset=".45" stop-color="#9fb6f0" stop-opacity=".22"/><stop offset="1" stop-color="#8aa2e0" stop-opacity="0"/></radialGradient></defs>' +
            '<ellipse cx="50" cy="50" rx="50" ry="50" fill="url(#' + id + ')"/></svg>';
    }
    function beamArt(id) {
        return '<svg class="placeholder" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
            '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8d8ff" stop-opacity=".34"/>' +
            '<stop offset=".7" stop-color="#b4c8f4" stop-opacity=".13"/><stop offset=".9" stop-color="#b4c8f4" stop-opacity=".06"/></linearGradient></defs>' +
            '<rect x="0" y="0" width="100" height="90" fill="url(#' + id + ')"/>' +
            '<g fill="#d4e0ff" opacity=".32"><rect x="0" y="89" width="47" height="4.6"/><rect x="53" y="89" width="47" height="4.6"/>' +
            '<rect x="0" y="95.2" width="47" height="4.8"/><rect x="53" y="95.2" width="47" height="4.8"/></g></svg>';
    }

    function moonlight(host, o) {
        if (!host) return null;
        var k = ++n;
        var box = document.createElement('div');
        box.className = 'moonlight';
        box.setAttribute('aria-hidden', 'true');
        box.innerHTML = '<div class="ml-glow" data-asset="' + o.slot + 'moonlight">' + glowArt('ml-g' + k) + '</div>' +
                        '<div class="ml-beam" data-asset="' + o.slot + 'moonbeam">' + beamArt('ml-b' + k) + '</div>';
        host.appendChild(box);
        if (Sky.fillAssets) Sky.fillAssets(box);
        if (o.cut) {
            host.classList.add('ml-open', o.round ? 'ml-round' : 'ml-square');
            // (and the room darkens as night falls, like the living space does, so the moon's light shows)
            var dark = document.createElement('div');
            dark.className = 'ml-dark';
            dark.setAttribute('aria-hidden', 'true');
            host.insertBefore(dark, box);
        }

        // where the glass is, in the host (px): --gx --gy --gw --gh (and --gr, a round one's radius)
        function fit() {
            var g = o.glass();
            if (!g) return;
            var r = g.getBoundingClientRect(), hr = host.getBoundingClientRect();
            if (!r.width || !hr.width) return;
            var ins = o.inset || [0, 0, 0, 0], pad = o.pad || 0;
            var x = r.left - hr.left + r.width * ins[0] + pad, y = r.top - hr.top + r.height * ins[1] + pad;
            var w = r.width * (1 - ins[0] - ins[2]) - 2 * pad, h = r.height * (1 - ins[1] - ins[3]) - 2 * pad;
            host.style.setProperty('--gx', x.toFixed(1) + 'px');
            host.style.setProperty('--gy', y.toFixed(1) + 'px');
            host.style.setProperty('--gw', w.toFixed(1) + 'px');
            host.style.setProperty('--gh', h.toFixed(1) + 'px');
            host.style.setProperty('--gr', (Math.min(w, h) / 2).toFixed(1) + 'px');
        }
        fit();
        window.addEventListener('resize', fit);
        window.addEventListener('load', fit);
        setTimeout(fit, 600);
        if (window.ResizeObserver) { var ro = new ResizeObserver(fit); ro.observe(host); var g0 = o.glass(); if (g0) ro.observe(g0); }
        // (your own window picture swaps the drawn one: measured again, once it's in)
        host.addEventListener('asset', function () { setTimeout(fit, 50); }, true);
        return { fit: fit };
    }

    Sky.moonlight = moonlight;

    // a room's own window with data-moonlight="assets/<place>/" (living.html's): its glow and beam (it's open already)
    var win = document.querySelector('.room .window[data-moonlight]');
    if (win) moonlight(win.closest('.room'), { glass: function () { return document.querySelector('.room .window'); }, pad: 12, slot: win.dataset.moonlight });
})();

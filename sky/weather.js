/* =====================================================================
   weather.js — the sky's weather: clear, cloudy, drizzle, rain, a
   thunderstorm, fog, snow. By default it's the REAL weather where the
   visitor is (worked out from their time zone, so nothing to allow;
   they can choose their exact spot, which asks their permission).
   Visitors can also pick "surprise me" (it changes every few minutes),
   or one kind to keep, and set how loud it is: all in the "weather" layer
   of the control panel (top right). It stays the same from page to page.

       <script src="sky/weather.js"></script>          (every page, after sky/panel.js)

   Try one: add ?weather=storm (or rain, snow, fog, drizzle, cloudy, partly, clear)
   to any address.

   Live weather comes from Open-Meteo.com (free, no key; its credit is shown
   in the panel, as it asks).

   ART & SOUND (drop them in, like everything else):
       assets/sky/storm-cloud         the heavy clouds
       assets/sounds/rain.mp3         the rain (loops)         .ogg works too
       assets/sounds/wind.mp3         the wind of storms and snow
       assets/sounds/thunder.mp3      one roll of thunder
       assets/ui/weather              the layer's icon in the panel
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.weather) return;

    /* ======================= settings you can edit ======================= */
    // what visitors get until they choose for themselves:
    //   'live' = the real weather where they are    'random' = changes by itself
    //   or always one: 'clear', 'partly', 'cloudy', 'drizzle', 'rain', 'storm', 'fog', 'snow'    'off' = no weather at all (the plain sky, white clouds and all), no choice
    var MODE = 'live';
    // for 'random': how likely each kind is, each time it changes
    var CHANCES = { clear: 22, partly: 22, cloudy: 16, drizzle: 10, rain: 13, storm: 7, fog: 5, snow: 5 };
    // for 'random': how long a spell lasts, in minutes (somewhere between these)
    var LASTS = [4, 10];
    // how loud the weather is to start with (0 to 1); visitors can change it
    var VOLUME = 0.6;
    /* ===================================================================== */

    var KINDS = {
        // fair = the sky's white fair-weather clouds; cloud = the heavy grey ones
        clear:   { label: 'clear skies',  fair: 0,   cloud: 0,   tint: 0,   rain: 0,   snow: 0, wind: 0,   fog: 0 },
        partly:  { label: 'a few clouds', fair: 1,   cloud: 0,   tint: 0,   rain: 0,   snow: 0, wind: .1,  fog: 0 },
        cloudy:  { label: 'cloudy',       fair: 0,   cloud: .8,  tint: .16, rain: 0,   snow: 0, wind: .2,  fog: 0 },
        drizzle: { label: 'drizzle',      fair: 0,   cloud: .85, tint: .22, rain: .22, snow: 0, wind: .12, fog: 0 },
        rain:    { label: 'rain',         fair: 0,   cloud: 1,   tint: .32, rain: .55, snow: 0, wind: .25, fog: 0 },
        storm:   { label: 'thunderstorm', fair: 0,   cloud: 1,   tint: .52, rain: 1,   snow: 0, wind: .6,  fog: 0, lightning: true },
        fog:     { label: 'fog',          fair: .3,  cloud: .35, tint: .12, rain: 0,   snow: 0, wind: 0,   fog: 1 },
        snow:    { label: 'snow',         fair: 0,   cloud: .8,  tint: .2,  rain: 0,   snow: 1, wind: .15, fog: 0 }
    };
    var ORDER = ['clear', 'partly', 'cloudy', 'drizzle', 'rain', 'storm', 'fog', 'snow'];
    var ICONS = {
        clear:   '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="#e8b33c"/><g stroke="#e8b33c" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></g></svg>',
        partly:  '<svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="4.5" fill="#e8b33c"/><g stroke="#e8b33c" stroke-width="1.8" stroke-linecap="round"><path d="M9 1.5v2M1.5 9h2M3.7 3.7l1.4 1.4M14.3 3.7l-1.4 1.4"/></g>' +
                 '<path d="M8 20a3.6 3.6 0 0 1-.3-7.2A5.2 5.2 0 0 1 17.6 12a4.2 4.2 0 0 1 .8 8z" fill="#f4f1ea" stroke="#9aa2ad" stroke-width="1"/></svg>',
        cloudy:  '<svg viewBox="0 0 24 24"><path d="M6 18a4 4 0 0 1-.4-8A6 6 0 0 1 17 8.5 4.8 4.8 0 0 1 18 18z" fill="#8a929e"/></svg>',
        drizzle: '<svg viewBox="0 0 24 24"><path d="M6 14a4 4 0 0 1-.4-8A6 6 0 0 1 17 4.5 4.8 4.8 0 0 1 18 14z" fill="#8a929e"/><path d="M9 17l-.6 2M14 17l-.6 2" stroke="#56636f" stroke-width="1.6" stroke-linecap="round"/></svg>',
        rain:    '<svg viewBox="0 0 24 24"><path d="M6 13a4 4 0 0 1-.4-8A6 6 0 0 1 17 3.5 4.8 4.8 0 0 1 18 13z" fill="#6f7784"/><path d="M8 16l-1 3M12 16l-1 3M16 16l-1 3M10 20l-.6 2M14 20l-.6 2" stroke="#3f6a8a" stroke-width="1.7" stroke-linecap="round"/></svg>',
        storm:   '<svg viewBox="0 0 24 24"><path d="M6 13a4 4 0 0 1-.4-8A6 6 0 0 1 17 3.5 4.8 4.8 0 0 1 18 13z" fill="#4e5663"/><path d="M13 12l-3 5h3l-2 5 5-7h-3l2-3z" fill="#e8b33c"/></svg>',
        fog:     '<svg viewBox="0 0 24 24"><g stroke="#8a929e" stroke-width="2" stroke-linecap="round"><path d="M3 8h14M6 12h15M3 16h13M7 20h10"/></g></svg>',
        snow:    '<svg viewBox="0 0 24 24"><g stroke="#7aa0c0" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/></g></svg>'
    };
    var CHOICE = 'weather-choice', NOW = 'weather-now', LIVE = 'weather-live', PLACE = 'weather-place', VOL = 'weather-volume';
    var ui = {};
    function get(store, k) { try { return JSON.parse(store.getItem(k)); } catch (e) { return null; } }
    function put(store, k, v) { try { store.setItem(k, JSON.stringify(v)); } catch (e) {} }

    Sky.css(
        '.weather-clouds { position: absolute; inset: 0; pointer-events: none; opacity: 0; }' +
        '.storm-cloud { position: absolute; left: 0; color: #6f7784; filter: drop-shadow(0 6px 8px rgba(20,25,35,.35)); will-change: transform; }' +
        '.storm-cloud .placeholder, .storm-cloud > .art { display: block; width: 100%; height: auto; }' +
        '.storm-cloud > .art:not(.glow-layer) { filter: brightness(calc(1 - .55 * var(--dusk))); }' +
        '.weather-tint { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: linear-gradient(#4e5663, #7d8591 70%, #8f969f); }' +
        '.weather-bolt { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0; }' +
        '.weather-bolt-art { position: absolute; top: 0; height: 55vh; width: auto; pointer-events: none; opacity: 0; filter: drop-shadow(0 0 8px #cfe0ff); }' +
        '.weather-rain { position: fixed; inset: 0; z-index: 2; pointer-events: none; width: 100vw; height: 100vh; }' +
        '.weather-flash { position: fixed; inset: 0; z-index: 2; pointer-events: none; opacity: 0; background: rgba(232,238,255,.9); }' +
        '.weather-fog { position: fixed; left: -10%; right: -10%; bottom: 0; height: 70vh; z-index: 2; pointer-events: none; opacity: 0;' +
            'background: radial-gradient(ellipse 40% 30% at 20% 80%, rgba(225,228,232,.75), transparent 70%),' +
                        'radial-gradient(ellipse 45% 26% at 65% 88%, rgba(215,220,226,.8), transparent 70%),' +
                        'radial-gradient(ellipse 35% 22% at 90% 75%, rgba(230,232,236,.65), transparent 70%),' +
                        'linear-gradient(to top, rgba(220,224,230,.85), rgba(220,224,230,0) 80%);' +
            'animation: fog-drift 38s ease-in-out infinite alternate; }' +
        '@keyframes fog-drift { from { transform: translateX(-4%); } to { transform: translateX(4%); } }' +
        '.cp .wx-now { display: flex; align-items: center; gap: 10px; margin: 2px 0 8px; }' +
        '.cp .wx-now svg { width: 34px; height: 34px; flex: none; }' +
        '.cp .wx-now b { display: block; font-weight: normal; font-size: 1.05rem; }' +
        '.cp .wx-now i { display: block; font-size: .85rem; color: #6e5236; }' +
        '.cp .wx-label { margin: 8px 0 0; font-size: .85rem; color: #6e5236; }' +
        '@media (prefers-reduced-motion: reduce) { .weather-fog { animation: none; } }'
    );

    /* ---------------- which weather ---------------- */
    var forced = (/[?&]weather=(\w+)/.exec(location.search) || [])[1];
    if (forced && !KINDS[forced]) forced = null;
    var choice = MODE === 'off' ? 'clear' : (localStorage && get(localStorage, CHOICE)) || MODE;
    if (choice !== 'live' && choice !== 'random' && choice !== 'off' && !KINDS[choice]) choice = 'live';
    var state = { kind: 'clear', source: 'pick', place: '' };

    function pick(except) {
        var total = 0, k;
        for (k in CHANCES) if (k !== except && KINDS[k]) total += CHANCES[k];
        var r = Math.random() * total;
        for (k in CHANCES) { if (k === except || !KINDS[k]) continue; r -= CHANCES[k]; if (r <= 0) return k; }
        return 'clear';
    }
    function spell() { return (LASTS[0] + Math.random() * (LASTS[1] - LASTS[0])) * 60000; }
    function randomNow() {
        var r = get(sessionStorage, NOW);
        if (!r || !KINDS[r.kind] || Date.now() > r.until) { r = { kind: pick(r && r.kind), until: Date.now() + spell() }; put(sessionStorage, NOW, r); }
        return r;
    }
    function decide() {
        if (forced) { state = { kind: forced, source: 'pick', place: '' }; return; }
        if (choice === 'off') { state = { kind: 'clear', source: 'off', place: '' }; return; }   // no weather: the plain sky
        if (choice === 'random') { state = { kind: randomNow().kind, source: 'random', place: '' }; return; }
        if (choice === 'live') {
            var l = get(sessionStorage, LIVE);
            if (l && KINDS[l.kind]) state = { kind: l.kind, source: 'live', place: l.place, fresh: Date.now() - l.t < 20 * 60000 };
            else state = { kind: state.source === 'live' ? state.kind : 'clear', source: 'live', place: '', fresh: false };
            if (!state.fresh) fetchLive();
            return;
        }
        state = { kind: choice, source: 'pick', place: '' };
    }

    /* ---------------- the real weather, where the visitor is ---------------- */
    // their time zone names a city ("America/Phoenix" → Phoenix): no permission needed
    function zoneCity() {
        var zone = '';
        try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
        if (!zone || /^(UTC|GMT|Etc\/)/.test(zone)) return null;
        return { zone: zone, city: zone.split('/').pop().replace(/_/g, ' ') };
    }
    function locate(done) {
        var p = get(localStorage, PLACE), z = zoneCity();
        if (p && (p.exact || (z && p.zone === z.zone && Date.now() - p.t < 30 * 864e5))) return done(p);
        if (!z) return done(null);
        fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=' + encodeURIComponent(z.city))
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) {
                var r = j && j.results && j.results[0];
                if (!r) return done(null);
                var place = { lat: +(+r.latitude).toFixed(2), lon: +(+r.longitude).toFixed(2), name: r.name, zone: z.zone, exact: false, t: Date.now() };
                put(localStorage, PLACE, place);
                done(place);
            }, function () { done(null); });
    }
    // the weather code (WMO) → one of ours
    function kindFor(c) {
        var code = c.weather_code !== undefined ? c.weather_code : c.weathercode, cc = c.cloud_cover || 0;
        if (code >= 95) return 'storm';
        if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
        if (code === 45 || code === 48) return 'fog';
        if ((code >= 51 && code <= 57) || code === 61 || code === 80) return 'drizzle';
        if ((code >= 63 && code <= 67) || code === 81 || code === 82) return 'rain';
        if (code === 3 || cc > 70) return 'cloudy';
        if (code === 1 || code === 2 || cc > 20) return 'partly';
        return 'clear';
    }
    var fetching = false;
    function fetchLive() {
        if (fetching) return;
        fetching = true;
        locate(function (place) {
            if (!place) { fetching = false; fallback(); return; }
            fetch('https://api.open-meteo.com/v1/forecast?latitude=' + place.lat + '&longitude=' + place.lon + '&current=weather_code,cloud_cover,precipitation,wind_speed_10m')
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (j) {
                    fetching = false;
                    if (!j || !j.current) return fallback();
                    var k = kindFor(j.current), name = place.exact ? 'your spot' : place.name;
                    put(sessionStorage, LIVE, { kind: k, place: name, t: Date.now() });
                    if (choice === 'live' && !forced) { state = { kind: k, source: 'live', place: name, fresh: true }; drawLayer(); }
                }, function () { fetching = false; fallback(); });
        });
    }
    function fallback() {                                     // couldn't find out: something pleasant, changing now and then
        if (choice !== 'live' || forced) return;
        state = { kind: randomNow().kind, source: 'guess', place: '' };
        drawLayer();
    }
    function useExactSpot() {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(function (pos) {
            put(localStorage, PLACE, { lat: +pos.coords.latitude.toFixed(2), lon: +pos.coords.longitude.toFixed(2), name: 'your spot', exact: true, t: Date.now() });
            try { sessionStorage.removeItem(LIVE); } catch (e) {}
            setChoice('live');
        }, function () {}, { maximumAge: 3600000, timeout: 15000 });
    }
    function useZone() {
        try { localStorage.removeItem(PLACE); sessionStorage.removeItem(LIVE); } catch (e) {}
        setChoice('live');
    }
    var quickUntil = 0;                       // just after you pick, the weather changes over quickly
    function setChoice(c) {
        quickUntil = performance.now() + 3000;
        choice = c;
        forced = null;
        put(localStorage, CHOICE, c);
        decide();
        drawLayer();
    }
    decide();
    setInterval(function () { if (!forced) decide(); drawLayer(); }, 60000);

    /* ---------------- the pieces ---------------- */
    var backdrop = document.querySelector('.backdrop');
    var cloudBox = document.createElement('div');
    cloudBox.className = 'weather-clouds';
    var CLOUDS = [[-6, 2, 360], [18, 9, 300], [40, 0, 420], [66, 7, 340], [86, 1, 380], [30, 16, 260]];
    cloudBox.innerHTML = CLOUDS.map(function (c) {
        return '<div class="storm-cloud" data-asset="assets/sky/storm-cloud" style="top:' + c[1] + 'vh; width:' + c[2] + 'px">' +
               '<svg class="placeholder" viewBox="0 0 200 90"><use href="#sky-cloud"/></svg></div>';
    }).join('');
    var tint = document.createElement('div');
    tint.className = 'weather-tint';
    var bolt = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    bolt.setAttribute('class', 'weather-bolt');
    bolt.setAttribute('data-slot', 'assets/sky/lightning');
    bolt.innerHTML = '<path fill="none" stroke="#f4f6ff" stroke-width="3" stroke-linejoin="bevel" style="filter: drop-shadow(0 0 6px #cfe0ff)"/>';
    if (backdrop) { backdrop.appendChild(cloudBox); backdrop.appendChild(tint); backdrop.appendChild(bolt); }
    var cloudEls = Array.prototype.slice.call(cloudBox.children);

    var canvas = document.createElement('canvas');
    canvas.className = 'weather-rain';
    canvas.setAttribute('aria-hidden', 'true');
    var flash = document.createElement('div');
    flash.className = 'weather-flash';
    var fog = document.createElement('div');
    fog.className = 'weather-fog';
    document.body.appendChild(canvas);
    document.body.appendChild(fog);
    document.body.appendChild(flash);
    var ctx = canvas.getContext('2d');

    /* ---------------- the sound (through the shared sound engine) ---------------- */
    var volume = get(localStorage, VOL);
    if (typeof volume !== 'number') volume = VOLUME;
    function indoors() { return document.body.classList.contains('has-room') && !document.body.classList.contains('is-outside'); }
    // outside you hear the rain itself; inside, rain on the window (assets/sounds/windowrain, or the drawn one)
    var rainCh = Sky.sounds ? Sky.sounds.channel('rain') : null;
    var paneCh = Sky.sounds ? Sky.sounds.channel('windowrain') : null;
    var windCh = Sky.sounds ? Sky.sounds.channel('wind', { muffled: indoors }) : null;

    /* ---------------- the weather layer of the control panel ---------------- */
    function statusText() {
        var k = KINDS[state.kind].label;
        if (state.source === 'live') return state.place ? k + ' in ' + state.place + ', right now' : k + ' (finding your weather…)';
        if (state.source === 'guess') return k + ' (couldn\'t reach the weather)';
        if (state.source === 'random') return k + ' (it changes now and then)';
        if (state.source === 'off') return 'off (the plain sky)';
        return k + ' (your pick)';
    }
    if (Sky.panel) Sky.panel.add({
        id: 'weather', title: 'weather', order: 20, icon: ICONS.rain.replace('<svg', '<svg class="placeholder"'),
        build: function (body) {
            body.innerHTML =
                '<div class="wx-now"><span class="wx-ic"></span><span><b></b><i></i></span></div>' +
                '<div class="wx-label">the weather here is…</div>' +
                '<div class="cp-chips wx-modes">' +
                    '<button type="button" class="cp-chip" data-choice="live">where you are</button>' +
                    '<button type="button" class="cp-chip" data-choice="random">surprise me</button></div>' +
                '<div class="wx-label">or always:</div>' +
                '<div class="cp-chips wx-kinds">' + ORDER.map(function (k) {
                    return '<button type="button" class="cp-chip" data-choice="' + k + '">' + ICONS[k] + KINDS[k].label + '</button>';
                }).join('') + '</div>' +
                '<label class="cp-range">sound <input type="range" class="wx-vol" min="0" max="100" aria-label="weather volume"></label>' +
                '<p class="cp-note wx-where"></p>';
            ui.body = body;
            ui.vol = body.querySelector('.wx-vol');
            ui.vol.value = Math.round(volume * 100);
            ui.vol.addEventListener('input', function () { volume = ui.vol.value / 100; put(localStorage, VOL, volume); });
            body.addEventListener('click', function (e) {
                var b = e.target.closest('[data-choice]');
                // clicking your choice again turns the weather off (the plain sky, as it is without weather)
                if (b) setChoice(b.getAttribute('aria-pressed') === 'true' ? 'off' : b.dataset.choice);
                if (e.target.closest('.wx-exact')) useExactSpot();
                if (e.target.closest('.wx-zone')) useZone();
            });
            drawLayer();
        },
        status: statusText,
        active: function () { return state.source !== 'off' && state.kind !== 'clear'; },
        badge: function () { return ICONS[state.kind]; }
    });
    function drawLayer() {
        if (Sky.panel) Sky.panel.refresh('weather');
        if (!ui.body) return;
        ui.body.querySelector('.wx-ic').innerHTML = ICONS[state.kind];
        ui.body.querySelector('.wx-now b').textContent = state.source === 'off' ? 'no weather' : KINDS[state.kind].label;
        ui.body.querySelector('.wx-now i').textContent = statusText().replace(KINDS[state.kind].label, '').replace(/^\s*/, '') || '';
        ui.body.querySelectorAll('[data-choice]').forEach(function (b) { b.setAttribute('aria-pressed', String(!forced && b.dataset.choice === choice)); });
        var p = get(localStorage, PLACE), where = ui.body.querySelector('.wx-where');
        if (choice === 'live') {
            where.innerHTML = (p && p.exact ? 'using your exact spot. <button type="button" class="cp-link wx-zone">use your time zone\'s city instead</button>'
                                            : 'going by your time zone' + (p ? ' (' + p.name + ')' : '') + '. <button type="button" class="cp-link wx-exact">use my exact spot</button> (your browser will ask)') +
                              '<br>weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a>';
        } else where.textContent = state.source === 'off' ? 'the weather is off. pick one to bring it back.' : 'click it again to turn the weather off.';
    }

    /* ---------------- lightning ---------------- */
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    var nextBolt = performance.now() + 4000 + Math.random() * 6000;
    // your own lightning: assets/sky/lightning (a tall picture of one bolt, top at the top, see-through around it)
    var boltArt = null;
    Sky.findAsset('assets/sky/lightning', function (url) {
        if (!url) return;
        boltArt = document.createElement('img');
        boltArt.className = 'weather-bolt-art';
        boltArt.src = url; boltArt.alt = '';
        if (backdrop) backdrop.appendChild(boltArt);
    });
    function strike() {
        var W = window.innerWidth, H = window.innerHeight, x = W * (0.15 + Math.random() * 0.7), y = 0, d = 'M' + x + ' 0';
        if (boltArt) {
            boltArt.style.left = x + 'px';
            boltArt.style.transform = 'translateX(-50%)' + (Math.random() < 0.5 ? ' scaleX(-1)' : '');
            if (!calm.matches) boltArt.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0.2 }, { opacity: 0.9 }, { opacity: 0 }], { duration: 480, easing: 'ease-out' });
        }
        while (y < H * (0.35 + Math.random() * 0.2)) { y += 18 + Math.random() * 30; x += (Math.random() - 0.5) * 50; d += ' L' + x.toFixed(0) + ' ' + y.toFixed(0); }
        bolt.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        bolt.querySelector('path').setAttribute('d', d);
        if (!calm.matches) {
            flash.animate([{ opacity: 0 }, { opacity: 0.55 }, { opacity: 0.1 }, { opacity: 0.35 }, { opacity: 0 }], { duration: 520, easing: 'ease-out' });
            if (!boltArt) bolt.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0.2 }, { opacity: 0.9 }, { opacity: 0 }], { duration: 480, easing: 'ease-out' });
        }
        if (Sky.sounds && volume > 0) Sky.sounds.thunder(volume * (0.5 + Math.random() * 0.5), 0.3 + Math.random() * 2.2, null, indoors());
    }

    /* ---------------- rain and snow ---------------- */
    var drops = [], flakes = [], W = 0, H = 0;
    function size() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    size();
    window.addEventListener('resize', size);

    /* ---------------- every frame ---------------- */
    var now = {}, goal = KINDS[state.kind];
    for (var k in goal) if (typeof goal[k] === 'number') now[k] = goal[k];    // a new page starts where it was
    var last = performance.now(), drift = 0;
    var fairShown = MODE === 'off' || state.source === 'off' ? 1 : (now.fair || 0);
    function frame(t) {
        var dt = Math.min(0.1, (t - last) / 1000);
        last = t;
        if (state.source === 'random' && !forced) { var r = randomNow(); if (r.kind !== state.kind) { state.kind = r.kind; drawLayer(); } }
        goal = KINDS[state.kind];
        var tau = t < quickUntil ? 0.35 : 6;       // seconds to (mostly) change over
        for (var key in now) now[key] += ((goal[key] || 0) - now[key]) * Math.min(1, dt / tau);

        cloudBox.style.opacity = now.cloud.toFixed(3);
        // the white clouds only when the weather has them; with the weather off, the plain sky keeps them
        fairShown += ((MODE === 'off' || state.source === 'off' ? 1 : now.fair) - fairShown) * Math.min(1, dt / tau);
        if (Sky.setCloudiness) Sky.setCloudiness(fairShown);
        tint.style.opacity = now.tint.toFixed(3);
        fog.style.opacity = now.fog.toFixed(3);
        drift += dt * (10 + now.wind * 50);
        cloudEls.forEach(function (c, i) {
            var cw = c.offsetWidth || 300, span = window.innerWidth + cw * 2, home = CLOUDS[i][0] / 100 * window.innerWidth;
            var x = ((home + cw + drift * (0.7 + i * 0.08)) % span + span) % span - cw;
            c.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
        });

        ctx.clearRect(0, 0, W, H);
        var night = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--night')) || 0;
        // rain
        var want = Math.round(now.rain * Math.min(420, W * 0.28));
        while (drops.length < want) drops.push({ x: Math.random() * (W + 200) - 100, y: drops.length ? -Math.random() * H : Math.random() * H, len: 10 + Math.random() * 16, v: 650 + Math.random() * 450 });
        if (drops.length > want) drops.length = want;
        if (drops.length) {
            var slant = 0.12 + now.wind * 0.35;
            ctx.strokeStyle = 'rgba(' + (215 - 40 * night) + ',' + (224 - 35 * night) + ',' + (240 - 20 * night) + ',' + (0.55 - 0.12 * night) + ')';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            drops.forEach(function (d) {
                d.y += d.v * dt; d.x += d.v * slant * dt;
                if (d.y > H) { d.y = -d.len - Math.random() * 60; d.x = Math.random() * (W + 200) - 200; }
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x - d.len * slant, d.y - d.len);
            });
            ctx.stroke();
        }
        // snow
        var wantF = Math.round(now.snow * Math.min(260, W * 0.18));
        while (flakes.length < wantF) flakes.push({ x: Math.random() * W, y: flakes.length ? -Math.random() * H * 0.3 : Math.random() * H, r: 1.2 + Math.random() * 2.6, v: 30 + Math.random() * 55, ph: Math.random() * 6.3 });
        if (flakes.length > wantF) flakes.length = wantF;
        if (flakes.length) {
            ctx.fillStyle = 'rgba(255,255,255,' + (0.85 - 0.2 * night) + ')';
            ctx.beginPath();
            var ts = t / 1000;
            flakes.forEach(function (f) {
                f.y += f.v * dt * (0.6 + f.r / 4);
                f.x += (Math.sin(ts * 0.9 + f.ph) * 18 + now.wind * 40) * dt;
                if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
                if (f.x > W + 4) f.x = -4;
                ctx.moveTo(f.x + f.r, f.y);
                ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            });
            ctx.fill();
        }

        if (goal.lightning && now.rain > 0.7 && t > nextBolt) {
            strike();
            nextBolt = t + 7000 + Math.random() * 16000;
        }
        var inside = indoors();
        if (rainCh) rainCh.set((inside ? 0 : 1) * now.rain * volume, 0.6);
        if (paneCh) paneCh.set((inside ? 1 : 0) * now.rain * volume, 0.6);
        if (windCh) windCh.set(Math.max(0, now.wind - 0.2) * 0.9 * volume);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    // stepping in and out of a room changes how muffled it sounds
    new MutationObserver(function () { if (rainCh) rainCh.refresh(); if (paneCh) paneCh.refresh(); if (windCh) windCh.refresh(); })
        .observe(document.body, { attributes: true, attributeFilter: ['class'] });

    Sky.weather = {
        get kind() { return state.kind; },
        get levels() { return now; },
        set: setChoice,
        kinds: ORDER.slice()
    };
})();

/* =====================================================================
   noise.js — the white noise machine. It sits in the living space; click
   it (or open the control panel, top right, on any page) and mix the
   sounds you like: rain, a thunderstorm, the sea, wind, a fire, and
   plain white, pink or brown noise. Like the music, it keeps going as you
   wander from page to page.

       <script src="sky/noise.js"></script>                (every page, after sky/panel.js)
       <div class="furnish noise-machine" data-asset="assets/living/noise-machine"></div>
                                                           (the machine itself, in a room)

   YOUR OWN: assets/sounds/<name>.mp3 (or .ogg) replaces any sound below
   (it loops, so make its ends meet). To add a new sound: the content
   manager's assets page (noise machine) does it for you, or put the
   recording in assets/sounds/ and list it in assets/sounds/noise.json:
       [ { "name": "cafe", "label": "a busy café" } ]
   The machine: assets/living/noise-machine, and noise-machine-on (shown
   while it plays; a GIF can animate). Icon in the panel: assets/ui/noise.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || !Sky.sounds || !Sky.panel || Sky.noise) return;

    /* ======================= settings you can edit ======================= */
    // the sounds on the machine, in order. a sound needs either a recording
    // (assets/sounds/<name>.mp3) or to be one the site can make:
    // rain, storm, ocean, wind, fire, white, pink, brown
    var SOUNDS = [
        { name: 'rain',  label: 'rain' },
        { name: 'storm', label: 'thunderstorm' },
        { name: 'ocean', label: 'ocean waves' },
        { name: 'wind',  label: 'wind' },
        { name: 'fire',  label: 'crackling fire' },
        { name: 'white', label: 'white noise' },
        { name: 'pink',  label: 'pink noise' },
        { name: 'brown', label: 'brown noise' }
    ];
    /* ===================================================================== */

    var KEY = 'noise-now', MIX = 'noise-mix';
    function get(store, k) { try { return JSON.parse(store.getItem(k)); } catch (e) { return null; } }
    function put(store, k, v) { try { store.setItem(k, JSON.stringify(v)); } catch (e) {} }

    var ICON = '<svg class="placeholder" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="15" rx="3" fill="#6e4a30"/>' +
        '<circle cx="9" cy="12.5" r="5" fill="#d8c8a0"/><g stroke="#8a7550" stroke-width=".8"><path d="M5 11h8M5 14h8M9 8v9"/></g>' +
        '<circle cx="17.5" cy="11" r="2.2" fill="#c49a52"/><circle cx="17.5" cy="16.5" r="1.1" fill="#ffd98a"/></svg>';
    var BADGE = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="#56636f" stroke-width="2" stroke-linecap="round">' +
        '<path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></g></svg>';

    // (its look is in sky/css/noise.css, linked from each page's head)

    /* ---------------- the mix: which sounds, how loud ---------------- */
    var saved = get(sessionStorage, KEY) || { on: false, levels: get(localStorage, MIX) || {}, master: 0.8 };
    var state = { on: !!saved.on, levels: saved.levels || {}, master: typeof saved.master === 'number' ? saved.master : 0.8 };
    var chans = {}, avail = {};
    function save() { put(sessionStorage, KEY, state); put(localStorage, MIX, state.levels); }
    var hushed = false;                      // (the dungeon quiets it for a while, without switching it off)
    function anyOn() { return state.on && SOUNDS.some(function (s) { return avail[s.name] && state.levels[s.name] > 0; }); }
    function apply() {
        SOUNDS.forEach(function (s) {
            var ch = chans[s.name];
            if (ch) ch.set(state.on && !hushed ? (state.levels[s.name] || 0) * state.master : 0, hushed ? 0.08 : 0.4);
        });
        if (machine) machine.classList.toggle('on', anyOn());
        drawLayer();
    }
    function addSound(s) {
        avail[s.name] = Sky.sounds.has(s.name);
        chans[s.name] = Sky.sounds.channel(s.name, s.name === 'storm' ? { orFile: 'rain', withThunder: true } : {});   // no storm recording? your rain, with thunder
        if (!avail[s.name]) Sky.findAsset('assets/sounds/' + s.name + '.mp3|assets/sounds/' + s.name + '.ogg', function (url) {
            if (url) { avail[s.name] = true; drawLayer(true); apply(); }
        });
    }
    SOUNDS.forEach(addSound);
    // your own extra sounds (added from the content manager): assets/sounds/noise.json
    Sky.findAsset('assets/sounds/noise.json', function (url, data) {
        var list = url && Array.isArray(data) ? data : [];
        list.forEach(function (s) {
            if (!s || !/^[a-z0-9-]+$/.test(s.name || '') || chans[s.name]) return;
            var extra = { name: s.name, label: String(s.label || s.name).slice(0, 40) };
            SOUNDS.push(extra);
            addSound(extra);
        });
    });

    /* ---------------- the noise layer of the control panel ---------------- */
    var ui = {};
    Sky.panel.add({
        id: 'noise', title: 'noise machine', order: 30, icon: ICON,
        build: function (body) {
            ui.body = body;
            drawLayer(true);
            body.addEventListener('click', function (e) {
                if (e.target.closest('.nz-power')) { state.on = !state.on; if (state.on && !anyOn()) state.levels.rain = state.levels.rain || 0.5; }
                var t = e.target.closest('.nz-tog');
                if (t) {
                    var n = t.dataset.name, v = state.levels[n] || 0;
                    state.levels[n] = v > 0 && state.on ? 0 : (v || 0.5);
                    if (state.levels[n] > 0) state.on = true;
                }
                if (e.target.closest('.nz-power, .nz-tog')) { save(); apply(); }
            });
            body.addEventListener('input', function (e) {
                var r = e.target;
                if (r.classList.contains('nz-master')) state.master = r.value / 100;
                else if (r.dataset.name) { state.levels[r.dataset.name] = r.value / 100; if (r.value > 0) state.on = true; }
                save(); apply();
            });
        },
        status: function () {
            if (!anyOn()) return 'off';
            var names = SOUNDS.filter(function (s) { return avail[s.name] && state.levels[s.name] > 0; }).map(function (s) { return s.label; });
            return names.length > 2 ? names.slice(0, 2).join(', ') + ' +' + (names.length - 2) : names.join(' & ');
        },
        active: anyOn,
        badge: function () { return BADGE; }
    });
    function drawLayer(rebuild) {
        Sky.panel.refresh('noise');
        if (!ui.body) return;
        if (rebuild || !ui.body.firstChild) {
            ui.body.innerHTML =
                '<div class="nz-top"><button type="button" class="cp-chip nz-power"></button><span class="cp-note">mix any of these, as loud as you like</span></div>' +
                SOUNDS.filter(function (s) { return avail[s.name]; }).map(function (s) {
                    return '<div class="nz-row" data-name="' + s.name + '"><button type="button" class="cp-chip nz-tog" data-name="' + s.name + '"></button>' +
                           '<input type="range" min="0" max="100" data-name="' + s.name + '" aria-label="' + s.label + ' volume"></div>';
                }).join('') +
                '<label class="cp-range">all <input type="range" class="nz-master" min="0" max="100" aria-label="noise machine volume"></label>';
            ui.body.querySelectorAll('.nz-tog').forEach(function (b) {
                var s = SOUNDS.filter(function (x) { return x.name === b.dataset.name; })[0];
                b.textContent = s.label;
            });
        }
        var p = ui.body.querySelector('.nz-power');
        p.textContent = state.on ? '● on' : '○ off';
        p.setAttribute('aria-pressed', String(state.on));
        ui.body.querySelector('.nz-master').value = Math.round(state.master * 100);
        ui.body.querySelectorAll('.nz-row').forEach(function (row) {
            var n = row.dataset.name, v = state.levels[n] || 0, on = state.on && v > 0;
            row.classList.toggle('off', !on);
            row.querySelector('.nz-tog').setAttribute('aria-pressed', String(on));
            var r = row.querySelector('input');
            if (document.activeElement !== r) r.value = Math.round(v * 100);
        });
    }

    /* ---------------- the machine in the room ---------------- */
    var machine = document.querySelector('.noise-machine');
    if (machine) {
        machine.setAttribute('role', 'button');
        machine.setAttribute('tabindex', '0');
        machine.setAttribute('aria-label', 'the white noise machine');
        machine.dataset.opensPanel = '';
        if (!machine.querySelector('.placeholder, img')) machine.insertAdjacentHTML('afterbegin',
            '<svg class="placeholder" viewBox="0 0 110 76" aria-hidden="true">' +
                '<rect x="8" y="70" width="10" height="6" fill="#2a1a10"/><rect x="92" y="70" width="10" height="6" fill="#2a1a10"/>' +
                '<rect x="2" y="8" width="106" height="64" rx="10" fill="#6e4a30"/><rect x="2" y="8" width="106" height="9" rx="6" fill="#86583a"/>' +
                '<g class="nm-cloth"><circle cx="38" cy="42" r="22" fill="#d8c8a0"/>' +
                    '<g stroke="#a8946a" stroke-width="1.1" opacity=".8"><path d="M18 34h40M17 42h42M18 50h40M30 21v42M38 20v44M46 21v42"/></g></g>' +
                '<circle cx="38" cy="42" r="22" fill="none" stroke="#4a3020" stroke-width="3"/>' +
                '<circle cx="82" cy="34" r="11" fill="#c49a52"/><circle cx="82" cy="34" r="8" fill="#a67c3a"/><path d="M82 34 L87 27" stroke="#3a2716" stroke-width="2.4" stroke-linecap="round"/>' +
                '<circle class="nm-lamp" cx="82" cy="56" r="4"/>' +
                '<path d="M40 8 V2 H70 V8" fill="none" stroke="#3a2716" stroke-width="3" stroke-linecap="round"/>' +
            '</svg>');
        machine.insertAdjacentHTML('beforeend', '<span class="nm-hint">the noise machine</span><span class="nm-wave" aria-hidden="true">≋</span><span class="nm-wave w2" aria-hidden="true">≋</span>');
        if (machine.dataset.asset) Sky.findAsset(machine.dataset.asset + '-on', function (url) {
            if (!url) return;
            var im = document.createElement('img');
            im.src = url; im.alt = ''; im.className = 'nm-on';
            machine.insertBefore(im, machine.querySelector('.nm-hint'));
            machine.classList.add('has-on');
        });
        var openIt = function () { Sky.panel.open('noise'); };
        machine.addEventListener('click', openIt);
        machine.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openIt(); } });
    }

    apply();
    Sky.noise = {
        get on() { return anyOn(); },
        set: function (name, level) { state.levels[name] = level; state.on = true; save(); apply(); },
        stop: function () { state.on = false; save(); apply(); },
        hush: function (on) { hushed = !!on; apply(); }
    };
})();

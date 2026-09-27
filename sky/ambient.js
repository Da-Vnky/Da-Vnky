/* =====================================================================
   ambient.js — the house's own soundtrack. When no record is on, a
   quiet ambience plays under everything (on every page); put a record
   on and it fades away, lift the needle and it comes back. The control
   panel's "ambience" layer turns it off (or down) for good, for this
   visitor.

       <script src="sky/ambient.js"></script>          (every page, after sky/music.js and sky/noise.js)
       <link rel="stylesheet" href="sky/css/ambient.css">

   YOUR OWN: assets/sounds/ambient.mp3 (or .ogg), made to loop. Until then,
   a drawn stand-in (panel.js SYNTHS.ambient: slow warm chords, the hush of
   the house, a far-off note now and then). Icon in the panel: assets/ui/ambient.
   It keeps quiet wherever the music does (the dungeon, below, the grimoire:
   they have their own sound), and while the browser waits for a first click.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || !Sky.sounds || !Sky.panel || Sky.ambient) return;

    var KEY = 'ambient';                                // localStorage: { on, volume }
    var FADE_IN = 2.5, FADE_OUT = 0.9;                  // seconds (roughly) to come in, and to give way to a record
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
    var state = { on: saved.on !== false, volume: typeof saved.volume === 'number' ? saved.volume : 0.45 };
    function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

    var ch = Sky.sounds.channel('ambient');
    var M = Sky.music, hushed = 0;                      // (hushed: a place asking for quiet, besides the music's own hush)
    function recordOn() { return !!(M && (M.busy || M.hushed)); }
    function level() { return state.on && !hushed && !recordOn() ? state.volume : 0; }
    var was = -1;
    function apply() {
        var v = level();
        if (v === was) return;
        ch.set(v, v > was ? FADE_IN / 3 : FADE_OUT / 3);  // (setTargetAtTime: about 3 time-constants to get there)
        was = v;
        Sky.panel.refresh('ambient');
        draw();
    }
    if (M && M.on) M.on(function (what) { if (what !== 'time') apply(); });
    setInterval(apply, 1500);                           // (anything missed: a record ending on its own, a page's own hush)

    /* ---------------- its layer in the control panel ---------------- */
    var ICON = '<svg class="placeholder" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 14c2.5-4 4.5-4 7 0s4.5 4 7 0 4.5-4 6-2" fill="none" stroke="#56636f" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="18" cy="6" r="3" fill="#c49a52"/><path d="M4 7h5M5.5 4.5v5" stroke="#9a3b1f" stroke-width="1.5" stroke-linecap="round"/></svg>';
    var ui = {};
    Sky.panel.add({
        id: 'ambient', title: 'ambience', order: 20, icon: ICON,
        build: function (body) {
            body.classList.add('amb-layer');
            body.innerHTML =
                '<div class="amb-top"><button type="button" class="cp-chip amb-power" aria-pressed="false"></button>' +
                    '<span class="cp-note amb-note"></span></div>' +
                '<label class="cp-range">volume <input type="range" class="amb-vol" min="0" max="100" aria-label="ambience volume"></label>';
            ui.body = body;
            ui.power = body.querySelector('.amb-power');
            ui.note = body.querySelector('.amb-note');
            ui.vol = body.querySelector('.amb-vol');
            ui.vol.value = Math.round(state.volume * 100);
            ui.power.addEventListener('click', function () { set(!state.on); });
            ui.vol.addEventListener('input', function () { state.volume = ui.vol.value / 100; if (state.volume > 0) state.on = true; save(); was = -1; apply(); });
            draw();
        },
        status: function () { return !state.on ? 'off' : recordOn() ? 'waiting for the record to end' : hushed ? 'quiet here' : 'on'; },
        active: function () { return state.on && level() > 0; }
    });
    function draw() {
        if (!ui.body) return;
        ui.power.textContent = state.on ? 'on' : 'off';
        ui.power.classList.toggle('on', state.on);
        ui.power.setAttribute('aria-pressed', String(state.on));
        ui.note.textContent = !state.on ? 'the house’s own soundtrack, when no record’s on' :
            recordOn() ? 'a record’s on: it waits till the record ends' : hushed ? 'quiet here: this place has its own sound' : 'the house’s own soundtrack, when no record’s on';
    }
    function set(on) { state.on = !!on; save(); was = -1; apply(); }

    Sky.ambient = {
        get on() { return state.on; },
        set: set,
        // a place with its own sound asks for quiet (sky/dungeon.js, sky/hell.js…): hush(true) … hush(false)
        hush: function (on) { hushed = Math.max(0, hushed + (on ? 1 : -1)); was = -1; apply(); },
        channel: ch
    };
    apply();
})();

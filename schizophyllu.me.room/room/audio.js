// the room's sound. everything is synthesized, no audio files.
// positions are stage x coordinates (0-1600) so things sound like they're where they're drawn.

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const pan = x => Math.max(-.9, Math.min(.9, x / 800 - 1));
const rand = (a, b) => a + Math.random() * (b - a);
const POS = { window: 180, mira: 520, crt: 750, mel: 1012, clock: 1120, server: 1242, aether: 1228, claube: 1400, fridge: 1550 };

export const audio = {
  ctx: null,
  master: null,
  on: store.get('room_sound') !== 'off',
  buffers: {},
  beds: {},
  quiet: false, // true while you're using the monitor: the room recedes a bit
  room: 'main', // which room you're standing in; things sound further away from elsewhere
  keepAwake: () => false, // music.js sets this so a background tab keeps playing music
  asleep: false, // skizy's asleep (the afternoon): nobody's at the keyboard

  init() {
    if (this.ctx) return true;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return false; }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.on ? 1 : 0;
    this.master.connect(this.ctx.destination);
    this.makeBuffers();
    this.startBeds();
    this.startEvents();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (!this.keepAwake()) this.ctx.suspend(); }
      else this.ctx.resume();
    });
    return true;
  },

  setRoom(id) {
    this.room = id;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // the CRT's whine only exists next to the CRT
    this.beds.whine?.g.gain.setTargetAtTime(id === 'main' ? .0016 : 0, t, .2);
    this.beds.fan?.gain.setTargetAtTime(id === 'main' ? .009 : .003, t, .3);
    this.beds.buzz?.gain.setTargetAtTime(id === 'bathroom' ? .012 : 0, t, .15);
    this.beds.wind?.gain.setTargetAtTime({ roof: .07, closet: .02 }[id] ?? .012, t, .4);
    this.beds.city?.gain.setTargetAtTime(id === 'roof' ? .05 : 0, t, .4);
  },
  // how loud main-room things are from where you are
  get near() { return this.room === 'main' ? 1 : .22; },

  resume() { if (this.ctx && this.on) this.ctx.resume(); },

  toggle() {
    this.on = !this.on;
    store.set('room_sound', this.on ? 'on' : 'off');
    if (!this.init()) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this.on ? 1 : 0, t, .08);
    if (this.on) this.ctx.resume();
  },

  // the room holds its breath: every bed and event drops out, then comes back slowly.
  // the music station has its own path, so a song keeps playing through it
  hold(secs) {
    if (!this.live) return;
    const g = this.master.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(0, t, .15);
    g.setTargetAtTime(1, t + secs, .8);
  },

  // the lights go off: no CRT whine, the fan barely there
  lightsOff() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.beds.whine?.g.gain.setTargetAtTime(0, t, .4);
    this.beds.fan?.gain.setTargetAtTime(.003, t, .8);
  },

  get live() { return !!this.ctx && this.on && this.ctx.state === 'running'; },

  // the music station bypasses the ambience switch, so it needs the context even when ambience is off
  ensure() { return this.init(); },

  // ---------------------------------------------------------------- building blocks
  makeBuffers() {
    const sr = this.ctx.sampleRate;
    const make = (seconds, fill) => {
      const b = this.ctx.createBuffer(1, Math.floor(sr * seconds), sr);
      fill(b.getChannelData(0));
      return b;
    };
    this.buffers.white = make(2, d => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; });
    this.buffers.brown = make(4, d => {
      let last = 0;
      for (let i = 0; i < d.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    });
  },

  out(x, gain = 1) {
    const g = this.ctx.createGain();
    g.gain.value = gain;
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (p) { p.pan.value = x == null ? 0 : pan(x); g.connect(p).connect(this.master); }
    else g.connect(this.master);
    return g;
  },

  loop(buf, filterType, freq, q, x, gain) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.buffers[buf]; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const o = this.out(x, gain);
    s.connect(f).connect(o); s.start();
    return o;
  },

  osc(type, freq, x, gain) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = this.out(x, gain);
    o.connect(g); o.start();
    return { o, g };
  },

  lfo(param, rate, depth) {
    const l = this.ctx.createOscillator(); l.frequency.value = rate;
    const d = this.ctx.createGain(); d.gain.value = depth;
    l.connect(d).connect(param); l.start();
  },

  // a short filtered noise hit
  burst({ x = null, freq = 1000, q = 1, type = 'bandpass', dur = .03, gain = .1, at = 0, buf = 'white' }) {
    if (!this.live) return;
    const t = this.ctx.currentTime + at;
    const s = this.ctx.createBufferSource(); s.buffer = this.buffers[buf];
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.out(x, 0);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g);
    s.start(t, Math.random() * 1.5, dur + .05);
  },

  // a pitched blip with an optional slide
  tone({ x = null, type = 'sine', freq = 440, to = null, dur = .1, gain = .1, at = 0, attack = .002 }) {
    if (!this.live) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.out(x, 0);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); o.start(t); o.stop(t + dur + .05);
  },

  // ---------------------------------------------------------------- the constant stuff
  startBeds() {
    // room tone
    this.loop('brown', 'lowpass', 200, .7, null, .045);
    // monad's fans, breathing a little
    const fan = this.loop('white', 'bandpass', 720, .6, POS.server, .009);
    this.lfo(fan.gain, .13, .003);
    this.beds.fan = fan;
    // mains hum
    this.osc('sine', 60, POS.server, .005);
    this.osc('sine', 120, POS.crt, .0025);
    // the Phosphor Artifact's flyback whine, for those who can still hear it
    this.beds.whine = this.osc('sine', 15734, POS.crt, .0016);
    // wind outside the window
    const wind = this.loop('brown', 'lowpass', 420, 1, POS.window - 200, .012);
    this.lfo(wind.gain, .05, .009);
    this.beds.wind = wind;
    // the city, only really audible from the roof
    this.beds.city = this.loop('brown', 'lowpass', 260, .8, null, 0);
    // fridge compressor, silent until the door opens
    const fr = this.ctx.createOscillator(); fr.type = 'sawtooth'; fr.frequency.value = 50;
    const frf = this.ctx.createBiquadFilter(); frf.type = 'lowpass'; frf.frequency.value = 140;
    this.beds.fridge = this.out(POS.fridge, 0);
    fr.connect(frf).connect(this.beds.fridge); fr.start();
    // the bathroom's fluorescent tube, silent until you're in there
    const tube = this.ctx.createOscillator(); tube.type = 'sawtooth'; tube.frequency.value = 120;
    const tf = this.ctx.createBiquadFilter(); tf.type = 'bandpass'; tf.frequency.value = 1200; tf.Q.value = .8;
    this.beds.buzz = this.out(800, 0);
    tube.connect(tf).connect(this.beds.buzz); tube.start();
  },

  // ---------------------------------------------------------------- things that happen on their own
  startEvents() {
    const every = (min, max, fn) => {
      const go = () => { setTimeout(go, rand(min, max)); if (this.live) fn(); };
      setTimeout(go, rand(min, max));
    };
    // the clock
    let tock = false;
    setInterval(() => {
      if (!this.live || this.room !== 'main') return;
      tock = !tock;
      this.burst({ x: POS.clock, freq: tock ? 3000 : 3600, q: 8, dur: .012, gain: .018 });
    }, 1000);
    every(4000, 14000, () => { if (!this.asleep) this.typing(); });
    every(9000, 30000, () => this.hdd());
    every(55000, 130000, () => this.pipes());
    every(20000, 60000, () => { if (!this.asleep) this.mouse(); });
    // the hallway: a dripping tap, and a smoke detector that wants a battery
    every(1800, 3400, () => { if (this.room === 'hallway' || this.room === 'bathroom') this.drip(); });
    // somewhere out there, a siren
    every(50000, 140000, () => { if (this.room === 'roof') this.siren(); });
    // the tube stutters
    every(3000, 9000, () => { if (this.room === 'bathroom') this.flicker(); });
    every(40000, 90000, () => { if (this.room === 'hallway') this.chirp(); });
  },

  drip() {
    this.tone({ x: 1142, freq: rand(1300, 1700), to: 700, dur: .09, gain: .03 });
  },

  flicker() {
    if (!this.beds.buzz) return;
    const t = this.ctx.currentTime, g = this.beds.buzz.gain;
    g.setValueAtTime(0, t); g.setValueAtTime(.02, t + .06); g.setValueAtTime(0, t + .1); g.setValueAtTime(.012, t + .18);
    this.burst({ x: 800, freq: 3000, q: 4, dur: .02, gain: .03, at: .06 });
    document.dispatchEvent(new CustomEvent('tubeflicker'));
  },

  siren() {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'triangle';
    const wob = c.createOscillator(); wob.frequency.value = .35;
    const wd = c.createGain(); wd.gain.value = 180;
    o.frequency.value = 720; wob.connect(wd).connect(o.frequency);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    const g = this.out(rand(100, 1500), 0);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.007, t + 3); g.gain.linearRampToValueAtTime(0, t + 9);
    o.connect(lp).connect(g); o.start(t); wob.start(t); o.stop(t + 9.2); wob.stop(t + 9.2);
  },

  chirp() {
    this.tone({ x: 840, type: 'square', freq: 3200, dur: .07, gain: .03 });
  },

  beep(n = 3) {
    for (let i = 0; i < n; i++) this.tone({ x: 1520, type: 'square', freq: 2000, dur: .12, gain: .03, at: i * .22 });
  },

  switchClick() { this.burst({ freq: 2400, q: 3, dur: .015, gain: .12 }); this.burst({ freq: 900, q: 2, dur: .02, gain: .08, at: .01 }); },

  doorOpen() {
    this.tone({ freq: 180, to: 120, dur: .5, gain: .08, attack: .05 }); // creak
    this.tone({ type: 'sawtooth', freq: 320, to: 280, dur: .6, gain: .015, attack: .1 });
    this.burst({ freq: 200, type: 'lowpass', dur: .2, gain: .3, at: .5 });
  },

  // the radio is haunted: static, then a few notes nobody tuned in
  haunt() {
    if (!this.live) return;
    this.burst({ x: 460, freq: 2500, q: .6, dur: .9, gain: .05 });
    const notes = [392, 370, 311, 294];
    notes.forEach((f, i) => {
      this.tone({ x: 460, freq: f, dur: 1.1, gain: .025, at: .6 + i * .7, attack: .15 });
      this.tone({ x: 460, freq: f * 1.007, dur: 1.1, gain: .012, at: .62 + i * .7, attack: .2 });
    });
    this.burst({ x: 460, freq: 2500, q: .6, dur: .5, gain: .04, at: 3.6 });
  },

  typing() {
    // skizy, trying things
    const n = Math.floor(rand(8, 45));
    let at = 0;
    const g = (this.quiet ? .5 : 1) * this.near;
    for (let i = 0; i < n; i++) {
      at += rand(.05, .17) + (Math.random() < .08 ? rand(.2, .5) : 0);
      const space = Math.random() < .12;
      this.burst({ x: POS.mel, freq: space ? 1400 : rand(2400, 4200), q: 2.5, dur: space ? .035 : .018, gain: .045 * g, at });
      this.burst({ x: POS.mel, freq: 500, q: 1, type: 'lowpass', dur: .03, gain: .05 * g, at });
    }
    if (Math.random() < .35) { // enter, then a considered pause
      at += rand(.15, .3);
      this.burst({ x: POS.mel, freq: 1200, q: 2, dur: .05, gain: .07 * g, at });
    }
  },

  mouse() {
    if (this.room !== 'main') return;
    this.burst({ x: POS.mel + 60, freq: 4500, q: 4, dur: .01, gain: .04 });
    if (Math.random() < .5) this.burst({ x: POS.mel + 60, freq: 4500, q: 4, dur: .01, gain: .04, at: .11 });
  },

  hdd() {
    // monad seeking
    let at = 0;
    const n = Math.floor(rand(3, 10));
    for (let i = 0; i < n; i++) {
      at += rand(.025, .09);
      this.burst({ x: POS.server, freq: rand(2500, 5000), q: 6, dur: .008, gain: .05 * this.near, at });
    }
  },

  pipes() {
    // the pipes in the walls growl at night
    if (!this.live) return;
    const c = this.ctx, t = c.currentTime;
    const x = Math.random() < .5 ? rand(0, 300) : rand(1300, 1600);
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(rand(38, 48), t);
    o.frequency.linearRampToValueAtTime(rand(30, 40), t + 4);
    const wob = c.createOscillator(); wob.frequency.value = rand(2, 5);
    const wd = c.createGain(); wd.gain.value = 3;
    wob.connect(wd).connect(o.frequency);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 170; f.Q.value = 4;
    const g = this.out(x, 0);
    g.gain.setValueAtTime(0, t);
    const loud = { main: .09, bathroom: .22, roof: .05, closet: .12 }[this.room] ?? .14; // the pipes are closer out here, and closest in the bathroom
    g.gain.linearRampToValueAtTime(loud, t + 1.4);
    g.gain.setValueAtTime(loud, t + 2.4);
    g.gain.linearRampToValueAtTime(0, t + 4.5);
    o.connect(f).connect(g);
    o.start(t); wob.start(t); o.stop(t + 4.6); wob.stop(t + 4.6);
    // and then something in the pipe settles
    for (let i = 0; i < 3; i++) {
      this.tone({ x, freq: rand(900, 1900), dur: .5, gain: .012, at: 4.2 + i * rand(.2, .6) });
    }
  },

  // ---------------------------------------------------------------- sound effects


  blip(who) {
    const f = { mira: 880, claube: 330, mel: 520, aether: 1180 }[who] || 440;
    this.tone({ x: POS[who], type: 'square', freq: f, dur: .06, gain: .018 });
  },

  tick() { this.burst({ freq: 1800, q: 3, dur: .012, gain: .05 }); },

  fridge(open) {
    this.burst({ x: POS.fridge, freq: 260, type: 'lowpass', dur: .14, gain: .35 });
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.beds.fridge.gain.setTargetAtTime(open ? .03 : 0, t, open ? .4 : .08);
    if (open) this.burst({ x: POS.fridge, freq: 1200, q: 1, dur: .25, gain: .04, at: .03 }); // the seal
  },

  powerOn() {
    this.tone({ x: POS.crt, freq: 220, to: 55, dur: .35, gain: .25 });
    this.burst({ x: POS.crt, freq: 4000, type: 'highpass', dur: .5, gain: .05, at: .05 });
    if (this.beds.whine) {
      const t = this.ctx.currentTime;
      this.beds.whine.o.frequency.setValueAtTime(9000, t);
      this.beds.whine.o.frequency.exponentialRampToValueAtTime(15734, t + .8);
    }
  },

  degauss() {
    // the big satisfying BWONG
    this.tone({ x: POS.crt, freq: 95, to: 42, dur: 1.1, gain: .35, attack: .01 });
    this.tone({ x: POS.crt, type: 'sawtooth', freq: 60, to: 50, dur: .7, gain: .04, attack: .01 });
    this.burst({ x: POS.crt, freq: 900, type: 'lowpass', dur: .4, gain: .12 });
  },

  staticBurst() { this.burst({ x: POS.crt, freq: 3500, q: .5, dur: .18, gain: .05 }); },

  standUp() { this.burst({ freq: 180, type: 'lowpass', dur: .12, gain: .25 }); },

  scribbling: null,
  scribble(on) {
    clearTimeout(this.scribbling);
    if (!on) return;
    const scratch = () => {
      this.burst({ x: POS.claube, freq: rand(3000, 5500), q: 1.5, dur: rand(.04, .09), gain: .03 });
      this.scribbling = setTimeout(scratch, rand(80, 190));
    };
    scratch();
  },
};

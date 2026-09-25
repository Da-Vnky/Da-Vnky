// the clock radio on the music station. mostly static. three frequencies have something on them.
import { audio } from './audio.js';

export const STATIONS = [88.8, 96.3, 104.5];
const LOW = 87.9, HIGH = 108;
const WIDTH = .35; // how far off a station you can be and still hear it
// how it sounds from each room: full in the bedroom, through a wall elsewhere
const THROUGH_WALL = { bedroom: [20000, 1], main: [600, .35], hallway: [400, .2], bathroom: [350, .15], closet: [300, .12], roof: [200, .04] };

export const radio = {
  on: false,
  freq: 96.0,
  room: 'main',
  graph: null,
  locked: null,
  onLock: null, // called with a station when you tune onto it
  seq: null,
  next: { melody: 0, modem: 0 },
  phrase: 0,

  build() {
    if (this.graph) return true;
    if (!audio.init()) return false;
    const c = audio.ctx;
    const bus = c.createGain();
    const speaker = c.createBiquadFilter(); speaker.type = 'bandpass'; speaker.frequency.value = 1500; speaker.Q.value = .55; // a small, cheap speaker
    const muffle = c.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 20000;
    const out = c.createGain(); out.gain.value = 0;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    bus.connect(speaker).connect(muffle).connect(out);
    if (pan) { pan.pan.value = -.42; out.connect(pan).connect(c.destination); } else out.connect(c.destination);

    // static, always there underneath
    const st = c.createBufferSource(); st.buffer = audio.buffers.white; st.loop = true;
    const sf = c.createBiquadFilter(); sf.type = 'highpass'; sf.frequency.value = 800;
    const staticGain = c.createGain(); staticGain.gain.value = .2;
    st.connect(sf).connect(staticGain).connect(bus); st.start();

    const signals = STATIONS.map(() => { const g = c.createGain(); g.gain.value = 0; g.connect(bus); return g; });

    // 88.8: a star, sped up. two tones swelling on a 3.32 second cycle
    const pulse = c.createGain(); pulse.gain.value = .22;
    for (const f of [220, 331]) { const o = c.createOscillator(); o.frequency.value = f; o.connect(pulse); o.start(); }
    const lfo = c.createOscillator(); lfo.frequency.value = 1 / 3.32;
    const depth = c.createGain(); depth.gain.value = .2;
    lfo.connect(depth).connect(pulse.gain); lfo.start();
    pulse.connect(signals[0]);

    this.graph = { out, muffle, staticGain, signals };
    this.applyRoom(true);
    this.tune(this.freq);
    return true;
  },

  // ------------------------------------------------------------ the sequenced stations
  schedule() {
    const c = audio.ctx;
    if (!c || !this.on) return;
    const ahead = c.currentTime + 1.2;
    // 96.3: a music box that nobody is winding. each time round it's a little further along
    if (this.next.melody < c.currentTime) this.next.melody = c.currentTime + .1;
    while (this.next.melody < ahead) {
      const notes = [[659, 587, 523, 494, 523, 440, 392, 440], [523, 494, 440, 392, 440, 349, 330, 349], [659, 698, 659, 587, 523, 494, 523, 440]][this.phrase % 3];
      notes.forEach((f, i) => this.box(f, this.next.melody + i * .78));
      this.next.melody += notes.length * .78 + .6;
      this.phrase++;
    }
    // 104.5: a modem, forever handshaking
    if (this.next.modem < c.currentTime) this.next.modem = c.currentTime + .1;
    while (this.next.modem < ahead) {
      this.modem(this.next.modem);
      this.next.modem += 5.6;
    }
  },

  box(f, t) {
    const c = audio.ctx, dest = this.graph.signals[1];
    const cents = (Math.random() - .5) * 30; // it's slightly out of tune, differently each time
    for (const [type, mult, g] of [['triangle', 1, .22], ['sine', 2.003, .06]]) {
      const o = c.createOscillator(); o.type = type;
      o.frequency.value = f * mult; o.detune.value = cents;
      const e = c.createGain();
      e.gain.setValueAtTime(.0001, t);
      e.gain.exponentialRampToValueAtTime(g, t + .012);
      e.gain.exponentialRampToValueAtTime(.0001, t + 1.5);
      o.connect(e).connect(dest); o.start(t); o.stop(t + 1.6);
    }
  },

  modem(t) {
    const c = audio.ctx, dest = this.graph.signals[2];
    const tone = (f, at, d, type = 'sine', g = .18) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f;
      const e = c.createGain(); e.gain.value = 0;
      e.gain.setValueAtTime(g, t + at); e.gain.setValueAtTime(0, t + at + d);
      o.connect(e).connect(dest); o.start(t + at); o.stop(t + at + d + .02);
    };
    tone(2100, 0, .8);
    for (let i = 0; i < 6; i++) tone(i % 2 ? 2400 : 1300, .95 + i * .13, .12, 'square', .06);
    const n = c.createBufferSource(); n.buffer = audio.buffers.white;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 1.2;
    const e = c.createGain(); e.gain.setValueAtTime(0, t); e.gain.setValueAtTime(.3, t + 1.8); e.gain.setValueAtTime(0, t + 3.3);
    n.connect(bp).connect(e).connect(dest); n.start(t + 1.8, Math.random(), 1.6);
    tone(980, 3.5, .5, 'sine', .1); tone(1180, 3.5, .5, 'sine', .1);
  },

  // ------------------------------------------------------------ controls
  setOn(on) {
    if (!this.build()) return;
    this.on = on;
    audio.ctx.resume();
    clearInterval(this.seq);
    if (on) { this.schedule(); this.seq = setInterval(() => this.schedule(), 400); }
    this.applyRoom(false);
  },
  toggle() { this.setOn(!this.on); },

  tune(f) {
    this.freq = Math.round(Math.min(HIGH, Math.max(LOW, f)) * 10) / 10;
    if (!this.graph) return;
    const t = audio.ctx.currentTime;
    let best = null, bestStrength = 0;
    STATIONS.forEach((s, i) => {
      const strength = Math.max(0, 1 - Math.abs(this.freq - s) / WIDTH);
      this.graph.signals[i].gain.setTargetAtTime(Math.pow(strength, 1.5) * .9, t, .05);
      if (strength > bestStrength) { bestStrength = strength; best = s; }
    });
    this.graph.staticGain.gain.setTargetAtTime(.02 + .2 * (1 - bestStrength * .92), t, .05);
    const locked = bestStrength > .75 ? best : null;
    if (locked !== this.locked) {
      this.locked = locked;
      if (locked && this.on) this.onLock?.(locked);
    }
  },

  setRoom(id) { this.room = id; this.applyRoom(false); },
  applyRoom(instant) {
    if (!this.graph) return;
    const [freq, wall] = THROUGH_WALL[this.room] || THROUGH_WALL.main;
    const t = audio.ctx.currentTime, k = instant ? .001 : .3;
    this.graph.muffle.frequency.setTargetAtTime(freq, t, k);
    this.graph.out.gain.setTargetAtTime(this.on ? .55 * wall : 0, t, k);
  },
};

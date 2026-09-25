// the music station: plays assets/playlist/playlist.json (a copy of the site's var/assets/audio/playlist).
// new songs added to that json show up on the station automatically.
import { audio } from './audio.js';

const DIR = 'assets/playlist/';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
// how the music sounds from each room: full in the bedroom, through a wall elsewhere
const THROUGH_WALL = { bedroom: [20000, 1], main: [650, .45], hallway: [420, .3], bathroom: [380, .22], closet: [320, .18], roof: [220, .06] };

export const music = {
  tracks: [],
  index: 0,
  volume: Math.min(1, Math.max(0, parseFloat(store.get('room_volume') ?? '.7'))),
  el: null,
  graph: null,
  room: 'main',
  listeners: new Set(),

  onChange(fn) { this.listeners.add(fn); },
  emit() { for (const fn of this.listeners) fn(this); },

  async load() {
    try {
      const res = await fetch(DIR + 'playlist.json', { cache: 'no-cache' });
      this.tracks = (await res.json()).filter(t => t && t.file);
    } catch { this.tracks = []; }
    this.emit();
  },

  get playing() { return !!this.el && !this.el.paused; },
  get current() { return this.tracks[this.index]; },
  get time() { return this.el?.currentTime || 0; },
  get duration() { return this.el && isFinite(this.el.duration) ? this.el.duration : 0; },

  graphReady() {
    if (this.graph) return true;
    if (!audio.init()) return false;
    const c = audio.ctx;
    this.el = new Audio();
    this.el.preload = 'auto';
    this.el.addEventListener('ended', () => this.next());
    this.el.addEventListener('play', () => this.emit());
    this.el.addEventListener('pause', () => this.emit());
    const src = c.createMediaElementSource(this.el);
    const analyser = c.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .78;
    const split = c.createChannelSplitter(2);
    const left = c.createAnalyser(); left.fftSize = 512;
    const right = c.createAnalyser(); right.fftSize = 512;
    const muffle = c.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 20000;
    const gain = c.createGain();
    src.connect(analyser);
    src.connect(split); split.connect(left, 0); split.connect(right, 1);
    src.connect(muffle).connect(gain).connect(c.destination);
    this.graph = {
      analyser, left, right, muffle, gain,
      bins: new Uint8Array(analyser.frequencyBinCount),
      wave: new Float32Array(512),
    };
    // keep the audio context awake in a background tab while music plays
    audio.keepAwake = () => this.playing;
    this.applyLevel(true);
    return true;
  },

  applyLevel(instant) {
    if (!this.graph) return;
    const [freq, wall] = THROUGH_WALL[this.room] || THROUGH_WALL.main;
    const t = audio.ctx.currentTime, k = instant ? 0 : .35;
    const vol = this.volume * this.volume * wall; // squared, so the knob feels even
    this.graph.muffle.frequency.setTargetAtTime(freq, t, k || .001);
    this.graph.gain.gain.setTargetAtTime(vol, t, k || .001);
  },

  setRoom(id) { this.room = id; this.applyLevel(false); },

  play(i = this.index) {
    if (!this.tracks.length || !this.graphReady()) return;
    audio.ctx.resume();
    if (i !== this.index || !this.el.src) {
      this.index = (i + this.tracks.length) % this.tracks.length;
      this.el.src = DIR + this.tracks[this.index].file;
    }
    this.el.play().catch(() => {});
    this.emit();
  },
  toggle() { if (this.playing) this.el.pause(); else this.play(); },
  next() { this.play(this.index + 1); },
  prev() {
    if (this.time > 3) { this.el.currentTime = 0; return; }
    this.play(this.index - 1);
  },
  nudgeVolume(d) {
    this.volume = Math.round(Math.min(1, Math.max(0, this.volume + d)) * 10) / 10;
    store.set('room_volume', String(this.volume));
    this.applyLevel(false);
    this.emit();
  },

  // for the needles, the bars and the speaker cones
  levels() {
    const g = this.graph;
    if (!g || !this.playing) return { l: 0, r: 0, bass: 0, bands: null };
    const rms = a => {
      a.getFloatTimeDomainData(g.wave);
      let s = 0;
      for (let i = 0; i < g.wave.length; i++) s += g.wave[i] * g.wave[i];
      return Math.sqrt(s / g.wave.length);
    };
    const l = rms(g.left);
    let r = rms(g.right);
    if (r < .0005 && l > 0) r = l * (.92 + Math.random() * .1); // mono file: fake the second needle
    g.analyser.getByteFrequencyData(g.bins);
    const bands = [];
    const n = 16;
    for (let b = 0; b < n; b++) {
      // roughly logarithmic bands
      const lo = Math.floor(Math.pow(g.bins.length, b / n)), hi = Math.max(lo + 1, Math.floor(Math.pow(g.bins.length, (b + 1) / n)));
      let m = 0;
      for (let i = lo; i < hi && i < g.bins.length; i++) m = Math.max(m, g.bins[i]);
      bands.push(m / 255);
    }
    const bass = (g.bins[1] + g.bins[2] + g.bins[3]) / (3 * 255);
    return { l, r, bass, bands };
  },
};

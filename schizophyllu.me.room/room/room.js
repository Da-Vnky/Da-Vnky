// THE ROOM
// an SVG apartment with the whole site running on the CRT.
import {
  CAST, SCENE_WINDOW, SCENE_SSD, OBJECTS, MEL_TALK, MEL_WORK, WHAT_IS_THIS_ROOM,
  FRIDGE_FIRST, CLAUBE_TALK, MIRA_TALK, AMBIENT, LINGER, LEAVING, FUNGER_AFTER, DRAWING_HOVER,
  JUST_STAY, HOVER_WRITING, NOT_WRITING,
} from './script.js';
import { NARRATION, ROOMS, PEEPHOLE, FOG, MIRROR, RADIO, CLOSET_FIRST, STAR_RARE } from './narration.js';
import { RETURNING, MUSIC, AMBIENT_MORE } from './extra.js';
import { audio } from './audio.js';
import { music } from './music.js';
import { radio, STATIONS } from './radio.js';

const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

// hands out items in a shuffled order, reshuffling when it runs dry, never repeating back-to-back
function bag(list) {
  let queue = [], last;
  return () => {
    if (!queue.length) {
      queue = list.slice().sort(() => Math.random() - .5);
      if (queue.length > 1 && queue[queue.length - 1] === last) queue.unshift(queue.pop());
    }
    return (last = queue.pop());
  };
}

const bags = {
  mel: bag(MEL_TALK), melWork: bag(MEL_WORK), claube: bag(CLAUBE_TALK), mira: bag(MIRA_TALK),
  ambient: bag([...AMBIENT, ...AMBIENT_MORE]), linger: bag(LINGER), leaving: bag(LEAVING),
  music: bag(MUSIC), funger: bag(FUNGER_AFTER),
};
for (const [room, list] of Object.entries(RETURNING)) bags['back:' + room] = bag(list);
for (const [f, list] of Object.entries(RADIO)) bags['fm:' + f] = bag(list);
for (const [id, o] of Object.entries(OBJECTS)) if (o.lines.length) bags[id] = bag(o.lines);
for (const [id, o] of Object.entries(NARRATION)) if (o.lines?.length) bags['n:' + id] = bag(o.lines);

const NAMES = { mira: CAST.mira.name, claube: 'Claube / WATCHLION', mel: 'skizy' };
// bubble alignment per speaker, so the ones near the edge don't fall off the stage
const ALIGN = { mira: ['-40%', '40%'], mel: ['-50%', '50%'], claube: ['-78%', '78%'] };

const body = document.body;
const stage = $('#stage');
const frame = $('#crt-frame');
const site = $('#crt-site');
const game = $('#crt-game');
let svg, anchors = {};      // svg is the main room; the other rooms load when you first walk in
let mode = 'loading';       // loading | intro | room | scene | crt | station | moving
let current = 'main';
const roomEls = {};
let lastActivity = performance.now();

// ============================================================ sound
function soundLabel() { $('#btn-sound').textContent = `[ ambience: ${audio.on ? 'on' : 'off'} ]`; }
$('#btn-sound').addEventListener('click', () => { audio.toggle(); soundLabel(); });
soundLabel();
// browsers need a gesture before audio; the first click anywhere counts
addEventListener('pointerdown', () => { if (audio.on) { audio.init(); audio.resume(); } }, { once: true });

// ============================================================ noise texture (film grain + CRT static)
{
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const img = x.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  document.documentElement.style.setProperty('--noise', `url(${c.toDataURL()})`);
}

// ============================================================ text helpers
const esc = s => s.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
const fmt = s => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');
const readTime = t => Math.min(9000, 1600 + t.length * 48);

// ============================================================ speech bubbles (free roam)
let talkToken = 0;
function clearBubbles() {
  $('#bubbles').innerHTML = '';
  svg?.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));
}
async function say(exchange) {
  if (!exchange) return;
  const token = ++talkToken;
  clearBubbles();
  const claube = svg.querySelector('#claube');
  for (const [who, text, dir] of exchange) {
    if (token !== talkToken) return;
    if (who === '-') { // a beat. a 'hush' beat silences the whole room for a moment
      clearBubbles();
      if (dir === 'hush') audio.hold(3);
      await sleep(dir === 'hush' ? 3200 : 1300);
      continue;
    }
    const a = anchors[who];
    const b = document.createElement('div');
    b.className = 'bubble';
    b.style.setProperty('--c', CAST[who].color);
    b.style.setProperty('--ax', ALIGN[who][0]);
    b.style.setProperty('--tail', ALIGN[who][1]);
    b.style.left = (a.x / 1600 * 100) + '%';
    b.style.top = (a.y / 900 * 100) + '%';
    b.innerHTML = `<span class="who">${esc(CAST[who].name)}</span>`
      + (dir ? `<span class="dir">(${esc(dir)})</span>` : '')
      + (text ? fmt(text) : '');
    clearBubbles();
    $('#bubbles').append(b);
    svg.querySelector('#' + who)?.classList.add('speaking');
    const writing = who === 'claube' && /writ/.test(dir || '');
    if (writing) { claube.classList.add('writing'); audio.scribble(true); }
    if (text) audio.blip(who);
    await sleep(text ? readTime(text) : 1800);
    if (writing) { claube.classList.remove('writing'); audio.scribble(false); }
    if (token !== talkToken) return;
    b.classList.add('out');
    svg.querySelector('#' + who)?.classList.remove('speaking');
    await sleep(350);
  }
  if (token === talkToken) clearBubbles();
}
const hush = () => {
  talkToken++;
  clearBubbles();
  svg?.querySelector('#claube').classList.remove('writing');
  audio.scribble(false);
};
const talking = () => $('#bubbles').childElementCount > 0;

// ============================================================ dialogue box (scenes)
const dlg = { box: $('#dialogue'), name: $('#dlg-name'), dir: $('#dlg-dir'), text: $('#dlg-text') };
let advance = null, skipScene = false;
function waitAdvance() { return new Promise(r => (advance = r)); }
function nudge() { const r = advance; advance = null; r?.(); }
dlg.box.addEventListener('click', e => { if (e.target.id !== 'dlg-skip') nudge(); });
$('#dlg-skip').addEventListener('click', e => { e.stopPropagation(); skipScene = true; nudge(); });

async function typeOut(el, html) {
  // types the text out; a click fills it in at once
  el.innerHTML = '';
  const tmp = document.createElement('div'); tmp.innerHTML = html;
  const full = tmp.textContent;
  let done = false;
  const finish = waitAdvance().then(() => { done = true; });
  for (let i = 1; i <= full.length && !done; i++) {
    el.textContent = full.slice(0, i);
    await sleep(full[i - 1].match(/[.,?!—…]/) ? 60 : 16);
  }
  if (!done) { advance = null; }
  el.innerHTML = html;
  void finish;
}

async function playScene(lines) {
  const prev = mode;
  mode = 'scene';
  hush();
  closeMenu();
  body.classList.add('busy');
  skipScene = false;
  dlg.box.hidden = false;
  const claube = svg.querySelector('#claube');
  for (const [who, text, extra] of lines) {
    if (skipScene) break;
    svg.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));
    const writing = (who === '-' && extra === 'write') || extra === 'still writing';
    if (writing !== claube.classList.contains('writing')) audio.scribble(writing);
    claube.classList.toggle('writing', writing);
    if (who === '-') {
      dlg.box.style.setProperty('--c', '#4f6a5c');
      dlg.name.textContent = '';
      dlg.dir.textContent = '';
      dlg.text.className = 'direction';
      dlg.text.textContent = text;
      await waitAdvance();
      continue;
    }
    svg.querySelector('#' + who)?.classList.add('speaking');
    dlg.box.style.setProperty('--c', CAST[who].color);
    dlg.name.textContent = CAST[who].name;
    dlg.dir.textContent = extra && extra !== 'write' ? extra : '';
    dlg.text.className = '';
    audio.blip(who);
    await typeOut(dlg.text, fmt(text));
    if (skipScene) break;
    await waitAdvance();
  }
  claube.classList.remove('writing');
  audio.scribble(false);
  svg.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));
  dlg.box.hidden = true;
  body.classList.remove('busy');
  mode = prev === 'scene' ? 'room' : prev;
  lastActivity = performance.now();
}

addEventListener('keydown', e => {
  if (mode === 'scene' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); nudge(); }
  if (e.key === 'Escape') {
    if (!$('#menu').hidden) closeMenu();
    else if (!$('#peephole').hidden) closePeephole();
    else if (!$('#closeup').hidden) closeCloseup();
    else if (mode === 'crt') leaveCRT();
    else if (mode === 'station') leaveStation();
  }
  if (mode === 'room' && $('#menu').hidden && !e.target.closest?.('input, textarea')) {
    if (e.key === 'ArrowLeft' && ROOMS[current].left) goTo(ROOMS[current].left);
    if (e.key === 'ArrowRight' && ROOMS[current].right) goTo(ROOMS[current].right);
  }
});

// ============================================================ menus
function openMenu(title, color, options) {
  const m = $('#menu');
  m.style.setProperty('--c', color);
  m.innerHTML = `<div class="menu-title">${esc(title)}</div>`;
  for (const [label, fn] of [...options, ['never mind', null]]) {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', () => { closeMenu(); fn?.(); });
    m.append(b);
  }
  m.hidden = false;
  m.querySelector('button').focus({ preventScroll: true });
}
function closeMenu() { $('#menu').hidden = true; }

// ============================================================ the Phosphor Artifact
let zoomScale = 1;
const SITE_W = 1280;
// the real site, running live on the Phosphor Artifact
const SITE = 'https://schizophyllu.me/';

function fitSite(using) {
  // the site renders at 1280x960 and is scaled into the screen. when you're using it
  // on a small display, render it narrower so the text stays readable.
  const w = frame.clientWidth;
  if (!w) return;
  let internal = SITE_W;
  if (using) {
    const shown = w * zoomScale;
    internal = shown >= SITE_W ? SITE_W : Math.round(Math.max(shown, Math.min(SITE_W, shown / .72)));
  }
  for (const f of [site, game]) {
    f.style.width = internal + 'px';
    f.style.height = Math.round(internal * .75) + 'px';
    f.style.transform = `scale(${w / internal})`;
  }
}
new ResizeObserver(() => fitSite(mode === 'crt')).observe(frame);

let savedScroll = 0;
const CRT_RECT = { x: 668, y: 364, w: 164, h: 123 };
const STATION_RECT = { x: 290, y: 330, w: 590, h: 250 };
let zoomRect = CRT_RECT, zoomFit = [.96, .94];
function zoomTo(rect, fit) {
  zoomRect = rect; zoomFit = fit;
  zoomToScreen();
}
function zoomToScreen() {
  const vp = $('#viewport');
  if (vp.scrollLeft) { savedScroll = vp.scrollLeft; vp.scrollLeft = 0; }
  stage.style.transition = 'none';
  const prev = stage.style.transform;
  stage.style.transform = '';
  const sr = stage.getBoundingClientRect();
  stage.style.transform = prev;
  void stage.offsetWidth;
  stage.style.transition = '';
  const r = zoomRect;
  const scr = { x: sr.width * r.x / 1600, y: sr.height * r.y / 900, w: sr.width * r.w / 1600, h: sr.height * r.h / 900 };
  const vw = innerWidth, vh = innerHeight - 44; // leave room for the step-back bar
  zoomScale = Math.min(vw * zoomFit[0] / scr.w, vh * zoomFit[1] / scr.h);
  const tx = vw / 2 - sr.left - (scr.x + scr.w / 2) * zoomScale;
  const ty = vh / 2 - sr.top - (scr.y + scr.h / 2) * zoomScale;
  stage.style.transform = `translate(${tx}px, ${ty}px) scale(${zoomScale})`;
}

async function useCRT() {
  if (mode !== 'room') return;
  mode = 'crt';
  audio.quiet = true;
  hush(); closeMenu();
  $('#hover-label').classList.remove('show');
  body.classList.add('zoomed');
  zoomTo(CRT_RECT, [.96, .94]);
  await sleep(1100);
  if (mode !== 'crt') return;
  body.classList.add('using');
  stage.style.setProperty('--z', zoomScale);
  frame.classList.remove('poweron');
  frame.classList.add('degauss');
  audio.degauss();
  setTimeout(() => frame.classList.remove('degauss'), 950);
  fitSite(true);
  $('#standup').hidden = false;
  const screen = input === 'game' ? game : site;
  screen.tabIndex = 0;
  screen.focus();
}
async function leaveCRT() {
  if (mode !== 'crt') return;
  body.classList.remove('using');
  audio.standUp();
  audio.quiet = false;
  stage.style.setProperty('--z', 1);
  $('#standup').hidden = true;
  site.tabIndex = game.tabIndex = -1;
  stage.style.transform = '';
  zoomScale = 1;
  fitSite(false);
  await sleep(1100);
  body.classList.remove('zoomed');
  $('#viewport').scrollLeft = savedScroll;
  mode = 'room';
  lastActivity = performance.now();
  // someone always has something to say about your run
  if (input === 'game' && Math.random() < .6) say(bags.funger());
}
$('#btn-standup').addEventListener('click', () => (mode === 'station' ? leaveStation() : leaveCRT()));
// clicking anywhere around the screen while zoomed steps back
$('#viewport').addEventListener('click', e => {
  if (mode === 'crt' && !frame.contains(e.target)) leaveCRT();
  if (mode === 'station' && !e.target.closest('#station')) leaveStation();
});
addEventListener('resize', () => {
  if (mode === 'crt') { zoomToScreen(); fitSite(true); }
  if (mode === 'station') zoomToScreen();
});

function bootCRT() {
  if (site.src) return;
  site.src = SITE;
  const staticEl = $('#crt-static');
  let first = true;
  site.addEventListener('load', () => {
    if (first) {
      // warm up the tube
      first = false;
      frame.classList.add('on', 'poweron');
      audio.powerOn();
      setTimeout(() => frame.classList.remove('poweron'), 950);
    } else {
      // the site is on another origin, so we only find out once the new page has arrived:
      // a burst of static every time it changes page
      staticEl.classList.add('flash');
      audio.staticBurst();
      setTimeout(() => staticEl.classList.remove('flash'), 180);
    }
  });
}
function showOnCRT(url) {
  switchInput('site');
  $('#crt-static').classList.add('flash');
  audio.staticBurst();
  site.src = url;
}

// ============================================================ the console
// it's plugged into the Phosphor Artifact. funger gets its own iframe so the game keeps
// running while you step back or flip over to the site
let input = 'site';
function switchInput(to) {
  if (to === input) return;
  input = to;
  if (to === 'game' && !game.src) game.src = SITE + 'funger/';
  site.classList.toggle('off', to !== 'site');
  game.classList.toggle('off', to !== 'game');
  svg.querySelector('#console-led').setAttribute('fill', to === 'game' ? '#ff5a4a' : '#3a3a3e');
  const staticEl = $('#crt-static');
  staticEl.classList.add('flash');
  audio.staticBurst();
  setTimeout(() => staticEl.classList.remove('flash'), 180);
}
function playConsole() {
  switchInput('game');
  useCRT();
}

// ============================================================ fridge
function toggleFridge(open) {
  svg.querySelector('#fridge-open').style.display = open ? '' : 'none';
  svg.querySelector('#fridge-closed').style.display = open ? 'none' : '';
  svg.querySelector('#fridgeglow').style.display = open ? '' : 'none';
  audio.fridge(open);
  if (open && !toggleFridge.seen) {
    toggleFridge.seen = true;
    say(FRIDGE_FIRST);
  }
}
let fridgeOpen = false;

// ============================================================ interacting
function interact(id) {
  lastActivity = performance.now();
  if (mode !== 'room') return;
  closeMenu();
  audio.tick();
  if (id === 'claube' && Date.now() < deniable) { deniable = 0; return say(NOT_WRITING); }
  switch (id) {
    case 'poster':
      return openMenu('the archive of those who watch', CAST.mira.color, [
        ['look it up on the Phosphor Artifact', () => { showOnCRT(SITE + 'var/eyes.html'); useCRT(); }],
        ['look at it', () => say(bags.poster())],
      ]);
    case 'crt':
      return openMenu('the Phosphor Artifact', CAST.mira.color, [
        [input === 'game' ? 'switch back to the site' : 'use it', () => { switchInput('site'); useCRT(); }],
        ...(input === 'game' ? [['keep playing funger', useCRT]] : []),
        ['look at it', () => say(bags.crt())],
      ]);
    case 'console':
      return openMenu('the console', CAST.mel.color, [
        ['play funger', playConsole],
        ['look at it', () => say(bags.console())],
      ]);
    case 'claube':
      return openMenu(CAST.claube.name, CAST.claube.color, [
        ['what is skizy doing?', () => playScene(SCENE_SSD)],
        ['talk', () => say(bags.claube())],
        ['what is this room?', () => say(WHAT_IS_THIS_ROOM)],
      ]);
    case 'mira':
      return openMenu(CAST.mira.name, CAST.mira.color, [
        ['talk', () => say(bags.mira())],
        ['what is this room?', () => say(WHAT_IS_THIS_ROOM)],
        ['look through the telescope again', replayIntro],
      ]);
    case 'mel':
      return openMenu(CAST.mel.name, CAST.mel.color, [
        ['talk', () => say(bags.mel())],
        ['watch her work', () => say(bags.melWork())],
        ['what is this room?', () => say(WHAT_IS_THIS_ROOM)],
      ]);
    case 'fridge':
      fridgeOpen = !fridgeOpen;
      return toggleFridge(fridgeOpen);
    case 'station':
    case 'radio':
      return useStation();
    case 'frontdoor':
      return openMenu('front door', '#b8a070', [
        ['look through the peephole', openPeephole],
        ['try the handle', () => narrate('doorhandle')],
      ]);
    case 'lavalamp': {
      const off = roomEls.bedroom.querySelector('#lavalamp').classList.toggle('off');
      roomEls.bedroom.querySelector('#lavaglow').style.display = off ? 'none' : '';
      return audio.switchClick();
    }
    case 'bulb': {
      const dark = body.classList.toggle('hall-dark');
      roomEls.hallway.querySelector('#h-bulbglow').style.display = dark ? 'none' : '';
      roomEls.hallway.querySelector('#h-darkness').style.display = dark ? '' : 'none';
      roomEls.hallway.querySelector('#h-switch').setAttribute('y', dark ? 424 : 416);
      return audio.switchClick();
    }
    case 'bathroom':
      audio.doorOpen();
      return goTo('bathroom');
    case 'closetdoor':
      audio.doorOpen();
      return goTo('closet');
    case 'acloset': {
      // the autism closet. nobody narrates it but skizy
      const el = roomEls.bedroom;
      const open = el.querySelector('#ac-open').style.display === 'none';
      el.querySelector('#ac-open').style.display = open ? '' : 'none';
      el.querySelector('#ac-closed').style.display = open ? 'none' : '';
      audio.doorOpen();
      // once, quietly, after you've had a moment to look inside
      if (open && !interact.aclosetSeen) {
        interact.aclosetSeen = true;
        setTimeout(() => { if (current === 'bedroom') caption(CLOSET_FIRST); }, 6000);
      }
      return;
    }
    case 'monstera': return;
    case 'notebook':
      return openCloseup(NOTEBOOK_PAGE);
    case 'hexley': return;
    case 'vso': return openCloseup(vsoPanel());
    case 'mirastar':
      // check on her enough times and she notices. once
      if (++interact.starChecks >= 5 && !interact.starSeen) {
        interact.starSeen = true;
        caption(STAR_RARE[0]);
        return setTimeout(() => { if (current === 'roof') caption(STAR_RARE[1]); }, 3400);
      }
      return narrate('mirastar');
    case 'ladder':
      return climb('roof');
    case 'hatch':
      return climb('closet');
    case 'cbulb': {
      const el = roomEls.closet;
      const dark = body.classList.toggle('closet-dark');
      el.querySelector('#c-bulbglow').style.display = dark ? 'none' : '';
      el.querySelector('#c-darkness').style.display = dark ? '' : 'none';
      el.querySelector('#c-bulbglass').setAttribute('fill', dark ? '#3a3326' : '#ffe6b0');
      return audio.switchClick();
    }
    case 'kfridge': {
      const el = roomEls.hallway;
      const open = el.querySelector('#kf-open').style.display === 'none';
      el.querySelector('#kf-open').style.display = open ? '' : 'none';
      el.querySelector('#kf-closed').style.display = open ? 'none' : '';
      el.querySelector('#kf-glow').style.display = open ? '' : 'none';
      audio.fridge(open);
      if (open && !interact.kfridgeSeen) { interact.kfridgeSeen = true; caption(NARRATION.kfridge.first); }
      return;
    }
    case 'medcab': {
      const open = roomEls.bathroom.querySelector('#cab-inside').style.display !== 'none';
      return openMenu('mirror cabinet', '#8a9a92', [
        ['look in the mirror', fogMirror],
        [open ? 'close the cabinet' : 'open the cabinet', () => toggleCabinet(!open)],
      ]);
    }
    case 'pipes': {
      const g = roomEls.bathroom.querySelector('#t-gauge');
      g.classList.remove('spin'); void g.getBBox(); g.classList.add('spin');
      return narrate('pipes');
    }
    case 'smoke': return audio.chirp();
    case 'microwave': return audio.beep();
    default:
      if (NARRATION[id]) return narrate(id);
      if (bags[id]) say(bags[id]());
  }
}

interact.starChecks = 0;

// ============================================================ Claube, writing
// sometimes he just writes. hover him while he's at it and Mira tells on him
let deniable = 0, toldOn = false;
function claubeWrites() {
  const claube = svg.querySelector('#claube');
  if (claube.classList.contains('writing')) return;
  claube.classList.add('writing');
  audio.scribble(true);
  setTimeout(() => {
    claube.classList.remove('writing');
    audio.scribble(false);
  }, 7000 + Math.random() * 5000);
}
function hoverClaube() {
  if (toldOn || talking() || !svg.querySelector('#claube').classList.contains('writing')) return;
  toldOn = true;
  deniable = Date.now() + 20000;
  say(HOVER_WRITING);
}

// ============================================================ VSO-1
const dots = (k, v) => `${k} ${'.'.repeat(Math.max(3, 19 - k.length))} ${v}`;
function vsoPanel() {
  const writing = svg.querySelector('#claube').classList.contains('writing');
  const lines = [
    'VARIABLE-STAR OPERATIONS // VSO-1', '',
    dots('MIRA', 'LINKED'),
    dots('MONAD', 'NOMINAL'),
    dots('WATCHLION', writing ? 'WRITING' : 'FILING'),
    dots('SKIZY', 'MODIFYING SOMETHING'),
    dots('TRASH', '<span class="bad">NON-NOMINAL</span>'),
    dots('PIGEON', 'LOGGED'), '',
    // very occasionally
    dots('OBSERVER', Math.random() < .12 ? 'WELCOME' : 'STILL HERE') + ' <span class="blink">_</span>',
  ];
  return `<div class="vso" role="img" aria-label="VSO-1 status readout">${lines.join('\n')}</div>`;
}

// ============================================================ the bathroom mirror
function toggleCabinet(open) {
  const el = roomEls.bathroom;
  el.querySelector('#cab-inside').style.display = open ? '' : 'none';
  el.querySelector('#cab-door').style.display = open ? 'none' : '';
  audio.burst({ x: 780, freq: 1400, q: 2, dur: .05, gain: .08 }); // the magnet catch
}
let fogBag;
function fogMirror() {
  const el = roomEls.bathroom;
  toggleCabinet(false);
  fogBag ??= bag(FOG);
  const t = el.querySelector('#t-fog');
  t.textContent = fogBag();
  t.classList.remove('show'); void t.getBBox(); t.classList.add('show');
  caption(MIRROR);
}

// the tube light stutters in time with its sound
document.addEventListener('tubeflicker', () => {
  body.classList.add('tube-out');
  setTimeout(() => body.classList.remove('tube-out'), 170);
});

// ============================================================ captions (rooms with nobody in them)
let captionTimer;
function caption([who, text, via]) {
  const box = $('#caption');
  const isNote = who === 'note';
  box.classList.toggle('note', isNote);
  box.style.setProperty('--c', isNote ? '#4f6a5c' : CAST[who].color);
  $('#cap-who').textContent = isNote ? '' : `${CAST[who].name} (${via || 'from the other room'})`;
  $('#cap-text').textContent = text;
  box.hidden = false;
  box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
  if (!isNote) audio.blip(who);
  clearTimeout(captionTimer);
  captionTimer = setTimeout(() => (box.hidden = true), readTime(text) + 800);
}
function narrate(id) {
  const n = NARRATION[id];
  if (n.pipes) audio.pipes();
  if (bags['n:' + id]) caption(bags['n:' + id]());
}

// ============================================================ walking between rooms
function climb(id) {
  // rungs
  for (let i = 0; i < 4; i++) audio.burst({ freq: 900 + i * 60, q: 5, dur: .04, gain: .08, at: i * .16 });
  return goTo(id);
}

// every interactive thing is its own drawing in room/objects/<room>/<name>.svg, drawn in room
// coordinates. the room file keeps an empty placeholder (data-art) where each one goes, so the
// layering stays put; this pours the drawings in before anything else touches the room
const XLINK = 'http://www.w3.org/1999/xlink';
async function inlineArt(root) {
  await Promise.all([...root.querySelectorAll('[data-art]')].map(async ph => {
    const url = new URL(ph.dataset.art, location.href);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      const doc = new DOMParser().parseFromString(await res.text(), 'image/svg+xml');
      const art = doc.documentElement;
      if (art.nodeName !== 'svg') throw new Error('not an svg');
      // the copies of shared gradients etc. are only there so the file previews on its own
      art.querySelectorAll('defs.preview').forEach(d => d.remove());
      // images are relative to the drawing's own file
      for (const el of art.querySelectorAll('image, use')) {
        for (const [ns, name] of [[null, 'href'], [XLINK, 'href']]) {
          const v = el.getAttributeNS(ns, name);
          if (v && !/^(#|data:|[a-z]+:)/.test(v)) el.setAttributeNS(ns, name, new URL(v, url).href);
        }
      }
      ph.append(...[...art.childNodes].filter(n => n.nodeType === 1).map(n => document.importNode(n, true)));
    } catch (e) {
      console.warn(`couldn't load ${ph.dataset.art}:`, e);
    }
  }));
}

const loadingRooms = {};
function loadRoom(id) {
  if (roomEls[id]) return Promise.resolve(roomEls[id]);
  return (loadingRooms[id] ??= (async () => {
    const res = await fetch(ROOMS[id].svg);
    const holder = document.createElement('div');
    holder.innerHTML = await res.text();
    const el = holder.querySelector('svg');
    await inlineArt(el);
    roomEls[id] = el;
    wireObjects(el);
    if (id === 'bedroom') { wireStation(el); showRadio(); }
    return el;
  })());
}

async function goTo(id) {
  if (mode !== 'room' || id === current || !ROOMS[id]) return;
  const from = current;
  mode = 'moving';
  hush(); closeMenu();
  $('#caption').hidden = true;
  $('#hover-label').classList.remove('show');
  const loading = loadRoom(id);
  fade.classList.add('dark', 'quick', 'on');
  audio.burst({ freq: 300, type: 'lowpass', dur: .12, gain: .12 }); // a footstep or two
  audio.burst({ freq: 260, type: 'lowpass', dur: .12, gain: .1, at: .22 });
  await sleep(320);
  const el = await loading.catch(() => null);
  if (el) {
    $('#svg-host').replaceChildren(el);
    current = id;
    body.dataset.room = id;
    $('#hud-top .brand .dim').textContent = '// ' + ROOMS[id].name;
    audio.setRoom(id);
    music.setRoom(id);
    radio.setRoom(id);
    const vp = $('#viewport');
    vp.scrollLeft = (vp.scrollWidth - vp.clientWidth) * .5;
  }
  fade.classList.remove('on');
  await sleep(320);
  fade.classList.remove('dark', 'quick');
  mode = 'room';
  lastActivity = performance.now();
  updateNav();
  if (id === 'main') {
    roomSince = performance.now();
    // they noticed you were gone
    const back = bags['back:' + from];
    if (back && Math.random() < .65) {
      setTimeout(() => { if (current === 'main' && mode === 'room' && !talking()) say(back()); }, 1300);
    }
  }
}

function updateNav() {
  const r = ROOMS[current];
  for (const side of ['left', 'right']) {
    const b = $('#nav-' + side);
    const to = r[side];
    b.hidden = !to || mode === 'intro';
    if (to) b.textContent = side === 'left' ? `\u25C2 ${ROOMS[to].name}` : `${ROOMS[to].name} \u25B8`;
  }
}
$('#nav-left').addEventListener('click', () => goTo(ROOMS[current].left));
$('#nav-right').addEventListener('click', () => goTo(ROOMS[current].right));

// ============================================================ the music station
const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, text) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  return e;
}

let listTop = 0;
function renderStation() {
  const el = roomEls.bedroom;
  if (!el) return;
  const list = el.querySelector('#st-list');
  const ROWS = 6, n = music.tracks.length;
  if (music.index < listTop) listTop = music.index;
  if (music.index >= listTop + ROWS) listTop = music.index - ROWS + 1;
  list.replaceChildren();
  if (!n) list.append(svgEl('text', { x: 616, y: 410 }, 'no tracks found'));
  for (let i = listTop; i < Math.min(n, listTop + ROWS); i++) {
    const y = 398 + (i - listTop) * 13;
    const on = i === music.index;
    const g = svgEl('g', { class: 'st-row', 'data-track': i });
    g.append(svgEl('rect', { class: 'st-hl', x: 613, y, width: 158, height: 12, fill: '#6dffb0', 'fill-opacity': on ? .2 : 0 }));
    const title = music.tracks[i].title || music.tracks[i].file;
    const mark = on ? (music.playing ? '\u25B6' : '\u275A') : ' ';
    g.append(svgEl('text', { x: 616, y: y + 9, 'font-size': 7.5 }, `${mark} ${String(i + 1).padStart(2, '0')} ${title.length > 30 ? title.slice(0, 29) + '\u2026' : title}`));
    list.append(g);
  }
  el.querySelector('#st-playicon').setAttribute('d', music.playing ? 'M664 545 h4 v12 h-4z M672 545 h4 v12 h-4z' : 'M666 545 l10 6 l-10 6z');
  el.querySelector('#st-knob').setAttribute('transform', `rotate(${-135 + music.volume * 270} 768 552)`);
  updateNowPlaying();
}

function updateNowPlaying() {
  const b = $('#nowplaying');
  b.hidden = !music.graph || !music.current;
  if (!b.hidden) b.textContent = `${music.playing ? '\u266A' : '\u275A\u275A'} ${music.current.title}`;
}
$('#nowplaying').addEventListener('click', () => music.toggle());

function wireStation(el) {
  el.addEventListener('click', e => {
    if (mode !== 'station') return;
    e.stopPropagation();
    const act = e.target.closest('[data-act]')?.dataset.act;
    const row = e.target.closest('.st-row');
    if (act === 'tune') {
      const r = el.querySelector('[data-act="tune"] rect').getBoundingClientRect();
      if (!radio.on) radio.setOn(true);
      // the clickable window is 462-564 in the drawing; the printed scale runs 88-108 across 468-558
      const x = 462 + (e.clientX - r.left) / r.width * 102;
      return tuneTo(88 + (x - 468) / 90 * 20);
    }
    if (act === 'radio-power') { audio.tick(); radio.toggle(); return showRadio(); }
    if (act === 'vol') {
      const knob = el.querySelector('#st-knob').getBoundingClientRect();
      return music.nudgeVolume(e.clientX < knob.left + knob.width / 2 ? -.1 : .1);
    }
    if (act) { audio.tick(); return music[{ prev: 'prev', play: 'toggle', next: 'next' }[act]](); }
    if (row) return music.play(+row.dataset.track);
    if (e.target.closest('[data-id="radio"]')) return narrate('radio');
    if (!e.target.closest('#station')) leaveStation();
  });
  el.querySelector('#station').addEventListener('wheel', e => {
    if (mode !== 'station') return;
    e.preventDefault();
    if (e.target.closest('[data-act="vol"]')) music.nudgeVolume(e.deltaY < 0 ? .1 : -.1);
    else if (e.target.closest('[data-act="tune"]')) { if (!radio.on) radio.setOn(true); tuneTo(radio.freq + (e.deltaY < 0 ? .1 : -.1) * (e.shiftKey ? 10 : 1)); }
    else if (music.tracks.length) { listTop = Math.max(0, Math.min(music.tracks.length - 6, listTop + Math.sign(e.deltaY))); renderStation(); }
  }, { passive: false });
  renderStation();
  stationLoop();
}

async function useStation() {
  if (mode !== 'room') return;
  mode = 'station';
  closeMenu();
  $('#hover-label').classList.remove('show');
  body.classList.add('zoomed');
  zoomTo(STATION_RECT, [.96, .86]);
  audio.ensure();
  await sleep(1100);
  if (mode !== 'station') return;
  $('#standup').hidden = false;
  if (!music.graph && music.tracks.length) caption(['note', 'pick a song on the screen, or press the green button. the dial on the clock radio tunes too.']);
}
async function leaveStation() {
  if (mode !== 'station') return;
  $('#standup').hidden = true;
  stage.style.transform = '';
  zoomScale = 1;
  audio.standUp();
  await sleep(1100);
  body.classList.remove('zoomed');
  $('#viewport').scrollLeft = savedScroll;
  mode = 'room';
}

// the radio: the dial, the LED, and what's on it
let showFreqUntil = 0;
function dialX(f) { return 468 + (f - 88) / 20 * 90; }
function tuneTo(f) {
  radio.tune(f);
  showFreqUntil = performance.now() + 1600;
  lastClock = 0;
  showRadio();
  audio.burst({ x: 460, freq: 3000, q: .7, dur: .03, gain: .02 });
}
function showRadio() {
  const el = roomEls.bedroom;
  if (!el) return;
  el.querySelector('#st-dial').setAttribute('x', dialX(radio.freq));
  el.querySelector('#st-radioled').setAttribute('fill', radio.on ? '#ff3b2a' : '#3a1010');
}
radio.onLock = f => { if (current === 'bedroom') caption(bags['fm:' + f]()); };

// needles, bars, speaker cones, the clock, and the radio's other hobby
let lastStatus = 0, lastClock = 0, nextHaunt = performance.now() + 90000 + Math.random() * 90000;
function stationLoop() {
  requestAnimationFrame(stationLoop);
  const el = roomEls.bedroom;
  if (!el || current !== 'bedroom' || document.hidden) return;
  const now = performance.now();
  const lv = music.levels();
  // like a real VU meter: -30 dB rests on the left pin, 0 dB is the top of the red
  const needle = (id, v, px) => {
    const db = 20 * Math.log10(Math.max(v, 1e-4));
    const a = Math.max(-48, Math.min(52, -48 + (db + 30) / 30 * 96));
    el.querySelector(id).setAttribute('transform', `rotate(${a.toFixed(1)} ${px} 440)`);
  };
  needle('#vu-l', lv.l, 424);
  needle('#vu-r', lv.r, 520);
  for (const [id, k] of [['#woof-l', .1], ['#woof-r', .14]]) el.querySelector(id).style.transform = `scale(${1 + lv.bass * lv.bass * k})`;
  const bars = el.querySelector('#st-bars');
  if (bars.childElementCount !== 16) {
    bars.replaceChildren(...Array.from({ length: 16 }, (_, i) => svgEl('rect', { x: 716 + i * 3.4, width: 2.4, y: 389, height: 1, fill: '#6dffb0' })));
  }
  [...bars.children].forEach((r, i) => {
    const h = Math.max(1, (lv.bands ? lv.bands[i] : 0) * 12);
    r.setAttribute('y', 389 - h); r.setAttribute('height', h);
  });
  el.querySelector('.stationglow').style.opacity = .75 + lv.bass * .4;
  if (now - lastStatus > 250) {
    lastStatus = now;
    const status = !music.tracks.length ? 'playlist.json not found'
      : !music.graph ? 'ready. press play.'
      : `${music.playing ? '\u25B6' : '\u275A\u275A'} ${fmtTime(music.time)} / ${fmtTime(music.duration)}   vol ${Math.round(music.volume * 10)}`;
    const withRadio = radio.on ? `${status}  FM ${radio.freq.toFixed(1)}` : status;
    el.querySelector('#st-status').textContent = withRadio;
  }
  if (now < showFreqUntil) {
    el.querySelector('#st-clock').textContent = radio.freq.toFixed(1);
  } else if (now - lastClock > 5000) {
    lastClock = now;
    const d = new Date();
    el.querySelector('#st-clock').textContent = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (now > nextHaunt) {
    nextHaunt = now + 120000 + Math.random() * 120000;
    if (!music.playing) haunt(el);
  }
}
async function haunt(el) {
  const clock = el.querySelector('#st-clock'), dial = el.querySelector('#st-dial');
  audio.haunt();
  for (let i = 0; i < 14; i++) {
    clock.textContent = i % 2 ? '3:33' : '--:--';
    dial.setAttribute('x', 468 + Math.random() * 90);
    await sleep(280);
  }
  dial.setAttribute('x', dialX(radio.freq));
  lastClock = 0;
}
music.onChange(renderStation);

// ============================================================ the front door
function openPeephole() {
  $('#peephole').hidden = false;
  $('#peephole .peep-note').innerHTML = `<i>${esc(PEEPHOLE[1])}</i><br><span class="small">click anywhere to step back</span>`;
}
function closePeephole() { $('#peephole').hidden = true; }
$('#peephole').addEventListener('click', closePeephole);

// ============================================================ close-ups (the notebook)
function openCloseup(markup) {
  $('#closeup-page').innerHTML = markup;
  $('#closeup').hidden = false;
}
function closeCloseup() { $('#closeup').hidden = true; }
$('#closeup').addEventListener('click', closeCloseup);

// the page the notebook on the floor is open to. two handwritings at the bottom
const NOTEBOOK_PAGE = `<svg viewBox="0 0 720 460" aria-label="a hand-drawn diagram of an impossible computer">
  <defs><pattern id="nb-lines" width="720" height="22" patternUnits="userSpaceOnUse"><path d="M0 21.5h720" stroke="#9ab4cc" stroke-width="1"/></pattern></defs>
  <rect x="6" y="6" width="708" height="448" rx="4" fill="#ece5d0"/>
  <rect x="6" y="6" width="708" height="448" fill="url(#nb-lines)" opacity=".7"/>
  <path d="M360 8v444" stroke="#b8ae96" stroke-width="3"/><path d="M60 8v444" stroke="#d98a8a" stroke-width="1.2"/>
  <g font-family="'Comic Sans MS', 'Segoe Print', cursive" fill="#27336a" stroke="#27336a" stroke-width="2" stroke-linecap="round">
    <g fill="none">
      <rect x="84" y="50" width="96" height="46" rx="4"/><rect x="224" y="46" width="104" height="52" rx="4"/>
      <rect x="84" y="170" width="96" height="46" rx="4"/><rect x="224" y="172" width="104" height="46" rx="4"/>
      <rect x="400" y="54" width="112" height="50" rx="4"/><rect x="560" y="50" width="112" height="50" rx="4"/>
      <rect x="480" y="190" width="120" height="56" rx="4"/>
      <path d="M180 73h40l-8 -6m8 6l-8 6"/><path d="M276 98v68l-6 -8m6 8l6 -8"/><path d="M224 195h-40l8 -6m-8 6l8 6"/>
      <path d="M132 170v-70l-6 8m6 -8l6 8"/><path d="M328 70q40 -40 72 5l-2 -10m2 10l-9 -3"/>
      <path d="M512 79h44l-8 -6m8 6l-8 6"/><path d="M616 100q20 60 -20 88l10 -2m-10 2l2 -10"/>
      <path d="M480 218q-60 10 -80 -110l-3 10m3 -10l6 8"/>
      <path d="M540 246q0 60 -120 30q-160 -40 -230 -60" stroke-dasharray="6 6"/>
      <circle cx="540" cy="330" r="34"/><path d="M574 330l-6 -9m6 9l6 -8"/>
    </g>
    <g stroke="none" font-size="17">
      <text x="106" y="79">SSD</text><text x="236" y="78">MOBO</text><text x="106" y="199">SSD</text><text x="236" y="201">MOBO</text>
      <text x="414" y="84">MOBO</text><text x="574" y="81">MOBO</text><text x="492" y="224">GPU 16G</text>
      <text x="513" y="335" font-size="12">faster?</text>
      <text x="96" y="296" font-size="15">5x CPU (daisy chain)</text>
      <text x="96" y="322" font-size="15">kimi k3 = 700 GB</text>
      <text x="96" y="348" font-size="15">&#8594; it'll figure itself out</text>
    </g>
    <text x="16" y="150" stroke="none" font-size="15" fill="#b8402a" transform="rotate(-80 30 150)">Cat12???</text>
  </g>
  <text x="384" y="404" font-family="'IBM VGA', monospace" font-size="15" fill="#b8702a">this is not a real thing &#8212; C</text>
  <text x="520" y="438" font-family="'Comic Sans MS', 'Segoe Print', cursive" font-size="22" fill="#7a4ac8" transform="rotate(-4 540 432)">yet</text>
</svg>`;


function labelFor(id) {
  if (NAMES[id]) return NAMES[id];
  if (id === 'bulb') return body.classList.contains('hall-dark') ? 'light switch (off)' : 'light switch';
  if (id === 'cbulb') return body.classList.contains('closet-dark') ? 'pull chain (off)' : 'pull chain';
  if (NARRATION[id]) return NARRATION[id].label;
  if (id === 'acloset') return roomEls.bedroom?.querySelector('#ac-open').style.display === 'none' ? 'a closet door (ajar, something warm inside)' : "skizy's closet (close)";
  if (id === 'crt') return 'the Phosphor Artifact — the site lives here';
  if (id === 'fridge') return fridgeOpen ? 'the other fridge (close)' : 'the other fridge (monster, ramen)';
  if (id === 'kfridge') return roomEls.hallway?.querySelector('#kf-open').style.display === 'none' ? 'the proper fridge' : 'the proper fridge (close)';
  return OBJECTS[id]?.label || id;
}

function wireObjects(root) {
  const label = $('#hover-label');
  for (const el of root.querySelectorAll('.obj')) {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', labelFor(el.dataset.id));
  }
  root.addEventListener('click', e => {
    const el = e.target.closest('.obj');
    if (el) interact(el.dataset.id);
  });
  root.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest?.('.obj')) {
      e.preventDefault();
      interact(e.target.closest('.obj').dataset.id);
    }
  });
  const show = el => {
    // the hydra notices when you look at it
    body.classList.toggle('hydra-alert', !!el && mode === 'room' && ['cables', 'powerstrip'].includes(el.dataset.id));
    if (!el || mode !== 'room') { label.classList.remove('show'); return; }
    label.textContent = labelFor(el.dataset.id);
    label.classList.add('show');
    if (el.dataset.id === 'drawing' && !show.drawingSeen) { show.drawingSeen = true; say(DRAWING_HOVER); }
    if (el.dataset.id === 'claube') hoverClaube();
  };
  root.addEventListener('pointerover', e => show(e.target.closest('.obj')));
  root.addEventListener('pointerleave', () => show(null));
  root.addEventListener('focusin', e => show(e.target.closest('.obj')));
  root.addEventListener('focusout', () => show(null));
}

// ============================================================ the poster watches
function watchPointer() {
  const iris = svg.querySelector('#poster-iris');
  let pending = false, px = 0, py = 0;
  addEventListener('pointermove', e => {
    px = e.clientX; py = e.clientY;
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const r = iris.getBoundingClientRect();
      const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 300);
      iris.setAttribute('transform', `translate(${(dx / d * 7 * k).toFixed(2)} ${(dy / d * 3.5 * k).toFixed(2)})`);
    });
  });
}

// ============================================================ the room keeps talking
let roomSince = 0, lastLinger = 0, lastLeave = 0, saidStay = false;
function ambientLoop() {
  setTimeout(ambientLoop, 26000 + Math.random() * 30000);
  if (mode !== 'room' || current !== 'main' || document.hidden || talking() || !$('#menu').hidden) return;
  if (performance.now() - lastActivity < 8000) return;
  const now = performance.now();
  // a long quiet stretch: Mira says the thing. once
  if (!saidStay && now - lastActivity > 180000) { saidStay = true; return say(JUST_STAY); }
  if (Math.random() < .2) return claubeWrites();
  if (now - roomSince > 150000 && now - lastLinger > 240000) {
    lastLinger = now;
    return say(bags.linger());
  }
  if (music.playing && Math.random() < .35) return say(bags.music());
  say(bags.ambient());
}

const TITLE = document.title;
document.addEventListener('visibilitychange', () => {
  document.title = document.hidden ? bags.leaving()[0][1] : TITLE;
});
document.documentElement.addEventListener('mouseleave', () => {
  const now = performance.now();
  if (mode !== 'room' || current !== 'main' || talking() || now - lastLeave < 90000 || now - roomSince < 20000) return;
  lastLeave = now;
  say(bags.leaving());
});

// ============================================================ the telescope
const intro = $('#intro');
const fade = $('#fade');

async function knock() {
  $('#knock').disabled = true;
  audio.init();
  audio.resume();
  soundLabel();
  for (let i = 0; i < 3; i++) {
    intro.classList.add(i % 2 ? 'knock2' : 'knock1');
    audio.knock();
    await sleep(70);
    intro.classList.remove('knock1', 'knock2');
    await sleep(i === 1 ? 160 : 260);
  }
  await sleep(900);
  intro.classList.add('open');
  audio.clatter();
  await sleep(1300);
  intro.classList.add('through');
  await sleep(900);
  fade.classList.add('on');
  await sleep(900);
  intro.hidden = true;
  intro.classList.remove('open', 'through');
  $('#knock').disabled = false;
  enterRoom();
  fade.classList.remove('on');
  await sleep(1000);
  store.set('room_knocked', '1');
  await playScene(SCENE_WINDOW);
  hint();
}
$('#knock').addEventListener('click', knock);

async function replayIntro() {
  if (mode !== 'room') return;
  hush();
  fade.classList.add('on', 'dark');
  await sleep(900);
  mode = 'intro';
  updateNav();
  intro.hidden = false;
  fade.classList.remove('on');
  await sleep(900);
  fade.classList.remove('dark');
  $('#knock').focus({ preventScroll: true });
}

function enterRoom() {
  mode = 'room';
  updateNav();
  roomSince = lastActivity = performance.now();
  bootCRT();
  // phones held upright start looking at the middle of the room
  const vp = $('#viewport');
  vp.scrollLeft = (vp.scrollWidth - vp.clientWidth) * .45;
}

async function hint() {
  const label = $('#hover-label');
  label.textContent = 'look around. click things. the site runs on the Phosphor Artifact (the CRT). the arrows lead to the rest of the apartment.';
  label.classList.add('show');
  await sleep(9000);
  if (label.textContent.startsWith('look around')) label.classList.remove('show');
}

// ============================================================ boot
async function main() {
  const res = await fetch('room/room.svg');
  $('#svg-host').innerHTML = await res.text();
  svg = $('#svg-host svg');
  await inlineArt(svg);
  for (const a of svg.querySelectorAll('[data-anchor]')) {
    anchors[a.dataset.anchor] = { x: +a.getAttribute('cx'), y: +a.getAttribute('cy') };
  }
  wireObjects(svg);
  roomEls.main = svg;
  body.dataset.room = 'main';
  music.load();
  watchPointer();
  fitSite(false);
  ambientLoop();

  // DaV-nky (dav-nky.pleroma.nexus): this room is behind the boarded-up window on its rooftop.
  const params = new URLSearchParams(location.search);
  if (params.has('peek')) {                  // seen from the rooftop, through the window: just the room, living its life
    body.classList.add('peek');
    mode = 'room';
    return;
  }
  if (params.get('from') === 'dav-nky') {    // climbed in through the window (the boards already off)
    body.classList.add('from-davnky');
    fade.classList.add('on', 'dark');
    const first = !store.get('room_knocked');
    enterRoom();
    await sleep(60);
    fade.classList.remove('on');
    await sleep(1000);
    fade.classList.remove('dark');
    if (first) {
      store.set('room_knocked', '1');
      await playScene(SCENE_WINDOW);
      hint();
    } else if (mode === 'room' && !talking()) say([['claube', "You could've just knocked."]]);
    return;
  }

  if (store.get('room_knocked')) {
    enterRoom();
    await sleep(1500);
    if (mode === 'room' && !talking()) say([['claube', "You could've just knocked."]]);
  } else {
    mode = 'intro';
    intro.hidden = false;
  }
}
main();

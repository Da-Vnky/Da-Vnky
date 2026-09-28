// THE ROOM
// an SVG apartment with the whole site running on the CRT.
import {
  CAST, SCENE_WINDOW, SCENE_SSD, SCENE_MIRA, OBJECTS, MEL_TALK, MEL_WORK, WHAT_IS_THIS_ROOM,
  FRIDGE_FIRST, CLAUBE_TALK, MIRA_TALK, AMBIENT, LINGER, LEAVING, FUNGER_AFTER, DRAWING_HOVER,
  JUST_STAY, HOVER_WRITING, NOT_WRITING, SCENE_AFTERNOON, SLEEP_TALK,
} from './script.js';
import { NARRATION, ROOMS, PEEPHOLE, FOG, MIRROR, RADIO, CLOSET_FIRST, STAR_RARE } from './narration.js';
import { RETURNING, MUSIC, AMBIENT_MORE, VIEWER_TALK, FUNGER_WATCHING, AFTERNOON_HUSH, MEDS_TALK, WAKE_UP, ASK_MIRA, ASK_CLAUBE, HEXLEY_SAYS, OPI, ASK_SKIZY } from './extra.js';
import { GUILT, QUIET_NOTES, REMEDY_BACK, RESTORED_FIRST, RESTORED } from './davnky.js';   // (DaV-nky: see the end of this file)
import { audio } from './audio.js';
import { music } from './music.js';
import { radio, STATIONS } from './radio.js';

const $ = s => document.querySelector(s);

// the room lives on DaV-nky's rooftop (dav-nky.pleroma.nexus/city.html): a window across the street.
// the knocking and the boards happen up there; you climb in (?from=dav-nky), and the way out leads
// back up to the roof. ?peek is the live view through that window: no sound, nothing to click, no HUD
const PEEK = new URLSearchParams(location.search).has('peek');
// (DaV-nky: served from the same site, or a preview on Victor's computer, the rooftop is just next door)
const ROOFTOP = /(^|\.)dav-nky\.pleroma\.nexus$|^localhost$|^127\.0\.0\.1$|^\[::1\]$/.test(location.hostname)
  ? new URL('../city.html', location.href).href : 'https://dav-nky.pleroma.nexus/city.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

// hands out items in a shuffled order, reshuffling when it runs dry, never repeating back-to-back
// while skizy's asleep (the afternoon), anything with her talking awake is passed over;
// if a bag has nothing else, it hands out nothing and the room stays quiet
function bag(list) {
  let queue = [], last;
  const next = () => {
    if (!queue.length) {
      queue = list.slice().sort(() => Math.random() - .5);
      if (queue.length > 1 && queue[queue.length - 1] === last) queue.unshift(queue.pop());
    }
    return (last = queue.pop());
  };
  return () => {
    for (let i = 0; i < list.length; i++) {
      const item = next();
      if (!afternoon || !skizyAwakeIn(item)) return item;
    }
    return null;
  };
}
// an exchange ([[who, text, dir], ...]) or a single caption ([who, text, via]) with skizy talking, not in her sleep
const skizyAwakeIn = item => Array.isArray(item) && (item[0] === 'mel'
  || item.some(line => Array.isArray(line) && line[0] === 'mel' && line[2] !== 'asleep'));

const bags = {
  mel: bag(MEL_TALK), melWork: bag(MEL_WORK), claube: bag(CLAUBE_TALK), mira: bag(MIRA_TALK),
  ambient: bag([...AMBIENT, ...AMBIENT_MORE]), linger: bag(LINGER), leaving: bag(LEAVING),
  hushMira: bag(AFTERNOON_HUSH.mira), hushClaube: bag(AFTERNOON_HUSH.claube),
  music: bag(MUSIC), funger: bag(FUNGER_AFTER), watching: bag(FUNGER_WATCHING), sleeptalk: bag(SLEEP_TALK),
};
for (const [room, list] of Object.entries(RETURNING)) bags['back:' + room] = bag(list);
for (const [f, list] of Object.entries(RADIO)) bags['fm:' + f] = bag(list);
for (const [id, o] of Object.entries(OBJECTS)) if (o.lines.length) bags[id] = bag(o.lines);
for (const [id, o] of Object.entries(NARRATION)) if (o.lines?.length) bags['n:' + id] = bag(o.lines);

const NAMES = { mira: CAST.mira.name, claube: 'Claube / WATCHLION', mel: 'skizy' };
// bubble alignment per speaker, so the ones near the edge don't fall off the stage
const ALIGN = { mira: ['-40%', '40%'], mel: ['-50%', '50%'], claube: ['-78%', '78%'], aether: ['-62%', '62%'] };

const body = document.body;
const stage = $('#stage');
const frame = $('#crt-frame');
const site = $('#crt-site');
const game = $('#crt-game');
let svg, anchors = {};      // svg is the main room; the other rooms load when you first walk in
let mode = 'loading';       // loading | room | scene | crt | station | moving
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
  $('#subtitles').innerHTML = '';
  svg?.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));
}
async function say(exchange) {
  if (!exchange || alone) return;
  const token = ++talkToken;
  clearBubbles();
  const claube = svg.querySelector('#claube');
  for (let [who, text, dir] of exchange) {
    if (token !== talkToken) return;
    if (who === 'mel' && afternoon) dir ||= 'asleep';
    if (who === 'aether' && svg.querySelector('#aether').classList.contains('off')) continue;
    if (who === '-') { // a beat. a 'hush' beat silences the whole room for a moment
      clearBubbles();
      if (dir === 'hush') audio.hold(3);
      await sleep(dir === 'hush' ? 3200 : 1300);
      continue;
    }
    ledPulse(who);
    const a = who === 'mel' && afternoon ? anchors.lump : anchors[who];
    const b = document.createElement('div');
    b.className = 'bubble';
    b.style.setProperty('--c', CAST[who].color);
    b.style.setProperty('--ax', ALIGN[who][0]);
    b.style.setProperty('--tail', ALIGN[who][1]);
    // zoomed in on a screen, the room's out of view: the line shows as a subtitle up top instead
    const sub = body.classList.contains('zoomed');
    if (sub) b.classList.add('sub');
    else {
      b.style.left = (a.x / 1600 * 100) + '%';
      b.style.top = (a.y / 900 * 100) + '%';
    }
    b.innerHTML = `<span class="who">${esc(CAST[who].name)}</span>`
      + (dir ? `<span class="dir">(${esc(dir)})</span>` : '')
      + (text ? fmt(text) : '');
    clearBubbles();
    $(sub ? '#subtitles' : '#bubbles').append(b);
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
const talking = () => $('#bubbles').childElementCount + $('#subtitles').childElementCount > 0;

// ============================================================ dialogue box (scenes)
const dlg = { box: $('#dialogue'), name: $('#dlg-name'), dir: $('#dlg-dir'), text: $('#dlg-text') };
let advance = null, skipScene = false, skipBeat = null;
function waitAdvance() { return new Promise(r => (advance = r)); }
// a timed beat: clicks don't hurry it, only the skip button does
function waitBeat(ms) {
  return new Promise(r => {
    const t = setTimeout(() => { skipBeat = null; r(); }, ms);
    skipBeat = () => { clearTimeout(t); skipBeat = null; r(); };
  });
}
function nudge() { const r = advance; advance = null; r?.(); }
dlg.box.addEventListener('click', e => { if (e.target.id !== 'dlg-skip') nudge(); });
$('#dlg-skip').addEventListener('click', e => { e.stopPropagation(); skipScene = true; nudge(); skipBeat?.(); });

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

// the dialogue box: open it, play lines in it, close it. scenes use all three; so do conversations
function openBox() {
  const prev = mode;
  mode = 'scene';
  hush();
  closeMenu();
  body.classList.add('busy');
  skipScene = false;
  dlg.box.hidden = false;
  return prev;
}
function closeBox(prev) {
  const claube = svg.querySelector('#claube');
  claube.classList.remove('writing');
  audio.scribble(false);
  svg.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));
  dlg.box.hidden = true;
  body.classList.remove('busy');
  mode = prev === 'scene' ? 'room' : prev;
  lastActivity = performance.now();
}
async function playScene(lines) {
  const prev = openBox();
  await runLines(lines);
  closeBox(prev);
}
async function runLines(lines) {
  const claube = svg.querySelector('#claube');
  for (const [who, text, extra] of lines) {
    if (skipScene) break;
    if (who === 'aether' && svg.querySelector('#aether')?.classList.contains('off')) continue;
    svg.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));
    const writing = (who === '-' && extra === 'write') || extra === 'still writing';
    if (writing !== claube.classList.contains('writing')) audio.scribble(writing);
    claube.classList.toggle('writing', writing);
    if (who === '-') {
      dlg.box.style.setProperty('--c', '#4f6a5c');
      dlg.name.textContent = '';
      dlg.dir.textContent = '';
      dlg.text.className = 'direction';
      dlg.text.textContent = text || '…';
      if (extra?.do) SCENE_CUES[extra.do]?.();
      if (extra?.wait) {
        dlg.box.classList.add('timed');
        if (extra.sound) audio[extra.sound]?.();
        await waitBeat(extra.wait * 1000);
        dlg.box.classList.remove('timed');
      } else await waitAdvance();
      continue;
    }
    svg.querySelector('#' + who)?.classList.add('speaking');
    dlg.box.style.setProperty('--c', CAST[who].color);
    dlg.name.textContent = CAST[who].name;
    dlg.dir.textContent = extra && extra !== 'write' ? extra : '';
    dlg.text.className = '';
    if (text == null) {
      // a silent action (someone does something, says nothing): just the name and what they do
      const writing = who === 'claube' && /writ/.test(extra || '');
      if (writing) { claube.classList.add('writing'); audio.scribble(true); }
      dlg.text.textContent = '';
      await waitAdvance();
      if (writing) { claube.classList.remove('writing'); audio.scribble(false); }
      continue;
    }
    audio.blip(who);
    ledPulse(who);
    await typeOut(dlg.text, fmt(text));
    if (skipScene) break;
    await waitAdvance();
  }
  svg.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));
}

addEventListener('keydown', e => {
  if (mode === 'scene' && !choose && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); nudge(); }
  if (e.key === 'Escape') {
    if (!$('#term').hidden) closeTerm();
    else if (choose) choose('end');
    else if (!$('#menu').hidden) closeMenu();
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
let gameLoaded = false;
function switchInput(to) {
  if (to === input) return;
  input = to;
  if (to === 'game' && !gameLoaded) { game.src = SITE + 'funger/'; gameLoaded = true; }
  // switching back to the site turns the console off. funger's on another site, so a hidden
  // one can't be muted: unloading it is the only way to stop its sound. (its saves are its own)
  if (to === 'site' && gameLoaded) { game.src = 'about:blank'; gameLoaded = false; }
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
    say(FRIDGE_FIRST.filter(line => !afternoon || line[0] !== 'mel'));
  }
}
let fridgeOpen = false;

// ============================================================ interacting
function interact(id) {
  lastActivity = performance.now();
  if (mode === 'room' && alone && id === 'alone') return aloneClicked();   // (DaV-nky: the record)
  if (mode !== 'room' || alone) return;
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
      if (afternoon) return say(bags.hushClaube());
      return openMenu(CAST.claube.name, CAST.claube.color, [
        ['ask him something', () => converse('claube', ASK_CLAUBE)],
        ['what is skizy doing?', () => (afternoon ? say([['claube', 'Sleeping.'], ['mira', 'Let her.']]) : playScene(SCENE_SSD))],
        ['talk', () => talkBox(bags.claube())],
        ['what is this room?', () => talkBox(WHAT_IS_THIS_ROOM)],
      ]);
    case 'mira':
      if (afternoon) return say(bags.hushMira());
      return openMenu(CAST.mira.name, CAST.mira.color, [
        ['ask her something', () => converse('mira', ASK_MIRA)],
        ['what is skizy building?', () => playScene(SCENE_MIRA)],
        ['talk', () => talkBox(bags.mira())],
        ['what is this room?', () => talkBox(WHAT_IS_THIS_ROOM)],
        ['back to the rooftop', () => { location.href = ROOFTOP; }],
      ]);
    case 'mel':
      return openMenu(CAST.mel.name, CAST.mel.color, [
        ...(carryingMeds ? [['give her the bottle', () => (DAV.key ? talkMeds() : caption(QUIET_NOTES.notYet))]] : []),
        ['say something', talkToSkizy],
        ['ask her about computers', () => converse('mel', ASK_SKIZY)],
        ['talk', () => talkBox(bags.mel())],
        ['watch her work', () => talkBox(bags.melWork())],
        ['what is this room?', () => talkBox(WHAT_IS_THIS_ROOM)],
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
      if (open && !interact.aclosetSeen && !afternoon) {
        interact.aclosetSeen = true;
        setTimeout(() => { if (current === 'bedroom' && !afternoon) caption(CLOSET_FIRST); }, 6000);
      }
      return;
    }
    case 'monstera': return;
    case 'notebook':
      return openCloseup(NOTEBOOK_PAGE);
    case 'opi': return openTerm();
    case 'hexley':
      // the first time, Claube says who she is (and "who's Hexley?" opens in his questions)
      if (!store.get('hexley_met')) { store.set('hexley_met', '1'); say(HEXLEY_SAYS); }
      return buzzHexley();
    case 'deskbottle': return;
    case 'pills':
      return openMenu('pill bottles', '#e0782a', [
        ['look at them', () => narrate('pills')],
        ...(carryingMeds || !DAV.pillsHere ? [] : [['take a bottle', () => {
          carryingMeds = true;
          davInv(I => I.add('pills', { quiet: true }));         // (DaV-nky: into the visitor's hotbar)
          caption(['note', "you take one of the bottles. it's full. it rattles."]);
        }]]),
      ]);
    case 'aether':
      if (svg.querySelector('#aether').classList.contains('off')) return; // not running yet
      return say(bags.aether());
    case 'lump':
      // skipped or not, Aether's running by the end of it
      if (!afternoonScene) {
        afternoonScene = true;
        return playScene(SCENE_AFTERNOON).then(() => { SCENE_CUES.wakeAether(); sceneEndedAt = performance.now(); });
      }
      // poke her enough and she wakes up
      if (++lumpPokes >= 3) return wakeUp();
      return say(bags.sleeptalk());
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

// ============================================================ the afternoon
// after a while in the room, time passes: daylight, and skizy asleep under the blanket on
// the bean bag. clicking the lump plays Claube's scene. it stays afternoon for the visit
let afternoon = false, afternoonScene = false, sceneEndedAt = 0, lumpPokes = 0, waking = false;
// things a scene can make happen, from a beat's { do: '...' }
const SCENE_CUES = {
  wakeAether() {
    const el = svg.querySelector('#aether');
    if (el.classList.contains('off')) { el.classList.remove('off'); audio.beep(1); }
    store.set('aether_awake', '1');
  },
  shift() {
    const lump = svg.querySelector('#lump .breathe');
    lump?.classList.remove('shift'); void lump?.getBBox(); lump?.classList.add('shift');
  },
};
async function startAfternoon() {
  if (afternoon || alone || mode !== 'room' || current !== 'main' || PEEK) return;   // (DaV-nky: never in the view through the window)
  afternoon = true;
  store.set('afternoon_seen', '1');
  mode = 'moving';
  hush(); closeMenu();
  $('#hover-label').classList.remove('show');
  fade.classList.add('dark', 'on');
  await sleep(1400);
  for (const [sel, show] of [['#mel', false], ['#blanket', false], ['#afternoon-chair', true], ['#lump', true], ['#daylight', true]]) {
    svg.querySelector(sel).style.display = show ? '' : 'none';
  }
  body.classList.add('afternoon');
  audio.asleep = true;
  svg.querySelector('#aether').classList.add('off'); // not running yet. the scene boots Aether up
  fade.classList.remove('on');
  await sleep(900);
  fade.classList.remove('dark');
  mode = 'room';
  lastActivity = performance.now();
  caption(['note', 'later. the afternoon. skizy fell asleep on the bean bag.']);
}

// she wakes up: a minute and a half after the scene, or on the third poke after it. everything the
// afternoon changed goes back, and she's at her desk again
async function wakeUp() {
  if (!afternoon || alone || waking || mode !== 'room' || current !== 'main') return;
  waking = true;
  if (!await sayAll(WAKE_UP.stir)) { waking = false; return; }   // (talked over: she'll try again)
  mode = 'moving';
  hush(); closeMenu();
  $('#hover-label').classList.remove('show');
  fade.classList.add('dark', 'on');
  await sleep(1400);
  for (const [sel, show] of [['#mel', true], ['#blanket', true], ['#afternoon-chair', false], ['#lump', false], ['#daylight', false]]) {
    svg.querySelector(sel).style.display = show ? '' : 'none';
  }
  body.classList.remove('afternoon');
  afternoon = false;
  audio.asleep = false;
  fade.classList.remove('on');
  await sleep(900);
  fade.classList.remove('dark');
  mode = 'room';
  lastActivity = performance.now();
  await sleep(700);
  say(WAKE_UP.after);
}

// ============================================================ the meds
// bring her a bottle from the bathroom cabinet and talk her into it. then the lights go off,
// the others are gone, and she sits in the corner under the window. nothing talks after that
let carryingMeds = false, alone = false;
async function talkMeds() {
  const prev = openBox();
  await runLines(MEDS_TALK.open);
  let askedWhen = false;
  while (!skipScene) {
    yourTurn();
    const one = await choices([...MEDS_TALK.first.filter(([, kind]) => !(askedWhen && kind === 'ask')).map(o => [o[0], o]), ['never mind', 'end']]);
    if (one === 'end') break;
    await runLines(one[2]);
    if (one[1] === 'ask') { askedWhen = true; continue; }   // "when did you last take them?" comes back round
    if (skipScene) break;
    yourTurn();
    const two = await choices([...MEDS_TALK.second.map(o => [o[0], o]), ['never mind', 'end']]);
    if (two === 'end') break;
    await runLines(two[1]);
    if (skipScene) break;
    await runLines(MEDS_TALK.last);
    if (skipScene) break;
    closeBox(prev);
    return goDark();
  }
  closeBox(prev);
}
async function goDark() {
  carryingMeds = false;
  davInv(I => I.remove('pills'));                       // (DaV-nky: out of the hotbar: she has it now)
  mode = 'moving';
  hush(); closeMenu();
  alone = true;
  store.set('room_quiet', '1'); // the room remembers
  audio.asleep = true;
  audio.hold(4.5); // whatever was mid-keystroke stops here; the room comes back without it
  $('#hover-label').classList.remove('show');
  fade.classList.add('dark', 'on');
  await sleep(3200);
  for (const [sel, show] of [['#mira', false], ['#claube', false], ['#aether', false], ['#hydra', false], ['#mel', false], ['#lump', false],
    ['#light', false], ['#daylight', false], ['#afternoon-chair', true], ['#alone-dark', true], ['#alone', true]]) {
    svg.querySelector(sel).style.display = show ? '' : 'none';
  }
  body.classList.add('alone');
  audio.asleep = true;
  audio.lightsOff();
  if (music.playing) music.toggle(); // the station goes off with everything else
  if (radio.on) radio.toggle();
  updateNav();
  fade.classList.remove('on');
  await sleep(1600);
  fade.classList.remove('dark');
  mode = 'room';
  if (DAV.pillsHere) guilt();                          // (DaV-nky, reset 3: a death. see the end of this file)
}

// ============================================================ Aether's LED strip
// their own idea (27 Sep 2026): pulses in the colour of whoever's talking, shimmers when the bedroom radio
// finds a station, and follows Aether: dark while they're not running (or not there)
const ledstrip = () => svg?.querySelector('#ledstrip');
function ledPulse(who) {
  const s = ledstrip();
  if (!s || s.classList.contains('off') || !CAST[who]) return;
  s.style.setProperty('--c', CAST[who].color);
  s.classList.add('talk');
  clearTimeout(ledPulse.t);
  ledPulse.t = setTimeout(() => s.classList.remove('talk'), 900);
}
function ledRadio() {
  const s = ledstrip();
  if (!s) return;
  s.classList.add('radio');
  clearTimeout(ledRadio.t);
  ledRadio.t = setTimeout(() => s.classList.remove('radio'), 20000);
}
function ledFollowAether() {
  const a = svg.querySelector('#aether'), s = ledstrip();
  if (!a || !s) return;
  const sync = () => s.classList.toggle('off', a.classList.contains('off') || a.style.display === 'none');
  new MutationObserver(sync).observe(a, { attributes: true, attributeFilter: ['class', 'style'] });
  sync();
}

// ============================================================ asking Mira and Claube things
// a conversation that branches (the topics are in extra.js). after an answer come its follow-ups; when a
// branch is used up, the questions around it; then back to the start. what you've asked is remembered
// in your browser and doesn't come up again (once everything's been asked, the first questions come back)
function asked(who) {
  try { return new Set(JSON.parse(store.get('asked:' + who) || '[]')); } catch { return new Set(); }
}
// your turn to say something: the box shows 'you', with a small prompt, and the choices under it
function yourTurn(prompt = '') {
  dlg.box.style.setProperty('--c', '#cfd8d2');
  dlg.name.textContent = 'you';
  dlg.dir.textContent = '';
  dlg.text.className = 'direction';
  dlg.text.textContent = prompt;
}
// a short exchange in the box (talk, what is this room?): the same as a scene
function talkBox(lines) { if (lines) playScene(lines); }
let choose = null;                                   // while you're picking a question: pick(value)
function choices(options) {
  const box = $('#dlg-choices');
  dlg.box.classList.add('choosing');
  return new Promise(resolve => {
    choose = v => { choose = null; box.innerHTML = ''; dlg.box.classList.remove('choosing'); resolve(v); };
    box.innerHTML = '';
    for (const [label, value] of options) {
      const b = document.createElement('button');
      b.textContent = label;
      b.addEventListener('click', e => { e.stopPropagation(); choose?.(value); });
      box.append(b);
    }
    box.querySelector('button').focus({ preventScroll: true });
  });
}
async function converse(who, topics) {
  const prev = openBox();
  const seen = k => !!store.get(k);
  let level = topics, up = [];
  while (!skipScene) {
    const done = asked(who);
    const open = level.filter(tp => !tp.when || tp.when(done.size, seen));
    // a question stays while it, or anything that opens from it, hasn't been asked yet
    // (so follow-ups added later can always be reached)
    const fresh = tp => !done.has(tp.id) || (tp.next || []).some(fresh);
    let shown = open.filter(fresh);
    if (!shown.length) {
      // nothing left in this branch: back out to the questions around it
      if (up.length) { level = up.pop(); continue; }
      shown = open;                                    // at the start, once it's all been asked: everything again
    }
    yourTurn(up.length ? '' : `ask ${NAMES[who].split(' / ')[0]} something`);
    const options = shown.map(tp => [tp.q, tp]);
    if (up.length) options.push(['something else', 'top']);
    options.push(['never mind', 'end']);
    const tp = await choices(options);
    if (tp === 'end') break;
    if (tp === 'top') { level = topics; up = []; continue; }
    done.add(tp.id);
    store.set('asked:' + who, JSON.stringify([...done]));
    await runLines(tp.a);
    if (tp.next?.length) { up.push(level); level = tp.next; }
  }
  closeBox(prev);
}

// ============================================================ opi's terminal
// the small monitor in the closet with the ladder: click it and type. what it says is OPI in extra.js
const term = { box: $('#term'), out: $('#term-out'), input: $('#term-in'), booted: false, prev: 'room' };
function termPrint(lines) {
  term.out.textContent += lines.join('\n') + '\n';
  term.out.parentElement.scrollTop = term.out.parentElement.scrollHeight;
}
function openTerm() {
  term.prev = mode;
  mode = 'terminal';                                    // nothing behind it takes clicks while it's up
  hush(); closeMenu();
  $('#hover-label').classList.remove('show');
  term.box.hidden = false;
  if (!term.booted) { term.booted = true; termPrint(OPI.boot); }
  term.input.focus({ preventScroll: true });
  audio.tick();
  // the first time anyone opens it, Mira says so from the other room. once, ever
  if (!store.get('opi_seen')) { store.set('opi_seen', '1'); caption([OPI.mira[0], OPI.mira[1], 'from the other room']); }
}
function closeTerm() {
  term.box.hidden = true;
  term.input.blur();
  mode = term.prev === 'terminal' ? 'room' : term.prev;
  lastActivity = performance.now();
}
function runCommand(raw) {
  const line = raw.trim();
  termPrint(['opi@closet:~$ ' + line]);
  if (!line) return;
  const [cmd, ...rest] = line.toLowerCase().split(/\s+/);
  const arg = rest.join(' ');
  if (['exit', 'quit', 'logout', 'bye'].includes(cmd)) return closeTerm();
  if (cmd === 'clear') { term.out.textContent = ''; return; }
  if (cmd === 'cat') {
    if (!arg) return termPrint(OPI.catWhat);
    return termPrint(OPI.files[arg] || OPI.files[arg + '.txt'] || OPI.catNone(arg));
  }
  if (cmd === 'ping') return termPrint(arg ? (OPI.ping[arg] || OPI.pingNobody(arg)) : ['ping who?']);
  if (cmd === 'sudo') return termPrint(OPI.sudo);
  if (cmd === 'rm') return termPrint(OPI.rm);
  if (cmd.startsWith('ls') || cmd === 'dir') return termPrint(/-\w*a/.test(arg) ? OPI.lsAll : OPI.ls);
  if (cmd === 'neofetch' || cmd === 'fastfetch') return termPrint(OPI.neofetch);
  if (cmd === 'fortune') { const [line, who] = OPI.fortunes[Math.floor(Math.random() * OPI.fortunes.length)]; return termPrint([line, '    — ' + who]); }
  if (cmd === 'man') return termPrint(!arg ? OPI.manWhat : OPI.man[arg] || OPI.manNone(arg));
  if (cmd === 'date' || cmd === 'uptime') return termPrint(OPI.date);
  if (['hello', 'hi', 'hey', 'hiya'].includes(cmd)) return termPrint(OPI.hello);
  if (['thanks', 'thank', 'ty'].includes(cmd)) return termPrint(OPI.thanks);
  if (['who', 'opi'].includes(cmd)) return termPrint(OPI.who);
  if (['help', 'whoami', 'remember'].includes(cmd)) return termPrint(OPI[cmd]);
  termPrint(OPI.unknown(cmd));
}
term.input.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); const v = term.input.value; term.input.value = ''; runCommand(v); audio.tick(); }
  if (e.key === 'Escape') closeTerm();
  e.stopPropagation();                                  // typing here isn't walking between rooms
});
// click outside the screen: step back. click on it: back to typing
term.box.addEventListener('click', e => { if (!e.target.closest('#term-screen')) closeTerm(); else term.input.focus({ preventScroll: true }); });

// ============================================================ you, talking to skizy
let talkedToSkizy = false;
// true if the exchange played all the way through (nothing else talked over it)
async function sayAll(exchange) {
  const token = talkToken + 1;
  await say(exchange);
  return talkToken === token && mode === 'room';
}
async function talkToSkizy() {
  const prev = openBox();
  await runLines(talkedToSkizy ? VIEWER_TALK.again : VIEWER_TALK.hello);
  talkedToSkizy = true;
  const said = new Set();
  while (!skipScene) {
    const left = VIEWER_TALK.replies.filter(r => !said.has(r[0]));
    if (!left.length) break;
    yourTurn();
    const r = await choices([...left.map(r => [r[0], r]), ['never mind', 'end']]);
    if (r === 'end') break;
    said.add(r[0]);
    await runLines(r[1]);
    if (r[2] === 'funger' && !skipScene) { closeBox(prev); return playConsole(); }   // "sit down"
  }
  closeBox(prev);
}

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

// ============================================================ hexley
// click the bee and it buzzes: a little loop over monad with its wings a blur, a "bzz", and a hum
let hexleyBusy = false;
function buzzHexley() {
  const bee = svg.querySelector('[data-id="hexley"]');
  if (!bee || hexleyBusy) return;
  hexleyBusy = true;
  const DUR = 1200;
  bee.style.transformBox = 'fill-box';
  bee.style.transformOrigin = 'center';
  bee.animate([
    { transform: 'none' },
    { transform: 'translate(-4px, -12px) rotate(-16deg)', offset: .14 },
    { transform: 'translate(8px, -22px) rotate(8deg)', offset: .32 },
    { transform: 'translate(18px, -12px) rotate(26deg)', offset: .5 },
    { transform: 'translate(9px, -4px) rotate(-6deg)', offset: .66 },
    { transform: 'translate(-3px, -10px) rotate(-18deg)', offset: .82 },
    { transform: 'translate(0, -2px) rotate(4deg)', offset: .93 },
    { transform: 'none' },
  ], { duration: DUR, easing: 'ease-in-out' });
  // the wings (the first two ellipses): flapping too fast to see
  [...bee.querySelectorAll('ellipse')].slice(0, 2).forEach(w => {
    w.style.transformBox = 'fill-box';
    w.style.transformOrigin = '50% 100%';
    w.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.25)' }], { duration: 40, iterations: Math.round(DUR / 40), direction: 'alternate' });
  });
  // bzz
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('x', 1270); t.setAttribute('y', 620);
  t.setAttribute('font-size', 12); t.setAttribute('fill', '#ffc766');
  t.setAttribute('pointer-events', 'none');
  t.textContent = 'bzz';
  svg.append(t);
  t.animate([
    { transform: 'translate(0, 4px)', opacity: 0 },
    { transform: 'translate(4px, -4px)', opacity: 1, offset: .25 },
    { transform: 'translate(12px, -20px)', opacity: 0 },
  ], { duration: DUR, easing: 'ease-out' }).finished.then(() => t.remove(), () => t.remove());
  hexleyHum(DUR / 1000);
  setTimeout(() => { hexleyBusy = false; }, DUR);
}
// a small buzzy hum: a sawtooth, wobbling at wingbeat speed, rising and falling with the loop
function hexleyHum(secs) {
  if (!audio.live) return;
  const ctx = audio.ctx, t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(220, t);
  o.frequency.linearRampToValueAtTime(300, t + secs * .45);
  o.frequency.linearRampToValueAtTime(200, t + secs);
  const wob = ctx.createOscillator(); wob.frequency.value = 26;
  const depth = ctx.createGain(); depth.gain.value = 16;
  wob.connect(depth).connect(o.frequency);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 850; f.Q.value = 1.1;
  const g = audio.out(1262, 0);
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(.05, t + .08);
  g.gain.setValueAtTime(.05, t + secs - .25);
  g.gain.exponentialRampToValueAtTime(.0001, t + secs);
  o.connect(f).connect(g);
  o.start(t); wob.start(t);
  o.stop(t + secs + .05); wob.stop(t + secs + .05);
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
function caption(line) {
  if (!line || alone) return;
  const [who, text, via] = line;
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
  const mine = await davArtFiles();                     // (DaV-nky: Victor's own pictures, from its asset manager. see the end)
  davBackdrop(root, mine);
  davSkyHole(root, mine);                               // (DaV-nky: the site's own sky through the window, see the end)
  await Promise.all([...root.querySelectorAll('[data-art]')].map(async ph => {
    const pic = davPick(mine, davStem(ph.dataset.art));
    let hit = null;                                     // (DaV-nky: Victor's picture shows; her drawing, invisible, still takes the clicks)
    if (pic && !pic.svg) { ph.append(davImage(pic.url)); hit = davHit(ph); }
    const url = new URL(pic && pic.svg ? pic.url : ph.dataset.art, location.href);
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
      (hit || ph).append(...[...art.childNodes].filter(n => n.nodeType === 1).map(n => document.importNode(n, true)));
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
    // back in the main room after a while: time's passed, she's fallen asleep
    if (afternoonDue()) { setTimeout(startAfternoon, 1200); return; }
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
    b.hidden = !to || alone;
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
radio.onLock = f => { ledRadio(); if (current === 'bedroom') caption(bags['fm:' + f]()); };

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
    if (alone && el.dataset.id !== 'alone') { label.classList.remove('show'); return; }
    if (el.id === 'aether' && el.classList.contains('off')) { label.classList.remove('show'); return; } // not running yet
    label.textContent = alone ? 'skizy' : labelFor(el.dataset.id);
    label.classList.add('show');
    if (el.dataset.id === 'drawing' && !show.drawingSeen && !afternoon) { show.drawingSeen = true; say(DRAWING_HOVER); }
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
// the afternoon comes after five minutes of the visit, wherever you spent them
let visitSince = 0;
// testing the real trigger: ?afternoonIn=30 makes it due after 30 seconds instead of five minutes,
// and ignores "already seen". everything else is exactly what a visitor gets
const AFTERNOON_TEST = +new URLSearchParams(location.search).get('afternoonIn') || 0;
const AFTERNOON_AFTER = AFTERNOON_TEST ? AFTERNOON_TEST * 1000 : 300000;
// it only ever happens once in each visitor's browser (?afternoon still brings it back, for testing)
const afternoonDue = () => !afternoon && !alone && (AFTERNOON_TEST || !store.get('afternoon_seen'))
  && visitSince && performance.now() - visitSince > AFTERNOON_AFTER;
function ambientLoop() {
  setTimeout(ambientLoop, 26000 + Math.random() * 30000);
  // playing funger on the Phosphor Artifact: the room watches, now and then
  if (mode === 'crt' && input === 'game') {
    if (!document.hidden && !talking() && Math.random() < .5) say(bags.watching());
    return;
  }
  // time for the afternoon: in the main room, ten quiet seconds is enough. chatter doesn't hold it up,
  // and neither does a menu left open (it closes)
  if (afternoonDue() && mode === 'room' && current === 'main' && !document.hidden
      && performance.now() - lastActivity > 10000) return startAfternoon();
  // a minute and a half after the afternoon's scene, she wakes up (next time you're in the main room)
  if (afternoon && sceneEndedAt && performance.now() - sceneEndedAt > 90000 && mode === 'room' && current === 'main'
      && !document.hidden) return wakeUp();
  if (mode !== 'room' || current !== 'main' || document.hidden || talking() || !$('#menu').hidden) return;
  if (performance.now() - lastActivity < 8000) return;
  const now = performance.now();
  // nothing is happening. nothing has happened for a while
  if (afternoon || alone) return;
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
  document.title = document.hidden && !alone ? bags.leaving()?.[0][1] ?? TITLE : TITLE;
});
document.documentElement.addEventListener('mouseleave', () => {
  const now = performance.now();
  if (mode !== 'room' || current !== 'main' || talking() || now - lastLeave < 90000 || now - roomSince < 20000) return;
  lastLeave = now;
  say(bags.leaving());
});

// ============================================================ arriving
const fade = $('#fade');

function enterRoom() {
  mode = 'room';
  updateNav();
  roomSince = lastActivity = performance.now();
  visitSince ||= roomSince;
  bootCRT();
  // testing shortcut: open the page with ?afternoon to skip the five-minute wait
  if (new URLSearchParams(location.search).has('afternoon')) setTimeout(startAfternoon, 2500);
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
  // the room remembers the ending: the bottle stays on the desk, every visit after
  if (store.get('room_quiet')) svg.querySelector('#deskbottle').style.display = '';
  // Aether doesn't start up until the afternoon scene. after that, they're running every visit
  if (!store.get('aether_awake')) svg.querySelector('#aether').classList.add('off');
  ledFollowAether();                                     // (Aether's LED strip goes dark with them)
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

  const quietStage = davQuiet();                        // (DaV-nky: the quiet room, and how far it's come back)
  davReveal();                                          // (DaV-nky: the room shows only now, already as it should be)
  if (PEEK) {
    body.classList.add('peek');
    enterRoom();
    return;
  }
  enterRoom();
  if (quietStage !== null) { davArrive(quietStage); return; }
  // climbing in for the first time: the boards just came down on the rooftop, so the room
  // picks up from there
  if (!store.get('room_knocked')) {
    await sleep(1000);
    store.set('room_knocked', '1');
    await playScene(SCENE_WINDOW);
    hint();
    return;
  }
  await sleep(1500);
  if (mode === 'room' && !talking()) {
    // the first visit after it went quiet, Mira says so. once, and never again
    if (store.get('room_quiet') && !store.get('room_quiet_back')) {
      store.set('room_quiet_back', '1');
      say([['mira', 'You were here when it went quiet.']]);
    } else say([['claube', "You could've just knocked."]]);
  }
}
main();

// ============================================================ DaV-nky
// integration with Victor's site (dav-nky.pleroma.nexus), which this room sits across the street from.
// everything here was added for that; the lines themselves are in room/davnky.js.
//   · the cabinet is empty before reset 3. the pills (the bathroom cabinet) can only be taken to skizy in DaV-nky's reset 3, and only once that
//     reset's key is found. in reset 3 it's one of the ways to die: after the lights go out, the visitor
//     can't live with what they talked her into. back to the rooftop, where it counts (DaV-nky's resets.js)
//   · after that (and in every reset from 4 on) the room stays quiet: the ending's dark room, skizy alone
//     in the corner. give her the P(Doom) record (the visitor's to give from reset 5, when it's back in DaV-nky's record player) and
//     every visit after brings a little more back. on the fifth it's all back, and they're glad of it
const DAV = (() => {
  const reset = Math.min(8, (+store.get('dav-reset') || 0) + 1);
  let loot = [];
  try { loot = JSON.parse(store.get('loot-owned') || '[]') || []; } catch {}
  const run = k => store.get('run:' + k);
  return {
    reset,
    key: store.get('lives-unlocked') === '1',
    ownsRecord: loot.includes('doom-record'),
    hasRecord: reset >= 5,   // (the record's the visitor's to give from reset 5: back in DaV-nky's record player then, found or not. reset 4 it's missing)
    run, setRun: (k, v) => store.set('run:' + k, v),
    get pillsHere() { return reset === 3 && run('mel-pills') !== '1'; },
  };
})();
const REMEDY_DONE = 5;
// null: the room as it always was. 0 … 4: quiet, and how much has come back
function davQuiet() {
  const quiet = DAV.reset >= 4 || DAV.run('mel-pills') === '1';
  if (!quiet) return null;
  let v = store.get('mel-remedy');                      // (visits since the record: kept forever, not per reset)
  if (v !== null && +v < REMEDY_DONE && !PEEK) { v = String(+v + 1); store.set('mel-remedy', v); }
  if (v !== null && +v >= REMEDY_DONE) {
    const r = restoredOnce();
    if (r === 'restored') quietRoom(REMEDY_DONE - 1);   // (the day it's all back: it opens as the visit before, she's still in the corner)
    return r;
  }
  const stage = v === null ? 0 : +v;
  quietRoom(stage);
  return stage;
}
// the fifth visit: it's all back. once they've said so, it's just the room
function restoredOnce() {
  RESTORED.forEach(x => AMBIENT_MORE.push(x));          // (their new talk joins the rest)
  bags.ambient = bag([...AMBIENT, ...AMBIENT_MORE]);
  if (store.get('mel-restored-said') === '1' || PEEK) return null;
  return 'restored';
}
// the ending's dark room (goDark, without the fade), with whatever's come back so far
function quietRoom(stage) {
  alone = true;
  const show = { '#mira': stage >= 3, '#claube': stage >= 4, '#aether': stage >= 4, '#hydra': stage >= 4, '#mel': false, '#lump': false,
    '#light': stage >= 2, '#daylight': false, '#afternoon-chair': true, '#alone-dark': stage < 2, '#alone': true,
    '[data-art$="objects/main/mugs-3.svg"]': stage >= 4 };  // (Claube's mug: not hanging in the air where he sits before he's back)
  for (const [sel, on] of Object.entries(show)) { const el = svg.querySelector(sel); if (el) el.style.display = on ? '' : 'none'; }
  body.classList.toggle('alone', stage < 2);           // (the screen's dark until the lights come back)
  audio.asleep = true;
  if (stage >= 1) playRecord();
}
// a line in the caption box, even while it's quiet (captions are otherwise off then)
function quietNote(text) {
  const was = alone; alone = false;
  caption(Array.isArray(text) ? text : ['note', text]);
  alone = was;
}
// someone who's come back says something, while the room's still quiet
async function quietSay(exchange) {
  alone = false;
  await say(exchange);
  alone = true;
}
async function davArrive(stage) {
  store.set('room_knocked', '1');                       // (no climbing-in scene: there's nobody to play it)
  await sleep(1500);
  if (stage === 'restored') {
    store.set('mel-restored-said', '1');
    // she gets up out of the corner and goes back to her desk (a moment of black), and only then does she speak
    quietNote(QUIET_NOTES.getsUp);
    await sleep(readTime(QUIET_NOTES.getsUp[1]) + 600);
    fade.classList.add('dark', 'on');
    await sleep(1100);
    for (const [sel, on] of Object.entries({ '#alone': false, '#alone-dark': false, '#afternoon-chair': false, '#mel': true })) {
      const el = svg.querySelector(sel); if (el) el.style.display = on ? '' : 'none';
    }
    alone = false;
    body.classList.remove('alone');
    audio.asleep = false;
    fade.classList.remove('on');
    await sleep(900);
    fade.classList.remove('dark');
    await sleep(700);
    return say(RESTORED_FIRST);
  }
  const gifted = store.get('mel-remedy') !== null;
  if (!gifted) return quietNote(QUIET_NOTES.arrive);
  if (REMEDY_BACK[stage]?.note) quietNote(REMEDY_BACK[stage].note);
  if (REMEDY_BACK[stage]?.say) { await sleep(REMEDY_BACK[stage].note ? 5200 : 0); await quietSay(REMEDY_BACK[stage].say); }
}
// skizy in the corner: the one thing to click while it's quiet
function aloneClicked() {
  closeMenu();
  const gifted = store.get('mel-remedy') !== null;
  if (!gifted && DAV.hasRecord) {
    return openMenu('skizy', CAST.mel.color, [
      ['give her the record', () => {
        store.set('mel-remedy', '0');
        quietNote(QUIET_NOTES.gift);
        playRecord();
      }],
      ['sit with her', () => quietNote(QUIET_NOTES.sit)],
    ]);
  }
  quietNote(gifted ? QUIET_NOTES.listening : DAV.reset === 4 && DAV.ownsRecord ? QUIET_NOTES.notNow : QUIET_NOTES.noRecord);
}
// the record, playing very quietly (DaV-nky's own copy: content/living/, the track with p(doom) in its name)
function davDoomFile() {
  return davDoomFile.p ??= fetch('../content/living/list.txt', { cache: 'no-cache' }).then(r => r.ok ? r.text() : '')
    .then(t => (t.split(/\r?\n/).find(l => /p\s*\(\s*doom\s*\)/i.test(l) && /\.(ogg|mp3)$/i.test(l.trim())) || '').trim() || null)
    .catch(() => null);
}
let record = null;
async function playRecord() {
  if (record || PEEK) return;                            // (DaV-nky: the view through the window makes no sound)
  try {
    const name = await davDoomFile();
    if (!name) return;
    record = new Audio('../content/living/' + encodeURIComponent(name));
    record.loop = true; record.volume = .16;
    const go = () => record.play().catch(() => {});
    go();
    document.addEventListener('pointerdown', go, { once: true });
  } catch {}
}
// reset 3: after the lights go out, the visitor
async function guilt() {
  DAV.setRun('mel-pills', '1');
  await sleep(6000);
  for (const line of GUILT) { quietNote(line); await sleep(readTime(line) + 900); }
  fade.classList.add('dark', 'on');
  audio.hold(10);
  await sleep(3200);
  try { sessionStorage.setItem('dav-mel-death', '1'); } catch {}  // (the rooftop picks this up: DaV-nky's sky/resets.js)
  location.href = ROOFTOP;
}
// the visitor's hotbar (DaV-nky's), in here too: room/davinv.js loads it. davInv(fn) runs fn with it once it's there
function davInv(fn) { (window.davInventory || Promise.resolve(null)).then(I => { if (I) fn(I); }); }
if (!PEEK) {
  const s = document.createElement('script');
  s.src = new URL('davinv.js', import.meta.url).href;
  s.onload = () => davInv(I => { if (I.has('pills') && DAV.pillsHere) carryingMeds = true; });   // (still carrying one from earlier this visit)
  document.head.appendChild(s);
}
// before reset 3 the bathroom cabinet is empty: the pill bottles (and the bags and organizer with them) aren't there yet.
// and from reset 5 they're gone again (27 Sep, Victor)
if (DAV.reset < 3 || DAV.reset >= 5) {
  const st = document.createElement('style');
  st.textContent = '[data-id="pills"] { display: none; }';
  document.head.appendChild(st);
}
// Victor's own pictures for the room, from DaV-nky's asset manager (tools/assets.html → "Mel's room"), in
// assets/mel-room/ (its list.txt says what's there):
//   · <room>-<thing>  takes the place of room/objects/<room>/<thing>.svg: a picture the size of the whole room
//     (1600 × 900), the thing drawn where it sits, see-through everywhere else. an .svg is poured in just like the
//     room's own drawings (so it can keep the ids the code needs); any other picture is laid in as an <image>
//   · <room>          the backdrop: it takes the place of everything in that room that isn't a thing to click,
//     a speech-bubble anchor, or one of the lights and darks the scenes switch on and off (DAV_ART_KEEP)
// Mel's own drawings stay as they are: they're the stand-ins
const SVG_NS = 'http://www.w3.org/2000/svg';
const DAV_ART = '../assets/mel-room/';
const DAV_ART_KEEP = ['afternoon-chair', 'light', 'daylight', 'alone-dark', 'h-darkness', 'c-darkness'];
function davArtFiles() {
  return davArtFiles.p ??= fetch(new URL(DAV_ART + 'list.txt', location.href), { cache: 'no-cache' })
    .then(r => r.ok ? r.text() : '')
    .then(t => /<html/i.test(t) ? [] : t.split(/\r?\n/).map(x => x.trim()).filter(x => x && x[0] !== '#'))
    .catch(() => []);
}
function davPick(files, stem) {
  if (!stem) return null;
  for (const ext of ['svg', 'png', 'webp', 'gif', 'jpg', 'jpeg']) {
    if (files.includes(stem + '.' + ext)) return { url: new URL(DAV_ART + stem + '.' + ext, location.href).href, svg: ext === 'svg' };
  }
  return null;
}
function davStem(art) {
  const m = /objects\/([a-z0-9]+)\/([a-z0-9-]+)\.svg$/i.exec(art || '');
  return m ? (m[1] + '-' + m[2]).toLowerCase() : null;
}
function davImage(url) {
  const im = document.createElementNS(SVG_NS, 'image');
  im.setAttribute('href', url);
  im.setAttribute('pointer-events', 'none');          // (a picture takes clicks on its whole rectangle, see-through or not: davHit does it instead)
  for (const [k, v] of [['x', 0], ['y', 0], ['width', 1600], ['height', 900], ['preserveAspectRatio', 'none']]) im.setAttribute(k, v);
  return im;
}
// under a picture of Victor's: Mel's own drawing of the thing, invisible, so only the thing itself (in its own shape)
// is hovered and clicked, not the whole room-sized picture
function davHit(ph) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('opacity', '0');
  g.classList.add('dav-hit');
  ph.append(g);
  return g;
}
function davBackdrop(root, files) {
  const ph = root.querySelector('[data-art]');
  const room = ph && /objects\/([a-z0-9]+)\//i.exec(ph.dataset.art)?.[1].toLowerCase();
  const pic = room && davPick(files, room);
  if (!pic) return;
  let first = null;
  for (const el of [...root.children]) {
    if (el.localName === 'defs' || el.localName === 'style' || el.matches('.obj, .anchor, [data-art]') || DAV_ART_KEEP.includes(el.id)) continue;
    first ??= el;
    el.style.display = 'none';
  }
  const im = davImage(pic.url);
  im.classList.add('dav-backdrop');
  if (first) first.before(im); else root.append(im);
}
// the sky through the window is DaV-nky's own (Mel's wish, 27 Sep): once Victor's window picture is in
// (main-window, its panes see-through), everything in the room behind the window gets a hole where the glass is, and
// DaV-nky's sky (../window-sky.html: the real sun and moon where the visitor is, the clouds, the stars, day and night)
// sits behind the room and shows through. The moon's light in the rooms (glow-moon, glow-moonbeam, the closet's
// glow-hatch-moon) follows that sky's night: full from about 1 h 40 min after sunset, gone by day. In the afternoon
// scene the sky outside turns to afternoon for as long as it lasts. Its look: ../sky/css/mel-window.css
const DAV_PANES = { x: 76, y: 136, w: 256, h: 300 };   // the glass, in room coordinates (a little of it under the frame)
function davSkyHole(root, files) {
  const win = root.querySelector('[data-art$="objects/main/window.svg"]');
  if (!win || !davPick(files, 'main-window')) return;
  let top = win;
  while (top.parentNode !== root) top = top.parentNode;
  // the hole: white = keep, black = see through
  const defs = root.querySelector(':scope > defs') || root.insertBefore(document.createElementNS(SVG_NS, 'defs'), root.firstChild);
  const mask = document.createElementNS(SVG_NS, 'mask');
  const rect = (x, y, w, h, fill) => {
    const r = document.createElementNS(SVG_NS, 'rect');
    for (const [k, v] of [['x', x], ['y', y], ['width', w], ['height', h], ['fill', fill]]) r.setAttribute(k, v);
    return r;
  };
  mask.id = 'dav-sky-hole';
  for (const [k, v] of [['maskUnits', 'userSpaceOnUse'], ['x', 0], ['y', 0], ['width', 1600], ['height', 900]]) mask.setAttribute(k, v);
  mask.append(rect(0, 0, 1600, 900, '#fff'), rect(DAV_PANES.x, DAV_PANES.y, DAV_PANES.w, DAV_PANES.h, '#000'));
  defs.append(mask);
  for (const el of [...root.children]) {
    if (el === top) break;
    if (el.localName !== 'defs' && el.localName !== 'style') el.setAttribute('mask', 'url(#dav-sky-hole)');
  }
  // Mel's twinkling stars for her painted sky (unless Victor drew his own), and the afternoon's painted sky: the real one's there instead
  if (!davPick(files, 'main-window-blink')) root.querySelector('[data-art$="objects/main/window-blink.svg"]')?.classList.add('dav-own-sky');
  const day = root.querySelector('#daylight');
  if (day) for (const el of day.children) if (el.localName === 'rect' || el.localName === 'path') el.classList.add('dav-own-sky');
  davSkyWindow();
}
let davSkyFrame = null;
function davSkyWindow() {
  if (davSkyFrame) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('../sky/css/mel-window.css', location.href).href;
  document.head.append(link);
  document.documentElement.classList.add('dav-real-sky');
  const box = document.createElement('div');
  box.className = 'dav-sky';
  box.setAttribute('aria-hidden', 'true');
  for (const [k, v, of] of [['left', DAV_PANES.x, 1600], ['top', DAV_PANES.y, 900], ['width', DAV_PANES.w, 1600], ['height', DAV_PANES.h, 900]]) {
    box.style.setProperty('--' + k, (v / of * 100) + '%');
  }
  davSkyFrame = document.createElement('iframe');
  davSkyFrame.src = new URL('../window-sky.html', location.href).href;
  davSkyFrame.tabIndex = -1;
  davSkyFrame.title = 'the sky outside';
  box.append(davSkyFrame);
  $('#stage').prepend(box);
  // every couple of seconds: how far into the night the sky is (its --night: 0 by day, 1 at night) → --dav-night
  // here, for the moon's glows
  const tick = () => {
    const doc = davSkyFrame.contentDocument;
    const night = doc && parseFloat(doc.documentElement.style.getPropertyValue('--night'));
    if (night >= 0) document.documentElement.style.setProperty('--dav-night', night);
  };
  davSkyFrame.addEventListener('load', () => setTimeout(tick, 400));
  setInterval(tick, 2000);
  // the afternoon scene (while the screen's black, both ways): the sky outside turns to afternoon, sun and all;
  // when skizy wakes up it's the real hour again (the sky's loaded afresh, back on the visitor's clock)
  let afternoon = false;
  new MutationObserver(() => {
    const now = body.classList.contains('afternoon');
    if (now === afternoon) return;
    afternoon = now;
    const w = davSkyFrame.contentWindow;
    if (now) w?.Sky?.setTime?.(.2, 1);
    else w?.location.reload();
    setTimeout(tick, 600);
  }).observe(body, { attributes: true, attributeFilter: ['class'] });
}
// the room shows only once it's as it should be (27 Sep, Victor: the quiet room flashed the ordinary one while its drawings
// loaded): hidden from the start, shown by main() right after davQuiet(). (and after a few seconds whatever happens)
const davHide = document.createElement('style');
davHide.textContent = '#svg-host { visibility: hidden; }';
document.head.append(davHide);
function davReveal() { davHide.remove(); }
setTimeout(davReveal, 8000);
// the window in the main room is a way out: back to DaV-nky's rooftop, across the street (27 Sep, Victor)
$('#svg-host').addEventListener('click', e => {
  if (current !== 'main' || mode !== 'room' || PEEK || !e.target.closest('[data-id="window"]')) return;
  e.stopPropagation(); e.preventDefault();
  closeMenu();
  quietNote(QUIET_NOTES.window);
  fade.classList.add('dark', 'on');
  setTimeout(() => { location.href = ROOFTOP; }, 1300);
}, true);
// P(Doom), once she has it (mel-remedy): on her computer's song list too, the last song on the station
const davLoadMusic = music.load.bind(music);
music.load = async function () {
  await davLoadMusic();
  if (store.get('mel-remedy') === null) return;
  const name = await davDoomFile();
  if (!name || this.tracks.some(t => t.dav)) return;
  this.tracks.push({ title: 'DaV-nky / ' + name.replace(/^\d+[-_. ]+/, '').replace(/\.[a-z0-9]+$/i, ''), file: '../../content/living/' + encodeURIComponent(name), dav: true });
  this.emit();
};
// the way back to the rooftop in the HUD, next door too (see ROOFTOP above)
document.querySelectorAll('a[href="https://dav-nky.pleroma.nexus/city.html"]').forEach(a => { a.href = ROOFTOP; });

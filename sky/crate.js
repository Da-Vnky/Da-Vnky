/* =====================================================================
   crate.js — the living space's crate of bottles and the pinboard.
   Bottles you've approved (files in content/living/bottles/) wait in the
   crate. A visitor takes one out, pulls the cork, reads it, and it gets
   pinned to the board. Click the board to scroll through every message.

       <div class="furnish pinboard"></div>
       <div class="furnish bottle-crate" data-folder="content/living/bottles/"></div>
       <script src="sky/crate.js"></script>          (after sky/sky.js)

   files: the .jpg notes that arrive in your inbox (their words, name and date
   are read from inside the file), or any picture (.png .webp .gif .svg), or a
   .txt you type yourself. names starting with a date go newest first.
   which bottles a visitor has opened is remembered in their browser.
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var crate = document.querySelector('.bottle-crate[data-folder]');
    var board = document.querySelector('.pinboard');
    if (!crate) return;
    var KINDS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'txt'];
    var OPENED = 'bottles-opened';
    var UNPINNED = 'bottles-unpinned';            // opened, then taken down off the board

    Sky.css(
        '.bottle-crate { cursor: pointer; }' +
        '.bottle-crate .crate-art, .bottle-crate > .art { position: absolute; inset: 0; width: 100%; height: 100%; }' +
        '.bottle-crate .necks { position: absolute; left: 8%; right: 8%; top: -34%; height: 50%; }' +
        '.bottle-crate .neck { position: absolute; bottom: 0; width: 16%; transform-origin: 50% 100%; }' +
        '.bottle-crate .neck svg { display: block; width: 100%; }' +
        '.bottle-crate.has-new .neck { animation: neck-bob 3s ease-in-out infinite alternate; }' +
        '@keyframes neck-bob { from { transform: rotate(var(--r)) translateY(0); } to { transform: rotate(calc(var(--r) * -.5)) translateY(-3px); } }' +
        '.bottle-crate .crate-hint, .pinboard .board-hint { position: absolute; left: 50%; bottom: calc(100% + 36%); transform: translateX(-50%); white-space: nowrap;' +
            'font-style: italic; font-size: .95rem; color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.7); opacity: 0; transition: opacity .25s; pointer-events: none; }' +
        '.pinboard .board-hint { bottom: auto; top: calc(100% + 8px); }' +
        '.bottle-crate:hover .crate-hint, .bottle-crate:focus-visible .crate-hint, .pinboard:hover .board-hint, .pinboard:focus-visible .board-hint { opacity: 1; }' +
        '.bottle-crate .badge { position: absolute; right: -8px; top: -10px; min-width: 24px; height: 24px; padding: 0 6px; border-radius: 12px;' +
            'background: #9a3b1f; color: #fff6dc; font: 14px/24px Georgia, serif; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,.4); }' +
        '.bottle-crate:not(.has-new) .badge { display: none; }' +

        /* the pinboard on the wall */
        '.pinboard { cursor: zoom-in; aspect-ratio: 4 / 3; border: 10px solid #5a3a24; border-radius: 3px;' +
            'background: #b8875a radial-gradient(rgba(90,55,25,.35) 1px, transparent 1.5px) 0 0 / 7px 7px;' +
            'box-shadow: 0 8px 14px rgba(0,0,0,.45), inset 0 0 18px rgba(60,35,15,.55); }' +
        '.pinboard .pins { position: absolute; inset: 6%; }' +
        '.pinboard .pinned-note { position: absolute; width: 30%; aspect-ratio: 3 / 4; background: #efe3c6; overflow: hidden;' +
            'box-shadow: 0 3px 5px rgba(0,0,0,.4); display: grid; place-items: center; }' +
        '.pinboard .pinned-note img { width: 100%; height: 100%; object-fit: cover; }' +
        '.pinboard .pinned-note .mini { padding: 8%; font-size: 7px; line-height: 1.3; color: #3a2716; overflow: hidden; height: 100%; }' +
        '.pinboard .pinned-note::after, .board-view .bv-card::before { content: ""; position: absolute; left: 50%; top: 4%; width: 9px; height: 9px; margin-left: -4.5px;' +
            'border-radius: 50%; background: radial-gradient(circle at 35% 35%, #e0795a, #7a2a18); box-shadow: 0 2px 2px rgba(0,0,0,.4); }' +
        '.pinboard .empty { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; padding: 10%;' +
            'font-style: italic; font-size: .85rem; color: rgba(60,35,15,.75); }' +
        // your own board (assets/living/pinboard, 4:3): the notes are pinned on top of it
        '.pinboard.has-art { border: 0; background: none; box-shadow: none; }' +
        '.pinboard > .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; z-index: 0; }' +
        '.pinboard .pins { z-index: 1; }' +
        '.pinboard.has-art:hover { box-shadow: none; filter: drop-shadow(0 0 10px rgba(255,220,150,.45)); }' +
        '.pinboard:not(.has-art):hover { box-shadow: 0 8px 14px rgba(0,0,0,.45), inset 0 0 18px rgba(60,35,15,.55), 0 0 18px rgba(255,220,150,.35); }' +

        /* taking a bottle out */
        '.uncork { position: fixed; inset: 0; z-index: 8; display: grid; place-items: center; visibility: hidden; opacity: 0;' +
            'background: radial-gradient(ellipse at 50% 45%, rgba(40,30,20,.6), rgba(10,8,6,.9) 75%); transition: opacity .4s, visibility 0s .4s;' +
            'font-family: "IM Fell English", Georgia, serif; color: #3a2716; }' +
        '.uncork.open { visibility: visible; opacity: 1; transition: opacity .4s; }' +
        '.uncork .big-bottle { width: min(520px, 86vw); cursor: pointer; filter: drop-shadow(0 12px 14px rgba(0,0,0,.5)); transform: rotate(-8deg); }' +
        '.uncork .big-bottle .b-cork { cursor: grab; transform-box: fill-box; transform-origin: center; }' +
        '.uncork .u-hint { position: absolute; left: 50%; top: calc(50% + min(150px, 22vw)); transform: translateX(-50%); white-space: nowrap;' +
            'color: #f3e6c2; font-style: italic; font-size: 1.15rem; text-shadow: 0 1px 4px rgba(0,0,0,.7); transition: opacity .3s; }' +
        '.uncork .u-card { position: absolute; left: 50%; top: 50%; width: min(460px, 86vw); max-height: 78vh; transform: translate(-50%, -50%);' +
            'display: none; flex-direction: column; background: #efe3c6; box-shadow: 0 20px 50px rgba(0,0,0,.6), inset 0 0 40px rgba(120,80,30,.22); }' +
        '.uncork.read .u-card { display: flex; }' +
        '.uncork.read .big-bottle, .uncork.read .u-hint { display: none; }' +
        '.u-card .u-body { overflow: auto; min-height: 0; }' +
        '.u-card .u-body img { display: block; width: 100%; height: auto; }' +
        '.u-card .u-body .paper, .bv-card .paper { padding: 28px 30px; line-height: 1.55; }' +
        '.u-card .u-body .paper h2, .bv-card .paper h2 { margin: 0 0 8px; font: normal 1.5rem "IM Fell English SC", Georgia, serif; }' +
        '.u-card .u-foot { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-top: 1px solid rgba(110,82,54,.25); }' +
        '@media (max-width: 620px) { .uncork .u-card .u-foot { flex-wrap: wrap; } .uncork .u-card .u-from { flex: 0 0 100%; font-size: .9em; } .uncork .u-card .u-pin { margin-left: auto; } }' +
        '.u-card .u-from, .bv-card .bv-from { flex: 1; font-style: italic; color: #6e5236; }' +
        '.u-card button, .board-view .bv-close { border: 0; cursor: pointer; padding: 8px 16px; border-radius: 999px;' +
            'font: italic 1.02rem "IM Fell English", Georgia, serif; background: #3a2716; color: #f3e6c2; }' +
        '.u-card button:hover, .board-view .bv-close:hover { background: #9a3b1f; }' +

        /* the whole board, up close */
        '.board-view { position: fixed; inset: 0; z-index: 8; overflow-y: auto; visibility: hidden; opacity: 0; transition: opacity .4s, visibility 0s .4s;' +
            'background: #b8875a radial-gradient(rgba(90,55,25,.35) 1px, transparent 1.5px) 0 0 / 9px 9px; font-family: "IM Fell English", Georgia, serif;' +
            'box-shadow: inset 0 0 120px rgba(40,20,5,.6); overscroll-behavior: contain; }' +
        '.board-view.open { visibility: visible; opacity: 1; transition: opacity .4s; }' +
        '.board-view .bv-top { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 12px; padding: 14px 18px;' +
            'background: linear-gradient(rgba(90,58,36,.95), rgba(90,58,36,.0)); }' +
        '.board-view h2 { margin: 0; flex: 1; font: normal 1.5rem "IM Fell English SC", Georgia, serif; color: #f3e6c2; text-shadow: 0 2px 4px rgba(0,0,0,.6); }' +
        '.board-view .bv-list { display: flex; flex-direction: column; align-items: center; gap: 34px; padding: 10px 16px 80px; }' +
        '.bv-card { position: relative; width: min(560px, 92vw); background: #efe3c6; color: #3a2716; box-shadow: 0 10px 22px rgba(0,0,0,.45), inset 0 0 40px rgba(120,80,30,.2); }' +
        '.bv-card::before { width: 14px; height: 14px; margin-left: -7px; top: -6px; z-index: 1; }' +
        '.bv-card img { display: block; width: 100%; height: auto; }' +
        '.bv-card .bv-from { display: block; padding: 8px 14px 10px; border-top: 1px solid rgba(110,82,54,.25); }' +
        '.board-view .bv-empty { color: #3a2716; font-style: italic; text-align: center; margin-top: 20vh; }' +
        // taking a note down
        '.bv-card .bv-unpin { position: absolute; right: -10px; top: -12px; z-index: 2; display: flex; align-items: center; gap: 5px;' +
            'border: 0; cursor: pointer; padding: 5px 11px 5px 9px; border-radius: 999px; font: italic .95rem "IM Fell English", Georgia, serif;' +
            'background: #3a2716; color: #f3e6c2; box-shadow: 0 3px 6px rgba(0,0,0,.4); opacity: .0; transition: opacity .2s, background .2s; }' +
        '.bv-card:hover .bv-unpin, .bv-card:focus-within .bv-unpin, .bv-card .bv-unpin:focus-visible { opacity: 1; }' +
        '@media (hover: none) { .bv-card .bv-unpin { opacity: .92; } }' +
        '.bv-card .bv-unpin:hover { background: #9a3b1f; }' +
        '.bv-card .bv-unpin svg { width: 13px; height: 13px; }' +
        '.board-view .bv-restore { display: block; margin: 0 auto; border: 0; cursor: pointer; padding: 8px 16px; border-radius: 999px;' +
            'font: italic 1rem "IM Fell English", Georgia, serif; background: rgba(58,39,22,.75); color: #f3e6c2; }' +
        '.board-view .bv-restore:hover { background: #3a2716; }' +
        '.board-view .bv-undo { position: fixed; left: 50%; bottom: 22px; z-index: 3; transform: translate(-50%, 20px); opacity: 0; pointer-events: none;' +
            'display: flex; gap: 12px; align-items: center; padding: 8px 10px 8px 16px; border-radius: 999px; background: #2a1d14; color: #f3e6c2;' +
            'font-style: italic; box-shadow: 0 6px 16px rgba(0,0,0,.5); transition: opacity .25s, transform .25s; }' +
        '.board-view .bv-undo.show { opacity: 1; transform: translate(-50%, 0); pointer-events: auto; }' +
        '.board-view .bv-undo button { border: 0; cursor: pointer; padding: 5px 12px; border-radius: 999px; background: #eadcb9; color: #3a2716;' +
            'font: italic .95rem "IM Fell English", Georgia, serif; }' +
        'body.crate-open .signpost { opacity: 0; pointer-events: none; }'
    );

    var opened = [];
    try { opened = JSON.parse(localStorage.getItem(OPENED)) || []; } catch (e) {}
    function saveOpened() { try { localStorage.setItem(OPENED, JSON.stringify(opened)); } catch (e) {} }
    var unpinned = [];
    try { unpinned = JSON.parse(localStorage.getItem(UNPINNED)) || []; } catch (e) {}
    function saveUnpinned() { try { localStorage.setItem(UNPINNED, JSON.stringify(unpinned)); } catch (e) {} }
    var bottles = [];                                   // { file, id, date, meta: promise }

    /* ---------------- reading the words tucked inside a png ---------------- */
    function readMeta(b) {
        if (b.meta) return b.meta;
        if (!/\.(png|jpe?g)$/i.test(b.file.name)) return (b.meta = Promise.resolve({}));
        b.meta = fetch(b.file.url).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (buf) {
            var out = {};
            if (!buf) return out;
            var u = new Uint8Array(buf), dv = new DataView(buf), p = 8, dec = new TextDecoder(), lat = new TextDecoder('iso-8859-1');
            if (u[0] === 0xFF && u[1] === 0xD8) {                        // jpeg: look for the bottle's comment
                for (var j = 2; j + 4 < u.length && u[j] === 0xFF;) {
                    var mk = u[j + 1], sl = dv.getUint16(j + 2);
                    if (mk === 0xDA) break;
                    if (mk === 0xFE) {
                        var t = dec.decode(u.subarray(j + 4, j + 2 + sl));
                        if (t.indexOf('bottle:') === 0) {
                            try { var f = JSON.parse(t.slice(7)); out.Author = f.author; out.Description = f.text; out['Creation Time'] = f.time; } catch (e) {}
                        }
                    }
                    j += 2 + sl;
                }
                return out;
            }
            while (p + 8 <= u.length) {
                var len = dv.getUint32(p), type = String.fromCharCode(u[p + 4], u[p + 5], u[p + 6], u[p + 7]), d = u.subarray(p + 8, p + 8 + len);
                if (type === 'IDAT' || type === 'IEND') break;
                if (type === 'iTXt' || type === 'tEXt') {
                    var z = d.indexOf(0), key = lat.decode(d.subarray(0, z)), val;
                    if (type === 'tEXt') val = lat.decode(d.subarray(z + 1));
                    else if (d[z + 1] === 0) {                          // uncompressed iTXt
                        var q = d.indexOf(0, z + 3); q = d.indexOf(0, q + 1);
                        val = dec.decode(d.subarray(q + 1));
                    }
                    if (val) out[key] = val;
                }
                p += 12 + len;
            }
            return out;
        }).catch(function () { return {}; });
        return b.meta;
    }
    function fromLine(b, meta) {
        var who = meta.Author, when = meta['Creation Time'] ? meta['Creation Time'].slice(0, 10) : b.date;
        var nice = when ? new Date(when + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase() : '';
        return (who ? 'from ' + who : 'from someone at sea') + (nice ? ' · ' + nice : '');
    }
    // the message itself: the note picture, or a typed .txt on paper
    function messageEl(b, cls) {
        if (/\.txt$/i.test(b.file.name)) {
            var d = document.createElement('div');
            d.className = cls || 'paper';
            fetch(b.file.url, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
                d.innerHTML = cls === 'mini' ? '' : Sky.txtToHtml(t);
                if (cls === 'mini') d.textContent = t.slice(0, 160);
            });
            return d;
        }
        var im = document.createElement('img');
        im.src = b.file.url;
        im.loading = 'lazy';
        im.alt = 'a message in a bottle';
        readMeta(b).then(function (m) { if (m.Description) im.alt = m.Description; });
        return im;
    }

    /* ---------------- the crate ---------------- */
    crate.setAttribute('role', 'button');
    crate.setAttribute('tabindex', '0');
    crate.insertAdjacentHTML('beforeend', '<div class="necks" aria-hidden="true"></div><span class="badge"></span><span class="crate-hint"></span>');
    var necks = crate.querySelector('.necks'), badge = crate.querySelector('.badge'), crateHint = crate.querySelector('.crate-hint');
    var NECK = '<svg viewBox="0 0 30 70"><path d="M6 70 V34 Q6 24 11 20 V6 H19 V20 Q24 24 24 34 V70 Z" fill="rgba(96,158,146,.6)" stroke="rgba(215,240,232,.8)" stroke-width="1.4"/>' +
               '<rect x="9.5" y="0" width="11" height="9" rx="2" fill="#9a6b3c"/><path d="M10 40 V64" stroke="rgba(255,255,255,.45)" stroke-width="2" stroke-linecap="round"/></svg>';

    function unopened() { return bottles.filter(function (b) { return opened.indexOf(b.id) === -1; }); }
    function drawCrate() {
        var n = unopened().length;
        crate.classList.toggle('has-new', n > 0);
        badge.textContent = n;
        crateHint.textContent = n ? (n === 1 ? 'a bottle washed up' : n + ' bottles washed up') : (bottles.length ? 'every bottle opened, for now' : 'no bottles have washed up yet');
        crate.setAttribute('aria-label', 'the crate of bottles: ' + crateHint.textContent);
        necks.innerHTML = '';
        for (var i = 0; i < Math.min(n, 6); i++) {
            var k = document.createElement('span');
            k.className = 'neck';
            k.style.left = (6 + i * 15) + '%';
            k.style.setProperty('--r', ((i % 2 ? 1 : -1) * (4 + (i * 7) % 9)) + 'deg');
            k.style.animationDelay = (-i * 0.7) + 's';
            k.innerHTML = NECK;
            necks.appendChild(k);
        }
    }

    /* ---------------- the pinboard ---------------- */
    if (board) {
        board.setAttribute('role', 'button');
        board.setAttribute('tabindex', '0');
        board.insertAdjacentHTML('beforeend', '<div class="pins"></div><span class="board-hint">read the board</span>');
    }
    function pinnedBottles() {
        return bottles.filter(function (b) { return opened.indexOf(b.id) !== -1 && unpinned.indexOf(b.id) === -1; });
    }
    function takenDown() {
        return bottles.filter(function (b) { return unpinned.indexOf(b.id) !== -1; });
    }
    function drawBoard() {
        if (!board) return;
        var pins = board.querySelector('.pins'), list = pinnedBottles();
        pins.innerHTML = '';
        board.setAttribute('aria-label', 'the pinboard: ' + list.length + (list.length === 1 ? ' message' : ' messages'));
        if (!list.length) { pins.innerHTML = '<span class="empty">open a bottle from the crate and its message gets pinned here</span>'; return; }
        list.slice(0, 7).forEach(function (b, i) {
            var rnd = Sky.seeded(Sky.hashStr(b.id));
            var n = document.createElement('span');
            n.className = 'pinned-note';
            n.style.left = (3 + ((i * 31) % 70) + rnd() * 6) + '%';
            n.style.top = (i < 3 ? 2 : 34) + rnd() * 16 + '%';
            n.style.transform = 'rotate(' + ((rnd() - .5) * 14).toFixed(1) + 'deg)';
            n.appendChild(messageEl(b, 'mini'));
            pins.appendChild(n);
        });
    }

    /* ---------------- pulling a bottle out and opening it ---------------- */
    var un = document.createElement('div');
    un.className = 'uncork';
    un.setAttribute('role', 'dialog');
    un.setAttribute('aria-label', 'a message in a bottle');
    un.innerHTML = Sky.bottleSVG('big-bottle') + '<span class="u-hint">pull the cork, or just click the bottle</span>' +
        '<div class="u-card"><div class="u-body"></div><div class="u-foot"><span class="u-from"></span><button type="button" class="u-pin">pin it to the board</button></div></div>';
    document.body.appendChild(un);
    var bigBottle = un.querySelector('.big-bottle'), cork = un.querySelector('.b-cork'), roll = un.querySelector('.b-scroll');
    var card = un.querySelector('.u-card'), cardBody = un.querySelector('.u-body'), cardFrom = un.querySelector('.u-from');
    var current = null, uncorked = false, corkDrag = null;

    function takeOne() {
        var list = unopened();
        if (!list.length) { if (pinnedBottles().length || takenDown().length) openBoard(); return; }
        current = list[0];
        uncorked = false;
        un.classList.remove('read');
        cork.style.transform = ''; cork.getAnimations().forEach(function (a) { a.cancel(); });
        roll.style.opacity = ''; roll.getAnimations().forEach(function (a) { a.cancel(); });
        un.classList.add('open');
        document.body.classList.add('crate-open');
        var cr = crate.getBoundingClientRect(), br = bigBottle.getBoundingClientRect();
        bigBottle.animate([
            { transform: 'translate(' + (cr.left + cr.width / 2 - (br.left + br.width / 2)) + 'px,' + (cr.top - (br.top + br.height / 2)) + 'px) rotate(-80deg) scale(.2)' },
            { transform: 'rotate(-8deg)' }
        ], { duration: 700, easing: 'cubic-bezier(.3,.7,.25,1)' });
    }
    function pop() {
        if (uncorked || !current) return;
        uncorked = true;
        if (opened.indexOf(current.id) === -1) { opened.push(current.id); saveOpened(); }
        var was = unpinned.indexOf(current.id);
        if (was !== -1) { unpinned.splice(was, 1); saveUnpinned(); }
        var fx = corkDrag ? corkDrag.dx : 0, fy = corkDrag ? corkDrag.dy : 0;
        corkDrag = null;
        cork.animate([
            { transform: 'translate(' + fx + 'px,' + fy + 'px)', opacity: 1 },
            { transform: 'translate(' + (fx + 80) + 'px,' + (fy - 120) + 'px) rotate(480deg)', opacity: 0 }
        ], { duration: 800, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
        roll.animate([{ transform: 'none' }, { transform: 'translateX(130px)', opacity: 1, offset: .8 }, { transform: 'translateX(150px)', opacity: 0 }],
            { duration: 900, delay: 250, easing: 'ease-in', fill: 'forwards' }).onfinish = function () { read(); };
        un.querySelector('.u-hint').style.opacity = 0;
    }
    function read() {
        cardBody.innerHTML = '';
        cardBody.appendChild(messageEl(current));
        cardFrom.textContent = fromLine(current, {});
        readMeta(current).then(function (m) { if (current) cardFrom.textContent = fromLine(current, m); });
        un.classList.add('read');
        card.animate([{ transform: 'translate(-50%,-50%) scaleY(.05)', opacity: .6 }, { transform: 'translate(-50%,-50%)', opacity: 1 }],
            { duration: 700, easing: 'cubic-bezier(.3,.7,.25,1)' });
        un.querySelector('.u-pin').focus({ preventScroll: true });
    }
    // the message flies to the board and gets pinned
    function pinIt() {
        if (!board) { closeUncork(); return; }
        var a = card.getBoundingClientRect(), b = board.getBoundingClientRect();
        card.animate([
            { transform: 'translate(-50%,-50%)', opacity: 1 },
            { transform: 'translate(calc(-50% + ' + (b.left + b.width * .5 - (a.left + a.width / 2)) + 'px), calc(-50% + ' + (b.top + b.height * .45 - (a.top + a.height / 2)) + 'px)) scale(' + (b.width * .3 / a.width) + ') rotate(-6deg)', opacity: .9 }
        ], { duration: 750, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).onfinish = function () {
            closeUncork();
            card.getAnimations().forEach(function (x) { x.cancel(); });
        };
        un.style.transition = 'background .6s';
    }
    function closeUncork() {
        un.classList.remove('open', 'read');
        document.body.classList.remove('crate-open');
        current = null;
        un.querySelector('.u-hint').style.opacity = '';
        drawCrate();
        drawBoard();
        if (board) board.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 400 });
    }

    cork.addEventListener('pointerdown', function (e) {
        if (uncorked) return;
        e.preventDefault(); e.stopPropagation();
        cork.setPointerCapture(e.pointerId);
        corkDrag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
    });
    cork.addEventListener('pointermove', function (e) {
        if (!corkDrag) return;
        var s = bigBottle.getBoundingClientRect().width / 200;
        corkDrag.dx = (e.clientX - corkDrag.x) / s; corkDrag.dy = (e.clientY - corkDrag.y) / s;
        if (Math.hypot(corkDrag.dx, corkDrag.dy) > 34) { pop(); return; }
        cork.style.transform = 'translate(' + corkDrag.dx + 'px,' + corkDrag.dy + 'px)';
    });
    cork.addEventListener('pointerup', function () { if (corkDrag) pop(); });
    bigBottle.addEventListener('click', pop);
    un.querySelector('.u-pin').addEventListener('click', pinIt);
    un.addEventListener('pointerdown', function (e) { if (e.target === un) { if (uncorked) pinIt(); else closeUncork(); } });

    crate.addEventListener('click', takeOne);
    crate.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); takeOne(); } });

    /* ---------------- the board, up close: scroll through every message ---------------- */
    var bv = document.createElement('div');
    bv.className = 'board-view';
    bv.setAttribute('role', 'dialog');
    bv.setAttribute('aria-label', 'the pinboard');
    bv.innerHTML = '<div class="bv-top"><h2>the pinboard</h2><button type="button" class="bv-close">step back</button></div><div class="bv-list"></div>' +
        '<div class="bv-undo" role="status"><span></span><button type="button">put it back</button></div>';
    document.body.appendChild(bv);
    var PIN_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    var undo = bv.querySelector('.bv-undo'), undoTimer = 0, lastDown = null;
    function boardTitle() {
        var n = pinnedBottles().length;
        bv.querySelector('h2').textContent = 'the pinboard' + (n ? ' · ' + n + (n === 1 ? ' message' : ' messages') : '');
    }
    function drawBoardView(keepScroll) {
        var list = bv.querySelector('.bv-list'), pinned = pinnedBottles(), down = takenDown();
        var y = bv.scrollTop;
        list.innerHTML = '';
        boardTitle();
        if (!pinned.length) list.innerHTML = '<p class="bv-empty">' + (down.length ? 'nothing on the board right now.' : 'nothing pinned yet. take a bottle from the crate and open it.') + '</p>';
        pinned.forEach(function (b, i) {
            var c = document.createElement('article');
            c.className = 'bv-card';
            c.style.transform = 'rotate(' + ((i % 2 ? 1 : -1) * (0.6 + (i * 0.37) % 1.2)).toFixed(2) + 'deg)';
            c.appendChild(messageEl(b));
            var f = document.createElement('span');
            f.className = 'bv-from';
            f.textContent = fromLine(b, {});
            readMeta(b).then(function (m) { f.textContent = fromLine(b, m); });
            c.appendChild(f);
            var ub = document.createElement('button');
            ub.type = 'button';
            ub.className = 'bv-unpin';
            ub.innerHTML = PIN_ICON + '<span>unpin</span>';
            ub.setAttribute('aria-label', 'unpin this message');
            ub.addEventListener('click', function () { unpin(b, c); });
            c.appendChild(ub);
            list.appendChild(c);
        });
        if (down.length) {
            var r = document.createElement('button');
            r.type = 'button';
            r.className = 'bv-restore';
            r.textContent = 'pin back the ' + (down.length === 1 ? 'one' : down.length) + ' you took down';
            r.addEventListener('click', function () { unpinned = []; saveUnpinned(); drawBoardView(true); drawBoard(); });
            list.appendChild(r);
        }
        if (keepScroll) bv.scrollTop = y;
    }
    // the pin comes out and the note drops away
    function unpin(b, card) {
        if (unpinned.indexOf(b.id) === -1) { unpinned.push(b.id); saveUnpinned(); }
        lastDown = b.id;
        var h = card.offsetHeight;
        card.style.pointerEvents = 'none';
        card.animate([
            { transform: card.style.transform, opacity: 1 },
            { transform: 'translateY(40px) rotate(14deg)', opacity: 0 }
        ], { duration: 420, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' }).onfinish = function () {
            card.animate([{ height: h + 'px', marginBottom: '0px' }, { height: '0px', marginBottom: '-34px' }], { duration: 260, easing: 'ease-in', fill: 'forwards' })
                .onfinish = function () { drawBoardView(true); drawBoard(); };
        };
        boardTitle();
        undo.querySelector('span').textContent = 'unpinned';
        undo.classList.add('show');
        clearTimeout(undoTimer);
        undoTimer = setTimeout(function () { undo.classList.remove('show'); }, 5000);
    }
    undo.querySelector('button').addEventListener('click', function () {
        var i = unpinned.indexOf(lastDown);
        if (i !== -1) { unpinned.splice(i, 1); saveUnpinned(); }
        undo.classList.remove('show');
        drawBoardView(true);
        drawBoard();
    });
    function openBoard() {
        drawBoardView(false);
        bv.scrollTop = 0;
        bv.classList.add('open');
        document.body.classList.add('crate-open');
        bv.querySelector('.bv-close').focus({ preventScroll: true });
    }
    function closeBoard() { bv.classList.remove('open'); undo.classList.remove('show'); document.body.classList.remove('crate-open'); }
    bv.querySelector('.bv-close').addEventListener('click', closeBoard);
    if (board) {
        board.addEventListener('click', openBoard);
        board.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBoard(); } });
    }
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (bv.classList.contains('open')) { e.stopImmediatePropagation(); closeBoard(); }
        else if (un.classList.contains('open')) { e.stopImmediatePropagation(); uncorked ? pinIt() : closeUncork(); }
    }, true);

    /* ---------------- the bottles, from the folder ---------------- */
    drawCrate();
    drawBoard();
    Sky.listFolder(crate.dataset.folder, KINDS, function (files) {
        bottles = Sky.sortNewest(files).map(function (f) { return { file: f, id: f.name, date: Sky.fileDate(f.name) }; });
        drawCrate();
        drawBoard();
    });
})();

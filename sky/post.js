/* =====================================================================
   post.js — "leave a message": visitors write, draw or add a picture on
   a paper note, roll it into a bottle and toss it out to sea.
   Each bottle is packed as one picture (a .jpg of the note, with the words,
   name and date tucked inside the file) and sent to your inbox
   (BOTTLE_INBOX in sky/sky.js). You read them and drop the ones you want to
   keep into content/living/bottles/, where they wash up in the crate.

       <script src="sky/post.js"></script>      (on the sea page, after ground-sea.js)
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky.sea) return;
    var WAIT = 10 * 60 * 1000;          // one bottle per visitor every ten minutes
    var MAX_TEXT = 700;
    var INKS = [['ink', '#3a2716'], ['red chalk', '#9a3b1f'], ['sea', '#36526a']];
    var SIZES = [['fine', 0.004], ['broad', 0.010]];

    Sky.css(
        '.post-btn { left: 18px; bottom: 18px; }' +
        '.post-btn .ui-icon svg { width: 30px; height: 30px; }' +
        'body.post-open .post-btn, body.sky-view .post-btn { opacity: 0; visibility: hidden; pointer-events: none; }' +

        '.post { position: fixed; inset: 0; z-index: 8; display: grid; place-items: center; padding: 16px; visibility: hidden; opacity: 0;' +
            'background: radial-gradient(ellipse at 50% 45%, rgba(20,30,45,.55), rgba(8,12,20,.85) 75%); transition: opacity .4s, visibility 0s .4s;' +
            'font-family: "IM Fell English", Georgia, serif; color: #3a2716; }' +
        'body.post-open .post { visibility: visible; opacity: 1; transition: opacity .4s; }' +
        '.post-desk { display: flex; flex-direction: column; align-items: center; gap: 12px; max-height: 100%; }' +
        '.post h2 { margin: 0; font: normal 1.6rem "IM Fell English SC", Georgia, serif; color: #f3e6c2; text-shadow: 0 2px 6px rgba(0,0,0,.6); }' +
        '.post-tools { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; padding: 6px; border-radius: 999px; background: #eadcb9;' +
            'box-shadow: 0 6px 14px rgba(0,0,0,.4), inset 0 0 14px rgba(120,80,30,.2); }' +
        '.post-tools button, .post-tools label { display: flex; align-items: center; gap: 6px; border: 0; background: none; color: #6e5236; cursor: pointer;' +
            'padding: 6px 12px; border-radius: 999px; font: italic 1rem "IM Fell English", Georgia, serif; }' +
        '.post-tools button:hover, .post-tools label:hover { background: rgba(110,82,54,.14); color: #3a2716; }' +
        '.post-tools [aria-pressed=true] { background: #3a2716; color: #f3e6c2; }' +
        '.post-tools .ink { width: 18px; height: 18px; padding: 0; border-radius: 50%; border: 2px solid #eadcb9; box-shadow: 0 0 0 1px rgba(0,0,0,.25); }' +
        '.post-tools .ink[aria-pressed=true] { box-shadow: 0 0 0 2px #3a2716; }' +
        '.post-tools .sep { width: 1px; align-self: stretch; background: rgba(110,82,54,.3); margin: 2px 2px; }' +
        '.post-tools .draw-only { display: none; } .post.drawing .post-tools .draw-only { display: flex; }' +
        '.post-tools input[type=file] { position: absolute; width: 1px; height: 1px; opacity: 0; }' +

        '.note { position: relative; width: min(480px, 88vw); height: min(620px, 62vh); flex: none; overflow: hidden; touch-action: none;' +
            'background: #efe3c6 radial-gradient(ellipse at 40% 30%, #f6ecd4, transparent 70%);' +
            'box-shadow: 0 16px 40px rgba(0,0,0,.55), inset 0 0 50px rgba(120,80,30,.25); }' +
        '.note::before { content: ""; position: absolute; inset: 0; pointer-events: none;' +
            'background: repeating-linear-gradient(to bottom, transparent 0 33px, rgba(110,82,54,.12) 33px 34px); background-position: 0 58px; }' +
        '.note-pic { position: absolute; left: 8%; right: 8%; top: 6%; height: 38%; display: none; }' +
        '.note-pic img { display: block; margin: 0 auto; max-width: 100%; max-height: 100%; box-shadow: 0 2px 8px rgba(60,40,20,.35); }' +
        '.note-pic button { position: absolute; right: -6px; top: -8px; width: 26px; height: 26px; border: 0; border-radius: 50%; cursor: pointer;' +
            'background: #3a2716; color: #f3e6c2; font-size: 14px; line-height: 26px; }' +
        '.note.has-pic .note-pic { display: block; }' +
        '.note-text { position: absolute; left: 8%; right: 8%; top: 6%; bottom: 13%; resize: none; border: 0; outline: none; background: transparent;' +
            'font: 20px/34px "IM Fell English", Georgia, serif; color: #3a2716; padding: 0; }' +
        '.note.has-pic .note-text { top: 47%; }' +
        '.note-text::placeholder { color: rgba(110,82,54,.55); font-style: italic; }' +
        '.note-draw { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }' +
        '.post.drawing .note-draw { pointer-events: auto; cursor: crosshair; }' +
        '.note-from { position: absolute; right: 8%; bottom: 4%; display: flex; gap: 6px; align-items: baseline; font-style: italic; color: #6e5236; }' +
        '.note-from input { width: 11em; border: 0; border-bottom: 1px dashed rgba(110,82,54,.5); background: transparent; outline: none;' +
            'font: italic 1.05rem "IM Fell English", Georgia, serif; color: #3a2716; }' +
        '.note-count { position: absolute; left: 8%; bottom: 4.4%; font-size: .8rem; font-style: italic; color: rgba(110,82,54,.7); }' +
        '.note.dragover { box-shadow: 0 16px 40px rgba(0,0,0,.55), inset 0 0 0 4px rgba(154,59,31,.5); }' +
        '.post-actions { display: flex; gap: 10px; }' +
        '.post-actions button { border: 0; cursor: pointer; padding: 10px 20px; border-radius: 999px; font: italic 1.1rem "IM Fell English", Georgia, serif; }' +
        '.post-actions .go { background: #3a2716; color: #f3e6c2; box-shadow: 0 6px 14px rgba(0,0,0,.4); }' +
        '.post-actions .go:hover { background: #9a3b1f; }' +
        '.post-actions .no { background: rgba(234,220,185,.9); color: #3a2716; }' +
        '.post-actions .go:disabled { opacity: .5; cursor: default; }' +
        '.post-hp { position: absolute; left: -9999px; }' +
        '.post.sending .post-tools, .post.sending .post-actions, .post.sending h2 { opacity: 0; pointer-events: none; transition: opacity .3s; }' +

        '.post-toast { position: fixed; left: 50%; top: 92px; z-index: 9; transform: translate(-50%, -10px); max-width: min(560px, 90vw); padding: 10px 18px;' +
            'border-radius: 12px; background: #eadcb9; color: #3a2716; font: italic 1.05rem/1.4 "IM Fell English", Georgia, serif; text-align: center;' +
            'box-shadow: 0 8px 18px rgba(0,0,0,.4); opacity: 0; pointer-events: none; transition: opacity .4s, transform .4s; }' +
        '.post-toast.show { opacity: 1; transform: translate(-50%, 0); }' +
        'body.post-open .bottle-hint { opacity: 0; transition: opacity .4s; }' +
        'body.tossing .letters, body.tossing .credit, body.tossing .bottle-hint { opacity: 0; transition: opacity .6s ease; }' +
        '.letters, .credit { transition: opacity 1.2s ease; }' +
        '.tossed-bottle { position: fixed; z-index: 9; width: 150px; pointer-events: none; filter: drop-shadow(0 6px 6px rgba(0,0,0,.4)); }' +
        '.drifting-bottle { position: absolute; width: 110px; pointer-events: none; filter: drop-shadow(0 4px 4px rgba(0,0,0,.35)); }' +
        '@media (max-width: 620px) { .note { height: 56vh; } .note-text { font-size: 18px; } .post-tools button, .post-tools label { padding: 6px 9px; } }'
    );

    /* ---------------- the button ---------------- */
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-button post-btn';
    btn.innerHTML = '<span class="ui-icon">' + Sky.bottleSVG('') + '</span><span>leave a message</span>';
    document.body.appendChild(btn);

    /* ---------------- the writing desk ---------------- */
    var post = document.createElement('div');
    post.className = 'post';
    post.setAttribute('role', 'dialog');
    post.setAttribute('aria-label', 'leave a message in a bottle');
    post.innerHTML =
        '<div class="post-desk">' +
            '<h2>a message in a bottle</h2>' +
            '<div class="post-tools">' +
                '<button type="button" class="t-write" aria-pressed="true">✎ write</button>' +
                '<button type="button" class="t-draw" aria-pressed="false">✐ draw</button>' +
                '<label class="t-pic">▣ add a picture<input type="file" accept="image/*"></label>' +
                '<span class="sep draw-only"></span>' +
                INKS.map(function (k, i) { return '<button type="button" class="ink draw-only" data-ink="' + i + '" aria-label="' + k[0] + '" title="' + k[0] + '" style="background:' + k[1] + '"></button>'; }).join('') +
                SIZES.map(function (k, i) { return '<button type="button" class="draw-only" data-size="' + i + '">' + k[0] + '</button>'; }).join('') +
                '<button type="button" class="draw-only t-undo">undo</button>' +
                '<button type="button" class="draw-only t-clear">clear</button>' +
            '</div>' +
            '<div class="note">' +
                '<div class="note-pic"><img alt="your picture"><button type="button" aria-label="remove the picture">✕</button></div>' +
                '<textarea class="note-text" maxlength="' + MAX_TEXT + '" placeholder="write your message here… or draw, or add a picture"></textarea>' +
                '<canvas class="note-draw"></canvas>' +
                '<span class="note-count"></span>' +
                '<label class="note-from">from <input type="text" maxlength="40" placeholder="your name (optional)"></label>' +
                '<input class="post-hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">' +
            '</div>' +
            '<div class="post-actions"><button type="button" class="no">never mind</button><button type="button" class="go">roll it up &amp; bottle it</button></div>' +
        '</div>';
    document.body.appendChild(post);

    var note = post.querySelector('.note'), text = post.querySelector('.note-text'), from = post.querySelector('.note-from input');
    var canvas = post.querySelector('.note-draw'), ctx = canvas.getContext('2d');
    var picBox = post.querySelector('.note-pic'), picImg = picBox.querySelector('img'), fileIn = post.querySelector('.t-pic input');
    var count = post.querySelector('.note-count'), goBtn = post.querySelector('.go'), honey = post.querySelector('.post-hp');

    var strokes = [], ink = 0, size = 0, pic = null;         // strokes: [{ ink, size, pts: [[x,y] 0..1] }]

    function setMode(drawing) {
        post.classList.toggle('drawing', drawing);
        post.querySelector('.t-write').setAttribute('aria-pressed', String(!drawing));
        post.querySelector('.t-draw').setAttribute('aria-pressed', String(drawing));
        if (!drawing) text.focus();
    }
    function setInk(i) { ink = i; post.querySelectorAll('[data-ink]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.ink === i)); }); }
    function setSize(i) { size = i; post.querySelectorAll('[data-size]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.size === i)); }); }
    setInk(0); setSize(0);

    /* ---------------- drawing ---------------- */
    function fitCanvas() {
        var r = note.getBoundingClientRect(), d = window.devicePixelRatio || 1;
        canvas.width = Math.round(r.width * d);
        canvas.height = Math.round(r.height * d);
        redraw(ctx, canvas.width, canvas.height);
    }
    function redraw(c, W, H) {
        c.clearRect(0, 0, W, H);
        strokes.forEach(function (s) { paintStroke(c, s, W, H); });
    }
    function paintStroke(c, s, W, H) {
        c.strokeStyle = INKS[s.ink][1];
        c.fillStyle = INKS[s.ink][1];
        c.lineWidth = SIZES[s.size][1] * W;
        c.lineCap = c.lineJoin = 'round';
        var p = s.pts;
        if (p.length === 1) { c.beginPath(); c.arc(p[0][0] * W, p[0][1] * H, c.lineWidth / 2, 0, 7); c.fill(); return; }
        c.beginPath();
        c.moveTo(p[0][0] * W, p[0][1] * H);
        for (var i = 1; i < p.length - 1; i++) {                     // smooth the line through midpoints
            var mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
            c.quadraticCurveTo(p[i][0] * W, p[i][1] * H, mx * W, my * H);
        }
        c.lineTo(p[p.length - 1][0] * W, p[p.length - 1][1] * H);
        c.stroke();
    }
    var cur = null;
    canvas.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        var r = note.getBoundingClientRect();
        cur = { ink: ink, size: size, pts: [[(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]] };
        strokes.push(cur);
        redraw(ctx, canvas.width, canvas.height);
        refresh();
    });
    canvas.addEventListener('pointermove', function (e) {
        if (!cur) return;
        var r = note.getBoundingClientRect();
        cur.pts.push([(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]);
        redraw(ctx, canvas.width, canvas.height);
    });
    function endStroke() { cur = null; }
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);

    post.querySelector('.t-write').addEventListener('click', function () { setMode(false); });
    post.querySelector('.t-draw').addEventListener('click', function () { setMode(true); });
    post.querySelectorAll('[data-ink]').forEach(function (b) { b.addEventListener('click', function () { setInk(+b.dataset.ink); }); });
    post.querySelectorAll('[data-size]').forEach(function (b) { b.addEventListener('click', function () { setSize(+b.dataset.size); }); });
    post.querySelector('.t-undo').addEventListener('click', function () { strokes.pop(); redraw(ctx, canvas.width, canvas.height); refresh(); });
    post.querySelector('.t-clear').addEventListener('click', function () { strokes = []; redraw(ctx, canvas.width, canvas.height); refresh(); });

    /* ---------------- a picture ---------------- */
    function takePicture(file) {
        if (!file || !/^image\//.test(file.type)) return;
        var url = URL.createObjectURL(file), im = new Image();
        im.onload = function () {
            pic = im;
            picImg.src = url;
            note.classList.add('has-pic');
            refresh();
        };
        im.src = url;
    }
    fileIn.addEventListener('change', function () { takePicture(fileIn.files[0]); fileIn.value = ''; });
    picBox.querySelector('button').addEventListener('click', function () { pic = null; picImg.removeAttribute('src'); note.classList.remove('has-pic'); refresh(); });
    note.addEventListener('dragover', function (e) { e.preventDefault(); note.classList.add('dragover'); });
    note.addEventListener('dragleave', function () { note.classList.remove('dragover'); });
    note.addEventListener('drop', function (e) {
        e.preventDefault();
        note.classList.remove('dragover');
        if (e.dataTransfer.files[0]) takePicture(e.dataTransfer.files[0]);
    });

    function refresh() {
        var left = MAX_TEXT - text.value.length;
        count.textContent = left < 120 ? left + ' letters left' : '';
        goBtn.disabled = !(text.value.trim() || strokes.length || pic);
    }
    text.addEventListener('input', refresh);

    /* ---------------- open & close ---------------- */
    var toastEl = document.createElement('div');
    toastEl.className = 'post-toast';
    toastEl.setAttribute('role', 'status');
    document.body.appendChild(toastEl);
    var toastTimer = 0;
    function toast(msg, ms) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 6000);
    }

    function lastSent() { try { return +localStorage.getItem('bottle-sent') || 0; } catch (e) { return 0; } }
    function open() {
        var wait = lastSent() + WAIT - Date.now();
        if (wait > 0) { toast('your last bottle is still bobbing out there. try again in ' + Math.ceil(wait / 60000) + ' minutes.'); return; }
        document.body.classList.add('post-open');
        post.classList.remove('sending');
        post.style.transform = '';
        requestAnimationFrame(function () { fitCanvas(); setMode(false); refresh(); });
    }
    function close() {
        document.body.classList.remove('post-open');
        btn.focus({ preventScroll: true });
    }
    function reset() {
        text.value = ''; from.value = ''; strokes = []; pic = null;
        picImg.removeAttribute('src'); note.classList.remove('has-pic');
        redraw(ctx, canvas.width, canvas.height);
        refresh();
    }
    btn.addEventListener('click', open);
    post.querySelector('.no').addEventListener('click', close);
    post.addEventListener('pointerdown', function (e) { if (e.target === post) close(); });
    document.addEventListener('keydown', function (e) {
        if (document.body.classList.contains('post-open') && e.key === 'Escape') { e.stopImmediatePropagation(); close(); }
    }, true);
    window.addEventListener('resize', function () { if (document.body.classList.contains('post-open')) fitCanvas(); });

    /* ---------------- packing the note into one picture ---------------- */
    function wrap(c, str, maxW) {
        var out = [];
        str.split('\n').forEach(function (para) {
            var words = para.split(/(\s+)/), line = '';
            words.forEach(function (w) {
                var t = line + w;
                if (c.measureText(t).width > maxW && line.trim()) { out.push(line.replace(/\s+$/, '')); line = w.replace(/^\s+/, ''); }
                else line = t;
                while (c.measureText(line).width > maxW) {            // one very long word
                    var k = line.length;
                    while (k > 1 && c.measureText(line.slice(0, k)).width > maxW) k--;
                    out.push(line.slice(0, k)); line = line.slice(k);
                }
            });
            out.push(line);
        });
        return out;
    }
    function render() {
        var r = note.getBoundingClientRect(), W = 900, H = Math.round(W * r.height / r.width), s = W / r.width;
        var c = document.createElement('canvas');
        c.width = W; c.height = H;
        var g = c.getContext('2d');
        // paper
        g.fillStyle = '#efe3c6'; g.fillRect(0, 0, W, H);
        var glow = g.createRadialGradient(W * .4, H * .3, 10, W * .4, H * .3, W * .9);
        glow.addColorStop(0, 'rgba(246,236,212,.9)'); glow.addColorStop(1, 'rgba(246,236,212,0)');
        g.fillStyle = glow; g.fillRect(0, 0, W, H);
        var edge = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
        edge.addColorStop(0, 'rgba(120,80,30,0)'); edge.addColorStop(1, 'rgba(120,80,30,.28)');
        g.fillStyle = edge; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(110,82,54,.12)';
        for (var y = 58 * s + 33 * s; y < H; y += 34 * s) g.fillRect(0, y, W, 1.3 * s);
        // picture
        if (pic) {
            var pr = picImg.getBoundingClientRect();
            g.save();
            g.shadowColor = 'rgba(60,40,20,.35)'; g.shadowBlur = 8 * s; g.shadowOffsetY = 2 * s;
            g.drawImage(pic, (pr.left - r.left) * s, (pr.top - r.top) * s, pr.width * s, pr.height * s);
            g.restore();
        }
        // words
        var tr = text.getBoundingClientRect();
        g.fillStyle = '#3a2716';
        g.font = (parseFloat(getComputedStyle(text).fontSize) * s) + 'px "IM Fell English", Georgia, serif';
        g.textBaseline = 'alphabetic';
        var lh = 34 * s, lines = wrap(g, text.value, tr.width * s);
        lines.forEach(function (ln, i) { g.fillText(ln, (tr.left - r.left) * s, (tr.top - r.top) * s + lh * (i + 1) - lh * .28); });
        // drawing
        strokes.forEach(function (st) { paintStroke(g, st, W, H); });
        // signature and date
        var who = from.value.trim(), when = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase();
        g.font = 'italic ' + (17 * s) + 'px "IM Fell English", Georgia, serif';
        g.fillStyle = '#6e5236';
        g.textAlign = 'right';
        g.fillText((who ? '— ' + who + ', ' : '') + when, W - W * .08, H - H * .045);
        return new Promise(function (res) { c.toBlob(res, 'image/jpeg', 0.86); }).then(function (blob) {
            return blob.arrayBuffer().then(function (buf) {
                return new Blob([addComment(new Uint8Array(buf), {
                    author: who,
                    text: text.value.trim(),
                    time: new Date().toISOString()
                })], { type: 'image/jpeg' });
            });
        });
    }

    // tuck the words into the jpeg's comment field (the crate reads them back for captions)
    function addComment(jpg, fields) {
        var data = new TextEncoder().encode('bottle:' + JSON.stringify(fields)).subarray(0, 65000);
        var seg = new Uint8Array(4 + data.length);
        seg[0] = 0xFF; seg[1] = 0xFE;
        seg[2] = (data.length + 2) >> 8; seg[3] = (data.length + 2) & 255;
        seg.set(data, 4);
        var out = new Uint8Array(jpg.length + seg.length);
        out.set(jpg.subarray(0, 2), 0);          // the jpeg's start marker
        out.set(seg, 2);
        out.set(jpg.subarray(2), 2 + seg.length);
        return out;
    }

    /* ---------------- posting it: to your post office (Supabase), or by FormSubmit (see sky/sky.js) ---------------- */
    function send(blob) {
        return Sky.sendPost({
            kind: 'bottle', from: from.value.trim(), message: text.value.trim(), file: blob,
            filename: new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '-bottle.jpg'
        });
    }

    /* ---------------- rolling it up, bottling it, and over the side it goes ---------------- */
    goBtn.addEventListener('click', function () {
        if (goBtn.disabled) return;
        if (honey.value) { close(); return; }                     // a bot filled the hidden field
        goBtn.disabled = true;
        post.classList.add('sending');
        document.fonts.load('20px "IM Fell English"').catch(function () {}).then(render).then(function (blob) {
            Sky.lastBottle = blob;
            var delivered = send(blob);
            delivered.then(function (how) { if (how === 'sent') try { localStorage.setItem('bottle-sent', String(Date.now())); } catch (e) {} });
            toss(delivered);
        });
    });

    function toss(delivered) {
        var nr = note.getBoundingClientRect();
        // 1. the note rolls up into a scroll
        if (Sky.sounds) Sky.sounds.sfx('paper-roll');
        var roll = note.animate([
            { transform: 'none', borderRadius: '0' },
            { transform: 'scaleY(.06)', borderRadius: '999px', offset: .7 },
            { transform: 'scale(.28, .05)', borderRadius: '999px' }
        ], { duration: 900, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
        roll.onfinish = function () {
            // 2. a bottle appears; the scroll slides into it and the cork goes in
            var b = document.createElement('div');
            b.className = 'tossed-bottle';
            b.innerHTML = Sky.bottleSVG('');
            var bw = 150, bh = bw * 90 / 200;
            b.style.left = (nr.left + nr.width / 2 - bw / 2) + 'px';
            b.style.top = (nr.top + nr.height / 2 - bh / 2) + 'px';
            document.body.appendChild(b);
            var inner = b.querySelector('.b-scroll'), cork = b.querySelector('.b-cork');
            inner.animate([{ transform: 'translateX(140px)', opacity: 0 }, { transform: 'translateX(140px)', opacity: 1, offset: .2 }, { transform: 'none', opacity: 1 }],
                { duration: 700, easing: 'ease-in-out' });
            if (Sky.sounds) Sky.sounds.sfx('cork-in', { delay: 0.7 });
            cork.animate([{ transform: 'translate(40px,-30px) rotate(-60deg)', opacity: 0 }, { transform: 'translate(40px,-30px) rotate(-60deg)', opacity: 1, offset: .6 }, { transform: 'none', opacity: 1 }],
                { duration: 1100, easing: 'ease-in' });
            b.animate([{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 300, fill: 'forwards' });
            roll.cancel();
            note.style.visibility = 'hidden';
            setTimeout(function () { throwIt(b, delivered); }, 1250);
        };
    }
    function throwIt(b, delivered) {
        close();
        document.body.classList.add('tossing');                  // the paper steps aside so you can watch it go
        setTimeout(function () { note.style.visibility = ''; reset(); goBtn.disabled = false; post.classList.remove('sending'); }, 500);
        var br = b.getBoundingClientRect(), sea = Sky.sea.el.getBoundingClientRect();
        var land = { x: window.innerWidth * (0.42 + Math.random() * 0.16), y: sea.top + sea.height * 0.5 };
        var dx = land.x - (br.left + br.width / 2), dy = land.y - (br.top + br.height / 2);
        // 3. over the side: a high arc, spinning, out to sea
        if (Sky.sounds) Sky.sounds.sfx('throw');
        b.animate([
            { transform: 'translate(0,0) rotate(0deg) scale(1)' },
            { transform: 'translate(' + dx * .3 + 'px,' + (dy * .3 - 260) + 'px) rotate(-200deg) scale(.85)', offset: .35 },
            { transform: 'translate(' + dx * .7 + 'px,' + (dy * .7 - 150) + 'px) rotate(-420deg) scale(.7)', offset: .7 },
            { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(-540deg) scale(.62)' }
        ], { duration: 1500, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'forwards' }).onfinish = function () {
            b.remove();
            // 4. splash, then it bobs away over the waves
            var d = document.createElement('div');
            d.className = 'drifting-bottle';
            d.innerHTML = Sky.bottleSVG('');
            Sky.sea.el.insertBefore(d, Sky.sea.front);
            var sx = land.x - sea.left - 55, sb = sea.height * 0.34;
            d.style.left = sx + 'px';
            d.style.bottom = sb + 'px';
            Sky.sea.splash(d, 0.12);                               // a bottle: a small, bright splash
            var goRight = land.x < window.innerWidth / 2 ? -1 : 1, t0 = performance.now();
            (function bob(now) {
                var t = (now - t0) / 1000;
                d.style.transform = 'translate(' + (goRight * t * 42) + 'px,' + (Math.sin(t * 2.4) * 6 + t * 3) + 'px) rotate(' + (-10 + Math.sin(t * 2.1) * 9) + 'deg)';
                d.style.opacity = String(Math.max(0, 1 - Math.max(0, t - 5) / 2.5));
                if (t < 7.5) requestAnimationFrame(bob); else { d.remove(); document.body.classList.remove('tossing'); }
            })(t0);
            Promise.resolve(delivered).then(function (how) {
                toast(how === 'sent' ? 'your bottle is out to sea. if it washes up, you\'ll find it in the living space.'
                    : how === 'failed' ? 'your bottle drifts off… but it couldn\'t reach anyone just now. try again a little later?'
                    : 'your bottle drifts out to sea… (the post office here isn\'t open yet, so it won\'t reach anyone)', 7000);
            });
        };
    }
})();

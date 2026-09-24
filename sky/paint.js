/* =====================================================================
   paint.js — a little painting app on paper: layers, a soft or hard brush,
   eraser, fill, colour picker, size / opacity / softness sliders, and
   undo / redo. Used by the workshop's "paint here" easel (sky/studio.js).

       var p = Sky.paint(hostElement, { width: 800, height: 1000, paper: '#f6ecd4' });
       p.isEmpty()   p.toBlob(limit) → Promise<Blob>   p.reset()   p.fit()
       p.active = true / false   (shortcut keys only work while it's showing)

   shortcuts:  B brush · E eraser · G fill · I colour picker (or hold Alt)
               [ ] brush size · 1 … 9, 0 opacity · N new layer
               Ctrl+Z undo · Ctrl+Shift+Z or Ctrl+Y redo
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky) return;

    var SWATCHES = ['#1c140e', '#3a2716', '#6e5236', '#a8845a', '#9a3b1f', '#d8744a', '#e8b33c', '#f2dd8c',
                    '#6f8f4e', '#2f5d3a', '#36526a', '#6fa3c7', '#8a5a8c', '#c9829b', '#f6ecd4', '#ffffff'];
    var MAX_LAYERS = 8, MAX_HISTORY = 60;
    var ICON = {
        brush: '<path d="M16 2.5 L18.5 5 L9.5 14 L7 11.5 Z M7 11.5 L9.5 14 C8 17 5 18.5 2 18.5 C2 15.5 3.8 12.8 7 11.5 Z"/>',
        eraser: '<path d="M11.5 3 L18 9.5 L10 17.5 H5.5 L2.5 14.5 Z M5.5 17.5 H18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 9.5 L12 14.5" stroke="currentColor" stroke-width="1.6"/>',
        fill: '<path d="M4 9 L10 3 L17 10 L11 16 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 9 H17" stroke="currentColor" stroke-width="1.6"/><path d="M17.5 12.5 C17.5 12.5 15.5 15 15.5 16.3 A2 2 0 0 0 19.5 16.3 C19.5 15 17.5 12.5 17.5 12.5 Z"/>',
        picker: '<path d="M14.5 2.5 A2.4 2.4 0 0 1 18 6 L15.5 8.5 L16.5 9.5 L15 11 L9 5 L10.5 3.5 L11.5 4.5 Z"/><path d="M10 7 L3.5 13.5 L3 17 L6.5 16.5 L13 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
        undo: '<path d="M7 5 L3 9 L7 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 9 H12 A5 5 0 0 1 12 19 H8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
        redo: '<path d="M13 5 L17 9 L13 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 9 H8 A5 5 0 0 0 8 19 H12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
        clear: '<path d="M5 6 H15 L14 18 H6 Z M3 6 H17 M8 6 V3.5 H12 V6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
        eye: '<path d="M1.5 10 C4 5.5 7 4 10 4 C13 4 16 5.5 18.5 10 C16 14.5 13 16 10 16 C7 16 4 14.5 1.5 10 Z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="2.6"/>',
        eyeoff: '<path d="M1.5 10 C4 5.5 7 4 10 4 C13 4 16 5.5 18.5 10 C16 14.5 13 16 10 16 C7 16 4 14.5 1.5 10 Z" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".35"/><path d="M3 17 L17 3" stroke="currentColor" stroke-width="1.6"/>'
    };
    function svg(n, s) { return '<svg viewBox="0 0 20 20" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="currentColor" aria-hidden="true">' + ICON[n] + '</svg>'; }

    Sky.css(
        '.pt { display: grid; grid-template-columns: auto auto 250px; gap: 12px; align-items: start; font: 1rem "IM Fell English", Georgia, serif; color: #3a2716; }' +
        '.pt button { font: inherit; color: inherit; }' +
        '.pt-tools { display: flex; flex-direction: column; gap: 4px; padding: 6px; border-radius: 14px; background: #eadcb9; box-shadow: 0 6px 14px rgba(0,0,0,.4), inset 0 0 14px rgba(120,80,30,.2); }' +
        '.pt-tools button { display: grid; place-items: center; width: 40px; height: 40px; border: 0; border-radius: 10px; background: none; cursor: pointer; color: #6e5236; }' +
        '.pt-tools button:hover { background: rgba(110,82,54,.14); color: #3a2716; }' +
        '.pt-tools button[aria-pressed=true] { background: #3a2716; color: #f3e6c2; }' +
        '.pt-tools button:disabled { opacity: .35; cursor: default; }' +
        '.pt-tools .sep { height: 1px; margin: 3px 4px; background: rgba(110,82,54,.3); }' +
        '.pt-stage { position: relative; height: min(66vh, 112vw); aspect-ratio: var(--pt-ar, 4 / 5); touch-action: none;' +
            'box-shadow: 0 16px 40px rgba(0,0,0,.55); background: #f6ecd4; }' +
        '.pt-stage canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: none; }' +
        '.pt-ring { position: absolute; left: 0; top: 0; border-radius: 50%; pointer-events: none; display: none; border: 1px solid rgba(0,0,0,.65);' +
            'box-shadow: 0 0 0 1px rgba(255,255,255,.75); transform: translate(-50%, -50%); }' +
        '.pt-ring.dot::after { content: ""; position: absolute; left: 50%; top: 50%; width: 2px; height: 2px; margin: -1px; background: #000; }' +
        '.pt-stage:hover .pt-ring { display: block; }' +
        '.pt-side { display: flex; flex-direction: column; gap: 10px; max-height: min(66vh, 112vw); overflow-y: auto; padding: 10px 12px; border-radius: 14px;' +
            'background: #eadcb9; box-shadow: 0 6px 14px rgba(0,0,0,.4), inset 0 0 14px rgba(120,80,30,.2); }' +
        '.pt-side h3 { margin: 2px 0 0; font: normal .95rem "IM Fell English SC", Georgia, serif; color: #6e5236; }' +
        '.pt-colour { display: flex; align-items: center; gap: 8px; }' +
        '.pt-now { position: relative; width: 38px; height: 38px; border-radius: 50%; box-shadow: 0 0 0 2px #eadcb9, 0 0 0 3px rgba(0,0,0,.35); overflow: hidden; flex: none; }' +
        '.pt-now input { position: absolute; inset: -10px; width: 60px; height: 60px; opacity: 0; cursor: pointer; }' +
        '.pt-hex { font-size: .85rem; color: #6e5236; font-family: ui-monospace, Menlo, monospace; }' +
        '.pt-sw { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; }' +
        '.pt-sw button { aspect-ratio: 1; border: 0; border-radius: 50%; cursor: pointer; box-shadow: 0 0 0 1px rgba(0,0,0,.25); padding: 0; }' +
        '.pt-sw button:hover { transform: scale(1.12); }' +
        '.pt-recent:empty::before { content: "colours you use appear here"; font-size: .8rem; font-style: italic; color: rgba(110,82,54,.7); grid-column: 1 / -1; }' +
        '.pt-slider { display: grid; grid-template-columns: 70px 1fr 38px; align-items: center; gap: 6px; font-size: .9rem; color: #6e5236; }' +
        '.pt-slider input { width: 100%; accent-color: #9a3b1f; }' +
        '.pt-slider output { text-align: right; font-size: .82rem; }' +
        '.pt-layers { display: flex; flex-direction: column; gap: 4px; }' +
        '.pt-layer { display: grid; grid-template-columns: 26px 34px 1fr; align-items: center; gap: 6px; padding: 4px; border-radius: 8px; cursor: pointer; background: rgba(255,250,235,.5); }' +
        '.pt-layer.on { background: #3a2716; color: #f3e6c2; }' +
        '.pt-layer .eye { display: grid; place-items: center; width: 26px; height: 26px; border: 0; background: none; cursor: pointer; border-radius: 6px; }' +
        '.pt-layer .eye:hover { background: rgba(110,82,54,.2); }' +
        '.pt-layer canvas { width: 34px; height: 42px; background: #f6ecd4; box-shadow: 0 0 0 1px rgba(0,0,0,.2); display: block; }' +
        '.pt-layer .nm { font-size: .9rem; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
        '.pt-lbtns { display: flex; flex-wrap: wrap; gap: 4px; }' +
        '.pt-lbtns button { flex: 1 1 auto; white-space: nowrap; padding: 4px 6px; border: 1px solid rgba(110,82,54,.35); border-radius: 999px; background: #f8f0dc; cursor: pointer; font-size: .85rem; font-style: italic; }' +
        '.pt-lbtns button:hover { background: #fff8e6; }' +
        '.pt-lbtns button:disabled { opacity: .4; cursor: default; }' +
        '.pt-help { font-size: .8rem; color: #6e5236; }' +
        '.pt-help summary { cursor: pointer; font-style: italic; }' +
        '.pt-help kbd { display: inline-block; min-width: 1.4em; padding: 0 4px; border-radius: 4px; background: rgba(110,82,54,.14); font: .78rem ui-monospace, Menlo, monospace; text-align: center; }' +
        '@media (max-width: 900px) {' +
            '.pt { grid-template-columns: 1fr; justify-items: center; }' +
            '.pt-tools { flex-direction: row; flex-wrap: wrap; justify-content: center; }' +
            '.pt-tools .sep { width: 1px; height: auto; margin: 4px 3px; }' +
            '.pt-stage { height: auto; width: min(92vw, 60vh * .8); }' +
            '.pt-side { width: min(92vw, 520px); max-height: none; }' +
        '}'
    );

    Sky.paint = function (host, opts) {
        opts = opts || {};
        var W = opts.width || 800, H = opts.height || 1000, PAPER = opts.paper || '#f6ecd4';
        host.innerHTML =
            '<div class="pt">' +
                '<div class="pt-tools" role="toolbar" aria-label="painting tools">' +
                    '<button type="button" data-tool="brush" title="brush (B)">' + svg('brush') + '</button>' +
                    '<button type="button" data-tool="eraser" title="eraser (E)">' + svg('eraser') + '</button>' +
                    '<button type="button" data-tool="fill" title="fill (G)">' + svg('fill') + '</button>' +
                    '<button type="button" data-tool="picker" title="pick a colour from the painting (I, or hold Alt)">' + svg('picker') + '</button>' +
                    '<span class="sep"></span>' +
                    '<button type="button" class="undo" title="undo (Ctrl+Z)">' + svg('undo') + '</button>' +
                    '<button type="button" class="redo" title="redo (Ctrl+Shift+Z)">' + svg('redo') + '</button>' +
                    '<button type="button" class="wipe" title="clear this layer">' + svg('clear') + '</button>' +
                '</div>' +
                '<div class="pt-stage" style="--pt-ar:' + W + ' / ' + H + '"><canvas width="' + W + '" height="' + H + '"></canvas><div class="pt-ring"></div></div>' +
                '<div class="pt-side">' +
                    '<div class="pt-colour"><label class="pt-now" title="any colour"><input type="color" aria-label="pick any colour"></label><span class="pt-hex"></span></div>' +
                    '<div class="pt-sw pt-swatches">' + SWATCHES.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" title="' + c + '"></button>'; }).join('') + '</div>' +
                    '<div class="pt-sw pt-recent"></div>' +
                    '<label class="pt-slider">size <input type="range" class="s-size" min="1" max="160" step="1"><output></output></label>' +
                    '<label class="pt-slider">opacity <input type="range" class="s-opacity" min="1" max="100" step="1"><output></output></label>' +
                    '<label class="pt-slider">softness <input type="range" class="s-soft" min="0" max="100" step="1"><output></output></label>' +
                    '<h3>layers</h3>' +
                    '<div class="pt-layers"></div>' +
                    '<label class="pt-slider">layer <input type="range" class="s-lopacity" min="0" max="100" step="1"><output></output></label>' +
                    '<div class="pt-lbtns"><button type="button" class="l-add">+ new</button><button type="button" class="l-dup">copy</button>' +
                        '<button type="button" class="l-up" title="move up">▲</button><button type="button" class="l-down" title="move down">▼</button>' +
                        '<button type="button" class="l-del">delete</button><label class="l-pic" style="flex:1 1 100%"><button type="button" style="width:100%">+ a picture as a layer…</button><input type="file" accept="image/*" hidden></label></div>' +
                    '<details class="pt-help"><summary>shortcut keys</summary>' +
                        '<p><kbd>B</kbd> brush · <kbd>E</kbd> eraser · <kbd>G</kbd> fill · <kbd>I</kbd> or hold <kbd>Alt</kbd> pick a colour<br>' +
                        '<kbd>[</kbd> <kbd>]</kbd> brush size · <kbd>1</kbd>…<kbd>0</kbd> opacity · <kbd>N</kbd> new layer<br>' +
                        '<kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> (or <kbd>Ctrl</kbd>+<kbd>Y</kbd>) redo</p></details>' +
                '</div>' +
            '</div>';
        var $ = function (s) { return host.querySelector(s); };
        var stage = $('.pt-stage'), view = stage.querySelector('canvas'), vg = view.getContext('2d'), ring = $('.pt-ring');
        function makeCanvas() { var c = document.createElement('canvas'); c.width = W; c.height = H; return c; }
        var stroke = makeCanvas(), sg = stroke.getContext('2d');
        var scratch = makeCanvas(), xg = scratch.getContext('2d', { willReadFrequently: true });

        var state = { tool: 'brush', colour: '#3a2716', size: 14, opacity: 100, soft: 0 };
        try { var sv = JSON.parse(localStorage.getItem('paint-settings')); if (sv) ['colour', 'size', 'opacity', 'soft'].forEach(function (k) { if (sv[k] !== undefined) state[k] = sv[k]; }); } catch (e) {}
        function keep() { try { localStorage.setItem('paint-settings', JSON.stringify({ colour: state.colour, size: state.size, opacity: state.opacity, soft: state.soft })); } catch (e) {} }
        var recent = [];
        var layers = [], cur = 0, nextId = 1, dirty = false, onChange = opts.onChange || function () {};

        /* ---------------- layers ---------------- */
        function newLayer(name, canvas) {
            var c = canvas || makeCanvas();
            return { id: nextId++, name: name || 'layer ' + (nextId - 1), canvas: c, ctx: c.getContext('2d', { willReadFrequently: true }), visible: true, opacity: 1 };
        }
        function render(withStroke) {
            vg.globalAlpha = 1; vg.globalCompositeOperation = 'source-over'; vg.filter = 'none';
            vg.fillStyle = PAPER; vg.fillRect(0, 0, W, H);
            layers.forEach(function (L, i) {
                if (!L.visible) return;
                if (withStroke && i === cur) {
                    if (state.tool === 'eraser') {                   // show the eraser eating into this layer
                        xg.globalCompositeOperation = 'source-over'; xg.globalAlpha = 1; xg.filter = 'none';
                        xg.clearRect(0, 0, W, H); xg.drawImage(L.canvas, 0, 0);
                        xg.globalCompositeOperation = 'destination-out'; xg.globalAlpha = state.opacity / 100; xg.filter = blurFor();
                        xg.drawImage(stroke, 0, 0);
                        xg.globalCompositeOperation = 'source-over'; xg.globalAlpha = 1; xg.filter = 'none';
                        vg.globalAlpha = L.opacity; vg.drawImage(scratch, 0, 0);
                    } else {
                        vg.globalAlpha = L.opacity; vg.drawImage(L.canvas, 0, 0);
                        vg.globalAlpha = L.opacity * state.opacity / 100; vg.filter = blurFor(); vg.drawImage(stroke, 0, 0); vg.filter = 'none';
                    }
                } else { vg.globalAlpha = L.opacity; vg.drawImage(L.canvas, 0, 0); }
            });
            vg.globalAlpha = 1;
        }
        function blurFor() { return state.soft > 0 ? 'blur(' + (state.soft / 100 * state.size * 0.35).toFixed(1) + 'px)' : 'none'; }

        var layersEl = $('.pt-layers');
        function drawLayers() {
            layersEl.innerHTML = '';
            for (var i = layers.length - 1; i >= 0; i--) (function (L, i) {
                var row = document.createElement('div');
                row.className = 'pt-layer' + (i === cur ? ' on' : '');
                row.innerHTML = '<button type="button" class="eye" title="show / hide">' + svg(L.visible ? 'eye' : 'eyeoff', 16) + '</button><canvas width="68" height="84"></canvas><span class="nm"></span>';
                row.querySelector('.nm').textContent = L.name;
                row.querySelector('canvas').getContext('2d').drawImage(L.canvas, 0, 0, 68, 84);
                row.addEventListener('click', function (e) {
                    if (e.target.closest('.eye')) { toggleVisible(L); return; }
                    cur = i; drawLayers();
                });
                row.addEventListener('dblclick', function (e) {
                    if (e.target.closest('.eye')) return;
                    var nm = prompt('a name for this layer:', L.name);
                    if (nm && nm.trim()) { L.name = nm.trim().slice(0, 30); drawLayers(); }
                });
                L.thumb = row.querySelector('canvas');
                layersEl.appendChild(row);
            })(layers[i], i);
            var lo = $('.s-lopacity');
            lo.value = Math.round(layers[cur].opacity * 100);
            lo.nextElementSibling.textContent = lo.value + '%';
            $('.l-add').disabled = $('.l-dup').disabled = $('.l-pic button').disabled = layers.length >= MAX_LAYERS;
            $('.l-del').disabled = layers.length <= 1;
            $('.l-up').disabled = cur >= layers.length - 1;
            $('.l-down').disabled = cur <= 0;
        }
        function thumb(L) { if (L.thumb) { var t = L.thumb.getContext('2d'); t.clearRect(0, 0, 68, 84); t.drawImage(L.canvas, 0, 0, 68, 84); } }

        /* ---------------- history: undo / redo ---------------- */
        var past = [], future = [];
        function push(entry) { past.push(entry); if (past.length > MAX_HISTORY) past.shift(); future = []; buttons(); }
        function undo() { var e = past.pop(); if (!e) return; e.undo(); future.push(e); after(); }
        function redo() { var e = future.pop(); if (!e) return; e.redo(); past.push(e); after(); }
        function after() { render(); drawLayers(); buttons(); dirty = layers.some(hasInk); onChange(); }
        function buttons() { $('.undo').disabled = !past.length; $('.redo').disabled = !future.length; }
        function paintEntry(L, box, before) {                     // a change to one layer, remembered as just the part that changed
            var afterData = L.ctx.getImageData(box.x, box.y, box.w, box.h);
            return {
                undo: function () { L.ctx.putImageData(before, box.x, box.y); thumb(L); },
                redo: function () { L.ctx.putImageData(afterData, box.x, box.y); thumb(L); }
            };
        }
        function hasInk(L) {
            var d = L.ctx.getImageData(0, 0, W, H).data;
            for (var i = 3; i < d.length; i += 64) if (d[i]) return true;
            return false;
        }

        /* ---------------- the brush ---------------- */
        function at(e) {
            var r = view.getBoundingClientRect();
            return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height, p: e.pointerType === 'pen' ? Math.max(0.1, e.pressure || 0.5) : 1 };
        }
        var drawing = null;
        function grow(b, x, y, pad) { b.x0 = Math.min(b.x0, x - pad); b.y0 = Math.min(b.y0, y - pad); b.x1 = Math.max(b.x1, x + pad); b.y1 = Math.max(b.y1, y + pad); }
        function boxOf(b) {
            var x = Math.max(0, Math.floor(b.x0)), y = Math.max(0, Math.floor(b.y0));
            return { x: x, y: y, w: Math.max(1, Math.min(W, Math.ceil(b.x1)) - x), h: Math.max(1, Math.min(H, Math.ceil(b.y1)) - y) };
        }
        function dab(a, b) {
            sg.strokeStyle = sg.fillStyle = state.colour;
            sg.lineCap = sg.lineJoin = 'round';
            var w = state.size * (a.p + b.p) / 2;
            if (a === b) { sg.beginPath(); sg.arc(a.x, a.y, w / 2, 0, 7); sg.fill(); return; }
            sg.lineWidth = w;
            sg.beginPath(); sg.moveTo(a.x, a.y); sg.lineTo(b.x, b.y); sg.stroke();
        }
        view.addEventListener('pointerdown', function (e) {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            e.preventDefault();
            var p = at(e), tool = e.altKey ? 'picker' : state.tool, L = layers[cur];
            if (tool === 'picker') { pick(p); return; }
            if (!L.visible) { flash('that layer is hidden: show it (the eye) to paint on it'); return; }
            if (tool === 'fill') { fill(p); return; }
            view.setPointerCapture(e.pointerId);
            sg.clearRect(0, 0, W, H);
            var pad = state.size / 2 + state.soft / 100 * state.size * 0.35 * 3 + 2;
            drawing = { last: p, box: { x0: p.x, y0: p.y, x1: p.x, y1: p.y }, pad: pad };
            grow(drawing.box, p.x, p.y, pad);
            dab(p, p);
            render(true);
            if (state.tool === 'brush') use(state.colour);
        });
        view.addEventListener('pointermove', function (e) {
            moveRing(e);
            if (!drawing) return;
            (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(function (ev) {
                var p = at(ev);
                dab(drawing.last, p);
                grow(drawing.box, p.x, p.y, drawing.pad);
                drawing.last = p;
            });
            render(true);
        });
        function endStroke() {
            if (!drawing) return;
            var L = layers[cur], box = boxOf(drawing.box), before = L.ctx.getImageData(box.x, box.y, box.w, box.h);
            L.ctx.save();
            L.ctx.globalAlpha = state.opacity / 100;
            L.ctx.globalCompositeOperation = state.tool === 'eraser' ? 'destination-out' : 'source-over';
            L.ctx.filter = blurFor();
            L.ctx.drawImage(stroke, 0, 0);
            L.ctx.restore();
            push(paintEntry(L, box, before));
            drawing = null;
            sg.clearRect(0, 0, W, H);
            dirty = true;
            render(); thumb(L); onChange();
        }
        view.addEventListener('pointerup', endStroke);
        view.addEventListener('pointercancel', endStroke);
        view.addEventListener('pointerleave', function () { if (!drawing) ring.style.display = ''; });

        /* ---------------- the colour picker and the paint bucket ---------------- */
        function composite() {                                        // everything you can see, paper and all
            render(); return vg.getImageData(0, 0, W, H);
        }
        function hex(r, g, b) { return '#' + [r, g, b].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }
        function pick(p) {
            var d = composite().data, i = (Math.floor(p.y) * W + Math.floor(p.x)) * 4;
            setColour(hex(d[i], d[i + 1], d[i + 2]));
        }
        function fill(p) {
            var x0 = Math.floor(p.x), y0 = Math.floor(p.y);
            if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return;
            var img = composite(), d = img.data, k0 = (y0 * W + x0) * 4;
            var tr = d[k0], tg = d[k0 + 1], tb = d[k0 + 2], TOL = 60;
            var mask = new Uint8Array(W * H), stack = [x0, y0];
            function same(k) { var j = k * 4; return !mask[k] && Math.abs(d[j] - tr) + Math.abs(d[j + 1] - tg) + Math.abs(d[j + 2] - tb) <= TOL; }
            while (stack.length) {                                     // scanline flood over what you can see
                var py = stack.pop(), px = stack.pop(), k = py * W + px;
                while (px > 0 && same(k - 1)) { px--; k--; }
                var up = false, dn = false;
                for (; px < W && same(k); px++, k++) {
                    mask[k] = 1;
                    if (py > 0) { if (same(k - W)) { if (!up) { stack.push(px, py - 1); up = true; } } else up = false; }
                    if (py < H - 1) { if (same(k + W)) { if (!dn) { stack.push(px, py + 1); dn = true; } } else dn = false; }
                }
            }
            var L = layers[cur], before = L.ctx.getImageData(0, 0, W, H), out = L.ctx.getImageData(0, 0, W, H), o = out.data;
            var c = [parseInt(state.colour.slice(1, 3), 16), parseInt(state.colour.slice(3, 5), 16), parseInt(state.colour.slice(5, 7), 16)], a = state.opacity / 100;
            for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
                var m = y * W + x;                                     // the area, grown by a pixel to tuck under soft edges
                if (!(mask[m] || (x > 0 && mask[m - 1]) || (x < W - 1 && mask[m + 1]) || (y > 0 && mask[m - W]) || (y < H - 1 && mask[m + W]))) continue;
                var j = m * 4, da = o[j + 3] / 255, na = a + da * (1 - a);
                o[j] = Math.round((c[0] * a + o[j] * da * (1 - a)) / na);
                o[j + 1] = Math.round((c[1] * a + o[j + 1] * da * (1 - a)) / na);
                o[j + 2] = Math.round((c[2] * a + o[j + 2] * da * (1 - a)) / na);
                o[j + 3] = Math.round(na * 255);
            }
            L.ctx.putImageData(out, 0, 0);
            push(paintEntry(L, { x: 0, y: 0, w: W, h: H }, before));
            dirty = true; use(state.colour);
            render(); thumb(L); onChange();
            if (Sky.sounds) Sky.sounds.sfx('brush');
        }

        /* ---------------- the controls ---------------- */
        function setTool(t) {
            state.tool = t;
            host.querySelectorAll('[data-tool]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tool === t)); });
            ringLook();
        }
        function setColour(c) {
            state.colour = c;
            $('.pt-now').style.background = c;
            $('.pt-now input').value = c;
            $('.pt-hex').textContent = c;
            if (state.tool === 'eraser' || state.tool === 'picker') setTool('brush');
            keep();
        }
        function use(c) {
            recent = [c].concat(recent.filter(function (x) { return x !== c; })).slice(0, 8);
            $('.pt-recent').innerHTML = recent.map(function (x) { return '<button type="button" data-c="' + x + '" style="background:' + x + '" title="' + x + '"></button>'; }).join('');
        }
        function slider(cls, key, fmt) {
            var s = $(cls), out = s.nextElementSibling;
            s.value = state[key];
            out.textContent = fmt(state[key]);
            s.addEventListener('input', function () { state[key] = +s.value; out.textContent = fmt(state[key]); ringLook(); keep(); });
            return function (v) { state[key] = Math.max(+s.min, Math.min(+s.max, v)); s.value = state[key]; out.textContent = fmt(state[key]); ringLook(); keep(); };
        }
        var setSize = slider('.s-size', 'size', function (v) { return v + 'px'; });
        var setOpacity = slider('.s-opacity', 'opacity', function (v) { return v + '%'; });
        slider('.s-soft', 'soft', function (v) { return v + '%'; });
        $('.s-lopacity').addEventListener('input', function () {
            var L = layers[cur], before = L.opacity, v = +this.value / 100;
            L.opacity = v; this.nextElementSibling.textContent = this.value + '%'; render();
            clearTimeout(this._t);
            var self = this;
            this._t = setTimeout(function () { push({ undo: function () { L.opacity = before; }, redo: function () { L.opacity = v; } }); self._t = 0; }, 400);
        });
        host.querySelectorAll('[data-tool]').forEach(function (b) { b.addEventListener('click', function () { setTool(b.dataset.tool); }); });
        host.addEventListener('click', function (e) { var c = e.target.closest('.pt-sw button[data-c]'); if (c) setColour(c.dataset.c); });
        $('.pt-now input').addEventListener('input', function () { setColour(this.value); });
        $('.undo').addEventListener('click', undo);
        $('.redo').addEventListener('click', redo);
        $('.wipe').addEventListener('click', function () {
            var L = layers[cur], before = L.ctx.getImageData(0, 0, W, H);
            L.ctx.clearRect(0, 0, W, H);
            push(paintEntry(L, { x: 0, y: 0, w: W, h: H }, before));
            after();
        });
        function toggleVisible(L) {
            L.visible = !L.visible;
            push({ undo: function () { L.visible = !L.visible; }, redo: function () { L.visible = !L.visible; } });
            after();
        }
        function addLayer(L, at) {
            if (layers.length >= MAX_LAYERS) { flash('that’s the most layers (' + MAX_LAYERS + ')'); return; }
            var i = at === undefined ? cur + 1 : at;
            layers.splice(i, 0, L); cur = i;
            push({ undo: function () { layers.splice(layers.indexOf(L), 1); cur = Math.min(cur, layers.length - 1); },
                   redo: function () { layers.splice(i, 0, L); cur = i; } });
            after();
        }
        $('.l-add').addEventListener('click', function () { addLayer(newLayer()); });
        $('.l-dup').addEventListener('click', function () {
            var src = layers[cur], L = newLayer(src.name + ' copy');
            L.ctx.drawImage(src.canvas, 0, 0); L.opacity = src.opacity;
            addLayer(L);
        });
        $('.l-del').addEventListener('click', function () {
            if (layers.length <= 1) return;
            var i = cur, L = layers[i];
            layers.splice(i, 1); cur = Math.max(0, i - 1);
            push({ undo: function () { layers.splice(i, 0, L); cur = i; }, redo: function () { layers.splice(layers.indexOf(L), 1); cur = Math.max(0, i - 1); } });
            after();
        });
        function move(dir) {
            var i = cur, j = i + dir;
            if (j < 0 || j >= layers.length) return;
            function swap() { var t = layers[i]; layers[i] = layers[j]; layers[j] = t; }
            swap(); cur = j;
            push({ undo: function () { swap(); cur = i; }, redo: function () { swap(); cur = j; } });
            after();
        }
        $('.l-up').addEventListener('click', function () { move(1); });
        $('.l-down').addEventListener('click', function () { move(-1); });
        var picIn = $('.l-pic input');
        $('.l-pic button').addEventListener('click', function () { picIn.click(); });
        picIn.addEventListener('change', function () {
            var f = picIn.files[0]; picIn.value = '';
            if (!f || !/^image\//.test(f.type)) return;
            var url = URL.createObjectURL(f), im = new Image();
            im.onload = function () {
                var L = newLayer(f.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'picture'), k = Math.min(W / im.width, H / im.height);
                L.ctx.drawImage(im, (W - im.width * k) / 2, (H - im.height * k) / 2, im.width * k, im.height * k);
                URL.revokeObjectURL(url);
                dirty = true;
                addLayer(L);
            };
            im.src = url;
        });

        /* ---------------- the brush-sized ring that follows the pointer ---------------- */
        function scale() { return view.getBoundingClientRect().width / W; }
        function ringLook() {
            var d = state.tool === 'fill' || state.tool === 'picker' ? 14 : Math.max(4, state.size * scale());
            ring.style.width = ring.style.height = d + 'px';
            ring.classList.toggle('dot', state.tool === 'fill' || state.tool === 'picker' || d < 8);
            ring.style.borderRadius = state.tool === 'picker' ? '2px' : '50%';
        }
        function moveRing(e) {
            var r = stage.getBoundingClientRect();
            ring.style.left = (e.clientX - r.left) + 'px'; ring.style.top = (e.clientY - r.top) + 'px'; ring.style.display = 'block';
        }
        window.addEventListener('resize', ringLook);

        /* ---------------- shortcut keys (only while the painting desk is showing) ---------------- */
        document.addEventListener('keydown', function (e) {
            if (!api.active) return;
            if (e.target.closest && e.target.closest('input[type=text], input[type=url], textarea')) return;
            var k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
            if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
            if (mod && k === 'y') { e.preventDefault(); redo(); return; }
            if (mod || e.altKey) return;
            if (k === 'b') setTool('brush');
            else if (k === 'e') setTool('eraser');
            else if (k === 'g') setTool('fill');
            else if (k === 'i') setTool('picker');
            else if (k === '[') setSize(Math.round(state.size * 0.85) - (state.size < 8 ? 1 : 0));
            else if (k === ']') setSize(Math.round(state.size * 1.18) + (state.size < 8 ? 1 : 0));
            else if (k === 'n') { if (layers.length < MAX_LAYERS) addLayer(newLayer()); }
            else if (/^[0-9]$/.test(k)) setOpacity(k === '0' ? 100 : +k * 10);
            else return;
            e.preventDefault();
        });

        var toastT = 0;
        function flash(t) { if (opts.say) { opts.say(t); clearTimeout(toastT); toastT = setTimeout(function () { opts.say(''); }, 3000); } }

        /* ---------------- start, reset, export ---------------- */
        function reset() {
            layers = [newLayer('layer 1')]; nextId = 2; cur = 0; past = []; future = []; dirty = false;
            render(); drawLayers(); buttons(); onChange();
        }
        setTool('brush'); setColour(state.colour); reset();
        var api = {
            active: false,
            isEmpty: function () { return !dirty; },
            reset: reset,
            fit: function () { ringLook(); render(); },
            // the finished painting, flattened onto the paper: a png, or a jpg if a png won't fit under the limit
            toBlob: function (limit) {
                render();
                function blob(type, q) { return new Promise(function (res) { view.toBlob(res, type, q); }); }
                return blob('image/png').then(function (b) {
                    if (b && (!limit || b.size <= limit)) return b;
                    return blob('image/jpeg', 0.92).then(function (j) { return j && j.size <= limit ? j : blob('image/jpeg', 0.8); });
                });
            },
            toDataURL: function () { render(); return view.toDataURL('image/png'); }
        };
        return api;
    };
})();

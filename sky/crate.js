/* =====================================================================
   crate.js — the living space's crate of bottles, the pinboard, and the
   pile of letters on the shelf beneath it.

   THE CRATE holds the bottles you've approved (files in content/living/bottles/)
   that you haven't read yet. Anyone can take one out, pull the cork and read
   it; visitors then put it back.

   YOU decide what happens next. Open the living space with ?owner on the end
   (…/living.html?owner) and you're in OWNER MODE: after reading a bottle you
   can pin it to the board, put it on the pile, or put it back. Unpin from the
   board onto the pile, pin from the pile, and so on. Then press "publish":
   that writes content/living/bottles/board.json, which is what every visitor
   sees. (…/living.html?owner=off leaves owner mode on that browser.)

   board.json can also be written by hand:
       { "pinned": ["2026-09-23-a-bottle.jpg"], "pile": ["2026-09-20-another.txt"] }
   pinned = on the board, in that order. pile = on the shelf, top of the pile first.
   anything in the folder but in neither list is still in the crate.

       <div class="furnish pinboard"></div>
       <div class="furnish letter-pile" data-asset="assets/living/letter-shelf"></div>
       <div class="furnish bottle-crate" data-folder="content/living/bottles/"></div>
       <script src="sky/crate.js"></script>          (after sky/sky.js)

   files: the .jpg notes that arrive in your inbox (their words, name and date
   are read from inside the file), or any picture (.png .webp .gif .svg), or a
   .txt you type yourself. names starting with a date go newest first.
   art: assets/living/crate, pinboard, letter-shelf, letter (one sheet of paper).
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var crate = document.querySelector('.bottle-crate[data-folder]');
    var board = document.querySelector('.pinboard');
    var pileEl = document.querySelector('.letter-pile');
    if (!crate) return;
    var KINDS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'txt'];
    var BOARD_FILE = crate.dataset.folder.replace(/\/?$/, '/') + 'board.json';
    var SEEN = 'bottles-seen', OWNER = 'dav-owner', DRAFT = 'board-draft', TOKEN = 'forgejo-token';
    function get(store, k) { try { return JSON.parse(store.getItem(k)); } catch (e) { return null; } }
    function put(store, k, v) { try { if (v === null) store.removeItem(k); else store.setItem(k, JSON.stringify(v)); } catch (e) {} }

    // owner mode: ?owner turns it on in this browser, ?owner=off turns it off
    var q = /[?&]owner(?:=(\w+))?/.exec(location.search);
    if (q) put(localStorage, OWNER, q[1] === 'off' ? null : true);
    var owner = get(localStorage, OWNER) === true;
    if (owner) document.body.classList.add('owner-mode');

    Sky.css(
        '.bottle-crate { cursor: pointer; }' +
        '.bottle-crate .crate-art, .bottle-crate > .art { position: absolute; inset: 0; width: 100%; height: 100%; }' +
        '.bottle-crate .necks { position: absolute; left: 8%; right: 8%; top: -34%; height: 50%; }' +
        '.bottle-crate .neck { position: absolute; bottom: 0; width: 16%; transform-origin: 50% 100%; }' +
        '.bottle-crate .neck svg { display: block; width: 100%; }' +
        '.bottle-crate.has-new .neck { animation: neck-bob 3s ease-in-out infinite alternate; }' +
        '@keyframes neck-bob { from { transform: rotate(var(--r)) translateY(0); } to { transform: rotate(calc(var(--r) * -.5)) translateY(-3px); } }' +
        '.bottle-crate .crate-hint, .pinboard .board-hint, .letter-pile .lp-hint { position: absolute; left: 50%; bottom: calc(100% + 36%); transform: translateX(-50%); white-space: nowrap;' +
            'font-style: italic; font-size: .95rem; color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.7); opacity: 0; transition: opacity .25s; pointer-events: none; }' +
        '.pinboard .board-hint { bottom: auto; top: calc(100% + 8px); }' +
        '.bottle-crate:hover .crate-hint, .bottle-crate:focus-visible .crate-hint, .pinboard:hover .board-hint, .pinboard:focus-visible .board-hint,' +
            '.letter-pile:hover .lp-hint, .letter-pile:focus-visible .lp-hint { opacity: 1; }' +
        '.bottle-crate .badge { position: absolute; right: -8px; top: -10px; min-width: 24px; height: 24px; padding: 0 6px; border-radius: 12px;' +
            'background: #9a3b1f; color: #fff6dc; font: 14px/24px Georgia, serif; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,.4); }' +
        '.bottle-crate:not(.has-new) .badge { display: none; }' +

        /* the pinboard on the wall */
        '.pinboard { cursor: zoom-in; aspect-ratio: 4 / 3; border: 10px solid #5a3a24; border-radius: 3px;' +
            'background: #b8875a radial-gradient(rgba(90,55,25,.35) 1px, transparent 1.5px) 0 0 / 7px 7px;' +
            'box-shadow: 0 8px 14px rgba(0,0,0,.45), inset 0 0 18px rgba(60,35,15,.55); }' +
        '.pinboard .pins { position: absolute; inset: 6%; z-index: 1; }' +
        '.pinboard .pinned-note { position: absolute; width: 30%; aspect-ratio: 3 / 4; background: #efe3c6; overflow: hidden;' +
            'box-shadow: 0 3px 5px rgba(0,0,0,.4); display: grid; place-items: center; }' +
        '.pinboard .pinned-note img { width: 100%; height: 100%; object-fit: cover; }' +
        '.pinboard .pinned-note .mini, .letter-pile .mini { padding: 8%; font-size: 7px; line-height: 1.3; color: #3a2716; overflow: hidden; height: 100%; }' +
        '.pinboard .pinned-note::after, .board-view .bv-card::before { content: ""; position: absolute; left: 50%; top: 4%; width: 9px; height: 9px; margin-left: -4.5px;' +
            'border-radius: 50%; background: radial-gradient(circle at 35% 35%, #e0795a, #7a2a18); box-shadow: 0 2px 2px rgba(0,0,0,.4); }' +
        '.pinboard .empty { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; padding: 10%;' +
            'font-style: italic; font-size: .85rem; color: rgba(60,35,15,.75); }' +
        '.pinboard.has-art { border: 0; background: none; box-shadow: none; }' +
        '.pinboard > .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; z-index: 0; }' +
        '.pinboard.has-art:hover { box-shadow: none; filter: drop-shadow(0 0 10px rgba(255,220,150,.45)); }' +
        '.pinboard:not(.has-art):hover { box-shadow: 0 8px 14px rgba(0,0,0,.45), inset 0 0 18px rgba(60,35,15,.55), 0 0 18px rgba(255,220,150,.35); }' +

        /* the pile of letters on its little shelf */
        '.letter-pile { cursor: pointer; aspect-ratio: 200 / 120; }' +
        '.letter-pile .lp-shelf { position: absolute; left: 0; right: 0; bottom: 0; height: 18%; }' +
        '.letter-pile .lp-shelf .placeholder, .letter-pile .lp-shelf > .art { display: block; width: 100%; height: 100%; }' +
        '.letter-pile .lp-stack { position: absolute; left: 10%; right: 10%; top: 0; bottom: 13%; }' +
        '.letter-pile .lp-sheet { position: absolute; bottom: 0; width: 44%; height: 94%; overflow: hidden; background: #efe3c6 var(--letter-art, none) center / cover;' +
            'box-shadow: 1px 2px 4px rgba(0,0,0,.35), inset 0 0 10px rgba(120,80,30,.22); border-radius: 1px; transform-origin: 50% 100%; transition: transform .25s; }' +
        '.letter-pile .lp-sheet img { display: block; width: 100%; height: 100%; object-fit: cover; opacity: .92; }' +
        '.letter-pile .lp-sheet::after { content: ""; position: absolute; inset: 0; background: linear-gradient(transparent 70%, rgba(120,80,30,.12)); }' +
        '.letter-pile:hover .lp-sheet.top { transform: translateY(-5%) rotate(-3deg) !important; }' +
        '.letter-pile .lp-count { position: absolute; right: 6%; top: 8%; min-width: 22px; height: 22px; padding: 0 5px; border-radius: 11px; background: #3a2716;' +
            'color: #f3e6c2; font: 13px/22px Georgia, serif; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,.4); }' +
        '.letter-pile.empty .lp-count, .letter-pile.empty .lp-stack { display: none; }' +
        '.letter-pile.empty { cursor: default; }' +

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
        '.u-card .u-body img, .pv-card img { display: block; width: 100%; height: auto; }' +
        '.u-card .u-body .paper, .bv-card .paper, .pv-card .paper { padding: 28px 30px; line-height: 1.55; }' +
        '.u-card .u-body .paper h2, .bv-card .paper h2, .pv-card .paper h2 { margin: 0 0 8px; font: normal 1.5rem "IM Fell English SC", Georgia, serif; color: #3a2716; text-shadow: none; }' +
        '.u-card .u-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 14px; border-top: 1px solid rgba(110,82,54,.25); }' +
        '.u-card .u-from, .bv-card .bv-from, .pv-card .pv-from { flex: 1 1 100%; font-style: italic; color: #6e5236; }' +
        '.u-card .u-acts { display: flex; flex-wrap: wrap; gap: 8px; margin-left: auto; }' +
        '.crate-ui button.act { border: 0; cursor: pointer; padding: 8px 16px; border-radius: 999px;' +
            'font: italic 1.02rem "IM Fell English", Georgia, serif; background: #3a2716; color: #f3e6c2; }' +
        '.crate-ui button.act:hover { background: #9a3b1f; }' +
        '.crate-ui button.act.soft { background: rgba(58,39,22,.12); color: #3a2716; }' +
        '.crate-ui button.act.soft:hover { background: rgba(58,39,22,.24); }' +

        /* the whole board, up close */
        '.board-view { position: fixed; inset: 0; z-index: 8; overflow-y: auto; visibility: hidden; opacity: 0; transition: opacity .4s, visibility 0s .4s;' +
            'background: #b8875a radial-gradient(rgba(90,55,25,.35) 1px, transparent 1.5px) 0 0 / 9px 9px; font-family: "IM Fell English", Georgia, serif;' +
            'box-shadow: inset 0 0 120px rgba(40,20,5,.6); overscroll-behavior: contain; }' +
        '.board-view.open, .pile-view.open { visibility: visible; opacity: 1; transition: opacity .4s; }' +
        '.board-view .bv-top, .pile-view .pv-top { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 12px; padding: 14px 18px;' +
            'background: linear-gradient(rgba(90,58,36,.95), rgba(90,58,36,.0)); }' +
        '.board-view .bv-top h2, .pile-view .pv-top h2 { margin: 0; flex: 1; font: normal 1.5rem "IM Fell English SC", Georgia, serif; color: #f3e6c2; text-shadow: 0 2px 4px rgba(0,0,0,.6); }' +
        '.board-view .bv-list { display: flex; flex-direction: column; align-items: center; gap: 34px; padding: 10px 16px 80px; }' +
        '.bv-card { position: relative; width: min(560px, 92vw); background: #efe3c6; color: #3a2716; box-shadow: 0 10px 22px rgba(0,0,0,.45), inset 0 0 40px rgba(120,80,30,.2); }' +
        '.bv-card::before { width: 14px; height: 14px; margin-left: -7px; top: -6px; z-index: 1; }' +
        '.bv-card img { display: block; width: 100%; height: auto; }' +
        '.bv-card .bv-from, .pv-card .pv-from { display: block; padding: 8px 14px 10px; border-top: 1px solid rgba(110,82,54,.25); }' +
        '.bv-card .bv-acts { position: absolute; right: -10px; top: -14px; z-index: 2; }' +
        '.board-view .bv-empty, .pile-view .pv-empty { color: #f3e6c2; font-style: italic; text-align: center; margin-top: 20vh; text-shadow: 0 1px 3px rgba(0,0,0,.5); }' +

        /* the pile, one letter at a time */
        '.pile-view { position: fixed; inset: 0; z-index: 8; display: flex; flex-direction: column; visibility: hidden; opacity: 0; transition: opacity .4s, visibility 0s .4s;' +
            'background: radial-gradient(ellipse at 50% 40%, rgba(60,42,28,.82), rgba(14,10,7,.94) 80%); font-family: "IM Fell English", Georgia, serif; overscroll-behavior: contain; }' +
        '.pile-view .pv-stage { position: relative; flex: 1; min-height: 0; display: grid; place-items: center; padding: 6px 60px 12px; touch-action: pan-y; }' +
        '.pv-card { position: absolute; width: min(520px, calc(100vw - 120px)); max-height: calc(100% - 20px); overflow: auto; background: #efe3c6; color: #3a2716;' +
            'box-shadow: 0 16px 36px rgba(0,0,0,.55), inset 0 0 40px rgba(120,80,30,.2); }' +
        '.pv-card.under { transform: translate(6px, 8px) rotate(1.5deg) scale(.97); filter: brightness(.9); }' +
        '.pile-view .pv-step { position: absolute; top: 50%; width: 46px; height: 46px; margin-top: -23px; border: 0; border-radius: 50%; cursor: pointer; z-index: 3;' +
            'background: rgba(234,220,185,.92); color: #3a2716; font-size: 1.5rem; line-height: 46px; box-shadow: 0 4px 10px rgba(0,0,0,.4); }' +
        '.pile-view .pv-step:hover { background: #eadcb9; } .pile-view .pv-step:disabled { opacity: .3; cursor: default; }' +
        '.pile-view .pv-prev { left: 8px; } .pile-view .pv-next { right: 8px; }' +
        '.pile-view .pv-foot { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; padding: 0 16px 18px; }' +
        '.pile-view .pv-foot:empty { display: none; }' +
        '.pile-view .pv-count { color: #e8d9b4; font-style: italic; }' +
        '.board-view .bv-close, .pile-view .pv-close { border: 0; cursor: pointer; padding: 8px 16px; border-radius: 999px; font: italic 1.02rem "IM Fell English", Georgia, serif; background: #3a2716; color: #f3e6c2; }' +
        '@media (max-width: 620px) { .pile-view .pv-stage { padding: 6px 10px 70px; } .pv-card { width: calc(100vw - 24px); max-height: calc(100% - 10px); }' +
            '.pile-view .pv-step { top: auto; bottom: 12px; margin-top: 0; } }' +

        /* owner mode */
        '.owner-bar { position: fixed; left: 12px; bottom: 12px; z-index: 7; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; max-width: calc(100vw - 24px);' +
            'padding: 7px 8px 7px 14px; border-radius: 14px; background: #2a1d14; color: #f3e6c2; font: italic .95rem "IM Fell English", Georgia, serif; box-shadow: 0 8px 20px rgba(0,0,0,.45); }' +
        '.owner-bar b { font: normal .95rem "IM Fell English SC", Georgia, serif; letter-spacing: .03em; color: #e0b070; }' +
        '.owner-bar button { border: 0; cursor: pointer; padding: 5px 12px; border-radius: 999px; font: italic .92rem "IM Fell English", Georgia, serif; background: #eadcb9; color: #3a2716; }' +
        '.owner-bar button.quiet { background: none; color: #cdbb96; text-decoration: underline; padding: 5px 4px; }' +
        '.owner-bar button:disabled { opacity: .45; cursor: default; }' +
        '.publish { position: fixed; inset: 0; z-index: 9; display: grid; place-items: center; padding: 16px; background: rgba(12,9,6,.72); visibility: hidden; opacity: 0; transition: opacity .3s, visibility 0s .3s; }' +
        '.publish.open { visibility: visible; opacity: 1; transition: opacity .3s; }' +
        '.publish .pb-card { width: min(520px, 100%); max-height: 90vh; overflow: auto; padding: 22px 24px; border-radius: 14px; background: #eadcb9; color: #3a2716;' +
            'font-family: "IM Fell English", Georgia, serif; box-shadow: 0 20px 50px rgba(0,0,0,.6); line-height: 1.45; }' +
        '.publish h2 { margin: 0 0 8px; font: normal 1.4rem "IM Fell English SC", Georgia, serif; }' +
        '.publish ol { padding-left: 1.3em; margin: 8px 0 12px; } .publish code { font-size: .9em; background: rgba(110,82,54,.12); padding: 1px 5px; border-radius: 4px; }' +
        '.publish .pb-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }' +
        '.publish details { margin-top: 14px; border-top: 1px solid rgba(110,82,54,.25); padding-top: 10px; }' +
        '.publish summary { cursor: pointer; font-style: italic; color: #6e5236; }' +
        '.publish input { flex: 1; min-width: 180px; padding: 7px 10px; border: 1px solid rgba(110,82,54,.4); border-radius: 8px; background: #f6eed8; font: .95rem Georgia, serif; }' +
        '.publish .pb-msg { font-style: italic; color: #9a3b1f; min-height: 1.3em; }' +
        'body.crate-open .signpost { opacity: 0; pointer-events: none; }'
    );

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

    /* ---------------- where each bottle is: the crate, the board, or the pile ---------------- */
    var bottles = [], byId = {};                        // { file, id, date, meta }
    var published = { pinned: [], pile: [] };          // board.json, as everyone sees it
    var draft = owner ? get(localStorage, DRAFT) : null; // your changes, not published yet
    var seen = get(localStorage, SEEN) || [];
    function B() { return draft || published; }
    function where(id) { var b = B(); return b.pinned.indexOf(id) !== -1 ? 'board' : b.pile.indexOf(id) !== -1 ? 'pile' : 'crate'; }
    function inCrate() { return bottles.filter(function (b) { return where(b.id) === 'crate'; }); }
    function onBoard() { return B().pinned.map(function (id) { return byId[id]; }).filter(Boolean); }
    function onPile() { return B().pile.map(function (id) { return byId[id]; }).filter(Boolean); }
    function clean(b) { return { pinned: (b.pinned || []).slice(), pile: (b.pile || []).slice() }; }
    function same(a, b) { return JSON.stringify(clean(a)) === JSON.stringify(clean(b)); }
    // owner only: move a bottle somewhere (it's a draft until you publish)
    function move(id, to) {
        if (!owner) return;
        var d = clean(B());
        d.pinned = d.pinned.filter(function (x) { return x !== id; });
        d.pile = d.pile.filter(function (x) { return x !== id; });
        if (to === 'board') d.pinned.push(id);
        if (to === 'pile') d.pile.unshift(id);
        draft = same(d, published) ? null : d;
        put(localStorage, DRAFT, draft);
        drawAll();
    }
    function markSeen(id) { if (seen.indexOf(id) === -1) { seen.push(id); put(localStorage, SEEN, seen); } }

    /* ---------------- the crate ---------------- */
    crate.setAttribute('role', 'button');
    crate.setAttribute('tabindex', '0');
    crate.insertAdjacentHTML('beforeend', '<div class="necks" aria-hidden="true"></div><span class="badge"></span><span class="crate-hint"></span>');
    var necks = crate.querySelector('.necks'), badge = crate.querySelector('.badge'), crateHint = crate.querySelector('.crate-hint');
    var NECK = '<svg viewBox="0 0 30 70"><path d="M6 70 V34 Q6 24 11 20 V6 H19 V20 Q24 24 24 34 V70 Z" fill="rgba(96,158,146,.6)" stroke="rgba(215,240,232,.8)" stroke-width="1.4"/>' +
               '<rect x="9.5" y="0" width="11" height="9" rx="2" fill="#9a6b3c"/><path d="M10 40 V64" stroke="rgba(255,255,255,.45)" stroke-width="2" stroke-linecap="round"/></svg>';
    function drawCrate() {
        var list = inCrate(), fresh = list.filter(function (b) { return seen.indexOf(b.id) === -1; }).length, n = list.length;
        crate.classList.toggle('has-new', fresh > 0);
        badge.textContent = fresh;
        crateHint.textContent = n ? (n === 1 ? 'a bottle washed up' : n + ' bottles washed up') : 'no bottles waiting';
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
    function drawBoard() {
        if (!board) return;
        var pins = board.querySelector('.pins'), list = onBoard();
        pins.innerHTML = '';
        board.setAttribute('aria-label', 'the pinboard: ' + list.length + (list.length === 1 ? ' message' : ' messages'));
        if (!list.length) { pins.innerHTML = '<span class="empty">' + (owner ? 'read a bottle from the crate and pin it here' : 'nothing pinned up yet') + '</span>'; return; }
        list.slice(-7).forEach(function (b, i) {
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

    /* ---------------- the pile of letters on the shelf ---------------- */
    if (pileEl) {
        pileEl.setAttribute('role', 'button');
        pileEl.setAttribute('tabindex', '0');
        if (!pileEl.querySelector('.lp-shelf')) pileEl.insertAdjacentHTML('afterbegin',
            '<span class="lp-shelf"><svg class="placeholder" viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true">' +
                '<rect x="0" y="0" width="200" height="8" fill="#5a3a24"/><rect x="0" y="0" width="200" height="2" fill="#7a5132"/>' +
                '<path d="M20 8 L20 24 L34 8 Z M180 8 L180 24 L166 8 Z" fill="#3b2618"/></svg></span>');
        // the shelf is a slot (data-asset on .letter-pile moves to it)
        var shelfSlot = pileEl.querySelector('.lp-shelf');
        if (pileEl.dataset.asset) { shelfSlot.dataset.asset = pileEl.dataset.asset; pileEl.removeAttribute('data-asset'); }
        pileEl.insertAdjacentHTML('beforeend', '<span class="lp-stack"></span><span class="lp-count"></span><span class="lp-hint">the letters</span>');
        Sky.findAsset('assets/living/letter', function (url) { if (url) pileEl.style.setProperty('--letter-art', 'url("' + new URL(url, location.href).href + '")'); });
    }
    function drawPile() {
        if (!pileEl) return;
        var list = onPile(), stack = pileEl.querySelector('.lp-stack');
        pileEl.classList.toggle('empty', !list.length);
        pileEl.querySelector('.lp-count').textContent = list.length;
        pileEl.querySelector('.lp-hint').textContent = list.length ? 'the letters: flip through them' : (owner ? 'letters you\'ve read (and not pinned) go here' : 'no letters here yet');
        pileEl.setAttribute('aria-label', 'a pile of ' + list.length + ' letters');
        stack.innerHTML = '';
        // the letters stand on the shelf, leaning back against each other; the top of the pile in front
        var n = Math.min(list.length, 6);
        for (var i = n - 1; i >= 0; i--) {
            var s = document.createElement('span'), rnd = Sky.seeded(Sky.hashStr(list[i].id));
            s.className = 'lp-sheet' + (i === 0 ? ' top' : '');
            s.style.left = (6 + i * (50 / Math.max(1, n - 1 || 1)) * (n > 1 ? 1 : 0) + (n === 1 ? 22 : 0)) + '%';
            s.style.transform = 'rotate(' + (i * 4 + (rnd() - .5) * 4).toFixed(1) + 'deg)';
            s.style.filter = 'brightness(' + (1 - i * 0.06).toFixed(2) + ')';
            s.appendChild(messageEl(list[i], 'mini'));
            stack.appendChild(s);
        }
    }

    /* ---------------- pulling a bottle out and opening it ---------------- */
    var un = document.createElement('div');
    un.className = 'uncork crate-ui';
    un.setAttribute('role', 'dialog');
    un.setAttribute('aria-label', 'a message in a bottle');
    un.innerHTML = Sky.bottleSVG('big-bottle') + '<span class="u-hint">pull the cork, or just click the bottle</span>' +
        '<div class="u-card"><div class="u-body"></div><div class="u-foot"><span class="u-from"></span><span class="u-acts"></span></div></div>';
    document.body.appendChild(un);
    var bigBottle = un.querySelector('.big-bottle'), cork = un.querySelector('.b-cork'), roll = un.querySelector('.b-scroll');
    var card = un.querySelector('.u-card'), cardBody = un.querySelector('.u-body'), cardFrom = un.querySelector('.u-from'), acts = un.querySelector('.u-acts');
    var current = null, uncorked = false, corkDrag = null, lastTaken = -1;

    function takeOne() {
        var list = inCrate();
        if (!list.length) { if (onPile().length) openPile(); else if (onBoard().length) openBoard(); return; }
        // one you haven't read yet, or the next one round
        var fresh = list.filter(function (b) { return seen.indexOf(b.id) === -1; });
        if (fresh.length) current = fresh[0];
        else { lastTaken = (lastTaken + 1) % list.length; current = list[lastTaken]; }
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
        markSeen(current.id);
        if (Sky.sounds) Sky.sounds.sfx('cork-pop');
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
    function button(label, fn, soft) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'act' + (soft ? ' soft' : '');
        b.textContent = label;
        b.addEventListener('click', fn);
        return b;
    }
    function read() {
        if (Sky.sounds) Sky.sounds.sfx('paper-unroll');
        cardBody.innerHTML = '';
        cardBody.appendChild(messageEl(current));
        cardFrom.textContent = fromLine(current, {});
        readMeta(current).then(function (m) { if (current) cardFrom.textContent = fromLine(current, m); });
        acts.innerHTML = '';
        if (owner) {
            acts.appendChild(button('back in the crate', function () { putBack(); }, true));
            acts.appendChild(button('put it on the pile', function () { flyTo(pileEl, 'pile'); }, true));
            acts.appendChild(button('pin it to the board', function () { flyTo(board, 'board'); }));
        } else acts.appendChild(button('roll it up and put it back', function () { putBack(); }));
        un.classList.add('read');
        card.animate([{ transform: 'translate(-50%,-50%) scaleY(.05)', opacity: .6 }, { transform: 'translate(-50%,-50%)', opacity: 1 }],
            { duration: 700, easing: 'cubic-bezier(.3,.7,.25,1)' });
        acts.lastChild.focus({ preventScroll: true });
    }
    // the letter flies to the board or onto the pile (owner)
    function flyTo(target, to) {
        var id = current.id;
        if (Sky.sounds) Sky.sounds.sfx('paper-roll');
        if (!target) { move(id, to); closeUncork(); return; }
        var a = card.getBoundingClientRect(), b = target.getBoundingClientRect();
        card.animate([
            { transform: 'translate(-50%,-50%)', opacity: 1 },
            { transform: 'translate(calc(-50% + ' + (b.left + b.width * .5 - (a.left + a.width / 2)) + 'px), calc(-50% + ' + (b.top + b.height * .45 - (a.top + a.height / 2)) + 'px)) scale(' + (b.width * .3 / a.width) + ') rotate(-6deg)', opacity: .9 }
        ], { duration: 750, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).onfinish = function () {
            move(id, to);
            closeUncork();
            card.getAnimations().forEach(function (x) { x.cancel(); });
            target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 400 });
        };
    }
    // rolled back up and back in the crate
    function putBack() {
        if (Sky.sounds) Sky.sounds.sfx('paper-roll');
        if (Sky.sounds) Sky.sounds.sfx('cork-in', { delay: 0.5 });
        var a = card.getBoundingClientRect(), b = crate.getBoundingClientRect();
        card.animate([
            { transform: 'translate(-50%,-50%)', opacity: 1 },
            { transform: 'translate(calc(-50% + ' + (b.left + b.width / 2 - (a.left + a.width / 2)) + 'px), calc(-50% + ' + (b.top - (a.top + a.height / 2)) + 'px)) scale(.08, .02)', opacity: .5 }
        ], { duration: 600, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).onfinish = function () {
            if (owner && current && where(current.id) !== 'crate') move(current.id, 'crate');
            closeUncork();
            card.getAnimations().forEach(function (x) { x.cancel(); });
        };
    }
    function closeUncork() {
        un.classList.remove('open', 'read');
        document.body.classList.remove('crate-open');
        current = null;
        un.querySelector('.u-hint').style.opacity = '';
        drawAll();
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
    un.addEventListener('pointerdown', function (e) { if (e.target === un) { if (uncorked) putBack(); else closeUncork(); } });
    crate.addEventListener('click', takeOne);
    crate.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); takeOne(); } });

    /* ---------------- the board, up close: scroll through every message ---------------- */
    var bv = document.createElement('div');
    bv.className = 'board-view crate-ui';
    bv.setAttribute('role', 'dialog');
    bv.setAttribute('aria-label', 'the pinboard');
    bv.innerHTML = '<div class="bv-top"><h2>the pinboard</h2><button type="button" class="bv-close">step back</button></div><div class="bv-list"></div>';
    document.body.appendChild(bv);
    function drawBoardView() {
        var list = bv.querySelector('.bv-list'), pinned = onBoard().slice().reverse();     // newest pin first
        var y = bv.scrollTop;
        list.innerHTML = '';
        bv.querySelector('h2').textContent = 'the pinboard' + (pinned.length ? ' · ' + pinned.length + (pinned.length === 1 ? ' message' : ' messages') : '');
        if (!pinned.length) list.innerHTML = '<p class="bv-empty">nothing pinned up yet.</p>';
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
            if (owner) {
                var a = document.createElement('span');
                a.className = 'bv-acts';
                a.appendChild(button('unpin (onto the pile)', function () { move(b.id, 'pile'); drawBoardView(); }));
                c.appendChild(a);
            }
            list.appendChild(c);
        });
        bv.scrollTop = y;
    }
    function openBoard() {
        drawBoardView();
        bv.scrollTop = 0;
        bv.classList.add('open');
        document.body.classList.add('crate-open');
        bv.querySelector('.bv-close').focus({ preventScroll: true });
    }
    function closeBoard() { bv.classList.remove('open'); document.body.classList.remove('crate-open'); }
    bv.querySelector('.bv-close').addEventListener('click', closeBoard);
    if (board) {
        board.addEventListener('click', openBoard);
        board.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBoard(); } });
    }

    /* ---------------- the pile, up close: flip through the letters ---------------- */
    var pv = document.createElement('div');
    pv.className = 'pile-view crate-ui';
    pv.setAttribute('role', 'dialog');
    pv.setAttribute('aria-label', 'the pile of letters');
    pv.innerHTML = '<div class="pv-top"><h2>the letters</h2><span class="pv-count"></span><button type="button" class="pv-close">put them down</button></div>' +
        '<div class="pv-stage"><button type="button" class="pv-step pv-prev" aria-label="the letter before">‹</button>' +
        '<button type="button" class="pv-step pv-next" aria-label="the next letter">›</button></div><div class="pv-foot"></div>';
    document.body.appendChild(pv);
    var stage = pv.querySelector('.pv-stage'), pvAt = 0, flipping = false;
    function letterCard(b, cls) {
        var c = document.createElement('article');
        c.className = 'pv-card' + (cls ? ' ' + cls : '');
        c.appendChild(messageEl(b));
        var f = document.createElement('span');
        f.className = 'pv-from';
        f.textContent = fromLine(b, {});
        readMeta(b).then(function (m) { f.textContent = fromLine(b, m); });
        c.appendChild(f);
        return c;
    }
    function drawPileView() {
        var list = onPile();
        stage.querySelectorAll('.pv-card, .pv-empty').forEach(function (x) { x.remove(); });
        var foot = pv.querySelector('.pv-foot');
        foot.innerHTML = '';
        if (!list.length) {
            stage.insertAdjacentHTML('beforeend', '<p class="pv-empty">no letters on the pile.</p>');
            pv.querySelector('.pv-count').textContent = '';
            pv.querySelector('.pv-prev').disabled = pv.querySelector('.pv-next').disabled = true;
            return;
        }
        pvAt = Math.max(0, Math.min(pvAt, list.length - 1));
        if (list[pvAt + 1]) stage.appendChild(letterCard(list[pvAt + 1], 'under'));
        stage.appendChild(letterCard(list[pvAt], 'top'));
        pv.querySelector('.pv-count').textContent = (pvAt + 1) + ' of ' + list.length;
        pv.querySelector('.pv-prev').disabled = pvAt === 0;
        pv.querySelector('.pv-next').disabled = pvAt >= list.length - 1;
        if (owner) {
            var id = list[pvAt].id;
            foot.appendChild(button('back in the crate', function () { move(id, 'crate'); drawPileView(); }, true));
            foot.appendChild(button('pin it to the board', function () { move(id, 'board'); drawPileView(); }));
        }
    }
    // turning to the next letter: the top one lifts off to the side
    function flip(d) {
        var list = onPile(), to = pvAt + d;
        if (flipping || to < 0 || to >= list.length) return;
        var top = stage.querySelector('.pv-card.top');
        if (!top || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { pvAt = to; drawPileView(); return; }
        flipping = true;
        if (d > 0) {
            top.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(-70%, -6%) rotate(-14deg)', opacity: 0 }],
                { duration: 420, easing: 'cubic-bezier(.5,0,.7,.4)', fill: 'forwards' }).onfinish = function () { pvAt = to; drawPileView(); flipping = false; };
            var under = stage.querySelector('.pv-card.under');
            if (under) under.animate([{ transform: 'translate(6px, 8px) rotate(1.5deg) scale(.97)', filter: 'brightness(.9)' }, { transform: 'none', filter: 'none' }],
                { duration: 420, easing: 'ease-out', fill: 'forwards' });
        } else {
            pvAt = to;
            var back = letterCard(list[to], 'top');
            stage.appendChild(back);
            back.animate([{ transform: 'translate(-70%, -6%) rotate(-14deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
                { duration: 420, easing: 'cubic-bezier(.3,.6,.4,1)' }).onfinish = function () { drawPileView(); flipping = false; };
        }
    }
    function openPile() {
        pvAt = 0;
        drawPileView();
        pv.classList.add('open');
        document.body.classList.add('crate-open');
        pv.querySelector('.pv-close').focus({ preventScroll: true });
    }
    function closePile() { pv.classList.remove('open'); document.body.classList.remove('crate-open'); }
    pv.querySelector('.pv-close').addEventListener('click', closePile);
    pv.querySelector('.pv-prev').addEventListener('click', function () { flip(-1); });
    pv.querySelector('.pv-next').addEventListener('click', function () { flip(1); });
    var swipe = null;
    stage.addEventListener('pointerdown', function (e) { if (!e.target.closest('button')) swipe = { x: e.clientX, y: e.clientY }; });
    stage.addEventListener('pointerup', function (e) {
        if (!swipe) return;
        var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
        swipe = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) flip(dx < 0 ? 1 : -1);
    });
    if (pileEl) {
        pileEl.addEventListener('click', function () { if (onPile().length) openPile(); });
        pileEl.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && onPile().length) { e.preventDefault(); openPile(); } });
    }
    document.addEventListener('keydown', function (e) {
        if (pv.classList.contains('open')) {
            if (e.key === 'Escape') { e.stopImmediatePropagation(); closePile(); }
            else if (e.key === 'ArrowRight') flip(1);
            else if (e.key === 'ArrowLeft') flip(-1);
            return;
        }
        if (e.key !== 'Escape') return;
        if (bv.classList.contains('open')) { e.stopImmediatePropagation(); closeBoard(); }
        else if (un.classList.contains('open')) { e.stopImmediatePropagation(); uncorked ? putBack() : closeUncork(); }
    }, true);

    /* ---------------- owner mode: publishing the board ---------------- */
    var bar = null, pb = null;
    function boardJSON() { return JSON.stringify(clean(B()), null, 2) + '\n'; }
    if (owner) {
        bar = document.createElement('div');
        bar.className = 'owner-bar';
        bar.innerHTML = '<b>owner mode</b><span class="ob-msg"></span><button type="button" class="ob-pub">publish</button>' +
            '<button type="button" class="ob-undo quiet">undo my changes</button><button type="button" class="ob-off quiet">leave owner mode</button>';
        document.body.appendChild(bar);
        bar.querySelector('.ob-pub').addEventListener('click', openPublish);
        bar.querySelector('.ob-undo').addEventListener('click', function () { draft = null; put(localStorage, DRAFT, null); drawAll(); });
        bar.querySelector('.ob-off').addEventListener('click', function () { put(localStorage, OWNER, null); location.href = location.pathname; });

        pb = document.createElement('div');
        pb.className = 'publish crate-ui';
        pb.innerHTML = '<div class="pb-card" role="dialog" aria-label="publish the board">' +
            '<h2>publish the board</h2>' +
            '<p>So every visitor sees your board and pile:</p>' +
            '<ol><li>download <code>board.json</code></li><li>put it in <code>' + crate.dataset.folder + '</code> (replacing the old one)</li><li>commit and push</li></ol>' +
            '<div class="pb-row"><button type="button" class="act pb-dl">download board.json</button><button type="button" class="act soft pb-copy">copy it instead</button></div>' +
            '<details><summary>or publish it straight from here, through Forgejo</summary>' +
                '<p class="cp-note">Needs a Forgejo access token (Forgejo → Settings → Applications → generate a token with permission to write to the repository). ' +
                'It\'s kept in this browser only. This works only if Mel\'s Forgejo lets web pages talk to it; if not, use the download.</p>' +
                '<div class="pb-row"><input type="password" class="pb-token" placeholder="your access token" autocomplete="off"><button type="button" class="act pb-api">publish now</button></div>' +
            '</details>' +
            '<p class="pb-msg" role="status"></p>' +
            '<div class="pb-row"><button type="button" class="act soft pb-close">close</button></div></div>';
        document.body.appendChild(pb);
        var msg = pb.querySelector('.pb-msg'), tokenIn = pb.querySelector('.pb-token');
        tokenIn.value = get(localStorage, TOKEN) || '';
        pb.querySelector('.pb-close').addEventListener('click', function () { pb.classList.remove('open'); });
        pb.addEventListener('pointerdown', function (e) { if (e.target === pb) pb.classList.remove('open'); });
        pb.querySelector('.pb-dl').addEventListener('click', function () {
            var a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([boardJSON()], { type: 'application/json' }));
            a.download = 'board.json';
            document.body.appendChild(a); a.click(); a.remove();
            msg.textContent = 'downloaded. once it\'s pushed and live, this page notices by itself.';
        });
        pb.querySelector('.pb-copy').addEventListener('click', function () {
            navigator.clipboard.writeText(boardJSON()).then(function () { msg.textContent = 'copied: paste it into board.json and push.'; },
                function () { msg.textContent = 'couldn\'t copy here; use the download.'; });
        });
        pb.querySelector('.pb-api').addEventListener('click', function () {
            var token = tokenIn.value.trim();
            if (!token) { msg.textContent = 'paste your token first.'; return; }
            put(localStorage, TOKEN, token);
            msg.textContent = 'publishing…';
            publishApi(token).then(function () {
                published = clean(B()); draft = null; put(localStorage, DRAFT, null); drawAll();
                msg.textContent = 'published! everyone will see it in a minute or two.';
            }, function (err) {
                msg.textContent = 'that didn\'t work (' + err + '). use the download instead.';
            });
        });
    }
    function openPublish() { pb.querySelector('.pb-msg').textContent = ''; pb.classList.add('open'); }
    function publishApi(token) {
        var api = Sky.repoApi;
        if (!api) return Promise.reject('no Forgejo address in sky/sky.js');
        var path = new URL(BOARD_FILE, location.href).pathname.replace(/^\//, '');
        var url = api + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
        var head = { 'Authorization': 'token ' + token, 'Content-Type': 'application/json' };
        var content = btoa(unescape(encodeURIComponent(boardJSON())));
        return fetch(url, { headers: head, cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }, function () { throw 'Forgejo wouldn\'t answer this page'; })
            .then(function (existing) {
                return fetch(url, { method: existing ? 'PUT' : 'POST', headers: head,
                    body: JSON.stringify({ content: content, sha: existing ? existing.sha : undefined, message: 'the pinboard and the pile' }) });
            }).then(function (r) { if (!r.ok) throw 'Forgejo said ' + r.status; });
    }
    function drawOwnerBar() {
        if (!bar) return;
        var n = 0;
        if (draft) bottles.forEach(function (b) {
            var d = where(b.id), p = published.pinned.indexOf(b.id) !== -1 ? 'board' : published.pile.indexOf(b.id) !== -1 ? 'pile' : 'crate';
            if (d !== p) n++;
        });
        bar.querySelector('.ob-msg').textContent = draft ? n + (n === 1 ? ' change' : ' changes') + ' only you can see' : 'everything\'s published';
        bar.querySelector('.ob-pub').disabled = !draft;
        bar.querySelector('.ob-undo').style.display = draft ? '' : 'none';
    }

    function drawAll() { drawCrate(); drawBoard(); drawPile(); drawOwnerBar(); }

    /* ---------------- the bottles, and where they are ---------------- */
    drawAll();
    var gotBoard = fetch(BOARD_FILE, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    Sky.listFolder(crate.dataset.folder, KINDS, function (files) {
        gotBoard.then(function (j) {
            if (j) published = clean(j);
            if (draft && same(draft, published)) { draft = null; put(localStorage, DRAFT, null); }
            bottles = Sky.sortNewest(files).map(function (f) { return { file: f, id: f.name, date: Sky.fileDate(f.name) }; });
            byId = {};
            bottles.forEach(function (b) { byId[b.id] = b; });
            drawAll();
        });
    });
})();

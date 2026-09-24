/* =====================================================================
   notes.js — a clipboard on the workshop wall with your to-do list and
   notes. You write them in the content manager (tools\content.bat → notes);
   they're kept in content/workshop/notes.json:
       { "title": "to do",
         "todo":  [ { "text": "stretch a new canvas", "done": false } ],
         "notes": [ { "text": "the blue on the window is too loud", "date": "2026-09-24" } ] }
   The board shows the first few; click it to read them all.

       <div class="furnish notes-board" data-asset="assets/workshop/notes-board"></div>
       <script src="sky/notes.js"></script>          (after sky/sky.js)

   slots:  assets/workshop/notes-board   the board (a clipboard until then). the list is written
                                         on it between 16% and 84% across, 22% and 92% down
                                         (change that with --paper on the board: e.g. --paper: 20% 14% 8% 14%)
           assets/workshop/notes-paper   the sheet it opens up on (stretched)
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var board = document.querySelector('.notes-board');
    if (!Sky || !board) return;
    var FILE = board.dataset.list || 'content/workshop/notes.json';

    Sky.css(
        '.notes-board { aspect-ratio: 4 / 5; z-index: 2; cursor: zoom-in; filter: drop-shadow(0 6px 7px rgba(0,0,0,.42)); transition: transform .25s; transform: rotate(var(--tilt, 1.5deg)); }' +
        '.notes-board:hover, .notes-board:focus-visible { transform: rotate(var(--tilt, 1.5deg)) translateY(-2px); outline: none; }' +
        '.notes-board > svg, .notes-board > .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; }' +
        '.notes-board .nb-list { position: absolute; inset: var(--paper, 22% 16% 8% 16%); overflow: hidden; color: #3a2716; font: italic calc(var(--nb-w, 150px) * .075)/1.35 "IM Fell English", Georgia, serif;' +
            '-webkit-mask-image: linear-gradient(#000 80%, transparent); mask-image: linear-gradient(#000 80%, transparent); pointer-events: none; }' +
        '.notes-board .nb-list b { display: block; font: normal 1.15em "IM Fell English SC", Georgia, serif; margin-bottom: .2em; }' +
        '.notes-board .nb-list div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
        '.notes-board .nb-list .done { text-decoration: line-through; opacity: .55; }' +
        '.notes-board .nb-hint { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap; font-style: italic;' +
            'font-size: .9rem; color: #f3e6c2; text-shadow: 0 1px 3px rgba(0,0,0,.7); opacity: 0; transition: opacity .25s; pointer-events: none; }' +
        '.notes-board:hover .nb-hint, .notes-board:focus-visible .nb-hint { opacity: 1; }' +
        '.notes-sheet { position: fixed; inset: 0; z-index: 8; display: grid; place-items: center; padding: 60px 16px 24px; background: rgba(14,9,5,.82);' +
            'visibility: hidden; opacity: 0; transition: opacity .3s, visibility 0s .3s; font-family: "IM Fell English", Georgia, serif; }' +
        '.notes-sheet.open { visibility: visible; opacity: 1; transition: opacity .3s; }' +
        '.notes-sheet .ns-paper { position: relative; width: min(560px, 100%); max-height: calc(100vh - 110px); overflow: auto; padding: 34px 40px 30px; color: #3a2716;' +
            'background: #efe3c6 var(--sheet-art, none) center / 100% 100% no-repeat; box-shadow: 0 16px 40px rgba(0,0,0,.6), inset 0 0 40px rgba(120,80,30,.25);' +
            'transform: rotate(-.6deg); }' +
        '.notes-sheet h2 { margin: 0 0 10px; font: normal 1.7rem "IM Fell English SC", Georgia, serif; }' +
        '.notes-sheet h3 { margin: 22px 0 6px; font: normal 1.2rem "IM Fell English SC", Georgia, serif; color: #6e5236; }' +
        '.notes-sheet ul { list-style: none; margin: 0; padding: 0; }' +
        '.notes-sheet li { position: relative; padding: 5px 0 5px 30px; border-bottom: 1px dashed rgba(110,82,54,.3); font-size: 1.08rem; white-space: pre-wrap; }' +
        '.notes-sheet li.todo::before { content: ""; position: absolute; left: 2px; top: 9px; width: 15px; height: 15px; border: 1.6px solid #6e5236; border-radius: 3px; }' +
        '.notes-sheet li.todo.done { color: #8a7258; text-decoration: line-through; }' +
        '.notes-sheet li.todo.done::after { content: ""; position: absolute; left: 6px; top: 6px; width: 7px; height: 13px; border: solid #9a3b1f; border-width: 0 3px 3px 0; transform: rotate(40deg); }' +
        '.notes-sheet li.note { padding-left: 0; }' +
        '.notes-sheet li.note i { display: block; font-size: .85rem; color: #8a7258; }' +
        '.notes-sheet .ns-x { position: absolute; top: 8px; right: 12px; border: 0; background: none; font-size: 1.5rem; color: #6e5236; cursor: pointer; }' +
        '.notes-sheet .ns-empty { font-style: italic; color: #8a7258; }' +
        'body.notes-open .place-tabs, body.notes-open .cp { opacity: 0; pointer-events: none; }'
    );

    // the stand-in: a clipboard
    board.insertAdjacentHTML('afterbegin', '<svg class="placeholder" viewBox="0 0 80 100" preserveAspectRatio="none" aria-hidden="true">' +
        '<rect x="2" y="6" width="76" height="92" rx="4" fill="#8a5a34"/><rect x="2" y="6" width="76" height="92" rx="4" fill="none" stroke="#5a3a24" stroke-width="1.5"/>' +
        '<rect x="9" y="16" width="62" height="78" fill="#f3ead2"/><path d="M9 16 H71 V94 H9 Z" fill="none" stroke="rgba(0,0,0,.12)"/>' +
        '<rect x="26" y="2" width="28" height="14" rx="3" fill="#b9bdc2"/><rect x="30" y="5" width="20" height="4" rx="2" fill="#7c8288"/>' +
        '</svg><div class="nb-list"></div><span class="nb-hint">to do &amp; notes</span>');
    board.setAttribute('role', 'button');
    board.setAttribute('tabindex', '0');
    board.setAttribute('aria-label', 'to do and notes');

    var sheet = document.createElement('div');
    sheet.className = 'notes-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'to do and notes');
    sheet.innerHTML = '<div class="ns-paper"><button type="button" class="ns-x" aria-label="close">&times;</button><div class="ns-body"></div></div>';
    document.body.appendChild(sheet);
    Sky.findAsset('assets/workshop/notes-paper', function (url) {
        if (url) sheet.querySelector('.ns-paper').style.setProperty('--sheet-art', 'url("' + new URL(url, location.href).href + '")');
    });

    function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
    function nice(d) {
        var p = String(d || '').split('-');
        if (p.length < 3) return '';
        return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }).toLowerCase();
    }
    function fitText() { board.style.setProperty('--nb-w', board.clientWidth + 'px'); }
    window.addEventListener('resize', fitText);

    var data = { title: 'to do', todo: [], notes: [] };
    fetch(FILE, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (j) {
        if (j && typeof j === 'object') data = { title: j.title || 'to do', todo: Array.isArray(j.todo) ? j.todo : [], notes: Array.isArray(j.notes) ? j.notes : [] };
        var small = '<b>' + esc(data.title) + '</b>';
        var open = data.todo.filter(function (t) { return !t.done; }), done = data.todo.filter(function (t) { return t.done; });
        open.concat(done).slice(0, 7).forEach(function (t) { small += '<div class="' + (t.done ? 'done' : '') + '">' + (t.done ? '☑ ' : '☐ ') + esc(t.text) + '</div>'; });
        if (!data.todo.length) data.notes.slice(0, 5).forEach(function (n) { small += '<div>– ' + esc(n.text) + '</div>'; });
        board.querySelector('.nb-list').innerHTML = small;
        fitText();

        var html = '<h2>' + esc(data.title) + '</h2>';
        html += data.todo.length ? '<ul>' + data.todo.map(function (t) { return '<li class="todo' + (t.done ? ' done' : '') + '">' + esc(t.text) + '</li>'; }).join('') + '</ul>'
                                 : '<p class="ns-empty">nothing to do. imagine that.</p>';
        if (data.notes.length) html += '<h3>notes</h3><ul>' + data.notes.map(function (n) {
            return '<li class="note">' + (n.date ? '<i>' + esc(nice(n.date)) + '</i>' : '') + esc(n.text) + '</li>';
        }).join('') + '</ul>';
        sheet.querySelector('.ns-body').innerHTML = html;
    });

    function openSheet() { sheet.classList.add('open'); document.body.classList.add('notes-open'); if (Sky.sounds) Sky.sounds.sfx('paper-unroll'); }
    function closeSheet() { if (!sheet.classList.contains('open')) return; sheet.classList.remove('open'); document.body.classList.remove('notes-open'); }
    board.addEventListener('click', openSheet);
    board.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSheet(); } });
    sheet.addEventListener('click', function (e) { if (e.target === sheet || e.target.closest('.ns-x')) closeSheet(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
})();

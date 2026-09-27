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

    // (its look is in sky/css/notes.css, linked from each page's head)

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

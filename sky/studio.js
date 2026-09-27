/* =====================================================================
   studio.js — "leave some art" in the workshop. Visitors paint something
   (brush, eraser, fill, a few colours) or upload a picture of their own
   (png, jpg, gif or webp, under 1 MB), give it a title and their name, and
   send it. It arrives in your inbox (BOTTLE_INBOX in sky/sky.js) as an
   attachment already named for you:
       2026-09-24-a-little-boat-by-anna.png
   Keep the ones you like by saving them into content/workshop/visitors/:
   they go into the visitors' portfolio by the bench, with their title and
   name read from the file name.

       <div class="furnish portfolio" data-visitors="content/workshop/visitors/" …></div>
       <script src="sky/studio.js"></script>          (after sky/sky.js)
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    var folio = document.querySelector('[data-visitors]');
    if (!Sky || !folio) return;

    /* ======================= settings you can edit ======================= */
    var WAIT = 10 * 60 * 1000;                 // one piece per visitor every ten minutes
    var LIMIT = 1024 * 1024 - 1;               // uploads (and paintings) under 1 MB
    var W = 800, H = 1000;                     // the painting's size in pixels (4:5)
    var PAPER = '#f6ecd4';                     // the paper's colour
    /* ===================================================================== */

    var FOLDER = folio.dataset.visitors.replace(/\/?$/, '/');
    var TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' };
    var SHOW = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }

    // its look is in sky/css/studio.css (linked from each page's head); these are the values it takes from here
    document.documentElement.style.setProperty('--studio-paper', PAPER);

    /* ---------------- the portfolio ---------------- */
    folio.setAttribute('role', 'button');
    folio.setAttribute('tabindex', '0');
    folio.setAttribute('aria-label', 'the visitors’ portfolio');
    var count = document.createElement('span');
    count.className = 'pf-count';
    var fhint = document.createElement('span');
    fhint.className = 'pf-hint';
    fhint.textContent = 'art left by visitors';
    folio.appendChild(count);
    folio.appendChild(fhint);

    var vv = document.createElement('div');
    vv.className = 'visitors-view';
    vv.setAttribute('role', 'dialog');
    vv.setAttribute('aria-label', 'art left by visitors');
    vv.innerHTML = '<button type="button" class="vv-close">back to the workshop</button>' +
        '<div class="vv-inner"><h2 class="vv-title">left by visitors</h2><p class="vv-sub">paintings and pictures people left in the workshop</p>' +
        '<div class="vv-grid"></div><p class="vv-empty" hidden>nothing here yet. be the first: leave some art.</p></div>' +
        '<div class="vv-zoom"><figure><img alt=""><figcaption></figcaption></figure></div>';
    document.body.appendChild(vv);
    var grid = vv.querySelector('.vv-grid'), zoom = vv.querySelector('.vv-zoom');

    // "2026-09-24-a-little-boat-by-anna.png" → { title: "a little boat", by: "anna", date: "2026-09-24" }
    function describe(name) {
        var base = name.replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}-\d{2}[-_ ]*/, '');
        var m = /^(.*?)[-_ ]by[-_ ](.+)$/i.exec(base);
        var title = (m ? m[1] : base).replace(/[-_]+/g, ' ').trim(), by = m ? m[2].replace(/[-_]+/g, ' ').trim() : '';
        return { title: title && title !== 'untitled' ? title : 'untitled', by: by, date: Sky.fileDate(name) };
    }
    function niceDate(d) {
        if (!d) return '';
        var t = new Date(d + 'T12:00:00');
        return isNaN(t) ? d : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase();
    }
    var pieces = [];
    function load() {
        Sky.listFolder(FOLDER, SHOW, function (files) {
            pieces = Sky.sortNewest(files);
            count.textContent = pieces.length || '';
            grid.innerHTML = '';
            vv.querySelector('.vv-empty').hidden = pieces.length > 0;
            pieces.forEach(function (f) {
                var d = describe(f.name), card = document.createElement('button');
                card.type = 'button';
                card.className = 'vv-card';
                card.innerHTML = '<img alt="" loading="lazy" decoding="async"><b></b><small></small>';
                card.querySelector('img').src = f.url;
                card.querySelector('img').alt = d.title;
                card.querySelector('b').textContent = d.title;
                card.querySelector('small').textContent = [d.by ? 'by ' + d.by : '', niceDate(d.date)].filter(Boolean).join(', ');
                card.addEventListener('click', function () {
                    zoom.querySelector('img').src = f.url;
                    zoom.querySelector('figcaption').textContent = d.title + (d.by ? ', by ' + d.by : '');
                    zoom.classList.add('open');
                });
                grid.appendChild(card);
            });
        });
    }
    load();
    function openFolio() {
        vv.scrollTop = 0;
        document.body.classList.add('visitors-open');
        sfx('paper-unroll');
        vv.querySelector('.vv-close').focus({ preventScroll: true });
    }
    function closeFolio() { zoom.classList.remove('open'); document.body.classList.remove('visitors-open'); }
    folio.addEventListener('click', openFolio);
    folio.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFolio(); } });
    vv.querySelector('.vv-close').addEventListener('click', closeFolio);
    zoom.addEventListener('click', function () { zoom.classList.remove('open'); });
    vv.addEventListener('click', function (e) { if (e.target === vv || e.target.classList.contains('vv-inner')) closeFolio(); });

    /* ---------------- the easel you paint on (or, on a page without one, a button) ---------------- */
    var easel = document.querySelector('[data-paint]'), btn;
    if (easel) {
        btn = easel;
        easel.setAttribute('role', 'button');
        easel.setAttribute('tabindex', '0');
        easel.setAttribute('aria-label', 'paint here: leave some art for the workshop');
        easel.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    } else {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ui-button art-btn';
        btn.innerHTML = '<span class="ui-icon" data-asset="assets/ui/leave-art"><svg class="placeholder" viewBox="0 0 32 32" aria-hidden="true">' +
            '<path d="M16 4 C8 4 3 9.5 3 16 C3 23 8.5 28 14 28 C16.5 28 17 26.5 16.5 25 C16 23.2 17 22 19 22 H22 C26 22 29 19.5 29 15 C29 9 23.5 4 16 4 Z" fill="#eadcb9" stroke="#6e5236" stroke-width="1"/>' +
            '<circle cx="9.5" cy="15" r="2.4" fill="#9a3b1f"/><circle cx="12.5" cy="9.5" r="2.4" fill="#e8b33c"/><circle cx="19" cy="8.5" r="2.4" fill="#6f8f4e"/><circle cx="24" cy="13" r="2.4" fill="#36526a"/></svg></span><span>leave some art</span>';
        document.body.appendChild(btn);
    }

    /* ---------------- the painting desk: the painting app (sky/paint.js), or a picture of your own ---------------- */
    var st = document.createElement('div');
    st.className = 'studio';
    st.setAttribute('role', 'dialog');
    st.setAttribute('aria-label', 'leave some art for the workshop');
    st.innerHTML =
        '<div class="st-desk">' +
            '<h2>leave some art for the workshop</h2>' +
            '<div class="st-bar">' +
                '<button type="button" class="m-paint" aria-pressed="true">✐ paint</button>' +
                '<label class="m-upload">▣ upload a picture<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden></label>' +
            '</div>' +
            '<div class="st-paint"></div>' +
            '<div class="st-sheet st-upload"><div class="st-drop"><span>click to choose a picture, or drop one here<br><small>png, jpg, gif or webp, under 1 MB</small></span><img alt="your picture"></div></div>' +
            '<div class="st-fields"><input type="text" class="f-title" maxlength="50" placeholder="its title (optional)">' +
                '<input type="text" class="f-name" maxlength="40" placeholder="your name (optional)">' +
                '<input class="st-hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true"></div>' +
            '<div class="st-msg" role="status"></div>' +
            '<div class="st-actions"><button type="button" class="no">never mind</button><button type="button" class="go">send it to the workshop</button></div>' +
        '</div>';
    document.body.appendChild(st);
    // (its look is in sky/css/studio.css, linked from each page's head)

    var sheet = st.querySelector('.st-upload');
    var drop = st.querySelector('.st-drop'), dropImg = drop.querySelector('img'), fileIn = st.querySelector('.m-upload input');
    var msg = st.querySelector('.st-msg'), goBtn = st.querySelector('.go'), titleIn = st.querySelector('.f-title'), nameIn = st.querySelector('.f-name');
    var honey = st.querySelector('.st-hp');
    var upload = null;

    function say(t) { msg.textContent = t || ''; }
    function refresh() { goBtn.disabled = st.classList.contains('uploading') ? !upload : painter.isEmpty(); }
    var painter = Sky.paint(st.querySelector('.st-paint'), { width: W, height: H, paper: PAPER, onChange: function () { if (painter) refresh(); }, say: say });
    function setMode(up) {
        st.classList.toggle('uploading', up);
        st.querySelector('.m-paint').setAttribute('aria-pressed', String(!up));
        st.querySelector('.m-upload').setAttribute('aria-pressed', String(up));
        painter.active = !up && document.body.classList.contains('art-open');
        say('');
        refresh();
        if (!up) requestAnimationFrame(painter.fit);
    }
    st.querySelector('.m-paint').addEventListener('click', function () { setMode(false); });

    /* ---------------- or a picture of their own ---------------- */
    function takeFile(file) {
        setMode(true);
        if (!file) return;
        if (!TYPES[file.type]) { say('that isn’t a png, jpg, gif or webp picture.'); return; }
        if (file.size > LIMIT) { say('that picture is ' + (file.size / 1048576).toFixed(1) + ' MB; it has to be under 1 MB. (try saving it smaller, or as a jpg)'); return; }
        upload = file;
        if (dropImg.src) URL.revokeObjectURL(dropImg.src);
        dropImg.src = URL.createObjectURL(file);
        drop.classList.add('has-pic');
        if (!titleIn.value) titleIn.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 50);
        say('');
        refresh();
    }
    fileIn.addEventListener('change', function () { takeFile(fileIn.files[0]); fileIn.value = ''; });
    st.querySelector('.m-upload').addEventListener('click', function () { setMode(true); });
    drop.addEventListener('click', function () { fileIn.click(); });
    sheet.addEventListener('dragover', function (e) { e.preventDefault(); sheet.classList.add('dragover'); });
    sheet.addEventListener('dragleave', function () { sheet.classList.remove('dragover'); });
    sheet.addEventListener('drop', function (e) {
        e.preventDefault();
        sheet.classList.remove('dragover');
        if (e.dataTransfer.files[0]) takeFile(e.dataTransfer.files[0]);
    });

    /* ---------------- open & close ---------------- */
    var toastEl = document.createElement('div');
    toastEl.className = 'st-toast';
    toastEl.setAttribute('role', 'status');
    document.body.appendChild(toastEl);
    var toastTimer = 0;
    function toast(t, ms) {
        toastEl.textContent = t;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 6000);
    }
    function lastSent() { try { return +localStorage.getItem('art-sent') || 0; } catch (e) { return 0; } }
    function open() {
        var wait = lastSent() + WAIT - Date.now();
        if (wait > 0) { toast('your last piece is still on its way. you can send another in ' + Math.ceil(wait / 60000) + ' minutes.'); return; }
        st.classList.remove('sending');
        document.body.classList.add('art-open');
        setMode(false);
    }
    function close() {
        document.body.classList.remove('art-open');
        painter.active = false;
        btn.focus({ preventScroll: true });
    }
    function reset() {
        painter.reset(); upload = null;
        if (dropImg.src) URL.revokeObjectURL(dropImg.src);
        dropImg.removeAttribute('src'); drop.classList.remove('has-pic');
        titleIn.value = ''; nameIn.value = '';
        say(''); refresh();
    }
    btn.addEventListener('click', open);
    st.querySelector('.no').addEventListener('click', function () {
        if (!painter.isEmpty() && !st.classList.contains('uploading') && !confirm('put the painting away? (it’ll still be here if you come back before leaving the page)')) return;
        close();
    });
    st.addEventListener('pointerdown', function (e) { if (e.target === st && painter.isEmpty()) close(); });
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (document.body.classList.contains('art-open')) { e.stopImmediatePropagation(); close(); }
        else if (document.body.classList.contains('visitors-open')) { e.stopImmediatePropagation(); if (zoom.classList.contains('open')) zoom.classList.remove('open'); else closeFolio(); }
    }, true);

    /* ---------------- sending it ---------------- */
    function slug(t) {
        return (t || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    }
    function painting() { return painter.toBlob(LIMIT); }            // the painting, flattened: a png (or a jpg, if a png won't fit)
    function send(blob, filename) {                                     // to your post office (Supabase), or by FormSubmit (see sky/sky.js)
        return Sky.sendPost({ kind: 'art', from: nameIn.value.trim(), title: titleIn.value.trim(), file: blob, filename: filename });
    }

    goBtn.addEventListener('click', function () {
        if (goBtn.disabled) return;
        if (honey.value) { close(); return; }                           // a bot filled the hidden field
        var up = st.classList.contains('uploading');
        goBtn.disabled = true;
        (up ? Promise.resolve(upload) : painting()).then(function (blob) {
            if (!blob || blob.size > LIMIT) { say('that’s over 1 MB, too big to send. (try fewer details, or a smaller picture)'); goBtn.disabled = false; return; }
            var ext = up ? TYPES[blob.type] : (blob.type === 'image/png' ? '.png' : '.jpg');
            var name = new Date().toISOString().slice(0, 10) + '-' + (slug(titleIn.value) || 'untitled') + (slug(nameIn.value) ? '-by-' + slug(nameIn.value) : '') + ext;
            var delivered = send(blob, name);
            delivered.then(function (how) { if (how === 'sent') try { localStorage.setItem('art-sent', String(Date.now())); } catch (e) {} });
            tuckAway(up ? dropImg.src : painter.toDataURL(), delivered, up ? sheet : st.querySelector('.pt-stage'));
        });
    });

    // the sheet slides into the portfolio by the bench
    function tuckAway(src, delivered, sheet) {
        painter.active = false;
        st.classList.add('sending');
        var r = sheet.getBoundingClientRect(), f = folio.getBoundingClientRect();
        var fly = document.createElement('img');
        fly.className = 'st-flying';
        fly.src = src;
        fly.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;background:' + PAPER + ';object-fit:contain;';
        document.body.appendChild(fly);
        sheet.style.visibility = 'hidden';
        var k = Math.min(1, (f.width * 0.7) / r.width);
        var dx = f.left + f.width / 2 - (r.left + r.width / 2), dy = f.top + f.height * 0.25 - (r.top + r.height / 2);
        setTimeout(function () { document.body.classList.remove('art-open'); }, 350);
        sfx('paper-roll');
        var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var anim = fly.animate([
            { transform: 'none', opacity: 1 },
            { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 60) + 'px) scale(' + (0.5 + k / 2) + ') rotate(-8deg)', opacity: 1, offset: 0.55 },
            { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + k + ') rotate(-4deg)', opacity: 1, offset: 0.85 },
            { transform: 'translate(' + dx + 'px,' + (dy + f.height * 0.3) + 'px) scale(' + k + ') rotate(-4deg)', opacity: 0 }
        ], { duration: calm ? 10 : 1500, easing: 'cubic-bezier(.4,0,.3,1)' });
        anim.onfinish = function () {
            fly.remove();
            sheet.style.visibility = '';
            sfx('portfolio');
            if (!calm) folio.animate([{ transform: 'none' }, { transform: 'translateY(2px) scaleY(.97)' }, { transform: 'none' }], { duration: 320 });
            reset();
            st.classList.remove('sending');
            Promise.resolve(delivered).then(function (how) {
                toast(how === 'sent' ? 'sent! if it’s kept, you’ll find it in the visitors’ portfolio here by the bench.'
                    : how === 'failed' ? 'it couldn’t be sent just now. try again a little later?'
                    : 'it’s tucked away… (the post office here isn’t open yet, so it won’t reach anyone)', 7000);
            });
        };
    }
})();

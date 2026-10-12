/* =====================================================================
   songpad.js — put a song of your own in a letter (the desk and the
   content manager's letters page: their "♫ a song…" button).

   A little card asks for the song (.mp3 or .ogg), a picture for its
   sleeve if you like, its name, and how the reader gets it:
     - a record in the letter, to play there (and, if you tick it, starting
       by itself as soon as the letter's opened), or
     - a record that falls out of the letter as it's opened: it starts
       playing as it falls, and it's theirs, in their record player, from
       then on.
   It hands back what was chosen; the page puts the files where it keeps
   them and writes the line (DavEmbed.songLine, sky/embeds.js):
       ▶ ♫ [Aerie](content/sea/2026-10-11-aerie.mp3 content/sea/2026-10-11-aerie.jpg) → record player

   DavSong.open({ was: a song already in the letter (DavEmbed.song), where(path) → its address here, done(choice), cancel() })
   choice: { title, file: the new song (or null: the same one), sleeveFile: a new sleeve picture (or null),
             sleeve: the sleeve it keeps (its path, or '' for a plain one), autoplay, gift }
   ===================================================================== */
(function () {
    var SONGS = /\.(mp3|ogg)$/i, PICS = /\.(png|jpe?g|gif|webp)$/i;
    var SONG_LIMIT = 30 * 1024 * 1024, PIC_LIMIT = 4 * 1024 * 1024;

    function esc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function titleOf(name) {
        return name.replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/^\d+[-_. ]+/, '').replace(/[-_]+/g, ' ').trim() || 'a song';
    }

    function open(o) {
        o = o || {};
        var now = o.was || null, song = null, sleeve = null, keepSleeve = !!(now && now.sleeve), sleeveUrl = now && now.sleeve ? (o.where ? o.where(now.sleeve) : now.sleeve) : '';
        var root = document.createElement('div');
        root.className = 'song-pad';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-label', 'a song in the letter');
        root.innerHTML =
            '<div class="sp-card">' +
                '<h2>' + (now ? 'the song in the letter' : 'a song in the letter') + '</h2>' +
                '<div class="sp-row">' +
                    '<label class="sp-sleeve" title="a picture for its sleeve (optional)">' +
                        '<span class="sp-disc"></span><span class="sp-cover"></span>' +
                        '<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden>' +
                    '</label>' +
                    '<div class="sp-fields">' +
                        '<label class="sp-file"><span class="sp-btn">' + (now ? 'a different song…' : 'choose the song…') + '</span><small class="sp-name">' +
                            (now ? esc(now.src.split('/').pop()) : '.mp3 or .ogg, up to 30 MB') + '</small><input type="file" accept="audio/mpeg,audio/ogg,.mp3,.ogg" hidden></label>' +
                        '<label class="sp-title-row">its name<input type="text" class="sp-title" maxlength="80" placeholder="the song’s name" value="' + esc(now ? now.title : '') + '"></label>' +
                        '<p class="sp-small">click the sleeve to give it a picture' + (keepSleeve ? ' (or <button type="button" class="sp-plain">a plain one</button>)' : '') + '.</p>' +
                    '</div>' +
                '</div>' +
                '<fieldset class="sp-how"><legend>how the reader gets it</legend>' +
                    '<label><input type="radio" name="sp-how" value="letter"' + (now && now.gift ? '' : ' checked') + '> <b>a record in the letter</b>, to play right there</label>' +
                    '<label class="sp-sub"><input type="checkbox" class="sp-auto"' + (now && now.autoplay ? ' checked' : '') + '> it starts playing by itself as soon as the letter’s opened</label>' +
                    '<label><input type="radio" name="sp-how" value="gift"' + (now && now.gift ? ' checked' : '') + '> <b>it falls out of the letter</b> as it’s opened, starts playing, ' +
                        'and goes into their record player to keep</label>' +
                '</fieldset>' +
                '<p class="sp-say" aria-live="polite"></p>' +
                '<div class="sp-actions"><button type="button" class="sp-cancel">cancel</button><button type="button" class="sp-ok">put it in the letter</button></div>' +
            '</div>';
        document.body.appendChild(root);
        var $ = function (s) { return root.querySelector(s); };
        var titleIn = $('.sp-title'), say = $('.sp-say'), auto = $('.sp-auto');
        var color = '#9a3b1f';

        function draw() {
            var pic = sleeve ? URL.createObjectURL(sleeve) : keepSleeve ? sleeveUrl : '';
            $('.sp-cover').innerHTML = pic ? '<img src="' + esc(pic) + '" alt="">' : '<span class="sp-plain-cover">' + esc(titleIn.value || 'a song') + '</span>';
            $('.sp-disc').innerHTML = window.DavEmbed ? DavEmbed.discSvg(color, pic) : '';
            var gift = $('input[value=gift]').checked;
            auto.disabled = gift;
            auto.parentNode.classList.toggle('off', gift);
            $('.sp-ok').disabled = !song && !now;
        }
        $('.sp-file input').addEventListener('change', function () {
            var f = this.files[0];
            this.value = '';
            if (!f) return;
            if (!SONGS.test(f.name)) { say.textContent = 'the site plays .mp3 and .ogg songs: that one’s ' + (f.name.split('.').pop() || 'something else') + '.'; return; }
            if (f.size > SONG_LIMIT) { say.textContent = 'that song is over 30 MB: the site can’t take a file that big.'; return; }
            song = f;
            say.textContent = '';
            $('.sp-name').textContent = f.name + ' · ' + (f.size / 1048576).toFixed(1) + ' MB';
            if (!titleIn.value.trim() || (now && titleIn.value === now.title)) titleIn.value = titleOf(f.name);
            draw();
        });
        $('.sp-sleeve input').addEventListener('change', function () {
            var f = this.files[0];
            this.value = '';
            if (!f) return;
            if (!PICS.test(f.name)) { say.textContent = 'a sleeve can be a png, jpg, gif or webp.'; return; }
            if (f.size > PIC_LIMIT) { say.textContent = 'that picture is over 4 MB: save it smaller first.'; return; }
            sleeve = f;
            say.textContent = '';
            draw();
        });
        var plain = $('.sp-plain');
        if (plain) plain.addEventListener('click', function (e) { e.preventDefault(); keepSleeve = false; sleeve = null; plain.parentNode.remove(); draw(); });
        titleIn.addEventListener('input', draw);
        Array.prototype.forEach.call(root.querySelectorAll('input[name=sp-how]'), function (r) { r.addEventListener('change', draw); });

        function close() { window.removeEventListener('keydown', keys, true); root.remove(); }
        function keys(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); if (o.cancel) o.cancel(); } }
        window.addEventListener('keydown', keys, true);
        $('.sp-cancel').addEventListener('click', function () { close(); if (o.cancel) o.cancel(); });
        root.addEventListener('click', function (e) { if (e.target === root) { close(); if (o.cancel) o.cancel(); } });
        $('.sp-ok').addEventListener('click', function () {
            if (!song && !now) return;
            var gift = $('input[value=gift]').checked;
            close();
            o.done({ title: (titleIn.value || '').trim().replace(/[\[\]]/g, '') || (song ? titleOf(song.name) : 'a song'), file: song, sleeveFile: sleeve,
                     sleeve: keepSleeve && !sleeve && now ? now.sleeve : '', autoplay: !gift && auto.checked, gift: gift });
        });
        draw();
        if (now) titleIn.focus();
        else $('.sp-file input').click();                  // (the song first: straight to picking it)
    }

    window.DavSong = { open: open, titleOf: titleOf };
})();

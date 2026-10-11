/* =====================================================================
   hand.js — the letters, written in your own handwriting.

   Once your handwriting's been made into a font (tools/handwriting.py: the
   slot assets/fonts/handwriting in the asset manager, with the letters, in
   the sea's scene), this loads it and puts "has-hand" on the page, and
   sky/paper.css writes the letters in it: the words, the date and the
   subtitle. The titles stay in the site's own lettering (IM Fell).
   Nothing there yet: the letters stay as they are, and nothing's fetched
   but the folder's list.

   On the pages with letters: the sea (index.html), the desk (desk.html) and
   the letter writer (tools/letters.html).
   ===================================================================== */
(function () {
    var me = document.currentScript && document.currentScript.src;
    var base = me ? new URL('../assets/fonts/', me).href : 'assets/fonts/';
    var NAMES = ['handwriting.woff2', 'handwriting.woff', 'handwriting.ttf', 'handwriting.otf'];
    var ready = fetch(base + 'list.txt', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
        var have = {};
        t.split(/\r?\n/).forEach(function (n) { have[n.trim()] = 1; });
        var name = NAMES.filter(function (n) { return have[n]; })[0];
        if (!name || !window.FontFace) return false;
        var face = new FontFace('dav-hand', 'url("' + base + name + '")', { display: 'swap' });
        return face.load().then(function (f) {
            document.fonts.add(f);
            document.documentElement.classList.add('has-hand');        // (only once it's in: no blank letters while it loads)
            return true;
        });
    }).catch(function () { return false; });
    window.DavHand = { ready: ready };
})();

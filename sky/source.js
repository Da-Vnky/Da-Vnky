/* =====================================================================
   source.js — reset 8, the source: the truth (5 Oct). after the veil, the
   watchers and the loop, the world stops pretending. it's black and white,
   the painted sky has worn through to what it was written on (the site's
   own code, running past), and every thing in it wears its name: the
   name it has in the source (the slot it's drawn from: living/turntable,
   characters/city …), the way the world looks to whoever wrote it.

   the end of reset 8 (the serpent, the Demiurge, the choice): sky/gnosis.js.
   once the Demiurge is blind, sky/gnosis.js lifts the grey (Sky.source.lift).

   its look: sky/css/source.css (the grey is one see-through veil over
   everything, so nothing underneath needs to know)
   ===================================================================== */

(function () {
    var Sky = window.Sky, S = window.davSave;
    if (!Sky || !S || Sky.source) return;
    var body = document.body;
    if (S.reset !== 8 || S.free) { Sky.source = {}; return; }        // (stayed, at the end: the world in its colours again)

    // the grey: over everything, takes no clicks
    var veil = document.createElement('div');
    veil.className = 'source-veil';
    veil.setAttribute('aria-hidden', 'true');
    body.appendChild(veil);

    // the sky, worn through: the code it was written in, running up past it
    var skybox = document.querySelector('.skybox');
    if (skybox) {
        var pre = document.createElement('pre');
        pre.className = 'source-code';
        pre.setAttribute('aria-hidden', 'true');
        skybox.appendChild(pre);
        var fill = function (t) { var lines = t.split('\n').slice(0, 900).join('\n'); pre.textContent = lines + '\n\n' + lines; };   // (twice: it runs round)
        if (Sky.veil && Sky.veil.code) Sky.veil.code(fill);
        else fetch('sky/sky.js').then(function (r) { return r.ok ? r.text() : ''; }).then(fill).catch(function () {});
    }

    // every thing, with its name (the slot it's drawn from) on it
    var SKIP = '.cp, .place-tabs, .hotbar, .lives, .signpost, .peep-ui, .pomo-panel, .records, .post, .studio, .mc-say, .source-veil, .moonlight, .demiurge, .dm-dark, .gn-answers, .gn-door, .gn-choice, .gnosis';
    function nameOf(el) {
        var n = (el.dataset.asset || '').split('|')[0].replace(/^assets\//, '');
        return n ? '<' + n + '>' : '';
    }
    function tagAll() {
        document.querySelectorAll('[data-asset]').forEach(function (el) {
            if (el.dataset.srcTagged || /^(svg|img|image|g|path)$/i.test(el.tagName) || el.closest(SKIP)) return;
            var r = el.getBoundingClientRect();
            if (r.width < 28 || r.height < 18) return;
            var n = nameOf(el);
            if (!n) return;
            el.dataset.srcTagged = '1';
            if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
            var t = document.createElement('span');
            t.className = 'src-tag';
            t.setAttribute('aria-hidden', 'true');
            t.textContent = n;
            el.appendChild(t);
        });
    }
    setTimeout(tagAll, 1200);
    setInterval(tagAll, 4000);                                  // (things that turn up later: a room sliding in, a bottle)
    document.documentElement.classList.add('source-view');

    // the Demiurge gone blind (sky/gnosis.js): the code stops, the grey fades off, the names go
    function lift() {
        document.documentElement.classList.add('source-lifting');
        setTimeout(function () { veil.remove(); document.querySelectorAll('.src-tag').forEach(function (t) { t.remove(); }); document.documentElement.classList.remove('source-view'); }, 5200);
    }
    Sky.source = { tag: tagAll, lift: lift };
})();

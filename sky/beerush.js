/* =====================================================================
   beerush.js — "I'm just here for the bee" (12 Oct). For a while only: the
   bee's going round on Twitter, and people are coming for it.

   In the front garden (living.html#front), a paper tag in the sky's corner,
   for a new visitor (reset 1, where everyone starts) who hasn't got the
   revolver yet: one click and it's in their hand, ready to point at the
   bee (sky/bee.js does the rest). It isn't there if the revolver's
   already in their bag, or the bee has it, or it's been stung to pieces.
   It goes the moment they take it.

   Switching it off: ON = false below (or take this file and
   sky/css/beerush.css out of living.html).
   ===================================================================== */
(function () {
    var ON = true;
    if (!ON || !window.Sky || !Sky.inventory) return;
    var I = Sky.inventory, body = document.body;

    // the ordinary revolver, not anywhere else yet (sky/revolver.js keeps the same rules)
    function free() {
        var S = window.davSave;
        if (!S || S.reset !== 1 || I.has('revolver')) return false;
        try {
            if (localStorage.getItem('revolver-gone')) return false;
            if (sessionStorage.getItem('bee-gun') === 'revolver') return false;
            if ((' ' + (sessionStorage.getItem('bee-broke') || '') + ' ').indexOf(' revolver ') !== -1) return false;
        } catch (e) {}
        return true;
    }

    var tag = document.createElement('button');
    tag.type = 'button';
    tag.className = 'bee-rush';
    tag.setAttribute('aria-label', 'I’m just here for the bee: take the revolver');
    tag.innerHTML = '<span class="br-gun" aria-hidden="true"></span><span class="br-words">I’m just here for the bee</span>';
    body.appendChild(tag);
    function dress() { var gun = tag.querySelector('.br-gun'); if (!gun.innerHTML) gun.innerHTML = I.art('revolver') || ''; }

    function check() {
        var on = free();
        body.classList.toggle('bee-rush-on', on);
        if (on) dress();
    }
    tag.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!free()) { check(); return; }
        I.add('revolver', { quiet: true });
        I.hold('revolver');
        if (Sky.sfx) Sky.sfx('reload', { or: 'pickup' });
        I.say('the revolver’s in your hand. the bee is right there.', 4200);
        tag.classList.add('taken');
        setTimeout(function () { tag.classList.remove('taken'); check(); }, 700);
    });
    check();
    setInterval(check, 1500);      // (the bee can take it, or give it back)

    Sky.beeRush = { check: check };
})();

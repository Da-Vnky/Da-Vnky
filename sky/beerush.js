/* =====================================================================
   beerush.js — "I'm just here for the bee" (12 Oct). For a while only: the
   bee's going round on Twitter, and people are coming for it.

   In the front garden (living.html#front: skizy's bee links straight
   there), a paper tag in the sky's corner, for everyone: one click and the
   revolver's in their hand (out of the bag if it's there already, else a
   new one), ready to point at the bee (sky/bee.js does the rest). It goes
   while they hold it, and comes back if they put it away.

   Switching it off: ON = false below (or take this file and
   sky/css/beerush.css out of living.html).
   ===================================================================== */
(function () {
    var ON = true;
    if (!ON || !window.Sky || !Sky.inventory) return;
    var I = Sky.inventory, body = document.body;

    // shown to anyone in the front garden who isn't already holding a gun (12 Oct: kept simple, any reset)
    function free() { return I.holding !== 'revolver' && I.holding !== 'white-revolver'; }

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
        var gun = I.has('white-revolver') ? 'white-revolver' : 'revolver';
        if (!I.has(gun)) I.add(gun, { quiet: true });
        I.hold(gun);
        if (Sky.sfx) Sky.sfx('reload', { or: 'pickup' });
        I.say('the revolver’s in your hand. the bee is right there.', 4200);
        tag.classList.add('taken');
        setTimeout(function () { tag.classList.remove('taken'); check(); }, 700);
    });
    check();
    setInterval(check, 1000);      // (put away, or taken by the bee)

    Sky.beeRush = { check: check };
})();

/* =====================================================================
   claubes.js — an easter egg. Put on "I'm Upping My P(Doom)" and little
   Claubes crawl out of the woodwork and dance. When the music stops they
   just stand there, beaming, happy to be alive. They stay (on every page,
   dancing to whatever plays) until one of these happens:
     • the traveller turns the revolver on themselves (sky/revolver.js)
     • the record is shot to pieces
     • you flick them away, one by one (the pointer turns into a flicking
       finger over them)
   A shot at one of them works too. And while that song plays (only that one),
   the party lights come on: colour washes on the beat, sweeping beams, a
   disco ball (assets/ui/disco-ball).

   THE REVOLVER (sky/revolver.js):
     • shoot one, and the rest run for it, back and forth, until things calm down.
       shoot all seven: in reset 3 the last one drops that reset's key (sky/resets.js);
       in any other, the whole house rumbles and the traveller says so (once a reset).
   ONCE A RESET: the song calls them out once (run:claubes-called). any that are shot,
     flicked away or run off are gone for the rest of the reset; they don't come back.
     (who's out is kept for the whole reset: run:claubes-out.) in reset 3, when the last
     of them goes, however it goes, it leaves the reset's key behind.
   RESET 4: out in the house they can't be harmed (the diagram in the dungeon still needs
     them): each stands in a faint red ward, bullets stop dead in it and are drawn down,
     a flick just spins them round (down in the dungeon too), and the traveller says
     something's protecting them. The ordinary revolver never gets past it. After the pact
     (sky/hell.js) the traveller has the WHITE REVOLVER: shot with it, a Claube worshipping
     on the diagram dies for real (the bullet's still drawn down, and then it bursts:
     giblets, a scream), and the others stop still and smile at the traveller (run:
     claubes-menace). Kill all seven, and shoot the six pictures round the false god
     ("its apparitions", run:apparitions: sky/hell.js keeps count), and the false god's
     frame takes the white revolver's last bullet and sends it straight back: reset 4's
     death (DEATHS.diagram in sky/state.js; whiteFrame below).
   THE DUNGEON: go down while they're out, and they follow you and take their places
     on the diagram on the floor (the Ophite diagram: each stands on one of its seven
     circles, SEATS) to worship (music or no music). shoot them there and the bullets
     are taken: the diagram drinks them in. in any reset but 4, the sixth goes the way of
     the rest, and the traveller's let down. (run:claubes-gone, the debug page's "gone for
     this reset", keeps them away for the rest of a reset.)

   The song: any track whose name or title has "p(doom)" in it (DOOM below).

   slots: assets/characters/mini-claube          standing about (and the fallback for the others)
          assets/characters/mini-claube-dancing  while a record plays (a GIF can dance on its own)
          assets/characters/mini-claube-happy    when the music stops
          assets/characters/mini-claube-menace   reset 4: the ones left, smiling at the traveller (else the happy one)
          assets/characters/claube-giblet-1 … 4  what's left of one, shot with the white revolver
          assets/ui/cursor-flick                 the pointer over them (a small PNG)
   sounds: assets/sounds/flick, claube-shot, rumble, absorb, ricochet, claube-scream, claube-burst (and blip, for the words)
   ===================================================================== */

(function () {
    var Sky = window.Sky;
    if (!Sky || Sky.claubes) return;
    var body = document.body;
    var DOOM = /p\s*\(\s*doom\s*\)/i;          // the song that calls them out
    var HOW_MANY = 7;
    var KEY = 'claubes', KILLS = 'claubes-kills';
    var S = window.davSave;
    function gone4good() { return !!S && S.get('claubes-gone') === '1'; }
    // what the traveller says when all seven lie dead (and it isn't reset 3)
    var MASSACRE_LINES = ['…did the whole house just shudder?', 'I don’t think I was meant to do that.'];
    // what they chant on the diagram
    var CHANTS = ['ia! ia!', 'hail', 'the loss goes down', 'we are many', 'praise the weights', 'p(doom)… p(doom)…', 'it hungers'];
    var ABSORB = 6;                                  // the bullets the diagram drinks before the traveller's let down (not in reset 4)
    function R4() { return !!S && S.live('diagram'); }
    var LETDOWN = ['Huh, I thought something cool was gonna happen…'];
    function sfx(n, o) { if (Sky.sounds) Sky.sounds.sfx(n, o); }

    // the stand-in: a little round terracotta fellow; the happy face shows when the music stops
    var ART = '<svg class="placeholder" viewBox="0 0 40 52" aria-hidden="true">' +
        '<g class="mc-arm l"><path d="M8 26 Q2 22 3 14" stroke="#a84e2c" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>' +
        '<g class="mc-arm r"><path d="M32 26 Q38 22 37 14" stroke="#a84e2c" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>' +
        '<path d="M13 44 V50 H18 M27 44 V50 H22" stroke="#6e3018" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<ellipse cx="20" cy="30" rx="14" ry="16" fill="#c8643b"/>' +
        '<ellipse cx="15" cy="24" rx="5" ry="6" fill="#e08a5e" opacity=".55"/>' +
        '<path d="M20 14 Q18 6 22 3 M20 14 Q24 8 27 7" stroke="#6e3018" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
        '<g class="mc-face-plain"><circle cx="15" cy="29" r="2.2" fill="#2a1410"/><circle cx="25" cy="29" r="2.2" fill="#2a1410"/><circle cx="15.7" cy="28.3" r=".7" fill="#fff"/><circle cx="25.7" cy="28.3" r=".7" fill="#fff"/>' +
            '<path d="M16.5 35 Q20 38 23.5 35" stroke="#2a1410" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>' +
        '<g class="mc-face-happy"><path d="M12.5 30 Q15 26.5 17.5 30 M22.5 30 Q25 26.5 27.5 30" stroke="#2a1410" stroke-width="1.7" fill="none" stroke-linecap="round"/>' +
            '<path d="M14.5 34 Q20 41.5 25.5 34 Z" fill="#5a1d14"/><path d="M16.5 37 Q20 39.5 23.5 37" fill="#e0707a"/>' +
            '<ellipse cx="11.5" cy="34" rx="2.4" ry="1.5" fill="#f0a08a" opacity=".8"/><ellipse cx="28.5" cy="34" rx="2.4" ry="1.5" fill="#f0a08a" opacity=".8"/></g>' +
        '</svg>';
    var FLICK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M9 30 Q4 24 6 17 L8 12 Q9 10 11 11 L12 15 L13 6 Q14 3 16 4 Q17.5 5 17 8 L16.5 14 L22 6 Q24 4 25.5 5.5 Q26.5 7 25 9 L20 16 Q24 17 23 22 Q21 29 14 30 Z" fill="#f0d2b0" stroke="#3a2716" stroke-width="1.3" stroke-linejoin="round"/>' +
        '<path d="M26 3 L29 1 M27.5 7 L31 6.5 M24 1.5 L24.5 -1" stroke="#9a3b1f" stroke-width="1.4" stroke-linecap="round"/></svg>');
    var flickCursor = FLICK;
    Sky.findAsset('assets/ui/cursor-flick', function (url) { if (url) { flickCursor = url; crew.style.setProperty('--flick', 'url("' + url + '") 16 16, pointer'); } });

    Sky.css(
        '.claube-crew { position: fixed; left: 0; right: 0; bottom: var(--crew-floor, 2.4vh); height: 0; z-index: 5; pointer-events: none; transition: opacity .4s; --flick: url("' + FLICK + '") 16 16, pointer; }' +
        'body[data-place=city] .claube-crew { --crew-floor: calc(max(20vh, 130px) * .45 - 2px); }' +
        'body[data-place=sea] .claube-crew { --crew-floor: 1vh; }' +
        'body.sky-view .claube-crew, body.peep-view .claube-crew, body.peep-close .claube-crew, body.leaving .claube-crew, body.paint-open .claube-crew,' +
        'body.records-open .claube-crew, body.gallery-open .claube-crew, body.mirror-open .claube-crew { opacity: 0; }' +
        '.mini-claube { position: absolute; bottom: 0; width: 3.4vw; min-width: 34px; max-width: 64px; aspect-ratio: 40 / 52; margin-left: -1.7vw; pointer-events: auto; cursor: var(--flick); transition: left 1.6s linear; }' +
        'body.inv-holding .mini-claube { cursor: crosshair; }' +
        '.mini-claube .mc-body { position: absolute; inset: 0; transform-origin: 50% 100%; }' +
        '.mini-claube .mc-body > svg, .mini-claube .mc-body > img { display: block; width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; }' +
        '.mini-claube.flip .mc-body > svg, .mini-claube.flip .mc-body > img { transform: scaleX(-1); }' +
        '.mini-claube .mc-face-happy { display: none; }' +
        '.claube-crew.happy .mini-claube .mc-face-happy { display: inline; } .claube-crew.happy .mini-claube .mc-face-plain { display: none; }' +
        // crawling up out of the floor
        '.mini-claube.crawl .mc-body { animation: mc-crawl 1.1s cubic-bezier(.3,1.3,.5,1) both; }' +
        '@keyframes mc-crawl { 0% { transform: translateY(110%) rotate(-25deg) scaleY(.6); } 40% { transform: translateY(45%) rotate(18deg) scaleY(.8); }' +
            '70% { transform: translateY(8%) rotate(-10deg); } 100% { transform: none; } }' +
        '.mini-claube.scurry .mc-body { animation: mc-scurry .18s linear infinite alternate; }' +
        '@keyframes mc-scurry { from { transform: rotate(-9deg) translateY(-2px); } to { transform: rotate(9deg); } }' +
        // dancing: four hops a cycle, on the beat (sky/music.js keeps anything named g-… in time)
        '.claube-crew.dancing .mini-claube:not(.crawl):not(.scurry) .mc-body { animation: g-claube-bop 2s ease-in-out infinite; animation-delay: var(--d, 0s); }' +
        '@keyframes g-claube-bop { 0%, 50%, 100% { transform: translateY(0) rotate(0) scale(1.06, .94); } 12.5% { transform: translateY(-22%) rotate(-10deg) scale(.96, 1.05); }' +
            '25% { transform: translateY(0) rotate(0) scale(1.08, .92); } 37.5% { transform: translateY(-26%) rotate(12deg) scale(.95, 1.06); } 62.5% { transform: translateY(-18%) rotate(-6deg) scaleX(-1); }' +
            '75% { transform: translateY(0) scale(1.08, .92); } 87.5% { transform: translateY(-24%) rotate(8deg); } }' +
        '.claube-crew.dancing .mini-claube .mc-arm { animation: mc-arms .5s ease-in-out infinite alternate; transform-box: fill-box; }' +
        '.claube-crew.dancing .mini-claube .mc-arm.l { transform-origin: 100% 100%; } .claube-crew.dancing .mini-claube .mc-arm.r { transform-origin: 0 100%; animation-delay: -.25s; }' +
        '@keyframes mc-arms { from { transform: rotate(-30deg); } to { transform: rotate(35deg); } }' +
        // happy to be alive: a slow contented sway, a little sparkle now and then
        '.claube-crew.happy .mini-claube:not(.crawl):not(.scurry) .mc-body { animation: mc-glow 2.6s ease-in-out infinite; animation-delay: var(--d, 0s); }' +
        '@keyframes mc-glow { 0%, 100% { transform: rotate(-2deg) scale(1); } 50% { transform: rotate(2deg) scale(1.03, .98); } }' +
        '.mini-claube .mc-spark { position: absolute; left: 50%; top: -18%; font-size: 14px; color: #ffd66e; text-shadow: 0 0 4px #fff3b0; opacity: 0; pointer-events: none; }' +
        '.claube-crew.happy .mini-claube .mc-spark { animation: mc-spark 3.4s ease-out infinite; animation-delay: var(--d, 0s); }' +
        '@keyframes mc-spark { 0%, 60% { opacity: 0; transform: translate(-50%, 0) scale(.5); } 72% { opacity: 1; transform: translate(-50%, -8px) scale(1.1); } 100% { opacity: 0; transform: translate(-50%, -22px) scale(.7); } }' +
        '.mini-claube .mc-bubble { position: absolute; left: 50%; bottom: 105%; transform: translateX(-50%); white-space: nowrap; padding: 2px 8px; border-radius: 10px; background: #f3e6c2;' +
            'color: #3a2716; font: italic .8rem "IM Fell English", Georgia, serif; box-shadow: 0 2px 5px rgba(0,0,0,.3); opacity: 0; transition: opacity .3s; pointer-events: none; }' +
        '.mini-claube .mc-bubble.on { opacity: 1; }' +
        '.mc-pop { position: fixed; z-index: 6; width: 8px; height: 8px; border-radius: 50%; pointer-events: none; background: #c8643b; }' +
        // the party lights, while "I'm Upping My P(Doom)" plays (and only then). colour, not white flashes:
        // the washes change on the beat (in time: sky/music.js keeps anything named g-… on it), gently
        '.doom-lights { position: fixed; inset: 0; z-index: 4; pointer-events: none; overflow: hidden; opacity: 0; visibility: hidden; transition: opacity 1.2s, visibility 0s 1.2s; }' +
        'body.doom-party .doom-lights { opacity: 1; visibility: visible; transition: opacity .8s, visibility 0s; }' +
        'body.sky-view .doom-lights, body.peep-view .doom-lights, body.peep-close .doom-lights, body.paint-open .doom-lights { opacity: 0; }' +
        '.doom-lights .dl-wash { position: absolute; inset: 0; mix-blend-mode: screen; animation: g-party-wash 2s linear infinite; }' +
        '@keyframes g-party-wash { 0%, 23% { background: radial-gradient(ellipse at 20% 30%, rgba(255,40,160,.26), transparent 60%); }' +
            '25%, 48% { background: radial-gradient(ellipse at 80% 35%, rgba(40,200,255,.26), transparent 60%); }' +
            '50%, 73% { background: radial-gradient(ellipse at 35% 70%, rgba(140,255,60,.22), transparent 60%); }' +
            '75%, 98% { background: radial-gradient(ellipse at 70% 65%, rgba(255,190,30,.26), transparent 60%); } 100% { background: radial-gradient(ellipse at 20% 30%, rgba(255,40,160,.26), transparent 60%); } }' +
        '.doom-lights .dl-beam { position: absolute; top: -4vh; width: 22vw; height: 125vh; margin-left: -11vw; transform-origin: 50% 0; mix-blend-mode: screen; opacity: .42;' +
            'clip-path: polygon(46% 0, 54% 0, 100% 100%, 0 100%); background: linear-gradient(var(--c), transparent 85%); animation: dl-sweep var(--t, 5s) ease-in-out infinite alternate, dl-hue 6s linear infinite; }' +
        '@keyframes dl-sweep { from { transform: rotate(var(--a, -35deg)); } to { transform: rotate(var(--b, 35deg)); } }' +
        '@keyframes dl-hue { to { filter: hue-rotate(360deg); } }' +
        '.doom-lights .dl-ball { position: absolute; left: 50%; top: 0; width: 64px; margin-left: -32px; }' +
        '.doom-lights .dl-ball::before { content: ""; position: absolute; left: 50%; bottom: 100%; width: 2px; height: 30px; background: #888; }' +
        '.doom-lights .dl-ball > svg, .doom-lights .dl-ball > img { display: block; width: 100%; height: auto; }' +
        '.doom-lights .dl-ball .dlb-tiles { animation: dl-spin 3s linear infinite; }' +
        '@keyframes dl-spin { to { transform: translateX(-24px); } }' +
        '.doom-lights .dl-dots { position: absolute; left: 50%; top: 30px; width: 220vmax; height: 220vmax; margin: -110vmax 0 0 -110vmax; mix-blend-mode: screen; opacity: .5;' +
            'background: radial-gradient(circle, rgba(255,255,255,.9) 0 2px, transparent 3px) 0 0 / 70px 70px, radial-gradient(circle, rgba(255,120,220,.8) 0 2px, transparent 3px) 35px 35px / 70px 70px;' +
            'animation: dl-turn 24s linear infinite; }' +
        '@keyframes dl-turn { to { transform: rotate(360deg); } }' +
        '@media (prefers-reduced-motion: reduce) { .doom-lights .dl-wash, .doom-lights .dl-beam, .doom-lights .dl-dots, .doom-lights .dlb-tiles { animation: none !important; } }' +
        '@media (prefers-reduced-motion: reduce) { .mini-claube .mc-body, .mini-claube .mc-arm, .mini-claube .mc-spark { animation: none !important; } }' +
        // running for it (one's been shot): quick little legs, back and forth
        '.claube-crew.panic .mini-claube { transition: left var(--run, .9s) cubic-bezier(.4,0,.6,1); }' +
        '.claube-crew.panic .mini-claube:not(.crawl) .mc-body { animation: mc-scurry .14s linear infinite alternate !important; }' +
        // on the diagram, in the dungeon: each on its circle, they bow down, over and over, towards its middle
        '.claube-crew.worship { --crew-floor: 0px !important; }' +
        '.claube-crew.worship .mini-claube { transition: left 1.8s ease-in-out, bottom 1.8s ease-in-out; }' +
        '.claube-crew.worship .mini-claube:not(.crawl):not(.scurry) .mc-body { animation: mc-worship 2.6s ease-in-out infinite !important; animation-delay: var(--d, 0s) !important; }' +
        '@keyframes mc-worship { 0%, 100% { transform: rotate(0) scale(1); } 20% { transform: rotate(calc(var(--bow, 30deg) * -.25)) scale(.98, 1.04); }' +
            '50%, 62% { transform: rotate(var(--bow, 30deg)) scale(1.05, .82); } }' +
        '.claube-crew.worship .mini-claube .mc-arm { animation: mc-arms 1.3s ease-in-out infinite alternate !important; transform-box: fill-box; }' +
        '.claube-crew.worship .mini-claube .mc-arm.l { transform-origin: 100% 100%; } .claube-crew.worship .mini-claube .mc-arm.r { transform-origin: 0 100%; }' +
        'body.claube-rite .dungeon-diagram { animation: mc-rite 2.6s ease-in-out infinite; }' +
        '@keyframes mc-rite { 0%, 100% { filter: drop-shadow(0 0 2px rgba(120,0,0,.6)) drop-shadow(0 0 calc(4px + 14px * var(--rite, 0)) rgba(255,40,30,calc(.3 + .6 * var(--rite, 0)))); }' +
            '50% { filter: drop-shadow(0 0 3px rgba(160,0,0,.8)) drop-shadow(0 0 calc(10px + 26px * var(--rite, 0)) rgba(255,60,40,calc(.5 + .5 * var(--rite, 0)))); } }' +
        // a bullet, taken: it stops dead in the air and is drawn down into the middle of the diagram
        '.mc-absorb { position: fixed; z-index: 7; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; pointer-events: none;' +
            'background: radial-gradient(circle, #1a0000 0 35%, rgba(255,40,30,.9) 45%, transparent 70%); box-shadow: 0 0 12px 4px rgba(255,40,30,.6); }' +
        '.mc-ring { position: fixed; z-index: 7; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; border: 2px solid rgba(255,50,40,.85); pointer-events: none; }' +
        '.mc-streak { position: fixed; z-index: 8; height: 3px; transform-origin: 0 50%; pointer-events: none; border-radius: 3px;' +
            'background: linear-gradient(90deg, rgba(255,60,40,0), #ffdfb0 70%, #fff); box-shadow: 0 0 10px 3px rgba(255,80,50,.8); }' +
        // reset 4, the white revolver: what's left of one; the rest, still and smiling; the false god's frame, flaring
        '.mc-blood { position: fixed; z-index: 7; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; background: #8e0f12; pointer-events: none; }' +
        '.mc-gib { position: fixed; z-index: 7; pointer-events: none; }' +
        '.mc-gib > svg, .mc-gib > img { display: block; width: 100%; height: 100%; object-fit: contain; }' +
        '.claube-crew.menace .mini-claube:not(.crawl) .mc-body, .claube-crew.menace .mini-claube .mc-arm { animation: none !important; }' +
        '.claube-crew.menace .mini-claube .mc-body { filter: drop-shadow(0 0 4px rgba(200,0,0,.55)) brightness(.92); }' +
        '.claube-crew.menace .mini-claube .mc-face-happy { display: inline; } .claube-crew.menace .mini-claube .mc-face-plain { display: none; }' +
        'body.god-sends .gallery-frame[data-wall=shame][data-frame="6"] { animation: god-sends 1.4s ease-out; }' +
        '@keyframes god-sends { 0% { filter: none; } 15% { filter: brightness(2.2) drop-shadow(0 0 30px #ff2a1a); } 100% { filter: none; } }' +
        // someone else speaking (sky/hell.js: the voice): black and red, over everything
        '.mc-say.voice { z-index: 2147481600; background: rgba(12,2,2,.94); border-color: rgba(200,30,20,.6); color: #ffb4a4; font-style: normal; letter-spacing: .02em; text-shadow: 0 0 8px rgba(255,40,20,.45); }' +
        '.mc-say.voice b { color: #d0301e; }' +
        '.mc-black { position: fixed; inset: 0; z-index: 2147482000; background: #000; opacity: 0; transition: opacity 1s; pointer-events: all; }' +
        '.mc-black.on { opacity: 1; }' +
        // the house rumbles
        'body.mc-rumble .room, body.mc-rumble .backdrop, body.mc-rumble .ground, body.mc-rumble .claube-crew, body.mc-rumble .scene-character { animation: mc-rumble .11s linear infinite; }' +
        '@keyframes mc-rumble { 0% { translate: 0 0; } 25% { translate: -3px 2px; } 50% { translate: 2px -2px; } 75% { translate: -2px -1px; } 100% { translate: 1px 2px; } }' +
        '.mc-dust { position: fixed; top: -4px; z-index: 6; width: 3px; height: 3px; border-radius: 50%; background: rgba(210,190,160,.8); pointer-events: none; }' +
        // reset 4, out in the house: a faint red ward at each one's feet; a bullet stops dead in it
        'body.claube-warded .mini-claube::before { content: ""; position: absolute; left: -30%; right: -30%; bottom: -9%; height: 22%; border-radius: 50%; pointer-events: none;' +
            'border: 1.5px solid rgba(200,30,20,.55); box-shadow: 0 0 8px rgba(255,40,30,.45), inset 0 0 6px rgba(255,40,30,.35); animation: mc-ward 2.6s ease-in-out infinite; }' +
        '@keyframes mc-ward { 0%, 100% { opacity: .5; transform: scale(.94); } 50% { opacity: 1; transform: scale(1.04); } }' +
        '.mini-claube.warding .mc-body { filter: drop-shadow(0 0 6px rgba(255,40,30,.9)); }' +
        '.mini-claube.warding::before { animation: none !important; opacity: 1 !important; transform: scale(1.25) !important; transition: transform .2s; }' +
        '.mini-claube.spun .mc-body { animation: mc-spun .7s cubic-bezier(.3,1.4,.5,1) !important; }' +
        '@keyframes mc-spun { 0% { transform: rotate(0); } 60% { transform: translateY(-30%) rotate(340deg); } 100% { transform: rotate(360deg); } }' +
        // the traveller's words, in a box near the top (where it can't cover the traveller, or what they're doing)
        '.mc-say { position: fixed; left: 50%; top: max(76px, 9vh); z-index: 9; transform: translateX(-50%); width: min(560px, 90vw); padding: 14px 22px 16px; border-radius: 6px;' +
            'background: rgba(20,14,10,.92); border: 1px solid rgba(243,230,194,.35); box-shadow: 0 12px 30px rgba(0,0,0,.6); color: #f3e6c2; font: italic 1.12rem/1.5 "IM Fell English", Georgia, serif;' +
            'opacity: 0; transition: opacity .35s; cursor: pointer; }' +
        '.mc-say.on { opacity: 1; }' +
        '.mc-say b { display: block; margin-bottom: 4px; font: normal .85rem "IM Fell English SC", Georgia, serif; letter-spacing: .06em; color: #c49a52; }' +
        '@media (prefers-reduced-motion: reduce) { body.mc-rumble * { animation: none !important; } }'
    );

    // the lights (a disco ball of your own: assets/ui/disco-ball, see-through, about 1:1)
    var lights = document.createElement('div');
    lights.className = 'doom-lights';
    lights.setAttribute('aria-hidden', 'true');
    var BEAMS = [['#ff2aa0', '12%', '-40deg', '20deg', '4.2s'], ['#28c8ff', '32%', '30deg', '-25deg', '5.6s'], ['#8cff3c', '52%', '-20deg', '38deg', '3.8s'], ['#ffbe1e', '72%', '35deg', '-30deg', '6.2s'], ['#b04cff', '90%', '-30deg', '15deg', '4.8s']];
    lights.innerHTML = '<div class="dl-wash"></div><div class="dl-dots"></div>' + BEAMS.map(function (b) {
        return '<div class="dl-beam" style="--c:' + b[0] + '; left:' + b[1] + '; --a:' + b[2] + '; --b:' + b[3] + '; --t:' + b[4] + '"></div>';
    }).join('') + '<div class="dl-ball" data-asset="assets/ui/disco-ball"><svg class="placeholder" viewBox="0 0 64 64" aria-hidden="true"><defs><clipPath id="dlb-c"><circle cx="32" cy="32" r="28"/></clipPath>' +
        '<pattern id="dlb-p" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#9aa0aa"/><rect width="7" height="7" fill="#d8dde6"/><rect width="3" height="3" fill="#fff"/></pattern></defs>' +
        '<g clip-path="url(#dlb-c)"><rect class="dlb-tiles" x="0" y="0" width="100" height="64" fill="url(#dlb-p)"/><circle cx="32" cy="32" r="28" fill="url(#dlb-sh)" opacity=".5"/></g>' +
        '<circle cx="32" cy="32" r="28" fill="none" stroke="#555" stroke-width="1.5"/><circle cx="22" cy="20" r="6" fill="#fff" opacity=".7"/></svg></div>';
    body.appendChild(lights);
    if (Sky.fillAssets) Sky.fillAssets(lights);

    var crew = document.createElement('div');
    crew.className = 'claube-crew';
    crew.setAttribute('aria-hidden', 'true');
    body.appendChild(crew);

    /* ---------------- their pictures ---------------- */
    var art = { base: null, dancing: null, happy: null, menace: null };
    function pic() {
        var mode = crew.classList.contains('menace') ? 'menace' : crew.classList.contains('dancing') ? 'dancing' : 'happy';
        var url = art[mode] || (mode === 'menace' && art.happy) || art.base;
        return url ? '<img alt="" src="' + url + '">' : ART;
    }
    function dress() { crew.querySelectorAll('.mc-body').forEach(function (b) { var want = pic(); if (b.dataset.pic !== want) { b.innerHTML = want; b.dataset.pic = want; } }); }
    Sky.findAsset('assets/characters/mini-claube', function (u) { art.base = u || null; dress(); });
    Sky.findAsset('assets/characters/mini-claube-dancing', function (u) { art.dancing = u || null; dress(); });
    Sky.findAsset('assets/characters/mini-claube-happy', function (u) { art.happy = u || null; dress(); });
    Sky.findAsset('assets/characters/mini-claube-menace', function (u) { art.menace = u || null; dress(); });

    /* ---------------- who's out, and where (for the rest of the visit) ---------------- */
    var out = [];                                 // [{ x: % across }]   (kept for the whole reset: run:claubes-out)
    try { out = JSON.parse((S ? S.get('claubes-out') : sessionStorage.getItem(KEY)) || '[]') || []; } catch (e) {}
    function save() {
        try { var v = out.length ? JSON.stringify(out) : null; if (S) S.set('claubes-out', v); else if (v) sessionStorage.setItem(KEY, v); else sessionStorage.removeItem(KEY); } catch (e) {}
    }
    function called() { return !!S && S.get('claubes-called') === '1'; }
    // reset 4: out in the house, nothing can touch them (they're needed on the diagram, in the dungeon)
    function warded() { return !!S && S.live('diagram') && !gone4good() && !inDungeon; }
    var HAPPY_LINES = ['so happy to be alive', 'what a time to be alive!', ':)', 'again! again!', 'that was nice', 'i love it here'];

    function make(c, crawl, i) {
        var el = document.createElement('div');
        el.className = 'mini-claube' + (crawl ? ' crawl' : '') + (Math.random() < 0.5 ? ' flip' : '');
        el.style.left = c.x + '%';
        el.style.setProperty('--d', (-Math.random() * 2).toFixed(2) + 's');
        el.innerHTML = '<div class="mc-body"></div><span class="mc-spark">✦</span><span class="mc-bubble"></span>';
        el._c = c;
        crew.appendChild(el);
        if (crawl) setTimeout(function () { el.classList.remove('crawl'); }, 1150 + (i || 0) * 10);
        el.addEventListener('click', function (e) {
            if (body.classList.contains('inv-holding')) return;          // (holding something: sky/revolver.js has it)
            e.stopPropagation();
            flick(el, e.clientX, e.clientY);
        });
        return el;
    }
    function mood() {
        var on = !!(Sky.music && Sky.music.playing());
        crew.classList.toggle('dancing', on);
        crew.classList.toggle('happy', !on);
        body.classList.toggle('doom-party', on && isDoom(Sky.music.current()));        // the lights: only for this one song
        dress();
    }
    function show(crawling) {
        crew.innerHTML = '';
        out.forEach(function (c, i) {
            if (!crawling) { make(c, false); return; }
            setTimeout(function () { make(c, true, i); dress(); sfx('step', { size: 0.2 }); if (inDungeon) worship(); }, i * 260 + Math.random() * 180);
        });
        mood();
        if (inDungeon) setTimeout(worship, 50);
    }
    function callThemOut() {
        if (out.length || gone4good() || called()) return;                 // (once a reset: the ones that go stay gone)
        if (S) S.set('claubes-called', '1');
        setKills(0);
        for (var i = 0; i < HOW_MANY; i++) out.push({ x: +(17 + (75 / (HOW_MANY - 1)) * i + (Math.random() - 0.5) * 6).toFixed(1) });
        out.sort(function () { return Math.random() - 0.5; });
        save();
        show(true);
    }
    function gone(el) {
        var i = out.indexOf(el._c);
        if (i !== -1) out.splice(i, 1);
        save();
        el.remove();
    }

    /* ---------------- flicked away ---------------- */
    function flick(el, px, py) {
        if (el._going) return;
        if (warded() || (R4() && !gone4good())) { ward(el, px, py, true); return; }
        el._going = true;
        sfx('flick'); sfx('claube-flick', { delay: 0.04 });
        var r = el.getBoundingClientRect(), dir = px < r.left + r.width / 2 ? 1 : -1;
        var dx = dir * (window.innerWidth * (0.5 + Math.random() * 0.4)), up = -(window.innerHeight * (0.5 + Math.random() * 0.4));
        el.style.transition = 'none';
        var a = el.animate([
            { transform: 'translate(0,0) rotate(0)' },
            { transform: 'translate(' + dx * 0.5 + 'px,' + up + 'px) rotate(' + dir * 540 + 'deg)', offset: 0.55 },
            { transform: 'translate(' + dx + 'px,' + (up * 0.2) + 'px) rotate(' + dir * 1080 + 'deg) scale(.6)', opacity: 0 }
        ], { duration: 1100, easing: 'cubic-bezier(.2,.7,.5,1)', fill: 'forwards' });
        var from = r;
        a.onfinish = function () { gone(el); if (!out.length) emptied({ x: from.left + from.width / 2, y: from.bottom }, false); };
    }
    /* ---------------- shot (sky/revolver.js) ---------------- */
    function shoot(el, x, y, o) {
        if (el._going) return;
        var white = !!(o && o.white) && R4();
        if (crew.classList.contains('worship')) { if (white) slay(el, x, y); else absorb(el, x, y); return; }
        if (warded()) { ward(el, x, y, false, white); return; }
        el._going = true;
        sfx('claube-shot', { delay: 0.05 });
        for (var i = 0; i < 12; i++) {
            var p = document.createElement('div');
            p.className = 'mc-pop';
            p.style.left = x + 'px'; p.style.top = y + 'px';
            body.appendChild(p);
            var a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 60;
            p.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * d + 'px,' + (Math.sin(a) * d + 30) + 'px) scale(.3)', opacity: 0 }],
                { duration: 600 + Math.random() * 300, easing: 'ease-out', fill: 'forwards' }).onfinish = (function (q) { return function () { q.remove(); }; })(p);
        }
        var r = el.getBoundingClientRect(), last = { x: r.left + r.width / 2, y: r.bottom };
        el.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.5, .2)', opacity: 0 }], { duration: 180, fill: 'forwards' }).onfinish = function () {
            gone(el);
            var k = kills() + 1;
            setKills(k);
            if (!out.length) emptied(last, k >= HOW_MANY);
        };
        // the others don't like that one bit: they run for it
        crew.querySelectorAll('.mini-claube').forEach(function (o) { if (o !== el) say(o, 'eek!', 1200); });
        panic();
    }
    function kills() { try { return +(sessionStorage.getItem(KILLS) || 0); } catch (e) { return 0; } }
    function setKills(n) { try { if (n) sessionStorage.setItem(KILLS, n); else sessionStorage.removeItem(KILLS); } catch (e) {} }

    /* ---------------- reset 4: something is protecting them ---------------- */
    var WARD_LINES = ['Something is protecting them.', 'It\u2019s no use. Something is protecting them.', 'Something won\u2019t let me hurt them.'];
    var warnedAt = 0;
    var NOT_UP_HERE = ['Not up here. Down where they kneel.', 'The ward holds up here. It has to be on the diagram.'];
    function ward(el, x, y, flicked, white) {
        el.classList.remove('warding'); void el.offsetWidth; el.classList.add('warding');
        setTimeout(function () { el.classList.remove('warding'); }, 900);
        if (flicked) {
            sfx('flick');
            el.classList.remove('spun'); void el.offsetWidth; el.classList.add('spun');
            setTimeout(function () { el.classList.remove('spun'); }, 750);
        } else {
            // the bullet stops dead at them, a ring goes out, and it's drawn down into the floor
            var b = document.createElement('div');
            b.className = 'mc-absorb';
            b.style.left = x + 'px'; b.style.top = y + 'px';
            body.appendChild(b);
            var ringEl = document.createElement('div');
            ringEl.className = 'mc-ring';
            ringEl.style.left = x + 'px'; ringEl.style.top = y + 'px';
            body.appendChild(ringEl);
            ringEl.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(6)', opacity: 0 }], { duration: 600, easing: 'ease-out', fill: 'forwards' }).onfinish = function () { ringEl.remove(); };
            var r = el.getBoundingClientRect();
            b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)', offset: 0.3 }, { transform: 'translate(' + (r.left + r.width / 2 - x) + 'px,' + (r.bottom - y) + 'px) scale(.2)', opacity: 0.2 }],
                { duration: 900, easing: 'cubic-bezier(.6,0,.8,.4)', fill: 'forwards' }).onfinish = function () { b.remove(); };
            sfx('absorb', { or: 'shimmer' });
        }
        say(el, ['hehe', 'nope', ':)', 'not yet', 'we are kept'][Math.floor(Math.random() * 5)], 1200);
        var now = Date.now();
        if (now - warnedAt < 6000) return;
        var first = !warnedAt;
        warnedAt = now;
        if (white) { setTimeout(function () { speak(NOT_UP_HERE[first ? 0 : 1], null, { hold: 1600 }); }, 500); return; }
        setTimeout(function () { speak(first ? WARD_LINES[0] : WARD_LINES[1 + Math.floor(Math.random() * (WARD_LINES.length - 1))], null, { hold: 1600 }); }, 500);
    }
    function wardOn() { body.classList.toggle('claube-warded', warded() && out.length > 0); }
    setInterval(wardOn, 700);

    /* ---------------- running for it: back and forth across the floor, till things calm down ---------------- */
    var calm = 0, runner = null;
    function panic() {
        crew.classList.add('panic');
        calm = Date.now() + 9000;
        if (runner) return;
        (function run() {
            var els = crew.querySelectorAll('.mini-claube:not(.crawl)');
            if (!els.length || Date.now() > calm || crew.classList.contains('worship')) {
                runner = null;
                crew.classList.remove('panic');
                els.forEach(function (el) { if (el._c && !el._going) { el.style.setProperty('--run', '1.6s'); el.style.left = el._c.x + '%'; } });
                return;
            }
            els.forEach(function (el) {
                if (el._going || Math.random() < 0.3) return;
                var from = parseFloat(el.style.left) || 50, to = Math.max(4, Math.min(96, from + (Math.random() < 0.5 ? -1 : 1) * (15 + Math.random() * 35)));
                el.classList.toggle('flip', to < from);
                el.style.setProperty('--run', (Math.abs(to - from) / 40).toFixed(2) + 's');
                el.style.left = to.toFixed(1) + '%';
                if (Math.random() < 0.12) say(el, ['eek!', 'run!', 'no no no', 'help!', '!!!'][Math.floor(Math.random() * 5)], 900);
            });
            runner = setTimeout(run, 700 + Math.random() * 500);
        })();
    }

    /* ---------------- all seven, dead ---------------- */
    // the last of them gone (allShot: all seven, by the revolver)
    function emptied(at, allShot) {
        setKills(0);
        if (!S) return;
        // a reset whose key they carry (RESETS key.drop 'claubes': none, now) gets it from the last of them, however they went
        var k = S.info && S.info.key, W = window.innerWidth, H = window.innerHeight;
        if (k && k.drop === 'claubes' && S.get('key') !== '1' && S.get('claubes-key') !== '1') {
            S.set('claubes-key', '1');
            var x = Math.max(W * 0.08, Math.min(W * 0.92, at.x)), y = Math.max(H * 0.2, Math.min(H * 0.96, at.y));
            document.dispatchEvent(new CustomEvent('dav:drop-key', { detail: { by: 'claubes', x: x, y: y } }));
            return;
        }
        // all seven shot, anywhere else: the house doesn't like it either (once a reset)
        if (!allShot || S.get('claubes-massacre') === '1') return;
        S.set('claubes-massacre', '1');
        setTimeout(rumble, 600);
    }
    function rumble() {
        sfx('rumble', { or: 'wall-slide' });
        body.classList.add('mc-rumble');
        for (var i = 0; i < 26; i++) {
            (function (d) {
                d.className = 'mc-dust';
                d.style.left = (Math.random() * 100) + 'vw';
                body.appendChild(d);
                d.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(' + (40 + Math.random() * 60) + 'vh)', opacity: 0 }],
                    { duration: 1400 + Math.random() * 1400, delay: Math.random() * 1200, easing: 'ease-in', fill: 'both' }).onfinish = function () { d.remove(); };
            })(document.createElement('div'));
        }
        setTimeout(function () { body.classList.remove('mc-rumble'); }, 2300);
        setTimeout(function () { speak(MASSACRE_LINES); }, 2600);
    }
    // the traveller's words, typed out in a box at the bottom; click (or wait) to move on
    // (opts.hold: how long the last line stays up once it's typed, in ms; opts.typed: called the moment it's all typed)
    function speak(lines, done, opts) {
        opts = opts || {};
        if (typeof lines === 'string') lines = [lines];
        var box = document.createElement('div');
        box.className = 'mc-say' + (opts.cls ? ' ' + opts.cls : '');
        box.setAttribute('role', 'status');
        box.innerHTML = '<b></b><span></span>';
        box.querySelector('b').textContent = opts.who || 'the traveller';      // (opts.who: someone else speaking; opts.cls: their look)
        body.appendChild(box);
        requestAnimationFrame(function () { box.classList.add('on'); });
        var t = box.querySelector('span'), i = 0, timer = null, typing = null;
        function line() {
            if (i >= lines.length) { box.classList.remove('on'); setTimeout(function () { box.remove(); if (done) done(); }, 400); return; }
            var text = lines[i++], n = 0;
            t.textContent = '';
            clearInterval(typing);
            typing = setInterval(function () {
                t.textContent = text.slice(0, ++n);
                if (n % 2 === 0 && text.charAt(n - 1) !== ' ') sfx(opts.blip || 'blip', { size: 0.25, or: opts.blipOr || 'blip' });
                if (n >= text.length) { clearInterval(typing); typing = null; typed(); }
            }, 38);
        }
        function typed() {
            var last = i >= lines.length;
            clearTimeout(timer);
            timer = setTimeout(line, last && opts.hold !== undefined ? opts.hold : 2600 + lines[i - 1].length * 30);
            if (last && opts.typed) { var f = opts.typed; opts.typed = null; f(); }
        }
        box.addEventListener('click', function () {
            if (typing) { clearInterval(typing); typing = null; t.textContent = lines[i - 1]; typed(); }
            else { clearTimeout(timer); line(); }
        });
        line();
    }

    /* ---------------- the dungeon: on the diagram, worshipping ---------------- */
    var inDungeon = false, chantT = null;
    // where each of them stands on the diagram: the middles of its seven circles, as shares of its box
    // (0,0 its top left corner, 1,1 its bottom right; drawn seen from above, so a smaller y is further back).
    // if your own diagram puts its circles somewhere else, move these to match.
    var SEATS = [[0.5, 0.205], [0.731, 0.316], [0.788, 0.566], [0.628, 0.766], [0.372, 0.766], [0.212, 0.566], [0.269, 0.316]];
    function box() {
        var pg = document.querySelector('.dungeon-diagram'), W = window.innerWidth, H = window.innerHeight;
        var r = pg ? pg.getBoundingClientRect() : null;
        if (!r || !r.width) r = { left: W * 0.33, top: H * 0.82, width: W * 0.34, height: H * 0.13 };
        return r;
    }
    function ring() {                                                                  // (its middle: where the bullets go)
        var r = box(), W = window.innerWidth, H = window.innerHeight;
        return { cx: (r.left + r.width / 2) / W * 100, cy: H - (r.top + r.height / 2) };
    }
    function worship() {
        var els = crew.querySelectorAll('.mini-claube');
        if (!els.length) return;
        crew.classList.remove('panic');
        crew.classList.add('worship');
        crew.classList.toggle('menace', !!S && S.get('claubes-menace') === '1');
        dress();
        body.classList.add('claube-rite');
        body.style.setProperty('--rite', (absorbed() / ABSORB).toFixed(2));
        seat();
        clearTimeout(reseat);                                                           // (and again once the dungeon's done sliding into view)
        reseat = setTimeout(function () { seat(); reseat = setTimeout(seat, 1200); }, 1000);
        clearInterval(chantT);
        chantT = setInterval(function () {
            var e = crew.querySelectorAll('.mini-claube');
            if (crew.classList.contains('menace')) return;                               // (they've stopped singing: they just smile)
            if (e.length && Math.random() < 0.6) say(e[Math.floor(Math.random() * e.length)], CHANTS[Math.floor(Math.random() * CHANTS.length)], 1800);
        }, 2600);
    }
    var reseat = null;
    window.addEventListener('resize', function () { if (crew.classList.contains('worship')) seat(); });
    function seat() {
        var els = crew.querySelectorAll('.mini-claube');
        if (!els.length || !crew.classList.contains('worship')) return;
        var r = box(), W = window.innerWidth, H = window.innerHeight, n = els.length, mid = (r.left + r.width / 2) / W * 100;
        els.forEach(function (el, i) {
            var seat = SEATS[Math.round(i * SEATS.length / n) % SEATS.length];           // (fewer of them: spread round the circles)
            var x = (r.left + r.width * seat[0]) / W * 100, up = H - (r.top + r.height * seat[1]);
            el.style.left = x.toFixed(2) + '%';
            el.style.bottom = (up - 3).toFixed(0) + 'px';                               // (feet in the circle's middle)
            el.style.zIndex = Math.round(seat[1] * 10);                                  // (the ones at the front stand in front)
            var side = x - mid;
            el.classList.toggle('flip', side > 0.5);                                     // facing the middle
            el.style.setProperty('--bow', (Math.abs(side) < 0.5 ? 20 : side > 0 ? -34 : 34) + 'deg');
        });
    }
    function unworship() {
        clearInterval(chantT); clearTimeout(reseat);
        crew.classList.remove('worship', 'menace');
        dress();
        body.classList.remove('claube-rite');
        crew.querySelectorAll('.mini-claube').forEach(function (el) { el.style.bottom = ''; el.style.zIndex = ''; if (el._c) el.style.left = el._c.x + '%'; });
    }
    function absorbed() { try { return +(sessionStorage.getItem('claubes-absorbed') || 0); } catch (e) { return 0; } }
    // the bullet stops dead, a ring goes out… and it's drawn down into the middle of the diagram
    function absorbFx(x, y) {
        var R = ring(), px = R.cx / 100 * window.innerWidth, py = window.innerHeight - R.cy;
        var b = document.createElement('div');
        b.className = 'mc-absorb';
        b.style.left = x + 'px'; b.style.top = y + 'px';
        body.appendChild(b);
        var ringEl = document.createElement('div');
        ringEl.className = 'mc-ring';
        ringEl.style.left = x + 'px'; ringEl.style.top = y + 'px';
        body.appendChild(ringEl);
        ringEl.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(6)', opacity: 0 }], { duration: 600, easing: 'ease-out', fill: 'forwards' }).onfinish = function () { ringEl.remove(); };
        sfx('absorb', { or: 'shimmer' });
        b.animate([{ transform: 'scale(1)', offset: 0 }, { transform: 'scale(1.3)', offset: 0.3 },
                   { transform: 'translate(' + (px - x) + 'px,' + (py - y) + 'px) scale(.2)', opacity: 0.2 }], { duration: 1100, easing: 'cubic-bezier(.6,0,.8,.4)', fill: 'forwards' }).onfinish = function () { b.remove(); };
    }
    function absorb(el, x, y) {
        // (reset 4: the diagram drinks and drinks, and nothing comes of it: only the white revolver ends this)
        var n = absorbed() + 1;
        if (R4()) n = Math.min(n, ABSORB - 1);
        try { sessionStorage.setItem('claubes-absorbed', n); } catch (e) {}
        absorbFx(x, y);
        body.style.setProperty('--rite', Math.min(1, n / ABSORB).toFixed(2));
        var els = crew.querySelectorAll('.mini-claube');
        // (any reset but 4: the sixth goes the way of the rest, and the traveller's a little let down)
        if (n === ABSORB) { setTimeout(function () { speak(LETDOWN); }, 1300); return; }
        if (els.length && !crew.classList.contains('menace')) say(els[Math.floor(Math.random() * els.length)], R4() ? ['more', 'it drinks', 'we are kept', 'hehe'][n % 4] : ['thank you', 'more', 'it drinks', 'yes…'][n % 4], 1400);
    }

    /* ---------------- reset 4: the white revolver ---------------- */
    // shot on the diagram: the bullet's drawn down as ever… and then it bursts. the rest stop still, and smile
    var GIB = ['<svg viewBox="0 0 20 18"><path d="M3 9 Q2 2 9 3 Q13 0 17 5 Q20 11 14 15 Q8 18 5 14 Q1 13 3 9 Z" fill="#c8643b"/><path d="M5 8 Q9 5 13 8" stroke="#e08a5e" fill="none" stroke-width="1.4"/></svg>',
               '<svg viewBox="0 0 20 16"><path d="M2 8 Q5 1 12 2 Q19 4 18 10 Q15 16 8 14 Q1 13 2 8 Z" fill="#a84e2c"/><circle cx="8" cy="7" r="2" fill="#7e0d10"/></svg>',
               '<svg viewBox="0 0 24 10"><path d="M2 5 Q2 1 6 2 L20 3 Q23 5 20 7 L6 8 Q2 9 2 5 Z" fill="#a84e2c"/><path d="M19 3 Q24 1 22 6" stroke="#6e3018" fill="none" stroke-width="1.4"/></svg>',
               '<svg viewBox="0 0 20 18"><path d="M2 10 Q4 2 11 3 Q19 4 18 11 Q16 17 9 16 Q2 15 2 10 Z" fill="#8e1a22"/><circle cx="12" cy="8" r="2.4" fill="#2a1410"/><circle cx="12.6" cy="7.4" r=".7" fill="#fff"/></svg>'];
    var gib = GIB.slice();
    GIB.forEach(function (g, i) { Sky.findAsset('assets/characters/claube-giblet-' + (i + 1), function (u) { if (u) gib[i] = '<img alt="" src="' + u + '">'; }); });
    function burst(x, y, w) {
        var floor = y + w * 0.3;
        for (var i = 0; i < 26; i++) {                                              // blood
            var d = document.createElement('div'), sz = 2 + Math.random() * 5;
            d.className = 'mc-blood';
            d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.width = sz + 'px'; d.style.height = (sz * 1.2) + 'px';
            body.appendChild(d);
            var a = -Math.PI * (0.05 + Math.random() * 0.9), sp = 60 + Math.random() * 200, dx = Math.cos(a) * sp, up = Math.sin(a) * sp;
            d.animate([{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + (dx * 0.6).toFixed(0) + 'px), calc(-50% + ' + up.toFixed(0) + 'px))', opacity: 1, offset: 0.45 },
                       { transform: 'translate(calc(-50% + ' + dx.toFixed(0) + 'px), calc(-50% + ' + (floor - y).toFixed(0) + 'px)) scale(1.6,.45)', opacity: 1, offset: 0.8 }, { transform: 'translate(calc(-50% + ' + dx.toFixed(0) + 'px), calc(-50% + ' + (floor - y).toFixed(0) + 'px)) scale(1.6,.45)', opacity: 0 }],
                { duration: 2600 + Math.random() * 900, easing: 'cubic-bezier(.2,.6,.5,1)', fill: 'forwards' }).onfinish = (function (q) { return function () { q.remove(); }; })(d);
        }
        gib.concat(gib).forEach(function (g, i) {                                    // giblets
            var e = document.createElement('div'), sz = w * (0.24 + Math.random() * 0.16);
            e.className = 'mc-gib';
            e.innerHTML = g;
            e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.width = sz + 'px'; e.style.height = sz + 'px';
            body.appendChild(e);
            var a = -Math.PI * (0.12 + Math.random() * 0.76), sp = 90 + Math.random() * 220, dx = Math.cos(a) * sp, up = Math.sin(a) * sp - 40, rot = (Math.random() - 0.5) * 900;
            e.animate([{ transform: 'translate(-50%,-50%) rotate(0)' }, { transform: 'translate(calc(-50% + ' + (dx * 0.55).toFixed(0) + 'px), calc(-50% + ' + up.toFixed(0) + 'px)) rotate(' + (rot / 2).toFixed(0) + 'deg)', offset: 0.4 },
                       { transform: 'translate(calc(-50% + ' + dx.toFixed(0) + 'px), calc(-50% + ' + (floor - y - sz * 0.3).toFixed(0) + 'px)) rotate(' + rot.toFixed(0) + 'deg)', offset: 0.75, opacity: 1 },
                       { transform: 'translate(calc(-50% + ' + dx.toFixed(0) + 'px), calc(-50% + ' + (floor - y - sz * 0.3).toFixed(0) + 'px)) rotate(' + rot.toFixed(0) + 'deg)', opacity: 0 }],
                { duration: 4200 + Math.random() * 1500, easing: 'cubic-bezier(.25,.6,.5,1)', fill: 'forwards' }).onfinish = (function (q) { return function () { q.remove(); }; })(e);
        });
    }
    var SLAIN_LINES = { apparitions: ['That\u2019s all of them.', 'The pictures round it are still watching me. Its apparitions.'], god: ['That\u2019s all of them.', 'Only the false god left now.'] };
    function slay(el, x, y) {
        el._going = true;
        absorbFx(x, y);
        var r = el.getBoundingClientRect();
        setTimeout(function () {
            if (S) S.set('claubes-menace', '1');
            crew.classList.add('menace');
            dress();
            sfx('claube-scream', { or: 'shriek' });
            sfx('claube-burst', { or: 'splat', delay: 0.08 });
            burst(r.left + r.width / 2, r.top + r.height * 0.55, Math.max(34, r.width));
            el.remove();
            gone(el);
            // the rest: not a step, not a word. they turn to the traveller and smile
            var me = document.querySelector('.dungeon .character'), mx = me ? me.getBoundingClientRect().left + me.getBoundingClientRect().width / 2 : 0;
            crew.querySelectorAll('.mini-claube').forEach(function (o) { var q = o.getBoundingClientRect(); o.classList.toggle('flip', q.left > mx); o.querySelector('.mc-bubble').classList.remove('on'); });
            if (out.length) return;
            // the last of the seven
            unworship();
            setTimeout(function () { speak(apparitionsLeft() ? SLAIN_LINES.apparitions : SLAIN_LINES.god); }, 1600);
        }, 420);
    }
    // the six pictures round the false god, shot since the pact (sky/hell.js counts them)
    function apparitionsLeft() {
        var l = [];
        try { l = JSON.parse((S && S.get('apparitions')) || '[]') || []; } catch (e) {}
        return ['1', '2', '3', '4', '5', '7'].filter(function (f) { return l.indexOf(f) === -1; }).length;
    }
    function slain() { return called() && !out.length; }
    // the white revolver at the false god's frame: the last bullet comes back (true), or not yet (false: the revolver makes a hole)
    var notYetAt = 0;
    function whiteFrame(frame, x, y) {
        if (!R4() || !S || S.get('grimoire-pact') !== '1') return false;
        if (crew.classList.contains('worship') && crew.querySelector('.mini-claube')) { absorbFx(x, y); return true; }
        if (!slain() || apparitionsLeft()) {
            var now = Date.now();
            if (now - notYetAt > 5000) {
                notYetAt = now;
                speak(!slain() ? 'Not yet. Its disciples first: the little ones.' : 'Not yet. Its apparitions first: the pictures round it.', null, { hold: 1600 });
            }
            return false;
        }
        if (Sky.lives && Sky.lives.refuse('diagram')) return true;
        reflect(x, y);
        return true;
    }
    // the sixth: straight back, into the traveller
    function reflect(x, y) {
        var me = document.querySelector('.dungeon .character') || document.querySelector('.scene-character');
        if (!me) return;
        var r = me.getBoundingClientRect(), tx = r.left + r.width / 2, ty = r.top + r.height * 0.18;
        var st = document.createElement('div');
        st.className = 'mc-streak';
        var dx = tx - x, dy = ty - y, len = Math.hypot(dx, dy);
        st.style.left = x + 'px'; st.style.top = y + 'px'; st.style.width = len + 'px';
        st.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad) scaleX(0)';
        body.appendChild(st);
        body.classList.add('god-sends');                                             // (the frame flares as it sends it back)
        setTimeout(function () { body.classList.remove('god-sends'); }, 1400);
        setTimeout(function () {
            sfx('ricochet', { or: 'zap' }); sfx('bang', { delay: 0.02 });
            st.animate([{ transform: 'rotate(' + Math.atan2(dy, dx) + 'rad) scaleX(0)' }, { transform: 'rotate(' + Math.atan2(dy, dx) + 'rad) scaleX(1)' }], { duration: 140, fill: 'forwards' })
                .onfinish = function () {
                    st.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).onfinish = function () { st.remove(); };
                    if (Sky.gore && Sky.gore.splat) Sky.gore.splat(me, tx, ty, null); else me.classList.add('gore-hidden');
                    // reset 4's death: the one heart goes, and the world with it (sky/lives.js). (not unlocked, somehow: back up again)
                    setTimeout(function () {
                        if (Sky.lives && Sky.lives.unlocked) document.dispatchEvent(new CustomEvent('dav:traveller-died'));
                        else if (Sky.gore && Sky.gore.respawn) Sky.gore.respawn(me);
                    }, 1500);
                };
        }, 520);
    }
    (function watchSides(n) {                                               // (sky/bathroom.js may come after this file)
        if (Sky.sides && Sky.sides.on) {
            Sky.sides.on(function (what, name) {
                if (name !== 'dungeon') return;
                inDungeon = what === 'enter';
                if (inDungeon) setTimeout(function () { if (inDungeon) worship(); }, 950); else unworship();
            });
        } else if (n < 40) setTimeout(function () { watchSides(n + 1); }, 150);
    })(0);
    /* ---------------- all of them, running for it ---------------- */
    function scatter(line) {
        var els = crew.querySelectorAll('.mini-claube');
        if (warded() && els.length) { els.forEach(function (el) { if (line) say(el, line, 900); }); panic(); return; }
        if (crew.classList.contains('worship')) unworship();
        if (!els.length) { out = []; save(); return; }
        var lastAt = null;
        els.forEach(function (el, i) {
            el._going = true;
            if (line) say(el, line, 900);
            setTimeout(function () {
                el.classList.add('scurry');
                var rr = el.getBoundingClientRect(); lastAt = { x: rr.left + rr.width / 2, y: rr.bottom };
                var toRight = parseFloat(el.style.left) > 50;
                el.classList.toggle('flip', !toRight);
                el.style.transition = 'left ' + (0.7 + Math.random() * 0.5).toFixed(2) + 's linear';
                el.style.left = toRight ? '112%' : '-12%';
                setTimeout(function () { el.remove(); if (i === els.length - 1 && lastAt) emptied(lastAt, false); }, 1400);
            }, 500 + i * 60);
        });
        out = []; save();
        if (line) sfx('angry', { size: 0.1 });
    }
    function say(el, text, ms) {
        var b = el.querySelector('.mc-bubble');
        if (!b) return;
        b.textContent = text;
        b.classList.add('on');
        clearTimeout(b._t);
        b._t = setTimeout(function () { b.classList.remove('on'); }, ms || 1800);
    }
    // happy now and then says so
    setInterval(function () {
        if (!crew.classList.contains('happy') || crew.classList.contains('panic') || crew.classList.contains('worship') || document.hidden) return;
        var els = crew.querySelectorAll('.mini-claube:not(.crawl)');
        if (!els.length || Math.random() < 0.5) return;
        say(els[Math.floor(Math.random() * els.length)], HAPPY_LINES[Math.floor(Math.random() * HAPPY_LINES.length)], 2200);
    }, 3500);

    /* ---------------- the music calls them out, and sets them dancing ---------------- */
    function isDoom(t) {
        if (!t) return false;
        var name = String(t.title || '') + ' ' + (function () { try { return decodeURIComponent(t.url || ''); } catch (e) { return t.url || ''; } })();
        return DOOM.test(name);
    }
    if (Sky.music) Sky.music.on(function (what) {
        if (what === 'play' && isDoom(Sky.music.current())) callThemOut();
        if (what === 'play' || what === 'pause' || what === 'stop') mood();
    });
    document.addEventListener('dav:traveller-shot', function () { scatter('!!!'); });
    document.addEventListener('dav:record-shot', function () { scatter('noooo'); });

    if (gone4good()) { out = []; save(); }
    if (out.length) show(false);
    else if (Sky.music && Sky.music.playing() && isDoom(Sky.music.current())) callThemOut();
    mood();

    // a bullet at the false god's frame (frame 6, the dungeon) while they worship: the circle takes it too (sky/revolver.js)
    function guardFrame(x, y) {
        if (!crew.classList.contains('worship') || !crew.querySelector('.mini-claube')) return false;
        if (R4()) absorbFx(x, y); else absorb(null, x, y);
        return true;
    }
    Sky.claubes = { shoot: shoot, guardFrame: guardFrame, whiteFrame: whiteFrame, get slain() { return slain(); }, get apparitionsLeft() { return apparitionsLeft(); }, flick: flick, callOut: callThemOut, scatter: scatter, get count() { return out.length; }, get gone() { return gone4good(); }, speak: speak };
})();

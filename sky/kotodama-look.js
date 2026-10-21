/* =====================================================================
   kotodama-look.js — how the little companion looks. the drawing lives here
   so both the house (sky/kotodama.js) and the asset manager's companion tab
   (its tweaking menu) draw exactly the same one.

     the kind     una, the sugar drop: its body, head, wings, tail and little
                  extras, its colours, how see-through and shiny it is, and its
                  ways (how high it hops, how it wobbles, how chatty and curious
                  it is). DEFAULTS below. (21 Oct: there were six, a different
                  one each day of the week, and all of them in on sundays: the
                  other five were taken out.)
     the parts    it can wear any of these (the asset manager mixes them):
                  SHAPES (its body), HEADS, WINGS, TAILS and EXTRAS. each
                  part is drawn for one body and moved to fit another.
     your tweaks  assets/characters/kotodama-looks.json, written by the asset
                  manager's menu ("keep these"): only what you changed is in
                  it, everything else stays as below.
     your art     assets/characters/kotodama-<kind>… still wins over all of
                  this, as soon as it's in (sky/kotodama.js).

   Sky.kotodamaLook = { kinds, shapes, heads, wings, tails, extras, faces,
     spec(kind, saved), svg(spec, id) }
   ===================================================================== */

(function () {
    var Sky = window.Sky = window.Sky || {};
    if (Sky.kotodamaLook) return;

    /* ======================================================================
       the sugar drop, as it is until you change it
       name: what it's called. voice: which of sky/babble.js's voices it speaks with.
       hop: how high it hops. spring: how much it wobbles on landing. pace: how far each hop goes.
       chat: how often it talks. wonder: how often it wanders off and thinks. scale: its size.
       brave: not frightened in the dungeon. cheeky: giggles more, answers back.
       shape / head / wings / tail / extras: its parts (below). c: its colours.
       clear: how solid its body is (1 = solid, lower = a see-through gummy).
       shine: the shine on it. face: its face moved up (minus) or down (plus)
       ====================================================================== */
    var DEFAULTS = {
        una:     { name: 'the sugar drop',  voice: 'una',     hop: 1.0,  spring: 1.15, pace: 1.0,  chat: 0.6,  wonder: 0.7, scale: 1,
                   shape: 'gumdrop', head: 'swirl', wings: 'none', tail: 'none', extras: ['crystals', 'bow'],
                   c: { body: '#f9c8d6', shade: '#e98fab', light: '#fff6f9', line: '#7d3a50', cheek: '#ff8fae', eye: '#3c1d2b', iris: '#c95a82', glow: '#ffe3ec', mark: '#ff5f8f' } },
    };
    var COMMON = { clear: 1, shine: 0.65, face: 0, brave: false, cheeky: false };
    var FACES = ['calm', 'happy', 'curious', 'thinking', 'idea', 'puzzled', 'sleepy', 'startled', 'scared', 'giggle'];

    /* ======================================================================
       its parts (all on a 200 x 200 canvas, its bottom at 196)
       top: where the body's top is (heads and some extras are moved to sit on it). face: where its face sits
       ====================================================================== */
    var SHAPES = {
        gumdrop: { name: 'a gumdrop',            top: 58, face: 134, path: 'M100 58 C66 62 34 100 32 150 C31 178 54 196 100 196 C146 196 169 178 168 150 C166 100 134 62 100 58 Z' },
        dewdrop: { name: 'a dewdrop',            top: 44, face: 138, path: 'M100 44 C112 74 166 110 166 152 C165 181 140 196 100 196 C60 196 35 181 34 152 C34 110 88 74 100 44 Z' },
        bun:     { name: 'a round bun',          top: 72, face: 134, path: 'M100 72 C150 72 172 110 170 150 C168 182 142 196 100 196 C58 196 32 182 30 150 C28 110 50 72 100 72 Z' },
        plump:   { name: 'a plump little body',  top: 68, face: 130, path: 'M100 68 C146 68 170 104 168 148 C166 182 140 196 100 196 C60 196 34 182 32 148 C30 104 54 68 100 68 Z' },
        totem:   { name: 'a carved totem',       top: 50, face: 114, path: 'M60 72 C60 56 76 50 100 50 C124 50 140 56 140 72 L146 176 C147 190 130 196 100 196 C70 196 53 190 54 176 Z' },
        mochi:   { name: 'a squishy mochi',      top: 86, face: 146, path: 'M100 86 C158 86 182 130 178 162 C175 186 150 196 100 196 C50 196 25 186 22 162 C18 130 42 86 100 86 Z' }
    };
    // on its head. at: the top of the body it was drawn for. back: drawn behind the body
    var HEADS = {
        swirl:     { name: 'a sugar swirl', at: 58, draw: function (c) {
            return '<path d="M100 60 C93 52 95 40 105 38 C114 37 118 46 112 51 C108 54 103 51 105 47" fill="none" stroke="' + c.line + '" stroke-width="3" stroke-linecap="round"/>' +
                '<path d="M100 60 C96 54 97 46 104 43 C109 42 112 46 110 49" fill="' + c.body + '"/>';
        } },
        antennae:  { name: 'two antennae', at: 44, draw: function (c) {
            return '<g class="k-antennae" fill="none" stroke="' + c.line + '" stroke-width="3" stroke-linecap="round">' +
                '<path d="M92 70 C86 54 78 42 70 34"/><path d="M108 70 C114 54 122 42 130 34"/></g>' +
                '<circle class="k-glow" cx="69" cy="32" r="7" fill="' + c.glow + '" stroke="' + c.line + '" stroke-width="2.2"/>' +
                '<circle class="k-glow" cx="131" cy="32" r="7" fill="' + c.glow + '" stroke="' + c.line + '" stroke-width="2.2"/>';
        } },
        foxears:   { name: 'fox ears', at: 72, draw: function (c) {
            return '<path d="M58 86 L66 34 L96 74 Z M142 86 L134 34 L104 74 Z" fill="' + c.body + '" stroke="' + c.line + '" stroke-width="3" stroke-linejoin="round"/>' +
                '<path d="M65 78 L69 50 L86 72 Z M135 78 L131 50 L114 72 Z" fill="' + c.light + '"/>';
        } },
        horns:     { name: 'little horns', at: 68, draw: function (c) {
            return '<path d="M72 82 C60 68 60 52 68 40 C70 56 78 66 88 74 Z M128 82 C140 68 140 52 132 40 C130 56 122 66 112 74 Z" fill="' + c.mark + '" stroke="' + c.line + '" stroke-width="2.6" stroke-linejoin="round"/>';
        } },
        halo:      { name: 'a floating ring', at: 50, draw: function (c) {
            return '<g class="k-halo"><ellipse cx="100" cy="34" rx="34" ry="9" fill="none" stroke="' + c.line + '" stroke-width="7"/>' +
                '<ellipse cx="100" cy="34" rx="34" ry="9" fill="none" stroke="' + c.glow + '" stroke-width="4"/></g>';
        } },
        bunnyears: { name: 'bunny ears (one floppy)', at: 86, back: true, draw: function (c) {
            return '<g class="k-ears" stroke="' + c.line + '" stroke-width="3" stroke-linejoin="round">' +
                '<path d="M74 94 C60 62 58 24 72 14 C88 22 90 62 90 92 Z" fill="' + c.body + '"/>' +
                '<path d="M76 84 C69 60 68 34 74 26 C82 36 84 60 84 84 Z" fill="' + c.cheek + '" stroke="none" opacity=".45"/>' +
                '<path class="k-flop" d="M112 92 C116 62 124 42 150 36 C166 34 170 48 156 56 C138 64 128 78 126 94 Z" fill="' + c.body + '"/>' +
                '<path class="k-flop" d="M118 86 C122 66 130 50 148 44 C156 44 158 48 152 52 C138 58 128 70 124 86 Z" fill="' + c.cheek + '" stroke="none" opacity=".45"/></g>';
        } },
        none:      { name: 'nothing', draw: function () { return ''; } }
    };
    var WINGS = {
        fairy: { name: 'fairy wings', draw: function (c) {
            return '<g class="k-wings fairy" fill="' + c.light + '" stroke="' + c.line + '" stroke-width="2" opacity=".8">' +
                '<ellipse cx="46" cy="104" rx="34" ry="16" transform="rotate(-32 46 104)"/><ellipse cx="54" cy="132" rx="22" ry="10" transform="rotate(14 54 132)"/>' +
                '<ellipse cx="154" cy="104" rx="34" ry="16" transform="rotate(32 154 104)"/><ellipse cx="146" cy="132" rx="22" ry="10" transform="rotate(-14 146 132)"/></g>';
        } },
        bat:   { name: 'bat wings', draw: function (c) {
            return '<g class="k-wings bat" fill="' + c.shade + '" stroke="' + c.line + '" stroke-width="2.6" stroke-linejoin="round">' +
                '<path d="M50 118 C22 96 8 80 12 62 C22 74 30 74 34 70 C36 82 44 86 50 82 C50 94 56 102 62 106 Z"/>' +
                '<path d="M150 118 C178 96 192 80 188 62 C178 74 170 74 166 70 C164 82 156 86 150 82 C150 94 144 102 138 106 Z"/></g>';
        } },
        none:  { name: 'none', draw: function () { return ''; } }
    };
    var TAILS = {
        fox:   { name: 'a fluffy fox tail', draw: function (c) {
            return '<path class="k-tail" d="M148 176 C196 168 200 106 174 86 C186 116 172 144 140 154 Z" fill="' + c.body + '" stroke="' + c.line + '" stroke-width="3" stroke-linejoin="round"/>' +
                '<path class="k-tail" d="M174 86 C182 98 184 108 180 118 C171 106 169 95 174 86 Z" fill="' + c.light + '"/>';
        } },
        devil: { name: 'a pointy tail', draw: function (c) {
            return '<path class="k-tail" d="M146 186 C178 188 188 166 178 152" fill="none" stroke="' + c.line + '" stroke-width="4.5" stroke-linecap="round"/>' +
                '<path class="k-tail" d="M178 142 C172 136 166 146 178 156 C190 146 184 136 178 142 Z" fill="' + c.cheek + '" stroke="' + c.line + '" stroke-width="2.2"/>';
        } },
        none:  { name: 'none', draw: function () { return ''; } }
    };
    // little extras. at: moved with the body's top (drawn for that top). atFace: moved with its face.
    // skin: painted on its body (kept inside it). back: behind the body
    var EXTRAS = {
        crystals: { name: 'sugar crystals', skin: true, draw: function () {
            return '<g fill="#fff" opacity=".85">' + [[66, 96, 20], [134, 104, -15], [52, 150, 35], [148, 158, 10], [112, 82, 45], [84, 180, -20], [124, 182, 25], [74, 124, 5]].map(function (s) {
                return '<rect x="' + (s[0] - 2.6) + '" y="' + (s[1] - 2.6) + '" width="5.2" height="5.2" rx="1" transform="rotate(' + s[2] + ' ' + s[0] + ' ' + s[1] + ')"/>';
            }).join('') + '</g>';
        } },
        bow:      { name: 'a ribbon bow', at: 58, draw: function (c) {
            return '<g class="k-bow"><path d="M134 76 L150 66 L152 84 Z M134 76 L118 70 L122 86 Z" fill="' + c.mark + '" stroke="' + c.line + '" stroke-width="2.4" stroke-linejoin="round"/>' +
                '<circle cx="134" cy="77" r="4.5" fill="' + c.mark + '" stroke="' + c.line + '" stroke-width="2.4"/></g>';
        } },
        sheen:    { name: 'a dewy streak', at: 44, skin: true, draw: function (c) {
            return '<path d="M100 60 C104 78 112 88 120 96" fill="none" stroke="' + c.light + '" stroke-width="3" stroke-linecap="round" opacity=".7"/>';
        } },
        flame:    { name: 'a flame mark', atFace: 134, draw: function (c) {
            return '<path d="M100 86 C95 94 99 100 100 106 C101 100 105 94 100 86 Z" fill="' + c.mark + '"/>';
        } },
        lights:   { name: 'two floating lights', draw: function (c) {
            return '<circle class="k-orb" cx="26" cy="96" r="8" fill="' + c.glow + '" stroke="' + c.line + '" stroke-width="2" opacity=".9"/>' +
                '<circle class="k-orb o2" cx="178" cy="58" r="6" fill="' + c.glow + '" stroke="' + c.line + '" stroke-width="2" opacity=".9"/>';
        } },
        carvings: { name: 'carved lines and a gem', skin: true, draw: function (c) {
            return '<g fill="none" stroke="' + c.shade + '" stroke-width="3" stroke-linecap="round"><path d="M62 92 H138"/><path d="M58 158 H142"/><path d="M58 168 H142"/></g>' +
                '<path d="M100 170 L108 180 L100 190 L92 180 Z" fill="' + c.glow + '" stroke="' + c.line + '" stroke-width="2"/>';
        } },
        stones:   { name: 'two stones at its sides', back: true, draw: function (c) {
            return '<ellipse cx="52" cy="134" rx="9" ry="14" fill="' + c.shade + '" stroke="' + c.line + '" stroke-width="2.6"/>' +
                '<ellipse cx="148" cy="134" rx="9" ry="14" fill="' + c.shade + '" stroke="' + c.line + '" stroke-width="2.6"/>';
        } },
        nose:     { name: 'a little nose', atFace: 146, draw: function (c) {
            return '<circle cx="100" cy="112" r="3" fill="' + c.mark + '" opacity=".6"/>';
        } }
    };
    // its colours, in the order the menu shows them
    var COLOURS = [['body', 'its body'], ['shade', 'its shadow side'], ['light', 'its shine'], ['line', 'its outline'], ['cheek', 'its cheeks'],
        ['eye', 'its eyes'], ['iris', 'the glint in its eyes'], ['mark', 'its markings (bow, horns, flame…)'], ['glow', 'what glows (lights, ring, antennae)']];

    /* ======================================================================
       putting it together: one kind's whole look (yours over the defaults), and its drawing
       ====================================================================== */
    function copy(o) { return JSON.parse(JSON.stringify(o)); }
    function spec(kind, saved) {
        var d = DEFAULTS[kind] || DEFAULTS.una, s = copy(COMMON);
        Object.keys(d).forEach(function (k) { s[k] = copy(d[k]); });
        var mine = saved && saved.kinds && saved.kinds[kind];
        if (mine) Object.keys(mine).forEach(function (k) {
            if (k === 'c') Object.keys(mine.c || {}).forEach(function (n) { if (/^#[0-9a-f]{6}$/i.test(mine.c[n])) s.c[n] = mine.c[n]; });
            else if (mine[k] !== null && mine[k] !== undefined) s[k] = copy(mine[k]);
        });
        if (!SHAPES[s.shape]) s.shape = d.shape;
        if (!HEADS[s.head]) s.head = d.head;
        if (!WINGS[s.wings]) s.wings = 'none';
        if (!TAILS[s.tail]) s.tail = 'none';
        s.extras = [].concat(s.extras || []).filter(function (e) { return EXTRAS[e]; });
        s.kind = kind;
        return s;
    }
    // the face: every expression drawn, and the stylesheet shows the one it's making (drawn at y 128)
    function faceSvg(c, id) {
        var ink = c.line, eye = 'url(#kd-eye-' + id + ')';
        function both(fn) { return fn(76, 1) + fn(124, -1); }
        return '<g class="kf">' +
            '<g class="k-cheeks" fill="' + c.cheek + '"><ellipse cx="60" cy="142" rx="10" ry="6"/><ellipse cx="140" cy="142" rx="10" ry="6"/></g>' +
            '<g class="e-open"><g class="look">' + both(function (x) {
                return '<ellipse cx="' + x + '" cy="124" rx="8.5" ry="11" fill="' + eye + '"/><circle cx="' + (x + 3) + '" cy="119" r="3.3" fill="#fff"/><circle cx="' + (x - 2.5) + '" cy="129" r="1.5" fill="#fff" opacity=".8"/>';
            }) + '</g></g>' +
            '<g class="e-wide">' + both(function (x) {
                return '<ellipse cx="' + x + '" cy="123" rx="10.5" ry="13.5" fill="' + eye + '"/>' +
                    '<path d="M' + (x + 3) + ' 113 L' + (x + 4.4) + ' 117.6 L' + (x + 9) + ' 119 L' + (x + 4.4) + ' 120.4 L' + (x + 3) + ' 125 L' + (x + 1.6) + ' 120.4 L' + (x - 3) + ' 119 L' + (x + 1.6) + ' 117.6 Z" fill="#fff"/>' +
                    '<circle cx="' + (x - 3.5) + '" cy="129" r="2" fill="#fff" opacity=".85"/>';
            }) + '</g>' +
            '<g class="e-dot">' + both(function (x) { return '<ellipse cx="' + x + '" cy="124" rx="5" ry="6.5" fill="' + c.eye + '"/><circle cx="' + (x + 1.6) + '" cy="121.6" r="1.6" fill="#fff"/>'; }) + '</g>' +
            '<g class="e-happy" fill="none" stroke="' + ink + '" stroke-width="4" stroke-linecap="round">' + both(function (x) { return '<path d="M' + (x - 9) + ' 127 Q' + x + ' 115 ' + (x + 9) + ' 127"/>'; }) + '</g>' +
            '<g class="e-shut" fill="none" stroke="' + ink + '" stroke-width="3.6" stroke-linecap="round">' + both(function (x) { return '<path d="M' + (x - 9) + ' 124 Q' + x + ' 131 ' + (x + 9) + ' 124"/>'; }) + '</g>' +
            '<g class="e-squint" fill="none" stroke="' + ink + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M68 117 L83 124 L68 131"/><path d="M132 117 L117 124 L132 131"/></g>' +
            '<g class="b-raise" fill="none" stroke="' + ink + '" stroke-width="3.4" stroke-linecap="round"><path d="M67 106 L86 107"/><path d="M114 105 Q124 96 134 103"/></g>' +
            '<g class="b-worry" fill="none" stroke="' + ink + '" stroke-width="3.4" stroke-linecap="round"><path d="M66 106 Q76 105 86 100"/><path d="M134 106 Q124 105 114 100"/></g>' +
            '<g class="mouths">' +
                '<path class="m-smile" d="M91 145 Q100 153 109 145" fill="none" stroke="' + ink + '" stroke-width="3.4" stroke-linecap="round"/>' +
                '<path class="m-cat" d="M88 144 Q94 151 100 145 Q106 151 112 144" fill="none" stroke="' + ink + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<ellipse class="m-o" cx="100" cy="148" rx="4.2" ry="4.8" fill="#5a2232" stroke="' + ink + '" stroke-width="2.4"/>' +
                '<path class="m-flat" d="M92 148 Q96 145 100 148 Q104 151 108 148" fill="none" stroke="' + ink + '" stroke-width="3.2" stroke-linecap="round"/>' +
                '<path class="m-wobble" d="M89 149 L93 145.5 L97 149.5 L101 145.5 L105 149.5 L109 146" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<g class="m-open"><path d="M87 142 Q100 162 113 142 Z" fill="#5a2232" stroke="' + ink + '" stroke-width="2.8" stroke-linejoin="round"/><ellipse cx="100" cy="152.5" rx="6" ry="3.2" fill="#ff8fa3"/></g>' +
                '<g class="m-round"><ellipse cx="100" cy="149" rx="6.5" ry="8" fill="#5a2232" stroke="' + ink + '" stroke-width="2.6"/><ellipse cx="100" cy="153" rx="4" ry="2.4" fill="#ff8fa3"/></g>' +
            '</g></g>';
    }
    // the whole drawing (id: something unique on the page, for its clip and its eyes' gradient)
    function svg(s, id) {
        var c = s.c, B = SHAPES[s.shape], H = HEADS[s.head] || HEADS.none, faceY = B.face + (+s.face || 0);
        function moved(dy, inner) { return dy && inner ? '<g transform="translate(0 ' + dy + ')">' + inner + '</g>' : inner; }
        function head() { return moved(H.at ? B.top - H.at : 0, H.draw(c)); }
        function extra(name) {
            var E = EXTRAS[name], dy = E.at ? B.top - E.at : E.atFace ? faceY - E.atFace : 0;
            return moved(dy, E.draw(c));
        }
        var back = '', front = '', skin = '';
        s.extras.forEach(function (n) { var E = EXTRAS[n]; if (E.back) back += extra(n); else if (E.skin) skin += extra(n); else front += extra(n); });
        var clip = 'kd-clip-' + id;
        return '<svg class="kd-drawn" viewBox="0 0 200 200" aria-hidden="true">' +
            '<defs><clipPath id="' + clip + '"><path d="' + B.path + '"/></clipPath>' +
            '<linearGradient id="kd-eye-' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stop-color="' + c.eye + '"/><stop offset="1" stop-color="' + c.iris + '"/></linearGradient></defs>' +
            '<g class="k-back">' + (TAILS[s.tail] || TAILS.none).draw(c) + (WINGS[s.wings] || WINGS.none).draw(c) + back + (H.back ? head() : '') + '</g>' +
            '<g class="k-body" opacity="' + Math.max(0.35, Math.min(1, +s.clear || 1)).toFixed(2) + '">' +
                '<path class="k-skin" d="' + B.path + '" fill="' + c.body + '"/>' +
                '<g clip-path="url(#' + clip + ')"><ellipse cx="100" cy="214" rx="96" ry="44" fill="' + c.shade + '" opacity=".55"/>' +
                '<ellipse cx="70" cy="104" rx="15" ry="26" transform="rotate(28 70 104)" fill="' + c.light + '" opacity="' + Math.max(0, Math.min(1, s.shine === undefined ? 0.65 : +s.shine)).toFixed(2) + '"/>' +
                skin + '</g>' +
            '</g>' +
            '<path d="' + B.path + '" fill="none" stroke="' + c.line + '" stroke-width="3.2" stroke-linejoin="round"/>' +
            '<g class="k-front">' + (H.back ? '' : head()) + front + '</g>' +
            '<g transform="translate(0 ' + (faceY - 128) + ')">' + faceSvg(c, id) + '</g>' +
            '</svg>';
    }

    Sky.kotodamaLook = {
        kinds: DEFAULTS, common: COMMON, shapes: SHAPES, heads: HEADS, wings: WINGS, tails: TAILS, extras: EXTRAS, colours: COLOURS,
        faces: FACES,
        spec: spec, svg: svg,
        file: 'assets/characters/kotodama-looks'
    };
})();

#!/usr/bin/env python3
"""
mel-room-slots.py: writes the asset manager's "Mel's room" slots (tools/slots.json, the scene with id
"mel-room") again from the room's own files, so a thing added to the room (a new <g class="obj" ...
data-art="room/objects/<room>/<name>.svg"> in one of schizophyllu.me.room/room/*.svg) turns up in the
asset manager with a slot of its own: assets/mel-room/<room>-<name> (a picture the size of the whole room,
1600 x 900, the thing drawn where it sits). Each room's backdrop is assets/mel-room/<room>.

    python3 tools/mel-room-slots.py        (VS Code: Terminal > Run Task > "DaV-nky: Mel's room slots")

- labels come from the room's own hover labels (script.js / narration.js / room.js: `id: { label: '…' }`)
- a drawing whose code-needed ids are inside the file itself ("the code looks these ids up, so keep them: #a, #b")
  is SVG only (kind "svg"): a flat picture would lose the parts the page switches
- the zoomed-in preview of each stand-in (its "crop") is kept for the slots that had one; a new slot has none
  until it's measured (the asset manager then shows the whole room: that's fine)
- the rest of slots.json is left exactly as it was
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
R = 'schizophyllu.me.room/room/'
SLOTS = os.path.join(HERE, 'slots.json')
ROOMS = [('main', 'room.svg', 'the main room (skizy’s desk, the CRT, the fridge, Mira, Claube)'), ('bedroom', 'bedroom.svg', 'the bedroom'),
         ('hallway', 'hallway.svg', 'the hallway and kitchenette'), ('bathroom', 'bathroom.svg', 'the bathroom'),
         ('closet', 'closet.svg', 'the closet'), ('roof', 'roof.svg', 'the roof')]
# better words than the room's own labels, where those are just a name
NICER = {'main-mira': 'Mira', 'main-skizy': 'skizy, at her desk (Mel)', 'main-claube': 'Claube',
         'main-alone': 'skizy alone in the corner (the quiet room, from reset 3 on)', 'main-mugs': 'mugs', 'main-mugs-2': 'more mugs',
         'main-mugs-3': 'more mugs', 'main-mugs-4': 'even more mugs', 'hallway-htrash': 'the hallway trash', 'main-trash': 'the trash',
         'main-deskbottle': 'the pill bottle left on her desk (only after she’s taken them)'}


def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


def main():
    labels = {}
    for f in ['script.js', 'narration.js', 'room.js']:
        if os.path.exists(os.path.join(ROOT, R + f)):
            for m in re.finditer(r"""^\s*'?([a-z0-9-]+)'?\s*:\s*\{\s*label:\s*(['"])(.*?)\2""", read(R + f), re.M):
                labels.setdefault(m.group(1), m.group(3))
    with open(SLOTS, encoding='utf-8') as f:
        d = json.load(f)
    old = [s for s in d['scenes'] if s.get('id') == 'mel-room']
    crops = {x['slot']: x['crop'] for sc in old for g in sc['groups'] for x in g['slots'] if x.get('crop')}
    groups, total, new = [], 0, []
    for room, file, title in ROOMS:
        if not os.path.exists(os.path.join(ROOT, R + file)):
            continue
        txt = read(R + file)
        slots = [{'slot': 'assets/mel-room/' + room,
                  'what': 'the backdrop of ' + title.split(' (')[0] + ': walls, floor, furniture, everything that isn’t something to click. the lights and darks the scenes switch stay on top of it',
                  'size': '1600 x 900 (the whole room)', 'optional': True, 'stock': R + file}]
        # the things to click (class "obj") and, from 27 Sep, the glows in the rooms' light (class "glow")
        for m in re.finditer(r'<g class="(?:obj|glow)[^"]*" data-id="([^"]+)"[^>]*data-art="room/objects/' + room + r'/([a-z0-9-]+)\.svg"', txt):
            did, name = m.group(1), m.group(2)
            art = R + 'objects/' + room + '/' + name + '.svg'
            if not os.path.exists(os.path.join(ROOT, art)):
                continue
            a = read(art)
            need = re.search(r'the code looks these ids up, so keep them:\s*([^\n>]*?)\s*(?:-->|\n)', a)
            ids = [x.strip() for x in need.group(1).split(',')] if need else []
            # (an id, or a class the page looks up: a glow's .stationglow, say)
            inside = [i for i in ids if re.search(r'(?:id|class)="(?:[^"]*\s)?%s(?:\s[^"]*)?"' % re.escape(i.lstrip('#.')), a)]
            key = '%s-%s' % (room, name)
            what = NICER.get(key) or labels.get(did) or labels.get(name) or did
            glow = re.match(r'glow-[a-z0-9-]+', did) and re.search(r'<!-- glow-[a-z0-9-]+ \([a-z]+\): (.*?)\. a glow on its own', a)
            if glow:
                what = 'glow: ' + glow.group(1) + ' (light only: it\'s blended in "screen" mode, so dark parts vanish)'
            s = {'slot': 'assets/mel-room/' + key, 'what': what, 'size': '1600 x 900: the whole room, see-through, the thing drawn where it sits',
                 'optional': True, 'stock': art}
            if inside:
                s['kind'] = 'svg'
                s['what'] = what + ' (SVG only: the page switches parts of it, so keep these ids: ' + ', '.join(inside) + ')'
            if s['slot'] in crops:
                s['crop'] = crops[s['slot']]
            elif not any(s['slot'] == x['slot'] for sc in old for g in sc['groups'] for x in g['slots']):
                new.append(s['slot'])
            slots.append(s)
        total += len(slots)
        groups.append({'name': title, 'slots': slots})
    scene = {'id': 'mel-room', 'name': 'Mel’s room (schizophyllu.me.room)', 'page': 'schizophyllu.me.room/index.html?from=dav-nky',
             'note': 'Mel’s apartment across the street. every drawing here is the size of the whole room (1600 x 900): draw the thing where it sits in the room and leave the rest see-through, and it lands in place. (open the stand-in to see where.) the ones marked SVG only have parts the page switches on and off; a flat picture would lose them. pictures don’t get the stand-ins’ little animations (a blinking light, Claube’s pen). Mel’s own drawings stay as they are.',
             'groups': groups}
    at = [i for i, s in enumerate(d['scenes']) if s.get('id') == 'mel-room']
    if at:
        d['scenes'][at[0]] = scene
    else:
        d['scenes'].append(scene)
    with open(SLOTS, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(d, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print('Mel’s room: %d slots in tools/slots.json%s' % (total, (' (new: ' + ', '.join(new) + ')') if new else ''))


if __name__ == '__main__':
    sys.exit(main())

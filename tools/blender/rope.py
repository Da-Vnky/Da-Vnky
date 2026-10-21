"""
rope.py: the rope the sky's props hang from (assets/sky/rope), made of the yarn (tools/blender/yarn.py), as a picture
that repeats top to bottom without a visible join.

    blender -b --factory-startup --python tools/blender/rope.py -- --out tools/drawing/sky--rope/rope-yarn.png
            [--w 120] [--h 480] [--colour 0.38,0.22,0.11] [--fuzz 0.6] [--turns 3]

It lays a straight piece of yarn three tiles long, renders it see-through, keeps the middle tile, and blends that tile's
top into the piece that came after its bottom, so one copy runs into the next. The twist fits the tile a whole number of
times (--turns), so the plies line up across the join; only the fuzz and the swell are blended. The colour is the yarn's
(Blender's own linear numbers, as in its colour picker's RGB). Saved into the slot's folder on the drawing table, the
asset manager's card shows it, with "use this" and its repeat preview.
"""

import math
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import yarn                                           # (tools/blender/yarn.py)

TILE_W = 1.0                    # the tile, in Blender units: 1 wide ...
TILE_H = 4.0                    # ... 4 tall (the slot's 60 x 240)
YARN_W = 0.72                   # how much of the tile's width the yarn fills (the fuzz needs the rest)
BLEND = 0.22                    # how much of the tile, at its top, is blended into what follows its bottom


def args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    d = {}
    while a:
        k = a.pop(0)
        if k.startswith('--') and a:
            d[k[2:]] = a.pop(0)
    return d


def make(out, w=120, h=480, colour=(0.38, 0.22, 0.11), fuzz=0.6, turns=3):
    scene = bpy.context.scene
    for ob in list(scene.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    # the camera sees three tiles, one above another
    cd = bpy.data.cameras.new('rope')
    cd.type = 'ORTHO'
    cd.ortho_scale = TILE_H * 3
    cam = bpy.data.objects.new('rope', cd)
    scene.collection.objects.link(cam)
    cam.location = (0.0, -20.0, 0.0)
    cam.rotation_euler = (math.pi / 2, 0.0, 0.0)
    scene.camera = cam
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    scene.collection.objects.link(sun)
    sun.data.energy = 4.0
    sun.rotation_euler = (math.radians(55), math.radians(-25), math.radians(-35))
    if scene.world is None:
        scene.world = bpy.data.worlds.new('World')
    try:
        scene.world.use_nodes = True
    except AttributeError:
        pass
    bgn = scene.world.node_tree.nodes.get('Background') if scene.world.node_tree else None
    if bgn:
        bgn.inputs['Color'].default_value = (0.85, 0.83, 0.8, 1.0)
        bgn.inputs['Strength'].default_value = 0.45
    r = scene.render
    r.resolution_x, r.resolution_y, r.resolution_percentage = int(w), int(h) * 3, 100
    r.film_transparent = True
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try:
            r.engine = eng
            break
        except TypeError:
            pass
    try:
        scene.view_settings.view_transform = 'Standard'
        scene.eevee.taa_render_samples = 96
    except (TypeError, AttributeError):
        pass
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGBA'

    # one straight stroke, top to bottom and past both ends, all the same thickness
    data = (bpy.data.grease_pencils_v3 if hasattr(bpy.data, 'grease_pencils_v3') else bpy.data.grease_pencils).new('rope')
    drawing_ob = bpy.data.objects.new('rope line', data)
    scene.collection.objects.link(drawing_ob)
    dr = data.layers.new('rope').frames.new(1).drawing
    top = TILE_H * 1.5 + 0.6
    n = 200
    dr.add_strokes([n])
    if 'radius' not in dr.attributes:
        dr.attributes.new('radius', 'FLOAT', 'POINT')
    for i in range(n):
        dr.attributes['position'].data[i].vector = (0.0, 0.0, top - 2 * top * i / (n - 1))
        dr.attributes['radius'].data[i].value = 0.05
    ob = yarn.add(scene, drawing_ob)
    mod = ob.modifiers[yarn.GROUP]
    thick = TILE_W * YARN_W / 2.42                     # (the plies, twisted, come to about 2.4 times the Thickness)
    yarn.set_input(mod, 'Thickness', thick)
    yarn.set_input(mod, 'Pressure', 0.0)
    yarn.set_input(mod, 'Fuzz', float(fuzz))
    yarn.set_input(mod, 'Colour', tuple(colour) + (1.0,))
    # a whole number of turns in a tile, so the plies meet themselves at the join
    yarn.set_input(mod, 'Twist length', TILE_H / (int(turns) * 2 * thick))
    rim = bpy.data.objects.get('yarn rim light')
    if rim:
        rim.data.energy = 300.0

    tmp = os.path.abspath(out) + '.three.png'
    r.filepath = tmp
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(tmp)
    W, H3 = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(H3, W, 4)   # (rows from the bottom up)
    h = H3 // 3
    mid, above = px[h:2 * h], px[2 * h:3 * h]          # the middle tile, and the one above it (which follows its top row
    k = max(2, int(h * BLEND))                         #  ... in Blender's bottom-up rows, so: what the next copy meets)
    t = np.linspace(0.0, 1.0, k, dtype=np.float32)[:, None, None]
    # the tile's bottom k rows (in Blender's order, its first k) blend from what really comes after the tile above's
    # bottom (the tile above's first rows) into the middle tile's own, so where one copy meets the next it's continuous
    tile = mid.copy()
    tile[:k] = above[:k] * (1 - t) + mid[:k] * t
    outimg = bpy.data.images.new('rope tile', W, h, alpha=True)
    outimg.pixels[:] = tile.ravel()
    outimg.filepath_raw = os.path.abspath(out)
    outimg.file_format = 'PNG'
    outimg.save()
    try:
        os.remove(tmp)
    except OSError:
        pass
    return out


if __name__ == '__main__':
    d = args()
    if not d.get('out'):
        sys.exit('rope.py needs -- --out <file.png> (see the top of the file)')
    col = tuple(float(x) for x in d['colour'].split(',')) if d.get('colour') else (0.38, 0.22, 0.11)
    make(d['out'], int(d.get('w') or 120), int(d.get('h') or 480), col, float(d.get('fuzz') or 0.6), int(d.get('turns') or 3))
    print('{"made": "%s"}' % d['out'].replace('\\', '/'))

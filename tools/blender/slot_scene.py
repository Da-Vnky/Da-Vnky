"""
slot_scene.py: a slot's canvas as a Blender scene, for the asset manager's "draw it in > Blender" button.

tools/drawtable.py runs it with Blender in the background (nothing shows) and then opens what it made:

    blender -b --factory-startup --python tools/blender/slot_scene.py -- --w 1600 --h 900 --out <folder>/<name>.blend
            --render //<name>-render- [--guide guide.png] [--marks measurements.png] [--art your-picture.png] [--slot assets/x/y]

The scene:
  - a camera looking straight at the canvas (orthographic: no perspective), framing exactly the slot's size, so a render
    is the slot's picture. the 3D views open looking through it
  - behind it, seen only through the camera (never rendered): the slot's guide (the scene around the slot), and, switched
    off till you want them, the measurements and the slot's picture now (Camera properties > Background Images)
  - a Grease Pencil object, "draw here", on the canvas's plane, already in Draw mode, and (Blender 4.3 on) the yarn:
    every stroke becomes thick, fuzzy yarn or a crochet chain (tools/blender/yarn.py: its settings are on the "yarn"
    object's modifier; hide the "yarn" object to render plain strokes)
  - soft light from the upper right (where the site's light comes from)
  - the render: the slot's size, see-through background, colours as painted (Standard), saved by Ctrl+F12 (Render >
    Render Animation: one frame) next to the .blend as <name>-render-0001.png, where the asset manager's card shows it
    with "use this". (F12 only shows it; Ctrl+F12 saves it.)

Works with Blender 4.0 and on (the new Grease Pencil from 4.3 on, the old one before).
"""

import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import yarn                                       # (tools/blender/yarn.py)

VIEW = 10.0                       # the canvas's longer side, in Blender units (the camera's orthographic scale)
DRAW_NAME = 'draw here'


def args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    d = {}
    while a:
        k = a.pop(0)
        if k.startswith('--') and a and not a[0].startswith('--'):
            d[k[2:]] = a.pop(0)
        elif k.startswith('--'):
            d[k[2:]] = ''
    return d


def try_set(target, attr, value):
    try:
        setattr(target, attr, value)
        return True
    except (AttributeError, TypeError, ValueError):
        return False


def grease_pencil(scene):
    """the Grease Pencil object to draw on: the new kind (4.3 on) or the old"""
    if hasattr(bpy.data, 'grease_pencils_v3'):                 # (4.3 to 4.5: both kinds exist; the new one is _v3)
        data = bpy.data.grease_pencils_v3.new(DRAW_NAME)
    else:                                                      # (5.0 on: only the new kind; before 4.3: only the old)
        data = bpy.data.grease_pencils.new(DRAW_NAME)
    ob = bpy.data.objects.new(DRAW_NAME, data)
    scene.collection.objects.link(ob)
    layer = data.layers.new('lines')
    try:
        layer.frames.new(scene.frame_start)
    except Exception:
        pass
    ink = bpy.data.materials.new('ink')
    bpy.data.materials.create_gpencil_data(ink)
    ink.grease_pencil.color = (0.08, 0.06, 0.05, 1.0)
    data.materials.append(ink)
    return ob


def make_scene(w, h, out, render, guide=None, marks=None, art=None, slot=''):
    scene = bpy.context.scene
    for ob in list(scene.objects):                             # (the factory scene's cube, light and camera)
        bpy.data.objects.remove(ob, do_unlink=True)
    scene.name = os.path.splitext(os.path.basename(out))[0]

    # the camera, straight on: it looks along +Y, so the canvas is the X-Z plane (Blender's "front")
    cd = bpy.data.cameras.new('canvas')
    cd.type = 'ORTHO'
    cd.ortho_scale = VIEW
    try_set(cd, 'sensor_fit', 'AUTO')
    cam = bpy.data.objects.new('canvas', cd)
    scene.collection.objects.link(cam)
    cam.location = (0.0, -20.0, 0.0)
    cam.rotation_euler = (math.pi / 2, 0.0, 0.0)
    scene.camera = cam
    # (24 Oct) locked where it is, so the render (Ctrl+F12) always frames exactly the slot, however the view's turned
    cam.lock_location = cam.lock_rotation = cam.lock_scale = (True, True, True)
    cd.show_passepartout = True
    cd.passepartout_alpha = 0.9
    cd.show_background_images = True
    for path, alpha, show in ((guide, 0.6, True), (marks, 0.8, False), (art, 0.6, False)):
        if path and os.path.exists(path):
            bg = cd.background_images.new()
            bg.image = bpy.data.images.load(os.path.abspath(path), check_existing=True)
            bg.alpha = alpha
            bg.show_background_image = show
            try_set(bg, 'frame_method', 'STRETCH')
            try_set(bg, 'display_depth', 'BACK')

    # light from the upper right, and a soft fill all round
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    scene.collection.objects.link(sun)
    sun.data.energy = 4.0
    try_set(sun.data, 'angle', math.radians(10))
    sun.rotation_euler = (math.radians(55), math.radians(-25), math.radians(-35))
    if scene.world is None:
        scene.world = bpy.data.worlds.new('World')
    try_set(scene.world, 'use_nodes', True)                    # (always on from Blender 5)
    if scene.world.node_tree:
        bgn = scene.world.node_tree.nodes.get('Background')
        if bgn:
            bgn.inputs['Color'].default_value = (0.85, 0.83, 0.8, 1.0)
            bgn.inputs['Strength'].default_value = 0.45

    # the render: the slot's size, see-through, as painted, one frame, saved by Ctrl+F12 beside the .blend
    r = scene.render
    r.resolution_x, r.resolution_y, r.resolution_percentage = int(w), int(h), 100
    r.film_transparent = True
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        if try_set(r, 'engine', eng):
            break
    try_set(scene.view_settings, 'view_transform', 'Standard')
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGBA'
    r.filepath = render
    scene.frame_start = scene.frame_end = scene.frame_current = 1

    # the Grease Pencil to draw on, on the canvas's plane, strokes starting where they're drawn
    drawing = grease_pencil(scene)
    if drawing.type == 'GREASEPENCIL':                         # (the yarn needs the new Grease Pencil: Blender 4.3 on)
        yarn.add(scene, drawing)
        try_set(scene.eevee, 'taa_render_samples', 96)       # (the fuzz is finer than a pixel: more samples make it a haze)
    ts = scene.tool_settings
    try_set(ts, 'gpencil_stroke_placement_view3d', 'ORIGIN')
    if hasattr(ts, 'gpencil_sculpt'):
        try_set(ts.gpencil_sculpt, 'lock_axis', 'AXIS_Y')     # (draw on the front plane)
    bpy.context.view_layer.objects.active = drawing
    drawing.select_set(True)

    # every 3D view looks through the camera, shaded as it will render, without the floor grid
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type != 'VIEW_3D':
                continue
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    try_set(space.region_3d, 'view_perspective', 'CAMERA')
                    try_set(space.shading, 'type', 'MATERIAL')
                    for flag in ('show_floor', 'show_axis_x', 'show_axis_y', 'show_axis_z'):
                        try_set(space.overlay, flag, False)

    # open in Draw mode (it's kept with the file)
    for mode in ('PAINT_GREASE_PENCIL', 'PAINT_GPENCIL'):
        try:
            bpy.ops.object.mode_set(mode=mode)
            break
        except Exception:
            pass

    note = bpy.data.texts.new('how to')
    note.from_string('This scene is ' + (slot or 'a canvas') + ' (' + str(w) + ' x ' + str(h) + ').\n\n' + __doc__)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    try_set(bpy.context.preferences.filepaths, 'save_version', 0)   # (no .blend1 backup beside it)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(out), relative_remap=True, compress=True)
    try:                                                       # (the pictures by relative path, so the folder can move)
        bpy.ops.file.make_paths_relative()
        bpy.ops.wm.save_mainfile()
    except Exception:
        pass
    return drawing


if __name__ == '__main__':
    d = args()
    if not d.get('out'):
        sys.exit('slot_scene.py needs -- --w W --h H --out <file.blend> (see the top of the file)')
    make_scene(int(d.get('w') or 1600), int(d.get('h') or 900), d['out'], d.get('render') or '//render-',
                     d.get('guide') or None, d.get('marks') or None, d.get('art') or None, d.get('slot') or '')
    import json
    print(json.dumps({'made': d['out'].replace('\\', '/')}), flush=True)

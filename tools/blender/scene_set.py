"""
scene_set.py: a whole scene of the site as a Blender set, for the asset manager's "open this scene in Blender" button.

tools/scenes.py photographs the scene's page layer by layer (each slot showing on it on its own, see-through round it, the
page's own pieces, and the backdrop) and runs this with Blender in the background, then opens what it made:

    blender -b --factory-startup --python tools/blender/scene_set.py -- --layers <folder>/layers.json --out <folder>/<scene>.blend

The set:
  - a camera ("the page") that sees exactly what the page shows (1920 x 1080; the render is twice that, as the slots'
    pictures are). It has a real lens, so depth of field works: Camera properties > Depth of Field (it's set up, off till you
    turn it on, focused on the "focus here" empty: move that to the layer you want sharp, and lower the F-stop for more blur)
  - every slot of the scene that was showing as a flat picture at its own distance: the back of the page furthest away, each
    layer the page paints on top a step nearer. Each is named by its slot, in a collection of its own (open "layers" in the
    outliner). Move a layer nearer or further (G Y, or its Location Y) and it stays exactly where it is on the page, only
    bigger or smaller in the 3D world (its "keeps its place" modifier), so focus, fog and light fall on it at its depth.
  - what else is on the page, each in its place in the stack, in "the page's other things": other tabs' slots that show here
    (the traveller, the sun and clouds…) and the page's own pieces that aren't slots ("the page itself": a letter, words);
    and furthest back, in "backdrop", "the page's background" (the colours behind it all)
  - each picture's material shows it as painted ("Lit" 0). Raise a layer's "Lit" (its material, the Mix node) to let
    Blender's lights shade it too
  - a Grease Pencil "draw here" in front of everything, with the yarn (tools/blender/yarn.py)
  - an empty collection "post: put light, mist and glow here": what you add there goes back to the site with
    "post-processing → site" as pictures over the page (a box with a volume material for mist, lit by a spot light for
    shafts; each collection inside it its own picture), and its Point lights as bokeh. The World's fog (World > Volume) and
    the camera's depth of field are done live by the site on each layer, at its distance (tools/blender/scene_post.py)
  - the render: see-through, colours as painted (Standard), EEVEE. F12 shows the whole scene as it would look.

Works with Blender 4.2 and on.
"""

import json
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import yarn                                         # (tools/blender/yarn.py)

LENS, SENSOR = 50.0, 36.0          # the camera's lens and film (mm): at 1 unit away it sees SENSOR / LENS units across
BACK, FRONT = 24.0, 8.0            # how far away the back layer and the front layer start (the backdrop goes BACK + 8)
DRAW_AT = 6.0                      # the yarn's "draw here", just in front of them all
LAYERS = 'layers'
OTHERS = "the page's other things"
POST = 'post: put light, mist and glow here'


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


def material(name, path):
    """the picture as painted (emission: Blender's lights don't change it), see-through where it is, with "Lit" to mix
    in Blender's lighting"""
    m = bpy.data.materials.new(name)
    try_set(m, 'use_nodes', True)
    for attr, v in (('surface_render_method', 'DITHERED'), ('blend_method', 'HASHED'), ('shadow_method', 'HASHED'),
                    ('use_backface_culling', False)):
        try_set(m, attr, v)
    t = m.node_tree
    t.nodes.clear()
    img = bpy.data.images.load(path, check_existing=True)
    try_set(img, 'alpha_mode', 'STRAIGHT')
    tex = t.nodes.new('ShaderNodeTexImage')
    tex.image, tex.location = img, (-700, 0)
    try_set(tex, 'interpolation', 'Cubic')
    tex.extension = 'CLIP'
    emit = t.nodes.new('ShaderNodeEmission')
    emit.location = (-380, 120)
    diffuse = t.nodes.new('ShaderNodeBsdfDiffuse')
    diffuse.location = (-380, -60)
    lit = t.nodes.new('ShaderNodeMixShader')
    lit.location, lit.label, lit.name = (-160, 60), 'Lit (0: as painted, 1: by Blender\'s lights)', 'Lit'
    lit.inputs[0].default_value = 0.0
    see = t.nodes.new('ShaderNodeBsdfTransparent')
    see.location = (-160, -140)
    alpha = t.nodes.new('ShaderNodeMixShader')
    alpha.location = (60, 0)
    outn = t.nodes.new('ShaderNodeOutputMaterial')
    outn.location = (260, 0)
    t.links.new(tex.outputs['Color'], emit.inputs['Color'])
    t.links.new(tex.outputs['Color'], diffuse.inputs['Color'])
    t.links.new(emit.outputs[0], lit.inputs[1])
    t.links.new(diffuse.outputs[0], lit.inputs[2])
    t.links.new(tex.outputs['Alpha'], alpha.inputs[0])
    t.links.new(see.outputs[0], alpha.inputs[1])
    t.links.new(lit.outputs[0], alpha.inputs[2])
    t.links.new(alpha.outputs[0], outn.inputs['Surface'])
    return m


def picture_plane(name, box, W, H, mat):
    """a flat rectangle where box is on the page, as seen 1 unit in front of the camera ("keeps its place" scales it)"""
    fw = SENSOR / LENS                                  # (what the camera sees 1 unit away: fw across, fw * H / W high)
    fh = fw * H / W
    x0, x1 = (box['x'] / W - .5) * fw, ((box['x'] + box['w']) / W - .5) * fw
    z0, z1 = (.5 - (box['y'] + box['h']) / H) * fh, (.5 - box['y'] / H) * fh
    me = bpy.data.meshes.new(name)
    me.from_pydata([(x0, 0, z0), (x1, 0, z0), (x1, 0, z1), (x0, 0, z1)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name='UVMap')
    for i, co in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[i].uv = co
    me.materials.append(mat)
    return bpy.data.objects.new(name, me)


KEEP = 'DaV keeps its place'


def keeps_its_place():
    """a geometry node group: the picture grows with how far away it is (its Location Y), so the camera always sees it the
    same size in the same place, wherever along the camera's line you move it (in the geometry, not the object's own Scale,
    which would make it depend on itself)"""
    g = bpy.data.node_groups.get(KEEP)
    if g:
        return g
    g = bpy.data.node_groups.new(KEEP, 'GeometryNodeTree')
    if hasattr(g, 'interface'):
        g.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
        g.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    gi, go = g.nodes.new('NodeGroupInput'), g.nodes.new('NodeGroupOutput')
    gi.location, go.location = (-600, 0), (400, 0)
    me = g.nodes.new('GeometryNodeSelfObject')
    me.location = (-600, -200)
    info = g.nodes.new('GeometryNodeObjectInfo')
    info.location = (-400, -200)
    info.transform_space = 'ORIGINAL'
    xyz = g.nodes.new('ShaderNodeSeparateXYZ')
    xyz.location = (-200, -200)
    pos = g.nodes.new('GeometryNodeInputPosition')
    pos.location = (-200, -60)
    far = g.nodes.new('ShaderNodeMath')
    far.operation, far.location = 'MAXIMUM', (-20, -200)
    far.inputs[1].default_value = 0.01
    grow = g.nodes.new('ShaderNodeVectorMath')
    grow.operation, grow.location = 'SCALE', (20, -60)
    setp = g.nodes.new('GeometryNodeSetPosition')
    setp.location = (200, 0)
    L = g.links.new
    L(me.outputs[0], info.inputs['Object'])
    L(info.outputs['Location'], xyz.inputs[0])
    L(xyz.outputs['Y'], far.inputs[0])
    L(pos.outputs[0], grow.inputs[0])
    L(far.outputs[0], grow.inputs['Scale'])
    L(gi.outputs[0], setp.inputs['Geometry'])
    L(grow.outputs[0], setp.inputs['Position'])
    L(setp.outputs[0], go.inputs[0])
    return g


def layer(scene, parent, L, depth, W, H, folder, i):
    name = L.get('name') or L['slot'].replace('assets/', '') + (' (over)' if L.get('over') else '')
    col = bpy.data.collections.new(name)
    parent.children.link(col)
    mat = material(name, os.path.join(folder, L['file']))
    box = L.get('at') or {'x': 0, 'y': 0, 'w': W, 'h': H}
    plane = picture_plane(name, box, W, H, mat)
    col.objects.link(plane)
    plane.location = (0.0, depth, 0.0)
    plane.lock_rotation = (True, True, True)            # (turned, it wouldn't face the camera: only nearer or further)
    mod = plane.modifiers.new('keeps its place', 'NODES')
    mod.node_group = keeps_its_place()
    for ob in (plane, col):
        ob['dav_slot'] = L.get('slot') or ''
        ob['dav_layer'] = i
        ob['dav_over'] = bool(L.get('over'))            # (what a slot that holds others lays over them: not its picture)
    col['dav_box'] = json.dumps(L.get('box') or box)     # (where it is on the page, all of it)
    col['dav_at'] = json.dumps(box)                      # (what the picture holds: what it painted on the screen)
    col['dav_file'] = L['file']
    return plane


def make(info_path, out):
    info = json.load(open(info_path, encoding='utf-8'))
    folder = os.path.dirname(os.path.abspath(info_path))
    W, H, S = info.get('w', 1920), info.get('h', 1080), info.get('scale', 2)
    scene = bpy.context.scene
    for ob in list(scene.objects):                      # (the factory scene's cube, light and camera)
        bpy.data.objects.remove(ob, do_unlink=True)
    for c in list(scene.collection.children):           # (and its empty "Collection")
        bpy.data.collections.remove(c)
    scene.name = info.get('scene') or 'scene'

    # the camera at the middle of the world, looking along +Y (the page is "front" view: X across, Z up)
    cd = bpy.data.cameras.new('the page')
    cd.type = 'PERSP'
    cd.lens, cd.sensor_width = LENS, SENSOR
    try_set(cd, 'sensor_fit', 'HORIZONTAL')
    cd.clip_start, cd.clip_end = 0.1, 500.0
    cam = bpy.data.objects.new('the page', cd)
    scene.collection.objects.link(cam)
    cam.location = (0.0, 0.0, 0.0)
    cam.rotation_euler = (math.pi / 2, 0.0, 0.0)
    cam.lock_location = cam.lock_rotation = cam.lock_scale = (True, True, True)
    scene.camera = cam
    cd.show_passepartout, cd.passepartout_alpha = True, 0.9

    layers = info['layers']
    back = [L for L in layers if L.get('backdrop')]
    rest = [L for L in layers if not L.get('backdrop')]
    top = bpy.data.collections.new(LAYERS)
    scene.collection.children.link(top)
    others = bpy.data.collections.new(OTHERS)
    scene.collection.children.link(others)
    behind = bpy.data.collections.new('backdrop')
    scene.collection.children.link(behind)
    n = max(1, len(rest) - 1)
    depths = []
    for i, L in enumerate(rest):
        d = BACK - (BACK - FRONT) * i / n if len(rest) > 1 else (BACK + FRONT) / 2
        depths.append(d)
        layer(scene, top if L.get('mine', True) else others, L, d, W, H, folder, i + 1)
    for L in back:
        layer(scene, behind, dict(L, name="the page's background"), BACK + 8, W, H, folder, 0).hide_select = True
        # (it can't be picked by mistake: the arrow in the outliner unlocks it)

    # the focus, for the camera's depth of field (off till you turn it on)
    focus = bpy.data.objects.new('focus here', None)
    focus.empty_display_type = 'SPHERE'
    focus.empty_display_size = 0.4
    scene.collection.objects.link(focus)
    focus.location = (0.0, depths[len(depths) // 2] if depths else 16.0, 0.0)
    cd.dof.use_dof = False
    cd.dof.focus_object = focus
    cd.dof.aperture_fstop = 1.2

    # light from the upper right, as on the site (it only shows on layers you've made "Lit", the yarn, and what you add)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    scene.collection.objects.link(sun)
    sun.data.energy = 4.0
    sun.rotation_euler = (math.radians(55), math.radians(-25), math.radians(-35))
    if scene.world is None:
        scene.world = bpy.data.worlds.new('World')
    try_set(scene.world, 'use_nodes', True)
    if scene.world.node_tree:
        bgn = scene.world.node_tree.nodes.get('Background')
        if bgn:
            bgn.inputs['Color'].default_value = (0.85, 0.83, 0.8, 1.0)
            bgn.inputs['Strength'].default_value = 0.45

    post = bpy.data.collections.new(POST)
    scene.collection.children.link(post)

    # the render: what the page shows, at twice its size, see-through, as painted
    r = scene.render
    r.resolution_x, r.resolution_y, r.resolution_percentage = int(W * S), int(H * S), 100
    r.film_transparent = True
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        if try_set(r, 'engine', eng):
            break
    try_set(scene.view_settings, 'view_transform', 'Standard')
    try_set(scene.eevee, 'taa_render_samples', 64)
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGBA'
    r.filepath = '//' + (info.get('scene') or 'scene') + '-render-'
    scene.frame_start = scene.frame_end = scene.frame_current = 1

    # the yarn's "draw here", in front of everything (strokes land on its plane)
    drawing = None
    if hasattr(bpy.data, 'grease_pencils_v3') or bpy.app.version >= (5, 0, 0):
        data = (bpy.data.grease_pencils_v3 if hasattr(bpy.data, 'grease_pencils_v3') else bpy.data.grease_pencils).new('draw here')
        drawing = bpy.data.objects.new('draw here', data)
        scene.collection.objects.link(drawing)
        drawing.location = (0.0, DRAW_AT, 0.0)
        lay = data.layers.new('lines')
        try:
            lay.frames.new(1)
        except Exception:
            pass
        ink = bpy.data.materials.new('ink')
        bpy.data.materials.create_gpencil_data(ink)
        ink.grease_pencil.color = (0.08, 0.06, 0.05, 1.0)
        data.materials.append(ink)
        yarn.add(scene, drawing)
        ts = scene.tool_settings
        try_set(ts, 'gpencil_stroke_placement_view3d', 'ORIGIN')
        if hasattr(ts, 'gpencil_sculpt'):
            try_set(ts.gpencil_sculpt, 'lock_axis', 'AXIS_Y')

    # every 3D view looks through the camera, shaded as it will render, without the floor grid
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type != 'VIEW_3D':
                continue
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    try_set(space.region_3d, 'view_perspective', 'CAMERA')
                    try_set(space.shading, 'type', 'MATERIAL')
                    try_set(space, 'clip_end', 1000.0)
                    for flag in ('show_floor', 'show_axis_x', 'show_axis_y', 'show_axis_z'):
                        try_set(space.overlay, flag, False)

    note = bpy.data.texts.new('how to')
    note.from_string('This is ' + (info.get('name') or info.get('scene') or 'a scene') + ' (' + info.get('page', '') + ', '
                     + (('the view "' + info['view'] + '"') if info.get('view') else 'as it first opens') + ', '
                     + str(len(rest)) + ' layers, photographed ' + info.get('made', '') + ').\n\n' + __doc__)
    scene['dav_scene'] = info.get('scene') or ''
    scene['dav_page'] = info.get('page') or ''
    try_set(bpy.context.preferences.filepaths, 'save_version', 0)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(out), relative_remap=True, compress=True)
    try:
        bpy.ops.file.make_paths_relative()
        bpy.ops.wm.save_mainfile()
    except Exception:
        pass
    return len(rest)


if __name__ == '__main__':
    d = args()
    if not d.get('layers') or not d.get('out'):
        sys.exit('scene_set.py needs -- --layers <layers.json> --out <file.blend> (see the top of the file)')
    n = make(d['layers'], d['out'])
    print(json.dumps({'made': d['out'].replace('\\', '/'), 'layers': n}), flush=True)

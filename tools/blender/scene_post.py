"""
scene_post.py: a scene's post-processing, from Blender back to the site, for the asset manager's "post-processing → site".

tools/scenes.py runs it with Blender in the background on the scene's own .blend (as you last saved it):

    blender -b <folder>/<scene>.blend --python tools/blender/scene_post.py -- --info <folder>/layers.json --out <folder>/post

It reads the set tools/blender/scene_set.py made (each slot's picture at its depth) and what you've done to it, and writes:

  1. what the site does itself, live (post.json "slots"): each layer's blur from the camera's depth of field (at its
     distance, with your focus and F-stop) and its haze from the World's fog (World > Volume: its Density and Colour, over the
     layer's distance; or, unplugged, a volume node named "haze" in the World, for the site only, since a plugged-in World
     fog blacks out a sun-lit 3D model in Blender's own render). The site lays these on the pictures that are there now, so they fit any screen, and your own
     pictures stay as they are.
  2. light, mist and glow (post.json "overlays"): what's in the "post: put light, mist and glow here" collection, rendered
     on its own (every slot's picture holds it out where it's nearer, so a rock in front hides the light shaft behind it).
     One picture for what's loose in it, and one for each collection inside it (so they can be put on and off apart).
  3. bokeh lights (post.json "bokeh"): every Point light in the post collection is a soft disc of light on the site, where
     it is, its size from the depth of field at its distance and its own Radius (at least 36 px), its colour; the site makes them breathe,
     drift a little and glow brighter at dusk. Custom properties on the light: "pulse" (seconds a breath, 0 for still),
     "drift" (how far it wanders, in px), "day" (0 to 1: how much shows by day).
  4. pictures baked in Blender (post.json "baked"): a layer's picture is rendered again only when there's something the site
     can't do itself: the compositor is on, its material's "Lit" is up, it's been moved sideways or turned, or there's more
     in its collection than its picture (your yarn, a 3D model). Rendered without the depth of field and fog (the site adds
     those), cut to the slot's own box, at twice the size it's shown; what the compositor spills past the box (glare) goes
     into a "spill" overlay. These come back to the slot's card on the drawing table, to "use this" if you like it.
  5. the camera (post.json "camera", "depths"; 25 Oct): its lens, film, F-stop and focus, the toy camera's settings
     (tools/blender/toycam.py), and how far away every layer is (the page's other things too: the traveller, the sky), so the
     site can slide them as a camera would and move the focus itself.
"""

import json
import math
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import toycam                                       # (tools/blender/toycam.py)

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


# ---------------- the camera: how far things are, where they land on the page, and the depth of field ----------------
def view(scene):
    cam = scene.camera
    m = cam.matrix_world
    fwd = (m.to_3x3() @ __import__('mathutils').Vector((0, 0, -1))).normalized()
    return cam, m.translation.copy(), fwd


def depth_of(scene, point):
    cam, at, fwd = view(scene)
    return (point - at).dot(fwd)


def to_page(scene, point, W, H):
    """a point in the world -> where it is on the page (CSS px of the 1920 x 1080 frame)"""
    from bpy_extras.object_utils import world_to_camera_view
    v = world_to_camera_view(scene, scene.camera, point)
    return v.x * W, (1 - v.y) * H, v.z


def focus_distance(scene):
    cd = scene.camera.data
    if cd.dof.focus_object:
        return max(0.001, depth_of(scene, cd.dof.focus_object.matrix_world.translation))
    return max(0.001, cd.dof.focus_distance)


def blur_px(scene, d, W):
    """how blurred something at distance d is, as a CSS blur (px, in the 1920-wide frame): the circle of confusion of a thin
    lens (what Blender's depth of field draws), as a soft blur about a third of the circle across"""
    cd = scene.camera.data
    if not cd.dof.use_dof or d <= 0:
        return 0.0
    unit = scene.unit_settings.scale_length or 1.0
    f = cd.lens / 1000.0 / unit                        # (the lens, in the scene's units)
    n = max(0.01, cd.dof.aperture_fstop)
    s = focus_distance(scene)
    if s <= f:
        return 0.0
    coc = (f / n) * f * abs(d - s) / (d * (s - f))     # (on the film, scene units)
    film = cd.sensor_width / 1000.0 / unit
    return round(coc / film * W / 3.0, 2)


# ---------------- the World's fog ----------------
def world_fog(scene):
    """-> (density, colour 0..1) from World > Volume (Volume Scatter, Principled Volume, Volume Absorption), or (0, None)"""
    w = scene.world
    if not w or not w.node_tree:
        return 0.0, None
    out = next((n for n in w.node_tree.nodes if n.type == 'OUTPUT_WORLD' and getattr(n, 'is_active_output', True)), None)
    if out and out.inputs['Volume'].is_linked:
        node = out.inputs['Volume'].links[0].from_node
    else:
        # a volume node named or labelled "haze" in the World, left unplugged: fog for the site only. (plugged in, Blender
        # draws it too, but a sun's light then never gets through it, so a 3D model lit by a sun goes black in Blender's
        # own render: an infinite fog swallows light from infinitely far away)
        node = next((n for n in w.node_tree.nodes if 'haze' in (n.name + ' ' + n.label).lower() and n.type.startswith('VOLUME')
                     or 'haze' in (n.name + ' ' + n.label).lower() and n.type == 'PRINCIPLED_VOLUME'), None)
        if node is None:
            return 0.0, None

    def val(name, default):
        s = node.inputs.get(name)
        if s is None or s.is_linked:
            return default
        return s.default_value
    density = float(val('Density', 0.0))
    col = val('Color', (0.8, 0.8, 0.8, 1.0))
    col = tuple(float(c) for c in col[:3])
    if node.type == 'VOLUME_ABSORPTION':
        col = tuple(c * 0.25 for c in col)               # (absorbing: things go darker, towards its colour)
    return density, col


def haze(density, d):
    return round(1.0 - math.exp(-max(0.0, density) * max(0.0, d)), 3) if density > 0 else 0.0


def srgb(c):
    """Blender's linear colour -> the screen's 0..255"""
    out = []
    for x in c:
        x = max(0.0, min(1.0, x))
        x = 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
        out.append(int(round(x * 255)))
    return out


# ---------------- the set: its layers and their pictures ----------------
def layers_of():
    """each picture's collection (made by scene_set.py), its picture, and where it started"""
    out = []
    for col in bpy.data.collections:
        if 'dav_layer' not in col.keys():               # (every picture of the set: the slots, the page's own, the backdrop)
            continue
        plane = next((o for o in col.objects if 'dav_layer' in o.keys()), None)
        if plane is None:
            continue
        out.append({'col': col, 'plane': plane, 'slot': col['dav_slot'], 'over': bool(col.get('dav_over')),
                    'layer': int(col.get('dav_layer') or 0),
                    'box': json.loads(col.get('dav_box') or 'null'), 'at': json.loads(col.get('dav_at') or 'null')})
    return out


def lit_of(plane):
    m = plane.active_material
    n = m and m.node_tree and m.node_tree.nodes.get('Lit')
    return float(n.inputs[0].default_value) if n else 0.0


def compositing_on(scene):
    """the compositor's on and does something (more than the render straight to the result)"""
    tree = getattr(scene, 'compositing_node_group', None)           # (Blender 5 on)
    if tree is None and 'node_tree' in dir(scene) and scene.use_nodes:   # (before 5)
        tree = scene.node_tree
    if tree is None:
        return False
    kinds = {n.bl_idname for n in tree.nodes}
    return bool(kinds - {'CompositorNodeRLayers', 'CompositorNodeComposite', 'CompositorNodeViewer', 'NodeGroupOutput',
                         'NodeGroupInput', 'NodeFrame', 'NodeReroute'})


def why_baked(scene, L, comp):
    """what about this layer the site can't do itself (-> a reason, or '')"""
    p = L['plane']
    if L['col'].get('dav_3d'):
        return 'it\'s 3D (its own Blender scene)'
    extra = [o for o in L['col'].all_objects if o is not p and o.type not in ('EMPTY', 'LIGHT') and not o.hide_render]
    if extra:
        return 'there\'s more in its collection than its picture (' + ', '.join(o.name for o in extra[:3]) + ')'
    if lit_of(p) > 0.001:
        return 'its material is Lit'
    if abs(p.location.x) > 1e-4 or abs(p.location.z) > 1e-4 or any(abs(r) > 1e-4 for r in p.rotation_euler) or \
       any(abs(s - 1) > 1e-4 for s in p.scale):
        return 'it\'s been moved sideways, turned or resized'
    if comp:
        return 'the compositor is on'
    return ''


# ---------------- rendering ----------------
class Hold:
    """everything's visibility, the camera's depth of field and the world's fog, put back as they were afterwards"""

    def __init__(self, scene):
        self.scene = scene
        self.obs = {o.name: o.hide_render for o in scene.objects}
        cd = scene.camera.data
        self.dof = cd.dof.use_dof
        self.links = []
        self.mats = {}
        self.grown = {}
        r = scene.render
        self.r = (r.use_border, r.use_crop_to_border, r.border_min_x, r.border_max_x, r.border_min_y, r.border_max_y,
                  r.resolution_percentage, r.filepath, r.film_transparent, r.use_compositing, r.engine)

    def no_fog(self):
        w = self.scene.world
        if w and w.node_tree:
            for n in w.node_tree.nodes:
                if n.type == 'OUTPUT_WORLD' and n.inputs['Volume'].is_linked:
                    lk = n.inputs['Volume'].links[0]
                    self.links.append((lk.from_socket, lk.to_socket))
                    w.node_tree.links.remove(lk)

    def matte(self, plane, value):
        """the picture as flat black (value 0) or flat white (1) where it isn't see-through: rendering the light and mist
        over the pictures both ways tells how much of them it covers (difference matting)"""
        m = plane.active_material
        if not m:
            return
        t = m.node_tree
        if m.name in self.mats:
            self.mats[m.name][1].inputs['Color'].default_value = (value, value, value, 1.0)
            return
        alpha = next((n for n in t.nodes if n.type == 'MIX_SHADER' and n.name != 'Lit'), None)
        if alpha is None:
            return
        if int(plane.get('dav_layer', 1)) == 0 and plane.name not in self.grown:   # (the backdrop reaches past the frame,
            self.grown[plane.name] = tuple(plane.scale)                         #  so the blur at the edges has it too)
            plane.scale = tuple(x * 1.15 for x in plane.scale)
        flat = t.nodes.new('ShaderNodeEmission')
        flat.inputs['Color'].default_value = (value, value, value, 1.0)
        was = alpha.inputs[2].links[0].from_socket if alpha.inputs[2].is_linked else None
        t.links.new(flat.outputs[0], alpha.inputs[2])
        self.mats[m.name] = (alpha, flat, was)

    def back(self):
        sc = self.scene
        for name, h in self.obs.items():
            o = sc.objects.get(name)
            if o:
                o.hide_render = h
        sc.camera.data.dof.use_dof = self.dof
        for a, b in self.links:
            sc.world.node_tree.links.new(a, b)
        self.links = []
        for name, (alpha, hold, was) in self.mats.items():
            t = bpy.data.materials[name].node_tree
            if was:
                t.links.new(was, alpha.inputs[2])
            t.nodes.remove(hold)
        self.mats = {}
        for name, was in self.grown.items():
            bpy.data.objects[name].scale = was
        self.grown = {}
        r = sc.render
        (r.use_border, r.use_crop_to_border, r.border_min_x, r.border_max_x, r.border_min_y, r.border_max_y,
         r.resolution_percentage, r.filepath, r.film_transparent, r.use_compositing, r.engine) = self.r


def only(scene, keep, hold, force=()):
    """only these render (as they were: what you'd switched off in the render stays off), and force ones even if off"""
    keep, force = set(keep), set(force)
    for o in scene.objects:
        if o.type in ('LIGHT', 'CAMERA'):
            continue                                      # (the lights light everything, as in the scene)
        o.hide_render = not (o in force or (o in keep and not hold.obs.get(o.name, False)))


def render(scene, path, box=None, W=1920, H=1080, pad=0, pct=100):
    """one frame, see-through, to path. box (CSS px of the frame) + pad: only that part, cut to it. pct: the size (the light
    and mist are soft, so they're rendered at the page's own size, half the slots')"""
    r = scene.render
    r.film_transparent = True
    r.resolution_percentage = pct
    if box:
        x0, y0 = max(0, box['x'] - pad), max(0, box['y'] - pad)
        x1, y1 = min(W, box['x'] + box['w'] + pad), min(H, box['y'] + box['h'] + pad)
        r.use_border, r.use_crop_to_border = True, True
        r.border_min_x, r.border_max_x = x0 / W, x1 / W
        r.border_min_y, r.border_max_y = 1 - y1 / H, 1 - y0 / H
    else:
        r.use_border = False
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGBA'
    r.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def pixels(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]     # (top row first)
    bpy.data.images.remove(img)
    return a


def save(a, path):
    h, w = a.shape[:2]
    img = bpy.data.images.new('out', w, h, alpha=True)
    img.pixels[:] = a[::-1].ravel()
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)


def unmatte(black, white):
    """the same frame rendered over black pictures and over white ones -> what's in front of them, on its own (straight
    colour and its alpha): over black it's just itself; how much of the white still shows through is 1 - its alpha"""
    def pre(x):                                         # (the files are straight colour: premultiplied, to add up)
        return x[..., :3] * x[..., 3:4], x[..., 3:4]
    b, ab = pre(black)
    w, aw = pre(white)
    through = np.clip((w - b).mean(axis=2, keepdims=True), 0.0, 1.0)            # (the white that shows through)
    alpha = np.clip(np.where(ab > 0.999, 1.0 - through, ab), 0.0, 1.0)          # (a picture behind: the matte; else as it came)
    rgb = np.where(alpha > 1e-4, b / np.maximum(alpha, 1e-4), 0.0)
    return np.concatenate([np.clip(rgb, 0, 1), alpha], axis=2).astype(np.float32)


def has_any(a):
    return a.size and float(a[..., 3].max()) > 0.004


# ---------------- the whole job ----------------
def post(info_path, out):
    scene = bpy.context.scene
    info = json.load(open(info_path, encoding='utf-8'))
    W, H, S = info.get('w', 1920), info.get('h', 1080), info.get('scale', 2)
    os.makedirs(out, exist_ok=True)
    os.makedirs(os.path.join(out, 'baked'), exist_ok=True)
    r = scene.render
    r.resolution_x, r.resolution_y = int(W * S), int(H * S)
    density, fogc = world_fog(scene)
    comp = compositing_on(scene)
    layers = layers_of()
    mine = {L['slot'] for L in info['layers'] if L.get('slot') and L.get('mine', True)}   # (this scene's own slots)
    res = {'scene': info.get('scene'), 'page': info.get('page'), 'w': W, 'h': H, 'slots': {}, 'overlays': [], 'bokeh': [],
           'baked': [], 'fog': {'density': round(density, 5), 'colour': srgb(fogc) if fogc else None},
           'dof': {'on': bool(scene.camera.data.dof.use_dof), 'fstop': round(scene.camera.data.dof.aperture_fstop, 3),
                   'focus': round(focus_distance(scene), 3)}}

    # 1. each layer's blur and haze, at its distance
    for L in layers:
        if L['layer'] == 0 or L['slot'] not in mine:
            continue
        p = L['plane']
        d = depth_of(scene, p.matrix_world.translation)
        b, h = blur_px(scene, d, W), haze(density, d)
        hidden = bool(L['col'].hide_render or (p.hide_render and not L['col'].get('dav_3d')))
        e = res['slots'].setdefault(L['slot'], {})
        key = 'over' if L['over'] else 'self'
        e[key] = {'depth': round(d, 3), 'blur': b, 'haze': h}
        if hidden:
            e[key]['hidden'] = True

    # 5. the camera, and how far away every picture is (the page's other things too), for the site's toy camera
    cd = scene.camera.data
    res['camera'] = {'lens': round(cd.lens, 3), 'film': round(cd.sensor_width, 3), 'unit': scene.unit_settings.scale_length or 1.0,
                     'fstop': round(cd.dof.aperture_fstop, 3), 'focus': round(focus_distance(scene), 3),
                     'dof': bool(cd.dof.use_dof), 'toy': toycam.read(scene.camera)}
    res['depths'] = {}
    for L in layers:
        if L['layer'] == 0 or L['over'] or not L['slot'] or L['col'].hide_render:
            continue
        res['depths'][L['slot']] = round(depth_of(scene, L['plane'].matrix_world.translation), 3)

    hold = Hold(scene)
    try:
        # 2. the post collection: light, mist and glow, held out by every picture nearer than it
        pc = bpy.data.collections.get(POST)
        groups = []
        if pc:
            loose = [o for o in pc.objects if o.type not in ('LIGHT', 'CAMERA')]
            if loose:
                groups.append(('post', loose))
            for c in pc.children:
                obs = [o for o in c.all_objects if o.type not in ('LIGHT', 'CAMERA')]
                if obs:
                    groups.append((c.name, obs))
        for i, (name, obs) in enumerate(groups):
            if all(o.hide_render for o in obs):
                continue
            hold.no_fog()
            scene.render.use_compositing = False          # (the compositor's part is in the baked pictures and the spill)
            planes = [L['plane'] for L in layers]
            only(scene, obs, hold, force=planes)   # (every picture, 3D ones' flat pictures too, holds it out)
            shots = []
            for value in (0.0, 1.0):                      # (over black pictures, then over white ones)
                for p in planes:
                    hold.matte(p, value)
                path = os.path.join(out, 'matte-%d-%d.png' % (i + 1, value))
                render(scene, path, pct=int(100 / S))
                shots.append(pixels(path))
                os.remove(path)
            a = unmatte(*shots)
            if has_any(a):
                path = os.path.join(out, 'overlay-%d.png' % (i + 1))
                save(a, path)
                res['overlays'].append({'name': name, 'file': os.path.basename(path)})
            hold.back()
            hold = Hold(scene)

        # 3. bokeh: the post collection's point lights
        if pc:
            for o in pc.all_objects:
                if o.type != 'LIGHT' or o.data.type != 'POINT' or o.hide_render:
                    continue
                x, y, d = to_page(scene, o.matrix_world.translation, W, H)
                if d <= 0:
                    continue
                cd = scene.camera.data
                film = cd.sensor_width / 1000.0 / (scene.unit_settings.scale_length or 1.0)
                f = cd.lens / 1000.0 / (scene.unit_settings.scale_length or 1.0)
                radius = getattr(o.data, 'shadow_soft_size', 0.25) * max(o.matrix_world.to_scale())
                own = 2 * radius * f / d / film * W            # (its own size, as seen)
                size = max(36.0, own, blur_px(scene, d, W) * 3.0)      # (a light with no Radius: a small glow)
                if not (-size < x < W + size and -size < y < H + size):
                    continue                                     # (off the screen)
                # what it hangs on: the picture of this scene whose box it's in, nearest in distance (a lamp in the port
                # city goes with the city as it moves), its place a share of that box
                anchor, best = None, None
                for L in layers:
                    b = L['box']
                    if L['slot'] not in mine or L['over'] or not b or not (b['x'] <= x <= b['x'] + b['w'] and b['y'] <= y <= b['y'] + b['h']):
                        continue
                    gap = abs(depth_of(scene, L['plane'].matrix_world.translation) - d)
                    if best is None or gap < best:
                        anchor, best = L, gap
                extra = {}
                if anchor:
                    b = anchor['box']
                    extra = {'on': anchor['slot'], 'ox': round((x - b['x']) / b['w'], 4), 'oy': round((y - b['y']) / b['h'], 4),
                             # (further away than the picture: behind it, the city in front of its lamps' glow)
                             'behind': d > depth_of(scene, anchor['plane'].matrix_world.translation)}
                res['bokeh'].append(dict(extra, **{'name': o.name, 'x': round(x / W, 4), 'y': round(y / H, 4), 'size': round(size, 1),
                                     'colour': srgb(o.data.color), 'strength': round(min(1.0, max(0.12, o.data.energy / 100.0)), 3),
                                     'pulse': float(o.get('pulse', 5.0)), 'drift': float(o.get('drift', 6.0)),
                                     'day': float(o.get('day', 0.35))}))

        # 4. pictures the site can't do itself, baked, without depth of field or fog; the compositor's spill kept apart
        spill = None
        PAD = 60 if comp else 0
        for L in layers:
            if L['slot'] not in mine or L['over'] or L['layer'] == 0:
                continue
            why = why_baked(scene, L, comp)
            if not why:
                continue
            box = L['box'] or L['at']
            on = {'x': max(0, box['x']), 'y': max(0, box['y'])}
            on['w'], on['h'] = min(W, box['x'] + box['w']) - on['x'], min(H, box['y'] + box['h']) - on['y']
            if on['w'] < 2 or on['h'] < 2:
                continue
            three = bool(L['col'].get('dav_3d'))
            if three:
                # 3D: as real as it gets. its own render engine and samples (Cycles for the rock), and the depth of field
                # and fog done for real across its shape; the site then leaves it as it is (post-<scene>.json "baked")
                eng = L['col'].get('dav_engine')
                if eng:
                    try_set(scene.render, 'engine', eng)
                    if eng == 'CYCLES':
                        try_set(scene.cycles, 'samples', int(L['col'].get('dav_samples') or 128))
                        try_set(scene.cycles, 'device', L['col'].get('dav_device') or 'GPU')
                keep = [o for o in L['col'].all_objects if o is not L['plane']]
                hold.no_fog()                             # (the fog's laid on after, by its distance: see above world_fog)
                for o in scene.objects:                   # (lit only by its own lights, as in its own scene)
                    if o.type == 'LIGHT' and o not in keep:
                        o.hide_render = True
            else:
                # a flat picture: without the depth of field and fog (the site lays those on, live, as everywhere else)
                scene.camera.data.dof.use_dof = False
                hold.no_fog()
                keep = list(L['col'].all_objects)
            only(scene, keep, hold)
            name = L['slot'].replace('assets/', '').replace('/', '-')
            path = os.path.join(out, 'baked', name + '-wide.png')
            render(scene, path, on, W, H, PAD)
            a = pixels(path)
            os.remove(path)
            # where the box sits in what was rendered (the render's own pixels, S per CSS px)
            x0, y0 = max(0, on['x'] - PAD), max(0, on['y'] - PAD)
            bx, by = int(round((on['x'] - x0) * S)), int(round((on['y'] - y0) * S))
            bw, bh = int(round(on['w'] * S)), int(round(on['h'] * S))
            inner = a[by:by + bh, bx:bx + bw].copy()
            if three and density > 0 and fogc:
                h = haze(density, depth_of(scene, L['plane'].matrix_world.translation))
                inner[..., :3] = inner[..., :3] * (1 - h) + np.array(srgb(fogc), dtype=np.float32) / 255 * h   # (the file's colours, straight: alpha as it is)
            save(inner, os.path.join(out, 'baked', name + '.png'))
            res['baked'].append({'slot': L['slot'], 'file': 'baked/' + name + '.png', 'why': why, 'real': three,
                                 'cut': on['w'] < box['w'] - 1 or on['h'] < box['h'] - 1})
            if PAD:
                # what the compositor adds past the box (glare, glow): the same render without it, taken away. what the
                # picture paints past its box by itself (a shadow) the page draws already, so that's left out
                scene.render.use_compositing = False
                render(scene, path, on, W, H, PAD)
                plain = pixels(path)
                os.remove(path)
                glow = np.clip(a[..., :3] * a[..., 3:4] - plain[..., :3] * plain[..., 3:4], 0.0, None)
                glow[by:by + bh, bx:bx + bw] = 0
                if float(glow.max()) > 0.004:
                    if spill is None:
                        spill = np.zeros((int(H * S), int(W * S), 3), dtype=np.float32)
                    X, Y = int(round(x0 * S)), int(round(y0 * S))
                    h, w = glow.shape[:2]
                    h, w = min(h, spill.shape[0] - Y), min(w, spill.shape[1] - X)
                    spill[Y:Y + h, X:X + w] += glow[:h, :w]                       # (light adds up)
            hold.back()
            hold = Hold(scene)
        if spill is not None and float(spill.max()) > 0.004:
            # light, to be added over the page (blend: screen): as bright as it is, and as see-through as it's dim
            al = np.clip(spill.max(axis=2, keepdims=True), 0.0, 1.0)
            rgb = np.where(al > 1e-5, np.clip(spill, 0, 1) / np.maximum(al, 1e-5), 0.0)
            save(np.concatenate([np.clip(rgb, 0, 1), al], axis=2).astype(np.float32), os.path.join(out, 'overlay-spill.png'))
            res['overlays'].append({'name': 'spill', 'file': 'overlay-spill.png', 'blend': 'screen'})
    finally:
        hold.back()
    with open(os.path.join(out, 'post-blender.json'), 'w', encoding='utf-8') as f:
        json.dump(res, f, indent=1)
    return res


if __name__ == '__main__':
    d = args()
    if not d.get('info') or not d.get('out'):
        sys.exit('scene_post.py needs -- --info <layers.json> --out <folder> (see the top of the file)')
    r = post(d['info'], d['out'])
    print(json.dumps({'posted': d['out'].replace('\\', '/'), 'overlays': len(r['overlays']), 'baked': len(r['baked']),
                      'bokeh': len(r['bokeh'])}), flush=True)

"""
toycam.py: the toy camera's settings, kept on a scene's camera ("the page") as custom properties (25 Oct).

The artist: the page "as if viewed through a camera", the way Blender's depth of field makes the set look like toys and props.
Blender already gives the site the focus, the F-stop and each layer's distance (tools/blender/scene_post.py); these say what
the site's camera does with them (sky/postfx.js "the toy camera"). Find them on the camera: Object Properties > Custom
Properties. Change them, save, and press "post-processing -> site" again.

  toy camera           on or off (a scene made before 25 Oct has none of these: off, as it was)
  toy: camera move     how far the camera slides as the pointer moves, in Blender units: near things slide one way, far
                       things the other, the focus stays put (0 = still)
  toy: handheld        a slow, faint sway, as if someone's holding it (0 = on a tripod)
  toy: vignette        how dark the corners go
  toy: grain           film grain
  toy: warmth          the colour: up = warmer, below 0 = cooler
  toy: punch           a little more colour and contrast, like a photo of a model (costs the most: keep it low)
  toy: rack focus      seconds the focus takes to move to what the visitor points at (0 = it stays where you set it)

scene_set.py adds them to a new scene's camera (switched on); tools/blender/scene_post.py reads them. Run alone (Blender's
Scripting tab: open this file, Run Script) it adds whatever's missing to the scene's camera, switched on.
"""

TOY = [
    # (name, default, min, max, what it does)
    ('toy camera', 1, 0, 1, 'The site sees the page through a camera: 1 = on, 0 = off'),
    ('toy: camera move', 0.15, 0.0, 1.0, 'How far the camera slides as the pointer moves (Blender units); 0 = still'),
    ('toy: handheld', 0.3, 0.0, 1.0, 'A slow, faint sway, as if held by hand; 0 = on a tripod'),
    ('toy: vignette', 0.45, 0.0, 1.0, 'How dark the corners go'),
    ('toy: grain', 0.25, 0.0, 1.0, 'Film grain'),
    ('toy: warmth', 0.12, -1.0, 1.0, 'The colour: up = warmer, below 0 = cooler'),
    ('toy: punch', 0.0, 0.0, 1.0, 'More colour and contrast (costs visitors the most: keep it low)'),
    ('toy: rack focus', 0.9, 0.0, 3.0, 'Seconds the focus takes to move to what the visitor points at; 0 = it stays put'),
]
KEYS = {'toy camera': 'on', 'toy: camera move': 'move', 'toy: handheld': 'handheld', 'toy: vignette': 'vignette',
        'toy: grain': 'grain', 'toy: warmth': 'warmth', 'toy: punch': 'punch', 'toy: rack focus': 'rack'}


def add(cam, on=True):
    """the settings onto the camera object, each with its range and a line of what it does (any already there are kept)"""
    for name, default, lo, hi, what in TOY:
        if name in cam.keys():
            continue
        cam[name] = (1 if on else 0) if name == 'toy camera' else default
        try:
            ui = cam.id_properties_ui(name)
            if name == 'toy camera':
                ui.update(min=0, max=1, description=what)
            else:
                ui.update(min=lo, max=hi, soft_min=lo, soft_max=hi, step=1, precision=2, description=what)
        except (AttributeError, TypeError):
            pass


def read(cam):
    """-> {on, move, handheld, vignette, grain, warmth, punch, rack} for the site; none set: off"""
    out = {}
    for name, default, lo, hi, what in TOY:
        try:
            v = float(cam.get(name, default))
        except (TypeError, ValueError):
            v = default
        out[KEYS[name]] = round(min(hi, max(lo, v)), 3)
    out['on'] = bool(cam.get('toy camera', 0))
    return out


if __name__ == '__main__':
    import bpy
    if bpy.context.scene.camera:
        add(bpy.context.scene.camera)
        print('the toy camera\'s settings are on "%s" (Object Properties > Custom Properties)' % bpy.context.scene.camera.name)

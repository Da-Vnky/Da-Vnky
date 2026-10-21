"""
yarn.py: draw with Grease Pencil in Blender and every stroke becomes thick, fuzzy yarn (or a crochet chain).

Needs Blender 4.3 or newer (the new Grease Pencil). Two ways it's used:

  1. the asset manager: a slot's card, "draw it in" > Blender. tools/blender/slot_scene.py makes the slot a scene and adds
     the yarn to its "draw here" object (with add(scene, drawing) below).
  2. in any scene of your own: Blender's Scripting tab > Open this file > Run Script. it adds a Grease Pencil object to draw
     on ("draw your yarn here") and the yarn that follows it ("yarn").

Draw, and pen pressure makes the yarn thicker and thinner (the brush's own size doesn't matter: Thickness does).
The yarn's settings are on the "yarn" object: Properties > Modifiers (the wrench) > DaV yarn:
  Crochet chain   off: a twisted strand of plies; on: a chain of crochet loops
  Thickness       how thick the yarn is (pressure thins it from there)
  Pressure        how much your pen's pressure changes it (0: not at all)
  Plies           how many strands twist together
  Twist length    how long one full twist is, in yarn widths
  Loop spacing    the crochet chain's loops: closer or further apart
  Fuzz            the fine fibres all over it (0: none)
  Colour          the yarn's colour. the brush starts in Vertex Color mode: strokes drawn in the brush's colour keep it,
                  so you can change colour as you go
The yarn is a hair ("Curves") object, not a mesh: only those draw the fuzz's fibres. A light behind it ("yarn rim light")
makes the fuzz glow round the edges. The look (fibres, sheen, the see-through fuzz) is the material "DaV yarn"; the nodes
are the node group "DaV yarn". Running this again rebuilds both and leaves your drawing alone.
(The fuzz's idea, a rim light and full sheen, after a script by Argon and SouthernShotty's fuzzy fabric tutorial.)
"""

import math

import bpy

GROUP = 'DaV yarn'
MATERIAL = 'DaV yarn'
DRAW_NAME = 'draw your yarn here'
YARN_NAME = 'yarn'
WOOL = (0.62, 0.22, 0.16, 1.0)          # the yarn's colour to start with: a warm red wool


# ---------------- small helpers: nodes by name, so it works across Blender versions ----------------
def nd(tree, kind, x, y, **props):
    n = tree.nodes.new(kind)
    n.location = (x * 220, -y * 160)
    for k, v in props.items():
        try:
            setattr(n, k, v)
        except (AttributeError, TypeError):
            pass
    return n


ALIAS = {'Fac': 'Factor', 'Factor': 'Fac'}             # (Blender 5 renamed some shader sockets)


def pick(socks, name, i):
    names = (name, ALIAS.get(name))
    hits = [s for s in socks if s.name in names and s.enabled] or [s for s in socks if s.name in names]
    return hits[i]


def ins(n, name, i=0):
    return pick(n.inputs, name, i)


def out(n, name, i=0):
    return pick(n.outputs, name, i)


def ln(tree, a, b):
    tree.links.new(a, b)


def math_node(tree, op, a, b=None, x=0, y=0):
    """a Math node: a and b are sockets or numbers"""
    m = nd(tree, 'ShaderNodeMath', x, y, operation=op)
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            m.inputs[i].default_value = v
        else:
            ln(tree, v, m.inputs[i])
    return out(m, 'Value')


def vmath(tree, op, a, b=None, x=0, y=0, scale=None):
    m = nd(tree, 'ShaderNodeVectorMath', x, y, operation=op)
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (tuple, list)):
            m.inputs[i].default_value = v
        else:
            ln(tree, v, m.inputs[i])
    if scale is not None:
        s = ins(m, 'Scale')
        if isinstance(scale, (int, float)):
            s.default_value = scale
        else:
            ln(tree, scale, s)
    return out(m, 'Vector') if op not in ('DOT_PRODUCT', 'LENGTH', 'DISTANCE') else out(m, 'Value')


def store(tree, geo, name, value, kind='FLOAT', domain='POINT', x=0, y=0):
    s = nd(tree, 'GeometryNodeStoreNamedAttribute', x, y, data_type=kind, domain=domain)
    ins(s, 'Name').default_value = name
    ln(tree, geo, ins(s, 'Geometry'))
    val = [i for i in s.inputs if i.name == 'Value' and i.enabled][0]
    ln(tree, value, val)
    return out(s, 'Geometry')


def named(tree, name, kind='FLOAT', x=0, y=0):
    n = nd(tree, 'GeometryNodeInputNamedAttribute', x, y, data_type=kind)
    ins(n, 'Name').default_value = name
    return out(n, 'Attribute')


# ---------------- the node group: Grease Pencil strokes -> yarn ----------------
def build_group():
    old = bpy.data.node_groups.get(GROUP)
    if old:
        bpy.data.node_groups.remove(old)
    t = bpy.data.node_groups.new(GROUP, 'GeometryNodeTree')
    if hasattr(t, 'is_modifier'):
        t.is_modifier = True
    I = t.interface

    def sock(name, kind, default=None, lo=None, hi=None, sub=None, tip=''):
        s = I.new_socket(name, in_out='INPUT', socket_type=kind)
        if default is not None:
            s.default_value = default
        if lo is not None:
            s.min_value = lo
        if hi is not None:
            s.max_value = hi
        if sub:
            try:
                s.subtype = sub
            except (AttributeError, TypeError):
                pass
        s.description = tip
        return s
    I.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    sock('Drawing', 'NodeSocketObject', tip='the Grease Pencil object you draw on')
    sock('Crochet chain', 'NodeSocketBool', False, tip='off: a twisted strand; on: a chain of crochet loops')
    sock('Thickness', 'NodeSocketFloat', 0.14, 0.001, 10.0, 'DISTANCE', 'how thick the yarn is')
    sock('Pressure', 'NodeSocketFloat', 0.7, 0.0, 1.0, 'FACTOR', "how much the pen's pressure thins and thickens it")
    sock('Plies', 'NodeSocketInt', 3, 1, 8, tip='how many strands twist together')
    sock('Twist length', 'NodeSocketFloat', 2.8, 0.5, 50.0, tip='how long one full twist is, in yarn widths')
    sock('Loop spacing', 'NodeSocketFloat', 1.0, 0.3, 4.0, tip='the crochet loops: closer (smaller) or further apart')
    sock('Fuzz', 'NodeSocketFloat', 0.6, 0.0, 2.0, 'FACTOR', 'the stray fibres standing off it')
    sock('Colour', 'NodeSocketColor', WOOL, tip="the yarn's colour (strokes drawn in a vertex colour keep theirs)")
    I.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')

    gi = nd(t, 'NodeGroupInput', -9, 0)
    go = nd(t, 'NodeGroupOutput', 16, 0)
    G = lambda name: out(gi, name)

    # the drawing's strokes, as curves (in this object's space)
    oi = nd(t, 'GeometryNodeObjectInfo', -8, 0, transform_space='RELATIVE')
    ln(t, G('Drawing'), ins(oi, 'Object'))
    gp2c = nd(t, 'GeometryNodeGreasePencilToCurves', -7, 0)
    ln(t, out(oi, 'Geometry'), ins(gp2c, 'Grease Pencil'))
    ins(gp2c, 'Layers as Instances').default_value = False
    real = nd(t, 'GeometryNodeRealizeInstances', -6, 0)
    ln(t, out(gp2c, 'Curves'), ins(real, 'Geometry'))
    curves = out(real, 'Geometry')

    # how thick, point by point: the pen's pressure (the stroke's radius, against the thickest point drawn) eased by Pressure
    rad = out(nd(t, 'GeometryNodeInputRadius', -7, 2), 'Radius')
    stat = nd(t, 'GeometryNodeAttributeStatistic', -6, 2, data_type='FLOAT', domain='POINT')
    ln(t, curves, ins(stat, 'Geometry'))
    ln(t, rad, ins(stat, 'Attribute'))
    # (+ a hair, so strokes with no pressure at all count as full strength)
    rel = math_node(t, 'DIVIDE', math_node(t, 'ADD', rad, 1e-6, -5, 2), math_node(t, 'ADD', out(stat, 'Max'), 1e-6, -5, 3), -4, 2)
    keep = math_node(t, 'SUBTRACT', 1.0, G('Pressure'), -4, 3)
    ease = math_node(t, 'ADD', keep, math_node(t, 'MULTIPLY', G('Pressure'), rel, -3, 3), -3, 2)
    yr = math_node(t, 'MULTIPLY', ease, G('Thickness'), -2, 2)
    curves = store(t, curves, 'yarn_r', yr, x=-1, y=0)

    # the colour: the brush's vertex colour where it was used (its alpha says how much), else Colour
    vc = named(t, 'vertex_color', 'FLOAT_COLOR', -4, 5)
    sep = nd(t, 'FunctionNodeSeparateColor', -3, 5)
    ln(t, vc, ins(sep, 'Color'))
    mix = nd(t, 'ShaderNodeMix', -2, 5, data_type='RGBA')
    ln(t, out(sep, 'Alpha'), ins(mix, 'Factor'))
    ln(t, G('Colour'), ins(mix, 'A', 0) if len([s for s in mix.inputs if s.name == 'A']) == 1 else [s for s in mix.inputs if s.name == 'A' and s.type == 'RGBA'][0])
    ln(t, vc, [s for s in mix.inputs if s.name == 'B' and s.type == 'RGBA'][0])
    curves = store(t, curves, 'yarn_color', [s for s in mix.outputs if s.name == 'Result' and s.type == 'RGBA'][0], 'FLOAT_COLOR', x=0, y=0)

    # smooth, evenly spaced points
    rs = nd(t, 'GeometryNodeResampleCurve', 1, 0, mode='LENGTH')
    ln(t, curves, ins(rs, 'Curve'))
    ln(t, math_node(t, 'MULTIPLY', G('Thickness'), 0.3, 0, 1), ins(rs, 'Length'))
    if 'Mode' in [s.name for s in rs.inputs]:              # (Blender 5: the mode is a menu socket)
        try:
            ins(rs, 'Mode').default_value = 'Length'
        except (TypeError, AttributeError):
            pass
    curves = out(rs, 'Curve')
    yarn_r = named(t, 'yarn_r', 'FLOAT', 1, 3)

    # ---- the twisted strand: the stroke copied once per ply, each wound round the stroke's line ----
    dup = nd(t, 'GeometryNodeDuplicateElements', 2, 0, domain='SPLINE')
    ln(t, curves, ins(dup, 'Geometry'))
    ln(t, G('Plies'), ins(dup, 'Amount'))
    which = out(dup, 'Duplicate Index')
    along = out(nd(t, 'GeometryNodeSplineParameter', 2, 2), 'Length')
    width = math_node(t, 'MULTIPLY', G('Thickness'), 2.0, 2, 3)
    turns = math_node(t, 'DIVIDE', along, math_node(t, 'MULTIPLY', width, G('Twist length'), 3, 3), 3, 2)
    ang = math_node(t, 'ADD',
                    math_node(t, 'MULTIPLY', math_node(t, 'DIVIDE', which, G('Plies'), 4, 1), 2 * math.pi, 5, 1),
                    math_node(t, 'MULTIPLY', turns, 2 * math.pi, 4, 2), 5, 2)
    nrm = out(nd(t, 'GeometryNodeInputNormal', 4, 4), 'Normal')
    tan = out(nd(t, 'GeometryNodeInputTangent', 4, 5), 'Tangent')
    bin_ = vmath(t, 'CROSS_PRODUCT', tan, nrm, 5, 5)
    spread = math_node(t, 'MULTIPLY', math_node(t, 'MINIMUM', math_node(t, 'SUBTRACT', G('Plies'), 1.0, 5, 6), 1.0, 6, 6), 0.55, 7, 6)
    off = vmath(t, 'ADD', vmath(t, 'SCALE', nrm, None, 6, 4, scale=math_node(t, 'COSINE', ang, None, 6, 3)),
                vmath(t, 'SCALE', bin_, None, 6, 5, scale=math_node(t, 'SINE', ang, None, 6, 2)), 7, 4)
    off = vmath(t, 'SCALE', off, None, 8, 4, scale=math_node(t, 'MULTIPLY', yarn_r, spread, 8, 5))
    sp = nd(t, 'GeometryNodeSetPosition', 9, 0)
    ln(t, out(dup, 'Geometry'), ins(sp, 'Geometry'))
    ln(t, off, ins(sp, 'Offset'))
    plyr = math_node(t, 'MULTIPLY', yarn_r, math_node(t, 'SUBTRACT', 1.0, math_node(t, 'MULTIPLY', spread, 0.62, 9, 6), 9, 5), 9, 4)
    scr = nd(t, 'GeometryNodeSetCurveRadius', 10, 0)
    ln(t, out(sp, 'Geometry'), ins(scr, 'Curve'))
    ln(t, plyr, ins(scr, 'Radius'))
    strand = store(t, out(scr, 'Curve'), 'yarn_along', math_node(t, 'DIVIDE', along, width, 10, 2), x=11, y=0)
    prof = nd(t, 'GeometryNodeCurvePrimitiveCircle', 10, -2, mode='RADIUS')
    ins(prof, 'Resolution').default_value = 10
    ins(prof, 'Radius').default_value = 1.0
    prof_g = store(t, out(prof, 'Curve'), 'yarn_around', out(nd(t, 'GeometryNodeSplineParameter', 10, -3), 'Factor'), x=11, y=-2)
    c2m = nd(t, 'GeometryNodeCurveToMesh', 12, 0)
    ln(t, strand, ins(c2m, 'Curve'))
    ln(t, prof_g, ins(c2m, 'Profile Curve'))
    if 'Scale' in [s.name for s in c2m.inputs]:           # (Blender 4.5 and on: the thickness is given, not assumed)
        ln(t, out(nd(t, 'GeometryNodeInputRadius', 11, 2), 'Radius'), ins(c2m, 'Scale'))
    strand_mesh = out(c2m, 'Mesh')
    # (uneven: real yarn swells and thins a little along its length)
    lump = nd(t, 'ShaderNodeTexNoise', 12, 2)
    ln(t, vmath(t, 'SCALE', out(nd(t, 'GeometryNodeInputPosition', 11, 3), 'Position'), None, 11, 4,
                scale=math_node(t, 'DIVIDE', 1.6, G('Thickness'), 11, 5)), ins(lump, 'Vector'))
    ins(lump, 'Detail').default_value = 3.0
    bumpy = nd(t, 'GeometryNodeSetPosition', 13, 0)
    ln(t, strand_mesh, ins(bumpy, 'Geometry'))
    ln(t, vmath(t, 'SCALE', out(nd(t, 'GeometryNodeInputNormal', 12, 4), 'Normal'), None, 13, 4,
                scale=math_node(t, 'MULTIPLY', math_node(t, 'SUBTRACT', out(lump, 'Fac'), 0.5, 13, 5), math_node(t, 'MULTIPLY', G('Thickness'), 0.3, 13, 6), 14, 5)),
       ins(bumpy, 'Offset'))
    strand_mesh = out(bumpy, 'Geometry')

    # ---- the crochet chain: a loop at every step along the stroke, each through the one before ----
    rs2 = nd(t, 'GeometryNodeResampleCurve', 2, 9, mode='LENGTH')
    ln(t, curves, ins(rs2, 'Curve'))
    ln(t, math_node(t, 'MULTIPLY', math_node(t, 'MULTIPLY', G('Thickness'), 3.6, 1, 10), G('Loop spacing'), 2, 10), ins(rs2, 'Length'))
    if 'Mode' in [s.name for s in rs2.inputs]:
        try:
            ins(rs2, 'Mode').default_value = 'Length'
        except (TypeError, AttributeError):
            pass
    # one loop: an oval ring lying flat, long way along X (yarn_along / yarn_around for the fibres)
    ring = nd(t, 'GeometryNodeCurvePrimitiveCircle', 2, 12, mode='RADIUS')
    ins(ring, 'Resolution').default_value = 28
    ins(ring, 'Radius').default_value = 1.0
    ring_g = store(t, out(ring, 'Curve'), 'yarn_along', math_node(t, 'MULTIPLY', out(nd(t, 'GeometryNodeSplineParameter', 2, 13), 'Factor'), 6.0, 3, 13), x=3, y=12)
    tube = nd(t, 'GeometryNodeCurvePrimitiveCircle', 3, 14, mode='RADIUS')
    ins(tube, 'Resolution').default_value = 8
    ins(tube, 'Radius').default_value = 0.34
    tube_g = store(t, out(tube, 'Curve'), 'yarn_around', out(nd(t, 'GeometryNodeSplineParameter', 3, 15), 'Factor'), x=4, y=14)
    loopm = nd(t, 'GeometryNodeCurveToMesh', 5, 12)
    ln(t, ring_g, ins(loopm, 'Curve'))
    ln(t, tube_g, ins(loopm, 'Profile Curve'))
    shape = nd(t, 'GeometryNodeTransform', 6, 12)
    ln(t, out(loopm, 'Mesh'), ins(shape, 'Geometry'))
    ins(shape, 'Scale').default_value = (1.0, 0.42, 1.0)
    # turned to follow the stroke, facing the camera (which looks along +Y), every other loop tipped a little
    a1 = nd(t, 'FunctionNodeAlignRotationToVector', 4, 9, axis='X')
    ln(t, out(nd(t, 'GeometryNodeInputTangent', 3, 10), 'Tangent'), ins(a1, 'Vector'))
    a2 = nd(t, 'FunctionNodeAlignRotationToVector', 5, 9, axis='Z', pivot_axis='X')
    ln(t, out(a1, 'Rotation'), ins(a2, 'Rotation'))
    ins(a2, 'Vector').default_value = (0.0, -1.0, 0.0)
    odd = math_node(t, 'FLOORED_MODULO' if 'FLOORED_MODULO' in [e.identifier for e in bpy.types.ShaderNodeMath.bl_rna.properties['operation'].enum_items] else 'MODULO',
                    out(nd(t, 'GeometryNodeInputIndex', 4, 11), 'Index'), 2.0, 5, 11)
    tip = math_node(t, 'MULTIPLY', math_node(t, 'SUBTRACT', math_node(t, 'MULTIPLY', odd, 2.0, 6, 11), 1.0, 6, 10), 0.28, 7, 10)
    cx = nd(t, 'ShaderNodeCombineXYZ', 7, 11)
    ln(t, tip, ins(cx, 'X'))
    e2r = nd(t, 'FunctionNodeEulerToRotation', 8, 11)
    ln(t, out(cx, 'Vector'), ins(e2r, 'Euler'))
    rot = nd(t, 'FunctionNodeRotateRotation', 8, 9, rotation_space='LOCAL')
    ln(t, out(a2, 'Rotation'), ins(rot, 'Rotation'))
    ln(t, out(e2r, 'Rotation'), ins(rot, 'Rotate By'))
    iop = nd(t, 'GeometryNodeInstanceOnPoints', 9, 9)
    ln(t, out(rs2, 'Curve'), ins(iop, 'Points'))
    ln(t, out(shape, 'Geometry'), ins(iop, 'Instance'))
    ln(t, out(rot, 'Rotation'), ins(iop, 'Rotation'))
    ln(t, math_node(t, 'MULTIPLY', named(t, 'yarn_r', 'FLOAT', 8, 13), 3.0, 9, 13), ins(iop, 'Scale'))
    chain = nd(t, 'GeometryNodeRealizeInstances', 10, 9)
    ln(t, out(iop, 'Instances'), ins(chain, 'Geometry'))

    # strand or chain
    sw = nd(t, 'GeometryNodeSwitch', 13, 3, input_type='GEOMETRY')
    ln(t, G('Crochet chain'), ins(sw, 'Switch'))
    ln(t, strand_mesh, ins(sw, 'False'))
    ln(t, out(chain, 'Geometry'), ins(sw, 'True'))
    smooth = nd(t, 'GeometryNodeSetShadeSmooth', 14, 3)
    ln(t, out(sw, 'Output'), smooth.inputs[0])             # ('Geometry' in Blender 4, 'Mesh' in 5)
    body = smooth.outputs[0]

    # ---- the fuzz: short stray fibres standing off the surface ----
    dist = nd(t, 'GeometryNodeDistributePointsOnFaces', 14, 6, distribute_method='RANDOM')
    ln(t, body, ins(dist, 'Mesh'))
    ln(t, math_node(t, 'DIVIDE', math_node(t, 'MULTIPLY', G('Fuzz'), 60.0, 13, 7),
                    math_node(t, 'POWER', G('Thickness'), 2.0, 13, 8), 14, 8), ins(dist, 'Density'))
    hair0 = nd(t, 'GeometryNodeCurvePrimitiveLine', 13, 10)
    ins(hair0, 'End').default_value = (0.0, 0.0, 1.0)
    hair = nd(t, 'GeometryNodeResampleCurve', 14, 10)           # (four points, so it can curl)
    ln(t, out(hair0, 'Curve'), ins(hair, 'Curve'))
    ins(hair, 'Count').default_value = 5
    jit = nd(t, 'FunctionNodeRandomValue', 14, 11, data_type='FLOAT_VECTOR')
    ins(jit, 'Min', 0).default_value = (-1.35, -1.35, 0.0)        # (most lean over, some lie almost flat)
    ins(jit, 'Max', 0).default_value = (1.35, 1.35, 0.0)
    jr = nd(t, 'FunctionNodeEulerToRotation', 15, 11)
    ln(t, [s for s in jit.outputs if s.name == 'Value' and s.type == 'VECTOR'][0], ins(jr, 'Euler'))
    hr = nd(t, 'FunctionNodeRotateRotation', 15, 10, rotation_space='LOCAL')
    ln(t, out(dist, 'Rotation'), ins(hr, 'Rotation'))
    ln(t, out(jr, 'Rotation'), ins(hr, 'Rotate By'))
    hl = nd(t, 'FunctionNodeRandomValue', 15, 12, data_type='FLOAT')      # (mostly very short, a few long strays)
    ins(hl, 'Min').default_value = 0.0
    ins(hl, 'Max').default_value = 1.0
    hip = nd(t, 'GeometryNodeInstanceOnPoints', 16, 7)
    ln(t, out(dist, 'Points'), ins(hip, 'Points'))
    ln(t, out(hair, 'Curve'), ins(hip, 'Instance'))
    ln(t, out(hr, 'Rotation'), ins(hip, 'Rotation'))
    flen = math_node(t, 'ADD', 0.05, math_node(t, 'MULTIPLY', math_node(t, 'POWER', [s for s in hl.outputs if s.name == 'Value' and s.type == 'VALUE'][0], 3.0, 15, 13), 0.6, 16, 13), 16, 12)
    ln(t, math_node(t, 'MULTIPLY', flen, G('Thickness'), 16, 12), ins(hip, 'Scale'))
    hreal = nd(t, 'GeometryNodeRealizeInstances', 17, 7)
    ln(t, out(hip, 'Instances'), ins(hreal, 'Geometry'))
    curl = nd(t, 'ShaderNodeTexNoise', 17, 10)                     # (each fibre bends its own way, more at its tip)
    try:
        curl.noise_dimensions = '3D'
    except (AttributeError, TypeError):
        pass
    ln(t, vmath(t, 'SCALE', out(nd(t, 'GeometryNodeInputPosition', 16, 11), 'Position'), None, 16, 12,
                scale=math_node(t, 'DIVIDE', 2.5, G('Thickness'), 16, 13)), ins(curl, 'Vector'))
    bend = vmath(t, 'SUBTRACT', out(curl, 'Color'), (0.5, 0.5, 0.5), 17, 11)
    bend = vmath(t, 'SCALE', bend, None, 17, 12, scale=math_node(t, 'MULTIPLY', out(nd(t, 'GeometryNodeSplineParameter', 17, 14), 'Factor'),
                                                                   math_node(t, 'MULTIPLY', G('Thickness'), 0.9, 17, 15), 18, 14))
    hcurl = nd(t, 'GeometryNodeSetPosition', 18, 8)
    ln(t, out(hreal, 'Geometry'), ins(hcurl, 'Geometry'))
    ln(t, bend, ins(hcurl, 'Offset'))
    hrad = nd(t, 'GeometryNodeSetCurveRadius', 18, 7)
    ln(t, out(hcurl, 'Geometry'), ins(hrad, 'Curve'))
    # thin, and thinner at the tip
    ln(t, math_node(t, 'MULTIPLY', G('Thickness'),
                    math_node(t, 'MULTIPLY', 0.0045, math_node(t, 'SUBTRACT', 1.0, math_node(t, 'MULTIPLY', out(nd(t, 'GeometryNodeSplineParameter', 18, 13), 'Factor'), 0.8, 18, 12), 18, 11), 17, 9), 17, 9),
       ins(hrad, 'Radius'))
    # (they stay curves: the yarn object is a Curves object, which draws curves as fine hair, cheaply, by the hundred thousand)

    fibres = store(t, out(hrad, 'Curve'), 'yarn_fuzz', out(nd(t, 'FunctionNodeInputBool', 19, 9, boolean=True), 'Boolean'), 'FLOAT', x=19, y=8)
    join = nd(t, 'GeometryNodeJoinGeometry', 19, 3)
    ln(t, fibres, ins(join, 'Geometry'))
    ln(t, body, ins(join, 'Geometry'))
    setm = nd(t, 'GeometryNodeSetMaterial', 20, 3)
    ln(t, out(join, 'Geometry'), ins(setm, 'Geometry'))
    ins(setm, 'Material').default_value = build_material()
    go.location = (21 * 220, -3 * 160)
    ln(t, out(setm, 'Geometry'), go.inputs[0])
    return t


# ---------------- the material: wool, with its fibres twisting round each ply ----------------
def build_material():
    m = bpy.data.materials.get(MATERIAL) or bpy.data.materials.new(MATERIAL)
    m.use_nodes = True
    t = m.node_tree
    t.nodes.clear()
    o = nd(t, 'ShaderNodeOutputMaterial', 8, 0)
    p = nd(t, 'ShaderNodeBsdfPrincipled', 6, 0)
    col = out(nd(t, 'ShaderNodeAttribute', 0, 0, attribute_type='GEOMETRY', attribute_name='yarn_color'), 'Color')
    al = out(nd(t, 'ShaderNodeAttribute', 0, 2, attribute_type='GEOMETRY', attribute_name='yarn_along'), 'Fac')
    ar = out(nd(t, 'ShaderNodeAttribute', 0, 4, attribute_type='GEOMETRY', attribute_name='yarn_around'), 'Fac')
    # the fibres: fine stripes running round and along at a slant
    u = math_node(t, 'ADD', math_node(t, 'MULTIPLY', al, 9.0, 1, 2), math_node(t, 'MULTIPLY', ar, 7.0, 1, 4), 2, 3)
    xyz = nd(t, 'ShaderNodeCombineXYZ', 3, 3)
    ln(t, u, ins(xyz, 'X'))
    wave = nd(t, 'ShaderNodeTexWave', 4, 3, wave_type='BANDS', bands_direction='X')
    ln(t, out(xyz, 'Vector'), ins(wave, 'Vector'))
    ins(wave, 'Scale').default_value = 0.16
    ins(wave, 'Distortion').default_value = 3.0
    ins(wave, 'Detail').default_value = 3.0
    ins(wave, 'Detail Roughness').default_value = 0.7
    # the colour, uneven (dyed wool never is quite one colour), the stray fibres paler
    blot = nd(t, 'ShaderNodeTexNoise', 1, -2)
    ins(blot, 'Scale').default_value = 3.0
    ins(blot, 'Detail').default_value = 4.0
    tone = nd(t, 'ShaderNodeMix', 2, -1, data_type='RGBA', blend_type='MULTIPLY')
    ins(tone, 'Factor').default_value = 0.35
    ln(t, col, [s for s in tone.inputs if s.name == 'A' and s.type == 'RGBA'][0])
    tramp = nd(t, 'ShaderNodeValToRGB', 2, -3)
    tramp.color_ramp.elements[0].position = 0.3
    tramp.color_ramp.elements[0].color = (0.7, 0.7, 0.7, 1)
    tramp.color_ramp.elements[1].position = 0.7
    ln(t, out(blot, 'Fac'), ins(tramp, 'Fac'))
    ln(t, out(tramp, 'Color'), [s for s in tone.inputs if s.name == 'B' and s.type == 'RGBA'][0])
    fz = out(nd(t, 'ShaderNodeAttribute', 2, -5, attribute_type='GEOMETRY', attribute_name='yarn_fuzz'), 'Fac')
    pale = nd(t, 'ShaderNodeMix', 3, -1, data_type='RGBA', blend_type='SCREEN')
    ln(t, math_node(t, 'MULTIPLY', fz, 0.15, 3, -4), ins(pale, 'Factor'))
    ln(t, [s for s in tone.outputs if s.name == 'Result' and s.type == 'RGBA'][0], [s for s in pale.inputs if s.name == 'A' and s.type == 'RGBA'][0])
    [s for s in pale.inputs if s.name == 'B' and s.type == 'RGBA'][0].default_value = (1, 1, 1, 1)
    col = [s for s in pale.outputs if s.name == 'Result' and s.type == 'RGBA'][0]
    shade = nd(t, 'ShaderNodeMix', 5, 1, data_type='RGBA', blend_type='MULTIPLY')
    ins(shade, 'Factor').default_value = 0.3
    ln(t, col, [s for s in shade.inputs if s.name == 'A' and s.type == 'RGBA'][0])
    ramp = nd(t, 'ShaderNodeValToRGB', 5, 3)
    ramp.color_ramp.elements[0].color = (0.35, 0.35, 0.35, 1)
    ln(t, out(wave, 'Fac'), ins(ramp, 'Fac'))
    ln(t, out(ramp, 'Color'), [s for s in shade.inputs if s.name == 'B' and s.type == 'RGBA'][0])
    ln(t, [s for s in shade.outputs if s.name == 'Result' and s.type == 'RGBA'][0], ins(p, 'Base Color'))
    if 'Sheen Tint' in [x.name for x in p.inputs]:          # (the fuzz's glow is the yarn's own colour, not white)
        ln(t, col, ins(p, 'Sheen Tint'))
    # fine fibres: a speckle of noise much finer than the stripes, on top of them
    fine = nd(t, 'ShaderNodeTexNoise', 4, 6)
    fxyz = nd(t, 'ShaderNodeCombineXYZ', 3, 6)
    ln(t, math_node(t, 'MULTIPLY', al, 40.0, 2, 6), ins(fxyz, 'X'))
    ln(t, math_node(t, 'MULTIPLY', ar, 60.0, 2, 7), ins(fxyz, 'Y'))
    ln(t, out(fxyz, 'Vector'), ins(fine, 'Vector'))
    ins(fine, 'Scale').default_value = 1.0
    ins(fine, 'Detail').default_value = 6.0
    ins(fine, 'Roughness').default_value = 0.75
    height = math_node(t, 'ADD', math_node(t, 'MULTIPLY', out(wave, 'Fac'), 0.6, 5, 4), math_node(t, 'MULTIPLY', out(fine, 'Fac'), 0.8, 5, 6), 5, 5)
    bump = nd(t, 'ShaderNodeBump', 6, 5)
    ins(bump, 'Strength').default_value = 0.75
    ln(t, height, ins(bump, 'Height'))
    ln(t, out(bump, 'Normal'), ins(p, 'Normal'))
    ins(p, 'Roughness').default_value = 1.0
    # wool's look: no shine at all, a soft glow at the edges where the fuzz catches the light
    for name, v in (('Sheen Weight', 0.8), ('Sheen Roughness', 0.6), ('Specular IOR Level', 0.04)):
        if name in [s.name for s in p.inputs]:
            ins(p, name).default_value = v
    # the fuzz half see-through: finer than a pixel, so seen together they make a soft haze, not wiry lines
    ln(t, math_node(t, 'SUBTRACT', 1.0, math_node(t, 'MULTIPLY', fz, 0.7, 6, -6), 6, -5), ins(p, 'Alpha'))
    for attr, v in (('surface_render_method', 'DITHERED'), ('blend_method', 'HASHED')):
        try:
            setattr(m, attr, v)
        except (AttributeError, TypeError):
            pass
    ln(t, out(p, 'BSDF'), ins(o, 'Surface'))
    return m


# ---------------- the things in the scene ----------------
def draw_object(scene):
    """the Grease Pencil object to draw on: one already chosen or named so, else a new one"""
    ob = bpy.data.objects.get(DRAW_NAME)
    if ob is None:
        act = bpy.context.view_layer.objects.active if bpy.context.view_layer else None
        if act and act.type == 'GREASEPENCIL':
            return act
        data = (bpy.data.grease_pencils_v3 if hasattr(bpy.data, 'grease_pencils_v3') else bpy.data.grease_pencils).new(DRAW_NAME)
        ob = bpy.data.objects.new(DRAW_NAME, data)
        scene.collection.objects.link(ob)
    if ob.type != 'GREASEPENCIL':
        raise RuntimeError('this needs Blender 4.3 or newer (the new Grease Pencil)')
    gp = ob.data
    if not len(gp.layers):
        gp.layers.new('yarn')
    lay = gp.layers[0]
    if not len(lay.frames):
        lay.frames.new(scene.frame_start)
    if not ob.material_slots:                          # (how the pencil line shows while you draw: faint, under the yarn)
        pm = bpy.data.materials.get('yarn pencil') or bpy.data.materials.new('yarn pencil')
        if not pm.grease_pencil:
            bpy.data.materials.create_gpencil_data(pm)
        pm.grease_pencil.color = (0.2, 0.2, 0.2, 0.35)
        ob.data.materials.append(pm)
    return ob


def rim_light(scene):
    """a soft light behind the yarn, so the fuzz glows round its edges (the canvas faces the camera, which looks along +Y)"""
    if bpy.data.objects.get('yarn rim light'):
        return
    L = bpy.data.lights.new('yarn rim light', 'AREA')
    L.energy = 900.0
    L.size = 8.0
    ob = bpy.data.objects.new('yarn rim light', L)
    scene.collection.objects.link(ob)
    ob.location = (2.0, 7.0, 5.0)
    ob.rotation_euler = (math.radians(-125), 0.0, math.radians(15))   # (facing back toward the canvas and the camera)


def yarn_object(scene, drawing):
    # a Curves object (hair), not a mesh: only those draw the fuzz's curves (and they draw the yarn's mesh as well)
    ob = bpy.data.objects.get(YARN_NAME)
    if ob is not None and ob.type != 'CURVES':
        bpy.data.objects.remove(ob, do_unlink=True)
        ob = None
    if ob is None:
        ob = bpy.data.objects.new(YARN_NAME, bpy.data.hair_curves.new(YARN_NAME))
        scene.collection.objects.link(ob)
    ob.matrix_world = drawing.matrix_world.copy()
    mod = ob.modifiers.get(GROUP) or ob.modifiers.new(GROUP, 'NODES')
    mod.node_group = bpy.data.node_groups[GROUP]
    set_input(mod, 'Drawing', drawing)
    return ob


def set_input(mod, name, value):
    """one of the yarn's settings on its modifier (by its name, as shown in the modifier panel)"""
    for item in mod.node_group.interface.items_tree:
        if getattr(item, 'in_out', '') == 'INPUT' and item.name == name:
            props = getattr(mod, 'properties', None)            # (Blender 5.2 and on)
            if props is not None and hasattr(props, 'inputs'):
                getattr(props.inputs, item.identifier).value = value
            else:
                mod[item.identifier] = value
            return True
    return False


def drawing_tools(scene):
    """draw on the front plane, where the strokes start, with the brush's own colour"""
    ts = scene.tool_settings
    for target, attr, val in ((ts, 'gpencil_stroke_placement_view3d', 'ORIGIN'),):
        try:
            setattr(target, attr, val)
        except (AttributeError, TypeError):
            pass
    try:
        ts.gpencil_sculpt.lock_axis = 'AXIS_Y'
    except (AttributeError, TypeError):
        pass
    for paint in ('gpencil_paint', 'grease_pencil_paint'):
        p = getattr(ts, paint, None)
        if p is None:
            continue
        try:
            p.color_mode = 'VERTEXCOLOR'
        except (AttributeError, TypeError):
            pass
        b = getattr(p, 'brush', None)
        if b is not None:
            try:
                b.color = WOOL[:3]
            except (AttributeError, TypeError):
                pass


def add(scene, drawing):
    """the yarn for a Grease Pencil object (the new kind, Blender 4.3 on): the node group, the yarn object that follows the
    drawing, the brush set to its own colour, a rim light. -> the yarn object"""
    build_group()
    ob = yarn_object(scene, drawing)
    drawing_tools(scene)
    rim_light(scene)
    drawing.hide_render = True                         # (the yarn is what renders; the pencil line is only a guide)
    return ob


def add_to_scene():
    """run from inside Blender (Scripting tab): the yarn added to the scene you have open"""
    scene = bpy.context.scene
    drawing = draw_object(scene)
    add(scene, drawing)
    bpy.context.view_layer.objects.active = drawing
    drawing.select_set(True)
    for mode in ('PAINT_GREASE_PENCIL', 'PAINT_GPENCIL'):
        try:
            bpy.ops.object.mode_set(mode=mode)
            break
        except Exception:
            pass
    return drawing


if __name__ == '__main__':
    add_to_scene()
    print('the yarn is in your scene: draw on "' + DRAW_NAME + '"')

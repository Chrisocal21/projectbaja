"""Chris's grass pack (assets/grass/Grass.abc, Nov 26) -> public/models/ENV_Grass.glb (run with Blender 5.2, -b).
args: <Grass.abc> <out.glb>
Picks a few clumps, cuts each to ~700 triangles, centres it at the origin on the ground and paints a root-to-tip colour
gradient into a vertex colour (the pack has no textures). The game tints each instance on top (worlds/flora.js)."""
import bpy, sys, os
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]
# game name: (source object, triangles wanted, root colour, tip colour)   colours are sRGB 0..1. PROPOSAL tones.
PICK = {
    'G_DRY_TALL':  ('Grass_Dry_01_003', 2000, (0.58, 0.50, 0.34), (0.90, 0.82, 0.60)),   # thin blades: cutting it harder breaks them into sticks
    'G_DRY_LOW':   ('Grass_Dry_01_002', 800, (0.45, 0.38, 0.25), (0.84, 0.75, 0.52)),
    'G_DRY_MAT':   ('Wasteland_grass_medium_001', 900, (0.47, 0.40, 0.28), (0.80, 0.72, 0.52)),
    'G_GREEN_1':   ('Grass4', 800, (0.17, 0.24, 0.09), (0.52, 0.62, 0.28)),
    'G_GREEN_2':   ('Grass3', 800, (0.18, 0.25, 0.10), (0.55, 0.64, 0.30)),
    'G_GREEN_3':   ('big_001', 800, (0.16, 0.23, 0.09), (0.50, 0.60, 0.26)),
    'G_WEED':      ('Weed_02_002', 600, (0.16, 0.24, 0.10), (0.42, 0.56, 0.25)),
}
lin = lambda c: tuple(v / 12.92 if v < 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.alembic_import(filepath=src)
dg = bpy.context.evaluated_depsgraph_get()
made = []
for name, (srcname, want, root, tip) in PICK.items():
    o = bpy.data.objects[srcname]
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))   # bake away the Alembic cache modifier
    me.transform(o.matrix_world)
    n = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(n)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    if tris > want:
        d = n.modifiers.new('dec', 'DECIMATE'); d.ratio = want / tris
        bpy.context.view_layer.objects.active = n; bpy.ops.object.select_all(action='DESELECT'); n.select_set(True)
        bpy.ops.object.modifier_apply(modifier='dec')
    lo = Vector([min(v.co[i] for v in me.vertices) for i in range(3)]); hi = Vector([max(v.co[i] for v in me.vertices) for i in range(3)])
    c = (lo + hi) / 2
    for v in me.vertices: v.co -= Vector((c.x, c.y, lo.z))
    hgt = max(hi.z - lo.z, 1e-4)
    ca = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER'); r0, t0 = lin(root), lin(tip)
    for poly in me.polygons:
        for li in poly.loop_indices:
            t = min(1, max(0, me.vertices[me.loops[li].vertex_index].co.z / hgt)) ** 0.8
            ca.data[li].color = tuple(r0[k] + (t0[k] - r0[k]) * t for k in range(3)) + (1,)
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; p = nt.nodes['Principled BSDF']
    vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'; nt.links.new(vc.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.9; m.use_backface_culling = False
    me.materials.clear(); me.materials.append(m)
    made.append(n)
    print('GRASS', name, 'from', srcname, 'tris', sum(len(q.vertices) - 2 for q in me.polygons), 'size %.2f x %.2f, %.2f tall' % (hi.x - lo.x, hi.y - lo.y, hgt))
for i, n in enumerate(made): n.location.x = i * 1.5   # laid out in a row; the game reads each node's own mesh
for o in list(bpy.context.scene.objects):
    if o not in made: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for n in made: n.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_animations=False, export_vertex_color='MATERIAL')
print('WROTE', out, os.path.getsize(out))

# Lists every object in the Z-Anatomy model (name, type, collections, size) so we can pick the muscles.
import bpy, json, sys
out = []
for o in bpy.data.objects:
    d = {'n': o.name, 't': o.type, 'c': [c.name for c in o.users_collection], 'p': o.parent.name if o.parent else None}
    if o.type == 'MESH':
        d['v'] = len(o.data.vertices); d['dim'] = [round(x, 3) for x in o.dimensions]; d['loc'] = [round(x, 3) for x in o.matrix_world.translation]
    out.append(d)
cols = {c.name: {'children': [x.name for x in c.children], 'n': len(c.objects)} for c in bpy.data.collections}
json.dump({'objects': out, 'collections': cols, 'version': bpy.app.version_string}, open(sys.argv[-1], 'w'))
print('objects', len(out))

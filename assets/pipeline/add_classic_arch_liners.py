"""Append two matte inner arch panels to the Classic body GLB."""
import json
import math
from pathlib import Path
import struct
import sys

source, output = map(Path, sys.argv[1:])
data = source.read_bytes()
size = struct.unpack_from('<I', data, 12)[0]
model = json.loads(data[20:20+size])
binary = bytearray(data[28+size:])
material = len(model['materials'])
model['materials'].append({
    'name': 'ClassicArchLiner', 'doubleSided': True,
    'pbrMetallicRoughness': {'baseColorFactor': [.023,.022,.021,1],
                            'metallicFactor': 0, 'roughnessFactor': 1},
})
root = model['scenes'][model.get('scene', 0)]['nodes']
for side, sign in [('FL', 1), ('FR', -1)]:
    hub, = [node['translation'] for node in model['nodes'] if node.get('name') == 'B_'+side+'Wheel']
    x, y, z = hub
    vertices = [(x-sign*.20,y,z)]
    for i in range(33):
        angle = math.pi*i/32
        vertices.append((x-sign*.20, y+.55*math.sin(angle), z+.66*math.cos(angle)))
    index = len(model['accessors'])
    for payload, target, kind, component, count in (
        (b''.join(struct.pack('<3f', *p) for p in vertices), 34962, 'VEC3', 5126, len(vertices)),
        (b''.join(struct.pack('<3H', 0,i,i+1) for i in range(1,33)), 34963, 'SCALAR', 5123, 96),
    ):
        binary.extend(bytes(-len(binary)%4))
        model['accessors'].append({'bufferView':len(model['bufferViews']), 'componentType':component,
                                   'type':kind, 'count':count})
        model['bufferViews'].append({'buffer':0,'byteOffset':len(binary),
                                     'byteLength':len(payload),'target':target})
        binary.extend(payload)
    model['accessors'][index].update(min=[min(p[i] for p in vertices) for i in range(3)],
                                     max=[max(p[i] for p in vertices) for i in range(3)])
    name = 'B_InnerArch_'+side
    root.append(len(model['nodes']))
    model['nodes'].append({'name':name, 'mesh':len(model['meshes'])})
    model['meshes'].append({'name':name, 'primitives':[
        {'attributes':{'POSITION':index}, 'indices':index+1,'material':material}]})
binary.extend(bytes(-len(binary)%4))
model['buffers'][0]['byteLength'] = len(binary)
metadata = json.dumps(model, separators=(',', ':')).encode()
metadata += b' ' * (-len(metadata) % 4)
output.write_bytes(struct.pack('<4sIII4s', b'glTF', 2, 28+len(metadata)+len(binary),
                               len(metadata), b'JSON') + metadata
                   + struct.pack('<I4s',len(binary),b'BIN\0') + binary)

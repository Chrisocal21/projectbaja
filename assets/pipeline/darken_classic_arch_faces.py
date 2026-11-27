"""Split the Classic underbody's front arch faces into a matte liner material."""
import copy
import json
from pathlib import Path
import struct
import sys

import numpy as np
from trimesh.transformations import quaternion_matrix


def fix(source, output):
    raw = source.read_bytes()
    size = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20+size])
    binary = bytearray(raw[28+size:])
    body, = [node for node in doc['nodes'] if node.get('name') == 'B_Body']
    primitives = doc['meshes'][body['mesh']]['primitives']
    arch, = [p for p in primitives if doc['materials'][p['material']]['name'] == 'B-under1']

    def read(index, dtype, width):
        accessor = doc['accessors'][index]
        view = doc['bufferViews'][accessor['bufferView']]
        step = np.dtype(dtype).itemsize
        return np.ndarray((accessor['count'], width), dtype, buffer=binary,
                          offset=view.get('byteOffset', 0)+accessor.get('byteOffset', 0),
                          strides=(view.get('byteStride', step*width), step)).copy()

    vertices = read(arch['attributes']['POSITION'], '<f4', 3)
    x,y,z,w = body['rotation']
    rotation = quaternion_matrix([w,x,y,z])[:3,:3]
    vertices = (vertices * body['scale']) @ rotation.T + body['translation']
    a = doc['accessors'][arch['indices']]
    dtype = {5123:'<u2',5125:'<u4'}[a['componentType']]
    faces = read(arch['indices'], dtype, 1).reshape(-1,3)
    cx, cy, cz = vertices[faces].mean(axis=1).T
    outer_arch = (abs(cx) > .22) & (cy < .88) & (cz > .31)
    floor_behind_arch = (cy > .24) & (cy < .28) & (cz > -.55)
    front = outer_arch | floor_behind_arch
    if not front.any() or front.all():
        raise ValueError('Unexpected Classic wheel-arch topology')

    def indices(triangles):
        chunk = triangles.astype(dtype).tobytes()
        binary.extend(bytes(-len(binary) % 4))
        view = len(doc['bufferViews'])
        doc['bufferViews'].append({'buffer':0,'byteOffset':len(binary),
                                   'byteLength':len(chunk),'target':34963})
        binary.extend(chunk)
        doc['accessors'].append({'bufferView':view,'componentType':a['componentType'],
                                 'count':triangles.size,'type':'SCALAR'})
        return len(doc['accessors'])-1

    finish = copy.deepcopy(doc['materials'][arch['material']])
    finish['name'] = 'ClassicFrontArchCharcoal'
    finish['pbrMetallicRoughness'].update(baseColorFactor=[.026,.024,.022,1],roughnessFactor=.91)
    liner = dict(arch, material=len(doc['materials']), indices=indices(faces[front]))
    arch['indices'] = indices(faces[~front])
    primitives.append(liner)
    doc['materials'].append(finish)
    binary.extend(bytes(-len(binary) % 4))
    doc['buffers'][0]['byteLength'] = len(binary)
    metadata = json.dumps(doc,separators=(',',':')).encode()
    metadata += b' ' * (-len(metadata)%4)
    output.write_bytes(struct.pack('<4sIII4s',b'glTF',2,28+len(metadata)+len(binary),
                                   len(metadata),b'JSON') + metadata
                       + struct.pack('<I4s',len(binary),b'BIN\0') + binary)
    print(int(front.sum()), 'arch faces refinished out of', len(faces))


if __name__ == '__main__':
    fix(*(Path(arg) for arg in sys.argv[1:]))

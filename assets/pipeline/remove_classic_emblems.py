"""Remove raised logo components from the Classic GLBs without re-exporting."""
import json
import struct
import sys
from pathlib import Path

import numpy as np
import trimesh


def clean(source, output):
    data = source.read_bytes()
    length = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + length])
    binary = bytearray(data[28 + length:])

    def values(index, dtype, width):
        accessor = doc['accessors'][index]
        view = doc['bufferViews'][accessor['bufferView']]
        return np.ndarray(
            (accessor['count'], width), dtype, buffer=binary,
            offset=view.get('byteOffset', 0) + accessor.get('byteOffset', 0),
            strides=(view.get('byteStride', np.dtype(dtype).itemsize * width),
                     np.dtype(dtype).itemsize),
        ).copy()

    for node in doc['nodes']:
        name = node.get('name', '')
        hood = name.startswith('B_HoodLogo')
        wheel = name.startswith(('B_FLWheel', 'B_FRWheel', 'B_BLWheel', 'B_BRWheel'))
        if 'mesh' not in node or not (hood or wheel):
            continue
        for part in doc['meshes'][node['mesh']]['primitives']:
            if doc['materials'][part['material']]['name'] != 'B-chrome':
                continue
            position = values(part['attributes']['POSITION'], '<f4', 3)
            accessor = doc['accessors'][part['indices']]
            dtype = {5123: '<u2', 5125: '<u4'}[accessor['componentType']]
            triangles = values(part['indices'], dtype, 1).reshape(-1, 3)
            _, weld = np.unique(position.round(5), axis=0, return_inverse=True)
            # Find face components using welded indices, while retaining normals
            # and the original vertex indices in the output.
            welded = trimesh.Trimesh(vertices=position, faces=weld[triangles],
                                    process=False)
            groups = trimesh.graph.connected_components(
                welded.face_adjacency, nodes=np.arange(len(triangles)))
            decorative = [group for group in groups if len(group) in (96, 98, 216, 218)]
            if len(decorative) != (2 if hood else 4):
                raise ValueError(f'{name}: unexpected logo topology {[len(g) for g in groups]}')
            keep = np.ones(len(triangles), dtype=bool)
            keep[np.concatenate(decorative)] = False
            clean_indices = triangles[keep].astype(dtype).ravel()
            binary.extend(bytes(-len(binary) % 4))
            doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(binary),
                                       'byteLength': clean_indices.nbytes, 'target': 34963})
            doc['accessors'].append({'bufferView': len(doc['bufferViews']) - 1,
                                     'componentType': accessor['componentType'],
                                     'type': 'SCALAR', 'count': len(clean_indices)})
            part['indices'] = len(doc['accessors']) - 1
            binary.extend(clean_indices.tobytes())
            print(name, 'removed', int((~keep).sum()), 'triangles')
    binary.extend(bytes(-len(binary) % 4))
    doc['buffers'][0]['byteLength'] = len(binary)
    metadata = json.dumps(doc, separators=(',', ':')).encode()
    metadata += b' ' * (-len(metadata) % 4)
    output.write_bytes(struct.pack('<4sII', b'glTF', 2, 28 + len(metadata) + len(binary))
                       + struct.pack('<I4s', len(metadata), b'JSON') + metadata
                       + struct.pack('<I4s', len(binary), b'BIN\0') + binary)


if __name__ == '__main__':
    clean(*(Path(arg) for arg in sys.argv[1:]))

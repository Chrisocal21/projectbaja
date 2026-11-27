"""Embed a finished WebP base-color atlas without re-exporting the model."""
import argparse
import json
import struct
from pathlib import Path


def replace(source, atlas, output):
    data = source.read_bytes()
    size, kind = struct.unpack_from('<I4s', data, 12)
    if data[:8] != b'glTF\x02\0\0\0' or kind != b'JSON':
        raise ValueError('Expected a glTF 2.0 GLB')
    model = json.loads(data[20:20 + size])
    binary = data[28 + size:]
    texture_id = model['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']
    texture = model['textures'][texture_id]
    image_id = texture['extensions']['EXT_texture_webp']['source']
    image = model['images'][image_id]
    index = image['bufferView']
    view = model['bufferViews'][index]
    start = view.get('byteOffset', 0)
    end = start + view['byteLength']
    replacement = atlas.read_bytes()
    if replacement[:4] != b'RIFF' or replacement[8:12] != b'WEBP':
        raise ValueError('Replacement atlas must be WebP')
    # Keep all later views aligned and remove the old image bytes.
    delta = len(replacement) - (end - start)
    padding = -delta % 4
    binary = binary[:start] + replacement + bytes(padding) + binary[end:]
    view['byteLength'] = len(replacement)
    for i, other in enumerate(model['bufferViews']):
        if i != index and other.get('byteOffset', 0) >= end:
            other['byteOffset'] += delta + padding
    model['buffers'][0]['byteLength'] = len(binary)
    metadata = json.dumps(model, separators=(',', ':')).encode()
    metadata += b' ' * (-len(metadata) % 4)
    output.write_bytes(
        struct.pack('<4sII', b'glTF', 2, 28 + len(metadata) + len(binary))
        + struct.pack('<I4s', len(metadata), b'JSON') + metadata
        + struct.pack('<I4s', len(binary), b'BIN\0') + binary
    )


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('source', 'atlas', 'output'):
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    replace(args.source, args.atlas, args.output)

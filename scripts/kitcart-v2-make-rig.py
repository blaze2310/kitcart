"""Create a non-destructive KitCart V2 head/body experimental GLB.
Original textures and PBR materials remain encoded in the copied GLB buffer.
"""
import copy
import json
import struct
from pathlib import Path

import numpy as np
import trimesh

SOURCE = Path('public/models/kitcart/kitcart-final.glb')
OUTPUT = Path('public/models/kitcart/kitcart-rig-test.glb')
NECK_Y = 0.62

raw = SOURCE.read_bytes()
magic, version, length = struct.unpack_from('<4sII', raw, 0)
assert magic == b'glTF' and version == 2 and length == len(raw)
json_length, json_type = struct.unpack_from('<I4s', raw, 12)
assert json_type == b'JSON'
gltf = json.loads(raw[20:20 + json_length])
chunk_start = 20 + json_length
bin_length, bin_type = struct.unpack_from('<I4s', raw, chunk_start)
assert bin_type == b'BIN\x00'
bin_data = bytearray(raw[chunk_start + 8:chunk_start + 8 + bin_length])

assert len(gltf['meshes']) == 1 and len(gltf['meshes'][0]['primitives']) == 1
primitive = gltf['meshes'][0]['primitives'][0]
assert primitive['mode'] == 4 if 'mode' in primitive else True

scene = trimesh.load(SOURCE, force='scene')
mesh = scene.to_geometry()
face_count = len(mesh.faces)
components = trimesh.graph.connected_components(
    mesh.face_adjacency, nodes=np.arange(face_count), engine='networkx'
)
head_ids = []
body_ids = []
for component in components:
    faces = np.asarray(component, dtype=np.int64)
    vert = mesh.vertices[np.unique(mesh.faces[faces])]
    (head_ids if vert[:, 1].max() > NECK_Y else body_ids).extend(faces.tolist())
head_ids = np.asarray(sorted(head_ids), dtype=np.int64)
body_ids = np.asarray(sorted(body_ids), dtype=np.int64)
assert len(head_ids) + len(body_ids) == face_count
assert np.array_equal(np.sort(np.concatenate([head_ids, body_ids])), np.arange(face_count))

# Read original GLB index accessor. Both Trimesh and the primitive use this same face ordering.
idx_accessor = gltf['accessors'][primitive['indices']]
idx_view = gltf['bufferViews'][idx_accessor['bufferView']]
assert idx_accessor['componentType'] == 5125 and idx_accessor['type'] == 'SCALAR'
start = idx_view.get('byteOffset', 0) + idx_accessor.get('byteOffset', 0)
indices = np.frombuffer(bin_data, dtype='<u4', count=idx_accessor['count'], offset=start).reshape(-1, 3).copy()
assert indices.shape[0] == face_count
assert np.array_equal(indices, mesh.faces), 'GLB raw face order differs from Trimesh'


def add_indices(face_ids):
    while len(bin_data) % 4:
        bin_data.append(0)
    offset = len(bin_data)
    packed = np.asarray(indices[face_ids], dtype='<u4').tobytes()
    bin_data.extend(packed)
    view_id = len(gltf['bufferViews'])
    gltf['bufferViews'].append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(packed), 'target': 34963})
    accessor_id = len(gltf['accessors'])
    gltf['accessors'].append({'bufferView': view_id, 'componentType': 5125, 'count': int(len(face_ids) * 3), 'type': 'SCALAR'})
    return accessor_id

body_accessor = add_indices(body_ids)
head_accessor = add_indices(head_ids)
# Remove the original mesh definition: its full geometry would be unused
# but still counted by some glTF validators. Keep shared accessors/materials.
gltf['meshes'] = []
for label, accessor in [('KitCart_Body', body_accessor), ('KitCart_Head', head_accessor)]:
    new_primitive = copy.deepcopy(primitive)
    new_primitive['indices'] = accessor
    gltf['meshes'].append({'name': label, 'primitives': [new_primitive]})

# Preserve the original orientation on its node. Split mesh into two children.
original_node = gltf['nodes'][0]
original_node.pop('mesh', None)
original_node['name'] = 'KitCart_Rig_Root'
original_node['children'] = [1, 2]
gltf['nodes'].append({'name': 'KitCart_Body', 'mesh': 0})
gltf['nodes'].append({'name': 'KitCart_Head_Pivot', 'translation': [0, 0, -NECK_Y], 'children': [3]})
gltf['nodes'].append({'name': 'KitCart_Head', 'mesh': 1, 'translation': [0, 0, NECK_Y]})

while len(bin_data) % 4:
    bin_data.append(0)
gltf['buffers'][0]['byteLength'] = len(bin_data)
encoded = json.dumps(gltf, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
encoded += b' ' * (-len(encoded) % 4)
new_length = 12 + 8 + len(encoded) + 8 + len(bin_data)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
with OUTPUT.open('wb') as f:
    f.write(struct.pack('<4sII', b'glTF', 2, new_length))
    f.write(struct.pack('<I4s', len(encoded), b'JSON'))
    f.write(encoded)
    f.write(struct.pack('<I4s', len(bin_data), b'BIN\x00'))
    f.write(bin_data)

check = trimesh.load(OUTPUT, force='scene')
meshes = [check.geometry[n] for n in ('KitCart_Body', 'KitCart_Head')]
assert len(check.geometry) == 2
assert len(check.graph.nodes_geometry) == 2
assert sum(len(m.faces) for m in meshes) == face_count
assert sum(len(m.faces) for m in check.geometry.values()) == face_count
assert all(getattr(m.visual, 'uv', None) is not None for m in meshes)
assert all(getattr(m.visual, 'material', None) is not None for m in meshes)
print('Original triangles:', face_count)
print('Head triangles:', len(head_ids))
print('Body triangles:', len(body_ids))
print('Reopened meshes:', len(meshes))
print('Texture/UV/material presence: OK')
print('Output:', OUTPUT)
print('Approved original was not changed.')

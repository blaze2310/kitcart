
"""
KitCart V2 — Experimental independent arm rig.

Input:
    kitcart-rig-test.glb

Output:
    kitcart-arm-rig-experiment.glb

Preserves:
    Original head pivot
    Original PBR material and textures
    Original UV mapping
    All source triangles

Creates:
    KitCart_Arm_NegX_Pivot
    KitCart_Arm_NegX

This is an experimental anatomical classification.
"""

import copy
import json
import struct
from pathlib import Path

import numpy as np
import trimesh
from scipy.spatial import cKDTree

SOURCE = Path(
    "public/models/kitcart/kitcart-rig-test.glb"
)

OUTPUT = Path(
    "public/models/kitcart/kitcart-arm-rig-experiment.glb"
)

SHOULDER_X = -0.235
SHOULDER_Y = 0.0
SHOULDER_Z = -0.55

NEAREST_COMPONENTS = 30

# ---------------------------------------
# 1. Read the working rig
# ---------------------------------------

print("Loading existing KitCart rig...")

scene = trimesh.load(SOURCE, force="scene")

body = scene.geometry["KitCart_Body"]
head = scene.geometry["KitCart_Head"]

print("Body triangles:", len(body.faces))
print("Head triangles:", len(head.faces))

# ---------------------------------------
# 2. Identify body components
# ---------------------------------------

components = trimesh.graph.connected_components(
    body.face_adjacency,
    nodes=np.arange(len(body.faces)),
    engine="networkx",
)

arm_components = []
excluded_components = []
other_components = []

for index, faces in enumerate(components):
    vertices = body.vertices[
        np.unique(body.faces[faces])
    ]

    x = float(vertices[:, 0].mean())
    height = float(-vertices[:, 2].mean())

    is_arm = (
        -0.40 <= x <= -0.16
        and 0.17 <= height <= 0.62
    )

    is_thigh = (
        is_arm
        and vertices[:, 0].max() > -0.14
        and len(faces) in {1569, 1055}
    )

    if is_thigh:
        excluded_components.append((index, faces))
    elif is_arm:
        arm_components.append((index, faces))
    else:
        other_components.append((index, faces))

assert len(excluded_components) == 2, (
    "Expected two known thigh components."
)

# ---------------------------------------
# 3. Identify nearest finger candidates
# ---------------------------------------

arm_reference_faces = np.concatenate(
    [f for _, f in arm_components]
)

arm_reference_vertices = body.vertices[
    np.unique(body.faces[arm_reference_faces])
]

reference_height = -arm_reference_vertices[:, 2]

hand_reference = arm_reference_vertices[
    (reference_height >= 0.12)
    & (reference_height <= 0.27)
    & (arm_reference_vertices[:, 0] < -0.20)
]

if len(hand_reference) == 0:
    raise RuntimeError("Hand reference is empty.")

tree = cKDTree(hand_reference)

ranked = []

for index, faces in other_components:
    vertices = body.vertices[
        np.unique(body.faces[faces])
    ]

    center = vertices.mean(axis=0)

    x = float(center[0])
    height = float(-center[2])

    if not (
        -0.38 <= x <= -0.12
        and 0.09 <= height <= 0.30
    ):
        continue

    distances, _ = tree.query(vertices)

    ranked.append(
        (
            float(np.min(distances)),
            float(np.median(distances)),
            index,
            faces,
        )
    )

ranked.sort(
    key=lambda row: (
        row[0],
        row[1],
        row[2],
    )
)

finger_candidates = ranked[:NEAREST_COMPONENTS]

finger_ids = {
    row[2] for row in finger_candidates
}

assert len(finger_candidates) == NEAREST_COMPONENTS

# ---------------------------------------
# 4. Partition original body triangles
# ---------------------------------------

arm_parts = [
    faces for _, faces in arm_components
]

arm_parts.extend(
    row[3] for row in finger_candidates
)

arm_face_ids = np.sort(
    np.concatenate(arm_parts).astype(np.int64)
)

remaining_face_ids = np.sort(
    np.concatenate(
        [
            faces
            for index, faces in other_components
            if index not in finger_ids
        ]
        + [
            faces
            for _, faces in excluded_components
        ]
    ).astype(np.int64)
)

all_face_ids = np.concatenate(
    [arm_face_ids, remaining_face_ids]
)

assert len(all_face_ids) == len(body.faces)

assert np.array_equal(
    np.sort(all_face_ids),
    np.arange(len(body.faces)),
)

assert np.intersect1d(
    arm_face_ids,
    remaining_face_ids,
).size == 0

print()
print("TRIANGLE CLASSIFICATION")
print("-----------------------------")
print("Existing body:", len(body.faces))
print("Experimental arm:", len(arm_face_ids))
print("Remaining body:", len(remaining_face_ids))
print(
    "Additional finger candidates:",
    len(finger_candidates),
)
print(
    "Finger candidate triangles:",
    sum(len(row[3]) for row in finger_candidates),
)
print("Exact mapping: PASSED")

# ---------------------------------------
# 5. Read raw GLB without losing textures
# ---------------------------------------

raw = SOURCE.read_bytes()

magic, version, length = struct.unpack_from(
    "<4sII", raw, 0
)

assert magic == b"glTF"
assert version == 2
assert length == len(raw)

json_length, json_type = struct.unpack_from(
    "<I4s", raw, 12
)

assert json_type == b"JSON"

gltf = json.loads(
    raw[20:20 + json_length]
)

bin_start = 20 + json_length

bin_length, bin_type = struct.unpack_from(
    "<I4s", raw, bin_start
)

assert bin_type == b"BIN\x00"

binary = bytearray(
    raw[
        bin_start + 8:
        bin_start + 8 + bin_length
    ]
)

# Locate existing meshes and nodes by name.
def find_named(items, name):
    matches = [
        index
        for index, item in enumerate(items)
        if item.get("name") == name
    ]

    if len(matches) != 1:
        raise RuntimeError(
            f"Expected one {name}, found {len(matches)}"
        )

    return matches[0]


body_mesh_index = find_named(
    gltf["meshes"], "KitCart_Body"
)

find_named(gltf["meshes"], "KitCart_Head")

root_node_index = find_named(
    gltf["nodes"], "KitCart_Rig_Root"
)

body_node_index = find_named(
    gltf["nodes"], "KitCart_Body"
)

find_named(
    gltf["nodes"], "KitCart_Head_Pivot"
)

body_node = gltf["nodes"][body_node_index]

assert body_node["mesh"] == body_mesh_index

body_mesh = gltf["meshes"][body_mesh_index]

assert len(body_mesh["primitives"]) == 1

original_primitive = copy.deepcopy(
    body_mesh["primitives"][0]
)

accessor = gltf["accessors"][
    original_primitive["indices"]
]

view = gltf["bufferViews"][
    accessor["bufferView"]
]

assert accessor["componentType"] == 5125
assert accessor["type"] == "SCALAR"

offset = (
    view.get("byteOffset", 0)
    + accessor.get("byteOffset", 0)
)

indices = np.frombuffer(
    binary,
    dtype="<u4",
    count=accessor["count"],
    offset=offset,
).reshape(-1, 3).copy()

assert len(indices) == len(body.faces)

assert np.array_equal(
    indices,
    body.faces,
), "Raw GLB indices do not match Trimesh face order."

print("Original GLB index order: VERIFIED")

# ---------------------------------------
# 6. Create new index accessors
# ---------------------------------------

def add_index_accessor(face_ids):
    while len(binary) % 4:
        binary.append(0)

    offset = len(binary)

    packed = np.asarray(
        indices[face_ids],
        dtype="<u4",
    ).tobytes()

    binary.extend(packed)

    view_id = len(gltf["bufferViews"])

    gltf["bufferViews"].append(
        {
            "buffer": 0,
            "byteOffset": offset,
            "byteLength": len(packed),
            "target": 34963,
        }
    )

    accessor_id = len(gltf["accessors"])

    gltf["accessors"].append(
        {
            "bufferView": view_id,
            "componentType": 5125,
            "count": int(len(face_ids) * 3),
            "type": "SCALAR",
        }
    )

    return accessor_id


stationary_accessor = add_index_accessor(
    remaining_face_ids
)

arm_accessor = add_index_accessor(
    arm_face_ids
)

# Replace the existing body mesh's index accessor.
body_mesh["primitives"][0][
    "indices"
] = stationary_accessor

# Create independent arm mesh, sharing original
# vertex attributes, textures, and material.
arm_primitive = copy.deepcopy(
    original_primitive
)

arm_primitive["indices"] = arm_accessor

arm_mesh_index = len(gltf["meshes"])

gltf["meshes"].append(
    {
        "name": "KitCart_Arm_NegX",
        "primitives": [arm_primitive],
    }
)

# ---------------------------------------
# 7. Create independent shoulder pivot
# ---------------------------------------

# The existing GLB uses Z-down coordinates.
# The pivot is placed near the negative-X shoulder.

pivot_node_index = len(gltf["nodes"])

arm_node_index = pivot_node_index + 1

gltf["nodes"].append(
    {
        "name": "KitCart_Arm_NegX_Pivot",
        "translation": [
            SHOULDER_X,
            SHOULDER_Y,
            SHOULDER_Z,
        ],
        "children": [arm_node_index],
    }
)

# Cancel the parent's translation so the
# arm stays in its original neutral position.
gltf["nodes"].append(
    {
        "name": "KitCart_Arm_NegX",
        "mesh": arm_mesh_index,
        "translation": [
            -SHOULDER_X,
            -SHOULDER_Y,
            -SHOULDER_Z,
        ],
    }
)

# Add arm as sibling of the existing body/head.
root = gltf["nodes"][root_node_index]

root.setdefault("children", [])

assert pivot_node_index not in root["children"]

root["children"].append(pivot_node_index)

# ---------------------------------------
# 8. Write experimental GLB
# ---------------------------------------

while len(binary) % 4:
    binary.append(0)

gltf["buffers"][0]["byteLength"] = len(binary)

encoded = json.dumps(
    gltf,
    separators=(",", ":"),
    ensure_ascii=False,
).encode("utf-8")

encoded += b" " * (-len(encoded) % 4)

total_length = (
    12
    + 8
    + len(encoded)
    + 8
    + len(binary)
)

OUTPUT.parent.mkdir(
    parents=True,
    exist_ok=True,
)

with OUTPUT.open("wb") as file:
    file.write(
        struct.pack(
            "<4sII",
            b"glTF",
            2,
            total_length,
        )
    )

    file.write(
        struct.pack(
            "<I4s",
            len(encoded),
            b"JSON",
        )
    )

    file.write(encoded)

    file.write(
        struct.pack(
            "<I4s",
            len(binary),
            b"BIN\x00",
        )
    )

    file.write(binary)

# ---------------------------------------
# 9. Verify exported GLB
# ---------------------------------------

check = trimesh.load(
    OUTPUT,
    force="scene",
)

expected_names = [
    "KitCart_Body",
    "KitCart_Head",
    "KitCart_Arm_NegX",
]

for name in expected_names:
    assert name in check.geometry

assert sum(
    len(check.geometry[name].faces)
    for name in expected_names
) == (
    len(body.faces) + len(head.faces)
)

assert all(
    getattr(
        check.geometry[name].visual,
        "uv",
        None,
    ) is not None
    for name in expected_names
)

assert all(
    getattr(
        check.geometry[name].visual,
        "material",
        None,
    ) is not None
    for name in expected_names
)

assert "KitCart_Arm_NegX_Pivot" in check.graph.nodes

assert "KitCart_Head_Pivot" in check.graph.nodes

# The arm must remain in its original resting
# position before any rotation is applied.
source_bounds = scene.to_geometry().bounds
export_bounds = check.to_geometry().bounds

assert np.allclose(
    source_bounds,
    export_bounds,
    atol=1e-5,
), "Experimental rig changed the neutral model bounds."

print()
print("EXPORTED RIG")
print("-----------------------------")

for name in expected_names:
    print(
        name,
        ":",
        len(check.geometry[name].faces),
        "triangles",
    )

print()
print("Existing head pivot: PRESERVED")
print("New arm pivot: CREATED")
print("UV and material: PRESERVED")
print("Neutral bounds: VERIFIED")
print("Total triangle count: VERIFIED")
print("Saved:", OUTPUT)
print("Working rig remains unchanged.")

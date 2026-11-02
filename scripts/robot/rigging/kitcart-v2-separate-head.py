
from pathlib import Path

import numpy as np
import trimesh

SOURCE = Path("public/models/kitcart/kitcart-final.glb")
OUTPUT = Path("public/models/kitcart/kitcart-head-experiment.glb")

NECK_Y = 0.62
HEAD_PIVOT = np.array([0.0, NECK_Y, 0.0])

print("Loading KitCart V2...")

scene = trimesh.load(SOURCE, force="scene")
mesh = scene.to_geometry()

original_faces = len(mesh.faces)

print("Original triangles:", original_faces)

# Find components using original face indices.
# This avoids duplicating faces during splitting.
components = trimesh.graph.connected_components(
    mesh.face_adjacency,
    nodes=np.arange(original_faces),
    engine="networkx",
)

head_indices = []
body_indices = []

for component in components:
    indices = np.asarray(component, dtype=np.int64)

    # Find the Y bounds of the original component.
    faces = mesh.faces[indices]
    vertices = mesh.vertices[np.unique(faces)]

    highest_y = vertices[:, 1].max()

    # Preliminary grouping:
    # Keep any component extending above Y=0.62
    # with the head.
    if highest_y > NECK_Y:
        head_indices.extend(indices.tolist())
    else:
        body_indices.extend(indices.tolist())

head_indices = np.asarray(head_indices, dtype=np.int64)
body_indices = np.asarray(body_indices, dtype=np.int64)

# Verify all original triangles are accounted for.
combined = np.concatenate([head_indices, body_indices])

assert len(combined) == original_faces
assert len(np.unique(combined)) == original_faces
assert np.array_equal(np.sort(combined), np.arange(original_faces))

print("Triangle mapping verified.")

# Extract subsets from the original geometry.
# Preserve existing vertex attributes and visuals.
head = mesh.submesh(
    [head_indices],
    append=True,
    repair=False,
)

body = mesh.submesh(
    [body_indices],
    append=True,
    repair=False,
)

assert len(head.faces) + len(body.faces) == original_faces

# Use the neck pivot as the head's local origin.
head.apply_translation(-HEAD_PIVOT)

result = trimesh.Scene()

result.add_geometry(
    body,
    geom_name="KitCart_Body",
    node_name="KitCart_Body",
)

result.add_geometry(
    head,
    geom_name="KitCart_Head",
    node_name="KitCart_Head",
    transform=trimesh.transformations.translation_matrix(
        HEAD_PIVOT
    ),
)

print("Exporting experimental GLB...")

result.export(OUTPUT)

# Reopen the exported model to verify geometry.
check = trimesh.load(OUTPUT, force="scene")

exported_faces = sum(
    len(geometry.faces)
    for geometry in check.geometry.values()
)

assert exported_faces == original_faces

print()
print("RESULTS")
print("-----------------------------")
print("Original triangles:", original_faces)
print("Head triangles:", len(head.faces))
print("Body triangles:", len(body.faces))
print("Exported triangles:", exported_faces)
print("Exported meshes:", list(check.geometry.keys()))
print("Head pivot:", HEAD_PIVOT.tolist())

print()
print("UV AND MATERIAL CHECK")
for name, geometry in check.geometry.items():
    uv = getattr(geometry.visual, "uv", None)
    material = getattr(geometry.visual, "material", None)
    texture = (
        getattr(material, "baseColorTexture", None)
        if material is not None
        else None
    )

    print(
        name,
        "| UV:", uv is not None,
        "| Material:", type(material).__name__
        if material is not None else "None",
        "| Base texture:", texture is not None,
    )

print()
print("Saved:", OUTPUT)
print("Original GLB remains unchanged.")

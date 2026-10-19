
import json
from pathlib import Path

import numpy as np
import trimesh

SOURCE = Path("public/models/kitcart/kitcart-final.glb")
OUTPUT = Path("public/models/kitcart/kitcart-head-map.json")

NECK_Y = 0.62

scene = trimesh.load(SOURCE, force="scene")
mesh = scene.to_geometry()

face_count = len(mesh.faces)

components = trimesh.graph.connected_components(
    mesh.face_adjacency,
    nodes=np.arange(face_count),
    engine="networkx",
)

head_faces = []
body_faces = []

for component in components:
    component = np.asarray(component, dtype=np.int64)

    vertices = mesh.vertices[
        np.unique(mesh.faces[component])
    ]

    if vertices[:, 1].max() > NECK_Y:
        head_faces.extend(component.tolist())
    else:
        body_faces.extend(component.tolist())

head_faces.sort()
body_faces.sort()

combined = np.array(head_faces + body_faces, dtype=np.int64)

assert len(combined) == face_count
assert len(np.unique(combined)) == face_count
assert np.array_equal(np.sort(combined), np.arange(face_count))

data = {
    "version": 1,
    "neckY": NECK_Y,
    "originalTriangles": face_count,
    "headTriangles": len(head_faces),
    "bodyTriangles": len(body_faces),
    "headFaces": head_faces,
}

OUTPUT.write_text(
    json.dumps(data, separators=(",", ":")),
    encoding="utf-8",
)

print("Original triangles:", face_count)
print("Connected components:", len(components))
print("Head triangles:", len(head_faces))
print("Body triangles:", len(body_faces))
print("Mapping saved:", OUTPUT)
print("Mapping size:", round(OUTPUT.stat().st_size / 1024), "KB")
print("Original GLB unchanged.")

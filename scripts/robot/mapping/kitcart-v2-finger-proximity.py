
import numpy as np
import trimesh
from scipy.spatial import cKDTree

MODEL = "public/models/kitcart/kitcart-rig-test.glb"

scene = trimesh.load(MODEL, force="scene")
body = scene.geometry["KitCart_Body"]

components = trimesh.graph.connected_components(
    body.face_adjacency,
    nodes=np.arange(len(body.faces)),
    engine="networkx",
)

# Existing approved candidate classification.
X_MIN, X_MAX = -0.40, -0.16
HEIGHT_MIN, HEIGHT_MAX = 0.17, 0.62

arm_components = []
excluded_components = []
other_components = []

for component in components:
    vertices = body.vertices[
        np.unique(body.faces[component])
    ]

    x = float(vertices[:, 0].mean())
    height = float(-vertices[:, 2].mean())

    is_candidate = (
        X_MIN <= x <= X_MAX
        and HEIGHT_MIN <= height <= HEIGHT_MAX
    )

    is_thigh = (
        is_candidate
        and vertices[:, 0].max() > -0.14
        and len(component) in {1569, 1055}
    )

    if is_thigh:
        excluded_components.append(component)
    elif is_candidate:
        arm_components.append(component)
    else:
        other_components.append(component)

# Reference only the lower part of the moving arm,
# rather than the complete shoulder-to-hand assembly.
arm_faces = np.concatenate(arm_components)
arm_vertices = body.vertices[
    np.unique(body.faces[arm_faces])
]

arm_height = -arm_vertices[:, 2]

hand_reference = arm_vertices[
    (arm_height >= 0.12) &
    (arm_height <= 0.27) &
    (arm_vertices[:, 0] < -0.20)
]

if len(hand_reference) == 0:
    raise RuntimeError("No hand reference vertices found.")

tree = cKDTree(hand_reference)

results = []

for component in other_components:
    vertices = body.vertices[
        np.unique(body.faces[component])
    ]

    center = vertices.mean(axis=0)
    height = -float(center[2])
    x = float(center[0])

    # Broad neighborhood, excluding distant geometry.
    if not (-0.38 <= x <= -0.12):
        continue

    if not (0.09 <= height <= 0.30):
        continue

    distances, _ = tree.query(vertices, k=1)

    minimum_distance = float(np.min(distances))
    median_distance = float(np.median(distances))

    results.append(
        (
            minimum_distance,
            median_distance,
            len(component),
            x,
            height,
            float(center[1]),
        )
    )

results.sort(key=lambda item: item[0])

print()
print("KITCART V2 — HAND COMPONENT PROXIMITY")
print("----------------------------------------")
print("Body triangles:", len(body.faces))
print("Connected components:", len(components))
print("Refined arm components:", len(arm_components))
print("Thigh exclusions:", len(excluded_components))
print("Hand reference vertices:", len(hand_reference))
print("Nearby unassigned components:", len(results))

print()
print("TOP 30 NEAREST UNASSIGNED COMPONENTS")
print("----------------------------------------")
print(
    "Rank | Minimum distance | Median distance "
    "| Triangles | X | Height | Depth"
)

for rank, row in enumerate(results[:30], start=1):
    minimum, median, triangles, x, height, depth = row

    print(
        f"{rank:2d} | "
        f"{minimum:.5f} | "
        f"{median:.5f} | "
        f"{triangles:5d} | "
        f"{x:.3f} | "
        f"{height:.3f} | "
        f"{depth:.3f}"
    )

print()
print("Read-only analysis complete.")
print("Original GLB unchanged.")

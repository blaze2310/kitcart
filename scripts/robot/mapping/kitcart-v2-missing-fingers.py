
import numpy as np
import trimesh
import plotly.graph_objects as go

MODEL = "public/models/kitcart/kitcart-rig-test.glb"
OUTPUT = "scripts/kitcart-v2-missing-fingers.html"

scene = trimesh.load(MODEL, force="scene")
body = scene.geometry["KitCart_Body"]

components = trimesh.graph.connected_components(
    body.face_adjacency,
    nodes=np.arange(len(body.faces)),
    engine="networkx",
)

def visual(vertices):
    return np.column_stack(
        [vertices[:, 0], -vertices[:, 2], vertices[:, 1]]
    )

rng = np.random.default_rng(42)

arm_faces = []
thigh_faces = []
finger_candidates = []
stationary_faces = []

# Same region used for our existing refined arm.
for faces in components:
    vertices = body.vertices[
        np.unique(body.faces[faces])
    ]

    center_x = float(vertices[:, 0].mean())
    height = float(-vertices[:, 2].mean())
    max_x = float(vertices[:, 0].max())

    is_original_arm = (
        -0.40 <= center_x <= -0.16
        and 0.17 <= height <= 0.62
    )

    is_thigh = (
        is_original_arm
        and max_x > -0.14
        and len(faces) in {1569, 1055}
    )

    # Search unselected components around the
    # outer hand and finger region only.
    is_possible_finger = (
        not is_original_arm
        and -0.32 <= center_x <= -0.19
        and 0.10 <= height < 0.25
    )

    if is_thigh:
        thigh_faces.extend(faces)
    elif is_original_arm:
        arm_faces.extend(faces)
    elif is_possible_finger:
        finger_candidates.extend(faces)
    else:
        stationary_faces.extend(faces)

groups = [
    np.asarray(group, dtype=np.int64)
    for group in (
        arm_faces,
        thigh_faces,
        finger_candidates,
        stationary_faces,
    )
]

all_faces = np.concatenate(groups)

assert len(all_faces) == len(body.faces)
assert np.array_equal(
    np.sort(all_faces),
    np.arange(len(body.faces)),
)

print("Original body triangles:", len(body.faces))
print("Refined arm triangles:", len(arm_faces))
print("Excluded thigh triangles:", len(thigh_faces))
print("Potential finger triangles:", len(finger_candidates))
print("Remaining stationary triangles:", len(stationary_faces))
print("Exact mapping verified.")

def sample(face_indices, limit):
    if not face_indices:
        return np.empty((0, 3))

    indices = np.unique(body.faces[face_indices])

    if len(indices) > limit:
        indices = rng.choice(
            indices,
            limit,
            replace=False,
        )

    return visual(body.vertices[indices])

# Move arm outwards to expose the separation.
arm = sample(arm_faces, 18000)
arm[:, 0] -= 0.12

# Move candidate fingers by the same amount,
# allowing a visual check of whether they fit.
fingers = sample(finger_candidates, 10000)
fingers[:, 0] -= 0.12

thigh = sample(thigh_faces, 7000)
remaining = sample(stationary_faces, 20000)

figure = go.Figure()

for name, points, color, size, opacity in [
    ("Stationary body", remaining, "#9CA3AF", 1.3, 0.2),
    ("Refined arm", arm, "#2563EB", 2.1, 0.9),
    ("Potential missing fingers", fingers, "#16A34A", 3, 1),
    ("Excluded thigh pieces", thigh, "#F97316", 2.5, 0.9),
]:
    figure.add_trace(
        go.Scatter3d(
            x=points[:, 0],
            y=points[:, 1],
            z=points[:, 2],
            mode="markers",
            marker=dict(
                size=size,
                color=color,
                opacity=opacity,
            ),
            name=name,
        )
    )

figure.update_layout(
    title="KitCart V2 — Missing Finger Inspection",
    height=900,
    template="plotly_white",
    margin=dict(l=0, r=0, t=55, b=0),
    scene=dict(
        xaxis_title="X — left/right",
        yaxis_title="Y — height",
        zaxis_title="Z — depth",
        aspectmode="data",
        camera=dict(
            eye=dict(x=0, y=0.3, z=2.5),
            up=dict(x=0, y=1, z=0),
        ),
    ),
)

figure.write_html(OUTPUT)

print("Created:", OUTPUT)
print("Original GLB unchanged.")


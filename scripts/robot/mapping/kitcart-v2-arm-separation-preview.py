
import numpy as np
import trimesh
import plotly.graph_objects as go

MODEL = "public/models/kitcart/kitcart-rig-test.glb"
OUTPUT = "scripts/robot/previews/kitcart-v2-arm-separation-preview.html"

# Existing candidate region
X_MIN = -0.40
X_MAX = -0.16
HEIGHT_MIN = 0.17
HEIGHT_MAX = 0.62

# Flag components that extend inward toward the
# body and match the two suspicious components.
INWARD_LIMIT = -0.14
SUSPICIOUS_TRIANGLE_COUNTS = {1569, 1055}

ARM_SHIFT = -0.12

print("Loading KitCart V2 body...")

scene = trimesh.load(MODEL, force="scene")
body = scene.geometry["KitCart_Body"]

components = trimesh.graph.connected_components(
    body.face_adjacency,
    nodes=np.arange(len(body.faces)),
    engine="networkx",
)

def to_visual(vertices):
    # GLB local coordinates -> Y-up visualization
    return np.column_stack(
        (
            vertices[:, 0],
            -vertices[:, 2],
            vertices[:, 1],
        )
    )

arm_faces = []
excluded_faces = []
body_faces = []

excluded_details = []

for faces in components:
    indices = np.unique(body.faces[faces].reshape(-1))
    vertices = body.vertices[indices]

    center_x = float(vertices[:, 0].mean())
    center_height = float(-vertices[:, 2].mean())
    max_x = float(vertices[:, 0].max())

    is_arm_candidate = (
        X_MIN <= center_x <= X_MAX
        and HEIGHT_MIN <= center_height <= HEIGHT_MAX
    )

    is_suspicious = (
        is_arm_candidate
        and max_x > INWARD_LIMIT
        and len(faces) in SUSPICIOUS_TRIANGLE_COUNTS
    )

    if is_suspicious:
        excluded_faces.extend(faces)
        excluded_details.append(
            (
                len(faces),
                round(center_x, 3),
                round(center_height, 3),
            )
        )
    elif is_arm_candidate:
        arm_faces.extend(faces)
    else:
        body_faces.extend(faces)

arm_faces = np.array(arm_faces, dtype=np.int64)
excluded_faces = np.array(excluded_faces, dtype=np.int64)
body_faces = np.array(body_faces, dtype=np.int64)

all_faces = np.concatenate(
    [arm_faces, excluded_faces, body_faces]
)

assert len(all_faces) == len(body.faces)
assert len(np.unique(all_faces)) == len(body.faces)
assert np.array_equal(
    np.sort(all_faces),
    np.arange(len(body.faces)),
)

print()
print("TRIANGLE VERIFICATION")
print("-----------------------------")
print("Original body:", len(body.faces))
print("Refined arm:", len(arm_faces))
print("Excluded candidates:", len(excluded_faces))
print("Other body:", len(body_faces))
print("Mapped total:", len(all_faces))
print("Exact triangle mapping: PASSED")

print()
print("EXCLUDED COMPONENTS")
print("-----------------------------")

for triangle_count, x, height in excluded_details:
    print(
        f"{triangle_count} triangles"
        f" | center X {x}"
        f" | height {height}"
    )

if len(excluded_details) != 2:
    print(
        "WARNING: Expected two suspicious components, "
        f"found {len(excluded_details)}."
    )

rng = np.random.default_rng(42)

def sample_faces(face_indices, limit):
    if len(face_indices) == 0:
        return np.empty((0, 3))

    vertex_indices = np.unique(
        body.faces[face_indices].reshape(-1)
    )

    if len(vertex_indices) > limit:
        vertex_indices = rng.choice(
            vertex_indices,
            limit,
            replace=False,
        )

    return to_visual(body.vertices[vertex_indices])

# Stationary body includes excluded components,
# but we separately highlight those parts in orange.
remaining_faces = np.concatenate(
    [body_faces, excluded_faces]
)

remaining = sample_faces(remaining_faces, 22000)
arm = sample_faces(arm_faces, 18000)
excluded = sample_faces(excluded_faces, 7000)

# Shift only the proposed arm outward.
arm[:, 0] += ARM_SHIFT

figure = go.Figure()

figure.add_trace(
    go.Scatter3d(
        x=remaining[:, 0],
        y=remaining[:, 1],
        z=remaining[:, 2],
        mode="markers",
        marker=dict(
            size=1.5,
            color="#9CA3AF",
            opacity=0.25,
        ),
        name="Stationary body",
        hoverinfo="skip",
    )
)

figure.add_trace(
    go.Scatter3d(
        x=arm[:, 0],
        y=arm[:, 1],
        z=arm[:, 2],
        mode="markers",
        marker=dict(
            size=2.3,
            color="#2563EB",
            opacity=0.95,
        ),
        name="Refined proposed arm",
    )
)

figure.add_trace(
    go.Scatter3d(
        x=excluded[:, 0],
        y=excluded[:, 1],
        z=excluded[:, 2],
        mode="markers",
        marker=dict(
            size=3,
            color="#F97316",
            opacity=1,
        ),
        name="Two excluded components",
    )
)

figure.update_layout(
    title="KitCart V2 — Refined Arm Separation",
    template="plotly_white",
    height=900,
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
    legend=dict(
        x=0.78,
        y=0.98,
    ),
)

figure.write_html(OUTPUT)

print()
print("Created:", OUTPUT)
print("Original GLB unchanged.")


import numpy as np
import trimesh
import plotly.graph_objects as go
from scipy.spatial import cKDTree

MODEL = "public/models/kitcart/kitcart-rig-test.glb"
OUTPUT = "scripts/kitcart-v2-finger-nearest-map.html"

SHIFT_X = -0.12
TOP_N = 30

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

arm = []
excluded = []
other = []

for index, faces in enumerate(components):
    vertices = body.vertices[np.unique(body.faces[faces])]
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
        excluded.append((index, faces))
    elif is_arm:
        arm.append((index, faces))
    else:
        other.append((index, faces))

arm_faces = np.concatenate([f for _, f in arm])
arm_vertices = body.vertices[
    np.unique(body.faces[arm_faces])
]

height = -arm_vertices[:, 2]
hand_vertices = arm_vertices[
    (height >= 0.12)
    & (height <= 0.27)
    & (arm_vertices[:, 0] < -0.20)
]

tree = cKDTree(hand_vertices)

ranked = []

for index, faces in other:
    vertices = body.vertices[np.unique(body.faces[faces])]
    center = vertices.mean(axis=0)
    x = float(center[0])
    h = float(-center[2])

    if not (-0.38 <= x <= -0.12 and 0.09 <= h <= 0.30):
        continue

    distances, _ = tree.query(vertices)

    ranked.append((
        float(np.min(distances)),
        float(np.median(distances)),
        index,
        faces,
    ))

ranked.sort(key=lambda row: (row[0], row[1], row[2]))
nearest = ranked[:TOP_N]
nearest_ids = {row[2] for row in nearest}

remaining = [
    (i, f) for i, f in other
    if i not in nearest_ids
] + excluded

all_groups = [
    np.concatenate([f for _, f in arm]),
    np.concatenate([row[3] for row in nearest]),
    np.concatenate([f for _, f in remaining]),
]

mapped = np.concatenate(all_groups)

assert len(mapped) == len(body.faces)
assert np.array_equal(
    np.sort(mapped),
    np.arange(len(body.faces))
)

rng = np.random.default_rng(42)

def points_for(faces, limit=20000):
    if not len(faces):
        return np.empty((0, 3))

    vertices = np.unique(body.faces[faces].reshape(-1))

    if len(vertices) > limit:
        vertices = rng.choice(vertices, limit, replace=False)

    return visual(body.vertices[vertices])

figure = go.Figure()

stationary_faces = np.concatenate([
    f for _, f in remaining
])

stationary_points = points_for(stationary_faces)

figure.add_trace(go.Scatter3d(
    x=stationary_points[:, 0],
    y=stationary_points[:, 1],
    z=stationary_points[:, 2],
    mode="markers",
    marker=dict(size=1, color="#9CA3AF", opacity=0.18),
    name="Stationary body",
))

arm_points = points_for(arm_faces)
arm_points[:, 0] += SHIFT_X

figure.add_trace(go.Scatter3d(
    x=arm_points[:, 0],
    y=arm_points[:, 1],
    z=arm_points[:, 2],
    mode="markers",
    marker=dict(size=2, color="#2563EB", opacity=0.9),
    name="Refined arm",
))

for rank, (minimum, median, index, faces) in enumerate(
    nearest, start=1
):
    p = points_for(faces, 1500)
    p[:, 0] += SHIFT_X

    color = "#16A34A" if minimum < 1e-6 else "#F59E0B"

    figure.add_trace(go.Scatter3d(
        x=p[:, 0],
        y=p[:, 1],
        z=p[:, 2],
        mode="markers",
        marker=dict(size=3.2, color=color, opacity=1),
        name=f"#{rank}: {len(faces)} triangles",
        showlegend=False,
        hovertemplate=(
            f"Rank {rank}<br>"
            f"Triangles: {len(faces)}<br>"
            f"Min distance: {minimum:.6f}<br>"
            f"Median distance: {median:.6f}"
            "<extra></extra>"
        ),
    ))

figure.update_layout(
    title="KitCart V2 — Nearest Missing Finger Candidates",
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
)

figure.write_html(OUTPUT)

print("Original body triangles:", len(body.faces))
print("Refined arm triangles:", len(arm_faces))
print("Highlighted components:", len(nearest))
print("Highlighted triangles:", sum(len(r[3]) for r in nearest))
print("Excluded thigh components:", len(excluded))
print("Exact triangle mapping: PASSED")
print("Saved:", OUTPUT)
print("Original GLB unchanged.")

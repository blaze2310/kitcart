
import numpy as np
import trimesh
import plotly.graph_objects as go

MODEL = "public/models/kitcart/kitcart-rig-test.glb"
OUTPUT = "scripts/robot/previews/kitcart-v2-arm-map.html"

scene = trimesh.load(MODEL, force="scene")
body = scene.geometry["KitCart_Body"]

components = trimesh.graph.connected_components(
    body.face_adjacency,
    nodes=np.arange(len(body.faces)),
    engine="networkx",
)

# Original GLB local axes:
# X = left/right, Y = depth, -Z = height.
def visual(vertices):
    return np.column_stack([
        vertices[:, 0],
        -vertices[:, 2],
        vertices[:, 1],
    ])

rng = np.random.default_rng(42)

# Preliminary negative-X arm search region.
# The selected bounds are intentionally broad.
X_MIN = -0.40
X_MAX = -0.16
HEIGHT_MIN = 0.17
HEIGHT_MAX = 0.62

candidates = []

for faces in components:
    vertices = body.vertices[
        np.unique(body.faces[faces].reshape(-1))
    ]

    center = vertices.mean(axis=0)

    x = center[0]
    height = -center[2]

    if (
        X_MIN <= x <= X_MAX
        and HEIGHT_MIN <= height <= HEIGHT_MAX
    ):
        candidates.append((faces, vertices))

print("Original body triangles:", len(body.faces))
print("Candidate arm components:", len(candidates))
print(
    "Candidate triangles:",
    sum(len(faces) for faces, _ in candidates),
)

figure = go.Figure()

# Faint full-body reference.
reference = visual(body.vertices)

indices = rng.choice(
    len(reference),
    min(20000, len(reference)),
    replace=False,
)

figure.add_trace(
    go.Scatter3d(
        x=reference[indices, 0],
        y=reference[indices, 1],
        z=reference[indices, 2],
        mode="markers",
        marker=dict(
            size=1,
            color="#AEB8C5",
            opacity=0.10,
        ),
        name="Full body reference",
        hoverinfo="skip",
    )
)

colors = [
    "#FF595E",
    "#1982C4",
    "#8AC926",
    "#FFCA3A",
    "#6A4C93",
    "#F72585",
    "#00B4D8",
    "#43AA8B",
]

for index, (faces, vertices) in enumerate(
    sorted(
        candidates,
        key=lambda item: len(item[0]),
        reverse=True,
    )
):
    if len(vertices) > 1200:
        selected = rng.choice(
            len(vertices),
            1200,
            replace=False,
        )
        vertices = vertices[selected]

    points = visual(vertices)

    figure.add_trace(
        go.Scatter3d(
            x=points[:, 0],
            y=points[:, 1],
            z=points[:, 2],
            mode="markers",
            marker=dict(
                size=2,
                color=colors[index % len(colors)],
                opacity=0.85,
            ),
            name=f"Arm candidate {index + 1} ({len(faces)} tris)",
            showlegend=index < 25,
        )
    )

figure.update_layout(
    title="KitCart V2 — Negative-X Arm Candidate Map",
    template="plotly_white",
    height=900,
    margin=dict(l=0, r=0, t=55, b=0),
    scene=dict(
        xaxis_title="X — left/right",
        yaxis_title="Y — height",
        zaxis_title="Z — depth",
        aspectmode="data",
        camera=dict(
            eye=dict(x=0, y=0.4, z=2.5),
            up=dict(x=0, y=1, z=0),
        ),
    ),
)

figure.write_html(OUTPUT)

print("Saved:", OUTPUT)
print("Original GLB unchanged.")

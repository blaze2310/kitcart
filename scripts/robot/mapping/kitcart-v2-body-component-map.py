
import numpy as np
import trimesh
import plotly.graph_objects as go

MODEL = "public/models/kitcart/kitcart-rig-test.glb"
OUTPUT = "scripts/kitcart-v2-body-components.html"

SHOW_COMPONENTS = 40
REFERENCE_POINTS = 18000
MAX_POINTS_PER_COMPONENT = 2500

print("Loading KitCart V2 body...")

scene = trimesh.load(MODEL, force="scene")
body = scene.geometry["KitCart_Body"]

components = trimesh.graph.connected_components(
    body.face_adjacency,
    nodes=np.arange(len(body.faces)),
    engine="networkx",
)

components = sorted(
    components,
    key=len,
    reverse=True,
)

print("Body triangles:", len(body.faces))
print("Connected components:", len(components))

# Convert GLB coordinates to visual Y-up coordinates:
# local (x,y,z) -> visual (x,-z,y).
def to_visual(vertices):
    return np.column_stack([
        vertices[:, 0],
        -vertices[:, 2],
        vertices[:, 1],
    ])

rng = np.random.default_rng(42)

all_vertices = to_visual(body.vertices)

reference_indices = rng.choice(
    len(all_vertices),
    min(REFERENCE_POINTS, len(all_vertices)),
    replace=False,
)

figure = go.Figure()

# Faint full-body reference
figure.add_trace(
    go.Scatter3d(
        x=all_vertices[reference_indices, 0],
        y=all_vertices[reference_indices, 1],
        z=all_vertices[reference_indices, 2],
        mode="markers",
        marker=dict(
            size=1,
            color="lightgray",
            opacity=0.12,
        ),
        name="Full body reference",
        hoverinfo="skip",
    )
)

colors = [
    "#FF595E", "#1982C4", "#8AC926",
    "#FFCA3A", "#6A4C93", "#FF924C",
    "#00B4D8", "#F72585", "#43AA8B",
    "#7209B7",
]

for index, face_indices in enumerate(
    components[:SHOW_COMPONENTS]
):
    vertex_indices = np.unique(
        body.faces[face_indices].reshape(-1)
    )

    if len(vertex_indices) > MAX_POINTS_PER_COMPONENT:
        vertex_indices = rng.choice(
            vertex_indices,
            MAX_POINTS_PER_COMPONENT,
            replace=False,
        )

    points = to_visual(body.vertices[vertex_indices])

    figure.add_trace(
        go.Scatter3d(
            x=points[:, 0],
            y=points[:, 1],
            z=points[:, 2],
            mode="markers",
            marker=dict(
                size=2.4,
                color=colors[index % len(colors)],
                opacity=0.95,
            ),
            name=(
                f"Component {index + 1} "
                f"({len(face_indices)} triangles)"
            ),
            hovertemplate=(
                f"Component {index + 1}"
                "<extra></extra>"
            ),
        )
    )

figure.update_layout(
    title="KitCart V2 — Body Geometry Component Map",
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
        x=1,
        y=1,
        font=dict(size=10),
    ),
)

figure.write_html(OUTPUT)

print("Saved:", OUTPUT)
print("Original GLB unchanged.")

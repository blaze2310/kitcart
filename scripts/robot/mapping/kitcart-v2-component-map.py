import numpy as np
import trimesh
import plotly.graph_objects as go

MODEL = "public/models/kitcart/kitcart-final.glb"
OUTPUT = "scripts/robot/previews/kitcart-v2-components.html"

mesh = trimesh.load(MODEL, force="scene").to_geometry()

parts = sorted(
    mesh.split(only_watertight=False),
    key=lambda part: len(part.faces),
    reverse=True,
)

fig = go.Figure()

# Show complete robot faintly for spatial context.
points = mesh.triangles_center
indices = np.linspace(0, len(points) - 1, 20000, dtype=int)
background = points[indices]

fig.add_trace(
    go.Scatter3d(
        x=background[:, 0],
        y=background[:, 1],
        z=background[:, 2],
        mode="markers",
        marker=dict(size=1, color="lightgray", opacity=0.12),
        name="Full robot",
        hoverinfo="skip",
    )
)

colors = [
    "#FF5555", "#4C8DFF", "#35C98A", "#FFB347",
    "#AF78FF", "#FF78B2", "#28C6D7", "#E9CE40",
]

for i, part in enumerate(parts[:20]):
    points = part.triangles_center

    fig.add_trace(
        go.Scatter3d(
            x=points[:, 0],
            y=points[:, 1],
            z=points[:, 2],
            mode="markers",
            marker=dict(
                size=2.5,
                color=colors[i % len(colors)],
            ),
            name=f"Component {i+1} ({len(part.faces)} tris)",
            hoverinfo="name",
        )
    )

fig.update_layout(
    title="KitCart v2 - Largest 20 Mesh Components",
    scene=dict(
        aspectmode="data",
        xaxis_title="X",
        yaxis_title="Y",
        zaxis_title="Z",
    ),
    margin=dict(l=0, r=0, t=50, b=0),
    legend=dict(font=dict(size=10)),
)

fig.write_html(OUTPUT)

print("Total components:", len(parts))
print("Created:", OUTPUT)
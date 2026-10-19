import numpy as np
import trimesh
import plotly.graph_objects as go

MODEL = "public/models/kitcart/kitcart-final.glb"
OUTPUT = "scripts/kitcart-v2-neck-map.html"

mesh = trimesh.load(MODEL, force="scene").to_geometry()

parts = mesh.split(only_watertight=False)

cutoff = 0.62

crossing = [
    part for part in parts
    if part.bounds[0, 1] < cutoff < part.bounds[1, 1]
]

fig = go.Figure()

# Faint full-robot reference
points = mesh.triangles_center
indices = np.linspace(0, len(points) - 1, 15000, dtype=int)
background = points[indices]

fig.add_trace(
    go.Scatter3d(
        x=background[:, 0],
        y=background[:, 1],
        z=background[:, 2],
        mode="markers",
        marker=dict(
            size=1,
            color="lightgray",
            opacity=0.1,
        ),
        name="Full robot",
        hoverinfo="skip",
    )
)

colors = ["#FF4545", "#3B82F6", "#22C55E", "#F59E0B"]

for i, part in enumerate(crossing):
    pts = part.triangles_center

    fig.add_trace(
        go.Scatter3d(
            x=pts[:, 0],
            y=pts[:, 1],
            z=pts[:, 2],
            mode="markers",
            marker=dict(
                size=3,
                color=colors[i],
            ),
            name=f"Part {i+1} ({len(part.faces)} triangles)",
        )
    )

fig.update_layout(
    title="KitCart v2 - Neck Boundary Inspection (Y=0.62)",
    scene=dict(
        aspectmode="data",
        xaxis_title="X",
        yaxis_title="Y",
        zaxis_title="Z",
    ),
    margin=dict(l=0, r=0, t=50, b=0),
)

fig.write_html(OUTPUT)

print("Crossing components:", len(crossing))
print("Saved:", OUTPUT)
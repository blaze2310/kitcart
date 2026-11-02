
from pathlib import Path
import numpy as np
from pygltflib import GLTF2

BASE = Path.home() / "Desktop/kitcart/public/models/kitcart/animations"

FILES = {
    "ORIGINAL MASTER": BASE / "master/kitcart-master-rigged.glb",
    "IDLE ANIMATION": BASE / "stay-in-place/idle.glb",
}

COMPONENT_TYPES = {
    5120: np.int8,
    5121: np.uint8,
    5122: np.int16,
    5123: np.uint16,
    5125: np.uint32,
    5126: np.float32,
}

TYPE_COUNTS = {
    "SCALAR": 1,
    "VEC2": 2,
    "VEC3": 3,
    "VEC4": 4,
    "MAT4": 16,
}


def read_accessor(gltf, accessor_index):
    accessor = gltf.accessors[accessor_index]
    view = gltf.bufferViews[accessor.bufferView]

    dtype = np.dtype(COMPONENT_TYPES[accessor.componentType]).newbyteorder("<")
    components = TYPE_COUNTS[accessor.type]

    item_size = dtype.itemsize * components
    stride = view.byteStride or item_size

    offset = (
        (view.byteOffset or 0)
        + (accessor.byteOffset or 0)
    )

    raw = gltf.binary_blob()

    values = np.ndarray(
        shape=(accessor.count, components),
        dtype=dtype,
        buffer=raw,
        offset=offset,
        strides=(stride, dtype.itemsize),
    ).copy()

    if accessor.normalized:
        if np.issubdtype(dtype, np.unsignedinteger):
            values = values.astype(float) / np.iinfo(dtype).max
        elif np.issubdtype(dtype, np.signedinteger):
            values = np.maximum(
                values.astype(float) / np.iinfo(dtype).max,
                -1.0,
            )

    return values


def inspect_model(label, path):
    print("\n" + "=" * 65)
    print(label)
    print("=" * 65)

    if not path.exists():
        print("FILE NOT FOUND:", path)
        return

    gltf = GLTF2().load(str(path))

    print("File:", path.name)
    print("Animations:", len(gltf.animations))
    print("Skins:", len(gltf.skins))

    if not gltf.skins:
        print("No skin found.")
        return

    for skin_index, skin in enumerate(gltf.skins):
        joints = skin.joints

        print(f"\nSkin {skin_index}")
        print("Joint count:", len(joints))

        head_joints = [
            (index, gltf.nodes[node_id].name)
            for index, node_id in enumerate(joints)
            if "head" in (gltf.nodes[node_id].name or "").lower()
        ]

        print("Head joints:", head_joints)

        head_index = next(
            (
                index
                for index, node_id in enumerate(joints)
                if gltf.nodes[node_id].name == "mixamorig:Head"
            ),
            None,
        )

        if head_index is None:
            print("HEAD BONE NOT FOUND IN SKIN")
            continue

        total_vertices = 0
        head_weighted_vertices = 0
        strong_head_vertices = 0
        max_head_weight = 0.0

        for node in gltf.nodes:
            if node.mesh is None or node.skin != skin_index:
                continue

            mesh = gltf.meshes[node.mesh]

            for primitive in mesh.primitives:
                attrs = primitive.attributes

                if attrs.POSITION is None:
                    continue

                positions = read_accessor(gltf, attrs.POSITION)
                total_vertices += len(positions)

                if attrs.JOINTS_0 is None or attrs.WEIGHTS_0 is None:
                    continue

                joint_ids = read_accessor(gltf, attrs.JOINTS_0).astype(int)
                weights = read_accessor(gltf, attrs.WEIGHTS_0).astype(float)

                head_weights = np.where(
                    joint_ids == head_index,
                    weights,
                    0.0,
                ).sum(axis=1)

                head_weighted_vertices += int(
                    np.count_nonzero(head_weights > 0.01)
                )

                strong_head_vertices += int(
                    np.count_nonzero(head_weights > 0.5)
                )

                max_head_weight = max(
                    max_head_weight,
                    float(head_weights.max(initial=0)),
                )

        print("Head skin index:", head_index)
        print("Total skinned vertices:", total_vertices)
        print("Vertices influenced by head (>1%):", head_weighted_vertices)
        print("Vertices mainly attached to head (>50%):", strong_head_vertices)
        print("Maximum head weight:", round(max_head_weight, 4))

        if strong_head_vertices == 0:
            print("RESULT: Head bone has no strongly attached vertices.")
        else:
            print("RESULT: Head bone influences visible mesh vertices.")

    print("\nAnimation names:")
    for animation in gltf.animations:
        print("-", animation.name)


for label, path in FILES.items():
    inspect_model(label, path)

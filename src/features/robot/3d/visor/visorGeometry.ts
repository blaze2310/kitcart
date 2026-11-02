
import {
  BufferGeometry,
  Float32BufferAttribute,
  SkinnedMesh,
  Uint16BufferAttribute,
} from "three";

/**
 * KitCart V4 Skinned Visor Geometry
 *
 * Extracted from the approved robot checkpoint d67d615.
 *
 * Original rig:
 * - 24,961 vertices
 * - 19,776 triangles
 *
 * Approved visor:
 * - 444 selected triangles
 * - Shared skeleton with the original robot
 * - XY-based texture coordinates
 * - Default face width 0.88
 *
 * This module creates geometry only.
 * It does not handle animations, expressions,
 * blinking, React state, or mouse tracking.
 */

export const VISOR_GEOMETRY_CONFIG = {
  version: "KitCart-Visor-Mask-V4",
  modelVertices: 24961,
  modelTriangles: 19776,
  selectedTriangles: 444,
  defaultFaceWidth: 0.88,
  maskUrl: "/mascot/kitcart-visor-mask-v4.json",
} as const;

export type VisorMaskData = {
  version: string;
  geometryVertices: number;
  geometryTriangles: number;
  selectedFaces: number[];
};

export type VisorGeometryOptions = {
  source: SkinnedMesh;
  selectedFaces: readonly number[];
  width?: number;
};

/**
 * Validate the approved mask before using it.
 *
 * The mask must match the compatible animation rig.
 * Other rigs should not silently reuse this mask.
 */
export function validateVisorMask(
  data: unknown
): data is VisorMaskData {
  if (!data || typeof data !== "object") {
    return false;
  }

  const mask = data as Partial<VisorMaskData>;

  if (
    mask.version !== VISOR_GEOMETRY_CONFIG.version ||
    mask.geometryVertices !==
      VISOR_GEOMETRY_CONFIG.modelVertices ||
    mask.geometryTriangles !==
      VISOR_GEOMETRY_CONFIG.modelTriangles ||
    !Array.isArray(mask.selectedFaces)
  ) {
    return false;
  }

  const faces = mask.selectedFaces;

  return (
    faces.length ===
      VISOR_GEOMETRY_CONFIG.selectedTriangles &&
    new Set(faces).size ===
      VISOR_GEOMETRY_CONFIG.selectedTriangles &&
    faces.every(
      (face) =>
        Number.isInteger(face) &&
        face >= 0 &&
        face <
          VISOR_GEOMETRY_CONFIG.modelTriangles
    )
  );
}

/**
 * Build an independent visor surface from the original
 * mesh's selected triangle indices.
 *
 * Skin indices and weights are copied directly so the
 * overlay can share the source mesh's skeleton.
 *
 * IMPORTANT:
 * The returned geometry must be disposed by its owner.
 */
export function createVisorGeometry({
  source,
  selectedFaces,
  width = VISOR_GEOMETRY_CONFIG.defaultFaceWidth,
}: VisorGeometryOptions): BufferGeometry {
  const original = source.geometry;

  const position = original.getAttribute("position");
  const normal = original.getAttribute("normal");
  const skinIndex = original.getAttribute("skinIndex");
  const skinWeight = original.getAttribute("skinWeight");

  if (!position || !skinIndex || !skinWeight) {
    throw new Error(
      "KitCart visor: missing skinned geometry attributes"
    );
  }

  if (
    position.count !==
    VISOR_GEOMETRY_CONFIG.modelVertices
  ) {
    throw new Error(
      "KitCart visor: incompatible source rig vertex count"
    );
  }

  if (
    !Number.isFinite(width) ||
    width <= 0
  ) {
    throw new Error(
      "KitCart visor: width must be a positive number"
    );
  }

  const totalFaces = Math.floor(
    (
      original.index
        ? original.index.count
        : position.count
    ) / 3
  );

  const faces = [...new Set(selectedFaces)].filter(
    (face) =>
      Number.isInteger(face) &&
      face >= 0 &&
      face < totalFaces
  );

  if (
    faces.length !==
    VISOR_GEOMETRY_CONFIG.selectedTriangles
  ) {
    throw new Error(
      "KitCart visor: expected 444 approved triangles"
    );
  }

  const xyz: number[] = [];
  const normals: number[] = [];
  const joints: number[] = [];
  const weights: number[] = [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const face of faces) {
    for (let corner = 0; corner < 3; corner++) {
      const offset = face * 3 + corner;

      const index = original.index
        ? original.index.getX(offset)
        : offset;

      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);

      xyz.push(x, y, z);

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      if (normal) {
        normals.push(
          normal.getX(index),
          normal.getY(index),
          normal.getZ(index)
        );
      }

      for (let j = 0; j < 4; j++) {
        joints.push(
          skinIndex.getComponent(index, j)
        );

        weights.push(
          skinWeight.getComponent(index, j)
        );
      }
    }
  }

  const spanX = Math.max(
    maxX - minX,
    0.00001
  );

  const spanY = Math.max(
    maxY - minY,
    0.00001
  );

  const uv: number[] = [];

  for (
    let i = 0;
    i < xyz.length;
    i += 3
  ) {
    const u =
      (xyz[i] - minX) / spanX;

    const v =
      (xyz[i + 1] - minY) / spanY;

    uv.push(
      0.5 + (u - 0.5) / width,
      v
    );
  }

  const geometry = new BufferGeometry();

  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(xyz, 3)
  );

  geometry.setAttribute(
    "skinIndex",
    new Uint16BufferAttribute(joints, 4)
  );

  geometry.setAttribute(
    "skinWeight",
    new Float32BufferAttribute(weights, 4)
  );

  geometry.setAttribute(
    "uv",
    new Float32BufferAttribute(uv, 2)
  );

  if (normal) {
    geometry.setAttribute(
      "normal",
      new Float32BufferAttribute(normals, 3)
    );
  } else {
    geometry.computeVertexNormals();
  }

  geometry.computeBoundingSphere();

  return geometry;
}

/**
 * Create a visor mesh that uses the same skeleton
 * and bind matrix as the approved robot source mesh.
 *
 * The material is supplied by the caller.
 */
export function createBoundVisorMesh(
  source: SkinnedMesh,
  geometry: BufferGeometry,
  material: ConstructorParameters<
    typeof SkinnedMesh
  >[1]
): SkinnedMesh {
  const mesh = new SkinnedMesh(
    geometry,
    material
  );

  mesh.name = "KitCart Animated Visor";

  mesh.position.copy(source.position);
  mesh.quaternion.copy(source.quaternion);
  mesh.scale.copy(source.scale);

  mesh.bindMode = source.bindMode;

  mesh.bind(
    source.skeleton,
    source.bindMatrix
  );

  mesh.frustumCulled = false;
  mesh.renderOrder = 3;

  return mesh;
}

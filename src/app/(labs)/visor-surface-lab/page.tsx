
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Canvas,
  ThreeEvent,
} from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import {
  Box3,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Material,
  MeshBasicMaterial,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3,
} from "three";

// ======================================================
// KITCART VISOR REFINEMENT LAB V4
//
// Uses the verified 24,961-vertex idle.glb rig.
// Automatic geometric extraction + manual editing.
//
// The robot stays stationary.
// The original model and login are never modified.
// ======================================================

const MODEL_URL =
  "/models/kitcart/animations/stay-in-place/idle.glb";

const VISOR_SEEDS = [
  18641, 18452, 18680, 18607, 18496,
];

const FRAME_FACES = [
  17957, 19383, 18302, 18821,
];

type Settings = {
  padding: number;
  normalAngle: number;
  frameGuard: number;
};

type EditMode = "remove" | "add";

type Edits = Record<number, boolean>;

type Statistics = {
  automatic: number;
  final: number;
  manuallyAdded: number;
  manuallyRemoved: number;
  frameSamplesIncluded: number;
  seedSamplesIncluded: number;
};

const DEFAULT_SETTINGS: Settings = {
  padding: 0.015,
  normalAngle: 90,
  frameGuard: 0.005,
};

const EMPTY_STATS: Statistics = {
  automatic: 0,
  final: 0,
  manuallyAdded: 0,
  manuallyRemoved: 0,
  frameSamplesIncluded: 0,
  seedSamplesIncluded: 0,
};

// ======================================================
// TRIANGLE HELPERS
// ======================================================

function getVertex(
  geometry: BufferGeometry,
  face: number,
  corner: number
) {
  const index = face * 3 + corner;

  return geometry.index
    ? geometry.index.getX(index)
    : index;
}

function getFaceCount(
  geometry: BufferGeometry
) {
  const position =
    geometry.getAttribute("position");

  return Math.floor(
    (geometry.index
      ? geometry.index.count
      : position.count) / 3
  );
}

function getPoints(
  geometry: BufferGeometry,
  face: number
): [Vector3, Vector3, Vector3] {
  const position =
    geometry.getAttribute("position");

  const points = [0, 1, 2].map((corner) => {
    const index = getVertex(
      geometry,
      face,
      corner
    );

    return new Vector3(
      position.getX(index),
      position.getY(index),
      position.getZ(index)
    );
  });

  return [points[0], points[1], points[2]];
}

function getCenter(
  geometry: BufferGeometry,
  face: number
) {
  const [a, b, c] = getPoints(geometry, face);

  return a.add(b).add(c).multiplyScalar(1 / 3);
}

function getNormal(
  geometry: BufferGeometry,
  face: number
) {
  const [a, b, c] = getPoints(geometry, face);

  return b.sub(a).cross(c.sub(a)).normalize();
}

// ======================================================
// SPATIAL TRIANGLE ADJACENCY
//
// Matches actual geometric edges even when UV seams
// duplicate vertex indices.
// ======================================================

function buildAdjacency(
  geometry: BufferGeometry
) {
  const position =
    geometry.getAttribute("position");

  const count = getFaceCount(geometry);

  const edges = new Map<string, number[]>();

  const vertexKey = (index: number) => {
    const precision = 10000;

    return [
      Math.round(
        position.getX(index) * precision
      ),
      Math.round(
        position.getY(index) * precision
      ),
      Math.round(
        position.getZ(index) * precision
      ),
    ].join(",");
  };

  for (let face = 0; face < count; face++) {
    const keys = [0, 1, 2].map((corner) =>
      vertexKey(
        getVertex(geometry, face, corner)
      )
    );

    for (let corner = 0; corner < 3; corner++) {
      const a = keys[corner];
      const b = keys[(corner + 1) % 3];

      if (a === b) continue;

      const key =
        a < b ? `${a}|${b}` : `${b}|${a}`;

      const owners = edges.get(key) ?? [];
      owners.push(face);
      edges.set(key, owners);
    }
  }

  const neighbors = Array.from(
    { length: count },
    () => new Set<number>()
  );

  for (const owners of edges.values()) {
    for (const a of owners) {
      for (const b of owners) {
        if (a !== b) {
          neighbors[a].add(b);
        }
      }
    }
  }

  return neighbors.map((set) => [...set]);
}

// ======================================================
// AUTOMATIC STARTING REGION
// ======================================================

function extractAutomatic(
  geometry: BufferGeometry,
  adjacency: number[][],
  settings: Settings
): number[] {
  const count = getFaceCount(geometry);

  const seeds = VISOR_SEEDS.filter(
    (face) => face >= 0 && face < count
  );

  if (seeds.length !== VISOR_SEEDS.length) {
    return [];
  }

  const centers = Array.from(
    { length: count },
    (_, i) => getCenter(geometry, i)
  );

  const normals = Array.from(
    { length: count },
    (_, i) => getNormal(geometry, i)
  );

  const seedPoints = seeds.map(
    (face) => centers[face]
  );

  const framePoints = FRAME_FACES
    .filter((face) => face >= 0 && face < count)
    .map((face) => centers[face]);

  const minX = Math.min(
    ...seedPoints.map((p) => p.x)
  );
  const maxX = Math.max(
    ...seedPoints.map((p) => p.x)
  );

  const minY = Math.min(
    ...seedPoints.map((p) => p.y)
  );
  const maxY = Math.max(
    ...seedPoints.map((p) => p.y)
  );

  const minZ = Math.min(
    ...seedPoints.map((p) => p.z)
  );
  const maxZ = Math.max(
    ...seedPoints.map((p) => p.z)
  );

  const seedSet = new Set(seeds);
  const frameSet = new Set(FRAME_FACES);

  const minimumDot = Math.cos(
    (settings.normalAngle * Math.PI) / 180
  );

  function allowed(face: number) {
    if (frameSet.has(face)) return false;
    if (seedSet.has(face)) return true;

    const point = centers[face];
    const pad = settings.padding;

    if (
      point.x < minX - pad ||
      point.x > maxX + pad ||
      point.y < minY - pad ||
      point.y > maxY + pad ||
      point.z < minZ - pad ||
      point.z > maxZ + pad
    ) {
      return false;
    }

    for (const frame of framePoints) {
      if (
        point.distanceTo(frame) <
        settings.frameGuard
      ) {
        return false;
      }
    }

    return true;
  }

  const selected = new Set(seeds);
  const visited = new Set(seeds);
  const queue = [...seeds];

  let cursor = 0;

  // Hard safety guard only; not a user slider.
  const SAFETY_LIMIT = 10000;

  while (
    cursor < queue.length &&
    selected.size < SAFETY_LIMIT
  ) {
    const face = queue[cursor++];

    for (const neighbor of adjacency[face]) {
      if (visited.has(neighbor)) continue;

      visited.add(neighbor);

      if (!allowed(neighbor)) continue;

      const dot = Math.abs(
        normals[face].dot(normals[neighbor])
      );

      if (dot < minimumDot) continue;

      selected.add(neighbor);
      queue.push(neighbor);

      if (selected.size >= SAFETY_LIMIT) break;
    }
  }

  return [...selected].sort((a, b) => a - b);
}

// ======================================================
// SKINNED SURFACE HIGHLIGHT
// ======================================================

function makeOverlayGeometry(
  source: SkinnedMesh,
  faces: number[]
) {
  const original = source.geometry;
  const output = new BufferGeometry();

  const attributeNames = [
    "position",
    "normal",
    "uv",
    "skinIndex",
    "skinWeight",
  ] as const;

  for (const name of attributeNames) {
    const attribute =
      original.getAttribute(name);

    if (!attribute) continue;

    const values: number[] = [];

    for (const face of faces) {
      for (let corner = 0; corner < 3; corner++) {
        const vertex = getVertex(
          original,
          face,
          corner
        );

        for (
          let component = 0;
          component < attribute.itemSize;
          component++
        ) {
          values.push(
            attribute.getComponent(
              vertex,
              component
            )
          );
        }
      }
    }

    if (name === "skinIndex") {
      output.setAttribute(
        name,
        new Uint16BufferAttribute(
          values,
          attribute.itemSize
        )
      );
    } else {
      output.setAttribute(
        name,
        new Float32BufferAttribute(
          values,
          attribute.itemSize
        )
      );
    }
  }

  if (!output.getAttribute("normal")) {
    output.computeVertexNormals();
  }

  output.computeBoundingSphere();

  return output;
}

// ======================================================
// ROBOT MODEL
// ======================================================

function Robot({
  settings,
  edits,
  editMode,
  highlight,
  onFaceClick,
  onStatistics,
  onSelection,
}: {
  settings: Settings;
  edits: Edits;
  editMode: EditMode;
  highlight: boolean;
  onFaceClick: (
    face: number,
    add: boolean
  ) => void;
  onStatistics: (value: Statistics) => void;
  onSelection: (faces: number[]) => void;
}) {
  const gltf = useGLTF(MODEL_URL);

  const model = useMemo(
    () => SkeletonUtils.clone(gltf.scene),
    [gltf.scene]
  );

  const source = useMemo(() => {
    let found: SkinnedMesh | null = null;

    model.traverse((object) => {
      if (
        !found &&
        object instanceof SkinnedMesh &&
        object.geometry.getAttribute("position")
          ?.count === 24961
      ) {
        found = object;
      }
    });

    return found as SkinnedMesh | null;
  }, [model]);

  const framing = useMemo(() => {
    model.updateMatrixWorld(true);

    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());

    return {
      scale:
        2.3 /
        Math.max(size.x, size.y, size.z, 0.001),

      center: [
        -center.x,
        -center.y,
        -center.z,
      ] as [number, number, number],
    };
  }, [model]);

  const adjacency = useMemo(
    () => source
      ? buildAdjacency(source.geometry)
      : [],
    [source]
  );

  const automaticFaces = useMemo(
    () => source
      ? extractAutomatic(
          source.geometry,
          adjacency,
          settings
        )
      : [],
    [source, adjacency, settings]
  );

  const finalFaces = useMemo(() => {
    const selected = new Set(
      automaticFaces
    );

    for (const [key, included] of Object.entries(
      edits
    )) {
      const face = Number(key);

      if (included) {
        selected.add(face);
      } else {
        selected.delete(face);
      }
    }

    return [...selected].sort(
      (a, b) => a - b
    );
  }, [automaticFaces, edits]);

  const statistics = useMemo<Statistics>(() => {
    const automaticSet = new Set(
      automaticFaces
    );

    const finalSet = new Set(finalFaces);

    let manuallyAdded = 0;
    let manuallyRemoved = 0;

    for (const face of finalSet) {
      if (!automaticSet.has(face)) {
        manuallyAdded++;
      }
    }

    for (const face of automaticSet) {
      if (!finalSet.has(face)) {
        manuallyRemoved++;
      }
    }

    return {
      automatic: automaticFaces.length,
      final: finalFaces.length,
      manuallyAdded,
      manuallyRemoved,
      frameSamplesIncluded:
        FRAME_FACES.filter(
          (face) => finalSet.has(face)
        ).length,
      seedSamplesIncluded:
        VISOR_SEEDS.filter(
          (face) => finalSet.has(face)
        ).length,
    };
  }, [automaticFaces, finalFaces]);

  useEffect(() => {
    onStatistics(statistics);
    onSelection(finalFaces);
  }, [
    statistics,
    finalFaces,
    onStatistics,
    onSelection,
  ]);

  // Only a visual overlay. Clicks pass through
  // to the original mesh so triangle IDs stay correct.
  const overlay = useMemo(() => {
    if (!source || finalFaces.length === 0) {
      return null;
    }

    const geometry = makeOverlayGeometry(
      source,
      finalFaces
    );

    const material = new MeshBasicMaterial({
      color: "#00E5FF",
      transparent: true,
      opacity: 0.62,
      side: DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });

    const mesh = new SkinnedMesh(
      geometry,
      material
    );

    mesh.name = "Visor Refinement Overlay";

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

    // Important: overlay must not intercept clicks.
    mesh.raycast = () => {};

    return mesh;
  }, [source, finalFaces]);

  useEffect(() => {
    if (!source || !overlay || !source.parent) {
      return;
    }

    const parent = source.parent;

    parent.add(overlay);

    return () => {
      parent.remove(overlay);
      overlay.geometry.dispose();

      const material = overlay.material;
      if (material instanceof Material) {
        material.dispose();
      }
    };
  }, [source, overlay]);

  useEffect(() => {
    if (overlay) {
      overlay.visible = highlight;
    }
  }, [overlay, highlight]);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!source) return;

      // Ignore any other model mesh.
      if (event.object !== source) return;

      const face = event.faceIndex;

      if (face == null) return;

      event.stopPropagation();

      onFaceClick(
        face,
        editMode === "add"
      );
    },
    [source, onFaceClick, editMode]
  );

  return (
    <group
      scale={framing.scale}
      onClick={handleClick}
    >
      <group position={framing.center}>
        <primitive object={model} />
      </group>
    </group>
  );
}

// ======================================================
// PAGE CONTROLS
// ======================================================

const SLIDERS = [
  {
    key: "padding",
    label: "Region Padding",
    min: 0,
    max: 0.2,
    step: 0.005,
  },
  {
    key: "normalAngle",
    label: "Normal Angle",
    min: 5,
    max: 90,
    step: 1,
  },
  {
    key: "frameGuard",
    label: "Frame Exclusion",
    min: 0,
    max: 0.15,
    step: 0.005,
  },
] as const;

export default function VisorSurfaceLab() {
  const [settings, setSettings] =
    useState<Settings>(DEFAULT_SETTINGS);

  const [edits, setEdits] =
    useState<Edits>({});

  const [undoHistory, setUndoHistory] =
    useState<Edits[]>([]);

  const [redoHistory, setRedoHistory] =
    useState<Edits[]>([]);

  const [editMode, setEditMode] =
    useState<EditMode>("remove");

  const [highlight, setHighlight] =
    useState(true);

  const [statistics, setStatistics] =
    useState<Statistics>(EMPTY_STATS);

  const [selectedFaces, setSelectedFaces] =
    useState<number[]>([]);

  const [lastClicked, setLastClicked] =
    useState<number | null>(null);

  const [message, setMessage] =
    useState("");

  const handleFaceClick = useCallback(
    (face: number, add: boolean) => {
      setEdits((previous) => {
        setUndoHistory((history) => [
          ...history,
          { ...previous },
        ]);

        return {
          ...previous,
          [face]: add,
        };
      });

      setRedoHistory([]);
      setLastClicked(face);
      setMessage(
        `Triangle ${face}: ${
          add ? "added" : "removed"
        }`
      );
    },
    []
  );

  const undo = () => {
    if (undoHistory.length === 0) return;

    const previous =
      undoHistory[undoHistory.length - 1];

    setRedoHistory((history) => [
      ...history,
      { ...edits },
    ]);

    setEdits(previous);

    setUndoHistory((history) =>
      history.slice(0, -1)
    );

    setMessage("Undid last edit");
  };

  const redo = () => {
    if (redoHistory.length === 0) return;

    const next =
      redoHistory[redoHistory.length - 1];

    setUndoHistory((history) => [
      ...history,
      { ...edits },
    ]);

    setEdits(next);

    setRedoHistory((history) =>
      history.slice(0, -1)
    );

    setMessage("Redid last edit");
  };

  const resetEdits = () => {
    setEdits({});
    setUndoHistory([]);
    setRedoHistory([]);
    setLastClicked(null);
    setMessage("Manual edits cleared");
  };

  const buildReport = () => ({
    version: "KitCart-Visor-Mask-V4",
    model: MODEL_URL,
    geometryVertices: 24961,
    geometryTriangles: 19776,
    visorSeeds: VISOR_SEEDS,
    frameExclusions: FRAME_FACES,
    settings,
    statistics,
    edits,
    selectedFaces,
  });

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(buildReport(), null, 2)
      );
      setMessage("Mask report copied");
    } catch {
      setMessage("Clipboard access failed");
    }
  };

  const exportJSON = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          buildReport(),
          null,
          2
        ),
      ],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download =
      "kitcart-visor-mask-v4.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    setMessage("JSON export requested");
  };

  return (
    <main className="min-h-screen bg-[#11142B] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A8A2FF]">
            KitCart Robot Development
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Visor Refinement Lab V4
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Manually refine the real curved visor
            surface. The robot is stationary.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="h-[650px] overflow-hidden rounded-3xl border border-white/10">
            <Canvas
              camera={{
                position: [0, 0, 4.2],
                fov: 35,
                near: 0.01,
                far: 100,
              }}
              dpr={[1, 1.75]}
            >
              <color
                attach="background"
                args={["#11142B"]}
              />

              <ambientLight intensity={1.8} />
              <hemisphereLight
                args={["#e8f4ff", "#7970a9", 2]}
              />
              <directionalLight
                position={[3, 4, 5]}
                intensity={3}
              />
              <directionalLight
                position={[-3, 2, -4]}
                intensity={2}
              />

              <Suspense fallback={null}>
                <Robot
                  settings={settings}
                  edits={edits}
                  editMode={editMode}
                  highlight={highlight}
                  onFaceClick={handleFaceClick}
                  onStatistics={setStatistics}
                  onSelection={setSelectedFaces}
                />
              </Suspense>

              <OrbitControls
                enablePan={false}
                enableDamping
                minDistance={0.8}
                maxDistance={8}
              />
            </Canvas>
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">
              Manual Editing
            </h2>

            <p className="mt-2 text-sm text-white/60">
              Select a tool, then click individual
              triangles on the robot.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditMode("remove")}
                aria-pressed={editMode === "remove"}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  editMode === "remove"
                    ? "border-red-300 bg-red-500/20"
                    : "border-white/20"
                }`}
              >
                Remove Triangle
              </button>

              <button
                type="button"
                onClick={() => setEditMode("add")}
                aria-pressed={editMode === "add"}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  editMode === "add"
                    ? "border-cyan-300 bg-cyan-400/20"
                    : "border-white/20"
                }`}
              >
                Add Triangle
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={undo}
                disabled={undoHistory.length === 0}
                className="rounded-xl border border-white/20 px-3 py-2 text-sm disabled:opacity-30"
              >
                Undo
              </button>

              <button
                type="button"
                onClick={redo}
                disabled={redoHistory.length === 0}
                className="rounded-xl border border-white/20 px-3 py-2 text-sm disabled:opacity-30"
              >
                Redo
              </button>

              <button
                type="button"
                onClick={resetEdits}
                className="rounded-xl border border-white/20 px-3 py-2 text-sm"
              >
                Reset Edits
              </button>
            </div>

            <div className="mt-5 border-t border-white/10 pt-5">
              <h3 className="font-semibold">
                Automatic Mask Settings
              </h3>

              <p className="mt-1 text-xs text-white/50">
                Your previous best values are
                loaded by default.
              </p>

              <div className="mt-4 space-y-5">
                {SLIDERS.map((slider) => (
                  <label
                    key={slider.key}
                    className="block"
                  >
                    <div className="mb-2 flex justify-between text-sm">
                      <span>{slider.label}</span>
                      <span className="font-mono text-cyan-200">
                        {settings[
                          slider.key
                        ].toFixed(
                          slider.key === "normalAngle"
                            ? 0
                            : 3
                        )}
                      </span>
                    </div>

                    <input
                      type="range"
                      min={slider.min}
                      max={slider.max}
                      step={slider.step}
                      value={settings[slider.key]}
                      onChange={(event) => {
                        setSettings((previous) => ({
                          ...previous,
                          [slider.key]:
                            Number(event.target.value),
                        }));
                      }}
                      className="w-full accent-cyan-300"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-2 rounded-xl bg-[#11142B] p-4 text-sm">
              <div className="flex justify-between">
                <span>Automatic selection</span>
                <strong>{statistics.automatic}</strong>
              </div>

              <div className="flex justify-between">
                <span>Final selection</span>
                <strong className="text-cyan-200">
                  {statistics.final}
                </strong>
              </div>

              <div className="flex justify-between">
                <span>Manually added</span>
                <strong>{statistics.manuallyAdded}</strong>
              </div>

              <div className="flex justify-between">
                <span>Manually removed</span>
                <strong>{statistics.manuallyRemoved}</strong>
              </div>

              <div className="flex justify-between">
                <span>Visor seeds included</span>
                <strong>
                  {statistics.seedSamplesIncluded}/5
                </strong>
              </div>

              <div className="flex justify-between">
                <span>White-frame samples included</span>
                <strong>
                  {statistics.frameSamplesIncluded}/4
                </strong>
              </div>

              <div className="flex justify-between">
                <span>Last clicked triangle</span>
                <strong>
                  {lastClicked ?? "None"}
                </strong>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setHighlight((value) => !value)
                }
                className="rounded-xl border border-white/20 px-4 py-2 text-sm"
              >
                Highlight: {highlight ? "ON" : "OFF"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettings(DEFAULT_SETTINGS)
                }
                className="rounded-xl border border-white/20 px-4 py-2 text-sm"
              >
                Reset Auto
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copyReport}
                className="rounded-xl border border-cyan-300/40 px-3 py-3 text-sm"
              >
                Copy Report
              </button>

              <button
                type="button"
                onClick={exportJSON}
                className="rounded-xl bg-[#6658D9] px-3 py-3 text-sm font-semibold"
              >
                Export JSON
              </button>
            </div>

            {message && (
              <p className="mt-3 text-xs text-cyan-200">
                {message}
              </p>
            )}
          </section>
        </div>

        <section className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-semibold">
            Refinement Instructions
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Zoom into the visor and use Remove Triangle
            to clean spikes and cyan areas overlapping
            the white frame. Use Add Triangle to fill
            missing sections of the black display.
            Drag to rotate the camera and inspect
            from multiple angles.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Export the final JSON before leaving this
            page. Manual edits are held in page memory,
            not permanently saved until exported.
          </p>
        </section>
      </div>
    </main>
  );
}

useGLTF.preload(MODEL_URL);

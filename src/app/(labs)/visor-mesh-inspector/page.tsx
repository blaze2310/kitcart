
"use client";

import {
  Suspense,
  useCallback,
  useMemo,
  useState,
} from "react";

import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

import {
  Box3,
  Color,
  Material,
  Mesh,
  Object3D,
  SkinnedMesh,
  Vector3,
} from "three";

// ============================================================
// KITCART VISOR MESH INSPECTOR
//
// Uses the verified compatible animated rig.
// The robot remains stationary.
//
// Diagnostic only:
// No GLB, materials, animations or login logic modified.
// ============================================================

const MODEL_URL =
  "/models/kitcart/animations/stay-in-place/idle.glb";

type Inspection = {
  meshName: string;
  meshUUID: string;
  parentName: string;
  isSkinned: boolean;
  materialName: string;
  materialUUID: string;
  materialType: string;
  materialColor: string;
  materialIndex: number;
  vertexCount: number;
  triangleCount: number;
  materialGroups: number;
  hasUV: boolean;
  faceIndex: number | null;
  boneCount: number;
};

function getMaterialColor(material: Material): string {
  const candidate = material as Material & {
    color?: Color;
  };

  if (candidate.color instanceof Color) {
    return "#" + candidate.color.getHexString();
  }

  return "Not available";
}

// ============================================================
// ROBOT MODEL
// ============================================================

function InspectableRobot({
  onInspect,
}: {
  onInspect: (result: Inspection) => void;
}) {
  const gltf = useGLTF(MODEL_URL);

  const model = useMemo(
    () => SkeletonUtils.clone(gltf.scene),
    [gltf.scene]
  );

  // Match the framing used in our working robot preview.
  const framing = useMemo(() => {
    model.updateMatrixWorld(true);

    const bounds = new Box3().setFromObject(model);

    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());

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

  // We deliberately do not run AnimationMixer.
  // This keeps the model completely stationary.

  const inspect = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();

      const object: Object3D = event.object;

      if (!(object instanceof Mesh)) {
        return;
      }

      const mesh = object;

      const geometry = mesh.geometry;

      const materials: Material[] = Array.isArray(
        mesh.material
      )
        ? mesh.material
        : [mesh.material];

      const requestedIndex =
        event.face?.materialIndex ?? 0;

      const material =
        materials[requestedIndex] ?? materials[0];

      if (!material) {
        return;
      }

      const positionAttribute =
        geometry.getAttribute("position");

      const vertexCount =
        positionAttribute?.count ?? 0;

      const triangleCount = geometry.index
        ? geometry.index.count / 3
        : vertexCount / 3;

      const isSkinned =
        mesh instanceof SkinnedMesh;

      const result: Inspection = {
        meshName: mesh.name || "(unnamed)",
        meshUUID: mesh.uuid,

        parentName:
          mesh.parent?.name || "(unnamed)",

        isSkinned,

        materialName:
          material.name || "(unnamed)",

        materialUUID: material.uuid,
        materialType: material.type,

        materialColor:
          getMaterialColor(material),

        materialIndex: requestedIndex,

        vertexCount,
        triangleCount,

        materialGroups:
          geometry.groups.length,

        hasUV: Boolean(
          geometry.getAttribute("uv")
        ),

        faceIndex: event.faceIndex ?? null,

        boneCount: isSkinned
          ? mesh.skeleton.bones.length
          : 0,
      };

      onInspect(result);
    },
    [onInspect]
  );

  return (
    <group
      scale={framing.scale}
      onClick={inspect}
    >
      <group position={framing.center}>
        <primitive object={model} />
      </group>
    </group>
  );
}

// ============================================================
// 3D VIEWER
// ============================================================

function RobotViewer({
  onInspect,
}: {
  onInspect: (result: Inspection) => void;
}) {
  return (
    <div className="h-[620px] overflow-hidden rounded-3xl border border-white/10">
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
          <InspectableRobot onInspect={onInspect} />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableDamping
          minDistance={1.1}
          maxDistance={8}
        />
      </Canvas>
    </div>
  );
}

// ============================================================
// FIELD DISPLAY
// ============================================================

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-b border-white/10 py-2">
      <p className="text-xs text-white/50">
        {label}
      </p>

      <p className="mt-1 break-all font-mono text-sm text-cyan-200">
        {String(value)}
      </p>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function VisorMeshInspectorPage() {
  const [selected, setSelected] =
    useState<Inspection | null>(null);

  const [history, setHistory] =
    useState<Inspection[]>([]);

  const handleInspect = useCallback(
    (result: Inspection) => {
      setSelected(result);

      setHistory((previous) => {
        const exists = previous.some(
          (item) =>
            item.meshUUID === result.meshUUID &&
            item.materialUUID === result.materialUUID
        );

        if (exists) {
          return previous;
        }

        return [...previous, result];
      });
    },
    []
  );

  const copyReport = async () => {
    const report = {
      selected,
      inspectedSurfaces: history,
    };

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(report, null, 2)
      );
    } catch (error) {
      console.error(
        "Failed to copy inspection report:",
        error
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#11142B] px-5 py-8 text-[#F7F8FC]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A8A2FF]">
            KitCart Robot Development
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Visor Mesh Inspector
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Click the robot to identify its real
            mesh geometry and material structure.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <RobotViewer onInspect={handleInspect} />

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">
              Selected Surface
            </h2>

            {selected === null ? (
              <p className="mt-4 text-sm leading-relaxed text-white/60">
                Click directly on the robot&apos;s
                black visor to inspect its geometry.
              </p>
            ) : (
              <div className="mt-4">
                <Field
                  label="Mesh Name"
                  value={selected.meshName}
                />

                <Field
                  label="Mesh UUID"
                  value={selected.meshUUID}
                />

                <Field
                  label="Parent"
                  value={selected.parentName}
                />

                <Field
                  label="Skinned Mesh"
                  value={selected.isSkinned ? "Yes" : "No"}
                />

                <Field
                  label="Material"
                  value={selected.materialName}
                />

                <Field
                  label="Material UUID"
                  value={selected.materialUUID}
                />

                <Field
                  label="Material Type"
                  value={selected.materialType}
                />

                <Field
                  label="Material Color"
                  value={selected.materialColor}
                />

                <Field
                  label="Material Slot"
                  value={selected.materialIndex}
                />

                <Field
                  label="Vertex Count"
                  value={selected.vertexCount}
                />

                <Field
                  label="Triangle Count"
                  value={selected.triangleCount}
                />

                <Field
                  label="Material Groups"
                  value={selected.materialGroups}
                />

                <Field
                  label="UV Coordinates"
                  value={selected.hasUV ? "Yes" : "No"}
                />

                <Field
                  label="Clicked Triangle"
                  value={selected.faceIndex ?? "N/A"}
                />

                <Field
                  label="Skeleton Bones"
                  value={selected.boneCount}
                />

                <button
                  type="button"
                  onClick={copyReport}
                  className="mt-5 w-full rounded-xl bg-[#6658D9] px-4 py-3 text-sm font-semibold"
                >
                  Copy Inspection Report
                </button>
              </div>
            )}
          </section>
        </div>

        <section className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">
            Inspected Surfaces ({history.length})
          </h2>

          <p className="mt-2 text-sm text-white/50">
            Each unique mesh and material combination
            appears once below.
          </p>

          <div className="mt-4 space-y-3">
            {history.map((item) => (
              <div
                key={
                  item.meshUUID +
                  "-" +
                  item.materialUUID
                }
                className="rounded-xl border border-white/10 bg-[#11142B] p-4"
              >
                <p className="font-semibold">
                  {item.meshName}
                </p>

                <p className="mt-2 break-all font-mono text-xs text-cyan-200">
                  {item.materialName}
                </p>

                <p className="mt-1 text-xs text-white/55">
                  {item.materialColor}
                  {" · "}
                  {item.isSkinned
                    ? "Skinned"
                    : "Static"}
                </p>
              </div>
            ))}
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={copyReport}
              className="mt-5 rounded-xl border border-white/20 px-4 py-2 text-sm"
            >
              Copy Full Inspection
            </button>
          )}
        </section>

        <p className="mt-5 text-sm text-white/45">
          Diagnostic mode only. The original GLB,
          animations, facial expressions and
          existing login interactions remain unchanged.
        </p>
      </div>
    </main>
  );
}

useGLTF.preload(MODEL_URL);

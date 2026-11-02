
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
  Mesh,
  Object3D,
  SkinnedMesh,
  Vector3,
} from "three";

const URL =
  "/models/kitcart/animations/stay-in-place/idle.glb";

type Sample = {
  label: string;
  meshName: string;
  faceIndex: number | null;
  uv: { u: number; v: number } | null;
  worldPosition: {
    x: number;
    y: number;
    z: number;
  };
  vertices: number[];
  materialName: string;
  textureName: string | null;
  textureSize: string | null;
};

const LABELS = [
  "Visor center",
  "Visor left",
  "Visor right",
  "Visor top",
  "Visor bottom",
  "White frame",
] as const;

function Robot({
  onHit,
}: {
  onHit: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const gltf = useGLTF(URL);

  const model = useMemo(
    () => SkeletonUtils.clone(gltf.scene),
    [gltf.scene]
  );

  const framing = useMemo(() => {
    model.updateMatrixWorld(true);

    const bounds = new Box3().setFromObject(model);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());

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

  return (
    <group scale={framing.scale} onClick={onHit}>
      <group position={framing.center}>
        <primitive object={model} />
      </group>
    </group>
  );
}

export default function VisorUVInspector() {
  const [label, setLabel] =
    useState<string>("Visor center");

  const [samples, setSamples] =
    useState<Sample[]>([]);

  const [copyMessage, setCopyMessage] = useState("");

  const handleHit = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();

      const object = event.object;

      if (!(object instanceof Mesh)) {
        return;
      }

      const geometry = object.geometry;
      const index = geometry.index;
      const faceIndex = event.faceIndex ?? null;

      const vertices: number[] = [];

      if (faceIndex !== null) {
        for (let i = 0; i < 3; i++) {
          const corner = faceIndex * 3 + i;

          vertices.push(
            index ? index.getX(corner) : corner
          );
        }
      }

      const material = Array.isArray(object.material)
        ? object.material[
            event.face?.materialIndex ?? 0
          ] ?? object.material[0]
        : object.material;

      const texturedMaterial = material as
        typeof material & {
          map?: {
            name: string;
            image?: {
              width?: number;
              height?: number;
            };
          } | null;
        };

      const texture = texturedMaterial.map;

      const sample: Sample = {
        label,
        meshName: object.name || "(unnamed)",
        faceIndex,
        uv: event.uv
          ? {
              u: Number(event.uv.x.toFixed(6)),
              v: Number(event.uv.y.toFixed(6)),
            }
          : null,
        worldPosition: {
          x: Number(event.point.x.toFixed(6)),
          y: Number(event.point.y.toFixed(6)),
          z: Number(event.point.z.toFixed(6)),
        },
        vertices,
        materialName:
          material?.name || "(unnamed)",
        textureName:
          texture?.name || (texture ? "(unnamed)" : null),
        textureSize: texture?.image
          ? `${texture.image.width ?? "?"} x ${
              texture.image.height ?? "?"
            }`
          : null,
      };

      setSamples((previous) => [...previous, sample]);
      setCopyMessage("");
    },
    [label]
  );

  const copySamples = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(samples, null, 2)
      );

      setCopyMessage("Copied");
    } catch {
      setCopyMessage("Copy failed");
    }
  };

  return (
    <main className="min-h-screen bg-[#11142B] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">
          KitCart — Visor UV Inspector
        </h1>

        <p className="mt-3 text-sm text-white/60">
          Select a region, then click it on the stationary
          robot. Rotate and zoom the camera as needed.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="h-[650px] overflow-hidden rounded-3xl border border-white/10">
            <Canvas
              camera={{
                position: [0, 0, 4.2],
                fov: 35,
                near: 0.01,
                far: 100,
              }}
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
                <Robot onHit={handleHit} />
              </Suspense>

              <OrbitControls
                enablePan={false}
                enableDamping
                minDistance={1}
                maxDistance={8}
              />
            </Canvas>
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">
              Sampling Controls
            </h2>

            <p className="mt-2 text-sm text-white/60">
              Choose the location you are about to
              click.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {LABELS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLabel(item)}
                  aria-pressed={label === item}
                  className={`rounded-xl border p-3 text-left text-xs ${
                    label === item
                      ? "border-cyan-300 bg-cyan-400/15 text-cyan-200"
                      : "border-white/15 bg-white/5 text-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <p className="mt-5 text-sm">
              Current selection:{" "}
              <strong className="text-cyan-200">
                {label}
              </strong>
            </p>

            <p className="mt-2 text-sm text-white/60">
              Samples collected: {samples.length}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copySamples}
                disabled={samples.length === 0}
                className="rounded-xl bg-[#6658D9] px-4 py-3 text-sm font-semibold disabled:opacity-40"
              >
                Copy All Samples
              </button>

              <button
                type="button"
                onClick={() => {
                  setSamples((previous) =>
                    previous.slice(0, -1)
                  );
                  setCopyMessage("");
                }}
                className="rounded-xl border border-white/20 px-4 py-3 text-sm"
              >
                Undo Last
              </button>

              <button
                type="button"
                onClick={() => {
                  setSamples([]);
                  setCopyMessage("");
                }}
                className="rounded-xl border border-white/20 px-4 py-3 text-sm"
              >
                Clear
              </button>
            </div>

            {copyMessage && (
              <p className="mt-3 text-sm text-cyan-200">
                {copyMessage}
              </p>
            )}

            <div className="mt-5 max-h-[400px] space-y-3 overflow-y-auto">
              {samples.map((sample, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-[#11142B] p-3"
                >
                  <p className="text-sm font-semibold">
                    {index + 1}. {sample.label}
                  </p>

                  <p className="mt-2 font-mono text-xs text-cyan-200">
                    Triangle: {sample.faceIndex ?? "N/A"}
                  </p>

                  <p className="mt-1 font-mono text-xs text-cyan-200">
                    UV:{" "}
                    {sample.uv
                      ? `${sample.uv.u}, ${sample.uv.v}`
                      : "Unavailable"}
                  </p>

                  <p className="mt-1 font-mono text-xs text-white/55">
                    World:{" "}
                    {Object.values(
                      sample.worldPosition
                    ).join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-semibold">
            Complete Inspection Data
          </h2>

          <pre className="mt-3 max-h-[350px] overflow-auto rounded-xl bg-[#090C1A] p-4 text-xs text-cyan-200">
            {JSON.stringify(samples, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}

useGLTF.preload(URL);

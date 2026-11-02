
"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import {
  Box3,
  BufferGeometry,
  CanvasTexture,
  ClampToEdgeWrapping,
  DoubleSide,
  Float32BufferAttribute,
  Material,
  MeshBasicMaterial,
  Object3D,
  SkinnedMesh,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import {
  ALL_VISOR_EXPRESSIONS,
  type Expression,
} from "@/features/robot/2d/robot-face";

const MODEL_URL =
  "/models/kitcart/animations/stay-in-place/idle.glb";

const MASK_URL =
  "/mascot/kitcart-visor-mask-v4.json";

type MaskData = {
  version: string;
  geometryVertices: number;
  geometryTriangles: number;
  selectedFaces: number[];
};

type FaceSettings = {
  width: number;
  gap: number;
};

type SettingsMap = Record<Expression, FaceSettings>;

function initialSettings(): SettingsMap {
  const settings = {} as SettingsMap;

  for (const expression of ALL_VISOR_EXPRESSIONS) {
    settings[expression] = {
      width: 0.88,
      gap: expression === "happy" ? 18 : 0,
    };
  }

  return settings;
}

const INITIAL = initialSettings();

function findRobotMesh(
  model: Object3D
): SkinnedMesh | null {
  const meshes: SkinnedMesh[] = [];

  model.traverse((object) => {
    if (object instanceof SkinnedMesh) {
      meshes.push(object);
    }
  });

  return (
    meshes.find(
      (mesh) =>
        mesh.geometry.getAttribute("position")
          ?.count === 24961
    ) ?? null
  );
}

function createFaceTexture(
  expression: Expression,
  mouthGap: number
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 648;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context unavailable");
  }

  const ctx: CanvasRenderingContext2D = context;

  ctx.clearRect(0, 0, 1024, 648);
  ctx.setTransform(2, 0, 0, 2, -610, -468);

  function stroke(path: string, width = 29) {
    const shape = new Path2D(path);

    ctx.save();
    ctx.strokeStyle = "#00BFFF";
    ctx.lineWidth = width + 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "#00BFFF";
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.35;
    ctx.stroke(shape);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "#8FEFFF";
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(shape);
    ctx.restore();
  }

  function ring(x: number, y: number) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, 35, 45, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "#00BFFF";
    ctx.lineWidth = 32;
    ctx.globalAlpha = 0.25;
    ctx.shadowColor = "#00BFFF";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, 35, 45, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "#8FEFFF";
    ctx.lineWidth = 29;
    ctx.stroke();
    ctx.restore();
  }

  function heart(
    x: number,
    y: number,
    color: string
  ) {
    const shape = new Path2D(
      "M 0 35 C -9 27 -48 4 -48 -21 " +
      "C -48 -46 -18 -53 0 -29 " +
      "C 18 -53 48 -46 48 -21 " +
      "C 48 4 9 27 0 35 Z"
    );

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 11;
    ctx.fill(shape);
    ctx.restore();
  }

  function blush(x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#FFC1DD";
    ctx.shadowColor = "#FF8BC3";
    ctx.shadowBlur = 8;

    for (const path of [
      "M -28 12 L -20 -12",
      "M -4 12 L 4 -12",
      "M 20 12 L 28 -12",
    ]) {
      ctx.stroke(new Path2D(path));
    }

    ctx.restore();
  }

  const normalLeft =
    "M 368 419 C 368 342, 491 342, 491 419";
  const normalRight =
    "M 630 419 C 630 342, 753 342, 753 419";

  switch (expression) {
    case "normal":
      stroke(normalLeft);
      stroke(normalRight);
      break;

    case "happy":
      stroke("M 365 425 Q 430 355 495 425");
      stroke("M 627 425 Q 692 355 757 425");
      break;

    case "surprised":
    case "thinking":
      ring(430, 394);
      ring(690, 394);
      break;

    case "confused":
      stroke("M 372 410 Q 430 388 488 412");
      ring(690, 392);
      break;

    case "wink":
      stroke(normalLeft);
      stroke("M 635 404 Q 690 416 745 404");
      break;

    case "loved":
      heart(430, 390, "#FF80BB");
      heart(690, 390, "#8FEFFF");
      blush(355, 470);
      blush(765, 470);
      break;

    case "sad":
      stroke("M 368 392 Q 430 449 492 392");
      stroke("M 628 392 Q 690 449 752 392");
      break;

    case "sleepy":
      stroke("M 368 399 Q 430 415 492 399", 20);
      stroke("M 628 399 Q 690 415 752 399", 20);
      break;

    case "curious":
      stroke("M 368 422 C 367 326, 492 326, 492 422");
      ring(690, 394);
      break;

    case "eyes-closed":
      stroke("M 368 400 Q 430 434 492 400", 22);
      stroke("M 628 400 Q 690 434 752 400", 22);
      break;

    case "focused":
      stroke("M 372 394 Q 430 374 488 394", 24);
      stroke("M 632 394 Q 690 374 748 394", 24);
      break;
  }

  const mouths: Record<
    Exclude<Expression, "surprised">,
    string
  > = {
    normal: "M 518 475 Q 560 507 603 475",
    happy: "M 505 468 Q 560 535 615 468",
    thinking: "M 530 486 Q 560 480 590 486",
    confused:
      "M 520 486 Q 545 474 565 486 Q 585 497 607 483",
    wink: "M 515 475 Q 565 525 610 465",
    loved: "M 525 478 Q 560 510 595 478",
    sad: "M 518 499 Q 560 461 603 499",
    sleepy: "M 535 484 Q 560 490 585 484",
    curious: "M 532 484 Q 560 501 588 484",
    "eyes-closed":
      "M 521 474 Q 560 505 599 474",
    focused: "M 531 485 Q 560 491 589 485",
  };

  // Positive gap moves the mouth DOWN.
  // Eyes and visor geometry stay unchanged.
  ctx.save();
  ctx.translate(0, mouthGap);

  if (expression === "surprised") {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      560, 485, 38, 25, 0, 0, Math.PI * 2
    );
    ctx.strokeStyle = "#00BFFF";
    ctx.lineWidth = 13;
    ctx.shadowColor = "#00BFFF";
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.35;
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(
      560, 485, 38, 25, 0, 0, Math.PI * 2
    );
    ctx.strokeStyle = "#8FEFFF";
    ctx.lineWidth = 10;
    ctx.stroke();
  } else {
    stroke(mouths[expression], 10);
  }

  ctx.restore();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return texture;
}

function createSurfaceGeometry(
  source: SkinnedMesh,
  selectedFaces: number[],
  width: number
): BufferGeometry {
  const original = source.geometry;
  const position = original.getAttribute("position");
  const normal = original.getAttribute("normal");
  const skinIndex = original.getAttribute("skinIndex");
  const skinWeight = original.getAttribute("skinWeight");

  if (!position || !skinIndex || !skinWeight) {
    throw new Error("Required skinned attributes missing");
  }

  const totalFaces = Math.floor(
    (original.index
      ? original.index.count
      : position.count) / 3
  );

  const faces = [...new Set(selectedFaces)].filter(
    (face) =>
      Number.isInteger(face) &&
      face >= 0 &&
      face < totalFaces
  );

  if (faces.length !== 444) {
    throw new Error("Expected the approved 444-face mask");
  }

  const coordinates: number[] = [];
  const normals: number[] = [];
  const jointIndices: number[] = [];
  const jointWeights: number[] = [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const face of faces) {
    for (let corner = 0; corner < 3; corner++) {
      const offset = face * 3 + corner;
      const i = original.index
        ? original.index.getX(offset)
        : offset;

      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);

      coordinates.push(x, y, z);

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      if (normal) {
        normals.push(
          normal.getX(i),
          normal.getY(i),
          normal.getZ(i)
        );
      }

      for (let j = 0; j < 4; j++) {
        jointIndices.push(
          skinIndex.getComponent(i, j)
        );
        jointWeights.push(
          skinWeight.getComponent(i, j)
        );
      }
    }
  }

  const xSpan = Math.max(maxX - minX, 0.00001);
  const ySpan = Math.max(maxY - minY, 0.00001);
  const uvs: number[] = [];

  for (let i = 0; i < coordinates.length; i += 3) {
    const originalU =
      (coordinates[i] - minX) / xSpan;
    const originalV =
      (coordinates[i + 1] - minY) / ySpan;

    const adjustedU =
      0.5 + (originalU - 0.5) / width;

    uvs.push(adjustedU, originalV);
  }

  const geometry = new BufferGeometry();

  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(coordinates, 3)
  );
  geometry.setAttribute(
    "skinIndex",
    new Uint16BufferAttribute(jointIndices, 4)
  );
  geometry.setAttribute(
    "skinWeight",
    new Float32BufferAttribute(jointWeights, 4)
  );
  geometry.setAttribute(
    "uv",
    new Float32BufferAttribute(uvs, 2)
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

function RobotWithFace({
  mask,
  expression,
  settings,
  visible,
  opacity,
}: {
  mask: MaskData;
  expression: Expression;
  settings: FaceSettings;
  visible: boolean;
  opacity: number;
}) {
  const gltf = useGLTF(MODEL_URL);

  const model = useMemo(
    () => SkeletonUtils.clone(gltf.scene),
    [gltf.scene]
  );

  const source = useMemo(
    () => findRobotMesh(model),
    [model]
  );

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

  const geometry = useMemo(
    () =>
      source
        ? createSurfaceGeometry(
            source,
            mask.selectedFaces,
            settings.width
          )
        : null,
    [source, mask, settings.width]
  );

  const texture = useMemo(
    () => createFaceTexture(expression, settings.gap),
    [expression, settings.gap]
  );

  const overlay = useMemo(() => {
    if (!source || !geometry) return null;

    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      alphaTest: 0.02,
      side: DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });

    const mesh = new SkinnedMesh(geometry, material);
    mesh.name = `KitCart Face — ${expression}`;

    mesh.position.copy(source.position);
    mesh.quaternion.copy(source.quaternion);
    mesh.scale.copy(source.scale);
    mesh.bindMode = source.bindMode;
    mesh.bind(source.skeleton, source.bindMatrix);
    mesh.frustumCulled = false;
    mesh.renderOrder = 3;

    return mesh;
  }, [source, geometry, texture, expression]);

  useEffect(() => {
    if (!source || !overlay || !source.parent) return;

    const parent = source.parent;
    parent.add(overlay);

    return () => {
      parent.remove(overlay);
      overlay.geometry.dispose();
      (overlay.material as Material).dispose();
    };
  }, [source, overlay]);

  useEffect(() => {
    overlay?.material &&
      ((overlay.material as MeshBasicMaterial).opacity =
        opacity);

    if (overlay) overlay.visible = visible;
  }, [overlay, opacity, visible]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  return (
    <group scale={framing.scale}>
      <group position={framing.center}>
        <primitive object={model} />
      </group>
    </group>
  );
}

export default function VisorExpression3DPage() {
  const [mask, setMask] = useState<MaskData | null>(
    null
  );
  const [error, setError] = useState("");
  const [expression, setExpression] =
    useState<Expression>("normal");
  const [settings, setSettings] =
    useState<SettingsMap>(() => initialSettings());
  const [visible, setVisible] = useState(true);
  const [opacity, setOpacity] = useState(1);
  const [message, setMessage] = useState("");

  const current = settings[expression];

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(MASK_URL, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Mask HTTP ${response.status}`
          );
        }

        const data: MaskData = await response.json();

        if (
          data.version !== "KitCart-Visor-Mask-V4" ||
          data.geometryVertices !== 24961 ||
          data.geometryTriangles !== 19776 ||
          !Array.isArray(data.selectedFaces) ||
          new Set(data.selectedFaces).size !== 444
        ) {
          throw new Error("Unexpected V4 mask data");
        }

        setMask(data);
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Mask loading failed"
          );
        }
      }
    }

    load();

    return () => controller.abort();
  }, []);

  function updateCurrent(
    key: keyof FaceSettings,
    value: number
  ) {
    setSettings((previous) => ({
      ...previous,
      [expression]: {
        ...previous[expression],
        [key]: value,
      },
    }));
    setMessage("");
  }

  async function copySettings() {
    const report = {
      version: "KitCart-Visor-Expression-Calibration-V2",
      visorMask: "KitCart-Visor-Mask-V4",
      expressions: settings,
      opacity,
    };

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(report, null, 2)
      );
      setMessage("Calibration copied");
    } catch {
      setMessage("Clipboard unavailable");
    }
  }

  function exportJSON() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version:
              "KitCart-Visor-Expression-Calibration-V2",
            visorMask: "KitCart-Visor-Mask-V4",
            expressions: settings,
            opacity,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "kitcart-visor-expression-calibration-v2.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#11142B] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">
          KitCart — 12 Expression Calibration
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Independent width and eye–mouth spacing for
          every expression. Robot stationary.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
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
                {mask && (
                  <RobotWithFace
                    mask={mask}
                    expression={expression}
                    settings={current}
                    visible={visible}
                    opacity={opacity}
                  />
                )}
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
              Expression Controls
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {ALL_VISOR_EXPRESSIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={expression === item}
                  onClick={() => setExpression(item)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm capitalize ${
                    expression === item
                      ? "border-cyan-300 bg-[#6658D9]"
                      : "border-white/15 bg-[#11142B]"
                  }`}
                >
                  {item.replace("-", " ")}
                  <span className="mt-1 block text-xs text-white/60">
                    {Math.round(settings[item].width * 100)}%
                    {" · "}
                    Gap {settings[item].gap}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-6 border-t border-white/10 pt-5">
              <label className="block">
                <span className="mb-2 flex justify-between text-sm">
                  <span>Face Width</span>
                  <strong className="text-cyan-200">
                    {Math.round(current.width * 100)}%
                  </strong>
                </span>
                <input
                  type="range"
                  min="0.55"
                  max="1.15"
                  step="0.01"
                  value={current.width}
                  onChange={(event) =>
                    updateCurrent(
                      "width",
                      Number(event.target.value)
                    )
                  }
                  className="w-full accent-cyan-300"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex justify-between text-sm">
                  <span>Eye–Mouth Gap</span>
                  <strong className="text-cyan-200">
                    {current.gap > 0 ? "+" : ""}
                    {current.gap}
                  </strong>
                </span>
                <input
                  type="range"
                  min="-30"
                  max="45"
                  step="1"
                  value={current.gap}
                  onChange={(event) =>
                    updateCurrent(
                      "gap",
                      Number(event.target.value)
                    )
                  }
                  className="w-full accent-cyan-300"
                />
                <p className="mt-2 text-xs text-white/50">
                  Positive values move the mouth downward.
                  Eyes and visor surface remain unchanged.
                </p>
              </label>

              <div className="flex flex-wrap gap-2">
                {[0, 10, 18, 22, 30].map((gap) => (
                  <button
                    key={gap}
                    type="button"
                    onClick={() => updateCurrent("gap", gap)}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      current.gap === gap
                        ? "border-cyan-300 bg-cyan-300/15"
                        : "border-white/20"
                    }`}
                  >
                    +{gap}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="w-full rounded-xl border border-cyan-300/40 px-4 py-3 text-sm"
              >
                Facial Display: {visible ? "ON" : "OFF"}
              </button>

              <label className="block">
                <span className="mb-2 flex justify-between text-sm">
                  <span>Opacity</span>
                  <strong>{opacity.toFixed(2)}</strong>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(event) =>
                    setOpacity(Number(event.target.value))
                  }
                  className="w-full accent-cyan-300"
                />
              </label>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copySettings}
                className="rounded-xl border border-cyan-300/40 px-3 py-3 text-sm"
              >
                Copy Settings
              </button>
              <button
                type="button"
                onClick={exportJSON}
                className="rounded-xl bg-[#6658D9] px-3 py-3 text-sm font-semibold"
              >
                Export JSON
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSettings(initialSettings());
                setMessage("");
              }}
              className="mt-3 w-full rounded-xl border border-white/20 px-3 py-2 text-sm"
            >
              Reset All Calibration
            </button>

            {message && (
              <p className="mt-3 text-xs text-cyan-200">
                {message}
              </p>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-300">
                {error}
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

useGLTF.preload(MODEL_URL);

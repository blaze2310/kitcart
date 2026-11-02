
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Bone,
  Box3,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  LoopRepeat,
  MathUtils,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  SkinnedMesh,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import {
  ALL_VISOR_EXPRESSIONS,
  type Expression,
} from "@/features/robot/2d/robot-face";

// KitCart — synchronized action / expression test.
// This file does not change the existing login page.

const BASE = "/models/kitcart/animations/stay-in-place/";
const MODEL = BASE + "idle.glb";
const MASK = "/mascot/kitcart-visor-mask-v4.json";
const INACTIVITY_MS = 5000;
const CROSSFADE_SECONDS = 0.12;

const CLIPS = [
  { id: "idle", label: "Idle", file: "idle.glb", face: "normal" },
  { id: "looking", label: "Looking Around", file: "looking+around.glb", face: "curious" },
  { id: "wave", label: "Greeting Wave", file: "greet+wave+sup.glb", face: "happy" },
  { id: "wave2", label: "Greeting Wave 2", file: "greet+wave+sup+2.glb", face: "happy" },
  { id: "clapping", label: "Clapping", file: "clapping.glb", face: "happy" },
  { id: "stretch", label: "Stretch", file: "stretch.glb", face: "eyes-closed" },
  { id: "peek", label: "Password Sneak", file: "password+sneak+2.glb", face: "focused" },
  { id: "head", label: "Sneaky Head", file: "sneaky+head+for+password.glb", face: "curious" },
  { id: "lean", label: "Side Lean", file: "side+lean+pose.glb", face: "confused" },
  { id: "turn", label: "Turn", file: "turn.glb", face: "surprised" },
  { id: "sad", label: "Sad Animation", file: "sad.glb", face: "sad" },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  file: string;
  face: Expression;
}>;

type ClipId = (typeof CLIPS)[number]["id"];
type Request = { id: ClipId; serial: number };

type MaskData = {
  version: string;
  geometryVertices: number;
  geometryTriangles: number;
  selectedFaces: number[];
};

type Diagnostics = {
  clip: string;
  duration: number;
  tracks: number;
  headFound: boolean;
  sharedSkeleton: boolean;
};

const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

function findMesh(model: Object3D): SkinnedMesh | null {
  const meshes: SkinnedMesh[] = [];
  model.traverse((object) => {
    if (
      object instanceof SkinnedMesh &&
      object.geometry.getAttribute("position")?.count === 24961
    ) {
      meshes.push(object);
    }
  });
  return meshes[0] ?? null;
}

function findHead(mesh: SkinnedMesh | null): Bone | null {
  if (!mesh) return null;
  return mesh.skeleton.bones.find((bone) => {
    const name = bone.name.replace(/[^a-z0-9]/gi, "").toLowerCase();
    return name === "mixamorighead" || name === "head";
  }) ?? null;
}

// ==========================================================
// APPROVED 12-EXPRESSION CANVAS RENDERER
// ==========================================================

function makeFace(
  expression: Expression,
  gap: number,
  blinking: boolean
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 648;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas context unavailable");

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

  function heart(x: number, y: number, color: string) {
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
    ctx.strokeStyle = "#FFC1DD";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.shadowColor = "#FF8BC3";
    ctx.shadowBlur = 8;
    [
      "M -28 12 L -20 -12",
      "M -4 12 L 4 -12",
      "M 20 12 L 28 -12",
    ].forEach((path) => ctx.stroke(new Path2D(path)));
    ctx.restore();
  }

  const left = "M 368 419 C 368 342, 491 342, 491 419";
  const right = "M 630 419 C 630 342, 753 342, 753 419";

  const naturallyClosed =
    expression === "sleepy" || expression === "eyes-closed";

  ctx.save();
  if (blinking && !naturallyClosed) {
    ctx.translate(0, 390);
    ctx.scale(1, 0.04);
    ctx.translate(0, -390);
  }

  switch (expression) {
    case "normal":
      stroke(left);
      stroke(right);
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
      stroke(left);
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
  ctx.restore();

  const mouths: Record<Exclude<Expression, "surprised">, string> = {
    normal: "M 518 475 Q 560 507 603 475",
    happy: "M 505 468 Q 560 535 615 468",
    thinking: "M 530 486 Q 560 480 590 486",
    confused: "M 520 486 Q 545 474 565 486 Q 585 497 607 483",
    wink: "M 515 475 Q 565 525 610 465",
    loved: "M 525 478 Q 560 510 595 478",
    sad: "M 518 499 Q 560 461 603 499",
    sleepy: "M 535 484 Q 560 490 585 484",
    curious: "M 532 484 Q 560 501 588 484",
    "eyes-closed": "M 521 474 Q 560 505 599 474",
    focused: "M 531 485 Q 560 491 589 485",
  };

  ctx.save();
  ctx.translate(0, gap);

  if (expression === "surprised") {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(560, 485, 38, 25, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "#00BFFF";
    ctx.lineWidth = 13;
    ctx.shadowColor = "#00BFFF";
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.35;
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(560, 485, 38, 25, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "#8FEFFF";
    ctx.lineWidth = 10;
    ctx.stroke();
  } else {
    stroke(mouths[expression], 10);
  }

  ctx.restore();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// ==========================================================
// APPROVED V4 SKINNED VISOR SURFACE
// ==========================================================

function makeVisorGeometry(
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
    throw new Error("Skinned geometry attributes missing");
  }

  const totalFaces = Math.floor(
    (original.index ? original.index.count : position.count) / 3
  );

  const faces = [...new Set(selectedFaces)].filter(
    (face) =>
      Number.isInteger(face) &&
      face >= 0 &&
      face < totalFaces
  );

  if (faces.length !== 444) {
    throw new Error("Expected approved 444-face visor mask");
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
        joints.push(skinIndex.getComponent(index, j));
        weights.push(skinWeight.getComponent(index, j));
      }
    }
  }

  const spanX = Math.max(maxX - minX, 0.00001);
  const spanY = Math.max(maxY - minY, 0.00001);
  const uv: number[] = [];

  for (let i = 0; i < xyz.length; i += 3) {
    const u = (xyz[i] - minX) / spanX;
    const v = (xyz[i + 1] - minY) / spanY;
    uv.push(0.5 + (u - 0.5) / width, v);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(xyz, 3));
  geometry.setAttribute("skinIndex", new Uint16BufferAttribute(joints, 4));
  geometry.setAttribute("skinWeight", new Float32BufferAttribute(weights, 4));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));

  if (normal) {
    geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  } else {
    geometry.computeVertexNormals();
  }

  geometry.computeBoundingSphere();
  return geometry;
}

// ==========================================================
// ANIMATION LOADING
// ==========================================================

function ClipSource({
  url,
  onReady,
}: {
  url: string;
  onReady: (clip: AnimationClip, url: string) => void;
}) {
  const gltf = useGLTF(url);

  useEffect(() => {
    const clip = gltf.animations[0];
    if (clip) onReady(clip, url);
  }, [gltf, url, onReady]);

  return null;
}

// ==========================================================
// ROBOT WITH SYNCHRONIZED ACTION START
// ==========================================================

function Robot({
  mask,
  request,
  expression,
  blinking,
  playing,
  speed,
  tracking,
  showFace,
  onDiagnostics,
  onActionStarted,
}: {
  mask: MaskData;
  request: Request;
  expression: Expression;
  blinking: boolean;
  playing: boolean;
  speed: number;
  tracking: boolean;
  showFace: boolean;
  onDiagnostics: (data: Diagnostics) => void;
  onActionStarted: (id: ClipId, face: Expression) => void;
}) {
  const gltf = useGLTF(MODEL);

  const model = useMemo(
    () => SkeletonUtils.clone(gltf.scene),
    [gltf.scene]
  );

  const source = useMemo(() => findMesh(model), [model]);
  const head = useMemo(() => findHead(source), [source]);
  const mixer = useMemo(() => new AnimationMixer(model), [model]);

  const actionRef = useRef<AnimationAction | null>(null);
  const overlayRef = useRef<SkinnedMesh | null>(null);

  const definition = CLIPS.find((item) => item.id === request.id)!;
  const url = BASE + definition.file;

  const framing = useMemo(() => {
    model.updateMatrixWorld(true);

    const bounds = new Box3().setFromObject(model);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());

    return {
      scale: 2.3 / Math.max(size.x, size.y, size.z, 0.001),
      center: [-center.x, -center.y, -center.z] as [
        number,
        number,
        number
      ],
    };
  }, [model]);

  // Facial mesh stays persistent while the texture changes.
  const geometry = useMemo(
    () =>
      source
        ? makeVisorGeometry(source, mask.selectedFaces, 0.88)
        : null,
    [source, mask]
  );

  const texture = useMemo(
    () =>
      makeFace(
        expression,
        expression === "happy" ? 18 : 0,
        blinking
      ),
    [expression, blinking]
  );

  const overlay = useMemo(() => {
    if (!source || !geometry) return null;

    const material = new MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.02,
      side: DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });

    const mesh = new SkinnedMesh(geometry, material);
    mesh.name = "KitCart Synchronized Visor";

    mesh.position.copy(source.position);
    mesh.quaternion.copy(source.quaternion);
    mesh.scale.copy(source.scale);
    mesh.bindMode = source.bindMode;
    mesh.bind(source.skeleton, source.bindMatrix);

    mesh.frustumCulled = false;
    mesh.renderOrder = 3;
    return mesh;
  }, [source, geometry]);

  useEffect(() => {
    overlayRef.current = overlay;
    if (!overlay || !source?.parent) return;

    const parent = source.parent;
    parent.add(overlay);

    return () => {
      parent.remove(overlay);
      if (overlayRef.current === overlay) {
        overlayRef.current = null;
      }
      overlay.geometry.dispose();
      if (overlay.material instanceof MeshBasicMaterial) {
        overlay.material.dispose();
      }
    };
  }, [source, overlay]);

  useEffect(() => {
    if (overlay && overlay.material instanceof MeshBasicMaterial) {
      overlay.material.map = texture;
      overlay.material.needsUpdate = true;
    }
  }, [overlay, texture]);

  useEffect(() => {
    if (overlay) overlay.visible = showFace;
  }, [overlay, showFace]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  // Idle mouse tracking with 5-second inactivity reset.
  const pointer = useRef({ x: 0, y: 0 });
  const gaze = useRef({ x: 0, y: 0 });
  const previousPointer = useRef<{ x: number; y: number } | null>(null);
  const lastMovement = useRef(0);

  const yaw = useMemo(() => new Quaternion(), []);
  const pitch = useMemo(() => new Quaternion(), []);
  const correction = useMemo(() => new Quaternion(), []);
  const previousCorrection = useMemo(() => new Quaternion(), []);
  const inverseCorrection = useMemo(() => new Quaternion(), []);

  useEffect(() => {
    const handlePointer = (event: PointerEvent) => {
      const previous = previousPointer.current;

      if (
        previous &&
        Math.hypot(
          event.clientX - previous.x,
          event.clientY - previous.y
        ) < 2
      ) {
        return;
      }

      previousPointer.current = {
        x: event.clientX,
        y: event.clientY,
      };

      pointer.current.x = MathUtils.clamp(
        (event.clientX / window.innerWidth) * 2 - 1,
        -1,
        1
      );
      pointer.current.y = MathUtils.clamp(
        1 - (event.clientY / window.innerHeight) * 2,
        -1,
        1
      );
      lastMovement.current = performance.now();
    };

    window.addEventListener("pointermove", handlePointer);
    return () => window.removeEventListener("pointermove", handlePointer);
  }, []);

  // This callback changes only when the requested body action changes.
  // It does not depend on expression, blinking, or texture.
  const activateClip = useCallback(
    (clip: AnimationClip, selectedUrl: string) => {
      if (selectedUrl !== url) return;

      const previous = actionRef.current;
      const next = mixer.clipAction(clip);

      next.reset();
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.setEffectiveTimeScale(1);
      next.setLoop(LoopRepeat, Infinity);
      next.clampWhenFinished = false;
      next.play();

      if (previous && previous !== next) {
        next.crossFadeFrom(
          previous,
          CROSSFADE_SECONDS,
          false
        );
      }

      actionRef.current = next;

      // The expression is selected when the animation is activated,
      // NOT when its button is clicked.
      onActionStarted(request.id, definition.face);

      const visor = overlayRef.current;

      onDiagnostics({
        clip: definition.label,
        duration: clip.duration,
        tracks: clip.tracks.length,
        headFound: head !== null,
        sharedSkeleton:
          visor !== null &&
          source !== null &&
          visor.skeleton === source.skeleton,
      });
    },
    [
      mixer,
      url,
      request.id,
      request.serial,
      definition.label,
      definition.face,
      head,
      source,
      onDiagnostics,
      onActionStarted,
    ]
  );

  useEffect(() => {
    return () => {
      mixer.stopAllAction();
    };
  }, [mixer]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    // Remove the previous procedural head rotation.
    if (head) {
      inverseCorrection.copy(previousCorrection).invert();
      head.quaternion.multiply(inverseCorrection);
    }

    mixer.update(playing ? dt * speed : 0);

    const mouseActive =
      lastMovement.current > 0 &&
      performance.now() - lastMovement.current < INACTIVITY_MS;

    const shouldFollow =
      tracking && request.id === "idle" && mouseActive;

    const alpha = 1 - Math.exp(-7 * dt);

    gaze.current.x = MathUtils.lerp(
      gaze.current.x,
      shouldFollow ? pointer.current.x : 0,
      alpha
    );

    gaze.current.y = MathUtils.lerp(
      gaze.current.y,
      shouldFollow ? pointer.current.y : 0,
      alpha
    );

    if (!head) return;

    yaw.setFromAxisAngle(
      Y_AXIS,
      MathUtils.degToRad(30 * gaze.current.x)
    );
    pitch.setFromAxisAngle(
      Z_AXIS,
      MathUtils.degToRad(18 * gaze.current.y)
    );

    correction.copy(yaw).multiply(pitch);
    head.quaternion.multiply(correction);
    previousCorrection.copy(correction);
  });

  return (
    <>
      <group scale={framing.scale}>
        <group position={framing.center}>
          <primitive object={model} />
        </group>
      </group>

      <Suspense fallback={null}>
        <ClipSource
          key={`${url}-${request.serial}`}
          url={url}
          onReady={activateClip}
        />
      </Suspense>
    </>
  );
}

// ==========================================================
// TEST PAGE
// ==========================================================

export default function VisorAnimationTestPage() {
  const [mask, setMask] = useState<MaskData | null>(null);
  const [error, setError] = useState("");
  const [request, setRequest] = useState<Request>({
    id: "idle",
    serial: 0,
  });

  const [expression, setExpression] =
    useState<Expression>("normal");

  const [manualOverride, setManualOverride] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [tracking, setTracking] = useState(true);
  const [showFace, setShowFace] = useState(true);
  const [autoBlink, setAutoBlink] = useState(true);
  const [blinking, setBlinking] = useState(false);
  const [diagnostics, setDiagnostics] =
    useState<Diagnostics | null>(null);

  const blinkTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadMask() {
      try {
        const response = await fetch(MASK, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Visor mask HTTP ${response.status}`);
        }

        const data: MaskData = await response.json();

        if (
          data.version !== "KitCart-Visor-Mask-V4" ||
          data.geometryVertices !== 24961 ||
          data.geometryTriangles !== 19776 ||
          !Array.isArray(data.selectedFaces) ||
          new Set(data.selectedFaces).size !== 444
        ) {
          throw new Error("Invalid approved 444-triangle visor mask");
        }

        setMask(data);
        setError("");
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Failed to load visor mask"
          );
        }
      }
    }

    loadMask();
    return () => controller.abort();
  }, []);

  const blink = useCallback(() => {
    if (blinkTimeout.current !== null) {
      clearTimeout(blinkTimeout.current);
    }

    setBlinking(true);

    blinkTimeout.current = setTimeout(() => {
      setBlinking(false);
      blinkTimeout.current = null;
    }, 130);
  }, []);

  useEffect(() => {
    if (!autoBlink) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timer = setTimeout(() => {
        if (cancelled) return;
        blink();
        schedule();
      }, 2500 + Math.random() * 2500);
    };

    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [autoBlink, blink]);

  useEffect(() => {
    return () => {
      if (blinkTimeout.current !== null) {
        clearTimeout(blinkTimeout.current);
      }
    };
  }, []);

  // Clicking requests a new action but leaves the current face
  // unchanged until the new animation actually begins.
  const selectAction = useCallback((id: ClipId) => {
    setRequest((previous) => ({
      id,
      serial: previous.serial + 1,
    }));
    setPlaying(true);
  }, []);

  // Stable callback keeps facial state changes from triggering
  // the clip-loading effect again.
  const handleActionStarted = useCallback(
    (_id: ClipId, face: Expression) => {
      setExpression(face);
      setManualOverride(false);
    },
    []
  );

  const handleDiagnostics = useCallback((next: Diagnostics) => {
    setDiagnostics(next);
  }, []);

  const selectManualExpression = (face: Expression) => {
    setExpression(face);
    setManualOverride(true);
  };

  const currentAction = CLIPS.find(
    (item) => item.id === request.id
  )!;

  const restoreAutomaticExpression = () => {
    setExpression(currentAction.face);
    setManualOverride(false);
  };

  return (
    <main className="min-h-screen bg-[#11142B] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A8A2FF]">
            KitCart Robot Development
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Synchronized Action + Expression Lab
          </h1>
          <p className="mt-2 text-sm text-white/60">
            The expression changes when the selected GLB starts,
            not before. All animation clips are preloaded.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
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
              <color attach="background" args={["#11142B"]} />
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
                  <Robot
                    mask={mask}
                    request={request}
                    expression={expression}
                    blinking={blinking}
                    playing={playing}
                    speed={speed}
                    tracking={tracking}
                    showFace={showFace}
                    onDiagnostics={handleDiagnostics}
                    onActionStarted={handleActionStarted}
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

          <div className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="font-bold">
                Animation + Automatic Expression
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {CLIPS.map((clip) => (
                  <button
                    key={clip.id}
                    type="button"
                    onClick={() => selectAction(clip.id)}
                    className={`rounded-xl border px-3 py-3 text-left ${
                      request.id === clip.id
                        ? "border-cyan-300 bg-[#6658D9]"
                        : "border-white/15 bg-[#11142B]"
                    }`}
                  >
                    <span className="block text-sm font-semibold">
                      {clip.label}
                    </span>
                    <span className="mt-1 block text-xs capitalize text-white/65">
                      Face: {clip.face.replace("-", " ")}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPlaying((value) => !value)}
                  className="rounded-xl bg-[#6658D9] px-4 py-2 text-sm"
                >
                  {playing ? "Pause" : "Play"}
                </button>

                <button
                  type="button"
                  onClick={() => selectAction(request.id)}
                  className="rounded-xl border border-white/20 px-4 py-2 text-sm"
                >
                  Restart
                </button>

                <select
                  value={speed}
                  onChange={(event) =>
                    setSpeed(Number(event.target.value))
                  }
                  className="rounded-xl border border-white/20 bg-[#11142B] px-3 py-2 text-sm"
                >
                  <option value={0.5}>0.5×</option>
                  <option value={0.75}>0.75×</option>
                  <option value={1}>1×</option>
                  <option value={1.25}>1.25×</option>
                  <option value={1.5}>1.5×</option>
                </select>

                <button
                  type="button"
                  disabled={request.id !== "idle"}
                  onClick={() => setTracking((value) => !value)}
                  className="rounded-xl border border-cyan-300/40 px-4 py-2 text-sm disabled:opacity-40"
                >
                  Head Tracking:{" "}
                  {request.id !== "idle"
                    ? "AUTO OFF"
                    : tracking
                      ? "ON"
                      : "OFF"}
                </button>
              </div>

              <p className="mt-3 text-xs text-white/60">
                Each animation loops through its full native duration.
                Idle mouse tracking returns to neutral after 5 seconds
                without cursor movement.
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="font-bold">
                Manual Expression Testing
              </h2>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {ALL_VISOR_EXPRESSIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => selectManualExpression(item)}
                    className={`rounded-lg border px-2 py-2 text-xs capitalize ${
                      expression === item
                        ? "border-cyan-300 bg-[#6658D9]"
                        : "border-white/15 bg-[#11142B]"
                    }`}
                  >
                    {item.replace("-", " ")}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={restoreAutomaticExpression}
                className="mt-3 w-full rounded-xl border border-[#A8A2FF]/50 px-3 py-2 text-sm"
              >
                Restore Automatic Expression
              </button>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={blink}
                  className="rounded-xl border border-cyan-300/40 px-3 py-2 text-sm"
                >
                  Blink Now
                </button>

                <button
                  type="button"
                  onClick={() => setAutoBlink((value) => !value)}
                  className="rounded-xl border border-cyan-300/40 px-3 py-2 text-sm"
                >
                  Auto Blink: {autoBlink ? "ON" : "OFF"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowFace((value) => !value)}
                  className="col-span-2 rounded-xl border border-white/20 px-3 py-2 text-sm"
                >
                  Facial Display: {showFace ? "ON" : "OFF"}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <h2 className="font-bold">
                Compatibility Diagnostics
              </h2>

              <div className="mt-3 space-y-2 text-white/75">
                <p>
                  Playing animation:{" "}
                  <strong>
                    {diagnostics?.clip ?? "Loading..."}
                  </strong>
                </p>
                <p>
                  Requested animation:{" "}
                  <strong>{currentAction.label}</strong>
                </p>
                <p>
                  Expected expression:{" "}
                  <strong className="capitalize">
                    {currentAction.face.replace("-", " ")}
                  </strong>
                </p>
                <p>
                  Displayed expression:{" "}
                  <strong className="capitalize">
                    {expression.replace("-", " ")}
                  </strong>
                </p>
                <p>
                  Expression mode:{" "}
                  <strong>
                    {manualOverride
                      ? "MANUAL OVERRIDE"
                      : "AUTOMATIC"}
                  </strong>
                </p>
                <p>
                  Head bone:{" "}
                  <strong>
                    {diagnostics
                      ? diagnostics.headFound
                        ? "FOUND"
                        : "MISSING"
                      : "Checking"}
                  </strong>
                </p>
                <p>
                  Shared skeleton:{" "}
                  <strong>
                    {diagnostics
                      ? diagnostics.sharedSkeleton
                        ? "YES"
                        : "NO"
                      : "Checking"}
                  </strong>
                </p>
                <p>
                  GLB duration:{" "}
                  <strong>
                    {diagnostics
                      ? `${diagnostics.duration.toFixed(2)}s`
                      : "—"}
                  </strong>
                </p>
                <p>
                  Animation tracks:{" "}
                  <strong>{diagnostics?.tracks ?? "—"}</strong>
                </p>
                <p>
                  Approved visor: <strong>444 triangles</strong>
                </p>
              </div>

              {error && (
                <p className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-red-200">
                  {error}
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

// Load every animation ahead of the first action selection.
// The idle model is also the canonical rig.
for (const clip of CLIPS) {
  useGLTF.preload(BASE + clip.file);
}

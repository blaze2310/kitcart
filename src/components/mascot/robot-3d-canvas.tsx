
"use client";

import {
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import {
  Canvas,
  createPortal,
  useFrame,
} from "@react-three/fiber";

import {
  Bounds,
  Center,
  Decal,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";

import {
  CanvasTexture,
  FrontSide,
  MathUtils,
  Mesh,
  SRGBColorSpace,
} from "three";

import RobotFace, {
  EXPRESSIONS,
  type Expression,
} from "./robot-face";

import { useRobotBlink } from "./hooks/use-robot-blink";

import {
  useRobotExpression,
} from "./hooks/use-robot-expression";

// =======================================
// EXPERIMENTAL ARM RIG
// The approved working GLB is unchanged.
// =======================================

const MODEL_PATH =
  "/models/kitcart/kitcart-arm-rig-experiment.glb";

// =======================================
// APPROVED CURSOR TRACKING
// =======================================

const MAX_LEFT_RIGHT = 16;
const MAX_UP_DOWN = 10;
const MAX_SIDE_TILT = 2;

const FOLLOW_SPEED = 5;
const IDLE_TIMEOUT_MS = 1500;

// =======================================
// APPROVED HEAD GESTURES
// =======================================

const NOD_DEGREES = 6;
const CURIOUS_TILT_DEGREES = 8;
const CURIOUS_DOWN_DEGREES = 7;
const CURIOUS_TURN_DEGREES = 2;

const NOD_DURATION = 1.1;
const CURIOUS_DURATION = 2.2;

const FIRST_GESTURE_DELAY = 5;
const BETWEEN_GESTURES_DELAY = 7;

// =======================================
// EXPERIMENTAL ARM ANIMATION
// =======================================

const ARM_TEST_ANGLE = 12;
const ARM_TEST_SPEED = 2.4;
const ARM_FOLLOW_SPEED = 5;

// =======================================
// APPROVED VISOR ALIGNMENT
// Do not change these values.
// =======================================

const VISOR_DECAL_POSITION: [number, number, number] = [
  0,
  0.236,
  -0.785,
];

const VISOR_DECAL_ROTATION: [number, number, number] = [
  -Math.PI / 2,
  0,
  0,
];

const VISOR_DECAL_SCALE: [number, number, number] = [
  0.34,
  0.18,
  0.26,
];

const FACE_EYE_Y = -12;
const FACE_SMILE_Y = 8;
const SURPRISED_SMILE_Y = -18;

const TEST_EXPRESSIONS: Expression[] = [
  ...EXPRESSIONS,
  "loved",
];

type CursorTarget = {
  x: number;
  y: number;
  active: boolean;
  lastMovedAt: number;
};

type GestureName = "nod" | "curious";

type IdleState = {
  nextGestureAt: number;
  gestureStartedAt: number | null;
  currentGesture: GestureName | null;
  nextGesture: GestureName;
  wasTracking: boolean;
};

type KitCartRigProps = {
  cursor: RefObject<CursorTarget>;
  faceTexture: CanvasTexture | null;
  armTestEnabled: boolean;
};

// =======================================
// ROBOT 3D RIG
// =======================================

function KitCartRig({
  cursor,
  faceTexture,
  armTestEnabled,
}: KitCartRigProps) {
  const { scene } = useGLTF(MODEL_PATH);

  // Clone the cached model rather than
  // modifying the original GLB scene.
  const rig = useMemo(
    () => scene.clone(true),
    [scene]
  );

  const {
    headPivot,
    headMesh,
    armPivot,
  } = useMemo(() => {
    const headPivot = rig.getObjectByName(
      "KitCart_Head_Pivot"
    );

    const head = rig.getObjectByName(
      "KitCart_Head"
    );

    const body = rig.getObjectByName(
      "KitCart_Body"
    );

    const armPivot = rig.getObjectByName(
      "KitCart_Arm_NegX_Pivot"
    );

    const arm = rig.getObjectByName(
      "KitCart_Arm_NegX"
    );

    if (
      !headPivot ||
      !(head instanceof Mesh) ||
      !body ||
      !armPivot ||
      !arm
    ) {
      throw new Error(
        "KitCart experimental rig is missing a " +
        "required head, body, or arm component."
      );
    }

    console.info("KitCart arm rig initialized", {
      headPivot: headPivot.name,
      body: body.name,
      armPivot: armPivot.name,
      arm: arm.name,
    });

    return {
      headPivot,
      headMesh: head,
      armPivot,
    };
  }, [rig]);

  // Preserve each pivot's original rotation.
  const neutralHeadRotation = useMemo(
    () => headPivot.rotation.clone(),
    [headPivot]
  );

  const neutralArmRotation = useMemo(
    () => armPivot.rotation.clone(),
    [armPivot]
  );

  const idle = useRef<IdleState>({
    nextGestureAt: FIRST_GESTURE_DELAY,
    gestureStartedAt: null,
    currentGesture: null,
    nextGesture: "nod",
    wasTracking: false,
  });

  // Separate animation progress for the arm.
  const armTime = useRef(0);

  useFrame(({ clock }, delta) => {
    const elapsed = clock.elapsedTime;
    const safeDelta = Math.min(delta, 0.05);

    // ===================================
    // EXISTING HEAD ANIMATION
    // ===================================

    const target = cursor.current;
    const animation = idle.current;

    const recentlyMoved =
      target.active &&
      performance.now() - target.lastMovedAt <
        IDLE_TIMEOUT_MS;

    if (recentlyMoved) {
      animation.currentGesture = null;
      animation.gestureStartedAt = null;

      animation.nextGestureAt =
        elapsed + FIRST_GESTURE_DELAY;
    } else if (animation.wasTracking) {
      animation.nextGestureAt =
        elapsed + FIRST_GESTURE_DELAY;
    }

    animation.wasTracking = recentlyMoved;

    const x = recentlyMoved ? target.x : 0;
    const y = recentlyMoved ? target.y : 0;

    let yaw =
      neutralHeadRotation.y -
      MathUtils.degToRad(MAX_LEFT_RIGHT) * x;

    let pitch =
      neutralHeadRotation.x -
      MathUtils.degToRad(MAX_UP_DOWN) * y;

    let roll =
      neutralHeadRotation.z -
      MathUtils.degToRad(MAX_SIDE_TILT) * x;

    if (!recentlyMoved) {
      if (
        animation.currentGesture === null &&
        elapsed >= animation.nextGestureAt
      ) {
        animation.currentGesture =
          animation.nextGesture;

        animation.gestureStartedAt = elapsed;
      }

      if (
        animation.currentGesture !== null &&
        animation.gestureStartedAt !== null
      ) {
        const gesture =
          animation.currentGesture;

        const duration =
          gesture === "nod"
            ? NOD_DURATION
            : CURIOUS_DURATION;

        const progress =
          (elapsed - animation.gestureStartedAt) /
          duration;

        if (progress >= 1) {
          animation.currentGesture = null;
          animation.gestureStartedAt = null;

          animation.nextGesture =
            gesture === "nod"
              ? "curious"
              : "nod";

          animation.nextGestureAt =
            elapsed + BETWEEN_GESTURES_DELAY;
        } else {
          const strength = Math.sin(
            Math.PI *
              MathUtils.clamp(progress, 0, 1)
          );

          if (gesture === "nod") {
            pitch +=
              MathUtils.degToRad(
                NOD_DEGREES
              ) * strength;
          }

          if (gesture === "curious") {
            roll +=
              MathUtils.degToRad(
                CURIOUS_TILT_DEGREES
              ) * strength;

            pitch +=
              MathUtils.degToRad(
                CURIOUS_DOWN_DEGREES
              ) * strength;

            yaw +=
              MathUtils.degToRad(
                CURIOUS_TURN_DEGREES
              ) * strength;
          }
        }
      }
    }

    const headSmoothing =
      1 - Math.exp(-FOLLOW_SPEED * safeDelta);

    headPivot.rotation.x = MathUtils.lerp(
      headPivot.rotation.x,
      pitch,
      headSmoothing
    );

    headPivot.rotation.y = MathUtils.lerp(
      headPivot.rotation.y,
      yaw,
      headSmoothing
    );

    headPivot.rotation.z = MathUtils.lerp(
      headPivot.rotation.z,
      roll,
      headSmoothing
    );

    // ===================================
    // NEW INDEPENDENT ARM ANIMATION
    // ===================================

    let targetArmRotation =
      neutralArmRotation.y;

    if (armTestEnabled) {
      armTime.current += safeDelta;

      // Slow, small shoulder rotation.
      // The GLB uses a Z-down local frame.
      // Negative Y rotation should move
      // the negative-X arm outward.
      const movement =
        (1 - Math.cos(
          armTime.current * ARM_TEST_SPEED
        )) / 2;

      targetArmRotation -=
        MathUtils.degToRad(
          ARM_TEST_ANGLE
        ) * movement;
    } else {
      armTime.current = 0;
    }

    const armSmoothing =
      1 - Math.exp(
        -ARM_FOLLOW_SPEED * safeDelta
      );

    armPivot.rotation.y = MathUtils.lerp(
      armPivot.rotation.y,
      targetArmRotation,
      armSmoothing
    );

    // Keep all other arm axes neutral.
    armPivot.rotation.x = neutralArmRotation.x;
    armPivot.rotation.z = neutralArmRotation.z;
  });

  return (
    <>
      <primitive object={rig} />

      {faceTexture &&
        createPortal(
          <Decal
            position={VISOR_DECAL_POSITION}
            rotation={VISOR_DECAL_ROTATION}
            scale={VISOR_DECAL_SCALE}
          >
            <meshBasicMaterial
              map={faceTexture}
              transparent
              alphaTest={0.02}
              depthWrite={false}
              depthTest={false}
              polygonOffset
              polygonOffsetFactor={-4}
              polygonOffsetUnits={-4}
              side={FrontSide}
              toneMapped={false}
            />
          </Decal>,
          headMesh
        )}
    </>
  );
}

// =======================================
// MAIN 3D CANVAS
// =======================================

export default function Robot3DCanvas() {
  const cursor = useRef<CursorTarget>({
    x: 0,
    y: 0,
    active: false,
    lastMovedAt: 0,
  });

  // Experimental movement is OFF by default.
  const [armTestEnabled, setArmTestEnabled] =
    useState(false);

  // Approved blinking system.
  const blinking = useRobotBlink();

  // Approved facial expression system.
  const {
    displayExpression,
    selectedExpression,
    faceVisible,
    changeExpression,
  } = useRobotExpression();

  const svgRef = useRef<SVGSVGElement>(null);

  const [faceTexture, setFaceTexture] =
    useState<CanvasTexture | null>(null);

  const instanceId =
    useId().replace(/:/g, "");

  const glowId =
    `kitcart-3d-glow-${instanceId}`;

  const visorId =
    `kitcart-3d-visor-${instanceId}`;

  // =======================================
  // CREATE FACE TEXTURE
  // =======================================

  useEffect(() => {
    const canvas =
      document.createElement("canvas");

    canvas.width = 900;
    canvas.height = 520;

    const texture = new CanvasTexture(canvas);

    texture.colorSpace = SRGBColorSpace;

    setFaceTexture(texture);

    return () => {
      texture.dispose();
    };
  }, []);

  // =======================================
  // UPDATE EXPRESSIONS AND BLINKING
  // =======================================

  useEffect(() => {
    if (!faceTexture || !svgRef.current) {
      return;
    }

    const svgText =
      new XMLSerializer().serializeToString(
        svgRef.current
      );

    const image = new Image();
    let cancelled = false;

    image.onload = () => {
      if (cancelled) return;

      const canvas =
        faceTexture.image as HTMLCanvasElement;

      const context =
        canvas.getContext("2d");

      if (!context) return;

      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.globalAlpha =
        faceVisible ? 1 : 0;

      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.globalAlpha = 1;

      faceTexture.needsUpdate = true;
    };

    image.onerror = () => {
      if (!cancelled) {
        console.error(
          "KitCart facial SVG could not be rendered."
        );
      }
    };

    image.src =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(svgText);

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [
    blinking,
    displayExpression,
    faceVisible,
    faceTexture,
  ]);

  // =======================================
  // APPROVED FULL-WINDOW CURSOR TRACKING
  // =======================================

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const horizontal =
        (event.clientX / window.innerWidth) * 2 - 1;

      const vertical =
        1 -
        (event.clientY / window.innerHeight) * 2;

      cursor.current.x = MathUtils.clamp(
        horizontal,
        -1,
        1
      );

      cursor.current.y = MathUtils.clamp(
        vertical,
        -1,
        1
      );

      cursor.current.active = true;
      cursor.current.lastMovedAt =
        performance.now();
    }

    function handleMouseLeave(event: MouseEvent) {
      if (event.relatedTarget === null) {
        cursor.current.active = false;
      }
    }

    function handleWindowBlur() {
      cursor.current.active = false;
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        cursor.current.active = false;
      }
    }

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    document.addEventListener(
      "mouseout",
      handleMouseLeave
    );

    window.addEventListener(
      "blur",
      handleWindowBlur
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      document.removeEventListener(
        "mouseout",
        handleMouseLeave
      );

      window.removeEventListener(
        "blur",
        handleWindowBlur
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#11142B]">
      {/* Hidden original SVG facial artwork */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          left: -10000,
          top: -10000,
          width: 900,
          height: 520,
        }}
      >
        <svg
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
          width="900"
          height="520"
          viewBox="330 255 460 255"
        >
          <defs>
            <filter
              id={glowId}
              x="-80%"
              y="-120%"
              width="260%"
              height="340%"
            >
              <feGaussianBlur
                stdDeviation="12"
              />
            </filter>

            <clipPath id={visorId}>
              <ellipse
                cx="560"
                cy="392"
                rx="225"
                ry="132"
              />
            </clipPath>
          </defs>

          <g clipPath={`url(#${visorId})`}>
            <RobotFace
              expression={displayExpression}
              blinking={blinking}
              glowId={glowId}
              eyeX={0}
              eyeY={FACE_EYE_Y}
              smileX={0}
              smileY={
                displayExpression === "surprised"
                  ? SURPRISED_SMILE_Y
                  : FACE_SMILE_Y
              }
            />
          </g>
        </svg>
      </div>

      <Canvas
        camera={{
          position: [0, 0.75, 6],
          fov: 35,
          near: 0.01,
          far: 1000,
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
      >
        <color
          attach="background"
          args={["#11142B"]}
        />

        {/* Approved studio lighting */}
        <ambientLight intensity={1.8} />

        <hemisphereLight
          args={["#ffffff", "#53607c", 2]}
        />

        <directionalLight
          position={[5, 8, 6]}
          intensity={3}
          color="#ffffff"
        />

        <directionalLight
          position={[-5, 3, -4]}
          intensity={2}
          color="#c6eaff"
        />

        <directionalLight
          position={[0, 5, -6]}
          intensity={1.5}
          color="#ffffff"
        />

        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={1}
          maxDistance={30}
        />

        <Suspense fallback={null}>
          <Bounds fit clip margin={1.3}>
            <Center>
              <KitCartRig
                cursor={cursor}
                faceTexture={faceTexture}
                armTestEnabled={armTestEnabled}
              />
            </Center>
          </Bounds>
        </Suspense>
      </Canvas>

      {/* New experimental arm controls */}
      <div className="absolute left-0 right-0 top-4 z-10 flex justify-center">
        <button
          type="button"
          onClick={() =>
            setArmTestEnabled((current) => !current)
          }
          aria-pressed={armTestEnabled}
          className={
            "cursor-pointer rounded-full border px-5 py-2 text-sm font-semibold transition-colors " +
            (armTestEnabled
              ? "border-cyan-300 bg-cyan-400 text-[#11142B]"
              : "border-white/30 bg-[#252B54] text-white hover:bg-[#394273]")
          }
        >
          {armTestEnabled
            ? "Stop arm test"
            : "Start arm test"}
        </button>
      </div>

      {/* Existing seven expression controls */}
      <div className="absolute bottom-10 left-2 right-2 z-10 flex flex-wrap justify-center gap-2">
        {TEST_EXPRESSIONS.map((expression) => (
          <button
            key={expression}
            type="button"
            onClick={() => changeExpression(expression)}
            aria-pressed={
              selectedExpression === expression
            }
            className={
              "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors " +
              (selectedExpression === expression
                ? "border-[#8FE2E8] bg-[#6658D9] text-white"
                : "border-white/20 bg-[#11142B]/90 text-white hover:bg-[#6658D9]/50")
            }
          >
            {expression}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs text-white/60">
        KitCart V2 · Experimental independent arm animation
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_PATH);

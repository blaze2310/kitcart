
"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";

import { Canvas, useFrame } from "@react-three/fiber";

import {
  Bounds,
  Center,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";

import { MathUtils } from "three";

const MODEL_PATH = "/models/kitcart/kitcart-rig-test.glb";

// Cursor tracking
const MAX_LEFT_RIGHT = 16;
const MAX_UP_DOWN = 10;
const MAX_SIDE_TILT = 2;

const FOLLOW_SPEED = 5;
const IDLE_TIMEOUT_MS = 1500;

// Idle gestures
const NOD_DEGREES = 6;

// Confused/curious gesture:
// Sideways + downward + slight horizontal turn.
const CURIOUS_TILT_DEGREES = 8;
const CURIOUS_DOWN_DEGREES = 7;
const CURIOUS_TURN_DEGREES = 2;

const NOD_DURATION = 1.1;
const CURIOUS_DURATION = 2.2;

const FIRST_GESTURE_DELAY = 5;
const BETWEEN_GESTURES_DELAY = 7;

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

function KitCartRig({
  cursor,
}: {
  cursor: RefObject<CursorTarget>;
}) {
  const { scene } = useGLTF(MODEL_PATH);

  const rig = useMemo(() => scene.clone(true), [scene]);

  const headPivot = useMemo(() => {
    const pivot = rig.getObjectByName(
      "KitCart_Head_Pivot"
    );

    const head = rig.getObjectByName("KitCart_Head");
    const body = rig.getObjectByName("KitCart_Body");

    if (!pivot || !head || !body) {
      throw new Error(
        "KitCart rig is missing its head, body, or pivot."
      );
    }

    console.info("KitCart gesture system ready", {
      head: head.name,
      body: body.name,
      pivot: pivot.name,
    });

    return pivot;
  }, [rig]);

  const neutralRotation = useMemo(
    () => headPivot.rotation.clone(),
    [headPivot]
  );

  const idle = useRef<IdleState>({
    nextGestureAt: FIRST_GESTURE_DELAY,
    gestureStartedAt: null,
    currentGesture: null,
    nextGesture: "nod",
    wasTracking: false,
  });

  useFrame(({ clock }, delta) => {
    const elapsed = clock.elapsedTime;
    const target = cursor.current;
    const animation = idle.current;

    const recentlyMoved =
      target.active &&
      performance.now() - target.lastMovedAt <
        IDLE_TIMEOUT_MS;

    // Moving the cursor cancels idle animations.
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
      neutralRotation.y -
      MathUtils.degToRad(MAX_LEFT_RIGHT) * x;

    let pitch =
      neutralRotation.x -
      MathUtils.degToRad(MAX_UP_DOWN) * y;

    let roll =
      neutralRotation.z -
      MathUtils.degToRad(MAX_SIDE_TILT) * x;

    if (!recentlyMoved) {
      if (
        animation.currentGesture === null &&
        elapsed >= animation.nextGestureAt
      ) {
        animation.currentGesture = animation.nextGesture;
        animation.gestureStartedAt = elapsed;
      }

      if (
        animation.currentGesture !== null &&
        animation.gestureStartedAt !== null
      ) {
        const gesture = animation.currentGesture;

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
            gesture === "nod" ? "curious" : "nod";

          animation.nextGestureAt =
            elapsed + BETWEEN_GESTURES_DELAY;
        } else {
          const strength = Math.sin(
            Math.PI * MathUtils.clamp(progress, 0, 1)
          );

          if (gesture === "nod") {
            // Gentle downward-and-upward nod.
            pitch +=
              MathUtils.degToRad(NOD_DEGREES) *
              strength;
          }

          if (gesture === "curious") {
            // Confused expression:
            // Diagonal sideways-and-downward head tilt.

            // Tilt head toward one shoulder.
            roll +=
              MathUtils.degToRad(
                CURIOUS_TILT_DEGREES
              ) * strength;

            // Lower the face simultaneously.
            // Positive pitch matches the existing nod.
            pitch +=
              MathUtils.degToRad(
                CURIOUS_DOWN_DEGREES
              ) * strength;

            // Slight accompanying horizontal turn.
            yaw +=
              MathUtils.degToRad(
                CURIOUS_TURN_DEGREES
              ) * strength;
          }
        }
      }
    }

    // Smooth movement independent of frame rate.
    const safeDelta = Math.min(delta, 0.05);

    const smoothing =
      1 - Math.exp(-FOLLOW_SPEED * safeDelta);

    headPivot.rotation.x = MathUtils.lerp(
      headPivot.rotation.x,
      pitch,
      smoothing
    );

    headPivot.rotation.y = MathUtils.lerp(
      headPivot.rotation.y,
      yaw,
      smoothing
    );

    headPivot.rotation.z = MathUtils.lerp(
      headPivot.rotation.z,
      roll,
      smoothing
    );
  });

  return <primitive object={rig} />;
}

export default function Robot3DCanvas() {
  const cursor = useRef<CursorTarget>({
    x: 0,
    y: 0,
    active: false,
    lastMovedAt: 0,
  });

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const horizontal =
        (event.clientX / window.innerWidth) * 2 - 1;

      const vertical =
        1 - (event.clientY / window.innerHeight) * 2;

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
      cursor.current.lastMovedAt = performance.now();
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

        {/* Existing studio lighting */}
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

        {/* Manual model inspection */}
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
              <KitCartRig cursor={cursor} />
            </Center>
          </Bounds>
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs text-white/60">
        KitCart V2 · Cursor tracking + idle personality
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_PATH);

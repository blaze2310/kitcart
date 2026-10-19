
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

// Maximum head movement in degrees
const MAX_LEFT_RIGHT = 16;
const MAX_UP_DOWN = 10;
const MAX_SIDE_TILT = 2;

// Smoothness
const FOLLOW_SPEED = 5;

// Return to neutral after 1.5 seconds of no movement
const IDLE_TIMEOUT_MS = 1500;

type CursorTarget = {
  x: number;
  y: number;
  active: boolean;
  lastMovedAt: number;
};

function KitCartRig({
  cursor,
}: {
  cursor: RefObject<CursorTarget>;
}) {
  const { scene } = useGLTF(MODEL_PATH);

  // Protect cached GLB scene
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

    console.info("KitCart head tracking initialized", {
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

  useFrame((_, delta) => {
    const target = cursor.current;

    const recentlyMoved =
      target.active &&
      performance.now() - target.lastMovedAt <
        IDLE_TIMEOUT_MS;

    const x = recentlyMoved ? target.x : 0;
    const y = recentlyMoved ? target.y : 0;

    // Horizontal: reverse previous tracking direction
    const targetYaw =
      neutralRotation.y -
      MathUtils.degToRad(MAX_LEFT_RIGHT) * x;

    // Vertical: cursor up means head looks up
    const targetPitch =
      neutralRotation.x -
      MathUtils.degToRad(MAX_UP_DOWN) * y;

    // Subtle expressive tilt
    const targetRoll =
      neutralRotation.z -
      MathUtils.degToRad(MAX_SIDE_TILT) * x;

    // Frame-rate-independent smoothing
    const smoothing =
      1 - Math.exp(-FOLLOW_SPEED * delta);

    headPivot.rotation.y = MathUtils.lerp(
      headPivot.rotation.y,
      targetYaw,
      smoothing
    );

    headPivot.rotation.x = MathUtils.lerp(
      headPivot.rotation.x,
      targetPitch,
      smoothing
    );

    headPivot.rotation.z = MathUtils.lerp(
      headPivot.rotation.z,
      targetRoll,
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
      // Normalize cursor to the entire browser viewport.
      // Left = -1, right = +1.
      const horizontal =
        (event.clientX / window.innerWidth) * 2 - 1;

      // Top = +1, bottom = -1.
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
      // Only reset when the mouse leaves the
      // browser document, not a child element.
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
          // Straight-on front view
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

        {/* Studio lighting */}
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

        {/* Manual camera inspection remains available */}
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
        KitCart V2 · Full-window cursor tracking
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_PATH);

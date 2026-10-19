
"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Bounds,
  Center,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import { Group, Object3D } from "three";

const MODEL_PATH = "/models/kitcart/kitcart-rig-test.glb";

// Approximately 8 degrees.
const HEAD_TILT = 0.14;

function KitCartRig() {
  const { scene } = useGLTF(MODEL_PATH);

  // Clone the scene so we don't modify the cached GLB.
  const rig = useMemo(() => scene.clone(true), [scene]);

  const headPivot = useMemo(() => {
    const pivot = rig.getObjectByName("KitCart_Head_Pivot");

    if (!pivot) {
      throw new Error(
        "KitCart_Head_Pivot was not found in the experimental GLB."
      );
    }

    const head = pivot.getObjectByName("KitCart_Head");
    const body = rig.getObjectByName("KitCart_Body");

    if (!head || !body) {
      throw new Error(
        "KitCart head or body mesh is missing."
      );
    }

    console.info("KitCart rig loaded", {
      pivot: pivot.name,
      head: head.name,
      body: body.name,
      pivotPosition: pivot.position.toArray(),
    });

    return pivot;
  }, [rig]);

  // Gentle left/right head-only animation.
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    headPivot.rotation.z =
      Math.sin(time * 0.8) * HEAD_TILT;

    // Keep the other head rotation axes neutral.
    headPivot.rotation.x = 0;
    headPivot.rotation.y = 0;
  });

  return <primitive object={rig} />;
}

export default function Robot3DCanvas() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#11142B]">
      <Canvas
        camera={{
          position: [3, 2, 6],
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
        <color attach="background" args={["#11142B"]} />

        {/* Original studio lighting */}
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

        {/* Rotate camera manually for inspection */}
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
              <KitCartRig />
            </Center>
          </Bounds>
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs text-white/60">
        KitCart V2 · Independent head-only tilt test
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_PATH);


"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import RobotInteractive3D from "@/features/robot/3d/RobotInteractive3D";

export default function RobotInteractionTestPage() {
  const [lastReaction, setLastReaction] =
    useState("Waiting for interaction");

  return (
    <main className="min-h-screen bg-[#11142B] p-5 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">
          KitCart — Interactive Robot Test
        </h1>

        <p className="mt-2 text-white/60">
          Click the robot once for Happy.
          Click six times rapidly for Shy + Loved.
        </p>

        <div className="mt-6 h-[640px] overflow-hidden rounded-3xl border border-white/10">
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
              <RobotInteractive3D
                onReaction={setLastReaction}
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

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/60">
            Latest reaction
          </p>
          <p className="mt-1 font-semibold text-[#8FEFFF]">
            {lastReaction}
          </p>
        </div>
      </div>
    </main>
  );
}

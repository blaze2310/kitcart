
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// KitCart's finalized color palette
const COLORS = {
  navy: "#11142B",
  indigo: "#6658D9",
  lavender: "#A8A2FF",
  cyan: "#8FE2E8",
  white: "#F7F8FC",
};

function Robot() {
  const head = useRef<THREE.Group>(null);
  const leftEye = useRef<THREE.Group>(null);
  const rightEye = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (event: PointerEvent) => {
      pointer.current.x =
        (event.clientX / window.innerWidth) * 2 - 1;

      pointer.current.y =
        -((event.clientY / window.innerHeight) * 2 - 1);
    };

    window.addEventListener("pointermove", handleMouse, {
      passive: true,
    });

    return () =>
      window.removeEventListener("pointermove", handleMouse);
  }, []);

  useFrame((_, delta) => {
    if (!head.current) return;

    const speed = 4;

    head.current.rotation.y = THREE.MathUtils.damp(
      head.current.rotation.y,
      pointer.current.x * 0.35,
      speed,
      delta
    );

    head.current.rotation.x = THREE.MathUtils.damp(
      head.current.rotation.x,
      -pointer.current.y * 0.2,
      speed,
      delta
    );

    if (leftEye.current && rightEye.current) {
      const eyeShift = pointer.current.x * 0.08;
      const eyeVertical = pointer.current.y * 0.04;

      leftEye.current.position.x = THREE.MathUtils.damp(
        leftEye.current.position.x,
        -0.42 + eyeShift,
        speed,
        delta
      );

      rightEye.current.position.x = THREE.MathUtils.damp(
        rightEye.current.position.x,
        0.42 + eyeShift,
        speed,
        delta
      );

      leftEye.current.position.y = THREE.MathUtils.damp(
        leftEye.current.position.y,
        0.05 + eyeVertical,
        speed,
        delta
      );

      rightEye.current.position.y = THREE.MathUtils.damp(
        rightEye.current.position.y,
        0.05 + eyeVertical,
        speed,
        delta
      );
    }
  });

  return (
    <Float
      speed={1.5}
      rotationIntensity={0.04}
      floatIntensity={0.12}
    >
      <group>
        {/* Robot body */}
        <RoundedBox
          args={[1.7, 1.65, 1]}
          radius={0.48}
          position={[0, -1.05, 0]}
        >
          <meshPhysicalMaterial
            color={COLORS.white}
            metalness={0.2}
            roughness={0.15}
            clearcoat={1}
          />
        </RoundedBox>

        {/* Glowing indigo chest light */}
        <mesh position={[0, -0.95, 0.53]}>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial
            color={COLORS.lavender}
            emissive={COLORS.indigo}
            emissiveIntensity={2}
          />
        </mesh>

        {/* Head */}
        <group ref={head} position={[0, 0.65, 0]}>
          <RoundedBox args={[2.3, 1.75, 1.35]} radius={0.48}>
            <meshPhysicalMaterial
              color={COLORS.white}
              metalness={0.15}
              roughness={0.12}
              clearcoat={1}
            />
          </RoundedBox>

          {/* Dark glass face */}
          <RoundedBox
            args={[1.95, 1.3, 0.12]}
            radius={0.35}
            position={[0, 0, 0.7]}
          >
            <meshPhysicalMaterial
              color={COLORS.navy}
              metalness={0.5}
              roughness={0.08}
              clearcoat={1}
            />
          </RoundedBox>

          {/* Left eye */}
          <group ref={leftEye} position={[-0.42, 0.05, 0.79]}>
            <mesh scale={[0.25, 0.35, 0.08]}>
              <sphereGeometry args={[1, 32, 32]} />
              <meshStandardMaterial
                color={COLORS.cyan}
                emissive={COLORS.cyan}
                emissiveIntensity={2}
                toneMapped={false}
              />
            </mesh>
          </group>

          {/* Right eye */}
          <group ref={rightEye} position={[0.42, 0.05, 0.79]}>
            <mesh scale={[0.25, 0.35, 0.08]}>
              <sphereGeometry args={[1, 32, 32]} />
              <meshStandardMaterial
                color={COLORS.cyan}
                emissive={COLORS.cyan}
                emissiveIntensity={2}
                toneMapped={false}
              />
            </mesh>
          </group>
        </group>
      </group>
    </Float>
  );
}

export default function RobotCanvas() {
  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.6} />

        <directionalLight
          position={[3, 5, 5]}
          intensity={3}
        />

        <pointLight
          position={[-3, 2, 3]}
          color={COLORS.indigo}
          intensity={25}
        />

        <Robot />
      </Canvas>
    </div>
  );
}

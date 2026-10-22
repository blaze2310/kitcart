
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import {
  Bone,
  Box3,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  SkinnedMesh,
  SphereGeometry,
  Vector3,
} from "three";

const MODEL = "/models/kitcart/animations/stay-in-place/idle.glb";

const YAW_AXIS = new Vector3(0, 1, 0);
const PITCH_AXIS = new Vector3(0, 0, 1);

type Mode = "neutral" | "left" | "right" | "up" | "down" | "mouse";

type Report = {
  meshes: number;
  headName: string;
  weighted: number;
  rotation: number;
  movement: number;
  mouseX: number;
  mouseY: number;
};

const EMPTY: Report = {
  meshes: 0,
  headName: "Loading",
  weighted: 0,
  rotation: 0,
  movement: 0,
  mouseX: 0,
  mouseY: 0,
};

function Robot({
  mode,
  onReport,
}: {
  mode: Mode;
  onReport: (report: Report) => void;
}) {
  const gltf = useGLTF(MODEL);

  const model = useMemo(
    () => SkeletonUtils.clone(gltf.scene),
    [gltf.scene]
  );

  const rig = useMemo(() => {
    let meshes = 0;

    let binding: {
      mesh: SkinnedMesh;
      head: Bone;
      indices: number[];
    } | null = null;

    model.traverse((object) => {
      if (!(object instanceof SkinnedMesh)) return;

      meshes++;

      const head = object.skeleton.bones.find((bone) => {
        const normalized = bone.name
          .replace(/[^a-z0-9]/gi, "")
          .toLowerCase();

        return normalized === "mixamorighead" ||
          normalized === "head";
      });

      if (!head) return;

      const joint = object.skeleton.bones.indexOf(head);
      const joints = object.geometry.getAttribute("skinIndex");
      const weights = object.geometry.getAttribute("skinWeight");

      if (!joints || !weights) return;

      const indices: number[] = [];

      for (let i = 0; i < joints.count; i++) {
        const influence =
          (joints.getX(i) === joint ? weights.getX(i) : 0) +
          (joints.getY(i) === joint ? weights.getY(i) : 0) +
          (joints.getZ(i) === joint ? weights.getZ(i) : 0) +
          (joints.getW(i) === joint ? weights.getW(i) : 0);

        if (influence > 0.5) indices.push(i);
      }

      if (!binding || indices.length > binding.indices.length) {
        binding = { mesh: object, head, indices };
      }
    });

    return {
      meshes,
      binding: binding as {
        mesh: SkinnedMesh;
        head: Bone;
        indices: number[];
      } | null,
    };
  }, [model]);

  const neutral = useMemo(
    () => rig.binding?.head.quaternion.clone() ?? new Quaternion(),
    [rig]
  );

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
        number,
      ],
    };
  }, [model]);

  const samples = useMemo(() => {
    if (!rig.binding) return [];

    const { mesh, indices } = rig.binding;
    const positions = mesh.geometry.getAttribute("position");

    model.updateMatrixWorld(true);
    mesh.skeleton.update();

    return indices.slice(0, 20).map((index) => {
      const original = new Vector3().fromBufferAttribute(
        positions,
        index
      );

      const neutralPosition = original.clone();
      mesh.applyBoneTransform(index, neutralPosition);

      return { index, original, neutralPosition };
    });
  }, [rig, model]);

  const pointer = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });
  const elapsed = useRef(0);

  const yaw = useMemo(() => new Quaternion(), []);
  const pitch = useMemo(() => new Quaternion(), []);
  const vertex = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const move = (event: PointerEvent) => {
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
    };

    window.addEventListener("pointermove", move);

    return () => window.removeEventListener("pointermove", move);
  }, []);

  useEffect(() => {
    const head = rig.binding?.head;
    if (!head) return;

    const geometry = new SphereGeometry(0.045, 16, 12);
    const material = new MeshBasicMaterial({
      color: "#FFE45E",
      depthTest: false,
      depthWrite: false,
    });

    const marker = new Mesh(geometry, material);
    marker.position.set(0.4, 0, 0);
    marker.renderOrder = 1000;

    head.add(marker);

    return () => {
      head.remove(marker);
      geometry.dispose();
      material.dispose();
    };
  }, [rig]);

  useFrame((_, delta) => {
    const x =
      mode === "left" ? -1 :
      mode === "right" ? 1 :
      mode === "mouse" ? pointer.current.x : 0;

    const y =
      mode === "up" ? 1 :
      mode === "down" ? -1 :
      mode === "mouse" ? pointer.current.y : 0;

    const alpha = 1 - Math.exp(-8 * Math.min(delta, 0.05));

    smooth.current.x = MathUtils.lerp(smooth.current.x, x, alpha);
    smooth.current.y = MathUtils.lerp(smooth.current.y, y, alpha);

    let rotation = 0;
    let movement = 0;

    const binding = rig.binding;

    if (binding) {
      // Existing left/right rotation — unchanged.
      yaw.setFromAxisAngle(
        YAW_AXIS,
        MathUtils.degToRad(70 * smooth.current.x)
      );

      // Vertical movement uses local Z instead of X.
      pitch.setFromAxisAngle(
        PITCH_AXIS,
        MathUtils.degToRad(35 * smooth.current.y)
      );

      binding.head.quaternion
        .copy(neutral)
        .multiply(yaw)
        .multiply(pitch);

      model.updateMatrixWorld(true);
      binding.mesh.skeleton.update();

      rotation = MathUtils.radToDeg(
        binding.head.quaternion.angleTo(neutral)
      );

      for (const sample of samples) {
        vertex.copy(sample.original);

        binding.mesh.applyBoneTransform(
          sample.index,
          vertex
        );

        movement = Math.max(
          movement,
          vertex.distanceTo(sample.neutralPosition)
        );
      }
    }

    elapsed.current += delta;

    if (elapsed.current >= 0.3) {
      elapsed.current = 0;

      onReport({
        meshes: rig.meshes,
        headName: binding?.head.name ?? "NOT FOUND",
        weighted: binding?.indices.length ?? 0,
        rotation,
        movement,
        mouseX: pointer.current.x,
        mouseY: pointer.current.y,
      });
    }
  });

  return (
    <group scale={framing.scale}>
      <group position={framing.center}>
        <primitive object={model} />
      </group>
    </group>
  );
}

export default function RobotTripoTest() {
  const [mode, setMode] = useState<Mode>("neutral");
  const [report, setReport] = useState<Report>(EMPTY);

  const modes: Mode[] = [
    "neutral",
    "left",
    "right",
    "up",
    "down",
    "mouse",
  ];

  return (
    <div className="w-full space-y-4">
      <div className="h-[650px] overflow-hidden rounded-3xl border border-white/10 bg-[#11142B]">
        <Canvas
          camera={{ position: [0, 0, 4.2], fov: 35 }}
          dpr={[1, 1.75]}
        >
          <color attach="background" args={["#11142B"]} />

          <ambientLight intensity={1.8} />
          <hemisphereLight args={["#e8f4ff", "#7970a9", 2]} />
          <directionalLight position={[3, 4, 5]} intensity={3} />
          <directionalLight position={[-3, 2, -4]} intensity={2} />

          <Suspense fallback={null}>
            <Robot mode={mode} onReport={setReport} />
          </Suspense>

          <OrbitControls
            target={[0, 0, 0]}
            enablePan={false}
            enableDamping
            minDistance={2}
            maxDistance={9}
          />
        </Canvas>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {modes.map((item) => (
          <button
            key={item}
            onClick={() => setMode(item)}
            className={`rounded-xl px-5 py-3 font-semibold capitalize ${
              mode === item
                ? "bg-[#6658D9] text-white"
                : "border border-white/20 bg-white/5 text-white"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white">
        <h3 className="mb-3 font-bold text-cyan-300">
          Live Rig Diagnostics
        </h3>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <p>Model: idle.glb</p>
          <p>Animation: DISABLED</p>
          <p>Skinned meshes: {report.meshes}</p>
          <p>Runtime head: {report.headName}</p>
          <p>Strongly weighted vertices: {report.weighted}</p>
          <p>Head rotation: {report.rotation.toFixed(1)}°</p>
          <p>Vertex movement: {report.movement.toFixed(5)}</p>
          <p>Mouse X: {report.mouseX.toFixed(2)}</p>
          <p>Mouse Y: {report.mouseY.toFixed(2)}</p>
        </div>

        <p className="mt-4 text-white/60">
          Yellow marker = actual head bone.
          Left/Right test yaw; Up/Down test pitch.
        </p>
      </div>
    </div>
  );
}

useGLTF.preload(MODEL);

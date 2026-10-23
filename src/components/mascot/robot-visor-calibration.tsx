
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
  AnimationMixer,
  Bone,
  Box3,
  DoubleSide,
  Euler,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SkinnedMesh,
  Vector3,
} from "three";

const IDLE_URL =
  "/models/kitcart/animations/stay-in-place/idle.glb";

type Calibration = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  width: number;
  height: number;
  bendX: number;
  bendY: number;
};

type SurfaceRectangle = {
  width: number;
  height: number;
  cx: number;
  cy: number;
  offset: number;
};

const INITIAL: Calibration = {
  x: 0,
  y: 0,
  z: 0.25,
  rx: 0,
  ry: 0,
  rz: 0,
  width: 0.48,
  height: 0.27,
  bendX: 0.35,
  bendY: 0.08,
};

const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

// ------------------------------------------------------------
// FIND ANIMATED HEAD BONE
// ------------------------------------------------------------

function findHead(model: Object3D): Bone | null {
  const meshes: SkinnedMesh[] = [];

  model.traverse((object) => {
    if (object instanceof SkinnedMesh) {
      meshes.push(object);
    }
  });

  for (const mesh of meshes) {
    const head = mesh.skeleton.bones.find((bone) => {
      const name = bone.name
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();

      return (
        name === "mixamorighead" ||
        name === "head"
      );
    });

    if (head) return head;
  }

  return null;
}

// ------------------------------------------------------------
// CURVED SURFACE MATH
//
// A positive bend means the center projects outward
// relative to the edges along the local +Z direction.
//
// Both bend directions are adjustable independently.
// ------------------------------------------------------------

function surfaceZ(
  x: number,
  y: number,
  bendX: number,
  bendY: number
) {
  return -bendX * x * x - bendY * y * y;
}

function buildCurvedGeometry(
  rectangle: SurfaceRectangle,
  bendX: number,
  bendY: number
) {
  const geometry = new PlaneGeometry(
    rectangle.width,
    rectangle.height,
    32,
    12
  );

  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const localX = positions.getX(i);
    const localY = positions.getY(i);

    const x = localX + rectangle.cx;
    const y = localY + rectangle.cy;

    positions.setXYZ(
      i,
      x,
      y,
      surfaceZ(x, y, bendX, bendY) +
        rectangle.offset
    );
  }

  positions.needsUpdate = true;

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

// ------------------------------------------------------------
// CREATE CURVED CALIBRATION MARKER
//
// All component rectangles share the exact same
// curvature equation. The eye and mouth guides
// therefore conform to the diagnostic surface.
// ------------------------------------------------------------

function createMarker() {
  const group = new Group();

  function addRectangle(
    name: string,
    rectangle: SurfaceRectangle,
    color: string,
    opacity: number
  ) {
    const material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: DoubleSide,
      depthWrite: false,
    });

    const mesh = new Mesh(
      buildCurvedGeometry(rectangle, 0, 0),
      material
    );

    mesh.name = name;
    mesh.userData.rectangle = rectangle;
    mesh.renderOrder = 2;

    group.add(mesh);
  }

  // Transparent diagnostic surface.
  addRectangle(
    "surface",
    {
      width: 1,
      height: 1,
      cx: 0,
      cy: 0,
      offset: 0,
    },
    "#8FEFFF",
    0.16
  );

  // Thin outline strips following the surface.
  addRectangle(
    "top-edge",
    {
      width: 1,
      height: 0.012,
      cx: 0,
      cy: 0.494,
      offset: 0.002,
    },
    "#8FEFFF",
    0.85
  );

  addRectangle(
    "bottom-edge",
    {
      width: 1,
      height: 0.012,
      cx: 0,
      cy: -0.494,
      offset: 0.002,
    },
    "#8FEFFF",
    0.85
  );

  addRectangle(
    "left-edge",
    {
      width: 0.012,
      height: 1,
      cx: -0.494,
      cy: 0,
      offset: 0.002,
    },
    "#8FEFFF",
    0.85
  );

  addRectangle(
    "right-edge",
    {
      width: 0.012,
      height: 1,
      cx: 0.494,
      cy: 0,
      offset: 0.002,
    },
    "#8FEFFF",
    0.85
  );

  // Eye alignment guides.
  addRectangle(
    "left-eye",
    {
      width: 0.19,
      height: 0.085,
      cx: -0.245,
      cy: 0.115,
      offset: 0.005,
    },
    "#8FEFFF",
    0.92
  );

  addRectangle(
    "right-eye",
    {
      width: 0.19,
      height: 0.085,
      cx: 0.245,
      cy: 0.115,
      offset: 0.005,
    },
    "#8FEFFF",
    0.92
  );

  // Mouth alignment guide.
  addRectangle(
    "mouth",
    {
      width: 0.22,
      height: 0.045,
      cx: 0,
      cy: -0.205,
      offset: 0.005,
    },
    "#8FEFFF",
    0.92
  );

  return group;
}

// ------------------------------------------------------------
// ANIMATED ROBOT
// ------------------------------------------------------------

function RobotScene({
  calibration,
  tracking,
  depthTest,
  visible,
  paused,
  onHeadFound,
}: {
  calibration: Calibration;
  tracking: boolean;
  depthTest: boolean;
  visible: boolean;
  paused: boolean;
  onHeadFound: (value: boolean) => void;
}) {
  const gltf = useGLTF(IDLE_URL);

  const model = useMemo(
    () => SkeletonUtils.clone(gltf.scene),
    [gltf.scene]
  );

  const head = useMemo(
    () => findHead(model),
    [model]
  );

  const mixer = useMemo(
    () => new AnimationMixer(model),
    [model]
  );

  const marker = useMemo(
    () => createMarker(),
    []
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

  const pointer = useRef({ x: 0, y: 0 });
  const gaze = useRef({ x: 0, y: 0 });

  const yaw = useMemo(() => new Quaternion(), []);
  const pitch = useMemo(() => new Quaternion(), []);
  const correction = useMemo(
    () => new Quaternion(),
    []
  );
  const inverse = useMemo(
    () => new Quaternion(),
    []
  );
  const previousCorrection = useMemo(
    () => new Quaternion(),
    []
  );

  // Prepare idle animation but freeze at its start.
  useEffect(() => {
    const clip = gltf.animations[0];
    if (!clip) return;

    const action = mixer.clipAction(clip);
    action.reset().play();

    mixer.update(0);

    return () => {
      mixer.stopAllAction();
    };
  }, [gltf.animations, mixer]);

  // Attach curved surface to the actual head bone.
  useEffect(() => {
    onHeadFound(Boolean(head));

    if (!head) return;

    head.add(marker);

    return () => {
      head.remove(marker);
    };
  }, [head, marker, onHeadFound]);

  // Rebuild each diagnostic rectangle whenever
  // curvature changes.
  useEffect(() => {
    marker.children.forEach((object) => {
      if (!(object instanceof Mesh)) return;

      const rectangle =
        object.userData.rectangle as
          | SurfaceRectangle
          | undefined;

      if (!rectangle) return;

      const oldGeometry = object.geometry;

      object.geometry = buildCurvedGeometry(
        rectangle,
        calibration.bendX,
        calibration.bendY
      );

      oldGeometry.dispose();
    });
  }, [
    marker,
    calibration.bendX,
    calibration.bendY,
  ]);

  // Position / rotation / size.
  useEffect(() => {
    marker.position.set(
      calibration.x,
      calibration.y,
      calibration.z
    );

    marker.rotation.copy(
      new Euler(
        MathUtils.degToRad(calibration.rx),
        MathUtils.degToRad(calibration.ry),
        MathUtils.degToRad(calibration.rz)
      )
    );

    marker.scale.set(
      calibration.width,
      calibration.height,
      1
    );

    marker.visible = visible;
  }, [marker, calibration, visible]);

  // Show actual helmet occlusion by default.
  useEffect(() => {
    marker.traverse((object) => {
      if (!(object instanceof Mesh)) return;

      const material = object.material;

      if (material instanceof MeshBasicMaterial) {
        material.depthTest = depthTest;
        material.needsUpdate = true;
      }
    });
  }, [marker, depthTest]);

  // Cursor head tracking, independently controllable.
  useEffect(() => {
    const move = (event: PointerEvent) => {
      pointer.current.x = MathUtils.clamp(
        (event.clientX / window.innerWidth) * 2 - 1,
        -1,
        1
      );

      pointer.current.y = MathUtils.clamp(
        1 -
          (event.clientY / window.innerHeight) * 2,
        -1,
        1
      );
    };

    window.addEventListener("pointermove", move);

    return () => {
      window.removeEventListener("pointermove", move);
    };
  }, []);

  useFrame((_, delta) => {
    // Completely frozen when both controls are OFF.
    if (paused && !tracking) return;

    const dt = Math.min(delta, 0.05);

    if (head) {
      inverse
        .copy(previousCorrection)
        .invert();

      head.quaternion.multiply(inverse);
    }

    if (!paused) {
      mixer.update(dt);
    }

    const alpha = 1 - Math.exp(-7 * dt);

    gaze.current.x = MathUtils.lerp(
      gaze.current.x,
      tracking ? pointer.current.x : 0,
      alpha
    );

    gaze.current.y = MathUtils.lerp(
      gaze.current.y,
      tracking ? pointer.current.y : 0,
      alpha
    );

    if (!head) return;

    yaw.setFromAxisAngle(
      Y_AXIS,
      MathUtils.degToRad(
        30 * gaze.current.x
      )
    );

    pitch.setFromAxisAngle(
      Z_AXIS,
      MathUtils.degToRad(
        18 * gaze.current.y
      )
    );

    correction.copy(yaw).multiply(pitch);

    head.quaternion.multiply(correction);

    previousCorrection.copy(correction);
  });

  // Release temporary marker GPU resources
  // when leaving this calibration page.
  useEffect(() => {
    return () => {
      marker.traverse((object) => {
        if (!(object instanceof Mesh)) return;

        object.geometry.dispose();

        const material = object.material;

        if (material instanceof MeshBasicMaterial) {
          material.dispose();
        }
      });
    };
  }, [marker]);

  return (
    <group scale={framing.scale}>
      <group position={framing.center}>
        <primitive object={model} />
      </group>
    </group>
  );
}

// ------------------------------------------------------------
// CONTROL DEFINITIONS
// ------------------------------------------------------------

type Setting = {
  key: keyof Calibration;
  label: string;
  min: number;
  max: number;
  step: number;
};

const SETTINGS: Setting[] = [
  {
    key: "x",
    label: "Position X",
    min: -1,
    max: 1,
    step: 0.005,
  },
  {
    key: "y",
    label: "Position Y",
    min: -1,
    max: 1,
    step: 0.005,
  },
  {
    key: "z",
    label: "Position Z",
    min: -1,
    max: 1,
    step: 0.005,
  },
  {
    key: "rx",
    label: "Rotation X",
    min: -180,
    max: 180,
    step: 1,
  },
  {
    key: "ry",
    label: "Rotation Y",
    min: -180,
    max: 180,
    step: 1,
  },
  {
    key: "rz",
    label: "Rotation Z",
    min: -180,
    max: 180,
    step: 1,
  },
  {
    key: "width",
    label: "Width",
    min: 0.05,
    max: 1.5,
    step: 0.005,
  },
  {
    key: "height",
    label: "Height",
    min: 0.05,
    max: 1.5,
    step: 0.005,
  },
  {
    key: "bendX",
    label: "Bend X — Side Curvature",
    min: -1,
    max: 1,
    step: 0.01,
  },
  {
    key: "bendY",
    label: "Bend Y — Vertical Curvature",
    min: -1,
    max: 1,
    step: 0.01,
  },
];

// ------------------------------------------------------------
// CALIBRATION INTERFACE
// ------------------------------------------------------------

export default function RobotVisorCalibration() {
  const [calibration, setCalibration] =
    useState<Calibration>(INITIAL);

  const [paused, setPaused] =
    useState(true);

  const [tracking, setTracking] =
    useState(false);

  const [depthTest, setDepthTest] =
    useState(true);

  const [visible, setVisible] =
    useState(true);

  const [headFound, setHeadFound] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  const update = useCallback(
    (key: keyof Calibration, value: number) => {
      setCopied(false);

      setCalibration((previous) => ({
        ...previous,
        [key]: value,
      }));
    },
    []
  );

  const copyValues = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(calibration, null, 2)
      );

      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 3D CALIBRATION VIEWPORT */}
      <div className="h-[580px] overflow-hidden rounded-3xl border border-white/10 bg-[#11142B]">
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
            args={[
              "#e8f4ff",
              "#7970a9",
              2,
            ]}
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
            <RobotScene
              calibration={calibration}
              tracking={tracking}
              depthTest={depthTest}
              visible={visible}
              paused={paused}
              onHeadFound={setHeadFound}
            />
          </Suspense>

          <OrbitControls
            enablePan={false}
            enableDamping
            minDistance={2}
            maxDistance={8}
          />
        </Canvas>
      </div>

      {/* CONTROL BUTTONS */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-4 text-lg font-semibold">
          Visor Calibration Controls
        </h2>

        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm"
          >
            Animation: {paused ? "PAUSED" : "PLAYING"}
          </button>

          <button
            type="button"
            onClick={() => setTracking((v) => !v)}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm"
          >
            Head Tracking: {tracking ? "ON" : "OFF"}
          </button>

          <button
            type="button"
            onClick={() => setDepthTest((v) => !v)}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm"
          >
            Depth Test: {depthTest ? "ON" : "OFF"}
          </button>

          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm"
          >
            Marker: {visible ? "Visible" : "Hidden"}
          </button>

          <button
            type="button"
            onClick={() => {
              setCalibration(INITIAL);
              setCopied(false);
            }}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm"
          >
            Reset Calibration
          </button>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[#11142B] p-3">
            <p className="text-xs text-white/50">
              Robot
            </p>
            <p className="mt-1 font-semibold">
              {paused ? "Stationary" : "Animating"}
            </p>
          </div>

          <div className="rounded-xl bg-[#11142B] p-3">
            <p className="text-xs text-white/50">
              Head Bone
            </p>
            <p className="mt-1 font-semibold text-cyan-300">
              {headFound ? "Found" : "Not Found"}
            </p>
          </div>

          <div className="rounded-xl bg-[#11142B] p-3">
            <p className="text-xs text-white/50">
              Surface Geometry
            </p>
            <p className="mt-1 font-semibold text-cyan-300">
              Curved Mesh
            </p>
          </div>
        </div>

        {/* ALL SLIDERS */}
        <div className="grid gap-5 sm:grid-cols-2">
          {SETTINGS.map((setting) => (
            <label
              key={setting.key}
              className="block"
            >
              <span className="mb-2 flex items-center justify-between gap-2 text-sm">
                <span className="text-white/75">
                  {setting.label}
                </span>

                <span className="font-mono text-cyan-300">
                  {calibration[
                    setting.key
                  ].toFixed(3)}
                </span>
              </span>

              <input
                type="range"
                min={setting.min}
                max={setting.max}
                step={setting.step}
                value={calibration[setting.key]}
                onChange={(event) =>
                  update(
                    setting.key,
                    Number(event.target.value)
                  )
                }
                className="w-full accent-cyan-300"
              />
            </label>
          ))}
        </div>
      </div>

      {/* COPIABLE RESULTS */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">
            Final Calibration Values
          </h2>

          <button
            type="button"
            onClick={copyValues}
            className="rounded-xl bg-[#6658D9] px-4 py-2 text-sm font-medium text-white"
          >
            {copied ? "Copied!" : "Copy Values"}
          </button>
        </div>

        <pre className="overflow-x-auto rounded-xl bg-[#090C1A] p-4 text-xs text-cyan-200">
          {JSON.stringify(calibration, null, 2)}
        </pre>
      </div>
    </div>
  );
}

useGLTF.preload(IDLE_URL);

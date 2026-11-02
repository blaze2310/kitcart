
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
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Bone,
  Box3,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  Object3D,
  Quaternion,
  SkinnedMesh,
  Vector3,
} from "three";

const BASE = "/models/kitcart/animations/stay-in-place/";
const IDLE = BASE + "idle.glb";

const FILES = {
  idle: "idle.glb",
  stretch: "stretch.glb",
  clapping: "clapping.glb",
  sneak: "password+sneak+2.glb",
  head: "sneaky+head+for+password.glb",
  lean: "side+lean+pose.glb",
  turn: "turn.glb",
} as const;

type Clip = keyof typeof FILES;
type PasswordPattern = 1 | 2 | 3;
type UsernamePattern = "stretch" | "clapping";
type Mode = "idle" | "username" | "password";

type Request = {
  clip: Clip;
  serial: number;
};

const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

function findHead(model: Object3D): Bone | null {
  const meshes: SkinnedMesh[] = [];

  model.traverse((object) => {
    if (object instanceof SkinnedMesh) {
      meshes.push(object);
    }
  });

  for (const mesh of meshes) {
    const head = mesh.skeleton.bones.find((bone) => {
      const normalized = bone.name
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();

      return (
        normalized === "mixamorighead" ||
        normalized === "head"
      );
    });

    if (head) return head;
  }

  return null;
}

function ClipLoader({
  url,
  onReady,
}: {
  url: string;
  onReady: (clip: AnimationClip, url: string) => void;
}) {
  const gltf = useGLTF(url);

  useEffect(() => {
    const clip = gltf.animations[0];

    if (clip) {
      onReady(clip, url);
    }
  }, [gltf, url, onReady]);

  return null;
}

function RobotModel({
  request,
  onFinished,
}: {
  request: Request;
  onFinished: () => void;
}) {
  const gltf = useGLTF(IDLE);

  // Keep the proven compatible animated rig.
  const model = useMemo(
    () => SkeletonUtils.clone(gltf.scene),
    [gltf.scene]
  );

  const mixer = useMemo(
    () => new AnimationMixer(model),
    [model]
  );

  const head = useMemo(() => findHead(model), [model]);

  const framing = useMemo(() => {
    model.updateMatrixWorld(true);

    const bounds = new Box3().setFromObject(model);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());

    return {
      scale:
        2.3 / Math.max(size.x, size.y, size.z, 0.001),
      center: [
        -center.x,
        -center.y,
        -center.z,
      ] as [number, number, number],
    };
  }, [model]);

  const currentAction = useRef<AnimationAction | null>(
    null
  );

  const pointer = useRef({ x: 0, y: 0 });
  const gaze = useRef({ x: 0, y: 0 });

  const yaw = useMemo(() => new Quaternion(), []);
  const pitch = useMemo(() => new Quaternion(), []);
  const correction = useMemo(() => new Quaternion(), []);
  const previousCorrection = useMemo(
    () => new Quaternion(),
    []
  );
  const inverse = useMemo(() => new Quaternion(), []);

  const selectedURL = BASE + FILES[request.clip];
  const isIdle = request.clip === "idle";

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

    return () => {
      window.removeEventListener("pointermove", move);
    };
  }, []);

  const activate = useCallback(
    (clip: AnimationClip, url: string) => {
      if (url !== selectedURL) return;

      const previous = currentAction.current;
      const next = mixer.clipAction(clip);

      next.reset();
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.setEffectiveTimeScale(1);

      next.setLoop(
        isIdle ? LoopRepeat : LoopOnce,
        isIdle ? Infinity : 1
      );

      next.clampWhenFinished = !isIdle;
      next.play();

      if (previous && previous !== next) {
        next.crossFadeFrom(previous, 0.3, false);
      }

      currentAction.current = next;
    },
    [mixer, selectedURL, isIdle, request.serial]
  );

  useEffect(() => {
    const finished = (
      event: { action: AnimationAction }
    ) => {
      if (event.action === currentAction.current) {
        onFinished();
      }
    };

    mixer.addEventListener("finished", finished);

    return () => {
      mixer.removeEventListener("finished", finished);
    };
  }, [mixer, onFinished]);

  useEffect(() => {
    return () => {
      mixer.stopAllAction();
    };
  }, [mixer]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    // Undo the previous cursor correction before
    // the animation mixer updates the skeleton.
    if (head) {
      inverse.copy(previousCorrection).invert();
      head.quaternion.multiply(inverse);
    }

    mixer.update(dt);

    const alpha = 1 - Math.exp(-7 * dt);

    // Cursor head tracking is exclusive to idle.
    gaze.current.x = MathUtils.lerp(
      gaze.current.x,
      isIdle ? pointer.current.x : 0,
      alpha
    );

    gaze.current.y = MathUtils.lerp(
      gaze.current.y,
      isIdle ? pointer.current.y : 0,
      alpha
    );

    if (!head) return;

    // Verified KitCart rig axes:
    // Y = horizontal, Z = vertical.
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
        <ClipLoader
          url={selectedURL}
          onReady={activate}
        />
      </Suspense>
    </>
  );
}

export default function RobotLoginPreview({
  usernameFocused,
  passwordFocused,
  onPatternChange,
}: {
  usernameFocused: boolean;
  passwordFocused: boolean;
  onPatternChange?: (pattern: string) => void;
}) {
  const [request, setRequest] = useState<Request>({
    clip: "idle",
    serial: 0,
  });

  const lastPassword = useRef<PasswordPattern | null>(
    null
  );

  const lastUsername = useRef<UsernamePattern | null>(
    null
  );

  const modeRef = useRef<Mode>("idle");
  const queue = useRef<Clip[]>([]);

  const play = useCallback((clip: Clip) => {
    setRequest((previous) => ({
      clip,
      serial: previous.serial + 1,
    }));
  }, []);

  useEffect(() => {
    // Password reactions always have higher priority.
    const nextMode: Mode = passwordFocused
      ? "password"
      : usernameFocused
        ? "username"
        : "idle";

    // Changing characters must never retrigger a clip.
    if (modeRef.current === nextMode) return;

    modeRef.current = nextMode;
    queue.current = [];

    if (nextMode === "idle") {
      play("idle");
      onPatternChange?.("Idle");
      return;
    }

    if (nextMode === "username") {
      // Two choices; prevent consecutive repetition.
      const chosen: UsernamePattern =
        lastUsername.current === "stretch"
          ? "clapping"
          : lastUsername.current === "clapping"
            ? "stretch"
            : Math.random() < 0.5
              ? "stretch"
              : "clapping";

      lastUsername.current = chosen;

      play(chosen);

      onPatternChange?.(
        chosen === "stretch"
          ? "Username — Stretch"
          : "Username — Clapping"
      );

      return;
    }

    // Existing password pattern logic preserved:
    // Three choices, excluding the previous pattern.
    const choices: PasswordPattern[] = (
      [1, 2, 3] as PasswordPattern[]
    ).filter(
      (value) => value !== lastPassword.current
    );

    const chosen =
      choices[Math.floor(Math.random() * choices.length)];

    lastPassword.current = chosen;

    if (chosen === 1) {
      play("sneak");
      onPatternChange?.(
        "Password — Sneak 2"
      );
    } else if (chosen === 2) {
      play("head");
      onPatternChange?.(
        "Password — Sneaky Head"
      );
    } else {
      queue.current = ["turn"];
      play("lean");
      onPatternChange?.(
        "Password — Side Lean → Turn"
      );
    }
  }, [
    usernameFocused,
    passwordFocused,
    play,
    onPatternChange,
  ]);

  const handleFinished = useCallback(() => {
    const next = queue.current.shift();

    if (next) {
      play(next);
      return;
    }

    if (modeRef.current === "username") {
      // Username reactions play only once.
      // Then the robot becomes idle and resumes gaze.
      play("idle");
      onPatternChange?.("Username — Idle");
    }

    // Password animations continue holding their
    // final pose until Show/Hide or focus changes.
  }, [play, onPatternChange]);

  return (
    <div className="h-full w-full">
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
          <RobotModel
            request={request}
            onFinished={handleFinished}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(IDLE);

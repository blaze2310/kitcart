
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
  LoopOnce,
  LoopRepeat,
  MathUtils,
  Object3D,
  Quaternion,
  SkinnedMesh,
  Vector3,
} from "three";

const BASE = "/models/kitcart/animations/stay-in-place/";
const IDLE = `${BASE}idle.glb`;

const CLIPS = [
  { id: "idle", file: "idle.glb", label: "Idle", group: "Basic" },
  {
    id: "peek1",
    file: "password+sneak+2.glb",
    label: "Password Sneak 2",
    group: "Password",
  },
  {
    id: "peek2",
    file: "sneaky+head+for+password.glb",
    label: "Sneaky Head",
    group: "Password",
  },
  {
    id: "lean",
    file: "side+lean+pose.glb",
    label: "Side Lean",
    group: "Password",
  },
  {
    id: "turn",
    file: "turn.glb",
    label: "Turn",
    group: "Password",
  },
  {
    id: "wave1",
    file: "greet+wave+sup.glb",
    label: "Greeting Wave 1",
    group: "Greeting",
  },
  {
    id: "wave2",
    file: "greet+wave+sup+2.glb",
    label: "Greeting Wave 2",
    group: "Greeting",
  },
  {
    id: "looking",
    file: "looking+around.glb",
    label: "Looking Around",
    group: "Attention",
  },
  {
    id: "fold",
    file: "fold+arms.glb",
    label: "Fold Arms",
    group: "Attention",
  },
  {
    id: "thumbsup",
    file: "thumbsup.glb",
    label: "Thumbs Up",
    group: "Success",
  },
  {
    id: "clapping",
    file: "clapping.glb",
    label: "Clapping",
    group: "Success",
  },
  {
    id: "sad",
    file: "sad.glb",
    label: "Sad",
    group: "Error",
  },
] as const;

type ClipId = (typeof CLIPS)[number]["id"];
type Pattern = 1 | 2 | 3;

type ClipRequest = {
  id: ClipId;
  serial: number;
};

type ClipInfo = {
  name: string;
  duration: number;
  tracks: number;
};

const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

const PATTERN_NAMES: Record<Pattern, string> = {
  1: "Password Sneak 2",
  2: "Sneaky Head",
  3: "Side Lean + Turn",
};

function findHeadBone(model: Object3D): Bone | null {
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

      return name === "mixamorighead" || name === "head";
    });

    if (head) return head;
  }

  return null;
}

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

    if (clip) {
      onReady(clip, url);
    }
  }, [gltf, url, onReady]);

  return null;
}

function Robot({
  request,
  playing,
  speed,
  tracking,
  restart,
  onLoaded,
  onFinished,
  onHeadFound,
}: {
  request: ClipRequest;
  playing: boolean;
  speed: number;
  tracking: boolean;
  restart: number;
  onLoaded: (info: ClipInfo) => void;
  onFinished: () => void;
  onHeadFound: (found: boolean) => void;
}) {
  const gltf = useGLTF(IDLE);

  // The compatible idle export remains our canonical mesh.
  const model = useMemo(
    () => SkeletonUtils.clone(gltf.scene),
    [gltf.scene]
  );

  const mixer = useMemo(
    () => new AnimationMixer(model),
    [model]
  );

  const head = useMemo(
    () => findHeadBone(model),
    [model]
  );

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

  const actionRef = useRef<AnimationAction | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const gaze = useRef({ x: 0, y: 0 });

  const yaw = useMemo(() => new Quaternion(), []);
  const pitch = useMemo(() => new Quaternion(), []);
  const correction = useMemo(() => new Quaternion(), []);
  const previousCorrection = useMemo(
    () => new Quaternion(),
    []
  );
  const inverseCorrection = useMemo(
    () => new Quaternion(),
    []
  );

  const clipDefinition = CLIPS.find(
    (clip) => clip.id === request.id
  )!;

  const selectedURL = BASE + clipDefinition.file;

  // No cursor influence during any non-idle animation.
  const effectiveTracking =
    tracking && request.id === "idle";

  useEffect(() => {
    onHeadFound(Boolean(head));
  }, [head, onHeadFound]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
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

    window.addEventListener(
      "pointermove",
      handlePointerMove
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );
    };
  }, []);

  const activateClip = useCallback(
    (clip: AnimationClip, url: string) => {
      if (url !== selectedURL) return;

      const previous = actionRef.current;
      const next = mixer.clipAction(clip);

      next.reset();
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.setEffectiveTimeScale(1);

      const isIdle = request.id === "idle";

      next.setLoop(
        isIdle ? LoopRepeat : LoopOnce,
        isIdle ? Infinity : 1
      );

      // Password poses stay at their final frame.
      next.clampWhenFinished = !isIdle;
      next.play();

      if (previous && previous !== next) {
        next.crossFadeFrom(previous, 0.3, false);
      }

      actionRef.current = next;

      onLoaded({
        name: clip.name || clipDefinition.label,
        duration: clip.duration,
        tracks: clip.tracks.length,
      });
    },
    [
      mixer,
      selectedURL,
      request.id,
      request.serial,
      clipDefinition.label,
      onLoaded,
    ]
  );

  useEffect(() => {
    const handleFinished = (
      event: { action: AnimationAction }
    ) => {
      if (event.action === actionRef.current) {
        onFinished();
      }
    };

    mixer.addEventListener("finished", handleFinished);

    return () => {
      mixer.removeEventListener(
        "finished",
        handleFinished
      );
    };
  }, [mixer, onFinished]);

  useEffect(() => {
    if (restart > 0) {
      actionRef.current?.reset().play();
    }
  }, [restart]);

  useEffect(() => {
    return () => {
      mixer.stopAllAction();
    };
  }, [mixer]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    // Remove last frame's procedural rotation first.
    if (head) {
      inverseCorrection
        .copy(previousCorrection)
        .invert();

      head.quaternion.multiply(inverseCorrection);
    }

    // Full-body GLB animation.
    mixer.update(playing ? dt * speed : 0);

    const alpha = 1 - Math.exp(-7 * dt);

    gaze.current.x = MathUtils.lerp(
      gaze.current.x,
      effectiveTracking ? pointer.current.x : 0,
      alpha
    );

    gaze.current.y = MathUtils.lerp(
      gaze.current.y,
      effectiveTracking ? pointer.current.y : 0,
      alpha
    );

    if (!head) return;

    // During non-idle the residual gaze fades to zero.
    // GLB animation controls the head afterwards.
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
          url={selectedURL}
          onReady={activateClip}
        />
      </Suspense>
    </>
  );
}

export default function RobotTripoTest() {
  const [request, setRequest] = useState<ClipRequest>({
    id: "idle",
    serial: 0,
  });

  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [tracking, setTracking] = useState(true);
  const [restart, setRestart] = useState(0);

  const [headFound, setHeadFound] = useState(false);
  const [info, setInfo] = useState<ClipInfo | null>(null);

  const [pattern, setPattern] = useState<Pattern | null>(
    null
  );

  const [completed, setCompleted] = useState(false);

  const lastPattern = useRef<Pattern | null>(null);
  const queue = useRef<ClipId[]>([]);

  const selectedClip = CLIPS.find(
    (clip) => clip.id === request.id
  )!;

  const effectiveTracking =
    tracking && request.id === "idle";

  const playClip = useCallback((id: ClipId) => {
    setRequest((previous) => ({
      id,
      serial: previous.serial + 1,
    }));

    setInfo(null);
    setCompleted(false);
    setPlaying(true);
  }, []);

  const selectManualClip = (id: ClipId) => {
    queue.current = [];
    setPattern(null);
    playClip(id);
  };

  const startRandomPassword = () => {
    // The same pattern cannot be chosen consecutively.
    const choices: Pattern[] = ([1, 2, 3] as Pattern[])
      .filter((item) => item !== lastPattern.current);

    const chosen =
      choices[Math.floor(Math.random() * choices.length)];

    lastPattern.current = chosen;
    setPattern(chosen);

    // Pattern 3 plays two complete clips sequentially.
    queue.current = chosen === 3 ? ["turn"] : [];

    const firstClip: ClipId =
      chosen === 1
        ? "peek1"
        : chosen === 2
          ? "peek2"
          : "lean";

    playClip(firstClip);
  };

  const returnToIdle = () => {
    queue.current = [];
    setPattern(null);
    playClip("idle");
  };

  const handleFinished = useCallback(() => {
    const next = queue.current.shift();

    if (next) {
      playClip(next);
    } else {
      // AnimationAction.clampWhenFinished keeps the pose.
      setCompleted(true);
    }
  }, [playClip]);

  return (
    <div className="w-full space-y-5">
      <div className="h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-[#11142B]">
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
            <Robot
              request={request}
              playing={playing}
              speed={speed}
              tracking={tracking}
              restart={restart}
              onLoaded={setInfo}
              onFinished={handleFinished}
              onHeadFound={setHeadFound}
            />
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

      {/* RANDOM PASSWORD CONTROLLER */}
      <div className="rounded-2xl border border-[#A8A2FF]/40 bg-white/5 p-5">
        <h2 className="mb-2 text-lg font-bold text-white">
          Random Password Animation Controller
        </h2>

        <p className="mb-4 text-sm text-white/60">
          Simulate focusing and leaving the password
          field. One of three approved patterns is
          selected without repeating the previous one.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={startRandomPassword}
            className="rounded-xl bg-[#6658D9] px-6 py-3 font-semibold text-white"
          >
            Test Password Focus
          </button>

          <button
            onClick={returnToIdle}
            className="rounded-xl border border-cyan-400/40 px-6 py-3 font-semibold text-cyan-300"
          >
            Password Blur / Return to Idle
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-[#11142B] p-4 text-sm text-white/75">
          <p>
            Selected pattern:{" "}
            <span className="font-semibold text-cyan-300">
              {pattern
                ? `Pattern ${pattern} — ${PATTERN_NAMES[pattern]}`
                : "None"}
            </span>
          </p>

          <p className="mt-2">
            Status:{" "}
            {pattern
              ? completed
                ? "Final pose held"
                : "Animation playing / transitioning"
              : "Normal preview mode"}
          </p>

          <p className="mt-2">
            Cursor tracking:{" "}
            {effectiveTracking ? "ON" : "OFF"}
          </p>
        </div>
      </div>

      {/* NORMAL PLAYBACK */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 font-bold text-white">
          Playback Controls
        </h2>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPlaying((value) => !value)}
            className="rounded-xl bg-[#6658D9] px-5 py-2.5 text-white"
          >
            {playing ? "Pause" : "Play"}
          </button>

          <button
            onClick={() => {
              queue.current = [];
              setRestart((value) => value + 1);
              setCompleted(false);
              setPlaying(true);
            }}
            className="rounded-xl border border-white/20 px-5 py-2.5 text-white"
          >
            Restart Current Clip
          </button>

          <button
            onClick={() => setTracking((value) => !value)}
            disabled={request.id !== "idle"}
            className="rounded-xl border border-white/20 px-5 py-2.5 text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Tracking:{" "}
            {request.id !== "idle"
              ? "AUTO OFF"
              : effectiveTracking
                ? "ON"
                : "OFF"}
          </button>

          <select
            value={speed}
            onChange={(event) =>
              setSpeed(Number(event.target.value))
            }
            className="rounded-xl border border-white/20 bg-[#11142B] px-4 py-2.5 text-white"
          >
            <option value={0.5}>0.5× Speed</option>
            <option value={0.75}>0.75× Speed</option>
            <option value={1}>1× Speed</option>
            <option value={1.25}>1.25× Speed</option>
            <option value={1.5}>1.5× Speed</option>
          </select>
        </div>
      </div>

      {/* ANIMATION LIBRARY */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 font-bold text-white">
          Animation Library
        </h2>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {CLIPS.map((clip) => (
            <button
              key={clip.id}
              onClick={() => selectManualClip(clip.id)}
              className={`rounded-xl border px-3 py-3 text-left ${
                request.id === clip.id
                  ? "border-[#A8A2FF] bg-[#6658D9] text-white"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              <span className="block text-sm font-semibold">
                {clip.label}
              </span>

              <span className="mt-1 block text-xs opacity-65">
                {clip.group}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* DIAGNOSTICS */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
        <h2 className="mb-2 font-bold text-cyan-300">
          Playback Information
        </h2>

        <p>Selected: {selectedClip.label}</p>
        <p>GLB: {selectedClip.file}</p>
        <p>Canonical model: idle.glb</p>
        <p>
          Head bone:{" "}
          {headFound ? "FOUND" : "NOT FOUND"}
        </p>

        <p>
          Tracking:{" "}
          {effectiveTracking ? "ACTIVE" : "DISABLED"}
        </p>

        <p>
          Clip:{" "}
          {info?.name ?? "Loading animation..."}
        </p>

        <p>
          Duration:{" "}
          {info
            ? `${info.duration.toFixed(2)}s`
            : "—"}
        </p>

        <p>
          Animation tracks: {info?.tracks ?? "—"}
        </p>

        <p>
          Playback:{" "}
          {playing ? "Playing" : "Paused"}
        </p>
      </div>
    </div>
  );
}

useGLTF.preload(IDLE);

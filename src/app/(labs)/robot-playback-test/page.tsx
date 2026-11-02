
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

import Robot3D, {
  type RobotActionRequest,
  type RobotDiagnostics,
} from "@/features/robot/3d/Robot3D";

import {
  getRobotAnimation,
  getRobotAnimationUrl,
  ROBOT_MODEL_URL,
  type RobotAnimationId,
  type RobotPlaybackMode,
} from "@/features/robot/3d/animation/animationRegistry";

import type {
  Expression,
} from "@/features/robot/2d/robot-face";

const TEST_ACTIONS: RobotAnimationId[] = [
  "idle",
  "wave",
  "clapping",
  "stretch",
  "peek",
  "head",
  "lean",
  "turn",
  "sad",
];

const TEST_MODES: RobotPlaybackMode[] = [
  "loop",
  "once",
  "hold",
];

export default function RobotPlaybackTestPage() {
  const [request, setRequest] =
    useState<RobotActionRequest>({
      id: "idle",
      serial: 0,
      mode: "loop",
    });

  const [selectedMode, setSelectedMode] =
    useState<RobotPlaybackMode>("once");

  const [expression, setExpression] =
    useState<Expression>("normal");

  const [currentAction, setCurrentAction] =
    useState<RobotAnimationId>("idle");

  const [status, setStatus] =
    useState("Idle looping");

  const [diagnostics, setDiagnostics] =
    useState<RobotDiagnostics | null>(null);

  const [blinking, setBlinking] =
    useState(false);

  const [tracking, setTracking] =
    useState(true);

  const [playing, setPlaying] =
    useState(true);

  const [events, setEvents] =
    useState<string[]>([]);

  const blinkTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const logEvent = useCallback(
    (message: string) => {
      setEvents((previous) =>
        [message, ...previous].slice(0, 12)
      );
    },
    []
  );

  const selectAction = useCallback(
    (
      id: RobotAnimationId,
      mode: RobotPlaybackMode
    ) => {
      setRequest((previous) => ({
        id,
        mode,
        serial: previous.serial + 1,
      }));

      setPlaying(true);

      setStatus(
        `Loading ${getRobotAnimation(id).label}...`
      );
    },
    []
  );

  const returnToIdle = useCallback(() => {
    selectAction("idle", "loop");
  }, [selectAction]);

  const onActionStarted = useCallback(
    (
      id: RobotAnimationId,
      face: Expression
    ) => {
      setCurrentAction(id);
      setExpression(face);

      setStatus(
        `${getRobotAnimation(id).label} active`
      );

      logEvent(
        `Started: ${getRobotAnimation(id).label}`
      );
    },
    [logEvent]
  );

  const onActionCompleted = useCallback(
    (id: RobotAnimationId) => {
      logEvent(
        `Completed: ${getRobotAnimation(id).label}`
      );

      setStatus(
        `${getRobotAnimation(id).label} completed`
      );
    },
    [logEvent]
  );

  const onDiagnostics = useCallback(
    (data: RobotDiagnostics) => {
      setDiagnostics(data);
    },
    []
  );

  const blink = useCallback(() => {
    if (blinkTimer.current !== null) {
      clearTimeout(blinkTimer.current);
    }

    setBlinking(true);

    blinkTimer.current = setTimeout(() => {
      setBlinking(false);
      blinkTimer.current = null;
    }, 130);
  }, []);

  useEffect(() => {
    return () => {
      if (blinkTimer.current !== null) {
        clearTimeout(blinkTimer.current);
      }
    };
  }, []);

  const definition = getRobotAnimation(
    request.id
  );

  return (
    <main className="min-h-screen bg-[#11142B] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A8A2FF]">
            KitCart Robot Engineering
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Animation Playback Verification
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Test full-duration looping,
            one-time playback,
            and final-pose holding.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-[650px] overflow-hidden rounded-3xl border border-white/10">
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
                <Robot3D
                  request={request}
                  expression={expression}
                  blinking={blinking}
                  playing={playing}
                  tracking={tracking}
                  onActionStarted={
                    onActionStarted
                  }
                  onActionCompleted={
                    onActionCompleted
                  }
                  onDiagnostics={
                    onDiagnostics
                  }
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

          <div className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="font-bold">
                Playback Mode
              </h2>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {TEST_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setSelectedMode(mode)
                    }
                    className={`rounded-xl border px-3 py-3 text-sm capitalize ${
                      selectedMode === mode
                        ? "border-cyan-300 bg-[#6658D9]"
                        : "border-white/15 bg-[#11142B]"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs text-white/60">
                Choose a playback mode, then
                select an animation below.
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="font-bold">
                Select Animation
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {TEST_ACTIONS.map((id) => {
                  const animation =
                    getRobotAnimation(id);

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        selectAction(
                          id,
                          id === "idle"
                            ? "loop"
                            : selectedMode
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-left text-sm ${
                        request.id === id
                          ? "border-cyan-300 bg-[#6658D9]"
                          : "border-white/15 bg-[#11142B]"
                      }`}
                    >
                      {animation.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={returnToIdle}
                  className="rounded-xl bg-[#6658D9] px-4 py-2 text-sm"
                >
                  Return to Idle
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPlaying((value) => !value)
                  }
                  className="rounded-xl border border-white/20 px-4 py-2 text-sm"
                >
                  {playing ? "Pause" : "Play"}
                </button>

                <button
                  type="button"
                  onClick={blink}
                  className="rounded-xl border border-white/20 px-4 py-2 text-sm"
                >
                  Blink Now
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTracking((value) => !value)
                  }
                  className="rounded-xl border border-white/20 px-4 py-2 text-sm"
                >
                  Tracking:{" "}
                  {tracking ? "ON" : "OFF"}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="font-bold">
                Current State
              </h2>

              <div className="mt-3 space-y-2 text-sm text-white/75">
                <p>
                  Requested:{" "}
                  <strong>{definition.label}</strong>
                </p>

                <p>
                  Active:{" "}
                  <strong>
                    {
                      getRobotAnimation(
                        currentAction
                      ).label
                    }
                  </strong>
                </p>

                <p>
                  Playback mode:{" "}
                  <strong className="capitalize">
                    {request.mode}
                  </strong>
                </p>

                <p>
                  Face:{" "}
                  <strong className="capitalize">
                    {expression.replace("-", " ")}
                  </strong>
                </p>

                <p>
                  Last clip duration:{" "}
                  <strong>
                    {diagnostics
                      ? `${diagnostics.duration.toFixed(2)}s`
                      : "—"}
                  </strong>
                </p>

                <p>
                  Status:{" "}
                  <strong>{status}</strong>
                </p>

                <p>
                  Head bone:{" "}
                  <strong>
                    {diagnostics
                      ? diagnostics.headFound
                        ? "FOUND"
                        : "MISSING"
                      : "Checking"}
                  </strong>
                </p>

                <p>
                  Shared skeleton:{" "}
                  <strong>
                    {diagnostics
                      ? diagnostics.sharedSkeleton
                        ? "YES"
                        : "NO"
                      : "Checking"}
                  </strong>
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="font-bold">
                Playback Event Log
              </h2>

              <div className="mt-3 space-y-2 text-xs text-white/70">
                {events.length === 0 ? (
                  <p>No events yet.</p>
                ) : (
                  events.map((event, index) => (
                    <p
                      key={`${index}-${event}`}
                      className="rounded-lg bg-white/5 px-3 py-2"
                    >
                      {event}
                    </p>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

for (const id of TEST_ACTIONS) {
  useGLTF.preload(
    getRobotAnimationUrl(id)
  );
}

useGLTF.preload(ROBOT_MODEL_URL);

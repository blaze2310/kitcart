
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

import {
  ALL_VISOR_EXPRESSIONS,
  type Expression,
} from "@/features/robot/2d/robot-face";

import Robot3D, {
  type RobotActionRequest,
  type RobotDiagnostics,
} from "@/features/robot/3d/Robot3D";

import {
  getRobotAnimation,
  getRobotPreloadUrls,
  ROBOT_ANIMATION_IDS,
  type RobotAnimationId,
} from "@/features/robot/3d/animation/animationRegistry";

export default function RobotModularTestPage() {
  const [request, setRequest] =
    useState<RobotActionRequest>({
      id: "idle",
      serial: 0,
    });

  const [expression, setExpression] =
    useState<Expression>("normal");

  const [manualOverride, setManualOverride] =
    useState(false);

  const [playing, setPlaying] =
    useState(true);

  const [speed, setSpeed] =
    useState(1);

  const [tracking, setTracking] =
    useState(true);

  const [showFace, setShowFace] =
    useState(true);

  const [autoBlink, setAutoBlink] =
    useState(true);

  const [blinking, setBlinking] =
    useState(false);

  const [diagnostics, setDiagnostics] =
    useState<RobotDiagnostics | null>(
      null
    );

  const blinkTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const handleActionStarted = useCallback(
    (
      _id: RobotAnimationId,
      face: Expression
    ) => {
      setExpression(face);
      setManualOverride(false);
    },
    []
  );

  const handleDiagnostics = useCallback(
    (status: RobotDiagnostics) => {
      setDiagnostics(status);
    },
    []
  );

  const selectAction = useCallback(
    (id: RobotAnimationId) => {
      setRequest((previous) => ({
        id,
        serial: previous.serial + 1,
      }));

      setPlaying(true);
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
    if (!autoBlink) return;

    let cancelled = false;
    let timer: ReturnType<
      typeof setTimeout
    >;

    function schedule() {
      timer = setTimeout(() => {
        if (cancelled) return;

        blink();
        schedule();
      }, 2500 + Math.random() * 2500);
    }

    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [autoBlink, blink]);

  useEffect(() => {
    return () => {
      if (blinkTimer.current !== null) {
        clearTimeout(blinkTimer.current);
      }
    };
  }, []);

  const activeDefinition =
    getRobotAnimation(request.id);

  const restoreExpression = () => {
    setExpression(
      activeDefinition.expression
    );
    setManualOverride(false);
  };

  return (
    <main className="min-h-screen bg-[#11142B] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A8A2FF]">
            KitCart Robot Development
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Modular 3D Robot Test
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Reusable robot component with
            separate animation, visor,
            and expression modules.
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
                  speed={speed}
                  tracking={tracking}
                  showFace={showFace}
                  onActionStarted={
                    handleActionStarted
                  }
                  onDiagnostics={
                    handleDiagnostics
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
                Animations
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {ROBOT_ANIMATION_IDS.map(
                  (id) => {
                    const action =
                      getRobotAnimation(id);

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          selectAction(id)
                        }
                        className={`rounded-xl border px-3 py-3 text-left ${
                          request.id === id
                            ? "border-cyan-300 bg-[#6658D9]"
                            : "border-white/15 bg-[#11142B]"
                        }`}
                      >
                        <span className="block text-sm font-semibold">
                          {action.label}
                        </span>

                        <span className="mt-1 block text-xs capitalize text-white/65">
                          Face:{" "}
                          {action.expression.replace(
                            "-",
                            " "
                          )}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPlaying(
                      (value) => !value
                    )
                  }
                  className="rounded-xl bg-[#6658D9] px-4 py-2 text-sm"
                >
                  {playing
                    ? "Pause"
                    : "Play"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    selectAction(request.id)
                  }
                  className="rounded-xl border border-white/20 px-4 py-2 text-sm"
                >
                  Restart
                </button>

                <select
                  value={speed}
                  onChange={(event) =>
                    setSpeed(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="rounded-xl border border-white/20 bg-[#11142B] px-3 py-2 text-sm"
                >
                  <option value={0.5}>
                    0.5×
                  </option>
                  <option value={0.75}>
                    0.75×
                  </option>
                  <option value={1}>
                    1×
                  </option>
                  <option value={1.25}>
                    1.25×
                  </option>
                  <option value={1.5}>
                    1.5×
                  </option>
                </select>

                <button
                  type="button"
                  disabled={
                    request.id !== "idle"
                  }
                  onClick={() =>
                    setTracking(
                      (value) => !value
                    )
                  }
                  className="rounded-xl border border-cyan-300/40 px-4 py-2 text-sm disabled:opacity-40"
                >
                  Tracking:{" "}
                  {request.id !== "idle"
                    ? "AUTO OFF"
                    : tracking
                      ? "ON"
                      : "OFF"}
                </button>
              </div>

              <p className="mt-3 text-xs text-white/60">
                Animations loop for their
                native GLB duration.
                Idle tracking returns to
                neutral after 5 seconds
                without mouse movement.
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="font-bold">
                Expressions
              </h2>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {ALL_VISOR_EXPRESSIONS.map(
                  (face) => (
                    <button
                      key={face}
                      type="button"
                      onClick={() => {
                        setExpression(face);
                        setManualOverride(true);
                      }}
                      className={`rounded-lg border px-2 py-2 text-xs capitalize ${
                        expression === face
                          ? "border-cyan-300 bg-[#6658D9]"
                          : "border-white/15 bg-[#11142B]"
                      }`}
                    >
                      {face.replace(
                        "-",
                        " "
                      )}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={
                  restoreExpression
                }
                className="mt-3 w-full rounded-xl border border-[#A8A2FF]/50 px-3 py-2 text-sm"
              >
                Restore Automatic Expression
              </button>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={blink}
                  className="rounded-xl border border-cyan-300/40 px-3 py-2 text-sm"
                >
                  Blink Now
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAutoBlink(
                      (value) => !value
                    )
                  }
                  className="rounded-xl border border-cyan-300/40 px-3 py-2 text-sm"
                >
                  Auto Blink:{" "}
                  {autoBlink
                    ? "ON"
                    : "OFF"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowFace(
                      (value) => !value
                    )
                  }
                  className="col-span-2 rounded-xl border border-white/20 px-3 py-2 text-sm"
                >
                  Facial Display:{" "}
                  {showFace
                    ? "ON"
                    : "OFF"}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <h2 className="font-bold">
                Diagnostics
              </h2>

              <div className="mt-3 space-y-2 text-white/75">
                <p>
                  Playing:{" "}
                  <strong>
                    {diagnostics?.label ??
                      "Loading..."}
                  </strong>
                </p>

                <p>
                  Requested:{" "}
                  <strong>
                    {activeDefinition.label}
                  </strong>
                </p>

                <p>
                  Expression:{" "}
                  <strong className="capitalize">
                    {expression.replace(
                      "-",
                      " "
                    )}
                  </strong>
                </p>

                <p>
                  Expression mode:{" "}
                  <strong>
                    {manualOverride
                      ? "MANUAL"
                      : "AUTOMATIC"}
                  </strong>
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

                <p>
                  GLB duration:{" "}
                  <strong>
                    {diagnostics
                      ? `${diagnostics.duration.toFixed(2)}s`
                      : "—"}
                  </strong>
                </p>

                <p>
                  Animation tracks:{" "}
                  <strong>
                    {diagnostics?.tracks ??
                      "—"}
                  </strong>
                </p>

                <p>
                  Visor:{" "}
                  <strong>
                    V4 / 444 triangles
                  </strong>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

// Only the isolated development page preloads
// every registered test animation.
for (const url of getRobotPreloadUrls("core")) {
  useGLTF.preload(url);
}
for (const url of getRobotPreloadUrls("login")) {
  useGLTF.preload(url);
}

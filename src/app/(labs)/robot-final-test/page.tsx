
"use client";

import {
  Suspense,
  useCallback,
  useState,
} from "react";

import {
  Canvas,
  useFrame,
  useThree,
} from "@react-three/fiber";

import { OrbitControls } from "@react-three/drei";

import type {
  Expression,
} from "@/components/mascot/robot-face";

import Robot3D, {
  type RobotActionRequest,
} from "@/components/robot/Robot3D";

import {
  getRobotAnimation,
  type RobotAnimationId,
} from "@/components/robot/animation/animationRegistry";

const ACTIONS: RobotAnimationId[] = [
  "idle",
  "wave",
  "clapping",
  "stretch",
  "peek",
  "head",
  "turn",
];

const EXPRESSIONS: Expression[] = [
  "normal",
  "happy",
  "surprised",
  "thinking",
  "confused",
  "wink",
  "loved",
  "sad",
  "sleepy",
  "curious",
  "eyes-closed",
  "focused",
];

function RendererStats({
  onSample,
}: {
  onSample: (textures: number) => void;
}) {
  const { gl } = useThree();

  useFrame((state) => {
    if (state.clock.elapsedTime % 2 < 0.035) {
      onSample(gl.info.memory.textures);
    }
  });

  return null;
}

export default function RobotFinalTestPage() {
  const [request, setRequest] =
    useState<RobotActionRequest>({
      id: "idle",
      serial: 0,
      mode: "loop",
    });

  const [expression, setExpression] =
    useState<Expression>("normal");

  const [autoBlink, setAutoBlink] =
    useState(true);

  const [manualBlink, setManualBlink] =
    useState(false);

  const [tracking, setTracking] =
    useState(true);

  const [textures, setTextures] =
    useState<number | null>(null);

  const [activeAction, setActiveAction] =
    useState<RobotAnimationId>("idle");

  const onActionStarted = useCallback(
    (
      id: RobotAnimationId,
      face: Expression
    ) => {
      setActiveAction(id);
      setExpression(face);
    },
    []
  );

  const selectAction = (
    id: RobotAnimationId
  ) => {
    setRequest((previous) => ({
      id,
      mode: "loop",
      serial: previous.serial + 1,
    }));
  };

  const blinkNow = () => {
    setManualBlink(true);

    window.setTimeout(() => {
      setManualBlink(false);
    }, 130);
  };

  return (
    <main className="min-h-screen bg-[#11142B] p-5 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">
          KitCart — Final Robot Verification
        </h1>

        <p className="mt-2 text-sm text-white/60">
          Automatic blinking, expressions,
          animation playback and GPU texture
          monitoring.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-[650px] overflow-hidden rounded-3xl border border-white/10">
            <Canvas
              camera={{
                position: [0, 0, 4.2],
                fov: 35,
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
                  autoBlink={autoBlink}
                  blinking={manualBlink}
                  tracking={tracking}
                  onActionStarted={
                    onActionStarted
                  }
                />
              </Suspense>

              <RendererStats
                onSample={setTextures}
              />

              <OrbitControls
                enablePan={false}
                enableDamping
              />
            </Canvas>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="font-bold">
                Blink Controls
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setAutoBlink((v) => !v)
                  }
                  className="rounded-xl bg-[#6658D9] p-3 text-sm"
                >
                  Auto Blink:{" "}
                  {autoBlink ? "ON" : "OFF"}
                </button>

                <button
                  type="button"
                  onClick={blinkNow}
                  className="rounded-xl border border-white/20 p-3 text-sm"
                >
                  Blink Now
                </button>
              </div>

              <p className="mt-3 text-xs text-white/60">
                With Auto Blink ON, the robot
                should blink every 2.5–5
                seconds without interrupting
                body movement.
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="font-bold">
                Animations
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {ACTIONS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      selectAction(id)
                    }
                    className={`rounded-xl border p-3 text-left text-sm ${
                      request.id === id
                        ? "border-cyan-300 bg-[#6658D9]"
                        : "border-white/15"
                    }`}
                  >
                    {
                      getRobotAnimation(id)
                        .label
                    }
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="font-bold">
                Facial Expressions
              </h2>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {EXPRESSIONS.map((face) => (
                  <button
                    key={face}
                    type="button"
                    onClick={() =>
                      setExpression(face)
                    }
                    className={`rounded-lg border p-2 text-xs ${
                      expression === face
                        ? "border-cyan-300 bg-[#6658D9]"
                        : "border-white/15"
                    }`}
                  >
                    {face}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <h2 className="font-bold">
                Diagnostics
              </h2>

              <p className="mt-3">
                Active animation:{" "}
                <strong>{activeAction}</strong>
              </p>

              <p className="mt-2">
                Expression:{" "}
                <strong>{expression}</strong>
              </p>

              <p className="mt-2">
                Renderer textures:{" "}
                <strong>
                  {textures ?? "Loading"}
                </strong>
              </p>

              <p className="mt-2 text-xs text-white/60">
                Texture count should stabilize
                after assets finish loading.
                It may change when new GLBs
                load, but blinking alone should
                not continually increase it.
              </p>

              <button
                type="button"
                onClick={() =>
                  setTracking((v) => !v)
                }
                className="mt-3 rounded-xl border border-white/20 px-4 py-2"
              >
                Tracking:{" "}
                {tracking ? "ON" : "OFF"}
              </button>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

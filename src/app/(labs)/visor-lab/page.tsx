
"use client";

import { useId, useState } from "react";
import Link from "next/link";
import RobotFace, {
  ALL_VISOR_EXPRESSIONS,
  type Expression,
} from "@/features/robot/2d/robot-face";

const ORIGINAL = new Set<Expression>([
  "normal",
  "happy",
  "surprised",
  "thinking",
  "confused",
  "wink",
  "loved",
]);

export default function VisorLabPage() {
  const [expression, setExpression] =
    useState<Expression>("normal");

  const [blinking, setBlinking] = useState(false);
  const [eyeX, setEyeX] = useState(0);
  const [eyeY, setEyeY] = useState(0);

  const id = useId().replace(/:/g, "");
  const glowId = `visor-lab-glow-${id}`;
  const clipId = `visor-lab-clip-${id}`;

  return (
    <main className="min-h-screen bg-[#11142B] px-5 py-8 text-[#F7F8FC]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#A8A2FF]">
              KitCart Robot Development
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Visor Expression Laboratory
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Review and approve all 13 expressions before
              integration with the animated 3D head.
            </p>
          </div>

          <Link
            href="/login-preview"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
          >
            Login Preview
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0B0D19] p-5 sm:p-8">
          <svg
            viewBox="250 190 620 420"
            className="mx-auto w-full max-w-[680px]"
            role="img"
            aria-label={`${expression} robot visor expression`}
          >
            <defs>
              <filter id={glowId} filterUnits="userSpaceOnUse" x="0" y="0" width="1142" height="1378">
                <feGaussianBlur stdDeviation="4" />
              </filter>

              <clipPath id={clipId}>
                <ellipse
                  cx="560"
                  cy="396"
                  rx="255"
                  ry="162"
                />
              </clipPath>
            </defs>

            {/* Preview outline only: not the 3D helmet. */}
            <ellipse
              cx="560"
              cy="396"
              rx="272"
              ry="178"
              fill="#E9EDF7"
            />
            <ellipse
              cx="560"
              cy="396"
              rx="255"
              ry="162"
              fill="#05080E"
            />

            <g clipPath={`url(#${clipId})`}>
              <RobotFace
                expression={expression}
                blinking={blinking}
                glowId={glowId}
                eyeX={eyeX}
                eyeY={eyeY}
                smileX={0}
                smileY={0}
              />
            </g>
          </svg>

          <div className="mt-4 text-center">
            <p className="text-lg font-semibold capitalize text-[#8FEFFF]">
              {expression.replace("-", " ")}
            </p>
            <p className="mt-1 text-xs text-white/50">
              {ORIGINAL.has(expression)
                ? "Original approved expression"
                : "New expression — pending visual approval"}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 font-semibold">
            Choose Expression
          </h2>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {ALL_VISOR_EXPRESSIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setExpression(item)}
                aria-pressed={expression === item}
                className={`rounded-xl border px-3 py-3 text-left capitalize transition ${
                  expression === item
                    ? "border-[#8FEFFF] bg-[#6658D9] text-white"
                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {item.replace("-", " ")}
                <span className="mt-1 block text-[10px] text-white/50">
                  {ORIGINAL.has(item)
                    ? "Original"
                    : "New"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 font-semibold">
            Visor Behavior Tests
          </h2>

          <button
            type="button"
            onClick={() => setBlinking((value) => !value)}
            className="mb-5 rounded-xl bg-[#6658D9] px-5 py-2.5 text-sm font-medium text-white"
          >
            {blinking ? "Release Blink" : "Hold Blink"}
          </button>

          <label className="mb-2 block text-sm text-white/70">
            Eye movement X: {eyeX}
          </label>
          <input
            type="range"
            min="-18"
            max="18"
            value={eyeX}
            onChange={(event) =>
              setEyeX(Number(event.target.value))
            }
            className="mb-5 w-full accent-[#8FEFFF]"
          />

          <label className="mb-2 block text-sm text-white/70">
            Eye movement Y: {eyeY}
          </label>
          <input
            type="range"
            min="-12"
            max="12"
            value={eyeY}
            onChange={(event) =>
              setEyeY(Number(event.target.value))
            }
            className="w-full accent-[#8FEFFF]"
          />

          <button
            type="button"
            onClick={() => {
              setEyeX(0);
              setEyeY(0);
              setBlinking(false);
            }}
            className="mt-4 rounded-xl border border-white/20 px-5 py-2.5 text-sm text-white"
          >
            Reset Face
          </button>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-white/50">
          This page tests face geometry, cyan glow, blinking,
          and eye offsets. Once approved, we will transfer
          the same expression designs to the animated 3D
          robot visor without changing its helmet geometry.
        </p>
      </div>
    </main>
  );
}

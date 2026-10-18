
"use client";

import Image from "next/image";
import { useEffect, useId } from "react";

import RobotFace, {
  EXPRESSIONS,
} from "./robot-face";

import { useRobotGaze } from "./hooks/use-robot-gaze";
import { useRobotBlink } from "./hooks/use-robot-blink";
import { useRobotIdle } from "./hooks/use-robot-idle";
import { useRobotInteraction } from "./hooks/use-robot-interaction";
import { useRobotController } from "./hooks/use-robot-controller";

import {
  useRobotExpression,
  FADE_OUT_MS,
  FADE_IN_MS,
} from "./hooks/use-robot-expression";

import { ROBOT_PRIORITY } from "./robot-animation.types";

const IMAGE_WIDTH = 1142;
const IMAGE_HEIGHT = 1378;

export default function RobotCanvas() {
  const gaze = useRobotGaze();
  const blinking = useRobotBlink();

  const { isIdle, idleTilt } = useRobotIdle();

  // The controller is now the source of truth
  // for expressions and coordinated reactions.
  const {
    animationState,
    baseExpression,
    setIdleMode,
    selectExpression,
    requestReaction,
  } = useRobotController();

  // This hook now only animates the controller's
  // selected facial expression.
  const {
    displayExpression,
    faceVisible,
  } = useRobotExpression(
    animationState.expression
  );

  const {
    nodding,
    handleRobotPress,
    handleExpressionSelection,
  } = useRobotInteraction({
    requestReaction: (request) =>
      requestReaction({
        ...request,
        priority: ROBOT_PRIORITY.INTERACTIVE,
      }),
    selectExpression,
  });

  // Idle controls the resting expression.
  // It cannot override an active reaction.
  useEffect(() => {
    setIdleMode(isIdle);
  }, [isIdle, setIdleMode]);

  const instanceId = useId().replace(/:/g, "");
  const glowId = `kitcart-glow-${instanceId}`;
  const visorId = `kitcart-visor-${instanceId}`;

  const isReacting =
    animationState.activeReaction !== null &&
    animationState.activeReaction.source ===
      "interaction";

  // Approved cursor tracking.
  const headX = gaze.x * 22;
  const headY = gaze.y * 15;
  const headRotation = gaze.x * 4.8;

  // Preserve idle head movement, but never let it
  // compete with an active interaction.
  const activeIdleTilt =
    isIdle && !isReacting && !nodding
      ? idleTilt
      : 0;

  const nodOffset = nodding ? 12 : 0;

  // Approved facial tracking.
  const eyeX = gaze.x * 8;
  const eyeY = gaze.y * 5;

  const smileX = gaze.x * 3;
  const smileY = gaze.y * 2;

  const gazeTransform =
    `translate(${headX} ${headY}) ` +
    `rotate(${headRotation} 560 600)`;

  const idleTransform =
    `rotate(${activeIdleTilt} 560 600)`;

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#11142B]">
      {/* Interactive robot surface */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Interact with the KitCart robot"
        onClick={handleRobotPress}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            handleRobotPress();
          }
        }}
        className="relative h-full max-w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#8FE2E8]"
        style={{
          aspectRatio: `${IMAGE_WIDTH} / ${IMAGE_HEIGHT}`,
          width: "auto",
          touchAction: "manipulation",
        }}
      >
        {/* Stationary robot body */}
        <Image
          src="/mascot/kitcart-body-layer.png"
          alt="KitCart interactive robot mascot"
          fill
          priority
          draggable={false}
          sizes="(max-width: 768px) 100vw, 470px"
          className="pointer-events-none object-contain select-none"
        />

        <svg
          viewBox={`0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
          aria-hidden="true"
        >
          <defs>
            {/* Shared cyan and pink glow */}
            <filter
              id={glowId}
              x="-60%"
              y="-100%"
              width="220%"
              height="300%"
            >
              <feGaussianBlur stdDeviation="12" />
            </filter>

            {/* Keep expressions inside the visor */}
            <clipPath id={visorId}>
              <ellipse
                cx="560"
                cy="396"
                rx="255"
                ry="162"
              />
            </clipPath>
          </defs>

          {/* Approved cursor-controlled head movement */}
          <g transform={gazeTransform}>
            {/* Idle-only curiosity tilt */}
            <g
              transform={idleTransform}
              style={{
                transition: "transform 650ms ease-in-out",
              }}
            >
              {/* Interaction nod */}
              <g
                transform={`translate(0 ${nodOffset})`}
                style={{
                  transition: "transform 210ms ease-in-out",
                }}
              >
                <image
                  href="/mascot/kitcart-head-layer.png"
                  x="0"
                  y="0"
                  width={IMAGE_WIDTH}
                  height={IMAGE_HEIGHT}
                  preserveAspectRatio="xMidYMid meet"
                />

                {/* Controller-selected expression */}
                <g clipPath={`url(#${visorId})`}>
                  <g
                    opacity={faceVisible ? 1 : 0}
                    style={{
                      transitionProperty: "opacity",
                      transitionDuration: faceVisible
                        ? `${FADE_IN_MS}ms`
                        : `${FADE_OUT_MS}ms`,
                      transitionTimingFunction: "ease-in-out",
                    }}
                  >
                    <RobotFace
                      expression={displayExpression}
                      blinking={blinking}
                      glowId={glowId}
                      eyeX={eyeX}
                      eyeY={eyeY}
                      smileX={smileX}
                      smileY={smileY}
                    />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </svg>
      </div>

      {/* Temporary expression testing buttons */}
      <div className="absolute bottom-2 left-2 right-2 z-10 flex flex-wrap justify-center gap-1.5">
        {EXPRESSIONS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() =>
              handleExpressionSelection(item)
            }
            aria-pressed={baseExpression === item}
            className={
              "cursor-pointer rounded-full border px-2.5 py-1.5 text-[10px] font-medium capitalize transition-colors " +
              (baseExpression === item
                ? "border-[#8FE2E8] bg-[#6658D9] text-white"
                : "border-white/20 bg-[#11142B]/85 text-[#F7F8FC] hover:bg-[#6658D9]/50")
            }
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

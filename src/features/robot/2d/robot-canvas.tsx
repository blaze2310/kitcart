
"use client";

import Image from "next/image";
import { useEffect, useId } from "react";

import RobotFace, {
  EXPRESSIONS,
} from "./robot-face";

import RobotGestureRenderer from "./robot-gesture-renderer";

import type { RobotGesture } from "./robot-animation.types";
import { ROBOT_PRIORITY } from "./robot-animation.types";

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

const IMAGE_WIDTH = 1142;
const IMAGE_HEIGHT = 1378;

export default function RobotCanvas() {
  const gaze = useRobotGaze();
  const blinking = useRobotBlink();

  const { isIdle, idleTilt } = useRobotIdle();

  const {
    animationState,
    baseExpression,
    setIdleMode,
    selectExpression,
    requestReaction,
  } = useRobotController();

  const {
    displayExpression,
    faceVisible,
  } = useRobotExpression(animationState.expression);

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

  // Select the current head gesture.
  const activeGesture: RobotGesture = isReacting
    ? "nod"
    : isIdle
      ? "curious-tilt"
      : "none";

  const activeIdleTilt =
    activeGesture === "curious-tilt"
      ? idleTilt
      : 0;

  const nodOffset =
    activeGesture === "nod" && nodding
      ? 12
      : 0;

  // Shared full-body movement.
  // Zero for now: no visible bounce is introduced.
  const bodyOffsetY = 0;

  // Approved cursor tracking.
  const headX = gaze.x * 22;
  const headY = gaze.y * 15;
  const headRotation = gaze.x * 4.8;

  const eyeX = gaze.x * 8;
  const eyeY = gaze.y * 5;

  const smileX = gaze.x * 3;
  const smileY = gaze.y * 2;

  const gazeTransform =
    `translate(${headX} ${headY}) ` +
    `rotate(${headRotation} 560 600)`;

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
        {/*
          SHARED ROBOT MOVEMENT LAYER

          Both the body PNG and the SVG head sit inside
          this wrapper. A future bounce will move both
          together without disturbing independent
          head gestures.
        */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate3d(0, ${bodyOffsetY}px, 0)`,
            transition: "transform 280ms ease-in-out",
            willChange: "transform",
          }}
        >
          {/* Body layer */}
          <Image
            src="/mascot/kitcart-body-layer.png"
            alt="KitCart interactive robot mascot"
            fill
            priority
            draggable={false}
            sizes="(max-width: 768px) 100vw, 470px"
            className="pointer-events-none object-contain select-none"
          />

          {/* Head and facial layers */}
          <svg
            viewBox={`0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
            aria-hidden="true"
          >
            <defs>
              <filter id={glowId} filterUnits="userSpaceOnUse" x="0" y="0" width="1142" height="1378">
                <feGaussianBlur stdDeviation="4" />
              </filter>

              <clipPath id={visorId}>
                <ellipse
                  cx="560"
                  cy="396"
                  rx="255"
                  ry="162"
                />
              </clipPath>
            </defs>

            {/* Independent cursor-driven head movement */}
            <g transform={gazeTransform}>
              {/* Head-only gesture renderer */}
              <RobotGestureRenderer
                gesture={activeGesture}
                headTilt={activeIdleTilt}
                nodOffset={nodOffset}
              >
                <image
                  href="/mascot/kitcart-head-layer.png"
                  x="0"
                  y="0"
                  width={IMAGE_WIDTH}
                  height={IMAGE_HEIGHT}
                  preserveAspectRatio="xMidYMid meet"
                />

                {/* Expressions remain attached to head */}
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
              </RobotGestureRenderer>
            </g>
          </svg>
        </div>
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

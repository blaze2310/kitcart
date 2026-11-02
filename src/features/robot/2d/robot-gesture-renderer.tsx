
"use client";

import type { ReactNode } from "react";

import type { RobotGesture } from "./robot-animation.types";

import { canRenderGestureIn2D } from "./robot-gestures";

type RobotGestureRendererProps = {
  gesture: RobotGesture;
  children: ReactNode;
  headTilt?: number;
  nodOffset?: number;
};

export default function RobotGestureRenderer({
  gesture,
  children,
  headTilt = 0,
  nodOffset = 0,
}: RobotGestureRendererProps) {
  const supported = canRenderGestureIn2D(gesture);

  const activeGesture: RobotGesture = supported
    ? gesture
    : "none";

  const appliedTilt =
    activeGesture === "curious-tilt"
      ? headTilt
      : 0;

  const appliedNod =
    activeGesture === "nod"
      ? nodOffset
      : 0;

  // Head-only gestures, applied inside the
  // future shared full-body movement layer.
  return (
    <g
      transform={`rotate(${appliedTilt} 560 600)`}
      style={{
        transition: "transform 650ms ease-in-out",
      }}
    >
      <g
        transform={`translate(0 ${appliedNod})`}
        style={{
          transition: "transform 210ms ease-in-out",
        }}
      >
        {children}
      </g>
    </g>
  );
}

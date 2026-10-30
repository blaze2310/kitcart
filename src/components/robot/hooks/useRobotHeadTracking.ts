
"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Bone,
  MathUtils,
  Quaternion,
  Vector3,
} from "three";

const INACTIVITY_MS = 5000;
const POINTER_THRESHOLD_PX = 2;
const SMOOTHNESS = 7;
const MAX_YAW_DEGREES = 30;
const MAX_PITCH_DEGREES = 18;

const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

export type RobotHeadTrackingOptions = {
  head: Bone | null;
  enabled: boolean;
};

export function useRobotHeadTracking({
  head,
  enabled,
}: RobotHeadTrackingOptions) {
  const pointer = useRef({ x: 0, y: 0 });
  const gaze = useRef({ x: 0, y: 0 });

  const lastPointer = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const lastMovement = useRef(0);

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

  // Avoid recreating the pointer listener when
  // animation actions or expressions change.
  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const previous = lastPointer.current;

      if (
        previous &&
        Math.hypot(
          event.clientX - previous.x,
          event.clientY - previous.y
        ) < POINTER_THRESHOLD_PX
      ) {
        return;
      }

      lastPointer.current = {
        x: event.clientX,
        y: event.clientY,
      };

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

      lastMovement.current = performance.now();
    }

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );
    };
  }, []);

  // Always remove the correction from the previous
  // frame before applying a new GLB animation pose.
  function beforeAnimationUpdate() {
    if (!head) return;

    inverseCorrection
      .copy(previousCorrection)
      .invert();

    head.quaternion.multiply(inverseCorrection);
  }

  // Run after AnimationMixer.update().
  // The current GLB determines the base head pose.
  function afterAnimationUpdate(
    delta: number,
    allowTracking: boolean = enabled
  ) {
    const dt = Math.min(Math.max(delta, 0), 0.05);

    const recentMovement =
      lastMovement.current > 0 &&
      performance.now() - lastMovement.current <
        INACTIVITY_MS;

    const shouldFollow =
      allowTracking && recentMovement;

    const alpha = 1 - Math.exp(-SMOOTHNESS * dt);

    gaze.current.x = MathUtils.lerp(
      gaze.current.x,
      shouldFollow ? pointer.current.x : 0,
      alpha
    );

    gaze.current.y = MathUtils.lerp(
      gaze.current.y,
      shouldFollow ? pointer.current.y : 0,
      alpha
    );

    if (!head) return;

    yaw.setFromAxisAngle(
      Y_AXIS,
      MathUtils.degToRad(
        MAX_YAW_DEGREES * gaze.current.x
      )
    );

    pitch.setFromAxisAngle(
      Z_AXIS,
      MathUtils.degToRad(
        MAX_PITCH_DEGREES * gaze.current.y
      )
    );

    correction.copy(yaw).multiply(pitch);

    head.quaternion.multiply(correction);
    previousCorrection.copy(correction);
  }

  return {
    beforeAnimationUpdate,
    afterAnimationUpdate,
  };
}

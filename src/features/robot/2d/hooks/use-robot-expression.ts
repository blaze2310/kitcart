
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Expression } from "../robot-face";

export const FADE_OUT_MS = 85;
export const FADE_IN_MS = 115;

const DEFAULT_EXPRESSION: Expression = "normal";

export function useRobotExpression(
  targetExpression?: Expression
) {
  const [displayExpression, setDisplayExpression] =
    useState<Expression>(
      targetExpression ?? DEFAULT_EXPRESSION
    );

  const [selectedExpression, setSelectedExpression] =
    useState<Expression>(
      targetExpression ?? DEFAULT_EXPRESSION
    );

  const [faceVisible, setFaceVisible] = useState(true);

  const currentTargetRef = useRef<Expression>(
    targetExpression ?? DEFAULT_EXPRESSION
  );

  const transitionTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const transitionFrameRef = useRef<number | null>(null);
  const transitionSequenceRef = useRef(0);

  const cancelTransition = useCallback(() => {
    if (transitionTimerRef.current !== null) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (transitionFrameRef.current !== null) {
      cancelAnimationFrame(transitionFrameRef.current);
      transitionFrameRef.current = null;
    }
  }, []);

  // Responsible only for rendering expression changes.
  const animateExpression = useCallback(
    (next: Expression) => {
      if (currentTargetRef.current === next) {
        return;
      }

      cancelTransition();

      transitionSequenceRef.current += 1;

      const sequence =
        transitionSequenceRef.current;

      currentTargetRef.current = next;
      setSelectedExpression(next);

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reducedMotion) {
        setDisplayExpression(next);
        setFaceVisible(true);
        return;
      }

      // Fade out the old expression.
      setFaceVisible(false);

      transitionTimerRef.current = setTimeout(() => {
        if (
          sequence !== transitionSequenceRef.current
        ) {
          return;
        }

        // Change SVG shapes while invisible.
        setDisplayExpression(next);

        transitionFrameRef.current =
          requestAnimationFrame(() => {
            if (
              sequence !==
              transitionSequenceRef.current
            ) {
              return;
            }

            setFaceVisible(true);
            transitionFrameRef.current = null;
          });

        transitionTimerRef.current = null;
      }, FADE_OUT_MS);
    },
    [cancelTransition]
  );

  // Controller-driven mode:
  // follow the expression selected by the controller.
  useEffect(() => {
    if (targetExpression !== undefined) {
      animateExpression(targetExpression);
    }
  }, [targetExpression, animateExpression]);

  // Legacy mode:
  // existing interactions can still call this function
  // until they are connected to the controller.
  const changeExpression = useCallback(
    (next: Expression) => {
      if (targetExpression !== undefined) {
        return;
      }

      animateExpression(next);
    },
    [targetExpression, animateExpression]
  );

  useEffect(() => {
    return () => {
      transitionSequenceRef.current += 1;
      cancelTransition();
    };
  }, [cancelTransition]);

  return {
    displayExpression,
    selectedExpression,
    faceVisible,

    // Existing API, retained for compatibility.
    changeExpression,
  };
}

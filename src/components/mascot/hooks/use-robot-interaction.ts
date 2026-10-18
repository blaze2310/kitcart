
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Expression } from "../robot-face";

const NOD_DURATION_MS = 420;
const RAPID_CLICK_GAP_MS = 450;
const LOVED_CLICK_THRESHOLD = 4;
const REACTION_DURATION_MS = 1100;

type InteractionOptions = {
  requestReaction: (request: {
    source: "interaction";
    priority: 20;
    expression: Expression;
    gesture: "nod";
    durationMs: number;
  }) => string | null;

  selectExpression: (expression: Expression) => void;
};

export function useRobotInteraction({
  requestReaction,
  selectExpression,
}: InteractionOptions) {
  const [nodding, setNodding] = useState(false);

  const nodTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const restartFrameRef = useRef<number | null>(null);

  const lastClickRef = useRef<number | null>(null);
  const rapidClickCountRef = useRef(0);

  const requestReactionRef = useRef(requestReaction);
  const selectExpressionRef = useRef(selectExpression);

  requestReactionRef.current = requestReaction;
  selectExpressionRef.current = selectExpression;

  const clearNod = useCallback(() => {
    if (nodTimerRef.current !== null) {
      clearTimeout(nodTimerRef.current);
      nodTimerRef.current = null;
    }

    if (restartFrameRef.current !== null) {
      cancelAnimationFrame(restartFrameRef.current);
      restartFrameRef.current = null;
    }
  }, []);

  const resetClickStreak = useCallback(() => {
    lastClickRef.current = null;
    rapidClickCountRef.current = 0;
  }, []);

  const triggerNod = useCallback(() => {
    clearNod();

    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      setNodding(false);
      return;
    }

    setNodding(false);

    restartFrameRef.current = requestAnimationFrame(
      () => {
        restartFrameRef.current = requestAnimationFrame(
          () => {
            setNodding(true);
            restartFrameRef.current = null;
          }
        );
      }
    );

    nodTimerRef.current = setTimeout(() => {
      setNodding(false);
      nodTimerRef.current = null;
    }, NOD_DURATION_MS);
  }, [clearNod]);

  const handleRobotPress = useCallback(() => {
    const now = performance.now();
    const lastClick = lastClickRef.current;

    if (
      lastClick !== null &&
      now - lastClick <= RAPID_CLICK_GAP_MS
    ) {
      rapidClickCountRef.current += 1;
    } else {
      rapidClickCountRef.current = 1;
    }

    lastClickRef.current = now;

    const loved =
      rapidClickCountRef.current >=
      LOVED_CLICK_THRESHOLD;

    const accepted = requestReactionRef.current({
      source: "interaction",
      priority: 20,
      expression: loved ? "loved" : "happy",
      gesture: "nod",
      durationMs: REACTION_DURATION_MS,
    });

    // A higher-priority reaction may refuse this click.
    if (accepted === null) {
      resetClickStreak();
      return;
    }

    triggerNod();
  }, [resetClickStreak, triggerNod]);

  const handleExpressionSelection = useCallback(
    (next: Expression) => {
      resetClickStreak();
      clearNod();
      setNodding(false);

      selectExpressionRef.current(next);
    },
    [clearNod, resetClickStreak]
  );

  useEffect(() => {
    return () => {
      clearNod();
    };
  }, [clearNod]);

  return {
    nodding,
    handleRobotPress,
    handleExpressionSelection,
  };
}

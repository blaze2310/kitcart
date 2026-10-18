
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  RobotReaction,
  RobotAnimationState,
} from "../robot-animation.types";

import type { Expression } from "../robot-face";

type ReactionRequest = Omit<RobotReaction, "id">;

const DEFAULT_EXPRESSION: Expression = "normal";

const INITIAL_STATE: RobotAnimationState = {
  activeReaction: null,
  expression: DEFAULT_EXPRESSION,
  gesture: "none",
  isIdle: false,
};

export function useRobotController() {
  const [state, setState] =
    useState<RobotAnimationState>(INITIAL_STATE);

  const [baseExpression, setBaseExpressionState] =
    useState<Expression>(DEFAULT_EXPRESSION);

  const baseExpressionRef =
    useRef<Expression>(DEFAULT_EXPRESSION);

  const stateRef =
    useRef<RobotAnimationState>(INITIAL_STATE);

  const timerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const sequenceRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const updateState = useCallback(
    (next: RobotAnimationState) => {
      stateRef.current = next;
      setState(next);
    },
    []
  );

  const getRestingExpression = useCallback(
    (isIdle: boolean): Expression => {
      return isIdle
        ? "normal"
        : baseExpressionRef.current;
    },
    []
  );

  // Idle changes the resting face, but does not
  // interrupt a higher-priority reaction.
  const setIdleMode = useCallback(
    (isIdle: boolean) => {
      const current = stateRef.current;

      if (current.isIdle === isIdle) {
        return;
      }

      updateState({
        ...current,
        isIdle,
        expression: current.activeReaction
          ? current.expression
          : getRestingExpression(isIdle),
      });
    },
    [getRestingExpression, updateState]
  );

  const setBaseExpression = useCallback(
    (expression: Expression) => {
      baseExpressionRef.current = expression;
      setBaseExpressionState(expression);

      const current = stateRef.current;

      if (current.activeReaction) {
        return;
      }

      updateState({
        ...current,
        expression: getRestingExpression(
          current.isIdle
        ),
      });
    },
    [getRestingExpression, updateState]
  );

  const releaseReaction = useCallback(
    (reactionId?: string) => {
      const current = stateRef.current;
      const active = current.activeReaction;

      if (!active) {
        return;
      }

      if (
        reactionId !== undefined &&
        active.id !== reactionId
      ) {
        return;
      }

      clearTimer();

      updateState({
        activeReaction: null,
        expression: getRestingExpression(
          current.isIdle
        ),
        gesture: "none",
        isIdle: current.isIdle,
      });
    },
    [
      clearTimer,
      getRestingExpression,
      updateState,
    ]
  );

  const requestReaction = useCallback(
    (request: ReactionRequest): string | null => {
      const current = stateRef.current;
      const active = current.activeReaction;

      // Only an equal or higher-priority reaction
      // may replace an active reaction.
      if (
        active &&
        request.priority < active.priority
      ) {
        return null;
      }

      clearTimer();

      sequenceRef.current += 1;

      const id = `reaction-${sequenceRef.current}`;

      const reaction: RobotReaction = {
        ...request,
        id,
      };

      updateState({
        activeReaction: reaction,
        expression:
          reaction.expression ??
          getRestingExpression(current.isIdle),
        gesture: reaction.gesture,
        isIdle: current.isIdle,
      });

      if (
        typeof reaction.durationMs === "number" &&
        reaction.durationMs > 0
      ) {
        timerRef.current = setTimeout(() => {
          releaseReaction(id);
        }, reaction.durationMs);
      }

      return id;
    },
    [
      clearTimer,
      getRestingExpression,
      releaseReaction,
      updateState,
    ]
  );

  // An explicit selection cancels a temporary reaction.
  const selectExpression = useCallback(
    (expression: Expression) => {
      clearTimer();

      baseExpressionRef.current = expression;
      setBaseExpressionState(expression);

      const current = stateRef.current;

      updateState({
        activeReaction: null,
        expression,
        gesture: "none",
        isIdle: false,
      });
    },
    [clearTimer, updateState]
  );

  const resetController = useCallback(() => {
    clearTimer();

    baseExpressionRef.current = DEFAULT_EXPRESSION;
    setBaseExpressionState(DEFAULT_EXPRESSION);

    updateState({
      ...INITIAL_STATE,
    });
  }, [clearTimer, updateState]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    animationState: state,
    baseExpression,

    setIdleMode,
    setBaseExpression,
    selectExpression,

    requestReaction,
    releaseReaction,
    resetController,
  };
}

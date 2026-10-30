
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
  Object3D,
} from "three";

import {
  getRobotAnimation,
  getRobotAnimationUrl,
  type RobotAnimationId,
  type RobotPlaybackMode,
} from "./animationRegistry";

export type RobotActionRequest = {
  id: RobotAnimationId;
  serial: number;
  mode?: RobotPlaybackMode;
};

export type RobotActionEvent = {
  id: RobotAnimationId;
  clip: AnimationClip;
  mode: RobotPlaybackMode;
};

type ActiveAnimation = {
  id: RobotAnimationId;
  action: AnimationAction;
  mode: RobotPlaybackMode;
};

export type RobotAnimationOptions = {
  model: Object3D;
  request: RobotActionRequest;
  idleClip: AnimationClip;
  playing: boolean;
  speed: number;
  onStarted?: (event: RobotActionEvent) => void;
  onCompleted?: (event: RobotActionEvent) => void;
};

const ONCE_RETURN_FADE_SECONDS = 0.4;

export function useRobotAnimation({
  model,
  request,
  idleClip,
  playing,
  speed,
  onStarted,
  onCompleted,
}: RobotAnimationOptions) {
  const mixer = useMemo(
    () => new AnimationMixer(model),
    [model]
  );

  const activeRef = useRef<ActiveAnimation | null>(
    null
  );

  const activeIdRef = useRef<RobotAnimationId>(
    "idle"
  );

  // A finished Once action waits for the animation
  // update to complete before beginning its return.
  const pendingIdleReturnRef =
    useRef<AnimationAction | null>(null);

  // Keep callbacks current without restarting clips
  // when expressions or UI state change.
  const onStartedRef = useRef(onStarted);
  const onCompletedRef = useRef(onCompleted);

  onStartedRef.current = onStarted;
  onCompletedRef.current = onCompleted;

  const requestedDefinition = getRobotAnimation(
    request.id
  );

  const selectedUrl = getRobotAnimationUrl(
    request.id
  );

  const requestedMode =
    request.mode ?? requestedDefinition.playback;

  const begin = useCallback(
    (
      id: RobotAnimationId,
      clip: AnimationClip,
      mode: RobotPlaybackMode,
      transitionSeconds: number
    ) => {
      // A new action cancels any previous
      // request to return automatically to Idle.
      pendingIdleReturnRef.current = null;

      const previous = activeRef.current?.action;
      const next = mixer.clipAction(clip);

      // Always begin a newly requested action
      // from its own first frame.
      next.reset();
      next.enabled = true;
      next.paused = false;

      next.setEffectiveWeight(1);
      next.setEffectiveTimeScale(1);

      if (mode === "loop") {
        // Every GLB loops at its own native duration.
        next.setLoop(LoopRepeat, Infinity);
        next.clampWhenFinished = false;
      } else {
        // Once and Hold both finish their entire clip.
        next.setLoop(LoopOnce, 1);

        // Preserve the final animated pose so the
        // next transition can blend away from it.
        next.clampWhenFinished = true;
      }

      next.play();

      if (previous && previous !== next) {
        next.crossFadeFrom(
          previous,
          Math.max(0, transitionSeconds),
          false
        );
      }

      activeRef.current = {
        id,
        action: next,
        mode,
      };

      activeIdRef.current = id;

      onStartedRef.current?.({
        id,
        clip,
        mode,
      });
    },
    [mixer]
  );

  const activateClip = useCallback(
    (
      clip: AnimationClip,
      loadedUrl: string
    ) => {
      // Ignore an outdated GLB load result.
      if (loadedUrl !== selectedUrl) {
        return;
      }

      begin(
        request.id,
        clip,
        requestedMode,
        requestedDefinition.transitionSeconds
      );
    },
    [
      begin,
      selectedUrl,
      request.id,
      request.serial,
      requestedMode,
      requestedDefinition.transitionSeconds,
    ]
  );

  useEffect(() => {
    const handleFinished = (
      event: { action: AnimationAction }
    ) => {
      const active = activeRef.current;

      if (!active) return;

      // Ignore completion events from interrupted
      // or previously playing animation actions.
      if (event.action !== active.action) {
        return;
      }

      if (active.mode === "loop") {
        return;
      }

      const finishedEvent: RobotActionEvent = {
        id: active.id,
        clip: active.action.getClip(),
        mode: active.mode,
      };

      onCompletedRef.current?.(finishedEvent);

      if (active.mode === "hold") {
        // Remain at the final pose.
        // Wait for another action request.
        return;
      }

      // Once: flag the completed action.
      // Do not change mixer actions inside its
      // own "finished" event dispatch.
      pendingIdleReturnRef.current = active.action;
    };

    mixer.addEventListener(
      "finished",
      handleFinished
    );

    return () => {
      mixer.removeEventListener(
        "finished",
        handleFinished
      );
    };
  }, [mixer]);

  const update = useCallback(
    (delta: number) => {
      if (!playing) {
        return;
      }

      const dt = Math.min(
        Math.max(delta, 0),
        0.05
      );

      // Advance the currently active GLB animation.
      mixer.update(dt * speed);

      // Process any completed Once action AFTER
      // Three.js finishes updating the mixer.
      const completedAction =
        pendingIdleReturnRef.current;

      if (!completedAction) {
        return;
      }

      pendingIdleReturnRef.current = null;

      const active = activeRef.current;

      // A newer action may already have taken over.
      if (
        !active ||
        active.action !== completedAction ||
        active.mode !== "once"
      ) {
        return;
      }

      // Start Idle from its first frame and blend
      // smoothly away from the completed pose.
      // This is independent of the action's duration.
      begin(
        "idle",
        idleClip,
        "loop",
        ONCE_RETURN_FADE_SECONDS
      );
    },
    [
      mixer,
      playing,
      speed,
      begin,
      idleClip,
    ]
  );

  useEffect(() => {
    return () => {
      pendingIdleReturnRef.current = null;
      activeRef.current = null;
      mixer.stopAllAction();
    };
  }, [mixer]);

  return {
    activateClip,
    update,
    activeIdRef,
  };
}

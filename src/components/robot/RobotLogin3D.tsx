"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { Expression } from "@/components/mascot/robot-face";
import Robot3D, { type RobotActionRequest } from "./Robot3D";
import { getRobotAnimationUrl, type RobotAnimationId } from "./animation/animationRegistry";

type Props = {
  usernameFocused: boolean;
  passwordFocused: boolean;
  passwordVisible: boolean;
  mismatchSignal?: number;
  reactionSignal?: number;
};
type Pattern = "peek" | "head" | "lean";
const CLICK_GAP_MS = 400;

export default function RobotLogin3D({ usernameFocused, passwordVisible, mismatchSignal = 0, reactionSignal = 0 }: Props) {
  const [request, setRequest] = useState<RobotActionRequest>({ id: "wave", mode: "once", serial: 1 });
  const [expression, setExpression] = useState<Expression>("normal");
  const active = useRef<RobotAnimationId>("wave");
  const lastUsername = useRef<"stretch" | "clapping">("clapping");
  const lastPattern = useRef<Pattern | null>(null);
  const lastUsernameFocus = useRef(false);
  const lastPasswordVisible = useRef(false);
  const visibleRef = useRef(passwordVisible);
  const passwordSequence = useRef(false);
  const shy = useRef(false);
  const clicks = useRef(0);
  const lastClickTime = useRef(0);
  const happyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMismatchSignal = useRef(mismatchSignal);
  const lastReactionSignal = useRef(reactionSignal);
  useEffect(() => { visibleRef.current = passwordVisible; }, [passwordVisible]);

  const clearHappyTimer = useCallback(() => {
    if (happyTimer.current !== null) clearTimeout(happyTimer.current);
    happyTimer.current = null;
  }, []);
  const play = useCallback((id: RobotAnimationId, mode: "loop" | "once" | "hold" = "once") => {
    setRequest(previous => ({ id, mode, serial: previous.serial + 1 }));
  }, []);

  useEffect(() => {
    const entered = usernameFocused && !lastUsernameFocus.current;
    lastUsernameFocus.current = usernameFocused;
    if (!entered || visibleRef.current || shy.current) return;
    const next = lastUsername.current === "stretch" ? "clapping" : "stretch";
    lastUsername.current = next;
    play(next);
  }, [usernameFocused, play]);

  useEffect(() => {
    const revealed = passwordVisible && !lastPasswordVisible.current;
    const hidden = !passwordVisible && lastPasswordVisible.current;
    lastPasswordVisible.current = passwordVisible;
    if (hidden) {
      passwordSequence.current = false;
      if (!shy.current) play("idle", "loop");
      return;
    }
    if (!revealed || shy.current) return;
    const patterns: Pattern[] = ["peek", "head", "lean"];
    const choices = patterns.filter(item => item !== lastPattern.current);
    const next = choices[Math.floor(Math.random() * choices.length)];
    lastPattern.current = next;
    passwordSequence.current = next === "lean";
    play(next, next === "lean" ? "once" : "hold");
  }, [passwordVisible, play]);

  useEffect(() => {
    if (mismatchSignal === lastMismatchSignal.current) return;
    lastMismatchSignal.current = mismatchSignal;
    if (!mismatchSignal || shy.current) return;
    clearHappyTimer();
    passwordSequence.current = false;
    play("sad");
  }, [mismatchSignal, play, clearHappyTimer]);

  useEffect(() => {
    if (reactionSignal === lastReactionSignal.current) return;
    lastReactionSignal.current = reactionSignal;
    if (!reactionSignal || shy.current) return;
    clearHappyTimer();
    passwordSequence.current = false;
    play("wave");
  }, [reactionSignal, play, clearHappyTimer]);

  const started = useCallback((id: RobotAnimationId, face: Expression) => {
    active.current = id;
    if (id === "shy") { setExpression("loved"); return; }
    if (id === "idle") { shy.current = false; clicks.current = 0; setExpression("normal"); return; }
    setExpression(face);
  }, []);
  const completed = useCallback((id: RobotAnimationId) => {
    if (id === "lean" && passwordSequence.current && visibleRef.current) {
      passwordSequence.current = false;
      play("turn", "hold");
    }
  }, [play]);

  const clicked = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 5 || visibleRef.current || shy.current || (active.current !== "idle" && active.current !== "wave")) return;
    event.stopPropagation();
    const now = performance.now();
    clicks.current = lastClickTime.current > 0 && now - lastClickTime.current <= CLICK_GAP_MS ? clicks.current + 1 : 1;
    lastClickTime.current = now;
    clearHappyTimer();
    if (clicks.current >= 6) {
      clicks.current = 0;
      lastClickTime.current = 0;
      shy.current = true;
      play("shy");
      return;
    }
    setExpression("happy");
    happyTimer.current = setTimeout(() => {
      happyTimer.current = null;
      if (!shy.current && active.current === "idle") setExpression("normal");
    }, 1500);
  }, [clearHappyTimer, play]);

  useEffect(() => () => clearHappyTimer(), [clearHappyTimer]);
  return (
    <group onClick={clicked}>
      <Robot3D request={request} expression={expression} autoBlink tracking
        onActionStarted={started} onActionCompleted={completed} />
    </group>
  );
}

["wave", "sad", "shy"].forEach(id => useGLTF.preload(getRobotAnimationUrl(id as RobotAnimationId)));

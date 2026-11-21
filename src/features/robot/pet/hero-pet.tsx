"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Orientation, Request } from "./hero-pet-rig";
import { moves, type MoveId } from "./hero-pet-moves";
import { clampPoint, fitLap, gaitFor, gaitYawOffset, isLap, isRoamingMove, isTravelMove, lapPoint, nextReturnMove, roamTarget, stepToward, stridePace, type Bounds, type LapPath, type LapPlan, type Point } from "./hero-pet-motion";
import { clearNavbar, aroundNavbar, sweepNavbar, type NavbarEdge } from "./pet-navbar";
import styles from "./hero-pet.module.css";

const Rig = dynamic(() => import("./hero-pet-rig"), { ssr: false });
const idle: Request = { id: "idle", serial: 0 };
const neutral: Orientation = { yaw: 0, pitch: 0, direct: false };
const choices = Object.entries(moves) as [MoveId, (typeof moves)[MoveId]][];
const ambient: MoveId[] = ["look", "lean", "walk3", "walk3", "sit", "swim"];
const tilt = (pitch: number) => Math.min(1.22, Math.max(-1.22, pitch));

type Gesture = {
  id: number; start: Point; initial: Point; orientation: Orientation; rotate: boolean; dragged: boolean;
};

class PetBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}


export default function HeroPet({ pathname, cartOpen }: { pathname: string; cartOpen: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  const actor = useRef<HTMLDivElement>(null);
  const previousPath = useRef(pathname);
  const requestRef = useRef<Request>(idle);
  const started = useRef<MoveId | null>(null);
  const [request, setRequest] = useState(idle);
  const [ready, setReady] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState<MoveId>("idle");
  const [happy, setHappy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState<MoveId>("wave2");
  const [dragging, setDragging] = useState(false);
  const [rotate, setRotate] = useState(false);
  const [detached, setDetached] = useState(false);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState("");
  const [poseTick, setPoseTick] = useState(0);
  const taps = useRef({ time: 0, count: 0 });
  const smile = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greeted = useRef(false);
  const lastRandom = useRef<MoveId | null>(null);
  const point = useRef<Point>({ x: 0, y: 0 });
  const viewport = useRef<Bounds>({ left: 0, right: 0, top: 0, bottom: 0 });
  const orientation = useRef<Orientation>(neutral);
  const restingOrientation = useRef<Orientation>(neutral);
  const floating = useRef(false);
  const returning = useRef(false);
  const returnLeg = useRef({ distance: 0, phase: -1 });
  const lap = useRef<LapPlan | null>(null);
  const dockPoint = useRef<Point>({ x: 0, y: 0 });
  const navbar = useRef<NavbarEdge | null>(null);
  const navbarPaint = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const nextActionDelay = useRef<number | null>(null);
  const target = useRef<Point | null>(null);
  const pointer = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);

  const place = useCallback((next: Point) => {
    point.current = next;
    const element = actor.current;
    if (!element) return;
    element.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) translate(-50%, -50%)`;
    const edge = navbarPaint.current;
    if (!edge || next.x + edge.width / 2 + 50 <= edge.x || next.y - edge.height / 2 - 54 >= edge.y) {
      if (element.style.clipPath) element.style.clipPath = "";
      return;
    }
    // Translate the navbar corner into actor-local CSS coordinates. The
    // polygon retains the whole overscan everywhere outside the navbar.
    const x = edge.x - next.x + edge.width / 2;
    const y = edge.y - next.y + edge.height / 2;
    const left = Math.max(-60, Math.min(edge.width + 60, x));
    const below = Math.max(-64, Math.min(edge.height + 64, y));
    element.style.clipPath = `polygon(-60px -64px, ${left}px -64px, ${left}px ${below}px, calc(100% + 60px) ${below}px, calc(100% + 60px) calc(100% + 64px), -60px calc(100% + 64px))`;
  }, []);

  const syncBounds = useCallback(() => {
    const panel = stage.current;
    const element = actor.current;
    if (!panel || !element) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const hit = element.querySelector("button");
    // The canvas is transparent at the sides. Constrain the robot's visible
    // footprint instead so it can reach the gutter on the far left.
    const halfWidth = Math.min(width / 2, (hit?.offsetWidth || 94) / 2 + 2);
    const halfHeight = Math.min(height / 2, element.offsetHeight / 2 + 6);
    const rect = panel.getBoundingClientRect();
    viewport.current = {
      left: halfWidth, right: width - halfWidth, bottom: height - halfHeight,
      top: halfHeight,
    };
    const header = panel.parentElement?.querySelector("header");
    const bar = header?.getBoundingClientRect();
    // Leave room for the visible shell and moving arms, not just the hit button.
    const clearanceX = Math.max(halfWidth + 8, 60);
    const clearanceY = Math.max(halfHeight + 10, 90);
    const left = bar ? Math.max(halfWidth, bar.left - clearanceX) : halfWidth;
    navbar.current = bar && bar.bottom > 0
      ? { left, below: Math.min(viewport.current.bottom, bar.bottom + clearanceY) }
      : null;
    navbarPaint.current = bar && navbar.current ? { x: bar.left, y: bar.bottom, width: element.offsetWidth, height: element.offsetHeight } : null;
    dockPoint.current = clampPoint({ x: Math.min(rect.left + rect.width / 2, left), y: rect.top + 70 }, viewport.current);
    if (!floating.current) place(dockPoint.current);
    else {
      place(clearNavbar(clampPoint(point.current, viewport.current), point.current, navbar.current));
      if (!returning.current && target.current) {
        target.current = clearNavbar(clampPoint(target.current, viewport.current), point.current, navbar.current);
      }
    }
  }, [place]);

  const detach = useCallback(() => {
    if (floating.current) return;
    floating.current = true;
    setDetached(true);
  }, []);

  const play = useCallback((id: MoveId, manual = false, home = false) => {
    const next = { id, serial: requestRef.current.serial + 1, manual, home };
    requestRef.current = next;
    setRequest(next);
    setStatus(manual && id !== "idle" ? `Loading ${moves[id].label.toLowerCase()}…` : "");
  }, []);

  const dock = useCallback(() => {
    target.current = null;
    returning.current = false;
    lap.current = null;
    floating.current = false;
    setDetached(false);
    orientation.current = neutral;
    restingOrientation.current = neutral;
    setPoseTick((n) => n + 1);
    setRotate(false);
    setHappy(false);
    syncBounds();
    play("idle");
  }, [play, syncBounds]);

  const walkHome = useCallback(() => {
    const gesture = pointer.current;
    if (gesture) {
      suppressClick.current = true;
      setTimeout(() => { suppressClick.current = false; }, 0);
      pointer.current = null;
      setDragging(false);
    }
    setMenu(false);
    setRotate(false);
    setHappy(false);
    nextActionDelay.current = 3000 + Math.random() * 3000;
    if (!floating.current || reduced || !ready) {
      dock();
      return;
    }
    if (returning.current) return;
    target.current = null;
    returning.current = true;
    const distance = Math.hypot(dockPoint.current.x - point.current.x, dockPoint.current.y - point.current.y);
    play(nextReturnMove(null, distance), false, true);
    setStatus("Returning to the KitCart logo…");
  }, [dock, play, ready, reduced]);

  useLayoutEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    walkHome();
  }, [pathname, walkHome]);

  const onError = useCallback(() => { setFailed(true); setStatus("Pet preview unavailable."); }, []);
  const onClipError = useCallback((id: MoveId) => {
    if (returning.current && id !== "walk3") play("walk3", false, true);
    else if (returning.current) dock();
    else play("idle");
    if (id === "idle") onError();
    else setStatus(`Could not load ${moves[id].label.toLowerCase()}. Try again.`);
  }, [dock, onError, play]);

  const onStart = useCallback((id: MoveId, path?: LapPath) => {
    target.current = null;
    returnLeg.current = { distance: 0, phase: -1 };
    lap.current = null;
    if (path) {
      const bounds = viewport.current;
      const edge = navbar.current;
      const zones = edge ? [
        { ...bounds, right: Math.min(bounds.right, edge.left) },
        { ...bounds, top: Math.max(bounds.top, edge.below) },
      ] : [bounds];
      lap.current = fitLap(path, point.current, zones, orientation.current.yaw);
      detach();
    }
    started.current = id;
    setActive(id);
    if (id !== "idle") {
      taps.current = { time: 0, count: 0 };
      setStatus(moves[id].label);
    }
    if (isTravelMove(id, returning.current)) {
      detach();
      setStatus(returning.current ? `Returning home · ${moves[id].label}` : `${moves[id].label} · tap the robot to stop`);
    }
  }, [detach]);

  const onEnd = useCallback((id: MoveId) => {
    if (id !== requestRef.current.id) return;
    target.current = null;
    if (isRoamingMove(id) || isLap(id)) orientation.current = { ...restingOrientation.current, direct: false };
    if (moves[id].mode === "hold") setStatus("Pose held. Choose Reset to idle to return.");
    else { setHappy(false); play("idle"); }
  }, [play]);

  const onFrame = useCallback((delta: number, id: MoveId, phase: number, weight: number): Orientation => {
    const angles = orientation.current;
    if (pointer.current || delta <= 0 || requestRef.current.id !== id) return angles;
    if (isLap(id) && lap.current) {
      const p = clampPoint(lapPoint(lap.current, phase), viewport.current);
      place(sweepNavbar(point.current, p, navbar.current));
      orientation.current = { yaw: lap.current.yaw, pitch: 0, direct: true };
      return orientation.current;
    }
    if (!isTravelMove(id, returning.current)) return angles;
    const from = point.current;
    const bounds = viewport.current;
    const headingHome = returning.current;
    if (!headingHome && !target.current) target.current = clearNavbar(roamTarget(from, bounds), from, navbar.current);
    const destination = headingHome ? dockPoint.current : target.current!;
    const remaining = Math.hypot(destination.x - from.x, destination.y - from.y);
    const leg = returnLeg.current;
    const cycleEnded = phase + .04 < leg.phase;
    if (headingHome && cycleEnded && leg.distance >= 62 && remaining > 26) {
      play(nextReturnMove(id, remaining), false, true);
      return angles;
    }
    leg.phase = phase;
    const pace = stridePace(gaitFor(id), phase) * weight;
    const waypoint = aroundNavbar(from, destination, navbar.current);
    const side = gaitYawOffset(id);
    const next = stepToward(from, waypoint, angles.yaw, pace, delta, side);
    if (headingHome) leg.distance += Math.hypot(next.point.x - from.x, next.point.y - from.y);
    if (next.arrived && waypoint !== destination) {
      // Complete the corner before heading into the other lane.
      place(waypoint);
      orientation.current = { yaw: next.yaw, pitch: 0, direct: true };
      return orientation.current;
    }
    if (next.arrived && headingHome) {
      dock();
      return orientation.current;
    }
    if (next.arrived) target.current = null;
    place(next.point);
    orientation.current = { yaw: next.yaw, pitch: 0, direct: true };
    return orientation.current;
  }, [dock, place, play]);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const detectMotion = () => setReduced(media.matches);
    detectMotion();
    media.addEventListener("change", detectMotion);
    const sync = () => setTabVisible(!document.hidden);
    sync();
    setReady(true);
    document.addEventListener("visibilitychange", sync);
    const size = new ResizeObserver(syncBounds);
    if (stage.current) {
      size.observe(stage.current);
      const header = stage.current.parentElement?.querySelector("header");
      if (header) size.observe(header);
    }
    const resize = () => {
      target.current = null;
      syncBounds();
    };
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", syncBounds, { passive: true, capture: true });
    return () => {
      media.removeEventListener("change", detectMotion);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", syncBounds, true);
      size.disconnect();
      if (smile.current) clearTimeout(smile.current);
    };
  }, [syncBounds]);

  const bindActor = useCallback((node: HTMLDivElement | null) => {
    actor.current = node;
    if (node) syncBounds();
  }, [syncBounds]);
  const visible = tabVisible && !cartOpen;
  useEffect(syncBounds, [cartOpen, syncBounds]);
  useEffect(() => {
    if (!visible && pointer.current) {
      pointer.current = null;
      orientation.current = { ...orientation.current, direct: false };
      setDragging(false);
    }
  }, [visible]);

  useEffect(() => {
    if (reduced && returning.current) dock();
    else if (reduced && !request.manual && request.id !== "idle") play("idle");
  }, [dock, reduced, request.manual, request.id, play]);

  useEffect(() => {
    if (!ready || !visible || reduced || menu || failed || active !== "idle" || request.id !== "idle" || happy || dragging || rotate) return;
    if (!greeted.current) {
      greeted.current = true;
      try {
        if (!sessionStorage.getItem("kitcart-pet-greeted")) {
          sessionStorage.setItem("kitcart-pet-greeted", "1");
          const timer = setTimeout(() => { if (!pointer.current) play("wave2"); }, 800);
          return () => clearTimeout(timer);
        }
      } catch { /* The pet also works without storage. */ }
    }
    let timer: ReturnType<typeof setTimeout>;
    function pick() {
      if (pointer.current || document.activeElement?.matches("input, textarea, select")) {
        timer = setTimeout(pick, 3000);
        return;
      }
      const options = ambient.filter((id) => id !== lastRandom.current);
      const id = options[Math.floor(Math.random() * options.length)];
      lastRandom.current = id;
      play(id);
    }
    timer = setTimeout(() => { nextActionDelay.current = null; pick(); }, nextActionDelay.current ?? (14000 + Math.random() * 12000));
    return () => clearTimeout(timer);
  }, [active, request.id, ready, visible, reduced, menu, failed, happy, dragging, rotate, play]);

  function stopRoaming() {
    returning.current = false;
    target.current = null;
    orientation.current = { ...orientation.current, direct: false };
    play("idle");
  }

  function tap() {
    if (suppressClick.current || failed || !visible) return;
    if (isTravelMove(requestRef.current.id, returning.current) || isLap(requestRef.current.id)) {
      stopRoaming();
      return;
    }
    if (started.current !== "idle" || requestRef.current.id !== "idle") return;
    const now = performance.now();
    const count = now - taps.current.time <= 400 ? taps.current.count + 1 : 1;
    taps.current = { time: now, count };
    if (smile.current) clearTimeout(smile.current);
    if (count >= 6) {
      taps.current = { time: 0, count: 0 };
      setHappy(false);
      play("shy", true);
      return;
    }
    setHappy(true);
    smile.current = setTimeout(() => setHappy(false), 1500);
  }

  function stopForGesture() {
    returning.current = false;
    target.current = null;
    setHappy(false);
    taps.current = { time: 0, count: 0 };
    if (requestRef.current.id !== "idle") play("idle");
  }

  function down(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary || !visible) return;
    suppressClick.current = false;
    pointer.current = {
      id: event.pointerId, start: { x: event.clientX, y: event.clientY }, initial: point.current,
      orientation: orientation.current, rotate: rotate || event.shiftKey, dragged: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const p = pointer.current;
    if (!p || p.id !== event.pointerId) return;
    const dx = event.clientX - p.start.x;
    const dy = event.clientY - p.start.y;
    if (!p.dragged && Math.hypot(dx, dy) <= 5) return;
    if (!p.dragged) {
      p.dragged = true;
      stopForGesture();
      setDragging(true);
      if (!p.rotate) detach();
    }
    suppressClick.current = true;
    if (p.rotate) {
      orientation.current = { yaw: p.orientation.yaw + dx * .016, pitch: tilt(p.orientation.pitch + dy * .012), direct: true };
      if (reduced) setPoseTick((n) => n + 1);
    } else {
      place(sweepNavbar(point.current, clampPoint({ x: p.initial.x + dx, y: p.initial.y + dy }, viewport.current), navbar.current));
    }
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    const p = pointer.current;
    if (p?.id !== event.pointerId) return;
    pointer.current = null;
    if (p.dragged) {
      orientation.current = { ...orientation.current, direct: false };
      if (p.rotate) restingOrientation.current = orientation.current;
      setDragging(false);
      setTimeout(() => { suppressClick.current = false; }, 0);
    }
  }

  function keys(event: KeyboardEvent<HTMLButtonElement>) {
    const direction: Record<string, Point> = {
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    };
    const delta = direction[event.key];
    if (event.key === "Escape" && (isTravelMove(requestRef.current.id, returning.current) || isLap(requestRef.current.id))) {
      event.preventDefault();
      stopRoaming();
      return;
    }
    if (event.key === "Home" && detached && visible) {
      event.preventDefault();
      walkHome();
      return;
    }
    if (!delta || !visible) return;
    event.preventDefault();
    stopForGesture();
    if (event.shiftKey || rotate) {
      const current = orientation.current;
      orientation.current = { yaw: current.yaw + delta.x * .22, pitch: tilt(current.pitch + delta.y * .18), direct: true };
      restingOrientation.current = { ...orientation.current, direct: false };
      if (reduced) setPoseTick((n) => n + 1);
    } else {
      detach();
      place(sweepNavbar(point.current, clampPoint({ x: point.current.x + delta.x * 24, y: point.current.y + delta.y * 24 }, viewport.current), navbar.current));
    }
  }

  return (
    <div className={styles.stage} ref={stage} data-kitcart-pet-dock="">
      {ready && !failed ? createPortal(
        <div className={styles.actor} ref={bindActor} hidden={!visible} data-kitcart-pet="" data-docked={!detached}>
          <PetBoundary onError={onError}>
            <Rig request={request} playing={visible && (!reduced || Boolean(request.manual) || dragging)}
              happy={happy} dragging={dragging} reduced={reduced} poseTick={poseTick}
              onStart={onStart} onEnd={onEnd} onError={onError} onClipError={onClipError} onFrame={onFrame} />
          </PetBoundary>
          <button type="button" className={styles.hit} aria-label={isTravelMove(request.id, request.home) || isLap(request.id) ? "Stop the roaming KitCart robot" : "Pet the KitCart robot. Drag or use the arrow keys to move. Hold Shift to rotate. Press Home to return."}
            title={returning.current ? "Walking back to KitCart" : isRoamingMove(request.id) || isLap(request.id) ? "Click to stop roaming" : undefined}
            data-rotate={rotate} onClick={tap} onPointerDown={down} onPointerMove={move} onKeyDown={keys}
            onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} />
        </div>, document.body
      ) : null}
      {failed ? <span className={styles.loading} role="status">Pet preview unavailable</span> : (
        <div className={styles.controls}>
          <button type="button" aria-expanded={menu} aria-controls="kitcart-hero-pet-menu" onClick={() => setMenu(!menu)} aria-label="Pet moves">Moves</button>
          {menu && (
            <div id="kitcart-hero-pet-menu" className={styles.menu} onKeyDown={(event) => {
              if (event.key === "Escape") {
                setMenu(false);
                event.currentTarget.parentElement?.querySelector("button")?.focus();
              }
            }}>
              <label>Choose an animation
                <select value={selected} onChange={(event) => setSelected(event.target.value as MoveId)}>
                  {choices.map(([id, value]) => <option key={id} value={id}>{value.label}</option>)}
                </select>
              </label>
              <div className={styles.menuButtons}>
                <button type="button" onClick={(event) => {
                  if (isRoamingMove(selected) || isLap(selected)) {
                    event.currentTarget.closest("#kitcart-hero-pet-menu")?.parentElement?.querySelector("button")?.focus();
                    setMenu(false);
                  }
                  returning.current = false;
                  play(selected, true);
                }}>Play</button>
                <button type="button" onClick={stopRoaming}>{isTravelMove(request.id, request.home) || isLap(request.id) ? "Stop roaming" : "Reset to idle"}</button>
                <button type="button" aria-pressed={rotate} onClick={() => setRotate(!rotate)}>Rotate mode</button>
                <button type="button" onClick={walkHome}>Return home</button>
              </div>
              <small>{rotate ? "Drag to turn the robot in 3D." : "Drag to move. Shift-drag to rotate."}</small>
              <span role="status">{status}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimationMixer, DoubleSide, LoopOnce, LoopRepeat, MathUtils, MeshBasicMaterial, SkinnedMesh } from "three";
import type { AnimationAction, AnimationClip, Bone, Group, OrthographicCamera } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { useRobotHeadTracking } from "../3d/hooks/useRobotHeadTracking";
import { useRobotAutoBlink } from "../3d/hooks/useRobotAutoBlink";
import { createVisorFaceTexture, updateVisorFaceTexture } from "../3d/visor/faceRenderer";
import { createBoundVisorMesh, createVisorGeometry, validateVisorMask, VISOR_GEOMETRY_CONFIG, type VisorMaskData } from "../3d/visor/visorGeometry";
import type { Expression } from "../2d/robot-face";
import { moves, type MoveId } from "./hero-pet-moves";
import { gaitFor, idlePixelsPerUnit, inPlaceStairs, isLap, isTravelMove, playCount, roamCameraPitch, seamlessClip, splitLap, type LapPath } from "./hero-pet-motion";
import styles from "./hero-pet.module.css";

const base = "/models/kitcart/animations/stay-in-place/idle.glb";
const clips = new Map<MoveId, Promise<AnimationClip>>();
export type Request = { id: MoveId; serial: number; manual?: boolean; home?: boolean };
export type Orientation = { yaw: number; pitch: number; direct: boolean };
type Props = {
  request: Request; playing: boolean; happy: boolean; dragging: boolean; reduced: boolean;
  poseTick: number; onStart: (id: MoveId, lap?: LapPath) => void; onEnd: (id: MoveId) => void;
  onError: () => void; onClipError: (id: MoveId) => void;
  onFrame: (delta: number, id: MoveId, phase: number, weight: number) => Orientation;
};

function clipFor(id: MoveId) {
  let clip = clips.get(id);
  if (!clip) {
    clip = new GLTFLoader().loadAsync(`/models/kitcart/pet-motion/${id}.glb`).then((gltf) => {
      const result = gltf.animations[0];
      if (!result) throw new Error("No pet motion found.");
      return result;
    }).catch((error) => { clips.delete(id); throw error; });
    clips.set(id, clip);
  }
  return clip;
}

function Rig(props: Props & { mask: VisorMaskData }) {
  const { request, mask } = props;
  const current = useRef(props);
  useEffect(() => { current.current = props; }, [props]);
  const scene = useGLTF(base);
  const model = useMemo(() => clone(scene.scene), [scene.scene]);
  const source = useMemo(() => {
    let found: SkinnedMesh | undefined;
    model.traverse((obj) => {
      if (obj instanceof SkinnedMesh && obj.geometry.getAttribute("position")?.count === 24961) found = obj;
    });
    return found;
  }, [model]);
  const head = source?.skeleton.bones.find((bone) => bone.name.replace(/[^a-z0-9]/gi,"").toLowerCase() === "mixamorighead") as Bone | undefined;
  const gaze = useRobotHeadTracking({ head: head ?? null, enabled: !props.reduced });
  const blink = useRobotAutoBlink({ enabled: props.playing && !props.reduced }).blinking;
  const texture = useMemo(() => createVisorFaceTexture({ expression: "normal" }), []);
  const [face, setFace] = useState<Expression>("normal");
  const mixer = useMemo(() => new AnimationMixer(model), [model]);
  const group = useRef<Group>(null);
  const camera = useThree((state) => state.camera) as OrthographicCamera;
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => { invalidate(); }, [invalidate, props.playing, props.dragging, props.poseTick, face, props.happy, blink]);
  const active = useRef<{ id: MoveId; action: AnimationAction } | null>(null);
  const bridged = useMemo(() => new WeakMap<AnimationClip, AnimationClip>(), []);
  const laps = useMemo(() => new WeakMap<AnimationClip, ReturnType<typeof splitLap>>(), []);
  const freezePose = useRef(false);
  const outgoing = useRef(new Map<AnimationAction, number>());
  const ended = useRef<MoveId | null>(null);

  useEffect(() => {
    if (!source?.parent) { current.current.onError(); return; }
    const geometry = createVisorGeometry({ source, selectedFaces: mask.selectedFaces });
    const material = new MeshBasicMaterial({
      map: texture, transparent: true, alphaTest: 0.02, depthWrite: false,
      side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    });
    const visor = createBoundVisorMesh(source, geometry, material);
    const parent = source.parent;
    parent.add(visor);
    return () => { parent.remove(visor); geometry.dispose(); material.dispose(); };
  }, [source, mask, texture]);

  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => { updateVisorFaceTexture(texture, { expression: props.happy && face === "normal" ? "happy" : face, blinking: blink }); }, [texture, face, props.happy, blink]);

  useEffect(() => {
    const finish = (event: { action: AnimationAction }) => {
      if (active.current?.action === event.action) ended.current = active.current.id;
    };
    mixer.addEventListener("finished", finish);
    return () => { mixer.removeEventListener("finished", finish); mixer.stopAllAction(); active.current = null; outgoing.current.clear(); };
  }, [mixer]);

  useEffect(() => {
    let stale = false;
    const definition = moves[request.id];
    const pending = request.id === "idle" ? Promise.resolve(scene.animations[0]) : clipFor(request.id);
    void pending.then((clip) => {
      if (stale || !clip) return;
      const previous = active.current?.action;
      const count = playCount(request.id, clip.duration, Boolean(request.manual), request.home);
      let lap = laps.get(clip);
      if (!lap && isLap(request.id)) {
        lap = splitLap(clip);
        laps.set(clip, lap);
      }
      let playable = lap?.pose ?? clip;
      if (count > 1) {
        playable = bridged.get(clip) ?? seamlessClip(request.id === "stairs" ? inPlaceStairs(clip) : clip);
        bridged.set(clip, playable);
      }
      const action = mixer.clipAction(playable);
      outgoing.current.delete(action);
      action.reset().setEffectiveWeight(1).setEffectiveTimeScale(isTravelMove(request.id, request.home) ? gaitFor(request.id).timeScale : lap ? .73 : 1);
      action.setLoop(definition.mode === "loop" || count > 1 ? LoopRepeat : LoopOnce, definition.mode === "loop" ? Infinity : count);
      action.clampWhenFinished = definition.mode !== "loop";
      action.play();
      const fade = request.id === "idle" ? .36 : .18;
      if (previous && previous !== action) {
        if (current.current.playing) {
          action.crossFadeFrom(previous, fade, false);
          outgoing.current.set(previous, mixer.time + fade + .03);
        } else {
          previous.stop();
          outgoing.current.delete(previous);
        }
      }
      if (request.id === "idle" && current.current.reduced) {
        for (const old of outgoing.current.keys()) old.stop();
        outgoing.current.clear();
        // Paint the idle pose even when the render loop is paused.
        freezePose.current = true;
        invalidate();
      }
      active.current = { id: request.id, action };
      ended.current = null;
      setFace(definition.face);
      current.current.onStart(request.id, lap?.path ?? undefined);
    }).catch(() => { if (!stale) current.current.onClipError(request.id); });
    return () => { stale = true; };
  }, [request, mixer, scene.animations, bridged, laps, invalidate]);

  useFrame((_, delta) => {
    const p = current.current;
    const a = active.current;

    const dt = Math.min(.05, delta);
    const orientation = p.onFrame(p.playing ? dt : 0, a?.id ?? "idle", a?.action.time ?? 0, a?.action.getEffectiveWeight() ?? 0);
    if (group.current) {
      const id = a?.id ?? "idle";
      const orbit = isTravelMove(id, request.home) || isLap(id) ? roamCameraPitch : 0;
      const elevation = p.playing ? MathUtils.damp(-camera.rotation.x, orbit, 5, dt) : orbit;
      camera.rotation.x = -elevation;
      camera.position.y = .55 + Math.sin(elevation) * 5;
      camera.position.z = Math.cos(elevation) * 5;
      // Every action uses Idle's exact orthographic pixels-per-unit.
      if (camera.zoom !== idlePixelsPerUnit) {
        camera.zoom = idlePixelsPerUnit;
        camera.updateProjectionMatrix();
      }
      const angle = orientation.yaw - group.current.rotation.y;
      const step = orientation.direct || !p.playing ? 1 : 1 - Math.exp(-dt * 10);
      group.current.rotation.y += Math.atan2(Math.sin(angle), Math.cos(angle)) * step;
      group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, orientation.pitch, step);
    }
    if (freezePose.current) {
      freezePose.current = false;
      gaze.beforeAnimationUpdate();
      mixer.update(0);
      gaze.afterAnimationUpdate(0, false);
    }
    if (!p.playing) return;
    gaze.beforeAnimationUpdate();
    mixer.update(dt);
    gaze.afterAnimationUpdate(delta, a?.id === "idle" && !p.dragging && !p.reduced);
    for (const [action, stopAt] of outgoing.current) if (mixer.time >= stopAt) { action.stop(); outgoing.current.delete(action); }
    if (ended.current) {
      const id = ended.current;
      ended.current = null;
      p.onEnd(id);
    }
  });

  // Rotate about the robot's center, not its feet. Keep the corrected camera framing.
  return <group position={[0, .47, 0]}><group ref={group}>
    <group position={[0, -.47, 0]}><primitive object={model} /></group>
  </group></group>;
}

export default function HeroPetRig(props: Props) {
  const [mask, setMask] = useState<VisorMaskData | null>(null);
  const onError = props.onError;
  useEffect(() => {
    const controller = new AbortController();
    fetch(VISOR_GEOMETRY_CONFIG.maskUrl, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Visor unavailable"); return response.json(); })
      .then((data: unknown) => { if (!validateVisorMask(data)) throw new Error("Invalid visor mask"); setMask(data); })
      .catch(() => { if (!controller.signal.aborted) onError(); });
    return () => controller.abort();
  }, [onError]);

  return (
    <div className={styles.canvas} aria-hidden="true">
      {mask ? <Canvas orthographic camera={{ position: [0, .55, 5], rotation: [0, 0, 0], near: .1, far: 30 }} dpr={[1, 1.5]}
        frameloop={props.playing ? "always" : "demand"} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={1.8} />
        <hemisphereLight args={["#e8f4ff", "#7970a9", 2]} />
        <directionalLight position={[3, 4, 5]} intensity={3} />
        <directionalLight position={[-3, 2, -4]} intensity={2} />
        <Suspense fallback={null}><Rig {...props} mask={mask} /></Suspense>
      </Canvas> : <span className={styles.loading}>Loading robot…</span>}
    </div>
  );
}

import { AnimationClip, Quaternion } from "three";
import { moves, type MoveId } from "./hero-pet-moves";

export type Point = { x: number; y: number };
export type Bounds = { left: number; top: number; right: number; bottom: number };

export const isRoamingMove = (id: MoveId) => moves[id].travel === "lane" || id === "swim";

export const isLap = (id: MoveId) => moves[id].travel === "baked";
export const isTravelMove = (id: MoveId, home = false) => isRoamingMove(id) || (home && id === "stairs");

const returnMoves = ["walk3", "walk2", "walk", "patrol", "sidewalk", "run", "flee", "stairs"] as const;
export function nextReturnMove(previous: MoveId | null, distance: number, random = Math.random): MoveId {
  const choices = (distance < 45 ? returnMoves.slice(0, 3) : returnMoves).filter((id) => id !== previous);
  return choices[Math.floor(random() * choices.length)]!;
}

export const idlePixelsPerUnit = 140 / 1.29;
export function playCount(id: MoveId, duration: number, manual: boolean, home = false) {
  if (home && isTravelMove(id, home)) return Infinity;
  if (isRoamingMove(id)) return manual ? Infinity : Math.max(2, Math.ceil(24 * gaitFor(id).timeScale / duration));
  if (id === "stairs") return 5;
  if (["jump", "dance", "box", "afraid"].includes(id) || (manual && id === "wave2")) {
    return Math.max(2, Math.ceil(5 / duration));
  }
  return 1;
}

/** The short stairs cycle climbs by a fixed amount on every pass. Remove that
 * per-cycle rise so its footwork can loop without jumping back down a step. */
export function inPlaceStairs(clip: AnimationClip) {
  const result = clip.clone();
  const hips = result.tracks.find((track) => track.name === "mixamorigHips.position");
  if (!hips || hips.getValueSize() !== 3) return result;
  const rise = hips.values[hips.values.length - 2] - hips.values[1];
  const first = hips.times[0];
  const span = hips.times[hips.times.length - 1] - first;
  if (span > 0) {
    for (let i = 0; i < hips.times.length; i++) {
      hips.values[i * 3 + 1] -= rise * (hips.times[i] - first) / span;
    }
  }
  return result;
}

/** Use native looping for closed clips. Bridge mismatched ends with the correct
 * quaternion interpolation instead of snapping joints to the first pose. */
export function seamlessClip(clip: AnimationClip) {
  const quatStart = new Quaternion();
  const quatEnd = new Quaternion();
  const blended = new Quaternion();
  let angle = 0;
  let distance = 0;
  for (const track of clip.tracks) {
    const last = track.values.length - track.getValueSize();
    if (track.ValueTypeName === "quaternion") {
      angle = Math.max(angle, quatStart.fromArray(track.values).normalize()
        .angleTo(quatEnd.fromArray(track.values, last).normalize()));
    } else if (track.name.endsWith(".position")) {
      const v = track.values;
      distance = Math.max(distance, Math.hypot(v[0] - v[last], v[1] - v[last + 1], v[2] - v[last + 2]));
    }
  }
  if (angle < .035 && distance < .003) return clip;
  const duration = clip.duration + Math.min(.4, Math.max(.14, angle * .24, distance * .6));
  const tracks = clip.tracks.map((track) => {
    const next = track.clone();
    const stride = track.getValueSize();
    const old = track.values;
    const last = old.length - stride;
    const steps = 6;
    const tail = track.times[track.times.length - 1] < clip.duration ? 1 : 0;
    next.times = new Float32Array(track.times.length + tail + steps);
    next.times.set(track.times);
    next.values = new Float32Array(old.length + (tail + steps) * stride);
    next.values.set(old);
    if (tail) {
      next.times[track.times.length] = clip.duration;
      next.values.set(old.subarray(last), old.length);
    }
    for (let i = 1; i <= steps; i++) {
      const f = i / steps;
      const eased = f * f * (3 - 2 * f);
      const index = track.times.length + tail + i - 1;
      next.times[index] = clip.duration + (duration - clip.duration) * f;
      const offset = index * stride;
      if (track.ValueTypeName === "quaternion") {
        blended.slerpQuaternions(quatEnd.fromArray(old, last).normalize(), quatStart.fromArray(old).normalize(), eased)
          .toArray(next.values, offset);
      } else {
        for (let j = 0; j < stride; j++) next.values[offset + j] = old[last + j] + (old[j] - old[last + j]) * eased;
      }
    }
    return next;
  });
  return new AnimationClip(clip.name + "-seamless", duration, tracks, clip.blendMode);
}

export function clampPoint(point: Point, bounds: Bounds): Point {
  return {
    x: Math.min(bounds.right, Math.max(bounds.left, point.x)),
    y: Math.min(bounds.bottom, Math.max(bounds.top, point.y)),
  };
}

type Gait = { duration: number; pace: number; timeScale: number; stride: number[] };
// Sampled from the authored toe motion during stance (arm strokes for Swim).
const gaits: Partial<Record<MoveId, Gait>> = {
  walk: { duration: 2.16667, pace: 27, timeScale: 0.76, stride: [0.15, 0.32, 0.67, 1.14, 1.58, 1.69, 1.49, 1.35, 1.26, 1.22, 1.25, 1.25, 1.22, 1.24, 1.5, 1.7, 1.45, 1.23, 1.25, 1.28, 1.29, 1.15, 0.9, 0.85, 0.97, 0.97, 0.73, 0.4, 0.19, 0.12, 0.1, 0.09] },
  walk2: { duration: 3.66667, pace: 27, timeScale: 0.78, stride: [0.73, 0.92, 1.2, 1.14, 0.93, 0.89, 1.04, 1.33, 1.37, 1.01, 0.82, 0.93, 1.14, 1.18, 0.95, 0.84, 0.98, 1.2, 1.26, 1, 0.8, 0.81, 0.96, 1.15, 1.07, 0.78, 0.67, 0.75, 0.97, 1.18, 1.13, 0.89] },
  walk3: { duration: 2.33333, pace: 26, timeScale: 0.75, stride: [0.66, 0.78, 1.02, 1.27, 1.34, 1.16, 0.94, 0.85, 0.84, 0.87, 0.96, 1.18, 1.36, 1.23, 0.95, 0.81, 0.79, 0.88, 1.11, 1.35, 1.35, 1.09, 0.85, 0.8, 0.81, 0.84, 0.96, 1.16, 1.24, 1.06, 0.83, 0.7] },
  run: { duration: 1.25000, pace: 44, timeScale: 0.68, stride: [0.97, 1.19, 1.58, 1.51, 0.78, 0.26, 0.47, 0.87, 1.07, 1.14, 1.25, 1.38, 1.13, 0.63, 0.63, 1.04, 1.25, 1.36, 1.6, 1.59, 0.92, 0.28, 0.32, 0.7, 0.99, 1.12, 1.22, 1.35, 1.2, 0.72, 0.62, 0.87] },
  flee: { duration: 2.66667, pace: 31, timeScale: 0.75, stride: [0.18, 0.26, 0.18, 0.07, 0.02, 0.07, 0.26, 0.65, 1.28, 1.84, 1.56, 0.8, 1.04, 2.08, 2.2, 1.58, 1.15, 1.97, 2.2, 1.38, 0.59, 1.12, 2.12, 2.2, 1.32, 0.93, 1.07, 0.83, 0.39, 0.17, 0.06, 0.06] },
  patrol: { duration: 9.95833, pace: 17, timeScale: 0.8, stride: [0.3, 0.83, 1.32, 1.42, 1.54, 1.59, 1.32, 1.17, 1.36, 1.41, 1.31, 1.13, 0.94, 1.1, 1.37, 1.19, 1.11, 1.25, 1.28, 1.29, 1.09, 1.14, 1.27, 1.35, 1.34, 0.82, 0.34, 0.16, 0.07, 0.07, 0.03, 0.08] },
  sidewalk: { duration: 7.95833, pace: 15, timeScale: 0.8, stride: [1.46, 2.2, 2.2, 1.85, 1.1, 0.71, 0.3, 0.23, 0.78, 2.08, 2.2, 1.97, 0.9, 0.42, 0.14, 0.17, 0.8, 2.09, 2.2, 2.2, 1.28, 0.62, 0.32, 0.18, 0.17, 0.14, 0.08, 0.05, 0.04, 0.03, 0.01, 0.41] },
  swim: { duration: 5.70833, pace: 22, timeScale: 0.88, stride: [0.18, 0.18, 0.18, 0.18, 0.33, 1.03, 2.2, 2.2, 2.2, 2.2, 1.36, 0.67, 0.29, 0.18, 0.18, 0.18, 0.18, 0.18, 0.21, 0.45, 1.15, 2.18, 2.2, 2.2, 2.2, 1.68, 0.86, 0.35, 0.19, 0.18, 0.18, 0.18] },
  stairs: { duration: 0.79167, pace: 24, timeScale: 0.69, stride: [0.28, 0.46, 0.83, 1.07, 1.21, 1.37, 1.63, 1.87, 1.85, 1.64, 1.32, 0.96, 0.63, 0.5, 0.53, 0.59, 0.66, 0.78, 1, 1.3, 1.58, 1.73, 1.71, 1.61, 1.36, 0.99, 0.66, 0.46, 0.38, 0.36, 0.37, 0.33] },
};

export function gaitFor(id: MoveId): Gait {
  return gaits[id] ?? gaits.walk3!;
}

export function stridePace(gait: Gait, time: number) {
  if (time >= gait.duration) {
    // The generated seam is for settling the pose, not another push-off.
    return 0;
  }
  const bin = Math.max(0, time) / gait.duration * gait.stride.length;
  const i = Math.floor(bin);
  const mix = bin - i;
  return gait.pace * (gait.stride[i] * (1 - mix) + gait.stride[(i + 1) % gait.stride.length] * mix);
}

export function roamTarget(from: Point, bounds: Bounds, random = Math.random): Point {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const minimum = Math.hypot(width, height) * .22;
  let best = from;
  let longest = 0;
  // Sample the viewport itself. Local offsets tend to keep the pet in the same corner.
  for (let i = 0; i < 12; i++) {
    const next = { x: bounds.left + random() * width, y: bounds.top + random() * height };
    const distance = Math.hypot(next.x - from.x, next.y - from.y);
    if (distance > 1 && distance >= minimum) return next;
    if (distance > longest) { longest = distance; best = next; }
  }
  return best;
}

export const roamCameraPitch = .26;
const verticalProjection = Math.sin(roamCameraPitch);

// Both lateral clips push off toward rig-local +X. Align +X, not the
// robot's forward (+Z) axis, to the intended world-space travel heading.
export function gaitYawOffset(id: MoveId) {
  return id === "sidewalk" || id === "patrol" ? -Math.PI / 2 : 0;
}

export function stepToward(from: Point, target: Point, yaw: number, pace: number, dt: number, side = 0) {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < .5 || dt <= 0) return { point: from, yaw, arrived: distance < .5 };
  const heading = Math.atan2(dx, dy / verticalProjection);
  const difference = Math.atan2(Math.sin(heading + side - yaw), Math.cos(heading + side - yaw));
  const turn = Math.max(-2.8 * dt, Math.min(2.8 * dt, difference));
  // Turn before taking the next step. Ease off on arrival and when still facing away.
  const aligned = Math.max(0, Math.cos(difference - turn));
  const slow = Math.min(1, Math.max(.24, distance / 36));
  // Forward motion projects shorter on screen than sideways motion.
  const projection = Math.max(.58, Math.hypot(Math.sin(heading), verticalProjection * Math.cos(heading)));
  const travel = Math.min(distance, pace * projection * dt * slow * aligned * aligned * aligned);
  return {
    point: { x: from.x + dx * travel / distance, y: from.y + dy * travel / distance },
    yaw: yaw + turn,
    arrived: distance - travel < .5,
  };
}

// Keep the authored lap's path independent of model scale. These curves use the
// same local X and Z axes as the Idle rig, and start at the current screen point.
export type LapPath = { times: Float32Array; values: Float32Array };
export type LapPlan = { origin: Point; path: LapPath; yaw: number; scale: number };
export function splitLap(clip: AnimationClip) {
  const pose = clip.clone();
  const hips = pose.tracks.find((track) => track.name === "mixamorigHips.position");
  if (!hips || hips.getValueSize() !== 3) return { pose, path: null };
  const values = new Float32Array(hips.times.length * 2);
  for (let i = 0; i < hips.times.length; i++) {
    values[i * 2] = hips.values[i * 3] - hips.values[0];
    values[i * 2 + 1] = hips.values[i * 3 + 2] - hips.values[2];
    hips.values[i * 3] = hips.values[0];
    hips.values[i * 3 + 2] = hips.values[2];
  }
  return { pose, path: { times: hips.times, values } };
}

function projectLap(x: number, z: number, yaw: number): Point {
  return {
    x: (x * Math.cos(yaw) + z * Math.sin(yaw)) * idlePixelsPerUnit,
    y: (z * Math.cos(yaw) - x * Math.sin(yaw)) * idlePixelsPerUnit * verticalProjection,
  };
}

export function fitLap(path: LapPath, origin: Point, zones: Bounds[], yaw: number): LapPlan {
  const plan = { path, origin, yaw, scale: 0 };
  for (const bounds of zones) {
    if (origin.x < bounds.left || origin.x > bounds.right || origin.y < bounds.top || origin.y > bounds.bottom) continue;
    for (let j = 0; j < 8; j++) {
      const angle = yaw + j * Math.PI / 4;
      let scale = .85;
      for (let i = 0; i < path.values.length; i += 2) {
        const p = projectLap(path.values[i], path.values[i + 1], angle);
        if (p.x < 0) scale = Math.min(scale, (bounds.left - origin.x) / p.x);
        if (p.x > 0) scale = Math.min(scale, (bounds.right - origin.x) / p.x);
        if (p.y < 0) scale = Math.min(scale, (bounds.top - origin.y) / p.y);
        if (p.y > 0) scale = Math.min(scale, (bounds.bottom - origin.y) / p.y);
      }
      if (scale > plan.scale + 1e-6) { plan.yaw = angle; plan.scale = scale; }
    }
  }
  return plan;
}

export function lapPoint(plan: LapPlan, time: number) {
  const { times, values } = plan.path;
  let lo = 0;
  let hi = times.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] > time) hi = mid;
    else lo = mid;
  }
  const span = times[hi] - times[lo];
  const t = span > 0 ? Math.max(0, Math.min(1, (time - times[lo]) / span)) : 0;
  const x = values[lo * 2] * (1 - t) + values[hi * 2] * t;
  const z = values[lo * 2 + 1] * (1 - t) + values[hi * 2 + 1] * t;
  const offset = projectLap(x, z, plan.yaw);
  return { x: plan.origin.x + offset.x * plan.scale, y: plan.origin.y + offset.y * plan.scale };
}

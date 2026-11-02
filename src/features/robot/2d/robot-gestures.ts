
import type { RobotGesture } from "./robot-animation.types";

export type GestureDefinition = {
  name: RobotGesture;

  // Which part of the robot is primarily involved?
  target:
    | "none"
    | "head"
    | "body"
    | "arms"
    | "hands";

  // Whether our existing 2.5D layered robot
  // can perform the gesture right now.
  supportedIn2D: boolean;

  // Whether this gesture needs independently
  // animated limbs or a rigged 3D model.
  requiresRig: boolean;
};

export const ROBOT_GESTURES: Record<
  RobotGesture,
  GestureDefinition
> = {
  none: {
    name: "none",
    target: "none",
    supportedIn2D: true,
    requiresRig: false,
  },

  nod: {
    name: "nod",
    target: "head",
    supportedIn2D: true,
    requiresRig: false,
  },

  "curious-tilt": {
    name: "curious-tilt",
    target: "head",
    supportedIn2D: true,
    requiresRig: false,
  },

  wave: {
    name: "wave",
    target: "arms",
    supportedIn2D: false,
    requiresRig: true,
  },

  "cover-eyes": {
    name: "cover-eyes",
    target: "hands",
    supportedIn2D: false,
    requiresRig: true,
  },

  peek: {
    name: "peek",
    target: "hands",
    supportedIn2D: false,
    requiresRig: true,
  },

  celebrate: {
    name: "celebrate",
    target: "arms",
    supportedIn2D: false,
    requiresRig: true,
  },

  bounce: {
    name: "bounce",
    target: "body",
    supportedIn2D: true,
    requiresRig: false,
  },
};

export function getGestureDefinition(
  gesture: RobotGesture
): GestureDefinition {
  return ROBOT_GESTURES[gesture];
}

export function canRenderGestureIn2D(
  gesture: RobotGesture
): boolean {
  return ROBOT_GESTURES[gesture].supportedIn2D;
}

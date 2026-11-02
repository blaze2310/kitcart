
import type { Expression } from "./robot-face";

// Every reaction has a named source.
export type RobotReactionSource =
  | "idle"
  | "interaction"
  | "authentication"
  | "system";

// Current and planned physical gestures.
// Adding a gesture here does not implement its animation.
export type RobotGesture =
  | "none"
  | "nod"
  | "curious-tilt"
  | "wave"
  | "cover-eyes"
  | "peek"
  | "celebrate"
  | "bounce";

// Events are semantic: the controller decides how they animate.
export type RobotEvent =
  | "IDLE_START"
  | "IDLE_GESTURE"
  | "IDLE_END"
  | "ROBOT_CLICK"
  | "ROBOT_LOVED"
  | "USERNAME_FOCUS"
  | "PASSWORD_FOCUS"
  | "PASSWORD_REVEAL"
  | "OTP_WAITING"
  | "LOGIN_LOADING"
  | "LOGIN_SUCCESS"
  | "LOGIN_ERROR"
  | "SIGNUP_WELCOME"
  | "LOGOUT";

// Priority increases with the numeric value.
export const ROBOT_PRIORITY = {
  AMBIENT: 10,
  INTERACTIVE: 20,
  IMPORTANT: 30,
  CRITICAL: 40,
} as const;

export type RobotPriority =
  (typeof ROBOT_PRIORITY)[keyof typeof ROBOT_PRIORITY];

// A single coordinated face + body instruction.
export type RobotReaction = {
  id: string;
  source: RobotReactionSource;
  priority: RobotPriority;

  expression?: Expression;
  gesture: RobotGesture;

  // If omitted, the reaction lasts until explicitly released.
  durationMs?: number;
};

// Controller-visible state.
// Later, separate face/body renderers can consume these fields.
export type RobotAnimationState = {
  activeReaction: RobotReaction | null;
  expression: Expression;
  gesture: RobotGesture;
  isIdle: boolean;
};

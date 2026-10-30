
import type { Expression } from "@/components/mascot/robot-face";

export const ROBOT_ANIMATION_BASE =
  "/models/kitcart/animations/stay-in-place/";

export const ROBOT_MODEL_URL =
  `${ROBOT_ANIMATION_BASE}idle.glb`;

export type RobotPlaybackMode = "loop" | "once" | "hold";
export type RobotFeature = "core" | "login" | "pet";

export type RobotAnimationDefinition = {
  id: string;
  label: string;
  file: string;
  expression: Expression;
  playback: RobotPlaybackMode;
  features: readonly RobotFeature[];
  transitionSeconds: number;
  mouseTracking: boolean;
};

export const ROBOT_ANIMATIONS = {
  idle: {
    id: "idle",
    label: "Idle",
    file: "idle.glb",
    expression: "normal",
    playback: "loop",
    features: ["core", "login", "pet"],
    transitionSeconds: 0.12,
    mouseTracking: true,
  },
  looking: {
    id: "looking",
    label: "Looking Around",
    file: "looking+around.glb",
    expression: "curious",
    playback: "loop",
    features: ["core", "pet"],
    transitionSeconds: 0.12,
    mouseTracking: false,
  },
  wave: {
    id: "wave",
    label: "Greeting Wave",
    file: "greet+wave+sup.glb",
    expression: "happy",
    playback: "loop",
    features: ["core", "login", "pet"],
    transitionSeconds: 0.12,
    mouseTracking: false,
  },
  wave2: {
    id: "wave2",
    label: "Greeting Wave 2",
    file: "greet+wave+sup+2.glb",
    expression: "happy",
    playback: "loop",
    features: ["core", "pet"],
    transitionSeconds: 0.12,
    mouseTracking: false,
  },
  clapping: {
    id: "clapping",
    label: "Clapping",
    file: "clapping.glb",
    expression: "happy",
    playback: "loop",
    features: ["core", "login", "pet"],
    transitionSeconds: 0.12,
    mouseTracking: false,
  },
  stretch: {
    id: "stretch",
    label: "Stretch",
    file: "stretch.glb",
    expression: "eyes-closed",
    playback: "loop",
    features: ["core", "login", "pet"],
    transitionSeconds: 0.12,
    mouseTracking: false,
  },
  peek: {
    id: "peek",
    label: "Password Sneak",
    file: "password+sneak+2.glb",
    expression: "focused",
    playback: "loop",
    features: ["login"],
    transitionSeconds: 0.12,
    mouseTracking: false,
  },
  head: {
    id: "head",
    label: "Sneaky Head",
    file: "sneaky+head+for+password.glb",
    expression: "curious",
    playback: "loop",
    features: ["login"],
    transitionSeconds: 0.12,
    mouseTracking: false,
  },
  lean: {
    id: "lean",
    label: "Side Lean",
    file: "side+lean+pose.glb",
    expression: "confused",
    playback: "loop",
    features: ["login", "pet"],
    transitionSeconds: 0.12,
    mouseTracking: false,
  },
  turn: {
    id: "turn",
    label: "Turn",
    file: "turn.glb",
    expression: "surprised",
    playback: "loop",
    features: ["login", "pet"],
    transitionSeconds: 0.12,
    mouseTracking: false,
  },
  sad: {
    id: "sad",
    label: "Sad Animation",
    file: "sad.glb",
    expression: "sad",
    playback: "loop",
    features: ["core", "pet"],
    transitionSeconds: 0.12,
    mouseTracking: false,
  },
  shy: {
    id: "shy",
    label: "Shy",
    file: "shy.glb",
    expression: "loved",
    playback: "once",
    features: ["core", "login", "pet"],
    transitionSeconds: 0.12,
    mouseTracking: false,
  },
} as const satisfies Record<string, RobotAnimationDefinition>;

export type RobotAnimationId = keyof typeof ROBOT_ANIMATIONS;

export const ROBOT_ANIMATION_IDS =
  Object.keys(ROBOT_ANIMATIONS) as RobotAnimationId[];

export function getRobotAnimation(
  id: RobotAnimationId
): RobotAnimationDefinition {
  return ROBOT_ANIMATIONS[id];
}

export function getRobotAnimationUrl(
  id: RobotAnimationId
): string {
  return ROBOT_ANIMATION_BASE + ROBOT_ANIMATIONS[id].file;
}

export function getRobotAnimationsForFeature(
  feature: RobotFeature
): RobotAnimationDefinition[] {
  return ROBOT_ANIMATION_IDS
    .map((id) => ROBOT_ANIMATIONS[id])
    .filter((animation) =>
      animation.features.some((item) => item === feature)
    );
}

export function getRobotPreloadUrls(
  feature: RobotFeature
): string[] {
  return [
    ...new Set([
      ROBOT_MODEL_URL,
      ...getRobotAnimationsForFeature(feature).map(
        (animation) =>
          ROBOT_ANIMATION_BASE + animation.file
      ),
    ]),
  ];
}


import {
  CanvasTexture,
  SRGBColorSpace,
} from "three";

import type {
  Expression,
} from "@/components/mascot/robot-face";

export type VisorFaceOptions = {
  expression: Expression;
  gap?: number;
  blinking?: boolean;
};

export const VISOR_FACE_COLORS = {
  primary: "#8FEFFF",
  glow: "#00BFFF",
  loved: "#FF80BB",
  blushGlow: "#FF8BC3",
  blushHighlight: "#FFC1DD",
} as const;

export const VISOR_FACE_SIZE = {
  width: 1024,
  height: 648,
} as const;

/**
 * Draw the approved KitCart face on an existing canvas.
 *
 * Does not create or dispose a Three.js texture.
 * Supports all twelve approved expressions.
 */
export function drawVisorFace(
  canvas: HTMLCanvasElement,
  {
    expression,
    gap = expression === "happy" ? 18 : 0,
    blinking = false,
  }: VisorFaceOptions
): void {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context unavailable");
  }

  // This non-null constant is safe in nested functions.
  const ctx = context;

  ctx.resetTransform();
  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.setTransform(2, 0, 0, 2, -610, -468);

  function stroke(path: string, width = 29) {
    const shape = new Path2D(path);

    ctx.save();
    ctx.strokeStyle = VISOR_FACE_COLORS.glow;
    ctx.lineWidth = width + 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = VISOR_FACE_COLORS.glow;
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.35;
    ctx.stroke(shape);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = VISOR_FACE_COLORS.primary;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(shape);
    ctx.restore();
  }

  function ring(x: number, y: number) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, 35, 45, 0, 0, Math.PI * 2);
    ctx.strokeStyle = VISOR_FACE_COLORS.glow;
    ctx.lineWidth = 32;
    ctx.globalAlpha = 0.25;
    ctx.shadowColor = VISOR_FACE_COLORS.glow;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(x, y, 35, 45, 0, 0, Math.PI * 2);
    ctx.strokeStyle = VISOR_FACE_COLORS.primary;
    ctx.lineWidth = 29;
    ctx.stroke();
    ctx.restore();
  }

  function heart(
    x: number,
    y: number,
    color: string
  ) {
    const shape = new Path2D(
      "M 0 35 C -9 27 -48 4 -48 -21 " +
      "C -48 -46 -18 -53 0 -29 " +
      "C 18 -53 48 -46 48 -21 " +
      "C 48 4 9 27 0 35 Z"
    );

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 11;
    ctx.fill(shape);
    ctx.restore();
  }

  function blush(x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = VISOR_FACE_COLORS.blushHighlight;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.shadowColor = VISOR_FACE_COLORS.blushGlow;
    ctx.shadowBlur = 8;

    [
      "M -28 12 L -20 -12",
      "M -4 12 L 4 -12",
      "M 20 12 L 28 -12",
    ].forEach((path) => {
      ctx.stroke(new Path2D(path));
    });

    ctx.restore();
  }

  const left =
    "M 368 419 C 368 342, 491 342, 491 419";

  const right =
    "M 630 419 C 630 342, 753 342, 753 419";

  const naturallyClosed =
    expression === "sleepy" ||
    expression === "eyes-closed";

  ctx.save();

  if (blinking && !naturallyClosed) {
    ctx.translate(0, 390);
    ctx.scale(1, 0.04);
    ctx.translate(0, -390);
  }

  switch (expression) {
    case "normal":
      stroke(left);
      stroke(right);
      break;

    case "happy":
      stroke("M 365 425 Q 430 355 495 425");
      stroke("M 627 425 Q 692 355 757 425");
      break;

    case "surprised":
    case "thinking":
      ring(430, 394);
      ring(690, 394);
      break;

    case "confused":
      stroke("M 372 410 Q 430 388 488 412");
      ring(690, 392);
      break;

    case "wink":
      stroke(left);
      stroke("M 635 404 Q 690 416 745 404");
      break;

    case "loved":
      heart(430, 390, VISOR_FACE_COLORS.loved);
      heart(690, 390, VISOR_FACE_COLORS.primary);
      blush(355, 470);
      blush(765, 470);
      break;

    case "sad":
      stroke("M 368 392 Q 430 449 492 392");
      stroke("M 628 392 Q 690 449 752 392");
      break;

    case "sleepy":
      stroke("M 368 399 Q 430 415 492 399", 20);
      stroke("M 628 399 Q 690 415 752 399", 20);
      break;

    case "curious":
      stroke("M 368 422 C 367 326, 492 326, 492 422");
      ring(690, 394);
      break;

    case "eyes-closed":
      stroke("M 368 400 Q 430 434 492 400", 22);
      stroke("M 628 400 Q 690 434 752 400", 22);
      break;

    case "focused":
      stroke("M 372 394 Q 430 374 488 394", 24);
      stroke("M 632 394 Q 690 374 748 394", 24);
      break;
  }

  ctx.restore();

  const mouths: Record<
    Exclude<Expression, "surprised">,
    string
  > = {
    normal: "M 518 475 Q 560 507 603 475",
    happy: "M 505 468 Q 560 535 615 468",
    thinking: "M 530 486 Q 560 480 590 486",
    confused:
      "M 520 486 Q 545 474 565 486 Q 585 497 607 483",
    wink: "M 515 475 Q 565 525 610 465",
    loved: "M 525 478 Q 560 510 595 478",
    sad: "M 518 499 Q 560 461 603 499",
    sleepy: "M 535 484 Q 560 490 585 484",
    curious: "M 532 484 Q 560 501 588 484",
    "eyes-closed":
      "M 521 474 Q 560 505 599 474",
    focused: "M 531 485 Q 560 491 589 485",
  };

  ctx.save();
  ctx.translate(0, gap);

  if (expression === "surprised") {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      560,
      485,
      38,
      25,
      0,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = VISOR_FACE_COLORS.glow;
    ctx.lineWidth = 13;
    ctx.shadowColor = VISOR_FACE_COLORS.glow;
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.35;
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(
      560,
      485,
      38,
      25,
      0,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = VISOR_FACE_COLORS.primary;
    ctx.lineWidth = 10;
    ctx.stroke();
  } else {
    stroke(mouths[expression], 10);
  }

  ctx.restore();
}

/**
 * Create one CanvasTexture per mounted robot.
 * Its owner must dispose it when the robot unmounts.
 */
export function createVisorFaceTexture(
  options: VisorFaceOptions
): CanvasTexture {
  const canvas = document.createElement("canvas");

  canvas.width = VISOR_FACE_SIZE.width;
  canvas.height = VISOR_FACE_SIZE.height;

  drawVisorFace(canvas, options);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}

/**
 * Redraw the existing texture instead of replacing it.
 */
export function updateVisorFaceTexture(
  texture: CanvasTexture,
  options: VisorFaceOptions
): void {
  const canvas = texture.image;

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error(
      "KitCart visor texture must use an HTML canvas"
    );
  }

  drawVisorFace(canvas, options);
  texture.needsUpdate = true;
}

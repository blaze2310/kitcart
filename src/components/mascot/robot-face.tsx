"use client";

export type Expression =
  | "normal"
  | "happy"
  | "surprised"
  | "thinking"
  | "confused"
  | "wink"
  | "loved";

// Loved is triggered by interaction, not the manual tester.
export const EXPRESSIONS: Expression[] = [
  "normal",
  "happy",
  "surprised",
  "thinking",
  "confused",
  "wink",
];

type FaceProps = {
  expression: Expression;
  blinking: boolean;
  glowId: string;
  eyeX: number;
  eyeY: number;
  smileX: number;
  smileY: number;
};

function FaceStroke({
  d,
  width = 29,
  glowId,
}: {
  d: string;
  width?: number;
  glowId: string;
}) {
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke="#00BFFF"
        strokeWidth={width + 8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
        filter={`url(#${glowId})`}
      />
      <path
        d={d}
        fill="none"
        stroke="#8FEFFF"
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

function RingEye({
  cx,
  cy,
  glowId,
}: {
  cx: number;
  cy: number;
  glowId: string;
}) {
  return (
    <>
      <ellipse
        cx={cx}
        cy={cy}
        rx="35"
        ry="45"
        fill="none"
        stroke="#00BFFF"
        strokeWidth="37"
        opacity="0.8"
        filter={`url(#${glowId})`}
      />
      <ellipse
        cx={cx}
        cy={cy}
        rx="35"
        ry="45"
        fill="none"
        stroke="#8FEFFF"
        strokeWidth="29"
      />
    </>
  );
}

function HeartEye({
  cx,
  cy,
  color,
  glowId,
}: {
  cx: number;
  cy: number;
  color: string;
  glowId: string;
}) {
  const heartPath =
    "M 0 35 " +
    "C -9 27 -48 4 -48 -21 " +
    "C -48 -46 -18 -53 0 -29 " +
    "C 18 -53 48 -46 48 -21 " +
    "C 48 4 9 27 0 35 Z";

  return (
    <g transform={`translate(${cx} ${cy})`}>
      <path
        d={heartPath}
        fill={color}
        opacity="0.85"
        filter={`url(#${glowId})`}
      />
      <path d={heartPath} fill={color} />
    </g>
  );
}

function BlushMarks({
  cx,
  cy,
  glowId,
}: {
  cx: number;
  cy: number;
  glowId: string;
}) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {/* glow */}
      <g
        stroke="#FF8BC3"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.55"
        filter={`url(#${glowId})`}
      >
        <path d="M -28 12 L -20 -12" />
        <path d="M -4 12 L 4 -12" />
        <path d="M 20 12 L 28 -12" />
      </g>

      {/* crisp lines */}
      <g
        stroke="#FFC1DD"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.95"
      >
        <path d="M -28 12 L -20 -12" />
        <path d="M -4 12 L 4 -12" />
        <path d="M 20 12 L 28 -12" />
      </g>
    </g>
  );
}

export default function RobotFace({
  expression,
  blinking,
  glowId,
  eyeX,
  eyeY,
  smileX,
  smileY,
}: FaceProps) {
  const normalLeftEye =
    "M 368 419 C 368 342, 491 342, 491 419";

  const normalRightEye =
    "M 630 419 C 630 342, 753 342, 753 419";

  const happyLeftEye =
    "M 365 425 Q 430 355 495 425";

  const happyRightEye =
    "M 627 425 Q 692 355 757 425";

  const confusedLeftEye =
    "M 372 410 Q 430 388 488 412";

  const winkRightEye =
    "M 635 404 Q 690 416 745 404";

  // Every expression now supports natural blinking.
  const eyeScaleY = blinking ? 0.04 : 1;

  const mouthPath =
    expression === "happy"
      ? "M 505 468 Q 560 535 615 468"
      : expression === "thinking"
        ? "M 530 486 Q 560 480 590 486"
        : expression === "confused"
          ? "M 520 486 Q 545 474 565 486 Q 585 497 607 483"
          : expression === "wink"
            ? "M 515 475 Q 565 525 610 465"
            : expression === "loved"
              ? "M 525 478 Q 560 510 595 478"
              : "M 518 475 Q 560 507 603 475";

  return (
    <>
      {/* All eyes retain the approved higher position. */}
      <g transform={`translate(${eyeX} ${eyeY - 24})`}>
        <g
          transform={
            `translate(0 390) ` +
            `scale(1 ${eyeScaleY}) ` +
            `translate(0 -390)`
          }
          style={{
            transition: "transform 75ms ease-in-out",
          }}
        >
          {expression === "loved" ? (
            <>
              <HeartEye
                cx={430}
                cy={390}
                color="#FF80BB"
                glowId={glowId}
              />
              <HeartEye
                cx={690}
                cy={390}
                color="#8FEFFF"
                glowId={glowId}
              />

              {/* blush marks under eyes */}
              <BlushMarks
                cx={355}
                cy={470}
                glowId={glowId}
              />
              <BlushMarks
                cx={765}
                cy={470}
                glowId={glowId}
              />
            </>
          ) : expression === "surprised" ||
            expression === "thinking" ? (
            <>
              <RingEye
                cx={430}
                cy={394}
                glowId={glowId}
              />
              <RingEye
                cx={690}
                cy={394}
                glowId={glowId}
              />
            </>
          ) : expression === "confused" ? (
            <>
              <FaceStroke
                d={confusedLeftEye}
                glowId={glowId}
              />
              <RingEye
                cx={690}
                cy={392}
                glowId={glowId}
              />
            </>
          ) : expression === "happy" ? (
            <>
              <FaceStroke
                d={happyLeftEye}
                glowId={glowId}
              />
              <FaceStroke
                d={happyRightEye}
                glowId={glowId}
              />
            </>
          ) : expression === "wink" ? (
            <>
              <FaceStroke
                d={normalLeftEye}
                glowId={glowId}
              />
              <FaceStroke
                d={winkRightEye}
                glowId={glowId}
              />
            </>
          ) : (
            <>
              <FaceStroke
                d={normalLeftEye}
                glowId={glowId}
              />
              <FaceStroke
                d={normalRightEye}
                glowId={glowId}
              />
            </>
          )}
        </g>
      </g>

      {/* Mouth */}
      <g transform={`translate(${smileX} ${smileY})`}>
        {expression === "surprised" ? (
          <>
            <ellipse
              cx="560"
              cy="485"
              rx="38"
              ry="25"
              fill="none"
              stroke="#00BFFF"
              strokeWidth="20"
              opacity="0.8"
              filter={`url(#${glowId})`}
            />
            <ellipse
              cx="560"
              cy="485"
              rx="38"
              ry="25"
              fill="none"
              stroke="#8FEFFF"
              strokeWidth="10"
            />
          </>
        ) : (
          <FaceStroke
            d={mouthPath}
            width={10}
            glowId={glowId}
          />
        )}
      </g>
    </>
  );
}
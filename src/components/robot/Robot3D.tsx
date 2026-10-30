
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Bone,
  Box3,
  DoubleSide,
  LoopRepeat,
  MathUtils,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  SkinnedMesh,
  Vector3,
} from "three";

import type { Expression } from "@/components/mascot/robot-face";

import {
  getRobotAnimation,
  getRobotAnimationUrl,
  ROBOT_MODEL_URL,
  type RobotAnimationId,
} from "./animation/animationRegistry";

import {
  createVisorFaceTexture,
} from "./visor/faceRenderer";

import {
  createBoundVisorMesh,
  createVisorGeometry,
  validateVisorMask,
  VISOR_GEOMETRY_CONFIG,
  type VisorMaskData,
} from "./visor/visorGeometry";

// ============================================================
// KITCART MODULAR 3D ROBOT
//
// Approved reference: Git checkpoint d67d615
//
// This component is responsible for:
// - Loading the compatible rig
// - Attaching the approved V4 visor
// - Playing GLB animations
// - Displaying 12 approved facial expressions
// - Idle mouse tracking
// - Five-second mouse inactivity timeout
//
// The test page controls manual blinking and expressions.
// Production login behavior will be implemented separately.
//
// TypeScript fix:
// findBodyMesh() returns a correctly typed SkinnedMesh.
// ============================================================

export type RobotActionRequest = {
  id: RobotAnimationId;
  serial: number;
};

export type RobotDiagnostics = {
  id: RobotAnimationId;
  label: string;
  duration: number;
  tracks: number;
  headFound: boolean;
  sharedSkeleton: boolean;
};

export type Robot3DProps = {
  request: RobotActionRequest;
  expression: Expression;

  blinking?: boolean;
  playing?: boolean;
  speed?: number;
  tracking?: boolean;
  showFace?: boolean;

  onActionStarted?: (
    id: RobotAnimationId,
    face: Expression
  ) => void;

  onDiagnostics?: (
    status: RobotDiagnostics
  ) => void;
};

const INACTIVITY_MS = 5000;
const POINTER_THRESHOLD_PX = 2;
const TRACKING_SMOOTHNESS = 7;

const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

// ============================================================
// RIG HELPERS
// ============================================================

/**
 * Find the approved body mesh.
 *
 * IMPORTANT:
 * Collecting meshes in an array avoids TypeScript's
 * incorrect narrowing when assigning a variable
 * inside Object3D.traverse().
 */
function findBodyMesh(
  model: Object3D
): SkinnedMesh | null {
  const matches: SkinnedMesh[] = [];

  model.traverse((object) => {
    if (
      object instanceof SkinnedMesh &&
      object.geometry.getAttribute("position")?.count ===
        VISOR_GEOMETRY_CONFIG.modelVertices
    ) {
      matches.push(object);
    }
  });

  return matches[0] ?? null;
}

/**
 * Find the head bone on the compatible animated rig.
 */
function findHeadBone(
  mesh: SkinnedMesh | null
): Bone | null {
  if (!mesh) {
    return null;
  }

  return (
    mesh.skeleton.bones.find((bone) => {
      const normalized = bone.name
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();

      return (
        normalized === "mixamorighead" ||
        normalized === "head"
      );
    }) ?? null
  );
}

// ============================================================
// ANIMATION CLIP LOADER
// ============================================================

function AnimationClipLoader({
  url,
  onLoaded,
}: {
  url: string;
  onLoaded: (
    clip: AnimationClip,
    loadedUrl: string
  ) => void;
}) {
  const gltf = useGLTF(url);

  useEffect(() => {
    const clip = gltf.animations[0];

    if (clip) {
      onLoaded(clip, url);
    }
  }, [gltf, url, onLoaded]);

  return null;
}

// ============================================================
// ROBOT RIG
// ============================================================

function RobotRig({
  mask,
  request,
  expression,
  blinking = false,
  playing = true,
  speed = 1,
  tracking = true,
  showFace = true,
  onActionStarted,
  onDiagnostics,
}: Robot3DProps & {
  mask: VisorMaskData;
}) {
  // ----------------------------------------------------------
  // LOAD AND CLONE COMPATIBLE RIG
  // ----------------------------------------------------------

  const gltf = useGLTF(ROBOT_MODEL_URL);

  const model = useMemo(
    () => SkeletonUtils.clone(gltf.scene),
    [gltf.scene]
  );

  const source = useMemo<SkinnedMesh | null>(
    () => findBodyMesh(model),
    [model]
  );

  const head = useMemo<Bone | null>(
    () => findHeadBone(source),
    [source]
  );

  const mixer = useMemo(
    () => new AnimationMixer(model),
    [model]
  );

  const activeAction =
    useRef<AnimationAction | null>(null);

  const overlayRef =
    useRef<SkinnedMesh | null>(null);

  const definition =
    getRobotAnimation(request.id);

  const selectedUrl =
    getRobotAnimationUrl(request.id);

  // ----------------------------------------------------------
  // MODEL FRAMING
  // ----------------------------------------------------------

  const framing = useMemo(() => {
    model.updateMatrixWorld(true);

    const box =
      new Box3().setFromObject(model);

    const size =
      box.getSize(new Vector3());

    const center =
      box.getCenter(new Vector3());

    return {
      scale:
        2.3 /
        Math.max(
          size.x,
          size.y,
          size.z,
          0.001
        ),

      position: [
        -center.x,
        -center.y,
        -center.z,
      ] as [number, number, number],
    };
  }, [model]);

  // ----------------------------------------------------------
  // APPROVED VISOR FACE TEXTURE
  //
  // Expression and blinking changes do not
  // restart or reload the body animation.
  // ----------------------------------------------------------

  const texture = useMemo(
    () =>
      createVisorFaceTexture({
        expression,
        blinking,
      }),
    [expression, blinking]
  );

  // ----------------------------------------------------------
  // APPROVED 444-TRIANGLE VISOR GEOMETRY
  // ----------------------------------------------------------

  const geometry = useMemo(
    () =>
      source
        ? createVisorGeometry({
            source,
            selectedFaces:
              mask.selectedFaces,
          })
        : null,
    [source, mask]
  );

  const overlay = useMemo(() => {
    if (!source || !geometry) {
      return null;
    }

    const material =
      new MeshBasicMaterial({
        transparent: true,
        alphaTest: 0.02,

        side: DoubleSide,

        depthTest: true,
        depthWrite: false,

        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      });

    return createBoundVisorMesh(
      source,
      geometry,
      material
    );
  }, [source, geometry]);

  // ----------------------------------------------------------
  // ATTACH VISOR TO THE ORIGINAL SKELETON
  // ----------------------------------------------------------

  useEffect(() => {
    overlayRef.current = overlay;

    if (!source || !overlay) {
      return;
    }

    const parent = source.parent;

    if (!parent) {
      return;
    }

    parent.add(overlay);

    return () => {
      parent.remove(overlay);

      if (
        overlayRef.current === overlay
      ) {
        overlayRef.current = null;
      }

      overlay.geometry.dispose();

      if (
        overlay.material instanceof
        MeshBasicMaterial
      ) {
        overlay.material.dispose();
      }
    };
  }, [source, overlay]);

  // Update only the visor texture when the
  // expression or blinking state changes.
  useEffect(() => {
    if (
      overlay &&
      overlay.material instanceof
        MeshBasicMaterial
    ) {
      overlay.material.map =
        texture;

      overlay.material.needsUpdate =
        true;
    }
  }, [overlay, texture]);

  useEffect(() => {
    if (overlay) {
      overlay.visible = showFace;
    }
  }, [overlay, showFace]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  // ----------------------------------------------------------
  // CURSOR TRACKING
  //
  // Tracking works only when the active
  // animation permits mouse following.
  //
  // After five seconds without movement,
  // the robot returns smoothly to neutral.
  // ----------------------------------------------------------

  const pointer = useRef({
    x: 0,
    y: 0,
  });

  const gaze = useRef({
    x: 0,
    y: 0,
  });

  const lastPointerPosition = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const lastMovementTime = useRef(0);

  const yaw = useMemo(
    () => new Quaternion(),
    []
  );

  const pitch = useMemo(
    () => new Quaternion(),
    []
  );

  const correction = useMemo(
    () => new Quaternion(),
    []
  );

  const previousCorrection = useMemo(
    () => new Quaternion(),
    []
  );

  const inverseCorrection = useMemo(
    () => new Quaternion(),
    []
  );

  useEffect(() => {
    const handlePointerMove = (
      event: PointerEvent
    ) => {
      const previous =
        lastPointerPosition.current;

      if (
        previous &&
        Math.hypot(
          event.clientX - previous.x,
          event.clientY - previous.y
        ) < POINTER_THRESHOLD_PX
      ) {
        return;
      }

      lastPointerPosition.current = {
        x: event.clientX,
        y: event.clientY,
      };

      pointer.current.x =
        MathUtils.clamp(
          (event.clientX /
            window.innerWidth) *
            2 -
            1,
          -1,
          1
        );

      pointer.current.y =
        MathUtils.clamp(
          1 -
            (event.clientY /
              window.innerHeight) *
              2,
          -1,
          1
        );

      lastMovementTime.current =
        performance.now();
    };

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );
    };
  }, []);

  // ----------------------------------------------------------
  // ANIMATION PLAYBACK
  //
  // Uses actual GLB clip durations.
  // Facial updates never reset the animation.
  // ----------------------------------------------------------

  const activateClip = useCallback(
    (
      clip: AnimationClip,
      loadedUrl: string
    ) => {
      if (loadedUrl !== selectedUrl) {
        return;
      }

      const previous =
        activeAction.current;

      const next =
        mixer.clipAction(clip);

      next.reset();
      next.enabled = true;

      next.setEffectiveWeight(1);
      next.setEffectiveTimeScale(1);

      // The modular test preserves the
      // approved full-duration looping.
      next.setLoop(
        LoopRepeat,
        Infinity
      );

      next.clampWhenFinished =
        false;

      next.play();

      if (
        previous &&
        previous !== next
      ) {
        next.crossFadeFrom(
          previous,
          definition.transitionSeconds,
          false
        );
      }

      activeAction.current = next;

      // Synchronize face with the body action.
      onActionStarted?.(
        request.id,
        definition.expression
      );

      const visor =
        overlayRef.current;

      onDiagnostics?.({
        id: request.id,
        label: definition.label,
        duration: clip.duration,
        tracks: clip.tracks.length,
        headFound: head !== null,

        sharedSkeleton:
          visor !== null &&
          source !== null &&
          visor.skeleton ===
            source.skeleton,
      });
    },
    [
      mixer,
      selectedUrl,
      request.id,
      request.serial,
      definition,
      head,
      source,
      onActionStarted,
      onDiagnostics,
    ]
  );

  useEffect(() => {
    return () => {
      mixer.stopAllAction();
    };
  }, [mixer]);

  // ----------------------------------------------------------
  // RENDER LOOP
  //
  // 1. Undo previous cursor correction.
  // 2. Advance current GLB animation.
  // 3. Calculate cursor activity.
  // 4. Smoothly update head orientation.
  // ----------------------------------------------------------

  useFrame((_, delta) => {
    const dt =
      Math.min(delta, 0.05);

    if (head) {
      inverseCorrection
        .copy(previousCorrection)
        .invert();

      head.quaternion.multiply(
        inverseCorrection
      );
    }

    mixer.update(
      playing ? dt * speed : 0
    );

    const movementIsRecent =
      lastMovementTime.current > 0 &&
      performance.now() -
        lastMovementTime.current <
        INACTIVITY_MS;

    const shouldFollow =
      tracking &&
      definition.mouseTracking &&
      movementIsRecent;

    const alpha =
      1 -
      Math.exp(
        -TRACKING_SMOOTHNESS * dt
      );

    gaze.current.x =
      MathUtils.lerp(
        gaze.current.x,
        shouldFollow
          ? pointer.current.x
          : 0,
        alpha
      );

    gaze.current.y =
      MathUtils.lerp(
        gaze.current.y,
        shouldFollow
          ? pointer.current.y
          : 0,
        alpha
      );

    if (!head) {
      return;
    }

    yaw.setFromAxisAngle(
      Y_AXIS,
      MathUtils.degToRad(
        30 * gaze.current.x
      )
    );

    pitch.setFromAxisAngle(
      Z_AXIS,
      MathUtils.degToRad(
        18 * gaze.current.y
      )
    );

    correction
      .copy(yaw)
      .multiply(pitch);

    head.quaternion.multiply(
      correction
    );

    previousCorrection.copy(
      correction
    );
  });

  // ----------------------------------------------------------
  // DISPLAY COMPATIBLE RIG
  // ----------------------------------------------------------

  return (
    <>
      <group scale={framing.scale}>
        <group
          position={framing.position}
        >
          <primitive object={model} />
        </group>
      </group>

      <Suspense fallback={null}>
        <AnimationClipLoader
          key={`${selectedUrl}-${request.serial}`}
          url={selectedUrl}
          onLoaded={activateClip}
        />
      </Suspense>
    </>
  );
}

// ============================================================
// PUBLIC REUSABLE ROBOT COMPONENT
// ============================================================

export default function Robot3D(
  props: Robot3DProps
) {
  const [
    mask,
    setMask,
  ] = useState<VisorMaskData | null>(
    null
  );

  const [
    maskError,
    setMaskError,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadMask() {
      try {
        const response = await fetch(
          VISOR_GEOMETRY_CONFIG.maskUrl,
          {
            signal:
              controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Visor mask HTTP ${response.status}`
          );
        }

        const data: unknown =
          await response.json();

        if (
          !validateVisorMask(data)
        ) {
          throw new Error(
            "Invalid approved V4 visor mask"
          );
        }

        setMask(data);
        setMaskError(null);
      } catch (error) {
        if (
          controller.signal.aborted
        ) {
          return;
        }

        setMaskError(
          error instanceof Error
            ? error.message
            : "Unable to load visor mask"
        );
      }
    }

    void loadMask();

    return () => {
      controller.abort();
    };
  }, []);

  if (maskError) {
    console.error(
      "[KitCart Robot3D]",
      maskError
    );

    return null;
  }

  if (!mask) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <RobotRig
        {...props}
        mask={mask}
      />
    </Suspense>
  );
}

// Only preload the base rig here.
// Feature-specific clips are preloaded
// separately by the relevant page.
useGLTF.preload(ROBOT_MODEL_URL);

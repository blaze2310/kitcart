
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
  AnimationClip,
  Bone,
  Box3,
  DoubleSide,
  MeshBasicMaterial,
  Object3D,
  SkinnedMesh,
  Vector3,
} from "three";

import type {
  Expression,
} from "@/components/mascot/robot-face";

import {
  getRobotAnimation,
  getRobotAnimationUrl,
  ROBOT_MODEL_URL,
  type RobotAnimationId,
} from "./animation/animationRegistry";

import {
  useRobotAnimation,
  type RobotActionRequest,
  type RobotActionEvent,
} from "./animation/useRobotAnimation";

import {
  useRobotHeadTracking,
} from "./hooks/useRobotHeadTracking";

import {
  useRobotAutoBlink,
} from "./hooks/useRobotAutoBlink";

import {
  createVisorFaceTexture,
  updateVisorFaceTexture,
} from "./visor/faceRenderer";

import {
  createBoundVisorMesh,
  createVisorGeometry,
  validateVisorMask,
  VISOR_GEOMETRY_CONFIG,
  type VisorMaskData,
} from "./visor/visorGeometry";

export type { RobotActionRequest };

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
  autoBlink?: boolean;
  playing?: boolean;
  speed?: number;
  tracking?: boolean;
  showFace?: boolean;

  onActionStarted?: (
    id: RobotAnimationId,
    face: Expression
  ) => void;

  onActionCompleted?: (
    id: RobotAnimationId
  ) => void;

  onDiagnostics?: (
    data: RobotDiagnostics
  ) => void;
};

function findBodyMesh(
  model: Object3D
): SkinnedMesh | null {
  const matches: SkinnedMesh[] = [];

  model.traverse((object) => {
    if (
      object instanceof SkinnedMesh &&
      object.geometry.getAttribute("position")
        ?.count ===
        VISOR_GEOMETRY_CONFIG.modelVertices
    ) {
      matches.push(object);
    }
  });

  return matches[0] ?? null;
}

function findHeadBone(
  mesh: SkinnedMesh | null
): Bone | null {
  if (!mesh) return null;

  return (
    mesh.skeleton.bones.find((bone) => {
      const name = bone.name
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();

      return (
        name === "mixamorighead" ||
        name === "head"
      );
    }) ?? null
  );
}

function AnimationClipLoader({
  url,
  onLoaded,
}: {
  url: string;
  onLoaded: (
    clip: AnimationClip,
    url: string
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

function RobotRig({
  mask,
  request,
  expression,
  blinking = false,
  autoBlink = false,
  playing = true,
  speed = 1,
  tracking = true,
  showFace = true,
  onActionStarted,
  onActionCompleted,
  onDiagnostics,
}: Robot3DProps & {
  mask: VisorMaskData;
}) {
  // --------------------------------------------------
  // COMPATIBLE ANIMATED RIG
  // --------------------------------------------------

  const gltf = useGLTF(ROBOT_MODEL_URL);

  const model = useMemo(
    () => SkeletonUtils.clone(gltf.scene),
    [gltf.scene]
  );

  const source = useMemo(
    () => findBodyMesh(model),
    [model]
  );

  const head = useMemo(
    () => findHeadBone(source),
    [source]
  );

  const selectedUrl =
    getRobotAnimationUrl(request.id);

  const overlayRef =
    useRef<SkinnedMesh | null>(null);

  const framing = useMemo(() => {
    model.updateMatrixWorld(true);

    const bounds =
      new Box3().setFromObject(model);

    const size =
      bounds.getSize(new Vector3());

    const center =
      bounds.getCenter(new Vector3());

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

  // --------------------------------------------------
  // REUSABLE BLINK CONTROLLER
  //
  // The development page supplies its own blinking
  // state, so autoBlink remains disabled there.
  //
  // Future login and pet integrations can enable
  // built-in blinking without duplicating timers.
  // --------------------------------------------------

  const {
    blinking: automaticBlinking,
  } = useRobotAutoBlink({
    enabled: autoBlink,
  });

  const effectiveBlinking =
    blinking || automaticBlinking;

  // --------------------------------------------------
  // ONE PERSISTENT VISOR CANVAS TEXTURE
  // --------------------------------------------------

  const texture = useMemo(
    () =>
      createVisorFaceTexture({
        expression,
        blinking: effectiveBlinking,
      }),
    // Create once for this mounted robot instance.
    // Subsequent changes redraw the same canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    updateVisorFaceTexture(texture, {
      expression,
      blinking: effectiveBlinking,
    });
  }, [
    texture,
    expression,
    effectiveBlinking,
  ]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  // --------------------------------------------------
  // APPROVED SKINNED VISOR GEOMETRY
  // --------------------------------------------------

  const geometry = useMemo(
    () =>
      source
        ? createVisorGeometry({
            source,
            selectedFaces: mask.selectedFaces,
          })
        : null,
    [source, mask]
  );

  const overlay = useMemo(() => {
    if (!source || !geometry) return null;

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

  useEffect(() => {
    overlayRef.current = overlay;

    if (!source || !overlay) return;

    const parent = source.parent;

    if (!parent) return;

    parent.add(overlay);

    return () => {
      parent.remove(overlay);

      if (overlayRef.current === overlay) {
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

  useEffect(() => {
    if (
      overlay &&
      overlay.material instanceof
        MeshBasicMaterial
    ) {
      overlay.material.map = texture;
      overlay.material.needsUpdate = true;
    }
  }, [overlay, texture]);

  useEffect(() => {
    if (overlay) {
      overlay.visible = showFace;
    }
  }, [overlay, showFace]);

  // --------------------------------------------------
  // ANIMATION START AND COMPLETION EVENTS
  // --------------------------------------------------

  const handleStarted = useCallback(
    (event: RobotActionEvent) => {
      const action =
        getRobotAnimation(event.id);

      onActionStarted?.(
        event.id,
        action.expression
      );

      const visor = overlayRef.current;

      onDiagnostics?.({
        id: event.id,
        label: action.label,
        duration: event.clip.duration,
        tracks: event.clip.tracks.length,
        headFound: head !== null,
        sharedSkeleton:
          visor !== null &&
          source !== null &&
          visor.skeleton ===
            source.skeleton,
      });
    },
    [
      head,
      source,
      onActionStarted,
      onDiagnostics,
    ]
  );

  const handleCompleted = useCallback(
    (event: RobotActionEvent) => {
      onActionCompleted?.(event.id);
    },
    [onActionCompleted]
  );

  const {
    activateClip,
    update,
    activeIdRef,
  } = useRobotAnimation({
    model,
    request,
    idleClip: gltf.animations[0],
    playing,
    speed,
    onStarted: handleStarted,
    onCompleted: handleCompleted,
  });

  // --------------------------------------------------
  // APPROVED HEAD TRACKING
  // --------------------------------------------------

  const {
    beforeAnimationUpdate,
    afterAnimationUpdate,
  } = useRobotHeadTracking({
    head,
    enabled: tracking,
  });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    beforeAnimationUpdate();
    update(dt);

    const activeDefinition =
      getRobotAnimation(
        activeIdRef.current
      );

    afterAnimationUpdate(
      dt,
      tracking &&
        activeDefinition.mouseTracking
    );
  });

  return (
    <>
      <group scale={framing.scale}>
        <group position={framing.position}>
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

export default function Robot3D(
  props: Robot3DProps
) {
  const [mask, setMask] =
    useState<VisorMaskData | null>(null);

  const [maskError, setMaskError] =
    useState<string | null>(null);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadMask() {
      try {
        const response = await fetch(
          VISOR_GEOMETRY_CONFIG.maskUrl,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            `Visor mask HTTP ${response.status}`
          );
        }

        const data: unknown =
          await response.json();

        if (!validateVisorMask(data)) {
          throw new Error(
            "Invalid approved V4 visor mask"
          );
        }

        setMask(data);
        setMaskError(null);
      } catch (error) {
        if (controller.signal.aborted) return;

        setMaskError(
          error instanceof Error
            ? error.message
            : "Unable to load visor mask"
        );
      }
    }

    void loadMask();

    return () => controller.abort();
  }, []);

  if (maskError) {
    console.error(
      "[KitCart Robot3D]",
      maskError
    );
    return null;
  }

  if (!mask) return null;

  return (
    <Suspense fallback={null}>
      <RobotRig {...props} mask={mask} />
    </Suspense>
  );
}

useGLTF.preload(ROBOT_MODEL_URL);

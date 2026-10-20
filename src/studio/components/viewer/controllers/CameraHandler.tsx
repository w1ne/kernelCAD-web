// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useFrame, useThree, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useWorkbench } from "../../../context/WorkbenchContext";
import type { GeometryResult } from "../../../../shared/worker/geometryEngine";
import type { ViewportFocusTarget } from "../../../store/shellStore";
import { computeGeometryBounds, sampleGeometryPoints } from "./cameraBounds";
import { buildCameraPose, buildFitCameraPose, fitDistanceForCamera, type ViewTarget } from "./cameraPose";
import { filterGeometriesForFocusTarget } from "./focusTarget";
import { boxCorners, fitPointsToSafeArea, occluderInsets } from "./safeFit";
import { PHONE_QUERY } from "../../../hooks/useIsNarrow";
import { MARKUP_CAMERA_RESTORE_EVENT } from "../../../markup/markupCameraEvents";

// Using the exported constants if needed, but they are defined in Viewer.tsx conventionally.
// For now I will hardcode or use the same values.
const SKETCH_DISTANCE = 20;

type CameraTargetState = {
    position: THREE.Vector3;
    lookAt: THREE.Vector3;
    immediate?: boolean;
};
type CameraTargetRef = { current: CameraTargetState | null };
type SceneBounds = { center: THREE.Vector3; radius: number };
type FitBoundsRef = { current: SceneBounds | null };
type SavedCameraRef = { current: { position: THREE.Vector3; target: THREE.Vector3; } | null };
type SketchModeState = ReturnType<typeof useWorkbench>['sketchMode'];
type ViewportCamera = RootState['camera'];
type Bounds = NonNullable<ReturnType<typeof computeGeometryBounds>>;
type Pose = { position: THREE.Vector3; lookAt: THREE.Vector3; up: THREE.Vector3 };
/** The canvas and any extra world points (dimension endpoints) the phone
 *  fit must keep in view. */
export type FitContext = { canvas: HTMLCanvasElement | null; points: readonly THREE.Vector3[] };

function isPhone(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches;
}

/**
 * On a phone the bounding-sphere fit wastes the small screen: a wide model
 * comes out small, centred on the whole canvas, half under the floating
 * toolbar. There, keep the view direction but fit the model's box (and the
 * dimension endpoints) to the canvas minus the toolbar. Desktop keeps the
 * sphere fit unchanged. The fitted pose is stamped on the canvas
 * (`data-fit-*`) for tests and debugging.
 */
function phonePose(
    pose: Pose, geometries: GeometryResult[], bounds: Bounds, camera: ViewportCamera, fit: FitContext | undefined,
): Pose & { distance?: number } {
    const canvas = fit?.canvas;
    if (!canvas || !isPhone()) return pose;
    const rect = canvas.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) return pose;
    const occluders = Array.from(document.querySelectorAll('[data-viewport-occluder]'), (el) => el.getBoundingClientRect());
    const insets = occluderInsets(rect, occluders);
    const perspective = camera as THREE.PerspectiveCamera;
    const result = fitPointsToSafeArea({
        points: [...modelPoints(geometries, bounds), ...(fit?.points ?? [])],
        direction: pose.position.clone().sub(pose.lookAt).normalize(),
        up: pose.up,
        fovDegrees: perspective.fov,
        width: rect.width,
        height: rect.height,
        insets,
    });
    if (!result) return pose;
    canvas.dataset.fitInsetTop = String(Math.round(insets.top));
    canvas.dataset.fitInsetBottom = String(Math.round(insets.bottom));
    return { position: result.position, lookAt: result.lookAt, up: pose.up, distance: result.distance };
}

/** The model's own vertices (sampled), or its box corners if it has none. */
function modelPoints(geometries: GeometryResult[], bounds: Bounds): THREE.Vector3[] {
    const sampled = sampleGeometryPoints(geometries);
    return sampled.length > 0 ? sampled : boxCorners(bounds.min, bounds.max);
}

function setClipping(camera: ViewportCamera, distance: number): void {
    camera.near = Math.max(distance / 500, 0.01);
    camera.far = Math.max(distance * 20, 1000);
    camera.updateProjectionMatrix();
}

function applySceneFit(
    geometries: GeometryResult[],
    cameraRef: { current: ViewportCamera },
    lastFitBounds: FitBoundsRef,
    targetState: CameraTargetRef,
    fit?: FitContext,
) {
    const bounds = computeGeometryBounds(geometries);
    if (!bounds) return;

    // Re-fit only when the scene bounds change SIGNIFICANTLY. An exact
    // signature is too twitchy: rotating a part (joint pose / param edit)
    // wobbles the tessellated AABB by fractions of a millimetre, which
    // used to re-fit the camera — wiping the user's orbit position on
    // every slider change. 10% of the scene radius is well above
    // tessellation noise and well below any real shape change.
    const last = lastFitBounds.current;
    const tolerance = Math.max(last?.radius ?? 0, bounds.radius) * 0.1;
    const boundsStable = Boolean(
        last
        && bounds.center.distanceTo(last.center) <= tolerance
        && Math.abs(bounds.radius - last.radius) <= tolerance,
    );
    if (boundsStable) return;
    // The first framing of a scene has to LAND. `lastFitBounds` is stamped
    // when the fit is requested, not when the camera arrives, so a fit that
    // is abandoned mid-flight is never retried — `boundsStable` suppresses
    // every later run. That is how a published embed ended up showing a
    // blank viewport until the viewer found the home button: one pointer-
    // down on the canvas during the ~600ms tween cancelled the only fit
    // this scene would ever get. So deliver it in a single frame instead.
    const isFirstFit = lastFitBounds.current === null;
    lastFitBounds.current = { center: bounds.center.clone(), radius: bounds.radius };

    const distance = Math.max(fitDistanceForCamera(bounds.radius, cameraRef.current), SKETCH_DISTANCE);
    const pose = phonePose(buildFitCameraPose(bounds.center, distance), geometries, bounds, cameraRef.current, fit);
    cameraRef.current.up.copy(pose.up);
    targetState.current = { position: pose.position, lookAt: pose.lookAt, immediate: isFirstFit };
    setClipping(cameraRef.current, Math.max(pose.distance ?? distance, SKETCH_DISTANCE));
}

function rememberGeometryBounds(geometries: GeometryResult[], lastFitBounds: FitBoundsRef): void {
    const bounds = computeGeometryBounds(geometries);
    if (!bounds) return;
    lastFitBounds.current = { center: bounds.center.clone(), radius: bounds.radius };
}

function applyNavigationPose(
    navigationRequest: { target: ViewTarget; id: number },
    geometries: GeometryResult[],
    cameraRef: { current: ViewportCamera },
    targetState: CameraTargetRef,
    fit?: FitContext,
) {
    const bounds = computeGeometryBounds(geometries);
    if (!bounds) return;

    const distance = Math.max(fitDistanceForCamera(bounds.radius, cameraRef.current), SKETCH_DISTANCE);
    const pose = phonePose(navigationRequest.target === 'fit'
        ? buildFitCameraPose(bounds.center, distance)
        : buildCameraPose(navigationRequest.target, bounds.center, distance), geometries, bounds, cameraRef.current, fit);

    cameraRef.current.up.copy(pose.up);
    setClipping(cameraRef.current, Math.max(pose.distance ?? distance, SKETCH_DISTANCE));
    targetState.current = { position: pose.position, lookAt: pose.lookAt };
}

function applyFocusPose(
    focusRequest: { target: ViewportFocusTarget; id: number },
    geometries: GeometryResult[],
    cameraRef: { current: ViewportCamera },
    targetState: CameraTargetRef,
    fit?: FitContext,
) {
    const focusedGeometries = filterGeometriesForFocusTarget(geometries, focusRequest.target);
    if (focusedGeometries.length === 0) return;

    const bounds = computeGeometryBounds(focusedGeometries);
    if (!bounds) return;

    const distance = Math.max(fitDistanceForCamera(bounds.radius, cameraRef.current), SKETCH_DISTANCE);
    // A focused part fits the free area too, without the dimension points.
    const pose = phonePose(buildFitCameraPose(bounds.center, distance), focusedGeometries, bounds, cameraRef.current, fit && { canvas: fit.canvas, points: [] });
    cameraRef.current.up.copy(pose.up);
    setClipping(cameraRef.current, Math.max(pose.distance ?? distance, SKETCH_DISTANCE));
    targetState.current = { position: pose.position, lookAt: pose.lookAt };
}

function applySketchTransition(
    sketchMode: SketchModeState,
    camera: ViewportCamera,
    controls: unknown,
    prevSketchActive: { current: boolean },
    savedCameraState: SavedCameraRef,
    targetState: CameraTargetRef,
) {
    const isSketching = sketchMode.active;
    const wasSketching = prevSketchActive.current;
    prevSketchActive.current = isSketching;

    if (isSketching && !wasSketching) {
        if (sketchMode.plane) {
            const center = new THREE.Vector3(0, 0, 0);
            const normalVec = new THREE.Vector3(0, 0, 1);
            let found = false;

            if (typeof sketchMode.plane === 'object') {
                center.set(...sketchMode.plane.origin);
                normalVec.set(...sketchMode.plane.normal);
                found = true;
            } else if (typeof sketchMode.plane === 'string') {
                if (sketchMode.plane === 'XY') { normalVec.set(0, 0, 1); found = true; }
                else if (sketchMode.plane === 'XZ') { normalVec.set(0, 1, 0); found = true; }
                else if (sketchMode.plane === 'YZ') { normalVec.set(1, 0, 0); found = true; }
            }

            if (found) {
                normalVec.normalize();
                const ctrl = controls as unknown as { target?: THREE.Vector3 };
                savedCameraState.current = {
                    position: camera.position.clone(),
                    target: ctrl?.target ? ctrl.target.clone() : new THREE.Vector3(0, 0, 0)
                };
                const newPos = center.clone().add(normalVec.multiplyScalar(SKETCH_DISTANCE));
                targetState.current = { position: newPos, lookAt: center };
            }
        }
    }

    if (!isSketching && wasSketching) {
        if (savedCameraState.current) {
            targetState.current = {
                position: savedCameraState.current.position,
                lookAt: savedCameraState.current.target
            };
        }
    }
}

// Hand control to the user the instant they grab the camera. The fit/
// navigation tween below lerps the camera every frame until it converges
// (~seconds); without this, an orbit/pan/zoom during that window is fought
// by the lerp and feels unresponsive on first load. OrbitControls fires
// 'start' on pointer/touch down (user-initiated, not on programmatic
// update()), so cancelling the tween there yields immediately.
function subscribeUserInteractionStart(
    controls: unknown,
    targetState: CameraTargetRef,
) {
    const ctrl = controls as unknown as {
        addEventListener?: (type: string, fn: () => void) => void;
        removeEventListener?: (type: string, fn: () => void) => void;
    } | null;
    if (!ctrl?.addEventListener) return;
    const onUserInteractStart = () => {
        // ...but an in-flight FIRST framing is not the user's orbit being
        // fought — it is the only thing that has ever pointed the camera at
        // the model, and it is gone for good if dropped (the fit is already
        // recorded in `lastFitBounds`, so no later run will re-issue it).
        if (targetState.current?.immediate) return;
        targetState.current = null;
    };
    ctrl.addEventListener('start', onUserInteractStart);
    return () => ctrl.removeEventListener?.('start', onUserInteractStart);
}

function subscribeSnapshotCameraRestore(
    controls: unknown,
    targetState: CameraTargetRef,
    snapshotCameraOwnsView: { current: boolean },
) {
    const ctrl = controls as unknown as {
        addEventListener?: (type: string, fn: () => void) => void;
        removeEventListener?: (type: string, fn: () => void) => void;
    } | null;
    if (!ctrl?.addEventListener) return;
    let userCameraGesture = false;
    const onSnapshotCameraRestore = () => {
        targetState.current = null;
        snapshotCameraOwnsView.current = true;
    };
    const onUserInteractStart = () => { userCameraGesture = true; };
    const onUserCameraChange = () => {
        if (!userCameraGesture) return;
        snapshotCameraOwnsView.current = false;
        userCameraGesture = false;
    };
    const onUserInteractEnd = () => { userCameraGesture = false; };
    ctrl.addEventListener(MARKUP_CAMERA_RESTORE_EVENT, onSnapshotCameraRestore);
    ctrl.addEventListener('start', onUserInteractStart);
    ctrl.addEventListener('change', onUserCameraChange);
    ctrl.addEventListener('end', onUserInteractEnd);
    return () => {
        ctrl.removeEventListener?.(MARKUP_CAMERA_RESTORE_EVENT, onSnapshotCameraRestore);
        ctrl.removeEventListener?.('start', onUserInteractStart);
        ctrl.removeEventListener?.('change', onUserCameraChange);
        ctrl.removeEventListener?.('end', onUserInteractEnd);
    };
}

function advanceCameraTween(
    camera: ViewportCamera,
    controls: unknown,
    targetState: CameraTargetRef,
    delta: number,
) {
    const target = targetState.current;
    if (!target) return;
    // A first framing is not animated: lerping at 1 sets the pose exactly.
    const dampFactor = target.immediate ? 1 : 5.0 * delta;
    camera.position.lerp(target.position, dampFactor);
    const ctrl = controls as unknown as { target: THREE.Vector3, update: () => void };
    if (!ctrl?.target) {
        // OrbitControls has not published itself to the store yet. Point the
        // camera, but KEEP the pose pending: controls initialise their orbit
        // target to the origin, so a framing retired before they exist gets
        // silently re-aimed at (0,0,0) on their first update.
        camera.lookAt(target.lookAt);
        return;
    }
    ctrl.target.lerp(target.lookAt, dampFactor);
    ctrl.update();
    if (camera.position.distanceTo(target.position) < 0.1 &&
        ctrl.target.distanceTo(target.lookAt) < 0.1) {
        targetState.current = null;
    }
}

export function CameraHandler({
    geometries,
    navigationRequest,
    focusRequest,
    fitPoints,
}: {
    geometries: GeometryResult[];
    navigationRequest?: { target: ViewTarget; id: number } | null;
    focusRequest?: { target: ViewportFocusTarget; id: number } | null;
    /** Extra world points (shown dimension endpoints) the phone fit keeps in view. */
    fitPoints?: readonly (readonly [number, number, number])[];
}) {
    const { selectedFace, sketchMode } = useWorkbench();
    const { camera, controls, gl } = useThree();
    // Read at fit time, so toggling dimensions does not itself move the camera.
    // Declared before the fit effects, so it is current when they run.
    const fitRef = useRef<FitContext>({ canvas: null, points: [] });
    useEffect(() => {
        fitRef.current = {
            canvas: gl?.domElement ?? null,
            points: (fitPoints ?? []).map((p) => new THREE.Vector3(p[0], p[1], p[2])),
        };
    }, [gl, fitPoints]);
    const cameraRef = useRef(camera);
    // `immediate` marks the FIRST framing of a scene: the camera has never
    // pointed at this model, so there is nothing to animate from and nothing
    // for a tween to fight. It is applied in one frame and cannot be cancelled.
    const targetState = useRef<CameraTargetState | null>(null);
    const snapshotCameraOwnsView = useRef(false);
    const prevSketchActive = useRef(false);
    const savedCameraState = useRef<{ position: THREE.Vector3; target: THREE.Vector3; } | null>(null);
    const lastFitBounds = useRef<SceneBounds | null>(null);

    useEffect(() => {
        cameraRef.current = camera;
    }, [camera]);

    useEffect(() => {
        if (geometries.length === 0 || sketchMode.active) return;
        if (snapshotCameraOwnsView.current) {
            rememberGeometryBounds(geometries, lastFitBounds);
            return;
        }
        applySceneFit(geometries, cameraRef, lastFitBounds, targetState, fitRef.current);
    }, [geometries, sketchMode.active]);

    useEffect(() => {
        if (!navigationRequest || geometries.length === 0 || sketchMode.active) return;
        snapshotCameraOwnsView.current = false;
        applyNavigationPose(navigationRequest, geometries, cameraRef, targetState, fitRef.current);
    }, [navigationRequest, geometries, sketchMode.active]);

    useEffect(() => {
        if (!focusRequest || geometries.length === 0 || sketchMode.active) return;
        snapshotCameraOwnsView.current = false;
        applyFocusPose(focusRequest, geometries, cameraRef, targetState, fitRef.current);
    }, [focusRequest, geometries, sketchMode.active]);

    useEffect(() => {
        applySketchTransition(sketchMode, camera, controls, prevSketchActive, savedCameraState, targetState);
    }, [sketchMode, selectedFace, geometries, camera, controls]);

    useEffect(() => {
        return subscribeUserInteractionStart(controls, targetState);
    }, [controls]);

    useEffect(() => {
        return subscribeSnapshotCameraRestore(controls, targetState, snapshotCameraOwnsView);
    }, [controls]);

    useFrame((_state, delta) => {
        advanceCameraTween(camera, controls, targetState, delta);
    });

    return null;
}

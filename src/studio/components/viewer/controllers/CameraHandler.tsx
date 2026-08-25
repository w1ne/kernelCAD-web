// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useWorkbench } from "../../../context/WorkbenchContext";
import type { GeometryResult } from "../../../../shared/worker/geometryEngine";
import type { ViewportFocusTarget } from "../../../store/shellStore";
import { computeGeometryBounds } from "./cameraBounds";
import { buildCameraPose, buildFitCameraPose, fitDistanceForCamera, type ViewTarget } from "./cameraPose";
import { filterGeometriesForFocusTarget } from "./focusTarget";

// Using the exported constants if needed, but they are defined in Viewer.tsx conventionally.
// For now I will hardcode or use the same values.
const SKETCH_DISTANCE = 20;

export function CameraHandler({
    geometries,
    navigationRequest,
    focusRequest,
}: {
    geometries: GeometryResult[];
    navigationRequest?: { target: ViewTarget; id: number } | null;
    focusRequest?: { target: ViewportFocusTarget; id: number } | null;
}) {
    const { selectedFace, sketchMode } = useWorkbench();
    const { camera, controls } = useThree();
    const cameraRef = useRef(camera);
    // `immediate` marks the FIRST framing of a scene: the camera has never
    // pointed at this model, so there is nothing to animate from and nothing
    // for a tween to fight. It is applied in one frame and cannot be cancelled.
    const targetState = useRef<{
        position: THREE.Vector3;
        lookAt: THREE.Vector3;
        immediate?: boolean;
    } | null>(null);
    const prevSketchActive = useRef(false);
    const savedCameraState = useRef<{ position: THREE.Vector3; target: THREE.Vector3; } | null>(null);
    const lastFitBounds = useRef<{ center: THREE.Vector3; radius: number } | null>(null);

    useEffect(() => {
        cameraRef.current = camera;
    }, [camera]);

    useEffect(() => {
        if (geometries.length === 0 || sketchMode.active) return;

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
        const pose = buildFitCameraPose(bounds.center, distance);
        cameraRef.current.up.copy(pose.up);
        targetState.current = { position: pose.position, lookAt: pose.lookAt, immediate: isFirstFit };
        cameraRef.current.near = Math.max(distance / 500, 0.01);
        cameraRef.current.far = Math.max(distance * 20, 1000);
        cameraRef.current.updateProjectionMatrix();
    }, [geometries, sketchMode.active]);

    useEffect(() => {
        if (!navigationRequest || geometries.length === 0 || sketchMode.active) return;

        const bounds = computeGeometryBounds(geometries);
        if (!bounds) return;

        const distance = Math.max(fitDistanceForCamera(bounds.radius, cameraRef.current), SKETCH_DISTANCE);
        const pose = navigationRequest.target === 'fit'
            ? buildFitCameraPose(bounds.center, distance)
            : buildCameraPose(navigationRequest.target, bounds.center, distance);

        cameraRef.current.up.copy(pose.up);
        cameraRef.current.near = Math.max(distance / 500, 0.01);
        cameraRef.current.far = Math.max(distance * 20, 1000);
        cameraRef.current.updateProjectionMatrix();
        targetState.current = { position: pose.position, lookAt: pose.lookAt };
    }, [navigationRequest, geometries, sketchMode.active]);

    useEffect(() => {
        if (!focusRequest || geometries.length === 0 || sketchMode.active) return;

        const focusedGeometries = filterGeometriesForFocusTarget(geometries, focusRequest.target);
        if (focusedGeometries.length === 0) return;

        const bounds = computeGeometryBounds(focusedGeometries);
        if (!bounds) return;

        const distance = Math.max(fitDistanceForCamera(bounds.radius, cameraRef.current), SKETCH_DISTANCE);
        const pose = buildFitCameraPose(bounds.center, distance);
        cameraRef.current.up.copy(pose.up);
        cameraRef.current.near = Math.max(distance / 500, 0.01);
        cameraRef.current.far = Math.max(distance * 20, 1000);
        cameraRef.current.updateProjectionMatrix();
        targetState.current = { position: pose.position, lookAt: pose.lookAt };
    }, [focusRequest, geometries, sketchMode.active]);

    useEffect(() => {
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
    }, [sketchMode, selectedFace, geometries, camera, controls]);

    // Hand control to the user the instant they grab the camera. The fit/
    // navigation tween below lerps the camera every frame until it converges
    // (~seconds); without this, an orbit/pan/zoom during that window is fought
    // by the lerp and feels unresponsive on first load. OrbitControls fires
    // 'start' on pointer/touch down (user-initiated, not on programmatic
    // update()), so cancelling the tween there yields immediately.
    useEffect(() => {
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
    }, [controls]);

    useFrame((_state, delta) => {
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
    });

    return null;
}

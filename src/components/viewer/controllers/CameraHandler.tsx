import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useWorkbench } from "../../../context/WorkbenchContext";
import type { GeometryResult } from "../../../lib/geometryEngine";

// Using the exported constants if needed, but they are defined in Viewer.tsx conventionally.
// For now I will hardcode or use the same values.
const SKETCH_DISTANCE = 20;

export function computeGeometryBounds(
    geometries: GeometryResult[],
): { center: THREE.Vector3; radius: number } | null {
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    let sawVertex = false;

    for (const geometry of geometries) {
        for (const face of geometry.faces) {
            const vertices = face.vertices;
            for (let i = 0; i < vertices.length; i += 3) {
                const x = vertices[i];
                const y = vertices[i + 1];
                const z = vertices[i + 2];
                if (
                    x === undefined ||
                    y === undefined ||
                    z === undefined ||
                    !Number.isFinite(x) ||
                    !Number.isFinite(y) ||
                    !Number.isFinite(z)
                ) {
                    continue;
                }
                sawVertex = true;
                min.min(new THREE.Vector3(x, y, z));
                max.max(new THREE.Vector3(x, y, z));
            }
        }
    }

    if (!sawVertex) return null;

    const center = min.clone().add(max).multiplyScalar(0.5);
    const radius = Math.max(min.distanceTo(max) / 2, 1);
    return { center, radius };
}

export function CameraHandler({ geometries }: { geometries: GeometryResult[] }) {
    const { selectedFace, sketchMode } = useWorkbench();
    const { camera, controls } = useThree();
    const targetState = useRef<{ position: THREE.Vector3; lookAt: THREE.Vector3; } | null>(null);
    const prevSketchActive = useRef(false);
    const savedCameraState = useRef<{ position: THREE.Vector3; target: THREE.Vector3; } | null>(null);
    const lastGeometrySignature = useRef<string | null>(null);

    useEffect(() => {
        if (geometries.length === 0 || sketchMode.active) return;

        const bounds = computeGeometryBounds(geometries);
        if (!bounds) return;

        const signature = `${geometries.length}:${bounds.center.x.toFixed(3)},${bounds.center.y.toFixed(3)},${bounds.center.z.toFixed(3)}:${bounds.radius.toFixed(3)}`;
        if (signature === lastGeometrySignature.current) return;
        lastGeometrySignature.current = signature;

        const distance = Math.max(bounds.radius * 2.8, SKETCH_DISTANCE);
        const direction = new THREE.Vector3(1, 1, 0.75).normalize();
        const nextPosition = bounds.center.clone().add(direction.multiplyScalar(distance));

        targetState.current = { position: nextPosition, lookAt: bounds.center };
        camera.near = Math.max(distance / 500, 0.01);
        camera.far = Math.max(distance * 20, 1000);
        camera.updateProjectionMatrix();
    }, [geometries, sketchMode.active, camera]);

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

    useFrame((_state, delta) => {
        if (!targetState.current) return;
        const dampFactor = 5.0 * delta;
        camera.position.lerp(targetState.current.position, dampFactor);
        const ctrl = controls as unknown as { target: THREE.Vector3, update: () => void };
        if (ctrl && ctrl.target) {
            ctrl.target.lerp(targetState.current.lookAt, dampFactor);
            ctrl.update();
        } else {
            camera.lookAt(targetState.current.lookAt);
        }
        if (camera.position.distanceTo(targetState.current.position) < 0.1 &&
            (ctrl?.target?.distanceTo(targetState.current.lookAt) || 0) < 0.1) {
            targetState.current = null;
        }
    });

    return null;
}

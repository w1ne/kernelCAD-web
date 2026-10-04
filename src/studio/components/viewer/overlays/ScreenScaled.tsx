// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import type * as THREE from "three";

/** World units covered by one screen pixel at `worldPoint`'s distance. */
function worldPerPixel(camera: THREE.Camera, worldPoint: THREE.Vector3, height: number): number {
    const cam = camera as THREE.PerspectiveCamera & THREE.OrthographicCamera;
    if (cam.isOrthographicCamera) return (cam.top - cam.bottom) / cam.zoom / height;
    const d = camera.position.distanceTo(worldPoint);
    return (2 * d * Math.tan((cam.fov * Math.PI) / 360)) / height;
}

/** Group whose children are authored in screen pixels: it rescales every
 *  frame so markers and arrowheads keep one size at any zoom. */
export function ScreenScaled({ position, children }: { position: readonly [number, number, number]; children: ReactNode }) {
    const ref = useRef<THREE.Group>(null);
    useFrame(({ camera, size }) => {
        const g = ref.current;
        if (g) g.scale.setScalar(worldPerPixel(camera, g.position, size.height));
    });
    return <group ref={ref} position={position as [number, number, number]}>{children}</group>;
}

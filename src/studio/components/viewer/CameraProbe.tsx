// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

export interface ViewerCameraState {
    viewMatrix: number[];
    projectionMatrix: number[];
}

type ProbeCanvas = HTMLCanvasElement & {
    __kernelcadCameraProbe?: () => ViewerCameraState;
};

function attachProbe(canvas: HTMLCanvasElement, readCamera: () => ViewerCameraState): () => void {
    const probeCanvas = canvas as ProbeCanvas;
    probeCanvas.__kernelcadCameraProbe = readCamera;
    return () => {
        if (probeCanvas.__kernelcadCameraProbe === readCamera) delete probeCanvas.__kernelcadCameraProbe;
    };
}

/** Exposes the live camera matrices on the canvas for deterministic local E2E picks. */
export function CameraProbe() {
    const { camera, gl } = useThree();

    useEffect(() => {
        if (!import.meta.env.DEV) return;
        const readCamera = (): ViewerCameraState => {
            camera.updateMatrixWorld(true);
            return {
                viewMatrix: camera.matrixWorldInverse.toArray(),
                projectionMatrix: camera.projectionMatrix.toArray(),
            };
        };
        return attachProbe(gl.domElement, readCamera);
    }, [camera, gl]);

    return null;
}

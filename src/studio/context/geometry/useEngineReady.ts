// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useState } from 'react';
import { GeometryEngine } from '../../../shared/worker/geometryEngine';

/** Owns the singleton in-browser worker engine and its readiness flag. */
export function useEngineReady() {
    const engine = GeometryEngine.getInstance();
    const [isReady, setIsReady] = useState(false);

    // Initialize Engine
    useEffect(() => {
        engine.initialize().then(() => setIsReady(true));
        return () => {
        };
    }, [engine]);

    return { engine, isReady };
}

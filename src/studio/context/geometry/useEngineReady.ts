// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useState } from 'react';
import { GeometryEngine } from '../../../shared/worker/geometryEngine';

/** Owns the singleton in-browser worker engine and its readiness flag.
 *  `enabled: false` skips worker init so a precomputed mesh can render
 *  without booting the CAD runtime. */
export function useEngineReady(enabled = true) {
    const engine = GeometryEngine.getInstance();
    const [isReady, setIsReady] = useState(!enabled);

    useEffect(() => {
        if (!enabled) return undefined;
        let cancelled = false;
        engine.initialize().then(() => {
            if (!cancelled) setIsReady(true);
        });
        return () => {
            cancelled = true;
        };
    }, [engine, enabled]);

    return { engine, isReady: enabled ? isReady : true };
}

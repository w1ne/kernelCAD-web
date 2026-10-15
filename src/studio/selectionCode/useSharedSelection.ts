// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef } from 'react';
import { apiCall, rewritePath } from '../api/apiBase';
import { selectionCodeStore } from './selectionCodeStore';
import { attachSharedSelection } from './sharedSelectionSync';
import type { GeometryResult } from '../../shared/worker/workerTypes';

export function useSharedSelection(
    sessionToken: string | null,
    setSelectedFace: (selection: { shapeIndex: number; faceId: number } | null) => void,
    geometries: readonly GeometryResult[] = [],
    meshRevision: number | null = null,
) {
    const faceSetter = useRef(setSelectedFace);
    const geometriesRef = useRef(geometries);
    const meshRevisionRef = useRef(meshRevision);
    useEffect(() => { faceSetter.current = setSelectedFace; }, [setSelectedFace]);
    useEffect(() => { geometriesRef.current = geometries; }, [geometries]);
    useEffect(() => { meshRevisionRef.current = meshRevision; }, [meshRevision]);
    useEffect(() => {
        if (!sessionToken) return;
        const controller = new AbortController();
        const bridge = attachSharedSelection(selectionCodeStore, async (method, selection, model_generation, faceSignature) => {
            const { base, headers } = await apiCall();
            // This repo wires the local route. Hosted ownership/auth wiring is server-side work.
            if (base) throw new Error('Shared selection is currently available in local Studio');
            const response = await fetch(rewritePath(`/__kernelcad/selection?session=${encodeURIComponent(sessionToken)}&studio_remap=1`, base), {
                method, headers: { ...headers, 'content-type': 'application/json' },
                signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
                ...(method === 'POST' ? { body: JSON.stringify({ selection, model_generation, face_signature: faceSignature }) } : {}),
            });
            if (!response.ok && response.status !== 409) throw new Error(`Selection HTTP ${response.status}`);
            return response.json();
        }, selection => faceSetter.current(selection), () => geometriesRef.current, () => meshRevisionRef.current);
        void bridge.tick();
        const timer = setInterval(() => { void bridge.tick(); }, 300);
        return () => { clearInterval(timer); bridge.dispose(); controller.abort(); };
    }, [sessionToken]);
}

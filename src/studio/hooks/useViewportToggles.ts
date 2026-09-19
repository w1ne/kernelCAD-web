// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useMemo, useState } from 'react';

interface ToggleFeature {
    readonly kind: string;
    readonly metadata?: unknown;
}

export function useViewportToggles(features: readonly ToggleFeature[]) {
    const [referenceImagesVisible, setReferenceImagesVisible] = useState(true);
    const referenceImagesPresent = useMemo(
        () => features.some((f) => f.kind === 'referenceImage'),
        [features],
    );
    const handleToggleReferenceImages = useCallback(() => {
        setReferenceImagesVisible((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                window.__demoPlayer?.setReferenceImagesVisible(next);
            }
            return next;
        });
    }, []);

    const [renderEnvironmentVisible, setRenderEnvironmentVisible] = useState(true);
    const renderEnvironmentRecord = useMemo(
        () => [...features].reverse().find((f) => f.kind === 'renderEnvironment'),
        [features],
    );
    const renderEnvironmentPresent = renderEnvironmentRecord !== undefined;
    const renderEnvironmentPresetLabel = useMemo(() => {
        const meta = renderEnvironmentRecord?.metadata as { preset?: string; url?: string } | undefined;
        if (!meta) return '';
        if (meta.preset) return meta.preset;
        return 'custom';
    }, [renderEnvironmentRecord]);
    const handleToggleRenderEnvironment = useCallback(() => {
        setRenderEnvironmentVisible((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                const meta = renderEnvironmentRecord?.metadata as {
                    preset?: string;
                    url?: string;
                    intensity?: number;
                    rotation?: number;
                } | undefined;
                const spec = next && meta
                    ? {
                        ...(meta.preset
                            ? { preset: meta.preset as 'studio' | 'softbox' | 'neutral' | 'outdoor' | 'warehouse' }
                            : {}),
                        ...(meta.url ? { url: meta.url } : {}),
                        intensity: meta.intensity,
                        rotation: meta.rotation,
                    }
                    : null;
                void window.__demoPlayer?.setRenderEnvironment(spec);
            }
            return next;
        });
    }, [renderEnvironmentRecord]);

    return {
        referenceImagesPresent,
        referenceImagesVisible,
        handleToggleReferenceImages,
        renderEnvironmentPresent,
        renderEnvironmentVisible,
        renderEnvironmentPresetLabel,
        handleToggleRenderEnvironment,
    };
}

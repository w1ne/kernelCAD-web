// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback } from 'react';
import { useShellStore, shellStore } from '../store/useShellStore';
import type { SelectedFeatureId } from '../types';

/**
 * Read + set the currently-selected feature id (tri-pane sync).
 *
 * Subscribers should be tolerant of "id not currently present in the latest
 * recompute result" — that's a soft binding by design (selection survives
 * recompute frames during which a feature briefly disappears, e.g. while
 * an edit is being applied).
 */
export function useFeatureSelection(): {
    selectedFeatureId: SelectedFeatureId;
    selectFeature: (id: SelectedFeatureId) => void;
} {
    const { selectedFeatureId } = useShellStore();
    const selectFeature = useCallback((id: SelectedFeatureId) => {
        shellStore.setSelectedFeatureId(id);
    }, []);
    return { selectedFeatureId, selectFeature };
}

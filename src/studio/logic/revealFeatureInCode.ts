// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { codeLineRevealRequests, inspectorTabRequests } from '../hooks/studioNavigation';
import { shellStore } from '../store/shellStore';

/** Select a feature, show the Code tab, and scroll to its call line.
 *  Does not focus the editor, so viewport keys keep working. */
export function revealFeatureInCode(id: string): void {
    shellStore.setSelectedFeatureId(id);
    if (!shellStore.getSnapshot().inspectorOpen) shellStore.setInspectorOpen(true);
    inspectorTabRequests.request('code');
    codeLineRevealRequests.request({ featureId: id });
}

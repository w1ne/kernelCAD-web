// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/components/viewer/overlays/DirectEditPanel.tsx
//
// Viewport home of the staged-edit review card. A staged edit (agent proposal,
// auto-apply off, or a UI edit that auto-apply refused) opens the full card;
// with a body selected for the drag gizmo, a compact auto-apply toggle shows
// instead. Read-only views never show the toggle.

import { useShellStore } from '../../../store/useShellStore';
import { useWorkbench } from '../../../context/WorkbenchContext';
import { useStudioChrome } from '../../../context/StudioChromeContext';
import { AutoApplyToggle, StagedEditSlot } from '../../../StagedEditSlot';

const PANEL_CLASS = 'absolute right-3 top-12 z-20 rounded border border-[#2a2e38] bg-[#15171c]/95 shadow-lg';

export function DirectEditPanel() {
    const { stagedEdit } = useShellStore();
    const { selectedItemIds } = useWorkbench();
    const { viewerMode } = useStudioChrome();

    if (stagedEdit != null) {
        return (
            <div className={`${PANEL_CLASS} w-72 max-h-[70%] overflow-auto`} data-testid="direct-edit-panel">
                <StagedEditSlot />
            </div>
        );
    }
    if (viewerMode || (selectedItemIds?.length ?? 0) === 0) return null;
    return (
        <div className={`${PANEL_CLASS} px-2 py-1.5`} data-testid="direct-edit-panel">
            <AutoApplyToggle />
        </div>
    );
}

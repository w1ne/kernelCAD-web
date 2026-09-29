// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useWorkbench } from "../../../context/WorkbenchContext";
import { useSelectionCodeState } from "../../../selectionCode/selectionCodeStore";
import { featureLabel, getFeatureSourceIndex } from "../../../selectionCode/featureSourceIndex";

/**
 * Small tag next to the click point naming the call that made the clicked
 * face or edge ("fillet · line 42"). DOM overlay over the viewer canvas;
 * hidden when the feature has no script location.
 */
export function CodeLinkLabel() {
    const { link } = useSelectionCodeState();
    const { code, featureRecords } = useWorkbench();
    if (!link?.featureId || !link.anchor || !featureRecords) return null;
    const entry = getFeatureSourceIndex(code ?? '', featureRecords).byFeatureId.get(link.featureId);
    if (!entry) return null;
    return (
        <div
            data-testid="code-link-label"
            className="absolute pointer-events-none rounded border border-white/15 bg-black/80 px-2 py-0.5 font-mono text-[11px] text-selection-blue shadow"
            style={{ left: link.anchor.x + 12, top: link.anchor.y - 28 }}
        >
            {featureLabel(entry)}
        </div>
    );
}

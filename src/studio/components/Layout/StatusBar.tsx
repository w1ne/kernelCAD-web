// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { AlertTriangle, CheckCircle2, Loader2, MousePointer2 } from 'lucide-react';
import type { StudioLayoutMode } from '../../../shared/types/layout';
import type { ViewMode3D } from '../../../shared/types/viewMode';
import { plainLine } from '../../plainLine';
import type { MechanismVerdictSummary } from '../../../modeling/runtime/mechanismVerdict';
import { MotionBadge } from '../motion/MotionBadge';

interface StatusBarProps {
    isComputing: boolean;
    error: string | null;
    geometryCount: number;
    selectedCount: number;
    viewMode3D: ViewMode3D;
    layoutMode: StudioLayoutMode;
    activeCommandLabel: string | null;
    /** Transient direct-edit status (refused drag, candidate review, ...). */
    directEditNotice?: string | null;
    interferences?: number;
    interferenceSummary?: {
        rawCount: number;
        contactNoiseCount: number;
        actionableCount: number;
        capMm3: number;
    } | null;
    recomputeMs?: number;
    /** Error / warning counts from the model review (not build errors). */
    reviewCounts?: { errors: number; warnings: number } | null;
    /** Mechanism verdict of the loaded model; no badge for a static model. */
    mechanismSummary?: MechanismVerdictSummary | null;
}

function formatViewMode(mode: ViewMode3D): string {
    if (mode === 'shadedWithEdges') return 'Shaded + edges';
    if (mode === 'wireframe') return 'Wireframe';
    return 'Shaded';
}

function formatLayoutMode(mode: StudioLayoutMode): string {
    if (mode === 'split') return 'Split';
    if (mode === 'viewport') return 'Viewport';
    return 'Code';
}

function compactError(error: string): string {
    return plainLine(error, 96);
}

function StateIndicator({ error, isComputing }: { error: string | null; isComputing: boolean }) {
    const stateLabel = error ? 'Error' : isComputing ? 'Computing...' : 'Ready';

    return (
        <span className={`inline-flex items-center gap-1 font-medium ${error ? 'text-red-300' : isComputing ? 'text-blue-300' : 'text-emerald-300'}`}>
            {error ? <AlertTriangle size={12} /> : isComputing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            {stateLabel}
        </span>
    );
}

function StateDiagnostics({
    error,
    reviewCounts,
}: {
    error: string | null;
    reviewCounts?: { errors: number; warnings: number } | null;
}) {
    if (error) return <span className="truncate text-red-200 max-w-[48vw]">{compactError(error)}</span>;
    const errors = reviewCounts?.errors ?? 0;
    const warnings = reviewCounts?.warnings ?? 0;
    if (errors === 0 && warnings === 0) return <span className="truncate">No diagnostics</span>;
    const parts = [
        ...(errors > 0 ? [errors === 1 ? '1 error' : `${errors} errors`] : []),
        ...(warnings > 0 ? [warnings === 1 ? '1 warning' : `${warnings} warnings`] : []),
    ];
    return (
        <span data-testid="status-review-counts" className={`truncate ${errors > 0 ? 'text-red-200' : 'text-amber-200'}`}>
            {parts.join(' · ')}
        </span>
    );
}

// The build version lives here, in the Studio status bar, not over the model.
const VERSION_LABEL = typeof __APP_VERSION__ !== 'undefined' ? `v${__APP_VERSION__}` : 'dev';
const COMMIT_TITLE = typeof __COMMIT_HASH__ !== 'undefined' ? `build ${__COMMIT_HASH__}` : undefined;

export function StatusBar({
    isComputing,
    error,
    geometryCount,
    selectedCount,
    viewMode3D,
    layoutMode,
    activeCommandLabel,
    directEditNotice,
    interferences,
    interferenceSummary,
    recomputeMs,
    reviewCounts,
    mechanismSummary,
}: StatusBarProps) {
    const bodyLabel = geometryCount === 1 ? '1 body' : `${geometryCount} bodies`;
    const selectionLabel = selectedCount === 1 ? '1 selected' : `${selectedCount} selected`;
    const interferenceTitle = interferenceSummary
        ? `actionable: ${interferenceSummary.actionableCount}, contact-noise: ${interferenceSummary.contactNoiseCount}, raw: ${interferenceSummary.rawCount}, cap: ${interferenceSummary.capMm3} mm3`
        : undefined;

    return (
        <footer
            data-testid="status-bar"
            className="h-6 shrink-0 border-t border-[#2b313c] bg-[#101318] text-[11px] text-gray-400 flex items-center gap-3 px-3 select-none bar-scroll-x"
        >
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="flex items-center gap-3 min-w-0 flex-1"
            >
                <StateIndicator error={error} isComputing={isComputing} />
                {activeCommandLabel && (
                    <span className="text-blue-300 truncate max-w-[24vw]">{activeCommandLabel}</span>
                )}
                {directEditNotice && (
                    <span
                        data-testid="direct-edit-notice"
                        className="text-amber-300 truncate max-w-[36vw]"
                        title={directEditNotice}
                    >
                        {directEditNotice}
                    </span>
                )}
                <StateDiagnostics error={error} reviewCounts={reviewCounts} />
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-auto">
                <MotionBadge summary={mechanismSummary} />
                <span>{bodyLabel}</span>
                <span className="inline-flex items-center gap-1">
                    <MousePointer2 size={12} />
                    {selectionLabel}
                </span>
                {typeof interferences === 'number' && (
                    <span data-testid="status-interferences" title={interferenceTitle}>interferences: {interferences}</span>
                )}
                {typeof recomputeMs === 'number' && recomputeMs > 0 && (
                    <span data-testid="status-recompute-ms">Last compute {recomputeMs} ms</span>
                )}
                <span>{formatViewMode(viewMode3D)}</span>
                <span>{formatLayoutMode(layoutMode)}</span>
                <span data-testid="status-version" title={COMMIT_TITLE}>{VERSION_LABEL}</span>
            </div>
        </footer>
    );
}

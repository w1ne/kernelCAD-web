// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { plainLine } from './plainLine';
import { Header } from './components/Layout/Header';
import { ViewportToolbar } from './ViewportToolbar';
import { ActivityBar } from './ActivityBar';
import { useStudioConfig } from './config/StudioConfigContext';
import { Viewport } from './Viewport';
import { Inspector } from './Inspector';
import { BottomDrawer } from './BottomDrawer';
import { MarkingOverlay } from './components/viewer/overlays/MarkingOverlay';
import { SectionPanel } from './components/viewer/overlays/SectionPanel';
import { DirectEditPanel } from './components/viewer/overlays/DirectEditPanel';
import { SceneTab } from './tabs/SceneTab';
import { CodeTab } from './tabs/CodeTab';
import { ParamsTab } from './tabs/ParamsTab';
import { JointsTab } from './tabs/JointsTab';
import { ValidityTab } from './tabs/ValidityTab';
import { ExportTab } from './tabs/ExportTab';
import { AnimationTab } from './components/animation/AnimationTab';
import { StatusBar } from './components/Layout/StatusBar';
import ProjectManagerDialog from './components/Dialogs/ProjectManagerDialog';
import { useWorkbench } from './context/WorkbenchContext';
import { useShellStore, shellStore } from './store/useShellStore';
import type { StagedEdit } from './store/shellStore';
import { useRecomputeResult } from './hooks/useRecomputeResult';
import { useStudioChrome } from './context/StudioChromeContext';
import { useUI } from './context/UIContext';
import { jointContactCapMm3 } from '../modeling/runtime/jointContactCap';
import { useViewportToggles } from './hooks/useViewportToggles';
import { useUndoRedoShortcuts } from './hooks/useUndoRedoShortcuts';
import { NARROW_QUERY, useIsNarrow } from './hooks/useIsNarrow';
import { MobileShell } from './MobileShell';


interface EmbedFlags {
    readonly showHeader?: boolean;
    readonly enableAgentRail?: boolean;
    readonly enableConnect?: boolean;
}

function resolveEmbedFlags(embed: EmbedFlags): { showHeader: boolean; enableAgentRail: boolean; enableConnect: boolean } {
    return {
        showHeader: embed.showHeader ?? true,
        enableAgentRail: embed.enableAgentRail ?? true,
        enableConnect: embed.enableConnect ?? true,
    };
}

function resolveInterferenceCount(recompute: ReturnType<typeof useRecomputeResult>): number {
    return recompute.interferenceSummary?.actionableCount
        ?? (recompute.rawInterferencePairs ?? [])
            .filter((pair) => pair.volumeMm3 > jointContactCapMm3())
            .length;
}

/** After this long the banner stops saying "warming up" and offers a reload. */
const KERNEL_SLOW_MS = 15_000;

/** The in-browser kernel banner belongs only to a viewport with nothing to
 *  show yet. A model can render without the worker (hosted mesh, the dev
 *  node kernel), and a "warming up" or "timed out" banner over that model
 *  contradicts both the model and the status bar's "Ready". */
function shouldShowKernelBanner(isReady: boolean, geometryCount: number): boolean {
    return !isReady && geometryCount === 0;
}

function reloadPage() {
    window.location.reload();
}

function KernelInitBanner({ error }: { error: string | null }) {
    const [slow, setSlow] = useState(false);

    useEffect(() => {
        if (error) return;
        const timeout = window.setTimeout(() => setSlow(true), KERNEL_SLOW_MS);
        return () => window.clearTimeout(timeout);
    }, [error]);

    const needsReload = !!error || slow;
    return (
        <div
            data-testid="kernel-init-banner"
            role={error ? 'alert' : 'status'}
            aria-live="polite"
            className="pointer-events-none absolute left-1/2 top-16 z-30 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded border border-white/10 bg-black/80 px-3 py-2 text-xs text-white/80 shadow-lg"
        >
            {!needsReload && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
            <span>
                {error
                    ? `Geometry kernel failed: ${plainLine(error)}`
                    : slow
                        ? 'The geometry kernel is taking longer than usual.'
                        : 'Geometry kernel warming up...'}
            </span>
            {needsReload && (
                <button
                    type="button"
                    onClick={reloadPage}
                    className="pointer-events-auto shrink-0 rounded border border-white/20 px-2 py-0.5 text-white hover:bg-white/10"
                >
                    Reload
                </button>
            )}
        </div>
    );
}

/**
 * Top-level Studio shell: one header row, the left activity bar and its
 * pane (Agent / Model tree / Projects), the viewport with its floating
 * toolbar, the Inspector, the drawer and the status bar. Mounted by App.tsx
 * and DevLab.
 */
export function StudioShell() {
    const workbench = useWorkbench();
    const {
        selectedFeatureId,
        markingMode,
        sectionMode,
        directEditNotice,
    } = useShellStore();
    const embed = useStudioConfig();
    // Defaults preserve standalone behavior: show the kernelCAD header and
    // offer the agent. Embed hosts (e.g. proto.cat) pass `false` for both to
    // drive a stripped viewport + inspector + toolbar shell.
    const { showHeader, enableAgentRail, enableConnect } = resolveEmbedFlags(embed);
    const { viewerMode } = useStudioChrome();
    const ui = useUI();
    const {
        handleToggleMarkingMode,
        handleToggleSectionMode,
        handleValidate,
        handleRun,
    } = useStudioShellHandlers(workbench);
    const recompute = useRecomputeResult();

    useProposeEditBridge();
    useUndoRedoShortcuts(workbench.commandManager);
    useModelFirstOnPhone();

    // Bridge shell selection → Viewer's existing selectedItemIds. Identity
    // reconciliation: shell selectedFeatureId is a FeatureRecord.id (e.g.
    // "box_1"); Viewer's selectedItemIds match against script variable
    // names (from codeContext.returnedVariables). We align by position —
    // features[i] corresponds to returnedVariables[i] in capture order.
    // Falls back to the raw id when no variable maps; falls back to null
    // for null selection.
    useShellSelectionBridge(selectedFeatureId, recompute, workbench);

    const {
        referenceImagesPresent,
        referenceImagesVisible,
        handleToggleReferenceImages,
        renderEnvironmentPresent,
        renderEnvironmentVisible,
        renderEnvironmentPresetLabel,
        handleToggleRenderEnvironment,
    } = useViewportToggles(recompute.features);


    const tabSlots = buildTabSlots();

    // HUD counts actionable interferences, not contact-noise slivers. Raw
    // pairs stay available to diagnostic tabs, but the footer follows the same
    // absolute cap used by validator/mechanism-truth so clearance-fit clevis
    // contacts do not make a plausible mechanism look broken.
    const interferenceCount = resolveInterferenceCount(recompute);
    // Phones get the tab-bar shell; hosts without the header keep this one.
    const phone = useIsNarrow() && showHeader;

    const stage = renderStage({
        workbench, ui, markingMode, sectionMode, handleRun, handleValidate, handleToggleMarkingMode,
        handleToggleSectionMode, referenceImagesPresent, referenceImagesVisible, handleToggleReferenceImages,
        renderEnvironmentPresent, renderEnvironmentVisible, renderEnvironmentPresetLabel, handleToggleRenderEnvironment,
    });

    if (phone) {
        return (
            <MobileShell
                stage={stage}
                tabSlots={tabSlots}
                enableAgent={enableAgentRail}
                enableConnect={enableConnect}
                viewerMode={!!viewerMode}
                status={{
                    isComputing: workbench.isComputing,
                    error: workbench.error ?? null,
                    geometryCount: workbench.geometries?.length ?? 0,
                    selectedCount: workbench.selectedItemIds?.length ?? 0,
                    interferences: interferenceCount,
                    recomputeMs: workbench.recomputeMs,
                    viewMode3D: workbench.viewMode3D,
                }}
                dialogs={renderProjectManager(workbench)}
            />
        );
    }

    return (
        <div
            data-theme="dark"
            className="flex w-screen h-screen bg-bg text-fg font-sans overflow-hidden flex-col"
            data-testid="workbench-ready"
        >
            {showHeader && <Header />}

            <div className="flex-1 flex overflow-hidden relative">
                {showHeader && (
                    <ActivityBar enableAgent={enableAgentRail} enableConnect={enableConnect} viewerMode={!!viewerMode} />
                )}
                <div className="flex-1 relative min-w-0">
                    {stage}
                </div>
                <Inspector tabSlots={tabSlots} />
            </div>

            {renderStudioFooter({
                workbench,
                recompute,
                directEditNotice,
                interferenceCount,
            })}
        </div>
    );
}

/** The viewport with its floating toolbar and overlays; the same on phone and desktop. */
function renderStage(p: {
    workbench: ReturnType<typeof useWorkbench>;
    ui: ReturnType<typeof useUI>;
    markingMode: boolean;
    sectionMode: boolean;
    handleRun: () => void;
    handleValidate: () => void;
    handleToggleMarkingMode: () => void;
    handleToggleSectionMode: () => void;
} & ReturnType<typeof useViewportToggles>) {
    const { workbench, ui, markingMode, sectionMode } = p;
    return (
        <>
            <Viewport />
            <ViewportToolbar
                onRun={p.handleRun}
                onValidate={p.handleValidate}
                runNeeded={!!workbench.error}
                markingMode={markingMode}
                onToggleMarkingMode={p.handleToggleMarkingMode}
                sectionMode={sectionMode}
                onToggleSectionMode={p.handleToggleSectionMode}
                referenceImagesPresent={p.referenceImagesPresent}
                referenceImagesVisible={p.referenceImagesVisible}
                onToggleReferenceImages={p.handleToggleReferenceImages}
                renderEnvironmentPresent={p.renderEnvironmentPresent}
                renderEnvironmentVisible={p.renderEnvironmentVisible}
                renderEnvironmentPresetLabel={p.renderEnvironmentPresetLabel}
                onToggleRenderEnvironment={p.handleToggleRenderEnvironment}
                display={{
                    viewMode3D: workbench.viewMode3D,
                    setViewMode3D: workbench.setViewMode3D,
                    background: ui.viewportBackground,
                    setBackground: ui.setViewportBackground,
                    gridVisible: ui.gridVisible,
                    setGridVisible: ui.setGridVisible,
                }}
            />
            <MarkingOverlay visible={markingMode} />
            <SectionPanel visible={sectionMode} />
            <DirectEditPanel />
            {shouldShowKernelBanner(workbench.isReady, workbench.geometries?.length ?? 0) && (
                <KernelInitBanner error={workbench.error} />
            )}
        </>
    );
}

function renderStudioFooter(props: {
    workbench: ReturnType<typeof useWorkbench>;
    recompute: ReturnType<typeof useRecomputeResult>;
    directEditNotice: string | null;
    interferenceCount: number;
}) {
    const { workbench, recompute, directEditNotice, interferenceCount } = props;
    return (
        <>
            <BottomDrawer />

            <StatusBar
                isComputing={workbench.isComputing}
                error={workbench.error ?? null}
                geometryCount={workbench.geometries?.length ?? 0}
                selectedCount={workbench.selectedItemIds?.length ?? 0}
                viewMode3D={workbench.viewMode3D}
                layoutMode={workbench.layoutMode}
                activeCommandLabel={null}
                directEditNotice={directEditNotice}
                interferences={interferenceCount}
                interferenceSummary={recompute.interferenceSummary}
                recomputeMs={workbench.recomputeMs}
            />

            {renderProjectManager(workbench)}
        </>
    );
}

function renderProjectManager(workbench: ReturnType<typeof useWorkbench>) {
    return (
        <ProjectManagerDialog
            isOpen={workbench.activeDialog === 'projectManager'}
            onClose={() => workbench.setActiveDialog(null)}
        />
    );
}

function useStudioShellHandlers(workbench: ReturnType<typeof useWorkbench>) {
    const handleToggleMarkingMode = useCallback(() => {
        shellStore.toggleMarkingMode();
    }, []);
    const handleToggleSectionMode = useCallback(() => {
        // Section and marking are independent overlays; turning one on retires
        // the other so the viewport never hosts both at once.
        if (shellStore.getSnapshot().markingMode) shellStore.setMarkingMode(false);
        shellStore.toggleSectionMode();
    }, []);
    const handleValidate = useCallback(() => {
        // Force a re-fetch of /__kernelcad/review by re-running the
        // geometry pipeline. The review fetch is chained inside
        // GeometryContext.executeGeometry, so re-executing pulls a fresh
        // validity result into shellStore.
        workbench.executeGeometry?.(workbench.code);
    }, [workbench]);

    const handleRun = useCallback(() => {
        // Run forces a re-execution of the current script. The existing
        // recompute auto-runs on code changes; this is the manual button.
        workbench.mutateCode?.((current: string) => current, 'studio.toolbar.run');
    }, [workbench]);

    return {
        handleToggleMarkingMode,
        handleToggleSectionMode,
        handleValidate,
        handleRun,
    };
}

/** A phone has no room for the model beside the inspector: open on the
 *  model. The inspector stays one tap away (header ⋯ → Panels, ⌘\). */
function useModelFirstOnPhone(): void {
    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        if (window.matchMedia(NARROW_QUERY).matches) shellStore.setInspectorOpen(false);
    }, []);
}

function useProposeEditBridge(): void {
    // Test/integration hook so MCP (Slice 1.5b) and the browser console can
    // stage a proposed edit. Mounted on the window object behind a
    // __kernelcad_ prefix so it's clearly internal.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const w = window as unknown as { __kernelcad_propose_edit?: (edit: StagedEdit) => void };
        w.__kernelcad_propose_edit = (edit) => shellStore.proposeStagedEdit(edit);
        return () => {
            delete w.__kernelcad_propose_edit;
        };
    }, []);
}

function useShellSelectionBridge(
    selectedFeatureId: string | null,
    recompute: ReturnType<typeof useRecomputeResult>,
    workbench: ReturnType<typeof useWorkbench>,
): void {
    const { setSelectedItemId, codeContext } = workbench;
    useEffect(() => {
        if (selectedFeatureId == null) {
            setSelectedItemId(null);
            return;
        }
        const idx = recompute.features.findIndex((f) => f.id === selectedFeatureId);
        const returned = (codeContext?.returnedVariables ?? []) as (string | null)[];
        const mapped = idx >= 0 && typeof returned[idx] === 'string'
            ? returned[idx]
            : selectedFeatureId;
        setSelectedItemId(mapped);
    }, [selectedFeatureId, recompute.features, codeContext, setSelectedItemId]);
}

function buildTabSlots() {
    return {
        scene: <SceneTab />,
        code: <CodeTab />,
        params: <ParamsTab />,
        joints: <JointsTab />,
        validity: <ValidityTab />,
        export: <ExportTab />,
        animation: <AnimationTab />,
    };
}

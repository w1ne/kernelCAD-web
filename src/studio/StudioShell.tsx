import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Header } from './components/Layout/Header';
import { Toolbar } from './Toolbar';
import { Viewport } from './Viewport';
import { Inspector } from './Inspector';
import { AgentRail } from './AgentRail';
import { BottomDrawer } from './BottomDrawer';
import { MarkingOverlay } from './components/viewer/overlays/MarkingOverlay';
import { SectionPanel } from './components/viewer/overlays/SectionPanel';
import { SceneTab } from './tabs/SceneTab';
import { CodeTab } from './tabs/CodeTab';
import { ParamsTab } from './tabs/ParamsTab';
import { JointsTab } from './tabs/JointsTab';
import { ValidityTab } from './tabs/ValidityTab';
import { ExportTab } from './tabs/ExportTab';
import { StatusBar } from './components/Layout/StatusBar';
import ProjectManagerDialog from './components/Dialogs/ProjectManagerDialog';
import { useWorkbench } from './context/WorkbenchContext';
import { useShellStore, shellStore } from './store/useShellStore';
import type { StagedEdit } from './store/shellStore';
import { useRecomputeResult } from './hooks/useRecomputeResult';
import { useProject } from './context/ProjectContext';

/**
 * Top-level Studio shell. Composes the six slots — Toolbar / Viewport /
 * Inspector / AgentRail / BottomDrawer / StatusBar — over the existing
 * Header chrome. Mounted by App.tsx and DevLab; the Phase 1 WorkbenchLayout
 * stub has been retired (Slice 1.3).
 */
export function StudioShell() {
    const workbench = useWorkbench();
    const { agentRailOpen, selectedFeatureId, markingMode, sectionMode } = useShellStore();
    const handleToggleMarkingMode = useCallback(() => {
        shellStore.toggleMarkingMode();
    }, []);
    const handleToggleSectionMode = useCallback(() => {
        // Section and marking are independent overlays; turning one on retires
        // the other so the viewport never hosts both at once.
        if (shellStore.getSnapshot().markingMode) shellStore.setMarkingMode(false);
        shellStore.toggleSectionMode();
    }, []);
    const recompute = useRecomputeResult();
    const { activeProject } = useProject();

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

    const isModified = activeProject != null && workbench.code !== activeProject.code;

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

    // Bridge shell selection → Viewer's existing selectedItemIds. Identity
    // reconciliation: shell selectedFeatureId is a FeatureRecord.id (e.g.
    // "box_1"); Viewer's selectedItemIds match against script variable
    // names (from codeContext.returnedVariables). We align by position —
    // features[i] corresponds to returnedVariables[i] in capture order.
    // Falls back to the raw id when no variable maps; falls back to null
    // for null selection.
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

    const handleToggleAgentRail = useCallback(() => {
        shellStore.setAgentRailOpen(!agentRailOpen);
    }, [agentRailOpen]);

    const [referenceImagesVisible, setReferenceImagesVisible] = useState(true);
    const referenceImagesPresent = useMemo(
        () => recompute.features.some((f) => f.kind === 'referenceImage'),
        [recompute.features],
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
        () => [...recompute.features].reverse().find((f) => f.kind === 'renderEnvironment'),
        [recompute.features],
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

    const tabSlots = {
        scene: <SceneTab />,
        code: <CodeTab />,
        params: <ParamsTab />,
        joints: <JointsTab />,
        validity: <ValidityTab />,
        export: <ExportTab />,
    };

    // HUD reads RAW interference pairs (pre-filter), not the validator's
    // diagnostics. Scripts can silence known-acceptable contacts via
    // `assembly.solvedModel({ ignore: [...] })` — that hides them from the
    // validator throw path and the Validity tab, but the user must still see
    // every live overlap on the status bar (especially when they drag a
    // Studio param slider into a colliding pose). The two channels are
    // wired separately on `useRecomputeResult` for exactly this reason.
    const interferenceCount = recompute.rawInterferencePairs?.length ?? 0;

    return (
        <div
            className="flex w-screen h-screen bg-black text-white font-sans overflow-hidden flex-col"
            data-testid="workbench-ready"
        >
            <Header />
            <Toolbar
                isModified={isModified}
                onValidate={handleValidate}
                onRun={handleRun}
                agentRailOpen={agentRailOpen}
                onToggleAgentRail={handleToggleAgentRail}
                referenceImagesPresent={referenceImagesPresent}
                referenceImagesVisible={referenceImagesVisible}
                onToggleReferenceImages={handleToggleReferenceImages}
                renderEnvironmentPresent={renderEnvironmentPresent}
                renderEnvironmentVisible={renderEnvironmentVisible}
                renderEnvironmentPresetLabel={renderEnvironmentPresetLabel}
                onToggleRenderEnvironment={handleToggleRenderEnvironment}
                markingMode={markingMode}
                onToggleMarkingMode={handleToggleMarkingMode}
                sectionMode={sectionMode}
                onToggleSectionMode={handleToggleSectionMode}
            />

            <div className="flex-1 flex overflow-hidden relative">
                {agentRailOpen && <AgentRail />}
                <div className="flex-1 relative">
                    <Viewport />
                    <MarkingOverlay visible={markingMode} />
                    <SectionPanel visible={sectionMode} />
                </div>
                <Inspector tabSlots={tabSlots} />

                {!workbench.isReady && (
                    <div
                        data-testid="kernel-init-banner"
                        className="pointer-events-none absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded border border-white/10 bg-black/80 px-3 py-2 text-xs text-white/80 shadow-lg"
                    >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Geometry kernel warming up...</span>
                    </div>
                )}

            </div>

            <BottomDrawer />

            <StatusBar
                isComputing={workbench.isComputing}
                error={workbench.error ?? null}
                geometryCount={workbench.geometries?.length ?? 0}
                selectedCount={workbench.selectedItemIds?.length ?? 0}
                viewMode3D={workbench.viewMode3D}
                layoutMode={workbench.layoutMode}
                activeCommandLabel={null}
                interferences={interferenceCount}
                recomputeMs={workbench.recomputeMs}
            />

            <ProjectManagerDialog
                isOpen={workbench.activeDialog === 'projectManager'}
                onClose={() => workbench.setActiveDialog(null)}
            />
        </div>
    );
}

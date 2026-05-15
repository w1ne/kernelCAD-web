import { useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Header } from '../components/Layout/Header';
import { Toolbar } from './Toolbar';
import { Viewport } from './Viewport';
import { Inspector } from './Inspector';
import { AgentRail } from './AgentRail';
import { BottomDrawer } from './BottomDrawer';
import { SceneTab } from './tabs/SceneTab';
import { CodeTab } from './tabs/CodeTab';
import { ParamsTab } from './tabs/ParamsTab';
import { ValidityTab } from './tabs/ValidityTab';
import { ExportTab } from './tabs/ExportTab';
import { StatusBar } from '../components/Layout/StatusBar';
import ProjectManagerDialog from '../components/Dialogs/ProjectManagerDialog';
import { FloatingAgent } from '../features/ai/FloatingAgent';
import { SmartWidget } from '../features/ai/SmartWidget';
import { useWorkbench } from '../context/WorkbenchContext';
import { useShellStore, shellStore } from './store/useShellStore';
import type { StagedEdit } from './store/shellStore';
import { useRecomputeResult } from './hooks/useRecomputeResult';
import { useProject } from '../context/ProjectContext';

/**
 * Top-level Studio shell. Composes the six slots — Toolbar / Viewport /
 * Inspector / AgentRail / BottomDrawer / StatusBar — over the existing
 * Header chrome. Mounted by App.tsx and DevLab; the Phase 1 WorkbenchLayout
 * stub has been retired (Slice 1.3).
 */
export function StudioShell() {
    const workbench = useWorkbench();
    const { agentRailOpen, selectedFeatureId } = useShellStore();
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

    const tabSlots = {
        scene: <SceneTab />,
        code: <CodeTab />,
        params: <ParamsTab />,
        validity: <ValidityTab />,
        export: <ExportTab />,
    };

    const interferenceCount = recompute.validity?.diagnostics.filter(
        (d) => d.code === 'assembly.interference.overlap',
    ).length ?? 0;

    return (
        <div
            className="flex w-screen h-screen bg-black text-white font-sans overflow-hidden flex-col"
            data-testid="workbench-ready"
        >
            <Header />
            <Toolbar
                project={activeProject ? { name: activeProject.name } : null}
                filename={activeProject?.name ? `${activeProject.name}.kcad.ts` : 'untitled.kcad.ts'}
                isModified={isModified}
                onValidate={handleValidate}
                onRun={handleRun}
                agentRailOpen={agentRailOpen}
                onToggleAgentRail={handleToggleAgentRail}
            />

            <div className="flex-1 flex overflow-hidden relative">
                <Viewport />
                <Inspector tabSlots={tabSlots} />
                {agentRailOpen && <AgentRail />}

                {!workbench.isReady && (
                    <div
                        data-testid="kernel-init-banner"
                        className="pointer-events-none absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded border border-white/10 bg-black/80 px-3 py-2 text-xs text-white/80 shadow-lg"
                    >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Geometry kernel warming up...</span>
                    </div>
                )}

                <FloatingAgent />
                <SmartWidget />
            </div>

            <BottomDrawer />

            <StatusBar
                isComputing={false}
                error={workbench.error ?? null}
                geometryCount={workbench.geometries?.length ?? 0}
                selectedCount={workbench.selectedItemIds?.length ?? 0}
                viewMode3D={workbench.viewMode3D}
                layoutMode={workbench.layoutMode}
                activeCommandLabel={null}
                interferences={interferenceCount}
            />

            <ProjectManagerDialog
                isOpen={workbench.activeDialog === 'projectManager'}
                onClose={() => workbench.setActiveDialog(null)}
            />
        </div>
    );
}

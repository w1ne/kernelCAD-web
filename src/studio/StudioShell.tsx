import { useCallback } from 'react';
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
import { StatusBar } from '../components/Layout/StatusBar';
import ProjectManagerDialog from '../components/Dialogs/ProjectManagerDialog';
import { FloatingAgent } from '../features/ai/FloatingAgent';
import { SmartWidget } from '../features/ai/SmartWidget';
import { useWorkbench } from '../context/WorkbenchContext';
import { useShellStore, shellStore } from './store/useShellStore';
import { useRecomputeResult } from './hooks/useRecomputeResult';
import { useProject } from '../context/ProjectContext';

/**
 * Top-level Studio shell. Composes the six slots — Toolbar / Viewport /
 * Inspector / AgentRail / BottomDrawer / StatusBar — over the existing
 * Header chrome. Mounted by App.tsx; replaces the WorkbenchLayout stub
 * that Phase 1 left behind.
 */
export function StudioShell() {
    const workbench = useWorkbench();
    const { agentRailOpen } = useShellStore();
    const recompute = useRecomputeResult();
    const { activeProject } = useProject();

    const handleValidate = useCallback(() => {
        // Validate dispatches through the existing recompute pipeline.
        // Phase 1.5+ slice wires this to an explicit revalidate trigger;
        // for now a no-op keeps the contract stable.
    }, []);

    const handleRun = useCallback(() => {
        // Run forces a re-execution of the current script. The existing
        // recompute auto-runs on code changes; this is the manual button.
        workbench.mutateCode?.((current: string) => current, 'studio.toolbar.run');
    }, [workbench]);

    const handleToggleAgentRail = useCallback(() => {
        shellStore.setAgentRailOpen(!agentRailOpen);
    }, [agentRailOpen]);

    const tabSlots = {
        scene: <SceneTab />,
        code: <CodeTab />,
        params: <ParamsTab />,
        validity: <ValidityTab />,
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
                isModified={false}
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

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Header } from './components/Layout/Header';
import { Toolbar } from './Toolbar';
import { useStudioConfig } from './config/StudioConfigContext';
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
import { AnimationTab } from './components/animation/AnimationTab';
import { StatusBar } from './components/Layout/StatusBar';
import ProjectManagerDialog from './components/Dialogs/ProjectManagerDialog';
import { useWorkbench } from './context/WorkbenchContext';
import { useShellStore, shellStore } from './store/useShellStore';
import type { StagedEdit } from './store/shellStore';
import { useRecomputeResult } from './hooks/useRecomputeResult';
import { useProject } from './context/ProjectContext';
import { useStudioChrome } from './context/StudioChromeContext';
import { useOptionalSession } from '../funnel/hooks/useSession';
import { isAuthConfigured } from '../funnel/lib/supabaseClient';
import { jointContactCapMm3 } from '../modeling/runtime/jointContactCap';

/**
 * Top-level Studio shell. Composes the six slots — Toolbar / Viewport /
 * Inspector / AgentRail / BottomDrawer / StatusBar — over the existing
 * Header chrome. Mounted by App.tsx and DevLab; the Phase 1 WorkbenchLayout
 * stub has been retired (Slice 1.3).
 */
export function StudioShell() {
    const workbench = useWorkbench();
    const { agentRailOpen, inspectorOpen, selectedFeatureId, markingMode, sectionMode } = useShellStore();
    const embed = useStudioConfig();
    // Defaults preserve standalone behavior: show the kernelCAD header and
    // mount the AgentRail. Embed hosts (e.g. proto.cat) pass `false` for
    // both to drive a stripped viewport+inspector+toolbar shell.
    const showHeader = embed.showHeader ?? true;
    const enableAgentRail = embed.enableAgentRail ?? true;
    const authConfigured = isAuthConfigured();
    const { session } = useOptionalSession();
    // The in-Studio agent talks to the hosted, auth'd, metered backend
    // (api.kernelcad.com /api/v1/generate), so it only belongs in the real
    // hosted app for a signed-in user. It is therefore hidden when:
    //   - auth is not configured (local dev / env-less embed) — no backend to
    //     drive it and nothing to meter against; and
    //   - the host disables it (embed / MCP-driven shells pass enableAgentRail
    //     = false, e.g. proto.cat) or there is no live session.
    // (`open_in_studio` / `/p/<slug>` review pages additionally hide it via
    // viewerMode below.)
    const agentEnabled = enableAgentRail && authConfigured && !!session;
    const enableConnect = embed.enableConnect ?? true;
    const { viewerMode } = useStudioChrome();
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

    const handleToggleInspector = useCallback(() => {
        shellStore.toggleInspectorOpen();
    }, []);

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
        animation: <AnimationTab />,
    };

    // HUD counts actionable interferences, not contact-noise slivers. Raw
    // pairs stay available to diagnostic tabs, but the footer follows the same
    // absolute cap used by validator/mechanism-truth so clearance-fit clevis
    // contacts do not make a plausible mechanism look broken.
    const interferenceCount = recompute.interferenceSummary?.actionableCount
        ?? (recompute.rawInterferencePairs ?? [])
            .filter((pair) => pair.volumeMm3 > jointContactCapMm3())
            .length;

    return (
        <div
            className="flex w-screen h-screen bg-black text-white font-sans overflow-hidden flex-col"
            data-testid="workbench-ready"
        >
            {showHeader && <Header />}
            <Toolbar
                isModified={isModified}
                onValidate={handleValidate}
                onRun={handleRun}
                agentRailOpen={agentRailOpen}
                onToggleAgentRail={handleToggleAgentRail}
                enableAgentRail={agentEnabled}
                enableConnect={enableConnect}
                agentRailHidden={viewerMode}
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
                inspectorOpen={inspectorOpen}
                onToggleInspector={handleToggleInspector}
                code={workbench.code}
                projectName={activeProject?.name}
            />

            <div className="flex-1 flex overflow-hidden relative">
                {agentEnabled && agentRailOpen && !viewerMode && <AgentRail />}
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
                interferenceSummary={recompute.interferenceSummary}
                recomputeMs={workbench.recomputeMs}
            />

            <ProjectManagerDialog
                isOpen={workbench.activeDialog === 'projectManager'}
                onClose={() => workbench.setActiveDialog(null)}
            />
        </div>
    );
}

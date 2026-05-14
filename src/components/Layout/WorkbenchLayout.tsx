import { Loader2 } from 'lucide-react';
import { Header } from './Header';
import { EditorPanel } from './EditorPanel';
import { ViewerPanel } from './ViewerPanel';
import ProjectManagerDialog from '../Dialogs/ProjectManagerDialog';
import { FloatingAgent } from '../../features/ai/FloatingAgent';
import { SmartWidget } from '../../features/ai/SmartWidget';
import { useWorkbench } from '../../context/WorkbenchContext';

// Slice 1 stub. Phase 3 of the Studio adaptive UI workstream replaces this with
// StudioShell (top toolbar / viewport / adaptive inspector / agent rail / bottom
// drawer / status bar). For now it renders only Slice 1's kept primitives so the
// build stays green while the drift is removed.
export function WorkbenchLayout() {
    const {
        viewMode,
        viewMode3D,
        code,
        setCode,
        geometries,
        previewGeometries,
        sketchesGeometries,
        showSketches,
        error,
        isReady,
        activeDialog,
        setActiveDialog,
        setEditorInstance,
    } = useWorkbench();

    return (
        <div className="flex w-screen h-screen bg-black text-white font-sans overflow-hidden flex-col" data-testid="workbench-ready">
            <Header />

            <div className="flex-1 flex overflow-hidden relative">
                <EditorPanel
                    code={code}
                    onChange={(v) => setCode(v)}
                    onMount={(inst) => setEditorInstance(inst)}
                    error={error}
                    visible={viewMode !== 'gui'}
                />

                <ViewerPanel
                    geometries={geometries}
                    previewGeometries={previewGeometries}
                    sketchesGeometries={sketchesGeometries}
                    showSketches={showSketches}
                    viewMode3D={viewMode3D}
                />

                {!isReady && (
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

            <ProjectManagerDialog
                isOpen={activeDialog === 'projectManager'}
                onClose={() => setActiveDialog(null)}
            />
        </div>
    );
}

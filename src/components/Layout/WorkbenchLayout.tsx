import React from 'react';
import CodeEditor from '../Editor';
import Viewer from '../Viewer';
import Toolbar from '../Toolbar';
import ParameterDialog from '../Dialogs/ParameterDialog';
import { Header } from './Header';
import { SidePanel } from './SidePanel';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useCodeInsertion } from '../../hooks/useCodeInsertion';
import { GEOMETRY_CONFIGS } from '../Dialogs/GeometryDialogs';
import { AlertCircle, Loader2 } from 'lucide-react';

export function WorkbenchLayout() {
    const {
        viewMode,
        code,
        setCode,
        geometries,
        error,
        isReady,
        activeDialog,
        setActiveDialog,
        editorInstance,
        setEditorInstance
    } = useWorkbench();

    const { insertCode } = useCodeInsertion();

    // Refresh editor layout when switching modes
    React.useEffect(() => {
        if (viewMode === 'code' && editorInstance) {
            // Small delay to allow transition to finish (duration-300)
            setTimeout(() => editorInstance.layout(), 350);
        }
    }, [viewMode, editorInstance]);

    const handleEditorDidMount = (editor: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        setEditorInstance(editor);
        // Layout fix logic moved here if needed or kept in context effect
    };

    const handleToolbarClick = (toolId: string, isDialog?: boolean) => {
        if (isDialog) {
            if (GEOMETRY_CONFIGS[toolId]) {
                setActiveDialog(toolId);
            }
        } else {
            insertCode(toolId);
        }
    };

    const handleDialogSubmit = (values: Record<string, number>) => {
        if (activeDialog && GEOMETRY_CONFIGS[activeDialog]) {
            const config = GEOMETRY_CONFIGS[activeDialog];
            insertCode((name) => config.template(values, name), config.baseName);
        }
    };

    const handleJumpToLine = (line: number) => {
        if (editorInstance) {
            editorInstance.setPosition({ lineNumber: line, column: 1 });
            editorInstance.revealLineInCenter(line);
            editorInstance.focus();
        }
    };

    if (!isReady) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-black text-white">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Initializing Kernel...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex w-screen h-screen bg-black text-white font-sans overflow-hidden flex-col">
            <Header />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Pane */}
                <div className={`h-full flex flex-col border-r border-[#333] transition-all duration-300 ${viewMode === 'code' ? 'w-[40%]' : 'w-[250px]'}`}>
                    <div className="flex-1 relative overflow-hidden flex">
                        <Toolbar onToolClick={handleToolbarClick} />

                        <div className="flex-1 h-full relative flex flex-col">
                            {/* GUI Mode: Scene Browser */}
                            {viewMode === 'gui' && (
                                <SidePanel onJumpToLine={handleJumpToLine} />
                            )}

                            {/* Code Mode: Editor */}
                            <div className={`flex-1 h-full relative ${viewMode === 'gui' ? 'hidden' : ''}`}>
                                <CodeEditor
                                    value={code}
                                    onChange={(v) => setCode(v || '')}
                                    onMount={handleEditorDidMount}
                                />
                                {error && (
                                    <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 text-red-100 p-3 rounded-lg border border-red-700/50 shadow-xl backdrop-blur-md text-xs font-mono flex gap-2 items-start pointer-events-none">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <pre className="whitespace-pre-wrap">{error}</pre>
                                    </div>
                                )}
                            </div>

                            {/* Dialog Overlay */}
                            {activeDialog && GEOMETRY_CONFIGS[activeDialog] && (
                                <ParameterDialog
                                    key={activeDialog}
                                    isOpen={!!activeDialog}
                                    onClose={() => setActiveDialog(null)}
                                    onSubmit={handleDialogSubmit}
                                    title={GEOMETRY_CONFIGS[activeDialog].title}
                                    fields={GEOMETRY_CONFIGS[activeDialog].fields}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Pane: 3D Viewport */}
                <div className="flex-1 h-full relative bg-[#0a0a0a]">
                    <Viewer geometries={geometries} />
                </div>
            </div>
        </div>
    );
}

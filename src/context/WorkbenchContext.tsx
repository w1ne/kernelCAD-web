/**
 * WorkbenchContext - Unified context composing all focused contexts
 * 
 * This maintains backward compatibility with the useWorkbench() hook
 * while internally delegating to focused contexts.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { CodeProvider, useCode, type CodeContextType } from './CodeContext';
import { UIProvider, useUI, type UIContextType } from './UIContext';
import { SelectionProvider, useSelection, type SelectionContextType } from './SelectionContext';
import { GeometryProvider, useGeometry, type GeometryContextType } from './GeometryContext';
import { useFaceSelection } from '../hooks/useFaceSelection';

// Combined type for backward compatibility
export interface WorkbenchContextType extends
    CodeContextType,
    UIContextType,
    Omit<SelectionContextType, 'setSelectedFacePlane' | 'setIsFaceSelecting'>,
    GeometryContextType {
    // Override from useFaceSelection hook
    startFaceSelection: () => void;
    cancelFaceSelection: () => void;
}

// Export for testing
// eslint-disable-next-line react-refresh/only-export-components
export const WorkbenchContext = createContext<WorkbenchContextType | undefined>(undefined);

/**
 * Inner provider that has access to all contexts
 */
function WorkbenchInnerProvider({ children }: { children: ReactNode }) {
    const codeCtx = useCode();
    const uiCtx = useUI();
    const selectionCtx = useSelection();
    const geometryCtx = useGeometry();

    // Use face selection hook with geometry dependencies
    const faceSelection = useFaceSelection({
        geometries: geometryCtx.geometries,
        code: codeCtx.code,
        onSketchModeChange: selectionCtx.setSketchMode
    });

    // Wrap startFaceSelection to also close the dialog
    const startFaceSelectionWithDialog = () => {
        faceSelection.startFaceSelection();
        uiCtx.setActiveDialog(null);
    };

    // Combine all contexts into unified interface
    const value: WorkbenchContextType = {
        // Code context
        code: codeCtx.code,
        setCode: codeCtx.setCode,
        insertCode: codeCtx.insertCode,
        editorInstance: codeCtx.editorInstance,
        setEditorInstance: codeCtx.setEditorInstance,
        commandManager: codeCtx.commandManager,
        // UI context
        viewMode: uiCtx.viewMode,
        setViewMode: uiCtx.setViewMode,
        viewMode3D: uiCtx.viewMode3D,
        setViewMode3D: uiCtx.setViewMode3D,
        activeDialog: uiCtx.activeDialog,
        setActiveDialog: uiCtx.setActiveDialog,
        // Selection context
        selectedFace: faceSelection.selectedFace,
        selectedFacePlane: faceSelection.selectedFacePlane,
        setSelectedFace: faceSelection.setSelectedFace,
        isFaceSelecting: faceSelection.isFaceSelecting,
        startFaceSelection: startFaceSelectionWithDialog,
        cancelFaceSelection: faceSelection.cancelFaceSelection,
        sketchMode: selectionCtx.sketchMode,
        setSketchMode: selectionCtx.setSketchMode,
        sketches: selectionCtx.sketches,
        addSketch: selectionCtx.addSketch,
        planes: selectionCtx.planes,
        addPlane: selectionCtx.addPlane,
        togglePlaneVisibility: selectionCtx.togglePlaneVisibility,
        // Geometry context
        geometries: geometryCtx.geometries,
        sketchesGeometries: geometryCtx.sketchesGeometries,
        showSketches: geometryCtx.showSketches,
        toggleSketchVisibility: geometryCtx.toggleSketchVisibility,
        error: geometryCtx.error,
        isReady: geometryCtx.isReady,
        isComputing: geometryCtx.isComputing,
        executeGeometry: geometryCtx.executeGeometry,
    };

    return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>;
}

/**
 * CodeConsumer - Helper to access code in GeometryProvider
 */
function GeometryWithCode({ children }: { children: ReactNode }) {
    const { code } = useCode();
    return <GeometryProvider code={code}>{children}</GeometryProvider>;
}

/**
 * Main WorkbenchProvider composing all focused contexts
 */
export function WorkbenchProvider({ children, initialCode }: { children: ReactNode; initialCode?: string }) {
    return (
        <CodeProvider initialCode={initialCode}>
            <UIProvider>
                <SelectionProvider>
                    <GeometryWithCode>
                        <WorkbenchInnerProvider>
                            {children}
                        </WorkbenchInnerProvider>
                    </GeometryWithCode>
                </SelectionProvider>
            </UIProvider>
        </CodeProvider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkbench() {
    const context = useContext(WorkbenchContext);
    if (!context) {
        throw new Error("useWorkbench must be used within a WorkbenchProvider");
    }
    return context;
}

// Re-export individual hooks for components that want focused access
export { useCode } from './CodeContext';
export { useUI } from './UIContext';
export { useSelection } from './SelectionContext';
export { useGeometry } from './GeometryContext';

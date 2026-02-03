/**
 * WorkbenchContext - Unified context composing all focused contexts
 * 
 * This maintains backward compatibility with the useWorkbench() hook
 * while internally delegating to focused contexts.
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { CodeProvider, useCode, type CodeContextType } from './CodeContext';
import { UIProvider, useUI, type UIContextType } from './UIContext';
import { SelectionProvider, useSelection, type SelectionContextType } from './SelectionContext';
import { GeometryProvider, useGeometry, type GeometryContextType } from './GeometryContext';
import { useFaceSelection } from '../hooks/useFaceSelection';
import { SketchingProvider, useSketching, type SketchingContextType } from './SketchingContext';
import { CodeAnalyzer, type CodeGenerationContext } from '../lib/codeGeneration';

// Combined type for backward compatibility
export interface WorkbenchContextType extends
    CodeContextType,
    UIContextType,
    Omit<SelectionContextType, 'setSelectedFacePlane' | 'setIsFaceSelecting'>,
    GeometryContextType,
    SketchingContextType {
    // New: Code generation context
    codeContext: CodeGenerationContext;
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
    const sketchingCtx = useSketching();

    // Use face selection hook with geometry dependencies
    const faceSelection = useFaceSelection({
        geometries: geometryCtx.geometries,
        code: codeCtx.code,
        onSketchModeChange: selectionCtx.setSketchMode
    });

    // Create code context for feature generators
    const codeContext = useMemo(() => {
        const analyzer = new CodeAnalyzer(codeCtx.code);
        return analyzer.createContext();
    }, [codeCtx.code]);

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
        // Sketching context
        entities: sketchingCtx.entities,
        constraints: sketchingCtx.constraints,
        selectedEntityIds: sketchingCtx.selectedEntityIds,
        addEntity: sketchingCtx.addEntity,
        updateEntity: sketchingCtx.updateEntity,
        addConstraint: sketchingCtx.addConstraint,
        selectEntity: sketchingCtx.selectEntity,
        clearSelection: sketchingCtx.clearSelection,
        solve: sketchingCtx.solve,
        // New: Code generation context
        codeContext,
    };

    // Expose for E2E testing
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // @ts-ignore
            window.__TEST_SELECT_FACE = (shapeIndex: number, faceId: number) => {
                console.log('TEST: Select Face (Workbench)', shapeIndex, faceId);
                faceSelection.setSelectedFace({ shapeIndex, faceId });
            };

            // @ts-ignore
            window.getSelectedFace = () => faceSelection.selectedFace;

            // @ts-ignore
            window.getGeometries = () => geometryCtx.geometries;

            // @ts-ignore
            window.getSketches = () => geometryCtx.sketchesGeometries;
        }
    }, [faceSelection, geometryCtx.geometries, geometryCtx.sketchesGeometries]);

    return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>;
}

/**
 * CodeConsumer - Helper to access code in GeometryProvider
 */
function GeometryWithCode({ children }: { children: ReactNode }) {
    const { code } = useCode();
    return <GeometryProvider code={code}>{children}</GeometryProvider>;
}

import { WorkbenchStateProvider } from './WorkbenchStateContext';

/**
 * Main WorkbenchProvider composing all focused contexts
 */
export function WorkbenchProvider({ children, initialCode }: { children: ReactNode; initialCode?: string }) {
    return (
        <CodeProvider initialCode={initialCode}>
            <WorkbenchStateProvider>
                <UIProvider>
                    <SelectionProvider>
                        <GeometryWithCode>
                            <SketchingProvider>
                                <WorkbenchInnerProvider>
                                    {children}
                                </WorkbenchInnerProvider>
                            </SketchingProvider>
                        </GeometryWithCode>
                    </SelectionProvider>
                </UIProvider>
            </WorkbenchStateProvider>
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
export { useSketching } from './SketchingContext';

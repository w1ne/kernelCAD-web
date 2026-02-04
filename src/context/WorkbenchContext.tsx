/**
 * WorkbenchContext - Unified context composing all focused contexts
 * 
 * This maintains backward compatibility with the useWorkbench() hook
 * while internally delegating to focused contexts.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
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
        try {
            const analyzer = new CodeAnalyzer(codeCtx.code);
            return analyzer.createContext();
        } catch (e) {
            console.warn('WorkbenchContext: Failed to analyze code (likely syntax error):', e);
            // Return a minimal context for features to still function with fallbacks
            return {
                variables: [],
                getVariableAtIndex: () => 'shape',
                generateUniqueName: (prefix: string) => `${prefix}_${Date.now()}`
            } as unknown as CodeGenerationContext;
        }
    }, [codeCtx.code]);

    // Wrap startFaceSelection to also close the dialog
    const startFaceSelectionWithDialog = useCallback(() => {
        faceSelection.startFaceSelection();
        uiCtx.setActiveDialog(null);
    }, [faceSelection, uiCtx]);

    // Combine all contexts into unified interface
    const value: WorkbenchContextType = useMemo(() => ({
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
        selectedSketchName: selectionCtx.selectedSketchName,
        setSelectedSketchName: selectionCtx.setSelectedSketchName,
        // Geometry context
        geometries: geometryCtx.geometries,
        sketchesGeometries: geometryCtx.sketchesGeometries,
        showSketches: geometryCtx.showSketches,
        toggleSketchVisibility: geometryCtx.toggleSketchVisibility,
        error: geometryCtx.error,
        isReady: geometryCtx.isReady,
        isComputing: geometryCtx.isComputing,
        executionCount: geometryCtx.executionCount,
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
    }), [
        codeCtx.code,
        codeCtx.setCode,
        codeCtx.insertCode,
        codeCtx.editorInstance,
        codeCtx.setEditorInstance,
        codeCtx.commandManager,
        uiCtx.viewMode,
        uiCtx.setViewMode,
        uiCtx.viewMode3D,
        uiCtx.setViewMode3D,
        uiCtx.activeDialog,
        uiCtx.setActiveDialog,
        faceSelection.selectedFace,
        faceSelection.selectedFacePlane,
        faceSelection.setSelectedFace,
        faceSelection.isFaceSelecting,
        startFaceSelectionWithDialog,
        faceSelection.cancelFaceSelection,
        selectionCtx.sketchMode,
        selectionCtx.setSketchMode,
        selectionCtx.sketches,
        selectionCtx.addSketch,
        selectionCtx.planes,
        selectionCtx.addPlane,
        selectionCtx.togglePlaneVisibility,
        selectionCtx.selectedSketchName,
        selectionCtx.setSelectedSketchName,
        geometryCtx.geometries,
        geometryCtx.sketchesGeometries,
        geometryCtx.showSketches,
        geometryCtx.toggleSketchVisibility,
        geometryCtx.error,
        geometryCtx.isReady,
        geometryCtx.isComputing,
        geometryCtx.executionCount,
        geometryCtx.executeGeometry,
        sketchingCtx.entities,
        sketchingCtx.constraints,
        sketchingCtx.selectedEntityIds,
        sketchingCtx.addEntity,
        sketchingCtx.updateEntity,
        sketchingCtx.addConstraint,
        sketchingCtx.selectEntity,
        sketchingCtx.clearSelection,
        sketchingCtx.solve,
        codeContext,
    ]);

    // Expose for E2E testing
    useEffect(() => {
        const expose = import.meta.env.DEV || import.meta.env.MODE === 'test';
        if (!expose || typeof window === 'undefined') return;

        window.__TEST_SELECT_FACE = (shapeIndex: number, faceId: number) => {
            faceSelection.setSelectedFace({ shapeIndex, faceId });
        };

        window.getSelectedFace = () => faceSelection.selectedFace;

        window.getGeometries = () => geometryCtx.geometries;

        window.getSketches = () => geometryCtx.sketchesGeometries;

        window.__TEST_SELECT_SKETCH = (name: string | null) => {
            selectionCtx.setSelectedSketchName(name);
        };

        window.isComputing = () => geometryCtx.isComputing;
        window.getExecutionCount = () => geometryCtx.executionCount;
        window.getError = () => geometryCtx.error;

        return () => {
            delete window.__TEST_SELECT_FACE;
            delete window.__TEST_SELECT_SKETCH;
            delete window.getSelectedFace;
            delete window.getGeometries;
            delete window.getSketches;
            delete window.isComputing;
            delete window.getExecutionCount;
            delete window.getError;
        };
    }, [faceSelection, geometryCtx.geometries, geometryCtx.sketchesGeometries, geometryCtx.isComputing, geometryCtx.executionCount, geometryCtx.error, selectionCtx]);

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
// eslint-disable-next-line react-refresh/only-export-components
export { useCode } from './CodeContext';
// eslint-disable-next-line react-refresh/only-export-components
export { useUI } from './UIContext';
// eslint-disable-next-line react-refresh/only-export-components
export { useSelection } from './SelectionContext';
// eslint-disable-next-line react-refresh/only-export-components
export { useGeometry } from './GeometryContext';
// eslint-disable-next-line react-refresh/only-export-components
export { useSketching } from './SketchingContext';

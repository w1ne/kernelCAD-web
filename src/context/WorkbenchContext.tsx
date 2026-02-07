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

    // Commands
    renameItem: (oldName: string, newName: string) => void;
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
        sidePanelVisible: uiCtx.sidePanelVisible,
        setSidePanelVisible: uiCtx.setSidePanelVisible,
        toggleSidePanel: uiCtx.toggleSidePanel,
        activePanels: uiCtx.activePanels,
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
        selectedItemId: selectionCtx.selectedItemId,
        selectedItemIds: selectionCtx.selectedItemIds,
        toggleSelection: selectionCtx.toggleSelection,
        setSelectedItemId: selectionCtx.setSelectedItemId,
        hoveredItemId: selectionCtx.hoveredItemId,
        setHoveredItemId: selectionCtx.setHoveredItemId,
        hiddenIds: selectionCtx.hiddenIds,
        hideItem: selectionCtx.hideItem,
        showAll: selectionCtx.showAll,
        toggleVisibility: selectionCtx.toggleVisibility,
        openPanel: uiCtx.openPanel,
        closePanel: uiCtx.closePanel,
        renameItem: (oldName: string, newName: string) => {
            if (!codeCtx.code) return;
            // Lazy load or import refactoring manager to avoid circular deps if needed?
            // But we can import it directly.
            // Ideally we should move this logic to a helper or hook, but here is fine for now.
            import('../features/modeling/RefactoringManager').then(({ refactoringManager }) => {
                const newCode = refactoringManager.renameVariable(codeCtx.code, oldName, newName);
                if (newCode !== codeCtx.code) {
                    codeCtx.setCode(newCode);
                }
            });
        },
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
        previewGeometries: geometryCtx.previewGeometries,
        setPreviewCode: geometryCtx.setPreviewCode,
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
        codeCtx,
        uiCtx.viewMode,
        uiCtx.setViewMode,
        uiCtx.viewMode3D,
        uiCtx.setViewMode3D,
        uiCtx.activeDialog,
        uiCtx.setActiveDialog,
        uiCtx.sidePanelVisible,
        uiCtx.setSidePanelVisible,
        uiCtx.toggleSidePanel,
        uiCtx.activePanels,
        uiCtx.openPanel,
        uiCtx.closePanel,
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
        selectionCtx.selectedItemIds,
        selectionCtx.selectedItemId,
        selectionCtx.setSelectedItemId,
        selectionCtx.toggleSelection,
        selectionCtx.hoveredItemId,
        selectionCtx.setHoveredItemId,
        selectionCtx.hiddenIds,
        selectionCtx.toggleVisibility,
        selectionCtx.hideItem,
        selectionCtx.showAll,
        geometryCtx.geometries,
        geometryCtx.sketchesGeometries,
        geometryCtx.showSketches,
        geometryCtx.toggleSketchVisibility,
        geometryCtx.error,
        geometryCtx.isReady,
        geometryCtx.isComputing,
        geometryCtx.executionCount,
        geometryCtx.executeGeometry,
        geometryCtx.previewGeometries,
        geometryCtx.setPreviewCode,
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__TEST_SELECT_FACE = (shapeIndex: number, faceId: number) => {
            faceSelection.setSelectedFace({ shapeIndex, faceId });
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).getSelectedFace = () => faceSelection.selectedFace;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).getGeometries = () => geometryCtx.geometries;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).getPreviewGeometries = () => geometryCtx.previewGeometries;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).getSketches = () => geometryCtx.sketchesGeometries;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).setCode = (code: string) => codeCtx.setCode(code);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).startFaceSelection = (purpose?: string) => {
            // Dispatch directly if needed or use the context helper
            // But startFaceSelectionWithDialog doesn't take arguments
            if (purpose === 'sketch') {
                // For testing, we might want to bypass dialog
            }
            faceSelection.startFaceSelection();
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__TEST_SELECT_SKETCH = (name: string | null) => {
            selectionCtx.setSelectedSketchName(name);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__TEST_SELECT_ITEM = (id: string | null) => {
            selectionCtx.setSelectedItemId(id);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__TEST_SET_HOVERED = (id: string | null) => {
            selectionCtx.setHoveredItemId(id);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).getHoveredItemId = () => selectionCtx.hoveredItemId;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).selectedItemId = () => selectionCtx.selectedItemId;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).getSelectedItemId = () => selectionCtx.selectedItemId;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__TEST_TOGGLE_VISIBILITY = (id: string) => {
            selectionCtx.toggleVisibility(id);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).isComputing = () => geometryCtx.isComputing;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).getExecutionCount = () => geometryCtx.executionCount;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).getError = () => geometryCtx.error;

        return () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).__TEST_SELECT_FACE;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).__TEST_SELECT_SKETCH;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).getSelectedFace;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).getGeometries;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).getPreviewGeometries;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).getSketches;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).setCode;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).startFaceSelection;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).isComputing;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).getExecutionCount;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).getError;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).getSelectedItemId;
        };
    }, [faceSelection, geometryCtx.geometries, geometryCtx.previewGeometries, geometryCtx.sketchesGeometries, geometryCtx.isComputing, geometryCtx.executionCount, geometryCtx.error, selectionCtx, codeCtx]);

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

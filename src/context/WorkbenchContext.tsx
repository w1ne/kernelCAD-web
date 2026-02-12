/**
 * WorkbenchContext - Unified context composing all focused contexts
 * 
 * This maintains backward compatibility with the useWorkbench() hook
 * while internally delegating to focused contexts.
 */

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { CodeProvider, useCode, type CodeContextType } from './CodeContext';
import { UIProvider, useUI, type UIContextType } from './UIContext';
import { SelectionProvider, useSelection, type SelectionContextType } from './SelectionContext';
import { GeometryProvider, useGeometry, type GeometryContextType } from './GeometryContext';
import { useFaceSelection } from '../hooks/useFaceSelection';
import { SketchingProvider, useSketching, type SketchingContextType } from './SketchingContext';
import { type CodeGenerationContext } from '../lib/codeGeneration';

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

    // Safety
    applyCodeSafe: (code: string) => Promise<boolean>;
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
    const {
        selectedFace,
        selectedFacePlane,
        setSelectedFace,
        isFaceSelecting,
        startFaceSelection,
        cancelFaceSelection,
    } = useFaceSelection({
        geometries: geometryCtx.geometries,
        code: codeCtx.code,
        onSketchModeChange: selectionCtx.setSketchMode
    });

    // Code context is now handled by CodeProvider

    // Wrap startFaceSelection to also close the dialog
    const startFaceSelectionWithDialog = useCallback(() => {
        startFaceSelection();
        uiCtx.setActiveDialog(null);
    }, [startFaceSelection, uiCtx]);

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
        contextMenu: uiCtx.contextMenu,
        setContextMenu: uiCtx.setContextMenu,
        // Selection context
        selectedFace,
        selectedFacePlane,
        setSelectedFace,
        isFaceSelecting,
        startFaceSelection: startFaceSelectionWithDialog,
        cancelFaceSelection,
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
        renameItem: codeCtx.renameItem,
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
        codeContext: codeCtx.codeContext,
        /**
         * Safely applies code after validating it with the Agent API.
         * Returns true if successful, false if validation failed.
         */
        applyCodeSafe: codeCtx.applyCodeSafe
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
        uiCtx.contextMenu,
        uiCtx.setContextMenu,
        // faceSelection removed
        selectedFace,
        selectedFacePlane,
        setSelectedFace,
        isFaceSelecting,
        startFaceSelectionWithDialog,
        cancelFaceSelection,
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
    ]);

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

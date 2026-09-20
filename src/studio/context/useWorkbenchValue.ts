// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useMemo } from 'react';
import type { CodeContextType } from './CodeContext';
import type { UIContextType } from './UIContext';
import type { SelectionContextType } from './SelectionContext';
import type { GeometryContextType } from './GeometryContext';
import type { SketchingContextType } from './SketchingContext';
import type { WorkbenchContextType } from './WorkbenchContext';
import type { FacePlane, FaceSelection } from '../hooks/useFaceSelection';

export interface UseWorkbenchValueArgs {
    codeCtx: CodeContextType;
    uiCtx: UIContextType;
    selectionCtx: SelectionContextType;
    geometryCtx: GeometryContextType;
    sketchingCtx: SketchingContextType;
    selectedFace: FaceSelection | null;
    selectedFacePlane: FacePlane | null;
    setSelectedFace: (selection: FaceSelection | null) => void;
    isFaceSelecting: boolean;
    startFaceSelectionWithDialog: () => void;
    cancelFaceSelection: () => void;
}

function useCodeValue(codeCtx: CodeContextType) {
    return useMemo(() => ({
        // Code context
        code: codeCtx.code,
        setCode: codeCtx.setCode,
        mutateCode: codeCtx.mutateCode,
        insertCode: codeCtx.insertCode,
        editorInstance: codeCtx.editorInstance,
        setEditorInstance: codeCtx.setEditorInstance,
        commandManager: codeCtx.commandManager,
        renameItem: codeCtx.renameItem,
        deleteItem: codeCtx.deleteItem,
        deleteHistoryItem: codeCtx.deleteHistoryItem,
        getMutationDiagnostics: codeCtx.getMutationDiagnostics,
        resetMutationDiagnostics: codeCtx.resetMutationDiagnostics,
        // New: Code generation context
        codeContext: codeCtx.codeContext,
        /**
         * Safely applies code after validating it with the Agent API.
         * Returns true if successful, false if validation failed.
         */
        applyCodeSafe: codeCtx.applyCodeSafe,
        hasControlledCode: codeCtx.hasControlledCode,
    }), [codeCtx]);
}

function useUiValue(uiCtx: UIContextType) {
    return useMemo(() => ({
        // UI context
        viewMode: uiCtx.viewMode,
        setViewMode: uiCtx.setViewMode,
        layoutMode: uiCtx.layoutMode,
        setLayoutMode: uiCtx.setLayoutMode,
        viewMode3D: uiCtx.viewMode3D,
        setViewMode3D: uiCtx.setViewMode3D,
        viewportBackground: uiCtx.viewportBackground,
        setViewportBackground: uiCtx.setViewportBackground,
        gridVisible: uiCtx.gridVisible,
        setGridVisible: uiCtx.setGridVisible,
        activeDialog: uiCtx.activeDialog,
        setActiveDialog: uiCtx.setActiveDialog,
        sidePanelVisible: uiCtx.sidePanelVisible,
        setSidePanelVisible: uiCtx.setSidePanelVisible,
        toggleSidePanel: uiCtx.toggleSidePanel,
        activePanels: uiCtx.activePanels,
        contextMenu: uiCtx.contextMenu,
        setContextMenu: uiCtx.setContextMenu,
        openPanel: uiCtx.openPanel,
        closePanel: uiCtx.closePanel,
    }), [
        uiCtx.viewMode,
        uiCtx.setViewMode,
        uiCtx.layoutMode,
        uiCtx.setLayoutMode,
        uiCtx.viewMode3D,
        uiCtx.setViewMode3D,
        uiCtx.viewportBackground,
        uiCtx.setViewportBackground,
        uiCtx.gridVisible,
        uiCtx.setGridVisible,
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
    ]);
}

function useSelectionValue({
    selectionCtx,
    selectedFace,
    selectedFacePlane,
    setSelectedFace,
    isFaceSelecting,
    startFaceSelectionWithDialog,
    cancelFaceSelection,
}: Pick<
    UseWorkbenchValueArgs,
    | 'selectionCtx'
    | 'selectedFace'
    | 'selectedFacePlane'
    | 'setSelectedFace'
    | 'isFaceSelecting'
    | 'startFaceSelectionWithDialog'
    | 'cancelFaceSelection'
>) {
    return useMemo(() => ({
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
    }), [
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
    ]);
}

function useGeometryValue(geometryCtx: GeometryContextType) {
    return useMemo(() => ({
        // Geometry context
        geometries: geometryCtx.geometries,
        sketchesGeometries: geometryCtx.sketchesGeometries,
        showSketches: geometryCtx.showSketches,
        toggleSketchVisibility: geometryCtx.toggleSketchVisibility,
        error: geometryCtx.error,
        isReady: geometryCtx.isReady,
        isComputing: geometryCtx.isComputing,
        executionCount: geometryCtx.executionCount,
        currentCodeRevision: geometryCtx.currentCodeRevision,
        lastSuccessfulRevision: geometryCtx.lastSuccessfulRevision,
        executionHistory: geometryCtx.executionHistory,
        scriptParams: geometryCtx.scriptParams,
        scriptReview: geometryCtx.scriptReview,
        featureRecords: geometryCtx.featureRecords,
        recomputeMs: geometryCtx.recomputeMs,
        staleMainResponsesDropped: geometryCtx.staleMainResponsesDropped,
        stalePreviewResponsesDropped: geometryCtx.stalePreviewResponsesDropped,
        sessionToken: geometryCtx.sessionToken,
        kernelEpoch: geometryCtx.kernelEpoch,
        executeGeometry: geometryCtx.executeGeometry,
        previewGeometries: geometryCtx.previewGeometries,
        setPreviewCode: geometryCtx.setPreviewCode,
        updateParam: geometryCtx.updateParam,
        setGeometryTransformOverride: geometryCtx.setGeometryTransformOverride,
        clearGeometryTransformOverrides: geometryCtx.clearGeometryTransformOverrides,
        setViewportDriverLock: geometryCtx.setViewportDriverLock,
    }), [
        geometryCtx.geometries,
        geometryCtx.sketchesGeometries,
        geometryCtx.showSketches,
        geometryCtx.toggleSketchVisibility,
        geometryCtx.error,
        geometryCtx.isReady,
        geometryCtx.isComputing,
        geometryCtx.executionCount,
        geometryCtx.currentCodeRevision,
        geometryCtx.lastSuccessfulRevision,
        geometryCtx.executionHistory,
        geometryCtx.scriptParams,
        geometryCtx.scriptReview,
        geometryCtx.featureRecords,
        geometryCtx.recomputeMs,
        geometryCtx.staleMainResponsesDropped,
        geometryCtx.stalePreviewResponsesDropped,
        geometryCtx.sessionToken,
        geometryCtx.kernelEpoch,
        geometryCtx.executeGeometry,
        geometryCtx.previewGeometries,
        geometryCtx.setPreviewCode,
        geometryCtx.updateParam,
        geometryCtx.setGeometryTransformOverride,
        geometryCtx.clearGeometryTransformOverrides,
        geometryCtx.setViewportDriverLock,
    ]);
}

function useSketchingValue(sketchingCtx: SketchingContextType) {
    return useMemo(() => ({
        // Sketching context
        entities: sketchingCtx.entities,
        constraints: sketchingCtx.constraints,
        selectedEntityIds: sketchingCtx.selectedEntityIds,
        addEntity: sketchingCtx.addEntity,
        updateEntity: sketchingCtx.updateEntity,
        addConstraint: sketchingCtx.addConstraint,
        selectEntity: sketchingCtx.selectEntity,
        clearSelection: sketchingCtx.clearSelection,
        clearAll: sketchingCtx.clearAll,
        solve: sketchingCtx.solve,
    }), [
        sketchingCtx.entities,
        sketchingCtx.constraints,
        sketchingCtx.selectedEntityIds,
        sketchingCtx.addEntity,
        sketchingCtx.updateEntity,
        sketchingCtx.addConstraint,
        sketchingCtx.selectEntity,
        sketchingCtx.clearSelection,
        sketchingCtx.clearAll,
        sketchingCtx.solve,
    ]);
}

/**
 * Combines the focused contexts into the unified `WorkbenchContextType` value.
 * Split by source context so each memo group keeps the same dependency
 * granularity as the original single memo in `WorkbenchInnerProvider`.
 */
export function useWorkbenchValue(args: UseWorkbenchValueArgs): WorkbenchContextType {
    const codeValue = useCodeValue(args.codeCtx);
    const uiValue = useUiValue(args.uiCtx);
    const selectionValue = useSelectionValue(args);
    const geometryValue = useGeometryValue(args.geometryCtx);
    const sketchingValue = useSketchingValue(args.sketchingCtx);

    return useMemo(() => ({
        ...codeValue,
        ...uiValue,
        ...selectionValue,
        ...geometryValue,
        ...sketchingValue,
    }), [codeValue, uiValue, selectionValue, geometryValue, sketchingValue]);
}

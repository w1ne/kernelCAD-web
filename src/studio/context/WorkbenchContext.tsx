// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * WorkbenchContext - Unified context composing all focused contexts
 * 
 * This maintains backward compatibility with the useWorkbench() hook
 * while internally delegating to focused contexts.
 */

import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { CodeProvider, useCode, type CodeContextType } from './CodeContext';
import { UIProvider, useUI, type UIContextType } from './UIContext';
import { SelectionProvider, useSelection, type SelectionContextType } from './SelectionContext';
import { GeometryProvider, useGeometry, type GeometryContextType } from './GeometryContext';
import { useFaceSelection } from '../hooks/useFaceSelection';
import { SketchingProvider, useSketching, type SketchingContextType } from './SketchingContext';
import { type CodeGenerationContext } from '../../shared/codeGeneration/index';
import { useWorkbenchValue } from './useWorkbenchValue';

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
    deleteItem: (name: string, lineHint?: number) => void;
    deleteHistoryItem: CodeContextType['deleteHistoryItem'];

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
    const value = useWorkbenchValue({
        codeCtx,
        uiCtx,
        selectionCtx,
        geometryCtx,
        sketchingCtx,
        selectedFace,
        selectedFacePlane,
        setSelectedFace,
        isFaceSelecting,
        startFaceSelectionWithDialog,
        cancelFaceSelection,
    });

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

import { ProjectProvider } from './ProjectContext';

/**
 * Main WorkbenchProvider composing all focused contexts
 */
export function WorkbenchProvider({
    children,
    initialCode,
    controlledCode,
    onCodeChange,
}: {
    children: ReactNode;
    initialCode?: string;
    /** Embed-mode controlled source: when set, the host owns the canonical
     *  `.kcad.ts` string. See `CodeProvider` for the controlled-mode rules. */
    controlledCode?: string;
    /** Embed-mode change callback, debounced inside `CodeProvider`. */
    onCodeChange?: (next: string) => void;
}) {
    return (
        <ProjectProvider initialCode={initialCode}>
            <CodeProvider
                initialCode={initialCode}
                controlledCode={controlledCode}
                onCodeChange={onCodeChange}
            >
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
        </ProjectProvider>
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

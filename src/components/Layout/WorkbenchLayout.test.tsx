// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkbenchLayout } from './WorkbenchLayout';

vi.mock('../../hooks/useKeyboardShortcuts', () => ({
    useKeyboardShortcuts: vi.fn(),
}));

vi.mock('../../hooks/useCommandRegistry', () => ({
    useCommandRegistry: () => ({ registerCommand: vi.fn(() => vi.fn()) }),
}));

vi.mock('../../hooks/useCodeInsertion', () => ({
    useCodeInsertion: () => ({ insertCode: vi.fn() }),
}));

vi.mock('../../features/FeatureRegistry', () => ({
    featureRegistry: {
        getAll: () => [],
        get: () => null,
    },
}));

vi.mock('../../context/UIContext', () => ({
    useUI: () => ({
        contextMenu: { visible: false, position: null, type: 'FACE' },
        setContextMenu: vi.fn(),
    }),
}));

vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        viewMode: 'code',
        viewMode3D: 'shadedWithEdges',
        code: 'return box(1, 1, 1);',
        setCode: vi.fn(),
        mutateCode: vi.fn(),
        commandManager: { undo: vi.fn(), redo: vi.fn() },
        geometries: [],
        sketchesGeometries: [],
        showSketches: true,
        error: null,
        isReady: false,
        activeDialog: null,
        setActiveDialog: vi.fn(),
        editorInstance: null,
        setEditorInstance: vi.fn(),
        sketchMode: { active: false, plane: null, currentSketch: null, tool: 'select' },
        setSketchMode: vi.fn(),
        addSketch: vi.fn(),
        selectedFace: null,
        isFaceSelecting: false,
        cancelFaceSelection: vi.fn(),
        codeContext: {
            generateUniqueName: (prefix: string) => `${prefix}1`,
            returnedVariables: [],
        },
        previewGeometries: [],
        hideItem: vi.fn(),
        showAll: vi.fn(),
        selectedItemId: null,
        deleteItem: vi.fn(),
        deleteHistoryItem: vi.fn(),
        toggleVisibility: vi.fn(),
        openPanel: vi.fn(),
        closePanel: vi.fn(),
        selectedSketchName: null,
        setSelectedSketchName: vi.fn(),
        setSelectedItemId: vi.fn(),
        setHoveredItemId: vi.fn(),
        hoveredItemId: null,
        toggleSketchVisibility: vi.fn(),
        activePanels: [],
        setViewMode: vi.fn(),
        setSidePanelVisible: vi.fn(),
        clearAll: vi.fn(),
        isComputing: false,
        executionCount: 0,
        currentCodeRevision: 0,
        lastSuccessfulRevision: null,
        executionHistory: [],
        staleMainResponsesDropped: 0,
        stalePreviewResponsesDropped: 0,
        getMutationDiagnostics: vi.fn(() => []),
        resetMutationDiagnostics: vi.fn(),
        setSelectedFace: vi.fn(),
        startFaceSelection: vi.fn(),
    }),
}));

vi.mock('./Header', () => ({ Header: () => <div data-testid="header" /> }));
vi.mock('./EditorPanel', () => ({
    EditorPanel: () => <div data-testid="editor-panel" />,
}));
vi.mock('./ViewerPanel', () => ({
    ViewerPanel: () => <div data-testid="viewer-panel" />,
}));
vi.mock('../../features/ai/FloatingAgent', () => ({ FloatingAgent: () => null }));
vi.mock('../../features/ai/SmartWidget', () => ({ SmartWidget: () => null }));
vi.mock('../Dialogs/ProjectManagerDialog', () => ({ default: () => null }));

describe('WorkbenchLayout', () => {
    it('renders the workbench shell while the geometry kernel initializes', () => {
        render(<WorkbenchLayout />);

        expect(screen.getByTestId('workbench-ready')).toBeDefined();
        expect(screen.getByTestId('editor-panel')).toBeDefined();
        expect(screen.getByTestId('kernel-init-banner')).toBeDefined();
    });
});

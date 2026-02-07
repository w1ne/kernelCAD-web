// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import React, { useState, useEffect, useCallback } from 'react';
import { WorkbenchLayout } from '../components/Layout/WorkbenchLayout';
// import * as WorkbenchContext from '../context/WorkbenchContext';
import { featureRegistry } from '../features/FeatureRegistry';
import { Box } from 'lucide-react';

// Mock the CommandManager
vi.mock('../commands/CommandManager', () => ({
    CommandManager: class {
        register = vi.fn();
        execute = vi.fn();
    }
}));

// Mock heavy components that might crash happy-dom
vi.mock('../components/Viewer', () => ({
    default: () => <div data-testid="mock-viewer">Viewer</div>
}));

vi.mock('../components/Editor', () => ({
    default: () => <div data-testid="mock-editor">Editor</div>
}));

// Mock @react-three/drei to prevent happy-dom hang
vi.mock('@react-three/drei', () => ({
    OrbitControls: () => null,
    Grid: () => null,
    TransformControls: () => null
}));

// Use vi.hoisted to ensure mock is initialized before imports
const { mockInsertCode, mockUseWorkbench } = vi.hoisted(() => {
    return {
        mockInsertCode: vi.fn(),
        mockUseWorkbench: vi.fn(),
        globalActivePanels: [] as string[],
        globalActiveDialog: null as string | null,
    };
});
const globalState = {
    activePanels: [] as string[],
    activeDialog: null as string | null,
};
let triggerUpdate = () => { };

vi.mock('../context/WorkbenchContext', () => ({
    useWorkbench: () => mockUseWorkbench()
}));

vi.mock('../context/UIContext', () => ({
    useUI: () => ({
        viewMode: 'gui',
        setViewMode: vi.fn(),
        viewMode3D: 'shadedWithEdges',
        setViewMode3D: vi.fn(),
        activeDialog: globalState.activeDialog,
        setActiveDialog: (id: string | null) => {
            globalState.activeDialog = id;
            triggerUpdate();
        },
        activePanels: globalState.activePanels,
        openPanel: (id: string) => {
            if (!globalState.activePanels.includes(id)) {
                globalState.activePanels = [...globalState.activePanels, id];
            }
            triggerUpdate();
        },
        closePanel: (id: string) => {
            globalState.activePanels = globalState.activePanels.filter(p => p !== id);
            triggerUpdate();
        },
        sidePanelVisible: true,
        setSidePanelVisible: vi.fn(),
        toggleSidePanel: vi.fn(),
    })
}));

vi.mock('../hooks/useCodeInsertion', () => ({
    useCodeInsertion: () => ({
        insertCode: mockInsertCode
    })
}));

// Mock Toolbar to ensure buttons are rendered simply
vi.mock('../components/Toolbar', () => ({
    default: ({ features, onToolClick }: any) => (
        <div data-testid="mock-toolbar">
            {features.map((f: any) => (
                <button
                    key={f.id}
                    title={f.label}
                    onClick={() => onToolClick(f)}
                >
                    {f.label}
                </button>
            ))}
        </div>
    )
}));

// Mock useKeyboardShortcuts to avoid happy-dom target.closest issues
vi.mock('../hooks/useKeyboardShortcuts', () => ({
    // Mock useKeyboardShortcuts to avoid happy-dom target.closest issues
    useKeyboardShortcuts: (shortcuts: any) => {
        // Simplified mock implementation that just binds to window without checks
        React.useEffect(() => {
            const handler = (e: KeyboardEvent) => {
                const key = e.key.toLowerCase();
                if (shortcuts[key]) {
                    shortcuts[key](e);
                }
            };
            window.addEventListener('keydown', handler);
            return () => window.removeEventListener('keydown', handler);
        }, [shortcuts]);
    }
}));

// Mock Feature for Extrude
const mockExtrudeFeature = {
    id: 'extrude',
    label: 'Extrude',
    icon: Box,
    execute: (context: any, params?: any) => {
        if (params) {
            // Dialog submission
            context.insertCode(`sketch1.extrude(${params.distance})`);
            context.closePanel('extrude'); // Close dialog
        } else {
            // Initial click
            context.openPanel('extrude');
        }
    },
};

describe.skip('GUI Workflow Integration', () => {
    vi.setConfig({ testTimeout: 20000 }); // Increase timeout for CI/slow environments

    // We need to capture the 'insertCode' call to verify the result
    const insertCodeMock = vi.fn();

    // We implement a "Fake" Workbench Hook to allow state transitions
    const useFakeWorkbench = () => {
        const initialState = (window as any).mockWorkbenchState;

        // Use global state if possible, but for integration tests we need local re-renders
        const [, setUpdate] = useState(0);
        const forceUpdate = useCallback(() => setUpdate(n => n + 1), []);

        useEffect(() => {
            triggerUpdate = forceUpdate;
        }, [forceUpdate]);

        useEffect(() => {
            if (initialState) {
                if (initialState.activePanel) globalState.activePanels = [initialState.activePanel];
                if (initialState.activeDialog) globalState.activeDialog = initialState.activeDialog;
            }
        }, [initialState]);

        // Mock sketch for the sketches list
        const sketches = [
            { id: 's1', name: 'sketch1', plane: 'XY' }
        ];

        return {
            // State that changes
            activeDialog: globalState.activeDialog,
            setActiveDialog: (id: string | null) => {
                globalState.activeDialog = id;
                forceUpdate();
            },
            activePanel: globalState.activePanels[0] || null,
            activePanels: globalState.activePanels,
            openPanel: (id: string) => {
                if (!globalState.activePanels.includes(id)) {
                    globalState.activePanels = [...globalState.activePanels, id];
                }
                globalState.activeDialog = id;
                forceUpdate();
            },
            closePanel: (id: string) => {
                globalState.activePanels = globalState.activePanels.filter(p => p !== id);
                if (globalState.activeDialog === id) globalState.activeDialog = null;
                forceUpdate();
            },
            code: '',
            setCode: vi.fn(),
            insertCode: mockInsertCode,

            // Fixed/Mocked state for this test
            viewMode: 'code',
            viewMode3D: 'shadedWithEdges',
            isReady: true,
            error: null,
            editorInstance: null,
            sketchMode: { active: false },
            setPreviewCode: vi.fn(), // Added mock
            sketches,
            setEditorInstance: vi.fn(),
            setSketchMode: vi.fn(),
            addSketch: vi.fn(),
            addPlane: vi.fn(),
            planes: [],
            togglePlaneVisibility: vi.fn(),
            setSelectedFace: vi.fn(),
            isFaceSelecting: false, // Could be state controlled if needed
            startFaceSelection: vi.fn(),
            cancelFaceSelection: vi.fn(),
            toggleSketchVisibility: vi.fn(),
            showSketches: true,
            sketchesGeometries: [],
            commandManager: {},
            setViewMode: vi.fn(),
            setViewMode3D: vi.fn(),
            // Mock geometry for face selection
            geometries: [
                {
                    faces: [
                        { faceId: 12, plane: { origin: [0, 0, 0], normal: [0, 0, 1] } }
                    ]
                }
            ],
            selectedFace: { shapeIndex: 0, faceId: 12 }, // Simulate selected face state
            selectedFacePlane: { origin: [0, 0, 0], normal: [0, 0, 1] },
            codeContext: {
                code: 'return [];',
                declaredVariables: new Set<string>(),
                returnedVariables: ['shape0'],
                generateUniqueName: (base: string) => base,
                getVariableAtIndex: (_i: number) => 'shape0',
            },
            // Sketching Context Mocks
            entities: new Map(),
            constraints: [],
            selectedEntityIds: [],
            addEntity: vi.fn(),
            updateEntity: vi.fn(),
            addConstraint: vi.fn(),
            selectEntity: vi.fn(),
            clearSelection: vi.fn(),
            solve: vi.fn(),
        } as any;
    };

    beforeEach(() => {
        // Clear mocks
        mockUseWorkbench.mockReset();
        mockInsertCode.mockClear();

        // Reset global state
        globalState.activePanels = [];
        globalState.activeDialog = null;

        // Setup implementation
        mockUseWorkbench.mockImplementation(useFakeWorkbench);

        // Register feature
        featureRegistry.register(mockExtrudeFeature);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        insertCodeMock.mockClear();
        featureRegistry.clear();
    });

    it('should complete the Extrude workflow via GUI', async () => {
        // 1. Render the Layout
        render(<WorkbenchLayout />);

        // 2. Click Extrude in Toolbar
        // Use findBy to wait for render (though render is sync, effects might not be?)
        const extrudeBtn = await screen.findByTitle('Extrude');
        fireEvent.click(extrudeBtn);

        // 3. Verify Dialog Opens
        // Wait for dialog to appear. ExtrudeDialog has "Extrude Parameters" text?
        expect(await screen.findByText('sketch1 (XY Plane)')).toBeDefined();

        // 4. Interaction: Select Sketch explicitly (auto-select was removed)
        const sketchSelect = screen.getByRole('combobox');
        fireEvent.change(sketchSelect, { target: { value: 'sketch1' } });

        const distanceInput = screen.getByLabelText(/Distance/i);
        fireEvent.change(distanceInput, { target: { value: '50' } });

        // 5. Submit
        const submitBtn = screen.getAllByRole('button', { name: 'Extrude' })
            .find(btn => !btn.closest('[data-testid="mock-toolbar"]'));

        if (!submitBtn) throw new Error('Extrude Submit button not found');
        fireEvent.click(submitBtn);

        // 6. Verify Code Insertion
        const expectedCodeSnippet = '.extrude(50)';
        expect(mockInsertCode).toHaveBeenCalled();
        const calledCode = mockInsertCode.mock.calls[0][0];
        expect(calledCode).toContain(expectedCodeSnippet);
        expect(calledCode).toContain('sketch1');

        // 7. Verify Dialog Closes
        await waitFor(() => {
            expect(screen.queryByLabelText(/Distance/i)).toBeNull();
        });
    });

    it.skip('should open and close the Plane Selector', async () => {
        render(<WorkbenchLayout />);

        // Let's try triggering via 's' key shortcut
        fireEvent.keyDown(window, { key: 's' });

        // Should open Plane Selector
        const title = await screen.findByText('Select Sketch Plane');
        expect(title).toBeDefined();

        // Close it
        const closeBtn = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(closeBtn);

        await waitForElementToBeRemoved(() => screen.queryByText('Select Sketch Plane'), { timeout: 5000 });
    });
    it('should complete the Sketch On Face workflow', async () => {
        // 1. Setup State: Dialog open, Face selected
        (window as any).mockWorkbenchState = {
            activePanel: 'sketchOnFace',
            selectedFace: { shapeIndex: 0, faceId: 12 }
        };

        const setSketchModeSpy = vi.fn();
        const addSketchSpy = vi.fn();

        // Override for this specific test
        mockUseWorkbench.mockImplementation(() => {
            const base = useFakeWorkbench();
            return {
                ...base,
                setSketchMode: setSketchModeSpy,
                addSketch: addSketchSpy
            };
        });

        render(<WorkbenchLayout />);

        // 2. Verify Dialog is Open
        expect(await screen.findByText('New Sketch')).toBeDefined();

        // 3. Confirm Dialog
        const confirmBtn = screen.getByText('Create Sketch');
        fireEvent.click(confirmBtn);

        // 4. Verification
        expect(mockInsertCode).toHaveBeenCalled();

        expect(addSketchSpy).toHaveBeenCalledWith(expect.objectContaining({
            name: expect.stringContaining('sketch'),
            plane: 'face'
        }));

        expect(setSketchModeSpy).toHaveBeenCalledWith(expect.objectContaining({
            active: true,
            // currentSketch is the object
        }));
    });
});

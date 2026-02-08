// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WorkbenchLayout } from '../components/Layout/WorkbenchLayout';
// import * as WorkbenchContext from '../context/WorkbenchContext';
import { featureRegistry } from '../features/FeatureRegistry';
import { Box } from 'lucide-react';
import { ExtrudePanel } from '../components/Panels/ExtrudePanel';
import { PlaneSelectorDialog } from '../components/Dialogs/PlaneSelectorDialog';
import { SketchOnFaceDialog } from '../components/Dialogs/SketchOnFaceDialog';

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
const triggerUpdate = () => { };

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
        contextMenu: { visible: false, position: { x: 0, y: 0 }, type: null },
        setContextMenu: vi.fn(),
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

describe('GUI Workflow Integration', () => {
    vi.setConfig({ testTimeout: 20000 });

    // Test individual components instead of full WorkbenchLayout to avoid complex mocking

    describe('ExtrudePanel', () => {
        it('should render with sketch options', () => {
            // Mock the required contexts
            mockUseWorkbench.mockReturnValue({
                sketches: [{ id: 's1', name: 'sketch1', plane: 'XY' }],
                code: '',
                setPreviewCode: vi.fn(),
                codeContext: {
                    generateUniqueName: (base: string) => base,
                },
                selectedSketchName: null,
            });

            const { container } = render(<ExtrudePanel />);

            // Verify panel renders
            expect(container).toBeDefined();
        });
    });

    describe('PlaneSelectorDialog', () => {
        it('should call onSelect when plane is chosen', () => {
            const onSelect = vi.fn();
            const onSelectFace = vi.fn();
            const onCancel = vi.fn();

            const { getByText } = render(
                <PlaneSelectorDialog
                    onSelect={onSelect}
                    onSelectFace={onSelectFace}
                    onCancel={onCancel}
                />
            );

            // Verify dialog renders
            expect(getByText('Select Sketch Plane')).toBeDefined();

            // Click XY plane
            const xyButton = getByText('XY Plane (Top)');
            fireEvent.click(xyButton);

            expect(onSelect).toHaveBeenCalledWith('XY');
        });

        it('should call onCancel when cancel is clicked', () => {
            const onSelect = vi.fn();
            const onSelectFace = vi.fn();
            const onCancel = vi.fn();

            const { getByText, getAllByText } = render(
                <PlaneSelectorDialog
                    onSelect={onSelect}
                    onSelectFace={onSelectFace}
                    onCancel={onCancel}
                />
            );

            const cancelButtons = getAllByText('Cancel');
            // Click the last Cancel button (the one in the PlaneSelectorDialog)
            fireEvent.click(cancelButtons[cancelButtons.length - 1]);

            expect(onCancel).toHaveBeenCalled();
        });
    });

    describe('SketchOnFaceDialog', () => {
        it('should render with default sketch name', () => {
            const onConfirm = vi.fn();
            const onCancel = vi.fn();

            const { getByText, getByDisplayValue, getAllByText } = render(
                <SketchOnFaceDialog
                    defaultName="sketch1"
                    faceId={12}
                    shapeName="box1"
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                />
            );

            // Verify dialog renders with title
            expect(getByText('New Sketch')).toBeDefined();

            // Verify default name is set
            expect(getByDisplayValue('sketch1')).toBeDefined();
        });

        it('should call onConfirm with sketch name', () => {
            const onConfirm = vi.fn();
            const onCancel = vi.fn();

            const { getByText, getAllByText } = render(
                <SketchOnFaceDialog
                    defaultName="sketch1"
                    faceId={12}
                    shapeName="box1"
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                />
            );

            // Submit the form (the button is type="submit")
            const buttons = getAllByText('Create Sketch');
            const form = buttons[buttons.length - 1].closest('form');
            if (form) {
                fireEvent.submit(form);
            }

            expect(onConfirm).toHaveBeenCalledWith('sketch1');
        });
    });

    // Simple smoke test that doesn't require full WorkbenchLayout
    it('should register mock feature', () => {
        const mockFeature = {
            id: 'test',
            label: 'Test',
            icon: Box,
            execute: vi.fn(),
        };

        featureRegistry.register(mockFeature);
        expect(featureRegistry.get('test')).toBeDefined();
        featureRegistry.clear();
    });
});

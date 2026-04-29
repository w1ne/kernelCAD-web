// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Toolbar from './Toolbar';
import { Box } from 'lucide-react';
import { type Feature } from '../features/types';
import * as WorkbenchContext from '../context/WorkbenchContext';
import { CommandManager } from '../commands/CommandManager';

// Mock useWorkbench
beforeEach(() => {
    vi.spyOn(WorkbenchContext, 'useWorkbench').mockReturnValue({
        viewMode: 'code',
        setViewMode: vi.fn(),
        viewMode3D: 'shadedWithEdges',
        setViewMode3D: vi.fn(),
        code: '',
        setCode: vi.fn(),
        geometries: [],
        error: null,
        isReady: true,
        isComputing: false,
        activeDialog: null,
        setActiveDialog: vi.fn(),
        editorInstance: null,
        setEditorInstance: vi.fn(),
        commandManager: {} as unknown as CommandManager,
        sketchMode: {
            active: false,
            plane: null,
            currentSketch: null,
            tool: 'select',
        },
        setSketchMode: vi.fn(),
        insertCode: vi.fn(),
        sketchesGeometries: [],
        showSketches: true,
        toggleSketchVisibility: vi.fn(),
        planes: [],
        addPlane: vi.fn(),
        addSketch: vi.fn(),
        selectedFace: null,
        setSelectedFace: vi.fn(),
        sidePanelVisible: true,
        toggleSidePanel: vi.fn(),
    } as unknown as WorkbenchContext.WorkbenchContextType);
});

// Manually cleanup after each test
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const mockFeatures: Feature[] = [
    {
        id: 'box',
        label: 'Box',
        icon: Box,
        execute: vi.fn(),
        parameters: [{ name: 'w', label: 'W', type: 'number', defaultValue: 10 }]
    },
    {
        id: 'fillet',
        label: 'Fillet',
        icon: Box, // reuse icon
        execute: vi.fn()
    }
];

describe('Toolbar (v0.1 web demo)', () => {
    it('renders only the Toggle Scene Browser button', () => {
        const onToolClick = vi.fn();
        render(<Toolbar features={mockFeatures} onToolClick={onToolClick} />);

        // Per v0.1 NORTHSTAR spec, Studio UI commands (Box, Cylinder, Sketch,
        // Extrude, Fillet, etc.) are deferred to v0.5. The toolbar in the
        // deployed demo shows only the Toggle Scene Browser button.
        expect(screen.getByRole('button', { name: 'Toggle Scene Browser' })).toBeDefined();
        expect(screen.queryByRole('button', { name: 'Box' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Fillet' })).toBeNull();
        expect(screen.queryByLabelText('Sketch')).toBeNull();
        expect(screen.queryByLabelText('Sketch Visibility')).toBeNull();
    });

    it('toggles the side panel when the Toggle Scene Browser button is clicked', () => {
        const toggleSidePanel = vi.fn();
        vi.spyOn(WorkbenchContext, 'useWorkbench').mockReturnValue({
            sidePanelVisible: true,
            toggleSidePanel,
        } as unknown as WorkbenchContext.WorkbenchContextType);

        render(<Toolbar features={[]} onToolClick={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Toggle Scene Browser' }));
        expect(toggleSidePanel).toHaveBeenCalled();
    });
});

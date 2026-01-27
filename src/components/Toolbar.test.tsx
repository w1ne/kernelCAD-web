// @vitest-environment jsdom
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

describe('Toolbar', () => {
    it('should render feature buttons', () => {
        const onToolClick = vi.fn();
        render(<Toolbar features={mockFeatures} onToolClick={onToolClick} />);

        expect(screen.getByTitle('Box')).toBeDefined();
        expect(screen.getByTitle('Fillet')).toBeDefined();
    });

    it('should call onToolClick with feature object', () => {
        const onToolClick = vi.fn();
        render(<Toolbar features={mockFeatures} onToolClick={onToolClick} />);

        fireEvent.click(screen.getByTitle('Box'));
        expect(onToolClick).toHaveBeenCalledWith(mockFeatures[0]);
    });
});

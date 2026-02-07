// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { WorkbenchProvider } from '../context/WorkbenchContext';
import { useWorkbench } from '../context/WorkbenchContext';
import SceneBrowser from '../components/SceneBrowser';
import { GeometryEngine } from '../lib/geometryEngine';

// Mock GeometryEngine
vi.mock('../lib/geometryEngine', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        GeometryEngine: {
            getInstance: vi.fn().mockReturnValue({
                initialize: vi.fn().mockResolvedValue(undefined),
                executeCode: vi.fn().mockResolvedValue({ geometries: [], sketches: [] }),
                terminate: vi.fn(),
            }),
        },
    };
});

// Mock component that uses the workbench and provides a way to trigger hover
const TestComponent = () => {
    const {
        selectedItemId,
        hoveredItemId,
        hiddenIds,
        setSelectedItemId,
        setHoveredItemId,
        toggleVisibility
    } = useWorkbench();

    const mockItems = [
        { name: 'box1', type: 'Box', line: 1 },
    ];

    return (
        <div>
            <button data-testid="trigger-hover" onClick={() => setHoveredItemId('box1')}>Trigger</button>
            <button data-testid="clear-hover" onClick={() => setHoveredItemId(null)}>Clear</button>
            <SceneBrowser
                items={mockItems}
                planes={[]}
                selectedItemId={selectedItemId}
                hoveredItemId={hoveredItemId}
                hiddenIds={hiddenIds}
                onSelect={(item) => setSelectedItemId(item.name)}
                onHover={setHoveredItemId}
                onToggleVisibility={toggleVisibility}
                onTogglePlane={vi.fn()}
            />
        </div>
    );
};

describe('Hover Synchronization Integration', () => {
    it('should sync hover state from hook to SceneBrowser', () => {
        render(
            <WorkbenchProvider>
                <TestComponent />
            </WorkbenchProvider>
        );

        // Initially no hover highlight
        let item = screen.getByText('box1').closest('div');
        expect(item?.className).not.toContain('bg-[#333]');

        // Trigger hover via button (simulating Viewer hover calling setHoveredItemId)
        fireEvent.click(screen.getByTestId('trigger-hover'));

        // Now it should be highlighted
        item = screen.getByText('box1').closest('div');
        expect(item?.className).toContain('bg-[#333]');

        // Clear hover
        fireEvent.click(screen.getByTestId('clear-hover'));
        item = screen.getByText('box1').closest('div');
        expect(item?.className).not.toContain('bg-[#333]');
    });
});

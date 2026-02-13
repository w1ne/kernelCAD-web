/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidePanel } from './SidePanel';

const mockDeleteHistoryItem = vi.fn();
const mockSetSelectedItemId = vi.fn();
const mockSetHoveredItemId = vi.fn();

vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        code: `
const box = replicad.makeBox(1, 1, 1);
const sketch = new Sketcher('XY').lineTo([1, 1]).done();
`.trim(),
        setViewMode: vi.fn(),
        planes: [],
        togglePlaneVisibility: vi.fn(),
        selectedItemId: 'sketch',
        setSelectedItemId: mockSetSelectedItemId,
        hoveredItemId: 'sketch',
        setHoveredItemId: mockSetHoveredItemId,
        hiddenIds: [],
        toggleVisibility: vi.fn(),
        selectedItemIds: [],
        toggleSelection: vi.fn(),
        renameItem: vi.fn(),
        deleteHistoryItem: mockDeleteHistoryItem
    })
}));

vi.mock('../SceneBrowser', () => ({
    default: ({ items, onDelete }: { items: Array<{ id: string; name: string; type: string; line: number }>; onDelete: (item: { id: string; name: string; type: string; line: number }) => void }) => (
        <button
            data-testid="trigger-delete"
            onClick={() => onDelete(items.find((i) => i.name === 'sketch') ?? items[0])}
        >
            Delete
        </button>
    )
}));

vi.mock('../../features/ai/AIAssistant', () => ({
    AIAssistant: () => null
}));

describe('SidePanel', () => {
    it('deletes the selected history item and does not clear legacy name-based selection state', () => {
        const { getByTestId } = render(<SidePanel onJumpToLine={vi.fn()} />);
        getByTestId('trigger-delete').click();

        expect(mockDeleteHistoryItem).toHaveBeenCalledTimes(1);
        expect(mockSetSelectedItemId).not.toHaveBeenCalled();
        expect(mockSetHoveredItemId).not.toHaveBeenCalled();
    });
});

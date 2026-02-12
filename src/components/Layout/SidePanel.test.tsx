/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidePanel } from './SidePanel';

const mockDeleteHistoryItem = vi.fn();
const mockSetSelectedItemId = vi.fn();
const mockSetHoveredItemId = vi.fn();

vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        code: 'const box = replicad.makeBox(1, 1, 1);',
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
    default: ({ onDelete }: { onDelete: (item: { id: string; name: string; type: string; line: number }) => void }) => (
        <button
            data-testid="trigger-delete"
            onClick={() => onDelete({ id: 'sketch:1:1:1', name: 'sketch', type: 'Sketch', line: 1 })}
        >
            Delete
        </button>
    )
}));

vi.mock('../../features/ai/AIAssistant', () => ({
    AIAssistant: () => null
}));

describe('SidePanel', () => {
    it('clears selected and hovered item when deleting currently selected history item', () => {
        const { getByTestId } = render(<SidePanel onJumpToLine={vi.fn()} />);
        getByTestId('trigger-delete').click();

        expect(mockDeleteHistoryItem).toHaveBeenCalledTimes(1);
        expect(mockSetSelectedItemId).toHaveBeenCalledWith(null);
        expect(mockSetHoveredItemId).toHaveBeenCalledWith(null);
    });
});

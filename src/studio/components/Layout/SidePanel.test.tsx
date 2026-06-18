// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
        deleteHistoryItem: mockDeleteHistoryItem,
        scriptParams: [
            {
                name: 'shoulderDeg',
                type: 'number',
                value: 24,
                defaultValue: 24,
                meta: { min: -20, max: 50, description: 'Shoulder pose' },
            },
        ],
        scriptReview: {
            ok: false,
            diagnostics: [
                {
                    code: 'assembly.mechanical.revolute-contact-missing',
                    severity: 'error',
                    message: 'elbow has no bearing contact',
                },
                {
                    code: 'assembly.mechanical.part-disconnected',
                    severity: 'warning',
                    message: 'Part base contains 2 disconnected solids',
                },
            ],
            fitness: {
                functional: false,
                repairMode: 'topology-redesign',
                blockingReasons: [
                    {
                        code: 'assembly.mechanical.revolute-contact-missing',
                        message: 'elbow has no bearing contact',
                    },
                ],
            },
            suggestedRepairPrompt: 'Redesign the elbow as a supported clevis joint.',
        },
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

vi.mock('../../features-ui/ai/AIAssistant', () => ({
    AIAssistant: () => null
}));

describe('SidePanel', () => {
    afterEach(() => {
        cleanup();
    });

    it('deletes the selected history item and does not clear legacy name-based selection state', () => {
        const { getByTestId } = render(<SidePanel onJumpToLine={vi.fn()} />);
        getByTestId('trigger-delete').click();

        expect(mockDeleteHistoryItem).toHaveBeenCalledTimes(1);
        expect(mockSetSelectedItemId).not.toHaveBeenCalled();
        expect(mockSetHoveredItemId).not.toHaveBeenCalled();
    });

    it('shows runtime params and keeps non-blocking review facts collapsed by default', () => {
        render(<SidePanel onJumpToLine={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: /build loop/i }));

        expect(screen.getByText('Needs Repair')).toBeDefined();
        expect(screen.getByText('shoulderDeg')).toBeDefined();
        expect(screen.getByText('24')).toBeDefined();
        expect(screen.getByText('topology-redesign')).toBeDefined();
        expect(screen.queryByText('assembly.mechanical.part-disconnected')).toBeNull();
        expect(screen.getByRole('button', { name: /show 1 review detail/i })).toBeDefined();
        expect(screen.getByText(/Redesign the elbow as a supported clevis joint/)).toBeDefined();
    });

    it('reveals collapsed non-blocking review facts on request', () => {
        render(<SidePanel onJumpToLine={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: /build loop/i }));
        fireEvent.click(screen.getByRole('button', { name: /show 1 review detail/i }));

        expect(screen.getByText('assembly.mechanical.part-disconnected')).toBeDefined();
        expect(screen.getByText(/Part base contains 2 disconnected solids/)).toBeDefined();
    });
});

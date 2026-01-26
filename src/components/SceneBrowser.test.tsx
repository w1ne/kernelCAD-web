// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SceneBrowser from './SceneBrowser';
import type { VariableDefinition } from '../lib/codeAnalysis';
// React unused

afterEach(() => {
    cleanup();
});

const mockItems: VariableDefinition[] = [
    { name: 'box1', type: 'Box', line: 1 },
    { name: 'cyl1', type: 'Cylinder', line: 5 },
];

describe('SceneBrowser', () => {
    it('should render items', () => {
        render(<SceneBrowser items={mockItems} planes={[]} onSelect={vi.fn()} onTogglePlane={vi.fn()} />);
        expect(screen.getByText('box1')).toBeDefined();
        expect(screen.getByText('cyl1')).toBeDefined();
    });

    it('should display empty state', () => {
        render(<SceneBrowser items={[]} planes={[]} onSelect={vi.fn()} onTogglePlane={vi.fn()} />);
        expect(screen.getByText('No operations yet.')).toBeDefined();
    });

    it('should call onSelect when item clicked', () => {
        const onSelect = vi.fn();
        render(<SceneBrowser items={mockItems} planes={[]} onSelect={onSelect} onTogglePlane={vi.fn()} />);

        fireEvent.click(screen.getByText('box1'));
        expect(onSelect).toHaveBeenCalledWith(mockItems[0]);
    });

    it('should render planes', () => {
        const mockPlanes: any[] = [{ id: 'plane1', name: 'Plane 1', type: 'base', visible: true }];
        render(<SceneBrowser items={[]} planes={mockPlanes} onSelect={vi.fn()} onTogglePlane={vi.fn()} />);
        expect(screen.getByText('Plane 1')).toBeDefined();
    });
});

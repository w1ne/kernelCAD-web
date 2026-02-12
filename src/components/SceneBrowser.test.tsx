// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SceneBrowser from './SceneBrowser';
import type { HistoryItem } from '../lib/codeAnalysis';
// React unused

afterEach(() => {
    cleanup();
});

const mockItems: HistoryItem[] = [
    { id: 'box1:1:1:10', name: 'box1', type: 'Box', line: 1 },
    { id: 'cyl1:5:11:20', name: 'cyl1', type: 'Cylinder', line: 5 },
];

describe('SceneBrowser', () => {
    it('should render items', () => {
        render(<SceneBrowser items={mockItems} planes={[]} selectedItemId={null} hoveredItemId={null} hiddenIds={[]} onSelect={vi.fn()} onHover={vi.fn()} onToggleVisibility={vi.fn()} onTogglePlane={vi.fn()} />);
        expect(screen.getByText('box1')).toBeDefined();
        expect(screen.getByText('cyl1')).toBeDefined();
    });

    it('should display empty state', () => {
        render(<SceneBrowser items={[]} planes={[]} selectedItemId={null} hoveredItemId={null} hiddenIds={[]} onSelect={vi.fn()} onHover={vi.fn()} onToggleVisibility={vi.fn()} onTogglePlane={vi.fn()} />);
        expect(screen.getByText('No operations yet.')).toBeDefined();
    });

    it('should call onSelect when item clicked', () => {
        const onSelect = vi.fn();
        render(<SceneBrowser items={mockItems} planes={[]} selectedItemId={null} hoveredItemId={null} hiddenIds={[]} onSelect={onSelect} onHover={vi.fn()} onToggleVisibility={vi.fn()} onTogglePlane={vi.fn()} />);

        fireEvent.click(screen.getByText('box1'));
        expect(onSelect).toHaveBeenCalledWith(mockItems[0]);
    });

    it('should render planes', () => {
        const mockPlanes: any[] = [{ id: 'plane1', name: 'Plane 1', type: 'base', visible: true }];
        render(<SceneBrowser items={[]} planes={mockPlanes} selectedItemId={null} hoveredItemId={null} hiddenIds={[]} onSelect={vi.fn()} onHover={vi.fn()} onToggleVisibility={vi.fn()} onTogglePlane={vi.fn()} />);
        expect(screen.getByText('Plane 1')).toBeDefined();
    });

    it('should call onToggleVisibility when Eye icon clicked', () => {
        const onToggleVisibility = vi.fn();
        render(<SceneBrowser items={mockItems} planes={[]} selectedItemId={null} hoveredItemId={null} hiddenIds={[]} onSelect={vi.fn()} onHover={vi.fn()} onToggleVisibility={onToggleVisibility} onTogglePlane={vi.fn()} />);

        const toggleButtons = screen.getAllByTitle('Hide Operation');
        fireEvent.click(toggleButtons[0]);
        expect(onToggleVisibility).toHaveBeenCalledWith('box1');
    });

    it('should call onHover when mouse enters/leaves item', () => {
        const onHover = vi.fn();
        render(<SceneBrowser items={mockItems} planes={[]} selectedItemId={null} hoveredItemId={null} hiddenIds={[]} onSelect={vi.fn()} onHover={onHover} onToggleVisibility={vi.fn()} onTogglePlane={vi.fn()} />);

        const item = screen.getByText('box1');
        fireEvent.mouseEnter(item);
        expect(onHover).toHaveBeenCalledWith('box1');

        fireEvent.mouseLeave(item);
        expect(onHover).toHaveBeenCalledWith(null);
    });

    it('should show context menu on right click', () => {
        render(<SceneBrowser items={mockItems} planes={[]} selectedItemId={null} hoveredItemId={null} hiddenIds={[]} onSelect={vi.fn()} onHover={vi.fn()} onToggleVisibility={vi.fn()} onTogglePlane={vi.fn()} />);

        const item = screen.getByText('box1');
        fireEvent.contextMenu(item);

        expect(screen.getByText('Delete')).toBeDefined();
        expect(screen.getByText('Isolate')).toBeDefined();
    });

    it('should call onDelete from context menu', () => {
        const onDelete = vi.fn();
        render(<SceneBrowser items={mockItems} planes={[]} selectedItemId={null} hoveredItemId={null} hiddenIds={[]} onSelect={vi.fn()} onHover={vi.fn()} onToggleVisibility={vi.fn()} onTogglePlane={vi.fn()} onDelete={onDelete} />);

        fireEvent.contextMenu(screen.getByText('box1'));
        fireEvent.click(screen.getByText('Delete'));
        expect(onDelete).toHaveBeenCalledWith(mockItems[0]);
    });
});

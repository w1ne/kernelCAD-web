// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SceneBrowser from './SceneBrowser';
import type { VariableDefinition } from '../lib/codeAnalysis';
import React from 'react';

afterEach(() => {
    cleanup();
});

const mockItems: VariableDefinition[] = [
    { name: 'box1', type: 'Box', line: 1 },
    { name: 'cyl1', type: 'Cylinder', line: 5 },
];

describe('SceneBrowser', () => {
    it('should render items', () => {
        render(<SceneBrowser items={mockItems} onSelect={vi.fn()} />);
        expect(screen.getByText('box1')).toBeDefined();
        expect(screen.getByText('cyl1')).toBeDefined();
    });

    it('should display empty state', () => {
        render(<SceneBrowser items={[]} onSelect={vi.fn()} />);
        expect(screen.getByText('No objects found.')).toBeDefined();
    });

    it('should call onSelect when item clicked', () => {
        const onSelect = vi.fn();
        render(<SceneBrowser items={mockItems} onSelect={onSelect} />);

        fireEvent.click(screen.getByText('box1'));
        expect(onSelect).toHaveBeenCalledWith(mockItems[0]);
    });
});

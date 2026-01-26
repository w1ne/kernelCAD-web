// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Toolbar from './Toolbar';
import { Box } from 'lucide-react';
import { type Feature } from '../features/types';
// React unused

// Manually cleanup after each test
afterEach(() => {
    cleanup();
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

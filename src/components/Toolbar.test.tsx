// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Toolbar from './Toolbar';
import React from 'react';

// Manually cleanup after each test
afterEach(() => {
    cleanup();
});

describe('Toolbar', () => {
    it('should call onToolClick with BOX type for box button', () => {
        const onToolClick = vi.fn();
        render(<Toolbar onToolClick={onToolClick} />);

        fireEvent.click(screen.getByTitle('Add Box'));
        expect(onToolClick).toHaveBeenCalledWith('BOX', true);
    });

    it('should call onToolClick with CYLINDER type for cylinder button', () => {
        const onToolClick = vi.fn();
        render(<Toolbar onToolClick={onToolClick} />);

        fireEvent.click(screen.getByTitle('Add Cylinder'));
        expect(onToolClick).toHaveBeenCalledWith('CYLINDER', true);
    });

    it('should call onToolClick with snippet for fillet button', () => {
        const onToolClick = vi.fn();
        render(<Toolbar onToolClick={onToolClick} />);

        fireEvent.click(screen.getByTitle('Fillet'));
        expect(onToolClick).toHaveBeenCalledWith('.fillet(1)', false);
    });
});

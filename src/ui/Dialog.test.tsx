// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Dialog } from './Dialog';

afterEach(cleanup);

describe('Dialog', () => {
    it('is a labelled modal that focuses a data-autofocus field', () => {
        render(
            <Dialog open onClose={() => {}} title="Rename project" description="Pick a name.">
                <input aria-label="Name" data-autofocus />
            </Dialog>,
        );
        const dialog = screen.getByRole('dialog', { name: 'Rename project' });
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
        expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Name' }));
    });

    it('closes on Escape, the close button and the scrim', () => {
        const onClose = vi.fn();
        render(<Dialog open onClose={onClose} title="T" />);
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        fireEvent.click(screen.getByTestId('dialog-scrim'));
        expect(onClose).toHaveBeenCalledTimes(3);
    });

    it('renders nothing when closed and takes the theme it is given', () => {
        const { rerender } = render(<Dialog open={false} onClose={() => {}} title="T" />);
        expect(screen.queryByRole('dialog')).toBeNull();
        rerender(<Dialog open onClose={() => {}} title="T" theme="dark" />);
        expect(screen.getByRole('dialog').closest('[data-theme]')?.getAttribute('data-theme')).toBe('dark');
    });
});

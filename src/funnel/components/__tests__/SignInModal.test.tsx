// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { SignInModal } from '../SignInModal';

afterEach(() => cleanup());

describe('SignInModal dismissable', () => {
  it('non-dismissable: no close button, Esc and backdrop do not close', () => {
    const onClose = vi.fn();
    render(<SignInModal open onClose={onClose} dismissable={false} />);
    expect(screen.queryByLabelText('Close')).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('dismissable (default): close button present and Esc closes', () => {
    const onClose = vi.fn();
    render(<SignInModal open onClose={onClose} />);
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

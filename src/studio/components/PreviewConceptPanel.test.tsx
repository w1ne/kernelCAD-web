// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PreviewConceptPanel } from './PreviewConceptPanel';
import * as hook from '../../funnel/hooks/useTextTo3dPreview';

beforeEach(() => vi.restoreAllMocks());
afterEach(() => cleanup());

describe('PreviewConceptPanel', () => {
  it('renders the model-viewer with the glb url when done', () => {
    vi.spyOn(hook, 'useTextTo3dPreview').mockReturnValue({
      phase: { state: 'done', glbUrl: 'https://t/out.glb', costUsd: 0.2 },
      submit: vi.fn(),
    });
    const { container } = render(<PreviewConceptPanel />);
    const mv = container.querySelector('model-viewer');
    expect(mv).not.toBeNull();
    expect(mv?.getAttribute('src')).toBe('https://t/out.glb');
    // The parametric-rebuild seam is present but stubbed.
    expect(screen.getByRole('button', { name: /rebuild as parametric cad/i })).toBeDisabled();
  });

  it('shows the upgrade CTA for a free user (upgrade state)', () => {
    vi.spyOn(hook, 'useTextTo3dPreview').mockReturnValue({ phase: { state: 'upgrade' }, submit: vi.fn() });
    render(<PreviewConceptPanel />);
    expect(screen.getByText(/upgrade/i)).toBeInTheDocument();
  });

  it('shows a quiet "not available" state on unavailable, with no prompt input', () => {
    vi.spyOn(hook, 'useTextTo3dPreview').mockReturnValue({ phase: { state: 'unavailable' }, submit: vi.fn() });
    render(<PreviewConceptPanel />);
    expect(screen.getByText(/not available yet/i)).toBeInTheDocument();
    // The input is hidden so the user can't retry into a wall.
    expect(screen.queryByPlaceholderText(/describe/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /generate concept/i })).toBeNull();
  });

  it('calls submit with the typed prompt', () => {
    const submit = vi.fn();
    vi.spyOn(hook, 'useTextTo3dPreview').mockReturnValue({ phase: { state: 'idle' }, submit });
    render(<PreviewConceptPanel />);
    fireEvent.change(screen.getByPlaceholderText(/describe/i), { target: { value: 'a small enclosure' } });
    fireEvent.click(screen.getByRole('button', { name: /generate concept/i }));
    expect(submit).toHaveBeenCalledWith('a small enclosure');
  });
});

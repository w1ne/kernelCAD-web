// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ConceptResult } from './ConceptResult';

beforeEach(() => vi.restoreAllMocks());
afterEach(() => cleanup());

describe('ConceptResult', () => {
  it('renders nothing on idle', () => {
    const { container } = render(
      <ConceptResult phase={{ state: 'idle' }} onBuildAsCad={vi.fn()} buildDisabled={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the model-viewer and an ENABLED Build-as-CAD button when done', () => {
    const onBuildAsCad = vi.fn();
    const { container } = render(
      <ConceptResult
        phase={{ state: 'done', glbUrl: 'https://t/out.glb', costUsd: 0.2 }}
        onBuildAsCad={onBuildAsCad}
        buildDisabled={false}
      />,
    );
    const mv = container.querySelector('model-viewer');
    expect(mv).not.toBeNull();
    expect(mv?.getAttribute('src')).toBe('https://t/out.glb');
    const btn = screen.getByRole('button', { name: /build as parametric cad/i });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(onBuildAsCad).toHaveBeenCalledTimes(1);
  });

  it('disables Build-as-CAD while another operation runs', () => {
    render(
      <ConceptResult
        phase={{ state: 'done', glbUrl: 'https://t/out.glb', costUsd: null }}
        onBuildAsCad={vi.fn()}
        buildDisabled
      />,
    );
    expect(screen.getByRole('button', { name: /build as parametric cad/i })).toBeDisabled();
  });

  it('shows the upgrade CTA for a free user', () => {
    render(<ConceptResult phase={{ state: 'upgrade' }} onBuildAsCad={vi.fn()} buildDisabled={false} />);
    expect(screen.getByText(/upgrade/i)).toBeInTheDocument();
  });

  it('shows a quiet note on unavailable', () => {
    render(<ConceptResult phase={{ state: 'unavailable' }} onBuildAsCad={vi.fn()} buildDisabled={false} />);
    expect(screen.getByText(/not available yet/i)).toBeInTheDocument();
  });

  it('shows the error message on error', () => {
    render(
      <ConceptResult
        phase={{ state: 'error', code: 'x', message: 'boom' }}
        onBuildAsCad={vi.fn()}
        buildDisabled={false}
      />,
    );
    expect(screen.getByText(/boom/i)).toBeInTheDocument();
  });
});

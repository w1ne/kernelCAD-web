// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { PreviewPhase } from '../funnel/hooks/useTextTo3dPreview';

// The localhost guard would blank the whole component in happy-dom.
vi.mock('./agentAvailability', () => ({ inAppAgentEnabled: () => true }));
// Monaco is heavy and irrelevant here.
vi.mock('@monaco-editor/react', () => ({ DiffEditor: () => null }));

const generationSubmit = vi.fn();
vi.mock('../funnel/hooks/useGeneration', () => ({
  useGeneration: () => ({ phase: { state: 'idle' }, events: [], submit: generationSubmit }),
}));

const previewSubmit = vi.fn();
let previewPhase: PreviewPhase = { state: 'idle' };
vi.mock('../funnel/hooks/useTextTo3dPreview', () => ({
  useTextTo3dPreview: () => ({ phase: previewPhase, submit: previewSubmit }),
}));

let mockCode = '';
vi.mock('./context/CodeContext', () => ({ useCode: () => ({ code: mockCode, setCode: vi.fn() }) }));
vi.mock('./context/GeometryContext', () => ({ useGeometry: () => ({ executeGeometry: vi.fn() }) }));
vi.mock('../funnel/hooks/useModelViewer', () => ({ useModelViewer: () => {} }));

import { StudioGenerate } from './StudioGenerate';

beforeEach(() => {
  vi.clearAllMocks();
  previewPhase = { state: 'idle' };
  mockCode = '';
});
afterEach(() => cleanup());

describe('StudioGenerate — unified prompt', () => {
  it('renders exactly ONE prompt textarea driving both actions', () => {
    render(<StudioGenerate />);
    expect(document.querySelectorAll('textarea')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /3d concept/i })).toBeInTheDocument();
  });

  it('sends the shared prompt to the concept preview', () => {
    render(<StudioGenerate />);
    fireEvent.change(screen.getByLabelText('Generate prompt'), { target: { value: 'a hex planter' } });
    fireEvent.click(screen.getByRole('button', { name: /3d concept/i }));
    expect(previewSubmit).toHaveBeenCalledWith('a hex planter');
  });

  it('hides the concept button when the feature is unavailable', () => {
    previewPhase = { state: 'unavailable' };
    render(<StudioGenerate />);
    expect(screen.queryByRole('button', { name: /3d concept/i })).toBeNull();
  });

  it('shows progress on the concept button while running and disables the prompt', () => {
    previewPhase = { state: 'running', progress: 42 };
    render(<StudioGenerate />);
    expect(screen.getByRole('button', { name: /concept… 42%/i })).toBeDisabled();
    expect(screen.getByLabelText('Generate prompt')).toBeDisabled();
  });

  it('Build-as-CAD feeds the concept prompt into the agent submit', () => {
    const { rerender } = render(<StudioGenerate />);
    fireEvent.change(screen.getByLabelText('Generate prompt'), { target: { value: 'a hex planter' } });
    fireEvent.click(screen.getByRole('button', { name: /3d concept/i }));
    previewPhase = { state: 'done', glbUrl: 'https://t/x.glb', costUsd: null, renderImageUrl: null, proportions: null };
    rerender(<StudioGenerate />);
    fireEvent.click(screen.getByRole('button', { name: /build as parametric cad/i }));
    expect(generationSubmit).toHaveBeenCalledWith('a hex planter', undefined, { renderImageUrl: null, proportions: null });
  });

  it('Build-as-CAD is a FRESH generation even when the editor holds code (not an edit of it)', () => {
    mockCode = 'const base = box(60, 40, 5); return base;';
    const { rerender } = render(<StudioGenerate />);
    fireEvent.change(screen.getByLabelText('Generate prompt'), { target: { value: 'a hex planter' } });
    fireEvent.click(screen.getByRole('button', { name: /3d concept/i }));
    previewPhase = { state: 'done', glbUrl: 'https://t/x.glb', costUsd: null, renderImageUrl: null, proportions: null };
    rerender(<StudioGenerate />);
    fireEvent.click(screen.getByRole('button', { name: /build as parametric cad/i }));
    expect(generationSubmit).toHaveBeenCalledWith('a hex planter', undefined, { renderImageUrl: null, proportions: null });
  });

  it('Build-as-CAD passes the concept mesh context into the agent submit', () => {
    const { rerender } = render(<StudioGenerate />);
    fireEvent.change(screen.getByLabelText('Generate prompt'), { target: { value: 'a bracket' } });
    fireEvent.click(screen.getByRole('button', { name: /3d concept/i }));
    previewPhase = { state: 'done', glbUrl: 'https://t/x.glb', costUsd: null, renderImageUrl: 'https://t/r.png', proportions: [1, 0.7, 0.6] };
    rerender(<StudioGenerate />);
    fireEvent.click(screen.getByRole('button', { name: /build as parametric cad/i }));
    expect(generationSubmit).toHaveBeenCalledWith('a bracket', undefined, { renderImageUrl: 'https://t/r.png', proportions: [1, 0.7, 0.6] });
  });
});

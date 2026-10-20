// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { PreviewPhase } from '../funnel/hooks/useTextTo3dPreview';
import { DEFAULT_MARKUP_CAMERA, markupStore } from './markup/markupStore';
import { parseMarkupSnapshot } from './markup/markupSnapshot';

// The localhost guard would blank the whole component in happy-dom.
vi.mock('./agentAvailability', () => ({ inAppAgentEnabled: () => true }));
// Monaco is heavy and irrelevant here.
vi.mock('@monaco-editor/react', () => ({ DiffEditor: () => null }));

const generationSubmit = vi.fn();
vi.mock('../funnel/hooks/useGeneration', () => ({
  useGeneration: () => ({ phase: { state: 'idle' }, events: [], submit: generationSubmit, cancel: vi.fn() }),
}));
vi.mock('./hooks/useStagedEditActions', () => ({
  useStagedEditActions: () => ({ stagedEdit: null, handleApprove: vi.fn() }),
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
  markupStore.clear();
  markupStore.setCamera(DEFAULT_MARKUP_CAMERA);
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

  it('Build-as-CAD keeps nonempty markup attached to the concept prompt', () => {
    const { rerender } = render(<StudioGenerate />);
    fireEvent.change(screen.getByLabelText('Generate prompt'), { target: { value: 'a bracket' } });
    fireEvent.click(screen.getByRole('button', { name: /3d concept/i }));
    previewPhase = { state: 'done', glbUrl: 'https://t/x.glb', costUsd: null, renderImageUrl: null, proportions: null };
    markupStore.addNote({ id: 'concept-note', text: 'Keep this face flat', anchor: [1, 2, 3], refs: [] });
    rerender(<StudioGenerate />);
    fireEvent.click(screen.getByRole('button', { name: /build as parametric cad/i }));

    const prompt = generationSubmit.mock.calls[0]![0] as string;
    expect(expectPromptHasMarkup(prompt).notes).toEqual([expect.objectContaining({ text: 'Keep this face flat' })]);
  });

  it('sends the current markup snapshot alongside the agent prompt', () => {
    markupStore.addNote({
      id: 'test-note',
      text: 'Keep this face flat',
      anchor: [1, 2, 3],
      refs: [{ shapeIndex: 0, kind: 'face', id: 4 }],
    });
    render(<StudioGenerate />);
    fireEvent.change(screen.getByLabelText('Generate prompt'), { target: { value: 'make a bracket' } });
    fireEvent.click(screen.getByRole('button', { name: 'Build' }));

    const requestPrompt = generationSubmit.mock.calls[0]![0] as string;
    expect(requestPrompt).toContain('make a bracket');
    const snapshot = expectPromptHasMarkup(requestPrompt);
    expect(snapshot.notes).toEqual([expect.objectContaining({ text: 'Keep this face flat', anchor: [1, 2, 3] })]);
  });

  it('disables 3D concept mode when a photo is attached', async () => {
    render(<StudioGenerate />);
    fireEvent.change(screen.getByLabelText('Generate prompt'), { target: { value: 'an e-reader enclosure' } });
    fireEvent.change(screen.getByLabelText('Choose files'), {
      target: { files: [new File(['photo-bytes'], 'e-reader.png', { type: 'image/png' })] },
    });

    await waitFor(() => expect(screen.getByText('e-reader.png')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /3d concept/i })).toBeDisabled();
  });
});

function expectPromptHasMarkup(prompt: string) {
  const match = prompt.match(/Studio markup snapshot JSON \(schemaVersion 1\):\n(`{3,})json\n([\s\S]*?)\n\1/);
  expect(match?.[2]).toBeTruthy();
  return parseMarkupSnapshot(match![2]!);
}

// SPDX-License-Identifier: MIT
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DraftingReview } from './DraftingReview';
import * as exporter from '../exportViaServer';

vi.mock('../exportViaServer', async (original) => ({ ...await original<typeof import('../exportViaServer')>(),
  previewDrawingViaServer: vi.fn(), exportViaServer: vi.fn(), downloadBlob: vi.fn() }));
const report = { placed: 1, overlapped: 0, suppressed: 0, byKind: { hole: 1 }, datums: [],
  annotations: [{ id: 'hole:1', source: 'auto', kind: 'hole', view: 'front', text: '⌀5 THRU', overlapped: false }] };
beforeEach(() => {
  localStorage.clear();
  vi.mocked(exporter.previewDrawingViaServer).mockResolvedValue({ svg: '<svg/>', drawingReport: report, diagnostics: [] });
  vi.mocked(exporter.exportViaServer).mockResolvedValue({ blob: new Blob(['PDF']), downloadName: 'drawing.pdf' });
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe('drafting review', () => {
  it('blocks advanced reviewed export for incomplete authoritative coverage while ordinary PDF works', async () => {
    vi.mocked(exporter.previewDrawingViaServer).mockResolvedValueOnce({ svg: '<svg/>', diagnostics: [], drawingReport: { ...report,
      review: { status: 'incomplete', requirements: [], decisions: [], criticalCount: 2, coveredCriticalCount: 1, decisionCount: 0, unresolvedDecisionCount: 0 } } });
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate preview' }));
    await screen.findByText('1/2 critical covered · 0 unresolved decisions');
    expect((screen.getByRole('button', { name: 'Mark reviewed' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Export reviewed PDF' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(exporter.downloadBlob).toHaveBeenCalledOnce());
    expect(vi.mocked(exporter.exportViaServer).mock.calls[0][2]?.drawingOptions).not.toHaveProperty('requireCompleteReview');
  });

  it('edits an authored dimension primary label without copying its tolerance suffix', async () => {
    vi.mocked(exporter.previewDrawingViaServer).mockResolvedValueOnce({ svg: '<svg/>', diagnostics: [], drawingReport: { ...report,
      annotations: [{ ...report.annotations[0], id: 'declared:width', source: 'authored', kind: 'linear', text: '80 +0.1/−0.1', primaryText: '80' }] } });
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate preview' }));
    fireEvent.click(await screen.findByRole('button', { name: /80 \+0.1/ }));
    const input = screen.getByLabelText('Annotation text') as HTMLInputElement;
    expect(input.value).toBe('80');
    fireEvent.change(input, { target: { value: 'VERIFY WIDTH' } });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh preview' }));
    await waitFor(() => expect(exporter.previewDrawingViaServer).toHaveBeenLastCalledWith('model', expect.objectContaining({ annotationOverrides: { 'declared:width': { text: 'VERIFY WIDTH' } } }), expect.anything()));
  });
  it('edits only the primary auto-hole label while preserving its feature-control frame', async () => {
    vi.mocked(exporter.previewDrawingViaServer).mockResolvedValueOnce({ svg: '<svg/>', diagnostics: [], drawingReport: { ...report,
      annotations: [{ ...report.annotations[0], text: '⌀5 THRU | ⌖ ⌀0.1 A B C' }] } });
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate preview' }));
    fireEvent.click(await screen.findByRole('button', { name: /⌀5 THRU/ }));
    const input = screen.getByLabelText('Annotation text') as HTMLInputElement;
    expect(input.value).toBe('⌀5 THRU');
    fireEvent.change(input, { target: { value: input.value.replace('⌀5', '⌀6') } });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh preview' }));
    await waitFor(() => expect(exporter.previewDrawingViaServer).toHaveBeenLastCalledWith('model', expect.objectContaining({ annotationOverrides: { 'hole:1': { text: '⌀6 THRU' } } }), expect.anything()));
  });
  it('ignores negative annotation offsets', async () => {
    const changed = vi.fn();
    render(<DraftingReview code="model" onChange={changed} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate preview' }));
    fireEvent.click(await screen.findByRole('button', { name: /⌀5 THRU/ }));
    fireEvent.change(screen.getByLabelText('Extra offset (sheet mm)'), { target: { value: '-4' } });
    expect(changed).not.toHaveBeenCalled();
  });
  it('allows PDF download even when the optional preview report is absent', async () => {
    vi.mocked(exporter.previewDrawingViaServer).mockResolvedValueOnce({ svg: '<svg/>', diagnostics: [] });
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate preview' }));
    await screen.findByRole('img', { name: 'Engineering drawing preview' });
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(exporter.downloadBlob).toHaveBeenCalledOnce());
    expect(screen.getByText(/No annotation report/)).toBeDefined();
  });
  it('keeps engineering declarations from receiving arbitrary primary-label edits', async () => {
    vi.mocked(exporter.previewDrawingViaServer).mockResolvedValueOnce({ svg: '<svg/>', diagnostics: [], drawingReport: { ...report,
      annotations: [{ ...report.annotations[0], id: 'datum:A', kind: 'datum', text: 'A' }] } });
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate preview' }));
    fireEvent.click(await screen.findByRole('button', { name: /^A front/ }));
    expect((screen.getByLabelText('Annotation text') as HTMLInputElement).disabled).toBe(true);
  });
  it('downloads a PDF without generating or marking a preview', async () => {
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(exporter.downloadBlob).toHaveBeenCalledOnce());
    expect(exporter.previewDrawingViaServer).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Mark reviewed' })).toBeNull();
  });
  it('prevents overlapping preview and PDF jobs', async () => {
    let finishPreview!: (value: exporter.DrawingPreviewResult) => void;
    vi.mocked(exporter.previewDrawingViaServer).mockImplementationOnce(() => new Promise(resolve => { finishPreview = resolve; }));
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate preview' }));
    expect((screen.getByRole('button', { name: 'Download PDF' }) as HTMLButtonElement).disabled).toBe(true);
    finishPreview({ svg: '<svg/>', drawingReport: report, diagnostics: [] });
    await waitFor(() => expect((screen.getByRole('button', { name: 'Download PDF' }) as HTMLButtonElement).disabled).toBe(false));
    vi.mocked(exporter.exportViaServer).mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    expect((screen.getByRole('button', { name: 'Refresh preview' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('exports the latest annotation edits without requiring a refreshed preview', async () => {
    const changed = vi.fn();
    render(<DraftingReview code="model" onChange={changed} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate preview' }));
    await screen.findByRole('button', { name: /⌀5 THRU/ });
    fireEvent.click(screen.getByRole('button', { name: /⌀5 THRU/ }));
    fireEvent.change(screen.getByLabelText('Annotation text'), { target: { value: '⌀5 REAM' } });
    fireEvent.change(screen.getByLabelText('Extra offset (sheet mm)'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(exporter.exportViaServer).toHaveBeenCalledWith('pdf-drawing', 'model', expect.objectContaining({ drawingOptions: expect.objectContaining({ annotationOverrides: { 'hole:1': { text: '⌀5 REAM', offset: 8 } } }) })));
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ sourceFingerprint: 'model' }));
  });
  it('warns about changed source without applying old annotation overrides', async () => {
    render(<DraftingReview code="new" settings={{ sourceFingerprint: 'old', draftingProfile: 'machining', dimensioningStyle: 'baseline', annotationOverrides: { missing: { suppress: true } } }} onChange={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/Source changed/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Generate preview' }));
    await waitFor(() => expect(exporter.previewDrawingViaServer).toHaveBeenCalledWith('new', expect.objectContaining({ annotationOverrides: {} }), expect.anything()));
  });
  it('shows missing override IDs and allows saved named profiles to be reused', async () => {
    render(<DraftingReview code="model" settings={{ sourceFingerprint: 'model', draftingProfile: 'general', dimensioningStyle: 'baseline', annotationOverrides: { missing: { suppress: true } } }} onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate preview' }));
    await screen.findByText(/Overrides no longer match: missing/);
    fireEvent.change(screen.getByLabelText('Profile name'), { target: { value: 'Machine shop' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(screen.getByRole('option', { name: 'Machine shop' })).toBeDefined();
  });
});

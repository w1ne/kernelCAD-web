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
  it('does not mark a preview reviewed when the annotation report is absent', async () => {
    vi.mocked(exporter.previewDrawingViaServer).mockResolvedValueOnce({ svg: '<svg/>', diagnostics: [] });
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate preview' }));
    await screen.findByRole('img', { name: 'Engineering drawing preview' });
    expect((screen.getByRole('button', { name: 'Mark reviewed' }) as HTMLButtonElement).disabled).toBe(true);
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
  it('requires a preview review and sends annotation edits to preview and PDF', async () => {
    const changed = vi.fn();
    render(<DraftingReview code="model" onChange={changed} onClose={() => {}} />);
    expect((screen.getByRole('button', { name: 'Export reviewed PDF' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Generate preview' }));
    await screen.findByRole('button', { name: /⌀5 THRU/ });
    fireEvent.click(screen.getByRole('button', { name: /⌀5 THRU/ }));
    fireEvent.change(screen.getByLabelText('Annotation text'), { target: { value: '⌀5 REAM' } });
    fireEvent.change(screen.getByLabelText('Extra offset (sheet mm)'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh preview' }));
    await waitFor(() => expect(exporter.previewDrawingViaServer).toHaveBeenLastCalledWith('model', expect.objectContaining({ annotationOverrides: { 'hole:1': { text: '⌀5 REAM', offset: 8 } } }), expect.anything()));
    fireEvent.click(await screen.findByRole('button', { name: 'Mark reviewed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export reviewed PDF' }));
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

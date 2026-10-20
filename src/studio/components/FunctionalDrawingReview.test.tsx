// SPDX-License-Identifier: MIT
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DraftingReview } from './DraftingReview';
import { __resetDraftingPreviewCacheForTests } from './useDraftingReview';
import * as exporter from '../exportViaServer';
import type { DrawingReview } from '../../shared/intent/drawingReview';
import { draftingCriteriaFingerprint, type DraftingSettings } from '../draftingSettings';

vi.mock('../exportViaServer', async (original) => ({ ...await original<typeof import('../exportViaServer')>(),
  previewDrawingViaServer: vi.fn(), exportViaServer: vi.fn(), downloadBlob: vi.fn() }));
const decision = { planId: 'bearing:mount', decisionId: 'fit:choice', key: 'bearing%3Amount:fit%3Achoice', kind: 'fit' as const, featureId: 'bore', prompt: 'Which bearing fit?' };
const complete: DrawingReview = { status: 'complete', requirements: [{ planId: 'bearing:mount', requirementId: 'seat', featureId: 'bore', annotationId: 'authored:bore', expectedKind: 'diameter', role: 'critical', reason: 'Bearing seat', status: 'covered' }], decisions: [], criticalCount: 1, coveredCriticalCount: 1, decisionCount: 0, unresolvedDecisionCount: 0 };
const unresolved: DrawingReview = { ...complete, status: 'incomplete', decisions: [decision], decisionCount: 1, unresolvedDecisionCount: 1 };
const resolved: DrawingReview = { ...unresolved, status: 'complete', unresolvedDecisionCount: 0, decisions: [{ ...decision, resolution: { note: 'Clearance fit', provenance: 'Drawing revision A' } }] };
function preview(review: DrawingReview = complete): exporter.DrawingPreviewResult {
  return { svg: '<svg/>', diagnostics: [], drawingReport: { placed: 1, overlapped: 0, suppressed: 0, byKind: { diameter: 1 }, datums: [],
    annotations: [{ id: 'authored:bore', source: 'authored', kind: 'diameter', view: 'front', text: '⌀22', overlapped: false }], review } };
}
const initial: DraftingSettings = { sourceFingerprint: 'model', draftingProfile: 'general', dimensioningStyle: 'baseline', annotationOverrides: {} };
const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;
async function generate() { fireEvent.click(button('Generate preview')); await screen.findByText('1/1 critical covered · 0 unresolved decisions'); }
beforeEach(() => {
  localStorage.clear();
  // Cases here rewrite one source repeatedly; a sheet remembered by the
  // previous case would open this dialog pre-rendered instead of empty.
  __resetDraftingPreviewCacheForTests();
  vi.mocked(exporter.previewDrawingViaServer).mockResolvedValue(preview());
  vi.mocked(exporter.exportViaServer).mockResolvedValue({ blob: new Blob(['PDF']), downloadName: 'drawing.pdf' });
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe('functional drawing review', () => {
  it('selects the exact annotation from a requirement with its role, reason and status', async () => {
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    await generate();
    fireEvent.click(screen.getByRole('button', { name: /Bearing seat/ }));
    expect((screen.getByLabelText('Annotation text') as HTMLInputElement).value).toBe('⌀22');
    expect(screen.getByText(/critical · covered/)).toBeDefined();
  });
  it('requires explicit current human review before sending the strict PDF option', async () => {
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    await generate();
    expect(button('Export reviewed PDF').disabled).toBe(true);
    fireEvent.click(button('Mark reviewed'));
    fireEvent.click(button('Export reviewed PDF'));
    await waitFor(() => expect(exporter.exportViaServer).toHaveBeenCalledWith('pdf-drawing', 'model', expect.objectContaining({ drawingOptions: expect.objectContaining({ requireCompleteReview: true }) })));
  });
  it('does not infer a declared plan from ordinary annotation placement counts', async () => {
    vi.mocked(exporter.previewDrawingViaServer).mockResolvedValue(preview({ ...complete, status: 'not-declared' }));
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(button('Generate preview'));
    await screen.findByRole('region', { name: 'Engineering drawing preview' });
    expect(screen.queryByRole('button', { name: 'Mark reviewed' })).toBeNull();
  });
  it('records only explicit nonempty decision intent and provenance under the engine key', async () => {
    vi.mocked(exporter.previewDrawingViaServer).mockResolvedValueOnce(preview(unresolved)).mockResolvedValue(preview(resolved));
    const changed = vi.fn();
    render(<DraftingReview code="model" onChange={changed} onClose={() => {}} />);
    fireEvent.click(button('Generate preview'));
    await screen.findByText('Which bearing fit?');
    expect(button('Record decision').disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Decision note'), { target: { value: '  ' } });
    fireEvent.change(screen.getByLabelText('Decision provenance'), { target: { value: 'Drawing revision A' } });
    expect(button('Record decision').disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Decision note'), { target: { value: 'Clearance fit' } });
    expect(changed).not.toHaveBeenCalled();
    fireEvent.click(button('Record decision'));
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ sourceFingerprint: 'model', decisionResolutions: { [decision.key]: { note: 'Clearance fit', provenance: 'Drawing revision A' } } }));
    expect(button('Mark reviewed').disabled).toBe(true);
    fireEvent.click(button('Refresh preview'));
    await waitFor(() => expect(exporter.previewDrawingViaServer).toHaveBeenLastCalledWith('model', expect.objectContaining({ decisionResolutions: { [decision.key]: { note: 'Clearance fit', provenance: 'Drawing revision A' } } }), expect.anything()));
    await waitFor(() => expect(button('Mark reviewed').disabled).toBe(false));
    fireEvent.click(button('Download PDF'));
    await waitFor(() => expect(exporter.exportViaServer).toHaveBeenCalledWith('pdf-drawing', 'model', expect.objectContaining({ drawingOptions: expect.objectContaining({ decisionResolutions: { [decision.key]: { note: 'Clearance fit', provenance: 'Drawing revision A' } } }) })));
  });
  it('invalidates human review after an annotation edit then revert, including refreshed preview', async () => {
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    await generate();
    fireEvent.click(button('Mark reviewed'));
    fireEvent.click(screen.getByRole('button', { name: /⌀22/ }));
    fireEvent.change(screen.getByLabelText('Extra offset (sheet mm)'), { target: { value: '4' } });
    fireEvent.click(button('Reset annotation'));
    expect(button('Export reviewed PDF').disabled).toBe(true);
    expect(button('Mark reviewed').disabled).toBe(true);
    fireEvent.click(button('Refresh preview'));
    await waitFor(() => expect(button('Mark reviewed').disabled).toBe(false));
    expect(button('Export reviewed PDF').disabled).toBe(true);
  });
  it('ignores a late preview after profile edit then revert', async () => {
    let finish!: (result: exporter.DrawingPreviewResult) => void;
    vi.mocked(exporter.previewDrawingViaServer).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(button('Generate preview'));
    fireEvent.change(screen.getByLabelText('Drafting profile'), { target: { value: 'machining' } });
    fireEvent.change(screen.getByLabelText('Drafting profile'), { target: { value: 'general' } });
    await act(async () => { finish(preview()); });
    expect(screen.queryByText('Preview up to date')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reviewed' })).toBeNull();
  });
  it('withholds source-bound annotation, datums and decisions while mounted and after source reverts', async () => {
    const view = render(<DraftingReview code="model" settings={initial} onChange={() => {}} onClose={() => {}} />);
    await generate();
    fireEvent.click(screen.getByRole('button', { name: /⌀22/ }));
    fireEvent.change(screen.getByLabelText('Extra offset (sheet mm)'), { target: { value: '4' } });
    view.rerender(<DraftingReview code="new" settings={initial} onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(button('Download PDF'));
    await waitFor(() => expect(exporter.exportViaServer).toHaveBeenLastCalledWith('pdf-drawing', 'new', expect.objectContaining({ drawingOptions: expect.objectContaining({ annotationOverrides: {} }) })));
    await waitFor(() => expect(button('Download PDF').disabled).toBe(false));
    view.rerender(<DraftingReview code="model" settings={initial} onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(button('Download PDF'));
    await waitFor(() => expect(exporter.exportViaServer).toHaveBeenLastCalledWith('pdf-drawing', 'model', expect.objectContaining({ drawingOptions: expect.objectContaining({ annotationOverrides: {} }) })));
  });
  it.each(['Drafting profile', 'Dimension style', 'General tolerance', 'datums'])('resets recorded decisions on %s criteria change', async (criterion) => {
    vi.mocked(exporter.previewDrawingViaServer).mockResolvedValueOnce(preview(unresolved)).mockResolvedValue(preview(resolved));
    const changed = vi.fn();
    render(<DraftingReview code="model" onChange={changed} onClose={() => {}} />);
    fireEvent.click(button('Generate preview')); await screen.findByText('Which bearing fit?');
    fireEvent.change(screen.getByLabelText('Decision note'), { target: { value: 'Clearance fit' } });
    fireEvent.change(screen.getByLabelText('Decision provenance'), { target: { value: 'Drawing revision A' } });
    fireEvent.click(button('Record decision'));
    if (criterion === 'datums') {
      fireEvent.change(screen.getByLabelText('Datum face queries (JSON)'), { target: { value: '[{"label":"A","face":{"byNormal":"-Z"}}]' } });
      fireEvent.click(button('Apply datums'));
    } else fireEvent.change(screen.getByLabelText(criterion), { target: { value: criterion === 'Drafting profile' ? 'machining' : criterion === 'Dimension style' ? 'chain' : 'ISO2768-f' } });
    expect(changed.mock.calls.at(-1)?.[0].decisionResolutions ?? {}).toEqual({});
  });
  it('invalidates a reviewed source decision when an unrecorded note changes then reverts', async () => {
    vi.mocked(exporter.previewDrawingViaServer).mockResolvedValue(preview(resolved));
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    await generate(); fireEvent.click(button('Mark reviewed'));
    fireEvent.change(screen.getByLabelText('Decision note'), { target: { value: 'New intent' } });
    fireEvent.change(screen.getByLabelText('Decision note'), { target: { value: 'Clearance fit' } });
    expect(button('Export reviewed PDF').disabled).toBe(true);
  });
  it('releases the preview job when an edit aborts it and the late response arrives', async () => {
    let finish!: (result: exporter.DrawingPreviewResult) => void;
    vi.mocked(exporter.previewDrawingViaServer).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(button('Generate preview'));
    fireEvent.change(screen.getByLabelText('Dimension style'), { target: { value: 'chain' } });
    await act(async () => { finish(preview()); });
    expect(button('Download PDF').disabled).toBe(false);
  });
  it('refuses to record a decision from an old source preview', async () => {
    vi.mocked(exporter.previewDrawingViaServer).mockResolvedValue(preview(unresolved));
    const changed = vi.fn();
    const view = render(<DraftingReview code="model" onChange={changed} onClose={() => {}} />);
    fireEvent.click(button('Generate preview')); await screen.findByText('Which bearing fit?');
    view.rerender(<DraftingReview code="new" onChange={changed} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Decision note'), { target: { value: 'Old source intent' } });
    fireEvent.change(screen.getByLabelText('Decision provenance'), { target: { value: 'Revision A' } });
    expect(button('Record decision').disabled).toBe(true);
    fireEvent.click(button('Record decision'));
    expect(changed).not.toHaveBeenCalled();
  });
  it('retains current-source decision records on reopen while withholding every source-bound override for new code', async () => {
    const settings = { ...initial, annotationOverrides: { 'authored:bore': { offset: 3 } }, datums: [{ label: 'A', face: { byNormal: '-Z' } }],
      decisionResolutions: { [decision.key]: { note: 'Clearance fit', provenance: 'Drawing revision A' } } };
    const bound = { ...settings, decisionCriteriaFingerprint: draftingCriteriaFingerprint(settings) };
    const view = render(<DraftingReview code="model" settings={bound} onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(button('Download PDF'));
    await waitFor(() => expect(exporter.exportViaServer).toHaveBeenLastCalledWith('pdf-drawing', 'model', expect.objectContaining({ drawingOptions: expect.objectContaining({ decisionResolutions: settings.decisionResolutions }) })));
    view.unmount();
    render(<DraftingReview code="new" settings={bound} onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(button('Download PDF'));
    await waitFor(() => expect(exporter.exportViaServer).toHaveBeenLastCalledWith('pdf-drawing', 'new', expect.objectContaining({ drawingOptions: expect.objectContaining({ annotationOverrides: {}, autoAnnotate: { dimensioningStyle: 'baseline' } }) })));
    expect(vi.mocked(exporter.exportViaServer).mock.calls.at(-1)?.[2]?.drawingOptions).not.toHaveProperty('decisionResolutions');
  });
  it('blocks a complete report when a saved annotation override has no matching annotation', async () => {
    render(<DraftingReview code="model" settings={{ ...initial, annotationOverrides: { unknown: { offset: 2 } } }} onChange={() => {}} onClose={() => {}} />);
    await generate();
    expect(button('Mark reviewed').disabled).toBe(true);
    fireEvent.click(button('Clear missing overrides'));
    expect(button('Mark reviewed').disabled).toBe(true);
    fireEvent.click(button('Refresh preview'));
    await waitFor(() => expect(button('Mark reviewed').disabled).toBe(false));
  });
  it('blocks unknown saved decision IDs and lets the reviewer discard them', async () => {
    const settings = { ...initial, decisionResolutions: { 'unknown:fit': { note: 'Intent', provenance: 'Revision A' } }, decisionCriteriaFingerprint: draftingCriteriaFingerprint(initial) };
    render(<DraftingReview code="model" settings={settings} onChange={() => {}} onClose={() => {}} />);
    await generate();
    expect(button('Mark reviewed').disabled).toBe(true);
    fireEvent.click(button('Clear missing decisions'));
    expect(button('Mark reviewed').disabled).toBe(true);
    fireEvent.click(button('Refresh preview'));
    await waitFor(() => expect(button('Mark reviewed').disabled).toBe(false));
  });

  it('lets the reviewer discard stored decisions when the server rejects unknown IDs before returning a report', async () => {
    vi.mocked(exporter.previewDrawingViaServer).mockRejectedValueOnce(new Error('Unknown decision key'));
    const settings = { ...initial, decisionResolutions: { 'unknown:fit': { note: 'Intent', provenance: 'Revision A' } }, decisionCriteriaFingerprint: draftingCriteriaFingerprint(initial) };
    const changed = vi.fn();
    render(<DraftingReview code="model" settings={settings} onChange={changed} onClose={() => {}} />);
    fireEvent.click(button('Generate preview')); await screen.findByText('Unknown decision key');
    fireEvent.click(button('Clear decision records'));
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ decisionResolutions: {} }));
    fireEvent.click(button('Generate preview'));
    await waitFor(() => expect(exporter.previewDrawingViaServer).toHaveBeenLastCalledWith('model', expect.not.objectContaining({ decisionResolutions: expect.anything() }), expect.anything()));
  });

  it('offers an explicit reset so withheld old settings cannot permanently block a fresh new-source review', async () => {
    const bound = { ...initial, annotationOverrides: { 'authored:bore': { offset: 3 } }, decisionResolutions: { [decision.key]: { note: 'Old intent', provenance: 'Old revision' } }, decisionCriteriaFingerprint: draftingCriteriaFingerprint(initial) };
    const changed = vi.fn();
    render(<DraftingReview code="new" settings={bound} onChange={changed} onClose={() => {}} />);
    await generate();
    expect(button('Mark reviewed').disabled).toBe(true);
    fireEvent.click(button('Reset source-bound choices'));
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ sourceFingerprint: 'new', annotationOverrides: {} }));
    expect(changed.mock.calls.at(-1)?.[0].decisionResolutions ?? {}).toEqual({});
    expect(button('Mark reviewed').disabled).toBe(false);
    fireEvent.click(button('Mark reviewed'));
    expect(button('Export reviewed PDF').disabled).toBe(false);
  });
  it('never makes an old pending response current after an exact annotation option edit then revert', async () => {
    let finish!: (result: exporter.DrawingPreviewResult) => void;
    render(<DraftingReview code="model" onChange={() => {}} onClose={() => {}} />);
    await generate(); fireEvent.click(button('Mark reviewed'));
    vi.mocked(exporter.previewDrawingViaServer).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    fireEvent.click(button('Refresh preview'));
    fireEvent.click(screen.getByRole('button', { name: /⌀22/ }));
    fireEvent.change(screen.getByLabelText('Extra offset (sheet mm)'), { target: { value: '3' } });
    fireEvent.click(button('Reset annotation'));
    await act(async () => { finish(preview()); });
    expect(button('Mark reviewed').disabled).toBe(true);
    expect(button('Export reviewed PDF').disabled).toBe(true);
    expect(button('Download PDF').disabled).toBe(false);
  });

});

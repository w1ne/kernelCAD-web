// SPDX-License-Identifier: MIT
// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFunctionalDrawingReview } from './useFunctionalDrawingReview';
import { useDraftingReview } from './useDraftingReview';
import * as exporter from '../exportViaServer';
import type { DrawingReview } from '../../shared/intent/drawingReview';

vi.mock('../exportViaServer', async (original) => ({ ...await original<typeof import('../exportViaServer')>(),
  previewDrawingViaServer: vi.fn(), exportViaServer: vi.fn(), downloadBlob: vi.fn() }));
const choices = { sourceFingerprint: 'model', draftingProfile: 'general' as const, dimensioningStyle: 'baseline' as const, annotationOverrides: {} };
const review: DrawingReview = { status: 'complete', requirements: [], decisions: [{ key: 'mount:fit', planId: 'mount', decisionId: 'fit', featureId: 'bore', kind: 'fit', prompt: 'Which fit?', resolution: { note: 'Clearance', provenance: 'Revision A' } }], criticalCount: 0, coveredCriticalCount: 0, decisionCount: 1, unresolvedDecisionCount: 0 };
function setup(current = true, report = review) {
  const update = vi.fn();
  const hook = renderHook(() => useFunctionalDrawingReview({ review: report, current, revision: '0', blocked: false, matchesCriteria: current, choices, update }));
  return { ...hook, update };
}

describe('functional review handler guards', () => {
  it('does not record empty values or unknown decision IDs even when called directly', () => {
    const { result, update } = setup();
    act(() => { result.current.editDecision('unknown:fit', { note: 'Intent', provenance: 'CAD' }); result.current.recordDecision('unknown:fit'); });
    expect(update).not.toHaveBeenCalled();
    act(() => result.current.editDecision('mount:fit', { note: '   ' }));
    act(() => result.current.recordDecision('mount:fit'));
    expect(update).not.toHaveBeenCalled();
    act(() => result.current.editDecision('mount:fit', { note: 'Intent', provenance: '' }));
    act(() => result.current.recordDecision('mount:fit'));
    expect(update).not.toHaveBeenCalled();
  });
  it.each([false, true])('guards marking against %s currentness with an incomplete authoritative report', (current) => {
    const { result } = setup(current, { ...review, status: 'incomplete', unresolvedDecisionCount: 1 });
    act(() => result.current.markReviewed());
    expect(result.current.reviewed).toBe(false);
  });
  it('refuses a direct reviewed-export handler call without a current human review', () => {
    const { result } = renderHook(() => useDraftingReview({ code: 'model', onChange: () => {}, onClose: () => {} }));
    act(() => { result.current.exportReviewedPdf(); });
    expect(exporter.exportViaServer).not.toHaveBeenCalled();
  });
  it('normalizes recorded whitespace so the recorded decision is no longer an uncommitted edit', () => {
    const { result, update } = setup();
    act(() => result.current.editDecision('mount:fit', { note: ' Clearance ', provenance: ' Revision A ' }));
    act(() => result.current.recordDecision('mount:fit'));
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ decisionResolutions: { 'mount:fit': { note: 'Clearance', provenance: 'Revision A' } } }));
    expect(result.current.getDraft('mount:fit')).toEqual({ note: 'Clearance', provenance: 'Revision A' });
  });

});


describe('source and criteria report lifetime', () => {
  const unresolved = { ...review, status: 'incomplete' as const, unresolvedDecisionCount: 1, decisions: review.decisions.map(({ resolution: _resolution, ...decision }) => decision) };
  const response = (report = unresolved): exporter.DrawingPreviewResult => ({ svg: '<svg/>', diagnostics: [], drawingReport: {
    placed: 0, overlapped: 0, suppressed: 0, byKind: {}, datums: [], annotations: [], review: report,
  } });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exporter.previewDrawingViaServer).mockResolvedValue(response());
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  it.each(['criteria', 'source'])('refuses decision recording after %s changes then reverts until a fresh report arrives', async (change) => {
    const changed = vi.fn();
    const hook = renderHook(({ code }) => useDraftingReview({ code, onChange: changed, onClose: () => {} }), { initialProps: { code: 'model' } });
    await act(async () => { await hook.result.current.drawing.generatePreview(); });
    expect(hook.result.current.drawing.current).toBe(true);
    if (change === 'criteria') {
      act(() => hook.result.current.profiles.update({ ...hook.result.current.profiles.choices, dimensioningStyle: 'chain' }));
      act(() => hook.result.current.profiles.update({ ...hook.result.current.profiles.choices, dimensioningStyle: 'baseline' }));
    } else {
      hook.rerender({ code: 'new' });
      hook.rerender({ code: 'model' });
    }
    expect(hook.result.current.drawing.current).toBe(false);
    act(() => hook.result.current.functional.editDecision('mount:fit', { note: 'Clearance', provenance: 'Revision A' }));
    expect(hook.result.current.functional.canRecord('mount:fit')).toBe(false);
    act(() => hook.result.current.functional.recordDecision('mount:fit'));
    expect(changed.mock.calls.every(([settings]) => !settings.decisionResolutions)).toBe(true);
    await act(async () => { await hook.result.current.drawing.generatePreview(); });
    expect(hook.result.current.functional.canRecord('mount:fit')).toBe(true);
    act(() => hook.result.current.functional.recordDecision('mount:fit'));
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ sourceFingerprint: 'model', decisionResolutions: { 'mount:fit': { note: 'Clearance', provenance: 'Revision A' } } }));
  });
  it('records multiple decisions against one report without refreshing after each decision-only edit', async () => {
    const report = { ...unresolved, decisionCount: 2, unresolvedDecisionCount: 2,
      decisions: [...unresolved.decisions, { ...unresolved.decisions[0], decisionId: 'datum', key: 'mount:datum', kind: 'datum' as const, prompt: 'Which datum?' }] };
    vi.mocked(exporter.previewDrawingViaServer).mockResolvedValue(response(report));
    const changed = vi.fn();
    const { result } = renderHook(() => useDraftingReview({ code: 'model', onChange: changed, onClose: () => {} }));
    await act(async () => { await result.current.drawing.generatePreview(); });
    act(() => result.current.functional.editDecision('mount:fit', { note: 'Clearance', provenance: 'Revision A' }));
    act(() => result.current.functional.recordDecision('mount:fit'));
    expect(result.current.drawing.current).toBe(false);
    expect(result.current.drawing.matchesCriteria).toBe(true);
    act(() => result.current.functional.editDecision('mount:datum', { note: 'Mount face', provenance: 'Revision A' }));
    expect(result.current.functional.canRecord('mount:datum')).toBe(true);
    act(() => result.current.functional.recordDecision('mount:datum'));
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ decisionResolutions: {
      'mount:fit': { note: 'Clearance', provenance: 'Revision A' }, 'mount:datum': { note: 'Mount face', provenance: 'Revision A' },
    } }));
    expect(exporter.previewDrawingViaServer).toHaveBeenCalledTimes(1);
  });
});

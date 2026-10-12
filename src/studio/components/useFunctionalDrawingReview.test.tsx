// SPDX-License-Identifier: MIT
// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

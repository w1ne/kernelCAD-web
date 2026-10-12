// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { drawingDecisionKey, mergeDrawingReviewPlans, evaluateDrawingReview } from './drawingReview';
import type { DrawingReviewPlan, DrawingReviewAnnotation } from './drawingReview';

export const plan: DrawingReviewPlan = { id: 'interface', requirements: [{ id: 'width', featureId: 'plate', annotationId: 'authored:width', expectedKind: 'linear', role: 'critical', reason: 'Mounting interface' }], decisions: [] };
const row: DrawingReviewAnnotation = { id: 'authored:width', source: 'authored', kind: 'linear', overlapped: false };

describe('declared drawing review', () => {
  it('uses separately encoded decision namespaces', () => {
    expect(drawingDecisionKey('a:b', 'c')).toBe('a%3Ab:c');
    expect(drawingDecisionKey('a', 'b:c')).toBe('a:b%3Ac');
  });
  it('merges source and option plans without erasing source', () => {
    expect(mergeDrawingReviewPlans([plan], [])).toEqual([plan]);
    expect(() => mergeDrawingReviewPlans([plan], [plan])).toThrow(/duplicate/);
  });
  it.each([
    null, {}, { ...plan, extra: true }, { ...plan, id: ' ' }, { ...plan, requirements: [], decisions: [] },
    { ...plan, requirements: [{ ...plan.requirements[0], expectedKind: 'note' }] },
    { ...plan, requirements: [{ ...plan.requirements[0], annotationId: 'auto:width' }] },
    { ...plan, requirements: [{ ...plan.requirements[0], annotationId: 'authored: ' }] },
    { ...plan, requirements: [plan.requirements[0], plan.requirements[0]] },
    { ...plan, requirements: Array(1) },
    { ...plan, requirements: [{ ...plan.requirements[0], unknown: 'field' }] },
    { ...plan, decisions: [{ id: 'd', kind: 'bad', featureId: 'bore', prompt: 'Choose' }] },
    { ...plan, decisions: [{ id: 'd', kind: 'fit', featureId: 'bore', prompt: 'Choose' }, { id: 'd', kind: 'fit', featureId: 'bore', prompt: 'Choose' }] },
    { ...plan, decisions: [{ id: 'd', kind: 'fit', featureId: 'bore', prompt: 'Choose', unknown: true }] },
    { ...plan, decisions: [{ id: 'fit', kind: 'fit', featureId: 'bore', prompt: ' ' }] },
    { ...plan, decisions: [{ id: 'fit', kind: 'fit', featureId: 'bore', prompt: 'Choose', resolution: { note: ' ', provenance: 'drawing' } }] },
  ])('rejects malformed plan %j', raw => expect(() => mergeDrawingReviewPlans([], [raw] as never)).toThrow());
  it.each([
    [[], 'missing'], [[row, row], 'ambiguous'], [[{ ...row, source: 'auto' }], 'kind-mismatch'],
    [[{ ...row, kind: 'note' }], 'kind-mismatch'], [[{ ...row, kind: 'datum' }], 'kind-mismatch'],
    [[{ ...row, suppressed: true }], 'hidden'], [[{ ...row, overlapped: true }], 'crowded'],
    [[{ ...row, originalText: '80' }], 'label-overridden'], [[row], 'covered'],
  ])('evaluates all final rows as %s -> %s', (rows, status) => {
    const review = evaluateDrawingReview([plan], rows as DrawingReviewAnnotation[]);
    expect(review.requirements[0]).toMatchObject({ planId: 'interface', requirementId: 'width', status });
    expect(review.status).toBe(status === 'covered' ? 'complete' : 'incomplete');
  });
  it('keeps reference failures advisory', () => {
    const ref = { ...plan, requirements: [{ ...plan.requirements[0], role: 'reference' as const }] };
    expect(evaluateDrawingReview([ref], []).status).toBe('complete');
    expect(evaluateDrawingReview([ref], [{ ...row, originalText: '80' }]).requirements[0].status).toBe('covered');
  });
  it('requires every engineering decision and allows validated option precedence', () => {
    const p: DrawingReviewPlan = { id: 'fit', requirements: [], decisions: [{ id: 'choice', kind: 'fit', featureId: 'bore', prompt: 'Which fit?', resolution: { note: 'source', provenance: 'source spec' } }] };
    const key = drawingDecisionKey(p.id, 'choice');
    expect(evaluateDrawingReview([p], [], { [key]: { note: 'review', provenance: 'engineer' } })).toMatchObject({ status: 'complete', decisionCount: 1, unresolvedDecisionCount: 0, decisions: [{ key, resolution: { note: 'review', provenance: 'engineer' } }] });
    expect(evaluateDrawingReview([{ ...p, decisions: [{ ...p.decisions[0], resolution: undefined }] }], []).status).toBe('incomplete');
    for (const overrides of [null, [], { [key]: null },{ unknown: { note: 'ok', provenance: 'ok' } }, { [key]: { note: '', provenance: 'ok' } }, { [key]: { note: 'ok', provenance: 'ok', extra: true } }]) expect(() => evaluateDrawingReview([p], [], overrides)).toThrow();
  });
  it('never claims vacuous completion without a declaration', () => {
    expect(evaluateDrawingReview([], [row])).toMatchObject({ status: 'not-declared', criticalCount: 0, coveredCriticalCount: 0, decisionCount: 0, unresolvedDecisionCount: 0 });
  });
});

// SPDX-License-Identifier: MIT
import type { DraftingReviewState } from './useDraftingReview';
import { BUTTON, INPUT } from './draftingReviewStyles';

export function FunctionalDrawingReviewPanel({ state }: { state: DraftingReviewState }) {
  const { functional, annotations, drawing } = state;
  const { review, declared } = functional;
  if (!review || !declared) return functional.hasRecords ? <section className="flex flex-col gap-2 border-t border-border pt-3">
    <h3 className="font-medium">Functional drawing review</h3>
    <p className="text-2xs text-fg-3">Generate a preview to check saved decision records against the declared plan.</p>
    <button type="button" className={BUTTON} onClick={functional.clearRecords}>Clear decision records</button>
  </section> : null;
  return <section className="flex flex-col gap-2 border-t border-border pt-3">
    <h3 className="font-medium">Functional drawing review</h3>
    <p className="text-2xs text-fg-2">{review.coveredCriticalCount}/{review.criticalCount} critical covered · {review.unresolvedDecisionCount} unresolved decisions</p>
    {!drawing.current && <p className="text-2xs text-warn">Refresh the preview before reviewing this drawing.</p>}
    <ul className="flex flex-col gap-1">{review.requirements.map(requirement => <li key={JSON.stringify([requirement.planId, requirement.requirementId])}>
      <button type="button" className={`${BUTTON} w-full text-left`}
        disabled={annotations.annotations.filter(annotation => annotation.id === requirement.annotationId).length !== 1}
        onClick={() => annotations.setSelected(requirement.annotationId)}>
        <span className="block">{requirement.reason}</span>
        <span className="block text-2xs text-fg-3">{requirement.featureId} · {requirement.role} · {requirement.status}</span>
        <span className="block text-2xs text-fg-3">{requirement.annotationId}</span>
      </button>
    </li>)}</ul>
    {review.decisions.map(decision => {
      const draft = functional.getDraft(decision.key);
      return <fieldset key={decision.key} className="flex flex-col gap-2 rounded-control border border-border p-2">
        <legend>{decision.prompt}</legend>
        <p className="text-2xs text-fg-3">{decision.featureId} · {decision.kind} · {decision.resolution ? 'recorded' : 'unresolved'}</p>
        <label>Decision note<textarea className={INPUT} value={draft.note} onChange={event => functional.editDecision(decision.key, { note: event.target.value })} /></label>
        <label>Decision provenance<input className={INPUT} value={draft.provenance} onChange={event => functional.editDecision(decision.key, { provenance: event.target.value })} /></label>
        <button type="button" className={BUTTON} disabled={!functional.canRecord(decision.key)} onClick={() => functional.recordDecision(decision.key)}>Record decision</button>
      </fieldset>;
    })}
    {!!review.decisions.length && <p className="text-2xs text-fg-3">Decision records state intent and provenance. Geometry, tolerances and GD&amp;T remain in the source.</p>}
    {functional.hasRecords && <button type="button" className={BUTTON} onClick={functional.clearRecords}>Clear decision records</button>}
    {!!functional.missing.length && <><p className="text-2xs text-warn">Decision records no longer match: {functional.missing.join(', ')}.</p>
      <button type="button" className={BUTTON} onClick={functional.clearMissing}>Clear missing decisions</button></>}
  </section>;
}

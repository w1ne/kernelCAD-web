// SPDX-License-Identifier: MIT
import { useState } from 'react';
import { validateDrawingDecisionResolution, type DrawingDecisionResolution, type DrawingReview } from '../../shared/intent/drawingReview';
import { draftingCriteriaFingerprint, effectiveDecisionResolutions, type DraftingSettings } from '../draftingSettings';

interface FunctionalReviewInputs {
  review?: DrawingReview; current: boolean; revision: string; blocked: boolean; matchesCriteria: boolean;
  choices: DraftingSettings; update: (settings: DraftingSettings) => void;
}
const EMPTY = { note: '', provenance: '' };

/** The finalized report owns coverage; this hook records only human intent. */
export function useFunctionalDrawingReview({ review, current, revision, blocked, matchesCriteria, choices, update }: FunctionalReviewInputs) {
  const context = JSON.stringify([choices.sourceFingerprint, draftingCriteriaFingerprint(choices)]);
  const [draftContext, setDraftContext] = useState(context);
  const [drafts, setDrafts] = useState<Record<string, DrawingDecisionResolution>>({});
  const [draftRevision, setDraftRevision] = useState(0);
  const [reviewedToken, setReviewedToken] = useState<string | null>(null);
  if (context !== draftContext) { setDraftContext(context); setDrafts({}); }
  const resolutions = effectiveDecisionResolutions(choices) ?? {};
  const decisions = review?.decisions ?? [];
  const missing = Object.keys(resolutions).filter(key => !decisions.some(decision => decision.key === key));
  const getDraft = (key: string) => drafts[key] ?? resolutions[key] ?? decisions.find(decision => decision.key === key)?.resolution ?? EMPTY;
  const dirty = decisions.some(decision => drafts[decision.key] && JSON.stringify(drafts[decision.key]) !== JSON.stringify(resolutions[decision.key] ?? decision.resolution ?? EMPTY));
  const token = `${revision}:${draftRevision}`;
  const declared = Boolean(review && review.status !== 'not-declared');
  const canMark = declared && review?.status === 'complete' && current && !blocked && !missing.length && !dirty;
  const markReviewed = () => { if (canMark) setReviewedToken(token); };
  const editDecision = (key: string, patch: Partial<DrawingDecisionResolution>) => {
    if (!decisions.some(decision => decision.key === key)) return;
    setDrafts({ ...drafts, [key]: { ...getDraft(key), ...patch } });
    setDraftRevision(value => value + 1);
  };
  const canRecord = (key: string) => {
    const draft = getDraft(key);
    return matchesCriteria && decisions.some(decision => decision.key === key) && Boolean(draft.note.trim() && draft.provenance.trim());
  };
  const recordDecision = (key: string) => {
    if (!canRecord(key)) return;
    const draft = getDraft(key);
    const resolution = validateDrawingDecisionResolution({ note: draft.note.trim(), provenance: draft.provenance.trim() });
    setDrafts({ ...drafts, [key]: resolution });
    update({ ...choices, decisionResolutions: { ...resolutions, [key]: resolution }, decisionCriteriaFingerprint: draftingCriteriaFingerprint(choices) });
    setDraftRevision(value => value + 1);
  };
  const clearMissing = () => update({ ...choices, decisionResolutions: Object.fromEntries(Object.entries(resolutions).filter(([key]) => !missing.includes(key))) });
  const hasRecords = Object.keys(resolutions).length > 0;
  const clearRecords = () => { update({ ...choices, decisionResolutions: {}, decisionCriteriaFingerprint: draftingCriteriaFingerprint(choices) }); setDrafts({}); setDraftRevision(value => value + 1); };
  return { hasRecords, clearRecords, review, declared, canMark, reviewed: reviewedToken === token && canMark, markReviewed, getDraft, editDecision, canRecord, recordDecision, missing, clearMissing };
}

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { invalidArgs } from './invalidArgs';

export type DrawingMeasurableKind = 'linear' | 'diameter' | 'radius' | 'angular';
export interface DrawingDecisionResolution { note: string; provenance: string }
export interface DrawingRequirement {
  id: string; featureId: string; annotationId: string; expectedKind: DrawingMeasurableKind;
  role: 'critical' | 'reference'; reason: string;
}
export interface DrawingDecision {
  id: string; kind: 'datum' | 'fit' | 'tolerance' | 'dimension' | 'other'; featureId: string; prompt: string;
  resolution?: DrawingDecisionResolution;
}
export interface DrawingReviewPlan { id: string; requirements: readonly DrawingRequirement[]; decisions: readonly DrawingDecision[] }
export interface DrawingReviewOptions {
  reviewPlans?: readonly DrawingReviewPlan[];
  decisionResolutions?: Readonly<Record<string, DrawingDecisionResolution>>;
  requireCompleteReview?: boolean;
}
export interface DrawingReviewAnnotation {
  id: string; source: 'auto' | 'authored'; kind: string; overlapped: boolean; suppressed?: boolean; originalText?: string;
}
export type DrawingRequirementStatus = 'missing' | 'ambiguous' | 'kind-mismatch' | 'hidden' | 'crowded' | 'label-overridden' | 'covered';
export interface DrawingRequirementReview extends Omit<DrawingRequirement, 'id'> { planId: string; requirementId: string; status: DrawingRequirementStatus }
export interface DrawingDecisionReview extends Omit<DrawingDecision, 'id'> { planId: string; decisionId: string; key: string }
export interface DrawingReview {
  status: 'not-declared' | 'incomplete' | 'complete';
  requirements: DrawingRequirementReview[]; decisions: DrawingDecisionReview[];
  criticalCount: number; coveredCriticalCount: number; decisionCount: number; unresolvedDecisionCount: number;
}

export function invalidDrawingReview(path: string, requires: string, got?: unknown): never {
  return invalidArgs({ api: 'drawingReview', path, requires, got,
    example: '{ id: "mount", requirements: [{ id: "width", featureId: "plate", annotationId: "authored:width", expectedKind: "linear", role: "critical", reason: "Mount interface" }], decisions: [] }' });
}

function object(raw: unknown, keys: readonly string[], path: string): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) invalidDrawingReview(path, 'an object', raw);
  const value = raw as Record<string, unknown>;
  for (const key of Object.keys(value)) if (!keys.includes(key)) invalidDrawingReview(`${path}.${key}`, 'no unknown fields', value[key]);
  return value;
}
function string(raw: unknown, path: string): string {
  if (typeof raw !== 'string' || !raw.trim()) invalidDrawingReview(path, 'a nonempty string', raw);
  return raw;
}
function choice<T extends string>(raw: unknown, values: readonly T[], path: string): T {
  if (!values.includes(raw as T)) invalidDrawingReview(path, values.join(' | '), raw);
  return raw as T;
}
export function validateDrawingDecisionResolution(raw: unknown, path = 'resolution'): DrawingDecisionResolution {
  const v = object(raw, ['note', 'provenance'], path);
  return { note: string(v.note, `${path}.note`), provenance: string(v.provenance, `${path}.provenance`) };
}
function requirement(raw: unknown, path: string): DrawingRequirement {
  const v = object(raw, ['id', 'featureId', 'annotationId', 'expectedKind', 'role', 'reason'], path);
  const annotationId = string(v.annotationId, `${path}.annotationId`);
  if (!annotationId.startsWith('authored:') || !annotationId.slice(9).trim()) invalidDrawingReview(`${path}.annotationId`, 'an exact authored:<id> measured dimension ID', annotationId);
  return { id: string(v.id, `${path}.id`), featureId: string(v.featureId, `${path}.featureId`), annotationId,
    expectedKind: choice(v.expectedKind, ['linear', 'diameter', 'radius', 'angular'], `${path}.expectedKind`),
    role: choice(v.role, ['critical', 'reference'], `${path}.role`), reason: string(v.reason, `${path}.reason`) };
}
function decision(raw: unknown, path: string): DrawingDecision {
  const v = object(raw, ['id', 'kind', 'featureId', 'prompt', 'resolution'], path);
  return { id: string(v.id, `${path}.id`), kind: choice(v.kind, ['datum', 'fit', 'tolerance', 'dimension', 'other'], `${path}.kind`),
    featureId: string(v.featureId, `${path}.featureId`), prompt: string(v.prompt, `${path}.prompt`),
    ...(v.resolution !== undefined ? { resolution: validateDrawingDecisionResolution(v.resolution, `${path}.resolution`) } : {}) };
}
function entries<T extends { id: string }>(raw: unknown, read: (v: unknown, p: string) => T, path: string): T[] {
  if (!Array.isArray(raw)) invalidDrawingReview(path, 'an array', raw);
  const seen = new Set<string>();
  return Array.from(raw, (v, i) => {
    const entry = read(v, `${path}[${i}]`);
    if (seen.has(entry.id)) invalidDrawingReview(path, `no duplicate IDs (${entry.id})`, entry.id);
    seen.add(entry.id);
    return entry;
  });
}
export function validateDrawingReviewPlan(raw: unknown, path = 'plan'): DrawingReviewPlan {
  const v = object(raw, ['id', 'requirements', 'decisions'], path);
  const requirements = entries(v.requirements, requirement, `${path}.requirements`);
  const decisions = entries(v.decisions, decision, `${path}.decisions`);
  if (!requirements.length && !decisions.length) invalidDrawingReview(path, 'at least one requirement or decision; empty plans are invalid', raw);
  return { id: string(v.id, `${path}.id`), requirements, decisions };
}
export function mergeDrawingReviewPlans(source: readonly DrawingReviewPlan[], options: readonly DrawingReviewPlan[] = []): DrawingReviewPlan[] {
  if (!Array.isArray(source) || !Array.isArray(options)) invalidDrawingReview('reviewPlans', 'an array of plans', options);
  return entries([...source, ...options], validateDrawingReviewPlan, 'reviewPlans');
}
/** Encode each ID separately so colons cannot collide across namespaces. */
export function drawingDecisionKey(planId: string, decisionId: string): string {
  return `${encodeURIComponent(planId)}:${encodeURIComponent(decisionId)}`;
}

function requirementStatus(requirement: Omit<DrawingRequirement, 'id'>, rows: readonly DrawingReviewAnnotation[]): DrawingRequirementStatus {
  const matches = rows.filter(row => row.id === requirement.annotationId);
  if (!matches.length) return 'missing';
  if (matches.length > 1) return 'ambiguous';
  const row = matches[0];
  if (row.source !== 'authored' || row.kind !== requirement.expectedKind) return 'kind-mismatch';
  if (row.suppressed) return 'hidden';
  if (row.overlapped) return 'crowded';
  if (requirement.role === 'critical' && row.originalText !== undefined) return 'label-overridden';
  return 'covered';
}
function resolvedDecisions(plans: readonly DrawingReviewPlan[], overrides: Readonly<Record<string, DrawingDecisionResolution>>): DrawingDecisionReview[] {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) invalidDrawingReview('decisionResolutions', 'an object keyed by drawingDecisionKey', overrides);
  const decisions = plans.flatMap(plan => plan.decisions.map(({ id, ...decision }) => ({ ...decision, planId: plan.id, decisionId: id, key: drawingDecisionKey(plan.id, id) })));
  const known = new Set(decisions.map(decision => decision.key));
  const validated = new Map<string, DrawingDecisionResolution>();
  for (const [key, value] of Object.entries(overrides)) {
    if (!known.has(key)) invalidDrawingReview(`decisionResolutions[${key}]`, 'a declared decision key', value);
    validated.set(key, validateDrawingDecisionResolution(value, `decisionResolutions[${key}]`));
  }
  return decisions.map(decision => ({ ...decision, ...(validated.has(decision.key) ? { resolution: validated.get(decision.key)! } : {}) }));
}
/** Coverage checks declared geometric callout presence, never engineering certification. */
export function evaluateDrawingReview(plans: readonly DrawingReviewPlan[], rows: readonly DrawingReviewAnnotation[], overrides: Readonly<Record<string, DrawingDecisionResolution>> = {}): DrawingReview {
  plans = mergeDrawingReviewPlans(plans);
  const decisions = resolvedDecisions(plans, overrides);
  const requirements = plans.flatMap(plan => plan.requirements.map(({ id, ...requirement }) => ({ ...requirement, planId: plan.id, requirementId: id, status: requirementStatus(requirement, rows) })));
  const critical = requirements.filter(requirement => requirement.role === 'critical');
  const coveredCriticalCount = critical.filter(requirement => requirement.status === 'covered').length;
  const unresolvedDecisionCount = decisions.filter(decision => !decision.resolution).length;
  return { status: !plans.length ? 'not-declared' : coveredCriticalCount === critical.length && !unresolvedDecisionCount ? 'complete' : 'incomplete',
    requirements, decisions, criticalCount: critical.length, coveredCriticalCount, decisionCount: decisions.length, unresolvedDecisionCount };
}

/** Validate all options before rendering or an architectural early return. */
export function validateDrawingReviewOptions(options: DrawingReviewOptions & { style?: string }, source: readonly DrawingReviewPlan[] = []): DrawingReviewPlan[] {
  if (options.requireCompleteReview !== undefined && typeof options.requireCompleteReview !== 'boolean') invalidDrawingReview('requireCompleteReview', 'a boolean', options.requireCompleteReview);
  const plans = mergeDrawingReviewPlans(source, options.reviewPlans);
  if (options.style === 'architectural') rejectArchitecturalReview(options, plans);
  evaluateDrawingReview(plans, [], options.decisionResolutions);
  return plans;
}
function rejectArchitecturalReview(options: DrawingReviewOptions, plans: readonly DrawingReviewPlan[]): void {
  if (plans.length || options.reviewPlans !== undefined || options.decisionResolutions !== undefined || options.requireCompleteReview) invalidDrawingReview('style', 'mechanical style for drawing review; architectural reviews are unsupported');
}

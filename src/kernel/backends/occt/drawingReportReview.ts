// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateDrawingReview, invalidDrawingReview } from '../../../shared/intent/drawingReview';
import { resolveDraftingProfile } from './draftingReview';
import type { DrawingReport } from './drawingAuto';
import type { SvgDrawingOptions } from './exportSvgDrawing';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../../shared/diagnostics/registry';

/** Complete review metadata after selecting the final placement pass. */
export function finalizeDrawingReview(report: DrawingReport | undefined, options: SvgDrawingOptions, diagnosticsOut: CompilerDiagnostic[]): void {
  const review = evaluateDrawingReview(options.reviewPlans ?? [], report?.annotations ?? [], options.decisionResolutions);
  if (options.requireCompleteReview && review.status !== 'complete') invalidDrawingReview('requireCompleteReview', `a complete declared review; current status is ${review.status}`);
  if (review.status === 'incomplete') diagnosticsOut.push({ target: 'export-occt', code: 'drawing.review.incomplete', severity: 'warn',
    message: 'Declared drawing review is incomplete: required geometric callouts or engineering decisions remain unresolved.',
    hint: 'Inspect report.review requirements and decisions; coverage is not fit, tolerance or manufacturing certification.',
    nextAction: NEXT_ACTIONS['drawing.review.incomplete'] });
  if (report) {
    report.review = review;
    report.suppressed = report.annotations.filter(a => a.suppressed).length;
    const profile = resolveDraftingProfile(options.draftingProfile);
    if (profile) report.draftingProfile = profile.id;
  }
  const ids = new Set(report?.annotations.map(a => a.id) ?? []);
  const missing = Object.keys(options.annotationOverrides ?? {}).filter(id => !ids.has(id));
  if (missing.length) diagnosticsOut.push({ target: 'export-occt', code: 'drawing.annotation.override-missing', severity: 'warn',
    message: `Drawing annotation override IDs not found: ${missing.join(', ')}.`,
    hint: 'Review the current report and remove or replace stale annotation IDs after geometry or dimension strategy changes.',
    nextAction: NEXT_ACTIONS['drawing.annotation.override-missing'] });
}

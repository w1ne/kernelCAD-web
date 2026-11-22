// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DrawingReport } from './drawingAuto/contracts';
import { SHEETS, SHEET_SERIES, type DrawingSheetSize, type DrawingViewName } from './drawingLayout';
import { analyzeExportedDrawingSvg, issue } from './drawingVisualQaSvg';
export { analyzeExportedDrawingSvg, readDrawingSvgPageSize, extractDrawingDimensionLabels } from './drawingVisualQaSvg';

export interface DrawingVisualQaOptions {
  /** Retry the export on progressively larger standard sheets when the
   *  serialized sheet has a layout defect that sheet size can address. */
  autoRepair?: boolean;
  /** Maximum number of larger-sheet retries. The hard ceiling is three. */
  maxAttempts?: number;
}

export type DrawingVisualQaIssueCode =
  | 'exported-sheet-invalid'
  | 'requested-view-missing'
  | 'requested-view-empty'
  | 'view-overflow'
  | 'dimension-overflow'
  | 'view-overlap'
  | 'title-block-obstruction'
  | 'text-clipping'
  | 'annotation-collision'
  | 'critical-dimension-missing'
  | 'critical-dimension-unresolved'
  | 'drawing-decision-unresolved'
  | 'pdf-readback-failed'
  | 'pdf-page-mismatch'
  | 'pdf-content-missing'
  | 'unsupported-drawing-style';

export interface DrawingVisualQaIssue {
  code: DrawingVisualQaIssueCode;
  severity: 'error' | 'warning';
  message: string;
  action: string;
  view?: DrawingViewName;
  otherView?: DrawingViewName;
  annotationId?: string;
  requirementId?: string;
  decisionId?: string;
  /** Location and extent in exported sheet millimetres, origin top-left. */
  location?: { x: number; y: number; width: number; height: number };
}

export interface DrawingVisualQaCheck {
  id: string;
  status: 'passed' | 'failed' | 'not-declared' | 'unsupported';
  message: string;
}

export interface DrawingVisualQaAttempt {
  attempt: number;
  sheet: string;
  issueCodes: DrawingVisualQaIssueCode[];
  layoutIssueCount: number;
  accepted: boolean;
  /** Which bounded correction was attempted. The first observation has none. */
  strategy?: 'annotation-offset' | 'larger-sheet';
}

export interface DrawingVisualQaPdfCheck {
  status: 'passed' | 'failed' | 'incomplete';
  pageCount: number;
  widthMm: number;
  heightMm: number;
  vectorPathCount: number;
  imageCount: number;
  missingText: string[];
}

export interface DrawingVisualQaReport {
  status: 'verified' | 'needs-review' | 'incomplete';
  source: 'exported-svg';
  checks: DrawingVisualQaCheck[];
  issues: DrawingVisualQaIssue[];
  attempts: DrawingVisualQaAttempt[];
  attemptCount: number;
  repaired: boolean;
  pdf?: DrawingVisualQaPdfCheck;
  limitations: string[];
}

const VIEW_NAMES: readonly DrawingViewName[] = ['front', 'top', 'left', 'iso'];
const LAYOUT_ISSUES = new Set<DrawingVisualQaIssueCode>([
  'view-overflow', 'dimension-overflow', 'view-overlap', 'title-block-obstruction', 'text-clipping', 'annotation-collision',
]);

function layoutIssueCount(report: DrawingVisualQaReport): number {
  return report.issues.filter(entry => LAYOUT_ISSUES.has(entry.code) && entry.severity === 'error').length;
}

function namedSheetFromSvg(svg: string): DrawingSheetSize | undefined {
  const named = /<svg\b[^>]*\bdata-kc-sheet="([^"]+)"/.exec(svg)?.[1]?.toLowerCase();
  if (named && named in SHEETS) return named as DrawingSheetSize;
  const match = /<svg\b[^>]*\bviewBox="[\d.]+[ ,]+[\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/.exec(svg);
  if (!match) return undefined;
  const width = Number(match[1]), height = Number(match[2]);
  return (Object.keys(SHEETS) as DrawingSheetSize[]).find(name => Math.abs(SHEETS[name].w - width) < 0.1 && Math.abs(SHEETS[name].h - height) < 0.1);
}

function nextSheet(sheet: DrawingSheetSize, start: DrawingSheetSize | undefined): DrawingSheetSize | undefined {
  const seriesName = sheet.startsWith('ansi-') || start?.startsWith('ansi-') ? 'ansi' : 'iso';
  const series = SHEET_SERIES[seriesName];
  const index = series.indexOf(sheet);
  return index >= 0 ? series[index + 1] : undefined;
}

export function validateDrawingVisualQaOptions(options: DrawingVisualQaOptions | undefined): DrawingVisualQaOptions | undefined {
  if (options === undefined) return undefined;
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new Error('visualQa must be an object.');
  if (options.autoRepair !== undefined && typeof options.autoRepair !== 'boolean') throw new Error('visualQa.autoRepair must be a boolean.');
  if (options.maxAttempts !== undefined && (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1 || options.maxAttempts > 3)) {
    throw new Error('visualQa.maxAttempts must be an integer from 1 to 3.');
  }
  return options;
}

interface DrawingVisualQaRunner<T> {
  initial: T;
  options: DrawingVisualQaOptions;
  requestedViews?: readonly DrawingViewName[];
  defaultSheet: DrawingSheetSize;
  readSvg: (artifact: T) => string;
  readReport: (artifact: T) => DrawingReport | undefined;
  render: (sheet: DrawingSheetSize) => Promise<T>;
  renderWithAnnotationOffsets?: (sheet: DrawingSheetSize, increments: Readonly<Record<string, number>>) => Promise<T>;
}

interface LayoutRepairPlan {
  sheet: DrawingSheetSize;
  offsets: Record<string, number>;
  strategy: 'annotation-offset' | 'larger-sheet';
}

function nextLayoutRepair<T>(
  input: DrawingVisualQaRunner<T>,
  report: DrawingVisualQaReport,
  sheet: DrawingSheetSize,
  offsets: Record<string, number>,
  triedOffsetRepair: boolean,
): LayoutRepairPlan | undefined {
  const crowded = report.issues.filter(entry => entry.code === 'annotation-collision' && entry.annotationId);
  if (!triedOffsetRepair && crowded.length && input.renderWithAnnotationOffsets) {
    const updated = { ...offsets };
    for (const entry of crowded) updated[entry.annotationId!] = (updated[entry.annotationId!] ?? 0) + 6;
    return { sheet, offsets: updated, strategy: 'annotation-offset' };
  }
  const larger = nextSheet(sheet, input.defaultSheet);
  return larger ? { sheet: larger, offsets, strategy: 'larger-sheet' } : undefined;
}

async function renderRepairCandidate<T>(input: DrawingVisualQaRunner<T>, plan: LayoutRepairPlan): Promise<T> {
  return input.renderWithAnnotationOffsets && Object.keys(plan.offsets).length > 0
    ? input.renderWithAnnotationOffsets(plan.sheet, plan.offsets)
    : input.render(plan.sheet);
}

/** Bounded repair, accepting only a reduction in actual serialized-sheet defects. */
export async function runDrawingVisualQa<T>(input: DrawingVisualQaRunner<T>): Promise<{
  artifact: T;
  report: DrawingVisualQaReport;
}> {
  const options = validateDrawingVisualQaOptions(input.options)!;
  let artifact = input.initial;
  let svg = input.readSvg(artifact);
  let report = analyzeExportedDrawingSvg(svg, { requestedViews: input.requestedViews, drawingReport: input.readReport(artifact) });
  const initialCount = layoutIssueCount(report);
  const attempts: DrawingVisualQaAttempt[] = [{ attempt: 0, sheet: namedSheetFromSvg(svg) ?? input.defaultSheet,
    issueCodes: [...new Set(report.issues.map(entry => entry.code))], layoutIssueCount: initialCount, accepted: true }];
  let sheet = namedSheetFromSvg(svg) ?? input.defaultSheet;
  let offsets: Record<string, number> = {};
  let triedOffsetRepair = false;
  let retryCount = 0;
  const retryLimit = options.autoRepair ? options.maxAttempts ?? 3 : 0;
  for (let attempt = 1; attempt <= retryLimit && layoutIssueCount(report) > 0; attempt++) {
    const plan = nextLayoutRepair(input, report, sheet, offsets, triedOffsetRepair);
    if (!plan) break;
    if (plan.strategy === 'annotation-offset') triedOffsetRepair = true;
    const candidate = await renderRepairCandidate(input, plan);
    const candidateSvg = input.readSvg(candidate);
    const candidateReport = analyzeExportedDrawingSvg(candidateSvg, {
      requestedViews: input.requestedViews, drawingReport: input.readReport(candidate) });
    retryCount++;
    const improves = layoutIssueCount(candidateReport) < layoutIssueCount(report);
    attempts.push({ attempt, sheet: plan.sheet, strategy: plan.strategy,
      issueCodes: [...new Set(candidateReport.issues.map(entry => entry.code))],
      layoutIssueCount: layoutIssueCount(candidateReport), accepted: improves });
    if (!improves && plan.strategy === 'larger-sheet') break;
    if (!improves) continue;
    artifact = candidate;
    svg = candidateSvg;
    report = candidateReport;
    sheet = plan.sheet;
    offsets = plan.offsets;
  }
  return { artifact, report: { ...report, attempts, attemptCount: retryCount,
    repaired: layoutIssueCount(report) < initialCount } };
}

interface PdfTextEvidenceInput {
  text: readonly string[];
  requestedViews?: readonly DrawingViewName[];
  dimensionLabels?: readonly string[];
}

function pdfTextEvidence(input: PdfTextEvidenceInput): { missingText: string[]; noDimensionEvidence: boolean } {
  const expectedViews = input.requestedViews ?? VIEW_NAMES;
  const captions: Record<DrawingViewName, string> = { front: 'FRONT', top: 'TOP', left: 'LEFT', iso: 'ISOMETRIC' };
  const text = input.text.join(' ').toUpperCase();
  const missingText = [
    ...expectedViews.map(view => captions[view]).filter(caption => !text.includes(caption)),
    ...['TITLE', 'PART NAME', 'SCALE', 'UNITS', 'SHEET', 'DATE'].filter(label => !text.includes(label)),
  ];
  const normalize = (value: string): string => value.toUpperCase().replace(/[^A-Z0-9.+/-]/g, '');
  const extracted = normalize(text);
  const requiredLabels = (input.dimensionLabels ?? []).map(normalize).filter(Boolean);
  const noDimensionEvidence = requiredLabels.length === 0;
  missingText.push(...requiredLabels.filter(label => !extracted.includes(label)));
  return { missingText, noDimensionEvidence };
}

interface PdfPageEvidence {
  pageCount: number;
  widthMm: number;
  heightMm: number;
  expectedWidthMm: number;
  expectedHeightMm: number;
  vectorPathCount: number;
  imageCount: number;
}

function pdfPageMismatch(input: PdfPageEvidence): boolean {
  return input.pageCount !== 1 || input.widthMm <= 0 || input.heightMm <= 0 ||
    Math.abs(input.widthMm - input.expectedWidthMm) > 0.1 ||
    Math.abs(input.heightMm - input.expectedHeightMm) > 0.1 ||
    input.vectorPathCount === 0 || input.imageCount > 0;
}

/** Attach checks performed against the final vector PDF bytes. The exporter
 *  builds this PDF from the exact SVG already analyzed above. */
export function attachDrawingPdfReadback(
  report: DrawingVisualQaReport,
  input: {
    pageCount: number;
    widthMm: number;
    heightMm: number;
    expectedWidthMm: number;
    expectedHeightMm: number;
    vectorPathCount: number;
    imageCount: number;
    text: readonly string[];
    requestedViews?: readonly DrawingViewName[];
    dimensionLabels?: readonly string[];
  },
): DrawingVisualQaReport {
  const { missingText, noDimensionEvidence } = pdfTextEvidence(input);
  const dimensionMismatch = pdfPageMismatch(input);
  const contentMismatch = missingText.length > 0 || noDimensionEvidence;
  const pdf: DrawingVisualQaPdfCheck = {
    status: dimensionMismatch ? 'failed' : contentMismatch ? 'incomplete' : 'passed',
    pageCount: input.pageCount, widthMm: input.widthMm, heightMm: input.heightMm,
    vectorPathCount: input.vectorPathCount, imageCount: input.imageCount, missingText,
  };
  const issues = [...report.issues];
  if (dimensionMismatch) issues.push(issue('pdf-page-mismatch', 'The exported PDF readback does not match the expected one-page vector drawing.', 'Check the PDF conversion path and retain the SVG/PDF bytes for diagnosis.'));
  if (contentMismatch) issues.push(issue('pdf-content-missing', noDimensionEvidence ? 'No source dimension labels available to verify PDF.' : 'Required SVG dimension text missing from PDF: ' + missingText.join(', '), 'Check the PDF text layer against source dimensions.'));
  return {
    ...report,
    pdf,
    issues,
    status: dimensionMismatch ? 'needs-review' : contentMismatch && report.status !== 'needs-review' ? 'incomplete' : report.status,
  };
}

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DrawingReport } from './drawingAuto/contracts';
import { SHEETS, SHEET_SERIES, type DrawingSheetSize, type DrawingViewName } from './drawingLayout';

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

interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface SvgNode {
  tag: string;
  attrs: Record<string, string>;
  parent?: SvgNode;
  children: SvgNode[];
  text: string;
}

const VIEW_NAMES: readonly DrawingViewName[] = ['front', 'top', 'left', 'iso'];
const LAYOUT_ISSUES = new Set<DrawingVisualQaIssueCode>([
  'view-overflow', 'view-overlap', 'title-block-obstruction', 'text-clipping', 'annotation-collision',
]);
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|quot|apos|amp);/gi, (_, entity: string) => {
    const e = entity.toLowerCase();
    if (e === 'lt') return '<';
    if (e === 'gt') return '>';
    if (e === 'quot') return '"';
    if (e === 'apos') return "'";
    if (e === 'amp') return '&';
    const code = e.startsWith('#x') ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    try { return String.fromCodePoint(code); } catch { return ''; }
  });
}

function parseSvg(svg: string): SvgNode | undefined {
  const document: SvgNode = { tag: '#document', attrs: {}, children: [], text: '' };
  const stack = [document];
  const token = /<!--[\s\S]*?-->|<\/?[\w:.-]+(?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*\s*\/?>|[^<]+/g;
  for (const match of svg.matchAll(token)) {
    const raw = match[0];
    if (raw.startsWith('<!--') || raw.startsWith('<?') || raw.startsWith('<!')) continue;
    const top = stack[stack.length - 1]!;
    if (!raw.startsWith('<')) {
      top.text += decodeEntities(raw);
      continue;
    }
    const opening = /^<([\w:.-]+)/.exec(raw);
    const closing = /^<\/([\w:.-]+)/.exec(raw);
    if (closing) {
      if (stack.length <= 1 || stack[stack.length - 1]!.tag !== closing[1]) return undefined;
      stack.pop();
      continue;
    }
    if (!opening) continue;
    const attrs: Record<string, string> = {};
    const attrSrc = raw.slice(opening[0].length, raw.length - (raw.endsWith('/>') ? 2 : 1));
    for (const a of attrSrc.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      attrs[a[1]!] = decodeEntities(a[2] ?? a[3] ?? '');
    }
    const node: SvgNode = { tag: opening[1]!, attrs, parent: top, children: [], text: '' };
    top.children.push(node);
    if (!raw.endsWith('/>')) stack.push(node);
  }
  if (stack.length !== 1) return undefined;
  return document.children.find(node => node.tag === 'svg');
}

function descendants(node: SvgNode, tag?: string): SvgNode[] {
  const out: SvgNode[] = [];
  for (const child of node.children) {
    if (tag === undefined || child.tag === tag) out.push(child);
    out.push(...descendants(child, tag));
  }
  return out;
}

function numberAttr(node: SvgNode, key: string): number | undefined {
  const value = Number.parseFloat(node.attrs[key] ?? '');
  return Number.isFinite(value) ? value : undefined;
}

function pathBounds(d: string): Bounds | undefined {
  const commands = [...d.matchAll(/([ML])\s*(-?(?:\d+\.?\d*|\.\d+))\s*,?\s*(-?(?:\d+\.?\d*|\.\d+))/g)];
  if (commands.length === 0) return undefined;
  const xs = commands.map(m => Number(m[2]));
  const ys = commands.map(m => Number(m[3]));
  if (![...xs, ...ys].every(Number.isFinite)) return undefined;
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

function union(a: Bounds | undefined, b: Bounds | undefined): Bounds | undefined {
  if (!a) return b;
  if (!b) return a;
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}

function boundsOf(node: SvgNode): Bounds | undefined {
  return descendants(node, 'path').reduce<Bounds | undefined>((bounds, path) => union(bounds, pathBounds(path.attrs.d ?? '')), undefined);
}

/** A dimension group may contain lines and text rather than SVG paths. */
function annotationBounds(node: SvgNode): Bounds | undefined {
  let result = boundsOf(node);
  for (const child of descendants(node)) {
    if (child.tag === 'text') {
      result = union(result, textBounds(child));
    } else if (child.tag === 'line') {
      const x1 = numberAttr(child, 'x1'), x2 = numberAttr(child, 'x2');
      const y1 = numberAttr(child, 'y1'), y2 = numberAttr(child, 'y2');
      if (x1 !== undefined && x2 !== undefined && y1 !== undefined && y2 !== undefined) {
        result = union(result, { x0: Math.min(x1, x2), y0: Math.min(y1, y2), x1: Math.max(x1, x2), y1: Math.max(y1, y2) });
      }
    }
  }
  return result;
}

function intersects(a: Bounds, b: Bounds, minExtent = 0.5): Bounds | undefined {
  const x0 = Math.max(a.x0, b.x0), y0 = Math.max(a.y0, b.y0);
  const x1 = Math.min(a.x1, b.x1), y1 = Math.min(a.y1, b.y1);
  return x1 - x0 >= minExtent && y1 - y0 >= minExtent ? { x0, y0, x1, y1 } : undefined;
}

function location(b: Bounds): DrawingVisualQaIssue['location'] {
  return { x: b.x0, y: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0 };
}

function sheetSizeFromSvg(svgRoot: SvgNode): { width: number; height: number; named?: DrawingSheetSize } | undefined {
  const viewBox = (svgRoot.attrs.viewBox ?? '').trim().split(/[\s,]+/).map(Number);
  if (viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2]! <= 0 || viewBox[3]! <= 0) return undefined;
  const named = (svgRoot.attrs['data-kc-sheet'] ?? '').toLowerCase() as DrawingSheetSize;
  const known = named in SHEETS ? named : undefined;
  return { width: viewBox[2]!, height: viewBox[3]!, ...(known ? { named: known } : {}) };
}

export function readDrawingSvgPageSize(svg: string): { width: number; height: number } | undefined {
  const root = parseSvg(svg);
  const size = root && sheetSizeFromSvg(root);
  return size ? { width: size.width, height: size.height } : undefined;
}

function textBounds(node: SvgNode): Bounds | undefined {
  const x = numberAttr(node, 'x'), y = numberAttr(node, 'y');
  if (x === undefined || y === undefined) return undefined;
  const size = numberAttr(node, 'font-size') ?? 3;
  const text = descendantsText(node).trim();
  const width = Math.max(size * 0.35, [...text].length * size * 0.58);
  const anchor = node.attrs['text-anchor'] ?? 'start';
  let x0 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  let x1 = anchor === 'middle' ? x + width / 2 : anchor === 'end' ? x : x + width;
  let y0 = y - size * 0.9, y1 = y + size * 0.25;
  const transform = node.attrs.transform;
  if (transform) {
    const rotate = /rotate\(\s*(-?\d+(?:\.\d+)?)\s*(?:[,\s]+\s*(-?\d+(?:\.\d+)?)[,\s]+\s*(-?\d+(?:\.\d+)?))?\s*\)/.exec(transform);
    if (rotate) {
      const angle = Number(rotate[1]) * Math.PI / 180;
      const cx = Number(rotate[2] ?? 0), cy = Number(rotate[3] ?? 0);
      const points = [[x0, y0], [x0, y1], [x1, y0], [x1, y1]].map(([px, py]) => {
        const dx = px! - cx, dy = py! - cy;
        return [cx + dx * Math.cos(angle) - dy * Math.sin(angle), cy + dx * Math.sin(angle) + dy * Math.cos(angle)];
      });
      x0 = Math.min(...points.map(p => p[0]!)); x1 = Math.max(...points.map(p => p[0]!));
      y0 = Math.min(...points.map(p => p[1]!)); y1 = Math.max(...points.map(p => p[1]!));
    }
  }
  return { x0, y0, x1, y1 };
}

function descendantsText(node: SvgNode): string {
  return node.text + node.children.map(descendantsText).join('');
}

function issue(
  code: DrawingVisualQaIssueCode,
  message: string,
  action: string,
  extra: Partial<Pick<DrawingVisualQaIssue, 'view' | 'otherView' | 'annotationId' | 'requirementId' | 'decisionId' | 'location'>> = {},
  severity: DrawingVisualQaIssue['severity'] = 'error',
): DrawingVisualQaIssue {
  return { code, severity, message, action, ...extra };
}

/** Read the serialized drawing sheet, including its view paths, labels and
 *  title block, and compare it with declared view/dimension requirements. */
export function analyzeExportedDrawingSvg(
  svg: string,
  input: { requestedViews?: readonly DrawingViewName[]; drawingReport?: DrawingReport },
): DrawingVisualQaReport {
  const root = parseSvg(svg);
  if (!root || root.attrs['data-kc-format'] !== 'svg-drawing') {
    const problem = issue('exported-sheet-invalid', 'The exported bytes do not contain a readable kernelCAD drawing SVG.', 'Re-export the drawing and preserve the SVG output for diagnosis.');
    return {
      status: 'incomplete', source: 'exported-svg', issues: [problem],
      checks: [{ id: 'svg-parse', status: 'failed', message: problem.message }],
      attempts: [], attemptCount: 0, repaired: false,
      limitations: ['No drawing checks can be trusted until the exported SVG parses.'],
    };
  }

  const sheet = sheetSizeFromSvg(root);
  if (!sheet) {
    const problem = issue('exported-sheet-invalid', 'The exported SVG has no valid finite sheet viewBox.', 'Re-export with a supported drawing sheet size.');
    return {
      status: 'incomplete', source: 'exported-svg', issues: [problem],
      checks: [{ id: 'sheet-size', status: 'failed', message: problem.message }],
      attempts: [], attemptCount: 0, repaired: false,
      limitations: ['The sheet extent could not be read.'],
    };
  }

  const issues: DrawingVisualQaIssue[] = [];
  const checks: DrawingVisualQaCheck[] = [];
  const all = descendants(root);
  const views = new Map<DrawingViewName, { node: SvgNode; bounds?: Bounds }>();
  for (const node of all) {
    const name = node.attrs['data-view'] as DrawingViewName | undefined;
    if (name && VIEW_NAMES.includes(name)) views.set(name, { node, bounds: boundsOf(node) });
  }
  const requested = input.requestedViews ?? VIEW_NAMES;
  const missing = requested.filter(name => !views.has(name));
  if (missing.length) {
    for (const name of missing) issues.push(issue('requested-view-missing', `Requested ${name} view is missing from the exported sheet.`, `Include the ${name} view in the export options or remove it from the drawing requirements.`, { view: name }));
    checks.push({ id: 'requested-views', status: 'failed', message: `Missing requested views: ${missing.join(', ')}.` });
  } else checks.push({ id: 'requested-views', status: 'passed', message: `${requested.length} requested view(s) are present in the exported SVG.` });

  // A group with the expected caption but no projected outline is not a
  // generated view. Surface this independently from a missing group.
  for (const name of requested) {
    if (views.has(name) && !views.get(name)?.bounds) {
      issues.push(issue('requested-view-empty', `The requested ${name} view has no exported projection geometry.`, 'Check that this view is not degenerate and export the drawing again.', { view: name }));
    }
  }
  let overflowCount = 0;
  for (const [name, view] of views) {
    const b = view.bounds;
    if (!b) continue;
    if (b.x0 < -0.5 || b.y0 < -0.5 || b.x1 > sheet.width + 0.5 || b.y1 > sheet.height + 0.5) {
      overflowCount++;
      issues.push(issue('view-overflow', `The ${name} view extends beyond the exported sheet bounds.`, 'Retry on the next larger standard sheet, then inspect the regenerated view placement.', { view: name, location: location(b) }));
    }
  }
  checks.push({ id: 'view-bounds', status: overflowCount ? 'failed' : 'passed', message: overflowCount ? `${overflowCount} view(s) extend outside the page.` : 'All exported view geometry fits within the page viewBox.' });

  let overlapCount = 0;
  const placed = [...views.entries()].filter((row): row is [DrawingViewName, { node: SvgNode; bounds: Bounds }] => row[1].bounds !== undefined);
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
    const [name, a] = placed[i]!; const [otherName, b] = placed[j]!;
    const overlap = intersects(a.bounds, b.bounds, 1);
    if (!overlap) continue;
    overlapCount++;
    issues.push(issue('view-overlap', `The ${name} and ${otherName} view geometry bounds overlap on the exported sheet.`, 'Retry on a larger standard sheet and inspect whether the visible outlines still touch.', { view: name, otherView: otherName, location: location(overlap) }));
  }
  checks.push({ id: 'view-separation', status: overlapCount ? 'failed' : 'passed', message: overlapCount ? `${overlapCount} view pair(s) overlap by at least 1 mm in both axes.` : 'No exported view bounds overlap by 1 mm or more.' });

  const titleGroup = all.find(node => node.tag === 'g' && node.attrs.id === 'title-block');
  const titleRect = titleGroup && descendants(titleGroup, 'rect').map(rect => {
    const x = numberAttr(rect, 'x'), y = numberAttr(rect, 'y'), w = numberAttr(rect, 'width'), h = numberAttr(rect, 'height');
    return x === undefined || y === undefined || w === undefined || h === undefined ? undefined : { x0: x, y0: y, x1: x + w, y1: y + h };
  }).find((rect): rect is Bounds => rect !== undefined);
  let titleObstructions = 0;
  if (titleRect) {
    for (const [name, view] of placed) {
      const overlap = intersects(view.bounds, titleRect, 1);
      if (!overlap) continue;
      titleObstructions++;
      issues.push(issue('title-block-obstruction', `The ${name} view geometry overlaps the title block.`, 'Retry on a larger standard sheet or review the drawing layout before export.', { view: name, location: location(overlap) }));
    }
  }
  if (titleRect) {
    for (const node of all.filter(n => n.attrs['data-kc-annotation-id'])) {
      const b = annotationBounds(node);
      const overlap = b && intersects(b, titleRect, 1);
      if (!overlap) continue;
      titleObstructions++;
      const annotationId = node.attrs['data-kc-annotation-id']!;
      issues.push(issue('annotation-collision', `Dimension ${annotationId} overlaps the title block.`, 'Move the annotation using its existing offset control, or try a larger standard sheet.', { annotationId, location: location(overlap) }));
    }
  }
  checks.push({ id: 'title-block-clearance', status: titleObstructions ? 'failed' : 'passed', message: titleObstructions ? `${titleObstructions} drawing element(s) intersect the title block.` : titleRect ? 'The exported view and dimension geometry clear the title block.' : 'No title block rectangle is present.' });

  let clippedText = 0;
  for (const textNode of descendants(root, 'text')) {
    const b = textBounds(textNode);
    if (!b || (b.x0 >= -0.5 && b.y0 >= -0.5 && b.x1 <= sheet.width + 0.5 && b.y1 <= sheet.height + 0.5)) continue;
    clippedText++;
    const parentView = ancestorView(textNode);
    issues.push(issue('text-clipping', `Text${parentView ? ` in the ${parentView} view` : ''} extends outside the exported page.`, 'Increase the sheet size or shorten/reposition the affected label.', { ...(parentView ? { view: parentView } : {}), location: location(b) }));
  }
  checks.push({ id: 'text-bounds', status: clippedText ? 'failed' : 'passed', message: clippedText ? `${clippedText} text label(s) extend outside the page.` : 'All exported text estimates fit inside the page.' });

  const report = input.drawingReport;
  const crowded = report?.annotations.filter(annotation => annotation.overlapped) ?? [];
  for (const annotation of crowded) {
    const group = all.find(node => node.attrs['data-kc-annotation-id'] === annotation.id);
    const b = group ? annotationBounds(group) : undefined;
    issues.push(issue('annotation-collision', `Annotation ${annotation.id} (${annotation.text}) remains crowded on the exported sheet.`, 'Inspect the annotation report and adjust its view or extra offset; the QA pass does not alter dimension values.', { annotationId: annotation.id, ...(b ? { location: location(b) } : {}) }));
  }
  checks.push({ id: 'annotation-placement', status: crowded.length ? 'failed' : report ? 'passed' : 'not-declared', message: report ? `${crowded.length} of ${report.annotations.length} reported annotation(s) remain crowded.` : 'No annotation placement report was produced.' });

  const review = report?.review;
  if (!review || review.status === 'not-declared') {
    checks.push({ id: 'critical-dimensions', status: 'not-declared', message: 'No declared dimension requirement plan was supplied; dimension completeness was not checked.' });
    checks.push({ id: 'drafting-decisions', status: 'not-declared', message: 'No declared drafting decision plan was supplied.' });
  } else {
    const critical = review.requirements.filter(requirement => requirement.role === 'critical' && requirement.status !== 'covered');
    for (const requirement of critical) {
      const missing = requirement.status === 'missing';
      issues.push(issue(
        missing ? 'critical-dimension-missing' : 'critical-dimension-unresolved',
        missing
          ? `Critical dimension '${requirement.requirementId}' is missing (${requirement.reason}).`
          : `Critical dimension '${requirement.requirementId}' is ${requirement.status} (${requirement.reason}).`,
        `Add or restore the authored '${requirement.annotationId}' ${requirement.expectedKind} dimension, then export and review the sheet again.`,
        { requirementId: requirement.requirementId },
      ));
    }
    checks.push({ id: 'critical-dimensions', status: critical.length ? 'failed' : 'passed', message: critical.length ? `${critical.length} critical dimension requirement(s) are unresolved.` : `${review.coveredCriticalCount} declared critical dimension requirement(s) are covered.` });
    const unresolved = review.decisions.filter(decision => !decision.resolution);
    for (const decision of unresolved) issues.push(issue('drawing-decision-unresolved', `Drafting decision '${decision.decisionId}' is unresolved: ${decision.prompt}`, `Resolve '${decision.key}' with an engineering note and provenance; this workflow does not invent the decision.`, { decisionId: decision.decisionId }));
    checks.push({ id: 'drafting-decisions', status: unresolved.length ? 'failed' : 'passed', message: unresolved.length ? `${unresolved.length} declared drafting decision(s) remain unresolved.` : `${review.decisions.length} declared drafting decision(s) are resolved.` });
  }

  const requiredText = root.attrs['data-kc-format'] === 'svg-drawing';
  const blocking = issues.some(entry => entry.severity === 'error');
  return {
    status: blocking ? 'needs-review' : 'verified', source: 'exported-svg', checks, issues,
    attempts: [], attemptCount: 0, repaired: false,
    limitations: [
      ...(requiredText ? [] : ['The exported format is not a drawing SVG.']),
      'Text extents are estimated from SVG font size and text length; this is a layout check, not an engineering-standard or manufacturing compliance review.',
      'Only declared critical dimensions and drafting decisions can be checked for completeness; undeclared requirements remain unknown.',
    ],
  };
}

function ancestorView(node: SvgNode): DrawingViewName | undefined {
  for (let parent = node.parent; parent; parent = parent.parent) {
    const name = parent.attrs['data-view'] as DrawingViewName | undefined;
    if (name && VIEW_NAMES.includes(name)) return name;
  }
  return undefined;
}

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

/** Analyze one actual SVG export, then retry through the same renderer on a
 *  larger standard sheet. A candidate is kept only when the serialized sheet
 *  has fewer layout defects. */
export async function runDrawingVisualQa<T>(input: {
  initial: T;
  options: DrawingVisualQaOptions;
  requestedViews?: readonly DrawingViewName[];
  defaultSheet: DrawingSheetSize;
  readSvg: (artifact: T) => string;
  readReport: (artifact: T) => DrawingReport | undefined;
  render: (sheet: DrawingSheetSize) => Promise<T>;
  /** Optional same-sheet adjustment using the existing authored/automatic annotation overrides. */
  renderWithAnnotationOffsets?: (sheet: DrawingSheetSize, increments: Readonly<Record<string, number>>) => Promise<T>;
}): Promise<{ artifact: T; report: DrawingVisualQaReport }> {
  const options = validateDrawingVisualQaOptions(input.options)!;
  let artifact = input.initial;
  let svg = input.readSvg(artifact);
  let report = analyzeExportedDrawingSvg(svg, { requestedViews: input.requestedViews, drawingReport: input.readReport(artifact) });
  const initialIssues = report.issues;
  const attempts: DrawingVisualQaAttempt[] = [{
    attempt: 0,
    sheet: namedSheetFromSvg(svg) ?? input.defaultSheet,
    issueCodes: [...new Set(report.issues.map(entry => entry.code))],
    layoutIssueCount: layoutIssueCount(report),
    accepted: true,
  }];
  const retryLimit = options.autoRepair ? options.maxAttempts ?? 3 : 0;
  let currentSheet = namedSheetFromSvg(svg) ?? input.defaultSheet;
  let annotationOffsets: Record<string, number> = {};
  let triedOffsetRepair = false;
  let retryCount = 0;
  for (let attempt = 1; attempt <= retryLimit && layoutIssueCount(report) > 0; attempt++) {
    const crowdedIds = report.issues
      .filter(entry => entry.code === 'annotation-collision' && entry.annotationId)
      .map(entry => entry.annotationId!);
    // Prefer moving the affected dimensions rather than unnecessarily growing
    // the whole sheet. These offsets never change any value or source geometry.
    const adjustAnnotations = !triedOffsetRepair && crowdedIds.length > 0 && !!input.renderWithAnnotationOffsets;
    const candidate = adjustAnnotations ? currentSheet : nextSheet(currentSheet, input.defaultSheet);
    if (!candidate) break;
    let candidateOffsets = annotationOffsets;
    if (adjustAnnotations) {
      triedOffsetRepair = true;
      candidateOffsets = { ...annotationOffsets };
      for (const id of crowdedIds) candidateOffsets[id] = (candidateOffsets[id] ?? 0) + 6;
    }
    const candidateArtifact = input.renderWithAnnotationOffsets && Object.keys(candidateOffsets).length > 0
      ? await input.renderWithAnnotationOffsets(candidate, candidateOffsets)
      : await input.render(candidate);
    const candidateSvg = input.readSvg(candidateArtifact);
    const candidateReport = analyzeExportedDrawingSvg(candidateSvg, {
      requestedViews: input.requestedViews,
      drawingReport: input.readReport(candidateArtifact),
    });
    retryCount++;
    const improves = layoutIssueCount(candidateReport) < layoutIssueCount(report);
    attempts.push({
      attempt,
      sheet: candidate,
      strategy: adjustAnnotations ? 'annotation-offset' : 'larger-sheet',
      issueCodes: [...new Set(candidateReport.issues.map(entry => entry.code))],
      layoutIssueCount: layoutIssueCount(candidateReport),
      accepted: improves,
    });
    if (!improves) {
      // A failed same-sheet nudge may still benefit from a larger sheet.
      if (adjustAnnotations) continue;
      break;
    }
    artifact = candidateArtifact;
    svg = candidateSvg;
    report = candidateReport;
    currentSheet = candidate;
    annotationOffsets = candidateOffsets;
  }
  const repaired = retryCount > 0 && layoutIssueCount(report) < layoutIssueCount({ ...report, issues: initialIssues });
  return {
    artifact,
    report: {
      ...report,
      attempts,
      attemptCount: retryCount,
      repaired,
    },
  };
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
  },
): DrawingVisualQaReport {
  const expectedViews = input.requestedViews ?? VIEW_NAMES;
  const captions: Record<DrawingViewName, string> = { front: 'FRONT', top: 'TOP', left: 'LEFT', iso: 'ISOMETRIC' };
  const text = input.text.join(' ').toUpperCase();
  const missingText = [
    ...expectedViews.map(view => captions[view]).filter(caption => !text.includes(caption)),
    ...['TITLE', 'PART NAME', 'SCALE', 'UNITS', 'SHEET', 'DATE'].filter(label => !text.includes(label)),
  ];
  const dimensionMismatch = input.pageCount !== 1 || input.widthMm <= 0 || input.heightMm <= 0 ||
    Math.abs(input.widthMm - input.expectedWidthMm) > 0.1 || Math.abs(input.heightMm - input.expectedHeightMm) > 0.1 ||
    input.vectorPathCount === 0 || input.imageCount > 0;
  const contentMismatch = missingText.length > 0;
  const pdf: DrawingVisualQaPdfCheck = {
    status: dimensionMismatch ? 'failed' : contentMismatch ? 'incomplete' : 'passed',
    pageCount: input.pageCount, widthMm: input.widthMm, heightMm: input.heightMm,
    vectorPathCount: input.vectorPathCount, imageCount: input.imageCount, missingText,
  };
  const issues = [...report.issues];
  if (dimensionMismatch) issues.push(issue('pdf-page-mismatch', 'The exported PDF readback does not match the expected one-page vector drawing.', 'Check the PDF conversion path and retain the SVG/PDF bytes for diagnosis.'));
  if (contentMismatch) issues.push(issue('pdf-content-missing', `The exported PDF is missing expected text: ${missingText.join(', ')}.`, 'Re-export the drawing and verify the PDF text layer and title block.'));
  return {
    ...report,
    pdf,
    issues,
    status: dimensionMismatch ? 'needs-review' : contentMismatch && report.status === 'verified' ? 'incomplete' : report.status,
  };
}

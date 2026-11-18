// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// SVG readback and layout checks. The drawing remains the source of truth.
import { SHEETS, type DrawingSheetSize, type DrawingViewName } from './drawingLayout';
import type { DrawingReport } from './drawingAuto/contracts';
import { runAdvanceEm, textRuns } from '../../export/pdf/helveticaMetrics';
import { effectiveStyle, parseTransform } from '../../export/pdf/svgSheetToPdf';
import { measureSvgPath, nodeMatrix, transformPoint, transformRectangle } from './drawingSvgPathBounds';
import type { DrawingVisualQaCheck, DrawingVisualQaIssue, DrawingVisualQaIssueCode, DrawingVisualQaReport } from './drawingVisualQa';

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

function visitSvgTag(raw: string, stack: SvgNode[]): boolean {
  const closing = /^<\/([\w:.-]+)/.exec(raw);
  if (closing) {
    if (stack.length <= 1 || stack[stack.length - 1]!.tag !== closing[1]) return false;
    stack.pop();
    return true;
  }
  const opening = /^<([\w:.-]+)/.exec(raw);
  if (!opening) return true;
  const attrs: Record<string, string> = {};
  const attrSrc = raw.slice(opening[0].length, raw.length - (raw.endsWith('/>') ? 2 : 1));
  for (const match of attrSrc.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attrs[match[1]!] = decodeEntities(match[2] ?? match[3] ?? '');
  }
  const top = stack[stack.length - 1]!;
  const node: SvgNode = { tag: opening[1]!, attrs, parent: top, children: [], text: '' };
  top.children.push(node);
  if (!raw.endsWith('/>')) stack.push(node);
  return true;
}

function parseSvg(svg: string): SvgNode | undefined {
  const document: SvgNode = { tag: '#document', attrs: {}, children: [], text: '' };
  const stack = [document];
  const tokens = /<!--[\s\S]*?-->|<\/?[\w:.-]+(?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*\s*\/?>|[^<]+/g;
  for (const match of svg.matchAll(tokens)) {
    const raw = match[0];
    if (raw.startsWith('<!--') || raw.startsWith('<?') || raw.startsWith('<!')) continue;
    if (raw.startsWith('<')) {
      if (!visitSvgTag(raw, stack)) return undefined;
    } else stack[stack.length - 1]!.text += decodeEntities(raw);
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

function union(a: Bounds | undefined, b: Bounds | undefined): Bounds | undefined {
  if (!a) return b;
  if (!b) return a;
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}

function boundsOf(node: SvgNode): Bounds | undefined {
  return descendants(node, 'path').reduce<Bounds | undefined>((bounds, path) => union(bounds, measureSvgPath(path.attrs.d ?? '', nodeMatrix(path))), undefined);
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
        const points = [transformPoint(x1, y1, nodeMatrix(child)),
          transformPoint(x2, y2, nodeMatrix(child))];
        result = union(result, { x0: Math.min(...points.map(pt => pt[0])), y0: Math.min(...points.map(pt => pt[1])),
          x1: Math.max(...points.map(pt => pt[0])), y1: Math.max(...points.map(pt => pt[1])) });
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

type Affine = readonly [number, number, number, number, number, number];
const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

function multiply(a: Affine, b: Affine): Affine {
  return [
    a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

/** Follow the same inherited text styles and affine transforms as vector PDF export. */
function paintedTextContext(node: SvgNode): { style: Record<string, string>; matrix: Affine } {
  const chain: SvgNode[] = [];
  for (let current: SvgNode | undefined = node; current; current = current.parent) chain.unshift(current);
  let style: Record<string, string> = {};
  let matrix: Affine = IDENTITY;
  for (const current of chain) {
    style = effectiveStyle(style, current.attrs);
    matrix = multiply(matrix, parseTransform(current.attrs.transform) ?? IDENTITY);
  }
  return { style, matrix };
}

function textBounds(node: SvgNode): Bounds | undefined {
  const text = node.text.replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  const { style, matrix } = paintedTextContext(node);
  if (style.fill === 'none') return undefined;
  const rawSize = Number.parseFloat(style['font-size'] ?? '');
  const size = Number.isFinite(rawSize) ? rawSize : 16;
  if (size <= 0) return undefined;
  const x = (numberAttr(node, 'x') ?? 0) + (numberAttr(node, 'dx') ?? 0);
  const y = (numberAttr(node, 'y') ?? 0) + (numberAttr(node, 'dy') ?? 0);
  const weight = style['font-weight'];
  const bold = weight === 'bold' || weight === 'bolder' || Number(weight) >= 600;
  const width = textRuns(text).reduce((total, run) => total + runAdvanceEm(run, bold), 0) * size;
  const anchor = style['text-anchor'];
  const left = x - (anchor === 'middle' ? width / 2 : anchor === 'end' ? width : 0);
  const corners = [[left, y - 0.8 * size], [left + width, y - 0.8 * size],
    [left + width, y + 0.25 * size], [left, y + 0.25 * size]]
    .map(([px, py]) => [matrix[0] * px! + matrix[2] * py! + matrix[4],
      matrix[1] * px! + matrix[3] * py! + matrix[5]]);
  const xs = corners.map(p => p[0]!), ys = corners.map(p => p[1]!);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

function descendantsText(node: SvgNode): string {
  return node.text + node.children.map(descendantsText).join('');
}

export function issue(
  code: DrawingVisualQaIssueCode,
  message: string,
  action: string,
  extra: Partial<Pick<DrawingVisualQaIssue, 'view' | 'otherView' | 'annotationId' | 'requirementId' | 'decisionId' | 'location'>> = {},
  severity: DrawingVisualQaIssue['severity'] = 'error',
): DrawingVisualQaIssue {
  return { code, severity, message, action, ...extra };
}

function dimensionPrimitiveBounds(node: SvgNode): Bounds | undefined {
  const matrix = nodeMatrix(node);
  if (node.tag === 'path') return measureSvgPath(node.attrs.d ?? '', matrix);
  if (node.tag === 'line') {
    const x1 = numberAttr(node, 'x1'), x2 = numberAttr(node, 'x2');
    const y1 = numberAttr(node, 'y1'), y2 = numberAttr(node, 'y2');
    if (x1 === undefined || x2 === undefined || y1 === undefined || y2 === undefined) return undefined;
    const points = [transformPoint(x1, y1, matrix), transformPoint(x2, y2, matrix)];
    return { x0: Math.min(...points.map(p => p[0])), y0: Math.min(...points.map(p => p[1])),
      x1: Math.max(...points.map(p => p[0])), y1: Math.max(...points.map(p => p[1])) };
  }
  if (node.tag === 'polyline' || node.tag === 'polygon') {
    const pts = (node.attrs.points ?? '').trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (pts.length < 2 || pts.length % 2 !== 0 || !pts.every(Number.isFinite)) return undefined;
    const points: Array<readonly [number, number]> = [];
    for (let i = 0; i < pts.length; i += 2) points.push(transformPoint(pts[i]!, pts[i + 1]!, matrix));
    return { x0: Math.min(...points.map(p => p[0])), y0: Math.min(...points.map(p => p[1])),
      x1: Math.max(...points.map(p => p[0])), y1: Math.max(...points.map(p => p[1])) };
  }
  return undefined;
}

function outOfSheet(bounds: Bounds, sheet: { width: number; height: number }): boolean {
  return bounds.x0 < -0.5 || bounds.y0 < -0.5 ||
    bounds.x1 > sheet.width + 0.5 || bounds.y1 > sheet.height + 0.5;
}

/** Inspect the default dimensions as well as user-authored dimension groups. */
function checkDimensionGeometry(input: {
  all: SvgNode[];
  sheet: { width: number; height: number };
  titleRect: Bounds | undefined;
  issues: DrawingVisualQaIssue[];
  checks: DrawingVisualQaCheck[];
}): void {
  const dimensions = input.all.find(node => node.tag === 'g' && node.attrs.id === 'dimensions');
  if (!dimensions) return;
  let outside = 0, obstructed = 0;
  for (const node of descendants(dimensions)) {
    const bounds = dimensionPrimitiveBounds(node);
    if (!bounds) continue;
    if (outOfSheet(bounds, input.sheet)) {
      outside++;
      input.issues.push(issue('dimension-overflow', 'Dimension extends off the drawing sheet.',
        'Reposition it or select a larger sheet.', { location: location(bounds) }));
    }
    const overlap = input.titleRect && intersects(bounds, input.titleRect, 0.1);
    if (!overlap) continue;
    obstructed++;
    input.issues.push(issue('title-block-obstruction', 'Dimension crosses the title block.',
      'Reposition the dimension or select a larger sheet.', { location: location(overlap) }));
  }
  input.checks.push({ id: 'dimension-geometry', status: outside || obstructed ? 'failed' : 'passed',
    message: outside + ' dimensions off page; ' + obstructed + ' title-block intersections.' });
}

export function extractDrawingDimensionLabels(svg: string): string[] {
  const root = parseSvg(svg);
  const dimensions = root && descendants(root).find(node => node.attrs.id === 'dimensions');
  return dimensions ? descendants(dimensions, 'text').map(node => descendantsText(node).trim()).filter(Boolean) : [];
}

interface SvgInspection {
  root: SvgNode;
  all: SvgNode[];
  sheet: { width: number; height: number };
  report?: DrawingReport;
  issues: DrawingVisualQaIssue[];
  checks: DrawingVisualQaCheck[];
}

interface PlacedView {
  name: DrawingViewName;
  bounds: Bounds;
}

function inspectViews(ctx: SvgInspection, requested: readonly DrawingViewName[]): PlacedView[] {
  const views = new Map<DrawingViewName, Bounds | undefined>();
  for (const node of ctx.all) {
    const name = node.attrs['data-view'] as DrawingViewName | undefined;
    if (name && VIEW_NAMES.includes(name)) views.set(name, boundsOf(node));
  }
  const missing = requested.filter(name => !views.has(name));
  for (const name of missing) ctx.issues.push(issue('requested-view-missing',
    'Requested ' + name + ' view is missing.', 'Include the view in the export options.', { view: name }));
  for (const name of requested) {
    if (views.has(name) && !views.get(name)) ctx.issues.push(issue('requested-view-empty',
      'The ' + name + ' view has no projection geometry.', 'Check the projection.', { view: name }));
  }
  ctx.checks.push({ id: 'requested-views', status: missing.length ? 'failed' : 'passed',
    message: missing.length ? 'Missing: ' + missing.join(', ') : requested.length + ' requested views present.' });
  return [...views.entries()].flatMap(([name, bounds]) => bounds ? [{ name, bounds }] : []);
}

function inspectViewBounds(ctx: SvgInspection, views: readonly PlacedView[]): void {
  let overflow = 0, overlapCount = 0;
  for (const view of views) {
    if (!outOfSheet(view.bounds, ctx.sheet)) continue;
    overflow++;
    ctx.issues.push(issue('view-overflow', 'View ' + view.name + ' extends outside sheet.',
      'Enlarge the sheet or change the layout.', { view: view.name, location: location(view.bounds) }));
  }
  for (let i = 0; i < views.length; i++) for (let j = i + 1; j < views.length; j++) {
    const a = views[i]!, b = views[j]!;
    const overlap = intersects(a.bounds, b.bounds, 1);
    if (!overlap) continue;
    overlapCount++;
    ctx.issues.push(issue('view-overlap', 'Views ' + a.name + ' and ' + b.name + ' overlap.',
      'Recalculate view layout.', { view: a.name, otherView: b.name, location: location(overlap) }));
  }
  ctx.checks.push({ id: 'view-bounds', status: overflow ? 'failed' : 'passed', message: overflow + ' view overflows.' });
  ctx.checks.push({ id: 'view-separation', status: overlapCount ? 'failed' : 'passed', message: overlapCount + ' view overlaps.' });
}

function findTitleBounds(ctx: SvgInspection): Bounds | undefined {
  const title = ctx.all.find(node => node.tag === 'g' && node.attrs.id === 'title-block');
  if (!title) return undefined;
  const rect = descendants(title, 'rect').find(node => {
    return ['x','y','width','height'].every(attr => numberAttr(node, attr) !== undefined);
  });
  if (!rect) return undefined;
  const x = numberAttr(rect, 'x')!, y = numberAttr(rect, 'y')!;
  return transformRectangle({ x0: x, y0: y, x1: x + numberAttr(rect, 'width')!,
    y1: y + numberAttr(rect, 'height')! }, nodeMatrix(rect));
}

function inspectTitleClearance(ctx: SvgInspection, views: readonly PlacedView[], title: Bounds | undefined): void {
  let obstructionCount = 0;
  if (title) for (const view of views) {
    const overlap = intersects(view.bounds, title, 1);
    if (!overlap) continue;
    obstructionCount++;
    ctx.issues.push(issue('title-block-obstruction', 'View ' + view.name + ' overlaps title block.',
      'Reposition the view or enlarge the sheet.', { view: view.name, location: location(overlap) }));
  }
  ctx.checks.push({ id: 'title-block-clearance', status: obstructionCount ? 'failed' : 'passed',
    message: obstructionCount + ' view/title-block intersections.' });
}

function inspectUnmeasurablePaths(ctx: SvgInspection): void {
  let invalid = 0;
  for (const node of ctx.all) {
    if (node.tag !== 'path' || !(node.attrs.d ?? '').trim()) continue;
    let inDefinitions = false;
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (parent.tag === 'defs' || parent.tag === 'pattern') {
        inDefinitions = true;
        break;
      }
    }
    if (inDefinitions || measureSvgPath(node.attrs.d!, nodeMatrix(node))) continue;
    invalid++;
    ctx.issues.push(issue('exported-sheet-invalid',
      'A serialized drawing path could not be measured safely.',
      'Correct the unsupported or incomplete SVG path before approving this drawing.'));
  }
  ctx.checks.push({ id: 'vector-path-geometry', status: invalid ? 'failed' : 'passed',
    message: invalid + ' visible paths with unmeasurable geometry.' });
}

function inspectText(ctx: SvgInspection): void {
  let clipped = 0;
  for (const node of descendants(ctx.root, 'text')) {
    const box = textBounds(node);
    if (!box || !outOfSheet(box, ctx.sheet)) continue;
    clipped++;
    const view = ancestorView(node);
    ctx.issues.push(issue('text-clipping', 'Text extends outside the page.',
      'Adjust the text position or sheet size.', { ...(view ? { view } : {}), location: location(box) }));
  }
  ctx.checks.push({ id: 'text-bounds', status: clipped ? 'failed' : 'passed', message: clipped + ' clipped labels.' });
}

interface DrawingLabel {
  owner?: string;
  caption: boolean;
  text: string;
  bounds: Bounds;
}

function labelIdentity(node: SvgNode): { owner?: string; caption: boolean } {
  const caption = node.attrs.class?.split(/\s+/).includes('view-label') ?? false;
  for (let parent: SvgNode | undefined = node; parent; parent = parent.parent) {
    if (parent.attrs['data-kc-annotation-id']) {
      return { owner: parent.attrs['data-kc-annotation-id'], caption };
    }
  }
  return { caption };
}

/** Independent serialized-label check: never trust placer overlap flags alone. */
function visibleDrawingLabels(ctx: SvgInspection): DrawingLabel[] {
  return ctx.all.flatMap(node => {
    if (node.tag !== 'text') return [];
    const identity = labelIdentity(node);
    if (!identity.owner && !identity.caption) return [];
    const bounds = textBounds(node);
    return bounds ? [{ ...identity, text: descendantsText(node).trim(), bounds }] : [];
  });
}

function inspectActualAnnotationCollisions(ctx: SvgInspection, alreadyReported: ReadonlySet<string>): number {
  const labels = visibleDrawingLabels(ctx);
  if (labels.length > 500) {
    ctx.issues.push(issue('exported-sheet-invalid',
      'Drawing has more than 500 inspected labels; collision check was not completed.',
      'Split the drawing into sheets or reduce the visible callouts before approving it.'));
    return 1;
  }
  let collisions = 0;
  const reported = new Set(alreadyReported);
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i]!, b = labels[j]!;
      if (!a.owner && !b.owner) continue;
      if (a.owner && b.owner && a.owner === b.owner) continue;
      const shared = intersects(a.bounds, b.bounds, 0.5);
      if (!shared) continue;
      const target = b.owner ?? a.owner;
      if (!target || reported.has(target)) continue;
      ctx.issues.push(issue('annotation-collision',
        'Serialized drawing labels overlap: ' + a.text + ' / ' + b.text + '.',
        'Reposition the annotation, or select a larger drawing sheet.',
        { annotationId: target, location: location(shared) }));
      collisions++;
      reported.add(target);
    }
  }
  return collisions;
}

function inspectAnnotations(ctx: SvgInspection): void {
  const crowded = ctx.report?.annotations.filter(a => a.overlapped) ?? [];
  for (const a of crowded) {
    const group = ctx.all.find(n => n.attrs['data-kc-annotation-id'] === a.id);
    const box = group && annotationBounds(group);
    ctx.issues.push(issue('annotation-collision', 'Annotation ' + a.id + ' is crowded.',
      'Move the annotation or use a larger sheet.',
      { annotationId: a.id, ...(box ? { location: location(box) } : {}) }));
  }
  const collisions = inspectActualAnnotationCollisions(ctx, new Set(crowded.map(a => a.id)));
  const total = crowded.length + collisions;
  ctx.checks.push({ id: 'annotation-placement', status: total ? 'failed' : ctx.report ? 'passed' : 'not-declared',
    message: total + ' crowded or overlapping annotations.' });
}

const SHEET_PREFLIGHT_CODES: Readonly<Record<NonNullable<DrawingReport['sheetPlacement']>['issues'][number]['kind'], DrawingVisualQaIssueCode>> = {
  'non-finite-view': 'exported-sheet-invalid',
  'outside-frame': 'view-overflow',
  'view-overlap': 'view-overlap',
  'title-block-overlap': 'title-block-obstruction',
  'general-tolerance-overlap': 'title-block-obstruction',
};

const TEXT_PREFLIGHT_CODES: Readonly<Record<NonNullable<DrawingReport['renderedText']>['issues'][number]['kind'], DrawingVisualQaIssueCode>> = {
  'text-outside-page': 'text-clipping',
  'text-in-title-block': 'title-block-obstruction',
  'text-in-tolerance-block': 'title-block-obstruction',
  'annotation-text-overlap': 'annotation-collision',
  'text-unmeasurable': 'exported-sheet-invalid',
};

/** Fold both independent kernel preflights into the single agent-facing verdict. */
function inspectKernelPreflight(ctx: SvgInspection): void {
  const sheet = ctx.report?.sheetPlacement?.issues ?? [];
  const text = ctx.report?.renderedText?.issues ?? [];
  for (const finding of sheet) {
    const code = SHEET_PREFLIGHT_CODES[finding.kind];
    if (ctx.issues.some(item => item.code === code)) continue;
    ctx.issues.push(issue(code, 'Geometry preflight: ' + finding.kind + ' (' + finding.views.join('/') + ').',
      'Correct the projected view placement, then inspect the re-exported PDF.'));
  }
  for (const finding of text) {
    const code = TEXT_PREFLIGHT_CODES[finding.kind];
    if (ctx.issues.some(item => item.code === code)) continue;
    ctx.issues.push(issue(code, 'Rendered text preflight: ' + finding.kind + ' (' + finding.texts.join('; ') + ').',
      'Adjust annotation offsets or use a larger sheet, then rerun PDF QA.'));
  }
  const covered = ctx.report?.sheetPlacement !== undefined && ctx.report.renderedText !== undefined;
  ctx.checks.push({ id: 'kernel-preflight',
    status: sheet.length + text.length > 0 ? 'failed' : covered ? 'passed' : 'not-declared',
    message: sheet.length + ' geometry issues, ' + text.length + ' text issues.' });
}

function inspectReview(ctx: SvgInspection): void {
  const review = ctx.report?.review;
  if (!review || review.status === 'not-declared') {
    ctx.checks.push({ id: 'critical-dimensions', status: 'not-declared', message: 'Dimension requirements not declared.' });
    ctx.checks.push({ id: 'drafting-decisions', status: 'not-declared', message: 'Drafting decisions not declared.' });
    return;
  }
  const missing = review.requirements.filter(req => req.role === 'critical' && req.status !== 'covered');
  for (const req of missing) {
    ctx.issues.push(issue(req.status === 'missing' ? 'critical-dimension-missing' : 'critical-dimension-unresolved',
      'Critical dimension ' + req.requirementId + ' is ' + req.status + '.',
      'Restore or correct dimension ' + req.annotationId + '.', { requirementId: req.requirementId }));
  }
  ctx.checks.push({ id: 'critical-dimensions', status: missing.length ? 'failed' : 'passed',
    message: missing.length + ' unresolved critical requirements.' });
  const unresolved = review.decisions.filter(decision => !decision.resolution);
  for (const decision of unresolved) ctx.issues.push(issue('drawing-decision-unresolved',
    'Drafting decision ' + decision.decisionId + ' is unresolved.',
    'Resolve and record its provenance.', { decisionId: decision.decisionId }));
  ctx.checks.push({ id: 'drafting-decisions', status: unresolved.length ? 'failed' : 'passed',
    message: unresolved.length + ' unresolved drafting decisions.' });
}

function failedDrawingSvg(message: string): DrawingVisualQaReport {
  const error = issue('exported-sheet-invalid', message, 'Inspect the SVG and retry the export.');
  return { status: 'incomplete', source: 'exported-svg', issues: [error],
    checks: [{ id: 'svg-parse', status: 'failed', message }],
    attempts: [], attemptCount: 0, repaired: false, limitations: [message] };
}

/** A verified sheet requires a complete declared critical-dimension contract. */
export function analyzeExportedDrawingSvg(
  svg: string,
  input: { requestedViews?: readonly DrawingViewName[]; drawingReport?: DrawingReport },
): DrawingVisualQaReport {
  const root = parseSvg(svg);
  if (!root || root.attrs['data-kc-format'] !== 'svg-drawing') return failedDrawingSvg('Drawing SVG could not be parsed.');
  const sheet = sheetSizeFromSvg(root);
  if (!sheet) return failedDrawingSvg('Drawing SVG has no valid sheet size.');
  const ctx: SvgInspection = { root, sheet, all: descendants(root), report: input.drawingReport, issues: [], checks: [] };
  inspectUnmeasurablePaths(ctx);
  const views = inspectViews(ctx, input.requestedViews ?? VIEW_NAMES);
  const title = findTitleBounds(ctx);
  inspectViewBounds(ctx, views);
  inspectTitleClearance(ctx, views, title);
  checkDimensionGeometry({ all: ctx.all, sheet, titleRect: title, issues: ctx.issues, checks: ctx.checks });
  inspectText(ctx);
  inspectAnnotations(ctx);
  inspectKernelPreflight(ctx);
  inspectReview(ctx);
  const review = ctx.report?.review;
  const complete = review?.status === 'complete' && review.criticalCount > 0 &&
    extractDrawingDimensionLabels(svg).length > 0;
  const blocking = ctx.issues.some(entry => entry.severity === 'error');
  return {
    status: blocking ? 'needs-review' : complete ? 'verified' : 'incomplete',
    source: 'exported-svg', checks: ctx.checks, issues: ctx.issues,
    attempts: [], attemptCount: 0, repaired: false,
    limitations: [
      'Text bounds are estimated from SVG fonts; visual QA is not a tolerance or manufacturing certification.',
      'Critical-dimension completeness must be explicitly declared before verified status.',
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

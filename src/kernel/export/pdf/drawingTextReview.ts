// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Check the serialized, *painted* drawing's text placement. This follows the
// same XML parser, font advances and SVG transforms as svgSheetToPdf. It is a
// deterministic PDF-text-box approximation, not raster/OCR verification.

import { runAdvanceEm, textRuns } from './helveticaMetrics';
import { effectiveStyle, parseTransform, parseXml, type XmlNode } from './svgSheetToPdf';

type Mat = readonly [number, number, number, number, number, number];
type Rect = { x0: number; y0: number; x1: number; y1: number };
const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

function mul(a: Mat, b: Mat): Mat {
  return [
    a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

type TextRole = 'title' | 'tolerance' | 'caption' | 'annotation' | 'dimension' | 'other';
interface PaintedText { text: string; role: TextRole; owner: string; rect: Rect }

export type RenderedTextIssueKind =
  | 'text-outside-page' | 'text-in-title-block' | 'text-in-tolerance-block'
  | 'annotation-text-overlap' | 'text-unmeasurable';

export interface RenderedTextIssue {
  kind: RenderedTextIssueKind;
  texts: string[];
}

export interface RenderedTextReview {
  status: 'clear' | 'issues';
  checkedText: number;
  issues: RenderedTextIssue[];
}

/** Geometry of the actual sheet/page, in millimetres. */
export interface DrawingTextPage {
  w: number;
  h: number;
  margin: number;
  titleBlock: { w: number; h: number };
  generalTolerance: boolean;
}

const EPS = 0.05;
function overlap(a: Rect, b: Rect): boolean {
  return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > EPS
    && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > EPS;
}

function measured(node: XmlNode, transform: Mat, attrs: Record<string, string>): Rect | undefined {
  const content = node.text.replace(/\s+/g, ' ').trim();
  const size = Number.parseFloat(attrs['font-size'] ?? '16');
  const x = Number(node.attrs.x ?? '0') + Number(node.attrs.dx ?? '0');
  const y = Number(node.attrs.y ?? '0') + Number(node.attrs.dy ?? '0');
  if (!content || !Number.isFinite(size) || size <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const weight = attrs['font-weight'];
  const bold = weight === 'bold' || weight === 'bolder' || Number(weight) >= 600;
  const width = textRuns(content).reduce((v, r) => v + runAdvanceEm(r, bold), 0) * size;
  const anchor = attrs['text-anchor'];
  const left = x - (anchor === 'middle' ? width / 2 : anchor === 'end' ? width : 0);
  const corners = [[left, y - 0.8 * size], [left + width, y - 0.8 * size],
    [left + width, y + 0.25 * size], [left, y + 0.25 * size]].map(([px, py]) => [
    transform[0] * px + transform[2] * py + transform[4],
    transform[1] * px + transform[3] * py + transform[5],
  ]);
  const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
  if (![...xs, ...ys].every(Number.isFinite)) return;
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

interface TextContext {
  transform: Mat;
  attrs: Record<string, string>;
  role: TextRole;
  owner: string;
}

function textContextFor(node: XmlNode, parent: TextContext): TextContext {
  let role = parent.role;
  let owner = parent.owner;
  if (node.attrs.id === 'title-block') role = 'title';
  else if (node.attrs.id === 'general-tolerance') role = 'tolerance';
  else if (node.attrs.id === 'dimensions' && role === 'other') role = 'dimension';
  if (node.attrs['data-kc-annotation-id'] || node.attrs['data-kc-auto']) {
    role = 'annotation';
    owner = node.attrs['data-kc-annotation-id'] ?? 'auto:' + node.attrs['data-kc-auto'];
  }
  if (node.attrs.class?.split(/\s+/).includes('view-label')) role = 'caption';
  return {
    transform: mul(parent.transform, parseTransform(node.attrs.transform) ?? IDENTITY),
    attrs: effectiveStyle(parent.attrs, node.attrs), role, owner,
  };
}

function collectPaintedTexts(root: XmlNode): { texts: PaintedText[]; issues: RenderedTextIssue[] } {
  const texts: PaintedText[] = [];
  const issues: RenderedTextIssue[] = [];

  const walk = (node: XmlNode, parent: TextContext): void => {
    if (node.tag === 'defs' || node.tag === 'pattern') return;
    const context = textContextFor(node, parent);
    if (node.tag !== 'text') {
      for (const child of node.children) walk(child, context);
      return;
    }
    const text = node.text.replace(/\s+/g, ' ').trim();
    if (!text || context.attrs.fill === 'none') return;
    const rect = measured(node, context.transform, context.attrs);
    if (rect) texts.push({ text, role: context.role, owner: context.owner, rect });
    else issues.push({ kind: 'text-unmeasurable', texts: [text.slice(0, 80)] });
  };
  walk(root, { transform: IDENTITY, attrs: {}, role: 'other', owner: '' });
  return { texts, issues };
}

function reservedRegionIssues(texts: readonly PaintedText[], page: DrawingTextPage): RenderedTextIssue[] {
  const title: Rect = { x0: page.w - page.margin - page.titleBlock.w,
    y0: page.h - page.margin - page.titleBlock.h,
    x1: page.w - page.margin, y1: page.h - page.margin };
  const tolerance: Rect = { x0: title.x0 - 46, y0: title.y0, x1: title.x0, y1: title.y1 };
  const issues: RenderedTextIssue[] = [];
  for (const t of texts) {
    const b = t.rect;
    if (b.x0 < -EPS || b.y0 < -EPS || b.x1 > page.w + EPS || b.y1 > page.h + EPS) {
      issues.push({ kind: 'text-outside-page', texts: [t.text] });
    }
    if (t.role !== 'title' && overlap(b, title)) {
      issues.push({ kind: 'text-in-title-block', texts: [t.text] });
    }
    if (page.generalTolerance && t.role !== 'tolerance' && overlap(b, tolerance)) {
      issues.push({ kind: 'text-in-tolerance-block', texts: [t.text] });
    }
  }
  return issues;
}

function labelsAreDistinct(a: PaintedText, b: PaintedText): boolean {
  if (a.role === 'annotation' && b.role === 'annotation' && a.owner === b.owner) return false;
  return a.role === 'annotation' || b.role === 'annotation';
}

function textCollisionIssues(texts: readonly PaintedText[]): RenderedTextIssue[] {
  const relevant = texts.filter(t => ['caption', 'annotation', 'dimension'].includes(t.role));
  if (relevant.length > 500) {
    return [{ kind: 'text-unmeasurable', texts: ['More than 500 visible labels'] }];
  }
  const issues: RenderedTextIssue[] = [];
  for (let i = 0; i < relevant.length; i++) {
    for (let j = i + 1; j < relevant.length; j++) {
      const a = relevant[i]!, b = relevant[j]!;
      if (labelsAreDistinct(a, b) && overlap(a.rect, b.rect)) {
        issues.push({ kind: 'annotation-text-overlap', texts: [a.text, b.text] });
      }
    }
  }
  return issues;
}

export function reviewDrawingTextSvg(svg: string, page: DrawingTextPage): RenderedTextReview {
  const root = parseXml(svg).children.find(n => n.tag === 'svg');
  if (!root) return { status: 'issues', checkedText: 0,
    issues: [{ kind: 'text-unmeasurable', texts: ['missing SVG root'] }] };
  const { texts, issues: unknown } = collectPaintedTexts(root);
  const issues = [...unknown, ...reservedRegionIssues(texts, page), ...textCollisionIssues(texts)];
  return { status: issues.length ? 'issues' : 'clear', checkedText: texts.length, issues };
}

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { analyzeExportedDrawingSvg, attachDrawingPdfReadback, extractDrawingDimensionLabels } from './drawingVisualQa';

const fixture = (extra: string) =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" data-kc-format="svg-drawing">' +
    '<g data-view="front"><path d="M 10 10 L 70 70"/></g>' + extra + '</svg>';

const pdf = (dimensions: string[] = []) => ({
  pageCount: 1, widthMm: 297, heightMm: 210, expectedWidthMm: 297, expectedHeightMm: 210,
  vectorPathCount: 1, imageCount: 0,
  requestedViews: ['front' as const], dimensionLabels: dimensions,
  text: ['FRONT', 'TITLE', 'PART NAME', 'SCALE', 'UNITS', 'SHEET', 'DATE'],
});

describe('independent review regressions for drawing QA', () => {
  it('flags a default dimension line outside the exported sheet (P1)', () => {
    const svg = fixture('<g id="dimensions"><line x1="30" y1="25" x2="350" y2="25"/></g>');
    const qa = analyzeExportedDrawingSvg(svg, { requestedViews: ['front'] });
    expect(qa.status).toBe('needs-review');
    expect(qa.issues.map(i => i.code)).toContain('dimension-overflow');
  });

  it('flags a default dimension line crossing the title block (P1)', () => {
    const svg = fixture('<g id="dimensions"><line x1="110" y1="180" x2="290" y2="200"/></g>' +
      '<g id="title-block"><rect x="180" y="180" width="110" height="25"/></g>');
    const qa = analyzeExportedDrawingSvg(svg, { requestedViews: ['front'] });
    expect(qa.status).toBe('needs-review');
    expect(qa.issues.map(i => i.code)).toContain('title-block-obstruction');
  });

  it('does not verify PDF content using title and view captions alone (P1)', () => {
    const sheet = fixture('<g id="dimensions"><text x="50" y="100">80</text></g>');
    expect(extractDrawingDimensionLabels(sheet)).toEqual(['80']);
    const initial = analyzeExportedDrawingSvg(sheet, { requestedViews: ['front'] });
    const qa = attachDrawingPdfReadback(initial, pdf(['80']));
    expect(qa.status).toBe('incomplete');
    expect(qa.pdf?.status).toBe('incomplete');
    expect(qa.pdf?.missingText).toContain('80');
  });

  it('refuses to verify a PDF when source dimension evidence is absent (P1)', () => {
    const initial = analyzeExportedDrawingSvg(fixture(''), { requestedViews: ['front'] });
    const qa = attachDrawingPdfReadback(initial, pdf());
    expect(qa.status).toBe('incomplete');
    expect(qa.issues.map(i => i.code)).toContain('pdf-content-missing');
  });

  it('uses an inherited font size to detect text clipping (P2)', () => {
    const qa = analyzeExportedDrawingSvg(fixture(
      '<g font-size="40"><text x="280" y="30">LONG LABEL</text></g>'), { requestedViews: ['front'] });
    expect(qa.status).toBe('needs-review');
    expect(qa.issues.map(i => i.code)).toContain('text-clipping');
  });

  it('detects page clipping from the PDF Helvetica width of wide glyphs', () => {
    // Naive character-count width (0.58em) fits this label on A4, but the
    // actual vector-PDF Helvetica advance of W is about 0.944em.
    const qa = analyzeExportedDrawingSvg(fixture(
      '<g id="dimensions"><text x="284" y="30" font-size="3">WWWWWW</text></g>'),
    { requestedViews: ['front'] });
    expect(qa.issues.map(i => i.code)).toContain('text-clipping');
  });

  it('does not falsely clip narrow glyphs that fit using real PDF font advances', () => {
    const qa = analyzeExportedDrawingSvg(fixture(
      '<g id="dimensions"><text x="289" y="30" font-size="3">iiiiiii</text></g>'),
    { requestedViews: ['front'] });
    expect(qa.issues.map(i => i.code)).not.toContain('text-clipping');
  });

  it('detects translated text outside the sheet and respects inherited text-anchor', () => {
    const qa = analyzeExportedDrawingSvg(fixture(
      '<g transform="translate(280 0)" text-anchor="end" font-size="3">' +
      '<text x="30" y="30">LONG WIDE NOTE</text></g>'),
    { requestedViews: ['front'] });
    expect(qa.issues.map(i => i.code)).toContain('text-clipping');
  });

  it('ignores a non-painted text group as the PDF export does', () => {
    const qa = analyzeExportedDrawingSvg(fixture(
      '<g style="fill:none"><text x="295" y="30" font-size="4">UNPAINTED</text></g>'),
    { requestedViews: ['front'] });
    expect(qa.issues.map(i => i.code)).not.toContain('text-clipping');
  });

  it('detects two distinct serialized annotation labels even when the placer reports no overlap', () => {
    const svg = fixture(
      '<g id="dimensions">' +
      '<g data-kc-annotation-id="authored:first"><text x="100" y="70" font-size="3">NOTE A</text></g>' +
      '<g data-kc-annotation-id="authored:second"><g data-kc-auto="note">' +
      '<text x="100" y="70" font-size="3">NOTE B</text></g></g></g>');
    const report = { annotations: [
      { id: 'authored:first', overlapped: false },
      { id: 'authored:second', overlapped: false },
    ] };
    const qa = analyzeExportedDrawingSvg(svg,
      { requestedViews: ['front'], drawingReport: report as never });
    expect(qa.status).toBe('needs-review');
    expect(qa.issues).toContainEqual(expect.objectContaining({
      code: 'annotation-collision', annotationId: 'authored:second',
      location: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    }));
  });

  it('checks annotation labels against visible view captions', () => {
    const svg = fixture(
      '<g id="view-front"><text class="view-label" x="100" y="70" font-size="3" text-anchor="middle">FRONT</text></g>' +
      '<g id="dimensions"><g data-kc-annotation-id="authored:label">' +
      '<text x="100" y="70" font-size="3" text-anchor="middle">FRONT LABEL</text></g></g>');
    const qa = analyzeExportedDrawingSvg(svg,
      { requestedViews: ['front'], drawingReport: { annotations: [
        { id: 'authored:label', overlapped: false },
      ] } as never });
    expect(qa.issues.map(i => i.code)).toContain('annotation-collision');
  });

  it('does not flag intentionally nested text belonging to one annotation', () => {
    const svg = fixture(
      '<g id="dimensions"><g data-kc-annotation-id="authored:frame">' +
      '<text x="100" y="70" font-size="3">A</text>' +
      '<g data-kc-auto="fcf"><text x="100" y="70" font-size="3">B</text></g></g></g>');
    const qa = analyzeExportedDrawingSvg(svg,
      { requestedViews: ['front'], drawingReport: { annotations: [
        { id: 'authored:frame', overlapped: false },
      ] } as never });
    expect(qa.issues.map(i => i.code)).not.toContain('annotation-collision');
  });

  it('checks cubic view curves, not just M/L endpoints', () => {
    const svg = fixture('<g data-view="front"><path d="M 20 20 C 80 30 340 45 350 50"/></g>');
    const qa = analyzeExportedDrawingSvg(svg, { requestedViews: ['front'] });
    expect(qa.issues.map(i => i.code)).toContain('view-overflow');
  });

  it('checks parent transforms on projected view geometry', () => {
    const svg = fixture('<g data-view="front" transform="translate(240 0)">' +
      '<path d="M 20 20 L 90 80"/></g>');
    const qa = analyzeExportedDrawingSvg(svg, { requestedViews: ['front'] });
    expect(qa.issues.map(i => i.code)).toContain('view-overflow');
  });

  it('detects dimension overflow from a quadratic path command', () => {
    const qa = analyzeExportedDrawingSvg(fixture(
      '<g id="dimensions"><path d="M 20 10 Q 180 40 340 20"/></g>'), { requestedViews: ['front'] });
    expect(qa.issues.map(i => i.code)).toContain('dimension-overflow');
  });

  it('fails closed when a visible path command cannot be measured', () => {
    const qa = analyzeExportedDrawingSvg(fixture(
      '<g data-view="front"><path d="M 20 20 R 30 30"/></g>'), { requestedViews: ['front'] });
    expect(qa.issues.map(i => i.code)).toContain('exported-sheet-invalid');
    expect(qa.status).toBe('needs-review');
  });

  it('does not reject a valid Bézier whose control points exceed the page but curve stays inside', () => {
    const qa = analyzeExportedDrawingSvg(fixture(
      '<g data-view="front"><path d="M 20 100 C 90 350 190 -150 270 100"/></g>'),
    { requestedViews: ['front'] });
    expect(qa.issues.map(i => i.code)).not.toContain('view-overflow');
  });

  it('does not report verified when the independent view preflight found a defect', () => {
    const qa = analyzeExportedDrawingSvg(fixture(''), {
      requestedViews: ['front'],
      drawingReport: { annotations: [], sheetPlacement: {
        status: 'issues', checkedViews: ['front'],
        issues: [{ kind: 'outside-frame', views: ['front'] }],
      } } as never,
    });
    expect(qa.status).toBe('needs-review');
    expect(qa.issues.map(i => i.code)).toContain('view-overflow');
    expect(qa.checks).toContainEqual(expect.objectContaining({
      id: 'kernel-preflight', status: 'failed',
    }));
  });

  it('does not ignore a text measuring failure from the independent PDF-metric preflight', () => {
    const qa = analyzeExportedDrawingSvg(fixture(''), {
      requestedViews: ['front'],
      drawingReport: { annotations: [], renderedText: {
        status: 'issues', checkedText: 1,
        issues: [{ kind: 'text-unmeasurable', texts: ['unparsed label'] }],
      } } as never,
    });
    expect(qa.status).toBe('needs-review');
    expect(qa.issues.map(i => i.code)).toContain('exported-sheet-invalid');
  });

  it('does not claim dimensional completeness when no critical review was declared (P1)', () => {
    const qa = analyzeExportedDrawingSvg(fixture(''), { requestedViews: ['front'] });
    expect(qa.status).toBe('incomplete');
    expect(qa.checks).toContainEqual(expect.objectContaining({ id: 'critical-dimensions', status: 'not-declared' }));
  });
});

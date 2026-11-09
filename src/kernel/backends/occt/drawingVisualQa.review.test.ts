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

  it('does not claim dimensional completeness when no critical review was declared (P1)', () => {
    const qa = analyzeExportedDrawingSvg(fixture(''), { requestedViews: ['front'] });
    expect(qa.status).toBe('incomplete');
    expect(qa.checks).toContainEqual(expect.objectContaining({ id: 'critical-dimensions', status: 'not-declared' }));
  });
});

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { reviewDrawingTextSvg } from './drawingTextReview';

const page = { w: 297, h: 210, margin: 10,
  titleBlock: { w: 96, h: 24 }, generalTolerance: false };
const wrap = (body: string): string =>
  '<svg viewBox="0 0 297 210" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';

describe('review rendered SVG/PDF text boxes', () => {
  it('accepts separated actual SVG text', () => {
    const svg = wrap('<g id="dimensions"><text x="50" y="60" font-size="3">50</text></g>' +
      '<g id="title-block"><text x="200" y="185" font-size="3">PART</text></g>');
    expect(reviewDrawingTextSvg(svg, page)).toEqual({ status: 'clear', checkedText: 2, issues: [] });
  });
  it('finds annotation/title collisions after parsing the actual markup', () => {
    const svg = wrap('<g id="dimensions"><g data-kc-annotation-id="authored:a">' +
      '<text x="200" y="184" font-size="3">BAD NOTE</text></g></g>');
    expect(reviewDrawingTextSvg(svg, page).issues)
      .toContainEqual({ kind: 'text-in-title-block', texts: ['BAD NOTE'] });
  });
  it('detects annotation and caption text intersections', () => {
    const svg = wrap('<g id="view-front"><text class="view-label" x="55" y="50" font-size="3">FRONT</text></g>' +
      '<g id="dimensions"><g data-kc-annotation-id="authored:b">' +
      '<text x="55" y="50" font-size="3">OVERLAP</text></g></g>');
    expect(reviewDrawingTextSvg(svg, page).issues.some(i => i.kind === 'annotation-text-overlap')).toBe(true);
  });
  it('handles rotation with the same matrix math used by the PDF renderer', () => {
    const svg = wrap('<g id="dimensions"><g data-kc-annotation-id="authored:c">' +
      '<text x="5" y="5" font-size="3" transform="rotate(-90 5 5)">ROTATED</text></g></g>');
    expect(reviewDrawingTextSvg(svg, page).checkedText).toBe(1);
  });
  it('does not flag two GD&T cell labels owned by the same annotation', () => {
    const svg = wrap('<g id="dimensions"><g data-kc-annotation-id="authored:c">' +
      '<text x="50" y="50" font-size="3">A</text>' +
      '<text x="50" y="50" font-size="3">B</text></g></g>');
    expect(reviewDrawingTextSvg(svg, page).issues).toEqual([]);
  });
  it('uses the same inline and inherited font styles as the vector PDF emitter', () => {
    const svg = wrap('<g id="dimensions" style="font-size:3;fill:#000">' +
      '<g data-kc-annotation-id="authored:label">' +
      '<text x="200" y="184">CHECK</text></g></g>');
    const r = reviewDrawingTextSvg(svg, page);
    expect(r.checkedText).toBe(1);
    expect(r.issues).toContainEqual({ kind: 'text-in-title-block', texts: ['CHECK'] });
    expect(r.issues.some(i => i.kind === 'text-unmeasurable')).toBe(false);
  });

  it('ignores a text label that the PDF emitter does not paint', () => {
    const svg = wrap('<g style="fill:none"><text x="296" y="30" font-size="4">HIDDEN</text></g>');
    expect(reviewDrawingTextSvg(svg, page)).toEqual({ status: 'clear', checkedText: 0, issues: [] });
  });

  it('flags text that extends beyond the physical page', () => {
    const svg = wrap('<text x="296" y="30" font-size="4">WIDE</text>');
    expect(reviewDrawingTextSvg(svg, page).issues)
      .toContainEqual({ kind: 'text-outside-page', texts: ['WIDE'] });
  });
});

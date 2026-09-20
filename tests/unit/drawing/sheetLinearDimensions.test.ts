import { describe, expect, it } from 'vitest';
import { analyseSheet } from '../../../src/agent/drawing/sheet';
import type { PdfPageVectors, Pt, PositionedText, VectorPath } from '../../../src/agent/drawing/pdfVectors';

function stroke(points: Pt[], widthMm = 0.25): VectorPath {
  return { points, closed: false, widthMm, dash: [], stroked: true, filled: false, curved: false };
}

function arrow(tip: Pt, dir: Pt): VectorPath {
  const length = 4.5;
  const halfBase = 1.5;
  const base: Pt = [tip[0] - dir[0] * length, tip[1] - dir[1] * length];
  const perp: Pt = [-dir[1], dir[0]];
  return {
    points: [
      tip,
      [base[0] + perp[0] * halfBase, base[1] + perp[1] * halfBase],
      [base[0] - perp[0] * halfBase, base[1] - perp[1] * halfBase],
    ],
    closed: true,
    widthMm: 0,
    dash: [],
    stroked: false,
    filled: true,
    curved: false,
  };
}

function label(text: string, x: number, y: number): PositionedText {
  return { text, x, y, dir: [1, 0], sizeMm: 2.5, widthMm: 5 };
}

function page(paths: VectorPath[], texts: PositionedText[]): PdfPageVectors {
  return {
    page: 1,
    pageCount: 1,
    widthMm: 200,
    heightMm: 100,
    paths,
    texts,
    imageCount: 0,
    imageCoverage: 0,
  };
}

describe('analyseSheet linear dimensions (characterisation)', () => {
  it('associates a label with an arrow-tipped line and records the dimension', () => {
    const result = analyseSheet(page(
      [
        stroke([[10, 10], [110, 10]]),
        arrow([10, 10], [-1, 0]),
        arrow([110, 10], [1, 0]),
      ],
      [label('50', 52, 10.5)],
    ));

    expect(result.linearDims).toHaveLength(1);
    expect(result.linearDims[0]).toEqual({
      id: 'dim1',
      text: label('50', 52, 10.5),
      parsed: expect.objectContaining({ raw: '50', kind: 'linear', value: 50 }),
      dir: [1, 0],
      tips: [[10, 10], [110, 10]],
      feet: [[10, 10], [110, 10]],
      sheetLength: 100,
    });
    expect(result.paths[0].cls).toBe('dimension');
    expect(result.paths[1].cls).toBe('arrowhead');
    expect(result.paths[2].cls).toBe('arrowhead');
    expect(result.notes).toEqual([]);
    expect(result.unassociated).toEqual([]);
  });

  it('joins two collinear broken dimension lines through their outer arrow tips', () => {
    const result = analyseSheet(page(
      [
        stroke([[10, 10], [45, 10]]),
        stroke([[75, 10], [110, 10]]),
        arrow([10, 10], [-1, 0]),
        arrow([110, 10], [1, 0]),
      ],
      [label('50', 57.5, 10.5)],
    ));

    expect(result.linearDims).toHaveLength(1);
    expect(result.linearDims[0].tips).toEqual([[10, 10], [110, 10]]);
    expect(result.linearDims[0].sheetLength).toBe(100);
    expect(result.paths[0].cls).toBe('dimension');
    expect(result.paths[1].cls).toBe('dimension');
  });

  it('leaves an arrow-tipped line unclaimed when no lettering sits on it', () => {
    const result = analyseSheet(page(
      [
        stroke([[10, 10], [110, 10]]),
        arrow([10, 10], [-1, 0]),
        arrow([110, 10], [1, 0]),
      ],
      [],
    ));

    expect(result.linearDims).toEqual([]);
    expect(result.paths[0].cls).toBe('visible');
    expect(result.notes).toEqual([]);
    expect(result.unassociated).toEqual([]);
  });
});

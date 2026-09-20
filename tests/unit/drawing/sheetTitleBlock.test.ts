import { describe, expect, it } from 'vitest';
import { analyseSheet } from '../../../src/agent/drawing/sheet';
import type { PdfPageVectors, Pt, PositionedText, VectorPath } from '../../../src/agent/drawing/pdfVectors';

function stroke(points: Pt[], widthMm = 0.25): VectorPath {
  return { points, closed: false, widthMm, dash: [], stroked: true, filled: false, curved: false };
}

function rect(x0: number, y0: number, x1: number, y1: number): VectorPath {
  return { points: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], closed: true, widthMm: 0.25, dash: [], stroked: true, filled: false, curved: false };
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

describe('analyseSheet title block (characterisation)', () => {
  it('reads bbox, inline scale/units and angle text from a titled sheet', () => {
    const result = analyseSheet(page(
      [rect(5, 2, 60, 30)],
      [label('SCALE 1:2', 10, 10), label('UNITS MM', 10, 20), label('FIRST ANGLE', 10, 25)],
    ));

    expect(result.title).toEqual({
      bbox: { x0: 5, y0: 2, x1: 60, y1: 30 },
      scale: { value: 0.5, text: 'SCALE 1:2' },
      units: { value: 'mm', text: 'UNITS MM' },
      projection: { value: 'first', source: 'text' },
      texts: [label('SCALE 1:2', 10, 10), label('UNITS MM', 10, 20), label('FIRST ANGLE', 10, 25)],
    });
    expect(result.notes).toEqual([]);
  });

  it('falls back to a padded caption bbox when no rectangle encloses the captions', () => {
    const result = analyseSheet(page(
      [],
      [label('SCALE 1:2', 10, 10), label('UNITS MM', 10, 20)],
    ));

    expect(result.title.bbox).toEqual({ x0: 6, y0: 3.5, x1: 45, y1: 28 });
    expect(result.title.scale).toEqual({ value: 0.5, text: 'SCALE 1:2' });
    expect(result.title.units).toEqual({ value: 'mm', text: 'UNITS MM' });
    expect(result.title.texts).toEqual([label('SCALE 1:2', 10, 10), label('UNITS MM', 10, 20)]);
  });

  it('reads the scale/units value nearest its caption when the value is a separate text run', () => {
    const result = analyseSheet(page(
      [rect(5, 2, 60, 30)],
      [label('SCALE', 10, 10), label('UNITS', 30, 10), label('1:2', 10, 15), label('MM', 30, 15)],
    ));

    expect(result.title.bbox).toEqual({ x0: 5, y0: 2, x1: 60, y1: 30 });
    expect(result.title.scale).toEqual({ value: 0.5, text: '1:2' });
    expect(result.title.units).toEqual({ value: 'mm', text: 'MM' });
  });

  it('treats a lone caption as no title block but still reads an inline scale', () => {
    const result = analyseSheet(page([], [label('SCALE 1:2', 10, 10)]));

    expect(result.title.bbox).toBeUndefined();
    expect(result.title.scale).toEqual({ value: 0.5, text: 'SCALE 1:2' });
    expect(result.title.texts).toEqual([]);
  });

  it('classifies ignored linework inside the title bbox as title-block', () => {
    const result = analyseSheet(page(
      [stroke([[10, 10], [12, 10]]), rect(5, 2, 60, 30)],
      [label('SCALE 1:2', 10, 10), label('UNITS MM', 10, 20)],
    ));

    expect(result.paths[0].cls).toBe('title-block');
    expect(result.paths[1].cls).toBe('title-block');
  });
});

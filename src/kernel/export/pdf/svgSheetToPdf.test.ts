// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/pdf/svgSheetToPdf.test.ts
//
// Unit tests for the drawing PDF writer: file structure (header, object
// offsets in the xref table, trailer), the SVG subset transcription (path
// grammar incl. arcs, inherited styles, dashes, hatch fills, rotated text),
// and text encoding (WinAnsi, Ø stand-in, vector symbol glyphs).

import { describe, expect, it } from 'vitest';
import { unzlibSync } from 'fflate';
import { pathDataToGeometry, parseTransform, svgSheetToPdfPage, svgSheetsToPdf } from './svgSheetToPdf';
import { pdfNum, pdfTextString, writePdf } from './pdfDocument';
import { fitTextSize, textRuns, textWidth } from './helveticaMetrics';

const latin1 = (b: Uint8Array): string => Array.from(b, c => String.fromCharCode(c)).join('');

const SHEET = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" width="297mm" height="210mm">${body}</svg>`;

describe('writePdf', () => {
  it('writes a PDF whose xref offsets point at every object', () => {
    const bytes = writePdf([{ widthPt: 100, heightPt: 50, content: '0 0 m 10 10 l S' }], { title: 'Plate ⌀6' }, false);
    const s = latin1(bytes);
    expect(s.startsWith('%PDF-1.4\n')).toBe(true);
    expect(s.trimEnd().endsWith('%%EOF')).toBe(true);
    const startxref = Number(/startxref\n(\d+)\n%%EOF/.exec(s)![1]);
    expect(s.slice(startxref, startxref + 4)).toBe('xref');
    const [, count] = /xref\n0 (\d+)\n/.exec(s.slice(startxref))!;
    const entries = s.slice(startxref).split('\n').slice(3, 3 + Number(count) - 1);
    entries.forEach((e, i) => {
      const off = Number(e.slice(0, 10));
      expect(s.slice(off, off + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
    });
    expect(s).toContain(`/Size ${count} /Root 1 0 R /Info 3 0 R`);
    expect(s).toContain('/Type /Pages /Kids [6 0 R] /Count 1');
    expect(s).toContain('/MediaBox [0 0 100 50]');
    expect(s).toContain(`/Title ${pdfTextString('Plate ⌀6')}`);
    expect(s).toContain('/BaseFont /Helvetica /Encoding /WinAnsiEncoding');
    expect(s).toContain('/BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding');
  });

  it('Flate-compresses content streams and is byte-deterministic', () => {
    const page = { widthPt: 10, heightPt: 10, content: '1 0 0 1 0 0 cm '.repeat(50) };
    const a = writePdf([page]);
    expect(a).toEqual(writePdf([page]));
    const s = latin1(a);
    expect(s).toContain('/Filter /FlateDecode');
    const len = Number(/\/Length (\d+) \/Filter \/FlateDecode >>\nstream\n/.exec(s)![1]);
    const start = s.indexOf('stream\n') + 'stream\n'.length;
    expect(latin1(unzlibSync(a.slice(start, start + len)))).toBe(page.content);
  });

  it('formats numbers without exponents or negative zero', () => {
    expect(pdfNum(-0)).toBe('0');
    expect(pdfNum(1e-7)).toBe('0');
    expect(pdfNum(12.345678)).toBe('12.3457');
    expect(pdfNum(1e21 / 1e21)).toBe('1');
  });
});

describe('svgSheetToPdfPage', () => {
  it('maps sheet millimetres (y down) onto PDF points (y up)', () => {
    const page = svgSheetToPdfPage(SHEET(''));
    expect(page.widthMm).toBe(297);
    expect(page.heightMm).toBe(210);
    expect(page.content.split('\n')[0]).toBe('2.8346 0 0 -2.8346 0 595.2756 cm');
  });

  it('inherits group stroke style and writes dashes, caps and joins', () => {
    const page = svgSheetToPdfPage(SHEET(
      '<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">' +
      '<g class="hidden" stroke-width="0.25" stroke-dasharray="1.6 0.8"><path d="M 10 10 L 20 10 L 20 20"/></g>' +
      '</g>',
    ));
    expect(page.content).toContain('q 0 0 0 RG 0.25 w [1.6 0.8] 0 d 1 J 1 j 10 10 m 20 10 l 20 20 l S Q');
  });

  it('turns arcs into cubic Béziers that land on the endpoint', () => {
    const g = pathDataToGeometry('M 10 0 A 10 10 0 0 1 -10 0');
    const curves = g.ops.filter(o => o.endsWith(' c'));
    expect(curves).toHaveLength(2);
    expect(curves[1].endsWith('-10 0 c')).toBe(true);
    // A half circle about the origin through (0, 10): bounds reach y = 10 via control points.
    expect(g.y1).toBeGreaterThan(9.9);
  });

  it('handles relative, H/V and implicit lineto commands', () => {
    const g = pathDataToGeometry('m 1 1 2 0 v 3 h -2 z');
    expect(g.ops).toEqual(['1 1 m', '3 1 l', '3 4 l', '1 4 l', 'h']);
  });

  it('composes transform lists', () => {
    const m = parseTransform('rotate(-90 10 20)')!;
    // (10, 20) is the pivot; (11, 20) rotates to (10, 19).
    expect(m[0] * 11 + m[2] * 20 + m[4]).toBeCloseTo(10, 9);
    expect(m[1] * 11 + m[3] * 20 + m[5]).toBeCloseTo(19, 9);
    expect(parseTransform('translate(5) scale(2)')).toEqual([2, 0, 0, 2, 5, 0]);
  });

  it('fills a line-hatch pattern as clipped strokes', () => {
    const page = svgSheetToPdfPage(SHEET(
      '<defs><pattern id="h" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<line x1="0" y1="0" x2="0" y2="2" stroke="#000" stroke-width="0.2"/></pattern></defs>' +
      '<path d="M 0 0 L 10 0 L 10 10 L 0 10 Z" fill="url(#h)" fill-rule="evenodd" stroke="none"/>',
    ));
    const hatch = page.content.split('\n').find(l => l.includes('W* n'))!;
    expect(hatch).toMatch(/^q 0 0 m 10 0 l 10 10 l 0 10 l h W\* n 0 0 0 RG 0\.2 w/);
    expect(hatch.match(/ m /g)!.length).toBeGreaterThan(5);
    expect(hatch.endsWith('S Q')).toBe(true);
  });

  it('writes text as Helvetica WinAnsi runs, anchored by the real advance widths', () => {
    const page = svgSheetToPdfPage(SHEET(
      '<text x="100" y="50" font-size="3" text-anchor="middle" fill="#555">A&amp;B</text>',
    ));
    const w = textWidth('A&B', 3);
    expect(page.content).toContain(
      `q 0.3333 0.3333 0.3333 rg 0.3333 0.3333 0.3333 RG BT /F1 3 Tf 1 0 0 -1 ${pdfNum(100 - w / 2)} 50 Tm <412642> Tj ET Q`,
    );
  });

  it('prints ⌀ as Ø and draws GD&T symbols as vector strokes', () => {
    const page = svgSheetToPdfPage(SHEET('<text x="0" y="10" font-size="2">⌖ ⌀0.1</text>'));
    const line = page.content.split('\n')[1];
    // The symbol is a stroked glyph (circle + cross), not a character.
    expect(line).toContain('q 2 0 0 -2 0 10 cm 0.07 w');
    expect(line).toContain('<20d8302e31> Tj'); // " Ø0.1"
    expect(line).not.toContain('<3f');
  });

  it('rejects input without an <svg> root', () => {
    expect(() => svgSheetToPdfPage('<g/>')).toThrow(/no <svg> root/);
  });

  it('writes one page per sheet', () => {
    const s = latin1(svgSheetsToPdf([SHEET(''), SHEET('')], {}, false));
    expect(s).toContain('/Count 2');
    expect(s.match(/\/Type \/Page /g)).toHaveLength(2);
  });
});

describe('helveticaMetrics', () => {
  it('splits text into WinAnsi and symbol runs', () => {
    expect(textRuns('4× ⌀6.6 ⌴')).toEqual([
      { kind: 'text', codes: [0x34, 0xd7, 0x20, 0xd8, 0x36, 0x2e, 0x36, 0x20] },
      { kind: 'symbol', ch: '⌴' },
    ]);
    expect(textRuns('—')).toEqual([{ kind: 'text', codes: [0x97] }]);
  });

  it('shrinks, then truncates, a value to its cell', () => {
    expect(fitTextSize('bracket', 3, 100, 2)).toEqual({ text: 'bracket', size: 3 });
    const shrunk = fitTextSize('W'.repeat(20), 3, 40, 2);
    expect(shrunk.size).toBeLessThan(3);
    expect(textWidth(shrunk.text, shrunk.size)).toBeLessThanOrEqual(40);
    const cut = fitTextSize('W'.repeat(80), 3, 40, 2);
    expect(cut).toMatchObject({ size: 2 });
    expect(cut.text.endsWith('...')).toBe(true);
    expect(textWidth(cut.text, 2)).toBeLessThanOrEqual(40);
  });
});

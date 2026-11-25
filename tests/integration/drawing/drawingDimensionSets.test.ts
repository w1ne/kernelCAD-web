// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/drawing/drawingDimensionSets.test.ts
//
// End-to-end OCCT + SVG + PDF readback tests for authored baseline & ordinate
// dimension sets, autoAnnotate dimensioningStyle: 'ordinate', and optional
// ISO 5457 zoneGrid border frames.

import { beforeAll, describe, expect, it } from 'vitest';
import { runAndExport, type PdfDrawingOptions } from '../../../src/agent/script-runtime/export';
import { readPdfPageVectors, type PdfPageVectors } from '../../../src/agent/drawing/pdfVectors';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import type { SvgDrawingOptions } from '../../../src/kernel/backends/occt/exportSvgDrawing';
import { KernelError } from '../../../src/shared/intent/kernelError';

const DATE = '2026-11-25';

const STEPPED_PLATE = `
let plate = box(100, 60, 10);
plate = plate.subtract(cylinder(14, 4).translate(15, 15, -2));
plate = plate.subtract(cylinder(14, 4).translate(40, 15, -2));
plate = plate.subtract(cylinder(14, 4).translate(80, 45, -2));
export default plate;
`;

const TIGHT_PLATE = `
export default box(80, 40, 8);
`;

async function exportSvg(code: string, options: Omit<SvgDrawingOptions, 'format'> = {}) {
  const r = await runAndExport({
    code,
    fileName: 'plate.kcad.ts',
    format: 'svg-drawing',
    options: { format: 'svg-drawing', date: DATE, ...options },
  });
  return { ...r, svg: new TextDecoder().decode(r.bytes) };
}

async function exportPdf(code: string, options: Omit<PdfDrawingOptions, 'format'> = {}) {
  const r = await runAndExport({
    code,
    fileName: 'plate.kcad.ts',
    format: 'pdf-drawing',
    options: { format: 'pdf-drawing', date: DATE, ...options },
  });
  const errors = r.diagnostics.filter(d => d.severity === 'error');
  expect(errors, JSON.stringify(errors)).toEqual([]);
  return { ...r, page: await readPdfPageVectors(r.bytes) };
}

const pdfTexts = (page: PdfPageVectors): string[] => page.texts.map(t => t.text.trim());

beforeAll(async () => {
  await initOcct();
}, 180_000);

describe('authored baseline dimension sets (SVG + PDF)', () => {
  it('stacks non-overlapping outward dimension lines with a single shared origin extension line', async () => {
    const annotations = [
      {
        kind: 'baseline' as const,
        view: 'top' as const,
        axis: 'x' as const,
        origin: [0, 0, 10] as [number, number, number],
        targets: [
          [15, 0, 10] as [number, number, number],
          [40, 0, 10] as [number, number, number],
          [80, 0, 10] as [number, number, number],
        ],
        tol: 0.1,
      },
      {
        kind: 'baseline' as const,
        view: 'top' as const,
        axis: 'y' as const,
        origin: [0, 0, 10] as [number, number, number],
        targets: [
          [0, 15, 10] as [number, number, number],
          [0, 45, 10] as [number, number, number],
        ],
        prefix: 'Y',
      },
    ];

    const svgRes = await exportSvg(STEPPED_PLATE, { sheet: 'a3', autoAnnotate: false, annotations });
    expect(svgRes.diagnostics.filter(d => d.severity === 'error')).toEqual([]);

    const baselineGroups = svgRes.svg.match(/<g class="dim dim-baseline" data-kc-dim-set="baseline"[^>]*>[\s\S]*?<\/g>/g) ?? [];
    expect(baselineGroups).toHaveLength(2);

    // First set (X, 3 targets): 1 shared origin extension + 3 target extensions + 3 dim lines = 7 lines,
    // and the 3 horizontal dimension lines (y1 === y2) stack strictly outward spaced by 8 mm.
    const xGroup = baselineGroups[0]!;
    expect((xGroup.match(/data-kc-baseline-origin="true"/g) ?? []).length).toBe(1);
    const lines = [...xGroup.matchAll(/<line[^>]*x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/g)];
    expect(lines).toHaveLength(7);
    const dimYs = lines
      .filter(m => m[2] === m[4] && m[1] !== m[3])
      .map(m => Number(m[2]));
    expect(dimYs).toHaveLength(3);
    expect(new Set(dimYs).size).toBe(3);
    expect(Math.abs(dimYs[1]! - dimYs[0]!)).toBeGreaterThanOrEqual(7.9);
    expect(Math.abs(dimYs[2]! - dimYs[1]!)).toBeGreaterThanOrEqual(7.9);

    expect(xGroup).toContain('15 ± 0.1');
    expect(xGroup).toContain('40 ± 0.1');
    expect(xGroup).toContain('80 ± 0.1');
    expect(baselineGroups[1]!).toContain('Y 15');
    expect(baselineGroups[1]!).toContain('Y 45');

    // PDF readback preserves all dimension text
    const pdfRes = await exportPdf(STEPPED_PLATE, { sheet: 'a3', autoAnnotate: false, annotations });
    const texts = pdfTexts(pdfRes.page);
    expect(texts).toContain('15 ± 0.1');
    expect(texts).toContain('40 ± 0.1');
    expect(texts).toContain('80 ± 0.1');
    expect(texts).toContain('Y 15');
    expect(texts).toContain('Y 45');
  });

  it('supports topological face anchors on baseline sets', async () => {
    const svgRes = await exportSvg(TIGHT_PLATE, {
      sheet: 'a4',
      autoAnnotate: false,
      annotations: [{
        kind: 'baseline',
        view: 'front',
        axis: 'x',
        origin: { face: { atX: 0 } },
        targets: [[30, 0, 0], { face: { atX: 80 } }],
        tol: { plus: 0.2, minus: 0.05 },
      }],
    });
    expect(svgRes.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(svgRes.svg).toContain('30 +0.2/−0.05');
    expect(svgRes.svg).toContain('80 +0.2/−0.05');
  });
});

describe('authored ordinate dimension sets (SVG + PDF)', () => {
  it('draws datum label + running perpendicular witness lines with no arrowheads and jogs tight spacing', async () => {
    const annotations = [
      {
        kind: 'ordinate' as const,
        view: 'front' as const,
        axis: 'x' as const,
        origin: [0, 0, 0] as [number, number, number],
        // 10 and 12 are only 2 mm apart — closer than ORD_MIN_PITCH (5.5 mm), forcing a leader jog.
        targets: [
          [10, 0, 0] as [number, number, number],
          [12, 0, 0] as [number, number, number],
          [50, 0, 0] as [number, number, number],
          [80, 0, 0] as [number, number, number],
        ],
        originLabel: '0.0',
      },
      {
        kind: 'ordinate' as const,
        view: 'top' as const,
        axis: 'y' as const,
        origin: [0, 0, 8] as [number, number, number],
        targets: [
          [0, 15, 8] as [number, number, number],
          [0, 40, 8] as [number, number, number],
        ],
        prefix: 'Y',
      },
    ];

    const svgRes = await exportSvg(TIGHT_PLATE, { sheet: 'a3', autoAnnotate: false, annotations });
    expect(svgRes.diagnostics.filter(d => d.severity === 'error')).toEqual([]);

    const ordGroups = svgRes.svg.match(/<g class="dim dim-ordinate" data-kc-dim-set="ordinate"[^>]*>[\s\S]*?<\/g>/g) ?? [];
    expect(ordGroups).toHaveLength(2);

    const xGroup = ordGroups[0]!;
    // No arrowheads on ordinate dimensions (no arrowhead paths/polygons)
    expect(xGroup).not.toContain('<polygon');
    expect(xGroup).not.toContain('<path');
    // Tight spacing produces at least one jogged polyline
    expect(xGroup).toContain('data-kc-ordinate-jog="true"');
    expect(xGroup).toContain('data-kc-ordinate-origin="true"');

    // Label coordinates along X are separated by >= 4.4 mm (ORD_MIN_PITCH = 4.5 mm) despite 2 mm model spacing
    const labelXs = [...xGroup.matchAll(/<text[^>]*\bx="([^"]+)"/g)].map(m => Number(m[1])).sort((a, b) => a - b);
    expect(labelXs).toHaveLength(5);
    for (let i = 1; i < labelXs.length; i++) {
      expect(labelXs[i]! - labelXs[i - 1]!).toBeGreaterThanOrEqual(4.4);
    }

    // PDF readback preserves ordinate text layer cleanly
    const pdfRes = await exportPdf(TIGHT_PLATE, { sheet: 'a3', autoAnnotate: false, annotations });
    const texts = pdfTexts(pdfRes.page);
    for (const expected of ['0.0', '10', '12', '50', '80', '0', 'Y 15', 'Y 40']) {
      expect(texts).toContain(expected);
    }
  });

  it('rejects empty targets, invalid axis, invalid side, and unresolvable anchors via KernelError / error diagnostic', async () => {
    await expect(
      exportSvg(TIGHT_PLATE, {
        autoAnnotate: false,
        annotations: [{ kind: 'baseline', axis: 'x', origin: [0, 0, 0], targets: [] }],
      }),
    ).rejects.toThrow(KernelError);

    await expect(
      exportSvg(TIGHT_PLATE, {
        autoAnnotate: false,
        annotations: [{ kind: 'ordinate', axis: 'z' as never, origin: [0, 0, 0], targets: [[10, 0, 0]] }],
      }),
    ).rejects.toThrow(KernelError);

    await expect(
      exportSvg(TIGHT_PLATE, {
        autoAnnotate: false,
        annotations: [{ kind: 'baseline', axis: 'x', side: 'diagonal' as never, origin: [0, 0, 0], targets: [[10, 0, 0]] }],
      }),
    ).rejects.toThrow(KernelError);

    await expect(
      exportSvg(TIGHT_PLATE, {
        autoAnnotate: false,
        annotations: [{ kind: 'ordinate', axis: 'x', origin: [0, 0, 0], targets: [{ face: { atZ: 9999 } }] }],
      }),
    ).rejects.toThrow(KernelError);
  });
});

describe('autoAnnotate dimensioningStyle: ordinate', () => {
  it('renders running ordinate hole coordinates from the part datum edge in SVG and PDF', async () => {
    const opts = {
      sheet: 'a3' as const,
      autoAnnotate: { dimensioningStyle: 'ordinate' as const },
    };
    const svgRes = await exportSvg(STEPPED_PLATE, opts);
    expect(svgRes.diagnostics.filter(d => d.severity === 'error')).toEqual([]);

    const ordGroups = svgRes.svg.match(/<g class="dim dim-ordinate" data-kc-dim-set="ordinate"[^>]*data-kc-auto="hole-position"[^>]*>[\s\S]*?<\/g>/g) ?? [];
    expect(ordGroups.length).toBeGreaterThanOrEqual(2);
    for (const g of ordGroups) {
      expect(g).not.toContain('<polygon');
      expect(g).not.toContain('<path');
      expect(g).toContain('>0</text>');
    }
    const allOrdSvg = ordGroups.join('\n');
    expect(allOrdSvg).toContain('>15</text>');
    expect(allOrdSvg).toContain('>40</text>');
    expect(allOrdSvg).toContain('>80</text>');
    expect(allOrdSvg).toContain('>45</text>');

    const pdfRes = await exportPdf(STEPPED_PLATE, opts);
    const texts = pdfTexts(pdfRes.page);
    for (const expected of ['0', '15', '40', '80', '45']) {
      expect(texts).toContain(expected);
    }
  });
});

describe('ISO 5457 zoneGrid border frame (SVG + PDF)', () => {
  it('preserves byte-identical default output when zoneGrid is omitted or false', async () => {
    const omitted = await exportSvg(TIGHT_PLATE, { sheet: 'a4', autoAnnotate: false });
    const explicitFalse = await exportSvg(TIGHT_PLATE, { sheet: 'a4', autoAnnotate: false, zoneGrid: false });
    expect(omitted.svg).toBe(explicitFalse.svg);
    expect(omitted.svg).not.toContain('id="zone-grid"');
    expect(omitted.svg).not.toContain('data-kc-zone-grid');
  });

  it('renders ISO 5457 zone letters (A..D), zone numbers (1..N), and margin sheet stamp in SVG and PDF', async () => {
    const svgA3 = await exportSvg(TIGHT_PLATE, { sheet: 'a3', autoAnnotate: false, zoneGrid: true });
    expect(svgA3.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(svgA3.svg).toContain('<g id="zone-grid" data-kc-zone-grid="iso5457"');
    expect(svgA3.svg).toContain('data-kc-zone-cols="8"');
    expect(svgA3.svg).toContain('data-kc-zone-rows="4"');
    expect(svgA3.svg).toContain('data-kc-sheet-stamp="true">A3 (420×297)</text>');

    // A3 has 4 vertical zones (A..D) and 8 horizontal zones (1..8), mirrored on both borders
    for (const row of ['A', 'B', 'C', 'D']) {
      const count = (svgA3.svg.match(new RegExp(`>${row}</text>`, 'g')) ?? []).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }
    for (let col = 1; col <= 8; col++) {
      const count = (svgA3.svg.match(new RegExp(`>${col}</text>`, 'g')) ?? []).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }

    // PDF readback preserves zone letters, zone numbers, and sheet-size stamp inside page bounds
    const pdfA3 = await exportPdf(TIGHT_PLATE, {
      sheet: 'a3',
      title: 'Zone grid test',
      autoAnnotate: { dimensioningStyle: 'ordinate' },
      zoneGrid: true,
      visualQa: { autoRepair: false },
    });
    const texts = pdfTexts(pdfA3.page);
    for (const label of ['A', 'B', 'C', 'D', '1', '2', '3', '4', '5', '6', '7', '8', 'A3 (420×297)']) {
      expect(texts).toContain(label);
    }
    // Every text element sits strictly inside the A3 page (420 × 297 mm)
    for (const t of pdfA3.page.texts) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThanOrEqual(420);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThanOrEqual(297);
    }
    expect(pdfA3.drawingReport?.visualQa?.issues.filter(i => i.code === 'text-clipping' || i.code === 'title-block-obstruction')).toEqual([]);
  });
});

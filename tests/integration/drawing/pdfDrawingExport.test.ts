// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/drawing/pdfDrawingExport.test.ts
//
// `pdf-drawing` export end to end: a script goes through the public entry
// points (runAndExport, the MCP `export` tool, the CLI `exportScript`), and
// the PDF that comes out is read back with pdf.js (the drawing importer's own
// reader) and checked for: valid structure, the title block text, view
// geometry that fits the sheet, dashed hidden lines, the auto hole callouts
// and GD&T, standard sheet sizes, first-angle arrangement — and finally a
// round trip through drawing_to_cad, which must rebuild the drawn part.

import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runAndExport, type PdfDrawingOptions } from '../../../src/agent/script-runtime/export';
import { readPdfPageVectors, type PdfPageVectors } from '../../../src/agent/drawing/pdfVectors';
import { drawingToCad } from '../../../src/agent/drawing/index';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { exportScript } from '../../../src/agent/cli/commands/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { PLATE_WITH_HOLES } from '../../helpers/drawingPdf/fixtureModels';
import { attributionGenerator, attributionUrl } from '../../../src/shared/links/attribution';

const BRACKET_FILE = join(__dirname, '../../../examples/drawings-auto/bracket.kcad.ts');
const BRACKET = readFileSync(BRACKET_FILE, 'utf8');
const DATE = '2026-09-28';

const latin1 = (b: Uint8Array): string => Array.from(b, c => String.fromCharCode(c)).join('');

async function exportPdf(code: string, options: Omit<PdfDrawingOptions, 'format'> = {}, fileName = 'bracket.kcad.ts') {
  const r = await runAndExport({
    code,
    fileName,
    format: 'pdf-drawing',
    options: { format: 'pdf-drawing', date: DATE, ...options },
  });
  const errors = r.diagnostics.filter(d => d.severity === 'error');
  expect(errors, JSON.stringify(errors)).toEqual([]);
  return { ...r, page: await readPdfPageVectors(r.bytes) };
}

const textsOf = (page: PdfPageVectors): string[] => page.texts.map(t => t.text.trim());
const textAt = (page: PdfPageVectors, text: string) => {
  const t = page.texts.find(x => x.text.trim() === text);
  if (t === undefined) throw new Error(`no text '${text}' on the page; have ${JSON.stringify(textsOf(page))}`);
  return t;
};

let dir: string;
let bracket: Awaited<ReturnType<typeof exportPdf>>;

beforeAll(async () => {
  await initOcct();
  dir = mkdtempSync(join(tmpdir(), 'kernelcad-pdf-drawing-'));
  bracket = await exportPdf(BRACKET, { title: 'L mounting bracket', partName: 'BRK-001', material: 'AlMg3', revision: 'B' });
}, 180_000);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('pdf-drawing: file structure', () => {
  it('is a single-page PDF with a consistent xref table and the standard fonts', () => {
    const s = latin1(bracket.bytes);
    expect(s.startsWith('%PDF-1.4\n')).toBe(true);
    expect(s.trimEnd().endsWith('%%EOF')).toBe(true);
    const startxref = Number(/startxref\n(\d+)\n%%EOF\s*$/.exec(s)![1]);
    const xref = s.slice(startxref);
    const count = Number(/^xref\n0 (\d+)\n/.exec(xref)![1]);
    const offsets = xref.split('\n').slice(3, 2 + count).map(e => Number(e.slice(0, 10)));
    expect(offsets).toHaveLength(count - 1);
    offsets.forEach((off, i) => expect(s.slice(off, off + 12)).toMatch(new RegExp(`^${i + 1} 0 obj\\n`)));
    expect(bracket.page.pageCount).toBe(1);
    // Golden-ish skeleton: catalog, one page, info, two standard fonts, one compressed content stream, one link.
    expect(s.match(/\/Type \/Catalog/g)).toHaveLength(1);
    expect(s.match(/\/Type \/Page /g)).toHaveLength(1);
    expect(s.match(/\/Type \/Font /g)).toHaveLength(2);
    expect(s.match(/\/Filter \/FlateDecode/g)).toHaveLength(1);
    expect(s).toContain('/Resources << /ProcSet [/PDF /Text] /Font << /F1 4 0 R /F2 5 0 R >> >>');
    expect(s.match(/\/Subtype \/Link/g)).toHaveLength(1); // the "Made with kernelCAD" link
    expect(count).toBe(9); // free entry + 7 objects + 1 link annotation
  });

  it('is an A3 landscape page by default', () => {
    expect(bracket.page.widthMm).toBeCloseTo(420, 1);
    expect(bracket.page.heightMm).toBeCloseTo(297, 1);
    expect(bracket.page.imageCount).toBe(0);
  });
});

describe('pdf-drawing: title block', () => {
  it('prints every field, with the values the export was given', () => {
    const texts = textsOf(bracket.page);
    for (const t of [
      'TITLE', 'L mounting bracket', 'PART NAME', 'BRK-001', 'MATERIAL', 'AlMg3', 'REV', 'B',
      'SCALE', '1:1', 'UNITS', 'mm', 'SHEET', 'A3', 'DATE', DATE, 'THIRD ANGLE PROJECTION',
    ]) {
      expect(texts, t).toContain(t);
    }
    // The block sits bottom-right inside the frame.
    const title = textAt(bracket.page, 'TITLE');
    expect(title.x).toBeGreaterThan(420 - 12 - 180 - 1);
    expect(title.y).toBeGreaterThan(297 - 12 - 36 - 1);
  });

  it('defaults the title and part name to the script name and marks unset fields', async () => {
    const r = await exportPdf(PLATE_WITH_HOLES.code, { autoAnnotate: false }, 'plate.kcad.ts');
    const texts = textsOf(r.page);
    expect(texts.filter(t => t === 'plate')).toHaveLength(2);
    expect(texts.filter(t => t === '—').length).toBeGreaterThanOrEqual(2); // material, revision
  }, 120_000);
});

describe('pdf-drawing: attribution', () => {
  it('prints a linked "Made with kernelCAD" line and stamps the producer metadata', async () => {
    expect(textsOf(bracket.page)).toContain('Made with kernelCAD \u00b7 kernelcad.com');
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(bracket.bytes), isEvalSupported: false, verbosity: 0 }).promise;
    try {
      const { info } = await doc.getMetadata() as { info: Record<string, unknown> };
      expect(info.Producer).toBe(attributionGenerator());
      expect(info.Creator).toBe('kernelCAD pdf-drawing export');
      const annots = await (await doc.getPage(1)).getAnnotations();
      const link = annots.find(a => a.subtype === 'Link');
      expect(link?.url).toBe(attributionUrl('drawing'));
      expect(link?.url).toContain('https://kernelcad.com/?ref=drawing');
      // The link sits on the line: inside the title block's DATE cell, bottom-right of the sheet.
      const [x0, y0, x1, y1] = link!.rect as number[];
      const made = textAt(bracket.page, 'Made with kernelCAD \u00b7 kernelcad.com');
      const mmPerPt = 25.4 / 72;
      expect(x0 * mmPerPt).toBeLessThanOrEqual(made.x + 0.01);
      expect(x1 * mmPerPt).toBeGreaterThanOrEqual(made.x + made.widthMm - 0.01);
      expect(297 - y1 * mmPerPt).toBeLessThan(made.y);
      expect(297 - y0 * mmPerPt).toBeGreaterThan(made.y);
    } finally {
      await doc.destroy();
    }
  });
});

describe('svg-drawing: attribution with the full title block', () => {
  it('names the generator on the root and links the "Made with" line', async () => {
    const r = await runAndExport({
      code: 'return box(40, 30, 10);',
      fileName: 'block.kcad.ts',
      format: 'svg-drawing',
      options: { format: 'svg-drawing', titleBlock: { title: 'Block' } },
    });
    const svg = new TextDecoder().decode(r.bytes);
    expect(svg).toContain(`data-kc-generator="${attributionGenerator()}"`);
    expect(svg).toContain(`<a href="${attributionUrl('drawing').replace(/&/g, '&amp;')}">`);
    expect(svg).toContain('>Made with kernelCAD \u00b7 kernelcad.com</text></a>');
  }, 60_000);
});

describe('pdf-drawing: views and annotations', () => {
  it('draws the four captioned views', () => {
    for (const caption of ['FRONT', 'TOP', 'LEFT', 'ISOMETRIC']) expect(textsOf(bracket.page)).toContain(caption);
    // Third angle: top view above the front view, left view left of it.
    expect(textAt(bracket.page, 'TOP').y).toBeLessThan(textAt(bracket.page, 'FRONT').y);
    expect(textAt(bracket.page, 'LEFT').x).toBeLessThan(textAt(bracket.page, 'FRONT').x);
  });

  it('keeps all geometry on the sheet and inside the frame', () => {
    const { widthMm: w, heightMm: h } = bracket.page;
    // Everything stroked (the white page background is a fill-only path).
    const pts = bracket.page.paths.filter(p => p.stroked).flatMap(p => p.points);
    expect(pts.length).toBeGreaterThan(500);
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(12 - 0.5);
      expect(x).toBeLessThanOrEqual(w - 12 + 0.5);
      expect(y).toBeGreaterThanOrEqual(12 - 0.5);
      expect(y).toBeLessThanOrEqual(h - 12 + 0.5);
    }
  });

  it('draws visible edges solid at 0.5 mm and hidden edges dashed at 0.25 mm', () => {
    const visible = bracket.page.paths.filter(p => p.stroked && Math.abs(p.widthMm - 0.5) < 1e-3 && p.dash.length === 0);
    const hidden = bracket.page.paths.filter(p => p.stroked && Math.abs(p.widthMm - 0.25) < 1e-3 && p.dash.length > 0);
    expect(visible.length).toBeGreaterThan(20);
    // The bracket's through holes and counterbore show as hidden lines in the front and left views.
    expect(hidden.length).toBeGreaterThan(10);
    expect(hidden[0].dash.map(d => Math.round(d * 100) / 100)).toEqual([1.6, 0.8]);
  });

  it('carries the automatic dimensions, hole callouts and GD&T', () => {
    const texts = textsOf(bracket.page).join(' | ');
    expect(texts).toContain('4× Ø6.6 THRU');
    expect(texts).toContain('2× Ø8.5 THRU');
    expect(texts).toContain('Ø0.05'); // the declared position tolerance on the upright holes
    expect(texts).toContain('ISO 2768-mK');
    for (const d of ['90', '60', '58']) expect(textsOf(bracket.page)).toContain(d);
    expect(bracket.drawingReport?.byKind).toMatchObject({ hole: 3, datum: 3, overall: 3 });
  });

  it('places every automatic annotation clear of the others on the A3 sheet', () => {
    // The counterbored hole's callout in the top view used to meet the fillet
    // note's leader there.
    const report = bracket.drawingReport!;
    expect(report.annotations.filter(a => a.overlapped)).toEqual([]);
    expect(report.overlapped).toBe(0);
    expect(report.placed).toBe(report.annotations.length);
    expect(bracket.diagnostics.filter(d => d.code === 'drawing.annotation.overlap')).toEqual([]);
  });

  it('prints the scale the views were drawn at: the 90 mm base is 90 mm long on a 1:1 sheet', () => {
    const label = textAt(bracket.page, '90');
    const dimLine = bracket.page.paths
      .filter(p => p.points.length === 2 && Math.abs(p.points[0][1] - p.points[1][1]) < 1e-6)
      .filter(p => Math.abs(p.points[0][1] - label.y) < 3)
      .map(p => Math.abs(p.points[1][0] - p.points[0][0]));
    expect(dimLine.some(len => Math.abs(len - 90) < 0.5)).toBe(true);
  });
});

describe('pdf-drawing: sheets and projection', () => {
  it('draws first-angle projection with the view from above below the front view', async () => {
    const r = await exportPdf(BRACKET, { projection: 'first' });
    const texts = textsOf(r.page);
    expect(texts).toContain('FIRST ANGLE PROJECTION');
    expect(textAt(r.page, 'TOP').y).toBeGreaterThan(textAt(r.page, 'FRONT').y);
    expect(textAt(r.page, 'LEFT').x).toBeGreaterThan(textAt(r.page, 'FRONT').x);
    expect(r.drawingReport?.annotations.filter(a => a.overlapped)).toEqual([]);
  }, 120_000);

  it.each(['third', 'first'] as const)('keeps every annotation clear on ANSI B, %s angle, dimension stacks off the title block', async projection => {
    const r = await exportPdf(BRACKET, { sheet: 'ansi-b', projection });
    expect(r.drawingReport?.annotations.filter(a => a.overlapped)).toEqual([]);
    expect(r.drawingReport?.overlapped).toBe(0);
    // The front view's width dimension clears the title block (third angle)
    // and the frame (first angle).
    const width = textAt(r.page, '90');
    const titleTop = textAt(r.page, 'TITLE').y;
    expect(width.y).toBeLessThan(titleTop - 5);
    expect(width.y - 3).toBeGreaterThan(12); // text top below the 12 mm frame
  }, 120_000);

  it('uses the named ANSI size and keeps it when section views are added', async () => {
    const r = await exportPdf(BRACKET, {
      sheet: 'ansi-b',
      sections: [{ plane: { origin: [45, 30, 20], normal: [0.866, 0.5, 0] }, label: 'D' }],
    });
    expect(r.page.widthMm).toBeCloseTo(431.8, 1);
    expect(r.page.heightMm).toBeCloseTo(279.4, 1);
    expect(textsOf(r.page)).toContain('ANSI B');
    expect(textsOf(r.page)).toContain('SECTION D-D');
    // The section's cut faces are hatched.
    expect(r.page.paths.filter(p => Math.abs(p.widthMm - 0.2) < 1e-3).length).toBeGreaterThan(10);
  }, 120_000);

  it("'auto' picks the smallest ISO sheet that holds the views at full size, else scales down", async () => {
    const small = await exportPdf('return box(40, 30, 10);', { sheet: 'auto', autoAnnotate: false }, 'block.kcad.ts');
    expect([small.page.widthMm, small.page.heightMm].map(Math.round)).toEqual([297, 210]);
    expect(textsOf(small.page)).toContain('A4');
    expect(textsOf(small.page).some(t => /^(1|2|5|10):1$/.test(t))).toBe(true);
    const big = await exportPdf('return box(900, 500, 300);', { sheet: 'auto', autoAnnotate: false }, 'frame.kcad.ts');
    expect([big.page.widthMm, big.page.heightMm].map(Math.round)).toEqual([1189, 841]);
    expect(textsOf(big.page).some(t => /^1:(2|5|10)$/.test(t))).toBe(true);
    expect(textsOf(big.page)).toContain('A0');
  }, 120_000);

  it('rejects an unknown sheet size', async () => {
    await expect(runAndExport({
      code: 'return box(10, 10, 10);',
      fileName: 'x.kcad.ts',
      format: 'pdf-drawing',
      options: { format: 'pdf-drawing', sheet: 'b5' as never },
    })).rejects.toThrow(/not a sheet size/);
  }, 60_000);
});

describe('pdf-drawing: public entry points', () => {
  it('MCP export writes the PDF and returns the placement report', async () => {
    const out = join(dir, 'bracket.pdf');
    const r = await callMcpTool('export', {
      target: 'model',
      file: BRACKET_FILE,
      format: 'pdf-drawing',
      output_path: out,
      options: { format: 'pdf-drawing', revision: 'C', date: DATE },
    }) as { ok: boolean; byte_count: number; format: string; drawing_report?: { placed: number } };
    expect(r.ok).toBe(true);
    expect(r.format).toBe('pdf-drawing');
    expect(r.drawing_report!.placed).toBeGreaterThan(10);
    const bytes = new Uint8Array(readFileSync(out));
    expect(bytes.byteLength).toBe(r.byte_count);
    const page = await readPdfPageVectors(bytes);
    expect(textsOf(page)).toContain('C');
    expect(textsOf(page)).toContain('bracket');
  }, 120_000);

  it('CLI export takes the sheet and title-block flags', async () => {
    const file = join(dir, 'block.kcad.ts');
    writeFileSync(file, 'return box(60, 40, 12).subtract(cylinder(20, 5).translate(30, 20, -4));');
    const out = join(dir, 'block.pdf');
    const r = await exportScript({
      file, format: 'pdf-drawing', out,
      sheet: 'a4', projection: 'first', title: 'Spacer block', revision: 'A', material: 'PA12',
      options: { date: DATE },
    });
    expect(r.exitCode, JSON.stringify(r.diagnostics)).toBe(0);
    const page = await readPdfPageVectors(new Uint8Array(readFileSync(out)));
    expect(Math.round(page.widthMm)).toBe(297);
    const texts = textsOf(page);
    for (const t of ['Spacer block', 'A', 'PA12', 'A4', 'FIRST ANGLE PROJECTION', DATE]) expect(texts, t).toContain(t);
  }, 120_000);
});

describe('pdf-drawing: round trip', () => {
  it('drawing_to_cad rebuilds the plate from the exported PDF', async () => {
    const r = await exportPdf(PLATE_WITH_HOLES.code, { annotations: PLATE_WITH_HOLES.annotations }, 'plate-with-holes.kcad.ts');
    const back = await drawingToCad({ pdf: r.bytes, source: 'plate-with-holes.pdf' });
    expect(back.ok, JSON.stringify(back.diagnostics)).toBe(true);
    expect(back.views.map(v => v.name).sort()).toEqual(['front', 'left', 'top']);
    expect(back.reconstruction).toMatchObject({ kind: 'extrude', holeCount: 5 });
    // The stated dimensions come back from the PDF text and linework.
    const facts = new Map(back.ledger.facts.map(f => [f.id, f.value] as const));
    expect([facts.get('width'), facts.get('depth'), facts.get('thickness')]).toEqual([80, 50, 8]);
    // The verdict itself re-projects through the platform's HLR; it must not report a failure.
    expect(back.fidelity?.verdict).not.toBe('failed');
  }, 180_000);
});

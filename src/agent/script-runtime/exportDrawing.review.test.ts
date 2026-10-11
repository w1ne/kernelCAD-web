// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runAndExport } from './export';
import { readPdfPageVectors } from '../drawing/pdfVectors';

beforeAll(initOcct);
const code = `let plate = box(80,50,10);
for (const x of [10,70]) for (const y of [10,40]) plate = plate.subtract(cylinder(14,3).translate(x,y,-2));
return plate;`;

describe('drafting review public export paths', () => {
  it('uses identical printable sheet settings for SVG review and PDF download', async () => {
    const options = { date: '2026-10-11', sheet: 'a3' as const, title: 'Fixture plate', partName: 'PL-01', material: '6061', revision: 'C',
      autoAnnotate: { include: ['overall'] as const }, annotationOverrides: { 'auto:overall:x': { text: 'VERIFY WIDTH' } } };
    const svg = await runAndExport({ code, fileName: 'plate.kcad.ts', format: 'svg-drawing', options: { format: 'svg-drawing', pdfSheet: true, ...options } as never });
    const pdf = await runAndExport({ code, fileName: 'plate.kcad.ts', format: 'pdf-drawing', options: { format: 'pdf-drawing', ...options } });
    const xml = new TextDecoder().decode(svg.bytes);
    expect(xml).toContain('data-kc-sheet="a3"');
    expect(xml).toContain('>6061</text>');
    expect(svg.drawingReport).toEqual(pdf.drawingReport);
    const page = await readPdfPageVectors(pdf.bytes);
    expect(page.texts.some(t => t.text === '6061')).toBe(true);
    expect(page.texts.some(t => t.text === 'VERIFY WIDTH')).toBe(true);
  });
  it('preserves profile and annotation overrides through PDF rendering', async () => {
    const result = await runAndExport({ code, fileName: 'plate.kcad.ts', format: 'pdf-drawing', options: {
      format: 'pdf-drawing', date: '2026-10-11', draftingProfile: 'general',
      autoAnnotate: { include: ['overall'] }, annotationOverrides: { 'auto:overall:x': { text: 'VERIFY WIDTH', offset: 4 }, 'auto:overall:z': { suppress: true } },
    } });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(new TextDecoder().decode(result.bytes.slice(0, 8))).toContain('%PDF');
    expect(result.drawingReport).toMatchObject({ draftingProfile: 'general', placed: 2, overlapped: 0, suppressed: 1 });
    expect(result.drawingReport!.annotations.find(a => a.id === 'auto:overall:x')).toMatchObject({ text: 'VERIFY WIDTH', originalText: '80', offset: 4 });
    expect(result.drawingReport!.annotations.find(a => a.id === 'auto:overall:z')).toMatchObject({ suppressed: true });
  });

  it('maps SVG title fields and infers assembly material with printable defaults', async () => {
    const assemblyCode = 'const a = assembly("fixture"); a.part("plate",box(80,50,10),{material:"aluminum"}); return a.model();';
    const result = await runAndExport({ code: assemblyCode, fileName: 'fixture.kcad.ts', format: 'svg-drawing', options: {
      format: 'svg-drawing', pdfSheet: true, autoAnnotate: false, date: '2026-10-11', titleBlock: { title: 'Fixture', revision: 'D' },
    } as never });
    const svg = new TextDecoder().decode(result.bytes);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(svg).toContain('data-kc-sheet="a3"');
    expect(svg).toContain('>Fixture</text>');
    expect(svg).toContain('>D</text>');
    expect(svg).toContain('>aluminum-6061</text>');
  });

  it('uses captured dimensions as authored review annotations', async () => {
    const result = await runAndExport({ code: 'return box(80,50,10).dimension({kind:"linear",from:[0,0,10],to:[80,0,10],label:"width"});',
      fileName: 'dimension.kcad.ts', format: 'svg-drawing', options: { format: 'svg-drawing' } });
    expect(result.drawingReport!.annotations[0]).toMatchObject({ source: 'authored', text: 'width 80' });
    expect(result.drawingReport!.annotations[0].id).toMatch(/^authored:/);
  });

  it('rejects collapsed review views for captured dimensions', async () => {
    const dimensionCode = 'return box(80,50,10).dimension({kind:"linear",from:[0,0,10],to:[80,0,10],label:"width"});';
    const base = await runAndExport({ code: dimensionCode, fileName: 'dimension.kcad.ts', format: 'svg-drawing', options: { format: 'svg-drawing' } });
    const id = base.drawingReport!.annotations[0].id;
    await expect(runAndExport({ code: dimensionCode, fileName: 'dimension.kcad.ts', format: 'svg-drawing', options: {
      format: 'svg-drawing', annotationOverrides: { [id]: { view: 'left' } },
    } })).rejects.toThrow(/left.*collapses/);
  });
});

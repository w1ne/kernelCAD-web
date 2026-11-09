// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runAndExport } from './export';
import { analyzeExportedDrawingSvg, runDrawingVisualQa } from '../../kernel/backends/occt/drawingVisualQa';
import { exportModelTool } from '../mcp/tools/exportModel';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

beforeAll(initOcct);

const plate = `let plate = box(80,50,10);
for (const x of [10,70]) for (const y of [10,40]) plate = plate.subtract(cylinder(14,3).translate(x,y,-2));
return plate;`;

describe('exported drawing visual QA', () => {
  it('returns the drawing visual QA result through the existing generic MCP export tool', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kernelcad-drawing-qa-'));
    try {
      const output_path = join(dir, 'bracket.pdf');
      const result = await exportModelTool({
        code: 'return box(80,50,10);', format: 'pdf-drawing', output_path,
        options: { format: 'pdf-drawing', visualQa: { autoRepair: true } },
      });
      expect(result.ok).toBe(true);
      expect((await stat(output_path)).size).toBeGreaterThan(1000);
      expect(result.drawing_report?.visualQa?.pdf).toMatchObject({ status: 'passed', pageCount: 1 });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it('inspects actual vector PDF output of a real bracket', async () => {
    const result = await runAndExport({
      code: plate,
      fileName: 'fixture.kcad.ts',
      format: 'pdf-drawing',
      options: { format: 'pdf-drawing', sheet: 'a3', visualQa: { autoRepair: true }, autoAnnotate: false, date: '2026-11-09' },
    });
    expect(new TextDecoder().decode(result.bytes.slice(0, 8))).toContain('%PDF');
    expect(result.drawingReport?.visualQa?.checks).toContainEqual(expect.objectContaining({ id: 'requested-views', status: 'passed' }));
    expect(result.drawingReport?.visualQa?.pdf).toMatchObject({ status: 'passed', pageCount: 1, imageCount: 0 });
    expect(result.drawingReport?.visualQa?.issues.filter(issue => issue.severity === 'error')).toEqual([]);
  }, 60_000);

  it('rejects a known suppressed critical dimension without inventing a fix', async () => {
    const plan = { id:'mount', requirements: [{ id:'width', featureId:'plate', annotationId:'authored:width', expectedKind:'linear', role:'critical', reason:'mating dimension' }], decisions: [] };
    const code = `return box(80,50,10).dimension({id:'width',kind:'linear',from:[0,0,10],to:[80,0,10]}).drawingReview(${JSON.stringify(plan)});`;
    const result = await runAndExport({
      code, fileName: 'dimension.kcad.ts', format: 'pdf-drawing',
      options: { format: 'pdf-drawing', visualQa: { autoRepair: true }, annotationOverrides: { 'authored:width': { suppress: true } } },
    });
    expect(result.drawingReport?.visualQa?.status).toBe('needs-review');
    expect(result.drawingReport?.visualQa?.issues.map(issue => issue.code)).toContain('critical-dimension-unresolved');
    expect(result.drawingReport?.visualQa?.repaired).toBe(false);
  }, 60_000);

  it.each([
    { name: 'radial basket-like rotor', code: `let rotor = cylinder(8,42).subtract(cylinder(12,10).translate(0,0,-2));
for (let i=0;i<8;i++) { const a=i*Math.PI/4; rotor=rotor.subtract(cylinder(12,3).translate(27*Math.cos(a),27*Math.sin(a),-2)); }
return rotor;` },
    { name: 'two-body assembly', code: `const a=assembly('housing'); a.part('base',box(80,50,10),{material:'aluminum'}); a.part('top',box(40,25,5).translate(20,12.5,10),{material:'aluminum'}); return a.model();` },
  ])('reads an actual drawing PDF for $name', async ({ code }) => {
    const result = await runAndExport({
      code, fileName: 'fixture.kcad.ts', format: 'pdf-drawing',
      options: { format: 'pdf-drawing', sheet: 'a3', autoAnnotate: false, partsList: true, visualQa: { autoRepair: true } },
    });
    expect(result.bytes.byteLength).toBeGreaterThan(1000);
    expect(result.drawingReport?.visualQa?.pdf).toMatchObject({ status: 'passed', pageCount: 1, imageCount: 0 });
    expect(result.drawingReport?.visualQa?.issues.filter(issue => issue.severity === 'error')).toEqual([]);
  }, 60_000);

  it('detects serialized collisions in real exported SVG even if every placer flag is cleared', async () => {
    // A thirteenth note returns to the same leader direction as the first:
    // identical anchor/position but two different authored annotation IDs.
    const annotations = Array.from({ length: 13 }, (_, i) => ({
      kind: 'note' as const, id: 'note-' + i,
      at: [10, 10, -2] as const, text: 'X',
    }));
    const result = await runAndExport({
      code: 'return box(80,50,10);',
      fileName: 'colliding-notes.kcad.ts',
      format: 'svg-drawing',
      options: { format: 'svg-drawing', annotations },
    });
    expect(result.bytes.length).toBeGreaterThan(1000);
    expect(result.drawingReport).toBeDefined();
    // Simulate inaccurate upstream placement metadata. The SVG itself is
    // still the genuine OCCT-exported engineering drawing.
    const misleading = {
      ...result.drawingReport!,
      overlapped: 0,
      annotations: result.drawingReport!.annotations.map(row => ({ ...row, overlapped: false })),
    };
    const qa = analyzeExportedDrawingSvg(new TextDecoder().decode(result.bytes), {
      drawingReport: misleading,
    });
    expect(qa.status).toBe('needs-review');
    expect(qa.issues.map(issue => issue.code)).toContain('annotation-collision');
    expect(qa.issues.some(issue => issue.annotationId?.startsWith('authored:note-'))).toBe(true);
  }, 60_000);

  it('detects missing views and off-sheet path extents from serialized SVG', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" data-kc-format="svg-drawing"><g data-view="front"><path d="M 10 10 L 320 30"/></g></svg>';
    const qa = analyzeExportedDrawingSvg(svg, { requestedViews: ['front', 'top'] });
    expect(qa.issues.map(x => x.code)).toEqual(expect.arrayContaining(['requested-view-missing', 'view-overflow']));
    expect(qa.status).toBe('needs-review');
  });

  it('repairs an actual exported PDF with a misplaced dimension by moving from A4 to A3', async () => {
    const plan = { id: 'sheet', requirements: [{ id: 'width', featureId: 'box',
      annotationId: 'authored:width', expectedKind: 'linear', role: 'critical', reason: 'Mating size' }], decisions: [] };
    const code = "return box(80,50,10).dimension({id:'width',kind:'linear',from:[0,0,10],to:[80,0,10]}).drawingReview(" +
      JSON.stringify(plan) + ");";
    const baseline = { format: 'pdf-drawing' as const, sheet: 'a4' as const, autoAnnotate: false,
      annotationOverrides: { 'authored:width': { offset: 45 } } };
    const broken = await runAndExport({ code, fileName: 'repair.kcad.ts', format: 'pdf-drawing',
      options: { ...baseline, visualQa: { autoRepair: false } } });
    const repaired = await runAndExport({ code, fileName: 'repair.kcad.ts', format: 'pdf-drawing',
      options: { ...baseline, visualQa: { autoRepair: true, maxAttempts: 3 } } });
    expect(broken.drawingReport?.visualQa?.issues.map(issue => issue.code)).toContain('title-block-obstruction');
    expect(broken.drawingReport?.visualQa?.status).toBe('needs-review');
    expect(repaired.drawingReport?.visualQa?.status).toBe('verified');
    expect(repaired.drawingReport?.visualQa?.repaired).toBe(true);
    expect(repaired.drawingReport?.visualQa?.attempts).toMatchObject([
      { sheet: 'a4', accepted: true },
      { sheet: 'a3', strategy: 'larger-sheet', accepted: true },
    ]);
    expect(repaired.drawingReport?.visualQa?.pdf).toMatchObject({ status: 'passed', pageCount: 1 });
  }, 60_000);

  it('retains a truthful failure when an extreme annotation offset cannot be fixed', async () => {
    const code = "return box(80,50,10).dimension({id:'width',kind:'linear',from:[0,0,10],to:[80,0,10]});";
    const result = await runAndExport({ code, fileName: 'repair.kcad.ts', format: 'pdf-drawing',
      options: { format: 'pdf-drawing', sheet: 'a4', autoAnnotate: false,
        annotationOverrides: { 'authored:width': { offset: 150 } }, visualQa: { autoRepair: true, maxAttempts: 3 } },
    });
    expect(result.drawingReport?.visualQa?.status).not.toBe('verified');
    expect(result.drawingReport?.visualQa?.repaired).toBe(false);
    expect(result.drawingReport?.visualQa?.issues.map(issue => issue.code)).toContain('text-clipping');
  }, 60_000);

  it('moves crowded annotation labels on the same sheet before enlarging it', async () => {
    const svg = '<svg viewBox="0 0 297 210" data-kc-format="svg-drawing"><g data-view="front"><path d="M 20 20 L 70 70"/></g><g data-view="top"><path d="M 150 20 L 220 70"/></g></svg>';
    const initial = { svg, crowded: true };
    const result = await runDrawingVisualQa({
      initial, defaultSheet: 'a4', requestedViews: ['front', 'top'], options: { autoRepair: true },
      readSvg: item => item.svg,
      readReport: item => ({ placed: item.crowded ? 0 : 1, overlapped: item.crowded ? 1 : 0,
        byKind: {}, datums: [], annotations: [{ id: 'authored:width', text: '80', overlapped: item.crowded }] }) as never,
      render: async () => initial,
      renderWithAnnotationOffsets: async (_sheet, offsets) => ({ svg, crowded: !offsets['authored:width'] }),
    });
    expect(result.report.status).toBe('incomplete');
    expect(result.report.repaired).toBe(true);
    expect(result.report.attemptCount).toBe(1);
    expect(result.report.attempts[1]).toMatchObject({ sheet: 'a4', strategy: 'annotation-offset', accepted: true });
  });

  it('retries a larger sheet, keeps only a measurable improvement, and preserves the artifact', async () => {
    const generate = (width: number, otherX: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 210" data-kc-format="svg-drawing"><g data-view="front"><path d="M 10 10 L 90 90"/></g><g data-view="top"><path d="M ${otherX} 10 L ${otherX + 70} 90"/></g></svg>`;
    const result = await runDrawingVisualQa({
      initial: generate(297, 30),
      defaultSheet: 'a4',
      options: { autoRepair: true, maxAttempts: 2 },
      requestedViews: ['front', 'top'],
      readSvg: value => value,
      readReport: () => undefined,
      render: async sheet => sheet === 'a3' ? generate(420, 180) : generate(594, 200),
    });
    expect(result.report.status).toBe('incomplete');
    expect(result.report.repaired).toBe(true);
    expect(result.report.attemptCount).toBe(1);
    expect(result.artifact).toContain('viewBox="0 0 420 210"');
  });
});

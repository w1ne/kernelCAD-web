// tests/unit/mcp/tools/exportDrawingAuto.test.ts
//
// Public entry points for automatic drawing annotation: the MCP `export` tool
// (through `callMcpTool`) and the CLI `exportScript` with `--options`. A script
// declares GD&T with shape.datum / shape.tolerance, the export turns on
// autoAnnotate and an oblique section, and the result carries the placement
// report and the declared overrides.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { callMcpTool } from '../../../../src/agent/mcp/toolRegistry';
import { exportScript, parseExportOptionsFlag } from '../../../../src/agent/cli/commands/export';

const PLATE = `
let plate = box(80, 50, 10);
for (const [x, y] of [[10, 10], [70, 10], [10, 40], [70, 40]]) {
  plate = plate.subtract(cylinder(14, 3.25).translate(x, y, -2));
}
plate = plate.datum('A', { atZ: 0 });
plate.tolerance({ type: 'position', value: 0.05, modifier: '⌀', datums: ['A', 'B', 'C'],
  edge: { ofCurveType: 'CIRCLE', near: [10, 10, 10] } });
return plate;
`;

let dir: string;
beforeAll(async () => {
  const { initOcct } = await import('../../../../src/kernel/backends/occt/occtBackend');
  await initOcct();
  dir = mkdtempSync(join(tmpdir(), 'kernelcad-drawing-auto-'));
}, 60000);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('export svg-drawing with autoAnnotate through callMcpTool', () => {
  it('returns drawing_report and draws the declared datum and tolerance in place of the automatic ones', async () => {
    const out = join(dir, 'plate.svg');
    const tilt = (30 * Math.PI) / 180;
    const r = await callMcpTool('export', {
      target: 'model',
      code: PLATE,
      format: 'svg-drawing',
      output_path: out,
      options: {
        format: 'svg-drawing',
        autoAnnotate: true,
        sections: [{ plane: { origin: [40, 25, 5], normal: [0, -Math.sin(tilt), Math.cos(tilt)] }, label: 'A' }],
      },
    }) as {
      ok: boolean;
      drawing_report?: {
        placed: number; overlapped: number; byKind: Record<string, number>;
        datums: Array<{ label: string; source: string }>;
        annotations: Array<{ kind: string; text: string }>;
      };
    };
    expect(r.ok).toBe(true);
    const report = r.drawing_report!;
    expect(report.datums.map(d => `${d.label}:${d.source}`)).toEqual(['A:declared', 'B:auto', 'C:auto']);
    expect(report.annotations.find(a => a.kind === 'hole')!.text).toBe('4× ⌀6.5 THRU | ⌖ ⌀0.05 A B C');
    expect(report.placed + report.overlapped).toBe(report.annotations.length);
    const svg = readFileSync(out, 'utf8');
    expect(svg).toContain('data-kc-fcf="⌖ ⌀0.05 A B C"');
    expect(svg).not.toContain('data-kc-fcf="⌖ ⌀0.1 A B C"');
    expect(svg).toContain('>ISO 2768-mK</text>');
    expect(svg).toContain('data-kc-section-normal="0 -0.5 0.866"');
  });
});

describe('functional review public transport', () => {
  it('forwards declared plans and decision resolutions through CLI and MCP', async () => {
    const code = 'return box(80,50,10).dimension({id:"width",kind:"linear",from:[0,0,10],to:[80,0,10]});';
    const reviewPlans = [{ id: 'mount', requirements: [{ id: 'w', featureId: 'plate', annotationId: 'authored:width', expectedKind: 'linear', role: 'critical', reason: 'Interface' }], decisions: [{ id: 'fit', kind: 'fit', featureId: 'plate', prompt: 'Choose' }] }];
    const parsed = parseExportOptionsFlag(JSON.stringify({reviewPlans,decisionResolutions:{'mount:fit':{note:'Example clearance',provenance:'Engineering brief'}},requireCompleteReview:true}), 'pdf-drawing');
    if (!parsed.ok) throw new Error('options parse failed');
    const options = parsed.options;
    const file = join(dir, 'functional.kcad.ts');
    writeFileSync(file, code);
    const cli = await exportScript({file,format:'pdf-drawing',out:join(dir,'functional-cli.pdf'),options});
    expect(cli.exitCode).toBe(0);
    expect(cli.drawingReport?.review).toMatchObject({status:'complete',decisionCount:1,unresolvedDecisionCount:0});
    const mcp = await callMcpTool('export',{target:'model',code,format:'pdf-drawing',output_path:join(dir,'functional-mcp.pdf'),options}) as {ok:boolean;drawing_report?:unknown};
    expect(mcp.ok).toBe(true);
    expect(mcp.drawing_report).toEqual(cli.drawingReport);
    const failed = await callMcpTool('export',{target:'model',code,format:'pdf-drawing',output_path:join(dir,'functional-unreviewed.pdf'),options:{format:'pdf-drawing',reviewPlans,requireCompleteReview:true}}) as {ok:boolean};
    expect(failed.ok).toBe(false);
  });
});

describe('kernelcad export svg-drawing --options', () => {
  it('parses the flag into an options bag with the positional format', () => {
    expect(parseExportOptionsFlag('{"autoAnnotate":true}', 'svg-drawing'))
      .toEqual({ ok: true, options: { format: 'svg-drawing', autoAnnotate: true } });
    expect(parseExportOptionsFlag('[1]', 'svg-drawing').ok).toBe(false);
    expect(parseExportOptionsFlag('{nope', 'svg-drawing').ok).toBe(false);
  });

  it('exports an auto-annotated sheet and returns the drawing report', async () => {
    const file = join(dir, 'plate.kcad.ts');
    writeFileSync(file, PLATE);
    const out = join(dir, 'plate-cli.svg');
    const r = await exportScript({
      file, format: 'svg-drawing', out,
      options: { format: 'svg-drawing', autoAnnotate: { include: ['holes', 'datums'] } },
    });
    expect(r.exitCode).toBe(0);
    expect(r.drawingReport!.byKind).toEqual({ hole: 1, datum: 3 });
    expect(readFileSync(out, 'utf8')).toContain('>4× ⌀6.5 THRU</text>');
  });
});

import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';
import { exportScript } from '../../../src/agent/cli/commands/export';
import { parsePly, plyBbox, type ParsedPly } from '../../helpers/plyParse';

const errors = (r: { diagnostics: Array<{ severity: string }> }) => r.diagnostics.filter(d => d.severity === 'error');

/** Triangle count and bbox of the same export mesher, read through OBJ. */
function objStats(bytes: Uint8Array): { faces: number; min: number[]; max: number[] } {
  const lines = new TextDecoder().decode(bytes).split('\n');
  const vs = lines.filter(l => l.startsWith('v ')).map(l => l.split(' ').slice(1).map(Number));
  return {
    faces: lines.filter(l => l.startsWith('f ')).length,
    min: [0, 1, 2].map(i => Math.min(...vs.map(v => v[i]!))),
    max: [0, 1, 2].map(i => Math.max(...vs.map(v => v[i]!))),
  };
}

function rgbSet(ply: ParsedPly): Set<string> {
  return new Set(ply.data.vertex!.map(v => `${v.red},${v.green},${v.blue}`));
}

describe('PLY export', () => {
  beforeAll(async () => { await initOcct(); });

  it('round-trips a filleted bracket: triangle count and bbox match the source export mesh', async () => {
    const code = "return box(40, 20, 10).fillet(2).color('#ff8000');";
    const ply = await runAndExport({ code, fileName: 'bracket.kcad.ts', format: 'ply' });
    const obj = await runAndExport({ code, fileName: 'bracket.kcad.ts', format: 'obj' });
    expect(errors(ply)).toEqual([]);
    const parsed = parsePly(ply.bytes);
    const src = objStats(obj.bytes);
    expect(parsed.format).toBe('binary_little_endian');
    expect(parsed.data.face).toHaveLength(src.faces);
    const bbox = plyBbox(parsed);
    for (let i = 0; i < 3; i++) {
      expect(bbox.min[i]).toBeCloseTo(src.min[i]!, 4);
      expect(bbox.max[i]).toBeCloseTo(src.max[i]!, 4);
    }
    expect(bbox.max).toEqual([40, 20, 10].map(v => expect.closeTo(v, 4)));
    expect([...rgbSet(parsed)]).toEqual(['255,128,0']);
    for (const v of parsed.data.vertex!) {
      expect(Math.hypot(v.nx as number, v.ny as number, v.nz as number)).toBeCloseTo(1, 4);
    }
  }, 120_000);

  it('carries a finish base colour through the lineage (finish then a downstream fillet)', async () => {
    const r = await runAndExport({ code: "return box(10, 10, 10).finish('anodized-black').fillet(1);", fileName: 'f.kcad.ts', format: 'ply' });
    expect(errors(r)).toEqual([]);
    expect([...rgbSet(parsePly(r.bytes))]).toEqual(['26,28,30']);
  }, 120_000);

  it('merges a two-part assembly in world space with per-part colours (ASCII, face colours)', async () => {
    const code = `return assembly()
  .part('left', box(2, 2, 2).color('#ff0000'))
  .part('right', box(2, 2, 2).color('#0000ff'), { at: [8, 0, 0] })
  .model();`;
    const r = await runAndExport({ code, fileName: 'asm.kcad.ts', format: 'ply', options: { format: 'ply', encoding: 'ascii', colors: 'face' } });
    expect(errors(r)).toEqual([]);
    const ply = parsePly(r.bytes);
    expect(ply.format).toBe('ascii');
    expect(ply.comments).toEqual(expect.arrayContaining(['part 0 left', 'part 1 right']));
    expect(ply.data.face).toHaveLength(24);
    const red = ply.data.face!.filter(f => f.red === 255 && f.blue === 0);
    const blue = ply.data.face!.filter(f => f.blue === 255 && f.red === 0);
    expect(red).toHaveLength(12);
    expect(blue).toHaveLength(12);
    const xs = (faces: typeof red) => faces.flatMap(f => (f.vertex_indices as number[]).map(i => ply.data.vertex![i]!.x as number));
    expect(Math.min(...xs(red))).toBeCloseTo(0, 5);
    expect(Math.max(...xs(red))).toBeCloseTo(2, 5);
    expect(Math.min(...xs(blue))).toBeCloseTo(8, 5);
    expect(Math.max(...xs(blue))).toBeCloseTo(10, 5);
  }, 120_000);

  it('refuses an unknown option before running the script', async () => {
    const r = await runAndExport({
      code: 'return box(1, 1, 1);', fileName: 'b.kcad.ts', format: 'ply',
      options: { format: 'ply', encoding: 'utf8' } as never,
    });
    expect(r.bytes.length).toBe(0);
    expect(r.diagnostics[0]!.code).toBe('export.ply.invalid-options');
    expect(r.diagnostics[0]!.message).toContain('options.encoding');
    expect(r.diagnostics[0]!.message).toContain("'binary'");
  });

  it('writes a PLY through the MCP export tool and the CLI', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kcad-ply-'));
    const script = join(dir, 'pin.kcad.ts');
    await writeFile(script, "return cylinder(20, 4).color('tool');\n");
    const mcpOut = join(dir, 'mcp.ply');
    const m = await exportModelTool({ file: script, format: 'ply', output_path: mcpOut });
    expect(m.ok).toBe(true);
    expect(m.format).toBe('ply');
    const fromMcp = parsePly(new Uint8Array(await readFile(mcpOut)));
    expect(m.byte_count).toBe((await readFile(mcpOut)).length);
    expect([...rgbSet(fromMcp)]).toEqual(['212,104,58']);
    const bad = await exportModelTool({ file: script, format: 'ply', output_path: join(dir, 'bad.ply'), options: { format: 'ply', colors: 'rainbow' } as never });
    expect(bad.ok).toBe(false);
    expect(bad.diagnostics?.[0]?.code).toBe('export.ply.invalid-options');

    const cliOut = join(dir, 'cli.ply');
    const c = await exportScript({ file: script, format: 'ply', out: cliOut, options: { format: 'ply', encoding: 'ascii' } });
    expect(c.exitCode).toBe(0);
    const fromCli = parsePly(new Uint8Array(await readFile(cliOut)));
    expect(fromCli.format).toBe('ascii');
    expect(fromCli.data.face).toHaveLength(fromMcp.data.face!.length);
    expect(plyBbox(fromCli).max[2]).toBeCloseTo(plyBbox(fromMcp).max[2], 4);
  }, 120_000);
});

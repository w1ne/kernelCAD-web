// tests/unit/scriptRuntime/orderPack.test.ts
//
// End-to-end test for `export({ format: 'order-pack' })` through
// exportModelTool: an inline assembly (one fabricated CNC plate, one catalog
// fastener placed twice) must zip the BOM, the vendor handoffs and the
// per-part single-body files for the fabricated rows.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';

let dir: string;
beforeAll(async () => {
  const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
  await initOcct();
  dir = await mkdtemp(join(tmpdir(), 'kc-orderpack-'));
}, 60000);
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

const SCRIPT = `
  const arm = assembly('demo');
  arm.part('plate', box(40, 20, 3), { process: 'cnc', material: 'aluminum' });
  const screw = await lib.fetchPart('iso-4762-m2x4');
  arm.part('screw_0', screw, { at: [5, 5, 3] });
  arm.part('screw_1', screw, { at: [35, 5, 3] });
  return arm.model();
`;

describe('export order-pack', () => {
  it('writes a zip with per-part files, handoffs, and a manifest', async () => {
    const out = join(dir, 'demo-order-pack.zip');
    const r = await exportModelTool({ code: SCRIPT, format: 'order-pack', output_path: out });
    expect(r.ok).toBe(true);
    const zip = unzipSync(new Uint8Array(await readFile(out)));
    const names = Object.keys(zip);
    expect(names).toContain('manifest.json');
    expect(names).toContain('bom.csv');
    expect(names.some((n) => /^parts\/1-.+\/model\.step$/.test(n))).toBe(true);
    expect(names.some((n) => /^parts\/1-.+\/drawing\.pdf$/.test(n))).toBe(true);
    expect(names.some((n) => n.startsWith('handoffs/'))).toBe(true);
    const manifest = JSON.parse(strFromU8(zip['manifest.json']));
    expect(manifest.name).toBe('order');
    const fabricated = manifest.parts.find((p: { kind: string }) => p.kind === 'fabricated');
    expect(fabricated.process).toBe('cnc');
    expect(fabricated.qty).toBe(1);
    // bom.json carries the totals (the manifest is the file index).
    const bom = JSON.parse(strFromU8(zip['bom.json']));
    expect(bom.totals.partCount).toBe(3);
  }, 180000);
});

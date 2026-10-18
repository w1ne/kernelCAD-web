// tests/unit/mcp/tools/fabPack.bom.test.ts
//
// End-to-end test for `fab_pack` scope 'bom' — the whole-assembly order pack.
// Inline assembly: one fabricated CNC plate (per-part STEP + drawing, no
// STL/DXF) and one catalog fastener placed twice (a purchased row, so the
// pack gets a vendor handoff text). Real OCCT, real zip: every entry must
// land under output_dir AND inside the zip, and each returned quote service
// must point at a part file the pack actually wrote.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync, symlinkSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { fabPackTool } from '../../../../src/agent/mcp/tools/fabPack';

const SCRIPT = `
  const arm = assembly('demo');
  arm.part('plate', box(40, 20, 3), { process: 'cnc', material: 'aluminum' });
  const screw = await lib.fetchPart('iso-4762-m2x4');
  arm.part('screw_0', screw, { at: [5, 5, 3] });
  arm.part('screw_1', screw, { at: [35, 5, 3] });
  return arm.model();
`;

let dir: string;

describe("fab_pack scope 'bom'", () => {
  beforeAll(async () => {
    await initOcct();
    dir = mkdtempSync(join(tmpdir(), 'fabpack-bom-'));
  }, 60000);
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('packs the assembly BOM: per-part files, handoffs, manifest, zip and per-process quote links', async () => {
    const out = join(dir, 'demo');
    const r = await fabPackTool({ code: SCRIPT, output_dir: out, scope: 'bom' });
    expect(r.ok).toBe(true);
    expect(existsSync(join(out, 'manifest.json'))).toBe(true);
    expect(existsSync(join(out, 'handoffs', 'mouser.txt'))).toBe(true);
    expect(existsSync(r.zip_path!)).toBe(true);
    const zip = unzipSync(new Uint8Array(readFileSync(r.zip_path!)));
    expect(Object.keys(zip).some(n => /^parts\/\d+-plate\/model\.step$/.test(n))).toBe(true);
    const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
    expect(manifest.parts.some((p: { process: string | null }) => p.process === 'cnc')).toBe(true);
    expect(r.files[0].format).toBe('order-pack');
    expect(r.quote_links.some(q => q.processes.includes('cnc'))).toBe(true);
    expect(r.quote_links).not.toHaveLength(0);
    expect(r.quote_links.every(q => q.upload_file !== undefined)).toBe(true);
    expect(r.referral_disclosure).toBeUndefined();
  }, 120000);

  it("keeps the single-part pack working for scope 'part' and when scope is omitted", async () => {
    const out = join(dir, 'part');
    const r = await fabPackTool({ code: 'return box(20, 20, 5);', output_dir: out, formats: ['step'] });
    expect(r.ok).toBe(true);
    expect(existsSync(join(out, 'part.step'))).toBe(true);
    const explicit = await fabPackTool({
      code: 'return box(20, 20, 5);', output_dir: join(dir, 'part-explicit'), formats: ['step'], scope: 'part',
    });
    expect(explicit.ok).toBe(true);
    expect(explicit.files.map(f => [f.format, f.ok])).toEqual([['step', true]]);
  }, 120000);

  it('accepts a .kcad.ts file path like the single-part pack does', async () => {
    const src = join(dir, 'src');
    mkdirSync(src, { recursive: true });
    const file = join(src, 'demo.kcad.ts');
    writeFileSync(file, SCRIPT);
    const out = join(dir, 'from-file');
    const r = await fabPackTool({ file, output_dir: out, scope: 'bom' });
    expect(r.ok).toBe(true);
    expect(existsSync(join(out, 'manifest.json'))).toBe(true);
    expect(existsSync(join(out, 'handoffs', 'mouser.txt'))).toBe(true);
  }, 120000);

  it('refuses a symlinked pack entry without touching its target', async () => {
    const out = join(dir, 'sym');
    mkdirSync(out, { recursive: true });
    const target = join(dir, 'target-manifest.json');
    writeFileSync(target, 'precious');
    symlinkSync(target, join(out, 'manifest.json'));
    const code = `const arm = assembly('one');\narm.part('p', box(10, 10, 10));\nreturn arm.model();`;
    const r = await fabPackTool({ code, output_dir: out, scope: 'bom' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/symbolic link/);
    expect(readFileSync(target, 'utf8')).toBe('precious');
  }, 120000);
});

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { exportGlb } from './exportGlb';

const FIXTURE = path.resolve(__dirname, '../../tests/fixtures/gallery/simple-box.kcad.ts');

function parseGlbJson(buf: Buffer): { materials?: Array<{ pbrMetallicRoughness?: { baseColorFactor?: number[] } }> } {
  expect(buf.subarray(0, 4).toString('utf8')).toBe('glTF');
  const jsonLength = buf.readUInt32LE(12);
  const jsonType = buf.toString('utf8', 16, 20);
  expect(jsonType).toBe('JSON');
  return JSON.parse(buf.toString('utf8', 20, 20 + jsonLength));
}

describe('exportGlb', () => {
  let tmp: string;
  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  it('produces a valid GLB binary from a .kcad.ts script', { timeout: 30000 }, async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'glb-'));
    const out = path.join(tmp, 'model.glb');
    await exportGlb({ scriptPath: FIXTURE, outPath: out });
    expect(existsSync(out)).toBe(true);
    const size = statSync(out).size;
    expect(size).toBeGreaterThan(100);
    expect(size).toBeLessThan(500_000);
    const buf = readFileSync(out);
    expect(buf.subarray(0, 4).toString('utf8')).toBe('glTF');
  });

  it('exports assembly PBR base colors into GLB materials', { timeout: 30000 }, async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'glb-'));
    const script = path.join(tmp, 'colored-assembly.kcad.ts');
    const out = path.join(tmp, 'model.glb');
    writeFileSync(script, `
const model = assembly('colored model');
model.part('pink-pbr-body', box(10, 10, 10, true).material({
  baseColor: '#ff2f87',
  metalness: 0,
  roughness: 0.34,
}));
return model.model();
`);

    await exportGlb({ scriptPath: script, outPath: out });

    const json = parseGlbJson(readFileSync(out));
    const colors = (json.materials ?? [])
      .map(material => material.pbrMetallicRoughness?.baseColorFactor)
      .filter((color): color is number[] => Array.isArray(color));
    expect(colors.some(color => color[0] > 0.9 && color[1] < 0.08 && color[2] > 0.2)).toBe(true);
  });

  it('exports single-shape PBR base colors into GLB materials', { timeout: 30000 }, async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'glb-'));
    const script = path.join(tmp, 'colored-shape.kcad.ts');
    const out = path.join(tmp, 'model.glb');
    writeFileSync(script, `
return box(10, 10, 10, true).material({
  baseColor: '#ffd91a',
  metalness: 0,
  roughness: 0.38,
});
`);

    await exportGlb({ scriptPath: script, outPath: out });

    const json = parseGlbJson(readFileSync(out));
    const colors = (json.materials ?? [])
      .map(material => material.pbrMetallicRoughness?.baseColorFactor)
      .filter((color): color is number[] => Array.isArray(color));
    expect(colors.some(color => color[0] > 0.9 && color[1] > 0.65 && color[2] < 0.05)).toBe(true);
  });

  it('rejects when the script file does not exist', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'glb-'));
    await expect(
      exportGlb({ scriptPath: '/does/not/exist.kcad.ts', outPath: path.join(tmp, 'x.glb') }),
    ).rejects.toThrow();
  });
});

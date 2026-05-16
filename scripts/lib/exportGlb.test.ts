import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { exportGlb } from './exportGlb';

const FIXTURE = path.resolve(__dirname, '../../tests/fixtures/gallery/simple-box.kcad.ts');

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

  it('rejects when the script file does not exist', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'glb-'));
    await expect(
      exportGlb({ scriptPath: '/does/not/exist.kcad.ts', outPath: path.join(tmp, 'x.glb') }),
    ).rejects.toThrow();
  });
});

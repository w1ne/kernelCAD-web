import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { evaluateScript, getShapeInfo, isKernelcadAvailable } from './kernelcad-client';

let kernelcadAvailable = false;
let tmpDir: string;

beforeAll(async () => {
  kernelcadAvailable = await isKernelcadAvailable();
  if (!kernelcadAvailable) {
    console.warn(
      'kernelcad CLI not found on PATH and KERNELCAD_BIN not set — skipping kernelcad-client smoke tests. Run `npm run build:cli` and set KERNELCAD_BIN=./dist/cli/index.js, or `npm link`.',
    );
  }
  tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-client-test-'));
});

describe('kernelcad-client', () => {
  it('evaluateScript returns ok=true for a valid script', async (ctx) => {
    if (!kernelcadAvailable) return ctx.skip();
    const path = join(tmpDir, 'box.kcad.ts');
    writeFileSync(path, 'return box(10, 20, 30);');
    const r = await evaluateScript(path);
    expect(r.ok).toBe(true);
    expect(r.diagnostics).toEqual([]);
  });

  it('evaluateScript returns ok=false with diagnostics for a broken script', async (ctx) => {
    if (!kernelcadAvailable) return ctx.skip();
    const path = join(tmpDir, 'broken.kcad.ts');
    // Sphere with face filter — should fail per SKILL.md ("Sphere with any { face } filter → error.")
    writeFileSync(path, 'return sphere(5).fillet(1, { face: "top" });');
    const r = await evaluateScript(path);
    expect(r.ok).toBe(false);
    expect(r.diagnostics.length).toBeGreaterThan(0);
    expect(r.diagnostics[0].code).toMatch(/^feature\./);
  });

  it('getShapeInfo returns volume and bbox for a known box', async (ctx) => {
    if (!kernelcadAvailable) return ctx.skip();
    const path = join(tmpDir, 'box-known.kcad.ts');
    writeFileSync(path, 'return box(10, 20, 30);');
    const info = await getShapeInfo(path);
    expect(info.volume).toBeCloseTo(6000, 0); // 10 * 20 * 30
    expect(info.bbox.min).toEqual([0, 0, 0]);
    expect(info.bbox.max).toEqual([10, 20, 30]);
  });
});

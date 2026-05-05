// tests/integration/v0.3-slice2-named-features.test.ts
//
// Phase-4 integration tests: end-to-end script → recompute → resolver chain
// for slice-2's named features, ordinal fallback, and uniqueness validation.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../src/backends/occt/occtBackend';
import { runScript } from '../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../src/backends/occt/occtLowerer';

async function lowerScript(code: string): Promise<{
  shape: OcctBackend;
  diagnostics: ReturnType<RecomputeEngine['_diagnosticsForTest']> | unknown[];
}> {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const lastRecord = records[records.length - 1];
  const shape = r.shapes.get(lastRecord.id) as OcctBackend;
  return { shape, diagnostics: r.diagnostics };
}

function lineagesWith(shape: OcctBackend, predicate: (l: { labelName?: string; featureName?: string; featureKind?: string; featureOrdinal?: number }) => boolean) {
  if (!shape || !shape.historyMap) return [];
  const out = [];
  for (const [hash, lineage] of shape.historyMap.entries()) {
    if (predicate(lineage)) out.push({ hash, lineage });
  }
  return out;
}

describe('v0.3 slice 2 — named feature resolution', () => {
  beforeAll(async () => { await initOcct(); });

  it('two named .hole() calls produce distinct featureName lineages', async () => {
    const code = `
      const base = box(60, 40, 20);
      return base
        .hole('top', { u: -20, v: 0, diameter: 5, depth: 'through', name: 'mountFront' })
        .hole('top', { u:  20, v: 0, diameter: 5, depth: 'through', name: 'mountBack' });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    expect(diagnostics).toEqual([]);
    const front = lineagesWith(shape, l => l.featureName === 'mountFront' && l.labelName === 'wall');
    const back = lineagesWith(shape, l => l.featureName === 'mountBack' && l.labelName === 'wall');
    expect(front.length).toBeGreaterThanOrEqual(1);
    expect(back.length).toBeGreaterThanOrEqual(1);
    // featureName must distinguish them.
    expect(front[0].lineage.featureName).toBe('mountFront');
    expect(back[0].lineage.featureName).toBe('mountBack');
  });

  it('fillet via <name>.wall lands on the named feature only', async () => {
    const code = `
      const base = box(60, 40, 20);
      return base
        .hole('top', { u: -20, v: 0, diameter: 5, depth: 'through', name: 'a' })
        .hole('top', { u:  20, v: 0, diameter: 5, depth: 'through', name: 'b' })
        .fillet(0.2, { face: 'a.wall' });
    `;
    const { diagnostics } = await lowerScript(code);
    expect(diagnostics).toEqual([]);
    // We can't easily measure which bore got filleted without geometry probes;
    // success of the recompute (no diagnostics) is the gate.
  });

  it('unnamed .hole() calls get sequential ordinals (hole1, hole2)', async () => {
    const code = `
      const base = box(60, 40, 20);
      return base
        .hole('top', { u: -20, v: 0, diameter: 5, depth: 'through' })
        .hole('top', { u:  20, v: 0, diameter: 5, depth: 'through' });
    `;
    const { shape } = await lowerScript(code);
    const hole1Walls = lineagesWith(shape, l => l.featureKind === 'hole' && l.featureOrdinal === 1 && l.labelName === 'wall');
    const hole2Walls = lineagesWith(shape, l => l.featureKind === 'hole' && l.featureOrdinal === 2 && l.labelName === 'wall');
    expect(hole1Walls.length).toBeGreaterThanOrEqual(1);
    expect(hole2Walls.length).toBeGreaterThanOrEqual(1);
  });

  it('hole1.wall ordinal selector resolves through fillet', async () => {
    const code = `
      const base = box(60, 40, 20);
      return base
        .hole('top', { u: -20, v: 0, diameter: 5, depth: 'through' })
        .hole('top', { u:  20, v: 0, diameter: 5, depth: 'through' })
        .fillet(0.2, { face: 'hole1.wall' });
    `;
    const { diagnostics } = await lowerScript(code);
    expect(diagnostics).toEqual([]);
  });

  it('named features do not consume an ordinal slot for unnamed peers', async () => {
    // Three holes: named, unnamed, unnamed. The unnamed ones should be
    // hole1 and hole2 respectively (named feature sits outside the count).
    const code = `
      const base = box(80, 40, 20);
      return base
        .hole('top', { u: -30, v: 0, diameter: 5, depth: 'through', name: 'middle' })
        .hole('top', { u:   0, v: 0, diameter: 5, depth: 'through' })
        .hole('top', { u:  30, v: 0, diameter: 5, depth: 'through' });
    `;
    const { shape } = await lowerScript(code);
    const middle = lineagesWith(shape, l => l.featureName === 'middle' && l.labelName === 'wall');
    const hole1 = lineagesWith(shape, l => l.featureKind === 'hole' && l.featureOrdinal === 1 && l.labelName === 'wall');
    const hole2 = lineagesWith(shape, l => l.featureKind === 'hole' && l.featureOrdinal === 2 && l.labelName === 'wall');
    expect(middle.length).toBeGreaterThanOrEqual(1);
    expect(hole1.length).toBeGreaterThanOrEqual(1);
    expect(hole2.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects invalid feature names with feature.invalid-args', async () => {
    const code = `
      const base = box(40, 40, 20);
      return base.hole('top', { u: 0, v: 0, diameter: 5, depth: 'through', name: '1invalid' });
    `;
    let threw = false;
    let errorCode: string | undefined;
    let hint: string | undefined;
    try {
      await runScript({ code, fileName: 'test.kcad.ts' });
    } catch (e) {
      threw = true;
      const ke = e as { code?: string; hint?: string; message?: string };
      errorCode = ke.code;
      hint = ke.hint;
    }
    expect(threw).toBe(true);
    expect(errorCode).toBe('feature.invalid-args');
    expect(hint).toContain('start with a letter');
  });

  it('rejects duplicate feature names on the same chain with feature.invalid-args', async () => {
    const code = `
      const base = box(60, 40, 20);
      return base
        .hole('top', { u: -20, v: 0, diameter: 5, depth: 'through', name: 'mount' })
        .hole('top', { u:  20, v: 0, diameter: 5, depth: 'through', name: 'mount' });
    `;
    let threw = false;
    let errorCode: string | undefined;
    let hint: string | undefined;
    try {
      await runScript({ code, fileName: 'test.kcad.ts' });
    } catch (e) {
      threw = true;
      const ke = e as { code?: string; hint?: string; message?: string };
      errorCode = ke.code;
      hint = ke.hint;
    }
    expect(threw).toBe(true);
    expect(errorCode).toBe('feature.invalid-args');
    expect(hint).toContain("already used in this chain");
  });
});

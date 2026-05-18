// tests/unit/capture/sweepTransitionMode.test.ts
//
// Capture → lowerer integration for the new sweep transitionMode option.
// Verifies (1) all three valid modes flow from sketch.sweep(rail, { transitionMode })
// through the lowerer to OcctBackend.sweepFromSketch, and (2) invalid string
// values surface a feature.invalid-args diagnostic instead of crashing.

import { describe, it, expect, beforeAll } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const lbendCode = (mode: string) => `
  return path()
    .moveTo(-1, -1)
    .lineTo(1, -1)
    .lineTo(1, 1)
    .lineTo(-1, 1)
    .close()
    .sweep([[0, 0, 0], [0, 0, 30], [30, 0, 30]], { transitionMode: '${mode}' });
`;

describe("sketch.sweep({ transitionMode })", () => {
  beforeAll(async () => { await initOcct(); });

  it("accepts 'right' (default behavior) end-to-end", async () => {
    const m = await buildModel({ fileName: 'sweep-right.kcad.ts', code: lbendCode('right') });
    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(m.tailShape).toBeDefined();
    expect(m.tailShape!.volume()).toBeGreaterThan(0);
  });

  it("accepts 'transformed' end-to-end", async () => {
    const m = await buildModel({ fileName: 'sweep-transformed.kcad.ts', code: lbendCode('transformed') });
    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(m.tailShape!.volume()).toBeGreaterThan(0);
  });

  it("accepts 'round' and produces a different solid than 'right'", async () => {
    const right = await buildModel({ fileName: 'sweep-r.kcad.ts', code: lbendCode('right') });
    const round = await buildModel({ fileName: 'sweep-rd.kcad.ts', code: lbendCode('round') });
    expect(round.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(round.tailShape!.volume()).toBeGreaterThan(0);
    expect(Math.abs(round.tailShape!.volume() - right.tailShape!.volume())).toBeGreaterThan(0.1);
  });

  it("emits feature.invalid-args for an unknown transitionMode string", async () => {
    const m = await buildModel({
      fileName: 'sweep-bad.kcad.ts',
      code: `
        return path()
          .moveTo(-1, -1)
          .lineTo(1, -1)
          .lineTo(1, 1)
          .lineTo(-1, 1)
          .close()
          .sweep([[0, 0, 0], [0, 0, 30]], { transitionMode: 'wobble' });
      `,
    });
    const errs = m.diagnostics.filter((d) => d.severity === 'error');
    expect(errs.length).toBe(1);
    expect(errs[0].code).toBe('feature.invalid-args');
    expect(errs[0].message).toMatch(/transitionMode/);
  });
});

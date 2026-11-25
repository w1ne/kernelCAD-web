// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// #1785: a circular-profile `Sketch.sweep` with `transitionMode: 'round'`
// produced an unsewn shell and had to be refused. `bendRadius` replaces each
// polyline corner with a tangent arc before the sweep, so the spine is exact
// line/arc geometry and the same profile becomes one valid solid whose volume
// matches the analytic bent-centreline length.
import { beforeAll, describe, expect, it } from 'vitest';
import { getOC } from 'replicad';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery';
import { buildModel, updateModelParams } from '../../../src/modeling/buildModel';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';
import { KernelError } from '../../../src/shared/intent/kernelError';

const RAIL = '[[0,0,0],[30,0,0],[30,30,0]]';
const PROFILE_RADIUS = 4;
const PROFILE_AREA = Math.PI * PROFILE_RADIUS * PROFILE_RADIUS;
const BEND_RADIUS = 6;
// 90° corner with radius 6: each straight loses 6 mm, the arc adds 6·π/2.
const ANALYTIC_LENGTH = (30 - BEND_RADIUS) * 2 + (BEND_RADIUS * Math.PI) / 2;
const ANALYTIC_VOLUME = PROFILE_AREA * ANALYTIC_LENGTH;

function wrapped(shape: OcctBackend): unknown {
  return (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;
}

async function caught(fn: () => Promise<unknown>): Promise<KernelError> {
  try {
    await fn();
  } catch (e) {
    expect(e).toBeInstanceOf(KernelError);
    return e as KernelError;
  }
  throw new Error('expected a KernelError');
}

describe('Sketch.sweep bendRadius (#1785)', () => {
  beforeAll(async () => {
    await initOcct();
  }, 120_000);

  it('builds a circular-profile elbow as one valid solid at the analytic volume', async () => {
    const model = await buildModel({
      code: `return path().circle(0, 0, ${PROFILE_RADIUS}).sweep(${RAIL}, { bendRadius: ${BEND_RADIUS} });`,
      fileName: 'sweep-bend-radius.kcad.ts',
    });

    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape as OcctBackend;
    try {
      expect(shape.solidComponents()).toHaveLength(1);
      expect(isValidShape(getOC(), wrapped(shape))).toBe(true);
      const volume = shape.volume();
      expect(Math.abs(volume - ANALYTIC_VOLUME) / ANALYTIC_VOLUME).toBeLessThan(0.005);
      const box = shape.boundingBox();
      // The 90° bend bulges past the corner by (bendRadius + profileRadius)
      // minus bendRadius, so x reaches ~34.8; the second leg still ends at y=30.
      expect(box.max[0]).toBeGreaterThan(34);
      expect(box.max[0]).toBeLessThan(35.5);
      expect(box.max[1]).toBeCloseTo(30, 1);
      expect(box.max[2]).toBeCloseTo(PROFILE_RADIUS, 1);
    } finally {
      shape.dispose?.();
    }
  }, 120_000);

  it('exports the bent elbow to STEP', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kcad-sweep-bend-'));
    const result = await exportModelTool({
      code: `return path().circle(0, 0, ${PROFILE_RADIUS}).sweep(${RAIL}, { bendRadius: ${BEND_RADIUS} });`,
      output_path: join(dir, 'bent-elbow.step'),
      format: 'step',
    });
    expect(result.ok).toBe(true);
    expect((result.diagnostics ?? []).filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.byte_count).toBeGreaterThan(0);
  }, 300_000);

  it('also sews a non-circular closed profile on the same bent rail', async () => {
    const square = 'path().moveTo(-2, -2).lineTo(2, -2).lineTo(2, 2).lineTo(-2, 2).close()';
    const model = await buildModel({
      code: `return ${square}.sweep(${RAIL}, { bendRadius: ${BEND_RADIUS} });`,
      fileName: 'sweep-bend-radius-square.kcad.ts',
    });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape as OcctBackend;
    try {
      expect(shape.solidComponents()).toHaveLength(1);
      expect(isValidShape(getOC(), wrapped(shape))).toBe(true);
      const analytic = 16 * ANALYTIC_LENGTH;
      expect(Math.abs(shape.volume() - analytic) / analytic).toBeLessThan(0.005);
    } finally {
      shape.dispose?.();
    }
  }, 120_000);

  it('leaves the default sharp-corner sweep unchanged', async () => {
    const model = await buildModel({
      code: `return path().circle(0, 0, ${PROFILE_RADIUS}).sweep(${RAIL}, { transitionMode: 'right' });`,
      fileName: 'sweep-sharp-unchanged.kcad.ts',
    });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape as OcctBackend;
    try {
      // The sharp mitre keeps the full 60 mm of swept path.
      expect(shape.volume()).toBeCloseTo(60 * PROFILE_AREA, 1);
      expect(isValidShape(getOC(), wrapped(shape))).toBe(true);
    } finally {
      shape.dispose?.();
    }
  }, 120_000);

  it('tracks a ParamRef bend radius through a parameter update', async () => {
    const model = await buildModel({
      code: `const rb = param('bendRadius', ${BEND_RADIUS});
        return path().circle(0, 0, ${PROFILE_RADIUS}).sweep(${RAIL}, { bendRadius: rb });`,
      fileName: 'sweep-bend-radius-param.kcad.ts',
    });
    const first = model.rootShape as OcctBackend;
    try {
      expect(Math.abs(first.volume() - ANALYTIC_VOLUME) / ANALYTIC_VOLUME).toBeLessThan(0.005);
    } finally {
      first.dispose?.();
    }

    const updated = await updateModelParams(model, [{ name: 'bendRadius', value: 10 }]);
    expect(updated.model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const next = updated.model.rootShape as OcctBackend;
    try {
      const analytic = PROFILE_AREA * ((30 - 10) * 2 + (10 * Math.PI) / 2);
      expect(next.solidComponents()).toHaveLength(1);
      expect(isValidShape(getOC(), wrapped(next))).toBe(true);
      expect(Math.abs(next.volume() - analytic) / analytic).toBeLessThan(0.005);
    } finally {
      next.dispose?.();
    }
  }, 120_000);

  it.each([
    ["{ bendRadius: 6, spine: 'smooth' }", /opts\.spine/],
    ["{ bendRadius: 6, spine: 'helix' }", /spine 'helix' needs/],
    ["{ bendRadius: 6, transitionMode: 'round' }", /opts\.transitionMode/],
    ['{ bendRadius: 0 }', /opts\.bendRadius/],
    ['{ bendRadius: -2 }', /opts\.bendRadius/],
    // A 90° tangent length of 31 mm cannot fit on a 30 mm leg.
    ['{ bendRadius: 31 }', /rail leg 0/],
  ])('rejects %s with feature.invalid-args', async (opts, message) => {
    const error = await caught(() =>
      buildModel({
        code: `return path().circle(0, 0, ${PROFILE_RADIUS}).sweep(${RAIL}, ${opts});`,
        fileName: 'sweep-bend-radius-bad-opts.kcad.ts',
      }),
    );
    expect(error.code).toBe('feature.invalid-args');
    expect(error.message).toMatch(message);
  }, 120_000);
});

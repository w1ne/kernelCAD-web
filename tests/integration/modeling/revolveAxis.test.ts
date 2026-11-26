// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// `Sketch.revolve({ axis })` turns a profile around an explicit in-plane line
// instead of the default sketch x = 0 axis.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel } from '../../../src/modeling/buildModel';

// A 10 mm wide x 10 mm tall rectangle, 10 mm from the default axis.
const OFFSET_PROFILE = 'path().moveTo(10, 0).lineTo(20, 0).lineTo(20, 10).lineTo(10, 10).close()';
// A 10 mm long x 8 mm tall rectangle above the horizontal line y = 10.
const ABOVE_PROFILE = 'path().moveTo(0, 12).lineTo(10, 12).lineTo(10, 20).lineTo(0, 20).close()';

async function build(code: string) {
  return buildModel({ fileName: 'revolve-axis.kcad.ts', code });
}

function errors(model: Awaited<ReturnType<typeof build>>) {
  return model.diagnostics.filter((d) => d.severity === 'error');
}

async function errorCodes(code: string): Promise<string[]> {
  try {
    return errors(await build(code)).map((d) => d.code);
  } catch (e) {
    return [(e as { code?: string }).code ?? String(e)];
  }
}

function wrappedOf(shape: unknown): unknown {
  return (shape as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;
}

describe('Sketch.revolve axis', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('revolves around an offset vertical axis', async () => {
    const model = await build(
      `return ${OFFSET_PROFILE}.revolve({ axis: { through: [5, 0], direction: [0, 1] } });`,
    );
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // Pappus: pi * (15^2 - 5^2) * 10 = 2000 pi.
    expect(shape.volume()).toBeCloseTo(2000 * Math.PI, 3);
    const bb = shape.boundingBox();
    expect(bb.min[0]).toBeCloseTo(-10, 3);
    expect(bb.max[0]).toBeCloseTo(20, 3);
    expect(bb.min[1]).toBeCloseTo(-15, 3);
    expect(bb.max[1]).toBeCloseTo(15, 3);
    expect(bb.min[2]).toBeCloseTo(0, 6);
    expect(bb.max[2]).toBeCloseTo(10, 6);
  }, 120_000);

  it('revolves a profile on the negative side of the axis', async () => {
    const code =
      `return path().moveTo(10, 0).lineTo(20, 0).lineTo(20, -10).lineTo(10, -10).close()` +
      `.revolve({ axis: { through: [5, 0], direction: [0, 1] } });`;
    const model = await build(code);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    expect(model.tailShape!.volume()).toBeCloseTo(2000 * Math.PI, 3);
    const bb = model.tailShape!.boundingBox();
    expect(bb.min[2]).toBeCloseTo(-10, 6);
    expect(bb.max[2]).toBeCloseTo(0, 6);
  }, 120_000);

  it('revolves around a horizontal axis', async () => {
    const model = await build(
      `return ${ABOVE_PROFILE}.revolve({ axis: { through: [0, 10], direction: [1, 0] } });`,
    );
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // Pappus: 10 * 8 area, centroid 6 mm from the axis -> 960 pi.
    expect(shape.volume()).toBeCloseTo(960 * Math.PI, 3);
    const bb = shape.boundingBox();
    expect(bb.min[0]).toBeCloseTo(0, 6);
    expect(bb.max[0]).toBeCloseTo(10, 6);
    expect(bb.min[1]).toBeCloseTo(-10, 3);
    expect(bb.max[1]).toBeCloseTo(10, 3);
    expect(bb.min[2]).toBeCloseTo(0, 3);
    expect(bb.max[2]).toBeCloseTo(20, 3);
  }, 120_000);

  it('centres a symmetric partial revolve on the explicit axis', async () => {
    const code =
      `return ${ABOVE_PROFILE}.revolve({ angleDeg: 90, symmetric: true, axis: { through: [0, 10], direction: [1, 0] } });`;
    const model = await build(code);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(shape.volume()).toBeCloseTo((960 * Math.PI) / 4, 2);
    const bb = shape.boundingBox();
    const s45 = Math.sin(Math.PI / 4);
    expect(bb.min[1]).toBeCloseTo(-10 * s45, 2);
    expect(bb.max[1]).toBeCloseTo(10 * s45, 2);
    expect(bb.min[2]).toBeCloseTo(10 + 2 * s45, 2);
    expect(bb.max[2]).toBeCloseTo(20, 2);

    const mid = await build(
      `${code.replace(/return (.*);/, 'return ($1)')}.intersect(box(20, 0.02, 30).translate(0, -0.01, -5));`,
    );
    expect(errors(mid), JSON.stringify(mid.diagnostics)).toEqual([]);
    expect(mid.tailShape!.volume()).toBeCloseTo(10 * 8 * 0.02, 4);
  }, 120_000);

  it('accepts a ParamRef axis point and records it symbolically', async () => {
    const model = await build(
      `const axisX = param('axisX', 5);\n` +
      `return ${OFFSET_PROFILE}.revolve({ axis: { through: [axisX, 0], direction: [0, 1] } });`,
    );
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    expect(model.tailShape!.volume()).toBeCloseTo(2000 * Math.PI, 3);
    const revolve = model.records.find((f) => f.kind === 'revolve')!;
    expect(revolve.params.axisThroughX.expression).toContain('axisX');
    expect(revolve.params.axisDirectionX.evaluated).toBe(0);
    expect(revolve.params.axisDirectionY.evaluated).toBe(1);
  }, 120_000);

  it('keeps default-axis records free of axis params', async () => {
    const model = await build(`return ${OFFSET_PROFILE}.revolve();`);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const revolve = model.records.find((f) => f.kind === 'revolve')!;
    expect(revolve.params).not.toHaveProperty('axisThroughX');
    expect(revolve.params).not.toHaveProperty('axisDirectionY');
    expect(model.tailShape!.volume()).toBeCloseTo(3000 * Math.PI, 3);
  }, 120_000);

  it('refuses a profile that crosses the explicit axis', async () => {
    const code =
      `return path().moveTo(0, 0).lineTo(10, 0).lineTo(10, 10).lineTo(0, 10).close()` +
      `.revolve({ axis: { through: [5, 0], direction: [0, 1] } });`;
    expect(await errorCodes(code), code).toContain('feature.revolve.crosses-axis');
  }, 120_000);

  it('refuses a zero axis direction', async () => {
    const code = `return ${OFFSET_PROFILE}.revolve({ axis: { through: [5, 0], direction: [0, 0] } });`;
    expect(await errorCodes(code), code).toContain('feature.invalid-args');
  }, 120_000);

  it.each([
    `{ axis: { through: [5, 0] } }`,
    `{ axis: { through: [5, 0], direction: [0, 1], origin: [0, 0] } }`,
    `{ axis: [5, 0, 0, 1] }`,
    `{ axis: { through: [5], direction: [0, 1] } }`,
  ])('refuses a malformed axis %s', async (call) => {
    const code = `return ${OFFSET_PROFILE}.revolve(${call});`;
    expect(await errorCodes(code), code).toContain('feature.invalid-args');
  }, 120_000);
});

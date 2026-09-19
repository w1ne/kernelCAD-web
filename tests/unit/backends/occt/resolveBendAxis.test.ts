// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { resolveBendAxis } from '../../../../src/modeling/backends/occt/sheetMetalLowerer';

function expectAxis(
  result: ReturnType<typeof resolveBendAxis>,
  origin: [number, number, number],
  direction: [number, number, number],
  edgeLength: number,
): void {
  if (!('axis' in result)) throw new Error(`expected an axis, got ${JSON.stringify(result)}`);
  expect(result.axis.direction).toEqual(direction);
  expect(result.axis.edgeLength).toBeCloseTo(edgeLength, 6);
  expect(result.axis.origin[0]).toBeCloseTo(origin[0], 6);
  expect(result.axis.origin[1]).toBeCloseTo(origin[1], 6);
  expect(result.axis.origin[2]).toBeCloseTo(origin[2], 6);
}

describe('resolveBendAxis characterisation', () => {
  beforeAll(async () => { await initOcct(); });

  it('derives an atX bend axis along Y at the z midline', () => {
    const base = OcctBackend.box(100, 60, 2);
    expectAxis(
      resolveBendAxis(base, { kind: 'query', query: { atX: 50 } }, undefined, 'bend-1', 2),
      [50, 0, 1],
      [0, 1, 0],
      60,
    );
  });

  it('derives an atY bend axis along X at the z midline', () => {
    const base = OcctBackend.box(100, 60, 2);
    expectAxis(
      resolveBendAxis(base, { kind: 'query', query: { atY: 20 } }, undefined, 'bend-1', 2),
      [0, 20, 1],
      [1, 0, 0],
      100,
    );
  });

  it('prefers atX over atY when both are present', () => {
    const base = OcctBackend.box(100, 60, 2);
    expectAxis(
      resolveBendAxis(base, { kind: 'query', query: { atX: 10, atY: 20 } }, undefined, 'bend-1', 2),
      [10, 0, 1],
      [0, 1, 0],
      60,
    );
  });

  it('unwraps an edges ref wrapper object', () => {
    const base = OcctBackend.box(100, 60, 2);
    expectAxis(
      resolveBendAxis(base, { ref: { kind: 'query', query: { atX: 30 } } }, undefined, 'bend-1', 2),
      [30, 0, 1],
      [0, 1, 0],
      60,
    );
  });

  it('defaults the top face to the midline of the long bbox axis (w >= h)', () => {
    const base = OcctBackend.box(100, 60, 2);
    expectAxis(
      resolveBendAxis(base, undefined, { kind: 'canonical', face: 'top' }, 'bend-1', 2),
      [50, 0, 1],
      [0, 1, 0],
      60,
    );
  });

  it('defaults the bottom face to the midline of the long bbox axis (w < h)', () => {
    const base = OcctBackend.box(60, 100, 2);
    expectAxis(
      resolveBendAxis(base, undefined, { kind: 'canonical', face: 'bottom' }, 'bend-1', 2),
      [0, 50, 1],
      [1, 0, 0],
      60,
    );
  });

  it('returns the unsupported-selector diagnostic for a missing ref', () => {
    const base = OcctBackend.box(100, 60, 2);
    expect(resolveBendAxis(base, undefined, undefined, 'bend-1', 2)).toEqual({
      diagnostic: {
        target: 'export-occt',
        code: 'feature.bend.edge-not-linear',
        featureId: 'bend-1',
        severity: 'error',
        message: '.bend(): could not derive a bend axis from the selector. Slice-1 supports { atX: <n> }, { atY: <n> }, or { face: "top" | "bottom" }.',
        hint: '.bend() slice-1 selectors: pass an EdgeQuery with atX/atY (e.g. { atX: 50 }) or { face: "top" }. thickness=2',
      },
    });
  });

  it('returns the unsupported-selector diagnostic for a non-finite atX', () => {
    const base = OcctBackend.box(100, 60, 2);
    expect(resolveBendAxis(base, { kind: 'query', query: { atX: Number.NaN } }, undefined, 'bend-1', 2))
      .toEqual({
        diagnostic: {
          target: 'export-occt',
          code: 'feature.bend.edge-not-linear',
          featureId: 'bend-1',
          severity: 'error',
          message: '.bend(): could not derive a bend axis from the selector. Slice-1 supports { atX: <n> }, { atY: <n> }, or { face: "top" | "bottom" }.',
          hint: '.bend() slice-1 selectors: pass an EdgeQuery with atX/atY (e.g. { atX: 50 }) or { face: "top" }. thickness=2',
        },
      });
  });

  it('returns the unsupported-selector diagnostic for a non-top/bottom face', () => {
    const base = OcctBackend.box(100, 60, 2);
    expect(resolveBendAxis(base, undefined, { kind: 'canonical', face: 'left' }, 'bend-1', 2))
      .toEqual({
        diagnostic: {
          target: 'export-occt',
          code: 'feature.bend.edge-not-linear',
          featureId: 'bend-1',
          severity: 'error',
          message: '.bend(): could not derive a bend axis from the selector. Slice-1 supports { atX: <n> }, { atY: <n> }, or { face: "top" | "bottom" }.',
          hint: '.bend() slice-1 selectors: pass an EdgeQuery with atX/atY (e.g. { atX: 50 }) or { face: "top" }. thickness=2',
        },
      });
  });
});

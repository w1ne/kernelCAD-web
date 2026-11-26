// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { KernelError } from '../../../shared/intent/kernelError';
import { findPartHost } from '../findPart';
import { elementFamilySpecs, elementSolid, isElementFamily, resolveElement } from './registry';
import { searchElementLibrary } from './search';

const CASES = [
  { family: 'linear-rail', size: 'MGN12', lengthMm: 350, box: [350, 12, 8], names: ['base-mount', 'rail-axis', 'end-a', 'end-b'] },
  { family: 'linear-carriage', size: 'MGN12H', box: [45.4, 27, 13], names: ['rail-mate', 'top-mount', 'front-end', 'rear-end'] },
  { family: 'aluminum-extrusion', size: '2020', lengthMm: 450, box: [20, 20, 450], names: ['end-a', 'end-b', 'slot-pos-x', 'slot-neg-x', 'slot-pos-y', 'slot-neg-y'] },
  { family: 'extrusion-bracket', size: '2020-corner', box: [30, 30, 4], names: ['leg-a', 'leg-b'] },
  { family: 'extrusion-t-nut', size: '20-M3', box: [10, 8, 4.6], names: ['slot-seat', 'thread-axis'] },
  { family: 'linear-bearing', size: 'LM8UU', box: [15, 15, 24], names: ['bore-axis', 'end-a', 'end-b'] },
  { family: 'shaft-support', size: 'SK8', box: [40, 16, 29], names: ['base-mount', 'shaft-axis'] },
  { family: 'leadscrew', size: 'Tr8x8', lengthMm: 300, box: [8, 8, 300], names: ['end-a', 'end-b', 'axis'] },
  { family: 'leadscrew-nut', size: 'T8-flange', box: [22, 22, 15], names: ['flange-seat', 'screw-axis'] },
  { family: 'shaft-collar', size: '8', box: [16, 16, 6], names: ['bore-axis', 'face-a', 'face-b'] },
  { family: 'shaft-coupler', size: 'jaw-5x8', box: [25, 25, 30], names: ['bore-a', 'bore-b'] },
  { family: 'timing-pulley', size: 'GT2-20T-5', box: [14.73, 14.73, 11], names: ['bore-axis', 'hub-face', 'belt-center'] },
] as const;

describe('standard mechanical element library', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('resolves every family to a non-empty OCCT solid, nominal bounds, and named connectors', () => {
    for (const testCase of CASES) {
      expect(isElementFamily(testCase.family)).toBe(true);
      const part = resolveElement(testCase);
      const solid = elementSolid(part);
      expect(solid.volume(), part.id).toBeGreaterThan(0);
      const bounds = solid.boundingBox();
      const spans = bounds.max.map((value, axis) => value - bounds.min[axis]!) as number[];
      for (let axis = 0; axis < 3; axis += 1) expect(spans[axis]).toBeCloseTo(testCase.box[axis]!, 1);
      expect(part.connectors.map((connector) => connector.name)).toEqual(testCase.names);
    }
  }, 120_000);

  it('reports invalid sizes and non-positive or out-of-range parametric lengths as invalidArgs', () => {
    for (const { family } of CASES) {
      expect(() => resolveElement({ family, size: '__invalid__' })).toThrow(KernelError);
    }
    for (const [family, size, max] of [
      ['linear-rail', 'MGN12', 2000], ['aluminum-extrusion', '2020', 3000], ['leadscrew', 'Tr8x2', 1500],
    ] as const) {
      for (const lengthMm of [0, max + 1]) {
        try {
          resolveElement({ family, size, lengthMm });
          throw new Error('invalid length unexpectedly resolved');
        } catch (error) {
          expect(error).toBeInstanceOf(KernelError);
          expect((error as KernelError).code).toBe('feature.invalid-args');
        }
      }
    }
  });

  it('keeps every stocked size across all 12 families as a single connected positive-volume solid', () => {
    let checked = 0;
    for (const spec of elementFamilySpecs()) {
      for (const size of Object.keys(spec.sizes)) {
        const solid = elementSolid(resolveElement({
          family: spec.family,
          size,
          ...(spec.lengthMm ? { lengthMm: 100 } : {}),
        }));
        expect(solid.solidComponents().length, `${spec.family}:${size} solid count`).toBe(1);
        expect(solid.volume(), `${spec.family}:${size} volume`).toBeGreaterThan(0);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(80);
  });

  it('keeps user lengths on rails, extrusions, and leadscrews in the resolved envelope', () => {
    const requests = [
      { family: 'linear-rail', size: 'MGN12', lengthMm: 351, axis: 0 },
      { family: 'aluminum-extrusion', size: '2020', lengthMm: 451, axis: 2 },
      { family: 'leadscrew', size: 'Tr8x2', lengthMm: 301, axis: 2 },
    ] as const;
    for (const { family, size, lengthMm, axis } of requests) {
      const part = resolveElement({ family, size, lengthMm });
      expect(part.lengthMm).toBe(lengthMm);
      const box = elementSolid(part).boundingBox();
      expect(box.max[axis] - box.min[axis]).toBeCloseTo(lengthMm, 4);
    }
  });

  it('find_part recognizes standard element designations and measured lengths', async () => {
    const examples = [
      ['MGN12 350', 'linear-rail', 350], ['MGN12H', 'linear-carriage', undefined],
      ['2020 extrusion 450', 'aluminum-extrusion', 450], ['LM8UU', 'linear-bearing', undefined],
      ['SK8', 'shaft-support', undefined], ['Tr8x8 300', 'leadscrew', 300],
      ['T8 flange nut', 'leadscrew-nut', undefined], ['jaw coupler 5x8', 'shaft-coupler', undefined],
      ['shaft collar 8', 'shaft-collar', undefined], ['GT2 20T', 'timing-pulley', undefined],
    ] as const;
    for (const [query, family, lengthMm] of examples) {
      const result = await findPartHost(query, { source: 'local' });
      const match = result.results.find((record) => record.family === family);
      expect(match, query).toBeDefined();
      if (lengthMm !== undefined) expect(match?.attributes.lengthMm).toBe(lengthMm);
    }
  });

  it('does not infer a numeric-only element family from an unrelated size token', () => {
    expect(searchElementLibrary('DIN 912 M5x16')).toEqual([]);
    expect(searchElementLibrary('5').map((record) => record.id)).toEqual(['element-shaft-collar-5']);
    expect(searchElementLibrary('5 mm').map((record) => record.id)).toEqual(['element-shaft-collar-5']);
  });
});

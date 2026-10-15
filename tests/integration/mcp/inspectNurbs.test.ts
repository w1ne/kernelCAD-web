// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { inspectNurbsTool } from '../../../src/agent/mcp/tools/inspectNurbs';

describe('inspect_nurbs', () => {
  it.each([
    { weights: '[2,2,2]', rational: false, uniformWeights: true, hasNonUnitWeights: true },
    { weights: '[1,1,1]', rational: false, uniformWeights: true, hasNonUnitWeights: false },
    { weights: '[1,2,1]', rational: true, uniformWeights: false, hasNonUnitWeights: true },
  ])('reports OCCT rational semantics and weight flags for $weights', async ({ weights, rational, uniformWeights, hasNonUnitWeights }) => {
    const result = await inspectNurbsTool({ code: `
      const curve = nurbsCurve([[0,0,0],[1,1,0],[2,0,0]], { degree: 2, weights: ${weights} });
      return curve;
    ` });
    expect(result).toMatchObject({ ok: true, rational, uniformWeights, hasNonUnitWeights });
  });

  it('returns the captured rational curve definition with distinct knots and multiplicities', async () => {
    const result = await inspectNurbsTool({ code: `
      const curve = nurbsCurve([[0,0,0],[1,1,0],[2,0,0]], {
        degree: 2, weights: [1, 0.5, 1], knots: [0,0,0,1,1,1]
      });
      return curve;
    ` });
    expect(result).toMatchObject({
      ok: true, feature_id: 'curve3d_1', degree: 2,
      knots: [0, 1], multiplicities: [3, 3],
      poles: [[0,0,0],[1,1,0],[2,0,0]], weights: [1,0.5,1],
      rational: true, parameter_range: [0,1],
    });
  });

  it('supports feature_id selection and reports when no curve matches', async () => {
    const code = `const a = nurbsCurve([[0,0,0],[1,0,0]]); const b = nurbsCurve([[0,0,0],[0,1,0]]); return b;`;
    expect(await inspectNurbsTool({ code, feature_id: 'curve3d_1' })).toMatchObject({ ok: true, feature_id: 'curve3d_1' });
    expect(await inspectNurbsTool({ code, feature_id: 'missing' })).toMatchObject({ ok: false, errorCode: 'nurbs.inspect.not-found' });
  });
});

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// A param() value is accepted wherever a number is; a selector query is no exception.
import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';

const BODY = `
  const headH = param('headH', 15);
  const r = param('r', 7.5);
  const body = cylinder(15, 20).union(cylinder(95, 7.5).translate(0, 0, 14.9));
`;

describe('selectEdges with param() values in the query', () => {
  it('reads a param inside near like a plain number', async () => {
    const result = await evaluateScript({
      code: `${BODY}
        const e = await selectEdges(body, { ofCurveType: 'CIRCLE', near: [r, 0, headH] });
        return body.fillet(2, e);`,
    });
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it('reads a derived param expression in atZ and within', async () => {
    const result = await evaluateScript({
      code: `${BODY}
        const e = await selectEdges(body, { atZ: headH.add(95), within: { zMax: headH.add(100) } });
        if (e.length === 0) throw new Error('no edges at the shank top (z ~ 110)');
        return body;`,
    });
    expect(result.exitCode).toBe(0);
  });
});

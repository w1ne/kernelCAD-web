// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

describe('curves-surfacing public evaluate path', () => {
  it('evaluate_script runs curveBridge + surfaceIntersection', async () => {
    const code = `
      const left = spline3d([[-20, 0, 0], [-10, 4, 0], [0, 0, 0]]);
      const right = spline3d([[12, 0, 0], [22, -4, 0], [32, 0, 0]]);
      const blend = curveBridge(left, right, { continuity: 'G2' });
      const run = cylinder(24, 6);
      const cutter = box(40, 40, 0.05, true).rotateY(30).translate(0, 0, 12);
      const seams = await surfaceIntersection(run, cutter);
      const profile = path().moveTo(-1, -1).lineTo(1, -1).lineTo(1, 1).lineTo(-1, 1).close();
      const rib = variableSweep(blend, [
        { t: 0, profile },
        { t: 1, profile: path().moveTo(-1, -1).lineTo(1, -1).lineTo(1, 1).lineTo(-1, 1).close() },
      ]);
      return rib.union(run);
    `;
    const result = await callMcpTool('evaluate_script', { code }) as {
      ok: boolean;
      featureCount: number;
      diagnostics: Array<{ code: string; severity: string }>;
    };
    expect(result.ok).toBe(true);
    expect(result.featureCount).toBeGreaterThan(3);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
  }, 120_000);
});

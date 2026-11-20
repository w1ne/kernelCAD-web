// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/mcp/softWarningsSurfaceInEvaluate.test.ts
//
// Soft warnings raised while the script runs sat on the capture session and
// no evaluation surface read them: `evaluate_script` returned
// `diagnostics: []` for `.color('orange')` (exported grey) and for clamped
// `.material()` fields.
import { describe, it, expect } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

type Diag = { code: string; severity: string; message: string; featureId?: string };
type Out = { ok: boolean; diagnostics: Diag[] };

const evaluate = async (code: string) => (await callMcpTool('evaluate_script', { code, skipMechanismCheck: true })) as Out;

describe('evaluate_script surfaces script soft warnings', () => {
  it('reports an unresolved .color() name as a warning, build still ok', async () => {
    const r = await evaluate("return box(10, 10, 10).color('orange');");
    expect(r.ok).toBe(true);
    const warns = r.diagnostics.filter(d => d.code === 'feature.color.unresolved');
    expect(warns).toHaveLength(1);
    expect(warns[0]).toMatchObject({ severity: 'warn' });
    expect(warns[0].message).toContain("'#ffa500'");
    expect(warns[0].featureId).toBeTruthy();
  }, 120_000);

  it('reports clamped .material() fields', async () => {
    const r = await evaluate("return box(10, 10, 10).material({ baseColor: '#ffffff', roughness: 2 });");
    expect(r.ok).toBe(true);
    expect(r.diagnostics.map(d => d.code)).toContain('feature.material.value-clamped');
  }, 120_000);

  it('adds nothing for a role token or hex colour', async () => {
    const r = await evaluate("return box(10, 10, 10).color('servo').translate(20, 0, 0).color('#3366cc');");
    expect(r.ok).toBe(true);
    expect(r.diagnostics.filter(d => d.severity !== 'info')).toEqual([]);
  }, 120_000);
});

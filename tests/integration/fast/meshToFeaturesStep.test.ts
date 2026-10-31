// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// STEP -> editable feature tree through the registered mesh_to_features tool:
// a kernelCAD-exported STEP is rebuilt and verified against its own B-rep.
import { describe, expect, it, vi } from 'vitest';
vi.setConfig({ hookTimeout: 60_000, testTimeout: 120_000 });
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';

const init = initOcct();

const PLATE = `return box(80, 50, 10)
  .fillet(5, { parallel: [0, 0, 1] })
  .holes('top', {
    positions: [{ u: -30, v: -17 }, { u: 30, v: -17 }, { u: -30, v: 17 }, { u: 30, v: 17 }],
    diameter: 6.6, depth: 'through', name: 'mountingHoles',
  });`;

const TWO_SOLIDS = `const a = assembly('pair');
a.part('plate', box(40, 30, 6));
a.part('block', box(10, 10, 10).translate(60, 0, 0));
return a.model();`;

async function stepBase64(code: string, fileName: string): Promise<string> {
  await init;
  const exported = await runAndExport({ code, fileName, format: 'step' });
  expect(exported.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return Buffer.from(exported.bytes).toString('base64');
}

type Result = {
  ok: boolean;
  error?: string;
  script?: string;
  fidelity?: { volumeIoU: number; maxDeviationMm: number; verdict: string };
  features?: { holes: Array<{ count: number; diameterMm: number; kind: string }> };
  source?: { format: string; solidCount: number; solid: number; tessellation: { linearMm: number; triangles: number } };
  ledger?: { facts: Array<{ id: string; kind: string; statement: string }> };
};

describe('mesh_to_features on STEP input', () => {
  it('rebuilds a filleted, drilled plate from its STEP as an editable, faithful script', async () => {
    const { callMcpTool } = await import('../../../src/agent/mcp/toolRegistry');
    const data = await stepBase64(PLATE, 'step-plate.kcad.ts');
    const r = await callMcpTool('mesh_to_features', { data }) as Result;
    expect(r.ok, r.error).toBe(true);
    expect(r.source).toMatchObject({ format: 'step', solidCount: 1, solid: 0 });
    expect(r.source!.tessellation.linearMm).toBeLessThanOrEqual(0.05);
    expect(r.fidelity!.verdict).toBe('faithful');
    expect(r.fidelity!.volumeIoU).toBeGreaterThanOrEqual(0.98);
    const holes = r.features!.holes;
    expect(holes.reduce((n, h) => n + h.count, 0)).toBe(4);
    expect(holes.every((h) => Math.abs(h.diameterMm - 6.6) < 0.01)).toBe(true);
    expect(r.script).toMatch(/param\(/);
    const units = r.ledger!.facts.find((f) => f.id === 'units');
    expect(units?.statement).toMatch(/STEP/);
  });

  it('refuses a multi-solid STEP without solid, and rebuilds the chosen solid with it', async () => {
    const { callMcpTool } = await import('../../../src/agent/mcp/toolRegistry');
    const data = await stepBase64(TWO_SOLIDS, 'step-pair.kcad.ts');
    const refused = await callMcpTool('mesh_to_features', { data, format: 'step' }) as Result;
    expect(refused.ok).toBe(false);
    expect(refused.error).toMatch(/2 solids; pass solid: 0\.\.1/);
    const picked = await callMcpTool('mesh_to_features', { data, format: 'step', solid: 1, maxPasses: 1 }) as Result;
    expect(picked.ok, picked.error).toBe(true);
    expect(picked.source).toMatchObject({ solidCount: 2, solid: 1 });
    expect(picked.fidelity!.verdict).toBe('faithful');
  });

  it('rejects solid on a mesh input', async () => {
    const { callMcpTool } = await import('../../../src/agent/mcp/toolRegistry');
    await init;
    const stl = await runAndExport({ code: 'return box(10, 8, 2);', fileName: 'tiny.kcad.ts', format: 'stl' });
    const r = await callMcpTool('mesh_to_features', { data: Buffer.from(stl.bytes).toString('base64'), format: 'stl', solid: 0 }) as Result;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/STEP input only/);
  });
});

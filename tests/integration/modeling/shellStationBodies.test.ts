// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/modeling/shellStationBodies.test.ts
//
// shell() on bodies whose curved faces meet at sharp edges between stations:
// the dogfood vase (variableSweep through 6 rotating / scaling hex stations,
// 180 mm tall, 90 → 110 mm across, 60° twist, 2 mm wall) and a ruled loft.
// The arc-join offset cannot close them ("BRepOffsetAPI_MakeThickSolid
// failed"); shellWithHistory now retries with the intersection pass and the
// intersection join, and rejects a strategy whose result is not a plausible
// hollow. When every strategy fails, the diagnostic names the cause and the
// boolean-hollow alternative.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { buildModel } from '../../../src/modeling/buildModel';

const HEX = `
function hex(af, rot) {
  const R = af / Math.sqrt(3); let p = path();
  for (let i = 0; i < 6; i++) {
    const a = (rot + 60 * i) * Math.PI / 180;
    p = i ? p.lineTo(R * Math.cos(a), R * Math.sin(a)) : p.moveTo(R * Math.cos(a), R * Math.sin(a));
  }
  return p.close();
}`;

const VASE = `${HEX}
const secs = [];
for (let i = 0; i < 6; i++) { const t = i / 5; secs.push({ t, profile: hex(90 + 20 * t, 60 * t) }); }
return variableSweep([[0, 0, 0], [0, 0, 180]], secs).shell(2, { face: 'top' });`;

const RULED = `${HEX}
const s = [1, 2, 3, 4, 5].map((i) => hex(90 + 4 * i, 0));
return hex(90, 0).loft(s, { spacing: 36, twistDeg: 25, ruled: true }).shell(2, { face: 'top' });`;

async function hollow(code: string) {
  const m = await buildModel({ fileName: 'shell.kcad.ts', code });
  expect(m.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(m.diagnostics)).toEqual([]);
  const shape = m.tailShape!;
  return { volume: shape.volume(), bbox: shape.boundingBox() };
}

describe('shell on multi-station bodies', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('hollows the dogfood twisted hex vase to a 2 mm wall, centred on its axis', async () => {
    const info = await hollow(VASE);
    // Wall ≈ perimeter (6·side, side = af/√3) × height × 2 mm + a 2 mm floor:
    // 2·180·6·(100/√3) + 2·(√3/2)·90² ≈ 124.7k + 14.0k mm³.
    expect(info.volume).toBeGreaterThan(120_000);
    expect(info.volume).toBeLessThan(150_000);
    expect(info.bbox.min[0] + info.bbox.max[0]).toBeCloseTo(0, 1);
    expect(info.bbox.max[0]).toBeLessThan(75);
  }, 600_000);

  it('hollows a ruled 6-section loft', async () => {
    const info = await hollow(RULED);
    expect(info.volume).toBeGreaterThan(120_000);
    expect(info.volume).toBeLessThan(160_000);
  }, 600_000);

  it('names the cause and the boolean alternative when no join strategy closes the offset', async () => {
    const ev = await evaluateScriptTool({ code: `return box(10, 10, 10).shell(6, { face: 'top' });` });
    expect(ev.ok).toBe(false);
    const d = ev.diagnostics.find((x) => x.code === 'feature.kernel-failed');
    expect(d, JSON.stringify(ev.diagnostics)).toBeDefined();
    expect(d!.message).toMatch(/arc join, arc join with intersection, and intersection join all failed/);
    expect(d!.message).toMatch(/sharp \(non-tangent\) edges/);
    expect(d!.hint).toMatch(/outer\.subtract\(inner\)/);
    expect(d!.hint).toMatch(/twisted-tapered-thin-wall-vase/);
  }, 120_000);
});

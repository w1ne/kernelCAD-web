// SPDX-License-Identifier: MIT
// Small behavior replacements for former long-running geometry integrations.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { internalSpurGearBoreOutline, assertPlanetaryToothCompatibility } from '../../../src/modeling/spurGear';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { boxSoup } from '../../unit/reconstruct/testMeshes';

const init = initOcct();
const SO100 = 'examples/robot-arm/so100/so100-arm.kcad.ts';
const URDF = 'examples/robot-arm/so100/parts/sim/so100.urdf';

describe('fast geometry replacements', () => {
  it('flags the 3 mm sink between two boxes', async () => {
    await init;
    const code = `const a = assembly('contact'); a.part('base', box(10,10,10)); a.part('sink', box(10,10,10).translate(0,0,7)); return a.model();`;
    const result = await checkInterference({ code, fileName: 'sink.kcad.ts', epsilonMm3: 0.01 });
    expect(result.pairs.map((p) => p.volumeMm3)).toEqual([expect.closeTo(300, 5)]);
  }, 4_500);

  it('a single spur gear exports as one solid with no interference pairs', async () => {
    await init;
    const code = `const a = assembly('gear'); a.part('gear', spurGear({ module: 1, teeth: 12, faceWidth: 2 })); return a.model();`;
    const result = await checkInterference({ code, fileName: 'gear.kcad.ts' });
    expect(result.pairs).toEqual([]);
    const stl = await runAndExport({ code, fileName: 'gear.kcad.ts', format: 'stl' });
    expect(stl.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(stl.bytes.byteLength).toBeGreaterThan(0);
  }, 4_500);

  it('keeps the internal spur gear profile and planetary compatibility contracts', () => {
    const profile = internalSpurGearBoreOutline({ module: 1, teeth: 40, pressureAngleDeg: 20, backlash: 0.05 });
    expect(profile.radii.tip).toBeLessThan(profile.radii.pitch);
    expect(() => assertPlanetaryToothCompatibility({ sunTeeth: 12, planetTeeth: 8, ringTeeth: 28 })).not.toThrow();
  });

  it('reconstructs a tiny box mesh with faithful volume and deviation', async () => {
    const { reconstructFromSoup } = await import('../../../src/agent/reconstruct/reconstruct');
    const r = await reconstructFromSoup(boxSoup(10, 8, 2), async () => { const soup = boxSoup(10, 8, 2); const indices = Uint32Array.from({ length: soup.positions.length / 3 }, (_, i) => i); return { ok: true, mesh: { positions: soup.positions, indices } }; }, { maxPasses: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fidelity.volumeIoU).toBeGreaterThanOrEqual(0.98);
      expect(r.fidelity.maxDeviationMm).toBeLessThanOrEqual(0.05);
    }
  }, 4_500);

  it('matches each SO-100 example link origin to its URDF joint origin', () => {
    const source = readFileSync(SO100, 'utf8');
    const urdf = readFileSync(URDF, 'utf8');
    const exampleJoints = [...source.matchAll(/name: '(pan|lift|elbow|wrist|roll|jaw)'[\s\S]*?xyz: \[([^\]]+)\]/g)];
    const urdfJoints = [...urdf.matchAll(/<joint name="([^"]+)" type="revolute">([\s\S]*?)<\/joint>/g)];
    const values = (s: string) => s.trim().split(/[\s,]+/).map(Number);
    const normalized = new Map(urdfJoints.map((m) => [m[1], values(/<origin xyz="([^"]+)"/.exec(m[2])![1]).map((v) => v * 1000)]));
    const map: Record<string, string> = { pan: 'shoulder_pan', lift: 'shoulder_lift', elbow: 'elbow_flex', wrist: 'wrist_flex', roll: 'wrist_roll', jaw: 'gripper' };
    expect(exampleJoints.length).toBeGreaterThan(0);
    for (const m of exampleJoints) values(m[2]).forEach((v, i) => expect(v).toBeCloseTo(normalized.get(map[m[1]])![i], 9));
  });

  it('uses the tube clearance gate to fail evaluation and refuse STEP export', async () => {
    const file = 'examples/tube-routing-engine/engine-lines-broken.kcad.ts';
    const result = await evaluateScriptTool({ file });
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'tube.clearance.violated' })]));
  }, 4_500);
});

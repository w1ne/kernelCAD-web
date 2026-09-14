// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `hole({ countersink })` must cut a real cone. The bundled OCCT wasm has no
// BRepPrimAPI_MakeCone and the old cone builder swallowed that failure, so a
// countersunk hole silently came out as a plain bore. The cone is now a
// revolved profile, and a sub-feature that cannot be built is an error
// diagnostic, never a silent pass.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { callMcpTool } from '../../../../src/agent/mcp/toolRegistry';

async function lower(code: string) {
  const run = await runScript({ code, fileName: 'csk.kcad.ts' });
  const r = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
  return { run, result: r, shape: r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend | undefined };
}

async function volumeOf(code: string): Promise<number> {
  const out = (await callMcpTool('inspect', { of: 'shape', code })) as { ok: boolean; error?: string; shape: { volume: number } };
  expect(out.ok, out.error).toBe(true);
  return out.shape.volume;
}

/** Bore πr²T plus the conical recess above it: a frustum from the rim radius
 *  R at the face down to the bore radius r, depth (R − r)/tan(angle/2). */
function countersunkRemoval(boreR: number, rimR: number, angleDeg: number, thickness: number): number {
  const h = (rimR - boreR) / Math.tan(((angleDeg / 2) * Math.PI) / 180);
  const frustum = (Math.PI * h / 3) * (rimR * rimR + rimR * boreR + boreR * boreR);
  return Math.PI * boreR * boreR * thickness + frustum - Math.PI * boreR * boreR * h;
}

describe('hole({ countersink })', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it.each([[90], [82]])('removes the analytic cone + bore volume (%i°)', async (angle) => {
    const code = `return box(30, 30, 10, true).hole('top', { u: 0, v: 0, diameter: 4.5, depth: 'through', countersink: { diameter: 9, angleDeg: ${angle} } });`;
    const removed = 30 * 30 * 10 - (await volumeOf(code));
    expect(removed / countersunkRemoval(2.25, 4.5, angle, 10)).toBeCloseTo(1, 4);
    // And it is really more than the plain bore.
    expect(removed).toBeGreaterThan(Math.PI * 2.25 * 2.25 * 10 + 10);
  });

  it('creates the countersink-cone face on a conical surface', async () => {
    const { result, shape } = await lower(
      `return box(30, 30, 10, true).hole('top', { u: 0, v: 0, diameter: 4.5, depth: 'through', countersink: { diameter: 9 } });`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    const cones = shape!.getReplicadShape().faces.filter((f) => (f.geomType as string) === 'CONE');
    expect(cones).toHaveLength(1);
    const labels = [...shape!.historyMap!.values()].map((l) => l.labelName);
    expect(labels).toContain('countersink-cone');
  });

  it('seats a flat-head screw flush: zero interference and zero gap at the cone', async () => {
    // ISO 10642-style M4 flat head: 90° head of Ø8.96 in a 4.5 bore, plate 6 thick.
    const T = 6;
    const boreR = 2.25;
    const rimR = 4.48;
    const headDepth = rimR - boreR; // 90° → depth = radial step
    const plate = `box(40, 40, ${T}).translate(-20, -20, 0).hole({ atZ: ${T}, byNormal: 'Z' }, { u: 0, v: 0, diameter: ${2 * boreR}, depth: 'through', countersink: { diameter: ${2 * rimR}, angleDeg: 90 } })`;
    const screw = `path().moveTo(0, 0).lineTo(${boreR}, 0).lineTo(${boreR}, ${T - headDepth}).lineTo(${rimR}, ${T}).lineTo(0, ${T}).close().revolve()`;
    const plateVol = await volumeOf(`return ${plate};`);
    const screwVol = await volumeOf(`return ${screw};`);
    // Zero gap: the screw fills exactly what the countersunk hole removed.
    expect(40 * 40 * T - plateVol - screwVol).toBeCloseTo(0, 3);

    const code = `
      const arm = assembly('flush');
      arm.part('plate', ${plate});
      arm.part('screw', ${screw});
      return arm.model();
    `;
    const { checkInterference } = await import('../../../../src/agent/script-runtime/checkInterference');
    const r = await checkInterference({ code, fileName: 'flush.kcad.ts' });
    expect(r.comparisonCount).toBe(1);
    expect(r.diagnostics.filter((d) => d.code === 'feature.kernel-failed')).toHaveLength(0);
    expect(r.pairs, JSON.stringify(r.pairs)).toEqual([]);

    // Positive control: sink the same screw 0.3 mm deeper and it must clash.
    const sunk = code.replace(`arm.part('screw', ${screw});`, `arm.part('screw', ${screw}, { at: [0, 0, -0.3] });`);
    const clash = await checkInterference({ code: sunk, fileName: 'sunk.kcad.ts' });
    expect(clash.pairs).toHaveLength(1);
    expect(clash.pairs[0].volumeMm3).toBeGreaterThan(1);
  });

  describe('a sub-feature that cannot be built', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let saved: any;
    afterEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (saved !== undefined) (getOC() as any).BRepPrimAPI_MakeRevol_2 = saved;
      saved = undefined;
    });

    it('surfaces an error diagnostic instead of cutting a plain bore', async () => {
      // Force the cone build to fail the way a missing wasm binding did.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oc = getOC() as any;
      saved = oc.BRepPrimAPI_MakeRevol_2;
      oc.BRepPrimAPI_MakeRevol_2 = undefined;
      const { result } = await lower(
        `return box(30, 30, 10, true).hole('top', { u: 0, v: 0, diameter: 4.5, depth: 'through', countersink: { diameter: 9 } });`,
      );
      const err = result.diagnostics.find((d) => d.severity === 'error');
      expect(err?.code).toBe('feature.kernel-failed');
      expect(err?.message).toMatch(/countersink cone cannot be built/);
    });
  });
});

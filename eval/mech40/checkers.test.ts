// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Negative tests for mech40 checkers: near-miss parts that a sampled or
// loose check used to pass. Each script is the reference task with ONE
// deliberate defect; the named check must fail and the others must not.
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fit, FIT_DIAMETER_TOL, hole, HOLE_DIAMETER_TOL } from './checks';
import { failingChecks, listMech40Tasks, runHarness } from './tasks';

const dir = mkdtempSync(join(tmpdir(), 'mech40-neg-'));

async function failing(taskId: string, code: string): Promise<string[]> {
  const [task] = listMech40Tasks(undefined, [taskId]);
  const path = join(dir, `${taskId}.kcad.ts`);
  writeFileSync(path, code);
  return failingChecks(await runHarness(task, path));
}

const corners = (du: number, dv: number) =>
  `[{ u: -${du}, v: -${dv} }, { u: ${du}, v: -${dv} }, { u: -${du}, v: ${dv} }, { u: ${du}, v: ${dv} }]`;

describe('mech40 checkers reject near misses', () => {
  it('01: a plate with two square corners fails "corners rounded" (every corner is probed)', async () => {
    // The reference plate with the (+X,-Y) and (-X,+Y) corners squared off
    // again. The volume stays inside its ±1 % window, and the old probe of
    // the other diagonal (min/min and max/max) passed it.
    const code = `return extrudeRoundedRect(100, 60, 5, 6)
  .holes({ byNormal: 'Z' }, { positions: ${corners(42, 22)}, diameter: 5.5, depth: 'through' })
  .union(box(5, 5, 6).translate(45, -30, 0)).union(box(5, 5, 6).translate(-50, 25, 0));`;
    expect(await failing('01-plate-four-corner-holes', code)).toEqual(['vertical corners rounded (R5)']);
  }, 120_000);

  it('01: Ø5.4 holes fail the Ø5.5 clearance spec', async () => {
    const code = `return extrudeRoundedRect(100, 60, 5, 6)
  .holes({ byNormal: 'Z' }, { positions: ${corners(42, 22)}, diameter: 5.4, depth: 'through' });`;
    expect(await failing('01-plate-four-corner-holes', code)).toEqual(['4 × Ø5.5 through holes 8 mm from the edges']);
  }, 120_000);

  it('06: Ø4.4 holes fail a Ø4.5 spec (used to pass at ±0.1)', async () => {
    const code = `const positions = Array.from({ length: 9 }, (_, k) => ({ u: (k - 4) * 22, v: 0 }));
return box(200, 20, 3).holes('top', { positions, diameter: 4.4, depth: 'through' });`;
    const f = await failing('06-mounting-strip-hole-row', code);
    expect(f).toContain('9 × Ø4.5 at 22 mm pitch on the centreline');
    expect(f).toContain('exactly 9 holes');
  }, 120_000);

  it('39: a Ø22.0 seat (no press allowance) fails the Ø22.1 seat', async () => {
    const code = `return box(40, 40, 12)
  .hole('top', { u: 0, v: 0, diameter: 12, depth: 'through', counterbore: { diameter: 22.0, depth: 7 } })
  .holes('top', { positions: ${corners(15, 15)}, diameter: 4.5, depth: 'through' });`;
    const f = await failing('39-bearing-608-press-seat', code);
    expect(f).toContain('Ø22.1 seat, 7 deep (opens into the Ø12 hole)');
  }, 120_000);
});

describe('hole diameter tolerances', () => {
  it('mech40 holes default to ±0.05; fit() tightens to ±0.02', () => {
    expect(hole(4.5, [0, 0, 0]).diameterTol).toBe(HOLE_DIAMETER_TOL);
    expect(HOLE_DIAMETER_TOL).toBeLessThan(0.1);
    expect(fit(hole(22.1, [0, 0, 0])).diameterTol).toBe(FIT_DIAMETER_TOL);
    expect(fit(hole(3.4, [0, 0, 0]), 0.03).diameterTol).toBe(0.03);
  });

  it('27: a hinge whose positive travel swings the lid INTO the box fails (was the old reference)', async () => {
    // The pre-fix reference: axis +X at y = 60, z = 30 with the lid
    // extending −Y, so 0–110° rotates the lid down through the cavity
    // (5072 mm³ shared with the base at 90°). Closed it looks perfect.
    const fixed = readFileSync(join(__dirname, '../tasks/mech40/27-hinged-lid-box/solution-expert.kcad.ts'), 'utf8');
    const old = fixed.replaceAll('axis: [-1, 0, 0]', 'axis: [1, 0, 0]');
    expect(old).not.toEqual(fixed);
    expect(await failing('27-hinged-lid-box', old)).toEqual(['lid opens up and away from the box across its travel (mid and open limit)']);
  }, 120_000);
});

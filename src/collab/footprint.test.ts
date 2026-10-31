// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import { captureFeatureGraph } from './featureGraph';
import { liftChangeSet } from './changeSet';
import { footprint, independent } from './footprint';

const meta = { baseRevision: 1, agentId: 'a', idempotencyKey: 'k' };

const assemblySource = `
const plateT = param('plateT', 6);
const bracketHoleD = param('bracketHoleD', 6.6);
const bracketHoleX = param('bracketHoleX', 12);
const motorHoleD = param('motorHoleD', 6.6);
const motorHoleX = param('motorHoleX', 12);
const bracketHole = box(40, 30, plateT).hole('top', { u: bracketHoleX, v: 0, diameter: bracketHoleD, depth: 'through' });
const bracketRim = bracketHole.fillet(1, 'top');
const motorHole = box(60, 40, plateT).hole('top', { u: motorHoleX, v: 0, diameter: motorHoleD, depth: 'through' });
const motorRim = motorHole.chamfer(1, 'top');
const asm = assembly('bracket and motor_plate');
const bracketPart = asm.part('bracket', bracketRim, {});
const motorPart = asm.part('motor_plate', motorRim, {});
require('hole-pattern', concentric(
  faces(bracketHole, { ofSurfaceType: 'CYLINDER' }),
  faces(motorHole, { ofSurfaceType: 'CYLINDER' }),
).within(0.5));
return asm.model();
`;

async function liftEdited(edited: string) {
  const base = await captureFeatureGraph(assemblySource, { fileName: 'base.kcad.ts' });
  const graph = await captureFeatureGraph(edited, { fileName: 'edited.kcad.ts' });
  return { base, changeSet: liftChangeSet(base, graph, meta) };
}

describe('footprint', () => {
  it('includes the rest of the bracket body and its placement for a hole edit', async () => {
    const { base, changeSet } = await liftEdited(assemblySource.replace("param('bracketHoleD', 6.6)", "param('bracketHoleD', 8)"));
    const fp = footprint(changeSet, base);
    expect(fp.writes).toEqual(new Set(['$project']));
    expect(fp.downstream).toEqual(expect.objectContaining({}));
    expect([...fp.downstream].every((id) => id !== 'box_2')).toBe(true);
    expect(fp.requirements).toEqual(new Set(['hole-pattern']));
    // bracketRim follows bracketHole in the same body; both placements exist.
    expect(fp.downstream.has('fillet_1')).toBe(true);
    expect(fp.downstream.has('assemblyPart_1')).toBe(true);
    expect(fp.downstream.has('assemblyPart_2')).toBe(false);
  });

  it('treats bracket and motor-plate finish edits as independent', async () => {
    const bracket = await liftEdited(assemblySource.replace("bracketHole.fillet(1, 'top')", "bracketHole.fillet(2, 'top')"));
    const motor = await liftEdited(assemblySource.replace("motorHole.chamfer(1, 'top')", "motorHole.chamfer(2, 'top')"));
    const a = footprint(bracket.changeSet, bracket.base);
    const b = footprint(motor.changeSet, motor.base);
    expect(independent(a, b)).toBe(true);
    expect(a.downstream.has('assemblyPart_1')).toBe(true);
    expect(b.downstream.has('assemblyPart_2')).toBe(true);
  });

  it('does not call two edits feeding the same mass requirement independent', async () => {
    const source = `
const a = box(10, 10, 10);
const b = box(10, 10, 10);
const merged = a.union(b);
require('mass-band', mass(merged).lte(10));
return merged;
`;
    const base = await captureFeatureGraph(source, { fileName: 'base.kcad.ts' });
    const editA = await captureFeatureGraph(source.replace('box(10, 10, 10)', 'box(12, 10, 10)'), { fileName: 'a.kcad.ts' });
    const editB = await captureFeatureGraph(source.replace(/\nconst b = box\(10, 10, 10\);/, '\nconst b = box(10, 14, 10);'), { fileName: 'b.kcad.ts' });
    const a = footprint(liftChangeSet(base, editA, meta), base);
    const b = footprint(liftChangeSet(base, editB, meta), base);
    expect(a.requirements.has('mass-band')).toBe(true);
    expect(b.requirements.has('mass-band')).toBe(true);
    expect(independent(a, b)).toBe(false);
  });
});

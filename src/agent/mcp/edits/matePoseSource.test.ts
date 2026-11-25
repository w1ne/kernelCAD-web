// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// issue #1765: `add_mate` must never write `{ pose: { param: '<Name>' } }`
// into `.kcad.ts`. That object is not a `MatePose` (`Editable<number>` or an
// Euler triple), so Studio rejected the script and `solveMates` resolved the
// object to NaN. The pose argument is now rendered as a numeric literal or the
// identifier of the declared `param(...)` binding.
import { describe, it, expect } from 'vitest';
import { addMateSource } from './assemblySourceEdits';
import { formatMatePose } from './matePoseSource';

const SOURCE = [
  "const stroke = param('Stroke', 25, { min: -40, max: 40 });",
  "const swing = param('Swing', 30, { min: -90, max: 90 });",
  "const rig = assembly('stage');",
  'return rig.model();',
].join('\n');

const BASE = {
  code: SOURCE,
  assembly_binding: 'rig',
  name: 'stage-slide',
  a: 'rail.track',
  b: 'carriage.bore',
  type: 'prismatic' as const,
};

function emittedPoseLine(pose: Parameters<typeof addMateSource>[0]['pose']): string {
  const result = addMateSource({ ...BASE, pose });
  expect(result.ok).toBe(true);
  const line = result.new_code!.split('\n').find((entry) => entry.includes("rig.mate('stage-slide'"));
  expect(line).toBeDefined();
  return line!;
}

describe('add_mate pose emission (issue #1765)', () => {
  it('emits a numeric literal unchanged', () => {
    expect(emittedPoseLine(25)).toContain('pose: 25');
  });

  it('resolves a declared param name to its binding', () => {
    expect(emittedPoseLine('Stroke')).toContain('pose: stroke');
  });

  it('resolves the legacy { param } object to the declared binding', () => {
    const line = emittedPoseLine({ param: 'Stroke' });
    expect(line).toContain('pose: stroke');
    expect(line).not.toContain('param:');
  });

  it('accepts an existing binding identifier', () => {
    expect(emittedPoseLine('stroke')).toContain('pose: stroke');
  });

  it('emits a ball Euler triple of bindings and numbers', () => {
    expect(formatMatePose(SOURCE, ['Swing', 0, 'Stroke'])).toEqual({
      ok: true,
      expression: '[swing, 0, stroke]',
    });
  });

  it('keeps the numeric mate options alongside the resolved pose', () => {
    const result = addMateSource({ ...BASE, pose: { param: 'Stroke' }, limitsMm: [-40, 40] });
    expect(result.ok).toBe(true);
    expect(result.new_code).toContain(
      "rig.mate('stage-slide', 'rail.track', 'carriage.bore', 'prismatic', { pose: stroke, limitsMm: [-40, 40] });",
    );
  });

  it('fails closed when the named param is not declared', () => {
    const result = addMateSource({ ...BASE, pose: { param: 'Missing' } });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no.*param\('Missing'/);
    expect(result.error).toMatch(/Declared params: 'Stroke', 'Swing'/);
  });

  it('fails closed on a non-finite pose', () => {
    const result = addMateSource({ ...BASE, pose: Number.NaN });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/pose must be finite/);
  });

  it('rejects a pose triple that is not xyz', () => {
    const result = addMateSource({ ...BASE, pose: [1, 2] as unknown as [number, number, number] });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/\[x, y, z\]/);
  });
});

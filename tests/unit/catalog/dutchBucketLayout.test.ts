// SPDX-License-Identifier: MIT
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { capture, type Expression, type ParameterValues } from './dutchBucketCapture';

const root = resolve(import.meta.dirname, '../../..');
const source = readFileSync(resolve(root, 'catalog/kits/hydroponics/dutch-bucket-row.kcad.ts'), 'utf8');
const before = readFileSync(resolve(root, 'tests/fixtures/catalog/dutchBucketBeforeLayout.kcad.ts'), 'utf8');
const changed = ['drain-pipe', 'drain-elbow', 'pipe-saddle-6',
  ...Array.from({ length: 6 }, (_, i) => 'dripper-' + i)].sort();
const cases: [string, ParameterValues][] = [
  ['default', {}], ['pepper', { crop: 'pepper' }], ['cucumber', { crop: 'cucumber' }],
  ['minimum', { scale: 0.7 }], ['maximum cucumber', { scale: 1.3, crop: 'cucumber' }],
];

function operations(expression: Expression, name: string): unknown[][] {
  const found: unknown[][] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object' || !('operation' in value) || !('arguments' in value)
      || !Array.isArray(value.arguments)) return;
    if (value.operation === name) found.push(value.arguments);
    for (const argument of value.arguments) visit(argument);
  };
  visit(expression);
  return found;
}
function part(code: string, name: string) {
  const found = capture(code, true).parts.find(value => value.name === name);
  if (!found) throw new Error('Missing part ' + name);
  return found.expression;
}
function oneOperation(expression: Expression, name: string) {
  const found = operations(expression, name);
  expect(found).toHaveLength(1);
  return found[0]!;
}
function dripperTip(code: string, name: string) {
  const expression = part(code, name);
  const length = oneOperation(expression, 'circleExtrusion')[4] as number;
  const tilt = oneOperation(expression, 'rotateY')[1] as number;
  const yaw = oneOperation(expression, 'rotateZ')[1] as number;
  const origin = oneOperation(expression, 'translate').slice(1) as number[];
  return [
    origin[0]! + length * Math.sin(tilt * Math.PI / 180) * Math.cos(yaw * Math.PI / 180),
    origin[1]! + length * Math.sin(tilt * Math.PI / 180) * Math.sin(yaw * Math.PI / 180),
    origin[2]! + length * Math.cos(tilt * Math.PI / 180),
  ];
}

describe('Dutch layout capture without CAD evaluation', () => {
  it.each(cases)('changes only the nine reviewed parts and preserves declarations: %s', (_name, values) => {
    const old = capture(before, true, values), current = capture(source, true, values);
    expect(current.metadata).toEqual(old.metadata);
    expect(current.parts.map(value => value.name)).toEqual(old.parts.map(value => value.name));
    expect(current.parts).toHaveLength(146);
    const changedNames = current.parts.filter((value, index) =>
      JSON.stringify(value.expression) !== JSON.stringify(old.parts[index]!.expression)).map(value => value.name).sort();
    expect(changedNames).toEqual(changed);
    expect(capture(source, false, values)).toEqual(current);
  });
  it('keeps the pipe diameter and seats the outlet and last support at the reviewed coordinates', () => {
    expect(oneOperation(part(source, 'drain-pipe'), 'circleExtrusion')).toEqual([0, 0, 25, 12, 2550]);
    expect(oneOperation(part(source, 'drain-pipe'), 'translate').slice(1)).toEqual([-1300, 0, 70]);
    expect(oneOperation(part(source, 'drain-elbow'), 'translate').slice(1)).toEqual([1250, 0, 0]);
    expect(oneOperation(part(source, 'pipe-saddle-6'), 'translate').slice(1)).toEqual([1170, 0, 25]);
  });
  it('puts all six stakes inside the open mouth without changing their line attachment', () => {
    for (let i = 0; i < 6; i++) {
      const name = 'dripper-' + i, x = -1090 + 420 * i;
      expect(oneOperation(part(source, name), 'translate').slice(1)).toEqual([x, -230, 453]);
      const tip = dripperTip(source, name);
      expect(tip[0]).toBeCloseTo(x, 8);
      expect(tip[1]).toBeCloseTo(-20, 8);
      expect(tip[2]).toBeCloseTo(353, 8);
    }
  });
  it('distinguishes the accepted pre-layout source instead of silently treating it as repaired', () => {
    expect(oneOperation(part(before, 'drain-elbow'), 'translate').slice(1)).toEqual([1400, 0, 0]);
    expect(dripperTip(before, 'dripper-0')[1]).toBeCloseTo(-80, 8);
    expect(dripperTip(before, 'dripper-0')[1]).not.toBeCloseTo(dripperTip(source, 'dripper-0')[1]!, 8);
  });
});

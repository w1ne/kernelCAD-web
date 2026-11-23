// SPDX-License-Identifier: MIT
// Pure capture and source algebra. No OCCT construction, native mesh or memory
// acceptance is implied by these checks.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { PathBuilder, Sketch, type SketchCommand } from '../../../src/modeling/capture/sketch';
import type { CaptureSession } from '../../../src/modeling/capture/captureSession';
import type { Shape } from '../../../src/modeling/capture/proxy';
import { splitSketchLoops } from '../../../src/kernel/backends/occt/sketchToDrawing';
import { capture, type Expression } from './hydroponicGrowRackSourceTrace';
import { sourceBounds, sourceContains, sourceVolume, type Point } from './hydroponicGrowRackSourceGeometry';

const root = resolve(import.meta.dirname, '../../..');
const source = readFileSync(resolve(root, 'catalog/kits/hydroponics/hydroponic-grow-rack.kcad.ts'), 'utf8');
const previous = readFileSync(resolve(root, 'tests/fixtures/catalog/hydroponicGrowRackBooleanLids.kcad.ts'), 'utf8');
const cases = ['lettuce', 'empty', 'microgreens'].flatMap(crop => [.7, 1, 1.3].map(scale => ({ crop, scale })));
const lidNames = Array.from({ length: 3 }, (_, t) => Array.from({ length: 4 }, (_, g) => 'gutter-lid-' + t + '-' + g)).flat();
const outer = [[-1250, -62], [1250, -62], [1250, 62], [-1250, 62]];
const inner = [[-1000, -28], [-1000, 28], [1000, 28], [1000, -28]];

function baseGeometry(e: Expression): Expression {
  return ['translate', 'scale', 'color'].includes(e.operation) ? baseGeometry(e.arguments[0] as Expression) : e;
}
function helper(code: string) {
  const tree = ts.createSourceFile('grow.kcad.ts', code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const declaration = tree.statements.filter(ts.isVariableStatement).flatMap(s => s.declarationList.declarations)
    .find(d => d.name.getText(tree) === 'slottedLid');
  if (!declaration?.initializer) throw new Error('Missing slottedLid source');
  const body = ts.transpileModule('const slottedLid = ' + declaration.initializer.getText(tree) + '; return slottedLid;',
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return new Function('path', 'L', body) as (path: () => PathBuilder, length: number) => (y: number, z: number) => Shape;
}
type Spec = Parameters<CaptureSession['createSketch']>[0];
function captureActualLid(code: string, y: number, z: number) {
  const records: Spec[] = [];
  let placement: Point | undefined;
  const placed = { translate(x: number, atY: number, atZ: number) { placement = [x, atY, atZ]; return this; } };
  const session = {
    createSketch(spec: Spec) { records.push(spec); return new Sketch('lid-profile', session as unknown as CaptureSession); },
    createShape(spec: Spec) { records.push(spec); return placed as unknown as Shape; },
  };
  helper(code)(() => new PathBuilder(session as unknown as CaptureSession), 2400)(y, z);
  return { records, placement };
}
function assertPlanarLids(code: string) {
  const parts = capture(code, true).parts.filter(p => lidNames.includes(p.name));
  expect(parts).toHaveLength(12);
  for (const part of parts) {
    const geometry = baseGeometry(part.expression);
    expect(geometry.operation).toBe('extrudeLoops');
    expect(geometry.arguments).toEqual([[outer, inner], 10]);
  }
}

describe('Grow rack exact rectangular-annulus lid representation without CAD', () => {
  it('captures two separate contours and one extrusion through the actual PathBuilder', () => {
    const result = captureActualLid(source, -270, 280);
    expect(result.records.map(r => r.kind)).toEqual(['sketch', 'extrude']);
    const commands = result.records[0]!.metadata?.commands as SketchCommand[];
    const groups = splitSketchLoops(commands);
    expect(groups).toHaveLength(2);
    expect(commands.filter(c => c.kind === 'moveTo')).toHaveLength(2);
    expect(commands.filter(c => c.kind === 'close')).toHaveLength(1);
    expect(groups.map(group => group.filter(c => c.kind !== 'close').map(c =>
      'x' in c && 'y' in c ? [c.x.evaluated, c.y.evaluated] : []))).toEqual([outer, inner]);
    expect(result.records[1]!.inputs.sketch).toEqual({ kind: 'feature', id: 'lid-profile' });
    expect(result.records[1]!.params.depth?.evaluated).toBe(10);
    expect(result.placement).toEqual([0, -270, 340]);
    const second = captureActualLid(source, 270, 1620);
    expect(second.records[0]!.metadata?.commands).not.toBe(commands);
    expect(second.placement).toEqual([0, 270, 1680]);
    expect(result.records[0]!.metadata?.commands).toEqual(commands);
  });

  it.each(cases)('changes only twelve lid constructions, preserving material at $crop scale $scale', values => {
    const next = capture(source, true, values), before = capture(previous, true, values);
    expect(next.metadata).toEqual(before.metadata);
    expect(next.parts.map(p => p.name)).toEqual(before.parts.map(p => p.name));
    const oldParts = new Map(before.parts.map(p => [p.name, p.expression]));
    const changed = next.parts.filter(p => JSON.stringify(p.expression) !== JSON.stringify(oldParts.get(p.name))).map(p => p.name);
    expect(changed).toEqual(lidNames);
    for (const part of next.parts.filter(p => lidNames.includes(p.name))) {
      const old = oldParts.get(part.name)!;
      expect(sourceBounds(part.expression)).toEqual(sourceBounds(old));
      expect(sourceVolume(part.expression)).toBeCloseTo(sourceVolume(old), 7);
      expect(sourceVolume(part.expression)).toBeCloseTo(1_980_000 * values.scale ** 3, 7);
      const b = sourceBounds(part.expression);
      const y = (b.min[1] + b.max[1]) / 2, z = (b.min[2] + b.max[2]) / 2;
      for (const x of [-1249, -1000.1, -999.9, -960, 0, 960, 999.9, 1000.1, 1249]) {
        for (const localY of [-61.9, -28.1, -27.9, 0, 27.9, 28.1, 61.9]) {
          const p: Point = [x * values.scale, y + localY * values.scale, z];
          expect(sourceContains(part.expression, p)).toBe(sourceContains(old, p));
        }
      }
    }
  });

  it('rejects the exact Boolean predecessor as an operation-cost regression', () => {
    expect(createHash('sha256').update(previous).digest('hex')).toBe('f5345111e61918b42217acda5905d30e8d0f3b3c4fb875c9fd27006254b4ab15');
    assertPlanarLids(source);
    expect(() => assertPlanarLids(previous)).toThrow();
  });

  it('rejects a missing inner moveTo and a changed slot boundary', () => {
    for (const code of [
      source.replace('.moveTo(-1000, -28)', '.lineTo(-1000, -28)'),
      source.replace('.moveTo(-1000, -28)', '.moveTo(-999, -28)'),
    ]) {
      expect(code).not.toBe(source);
      expect(() => assertPlanarLids(code)).toThrow();
    }
  });

  it('fails closed on unsupported or non-nested contour topology', () => {
    for (const loops of [[outer], [outer, outer], [inner, outer], [outer, [[-1, 0], [0, 1], [1, 0]]]]) {
      const e: Expression = { operation: 'extrudeLoops', arguments: [loops, 10] };
      expect(() => sourceVolume(e)).toThrow('Unsupported');
      expect(() => sourceBounds(e)).toThrow('Unsupported');
      expect(() => sourceContains(e, [0, 0, 5])).toThrow('Unsupported');
    }
  });
});

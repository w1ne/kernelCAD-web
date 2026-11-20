// SPDX-License-Identifier: MIT
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const source = readFileSync(resolve(root, 'catalog/kits/hydroponics/hydroponic-grow-rack.kcad.ts'), 'utf8');
const shared = readFileSync(resolve(root, 'tests/fixtures/catalog/hydroponicGrowRackSharedHeads.kcad.ts'), 'utf8');
type Expression = { operation: string; arguments: unknown[] };
type Values = Record<string, string | number>;

// Pure ownership trace, not CAD evaluation. The private hosted Shape proxy
// mutates transforms; the public proxy produces new Shape versions.
function capture(code: string, mutable: boolean, values: Values = {}) {
  const parts: { name: string; expression: Expression }[] = [];
  const metadata: unknown[] = [];
  const names = new Set<string>();
  class ShapeTrace {
    published = false;
    referenced = false;
    constructor(public expression: Expression) {}
    operation(name: string, args: unknown[]) {
      if (mutable && this.published) throw new Error('Mutated an already published part');
      if (mutable && this.referenced) throw new Error('Mutated a captured boolean operand');
      const expression = { operation: name, arguments: [this.expression, ...args] };
      if (!mutable) return new ShapeTrace(expression);
      this.expression = expression;
      return this;
    }
    translate(...args: unknown[]) { return this.operation('translate', args); }
    rotateX(...args: unknown[]) { return this.operation('rotateX', args); }
    rotateY(...args: unknown[]) { return this.operation('rotateY', args); }
    scale(...args: unknown[]) { return this.operation('scale', args); }
    color(...args: unknown[]) { return this.operation('color', args); }
    subtract(other: ShapeTrace) {
      if (mutable && this === other) throw new Error('Aliased boolean operands');
      if (mutable && (this.published || other.published)) throw new Error('Reused an already published part');
      this.referenced = true;
      other.referenced = true;
      return new ShapeTrace({ operation: 'subtract', arguments: [this.expression, other.expression] });
    }
  }
  const primitive = (operation: string) => (...args: unknown[]) => new ShapeTrace({ operation, arguments: args });
  class PathTrace {
    points: number[][] = [];
    moveTo(x: number, y: number) { this.points.push([x, y]); return this; }
    lineTo(x: number, y: number) { this.points.push([x, y]); return this; }
    close() { return this; }
    extrude(height: number) { return primitive('extrude')(this.points.map(point => [...point]), height); }
    loft(other: PathTrace, options: unknown) {
      return primitive('loft')(this.points.map(point => [...point]), other.points.map(point => [...point]), options);
    }
  }
  const model = {
    part(name: string, shape: ShapeTrace) {
      if (names.has(name)) throw new Error('Duplicate named part');
      if (mutable && shape.published) throw new Error('Shared named part handle');
      names.add(name);
      shape.published = true;
      parts.push({ name, expression: shape.expression });
    },
    model() { return parts; },
  };
  const globals = {
    meta: (value: unknown) => { metadata.push(value); },
    presets: (value: unknown) => { metadata.push(value); },
    param: (name: string, defaultValue: string | number, options: unknown) => {
      metadata.push({ name, defaultValue, options });
      return { name, value: values[name] ?? defaultValue };
    },
    assembly: () => model,
    box: primitive('box'),
    path: () => new PathTrace(),
  };
  const body = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  new Function(...Object.keys(globals), body)(...Object.values(globals));
  return { metadata, parts };
}

const cases: [string, Values, number, number][] = [
  ['lettuce default', {}, 272, 108],
  ['empty cups', { crop: 'empty' }, 272, 0],
  ['microgreens', { crop: 'microgreens' }, 224, 0],
  ['minimum scale', { scale: 0.7 }, 272, 108],
  ['maximum scale', { scale: 1.3 }, 272, 108],
];

describe('Grow rack independent shape ownership without CAD evaluation', () => {
  it.each(cases)('keeps independent parts with mutable hosted transforms: %s', (_name, values, count, heads) => {
    const result = capture(source, true, values);
    expect(result.parts).toHaveLength(count);
    expect(result.parts.filter(part => part.name.startsWith('head-'))).toHaveLength(heads);
  });
  it.each(cases)('preserves the public geometry expression and metadata: %s', (_name, values) => {
    expect(capture(source, false, values)).toEqual(capture(shared, false, values));
  });
  it('rejects the exact previous shared-head source under mutable hosted transforms', () => {
    expect(createHash('sha256').update(shared).digest('hex')).toBe('e8e4d180bb5ed55b2c95e1e8b3595e461989c6a69bd54c1c8ad6999682dc8690');
    expect(() => capture(shared, true)).toThrow('Mutated an already published part');
  });
});

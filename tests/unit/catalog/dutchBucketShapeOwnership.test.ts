// SPDX-License-Identifier: MIT
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const source = readFileSync(resolve(root, 'catalog/kits/hydroponics/dutch-bucket-row.kcad.ts'), 'utf8');
const shared = readFileSync(resolve(root, 'tests/fixtures/catalog/dutchBucketSharedPrototype.kcad.ts'), 'utf8');
type Expression = { operation: string; arguments: unknown[] };
type ParameterValues = Record<string, string | number>;

// This is a capture-only lifetime model. It creates no CAD/native geometry.
// The private hosted proxy mutates transforms, while the public proxy creates versions.
function capture(code: string, mutable: boolean, values: ParameterValues = {}) {
  const parts: { name: string; expression: Expression }[] = [];
  const names = new Set<string>();
  const metadata: unknown[] = [];
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
    rotateZ(...args: unknown[]) { return this.operation('rotateZ', args); }
    scale(...args: unknown[]) { return this.operation('scale', args); }
    color(...args: unknown[]) { return this.operation('color', args); }
    boolean(name: string, others: ShapeTrace[]) {
      const inputs = [this, ...others];
      if (mutable && new Set(inputs).size !== inputs.length) throw new Error('Aliased boolean operands');
      if (mutable && inputs.some(input => input.published)) throw new Error('Reused an already published part');
      for (const input of inputs) input.referenced = true;
      return new ShapeTrace({ operation: name, arguments: inputs.map(input => input.expression) });
    }
    intersect(...others: ShapeTrace[]) { return this.boolean('intersect', others); }
    subtract(...others: ShapeTrace[]) { return this.boolean('subtract', others); }
  }
  const primitive = (operation: string) => (...args: unknown[]) => new ShapeTrace({ operation, arguments: args });
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
    extrudePolygon: primitive('extrudePolygon'),
    prismSideY: primitive('prismSideY'),
    prismFront: primitive('prismFront'),
    path: () => ({ circle: (...args: unknown[]) => ({ extrude: (height: unknown) => primitive('circleExtrusion')(...args, height) }) }),
  };
  const body = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  new Function(...Object.keys(globals), body)(...Object.values(globals));
  return { metadata, parts };
}

const cases: [string, ParameterValues][] = [
  ['tomato default', {}],
  ['pepper', { crop: 'pepper' }],
  ['cucumber', { crop: 'cucumber' }],
  ['minimum scale', { scale: 0.7 }],
  ['maximum cucumber', { crop: 'cucumber', scale: 1.3 }],
];

describe('Dutch bucket independent shape ownership without CAD evaluation', () => {
  it.each(cases)('keeps 146 independent parts with mutable hosted transforms: %s', (_name, values) => {
    const result = capture(source, true, values);
    expect(result.parts).toHaveLength(146);
    expect(result.parts.filter(part => /^(leaf|crown|fruit)-/.test(part.name))).toHaveLength(78);
  });
  it.each(cases)('preserves the public geometry expression and metadata: %s', (_name, values) => {
    expect(capture(source, false, values)).toEqual(capture(shared, false, values));
  });
  it('rejects the exact previous shared prototype under mutable hosted transforms', () => {
    expect(() => capture(shared, true)).toThrow('Aliased boolean operands');
  });
});

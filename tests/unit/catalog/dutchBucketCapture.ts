// SPDX-License-Identifier: MIT
import ts from 'typescript';

export type Expression = { operation: string; arguments: unknown[] };
export type ParameterValues = Record<string, string | number>;

// This is a capture-only lifetime model. It creates no CAD/native geometry.
// The private hosted proxy mutates transforms, while the public proxy creates versions.
export function capture(code: string, mutable: boolean, values: ParameterValues = {}) {
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

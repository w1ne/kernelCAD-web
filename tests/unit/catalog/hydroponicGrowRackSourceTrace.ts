// SPDX-License-Identifier: MIT
import ts from 'typescript';

export type Expression = { operation: string; arguments: unknown[] };
export type Values = Record<string, string | number>;

// Pure ownership trace, not CAD evaluation. The private hosted Shape proxy
// mutates transforms; the public proxy produces new Shape versions.
export function capture(code: string, mutable: boolean, values: Values = {}) {
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
    cutout(profile: PathTrace, options: unknown) {
      if (mutable && this.published) throw new Error('Reused an already published part');
      this.referenced = true;
      return new ShapeTrace({ operation: 'cutout', arguments: [this.expression, profile.points.map(point => [...point]), options] });
    }
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
    loops: number[][][] = [];
    closed = false;
    moveTo(x: number, y: number) {
      if (this.closed) throw new Error('Mutated a captured path');
      this.loops.push([]);
      return this.lineTo(x, y);
    }
    lineTo(x: number, y: number) {
      if (this.closed) throw new Error('Mutated a captured path');
      const loop = this.loops.at(-1);
      if (!loop) throw new Error('Path must start with moveTo');
      loop.push([x, y]); this.points.push([x, y]);
      return this;
    }
    close() { this.closed = true; return this; }
    extrude(height: number) {
      if (!this.closed) throw new Error('Extrude requires a closed path');
      if (this.loops.length > 1) return primitive('extrudeLoops')(this.loops.map(loop => loop.map(point => [...point])), height);
      return primitive('extrude')(this.points.map(point => [...point]), height);
    }
    loft(other: PathTrace, options: unknown) {
      if (this.loops.length !== 1 || other.loops.length !== 1) throw new Error('Trace loft requires single contours');
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

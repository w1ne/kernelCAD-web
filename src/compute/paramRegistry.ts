import { create, all, type MathJsInstance } from 'mathjs';
import type { Param, Unit } from '../intent/types';

const math: MathJsInstance = create(all, {});

export interface ParamOptions {
  unit: Unit;
  min?: number;
  max?: number;
  description?: string;
}

interface ParamEntry {
  expression: string;
  unit: Unit;
  options: ParamOptions;
  evaluated: number;
  dependsOn: Set<string>;
  dependents: Set<string>;
}

export class ParamRegistry {
  private params = new Map<string, ParamEntry>();

  register(name: string, expression: string, options: ParamOptions): void {
    if (this.params.has(name)) {
      throw new Error(`Param '${name}' already registered`);
    }
    const entry: ParamEntry = {
      expression,
      unit: options.unit,
      options,
      evaluated: 0,
      dependsOn: this.parseDependencies(expression),
      dependents: new Set(),
    };
    this.params.set(name, entry);
    for (const dep of entry.dependsOn) {
      const e = this.params.get(dep);
      if (e) e.dependents.add(name);
    }
    this.evaluate(name);
  }

  update(name: string, newExpression: string): void {
    const entry = this.params.get(name);
    if (!entry) throw new Error(`Param '${name}' not registered`);
    const newDeps = this.parseDependencies(newExpression);
    if (this.wouldCycle(name, newDeps)) {
      throw new Error(`Cycle detected: '${name}' depends on itself transitively`);
    }
    for (const oldDep of entry.dependsOn) {
      this.params.get(oldDep)?.dependents.delete(name);
    }
    entry.expression = newExpression;
    entry.dependsOn = newDeps;
    for (const dep of newDeps) {
      this.params.get(dep)?.dependents.add(name);
    }
    this.evaluate(name);
    const queue = [...entry.dependents];
    while (queue.length) {
      const next = queue.shift()!;
      this.evaluate(next);
      for (const d of this.params.get(next)!.dependents) queue.push(d);
    }
  }

  get(name: string): Param {
    const e = this.params.get(name);
    if (!e) throw new Error(`Param '${name}' not registered`);
    return { expression: e.expression, unit: e.unit, evaluated: e.evaluated };
  }

  list(): string[] {
    return [...this.params.keys()];
  }

  private parseDependencies(expression: string): Set<string> {
    const deps = new Set<string>();
    try {
      const node = math.parse(expression);
      node.traverse((n: { type: string; name?: string }) => {
        if (n.type === 'SymbolNode' && n.name && this.params.has(n.name)) {
          deps.add(n.name);
        }
      });
    } catch {
      // parse error — leave deps empty; evaluation will surface a clearer error
    }
    return deps;
  }

  private wouldCycle(name: string, newDeps: Set<string>): boolean {
    const visited = new Set<string>();
    const visit = (node: string): boolean => {
      if (node === name) return true;
      if (visited.has(node)) return false;
      visited.add(node);
      const entry = this.params.get(node);
      if (!entry) return false;
      for (const d of entry.dependsOn) if (visit(d)) return true;
      return false;
    };
    for (const d of newDeps) if (visit(d)) return true;
    return false;
  }

  private evaluate(name: string): void {
    const entry = this.params.get(name)!;
    const scope: Record<string, number> = {};
    for (const dep of entry.dependsOn) {
      scope[dep] = this.params.get(dep)!.evaluated;
    }
    const result = math.evaluate(entry.expression, scope);
    let value: number;
    if (typeof result === 'number') {
      value = result;
    } else if (result && typeof result.toNumber === 'function') {
      value = result.toNumber(this.canonicalUnitString(entry.unit));
    } else {
      throw new Error(`Param '${name}' evaluation produced unexpected type: ${typeof result}`);
    }
    entry.evaluated = value;
  }

  private canonicalUnitString(unit: Unit): string {
    switch (unit) {
      case 'mm': return 'mm';
      case 'in': return 'mm';   // canonical is mm
      case 'm':  return 'mm';
      case 'deg': return 'deg';
      case 'rad': return 'deg';  // canonical is deg
      case 'unitless': return '';
    }
  }
}

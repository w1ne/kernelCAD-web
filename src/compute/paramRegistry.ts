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
    // Build the entry FIRST without any registry mutations
    const dependsOn = this.parseDependencies(expression);
    const entry: ParamEntry = {
      expression,
      unit: options.unit,
      options,
      evaluated: 0,
      dependsOn,
      dependents: new Set(),
    };
    // Try evaluation in a sandboxed scope using current values from this.params
    const value = this.evaluateExpression(name, expression, dependsOn, entry.unit);
    entry.evaluated = value;
    // ALL throws are above this line — only commit AFTER eval succeeds
    this.params.set(name, entry);
    for (const dep of dependsOn) {
      this.params.get(dep)?.dependents.add(name);
    }
  }

  update(name: string, newExpression: string): void {
    const entry = this.params.get(name);
    if (!entry) throw new Error(`Param '${name}' not registered`);
    const newDeps = this.parseDependencies(newExpression);
    if (this.wouldCycle(name, newDeps)) {
      throw new Error(`Cycle detected: '${name}' depends on itself transitively`);
    }
    // Snapshot prior state for rollback on failure
    const prevExpression = entry.expression;
    const prevDeps = entry.dependsOn;
    const prevEvaluated = entry.evaluated;
    // Try the new evaluation BEFORE mutating registry links
    const value = this.evaluateExpression(name, newExpression, newDeps, entry.unit);
    // Eval succeeded — commit changes
    for (const oldDep of prevDeps) {
      this.params.get(oldDep)?.dependents.delete(name);
    }
    entry.expression = newExpression;
    entry.dependsOn = newDeps;
    for (const dep of newDeps) {
      this.params.get(dep)?.dependents.add(name);
    }
    entry.evaluated = value;
    // Cascade re-evaluation to dependents with visited set to avoid duplicates
    const queue = [...entry.dependents];
    const visited = new Set<string>();
    try {
      while (queue.length) {
        const next = queue.shift()!;
        if (visited.has(next)) continue;
        visited.add(next);
        this.evaluate(next);
        for (const d of this.params.get(next)!.dependents) queue.push(d);
      }
    } catch (err) {
      // Roll back this entry's state if cascade fails
      for (const dep of newDeps) {
        this.params.get(dep)?.dependents.delete(name);
      }
      entry.expression = prevExpression;
      entry.dependsOn = prevDeps;
      entry.evaluated = prevEvaluated;
      for (const dep of prevDeps) {
        this.params.get(dep)?.dependents.add(name);
      }
      throw err;
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
    entry.evaluated = this.evaluateExpression(name, entry.expression, entry.dependsOn, entry.unit);
  }

  private evaluateExpression(
    name: string,
    expression: string,
    dependsOn: Set<string>,
    unit: Unit,
  ): number {
    const scope: Record<string, number> = {};
    for (const dep of dependsOn) {
      const e = this.params.get(dep);
      if (!e) throw new Error(`Param '${name}' references unknown symbol '${dep}'`);
      scope[dep] = e.evaluated;
    }
    const result = math.evaluate(expression, scope);
    if (typeof result === 'number') {
      return result;
    }
    if (result && typeof result.toNumber === 'function') {
      return result.toNumber(this.canonicalUnitString(unit));
    }
    throw new Error(`Param '${name}' evaluation produced unexpected type: ${typeof result}`);
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

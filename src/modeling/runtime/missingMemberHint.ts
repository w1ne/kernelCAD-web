// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `x.arcTo is not a function` and `polarArray is not defined` say nothing
// about what to call instead. This turns them into a diagnostic that names it:
// the kernelCAD way to say the same thing (the shared idiom table) or the
// closest real method name.
import { KernelError, isKernelError } from '../../shared/intent/kernelError';
import { compactName, idiomForMissingName } from '../../shared/intent/apiIdioms';

/** Edit distance, capped: enough to tell `filet` from `fillet`. */
function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 99;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

/** Up to three real names within a small edit distance of `name`. */
export function nearNames(name: string, known: readonly string[]): string[] {
  const target = name.toLowerCase();
  const limit = Math.max(1, Math.min(3, Math.floor(target.length / 3)));
  return known
    .map((k) => ({ k, d: distance(target, k.toLowerCase()) }))
    .filter((x) => x.d <= limit)
    .sort((x, y) => x.d - y.d || x.k.localeCompare(y.k))
    .slice(0, 3)
    .map((x) => x.k);
}

/** Public method names of the script-visible classes. */
export function publicNames(...prototypes: object[]): string[] {
  const names = new Set<string>();
  for (const proto of prototypes) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key !== 'constructor' && !key.startsWith('_') && typeof (proto as Record<string, unknown>)[key] === 'function') names.add(key);
    }
  }
  return [...names];
}

function suggestion(name: string, known: readonly string[]): { hint: string } | undefined {
  const idiom = idiomForMissingName(name);
  if (idiom) return { hint: `${idiom.use} Example: ${idiom.example}` };
  const near = nearNames(name, known);
  if (near.length > 0) return { hint: `There is no ${name}. Did you mean ${near.map((n) => `${n}()`).join(', ')}? Look up a signature with lookup_api({ query: '${near[0]}' }).` };
  return undefined;
}

/**
 * Rewrite a runtime TypeError / ReferenceError about a missing name into a
 * KernelError that carries the replacement. Anything else passes through.
 * `known` lists the real method names to measure typos against.
 */
export function withMissingMemberHint(e: unknown, known: readonly string[]): unknown {
  // Duck-typed: an error thrown inside the script's vm context is not an `instanceof Error` here.
  const err = e as { name?: unknown; message?: unknown } | null;
  if (err === null || typeof err !== 'object' || typeof err.message !== 'string' || isKernelError(e)) return e;
  const message = err.message;
  const notFunction = /^(?:TypeError:\s*)?(.*?)\.([A-Za-z_$][\w$]*) is not a function$/.exec(message);
  if (err.name === 'TypeError' && notFunction !== null) {
    const found = suggestion(notFunction[2], known);
    if (found === undefined) return e;
    return new KernelError('cli.script-exception', `TypeError: ${notFunction[1]}.${notFunction[2]} is not a function`, undefined, found.hint);
  }
  const notDefined = /^([A-Za-z_$][\w$]*) is not defined$/.exec(message);
  if (err.name === 'ReferenceError' && notDefined !== null) {
    const name = notDefined[1];
    if (compactName(name) === 'cq') {
      return new KernelError('cli.script-exception', `ReferenceError: ${name} is not defined`, undefined,
        'There is no module to import or namespace to prefix: every API function is a global (box, path, extrudeRect, union, selectEdges) and a script RETURNS its Shape. Look names up with lookup_api.');
    }
    const found = suggestion(name, known);
    if (found === undefined) return e;
    return new KernelError('cli.script-exception', `ReferenceError: ${name} is not defined`, undefined, found.hint);
  }
  return e;
}

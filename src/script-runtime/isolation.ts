/// <reference types="node" />
import vm from 'node:vm';

export interface IsolationOptions {
  /** Wrap script in `(function() { ... })()` so a top-level `return` works. */
  wrapReturn?: boolean;
}

export interface IsolationResult {
  returnValue: unknown;
}

/**
 * Globals that must NEVER be reachable from inside a sandboxed user script,
 * either as built-ins or as caller-supplied injections. The Node `vm` API
 * already keeps the host realm separate, but we still refuse to inject these
 * names so a careless caller can't smuggle a host capability through.
 */
const STRIPPED_GLOBALS = new Set([
  'process', 'require', 'global', 'globalThis',
  'fetch', 'XMLHttpRequest', 'WebSocket',
  'setImmediate', 'queueMicrotask',
  '__filename', '__dirname',
]);

/**
 * Run a user-supplied JavaScript snippet in an isolated `vm` context.
 *
 * The sandbox starts empty (no `process`, no `require`, no host globals beyond
 * a curated set of safe primitives), then receives the caller's `injected`
 * map verbatim — typically the kernelCAD API. With `wrapReturn`, the script
 * is wrapped in an IIFE so a top-level `return` captures the script's value
 * back to the caller via a sandbox sentinel.
 *
 * Note: this is a Node-only sandbox suitable for the v0.1 CLI. Browser
 * isolation (Web Worker + structured cloning) lands later when the studio
 * migrates to running scripts client-side.
 */
export function runIsolated(
  code: string,
  fileName: string,
  injected: Record<string, unknown>,
  opts: IsolationOptions = {},
): IsolationResult {
  const sandbox: Record<string, unknown> = {};
  // Safe builtins — copy references from the host realm. These are still host
  // objects, but they're stateless / inert enough that exposing them poses no
  // privilege risk for v0.1.
  for (const k of [
    'Math', 'JSON', 'Date', 'Number', 'String', 'Boolean', 'Array',
    'Object', 'Map', 'Set', 'Symbol', 'console',
    'Error', 'TypeError', 'RangeError', 'Promise',
  ]) {
    sandbox[k] = (globalThis as unknown as Record<string, unknown>)[k];
  }
  for (const [k, v] of Object.entries(injected)) {
    if (STRIPPED_GLOBALS.has(k)) {
      throw new Error(`Cannot inject reserved global: ${k}`);
    }
    sandbox[k] = v;
  }
  // Sentinel to capture return value when wrapReturn is on.
  sandbox.__return = undefined;

  const context = vm.createContext(sandbox, {
    name: fileName,
    codeGeneration: { strings: false, wasm: false },
  });

  const wrapped = opts.wrapReturn
    ? `__return = (async function() { ${code} \n})();`
    : code;

  const script = new vm.Script(wrapped, { filename: fileName });
  script.runInContext(context, { timeout: 30_000 });

  return { returnValue: opts.wrapReturn ? sandbox.__return : undefined };
}

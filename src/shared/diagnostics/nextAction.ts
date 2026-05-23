// Back-compat re-exports for the `NextAction` type and per-code map.
//
// The structured form of "what to try next" is now declared inline in
// `./registry.ts` (DIAGNOSTIC_REGISTRY[code].nextAction). This module is
// retained so existing import paths keep compiling; the `NextAction` union
// lives here because registry.ts imports it (avoiding a circular dependency).
//
// The kinds below cover the full set of recoveries the milestone-C codes
// describe. Adding a new kind requires extending DIAGNOSTIC_REGISTRY for
// every existing code that fits — covered by
// tests/unit/diagnostics/nextAction.test.ts and
// tests/unit/diagnostics/registry.test.ts.

export type NextAction =
  | { kind: 'retry-with-smaller-param'; param: string; factor: number }
  | { kind: 'call-introspection-tool'; tool: string }
  | { kind: 'call-tool'; tool: string; args: Record<string, unknown> }
  | { kind: 'rewrite-feature'; guidance: string }
  | { kind: 'reorder-pipeline'; guidance: string }
  | { kind: 'fix-arg'; field: string }
  | { kind: 'inspect-message' }
  | { kind: 'rename'; guidance: string }
  | { kind: 'add-return' }
  | { kind: 'check-cli-args' }
  | { kind: 'check-file-path' }
  | { kind: 'rerun-with-flag'; flag: string };

export { NEXT_ACTIONS } from './registry';

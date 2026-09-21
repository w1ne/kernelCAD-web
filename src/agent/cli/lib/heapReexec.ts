// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/lib/heapReexec.ts
//
// Mesh-heavy CLI commands (parts/export/render/animate/inspect/dfm/
// interference) mesh the whole assembly on the Node side. The default V8
// old-space limit (~2 GB on a 64-bit Node 20) aborts them with "JavaScript
// heap out of memory" (SIGABRT) long before the user sees output — the
// turbojet STL peaks at 6.3 GB. Rather than making every user remember
// `NODE_OPTIONS=--max-old-space-size=8192` (README gap #11), the CLI re-execs
// itself once with a larger heap.
//
// Design constraints:
//   - Mesh-heavy commands only; evaluate/validate/mcp keep the default heap
//     so fast paths don't pay for an extra process.
//   - An explicit `--max-old-space-size` in `NODE_OPTIONS` or
//     `process.execArgv` is respected even when it is smaller than the
//     target: the user asked for that limit.
//   - Re-exec at most once. `KCAD_HEAP_REEXEC=1` marks the child so a heap
//     that still OOMs (or a system that refuses the larger heap) surfaces
//     the real failure instead of looping.
//   - If spawning the child fails, continue on the current heap rather than
//     dying.

import { spawnSync } from 'node:child_process';
import { getHeapStatistics } from 'node:v8';

/** Env marker set on the re-exec'd child so it is never re-exec'd again. */
export const HEAP_REEXEC_MARKER_ENV = 'KCAD_HEAP_REEXEC';

/** Target old-space size for mesh-heavy commands. */
export const DEFAULT_HEAP_TARGET_MB = 8192;

/** Commands that mesh a whole assembly on the Node side. */
export const MESH_HEAVY_COMMANDS: ReadonlySet<string> = new Set([
  'animate',
  'dfm',
  'export',
  'inspect',
  'interference',
  'parts',
  'render',
]);

export type HeapReexecReason =
  | 'mesh-heavy-command'
  | 'not-mesh-heavy'
  | 'help-or-version'
  | 'explicit-heap-flag'
  | 'heap-already-large'
  | 'already-reexeced';

export interface HeapReexecInput {
  /** Command name (`process.argv[2]`); undefined for bare invocations. */
  command: string | undefined;
  /** Remaining CLI args (`process.argv.slice(2)`), used to skip --help/--version. */
  args?: readonly string[];
  /** `v8.getHeapStatistics().heap_size_limit` in bytes. */
  heapSizeLimit: number;
  /** `process.env.NODE_OPTIONS`. */
  nodeOptions?: string;
  /** `process.execArgv`. */
  execArgv?: readonly string[];
  /** `process.env[HEAP_REEXEC_MARKER_ENV]`. */
  marker?: string;
  /** Target old-space size in MB; defaults to DEFAULT_HEAP_TARGET_MB. */
  targetMb?: number;
}

export interface HeapReexecDecision {
  reexec: boolean;
  targetMb: number;
  reason: HeapReexecReason;
}

/**
 * True when the user (or a wrapper) already chose a heap size through
 * `--max-old-space-size` (hyphen or underscore spelling), in either
 * `NODE_OPTIONS` or `process.execArgv`. Node normalizes execArgv entries to
 * the `=` form, but the bare flag is accepted too.
 */
export function hasExplicitHeapFlag(
  nodeOptions: string | undefined,
  execArgv: readonly string[],
): boolean {
  const flagPattern = /--max[-_]old[-_]space[-_]size(?:=|\s|$)/;
  if (nodeOptions !== undefined && flagPattern.test(nodeOptions)) return true;
  return execArgv.some(
    (arg) =>
      arg === '--max-old-space-size' ||
      arg === '--max_old_space_size' ||
      arg.startsWith('--max-old-space-size=') ||
      arg.startsWith('--max_old_space_size='),
  );
}

function isHelpOrVersion(args: readonly string[]): boolean {
  return args.some((arg) => arg === '-h' || arg === '--help' || arg === '-V' || arg === '--version');
}

/**
 * Pure decision: should this invocation re-exec with a larger heap?
 * Reason strings are diagnostic aids (and the unit-test contract).
 */
export function shouldReexecWithLargerHeap(input: HeapReexecInput): HeapReexecDecision {
  const targetMb = input.targetMb ?? DEFAULT_HEAP_TARGET_MB;
  if (input.marker === '1') {
    return { reexec: false, targetMb, reason: 'already-reexeced' };
  }
  if (input.command === undefined || !MESH_HEAVY_COMMANDS.has(input.command)) {
    return { reexec: false, targetMb, reason: 'not-mesh-heavy' };
  }
  if (isHelpOrVersion(input.args ?? [])) {
    return { reexec: false, targetMb, reason: 'help-or-version' };
  }
  if (hasExplicitHeapFlag(input.nodeOptions, input.execArgv ?? [])) {
    return { reexec: false, targetMb, reason: 'explicit-heap-flag' };
  }
  if (input.heapSizeLimit >= targetMb * 1024 * 1024) {
    return { reexec: false, targetMb, reason: 'heap-already-large' };
  }
  return { reexec: true, targetMb, reason: 'mesh-heavy-command' };
}

/**
 * Re-exec the current CLI once with `--max-old-space-size=<targetMb>` when
 * the decision says the current heap is too small. Exits with the child's
 * status; returns (continuing on the current heap) when no re-exec is needed
 * or the child could not be spawned at all.
 *
 * `argv` defaults to `process.argv`, where argv[1] is the script path
 * (`dist/cli/index.js`); argv[2] is the command name.
 */
export function maybeReexecWithLargerHeap(
  argv: readonly string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const decision = shouldReexecWithLargerHeap({
    command: argv[2],
    args: argv.slice(2),
    heapSizeLimit: getHeapStatistics().heap_size_limit,
    nodeOptions: env.NODE_OPTIONS,
    execArgv: process.execArgv,
    marker: env[HEAP_REEXEC_MARKER_ENV],
  });
  if (!decision.reexec) return;

  const scriptPath = argv[1];
  if (scriptPath === undefined || scriptPath === '') return;

  const limitMb = Math.round(getHeapStatistics().heap_size_limit / 1024 / 1024);
  console.error(
    `kernelcad: mesh-heavy command '${argv[2]}' with a ${limitMb} MB heap limit — re-executing with --max-old-space-size=${decision.targetMb}`,
  );

  const child = spawnSync(
    process.execPath,
    [`--max-old-space-size=${decision.targetMb}`, scriptPath, ...argv.slice(2)],
    {
      stdio: 'inherit',
      env: { ...env, [HEAP_REEXEC_MARKER_ENV]: '1' },
    },
  );

  if (child.error) {
    console.error(
      `kernelcad: could not re-exec with a larger heap (${child.error.message}) — continuing with the current heap`,
    );
    return;
  }
  process.exit(child.status ?? 1);
}

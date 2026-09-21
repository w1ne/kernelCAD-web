// tests/unit/cli/heapReexec.test.ts
//
// Focused coverage for the mesh-heavy-command heap re-exec decision (gap #11).
// The decision is factored into a pure function so every branch is testable
// without spawning a child process.

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HEAP_TARGET_MB,
  HEAP_REEXEC_MARKER_ENV,
  MESH_HEAVY_COMMANDS,
  hasExplicitHeapFlag,
  shouldReexecWithLargerHeap,
  type HeapReexecInput,
} from '../../../src/agent/cli/lib/heapReexec';

/** Node 20 64-bit default heap limit, measured at ~2096 MB. */
const DEFAULT_HEAP_LIMIT_BYTES = 2 * 1024 ** 3;

function decide(overrides: Partial<HeapReexecInput> = {}) {
  return shouldReexecWithLargerHeap({
    command: 'parts',
    heapSizeLimit: DEFAULT_HEAP_LIMIT_BYTES,
    execArgv: [],
    ...overrides,
  });
}

describe('shouldReexecWithLargerHeap', () => {
  it('re-execs every mesh-heavy command when the current heap is too small', () => {
    for (const command of ['export', 'parts', 'render', 'animate', 'inspect', 'dfm', 'interference']) {
      expect(MESH_HEAVY_COMMANDS.has(command)).toBe(true);
      expect(decide({ command })).toEqual({
        reexec: true,
        targetMb: DEFAULT_HEAP_TARGET_MB,
        reason: 'mesh-heavy-command',
      });
    }
  });

  it('keeps fast commands on the current heap to preserve startup time', () => {
    for (const command of ['evaluate', 'validate', 'mcp', 'skill', 'stats', 'print', 'install', 'telemetry', 'reconstruct']) {
      const decision = decide({ command });
      expect(decision.reexec).toBe(false);
      expect(decision.reason).toBe('not-mesh-heavy');
    }
  });

  it('does not re-exec a mesh-heavy command when the marker shows a previous re-exec', () => {
    const decision = decide({ marker: '1' });
    expect(decision.reexec).toBe(false);
    expect(decision.reason).toBe('already-reexeced');
  });

  it('respects an explicit --max-old-space-size in NODE_OPTIONS even when it is smaller', () => {
    expect(decide({ nodeOptions: '--max-old-space-size=4096' }).reason).toBe('explicit-heap-flag');
    expect(decide({ nodeOptions: '--max-old-space-size=4096' }).reexec).toBe(false);
    // Node's underscore alias is accepted too.
    expect(decide({ nodeOptions: '--max_old_space_size=4096' }).reason).toBe('explicit-heap-flag');
  });

  it('respects an explicit --max-old-space-size in process.execArgv', () => {
    expect(decide({ execArgv: ['--max-old-space-size=2048'] }).reason).toBe('explicit-heap-flag');
    expect(decide({ execArgv: ['--max-old-space-size=2048'] }).reexec).toBe(false);
    expect(decide({ execArgv: ['--max-old-space-size', '2048'] }).reason).toBe('explicit-heap-flag');
  });

  it('does not re-exec when the current heap already meets the target', () => {
    const decision = decide({ heapSizeLimit: DEFAULT_HEAP_TARGET_MB * 1024 * 1024 });
    expect(decision.reexec).toBe(false);
    expect(decision.reason).toBe('heap-already-large');
  });

  it('does not re-exec for --help / --version', () => {
    expect(decide({ args: ['--help'] }).reason).toBe('help-or-version');
    expect(decide({ args: ['-h'] }).reason).toBe('help-or-version');
    expect(decide({ args: ['--version'] }).reason).toBe('help-or-version');
    expect(decide({ args: ['-V'] }).reason).toBe('help-or-version');
  });

  it('does not re-exec when there is no command at all', () => {
    const decision = decide({ command: undefined });
    expect(decision.reexec).toBe(false);
    expect(decision.reason).toBe('not-mesh-heavy');
  });

  it('honors a custom target heap size', () => {
    expect(decide({ targetMb: 12288, heapSizeLimit: 8 * 1024 ** 3 })).toEqual({
      reexec: true,
      targetMb: 12288,
      reason: 'mesh-heavy-command',
    });
  });

  it('exposes the marker env name the child is tagged with', () => {
    expect(HEAP_REEXEC_MARKER_ENV).toBe('KCAD_HEAP_REEXEC');
  });
});

describe('hasExplicitHeapFlag', () => {
  it('detects --max-old-space-size in NODE_OPTIONS and execArgv only', () => {
    expect(hasExplicitHeapFlag('--max-old-space-size=8192', [])).toBe(true);
    expect(hasExplicitHeapFlag('--max_old_space_size=8192', [])).toBe(true);
    expect(hasExplicitHeapFlag(undefined, ['--max-old-space-size=8192'])).toBe(true);
    expect(hasExplicitHeapFlag(undefined, ['--max-old-space-size', '8192'])).toBe(true);
    expect(hasExplicitHeapFlag('--max-semi-space-size=64', [])).toBe(false);
    expect(hasExplicitHeapFlag(undefined, [])).toBe(false);
    expect(hasExplicitHeapFlag('', [])).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { runIsolated } from '../../../src/modeling/runtime/isolation';

describe('runIsolated', () => {
  it('exposes injected globals to the script', () => {
    const result = runIsolated('hello("world")', 'test.kcad.ts', {
      hello: (s: string) => `received ${s}`,
    });
    expect(result.returnValue).toBeUndefined();
  });

  it('does not expose process or require', () => {
    expect(() => runIsolated('process.exit(0)', 'test.kcad.ts', {}))
      .toThrow();
  });

  it('captures the script return value via wrapReturn', async () => {
    // Script body is wrapped in an async IIFE to support top-level await,
    // so returnValue is a Promise that callers await (runScript does this).
    const result = runIsolated('return 42;', 'test.kcad.ts', {}, { wrapReturn: true });
    expect(await (result.returnValue as Promise<unknown>)).toBe(42);
  });
});

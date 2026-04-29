import { describe, it, expect } from 'vitest';
import { runIsolated } from '../../../src/script-runtime/isolation';

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

  it('captures the script return value via wrapReturn', () => {
    const result = runIsolated('return 42;', 'test.kcad.ts', {}, { wrapReturn: true });
    expect(result.returnValue).toBe(42);
  });
});

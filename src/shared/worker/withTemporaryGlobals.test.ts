import { describe, expect, it } from 'vitest';
import { withTemporaryGlobals } from './withTemporaryGlobals';

describe('withTemporaryGlobals', () => {
  it('injects globals for the duration of run() and restores afterwards', () => {
    (globalThis as any).foo = 1;
    expect((globalThis as any).foo).toBe(1);
    expect((globalThis as any).bar).toBeUndefined();

    const result = withTemporaryGlobals({ foo: 2, bar: 3 }, () => {
      expect((globalThis as any).foo).toBe(2);
      expect((globalThis as any).bar).toBe(3);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect((globalThis as any).foo).toBe(1);
    expect((globalThis as any).bar).toBeUndefined();
  });

  it('restores globals even if run() throws', () => {
    (globalThis as any).foo = 'orig';
    expect(() =>
      withTemporaryGlobals({ foo: 'temp', baz: true }, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect((globalThis as any).foo).toBe('orig');
    expect((globalThis as any).baz).toBeUndefined();
  });
});


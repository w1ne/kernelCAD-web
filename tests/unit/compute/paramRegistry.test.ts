import { describe, it, expect } from 'vitest';
import { ParamRegistry } from '../../../src/compute/paramRegistry';

describe('ParamRegistry', () => {
  it('registers and evaluates a numeric param', () => {
    const r = new ParamRegistry();
    r.register('Width', '100', { unit: 'mm', min: 0, max: 200 });
    expect(r.get('Width').evaluated).toBe(100);
  });

  it('evaluates an expression that references another param', () => {
    const r = new ParamRegistry();
    r.register('Width', '100', { unit: 'mm' });
    r.register('Half', 'Width / 2', { unit: 'mm' });
    expect(r.get('Half').evaluated).toBe(50);
  });

  it('detects cycles and throws', () => {
    const r = new ParamRegistry();
    r.register('A', '1', { unit: 'mm' });
    r.register('B', 'A + 1', { unit: 'mm' });
    expect(() => r.update('A', 'B + 1')).toThrow(/cycle/i);
  });

  it('updates trigger re-evaluation of dependents', () => {
    const r = new ParamRegistry();
    r.register('Width', '100', { unit: 'mm' });
    r.register('Half', 'Width / 2', { unit: 'mm' });
    r.update('Width', '200');
    expect(r.get('Half').evaluated).toBe(100);
  });

  it('unit conversion: in to mm', () => {
    const r = new ParamRegistry();
    r.register('Len', '1 in', { unit: 'mm' });
    expect(r.get('Len').evaluated).toBeCloseTo(25.4, 3);
  });

  it('register() with bad expression leaves no partial state', () => {
    const r = new ParamRegistry();
    r.register('Width', '100', { unit: 'mm' });
    expect(() => r.register('Bad', 'NonExistent + 1', { unit: 'mm' })).toThrow();
    expect(r.list()).not.toContain('Bad');
    // Width's dependents must not include Bad
    expect(r.get('Width').evaluated).toBe(100);
  });

  it('update() with bad expression rolls back to prior state', () => {
    const r = new ParamRegistry();
    r.register('Width', '100', { unit: 'mm' });
    r.register('Half', 'Width / 2', { unit: 'mm' });
    expect(() => r.update('Half', 'NoSuch / 2')).toThrow();
    // Half should still have prior expression and prior evaluated value
    expect(r.get('Half').expression).toBe('Width / 2');
    expect(r.get('Half').evaluated).toBe(50);
    // Updating Width should still cascade to Half
    r.update('Width', '200');
    expect(r.get('Half').evaluated).toBe(100);
  });
});

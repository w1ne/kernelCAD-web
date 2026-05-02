import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';

describe('OcctBackend kind tag', () => {
  beforeAll(async () => { await initOcct(); });

  it('static factories set kind', () => {
    expect(OcctBackend.box(10, 10, 10).kind).toBe('box');
    expect(OcctBackend.cylinder(10, 5).kind).toBe('cylinder');
    expect(OcctBackend.sphere(5).kind).toBe('sphere');
  });

  it('translate drops kind tag', () => {
    expect(OcctBackend.box(10, 10, 10).translate(5, 0, 0).kind).toBeUndefined();
  });

  it('rotate drops kind tag', () => {
    expect(OcctBackend.box(10, 10, 10).rotate([0, 0, 1], 30).kind).toBeUndefined();
  });

  it('scale drops kind tag', () => {
    expect(OcctBackend.box(10, 10, 10).scale([1.5, 1.5, 1.5]).kind).toBeUndefined();
  });

  it('mirror drops kind tag', () => {
    expect(OcctBackend.box(10, 10, 10).translate(20, 0, 0).mirror('yz').kind).toBeUndefined();
  });

  it('union drops kind tag', () => {
    const a = OcctBackend.box(10, 10, 10);
    const b = OcctBackend.box(5, 5, 5).translate(20, 0, 0);
    expect(a.union(b).kind).toBeUndefined();
  });

  it('subtract drops kind tag', () => {
    const a = OcctBackend.box(10, 10, 10);
    const b = OcctBackend.box(5, 5, 5);
    expect(a.subtract(b).kind).toBeUndefined();
  });

  it('intersect drops kind tag', () => {
    const a = OcctBackend.box(10, 10, 10);
    const b = OcctBackend.box(5, 5, 5);
    expect(a.intersect(b).kind).toBeUndefined();
  });
});

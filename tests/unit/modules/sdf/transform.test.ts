import { beforeAll, describe, expect, it } from 'vitest';
import { sphere } from '../../../../src/modeling/sdf/primitives';
import { smoothBlend } from '../../../../src/modeling/sdf/smoothBlend';
import { materialize } from '../../../../src/modeling/sdf/materialize';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

beforeAll(async () => {
  await initOcct();
});

describe('sdf translate transform', () => {
  it('evaluates the field in the translated frame', () => {
    const f = sphere(10).translate(5, 0, 0);
    expect(f([5, 0, 0])).toBeCloseTo(-10, 12);
    expect(f([0, 0, 0])).toBeCloseTo(-5, 12);
    expect(f([15, 0, 0])).toBeCloseTo(0, 12);
  });

  it('offsets the aabb', () => {
    const f = sphere(10).translate(5, -2, 1);
    expect(f.aabb.min).toEqual([-5, -12, -9]);
    expect(f.aabb.max).toEqual([15, 8, 11]);
  });

  it('composes chained translates', () => {
    const f = sphere(10).translate(5, 0, 0).translate(0, 2, 0);
    expect(f([5, 2, 0])).toBeCloseTo(-10, 12);
    expect(f.aabb.min).toEqual([-5, -8, -10]);
    expect(f.aabb.max).toEqual([15, 12, 10]);
  });

  it('keeps smoothBlend aabb padding correct with translated children', () => {
    const blend = smoothBlend(sphere(10), sphere(10).translate(20, 0, 0), 3);
    expect(blend.aabb.min).toEqual([-13, -13, -13]);
    expect(blend.aabb.max).toEqual([33, 13, 13]);
    expect(blend([10, 0, 0])).toBeCloseTo(-0.75, 12);
  });

  it('rejects non-finite offsets', () => {
    expect(() => sphere(10).translate(Number.NaN, 0, 0)).toThrow(/sdf\.translate/);
    expect(() => sphere(10).translate(0, Number.POSITIVE_INFINITY, 0)).toThrow(/sdf\.translate/);
  });

  it('materialize samples the translated aabb', () => {
    const session = new CaptureSession();
    const shape = materialize({ session }, sphere(2).translate(10, 0, 0), { resolution: 20 });
    const record = session.getRecords().find((r) => r.id === shape.id);
    expect(record?.metadata?.aabb).toEqual({ min: [8, -2, -2], max: [12, 2, 2] });
  }, 60_000);
});

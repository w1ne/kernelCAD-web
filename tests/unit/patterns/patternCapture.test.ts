import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';

describe('pattern capture contract', () => {
  it('captures a linear pattern as one feature with base input and spacing metadata', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const base = kcad.box(10, 5, 2);
    const pattern = base.patternLinear({ count: 4, direction: [1, 0, 0], spacing: 12 });

    const records = session.getRecords();
    expect(pattern.id).toMatch(/^pattern_/);
    expect(records.at(-1)).toMatchObject({
      kind: 'pattern',
      inputs: { base: { kind: 'feature', id: base.id } },
      metadata: {
        pattern: {
          kind: 'linear',
          count: 4,
          direction: [1, 0, 0],
          spacing: 12,
        },
      },
    });
  });

  it('rejects invalid pattern counts before capture', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const base = kcad.box(10, 5, 2);

    expect(() => base.patternLinear({ count: 1, direction: [1, 0, 0], spacing: 12 }))
      .toThrow(/count must be an integer >= 2/);
  });

  it('captures a circular pattern as one feature with axis metadata', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const base = kcad.cylinder(2, 1).translate(10, 0, 0);
    const pattern = base.patternCircular({ count: 6, axis: [0, 0, 1], angleDeg: 180 });

    const records = session.getRecords();
    expect(pattern.id).toMatch(/^pattern_/);
    expect(records.at(-1)).toMatchObject({
      kind: 'pattern',
      inputs: { base: { kind: 'feature', id: base.id } },
      metadata: {
        pattern: {
          kind: 'circular',
          count: 6,
          axis: [0, 0, 1],
          angleDeg: 180,
        },
      },
    });
  });

  it('captures a grid pattern as one feature with x/y axes and counts', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const base = kcad.box(6, 3, 2);
    const pattern = base.patternGrid({
      x: { count: 3, direction: [1, 0, 0], spacing: 10 },
      y: { count: 2, direction: [0, 1, 0], spacing: 8 },
    });

    const records = session.getRecords();
    expect(pattern.id).toMatch(/^pattern_/);
    expect(records.at(-1)).toMatchObject({
      kind: 'pattern',
      inputs: { base: { kind: 'feature', id: base.id } },
      metadata: {
        pattern: {
          kind: 'grid',
          x: { count: 3, direction: [1, 0, 0], spacing: 10 },
          y: { count: 2, direction: [0, 1, 0], spacing: 8 },
        },
      },
    });
  });

  it('rejects invalid grid axis counts before capture', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const base = kcad.box(10, 5, 2);

    expect(() => base.patternGrid({
      x: { count: 1, direction: [1, 0, 0], spacing: 10 },
      y: { count: 2, direction: [0, 1, 0], spacing: 8 },
    })).toThrow(/patternGrid.x count must be an integer >= 2/);
  });

  it('rejects invalid grid directions and spacing before capture', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const base = kcad.box(10, 5, 2);

    expect(() => base.patternGrid({
      x: { count: 2, direction: [1, 0, Number.NaN], spacing: 10 },
      y: { count: 2, direction: [0, 1, 0], spacing: 8 },
    })).toThrow(/patternGrid.x direction must be a finite Vec3/);

    expect(() => base.patternGrid({
      x: { count: 2, direction: [1, 0, 0], spacing: 10 },
      y: { count: 2, direction: [0, 1, 0], spacing: 0 },
    })).toThrow(/patternGrid.y spacing must be a non-zero finite number/);
  });
});

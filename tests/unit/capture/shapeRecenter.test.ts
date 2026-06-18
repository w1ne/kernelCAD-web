import { describe, it, expect, beforeAll } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

// These exercise the real lower-path (OCCT), so init the kernel once.
beforeAll(async () => {
  await initOcct();
});

// Count the transforms appended to a Shape's underlying record.
function transformsCount(session: CaptureSession, id: string): number {
  const r = session.getRecords().find(rec => rec.id === id);
  return ((r as { transforms?: unknown[] })?.transforms ?? []).length;
}

describe('Shape.boundingBox', () => {
  it('reports the corner-origin box AABB (min at origin)', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    // box(l,w,h) defaults to corner-origin: min corner at (0,0,0).
    const b = kcad.box(10, 20, 30);
    const bb = await b.boundingBox();
    expect(bb.min[0]).toBeCloseTo(0);
    expect(bb.min[1]).toBeCloseTo(0);
    expect(bb.min[2]).toBeCloseTo(0);
    expect(bb.max[0]).toBeCloseTo(10);
    expect(bb.max[1]).toBeCloseTo(20);
    expect(bb.max[2]).toBeCloseTo(30);
    expect(bb.size[0]).toBeCloseTo(10);
    expect(bb.size[1]).toBeCloseTo(20);
    expect(bb.size[2]).toBeCloseTo(30);
    expect(bb.center[0]).toBeCloseTo(5);
    expect(bb.center[1]).toBeCloseTo(10);
    expect(bb.center[2]).toBeCloseTo(15);
  });

  it('reflects transforms appended so far (post-translate world frame)', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const b = kcad.box(10, 10, 10).translate(100, 0, 0);
    const bb = await b.boundingBox();
    expect(bb.min[0]).toBeCloseTo(100);
    expect(bb.max[0]).toBeCloseTo(110);
    expect(bb.center[0]).toBeCloseTo(105);
  });
});

describe('Shape.recenter', () => {
  it('moves the bbox center to the world origin', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const b = kcad.box(10, 20, 30);
    await b.recenter();
    const bb = await b.boundingBox();
    expect(bb.center[0]).toBeCloseTo(0);
    expect(bb.center[1]).toBeCloseTo(0);
    expect(bb.center[2]).toBeCloseTo(0);
    expect(bb.min[0]).toBeCloseTo(-5);
    expect(bb.max[0]).toBeCloseTo(5);
    expect(bb.min[2]).toBeCloseTo(-15);
    expect(bb.max[2]).toBeCloseTo(15);
  });

  it('recenter then translate places the CENTER at the target', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const b = kcad.box(10, 20, 30);
    (await b.recenter()).translate(50, 60, 70);
    const bb = await b.boundingBox();
    expect(bb.center[0]).toBeCloseTo(50);
    expect(bb.center[1]).toBeCloseTo(60);
    expect(bb.center[2]).toBeCloseTo(70);
  });

  it('per-axis: { z: false } centers x/y but leaves z untouched', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const b = kcad.box(10, 20, 30);
    await b.recenter({ z: false });
    const bb = await b.boundingBox();
    expect(bb.center[0]).toBeCloseTo(0);
    expect(bb.center[1]).toBeCloseTo(0);
    // z stays as the corner-origin box had it (center 15).
    expect(bb.center[2]).toBeCloseTo(15);
    expect(bb.min[2]).toBeCloseTo(0);
  });

  it('returns the same Shape for chaining and appends one translate', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const b = kcad.box(10, 10, 10);
    const r = await b.recenter();
    expect(r).toBe(b);
    expect(transformsCount(session, b.id)).toBe(1);
  });
});

describe('Shape.seatOnFloor', () => {
  it('drops the shape onto z = 0 and centers x/y', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    // Centered box: spans z in [-15, 15]; seatOnFloor should lift to [0, 30].
    const b = kcad.box(10, 20, 30, true);
    await b.seatOnFloor();
    const bb = await b.boundingBox();
    expect(bb.min[2]).toBeCloseTo(0);
    expect(bb.max[2]).toBeCloseTo(30);
    expect(bb.center[0]).toBeCloseTo(0);
    expect(bb.center[1]).toBeCloseTo(0);
  });

  it('{ center: false } seats on z=0 without moving x/y', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    // Corner-origin box already sits on z=0 with footprint at x/y in [0, w].
    const b = kcad.box(10, 20, 30).translate(0, 0, 50);
    await b.seatOnFloor({ center: false });
    const bb = await b.boundingBox();
    expect(bb.min[2]).toBeCloseTo(0);
    // x/y footprint preserved (not recentered).
    expect(bb.min[0]).toBeCloseTo(0);
    expect(bb.max[0]).toBeCloseTo(10);
  });
});

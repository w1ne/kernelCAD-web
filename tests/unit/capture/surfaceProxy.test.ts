import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { SurfaceProxy } from '../../../src/shared/capture/surfaceProxy';

describe('CaptureSession surface records', () => {
  it('addNurbsSurface returns SurfaceProxy with deterministic id surface_1', () => {
    const s = new CaptureSession();
    const surf = s.addNurbsSurface({
      kind: 'nurbsSurface',
      controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
      degree: { u: 1, v: 1 },
    });
    expect(surf).toBeInstanceOf(SurfaceProxy);
    expect(surf.id).toBe('surface_1');
    expect(s.getSurfaceRecord('surface_1')?.kind).toBe('nurbsSurface');
  });

  it('addNurbsSurface mints incrementing ids', () => {
    const s = new CaptureSession();
    const a = s.addNurbsSurface({
      kind: 'nurbsSurface',
      controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
      degree: { u: 1, v: 1 },
    });
    const b = s.addNurbsSurface({
      kind: 'nurbsSurface',
      controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
      degree: { u: 1, v: 1 },
    });
    expect(a.id).toBe('surface_1');
    expect(b.id).toBe('surface_2');
    expect(s.getSurfaceRecords().length).toBe(2);
  });

  it('SurfaceProxy.thicken(t) appends a surfaceThicken Feature with surface ref', () => {
    const s = new CaptureSession();
    const surf = s.addNurbsSurface({
      kind: 'nurbsSurface',
      controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
      degree: { u: 1, v: 1 },
    });
    const shape = surf.thicken(2);
    expect(shape.id).toMatch(/^surfaceThicken_\d+$/);
    // Walk the session records for the new feature.
    const recs = (s as unknown as {
      records: Array<{ id: string; kind: string; inputs: Record<string, unknown> }>;
    }).records;
    const thickRec = recs.find(r => r.id === shape.id)!;
    expect(thickRec.kind).toBe('surfaceThicken');
    expect(thickRec.inputs.surface).toEqual({ kind: 'surface', surfaceId: 'surface_1' });
  });

  it('SurfaceProxy.toShape() appends a surfaceToShape Feature with surface ref', () => {
    const s = new CaptureSession();
    const surf = s.addNurbsSurface({
      kind: 'nurbsSurface',
      controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
      degree: { u: 1, v: 1 },
    });
    const shape = surf.toShape();
    expect(shape.id).toMatch(/^surfaceToShape_\d+$/);
  });

  it('SurfaceProxy.thicken rejects t <= 0', () => {
    const s = new CaptureSession();
    const surf = s.addNurbsSurface({
      kind: 'nurbsSurface',
      controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
      degree: { u: 1, v: 1 },
    });
    expect(() => surf.thicken(0)).toThrow(/positive finite/);
    expect(() => surf.thicken(-1)).toThrow(/positive finite/);
    expect(() => surf.thicken(NaN)).toThrow(/positive finite/);
  });
});

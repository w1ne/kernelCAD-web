import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';
import { ParamRegistry } from '../../../src/compute/paramRegistry';
import { KernelError } from '../../../src/intent/kernelError';

describe('CaptureSession', () => {
  it('records features in capture order', () => {
    const s = new CaptureSession();
    const f1 = s.register({
      kind: 'box',
      params: {
        width: { expression: '10', unit: 'mm', evaluated: 10 },
        height: { expression: '10', unit: 'mm', evaluated: 10 },
        depth: { expression: '10', unit: 'mm', evaluated: 10 },
        centered: { expression: 'false', unit: 'unitless', evaluated: 0 },
      },
      inputs: {},
    });
    const f2 = s.register({
      kind: 'cylinder',
      params: {
        h: { expression: '20', unit: 'mm', evaluated: 20 },
        r: { expression: '5', unit: 'mm', evaluated: 5 },
      },
      inputs: {},
    });
    const records = s.getRecords();
    expect(records).toHaveLength(2);
    expect(records[0].id).toBe(f1.id);
    expect(records[1].id).toBe(f2.id);
    expect(records[0].kind).toBe('box');
    expect(records[1].kind).toBe('cylinder');
  });

  it('createShape returns a proxy that registers transforms', () => {
    const s = new CaptureSession();
    const shape = s.createShape({
      kind: 'box',
      params: {
        width: { expression: '10', unit: 'mm', evaluated: 10 },
        height: { expression: '10', unit: 'mm', evaluated: 10 },
        depth: { expression: '10', unit: 'mm', evaluated: 10 },
        centered: { expression: 'false', unit: 'unitless', evaluated: 0 },
      },
      inputs: {},
    });
    shape.translate(5, 0, 0);
    const records = s.getRecords();
    expect(records[0].transforms).toEqual([
      { op: 'translate', x: 5, y: 0, z: 0 },
    ]);
  });

  it('boolean ops register a new feature with input refs', () => {
    const s = new CaptureSession();
    const a = s.createShape({ kind: 'box', params: {}, inputs: {} });
    const b = s.createShape({ kind: 'cylinder', params: {}, inputs: {} });
    const c = a.subtract(b);
    const records = s.getRecords();
    expect(records).toHaveLength(3);
    expect(records[2].kind).toBe('boolean');
    expect(records[2].inputs.base).toEqual({ kind: 'feature', id: a.id });
    expect(records[2].inputs.cutter_0).toEqual({ kind: 'feature', id: b.id });
    expect(c.id).toBe(records[2].id);
  });

  it('rejects boolean across two CaptureSessions', () => {
    const s1 = new CaptureSession();
    const s2 = new CaptureSession();
    const a = s1.createShape({ kind: 'box', params: {}, inputs: {} });
    const b = s2.createShape({ kind: 'cylinder', params: {}, inputs: {} });
    expect(() => a.subtract(b)).toThrow(/not from this CaptureSession/i);
  });
});

function makeApi() {
  const session = new CaptureSession();
  const params = new ParamRegistry();
  const api = createApi({ session, params });
  return { session, api };
}

describe('faceLabels capture-time validation and persistence', () => {
  // ── Persistence: canonical-alias faceLabels on box ──────────────────────
  it('persists canonical-alias faceLabels on box', () => {
    const { session, api } = makeApi();
    api.box(10, 10, 5, false, { faceLabels: { lid: 'top', base: 'bottom' } });
    const rec = session.getRecords()[0];
    expect((rec.metadata as { faceLabels?: unknown }).faceLabels).toEqual({ lid: 'top', base: 'bottom' });
  });

  it('persists faceLabels on cylinder', () => {
    const { session, api } = makeApi();
    api.cylinder(20, 5, undefined, { faceLabels: { cap: 'top' } });
    const rec = session.getRecords()[0];
    expect((rec.metadata as { faceLabels?: unknown }).faceLabels).toEqual({ cap: 'top' });
  });

  it('persists faceLabels on extrudeRect', () => {
    const { session, api } = makeApi();
    api.extrudeRect(10, 5, 3, { faceLabels: { face: 'front' } });
    const rec = session.getRecords()[0];
    expect((rec.metadata as { faceLabels?: unknown }).faceLabels).toEqual({ face: 'front' });
  });

  it('persists faceLabels on extrudeCircle', () => {
    const { session, api } = makeApi();
    api.extrudeCircle(5, 10, { faceLabels: { top: 'top' } });
    const rec = session.getRecords()[0];
    expect((rec.metadata as { faceLabels?: unknown }).faceLabels).toEqual({ top: 'top' });
  });

  it('persists faceLabels on extrudePolygon', () => {
    const { session, api } = makeApi();
    api.extrudePolygon([[0,0],[10,0],[5,10]], 5, { faceLabels: { floor: 'bottom' } });
    const rec = session.getRecords()[0];
    expect((rec.metadata as { faceLabels?: unknown }).faceLabels).toEqual({ floor: 'bottom' });
  });

  it('persists faceLabels on extrudeRoundedRect', () => {
    const { session, api } = makeApi();
    api.extrudeRoundedRect(20, 10, 2, 5, { faceLabels: { roof: 'top' } });
    const rec = session.getRecords()[0];
    expect((rec.metadata as { faceLabels?: unknown }).faceLabels).toEqual({ roof: 'top' });
  });

  it('persists faceLabels on revolveRect', () => {
    const { session, api } = makeApi();
    api.revolveRect(5, 10, 2, 360, { faceLabels: { rim: 'right' } });
    const rec = session.getRecords()[0];
    expect((rec.metadata as { faceLabels?: unknown }).faceLabels).toEqual({ rim: 'right' });
  });

  it('persists query-based faceLabels on extrude (Sketch.extrude)', () => {
    const { session, api } = makeApi();
    const sketch = api.path().moveTo(0,0).lineTo(10,0).lineTo(10,5).lineTo(0,5).close();
    sketch.extrude(5, { faceLabels: { rim: { atZ: 5, parallelTo: 'XY' } } });
    const rec = session.getRecords().find(r => r.kind === 'extrude')!;
    const fl = (rec.metadata as { faceLabels?: unknown }).faceLabels;
    expect(fl).toEqual({ rim: { atZ: 5, parallelTo: 'XY' } });
  });

  it('persists faceLabels on Sketch.revolve', () => {
    const { session, api } = makeApi();
    const sketch = api.path().moveTo(10,0).lineTo(20,0).lineTo(20,5).lineTo(10,5).close();
    sketch.revolve({ faceLabels: { outer: 'right' } });
    const rec = session.getRecords().find(r => r.kind === 'revolve')!;
    expect((rec.metadata as { faceLabels?: unknown }).faceLabels).toEqual({ outer: 'right' });
  });

  it('persists faceLabels on Sketch.sweep', () => {
    const { session, api } = makeApi();
    const sketch = api.path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
    sketch.sweep([[0,0,0],[0,0,10]], { faceLabels: { wall: 'front' } });
    const rec = session.getRecords().find(r => r.kind === 'sweep')!;
    expect((rec.metadata as { faceLabels?: unknown }).faceLabels).toEqual({ wall: 'front' });
  });

  it('persists faceLabels on Sketch.loft', () => {
    const { session, api } = makeApi();
    const s1 = api.path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
    const s2 = api.path().moveTo(-2,-2).lineTo(2,-2).lineTo(2,2).lineTo(-2,2).close();
    s1.loft(s2, { faceLabels: { side: 'left' } });
    const rec = session.getRecords().find(r => r.kind === 'loft')!;
    expect((rec.metadata as { faceLabels?: unknown }).faceLabels).toEqual({ side: 'left' });
  });

  // ── No-op: faceLabels omitted or undefined ───────────────────────────────
  it('persists nothing if faceLabels is undefined (box no opts)', () => {
    const { session, api } = makeApi();
    api.box(10, 10, 5);
    const rec = session.getRecords()[0];
    expect((rec.metadata as { faceLabels?: unknown } | undefined)?.faceLabels).toBeUndefined();
  });

  it('persists nothing if faceLabels is explicitly undefined', () => {
    const { session, api } = makeApi();
    api.box(10, 10, 5, false, { faceLabels: undefined });
    const rec = session.getRecords()[0];
    expect((rec.metadata as { faceLabels?: unknown } | undefined)?.faceLabels).toBeUndefined();
  });

  // ── Sphere rejection ─────────────────────────────────────────────────────
  it('rejects faceLabels on sphere with feature.label.unsupported-on-shape', () => {
    const { api } = makeApi();
    expect(() => api.sphere(5, { faceLabels: { skin: 'top' } })).toThrow(KernelError);
    try {
      api.sphere(5, { faceLabels: { skin: 'top' } });
    } catch (e) {
      expect(e instanceof KernelError).toBe(true);
      expect((e as KernelError).code).toBe('feature.face-ref.not-applicable');
    }
  });

  // ── Validation: malformed faceLabels ─────────────────────────────────────
  it('rejects malformed faceLabels (non-object string) with capture.faceLabels.invalid-shape', () => {
    const { api } = makeApi();
    expect(() => api.box(10, 10, 10, false, { faceLabels: 'lid' as never })).toThrow(KernelError);
    try {
      api.box(10, 10, 10, false, { faceLabels: 'lid' as never });
    } catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
    }
  });

  it('rejects malformed faceLabels (empty key) with capture.faceLabels.invalid-key', () => {
    const { api } = makeApi();
    try {
      api.box(10, 10, 10, false, { faceLabels: { '': 'top' } as never });
    } catch (e) {
      expect(e instanceof KernelError).toBe(true);
      expect((e as KernelError).code).toBe('feature.invalid-args');
    }
  });

  it('rejects malformed faceLabels (invalid value: number) with capture.faceLabels.invalid-value', () => {
    const { api } = makeApi();
    try {
      api.box(10, 10, 10, false, { faceLabels: { lid: 42 as never } });
    } catch (e) {
      expect(e instanceof KernelError).toBe(true);
      expect((e as KernelError).code).toBe('feature.invalid-args');
    }
  });

  it('rejects malformed faceLabels (invalid canonical string) with capture.faceLabels.invalid-value', () => {
    const { api } = makeApi();
    try {
      api.box(10, 10, 10, false, { faceLabels: { lid: 'middle' as never } });
    } catch (e) {
      expect(e instanceof KernelError).toBe(true);
      expect((e as KernelError).code).toBe('feature.invalid-args');
    }
  });
});

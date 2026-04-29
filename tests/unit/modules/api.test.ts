import { describe, it, expect } from 'vitest';
import { createApi } from '../../../src/modules/api';
import { CaptureSession } from '../../../src/capture/captureSession';
import { ParamRegistry } from '../../../src/compute/paramRegistry';

describe('API surface', () => {
  it('box() returns a Shape and registers a feature', () => {
    const session = new CaptureSession();
    const params = new ParamRegistry();
    const api = createApi({ session, params });
    const s = api.box(10, 20, 30);
    const records = session.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].kind).toBe('box');
    expect(records[0].params.x.evaluated).toBe(10);
    expect(s.id).toBe(records[0].id);
  });

  it('param() registers a UI param and returns evaluated value', () => {
    const session = new CaptureSession();
    const params = new ParamRegistry();
    const api = createApi({ session, params });
    const w = api.param('Width', 100, { unit: 'mm', min: 50, max: 200 });
    expect(w).toBe(100);
    expect(params.get('Width').evaluated).toBe(100);
  });

  it('cylinder().translate().subtract() chains correctly', () => {
    const session = new CaptureSession();
    const params = new ParamRegistry();
    const api = createApi({ session, params });
    const base = api.box(20, 20, 20);
    const hole = api.cylinder(20, 5).translate(10, 10, 0);
    const result = base.subtract(hole);
    const records = session.getRecords();
    expect(records).toHaveLength(3);
    expect(records[2].kind).toBe('boolean');
    expect(records[2].inputs.base).toEqual({ kind: 'feature', id: base.id });
    expect(result.id).toBe(records[2].id);
  });
});

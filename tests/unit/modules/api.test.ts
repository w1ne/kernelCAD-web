import { describe, it, expect } from 'vitest';
import { createApi } from '../../../src/modules/api';
import { CaptureSession } from '../../../src/capture/captureSession';

describe('API surface', () => {
  it('box() returns a Shape and registers a feature', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const s = api.box(10, 20, 30);
    const records = session.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].kind).toBe('box');
    expect(records[0].params.x.evaluated).toBe(10);
    expect(s.id).toBe(records[0].id);
  });

  it('param() declares a symbolic ParamRef and registers it on the session table', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const w = api.param('width', 100, { min: 50, max: 200 });
    expect(w._brand).toBe('ParamRef');
    expect(w.$param).toBe('width');
    expect(session.paramTable.get('width').value).toBe(100);
  });

  it('params() declares many params at once', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const p = api.params({ w: 100, h: 50, on: true });
    expect(p.w._brand).toBe('ParamRef');
    expect(p.on._brand).toBe('ParamRef');
    expect(session.paramTable.get('w').value).toBe(100);
    expect(session.paramTable.get('on').value).toBe(true);
  });

  it('cylinder().translate().subtract() chains correctly', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const base = api.box(20, 20, 20);
    const hole = api.cylinder(20, 5).translate(10, 10, 0);
    const result = base.subtract(hole);
    const records = session.getRecords();
    expect(records).toHaveLength(3);
    expect(records[2].kind).toBe('boolean');
    expect(records[2].inputs.base).toEqual({ kind: 'feature', id: base.id });
    expect(result.id).toBe(records[2].id);
  });

  it('chain ops accept ParamRef in numeric opts (symbolic capture)', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const w = api.param('plateW', 60);
    const s = api.box(w, 40, 5);
    const rec = session.getRecords()[0];
    expect(rec.params.x.paramRef).toBe('plateW');
    expect(s.id).toBeDefined();
  });
});

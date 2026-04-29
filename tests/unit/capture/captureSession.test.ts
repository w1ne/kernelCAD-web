import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';

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

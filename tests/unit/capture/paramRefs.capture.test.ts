// tests/unit/capture/paramRefs.capture.test.ts
//
// Phase-2 unit tests: chain methods that receive a ParamRef store the
// symbolic ref in the FeatureRecord's params (via Param.paramRef), and the
// session's register() populates `metadata.paramRefs` for the dependency index.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';

describe('capture-time paramRef threading', () => {
  it('box(width: ParamRef) records {$param} in params + metadata.paramRefs', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const w = api.param('plateW', 60);
    api.box(w, 40, 5);
    const rec = session.getRecords()[0];
    expect(rec.params.x.paramRef).toBe('plateW');
    expect((rec.metadata as { paramRefs?: string[] }).paramRefs).toEqual(['plateW']);
  });

  it('multi-param box deduplicates same name and lists all distinct refs', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const p = api.params({ w: 60, h: 40, t: 5 });
    api.box(p.w, p.h, p.t);
    const rec = session.getRecords()[0];
    expect((rec.metadata as { paramRefs?: string[] }).paramRefs?.sort()).toEqual(['h', 't', 'w']);
  });

  it('mixed literal + ParamRef only records ref names', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const w = api.param('w', 60);
    api.box(w, 40, 5);
    const rec = session.getRecords()[0];
    expect((rec.metadata as { paramRefs?: string[] }).paramRefs).toEqual(['w']);
  });

  it('all-literal records have NO paramRefs metadata key', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    api.box(60, 40, 5);
    const rec = session.getRecords()[0];
    expect((rec.metadata as { paramRefs?: string[] } | undefined)?.paramRefs).toBeUndefined();
  });

  it('hole({diameter: ParamRef}) records the ref in params and metadata.paramRefs', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const dia = api.param('boltDia', 5, { min: 1, max: 20 });
    const plate = api.box(60, 40, 5);
    plate.hole('top', { u: 0, v: 0, diameter: dia, depth: 'through' });
    const holeRec = session.getRecords().find((r) => r.kind === 'hole')!;
    expect(holeRec.params.diameter.paramRef).toBe('boltDia');
    expect((holeRec.metadata as { paramRefs?: string[] }).paramRefs).toContain('boltDia');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CaptureSession } from '../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../src/modeling/api';
import { resolvePart } from '../../src/modeling/parts/familyTable';
import { synthesizeEnvelope } from '../../src/modeling/parts/envelopePart';

describe('lib parts surface — script-runtime integration', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
    delete process.env.KERNELCAD_PARTS_BASE_URL;
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
  });

  it('lib.findPart returns bundled-only when no partsBaseUrl is set', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const r = await api.lib.findPart('M3 screw');
    expect(r.remoteEnabled).toBe(false);
    expect(r.results.length).toBeGreaterThan(0);
  });

  it('lib.fetchPart returns a Shape that captures into the session', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const bolt = await api.lib.fetchPart('iso-4762-m3x12');
    expect(bolt).toBeDefined();
  });

  it('builds a nut envelope without a STEP file', async () => {
    const session = new CaptureSession();
    const shape = await synthesizeEnvelope({ session }, resolvePart({ family: 'hex-nut', thread: 'M5' }));
    const record = session.getRecords().find((candidate) => candidate.id === shape.id);
    expect(record?.metadata?.catalogPart).toMatchObject({ id: 'iso-4032-m5', family: 'hex-nut' });
  });

  it('lib.part and lib.stack place a stocked M5 bolt', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const screw = await api.lib.part({ family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 16 });
    expect(screw).toBeDefined();
    const stack = await api.lib.stack({ thread: 'M5', gripMm: 10, mode: 'bolt' });
    expect(stack.lengthMm).toBe(16);
    expect(stack.screw).toBeDefined();
    expect(stack.headWasher).toBeDefined();
    expect(stack.nut).toBeDefined();
  });

  it('lib.standard.boltSHCS and lib.fetchPart resolve the same id', async () => {
    const a = new CaptureSession();
    const b = new CaptureSession();
    const apiA = createModelingApi({ session: a });
    const apiB = createModelingApi({ session: b });
    const sA = await apiA.lib.standard.boltSHCS({ thread: 'M3', lengthMm: 12 });
    const sB = await apiB.lib.fetchPart('iso-4762-m3x12');
    expect(sA).toBeDefined();
    expect(sB).toBeDefined();
  });

  it('lib.part resolves a fixture family to its catalog id', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const viaPart = await api.lib.part({ family: 't-slot-nut', thread: 'M10' });
    for (const shape of [viaPart]) {
      const record = session.getRecords().find((candidate) => candidate.id === shape.id);
      expect(record?.metadata?.catalogPart).toMatchObject({
        id: 'tslot-nut-m10',
        family: 't-slot-nut',
      });
    }
  });

  it('builds a step block envelope with tread connectors without a STEP file', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const block = await api.lib.part({ family: 'step-block', thread: 'M12' });
    const record = session.getRecords().find((candidate) => candidate.id === block.id);
    expect(record?.metadata?.catalogPart).toMatchObject({ id: 'step-block-m12' });
  });
});

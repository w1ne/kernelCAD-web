// tests/integration/parts/partsAutoConnectors.test.ts
//
// End-to-end check that:
//  1. Authoring `.holes(...)` on a Shape registers bolt-holes-N auto
//     connectors on the session.
//  2. Importing a bundled fastener via lib.standard.boltSHCS attaches the
//     manifest's pre-shipped connectors (head-bearing, thread-tip, ...).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';

describe('parts auto-connectors — capture-session wiring', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
    delete process.env.KERNELCAD_PARTS_BASE_URL;
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
  });

  it('Shape.holes(...) emits bolt-holes-1..N on the session', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const bracket = api.box(40, 20, 3).holes('top', {
      positions: [
        { u: -10, v: 0 },
        { u: 10, v: 0 },
      ],
      diameter: 3,
      depth: 'through',
    });
    const conns = session.autoConnectors.get(bracket.id) as Array<{
      name: string;
    }>;
    expect(conns).toBeDefined();
    expect(conns.length).toBe(2);
    expect(conns.map((c) => c.name)).toEqual([
      'bolt-holes-1',
      'bolt-holes-2',
    ]);
  });

  it('Shape.hole(...) emits bolt-holes-1', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const bracket = api
      .box(40, 20, 3)
      .hole('top', { u: 0, v: 0, diameter: 3, depth: 'through' });
    const conns = session.autoConnectors.get(bracket.id) as Array<{
      name: string;
    }>;
    expect(conns).toBeDefined();
    expect(conns.length).toBe(1);
    expect(conns[0].name).toBe('bolt-holes-1');
  });

  it('lib.standard.boltSHCS attaches bundled connector frames', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const bolt = await api.lib.standard.boltSHCS({
      thread: 'M3',
      lengthMm: 12,
    });
    const conns = session.autoConnectors.get(bolt.id) as Array<{
      name: string;
    }>;
    expect(conns).toBeDefined();
    const names = conns.map((c) => c.name);
    expect(names).toContain('head-bearing');
    expect(names).toContain('thread-tip');
    expect(names).toContain('head-top');
  });
});

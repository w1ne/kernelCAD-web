import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../../src/capture/captureSession';
import { RecomputeEngine } from '../../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/backends/occt/occtLowerer';
import { initOcct, OcctBackend } from '../../../../src/backends/occt/occtBackend';
import { createApi } from '../../../../src/modules/api';

describe('OCCT assembly lowerer', () => {
  beforeAll(async () => { await initOcct(); });

  it('keeps assembly part and joint records executable as geometry passthroughs', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('two-link arm');
    const base = arm.part('base', kcad.box(20, 20, 6), { at: [0, 0, 0] });
    const link = arm.part('link', kcad.box(80, 10, 6), { at: [30, 0, 6] });
    const shoulder = arm.revolute('shoulder', base, link, {
      axis: [0, 0, 1],
      origin: [0, 0, 6],
      limitsDeg: [-90, 90],
    });

    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());

    expect(result.diagnostics).toEqual([]);
    expect(result.shapes.get(base.id)).toBeDefined();
    expect(result.shapes.get(link.id)).toBeDefined();
    expect(result.shapes.get(shoulder.id)).toBeDefined();
    expect(result.shapes.get(link.id)?.boundingBox().min[0]).toBeGreaterThan(20);
  });

  it('lowers assembly.model() to one fused exportable shape containing every placed part', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const assembly = kcad.assembly('static assembly');
    assembly.part('left', kcad.box(10, 10, 10), { at: [0, 0, 0] });
    assembly.part('right', kcad.box(10, 10, 10), { at: [30, 0, 0] });
    const model = assembly.model();

    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());

    expect(result.diagnostics).toEqual([]);
    const shape = result.shapes.get(model.id);
    expect(shape).toBeDefined();
    if (!shape) throw new Error('assembly model did not lower');
    const bbox = shape.boundingBox();
    expect(bbox.min[0]).toBeCloseTo(0, 5);
    expect(bbox.max[0]).toBeCloseTo(40, 5);
    expect(shape.volume()).toBeGreaterThan(1900);
    expect(shape).toBeInstanceOf(OcctBackend);
    const stl = await (shape as OcctBackend).exportSTLAsync();
    expect(stl.byteLength).toBeGreaterThan(0);
  });

  it('lowers connector-placed parts at the computed fixed placement', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const assembly = kcad.assembly('connector assembly');
    const base = assembly.part('base', kcad.box(20, 20, 8), {
      at: [0, 0, 0],
      connectors: { mount: { origin: [10, 0, 8] } },
    });
    assembly.part('link', kcad.box(60, 8, 6), {
      connectors: { root: { origin: [-30, 0, 0] } },
      connect: { connector: 'root', to: base.connector('mount') },
    });
    const model = assembly.model();

    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());

    expect(result.diagnostics).toEqual([]);
    const shape = result.shapes.get(model.id);
    expect(shape).toBeDefined();
    if (!shape) throw new Error('assembly model did not lower');
    const bbox = shape.boundingBox();
    expect(bbox.min[0]).toBeCloseTo(0, 5);
    expect(bbox.max[0]).toBeCloseTo(100, 5);
    expect(bbox.max[2]).toBeCloseTo(14, 5);
  });
});

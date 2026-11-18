// Open-face projection regression for issue #1568.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import type { SketchCommand } from '../../../src/shared/capture/sketchCommand';
import { captureOpenFaceProjectionDemo } from '../../../docs/demos/open-face-projection/demo';

const mm = (value: number) => ({ expression: String(value), unit: 'mm' as const, evaluated: value });

const OPEN_LINE: SketchCommand[] = [
  { kind: 'moveTo', x: mm(-12), y: mm(0) },
  { kind: 'lineTo', x: mm(12), y: mm(0) },
];

describe('Shape.projectCurve open-face mode (#1568)', () => {
  beforeAll(async () => { await initOcct(); });

  it('projects a complete path onto a selected planar face and feeds a curve to variableSweep', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const plate = api.box(30, 10, 30);

    const curves = await plate.projectCurve({
      source: { kind: 'sketchCommands', commands: OPEN_LINE },
      face: 'right',
      asEdge: true,
      sourcePlane: { origin: [50, 5, 15], normal: [0, 1, 0], xAxis: [0, 0, 1] },
      direction: [-1, 0, 0],
    });

    expect(curves).toHaveLength(1);
    expect(curves[0].length()).toBeCloseTo(24, 1);
    expect(curves[0].sample(8).every((point) => Math.abs(point[0] - 30) < 1e-3)).toBe(true);

    const profile = api.path()
      .moveTo(-0.5, -0.5)
      .lineTo(0.5, -0.5)
      .lineTo(0.5, 0.5)
      .lineTo(-0.5, 0.5)
      .close();
    const swept = api.variableSweep(curves[0], [
      { t: 0, profile },
      { t: 1, profile },
    ]);
    const result = await new RecomputeEngine(createOcctLowerer(session)).run(session.getRecords(), {
      paramTable: session.paramTable,
    });
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.shapes.get(swept.id)?.volume()).toBeGreaterThan(0);
  }, 120_000);

  it('returns both fragments when a perforated selected face splits the path', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const plate = api.box(30, 10, 4)
      .translate(-15, -5, 0)
      .subtract(api.cylinder(6, 3).translate(0, 0, -1));

    const curves = await plate.projectCurve({
      source: { kind: 'sketchCommands', commands: OPEN_LINE },
      face: 'top',
      asEdge: true,
      sourcePlane: { origin: [0, 0, 50], normal: [0, 0, 1], xAxis: [1, 0, 0] },
      direction: [0, 0, -1],
    });
    expect(curves).toHaveLength(2);
    const lengths = curves.map((curve) => curve.length()).sort((a, b) => a - b);
    expect(lengths[0]).toBeCloseTo(9, 1);
    expect(lengths[1]).toBeCloseTo(9, 1);
  }, 120_000);

  it('requires an explicit world-space source plane and direction', () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const plate = api.box(20, 20, 4);
    expect(() => plate.projectCurve({
      source: { kind: 'sketchCommands', commands: OPEN_LINE },
      face: 'top',
      asEdge: true,
    } as never)).toThrow(/sourcePlane and direction/i);
  });

  it('rebuilds the linked demo bundle from measured OCCT curves', async () => {
    const demo = await captureOpenFaceProjectionDemo();
    expect(demo.frameCount).toBe(3);
    expect(demo.fragments).toHaveLength(2);
    expect(demo.fragments.every((fragment) => Math.abs(fragment.lengthMm - 9) < 0.1)).toBe(true);
  }, 120_000);
});

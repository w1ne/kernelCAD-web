import { describe, expect, it, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { buildNurbsSketchOnPlane } from '../../../../src/kernel/backends/occt/pathNurbsLowerer';
import { toParam } from '../../../../src/shared/runtime/editableHelpers';
import type { SketchCommand } from '../../../../src/modeling/capture/sketch';

const mm = (n: number) => toParam(n, 'mm');

// Right triangle offset from the loft axis: rotation changes the bbox.
const tri: SketchCommand[] = [
  { kind: 'moveTo', x: mm(0), y: mm(-6) },
  { kind: 'lineTo', x: mm(20), y: mm(-6) },
  { kind: 'lineTo', x: mm(0), y: mm(6) },
  { kind: 'close' },
];

describe('loft section rotation + NURBS placement', () => {
  beforeAll(async () => { await initOcct(); });

  it('rotates a section in-plane by rotationDeg (bbox changes vs unrotated)', () => {
    const unrotated = OcctBackend.loftFromSketches(
      [OcctBackend.fromSketchCommands(tri), OcctBackend.fromSketchCommands(tri)],
      [
        { plane: 'XY', origin: [0, 0, 0] },
        { plane: 'XY', origin: [0, 0, 60] },
      ],
    );
    const twisted = OcctBackend.loftFromSketches(
      [OcctBackend.fromSketchCommands(tri), OcctBackend.fromSketchCommands(tri)],
      [
        { plane: 'XY', origin: [0, 0, 0] },
        { plane: 'XY', origin: [0, 0, 60], rotationDeg: 90 },
      ],
    );
    expect(twisted.volume()).toBeGreaterThan(0);
    // Exact bboxes pin the angle AND the direction. Top section
    // (0,-6),(20,-6),(0,6) rotated 90° CCW about (0,0) maps to
    // (6,0),(6,20),(-6,0): x ∈ [-6,6], y ∈ [0,20]. Bottom section is
    // unrotated: x ∈ [0,20], y ∈ [-6,6]. Combined:
    const tb = twisted.boundingBox();
    expect(tb.min[0]).toBeCloseTo(-6, 6);
    expect(tb.max[0]).toBeCloseTo(20, 6);
    expect(tb.min[1]).toBeCloseTo(-6, 6);
    expect(tb.max[1]).toBeCloseTo(20, 6);
    // The unrotated reference loft is the plain prism bbox.
    const ub = unrotated.boundingBox();
    expect(ub.min[0]).toBeCloseTo(0, 6);
    expect(ub.max[0]).toBeCloseTo(20, 6);
    expect(ub.min[1]).toBeCloseTo(-6, 6);
    expect(ub.max[1]).toBeCloseTo(6, 6);
  });

  it('rotates about opts.twistCenter (exact bbox)', () => {
    const solid = OcctBackend.loftFromSketches(
      [OcctBackend.fromSketchCommands(tri), OcctBackend.fromSketchCommands(tri)],
      [
        { plane: 'XY', origin: [0, 0, 0] },
        { plane: 'XY', origin: [0, 0, 60], rotationDeg: 90 },
      ],
      { twistCenter: [10, 0] },
    );
    // Top section rotated 90° CCW about (10,0):
    // (0,-6)→(16,-10), (20,-6)→(16,10), (0,6)→(4,-10)
    // → top x ∈ [4,16], y ∈ [-10,10]. Bottom unrotated: x ∈ [0,20],
    // y ∈ [-6,6]. Combined solid bbox:
    const bb = solid.boundingBox();
    expect(solid.volume()).toBeGreaterThan(0);
    expect(bb.min[0]).toBeCloseTo(0, 6);
    expect(bb.max[0]).toBeCloseTo(20, 6);
    expect(bb.min[1]).toBeCloseTo(-10, 6);
    expect(bb.max[1]).toBeCloseTo(10, 6);
  });

  it('rejects a non-finite planes[].rotationDeg with the section index', () => {
    const a = OcctBackend.fromSketchCommands(tri);
    const b = OcctBackend.fromSketchCommands(tri);
    expect(() => OcctBackend.loftFromSketches([a, b], [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, 60], rotationDeg: NaN },
    ])).toThrow(/planes\[1\]\.rotationDeg.*finite/);
  });

  it('rejects a non-finite opts.rotationDeg in the NURBS lowerer instead of skipping it', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(() => buildNurbsSketchOnPlane(tri, 'XY', { rotationDeg: bad }))
        .toThrow(/rotationDeg.*finite/);
    }
  });

  it('honors origin for NURBS-bearing sections (no degenerate solid)', () => {
    const spline = (): SketchCommand[] => [
      { kind: 'moveTo', x: mm(0), y: mm(-2) },
      {
        kind: 'spline',
        points: [
          { x: mm(0), y: mm(-2) }, { x: mm(6), y: mm(0) }, { x: mm(0), y: mm(2) },
          { x: mm(-6), y: mm(0) }, { x: mm(0), y: mm(-2) },
        ],
      },
      { kind: 'close' },
    ];
    const a = OcctBackend.fromSketchCommands(spline());
    const b = OcctBackend.fromSketchCommands(spline());
    const solid = OcctBackend.loftFromSketches([a, b], [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, 80] },
    ]);
    expect(solid.volume()).toBeGreaterThan(0);
    expect(solid.boundingBox().max[2]).toBeGreaterThan(70);
  });
});

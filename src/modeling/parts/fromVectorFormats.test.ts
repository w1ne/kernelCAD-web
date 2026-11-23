// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/fromVectorFormats.test.ts
//
// Round-trip tests for `lib.fromDXF` / `lib.fromSVG`: import a 2D profile,
// extrude it, and check the resulting SOLID's volume against a hand-computed
// number.
//
// This is the test that keeps the parsers honest end to end. A parser unit
// test can agree with itself about a bulge sign — only pushing the sketch
// through `drawingFromCommands` -> replicad -> OCCT and measuring the volume
// proves the sign convention actually matches the kernel's.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import { getOC } from 'replicad';
import { isValidShape } from '../../kernel/backends/occt/booleanRecovery';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { OcctLowerer } from '../backends/occt/occtLowerer';
import { KernelError } from '../../shared/intent/kernelError';

let tmpDir: string;

/** A 10 x 5 mm closed LWPOLYLINE with no header, so `$INSUNITS` is absent. */
const PLATE_DXF = [
  0, 'SECTION', 2, 'ENTITIES',
  0, 'LWPOLYLINE', 90, 4, 70, 1,
  10, 0, 20, 0,
  10, 10, 20, 0,
  10, 10, 20, 5,
  10, 0, 20, 5,
  0, 'ENDSEC', 0, 'EOF',
].join('\n') + '\n';

/** Same plate, plus a r=1 mm hole circle: two regions. */
const PLATE_WITH_HOLE_DXF = [
  0, 'SECTION', 2, 'ENTITIES',
  0, 'LWPOLYLINE', 90, 4, 70, 1,
  10, 0, 20, 0,
  10, 10, 20, 0,
  10, 10, 20, 5,
  10, 0, 20, 5,
  0, 'CIRCLE', 10, 5, 20, 2.5, 40, 1,
  0, 'ENDSEC', 0, 'EOF',
].join('\n') + '\n';

/**
 * A square with ONE outward bulge arc on its bottom edge. The bulge sign is
 * the whole point: get it backwards and the arc bows inward, and the volume
 * comes out 100 - 17.47 instead of 100 + 17.47 per mm of depth.
 */
const BULGED_DXF = [
  0, 'SECTION', 2, 'ENTITIES',
  0, 'LWPOLYLINE', 90, 4, 70, 1,
  10, 0, 20, 0, 42, 0.5,
  10, 10, 20, 0,
  10, 10, 20, 10,
  10, 0, 20, 10,
  0, 'ENDSEC', 0, 'EOF',
].join('\n') + '\n';

/**
 * A 30 x 20 plate at x in [-30, 0] (world coordinates, extrusion +Z) with a
 * r=3 mm hole written as a CIRCLE with extrusion (0, 0, -1). Its stored
 * centre (10, 10) is in the mirrored OCS, so the world centre is (-10, 10)
 * and the hole lies inside the plate. Read without the OCS, it lies outside.
 */
const MIRRORED_HOLE_DXF = [
  0, 'SECTION', 2, 'ENTITIES',
  0, 'LWPOLYLINE', 90, 4, 70, 1,
  10, -30, 20, 0,
  10, 0, 20, 0,
  10, 0, 20, 20,
  10, -30, 20, 20,
  0, 'CIRCLE', 10, 10, 20, 10, 40, 3, 210, 0, 220, 0, 230, -1,
  0, 'ENDSEC', 0, 'EOF',
].join('\n') + '\n';

/**
 * A 60 x 40 plate whose four r=2.5 mm holes are one block, "HOLE", placed as
 * a 2 x 2 MINSERT grid at (10, 10) with 40 mm column and 20 mm row spacing.
 * The block base point (1, 0) is subtracted, so the circle drawn at (1, 0)
 * lands exactly on each grid point. Exporters write repeated holes this way.
 */
const BLOCK_HOLES_DXF = [
  0, 'SECTION', 2, 'BLOCKS',
  0, 'BLOCK', 8, '0', 2, 'HOLE', 70, 0, 10, 1, 20, 0, 30, 0, 3, 'HOLE',
  0, 'CIRCLE', 8, '0', 10, 1, 20, 0, 30, 0, 40, 2.5,
  0, 'ENDBLK', 8, '0',
  0, 'ENDSEC',
  0, 'SECTION', 2, 'ENTITIES',
  0, 'LWPOLYLINE', 90, 4, 70, 1,
  10, 0, 20, 0,
  10, 60, 20, 0,
  10, 60, 20, 40,
  10, 0, 20, 40,
  0, 'INSERT', 8, '0', 2, 'HOLE', 10, 10, 20, 10, 30, 0, 70, 2, 71, 2, 44, 40, 45, 20,
  0, 'ENDSEC', 0, 'EOF',
].join('\n') + '\n';

/**
 * A 60 x 40 plate with one r = 5 hole block inserted at (30, 20) with scale
 * (2, 1) and rotation 90°: an elliptical hole, semi-axes 10 along Y and 5
 * along X, so the plate encloses exactly 2400 - 50π mm².
 */
const STRETCHED_HOLE_DXF = [
  0, 'SECTION', 2, 'BLOCKS',
  0, 'BLOCK', 8, '0', 2, 'HOLE', 70, 0, 10, 0, 20, 0, 30, 0, 3, 'HOLE',
  0, 'CIRCLE', 8, '0', 10, 0, 20, 0, 30, 0, 40, 5,
  0, 'ENDBLK', 8, '0',
  0, 'ENDSEC',
  0, 'SECTION', 2, 'ENTITIES',
  0, 'LWPOLYLINE', 90, 4, 70, 1,
  10, 0, 20, 0,
  10, 60, 20, 0,
  10, 60, 20, 40,
  10, 0, 20, 40,
  0, 'INSERT', 8, '0', 2, 'HOLE', 10, 30, 20, 20, 30, 0, 41, 2, 42, 1, 43, 1, 50, 90,
  0, 'ENDSEC', 0, 'EOF',
].join('\n') + '\n';

/**
 * A 60 x 40 plate with a closed spline cut-out, written the way AutoCAD and
 * ezdxf write a closed spline: a periodic (flag 2) uniform cubic whose first
 * three control points repeat at the end and whose knots 0..10 are unclamped.
 * The control net is the 20 mm square centred on (30, 20). By Green's theorem
 * this closed uniform cubic B-spline encloses exactly 2440/9 mm².
 */
const PERIODIC_SPLINE_CUTOUT_DXF = [
  0, 'SECTION', 2, 'ENTITIES',
  0, 'LWPOLYLINE', 90, 4, 70, 1,
  10, 0, 20, 0,
  10, 60, 20, 0,
  10, 60, 20, 40,
  10, 0, 20, 40,
  0, 'SPLINE', 8, '0', 210, 0, 220, 0, 230, 1, 70, 11, 71, 3, 72, 11, 73, 7, 74, 0,
  ...Array.from({ length: 11 }, (_, i) => [40, i]).flat(),
  ...[[20, 10], [40, 10], [40, 30], [20, 30], [20, 10], [40, 10], [40, 30]]
    .flatMap(([x, y]) => [10, x, 20, y, 30, 0]),
  0, 'ENDSEC', 0, 'EOF',
].join('\n') + '\n';

/**
 * A 60 x 40 plate with a closed fit-point-only SPLINE cut-out: eight fit
 * points on an 8 mm circle centred on (30, 20), flag 11 (closed | periodic |
 * planar), no control net and no end tangents, as ezdxf
 * `add_spline(fit_points)` writes a closed spline before it is edited.
 */
const CLOSED_FIT_SPLINE_CUTOUT_DXF = [
  0, 'SECTION', 2, 'ENTITIES',
  0, 'LWPOLYLINE', 90, 4, 70, 1,
  10, 0, 20, 0,
  10, 60, 20, 0,
  10, 60, 20, 40,
  10, 0, 20, 40,
  0, 'SPLINE', 8, '0', 210, 0, 220, 0, 230, 1, 70, 11, 71, 3, 72, 0, 73, 0, 74, 8,
  ...Array.from({ length: 8 }, (_, k) => [30 + 8 * Math.cos((k * Math.PI) / 4), 20 + 8 * Math.sin((k * Math.PI) / 4)])
    .flatMap(([x, y]) => [11, x, 21, y, 31, 0]),
  0, 'ENDSEC', 0, 'EOF',
].join('\n') + '\n';

/**
 * A 40 mm arch written the way ezdxf `add_spline(fit_points)` writes it: a
 * cubic SPLINE with five fit points (group codes 11/21/31) and no control
 * net, closed by a LINE along the X axis. The polygon through the fit points
 * encloses 260 mm²; the smooth arch through them encloses slightly more.
 */
const FIT_POINT_ARCH_DXF = [
  0, 'SECTION', 2, 'ENTITIES',
  0, 'SPLINE', 8, '0', 210, 0, 220, 0, 230, 1, 70, 8, 71, 3, 72, 0, 73, 0, 74, 5,
  ...[[0, 0], [10, 8], [20, 10], [30, 8], [40, 0]].flatMap(([x, y]) => [11, x, 21, y, 31, 0]),
  0, 'LINE', 8, '0', 10, 40, 20, 0, 11, 0, 21, 0,
  0, 'ENDSEC', 0, 'EOF',
].join('\n') + '\n';

/** The asymmetric L from the parser tests, at true millimetre scale. */
const L_SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="40mm" viewBox="0 0 100 40">
  <polygon points="0,0 100,0 100,10 10,10 10,40 0,40"/>
</svg>`;

const DISC_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40mm" viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="8"/>
</svg>`;

const OPEN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40mm" viewBox="0 0 40 40">
  <polyline points="0,0 20,0 20,10"/>
</svg>`;

beforeAll(async () => {
  await initOcct();
  tmpDir = mkdtempSync(join(tmpdir(), 'kcad-fromvector-'));
  writeFileSync(join(tmpDir, 'plate.dxf'), PLATE_DXF);
  writeFileSync(join(tmpDir, 'plate-hole.dxf'), PLATE_WITH_HOLE_DXF);
  writeFileSync(join(tmpDir, 'bulged.dxf'), BULGED_DXF);
  writeFileSync(join(tmpDir, 'mirrored-hole.dxf'), MIRRORED_HOLE_DXF);
  writeFileSync(join(tmpDir, 'block-holes.dxf'), BLOCK_HOLES_DXF);
  writeFileSync(join(tmpDir, 'stretched-hole.dxf'), STRETCHED_HOLE_DXF);
  writeFileSync(join(tmpDir, 'periodic-spline-cutout.dxf'), PERIODIC_SPLINE_CUTOUT_DXF);
  writeFileSync(join(tmpDir, 'fit-point-arch.dxf'), FIT_POINT_ARCH_DXF);
  writeFileSync(join(tmpDir, 'closed-fit-spline-cutout.dxf'), CLOSED_FIT_SPLINE_CUTOUT_DXF);
  writeFileSync(
    join(tmpDir, 'spline-profile.dxf'),
    readFileSync(join(process.cwd(), 'examples/interoperability/dxf-spline/spline-profile.dxf'), 'utf8'),
  );
  writeFileSync(join(tmpDir, 'ell.svg'), L_SVG);
  writeFileSync(join(tmpDir, 'disc.svg'), DISC_SVG);
  writeFileSync(join(tmpDir, 'open.svg'), OPEN_SVG);
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

/** Lower every captured record and return the OCCT backend for `id`. */
async function lower(session: CaptureSession, id: string): Promise<OcctBackend> {
  const lowerer = new OcctLowerer();
  lowerer.importedGeometry = session.importedGeometry;
  const engine = new RecomputeEngine(lowerer);
  const result = await engine.run(session.getRecords(), { paramTable: session.paramTable });
  expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  const shape = result.shapes.get(id);
  expect(shape).toBeDefined();
  return shape as OcctBackend;
}

describe('lib.fromDXF — round trip to a solid', () => {
  it('imports a full rotated DXF ellipse as an exact closed profile and extrudes it to the analytic volume', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: process.cwd() });

    const [profile] = await api.lib.fromDXF('examples/interoperability/dxf-ellipse/ellipse-profile.dxf');
    expect(profile).toBeDefined();
    const commands = session.getRecords().find(record => record.id === profile.id)?.metadata?.commands as
      Array<{
        kind: string;
        controlPoints?: Array<{ x: { evaluated: number }; y: { evaluated: number } }>;
        weights?: Array<{ evaluated: number }>;
      }>;
    const ellipseCommands = commands.filter(command => command.kind === 'nurbsSegment');
    expect(ellipseCommands).toHaveLength(4);
    const firstArc = ellipseCommands[0];
    expect(firstArc.controlPoints?.map(point => [point.x.evaluated, point.y.evaluated])).toEqual([
      [expect.closeTo(40 + Math.sqrt(300), 8), 40],
      [expect.closeTo(40 + Math.sqrt(300) - 5, 8), expect.closeTo(30 + 10 + Math.sqrt(75), 8)],
      [35, expect.closeTo(30 + Math.sqrt(75), 8)],
    ]);
    expect(firstArc.weights?.map(weight => weight.evaluated)).toEqual([1, Math.SQRT1_2, 1]);

    const backend = await lower(session, profile.extrude(5).id);
    expect(isValidShape(getOC(), backend.getReplicadShape().wrapped)).toBe(true);
    expect(backend.volume()).toBeCloseTo(Math.PI * 20 * 10 * 5, 5);
    const bounds = backend.boundingBox();
    expect(bounds.min[2]).toBeCloseTo(0, 6);
    expect(bounds.max[2]).toBeCloseTo(5, 6);
  });

  it('imports a partial planar DXF ellipse as an exact closed profile and extrudes it to the analytic volume', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: process.cwd() });

    const [profile] = await api.lib.fromDXF('examples/interoperability/dxf-ellipse/partial-ellipse.dxf');
    expect(profile).toBeDefined();
    const commands = session.getRecords().find(record => record.id === profile.id)?.metadata?.commands as
      Array<{
        kind: string;
        weights?: Array<{ evaluated: number }>;
      }>;
    const ellipseCommands = commands.filter(command => command.kind === 'nurbsSegment');
    expect(ellipseCommands).toHaveLength(2);
    expect(ellipseCommands[0].weights?.map(weight => weight.evaluated)).toEqual([1, Math.SQRT1_2, 1]);

    const backend = await lower(session, profile.extrude(3).id);
    expect(isValidShape(getOC(), backend.getReplicadShape().wrapped)).toBe(true);
    expect(backend.volume()).toBeCloseTo(25 * Math.PI * 3, 5);
    expect(backend.boundingBox()).toMatchObject({
      min: [expect.closeTo(10, 6), expect.closeTo(20, 6), expect.closeTo(0, 6)],
      max: [expect.closeTo(30, 6), expect.closeTo(25, 6), expect.closeTo(3, 6)],
    });
  });

  it('imports one closed polyline HATCH boundary and preserves its bulge in the solid', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: process.cwd() });

    const profiles = await api.lib.fromDXF('examples/interoperability/dxf-hatch/hatch-bulged-plate.dxf');
    expect(profiles).toHaveLength(1);

    const backend = await lower(session, profiles[0].extrude(5).id);
    expect(isValidShape(getOC(), backend.getReplicadShape().wrapped)).toBe(true);
    // The 40 × 20 mm rectangle includes an outward semicircle of radius 20 mm.
    expect(backend.volume()).toBeCloseTo((800 + 200 * Math.PI) * 5, 4);
    expect(backend.boundingBox()).toMatchObject({
      min: [expect.closeTo(0, 6), expect.closeTo(-20, 6), expect.closeTo(0, 6)],
      max: [expect.closeTo(40, 6), expect.closeTo(20, 6), expect.closeTo(5, 6)],
    });
  });

  it('imports a multi-path HATCH as one profile whose window and bolt holes cut the solid', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: process.cwd() });

    const profiles = await api.lib.fromDXF('examples/interoperability/dxf-hatch/hatch-gasket.dxf');
    expect(profiles).toHaveLength(1);

    const backend = await lower(session, profiles[0].extrude(2).id);
    const shape = backend.getReplicadShape();
    expect(isValidShape(getOC(), shape.wrapped)).toBe(true);
    // 60 x 40 plate minus a 30 x 16 window and four r = 3 bolt holes, 2 mm thick.
    expect(backend.volume()).toBeCloseTo((2400 - 480 - 36 * Math.PI) * 2, 4);
    // Outer sides, top, bottom, four window walls and four cylindrical bores.
    expect(shape.faces.length).toBe(4 + 2 + 4 + 4 * 2);
    expect(backend.boundingBox()).toMatchObject({
      min: [expect.closeTo(0, 6), expect.closeTo(0, 6), expect.closeTo(0, 6)],
      max: [expect.closeTo(60, 6), expect.closeTo(40, 6), expect.closeTo(2, 6)],
    });
  });

  it('imports an edge-based HATCH of lines and arcs as one plate with a slot and round holes', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: process.cwd() });

    const profiles = await api.lib.fromDXF('examples/interoperability/dxf-hatch/hatch-edge-bracket.dxf');
    expect(profiles).toHaveLength(1);

    const backend = await lower(session, profiles[0].extrude(3).id);
    const shape = backend.getReplicadShape();
    expect(isValidShape(getOC(), shape.wrapped)).toBe(true);
    // 60 x 30 plate with r5 corners, minus a 20 x 6 slot with r3 ends and two r4 holes, 3 mm thick.
    expect(backend.volume()).toBeCloseTo((1700 + 25 * Math.PI - (120 + 9 * Math.PI) - 32 * Math.PI) * 3, 4);
    // Outer: 4 flats and 4 corner cylinders; slot: 2 flats and 2 half cylinders;
    // two bores of two half cylinders each; top and bottom.
    expect(shape.faces.length).toBe(8 + 4 + 4 + 2);
    expect(backend.boundingBox()).toMatchObject({
      min: [expect.closeTo(0, 6), expect.closeTo(0, 6), expect.closeTo(0, 6)],
      max: [expect.closeTo(60, 6), expect.closeTo(30, 6), expect.closeTo(3, 6)],
    });
  });

  it('imports HATCH spline and elliptic-arc edges as exact curved faces', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: process.cwd() });

    const profiles = await api.lib.fromDXF('examples/interoperability/dxf-hatch/hatch-curved-edge-plate.dxf');
    expect(profiles).toHaveLength(1);

    const backend = await lower(session, profiles[0].extrude(3).id);
    const shape = backend.getReplicadShape();
    expect(isValidShape(getOC(), shape.wrapped)).toBe(true);
    // 60 x 20 plate plus the cubic bump 45 t (1 - t) over 60 mm (450), minus
    // a 10 x 4 elliptic hole (40 pi) and a 4 x 2 half-ellipse D-hole (4 pi).
    const exact = (1650 - 44 * Math.PI) * 3;
    expect(Math.abs(backend.volume() - exact) / exact).toBeLessThan(1e-4);
    expect(backend.boundingBox()).toMatchObject({
      min: [expect.closeTo(0, 6), expect.closeTo(0, 6), expect.closeTo(0, 6)],
      max: [expect.closeTo(60, 6), expect.closeTo(31.25, 3), expect.closeTo(3, 6)],
    });
    // Swept curved walls: the spline edge, four elliptic quarters and the two
    // quarters of the half ellipse; the other six faces are planar.
    const types = shape.faces.map(face => face.geomType);
    expect(types.filter(type => type === 'EXTRUSION_SURFACE')).toHaveLength(1 + 4 + 2);
    expect(types.filter(type => type === 'PLANE')).toHaveLength(3 + 1 + 2);
  });

  it('imports a plate and extrudes it to the hand-computed volume', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });

    const sketches = await api.lib.fromDXF('plate.dxf');
    expect(sketches).toHaveLength(1);

    const solid = sketches[0].extrude(3);
    const backend = await lower(session, solid.id);
    // 10 x 5 x 3 mm.
    expect(backend.volume()).toBeCloseTo(150, 6);
  });

  it('carries the DXF bulge through to real geometry with the right sign', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });

    const [profile] = await api.lib.fromDXF('bulged.dxf');
    const backend = await lower(session, profile.extrude(2).id);

    const theta = 4 * Math.atan(0.5);
    const radius = 5 / Math.sin(theta / 2);
    const segment = (radius * radius / 2) * (theta - Math.sin(theta));
    // The arc bows OUTWARD, so the area is 100 + segment, never 100 - segment.
    expect(backend.volume()).toBeCloseTo((100 + segment) * 2, 4);
    expect(backend.volume()).toBeGreaterThan(200);
  });

  it('imports a rational DXF NURBS segment exactly into a closed solid profile', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });

    const [profile] = await api.lib.fromDXF('spline-profile.dxf');
    const command = (session.getRecords().find(record => record.id === profile.id)?.metadata?.commands as
      Array<{ kind: string; degree?: { evaluated: number }; knots?: Array<{ evaluated: number }>; weights?: Array<{ evaluated: number }> }>)
      .find(item => item.kind === 'nurbsSegment');
    expect(command?.degree?.evaluated).toBe(2);
    expect(command?.knots?.map(knot => knot.evaluated)).toEqual([0, 0, 0, 1, 1, 1]);
    expect(command?.weights?.map(weight => weight.evaluated)).toEqual([1, Math.SQRT1_2, 1]);
    const backend = await lower(session, profile.extrude(3).id);

    // This rational quadratic is an exact quarter-circle of radius 10 mm.
    expect(isValidShape(getOC(), backend.getReplicadShape().wrapped)).toBe(true);
    expect(backend.volume()).toBeCloseTo((Math.PI * 100 / 4) * 3, 5);
  });

  it('returns every closed region, largest first, so holes can be cut explicitly', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });

    const [outline, ...holes] = await api.lib.fromDXF('plate-hole.dxf');
    expect(holes).toHaveLength(1);

    const plate = outline.extrude(3).subtract(holes[0].extrude(3));
    const backend = await lower(session, plate.id);
    expect(backend.volume()).toBeCloseTo((10 * 5 - Math.PI) * 3, 4);
  });

  it('places a CIRCLE with extrusion (0, 0, -1) at its mirrored world centre', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });
    const [outline, ...holes] = await api.lib.fromDXF('mirrored-hole.dxf');
    expect(holes).toHaveLength(1);

    const plate = outline.extrude(2).subtract(holes[0].extrude(2));
    const backend = await lower(session, plate.id);
    // The hole cuts the plate only at the mirrored centre (-10, 10).
    expect(backend.volume()).toBeCloseTo((30 * 20 - 9 * Math.PI) * 2, 4);
    const box = backend.boundingBox();
    expect(box.min[0]).toBeCloseTo(-30, 6);
    expect(box.max[0]).toBeCloseTo(0, 6);
  });

  it('cuts a periodic closed DXF SPLINE out of a plate at its exact enclosed area', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });
    const [outline, cutout] = await api.lib.fromDXF('periodic-spline-cutout.dxf');
    expect(cutout).toBeDefined();

    const plate = outline.extrude(4).subtract(cutout.extrude(4));
    const backend = await lower(session, plate.id);
    expect(isValidShape(getOC(), backend.getReplicadShape().wrapped)).toBe(true);
    // The spline prism alone integrates to the exact area within 1e-6.
    const prism = await lower(session, cutout.extrude(4).id);
    expect(isValidShape(getOC(), prism.getReplicadShape().wrapped)).toBe(true);
    expect(prism.volume()).toBeCloseTo((2440 / 9) * 4, 2);
    // After the cut, OCCT's fixed-order integration over the trimmed planar
    // faces measured 1.6e-5 relative error, so the plate check is relative.
    expect(Math.abs(backend.volume() / ((60 * 40 - 2440 / 9) * 4) - 1)).toBeLessThan(1e-4);

    // The clamped curve starts at the uniform-cubic knot point (P0 + 4 P1 + P2) / 6
    // and is symmetric about the square centre, so its box is centred on (30, 20).
    const box = (await lower(session, cutout.extrude(1).id)).boundingBox();
    expect((box.min[0] + box.max[0]) / 2).toBeCloseTo(30, 6);
    expect((box.min[1] + box.max[1]) / 2).toBeCloseTo(20, 6);
  });

  it('extrudes a fit-point-only DXF SPLINE arch into a valid solid through its fit points', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });
    const [arch] = await api.lib.fromDXF('fit-point-arch.dxf');
    const backend = await lower(session, arch.extrude(3).id);
    expect(isValidShape(getOC(), backend.getReplicadShape().wrapped)).toBe(true);
    // The arch bulges just outside the 260 mm² fit-point polygon.
    expect(backend.volume() / 3).toBeGreaterThan(260);
    expect(backend.volume() / 3).toBeLessThan(290);
    // The curve is symmetric about x = 20 and passes through (20, 10), so its
    // apex is that fit point: the box tops out at y = 10 and spans x 0..40.
    const box = backend.boundingBox();
    expect(box.min[0]).toBeCloseTo(0, 6);
    expect(box.max[0]).toBeCloseTo(40, 6);
    expect(box.min[1]).toBeCloseTo(0, 6);
    expect(box.max[1]).toBeCloseTo(10, 5);
  });

  it('cuts a closed fit-point-only DXF SPLINE out of a plate as a smooth near-circular hole', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });
    const [outline, cutout] = await api.lib.fromDXF('closed-fit-spline-cutout.dxf');
    expect(cutout).toBeDefined();
    const prism = await lower(session, cutout.extrude(4).id);
    expect(isValidShape(getOC(), prism.getReplicadShape().wrapped)).toBe(true);
    // The periodic cubic through eight points of the 8 mm circle encloses within 0.2 % of 64 pi mm².
    const area = prism.volume() / 4;
    expect(Math.abs(area / (64 * Math.PI) - 1)).toBeLessThan(2e-3);
    // One smooth closed curve: a single lateral face, not a faceted polygon.
    expect(prism.getReplicadShape().faces.length).toBe(3);
    const box = prism.boundingBox();
    expect((box.min[0] + box.max[0]) / 2).toBeCloseTo(30, 6);
    expect((box.min[1] + box.max[1]) / 2).toBeCloseTo(20, 6);
    expect(box.max[0] - box.min[0]).toBeGreaterThan(15.9);
    expect(box.max[0] - box.min[0]).toBeLessThan(16.1);

    const plate = await lower(session, outline.extrude(4).subtract(cutout.extrude(4)).id);
    expect(isValidShape(getOC(), plate.getReplicadShape().wrapped)).toBe(true);
    expect(Math.abs(plate.volume() / ((60 * 40 - area) * 4) - 1)).toBeLessThan(1e-4);
  });

  it('expands an MINSERT block of holes into four cuts at the grid points', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });
    const [outline, ...holes] = await api.lib.fromDXF('block-holes.dxf');
    expect(holes).toHaveLength(4);

    let plate = outline.extrude(4);
    for (const hole of holes) plate = plate.subtract(hole.extrude(4));
    const backend = await lower(session, plate.id);
    expect(isValidShape(getOC(), backend.getReplicadShape().wrapped)).toBe(true);
    expect(backend.volume()).toBeCloseTo((60 * 40 - 4 * Math.PI * 2.5 * 2.5) * 4, 4);

    const centres = await Promise.all(holes.map(async hole => {
      const box = (await lower(session, hole.extrude(1).id)).boundingBox();
      return [(box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2].map(v => Math.round(v * 1e6) / 1e6);
    }));
    expect(centres.sort((a, b) => a[0] - b[0] || a[1] - b[1])).toEqual([[10, 10], [10, 30], [50, 10], [50, 30]]);
  });

  it('cuts a non-uniformly scaled block circle as an exact elliptical hole', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });
    const [outline, hole, ...rest] = await api.lib.fromDXF('stretched-hole.dxf');
    expect(rest).toHaveLength(0);

    const prism = await lower(session, hole.extrude(4).id);
    expect(isValidShape(getOC(), prism.getReplicadShape().wrapped)).toBe(true);
    expect(prism.volume()).toBeCloseTo(50 * Math.PI * 4, 5);
    const box = prism.boundingBox();
    expect([box.min[0], box.max[0], box.min[1], box.max[1]].map(v => Math.round(v * 1e3) / 1e3))
      .toEqual([25, 35, 10, 30]);

    const plate = await lower(session, outline.extrude(4).subtract(hole.extrude(4)).id);
    expect(isValidShape(getOC(), plate.getReplicadShape().wrapped)).toBe(true);
    expect(Math.abs(plate.volume() / ((2400 - 50 * Math.PI) * 4) - 1)).toBeLessThan(1e-4);
  });

  it('records the unit decision on the sketch so it can be inspected later', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });
    await api.lib.fromDXF('plate.dxf');

    const record = session.getRecords()[0];
    expect(record.kind).toBe('sketch');
    expect(record.metadata?.unitSource).toBe('assumed mm ($INSUNITS absent or 0/Unitless)');
    expect(record.metadata?.unitScale).toBe(1);
    expect(record.metadata?.sourceFormat).toBe('dxf');
    expect(record.metadata?.regionCount).toBe(1);
  });

  it('opts.units rescales the imported profile', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });
    const [profile] = await api.lib.fromDXF('plate.dxf', { units: 'cm' });
    const backend = await lower(session, profile.extrude(1).id);
    expect(backend.volume()).toBeCloseTo(100 * 50 * 1, 4);
  });
});

describe('lib.fromSVG — round trip to a solid', () => {
  it('imports the L profile at true millimetre scale', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });

    const [profile] = await api.lib.fromSVG('ell.svg');
    const backend = await lower(session, profile.extrude(2).id);
    expect(backend.volume()).toBeCloseTo((100 * 10 + 10 * 30) * 2, 4);
  });

  it('the extruded solid sits where the Y flip put it, not where SVG had it', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });

    const [profile] = await api.lib.fromSVG('ell.svg');
    const backend = await lower(session, profile.extrude(2).id);

    // Cut the top 10 mm band (Y in [30, 40]) out of the solid. That band is
    // the L's WIDE bar after the flip, so removing it must take
    // 100 x 10 x 2 = 2000 mm³. Unflipped, the same band holds only the
    // narrow leg (10 x 10 x 2 = 200 mm³), so the two are not close.
    const band = OcctBackend.box(200, 10, 10, false).translate(-50, 30, -4);
    const remaining = backend.subtract(band);
    expect(remaining.volume()).toBeCloseTo((100 * 10 + 10 * 30) * 2 - 2000, 3);
  });

  it('keeps a <circle> analytic — the extruded disc has the exact volume', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });

    const [disc] = await api.lib.fromSVG('disc.svg');
    const backend = await lower(session, disc.extrude(5).id);
    // Exact, not a polygon approximation: two true semicircular arcs.
    expect(backend.volume()).toBeCloseTo(Math.PI * 64 * 5, 6);
  });

  it('imports C/S/Q/T Béziers as exact curved faces, including under a non-uniform transform', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: process.cwd() });

    const [outline, hole] = await api.lib.fromSVG('examples/interoperability/svg-bezier/bezier-cam-plate.svg');
    expect(hole).toBeDefined();
    const backend = await lower(session, outline.extrude(3).subtract(hole.extrude(3)).id);
    const shape = backend.getReplicadShape();
    expect(isValidShape(getOC(), shape.wrapped)).toBe(true);
    // Green's theorem on the Bézier poles: the outer crown encloses 2182.5
    // mm², the quadratic hole 120 mm² before its 1.5 x 1 stretch. librsvg
    // rasterizes the same file to 2002.496 mm² at 100 px/mm.
    const exact = (2182.5 - 1.5 * 120) * 3;
    expect(Math.abs(backend.volume() - exact) / exact).toBeLessThan(1e-6);
    expect(backend.boundingBox()).toMatchObject({
      min: [expect.closeTo(0, 6), expect.closeTo(0, 6), expect.closeTo(0, 6)],
      max: [expect.closeTo(60, 6), expect.closeTo(40, 6), expect.closeTo(3, 6)],
    });
    // Two cubic walls and four quadratic hole walls are smooth swept
    // surfaces; the other faces are the three straight sides and two caps.
    const types = shape.faces.map(face => face.geomType);
    expect(types.filter(type => type === 'EXTRUSION_SURFACE')).toHaveLength(2 + 4);
    expect(types.filter(type => type === 'PLANE')).toHaveLength(3 + 2);
  });

  it('imports <ellipse>, non-circular A arcs and stretched circles as exact curved faces', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: process.cwd() });

    const [outline, ...holes] = await api.lib.fromSVG('examples/interoperability/svg-ellipse/ellipse-gasket.svg');
    expect(holes).toHaveLength(2);
    let solid = outline.extrude(3);
    for (const hole of holes) solid = solid.subtract(hole.extrude(3));
    const backend = await lower(session, solid.id);
    const shape = backend.getReplicadShape();
    expect(isValidShape(getOC(), shape.wrapped)).toBe(true);
    // Half-ellipse crown (30 x 20) on a 60 x 20 base, less a rotated 8 x 4
    // ellipse and an r = 3 circle stretched 1.5 x 1.
    const exact = (1200 + (300 - 32 - 13.5) * Math.PI) * 3;
    expect(Math.abs(backend.volume() - exact) / exact).toBeLessThan(1e-6);
    expect(backend.boundingBox()).toMatchObject({
      min: [expect.closeTo(0, 6), expect.closeTo(0, 6), expect.closeTo(0, 6)],
      max: [expect.closeTo(60, 6), expect.closeTo(40, 6), expect.closeTo(3, 6)],
    });
    // Two quarter-ellipse crown walls and four quarter walls per hole are
    // smooth swept surfaces; the rest are three straight sides and two caps.
    const types = shape.faces.map(face => face.geomType);
    expect(types.filter(type => type === 'PLANE')).toHaveLength(3 + 2);
    expect(types).toHaveLength(2 + 4 + 4 + 3 + 2);
  });
});

describe('lib.fromDXF / lib.fromSVG — failures surface as actionable KernelErrors', () => {
  async function failure(fn: () => Promise<unknown>): Promise<KernelError> {
    try {
      await fn();
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      return e as KernelError;
    }
    throw new Error('expected the import to reject');
  }

  it('a missing file names the path', async () => {
    const api = createModelingApi({ session: new CaptureSession(), scriptDir: tmpDir });
    const e = await failure(() => api.lib.fromDXF('nope.dxf'));
    expect(e.code).toBe('feature.invalid-args');
    expect(e.message).toMatch(/lib\.fromDXF: cannot read file at .*nope\.dxf/);
  });

  it('an empty path is rejected before any I/O', async () => {
    const api = createModelingApi({ session: new CaptureSession(), scriptDir: tmpDir });
    const e = await failure(() => api.lib.fromSVG(''));
    expect(e.code).toBe('feature.invalid-args');
    expect(e.hint).toMatch(/invalid-args\.lib\.fromSVG/);
  });

  it('an open SVG contour reports the dangling end and how to fix it', async () => {
    const api = createModelingApi({ session: new CaptureSession(), scriptDir: tmpDir });
    const e = await failure(() => api.lib.fromSVG('open.svg'));
    expect(e.code).toBe('feature.kernel-failed');
    expect(e.message).toMatch(/open contour/);
    expect(e.message).toMatch(/dead-ends at/);
    expect(e.hint).toBe(
      'kernel-failed.lib.fromSVG.contour — the drawing does not resolve into closed regions — ' +
      'close the contour in the source tool, or raise { tolerance } if the gap is only a rounding artefact.',
    );
  });

  it('an unsupported DXF entity names the entity, the line, and the fix', async () => {
    const p = join(tmpDir, 'unsupported.dxf');
    writeFileSync(p, [0, 'SECTION', 2, 'ENTITIES', 0, 'HELIX', 10, 0, 20, 0, 0, 'ENDSEC'].join('\n') + '\n');
    const api = createModelingApi({ session: new CaptureSession(), scriptDir: tmpDir });
    const e = await failure(() => api.lib.fromDXF('unsupported.dxf'));
    expect(e.message).toMatch(/HELIX at line \d+/);
    expect(e.hint).toMatch(/kernel-failed\.lib\.fromDXF\.unsupported-entity/);
    expect(e.hint).toMatch(/refuses the entity rather than dropping it/);
  });

  it('a nonplanar DXF ellipse is refused with its line instead of becoming a misleading profile', async () => {
    const ellipsePath = join(process.cwd(), 'examples/interoperability/dxf-ellipse/ellipse-profile.dxf');
    const nonplanar = readFileSync(ellipsePath, 'utf8').replace('20\n30\n11', '20\n30\n30\n1\n11');
    const p = join(tmpDir, 'nonplanar-ellipse.dxf');
    writeFileSync(p, nonplanar);
    const api = createModelingApi({ session: new CaptureSession(), scriptDir: tmpDir });
    const e = await failure(() => api.lib.fromDXF('nonplanar-ellipse.dxf'));
    expect(e.message).toMatch(/ELLIPSE at line \d+: only ellipses in the XY plane are supported/);
  });

  it('an empty file is refused rather than yielding an empty sketch list', async () => {
    const p = join(tmpDir, 'blank.svg');
    writeFileSync(p, '');
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: tmpDir });
    const e = await failure(() => api.lib.fromSVG('blank.svg'));
    expect(e.message).toMatch(/SVG payload is empty/);
    // Nothing was registered — a failed import leaves no placeholder behind.
    expect(session.getRecords()).toHaveLength(0);
  });
});

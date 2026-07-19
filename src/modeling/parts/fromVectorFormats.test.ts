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
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
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
  it('imports a plate and extrudes it to the hand-computed volume', async () => {
    const session = new CaptureSession();
    const api = createApi({ session, scriptDir: tmpDir });

    const sketches = await api.lib.fromDXF('plate.dxf');
    expect(sketches).toHaveLength(1);

    const solid = sketches[0].extrude(3);
    const backend = await lower(session, solid.id);
    // 10 x 5 x 3 mm.
    expect(backend.volume()).toBeCloseTo(150, 6);
  });

  it('carries the DXF bulge through to real geometry with the right sign', async () => {
    const session = new CaptureSession();
    const api = createApi({ session, scriptDir: tmpDir });

    const [profile] = await api.lib.fromDXF('bulged.dxf');
    const backend = await lower(session, profile.extrude(2).id);

    const theta = 4 * Math.atan(0.5);
    const radius = 5 / Math.sin(theta / 2);
    const segment = (radius * radius / 2) * (theta - Math.sin(theta));
    // The arc bows OUTWARD, so the area is 100 + segment, never 100 - segment.
    expect(backend.volume()).toBeCloseTo((100 + segment) * 2, 4);
    expect(backend.volume()).toBeGreaterThan(200);
  });

  it('returns every closed region, largest first, so holes can be cut explicitly', async () => {
    const session = new CaptureSession();
    const api = createApi({ session, scriptDir: tmpDir });

    const [outline, ...holes] = await api.lib.fromDXF('plate-hole.dxf');
    expect(holes).toHaveLength(1);

    const plate = outline.extrude(3).subtract(holes[0].extrude(3));
    const backend = await lower(session, plate.id);
    expect(backend.volume()).toBeCloseTo((10 * 5 - Math.PI) * 3, 4);
  });

  it('records the unit decision on the sketch so it can be inspected later', async () => {
    const session = new CaptureSession();
    const api = createApi({ session, scriptDir: tmpDir });
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
    const api = createApi({ session, scriptDir: tmpDir });
    const [profile] = await api.lib.fromDXF('plate.dxf', { units: 'cm' });
    const backend = await lower(session, profile.extrude(1).id);
    expect(backend.volume()).toBeCloseTo(100 * 50 * 1, 4);
  });
});

describe('lib.fromSVG — round trip to a solid', () => {
  it('imports the L profile at true millimetre scale', async () => {
    const session = new CaptureSession();
    const api = createApi({ session, scriptDir: tmpDir });

    const [profile] = await api.lib.fromSVG('ell.svg');
    const backend = await lower(session, profile.extrude(2).id);
    expect(backend.volume()).toBeCloseTo((100 * 10 + 10 * 30) * 2, 4);
  });

  it('the extruded solid sits where the Y flip put it, not where SVG had it', async () => {
    const session = new CaptureSession();
    const api = createApi({ session, scriptDir: tmpDir });

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
    const api = createApi({ session, scriptDir: tmpDir });

    const [disc] = await api.lib.fromSVG('disc.svg');
    const backend = await lower(session, disc.extrude(5).id);
    // Exact, not a polygon approximation: two true semicircular arcs.
    expect(backend.volume()).toBeCloseTo(Math.PI * 64 * 5, 6);
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
    const api = createApi({ session: new CaptureSession(), scriptDir: tmpDir });
    const e = await failure(() => api.lib.fromDXF('nope.dxf'));
    expect(e.code).toBe('feature.invalid-args');
    expect(e.message).toMatch(/lib\.fromDXF: cannot read file at .*nope\.dxf/);
  });

  it('an empty path is rejected before any I/O', async () => {
    const api = createApi({ session: new CaptureSession(), scriptDir: tmpDir });
    const e = await failure(() => api.lib.fromSVG(''));
    expect(e.code).toBe('feature.invalid-args');
    expect(e.hint).toMatch(/invalid-args\.lib\.fromSVG/);
  });

  it('an open SVG contour reports the dangling end and how to fix it', async () => {
    const api = createApi({ session: new CaptureSession(), scriptDir: tmpDir });
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
    const p = join(tmpDir, 'spline.dxf');
    writeFileSync(p, [0, 'SECTION', 2, 'ENTITIES', 0, 'SPLINE', 10, 0, 20, 0, 0, 'ENDSEC'].join('\n') + '\n');
    const api = createApi({ session: new CaptureSession(), scriptDir: tmpDir });
    const e = await failure(() => api.lib.fromDXF('spline.dxf'));
    expect(e.message).toMatch(/SPLINE at line \d+/);
    expect(e.hint).toMatch(/kernel-failed\.lib\.fromDXF\.unsupported-entity/);
    expect(e.hint).toMatch(/refuses rather than dropping it/);
  });

  it('an empty file is refused rather than yielding an empty sketch list', async () => {
    const p = join(tmpDir, 'blank.svg');
    writeFileSync(p, '');
    const session = new CaptureSession();
    const api = createApi({ session, scriptDir: tmpDir });
    const e = await failure(() => api.lib.fromSVG('blank.svg'));
    expect(e.message).toMatch(/SVG payload is empty/);
    // Nothing was registered — a failed import leaves no placeholder behind.
    expect(session.getRecords()).toHaveLength(0);
  });
});

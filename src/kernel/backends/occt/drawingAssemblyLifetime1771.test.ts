// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAssemblyLifetime1771.test.ts
//
// Regression gate for #1771: a multi-part assembly sheet used to free every
// part's replicad handle inside makeCompound(), so the datum/tolerance queries
// that run after projection read a dead TopoDS_Shape. The bare `catch {}` in
// the pooled resolver then reported "no face matched" instead of the real
// "This object has been deleted" error.
//
// These tests use real OCCT geometry. They assert the lifetime contract (the
// caller's part handles survive the sheet and disposal) and that a dead handle
// surfaces as itself rather than as a misleading zero-match.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from './occtBackend';
import { renderSvgDrawing, type SvgDrawingOptions } from './exportSvgDrawing';
import { resolveDrawingBodies } from './drawingBodies';
import { oneFace as drawingAutoOneFace } from './drawingAuto/queries';
import { oneFace as anchorOneFace } from './drawingAnchors';
import type { WorldFramePart } from './sceneToWorldFrame';

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

/** Base plate, a boss standing on it, and a separate top pad at Z=20..24.
 *  The declared datum lives on the LAST part, so the pooled resolver must
 *  reach past two other bodies to find it — the exact read that used to hit a
 *  deleted handle. */
function stackAssembly(): WorldFramePart[] {
  return [
    { name: 'base', shape: OcctBackend.box(60, 40, 8) },
    { name: 'boss', shape: OcctBackend.cylinder(6, 10).translate(0, 0, 8) },
    { name: 'pad', shape: OcctBackend.box(40, 30, 4).translate(0, 0, 20) },
  ];
}

const DECLARED: SvgDrawingOptions = {
  format: 'svg-drawing',
  declarations: {
    datums: [{ label: 'A', face: { atZ: 24 } }],
    tolerances: [{
      type: 'position',
      value: 0.2,
      modifier: '⌀',
      datums: ['A'],
      edge: { ofCurveType: 'CIRCLE', near: [0, 0, 18] },
    }],
    dimensions: [],
  },
};

describe('multi-part sheet keeps per-part OCCT handles alive (#1771)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('resolves a datum declared on the last part of a three-body assembly', () => {
    const r = renderSvgDrawing(stackAssembly(), DECLARED);
    const datum = r.report!.datums.find(d => d.label === 'A');
    expect(datum).toBeDefined();
    expect(datum!.source).toBe('declared');
    expect(datum!.point[2]).toBeCloseTo(24, 6);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(decode(r.bytes)).toContain('data-kc-auto="datum"');
  });

  it('leaves every part handle usable after the sheet is rendered', () => {
    const parts = stackAssembly();
    renderSvgDrawing(parts, DECLARED);
    for (const part of parts) {
      const faces = (part.shape as OcctBackend).getReplicadShape().faces;
      expect(faces.length).toBeGreaterThan(0);
    }
  });

  it('disposes the temporary compound without freeing the caller\'s parts', () => {
    const parts = stackAssembly();
    const bodies = resolveDrawingBodies(parts, { format: 'svg-drawing' });
    expect(bodies.dispose).toBeTypeOf('function');
    bodies.dispose();
    for (const part of parts) {
      const faces = (part.shape as OcctBackend).getReplicadShape().faces;
      expect(faces.length).toBeGreaterThan(0);
    }
  });

  it('reports a deleted OCCT handle instead of "no face matched"', () => {
    const dead = {
      getReplicadShape() {
        throw new Error('This object has been deleted');
      },
    } as unknown as OcctBackend;
    const parts: WorldFramePart[] = [{ name: 'dead', shape: dead }];

    // The sheet-level resolver behind shape.datum() and shape.tolerance().
    expect(() =>
      drawingAutoOneFace(parts, { atZ: 4 }, 'datum A', 'drawing.datum.unresolved'),
    ).toThrow(/This object has been deleted/);

    // The sibling resolver behind annotation anchors, fixed for the same reason.
    expect(() => anchorOneFace(parts, { atZ: 4 }, 'datum A')).toThrow(/This object has been deleted/);
  });
});

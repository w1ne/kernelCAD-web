// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/stepSurfaceCurves.test.ts
//
// The pcurve mode is a process-global STEP-writer static, and replicad's
// single-shape `blobSTEP()` inherits it. These tests pin the writer option
// used by the import heal (surface curves off) and that the mode is restored
// afterwards, so a pcurve-free heal cannot change the next user export.
import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from './occtBackend';
import { writeStepAssembly } from './stepAssemblyExport';

beforeAll(async () => { await initOcct(); }, 60000);

function boxShape(): replicad.Shape3D {
  return replicad.makeBox([0, 0, 0], [10, 20, 30]);
}

function stepText(bytes: Uint8Array): string {
  return new TextDecoder('latin1').decode(bytes);
}

async function roundTrip(bytes: Uint8Array): Promise<replicad.Shape3D> {
  const imported = await replicad.importSTEP(new Blob([new Uint8Array(bytes)]));
  return imported as replicad.Shape3D;
}

describe('STEP surface-curve writing', () => {
  it('writes surface pcurves by default', () => {
    const bytes = writeStepAssembly([{ name: 'part', shape: boxShape().wrapped }]);
    expect(stepText(bytes)).toContain('SURFACE_CURVE');
  });

  it('can omit them, and the file still re-imports as the same solid', async () => {
    const shape = boxShape();
    const withCurves = await roundTrip(writeStepAssembly([{ name: 'part', shape: shape.wrapped }]));
    const withoutCurves = writeStepAssembly([{ name: 'part', shape: shape.wrapped }], { surfaceCurves: false });
    expect(stepText(withoutCurves)).not.toContain('SURFACE_CURVE');
    const reimported = await roundTrip(withoutCurves);
    expect(reimported.faces.length).toBe(withCurves.faces.length);
    const volumeOf = (shape: replicad.Shape3D) => new OcctBackend(shape).volume();
    expect(Math.abs(volumeOf(reimported) - volumeOf(withCurves))).toBeLessThan(1e-6);
  });

  it('restores the global pcurve mode after a pcurve-free write', async () => {
    writeStepAssembly([{ name: 'part', shape: boxShape().wrapped }], { surfaceCurves: false });
    // replicad's single-shape exporter only pins the schema and inherits the
    // pcurve mode; it must be back at the default (pcurves written).
    const blob = boxShape().blobSTEP();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(stepText(bytes)).toContain('SURFACE_CURVE');
  });
});

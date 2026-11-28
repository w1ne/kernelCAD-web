// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { basename, dirname, resolve } from 'node:path';
import { getOC } from 'replicad';
import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../capture/captureSession';
import { createModelingApi } from '../../api';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { createOcctLowerer } from './occtLowerer';
import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';

// Blender 4.0.2 output (make-fixture.py): 32-sided prism float, 30 mm across corners and
// 40 mm tall, around a sealed void 24 mm across corners and 34 mm tall.
const floatFixture = resolve(process.cwd(), 'examples/interoperability/stl-sealed-cavity/sealed-float.stl');
const prismArea = (radius: number): number => 16 * radius * radius * Math.sin(Math.PI / 16);
const FLOAT_VOLUME = prismArea(15) * 40 - prismArea(12) * 34;

function count(backend: OcctBackend, kind: 'TopAbs_SOLID' | 'TopAbs_SHELL'): number {
  const oc = getOC() as any;
  const explorer = new oc.TopExp_Explorer_2(
    backend.getReplicadShape().wrapped,
    oc.TopAbs_ShapeEnum[kind],
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  let n = 0;
  try {
    for (; explorer.More(); explorer.Next()) n++;
    return n;
  } finally {
    explorer.delete?.();
  }
}

function validBrep(backend: OcctBackend): boolean {
  const oc = getOC() as any;
  const analyzer = new oc.BRepCheck_Analyzer(backend.getReplicadShape().wrapped, false, false);
  try {
    return Boolean(analyzer.IsValid_2());
  } finally {
    analyzer.delete?.();
  }
}

describe('lib.fromSTL with a sealed cavity', () => {
  it('imports a hollow float as one solid and drills only its walls', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: dirname(floatFixture) });
    const imported = await api.lib.fromSTL(basename(floatFixture));
    // A 6 mm fill port on the axis: 3 mm of floor and 3 mm of lid, with the 34 mm void between.
    const ported = imported.subtract(api.cylinder(50, 3).translate(0, 0, -5));
    const result = await new RecomputeEngine(createOcctLowerer(session)).run(
      session.getRecords(),
      { paramTable: session.paramTable },
    );
    const sourceBackend = result.shapes.get(imported.id)! as OcctBackend;
    const portedBackend = result.shapes.get(ported.id)! as OcctBackend;

    // Binary STL stores float32 corners, hence the 1e-2 mm^3 tolerance on 12810 mm^3.
    expect(sourceBackend.volume()).toBeCloseTo(FLOAT_VOLUME, 2);
    expect(count(sourceBackend, 'TopAbs_SOLID')).toBe(1);
    expect(count(sourceBackend, 'TopAbs_SHELL')).toBe(2);
    expect(validBrep(sourceBackend)).toBe(true);
    expect(portedBackend.volume()).toBeCloseTo(FLOAT_VOLUME - Math.PI * 9 * 6, 2);
    expect(count(portedBackend, 'TopAbs_SOLID')).toBe(1);
    expect(validBrep(portedBackend)).toBe(true);
    expect(result.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toHaveLength(0);
  });
});

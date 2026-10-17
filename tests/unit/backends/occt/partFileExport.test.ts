// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Task 9 of the BOM order plan: single-part file exporters. Each exporter
// ships ONE body per file (the format instant-quote shops require):
// origin-frame STEP via the XCAF writer, origin-frame binary STL, and a
// flat-pattern DXF for sheet parts.
import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../../../src/composition/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import type { Assembly } from '../../../../src/modeling/capture/assembly';
import { partStepBytes, partStlBytes, partDxfBytes } from '../../../../src/kernel/backends/occt/partFileExport';

beforeAll(async () => {
  const { initOcct } = await import('../../../../src/kernel/backends/occt/occtBackend');
  await initOcct();
}, 60000);

const PLATE_ARM = "const arm = assembly('a'); arm.part('plate', box(10, 10, 2)); return arm.model();";

// Single-bend bracket whose part chain roots at the sheetMetal(...) record,
// mirroring tests/fixtures/shopcheck/passing-bracket.kcad.ts — the
// flattenPattern walk needs a sheetMetal root.
const SHEET_ARM = `
const s = path().moveTo(0, 0).lineTo(50, 0).lineTo(50, 25).lineTo(0, 25).close();
let blank = sheetMetal(s, { thickness: 3.175, kFactor: 0.38 });
blank = blank.bend({ atX: 25 }, 90, 3);
const arm = assembly('a');
arm.part('bracket', blank);
return arm.model();
`;

function firstAssembly(r: Awaited<ReturnType<typeof runScript>>): Assembly {
  return (r.session.assemblies as Map<string, Assembly>).values().next().value as Assembly;
}

describe('partFileExport', () => {
  it('writes a single-body STEP for a part', async () => {
    const r = await runScript({ code: PLATE_ARM, fileName: 'a.kcad.ts' });
    const arm = firstAssembly(r);
    const part = arm.__parts()[0];
    const bytes = await partStepBytes(part.originalShape, part.name);
    expect(new TextDecoder().decode(bytes.slice(0, 12))).toBe('ISO-10303-21');
  }, 60000);

  it('writes binary STL bytes for a part', async () => {
    const r = await runScript({ code: PLATE_ARM, fileName: 'a.kcad.ts' });
    const arm = firstAssembly(r);
    const part = arm.__parts()[0];
    const lowered = await part.originalShape.lower();
    const bytes = partStlBytes(lowered);
    expect(bytes.byteLength).toBeGreaterThan(84);
  }, 60000);

  it('writes DXF bytes for a flat sheet part', async () => {
    const r = await runScript({ code: SHEET_ARM, fileName: 'bracket.kcad.ts' });
    // flattenPattern reads the bendRecord metadata that the
    // sheetMetalBend lowerer persists — lower before exporting.
    const engine = new RecomputeEngine(new OcctLowerer());
    await engine.run(r.records);
    const arm = firstAssembly(r);
    const part = arm.__parts()[0];
    const bytes = partDxfBytes(r.records, part.originalShape.id);
    const text = new TextDecoder().decode(bytes);
    // Observed from exportDxf's writer: a `999` provenance comment leads,
    // then the standard 0/SECTION/2/HEADER pair.
    expect(text.startsWith('999\n')).toBe(true);
    expect(text).toContain('0\nSECTION\n2\nHEADER');
    // Outer cut loop + the single bend line on the BEND layer.
    expect((text.match(/LWPOLYLINE/g) ?? []).length).toBeGreaterThanOrEqual(2);
  }, 60000);
});

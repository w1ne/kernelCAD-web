// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// SolidWorks arrives as STEP. These tests drive the shipped `lib.fromSTEP`
// entry (and `evaluateScript` for the assembly) on real STEP bytes. The
// parser and importer are not mocked.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { OcctLowerer } from '../backends/occt/occtLowerer';
import { evaluateScript } from '../../agent/cli/commands/evaluate';
import { stepLengthToMillimetres } from './stepLengthUnit';
import { KernelError } from '../../shared/intent/kernelError';

const MM = 0.01;

function expectMm(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(MM);
}

function scaleCartesian(text: string, factor: number): string {
  return text.replace(/CARTESIAN_POINT\(\s*'[^']*'\s*,\s*\(([^)]*)\)\s*\)/g, (full, coords: string) => {
    const nums = coords.split(',').map((part) => {
      const n = Number(part);
      if (!Number.isFinite(n)) return part.trim();
      const scaled = Math.abs(n * factor) < 1e-12 ? 0 : n * factor;
      const fixed = scaled.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
      return fixed.includes('.') ? fixed : `${fixed}.`;
    });
    return full.replace(coords, nums.join(','));
  });
}

/** 25.4 mm cube rewritten so its coordinates are inches and its unit says inch. */
function asInchCube(millimetreStep: string): string {
  const scaled = scaleCartesian(millimetreStep, 1 / 25.4);
  const replaced = scaled.replace(
    /#(\d+)\s*=\s*\(\s*LENGTH_UNIT\(\)\s*NAMED_UNIT\(\*\)\s*SI_UNIT\(\.MILLI\.,\.METRE\.\)\s*\)\s*;/,
    (_match, id: string) =>
      `#${id} = ( CONVERSION_BASED_UNIT('INCH',#900001) LENGTH_UNIT() NAMED_UNIT(*) );\n#900001 = LENGTH_MEASURE_WITH_UNIT(25.4,#900002);\n#900002 = ( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );`,
  );
  if (replaced === scaled) throw new Error('inch fixture: length unit entity not found');
  return replaced;
}

/** 1000 mm cube rewritten so its coordinates are metres and its unit says metre. */
function asMetreCube(millimetreStep: string): string {
  const scaled = scaleCartesian(millimetreStep, 0.001);
  if (!scaled.includes('SI_UNIT(.MILLI.,.METRE.)')) throw new Error('metre fixture: millimetre unit not found');
  return scaled.replace('SI_UNIT(.MILLI.,.METRE.)', 'SI_UNIT($,.METRE.)');
}

async function importedSize(path: string, solid?: number): Promise<{ size: number[]; lengthToMm: number }> {
  const session = new CaptureSession();
  const api = createModelingApi({ session, scriptDir: dirname(path) });
  await api.lib.fromSTEP(path, solid === undefined ? undefined : { solid });
  const records = session.getRecords();
  const lowerer = new OcctLowerer();
  lowerer.importedGeometry = session.importedGeometry;
  const engine = new RecomputeEngine(lowerer);
  const result = await engine.run(records, { paramTable: session.paramTable });
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const backend = result.shapes.get(records[0].id) as OcctBackend;
  const bb = backend.boundingBox();
  const meta = records[0].metadata as { lengthToMm?: number };
  return {
    size: [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]],
    lengthToMm: meta.lengthToMm ?? Number.NaN,
  };
}

describe('step length unit', () => {
  it('reads millimetre, inch, and metre tokens', () => {
    expect(stepLengthToMillimetres('#1 = ( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );')).toBe(1);
    expect(stepLengthToMillimetres('#1 = ( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.CENTI.,.METRE.) );')).toBe(10);
    expect(stepLengthToMillimetres('#1 = ( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT($,.METRE.) );')).toBe(1000);
    expect(stepLengthToMillimetres('ISO-10303-21; DATA; ENDSEC;')).toBe(1);
  });

  it('reads an OCCT conversion-based inch unit as 25.4 mm', () => {
    const text = `
      #345 = ( GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNIT_ASSIGNED_CONTEXT((#346)) REPRESENTATION_CONTEXT('',''));
      #346 = ( CONVERSION_BASED_UNIT('INCH',#348) LENGTH_UNIT() NAMED_UNIT(*) );
      #348 = LENGTH_MEASURE_WITH_UNIT(25.4,#349);
      #349 = ( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );
    `;
    expect(stepLengthToMillimetres(text)).toBeCloseTo(25.4, 6);
  });

  it('reads a SolidWorks inch measure expressed in metres', () => {
    const text = `
      #95=(CONVERSION_BASED_UNIT('INCH',#96)LENGTH_UNIT()NAMED_UNIT(#97));
      #96=LENGTH_MEASURE(0.0254);
      #97=(NAMED_UNIT(*)SI_UNIT($,.METRE.));
    `;
    expect(stepLengthToMillimetres(text)).toBeCloseTo(25.4, 6);
  });
});

describe('SolidWorks STEP import', () => {
  let dir = '';
  let mmPath = '';
  let inchPath = '';
  let metrePath = '';
  let multiPath = '';

  beforeAll(async () => {
    await initOcct();
    dir = mkdtempSync(join(tmpdir(), 'kcad-sw-step-'));
    const ten = Buffer.from(await OcctBackend.box(10, 10, 10, false).exportSTEPAsync()).toString('utf8');
    const inchSource = Buffer.from(await OcctBackend.box(25.4, 25.4, 25.4, false).exportSTEPAsync()).toString('utf8');
    const metreSource = Buffer.from(await OcctBackend.box(1000, 1000, 1000, false).exportSTEPAsync()).toString('utf8');
    const multi = OcctBackend.box(10, 10, 10, false).union(
      OcctBackend.box(20, 10, 10, false).translate(40, 0, 0),
    );
    mmPath = join(dir, 'cube-10mm.step');
    inchPath = join(dir, 'cube-1inch.step');
    metrePath = join(dir, 'cube-1m.step');
    multiPath = join(dir, 'two-bodies.step');
    writeFileSync(mmPath, ten);
    writeFileSync(inchPath, asInchCube(inchSource));
    writeFileSync(metrePath, asMetreCube(metreSource));
    writeFileSync(multiPath, await multi.exportSTEPAsync());
    writeFileSync(join(dir, 'cube.sldprt'), ten);
    writeFileSync(join(dir, 'asm.sldasm'), ten);
    writeFileSync(join(dir, 'empty.step'), Buffer.alloc(0));
    writeFileSync(join(dir, 'no-solid.step'), [
      'ISO-10303-21;',
      'HEADER;',
      "FILE_DESCRIPTION((''),'2;1');",
      "FILE_NAME('none.step','2026-10-17T00:00:00',(''),(''),'kernelCAD','','');",
      "FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));",
      'ENDSEC;',
      'DATA;',
      'ENDSEC;',
      'END-ISO-10303-21;',
      '',
    ].join('\n'));
  }, 120_000);

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('imports a millimetre cube as 10 mm', async () => {
    const imported = await importedSize(mmPath);
    expect(imported.lengthToMm).toBe(1);
    expect(stepLengthToMillimetres(readFileSync(mmPath, 'utf8'))).toBe(1);
    imported.size.forEach((edge) => expectMm(edge, 10));
  });

  it('imports a 1 inch cube as 25.4 mm', async () => {
    const imported = await importedSize(inchPath);
    expect(imported.lengthToMm).toBeCloseTo(25.4, 6);
    expect(stepLengthToMillimetres(readFileSync(inchPath, 'utf8'))).toBeCloseTo(25.4, 6);
    imported.size.forEach((edge) => expectMm(edge, 25.4));
  });

  it('imports a 1 metre cube as 1000 mm', async () => {
    const imported = await importedSize(metrePath);
    expect(imported.lengthToMm).toBe(1000);
    expect(stepLengthToMillimetres(readFileSync(metrePath, 'utf8'))).toBe(1000);
    imported.size.forEach((edge) => expectMm(edge, 1000));
  });

  it('places each solid of a multi-body STEP in an assembly that evaluates clean', async () => {
    const first = await importedSize(multiPath, 0);
    const second = await importedSize(multiPath, 1);
    const widths = [first.size[0], second.size[0]].sort((a, b) => a - b);
    expectMm(widths[0], 10);
    expectMm(widths[1], 20);

    const code = `
      const a = await lib.fromSTEP(${JSON.stringify(multiPath)}, { solid: 0 });
      const b = await lib.fromSTEP(${JSON.stringify(multiPath)}, { solid: 1 });
      const asm = assembly('sw-bodies');
      const pa = asm.part('body-a', a);
      const pb = asm.part('body-b', b);
      pa.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
      pb.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
      asm.mate('fix', 'body-a.mount', 'body-b.mount', 'fastened');
      return asm.solvedModel({});
    `;
    const result = await evaluateScript({ code, file: join(dir, 'place.kcad.ts') });
    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toEqual([]);
  }, 120_000);

  it('refuses a .sldprt path, a .sldasm path, an empty file, and a STEP with no solid', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: dir });
    const cases = ['cube.sldprt', 'asm.SLDASM', 'empty.step', 'no-solid.step'];
    for (const name of cases) {
      const path = join(dir, name);
      await expect(api.lib.fromSTEP(path)).rejects.toThrowError(/STEP/);
      try {
        await api.lib.fromSTEP(path);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).toMatch(/AP214|AP242/);
        expect(message).toMatch(/solid bodies/);
        expect(message).not.toMatch(/replicad failed|Unresolved Reference|Failed to load STEP/);
      }
    }
  });

  it('formats invalid STEP arguments with the shared API, value, requirement, and example', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: dir });

    const expectSharedInvalidArgs = async (call: Promise<unknown>, slug: string) => {
      let caught: unknown;
      try {
        await call;
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(KernelError);
      if (!(caught instanceof KernelError)) return;
      expect(caught.code).toBe('feature.invalid-args');
      expect(caught.hint).toContain(slug);
      expect(caught.message).toContain('lib.fromSTEP');
      expect(caught.message).toContain('got ');
      expect(caught.message).toContain('requires ');
      expect(caught.message).toContain('Example: ');
    };

    await expectSharedInvalidArgs(
      api.lib.fromSTEP(join(dir, 'cube.sldprt')),
      'invalid-args.lib.fromSTEP.solidworks',
    );
    await expectSharedInvalidArgs(
      api.lib.fromSTEP(join(dir, 'empty.step')),
      'invalid-args.lib.fromSTEP.empty',
    );
    await expectSharedInvalidArgs(
      api.lib.fromSTEP(mmPath, { solid: -1 }),
      'invalid-args.lib.fromSTEP.solid',
    );
  });
});

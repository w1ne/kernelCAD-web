// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import * as replicad from 'replicad';
import { makeBox } from 'replicad';
import { getOC } from 'replicad';
import { initOcct, OcctBackend } from '../../kernel/backends/occt/occtBackend';
import {
  fromCAD,
  parseFcstdObjects,
  quaternionToAxisAngle,
  readFcstdBackend,
  convertToStep,
} from './fromCad';
import { readParasolidBytes } from './parasolid/native';

const Q_ZERO: [number, number, number, number] = [0, 0, 0, 1];
const Q_Z90 = [0, 0, Math.SQRT1_2, Math.SQRT1_2];

let dir: string;

beforeAll(async () => {
  await initOcct();
  dir = mkdtempSync(join(tmpdir(), 'fromcad-test-'));
});

afterEach(() => {
  // Each test writes its own files; the shared directory is removed in the last case.
});

/** A solid box as OCCT BREP bytes, the way a FreeCAD Part::Feature stores its shape. */
function boxBrep(x: number, y: number, z: number): Uint8Array {
  return new OcctBackend(makeBox([0, 0, 0], [x, y, z]) as never).exportBREP();
}

/** A solid box as STEP bytes, the form a converter writes. */
function boxStep(x: number, y: number, z: number): Promise<Uint8Array> {
  return new OcctBackend(makeBox([0, 0, 0], [x, y, z]) as never).exportSTEPAsync();
}

function placementXml(px: number, py: number, pz: number, q: number[]): string {
  return `<Property name="Placement" type="App::PropertyPlacement"><PropertyPlacement Px="${px}" Py="${py}" Pz="${pz}" Q0="${q[0]}" Q1="${q[1]}" Q2="${q[2]}" Q3="${q[3]}"/></Property>`;
}

function fcstd(objects: string, files: Record<string, Uint8Array>): Uint8Array {
  const xml = `<?xml version='1.0' encoding='utf-8'?>\n<Document SchemaVersion="4"><ObjectData Count="0">${objects}</ObjectData></Document>`;
  return zipSync({ 'Document.xml': strToU8(xml), ...files });
}

describe('parseFcstdObjects', () => {
  it('reads type, shape member, placement and link targets from Document.xml', () => {
    const xml = `<ObjectData>
      <Object name="Body" type="PartDesign::Body">
        <Properties>
          <Property name="Shape" type="Part::PropertyPartShape"><Part file="Body.brp" ElementMapVersion="2"/></Property>
          ${placementXml(100, 2, 3, Q_Z90)}
          <Property name="Tip" type="App::PropertyLink"><Link value="Pad"/></Property>
        </Properties>
      </Object>
      <Object name="Pad" type="PartDesign::Pad">
        <Properties><Property name="Length" type="App::PropertyLength"/></Properties>
      </Object>
    </ObjectData>`;
    const [body, pad] = parseFcstdObjects(xml);
    expect(body).toMatchObject({ name: 'Body', type: 'PartDesign::Body', shapeFile: 'Body.brp', references: ['Pad'] });
    expect(body!.placement.position).toEqual([100, 2, 3]);
    expect(body!.placement.quaternion[2]).toBeCloseTo(Math.SQRT1_2);
    expect(pad).toMatchObject({ name: 'Pad', shapeFile: null });
  });
});

describe('quaternionToAxisAngle', () => {
  it('returns no rotation for the identity quaternion', () => {
    expect(quaternionToAxisAngle(Q_ZERO).deg).toBe(0);
  });

  it('recovers a 90 degree turn about +Z', () => {
    const { axis, deg } = quaternionToAxisAngle(Q_Z90 as [number, number, number, number]);
    expect(deg).toBeCloseTo(90);
    expect(axis[2]).toBeCloseTo(1);
  });
});

describe('readFcstdBackend', () => {
  it('imports one body and applies its placement', async () => {
    const bytes = fcstd(
      `<Object name="Body" type="PartDesign::Body"><Properties>
         <Property name="Shape" type="Part::PropertyPartShape"><Part file="Body.brp"/></Property>
         ${placementXml(100, 0, 0, Q_ZERO)}
       </Properties></Object>`,
      { 'Body.brp': boxBrep(10, 20, 30) },
    );
    const backend = await readFcstdBackend(bytes, 'one-body.FCStd');
    const bb = backend.boundingBox();
    expect(bb.min[0]).toBeCloseTo(100, 3);
    expect(bb.max[0]).toBeCloseTo(110, 3);
    expect(backend.volume()).toBeCloseTo(10 * 20 * 30, 3);
  });

  it('combines several bodies, each with its own rotation and translation', async () => {
    const bytes = fcstd(
      `<Object name="A" type="PartDesign::Body"><Properties>
         <Property name="Shape" type="Part::PropertyPartShape"><Part file="A.brp"/></Property>
         ${placementXml(0, 0, 0, Q_ZERO)}
       </Properties></Object>
       <Object name="B" type="PartDesign::Body"><Properties>
         <Property name="Shape" type="Part::PropertyPartShape"><Part file="B.brp"/></Property>
         ${placementXml(0, 0, 0, Q_Z90)}
       </Properties></Object>`,
      { 'A.brp': boxBrep(10, 20, 30), 'B.brp': boxBrep(10, 20, 30) },
    );
    const backend = await readFcstdBackend(bytes, 'two-bodies.FCStd');
    expect(backend.volume()).toBeCloseTo(2 * 6000, 2);
    // B is turned 90 degrees about Z, so its 10 mm side now runs along Y.
    const bb = backend.boundingBox();
    expect(bb.max[1] - bb.min[1]).toBeGreaterThan(19.9);
  });

  it('uses the Part workbench result and skips the inputs it was built from', async () => {
    const bytes = fcstd(
      `<Object name="Base" type="Part::Feature"><Properties>
         <Property name="Shape" type="Part::PropertyPartShape"><Part file="Base.brp"/></Property>
       </Properties></Object>
       <Object name="Cut" type="Part::Cut"><Properties>
         <Property name="Base" type="App::PropertyLink"><Link value="Base"/></Property>
         <Property name="Shape" type="Part::PropertyPartShape"><Part file="Cut.brp"/></Property>
       </Properties></Object>`,
      { 'Base.brp': boxBrep(10, 10, 10), 'Cut.brp': boxBrep(5, 10, 10) },
    );
    const backend = await readFcstdBackend(bytes, 'cut.FCStd');
    expect(backend.volume()).toBeCloseTo(500, 2);
  });

  it('rejects an archive that is not a FreeCAD document', async () => {
    await expect(readFcstdBackend(strToU8('not a zip'), 'bad.FCStd')).rejects.toThrow(/not a zip archive/);
  });

  it('rejects a document with no shaped body', async () => {
    const bytes = fcstd(`<Object name="Sketch" type="Sketcher::SketchObject"><Properties/></Object>`, {});
    await expect(readFcstdBackend(bytes, 'empty.FCStd')).rejects.toThrow(/no shaped body/);
  });
});

describe('fromCAD dispatch', () => {
  it('rejects an unknown extension before reading anything', async () => {
    await expect(fromCAD({ session: undefined as never }, 'part.ipt')).rejects.toThrow(/unsupported file type/);
  });

  it('asks for the converter setting when a SolidWorks file has no converter', async () => {
    const prev = process.env.KERNELCAD_CAD_CONVERTER;
    delete process.env.KERNELCAD_CAD_CONVERTER;
    try {
      const p = join(dir, 'robot.sldasm');
      writeFileSync(p, 'binary-ish');
      await expect(fromCAD({ session: undefined as never }, p)).rejects.toThrow(/KERNELCAD_CAD_CONVERTER/);
    } finally {
      if (prev !== undefined) process.env.KERNELCAD_CAD_CONVERTER = prev;
    }
  });
});

describe('in-process Parasolid reader', () => {
  it('reads a transmit header inside the process and names the missing schema', async () => {
    const bytes = readFileSync(fileURLToPath(new URL('./parasolid/schema-header.x_t', import.meta.url)));
    const model = await readParasolidBytes(new Uint8Array(bytes));
    expect(model.schemaKey).toBe('SCH_3201255_32001_13006');
    expect(model.code).not.toBe('schema.missing_base_schema');
  });

  it('rejects a buffer that is not a Parasolid transmit', async () => {
    const model = await readParasolidBytes(new Uint8Array([1, 2, 3, 4]));
    expect(model.ok).toBe(false);
    expect(model.code).toBeTruthy();
  });
});

/**
 * The RP1 robot excerpts are real slices of /Volumes/LabWired/rp1-cad/
 * RP1-assembly.x_t (the whole-machine SolidWorks transmit, schema
 * SCH_3201255_32001_13006). They are written by
 * `cargo run --release --example excerpt` in crates/parasolid-import. Without
 * the mounted drive the checks are unverifiable and fail rather than skip.
 */
describe('RP1 whole-robot transmit import', () => {
  const RP1_DIR = '/Volumes/LabWired/rp1-cad';
  const ONE_BODY = join(RP1_DIR, 'rp1-one-body.x_t');
  const TWO_INSTANCE = join(RP1_DIR, 'rp1-two-instance.x_t');

  function requireExcerpt(path: string): Uint8Array {
    if (!existsSync(path)) {
      throw new Error(
        `RP1 excerpt ${path} is missing. Mount /Volumes/LabWired, or rebuild it with the excerpt tool; this check must not pass without the real file.`,
      );
    }
    return new Uint8Array(readFileSync(path));
  }

  function stubContext(): { ctx: never; imported: Map<string, OcctBackend> } {
    const imported = new Map<string, OcctBackend>();
    const session = {
      importedGeometry: imported,
      createShape: () => ({ id: 'rp1-shape' }),
    };
    return { ctx: { session } as never, imported };
  }

  /** Solids of a compound backend, in OCCT traversal order. */
  function collectSolids(backend: OcctBackend): unknown[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = (backend as any).shape?.wrapped ?? (backend as any).wrapped;
    const explorer = new oc.TopExp_Explorer_2(wrapped, oc.TopAbs_ShapeEnum.TopAbs_SOLID, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
    const solids: unknown[] = [];
    while (explorer.More()) {
      solids.push(oc.TopoDS.Solid_1(explorer.Current()));
      explorer.Next();
    }
    explorer.delete();
    return solids;
  }

  function solidCenter(solid: unknown): [number, number, number] {
    const backend = new OcctBackend(replicad.cast(solid as never) as never);
    const com = backend.massProperties(1000).com;
    return [com[0], com[1], com[2]];
  }

  it('imports a real one-body excerpt as a solid and keeps its cylinder surface', async () => {
    const bytes = requireExcerpt(ONE_BODY);
    const model = await readParasolidBytes(bytes);
    expect(model.ok, model.message ?? model.code).toBe(true);
    expect(model.schemaKey).toBe('SCH_3201255_32001_13006');
    const kinds = (model.bodies ?? []).flatMap((body) => body.faces.map((face) => face.kind));
    expect(kinds).toContain('cylinder');

    const { ctx, imported } = stubContext();
    const shape = await fromCAD(ctx, ONE_BODY, { sourceUnit: 'm' });
    const backend = imported.get(shape.id);
    expect(backend).toBeDefined();
    expect(backend!.volume()).toBeGreaterThan(0);
  });

  it('places two instances of one body by the transmit transforms', async () => {
    const bytes = requireExcerpt(TWO_INSTANCE);
    const model = await readParasolidBytes(bytes);
    expect(model.ok, model.message ?? model.code).toBe(true);
    const instances = model.instances ?? [];
    const pair = findTranslationPair(instances);
    expect(pair, 'the excerpt must contain two co-oriented instances with a real translation').not.toBeNull();
    const expected: [number, number, number] = [
      (pair!.b.translation[0]! - pair!.a.translation[0]!) * 1000 * (pair!.a.scale ?? 1),
      (pair!.b.translation[1]! - pair!.a.translation[1]!) * 1000 * (pair!.a.scale ?? 1),
      (pair!.b.translation[2]! - pair!.a.translation[2]!) * 1000 * (pair!.a.scale ?? 1),
    ];

    const { ctx, imported } = stubContext();
    const shape = await fromCAD(ctx, TWO_INSTANCE, { sourceUnit: 'm' });
    const backend = imported.get(shape.id);
    expect(backend).toBeDefined();
    const solids = collectSolids(backend!);
    expect(solids.length).toBeGreaterThanOrEqual(2);
    const centers = solids.map(solidCenter);
    const matches = (delta: [number, number, number]): boolean =>
      Math.abs(delta[0]) <= 0.1 && Math.abs(delta[1]) <= 0.1 && Math.abs(delta[2]) <= 0.1;
    let found = false;
    for (let i = 0; i < centers.length && !found; i++) {
      for (let j = 0; j < centers.length && !found; j++) {
        if (i === j) continue;
        const delta: [number, number, number] = [
          centers[j]![0] - centers[i]![0] - expected[0],
          centers[j]![1] - centers[i]![1] - expected[1],
          centers[j]![2] - centers[i]![2] - expected[2],
        ];
        if (matches(delta)) found = true;
      }
    }
    expect(found, `no two solids differ by the transmit translation ${expected.join(', ')} mm`).toBe(true);
  });
});

/** Two instances of one body, same orientation, with a real translation. */
function findTranslationPair(
  instances: { body: number; rotation: number[]; translation: number[]; scale: number }[],
): { a: (typeof instances)[number]; b: (typeof instances)[number] } | null {
  for (let i = 0; i < instances.length; i++) {
    for (let j = i + 1; j < instances.length; j++) {
      const a = instances[i]!;
      const b = instances[j]!;
      if (a.body !== b.body) continue;
      const rotationDelta = a.rotation.reduce((sum, value, index) => sum + Math.abs(value - b.rotation[index]!), 0);
      if (rotationDelta > 1e-9) continue;
      const gap = Math.hypot(
        b.translation[0]! - a.translation[0]!,
        b.translation[1]! - a.translation[1]!,
        b.translation[2]! - a.translation[2]!,
      );
      if (gap > 0.005) return { a, b };
    }
  }
  return null;
}

describe('convertToStep (external converter contract)', () => {
  const withConverter = async (value: string | undefined, run: () => Promise<unknown>) => {
    const prev = process.env.KERNELCAD_CAD_CONVERTER;
    if (value === undefined) delete process.env.KERNELCAD_CAD_CONVERTER;
    else process.env.KERNELCAD_CAD_CONVERTER = value;
    try {
      return await run();
    } finally {
      if (prev === undefined) delete process.env.KERNELCAD_CAD_CONVERTER;
      else process.env.KERNELCAD_CAD_CONVERTER = prev;
    }
  };

  it('runs the configured argv with the input and output paths substituted', async () => {
    const input = join(dir, 'assembly.x_t');
    writeFileSync(input, await boxStep(4, 5, 6));
    const step = await withConverter('["cp","{input}","{output}"]', () => convertToStep(input, '.x_t'));
    expect(Buffer.from(step as Buffer).toString('latin1')).toContain('ISO-10303-21');
  });

  it('reports a converter that exits non-zero, with its stderr', async () => {
    const input = join(dir, 'fail.sldprt');
    writeFileSync(input, 'x');
    await expect(
      withConverter('["sh","-c","echo licence expired >&2; exit 3"]', () => convertToStep(input, '.sldprt')),
    ).rejects.toThrow(/licence expired/);
  });

  it('reports a converter that finishes without writing STEP', async () => {
    const input = join(dir, 'silent.igs');
    writeFileSync(input, 'x');
    await expect(withConverter('["true"]', () => convertToStep(input, '.igs'))).rejects.toThrow(/wrote no STEP file/);
  });

  it('rejects a converter setting that is not a JSON array of strings', async () => {
    const input = join(dir, 'bad-env.x_b');
    writeFileSync(input, 'x');
    await expect(withConverter('cadexchanger convert', () => convertToStep(input, '.x_b'))).rejects.toThrow(
      /JSON array of strings/,
    );
  });
});

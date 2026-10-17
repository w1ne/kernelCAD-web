// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/fromCad.ts
//
// `lib.fromCAD(path)` — one import entry point for foreign CAD files. It picks a
// reader by extension and always lands the result as the same kind of B-rep
// Shape the STEP and BREP loaders produce, so every downstream feature works on it.
//
//   .step / .stp            STEP AP203/AP214/AP242 — read by lib.fromSTEP.
//   .brep                   OCCT native BREP — read by lib.fromBREP.
//   .fcstd                  FreeCAD document — read natively: the document is a zip,
//                           each body's shape is an OCCT BREP member, and each
//                           object's Placement is applied. No FreeCAD install needed.
//   .x_t .x_b .xt           Parasolid transmit. Read in-process by the linked
//                           parasolid-core reader (crates/parasolid-import). No
//                           external program.
//   .sldprt .sldasm .igs    SolidWorks and IGES still go through KERNELCAD_CAD_CONVERTER.
//   .iges                   See the converter section below.
//
// KERNELCAD_CAD_CONVERTER is a JSON array of strings, run without a shell. The
// placeholders {input} and {output} are replaced with absolute paths. The command
// must write a STEP file to {output}. Example (any tool that writes STEP works):
//   KERNELCAD_CAD_CONVERTER='["/opt/cadexchanger/bin/cadexchanger","convert","{input}","{output}"]'

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { promisify } from 'node:util';
import { unzipSync, strFromU8 } from 'fflate';
import { resolveScriptRelativePath } from '../../shared/runtime/scriptRelativePath';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import { importBrepBytes, BrepParseError } from '../../kernel/backends/occt/importBrep';
import { Shape } from '../capture/proxy';
import { KernelError } from '../../shared/intent/kernelError';
import { fromSTEP, fromStepBytes, type FromSTEPContext } from './fromSTEP';
import { fromBREP } from './fromMeshFormats';
import { readParasolidBytes } from './parasolid/native';
import { solidFromParasolid } from './parasolid/lower';

const execFileAsync = promisify(execFile);

/** Parasolid transmit files. Read by the in-process parasolid-core module. */
const PARASOLID_EXTENSIONS = new Set(['.x_t', '.x_b', '.xt']);

/** Length unit of the numbers stored in a Parasolid file. kernelCAD itself is millimetres. */
export type ParasolidSourceUnit = 'm' | 'cm' | 'mm' | 'in' | 'ft';

export interface FromCADOptions {
  /** Physical unit of a Parasolid file. The reader never guesses. Default is millimetres. */
  sourceUnit?: ParasolidSourceUnit;
}

/** Extensions that need an external converter (proprietary or not worth a native reader). */
const CONVERTED_EXTENSIONS = new Set(['.sldprt', '.sldasm', '.igs', '.iges']);

const CONVERTER_ENV = 'KERNELCAD_CAD_CONVERTER';
const CONVERTER_TIMEOUT_MS = 15 * 60 * 1000;

type Vec3 = [number, number, number];

/** One FreeCAD object that owns a shape, as read from Document.xml. */
interface FcstdObject {
  name: string;
  type: string;
  shapeFile: string | null;
  placement: { position: Vec3; quaternion: [number, number, number, number] };
  /** Names of other objects this one links to (Base, Tool, Group, Tip, ...). */
  references: string[];
}

export async function fromCAD(ctx: FromSTEPContext, path: string, opts?: FromCADOptions): Promise<Shape> {
  if (typeof path !== 'string' || path.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      'lib.fromCAD(path): path must be a non-empty string.',
      undefined,
      "invalid-args.lib.fromCAD — pass a path to a CAD file (e.g. lib.fromCAD('parts/robot.FCStd')).",
    );
  }
  const ext = extname(path).toLowerCase();
  if (ext === '.step' || ext === '.stp') return fromSTEP(ctx, path);
  if (ext === '.brep') return fromBREP(ctx, path);
  if (ext === '.fcstd') return fromFcstd(ctx, path);
  if (PARASOLID_EXTENSIONS.has(ext)) return fromParasolid(ctx, path, opts?.sourceUnit ?? 'mm');
  if (CONVERTED_EXTENSIONS.has(ext)) return fromConverted(ctx, path, ext);
  throw new KernelError(
    'feature.invalid-args',
    `lib.fromCAD: unsupported file type '${ext || '(none)'}' for ${path}.`,
    undefined,
    'invalid-args.lib.fromCAD.extension — supported: .step/.stp, .brep, .FCStd and .x_t/.x_b natively; .sldprt/.sldasm/.igs with KERNELCAD_CAD_CONVERTER set.',
  );
}

// ---------------------------------------------------------------------------
// FreeCAD (.FCStd)
// ---------------------------------------------------------------------------

async function fromFcstd(ctx: FromSTEPContext, path: string): Promise<Shape> {
  const absPath = resolveScriptRelativePath(ctx.scriptDir, path);
  const buf = await readBytes(absPath, path, 'fromCAD');
  const combined = await readFcstdBackend(new Uint8Array(buf), absPath);

  const shape = ctx.session.createShape({
    kind: 'importedBrep',
    params: {},
    inputs: {},
    metadata: { sourcePath: absPath },
  });
  ctx.session.importedGeometry.set(shape.id, combined);
  return shape;
}

/**
 * Read a FreeCAD document (the bytes of an .FCStd file) into one OCCT backend. Each
 * top-level body is placed by its FreeCAD Placement and the bodies are combined into
 * one compound. `label` names the file in diagnostics.
 */
export async function readFcstdBackend(bytes: Uint8Array, label: string): Promise<OcctBackend> {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fromCAD: ${label} is not a FreeCAD document (not a zip archive).`,
      undefined,
      'kernel-failed.lib.fromCAD.fcstd-zip — re-save the file from FreeCAD as .FCStd.',
    );
  }
  const documentXml = files['Document.xml'];
  if (!documentXml) {
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fromCAD: ${label} has no Document.xml; it is not a FreeCAD document.`,
      undefined,
      'kernel-failed.lib.fromCAD.fcstd-document — re-save the file from FreeCAD as .FCStd.',
    );
  }

  const objects = parseFcstdObjects(strFromU8(documentXml));
  const withShape = objects.filter((o) => o.shapeFile !== null);
  // A PartDesign body's Shape is the finished solid. Use bodies when the file has
  // them; otherwise fall back to the Part workbench objects.
  const bodies = withShape.filter((o) => o.type === 'PartDesign::Body');
  const pool = bodies.length > 0 ? bodies : withShape.filter((o) => o.type.startsWith('Part::'));
  // Anything another object links to is an input to it, not an output. Only the
  // top of each chain is a result.
  const linked = new Set(objects.flatMap((o) => o.references));
  const roots = pool.filter((o) => !linked.has(o.name));
  if (roots.length === 0) {
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fromCAD: ${label} has no shaped body to import.`,
      undefined,
      'kernel-failed.lib.fromCAD.fcstd-empty — the document needs a PartDesign body or a Part object with a shape.',
    );
  }

  await initOcct();
  const bodiesOut: OcctBackend[] = roots.map((root) => {
    const shapeBytes = files[root.shapeFile!];
    if (!shapeBytes) {
      throw new KernelError(
        'feature.kernel-failed',
        `lib.fromCAD: ${label} names shape file '${root.shapeFile}' for ${root.name}, but the archive does not contain it.`,
        undefined,
        'kernel-failed.lib.fromCAD.fcstd-missing-shape — the file is incomplete; re-save it from FreeCAD.',
      );
    }
    let backend: OcctBackend;
    try {
      backend = importBrepBytes(shapeBytes);
    } catch (e) {
      const msg = e instanceof BrepParseError || e instanceof Error ? e.message : String(e);
      throw new KernelError(
        'feature.kernel-failed',
        `lib.fromCAD: OCCT failed to read the shape of ${root.name} in ${label}: ${msg}`,
        undefined,
        'kernel-failed.lib.fromCAD.fcstd-brep — the stored shape is not a valid OCCT BREP.',
      );
    }
    return placeBody(backend, root.placement);
  });

  return bodiesOut.length === 1 ? bodiesOut[0] : OcctBackend.compound(bodiesOut);
}

/**
 * Parse the objects out of a FreeCAD Document.xml. Only the parts the importer
 * needs are read: type, the Shape member file, the Placement, and link targets.
 * The Document.xml schema is regular enough that attribute-level matching is
 * sufficient; it is not a general XML parser.
 */
export function parseFcstdObjects(xml: string): FcstdObject[] {
  const objects: FcstdObject[] = [];
  const objectRe = /<Object\s+name="([^"]+)"\s+type="([^"]+)"[^>]*>([\s\S]*?)<\/Object>/g;
  for (const m of xml.matchAll(objectRe)) {
    const [, name, type, body] = m;
    const shapeFile = /<Property\s+name="Shape"[\s\S]*?<Part\b[^>]*?\bfile="([^"]+)"/.exec(body)?.[1] ?? null;
    const placementAttrs = /<Property\s+name="Placement"[\s\S]*?<PropertyPlacement\b([^>]*?)\/?>/.exec(body)?.[1];
    const references = [...body.matchAll(/<Link(?:Sub)?\s+value="([^"]+)"/g)].map((r) => r[1]);
    objects.push({
      name,
      type,
      shapeFile,
      placement: placementFromAttrs(placementAttrs),
      references,
    });
  }
  return objects;
}

function placementFromAttrs(attrs: string | undefined): FcstdObject['placement'] {
  const num = (key: string, fallback: number): number => {
    const v = attrs ? new RegExp(`\\b${key}="([^"]+)"`).exec(attrs)?.[1] : undefined;
    const n = v === undefined ? NaN : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    position: [num('Px', 0), num('Py', 0), num('Pz', 0)],
    quaternion: [num('Q0', 0), num('Q1', 0), num('Q2', 0), num('Q3', 1)],
  };
}

/** Apply a FreeCAD placement (rotate about the origin, then translate). */
function placeBody(backend: OcctBackend, placement: FcstdObject['placement']): OcctBackend {
  const { axis, deg } = quaternionToAxisAngle(placement.quaternion);
  let out: OcctBackend = backend;
  if (deg !== 0) out = out.rotate(axis, deg);
  const [x, y, z] = placement.position;
  if (x !== 0 || y !== 0 || z !== 0) out = out.translate(x, y, z);
  return out;
}

/** Quaternion (x, y, z, w) to axis and angle in degrees. */
export function quaternionToAxisAngle(q: [number, number, number, number]): { axis: Vec3; deg: number } {
  const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  const [x, y, z, w] = [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
  const s = Math.sqrt(Math.max(0, 1 - w * w));
  if (s < 1e-9) return { axis: [0, 0, 1], deg: 0 };
  const angle = 2 * Math.acos(Math.min(1, Math.max(-1, w)));
  return { axis: [x / s, y / s, z / s], deg: (angle * 180) / Math.PI };
}

// ---------------------------------------------------------------------------
// Parasolid (.x_t, .x_b), read in-process
// ---------------------------------------------------------------------------

async function fromParasolid(ctx: FromSTEPContext, path: string, sourceUnit: ParasolidSourceUnit): Promise<Shape> {
  const absPath = resolveScriptRelativePath(ctx.scriptDir, path);
  const bytes = await readBytes(absPath, path, 'fromCAD');
  const model = await readParasolidBytes(new Uint8Array(bytes));
  if (!model.ok) {
    const schema = model.schemaKey ? ` (${model.schemaKey})` : '';
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fromCAD: could not read Parasolid file ${absPath}${schema}: ${model.message ?? model.code ?? 'unknown error'}`,
      undefined,
      model.code === 'schema.missing_base_schema'
        ? `kernel-failed.lib.fromCAD.parasolid-schema — parasolid-core has no built-in profile for ${model.schemaKey ?? 'this schema'}. It does not substitute a nearby schema.`
        : 'kernel-failed.lib.fromCAD.parasolid — the in-process Parasolid reader rejected the file.',
    );
  }
  let backend: OcctBackend;
  try {
    backend = await solidFromParasolid(model, sourceUnit);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fromCAD: read ${absPath} (${model.schemaKey ?? 'parasolid'}, ${model.bodyCount ?? 0} bodies) but could not build a solid: ${msg}`,
      undefined,
      'kernel-failed.lib.fromCAD.parasolid-solid — the reader understood the file, and building that surface kind is still open.',
    );
  }
  const shape = ctx.session.createShape({
    kind: 'importedBrep',
    params: {},
    inputs: {},
    metadata: { sourcePath: absPath },
  });
  ctx.session.importedGeometry.set(shape.id, backend);
  return shape;
}

// ---------------------------------------------------------------------------
// External converter (SolidWorks, IGES)
// ---------------------------------------------------------------------------

async function fromConverted(ctx: FromSTEPContext, path: string, ext: string): Promise<Shape> {
  const absPath = resolveScriptRelativePath(ctx.scriptDir, path);
  // Existence check first, so a missing file is reported before the converter runs.
  await readBytes(absPath, path, 'fromCAD');
  const stepBytes = await convertToStep(absPath, ext);
  return fromStepBytes(ctx, stepBytes, absPath);
}

/**
 * Run the configured converter on one file and return the STEP bytes it wrote.
 * The converter runs without a shell, in a private temp directory that is removed
 * afterwards.
 */
export async function convertToStep(absPath: string, ext: string): Promise<Buffer> {
  const command = converterCommand(absPath, ext);
  const workDir = await mkdtemp(join(tmpdir(), 'kernelcad-cad-'));
  const outPath = join(workDir, 'converted.step');
  try {
    const [program, ...args] = command.map((a) => a.replaceAll('{input}', absPath).replaceAll('{output}', outPath));
    try {
      await execFileAsync(program!, args, { timeout: CONVERTER_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 });
    } catch (e) {
      const err = e as { stderr?: string; message?: string };
      throw new KernelError(
        'feature.kernel-failed',
        `lib.fromCAD: the converter failed on ${absPath}: ${(err.stderr || err.message || '').trim().slice(0, 800)}`,
        undefined,
        `kernel-failed.lib.fromCAD.converter — check ${CONVERTER_ENV}; the converter must write STEP to {output}.`,
      );
    }
    try {
      return await readFile(outPath);
    } catch {
      throw new KernelError(
        'feature.kernel-failed',
        `lib.fromCAD: the converter finished but wrote no STEP file for ${absPath}.`,
        undefined,
        `kernel-failed.lib.fromCAD.converter-output — the command in ${CONVERTER_ENV} must write its STEP to {output}.`,
      );
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/** Parse KERNELCAD_CAD_CONVERTER into an argv template, or throw with setup guidance. */
export function converterCommand(absPath: string, ext: string): string[] {
  const raw = process.env[CONVERTER_ENV];
  if (!raw) {
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fromCAD: ${absPath} is a ${ext} file, which kernelCAD reads through an external converter, and ${CONVERTER_ENV} is not set.`,
      undefined,
      `kernel-failed.lib.fromCAD.no-converter — set ${CONVERTER_ENV} to a JSON argv such as '["<converter>","{input}","{output}"]' that writes STEP, or export STEP from the source CAD (SolidWorks: File > Save As > STEP AP214).`,
    );
  }
  let argv: unknown;
  try {
    argv = JSON.parse(raw);
  } catch {
    argv = undefined;
  }
  if (!Array.isArray(argv) || argv.length === 0 || !argv.every((a) => typeof a === 'string')) {
    throw new KernelError(
      'feature.invalid-args',
      `lib.fromCAD: ${CONVERTER_ENV} must be a JSON array of strings, got: ${raw.slice(0, 200)}`,
      undefined,
      `invalid-args.lib.fromCAD.converter-env — example: '["<converter>","{input}","{output}"]'.`,
    );
  }
  return argv as string[];
}

async function readBytes(absPath: string, path: string, fn: string): Promise<Buffer> {
  try {
    return await readFile(absPath);
  } catch {
    throw new KernelError(
      'feature.invalid-args',
      `lib.${fn}: cannot read CAD file at ${absPath}.`,
      undefined,
      `invalid-args.lib.${fn}.path — verify the path '${path}' resolves under the script's directory; absolute paths are also accepted.`,
    );
  }
}

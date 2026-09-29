// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/usecaseChecks.ts
//
// Shared checks for the typical use-case tasks (eval/tasks/usecase-*). Each
// harness builds its script ONCE in-process and asks the kernel what it built:
// exact bbox, volume, solid count and BRep validity per part, cylindrical
// holes from the kernel's own hole detection, material inside probe boxes,
// the dfmSpec min-wall report, and the bytes of every export the user asked
// for, read back (STEP re-imported, STL and 3MF meshes checked for open
// edges). No check trusts an "ok" flag on its own. See eval/tasks/USECASES.md.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { getOC, makeBox, type Shape3D } from 'replicad';
import { evaluateAndBuildScript } from '../src/agent/cli/commands/evaluate';
import { evaluateScriptTool } from '../src/agent/mcp/tools/evaluateScript';
import {
  runAndExport, runAndExportParts, type ExportFormat, type ExportOptions,
} from '../src/agent/script-runtime/export';
import { initOcct, meshShapeForExport, OcctBackend } from '../src/kernel/backends/occt/occtBackend';
import { verifyWatertight } from '../src/kernel/backends/occt/meshHeal';
import { detectCylindricalHoles, type CylindricalHole } from '../src/kernel/backends/occt/holeDetection';
import { sceneToWorldFrameParts } from '../src/kernel/backends/occt/sceneToWorldFrame';
import { isSceneBackend } from '../src/kernel/backends/sceneBackend';
import { inspectStepBuffer, type StepInspectReport } from '../src/kernel/import/inspectStep';
import type { CompilerDiagnostic } from '../src/shared/diagnostics/diagnostic';
import type { DfmCheckReport } from '../src/modeling/runtime/dfm/runDfmChecks';

export type Vec3 = [number, number, number];

/** Dimensional tolerance of every use-case check (mm). */
export const TOL_MM = 0.1;

export interface UsecasePart {
  name: string;
  /** World-frame shape (assembly placement applied). */
  shape: OcctBackend;
}

export interface UsecaseBuild {
  scriptPath: string;
  code: string;
  /** Build + dfm gates ran with no warning or error diagnostic. */
  clean: boolean;
  diagnostics: CompilerDiagnostic[];
  /** One entry per assembly part, or a single `body` for a plain shape. */
  parts: UsecasePart[];
  dfm?: DfmCheckReport;
}

export const near = (a: number, b: number, tol = TOL_MM): boolean => Math.abs(a - b) <= tol;

/** Blocking diagnostics, same rule as the eval oracle: anything not `info`. */
export function blocking(diags: readonly CompilerDiagnostic[]): CompilerDiagnostic[] {
  return diags.filter((d) => d.severity !== 'info');
}

/**
 * Build a script once: evaluation (build + dfm gates, no mechanism sweep),
 * lowered geometry split into world-frame parts, and the dfm report. Pass
 * `code` to build source that is not on disk (resolved next to scriptPath).
 */
export async function buildUsecase(scriptPath: string, code?: string): Promise<UsecaseBuild> {
  await initOcct();
  const file = resolve(scriptPath);
  const source = code ?? readFileSync(file, 'utf8');
  const { evaluation, model, dfmReport } = await evaluateAndBuildScript(
    code === undefined ? { file } : { code, scriptDir: dirname(file) },
  );
  const root = model?.rootShape;
  let parts: UsecasePart[] = [];
  if (isSceneBackend(root)) {
    parts = sceneToWorldFrameParts(root).map((p) => ({ name: p.name, shape: p.shape }));
  } else if (root instanceof OcctBackend) {
    parts = [{ name: 'body', shape: root }];
  }
  return {
    scriptPath: file,
    code: source,
    clean: evaluation.exitCode === 0 && blocking(evaluation.diagnostics).length === 0,
    diagnostics: evaluation.diagnostics,
    parts,
    dfm: dfmReport,
  };
}

/**
 * The full `evaluate_script` verdict an agent sees, mechanism gate included.
 * Separate from `buildUsecase` because the mechanism sweep has its own cost
 * and its own open findings (see eval/usecaseSuite.ts).
 */
export async function evaluateScriptVerdict(scriptPath: string): Promise<boolean> {
  const r = await evaluateScriptTool({ file: resolve(scriptPath) });
  return r.ok && blocking(r.diagnostics).length === 0;
}

export function part(b: UsecaseBuild, name: string): OcctBackend {
  const p = b.parts.find((x) => x.name === name);
  if (!p) throw new Error(`usecase: no part '${name}' (have ${b.parts.map((x) => x.name).join(', ')})`);
  return p.shape;
}

export function bbox(shape: OcctBackend): { min: Vec3; max: Vec3; size: Vec3 } {
  const bb = shape.boundingBox({ exact: true });
  const min: Vec3 = [bb.min[0], bb.min[1], bb.min[2]];
  const max: Vec3 = [bb.max[0], bb.max[1], bb.max[2]];
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

/** Bbox size equals `size` per axis within the tolerance. */
export function sizeIs(shape: OcctBackend, size: Vec3, tol = TOL_MM): boolean {
  const s = bbox(shape).size;
  return s.every((v, i) => near(v, size[i], tol));
}

/** Bbox corners equal `min` / `max` within the tolerance. */
export function bboxIs(shape: OcctBackend, min: Vec3, max: Vec3, tol = TOL_MM): boolean {
  const b = bbox(shape);
  return b.min.every((v, i) => near(v, min[i], tol)) && b.max.every((v, i) => near(v, max[i], tol));
}

/**
 * Closed, valid solid(s): exactly `solids` TopAbs_SOLIDs (text is one per
 * glyph), BRepCheck valid, positive volume, and a tessellation with no open
 * edges.
 */
export function isClosedSolid(shape: OcctBackend, solids = 1): boolean {
  if (shape.solidComponents().length !== solids) return false;
  if (!(shape.volume() > 0)) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const analyzer = new oc.BRepCheck_Analyzer(shape.getReplicadShape().wrapped, true, false);
  const valid = analyzer.IsValid_2();
  analyzer.delete();
  if (!valid) return false;
  const mesh = meshShapeForExport(shape.getReplicadShape());
  return verifyWatertight(mesh as never).ok;
}

/** Volume of material inside the axis-aligned box [min, max] (mm³). */
export function materialIn(shape: OcctBackend, min: Vec3, max: Vec3): number {
  return shape.intersectionVolume(new OcctBackend(makeBox(min, max) as Shape3D));
}

/** No material in the box: an opening, a gap, a cutout. */
export function emptyIn(shape: OcctBackend, min: Vec3, max: Vec3): boolean {
  return materialIn(shape, min, max) < 1e-6;
}

/** The box is solid material. */
export function fullIn(shape: OcctBackend, min: Vec3, max: Vec3): boolean {
  const v = (max[0] - min[0]) * (max[1] - min[1]) * (max[2] - min[2]);
  return near(materialIn(shape, min, max), v, v * 1e-6 + 1e-6);
}

export function holesOf(shape: OcctBackend): CylindricalHole[] {
  return detectCylindricalHoles(shape);
}

export interface HoleSpec {
  diameter: number;
  /** A point on the hole axis. */
  at: Vec3;
  /** Axis direction (either sense). */
  axis: Vec3;
  kind?: 'through' | 'blind';
  /** Cylindrical bore length (mm). */
  depth?: number;
}

function unit(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** Distance from point p to the line through o with unit direction d. */
function distToAxis(p: Vec3, o: Vec3, d: Vec3): number {
  const w: Vec3 = [p[0] - o[0], p[1] - o[1], p[2] - o[2]];
  const t = w[0] * d[0] + w[1] * d[1] + w[2] * d[2];
  return Math.hypot(w[0] - t * d[0], w[1] - t * d[1], w[2] - t * d[2]);
}

function holeMatches(h: CylindricalHole, spec: HoleSpec, tol: number): boolean {
  const a = unit(spec.axis);
  const d = unit(h.axisDirection);
  const parallel = Math.abs(a[0] * d[0] + a[1] * d[1] + a[2] * d[2]) > 1 - 1e-6;
  return parallel
    && near(h.diameterMm, spec.diameter, tol)
    && distToAxis(spec.at, h.axisOrigin, d) <= tol
    && (spec.kind === undefined || h.kind === spec.kind)
    && (spec.depth === undefined || near(h.depthMm, spec.depth, tol));
}

/** The detected hole matching the spec, if any. */
export function findHole(shape: OcctBackend, spec: HoleSpec, tol = TOL_MM): CylindricalHole | undefined {
  return holesOf(shape).find((h) => holeMatches(h, spec, tol));
}

/** Every spec matches a distinct detected hole (kernel hole detection). */
export function hasHoles(shape: OcctBackend, specs: readonly HoleSpec[], tol = TOL_MM): boolean {
  const free = [...holesOf(shape)];
  return specs.every((s) => {
    const i = free.findIndex((h) => holeMatches(h, s, tol));
    if (i >= 0) free.splice(i, 1);
    return i >= 0;
  });
}

/** dfmSpec min-wall gate ran for every printed part and found no thin wall. */
export function minWallOk(b: UsecaseBuild, minMm: number): boolean {
  const walls = b.dfm?.walls ?? [];
  return walls.length > 0 && walls.every((w) => w.result.violations.length === 0 && w.result.thinnestMm >= minMm - 1e-6);
}

// ---------------------------------------------------------------- exports --

export interface ExportedBytes {
  bytes: Uint8Array;
  diagnostics: CompilerDiagnostic[];
  /** Emitted without error diagnostics and non-empty. */
  ok: boolean;
  result: Awaited<ReturnType<typeof runAndExport>>;
}

export async function exportAs(
  b: UsecaseBuild,
  format: ExportFormat,
  options?: ExportOptions,
): Promise<ExportedBytes> {
  const r = await runAndExport({
    code: b.code,
    fileName: b.scriptPath,
    scriptDir: dirname(b.scriptPath),
    format,
    ...(options ? { options } : {}),
  });
  const ok = r.bytes.length > 0 && !r.diagnostics.some((d) => d.severity === 'error');
  return { bytes: r.bytes, diagnostics: r.diagnostics, ok, result: r };
}

/** Re-import STEP bytes through the kernel's STEP inspector. */
export async function reimportStep(bytes: Uint8Array): Promise<StepInspectReport | undefined> {
  try {
    return await inspectStepBuffer(Buffer.from(bytes), 'usecase-export.step');
  } catch {
    return undefined;
  }
}

/** Weld a triangle soup on exact vertex coordinates and count open edges. */
function openEdgesOfSoup(xyz: ArrayLike<number | string>, triCount: number): number {
  const ids = new Map<string, number>();
  const triangles: number[] = [];
  for (let i = 0; i < triCount * 3; i++) {
    const key = `${xyz[i * 3]},${xyz[i * 3 + 1]},${xyz[i * 3 + 2]}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = ids.size;
      ids.set(key, id);
    }
    triangles.push(id);
  }
  return verifyWatertight({ vertices: [], triangles } as never).openEdgeCount;
}

export interface MeshStats {
  triangles: number;
  openEdges: number;
}

/** Binary STL: triangle count and open edges after welding. */
export function stlStats(bytes: Uint8Array): MeshStats {
  if (bytes.length < 84) return { triangles: 0, openEdges: 0 };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = view.getUint32(80, true);
  if (bytes.length < 84 + n * 50) return { triangles: 0, openEdges: 0 };
  const xyz = new Float32Array(n * 9);
  for (let t = 0; t < n; t++) {
    const base = 84 + t * 50 + 12; // skip the facet normal
    for (let k = 0; k < 9; k++) xyz[t * 9 + k] = view.getFloat32(base + k * 4, true);
  }
  return { triangles: n, openEdges: openEdgesOfSoup(xyz, n) };
}

export interface ThreeMfObject extends MeshStats {
  name: string;
  /** Mesh bbox with the build item's translation applied (plate frame). */
  min: Vec3;
  max: Vec3;
}

/** Mesh objects of a 3MF package: triangles, open edges, placed bbox. */
export function threeMfObjects(bytes: Uint8Array): ThreeMfObject[] {
  let model: string;
  try {
    const entry = unzipSync(bytes)['3D/3dmodel.model'];
    if (!entry) return [];
    model = strFromU8(entry);
  } catch {
    return [];
  }
  const shift = new Map<string, Vec3>();
  for (const m of model.matchAll(/<item\s+objectid="(\d+)"(?:\s+transform="([^"]+)")?/g)) {
    const t = m[2]?.trim().split(/\s+/).map(Number) ?? [];
    shift.set(m[1], t.length === 12 ? [t[9], t[10], t[11]] : [0, 0, 0]);
  }
  const out: ThreeMfObject[] = [];
  for (const m of model.matchAll(/<object\b([^>]*)>([\s\S]*?)<\/object>/g)) {
    const mesh = m[2];
    if (!mesh.includes('<mesh')) continue;
    const name = /\bname="([^"]*)"/.exec(m[1])?.[1] ?? '';
    const id = /\bid="(\d+)"/.exec(m[1])?.[1] ?? '';
    const d = shift.get(id) ?? [0, 0, 0];
    const verts = [...mesh.matchAll(/<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g)].map((v) => [v[1], v[2], v[3]]);
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const v of verts) {
      for (let k = 0; k < 3; k++) {
        const c = Number(v[k]) + d[k];
        min[k] = Math.min(min[k], c);
        max[k] = Math.max(max[k], c);
      }
    }
    const tris = [...mesh.matchAll(/<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"/g)];
    const xyz: string[] = [];
    for (const t of tris) for (const k of [1, 2, 3]) xyz.push(...verts[Number(t[k])]);
    out.push({ name, triangles: tris.length, openEdges: openEdgesOfSoup(xyz, tris.length), min, max });
  }
  return out;
}

/** Every mesh is non-trivial and closed. */
export function meshesClosed(meshes: readonly MeshStats[], minTriangles = 12): boolean {
  return meshes.length > 0 && meshes.every((m) => m.triangles >= minTriangles && m.openEdges === 0);
}

// ------------------------------------------------------- standard checks --

/** The script returned an assembly (parts), not a plain Shape (`body`). */
function isAssembly(b: UsecaseBuild): boolean {
  return !(b.parts.length === 1 && b.parts[0].name === 'body');
}

export interface StandardExportOpts {
  /** Solids the STEP must re-import as. */
  solids: number;
  /** Also export 3MF (print cases); options passed through. */
  threeMf?: true | ExportOptions;
}

/**
 * The exports every use case needs, read back: STEP re-imports with the right
 * solid count and the model's volume, STL is watertight, and (print cases)
 * the 3MF carries one closed mesh per part.
 */
export async function standardExports(b: UsecaseBuild, opts: StandardExportOpts): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  const modelVolume = b.parts.reduce((s, p) => s + p.shape.volume(), 0);

  const step = await exportAs(b, 'step');
  const re = step.ok ? await reimportStep(step.bytes) : undefined;
  const stepVolume = re ? re.solids.reduce((s, x) => s + x.volumeMm3, 0) : 0;
  out[`STEP re-imports as ${opts.solids} solid(s)`] = re?.solidCount === opts.solids;
  out['STEP volume matches the model (0.5%)'] = re !== undefined && Math.abs(stepVolume - modelVolume) <= modelVolume * 0.005;

  const stl = await exportAs(b, 'stl');
  if (isAssembly(b)) {
    // Touching parts share faces in one combined mesh, so each part's own
    // STL (export --part) is what must be closed.
    const each = await runAndExportParts({ code: b.code, fileName: b.scriptPath, scriptDir: dirname(b.scriptPath) });
    out['STL exports; each part STL is watertight'] = stl.ok && each.parts.length === b.parts.length
      && meshesClosed(each.parts.map((p) => stlStats(p.bytes)));
  } else {
    out['STL is watertight'] = stl.ok && meshesClosed([stlStats(stl.bytes)]);
  }

  if (opts.threeMf) {
    const t = await exportAs(b, '3mf', opts.threeMf === true ? undefined : opts.threeMf);
    const objs = t.ok ? threeMfObjects(t.bytes) : [];
    const names = b.parts.map((p) => p.name);
    out[`3MF has one object per part (${names.join(', ')})`] =
      objs.length === names.length && (!isAssembly(b) || names.every((n) => objs.some((o) => o.name === n)));
    out['3MF meshes are closed'] = meshesClosed(objs);
  }
  return out;
}

/**
 * Gates every use case shares: clean build, the expected parts, and closed
 * valid solid(s) per part. `solids` overrides the per-part solid count.
 */
export function standardGates(
  b: UsecaseBuild,
  partNames: readonly string[],
  solids: Record<string, number> = {},
): Record<string, boolean> {
  const names = b.parts.map((p) => p.name);
  return {
    'evaluates clean': b.clean,
    [`parts: ${partNames.join(', ')}`]: names.length === partNames.length && partNames.every((n) => names.includes(n)),
    'closed valid solid per part': b.parts.length > 0 && b.parts.every((p) => isClosedSolid(p.shape, solids[p.name] ?? 1)),
  };
}

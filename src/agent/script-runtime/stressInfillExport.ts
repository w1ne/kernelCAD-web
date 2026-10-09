// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/stressInfillExport.ts
//
// `export({ format: '3mf', infill: { fromFea } })`: solve the script's
// declared feaStudy, turn the stress field into infill bands, and hand the
// 3MF writer one modifier volume per band above the base band.
//
// Needs the LOCAL CalculiX + gmsh toolchain. Without it the export fails with
// `fea.solver.unavailable` and writes nothing: a uniform-infill file would
// look like success and carry none of the evidence the user asked for.
//
// Besides the modifiers it writes two render-ready scripts next to the FEA
// job (stress heatmap, printed infill bands); the MCP layer renders them.

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { invalidArgsText, type InvalidArgsSpec } from '../../shared/intent/invalidArgs';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { findFeaStudies, selectFeaStudy, type FoundFeaStudy } from '../../modeling/runtime/fea/findFeaStudies';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { runFeaStudy } from '../../kernel/fea/runFea';
import type { FeaToolchain } from '../../kernel/fea/toolchain';
import { binaryStl, buildHeatmap } from '../../kernel/fea/heatmap';
import {
  buildStressInfill,
  validateInfillBands,
  type InfillBandSpec,
  type InfillSaving,
  type StressInfillResult,
} from '../../kernel/fea/infillBands';
import type { FeaFieldResult, FeaMesh, FeaSummary } from '../../kernel/fea/types';
import type { ThreeMfModifier } from '../../kernel/backends/occt/export3mf';
import { canonicalMaterialName, engineeringMaterialProps } from '../../shared/materials/engineeringMaterials';

/** The `infill` key of the 3MF export options. */
export interface StressInfillExportOptions {
  /** Study name, or `true` for the last declared feaStudy. */
  fromFea: string | true;
  /** Band table; default low < 15 % yield 10 %, mid < 40 % 25 %, high 60 %. */
  bands?: InfillBandSpec[];
  /** Infill pattern for every band (Orca/Bambu `sparse_infill_pattern`, mapped
   *  to PrusaSlicer's `fill_pattern` for slicer 'prusa');
   *  default 'gyroid'. */
  pattern?: string;
  /** Voxel edge for the modifier volumes, mm (default 2-5 mm by part size). */
  cellMm?: number;
  /** Override the study's meshSize for this run, mm. */
  meshSize?: number;
  /** Where the FEA job, band STLs and render scripts go. Default: temp dir
   *  (the MCP export puts them in `<output>-infill/`). */
  outDir?: string;
  /** MCP export only: render the heatmap / band PNGs (default true). */
  renders?: boolean;
}

/** JSON-safe band row returned to the caller (no meshes). */
export interface InfillBandRow {
  name: string;
  densityPercent: number;
  fromMPa: number;
  /** null for the top band (no upper edge). */
  toMPa: number | null;
  stressVolumePercent: number;
  printedVolumePercent: number;
  /** false for the base band: it is the object's own infill. */
  modifier: boolean;
}

export interface StressInfillReport {
  study: string;
  pattern: string;
  cellMm: number;
  yieldMPa: number;
  bands: InfillBandRow[];
  saving: InfillSaving;
  /** Governing values (away from the fixed-face edges), plus the raw clamp-
   *  edge peak when there is one. */
  fea: Pick<FeaSummary, 'maxVonMisesMPa' | 'maxVonMisesAt' | 'minSafetyFactor' | 'maxDisplacementMm' | 'trust' | 'peakAtSupportMPa'>;
  /** Part bounds from the FEA mesh, mm (model frame). */
  boundsMm: { min: [number, number, number]; max: [number, number, number] };
  outDir: string;
  /** `.kcad.ts` scripts the MCP layer renders (heatmap, printed bands). */
  renderScripts: { heatmap: string; bands: string; cutaway: string };
  note: string;
}

export interface StressInfillBuild {
  modifiers: ThreeMfModifier[];
  objectSettings: Record<string, string>;
  report: StressInfillReport;
}

const SOLID_PART_NOTE =
  'The FEA models the part as solid material. A printed part with sparse infill and layer lines is weaker '
  + '(especially across layers), so read the safety factor as an upper bound and keep a margin.';

function solverUnavailable(message: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'fea.solver.unavailable',
    severity: 'error',
    message,
    hint: HINT_TEMPLATES['fea.solver.unavailable'].template,
    nextAction: NEXT_ACTIONS['fea.solver.unavailable'],
  };
}

const INFILL_API = "export({ format: '3mf', options: { infill } })";
const INFILL_EXAMPLE = "options: { format: '3mf', printer: 'bambu-a1', infill: { fromFea: 'shelf-load' } }";
const STUDY_EXAMPLE =
  "part.feaStudy({ name: 'shelf-load', material: 'petg', fixed: { atX: 0 }, loads: [{ faces: { atZ: 6 }, force: [0, 0, -120] }] })";

const isPositive = (v: unknown): boolean => typeof v === 'number' && v > 0;

/** One check per field; each returns a message when the field is bad. */
const INFILL_FIELD_CHECKS: ReadonlyArray<(o: Partial<StressInfillExportOptions>) => string | undefined> = [
  (o) => (o.fromFea === true || (typeof o.fromFea === 'string' && o.fromFea.length > 0)
    ? undefined
    : 'infill.fromFea must be a feaStudy name or true (the last declared study).'),
  (o) => {
    if (o.bands === undefined) return undefined;
    if (!Array.isArray(o.bands)) return 'infill.bands must be an array of { name, fromYield, densityPercent }.';
    return validateInfillBands(o.bands);
  },
  (o) => (o.pattern === undefined || (typeof o.pattern === 'string' && o.pattern.length > 0)
    ? undefined
    : 'infill.pattern must be an Orca/Bambu sparse_infill_pattern name, e.g. "gyroid".'),
  (o) => (o.cellMm === undefined || isPositive(o.cellMm) ? undefined : 'infill.cellMm must be a positive number of mm.'),
  (o) => (o.meshSize === undefined || isPositive(o.meshSize) ? undefined : 'infill.meshSize must be a positive number of mm.'),
];

/** Validate the user-facing `infill` option; undefined when valid. */
export function invalidInfillOption(infill: unknown): string | undefined {
  if (typeof infill !== 'object' || infill === null) return 'infill must be an object: { fromFea: "<study name>" | true, bands?, pattern? }.';
  for (const check of INFILL_FIELD_CHECKS) {
    const bad = check(infill as Partial<StressInfillExportOptions>);
    if (bad !== undefined) return bad;
  }
  return undefined;
}

function filamentDensity(material: unknown): number | undefined {
  if (typeof material !== 'string') return undefined;
  const grade = canonicalMaterialName(material);
  return grade === undefined ? undefined : engineeringMaterialProps(grade).densityKgPerM3 / 1000;
}

type Fail = { ok: false; diagnostics: CompilerDiagnostic[] };
const fail = (spec: Omit<InvalidArgsSpec, 'api'>, featureId?: string): Fail => ({
  ok: false,
  diagnostics: [{
    target: 'export-occt',
    code: 'feature.invalid-args',
    severity: 'error',
    ...invalidArgsText({ api: INFILL_API, ...spec }),
    nextAction: NEXT_ACTIONS['feature.invalid-args'],
    ...(featureId !== undefined ? { featureId } : {}),
  }],
});

/** The study `fromFea` names and the lowered shape it is bound to. */
function resolveInfillStudy(
  infill: StressInfillExportOptions,
  records: readonly FeatureRecord[],
  shapes: ReadonlyMap<string, unknown>,
): { ok: true; study: FoundFeaStudy; shape: OcctBackend } | Fail {
  const bad = invalidInfillOption(infill);
  if (bad !== undefined) return fail({ path: 'options.infill', got: infill, requires: bad, example: INFILL_EXAMPLE });
  const studies = findFeaStudies(records);
  if (studies.length === 0) {
    return fail({
      path: 'options.infill.fromFea',
      got: infill.fromFea,
      requires: 'a declared study — the script has no shape.feaStudy({ material, fixed, loads }); fix the mounting holes and load the face the force acts on',
      example: STUDY_EXAMPLE,
    });
  }
  const study = selectFeaStudy(studies, infill.fromFea === true ? undefined : infill.fromFea);
  if (study === undefined) {
    return fail({
      path: 'options.infill.fromFea',
      got: infill.fromFea,
      requires: `one of the declared study names: ${studies.map((s) => s.metadata.name).join(', ')} (or true for the last one)`,
      example: `infill: { fromFea: '${studies[studies.length - 1].metadata.name}' }`,
    });
  }
  const shape = shapes.get(study.shapeId);
  if (!(shape instanceof OcctBackend)) {
    return fail({
      path: 'options.infill.fromFea',
      got: study.metadata.name,
      requires: 'a study bound to a shape that builds; fix the errors on that shape first',
      example: STUDY_EXAMPLE,
    }, study.shapeId);
  }
  return { ok: true, study, shape };
}

async function resolveOutDir(outDir: string | undefined): Promise<string> {
  const dir = outDir !== undefined
    ? (isAbsolute(outDir) ? outDir : resolve(outDir))
    : await mkdtemp(join(tmpdir(), 'kernelcad-infill-'));
  await mkdir(dir, { recursive: true });
  return dir;
}

/** One modifier per band above the base band (Orca keys; the writer translates for PrusaSlicer). */
function bandModifiers(result: StressInfillResult): ThreeMfModifier[] {
  return result.bands.flatMap((b, k) => (k === 0 || b.modifier === undefined ? [] : [{
    name: `infill-${b.name}-${b.densityPercent}pct`,
    mesh: b.modifier,
    settings: { sparse_infill_density: `${b.densityPercent}%`, sparse_infill_pattern: result.pattern },
  }]));
}

function bandRows(result: StressInfillResult): InfillBandRow[] {
  return result.bands.map((b, k) => ({
    name: b.name,
    densityPercent: b.densityPercent,
    fromMPa: b.fromMPa,
    toMPa: Number.isFinite(b.toMPa) ? b.toMPa : null,
    stressVolumePercent: b.stressVolumePercent,
    printedVolumePercent: b.printedVolumePercent,
    modifier: k > 0 && b.modifier !== undefined,
  }));
}

/**
 * Solve the study and build the modifier volumes. On failure returns the
 * diagnostics (always with at least one error) and no modifiers.
 */
export async function buildStressInfillExport(
  infill: StressInfillExportOptions,
  records: readonly FeatureRecord[],
  shapes: ReadonlyMap<string, unknown>,
  paramTable: ParamTable | undefined,
  cwd: string | undefined,
  /** Pre-probed toolchain (tests); omitted: probed per run. */
  toolchain?: FeaToolchain,
): Promise<{ ok: true; build: StressInfillBuild; diagnostics: CompilerDiagnostic[] } | Fail> {
  const target = resolveInfillStudy(infill, records, shapes);
  if (!target.ok) return target;
  const { study, shape } = target;
  const outDir = await resolveOutDir(infill.outDir);

  const metadata = infill.meshSize !== undefined ? { ...study.metadata, meshSize: infill.meshSize } : study.metadata;
  const fea = await runFeaStudy(shape, metadata, study.shapeId, records, {
    outDir,
    ...(paramTable !== undefined ? { paramTable } : {}),
    ...(cwd !== undefined ? { cwd } : {}),
    ...(toolchain !== undefined ? { toolchain } : {}),
  });
  const diagnostics = [...fea.diagnostics];
  if (fea.raw === undefined || fea.summary === undefined) {
    // Toolchain missing, selector unresolved, mesh/solve failed: the FEA
    // diagnostics already say which. Never fall back to uniform infill.
    if (!diagnostics.some((d) => d.severity === 'error')) {
      diagnostics.push(solverUnavailable(`3mf export: feaStudy '${study.metadata.name}' produced no stress field; no stress-graded infill was written.`));
    }
    return { ok: false, diagnostics };
  }

  const yieldMPa = fea.summary.material.yield;
  const density = filamentDensity(study.metadata.material);
  const result = buildStressInfill(fea.raw.mesh, fea.raw.fields, yieldMPa, {
    ...(infill.bands !== undefined ? { bands: infill.bands } : {}),
    ...(infill.pattern !== undefined ? { pattern: infill.pattern } : {}),
    ...(infill.cellMm !== undefined ? { cellMm: infill.cellMm } : {}),
    ...(density !== undefined ? { filamentDensityGCm3: density } : {}),
    supportAdjacent: fea.raw.supportAdjacent,
  });
  const { maxVonMisesMPa, maxVonMisesAt, minSafetyFactor, maxDisplacementMm, trust, peakAtSupportMPa } = fea.summary;
  const report: StressInfillReport = {
    study: study.metadata.name,
    pattern: result.pattern,
    cellMm: result.cellMm,
    yieldMPa,
    bands: bandRows(result),
    saving: result.saving,
    fea: {
      maxVonMisesMPa, maxVonMisesAt, minSafetyFactor, maxDisplacementMm, trust,
      ...(peakAtSupportMPa !== undefined ? { peakAtSupportMPa } : {}),
    },
    boundsMm: meshBounds(fea.raw.mesh),
    outDir,
    renderScripts: await writeRenderScripts(fea.raw.mesh, fea.raw.fields, result, outDir),
    note: SOLID_PART_NOTE,
  };
  await writeFile(join(outDir, 'infill-report.json'), JSON.stringify(report, null, 2), 'utf8');
  const base = result.bands[0];
  return {
    ok: true,
    build: {
      modifiers: bandModifiers(result),
      objectSettings: { sparse_infill_density: `${base.densityPercent}%`, sparse_infill_pattern: result.pattern },
      report,
    },
    diagnostics,
  };
}

function meshBounds(mesh: FeaMesh): StressInfillReport['boundsMm'] {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of mesh.nodes.values()) {
    for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], p[a]); max[a] = Math.max(max[a], p[a]); }
  }
  return { min, max };
}

/** Band colours for the printed-infill view: cool (sparse) to hot (dense). */
const BAND_COLORS = ['#9aa5b1', '#f2a33a', '#d7263d', '#7b1fa2', '#1b1b1b'];

/**
 * Write the stress heatmap script (run_fea's own builder) and a printed-bands
 * script: the FEA tets grouped by the band the slicer applies, each group's
 * boundary written as a closed STL body. The groups are clipped to the part
 * exactly, so the view shows where the dense infill lands inside the part.
 */
async function writeRenderScripts(
  mesh: FeaMesh,
  fields: FeaFieldResult,
  result: StressInfillResult,
  outDir: string,
): Promise<StressInfillReport['renderScripts']> {
  const heatDir = join(outDir, 'heatmap');
  await mkdir(heatDir, { recursive: true });
  const heat = await buildHeatmap(mesh, fields, heatDir);

  const bandDir = join(outDir, 'bands');
  await mkdir(bandDir, { recursive: true });
  const bands = await writeBandScript(mesh, result, bandDir, 'infill-bands');

  // Cutaway: the far (+Y) half of the part, cut at mid-width, so the cut
  // face looks at the default hero camera (which sits at -Y) and shows the
  // bands inside the part. Built as capped geometry, not a clip plane.
  const { min, max } = meshBounds(mesh);
  const midY = (min[1] + max[1]) / 2;
  const cutDir = join(outDir, 'cutaway');
  await mkdir(cutDir, { recursive: true });
  const cutaway = await writeBandScript(mesh, result, cutDir, 'infill-cutaway', midY);
  return { heatmap: heat.scriptPath, bands, cutaway };
}

/** Group the tets by printed band and write each group's boundary as a
 *  closed STL, plus the `.kcad.ts` that colours and assembles them. With a
 *  `cutY`, every tet is clipped EXACTLY to y >= cutY (no saw-tooth of whole
 *  tets) and the cut is capped, so the section reads as a clean face. */
async function writeBandScript(
  mesh: FeaMesh,
  result: StressInfillResult,
  dir: string,
  name: string,
  cutY?: number,
): Promise<string> {
  const bands = result.bands;
  // Vertex keys: `n<id>` for a mesh node, `e<a>_<b>` for the point where the
  // edge a-b crosses the cut plane. Shared keys make the faces two clipped
  // neighbours have in common cancel exactly.
  const pos = new Map<string, readonly number[]>();
  const nodeKey = (id: number): string => {
    const k = `n${id}`;
    if (!pos.has(k)) pos.set(k, mesh.nodes.get(id)!);
    return k;
  };
  const edgeKey = (u: number, v: number): string => {
    const [a, b] = u < v ? [u, v] : [v, u];
    const k = `e${a}_${b}`;
    if (!pos.has(k)) {
      const pa = mesh.nodes.get(a)!, pb = mesh.nodes.get(b)!;
      const t = (cutY! - pa[1]) / (pb[1] - pa[1]);
      pos.set(k, [pa[0] + t * (pb[0] - pa[0]), cutY!, pa[2] + t * (pb[2] - pa[2])]);
    }
    return k;
  };
  const kept = (id: number) => cutY === undefined || mesh.nodes.get(id)![1] >= cutY;
  // A face seen twice in one band is interior to the band.
  const faceMaps = bands.map(() => new Map<string, string[] | null>());
  const addFace = (m: Map<string, string[] | null>, poly: string[]) => {
    if (poly.length < 3) return;
    const key = [...poly].sort().join(',');
    m.set(key, m.has(key) ? null : poly);
  };
  for (const [e, el] of mesh.elements.entries()) {
    const c = el.nodes.slice(0, 4);
    const keptCount = c.filter(kept).length;
    if (keptCount === 0) continue;
    const m = faceMaps[result.elementPrintedBand[e]];
    for (const [a, b, d, opp] of [[c[0], c[1], c[2], c[3]], [c[0], c[1], c[3], c[2]], [c[0], c[2], c[3], c[1]], [c[1], c[2], c[3], c[0]]]) {
      // Orient outward: away from the tet's opposite corner.
      const pa = mesh.nodes.get(a)!, pb = mesh.nodes.get(b)!, pd = mesh.nodes.get(d)!, po = mesh.nodes.get(opp)!;
      const ux = pb[0] - pa[0], uy = pb[1] - pa[1], uz = pb[2] - pa[2];
      const vx = pd[0] - pa[0], vy = pd[1] - pa[1], vz = pd[2] - pa[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const dot = nx * (po[0] - pa[0]) + ny * (po[1] - pa[1]) + nz * (po[2] - pa[2]);
      const ring = dot > 0 ? [a, d, b] : [a, b, d];
      if (keptCount === 4) { addFace(m, ring.map(nodeKey)); continue; }
      // Sutherland-Hodgman against y >= cutY; order (and so winding) kept.
      const poly: string[] = [];
      for (let i = 0; i < 3; i++) {
        const p = ring[i], q = ring[(i + 1) % 3];
        if (kept(p)) poly.push(nodeKey(p));
        if (kept(p) !== kept(q)) poly.push(edgeKey(p, q));
      }
      addFace(m, poly);
    }
    if (keptCount < 4) {
      // Cap: the tet's cross-section, wound so its normal points to -Y
      // (out of the kept half).
      const cap: string[] = [];
      for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
          if (kept(c[i]) !== kept(c[j])) cap.push(edgeKey(c[i], c[j]));
        }
      }
      const pts = cap.map((k) => pos.get(k)!);
      const cx = pts.reduce((acc, p) => acc + p[0], 0) / pts.length;
      const cz = pts.reduce((acc, p) => acc + p[2], 0) / pts.length;
      // Counter-clockwise in (z, x) seen from -Y gives a -Y normal.
      const order = cap.map((k, i) => ({ k, ang: Math.atan2(pts[i][0] - cx, pts[i][2] - cz) }))
        .sort((p, q) => p.ang - q.ang).map((o) => o.k);
      addFace(m, order);
    }
  }
  const tri = (poly: string[]) => {
    const out: Array<[readonly number[], readonly number[], readonly number[]]> = [];
    for (let i = 1; i + 1 < poly.length; i++) out.push([pos.get(poly[0])!, pos.get(poly[i])!, pos.get(poly[i + 1])!]);
    return out;
  };
  const legend: string[] = [];
  const parts: string[] = [];
  for (let k = 0; k < bands.length; k++) {
    const tris = [...faceMaps[k].values()].filter((t): t is string[] => t !== null).flatMap(tri);
    if (tris.length === 0) continue;
    const file = `band-${k}-${bands[k].name}.stl`;
    await writeFile(join(dir, file), binaryStl(tris));
    const color = BAND_COLORS[Math.min(k, BAND_COLORS.length - 1)];
    legend.push(`//   ${color}  ${bands[k].name}: ${bands[k].densityPercent}% infill`);
    parts.push(`arm.part('${bands[k].name}-${bands[k].densityPercent}pct', (await lib.fromSTL('./${file}', { allowOpen: true })).color('${color}'));`);
  }
  const script = [
    '// GENERATED by kernelCAD stress-graded infill export.',
    '// Each body is the part volume printed at one infill density.',
    '// Legend:',
    ...legend,
    '',
    `const arm = assembly('${name}');`,
    ...parts,
    'return arm.model();',
    '',
  ].join('\n');
  const path = join(dir, `${name}.kcad.ts`);
  await writeFile(path, script, 'utf8');
  return path;
}

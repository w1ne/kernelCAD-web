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
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { findFeaStudies, selectFeaStudy } from '../../modeling/runtime/fea/findFeaStudies';
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
  /** Infill pattern for every band (Orca/Bambu `sparse_infill_pattern`);
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
  fea: Pick<FeaSummary, 'maxVonMisesMPa' | 'minSafetyFactor' | 'maxDisplacementMm' | 'trust'>;
  /** Part bounds from the FEA mesh, mm (model frame). */
  boundsMm: { min: [number, number, number]; max: [number, number, number] };
  outDir: string;
  /** `.kcad.ts` scripts the MCP layer renders (heatmap, printed bands). */
  renderScripts: { heatmap: string; bands: string };
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

function errorDiag(code: 'feature.invalid-args' | 'fea.solver.unavailable', message: string, featureId?: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code,
    severity: 'error',
    message,
    hint: HINT_TEMPLATES[code].template,
    nextAction: NEXT_ACTIONS[code],
    ...(featureId !== undefined ? { featureId } : {}),
  };
}

/** Parse the user-facing `infill` option; undefined when valid. */
export function invalidInfillOption(infill: unknown): string | undefined {
  if (typeof infill !== 'object' || infill === null) return 'infill must be an object: { fromFea: "<study name>" | true, bands?, pattern? }.';
  const o = infill as Partial<StressInfillExportOptions>;
  if (!(o.fromFea === true || (typeof o.fromFea === 'string' && o.fromFea.length > 0))) {
    return 'infill.fromFea must be a feaStudy name or true (the last declared study).';
  }
  if (o.bands !== undefined) {
    if (!Array.isArray(o.bands)) return 'infill.bands must be an array of { name, fromYield, densityPercent }.';
    const bad = validateInfillBands(o.bands);
    if (bad !== undefined) return bad;
  }
  if (o.pattern !== undefined && (typeof o.pattern !== 'string' || o.pattern.length === 0)) {
    return 'infill.pattern must be an Orca/Bambu sparse_infill_pattern name, e.g. "gyroid".';
  }
  if (o.cellMm !== undefined && !(typeof o.cellMm === 'number' && o.cellMm > 0)) return 'infill.cellMm must be a positive number of mm.';
  if (o.meshSize !== undefined && !(typeof o.meshSize === 'number' && o.meshSize > 0)) return 'infill.meshSize must be a positive number of mm.';
  return undefined;
}

function filamentDensity(material: unknown): number | undefined {
  if (typeof material !== 'string') return undefined;
  const grade = canonicalMaterialName(material);
  return grade === undefined ? undefined : engineeringMaterialProps(grade).densityKgPerM3 / 1000;
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
): Promise<{ ok: true; build: StressInfillBuild; diagnostics: CompilerDiagnostic[] } | { ok: false; diagnostics: CompilerDiagnostic[] }> {
  const bad = invalidInfillOption(infill);
  if (bad !== undefined) return { ok: false, diagnostics: [errorDiag('feature.invalid-args', `3mf export: ${bad}`)] };

  const studies = findFeaStudies(records);
  if (studies.length === 0) {
    return {
      ok: false,
      diagnostics: [errorDiag(
        'feature.invalid-args',
        '3mf export: infill.fromFea needs a declared study. Add shape.feaStudy({ material, fixed, loads }) to the part '
          + '(fix the mounting holes, load the face the force acts on).',
      )],
    };
  }
  const study = selectFeaStudy(studies, infill.fromFea === true ? undefined : infill.fromFea);
  if (study === undefined) {
    return {
      ok: false,
      diagnostics: [errorDiag(
        'feature.invalid-args',
        `3mf export: no feaStudy named '${String(infill.fromFea)}'. Declared studies: ${studies.map((s) => s.metadata.name).join(', ')}.`,
      )],
    };
  }
  const shape = shapes.get(study.shapeId);
  if (!(shape instanceof OcctBackend)) {
    return {
      ok: false,
      diagnostics: [errorDiag('feature.invalid-args', `3mf export: the shape feaStudy '${study.metadata.name}' is bound to did not lower.`, study.shapeId)],
    };
  }

  const outDir = infill.outDir !== undefined
    ? (isAbsolute(infill.outDir) ? infill.outDir : resolve(infill.outDir))
    : await mkdtemp(join(tmpdir(), 'kernelcad-infill-'));
  await mkdir(outDir, { recursive: true });

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
      diagnostics.push(errorDiag('fea.solver.unavailable', `3mf export: feaStudy '${study.metadata.name}' produced no stress field; no stress-graded infill was written.`));
    }
    return { ok: false, diagnostics };
  }

  const yieldMPa = fea.summary.material.yield;
  const result = buildStressInfill(fea.raw.mesh, fea.raw.fields, yieldMPa, {
    ...(infill.bands !== undefined ? { bands: infill.bands } : {}),
    ...(infill.pattern !== undefined ? { pattern: infill.pattern } : {}),
    ...(infill.cellMm !== undefined ? { cellMm: infill.cellMm } : {}),
    ...(filamentDensity(study.metadata.material) !== undefined
      ? { filamentDensityGCm3: filamentDensity(study.metadata.material) }
      : {}),
  });
  const renderScripts = await writeRenderScripts(fea.raw.mesh, fea.raw.fields, result, outDir);

  const modifiers: ThreeMfModifier[] = [];
  result.bands.forEach((b, k) => {
    if (k === 0 || b.modifier === undefined) return;
    modifiers.push({
      name: `infill-${b.name}-${b.densityPercent}pct`,
      mesh: b.modifier,
      settings: { sparse_infill_density: `${b.densityPercent}%`, sparse_infill_pattern: result.pattern },
    });
  });
  const base = result.bands[0];
  const report: StressInfillReport = {
    study: study.metadata.name,
    pattern: result.pattern,
    cellMm: result.cellMm,
    yieldMPa,
    bands: result.bands.map((b, k) => ({
      name: b.name,
      densityPercent: b.densityPercent,
      fromMPa: b.fromMPa,
      toMPa: Number.isFinite(b.toMPa) ? b.toMPa : null,
      stressVolumePercent: b.stressVolumePercent,
      printedVolumePercent: b.printedVolumePercent,
      modifier: k > 0 && b.modifier !== undefined,
    })),
    saving: result.saving,
    fea: {
      maxVonMisesMPa: fea.summary.maxVonMisesMPa,
      minSafetyFactor: fea.summary.minSafetyFactor,
      maxDisplacementMm: fea.summary.maxDisplacementMm,
      trust: fea.summary.trust,
    },
    boundsMm: meshBounds(fea.raw.mesh),
    outDir,
    renderScripts,
    note: SOLID_PART_NOTE,
  };
  await writeFile(join(outDir, 'infill-report.json'), JSON.stringify(report, null, 2), 'utf8');
  return {
    ok: true,
    build: {
      modifiers,
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
): Promise<{ heatmap: string; bands: string }> {
  const heatDir = join(outDir, 'heatmap');
  await mkdir(heatDir, { recursive: true });
  const heat = await buildHeatmap(mesh, fields, heatDir);

  const bandDir = join(outDir, 'bands');
  await mkdir(bandDir, { recursive: true });
  const bands = result.bands;
  // Faces of each band's tets; a face seen once in its band is boundary.
  const faceMaps = bands.map(() => new Map<string, [number, number, number] | null>());
  for (const [e, el] of mesh.elements.entries()) {
    const k = result.elementPrintedBand[e];
    const c = el.nodes.slice(0, 4);
    for (const [a, b, d, opp] of [[c[0], c[1], c[2], c[3]], [c[0], c[1], c[3], c[2]], [c[0], c[2], c[3], c[1]], [c[1], c[2], c[3], c[0]]]) {
      const key = [a, b, d].sort((x, y) => x - y).join(',');
      const m = faceMaps[k];
      if (m.has(key)) { m.set(key, null); continue; }
      // Orient outward: away from the tet's opposite corner.
      const pa = mesh.nodes.get(a)!, pb = mesh.nodes.get(b)!, pd = mesh.nodes.get(d)!, po = mesh.nodes.get(opp)!;
      const ux = pb[0] - pa[0], uy = pb[1] - pa[1], uz = pb[2] - pa[2];
      const vx = pd[0] - pa[0], vy = pd[1] - pa[1], vz = pd[2] - pa[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const dot = nx * (po[0] - pa[0]) + ny * (po[1] - pa[1]) + nz * (po[2] - pa[2]);
      m.set(key, dot > 0 ? [a, d, b] : [a, b, d]);
    }
  }
  const lines: string[] = [];
  for (let k = 0; k < bands.length; k++) {
    const tris = [...faceMaps[k].values()].filter((t): t is [number, number, number] => t !== null)
      .map((t) => t.map((n) => mesh.nodes.get(n)!) as unknown as [number[], number[], number[]]);
    if (tris.length === 0) continue;
    const file = `band-${k}-${bands[k].name}.stl`;
    await writeFile(join(bandDir, file), binaryStl(tris));
    const color = BAND_COLORS[Math.min(k, BAND_COLORS.length - 1)];
    lines.push(`//   ${color}  ${bands[k].name}: ${bands[k].densityPercent}% infill`);
    lines.push(`arm.part('${bands[k].name}-${bands[k].densityPercent}pct', (await lib.fromSTL('./${file}', { allowOpen: true })).color('${color}'));`);
  }
  const legend = lines.filter((l) => l.startsWith('//'));
  const parts = lines.filter((l) => !l.startsWith('//'));
  const script = [
    '// GENERATED by kernelCAD stress-graded infill export.',
    '// Each body is the part volume printed at one infill density.',
    '// Legend:',
    ...legend,
    '',
    "const arm = assembly('stress-graded-infill');",
    ...parts,
    'return arm.model();',
    '',
  ].join('\n');
  const bandsScript = join(bandDir, 'infill-bands.kcad.ts');
  await writeFile(bandsScript, script, 'utf8');
  return { heatmap: heat.scriptPath, bands: bandsScript };
}

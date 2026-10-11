// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tube gate orchestrator. For every `tube` record of a built model:
//
//   - the bend and straight rules of the model's LAST `tubeSpec({...})`
//     (or the defaults, with a `tube.spec.defaulted` warning), its numbers
//     read through the param table, as overridden
//     for the tube's system by the spec's `systems`, with a warning for a
//     `systems` entry that names a system no tube has,
//   - that each end still sits on its port after the assembly is solved, that
//     a part named by a plain end exists and the end touches it, and that no
//     tube shape is carried by two parts,
//   - clearance against the scene's parts and the other tubes, with a warning
//     for a clearance pair that names a system no tube has,
//
// and one line report per tube: bend table, cut length, nearest neighbour,
// mass, internal volume and a pressure-drop estimate.
//
// Resilience. The gate never throws. An exception in one tube's step becomes
// an error `feature.kernel-failed` on that tube (a tube that could not be
// checked must not read as a pass) and the other tubes are still checked.
//
// A tube that is not part of any assembly, and a script with no assembly at
// all, still gets the path rules and a line report; its clearance has only
// the other tubes (and the scene's parts, if there is a scene) to measure.

import type { BuiltModel } from '../../buildModel';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import { TUBE_SPEC_DEFAULTS, type TubeSpecMetadata } from '../../../shared/intent/tubeRecord';
import { bendTableFromPath, type LraRow } from '../../../shared/tube/bendTable';
import { pressureDropKPa, TUBE_FLUIDS } from '../../../shared/tube/pressureDrop';
import type { ParamTable } from '../../../shared/runtime/paramTable';
import type { V3 } from '../../../shared/tube/tubePath';
import { tryResolveMaterial } from '../../properties/materialLibrary';
import { checkTubeClearance, systemsPresent, unusedPairWarnings, type NearestClearance } from './tubeClearance';
import { checkEndParts, checkTubeParts } from './tubeEndParts';
import {
  checkTubeRules, resolveTubeSpec, ruleMust, type InvalidRule, type InvalidSystemRule, type TubeRuleSpec,
} from './tubeRules';
import {
  checkPortPositions, resolveTube, tubeDiagnostic, tubeDiagnosticFromMessage, tubeSceneContext, type ResolvedTube,
} from './tubeScene';

export interface TubeLineReport {
  name: string;
  system?: string;
  /** mm */
  od: number;
  wall: number;
  bendRadius: number;
  material?: string;
  /** Centreline length, mm. */
  cutLength: number;
  bends: number;
  /** Bend-table corner points in the tube's own frame (first point at the
   *  origin, first leg along +X), mm. */
  xyz: V3[];
  lra: LraRow[];
  lastStraight: number;
  /** Shortest straight of the tube, mm. */
  minStraight: number;
  /** Exact nearest part or tube, world frame; `at` is the closest point on
   *  this tube. Against a part that owns one of the tube's ports the distance
   *  excludes the fitting zone. Absent when nothing is around the tube. */
  minClearance?: { mm: number; to: string; at: V3 };
  /** Null when the tube names no known material and no density. */
  massKg: number | null;
  volumeInternalMl: number;
  /** Null when the tube declares no flow. */
  pressureDropKPa: number | null;
}

export interface TubeCheckReport {
  lines: TubeLineReport[];
  /** One row per named system; tubes without a system are not listed. */
  systems: Array<{ system: string; lines: number; cutLength: number; massKg: number | null }>;
  diagnostics: CompilerDiagnostic[];
  usedDefaultSpec: boolean;
  /** Wall time in ms: 'rules', 'ports', 'clearance', 'total'. */
  timings: Record<string, number>;
}

type ResolvedSpec = ReturnType<typeof resolveTubeSpec>;

/** The tubeSpec governing a record list, with its params resolved: the LAST
 *  `tubeSpec` record wins. `invalid` and `invalidRules` list the values that
 *  were replaced. */
export function findTubeSpec(records: readonly FeatureRecord[], table: ParamTable): ResolvedSpec | undefined {
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].kind === 'tubeSpec' && !records[i].suppressed) {
      return resolveTubeSpec(records[i].metadata as unknown as TubeSpecMetadata, table);
    }
  }
  return undefined;
}

function invalidSystemRule({ system, key, value, applied }: InvalidSystemRule): CompilerDiagnostic {
  return tubeDiagnostic('tube.spec.system-rule-invalid',
    `tubeSpec systems '${system}' ${key} resolves to ${value}; it must be ${ruleMust(key)}. The top-level value ${applied} was applied.`);
}

function invalidRule({ rule, value, must, applied }: InvalidRule): CompilerDiagnostic {
  return tubeDiagnostic('tube.spec.rule-invalid', `tubeSpec ${rule} resolves to ${value}; it must be ${must}. ${applied}`);
}

/** Top-level values first: a `systems` message quotes the top-level value that was applied. */
const specDiagnostics = (declared: ResolvedSpec): CompilerDiagnostic[] =>
  [...declared.invalidRules.map(invalidRule), ...declared.invalid.map(invalidSystemRule)];

/** A `systems` entry naming a system no tube has overrides nothing: most
 *  often a misspelt system. A warning, because a shared rule set may carry
 *  entries a script does not use. */
function unusedSystemWarnings(tubes: readonly ResolvedTube[], spec: TubeRuleSpec): CompilerDiagnostic[] {
  const present = systemsPresent(tubes);
  return Object.keys(spec.systems ?? {}).filter((name) => !present.names.includes(name)).map((name) =>
    tubeDiagnostic('tube.spec.system-unused',
      `the tubeSpec rules for system '${name}' apply to no tubes: no tube has system '${name}'. ${present.text}`));
}

/** kg/m^3 from the tube's own density, else its named material; undefined
 *  when neither resolves. */
function densityOf(tube: ResolvedTube): number | undefined {
  if (tube.meta.densityKgM3 !== undefined) return tube.meta.densityKgM3;
  const resolved = tryResolveMaterial(tube.meta.material);
  return resolved.ok ? resolved.material.density : undefined;
}

/** The lowered solid's volume; the section times the cut length when there
 *  is no solid or the kernel cannot measure it. */
function tubeVolumeMm3(tube: ResolvedTube, analytic: number): number {
  try {
    return tube.shape?.volume() ?? analytic;
  } catch {
    return analytic;
  }
}

function massKg(tube: ResolvedTube): number | null {
  const density = densityOf(tube);
  if (density === undefined) return null;
  const bore = tube.od / 2 - tube.wall;
  const section = Math.PI * ((tube.od / 2) ** 2 - bore ** 2);
  return (tubeVolumeMm3(tube, section * tube.path.cutLength) * density) / 1e9;
}

function pressureDrop(tube: ResolvedTube): number | null {
  const flow = tube.meta.flow;
  const fluid = flow === undefined ? undefined : TUBE_FLUIDS[flow.fluid];
  if (flow === undefined || fluid === undefined) return null;
  return pressureDropKPa({
    idMm: tube.od - 2 * tube.wall,
    lengthMm: tube.path.cutLength,
    bendAnglesDeg: tube.path.bends.map((b) => b.angleDeg),
    flowLpm: flow.lpm,
    fluid,
  });
}

function lineReport(tube: ResolvedTube, nearest: NearestClearance | undefined): TubeLineReport {
  const { path, od, wall, meta } = tube;
  const table = bendTableFromPath(path);
  return {
    name: tube.name,
    ...(meta.system !== undefined ? { system: meta.system } : {}),
    od,
    wall,
    bendRadius: path.bendRadius,
    ...(meta.material !== undefined ? { material: meta.material } : {}),
    cutLength: path.cutLength,
    bends: path.bends.length,
    xyz: table.xyz,
    lra: table.lra,
    lastStraight: table.lastStraight,
    minStraight: Math.min(...path.straights),
    ...(nearest !== undefined ? { minClearance: nearest } : {}),
    massKg: massKg(tube),
    volumeInternalMl: (Math.PI * (od / 2 - wall) ** 2 * path.cutLength) / 1000,
    pressureDropKPa: pressureDrop(tube),
  };
}

function summarise(lines: readonly TubeLineReport[]): TubeCheckReport['systems'] {
  const systems = new Map<string, TubeCheckReport['systems'][number]>();
  for (const line of lines) {
    if (line.system === undefined) continue;
    const row = systems.get(line.system) ?? { system: line.system, lines: 0, cutLength: 0, massKg: 0 };
    row.lines += 1;
    row.cutLength += line.cutLength;
    row.massKg = row.massKg === null || line.massKg === null ? null : row.massKg + line.massKg;
    systems.set(line.system, row);
  }
  return [...systems.values()];
}

type GuardedTube = Pick<ResolvedTube, 'id' | 'name'>;

/** The declared tube name of a record that may not resolve. */
function recordTubeName(record: FeatureRecord): string {
  const name = (record.metadata as { tube?: { name?: unknown } } | undefined)?.tube?.name;
  return typeof name === 'string' ? name : record.id;
}

/** An exception inside the gate, as an error on the tube it happened on (or
 *  on the whole gate for `tube === undefined`). Error, not warn: what was not
 *  checked is not verified. */
function gateFailed(tube: GuardedTube | undefined, step: string, e: unknown): CompilerDiagnostic {
  const why = e instanceof Error ? e.message : String(e);
  return {
    target: 'export-occt',
    code: 'feature.kernel-failed',
    severity: 'error',
    ...(tube !== undefined ? { featureId: tube.id } : {}),
    message: tube !== undefined ?
      `tube.gate: ${step} failed on tube '${tube.name}' (${why}); the tube is not verified.` :
      `tube.gate: ${step} failed (${why}); the tubes are not verified.`,
    hint: 'The tube gate could not finish this check. Look at the tube\'s ends, its ports and the parts they sit on for a value that is not a plain number or a shape the kernel cannot measure; the other tubes were still checked.',
  };
}

/**
 * Run the tube gates on a built model. Returns `undefined` when the model has
 * no `tube` records. `model.records` are unresolved: each tube is read
 * through the model's param table before it is checked.
 */
export async function runTubeChecksOnModel(model: BuiltModel): Promise<TubeCheckReport | undefined> {
  const records = model.records.filter((r) => r.kind === 'tube' && !r.suppressed);
  if (records.length === 0) return undefined;
  try {
    return checkTubes(model, records);
  } catch (e) {
    // Nothing per tube caught it (the spec or the scene could not be read): one error for the whole gate.
    return { lines: [], systems: [], diagnostics: [gateFailed(undefined, 'reading the tube spec and the scene', e)],
      usedDefaultSpec: false, timings: {} };
  }
}

function checkTubes(model: BuiltModel, records: readonly FeatureRecord[]): TubeCheckReport {
  const t0 = performance.now();
  const declared = findTubeSpec(model.records, model.session.paramTable);
  const spec: TubeRuleSpec = declared?.spec ?? TUBE_SPEC_DEFAULTS;
  const diagnostics: CompilerDiagnostic[] = declared !== undefined ? specDiagnostics(declared) :
    [tubeDiagnostic('tube.spec.defaulted', `no tubeSpec declared; the default rules were applied to ${records.length} tube(s).`)];
  const ctx = tubeSceneContext(model);
  const guard = <T>(tube: GuardedTube, step: string, fallback: T, run: () => T): T => {
    try {
      return run();
    } catch (e) {
      diagnostics.push(gateFailed(tube, step, e));
      return fallback;
    }
  };
  const tubes = records.flatMap((r) =>
    guard({ id: r.id, name: recordTubeName(r) }, 'resolving the tube', [], () => resolveTube(model, ctx, r)));

  for (const t of tubes) {
    guard(t, 'checking the bend and straight rules', undefined, () => {
      for (const f of checkTubeRules({ name: t.name, path: t.path, od: t.od, meta: t.meta, spec })) {
        diagnostics.push(tubeDiagnosticFromMessage(f.code, f.message, t.id));
      }
    });
  }
  const tRules = performance.now();
  // One pass per check, each tube on its own, so the diagnostics keep their order: parts, ends, port positions.
  for (const t of tubes) guard(t, 'checking the parts that carry it', undefined, () => { diagnostics.push(...checkTubeParts(ctx, [t])); });
  const checked = tubes.map((t) => guard(t, 'checking the parts its ends name', t, () => {
    const ends = checkEndParts(ctx, [t]);
    diagnostics.push(...ends.diagnostics);
    return ends.tubes[0];
  }));
  for (const t of tubes) {
    guard(t, 'checking the port positions', undefined, () => { diagnostics.push(...checkPortPositions(model, ctx, [t])); });
  }
  const tPorts = performance.now();
  diagnostics.push(...unusedSystemWarnings(tubes, spec), ...unusedPairWarnings(tubes, spec));
  let nearest = new Map<string, NearestClearance>();
  try {
    nearest = checkTubeClearance(checked, ctx, spec, diagnostics);
  } catch (e) {
    diagnostics.push(gateFailed(undefined, 'measuring clearance', e));
  }
  const tEnd = performance.now();

  const lines = tubes.flatMap((t) =>
    guard<TubeLineReport[]>(t, 'writing the line report', [], () => [lineReport(t, nearest.get(t.name))]));
  return {
    lines,
    systems: summarise(lines),
    diagnostics,
    usedDefaultSpec: declared === undefined,
    timings: { rules: tRules - t0, ports: tPorts - tRules, clearance: tEnd - tPorts, total: performance.now() - t0 },
  };
}

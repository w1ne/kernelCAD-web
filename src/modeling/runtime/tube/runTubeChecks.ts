// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tube gate orchestrator. For every `tube` record of a built model:
//
//   - the bend and straight rules of the model's LAST `tubeSpec({...})`
//     (or the defaults, with a `tube.spec.defaulted` warning),
//   - that each end still sits on its port after the assembly is solved, and
//     that a part named by a plain end exists,
//   - clearance against the scene's parts and the other tubes,
//
// and one line report per tube: bend table, cut length, nearest neighbour,
// mass, internal volume and a pressure-drop estimate.
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
import type { V3 } from '../../../shared/tube/tubePath';
import { tryResolveMaterial } from '../../properties/materialLibrary';
import { checkTubeClearance, type NearestClearance } from './tubeClearance';
import { checkTubeRules, type TubeRuleSpec } from './tubeRules';
import {
  checkEndParts, checkPortPositions, resolveTube, tubeDiagnostic, tubeDiagnosticFromMessage, tubeSceneContext, type ResolvedTube,
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

/** The tubeSpec governing a record list: the LAST `tubeSpec` record wins. */
export function findTubeSpec(records: readonly FeatureRecord[]): TubeRuleSpec | undefined {
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].kind === 'tubeSpec' && !records[i].suppressed) {
      return records[i].metadata as unknown as TubeSpecMetadata;
    }
  }
  return undefined;
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

/**
 * Run the tube gates on a built model. Returns `undefined` when the model has
 * no `tube` records. `model.records` are unresolved: each tube is read
 * through the model's param table before it is checked.
 */
export async function runTubeChecksOnModel(model: BuiltModel): Promise<TubeCheckReport | undefined> {
  const records = model.records.filter((r) => r.kind === 'tube' && !r.suppressed);
  if (records.length === 0) return undefined;
  const t0 = performance.now();
  const declared = findTubeSpec(model.records);
  const spec: TubeRuleSpec = declared ?? TUBE_SPEC_DEFAULTS;
  const diagnostics: CompilerDiagnostic[] = declared !== undefined ? [] : [tubeDiagnostic('tube.spec.defaulted',
    `no tubeSpec declared; the default rules were applied to ${records.length} tube(s).`)];
  const ctx = tubeSceneContext(model);
  const tubes = records.flatMap((r) => resolveTube(model, ctx, r));

  for (const t of tubes) {
    for (const f of checkTubeRules({ name: t.name, path: t.path, od: t.od, meta: t.meta, spec })) {
      diagnostics.push(tubeDiagnosticFromMessage(f.code, f.message, t.id));
    }
  }
  const tRules = performance.now();
  diagnostics.push(...checkEndParts(ctx, tubes), ...checkPortPositions(model, ctx, tubes));
  const tPorts = performance.now();
  const nearest = checkTubeClearance(tubes, ctx, spec, diagnostics);
  const tEnd = performance.now();

  const lines = tubes.map((t) => lineReport(t, nearest.get(t.name)));
  return {
    lines,
    systems: summarise(lines),
    diagnostics,
    usedDefaultSpec: declared === undefined,
    timings: { rules: tRules - t0, ports: tPorts - tRules, clearance: tEnd - tPorts, total: performance.now() - t0 },
  };
}

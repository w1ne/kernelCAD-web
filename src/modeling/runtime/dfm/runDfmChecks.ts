// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/dfm/runDfmChecks.ts
//
// W3 Task 7 — DFM gate orchestrator. Binds the gates declared by the
// model's LAST `dfmSpec({...})` record to the built model's parts and runs
// the three enforcement primitives:
//
//   - `checkClearance` (Task 4): every unordered part pair of the resolved
//     assembly scene vs `minClearance`, with `ignore`d pairs and mated
//     pairs (derived from `Assembly.__mates()`) exempt. Runs ONLY for
//     assembly models — a single shape has no part pairs.
//   - `checkMinWall` (Task 5): per printed part, when `minWall` is set.
//   - `analyzeVoids` (Task 6): per printed part, ALWAYS — undeclared
//     sealed cavities must be caught even when nothing else is declared.
//     Mouth counting runs only for parts with a declared non-sealed
//     channel (analyzeVoids' zero-cost path otherwise).
//
// Part resolution: the LAST record whose lowered shape is a SceneBackend
// wins (assembly scripts); single-shape scripts fall back to
// `model.rootShape ?? model.tailShape` as one pseudo-part named 'shape' —
// the same name `dfmSpec.channels[].part` documents for them.
//
// Exclusion: `dfmSpec.exclude` entries (literal names or trailing-'*'
// prefix globs; shape guaranteed by capture-time validation) skip min-wall
// and void checks — those gates are about PRINTED geometry. Excluded parts
// still participate in clearance: a vendor part 0.2 mm from a printed part
// is a real assembly problem unless the pair is ignored or mated.
//
// Resilience: a kernel failure anywhere in one part's mesh / min-wall /
// void pipeline downgrades to a warn `feature.kernel-failed` diagnostic and
// the sweep continues — one broken part never hides findings on the others
// (the checkClearance stance). Pairs checkClearance could not measure
// (including pairs touching a part whose up-front clone/transform failed)
// keep their 'unknown' status in `clearance[]` and their warn diagnostics
// in `diagnostics` — they are never silently dropped. Contract: 'unknown'
// pairs and kernel-failed parts stay WARN severity — they surface in the
// report and the CLI summary but do NOT flip the gate's exit code; a
// --strict mode that fails on unknowns is a recorded follow-up.
//
// Frames: min-wall and void topology are COMPUTED on each part's
// local-frame mesh (correct and cheap — thickness and topology are
// rigid-motion invariant), but every location REPORTED in `diagnostics` is
// mapped through the part's FK worldTransform first, so all coordinates in
// the diagnostics array share one world frame with clearance. The raw
// `walls[]` / `voids[]` result structs keep part-LOCAL coordinates (see
// DfmCheckReport).
//
// Diagnostics: one per thin-wall cluster, one per violated clearance pair,
// one error `assembly.interference.overlap` per overlapping ('interfering')
// pair — the overlap ANALYSIS itself belongs to the interference gate, but
// the DFM gate must not pass silently over overlapping parts — one per
// undeclared sealed void, one per channel-openings mismatch (including
// over-declared sealed channels exposed by `detectedSealedVoidCount`).
// Severity, hint, and nextAction come from DIAGNOSTIC_REGISTRY (the dfm.*
// W3 gate codes plus the shared interference code). Per-phase wall time
// lands in `timings` as perf evidence for the CLI/MCP surfaces (Task 8).

import type { BuiltModel } from '../../buildModel';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { DfmSpecMetadata } from '../../../shared/intent/dfmSpecRecord';
import type { CompilerDiagnostic, DiagnosticCode } from '../../../shared/diagnostics/diagnostic';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics/registry';
import { isSceneBackend, type SceneBackend } from '../../../kernel/backends/sceneBackend';
import { meshShapeForExport, type OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { ShapeBackend } from '../../../kernel/backends/backend';
import type { Assembly } from '../../capture/assembly';
import { pairKey } from '../detectInterferences';
import { parseConnectorRef } from '../../mates/mate';
import { Transform } from '../../../shared/runtime/se3';
import { checkClearance, type ClearancePairReport } from './clearance';
import { checkMinWall, MAX_REPORTED_CLUSTERS, type MinWallResult } from './minWall';
import { analyzeVoids, type VoidTopologyResult } from './voidTopology';
import { TriangleBvh } from './meshBvh';

export interface DfmCheckReport {
  /** Every part pair of the scene with its measured status — including
   *  'unknown' (kernel-failed) pairs, which must stay visible. Empty for
   *  single-shape models and when minClearance is not declared. Distances
   *  are world-frame (parts measured under their FK worldTransforms). */
  clearance: ClearancePairReport[];
  /** Min-wall results per printed (non-excluded) part; empty when minWall
   *  is not declared. Cluster locations are part-LOCAL — the frame the mesh
   *  was computed in; apply the part's worldTransform for world coords. The
   *  matching diagnostics already report the same spots in world frame. */
  walls: { part: string; result: MinWallResult }[];
  /** Void/channel topology per printed part — always populated (sealed-void
   *  detection is unconditional). Void/mouth/seed locations are part-LOCAL
   *  (same convention as `walls`); the matching diagnostics report them in
   *  world frame. */
  voids: { part: string; result: VoidTopologyResult }[];
  /** ALL locations embedded in diagnostic messages are WORLD-frame: each
   *  part's FK worldTransform is applied before formatting (identity for
   *  single-shape models), so they compose with clearance findings on
   *  transformed assemblies. */
  diagnostics: CompilerDiagnostic[];
  /** Per-phase wall time (ms): 'clearance', 'mesh', 'walls', 'voids' (each
   *  present only when the phase ran) and 'total'. Perf evidence, surfaced
   *  in --json by Task 8. */
  timings: Record<string, number>;
}

/** Resolve the dfmSpec metadata governing a record list: the LAST 'dfmSpec'
 *  record wins (same convention as setRenderEnvironment). */
export function findDfmSpec(records: readonly FeatureRecord[]): DfmSpecMetadata | undefined {
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].kind === 'dfmSpec') {
      return records[i].metadata as unknown as DfmSpecMetadata;
    }
  }
  return undefined;
}

/**
 * Run every gate declared by the model's dfmSpec. Returns `undefined` when
 * the model declares no dfmSpec — the DFM gates are opt-in. See the module
 * header for part resolution, exclusion, and resilience semantics.
 */
export async function runDfmChecksOnModel(model: BuiltModel): Promise<DfmCheckReport | undefined> {
  const spec = findDfmSpec(model.records);
  if (spec === undefined) return undefined;

  const tStart = performance.now();
  const diagnostics: CompilerDiagnostic[] = [];
  const timings: Record<string, number> = {};
  const { scene, parts } = resolveParts(model);

  validateDeclaredNames(spec, parts.map(p => p.name), diagnostics);

  // --- Clearance (assembly scenes only) ------------------------------------
  let clearance: ClearancePairReport[] = [];
  if (scene !== undefined && spec.minClearance !== undefined) {
    const t0 = performance.now();
    const ignored = new Set(spec.ignore.map(([a, b]) => pairKey(a, b)));
    const mated = matedPairsFor(model, scene);
    // checkClearance appends its own warn diagnostics for 'unknown' pairs.
    clearance = checkClearance(scene, spec.minClearance, ignored, mated, diagnostics);
    timings.clearance = performance.now() - t0;
    for (const r of clearance) {
      if (r.status === 'interfering') {
        // Overlap must fail the gate (Task 8 derives exit from
        // error-severity presence in THIS report), but its analysis belongs
        // to the interference gate — emit the shared code and defer.
        diagnostics.push(emit(
          'assembly.interference.overlap',
          `dfm.clearance: parts '${r.a}' and '${r.b}' overlap (intersection volume not ` +
            'measured here); the interference gate owns overlap analysis — run the ' +
            'interference check for volume and resolution details.',
        ));
        continue;
      }
      if (r.status !== 'violated') continue;
      diagnostics.push(emit(
        'dfm.clearance.violated',
        `dfm.clearance: parts '${r.a}' and '${r.b}' are ${mm(r.distanceMm)} mm apart ` +
          `(< minClearance ${spec.minClearance} mm).`,
      ));
    }
  }

  // --- Per printed part: mesh ONCE, share one BVH across wall + void -------
  const walls: DfmCheckReport['walls'] = [];
  const voids: DfmCheckReport['voids'] = [];
  const excluded = excludeMatcher(spec.exclude);
  let meshMs = 0;
  let wallsMs = 0;
  let voidsMs = 0;
  let meshedAny = false;

  for (const part of parts) {
    if (excluded(part.name)) continue;

    // Reported locations are world-frame: local mesh coords mapped through
    // the part's FK worldTransform (identity for single-shape models).
    const world = (p: readonly [number, number, number]): string =>
      xyz(part.worldTransform.point(p));

    // One try/catch around the part's WHOLE pipeline (mesh + min-wall +
    // void analysis): never abort the sweep on a kernel failure — surface
    // it and keep checking the remaining parts (the checkClearance
    // resilience stance). Kernel-failed parts stay warn severity.
    try {
      const tMesh = performance.now();
      const mesh = meshShapeForExport((part.shape as OcctBackend).getReplicadShape());
      const bvh = new TriangleBvh(mesh);
      meshMs += performance.now() - tMesh;
      meshedAny = true;

      // Min-wall (only when declared).
      if (spec.minWall !== undefined) {
        const t0 = performance.now();
        const result = checkMinWall(mesh, spec.minWall, { bvh });
        wallsMs += performance.now() - t0;
        walls.push({ part: part.name, result });
        result.violations.forEach((v, i) => {
          const note = i === 0 && result.truncated
            ? ` More thin clusters exist; first ${MAX_REPORTED_CLUSTERS} shown.`
            : '';
          diagnostics.push(emit(
            'dfm.wall.too-thin',
            `dfm.minWall: part '${part.name}' has a ${mm(v.thicknessMm)} mm wall ` +
              `(< minWall ${spec.minWall} mm) at ${world(v.location)}; ` +
              `cluster of ${v.sampleCount} sample(s).${note}`,
          ));
        });
      }

      // Void/channel topology (always — undeclared cavities must be caught).
      const partChannels = spec.channels.filter(c => c.part === part.name);
      const nonSealed = partChannels.filter(c => !c.sealed);
      if (nonSealed.length > 1) {
        // analyzeVoids' documented scope limit: ONE non-sealed channel per
        // part; the mouth count binds to the first declaration.
        diagnostics.push(emit(
          'feature.invalid-args',
          `dfmSpec: part '${part.name}' declares ${nonSealed.length} non-sealed channels ` +
            `(${nonSealed.map(c => `'${c.name}'`).join(', ')}); only one non-sealed channel per ` +
            `part is supported — the mouth count binds to '${nonSealed[0].name}'. ` +
            'Merge the declarations or split the part.',
        ));
      }
      const tVoid = performance.now();
      const result = analyzeVoids(mesh, bvh, partChannels);
      voidsMs += performance.now() - tVoid;
      voids.push({ part: part.name, result });

      for (const v of result.sealedVoids) {
        diagnostics.push(emit(
          'dfm.void.undeclared',
          `dfm.voids: part '${part.name}' contains an undeclared sealed void of ` +
            `${v.volumeMm3.toFixed(1)} mm³ at ${world(v.location)}.`,
        ));
      }

      // Over-declared sealed channels: count-based consumption empties
      // sealedVoids, so the PRE-consumption count is the only signal that a
      // declared sealed channel has no matching cavity.
      const sealed = partChannels.filter(c => c.sealed);
      if (sealed.length > result.detectedSealedVoidCount) {
        diagnostics.push(emit(
          'dfm.channel.openings-mismatch',
          `dfm.channels: part '${part.name}' declares ${sealed.length} sealed channel(s) ` +
            `(${sealed.map(c => `'${c.name}'`).join(', ')}) but only ` +
            `${result.detectedSealedVoidCount} sealed cavities were detected — at least one ` +
            'declared sealed channel has no matching cavity in the geometry.',
        ));
      }

      // Mouth-count mismatch for the part's (first) non-sealed channel.
      const open = nonSealed[0];
      const co = result.channelOpenings;
      if (open !== undefined && co !== undefined && co.found !== open.openings) {
        const mouths = co.mouthLocations.length > 0
          ? ` Mouths at ${co.mouthLocations.map(world).join(', ')}.`
          : '';
        const seed = co.channelSeed !== undefined
          ? ` Channel interior near ${world(co.channelSeed)}.`
          : '';
        diagnostics.push(emit(
          'dfm.channel.openings-mismatch',
          `dfm.channels: channel '${open.name}' on part '${part.name}' has ${co.found} ` +
            `mouth opening(s); declared openings: ${open.openings}.${mouths}${seed}`,
        ));
      }
    } catch (e) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.kernel-failed',
        severity: 'warn',
        message:
          `dfm: checking part '${part.name}' failed (${e instanceof Error ? e.message : String(e)}); ` +
          'min-wall and void results for this part are incomplete.',
        hint:
          'The OCCT kernel could not process this part — check it for degenerate geometry with ' +
          'evaluate; the remaining parts were still checked.',
      });
    }
  }

  if (meshedAny) {
    timings.mesh = meshMs;
    timings.voids = voidsMs;
    if (spec.minWall !== undefined) timings.walls = wallsMs;
  }
  timings.total = performance.now() - tStart;

  return { clearance, walls, voids, diagnostics, timings };
}

// --- Resolution helpers -----------------------------------------------------

interface ResolvedPart {
  name: string;
  /** LOCAL-frame shape (the SceneBackend convention). */
  shape: ShapeBackend;
  /** Part-local → world SE(3) from the scene's FK; identity for
   *  single-shape models. Every location REPORTED in diagnostics is mapped
   *  through this so the diagnostics array shares one world frame. */
  worldTransform: Transform;
}

/** Resolve the model's parts: the LAST record whose lowered shape is a
 *  SceneBackend wins; single-shape scripts fall back to
 *  `rootShape ?? tailShape` as one pseudo-part 'shape'. */
function resolveParts(model: BuiltModel): { scene?: SceneBackend; parts: ResolvedPart[] } {
  for (let i = model.records.length - 1; i >= 0; i--) {
    const s = model.shapes.get(model.records[i].id);
    if (isSceneBackend(s)) {
      return {
        scene: s,
        parts: s.parts.map(p => ({
          name: p.name,
          shape: p.shape,
          worldTransform: p.worldTransform,
        })),
      };
    }
  }
  const single = model.rootShape ?? model.tailShape;
  if (single !== undefined) {
    return { parts: [{ name: 'shape', shape: single, worldTransform: Transform.identity() }] };
  }
  return { parts: [] };
}

/** pairKey()-encoded part pairs joined by a declared mate on the assembly
 *  that produced `scene` (matched by name via `session.assemblies`). */
function matedPairsFor(model: BuiltModel, scene: SceneBackend): Set<string> {
  const pairs = new Set<string>();
  const assemblies = Array.from(model.session.assemblies.values()) as Assembly[];
  const arm = assemblies.find(a => a.name === scene.assemblyName);
  for (const m of arm?.__mates() ?? []) {
    const a = parseConnectorRef(m.a).partName;
    const b = parseConnectorRef(m.b).partName;
    if (a !== b) pairs.add(pairKey(a, b));
  }
  return pairs;
}

/** Predicate over `dfmSpec.exclude` entries: literal match, or prefix match
 *  for trailing-'*' globs (the only glob shape capture validation admits). */
function excludeMatcher(exclude: readonly string[]): (name: string) => boolean {
  return (name: string) =>
    exclude.some(e => (e.endsWith('*') ? name.startsWith(e.slice(0, -1)) : name === e));
}

/** Every channels[].part, ignore-pair name, and non-glob exclude literal
 *  must name a real part — emit one feature.invalid-args listing the valid
 *  names otherwise (the W2 unknown-part convention from part-mode export). */
function validateDeclaredNames(
  spec: DfmSpecMetadata,
  partNames: readonly string[],
  diagnostics: CompilerDiagnostic[],
): void {
  const known = new Set(partNames);
  const unknown: string[] = [];
  const flag = (n: string): void => {
    if (!known.has(n) && !unknown.includes(n)) unknown.push(n);
  };
  for (const c of spec.channels) flag(c.part);
  for (const [a, b] of spec.ignore) {
    flag(a);
    flag(b);
  }
  for (const e of spec.exclude) {
    if (!e.endsWith('*')) flag(e);
  }
  if (unknown.length > 0) {
    diagnostics.push(emit(
      'feature.invalid-args',
      `dfmSpec: unknown part name(s): ${unknown.join(', ')}. ` +
        `Valid names: ${partNames.join(', ')}.`,
    ));
  }
}

// --- Formatting / emission helpers -------------------------------------------

function emit(code: DiagnosticCode, message: string): CompilerDiagnostic {
  const entry = DIAGNOSTIC_REGISTRY[code];
  return {
    target: 'export-occt',
    code,
    severity: entry.defaultSeverity,
    message,
    hint: entry.hintTemplate,
    nextAction: entry.nextAction,
  };
}

function mm(v: number): string {
  return v.toFixed(3);
}

function xyz(p: readonly [number, number, number]): string {
  return `(${p.map(c => c.toFixed(1)).join(', ')})`;
}

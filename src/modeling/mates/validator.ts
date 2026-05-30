// src/lib/mates/validator.ts
//
// MVP assembly validator (v0.5). Catches the "parts floating in space"
// class of failure the SO-100 hero exposed: parts that are placed via
// raw translate() with no joint or contact registration. Two checks:
//
//   - part-floating: the part has no `arm.fixed/.revolute/.prismatic/.ball`
//     joint linking it to any other part. The user authored a position
//     but not a connection — the assembly graph is disconnected.
//
//   - part-orphan-from-world: even with joints, the part isn't transitively
//     reachable from the assembly's largest connected component (the
//     "main mechanism"). A sub-cluster floats as a unit.
//
// Interference results are folded in via the optional `interferencePairs`
// input — keeps `kernelcad validate` a single source of truth instead of
// asking agents to run two separate CLIs.
//
// Status enum mirrors Solvespace's solver outcomes (SOLVED / INCONSISTENT /
// DIDNT_CONVERGE / UNDER_CONSTRAINED / REDUNDANT_OKAY) — the v0.5 MVP
// collapsed these to three buckets (solved / warning / error); v0.6 brings
// back the full 5-way classification through `validateAssemblyWithMates`,
// which calls `solveMates(arm)` (see `./solver.ts`) and translates the
// `SolveStatus` into mate-aware diagnostic codes.

import type { Assembly } from '../capture/assembly';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { Vec3 } from '../../shared/intent/types';
import type { DiagnosticCode } from '../../shared/diagnostics/registry';
import type { InterferencePair } from '../runtime/detectInterferences';
import { validateJointAxisBinding } from './jointAxisBinding';
import { validateJointLoadCapacity } from './jointLoadCapacity';
import { parseConnectorRef } from './mate';
import { validateMountingHoleConsistency } from './mountingHoleConsistency';
import type { ConnectorWorkspace, PoseEnvelopeReviewResult } from './poseEnvelope';
import { solveMates } from './solver';
import { validateWorkspaceReachability } from './workspaceReachability';

/**
 * v0.7.4 — per-part external loads pass-through type used by
 * `validateAssemblyWithMates`'s optional 4th arg and by the not-yet-wired
 * Gate 3 (`jointLoadCapacity.ts`, Phase 5). Forces in Newtons (world frame),
 * torques in N·m. Same shape as the `externalLoads` option on
 * `Assembly.solvedModel`.
 */
export type ExternalLoadMap = Readonly<Record<string, { force?: Vec3; torque?: Vec3 }>>;

export type ValidatorStatus =
  | 'solved'
  | 'warning'                    // v0.5 legacy
  | 'error'                      // v0.5 legacy
  | 'under-constrained'          // v0.6 — mate graph leaves residual DOF
  | 'over-constrained'           // v0.6 — mates mutually contradictory
  | 'redundant-ok'               // v0.6 — mates over-determine but agree
  | 'did-not-converge';          // v0.6 — solver iter-cap hit

/**
 * Codes the assembly validator pipeline may attach to a `ValidatorDiagnostic`.
 * Derived from the central `DIAGNOSTIC_REGISTRY` so adding/removing an
 * `assembly.*` code goes through a single source of truth — see
 * `src/shared/diagnostics/registry.ts`. Narrower than `DiagnosticCode`:
 * non-validator codes (visual review, mechanical-plausibility, transmission)
 * stay out of this alias deliberately because the validator does not emit
 * them — they enter the same MCP error-chain through their own pipelines.
 */
export type ValidatorDiagnosticCode = Extract<
  DiagnosticCode,
  | 'assembly.part.floating'
  | 'assembly.part.orphan'
  | 'assembly.interference.overlap'
  | 'assembly.part.under-constrained'
  | 'assembly.mate.over-constrained'
  | 'assembly.mate.type-mismatch'
  | 'assembly.mate.connector-not-found'
  | 'assembly.loop.unclosed'
  | 'assembly.solver.did-not-converge'
  | 'assembly.pose.out-of-limits'
  | 'assembly.pose-envelope.solve-failed'
  | 'assembly.pose-envelope.interference'
  | 'assembly.pose-envelope.connector-unresolved'
  | 'assembly.mate.limit-missing'
  | 'assembly.mounting-hole.mismatch'
  | 'assembly.joint-axis.unbound'
  | 'assembly.joint.load-exceeded'
  | 'assembly.workspace.unreachable'
>;

export interface ValidatorDiagnostic {
  readonly code: ValidatorDiagnosticCode;
  /**
   * Severity tier. v0.5 ships `warning` / `error`; v0.6 adds `info` for
   * the `redundant-ok` case (mates over-determine the assembly but agree —
   * mechanically valid, but worth surfacing so users can prune redundant
   * mates without solver penalty). Severity stays decoupled from
   * `ValidatorStatus`: status is the assembly-level verdict, severity is
   * the per-diagnostic urgency.
   */
  readonly severity: 'info' | 'warning' | 'error';
  readonly message: string;
  readonly hint: string;
  /** Set when the diagnostic targets a single part. */
  readonly partName?: string;
  /** Set when the diagnostic targets a single mate (v0.6). */
  readonly mateName?: string;
  /** Set on interference diagnostics. */
  readonly partA?: string;
  readonly partB?: string;
  readonly volumeMm3?: number;
  // v0.6.2 — envelope-fold additions. Carried 1:1 from
  // `PoseEnvelopeDiagnostic`; set only on diagnostics with code
  // `assembly.pose.*` / `assembly.pose-envelope.*`.
  readonly sampleName?: string;
  readonly pose?: number | readonly [number, number, number];
  readonly limits?: readonly [number, number];
  readonly connectorRef?: string;
}

export interface ValidatorResult {
  readonly status: ValidatorStatus;
  readonly diagnostics: readonly ValidatorDiagnostic[];
  /** Total parts considered (assembly parts only). */
  readonly partCount: number;
  /** Number of joints declared. */
  readonly jointCount: number;
}

export interface ValidateAssemblyInput {
  readonly records: readonly FeatureRecord[];
  /** Optional: results from `checkInterference()`. Folded into the
   *  diagnostic stream as `assembly.interference.overlap` items. */
  readonly interferencePairs?: readonly InterferencePair[];
  /**
   * Optional list of part-name pairs whose interferences are known-acceptable
   * (e.g. a knuckle joint where the two arm parts must touch by design).
   * Matching is SYMMETRIC: `[a, b]` silences both `(a, b)` and `(b, a)`.
   *
   * Pairs in `ignore` are filtered OUT of the validator's
   * `assembly.interference.overlap` diagnostic stream — they don't throw under
   * `validate: 'error'` and don't appear in `scene.warnings` under
   * `validate: 'warn'`. The raw `interferencePairs` are NOT mutated; only the
   * downstream diagnostic emission is filtered. Callers that want the raw
   * pairs (e.g. the Studio HUD) should consume the unfiltered detection output
   * directly, not the validator's diagnostics.
   */
  readonly ignore?: ReadonlyArray<readonly [string, string]>;
}

/**
 * Returns true when `(a, b)` is symmetrically present in `ignoreList`.
 * `[a, b]` and `[b, a]` both match. Exported so other modules
 * (e.g. `Assembly.solvedModel`'s validator hand-off) can reuse the same
 * symmetric semantics without re-implementing them.
 */
export function isPairIgnored(
  a: string,
  b: string,
  ignoreList: ReadonlyArray<readonly [string, string]> | undefined,
): boolean {
  if (!ignoreList || ignoreList.length === 0) return false;
  for (const pair of ignoreList) {
    if ((pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)) return true;
  }
  return false;
}

/** Run all MVP checks. Returns a status + diagnostic chain. Pure: no I/O. */
export function validateAssembly(input: ValidateAssemblyInput): ValidatorResult {
  const parts = collectParts(input.records);
  const joints = collectJoints(input.records);
  // v0.6 mates flow into the record stream via solvedAssembly metadata
  // (Assembly.solvedModel records its mate list there for the lowerer). Walk
  // those so the floating-part gate sees mate-only assemblies as connected.
  // Without this, Exp-B/C/D agents repeatedly saw spurious "floating"
  // warnings on otherwise-correct mate-only graphs (ball-joint, gear-pair,
  // robotic-arm, screw-in-block — surfaced 4× in the agent eval batches).
  const mateEdges = collectMateEdges(input.records);
  const diagnostics: ValidatorDiagnostic[] = [];

  // Build an undirected adjacency map: part name -> set of neighbour names.
  const adj = new Map<string, Set<string>>();
  for (const p of parts) adj.set(p.partName, new Set());
  for (const j of joints) {
    const a = j.aPartName, b = j.bPartName;
    if (!a || !b) continue;
    adj.get(a)?.add(b);
    adj.get(b)?.add(a);
  }
  for (const [a, b] of mateEdges) {
    if (!adj.has(a) || !adj.has(b)) continue;
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  }

  // Check 1 — floating parts (zero joints).
  for (const p of parts) {
    if ((adj.get(p.partName)?.size ?? 0) === 0) {
      diagnostics.push({
        code: 'assembly.part.floating',
        severity: 'warning',
        message: `Part '${p.partName}' has no joint connecting it to any other part.`,
        hint: `invalid-args.assembly.floating-part — declare a connection via arm.mate('${p.partName}-mount', '${p.partName}.<connector>', '<other>.<connector>', 'fastened') (or 'revolute' / 'prismatic' / 'ball' as appropriate) so the assembly graph reflects how parts actually mate.`,
        partName: p.partName,
      });
    }
  }

  // Check 2 — orphan from main component. Skip when there are <2 parts
  // (single-part assemblies are trivially connected).
  if (parts.length >= 2) {
    const components = connectedComponents(parts.map((p) => p.partName), adj);
    if (components.length > 1) {
      // The largest component is the "main mechanism". Everyone else is
      // orphaned. Tie-break by part-declaration order (first component
      // containing the first-declared part wins).
      const firstPartName = parts[0].partName;
      const mainIdx = components.findIndex((c) => c.has(firstPartName));
      for (let i = 0; i < components.length; i++) {
        if (i === mainIdx) continue;
        for (const name of components[i]) {
          // Skip parts already flagged as floating — they're the special
          // case "component of size 1", and the floating diagnostic is
          // more actionable.
          if ((adj.get(name)?.size ?? 0) === 0) continue;
          diagnostics.push({
            code: 'assembly.part.orphan',
            severity: 'warning',
            message: `Part '${name}' is in a sub-assembly disconnected from the main mechanism.`,
            hint: `invalid-args.assembly.orphan-cluster — add a joint linking this sub-assembly to a part in the main mechanism (which contains '${firstPartName}').`,
            partName: name,
          });
        }
      }
    }
  }

  // Check 3 — interference (promoted from checkInterference). Errors,
  // not warnings, because solid bodies sharing volume is mechanically
  // invalid (vs floating, which is a missing-information warning).
  //
  // The optional `ignore` list silences known-acceptable contacts (e.g. a
  // knuckle joint where two arm parts touch by design). Matching is
  // SYMMETRIC — `[a, b]` filters both `(a, b)` and `(b, a)` — and applies
  // only to the diagnostic emission below; the raw `interferencePairs` the
  // caller passed in remain untouched so HUD-style consumers can still read
  // them via the unfiltered detection output.
  for (const pair of input.interferencePairs ?? []) {
    if (isPairIgnored(pair.a, pair.b, input.ignore)) continue;
    diagnostics.push({
      code: 'assembly.interference.overlap',
      severity: 'error',
      message: `Parts '${pair.a}' and '${pair.b}' overlap by ${pair.volumeMm3.toFixed(2)} mm³.`,
      hint: `invalid-args.assembly.interference — translate one part along its mating direction, or add a coupling part (washer / spacer / bracket) to clear the overlap. Pass { ignore: [['${pair.a}', '${pair.b}']] } to assembly.solvedModel(...) if the contact is intentional.`,
      partA: pair.a,
      partB: pair.b,
      volumeMm3: pair.volumeMm3,
    });
  }

  const hasError = diagnostics.some((d) => d.severity === 'error');
  const hasWarning = diagnostics.some((d) => d.severity === 'warning');
  const status: ValidatorStatus = hasError ? 'error' : hasWarning ? 'warning' : 'solved';

  return {
    status,
    diagnostics,
    partCount: parts.length,
    jointCount: joints.length,
  };
}

interface PartInfo { partName: string; recordId: string; }
interface JointInfo { jointName: string; aPartName?: string; bPartName?: string; }

function collectParts(records: readonly FeatureRecord[]): PartInfo[] {
  const out: PartInfo[] = [];
  for (const r of records) {
    if (r.kind !== 'assemblyPart') continue;
    const meta = r.metadata as { partName?: string } | undefined;
    const partName = meta?.partName;
    if (typeof partName === 'string') out.push({ partName, recordId: r.id });
  }
  return out;
}

/**
 * Walk `solvedAssembly` records and pull v0.6 mate edges into a flat list
 * of `[aPartName, bPartName]` pairs. Mate refs are `'partName.connectorName'`
 * strings; we slice off the connector and keep the part. Returns [] when no
 * solvedAssembly record carries mates (v0.5-only assemblies or pre-solve
 * record streams).
 */
function collectMateEdges(records: readonly FeatureRecord[]): readonly (readonly [string, string])[] {
  const out: [string, string][] = [];
  for (const r of records) {
    if (r.kind !== 'solvedAssembly') continue;
    const meta = r.metadata as { mates?: ReadonlyArray<{ a: string; b: string }> } | undefined;
    const mates = meta?.mates;
    if (!Array.isArray(mates)) continue;
    for (const m of mates) {
      const a = typeof m.a === 'string' ? m.a.split('.')[0] : undefined;
      const b = typeof m.b === 'string' ? m.b.split('.')[0] : undefined;
      if (a && b) out.push([a, b]);
    }
  }
  return out;
}

function collectJoints(records: readonly FeatureRecord[]): JointInfo[] {
  const partNameById = new Map<string, string>();
  for (const r of records) {
    if (r.kind !== 'assemblyPart') continue;
    const meta = r.metadata as { partName?: string } | undefined;
    if (typeof meta?.partName === 'string') partNameById.set(r.id, meta.partName);
  }
  const out: JointInfo[] = [];
  for (const r of records) {
    if (r.kind !== 'assemblyJoint') continue;
    const meta = r.metadata as { jointName?: string } | undefined;
    const a = r.inputs.a, b = r.inputs.b;
    const aId = a && 'id' in a ? a.id : undefined;
    const bId = b && 'id' in b ? b.id : undefined;
    out.push({
      jointName: meta?.jointName ?? '<unnamed>',
      aPartName: aId ? partNameById.get(aId) : undefined,
      bPartName: bId ? partNameById.get(bId) : undefined,
    });
  }
  return out;
}

/**
 * v0.6 mate-aware validator entry point.
 *
 * Composes the v0.5 `validateAssembly(input)` checks (floating / orphan /
 * interference) with the v0.6 mate-graph solver (`solveMates(arm)`) so a
 * single call surfaces both authoring-level wiring mistakes and
 * numeric-level mate inconsistencies. Pass an `Assembly` captured via
 * `kcad.assembly(name)` — the function reads the session's records (so
 * v0.5-style `arm.fixed/.revolute/.prismatic/.ball` joints continue to be
 * checked) AND walks `arm.__mates()` through `solveMates` for the new
 * mate-pair vocabulary.
 *
 * Capture-time codes (`assembly.mate.type-mismatch`,
 * `assembly.mate.connector-not-found`) are NOT emitted here — those raise
 * `KernelError` synchronously inside `Assembly.mate(...)`, so the assembly
 * fails to construct and never reaches the validator. The codes remain in
 * `ValidatorDiagnosticCode` so external tools (lowerer, MCP) can reference
 * them when echoing structured error chains.
 *
 * Status resolution (most severe wins, see ValidatorStatus docstring):
 *   - any `severity:'error'` diagnostic       → 'error' (preserves v0.5)
 *   - SolveStatus 'over-constrained'          → 'over-constrained'
 *   - SolveStatus 'did-not-converge'          → 'did-not-converge'
 *   - SolveStatus 'under-constrained' OR any
 *     `assembly.part.under-constrained` diag  → 'under-constrained'
 *   - SolveStatus 'redundant-ok'              → 'redundant-ok'
 *   - any v0.5 warning                        → 'warning'
 *   - no diagnostics                          → 'solved'
 */
export async function validateAssemblyWithMates(
  arm: Assembly,
  interferencePairs?: readonly InterferencePair[],
  poseEnvelopeResult?: PoseEnvelopeReviewResult,
  // v0.7.4 — per-part external loads consumed by Gate 3
  // (`validateJointLoadCapacity`). When undefined, Gate 3 fast-returns and
  // no `assembly.joint.load-exceeded` diagnostics are emitted regardless of
  // declared `maxLoad`. See `validateJointLoadCapacity` for the gate's
  // per-mate-type semantics.
  externalLoads?: ExternalLoadMap,
  // v0.7 Slice 1 — sampled connector workspaces consumed by
  // `validateWorkspaceReachability`. Passed separately from
  // `poseEnvelopeResult` so the workspace gate can read AABBs without
  // pulling the envelope's diagnostic stream through the validator's
  // double-fold (assembly.ts:1388 deliberately keeps envelope diagnostics
  // in their own bucket; the workspace gate's diagnostics are domain-distinct
  // and folded into the validator stream normally). When undefined AND the
  // assembly has workspace targets, the gate emits info-severity diagnostics
  // pointing the agent at `posesGate: 'envelope'`.
  connectorWorkspace?: readonly ConnectorWorkspace[],
  // Known-acceptable interference pairs to filter out of the
  // `assembly.interference.overlap` diagnostic stream. Symmetric matching:
  // `[a, b]` silences both `(a, b)` and `(b, a)`. The raw
  // `interferencePairs` argument is NOT mutated — only the validator's
  // diagnostic emission is filtered, so HUD-style consumers can still read
  // the unfiltered detection output. See `Assembly.solvedModel`'s `ignore`
  // option for the user-facing entry point.
  ignoreInterference?: ReadonlyArray<readonly [string, string]>,
): Promise<ValidatorResult> {
  // 1. Run the v0.5 base checks (floating / orphan / interference). Reuse
  //    the same code path — do not duplicate. Filter the session's records
  //    to just this assembly so cross-assembly state doesn't leak in.
  const allRecords = arm.__session().getRecords();
  const records = allRecords.filter((r) => {
    const meta = r.metadata as { assemblyName?: string } | undefined;
    return meta?.assemblyName === arm.name;
  });
  const base = validateAssembly({
    records,
    ...(interferencePairs !== undefined ? { interferencePairs } : {}),
    ...(ignoreInterference !== undefined ? { ignore: ignoreInterference } : {}),
  });

  // 2. Build the diagnostics chain starting from v0.5 results. We may
  //    add v0.6 diagnostics below; we may also drop the v0.5 'floating'
  //    diagnostic for a part if a mate (rather than a joint) connects it
  //    — `validateAssembly` only sees v0.5 joints, so a part connected
  //    purely via mates looks floating to it. Suppress those.
  const matePartNames = new Set<string>();
  for (const m of arm.__mates()) {
    const a = safeParse(m.a);
    const b = safeParse(m.b);
    if (a) matePartNames.add(a);
    if (b) matePartNames.add(b);
  }
  const diagnostics: ValidatorDiagnostic[] = base.diagnostics.filter((d) => {
    if (d.code === 'assembly.part.floating' && d.partName && matePartNames.has(d.partName)) {
      return false; // part is connected via a mate; v0.5 just couldn't see it.
    }
    return true;
  });

  // 3. Run the v0.6 mate solver. If there are no mates declared, skip — the
  //    solver returns 'solved' on an empty mate set anyway, but the early
  //    exit keeps `validateAssemblyWithMates` cheap for v0.5-only scenes
  //    (regression check: legacy `arm.fixed` callers see identical output).
  if (arm.__mates().length === 0) {
    // No mates means no envelope to fold and no articulated mates to
    // check for limits — but be defensive and still fold the envelope
    // diagnostics if a caller hands us a result for an empty assembly.
    foldEnvelopeDiagnostics(diagnostics, poseEnvelopeResult);
    return finalizeResult(diagnostics, arm.__parts().length, arm.__joints().length, null);
  }

  const solveResult = await solveMates(arm);

  // 4. Translate SolveStatus → v0.6 diagnostics.
  switch (solveResult.status) {
    case 'solved':
      // Nothing to add.
      break;
    case 'under-constrained':
      // The solver doesn't currently identify WHICH parts have residual
      // DOF (T6/T7's SolveResult shape is `{ status, poses, iterations? }`;
      // no per-part DOF map). For now emit a single assembly-scoped
      // diagnostic; the per-part breakdown lands when SolveResult grows
      // a `underConstrainedParts` field in T7.x. Surfacing the
      // assembly-level fact is strictly better than silently dropping it,
      // and the hint points users at the actionable fix (add a mate /
      // tighten a constraint).
      diagnostics.push({
        code: 'assembly.part.under-constrained',
        severity: 'warning',
        message: `Assembly '${arm.name}' is under-constrained — the mate graph leaves residual degrees of freedom.`,
        hint: `invalid-args.assembly.under-constrained — add a mate (arm.mate('...', 'partA.connector', 'partB.connector', '<type>')) or tighten an existing mate so every part has its 6 DOF removed.`,
      });
      break;
    case 'over-constrained':
      diagnostics.push({
        code: 'assembly.mate.over-constrained',
        severity: 'error',
        message: `Assembly '${arm.name}' is over-constrained — at least one mate contradicts the others (loop-closure residual exceeds tolerance).`,
        hint: `invalid-args.assembly.over-constrained — remove or relax one of the mates in the closed loop, or adjust a connector origin so the geometry agrees with the other mates.`,
      });
      break;
    case 'redundant-ok':
      diagnostics.push({
        code: 'assembly.mate.over-constrained',
        severity: 'info',
        message: `Assembly '${arm.name}' has redundant mates that agree — mechanically valid but the extra mates carry no information.`,
        hint: `invalid-args.assembly.redundant-mate — drop one mate from the closed loop if you want a minimal mate graph; otherwise no action needed.`,
      });
      break;
    case 'did-not-converge':
      diagnostics.push({
        code: 'assembly.solver.did-not-converge',
        severity: 'error',
        message: `Assembly '${arm.name}' did not converge within the solver iteration cap (${solveResult.iterations ?? 0} iterations).`,
        hint: `invalid-args.assembly.did-not-converge — articulated closed loops are not yet supported by the v0.6.0 solver (lands in T7.x); for v0.6.0, restrict closed loops to fastened-only mates.`,
      });
      break;
    default: {
      const _exhaustive: never = solveResult.status;
      throw new Error(`validateAssemblyWithMates: unhandled SolveStatus '${String(_exhaustive)}'.`);
    }
  }

  // 5. v0.6.2 — fold envelope diagnostics (Gap 1 from the spec). Called
  //    automatically by `Assembly.solvedModel({validate:'error'})` when at
  //    least one mate has scalar limits; external callers (CLI, MCP) can
  //    pass a `reviewPoseEnvelope` result explicitly. Codes carried 1:1.
  foldEnvelopeDiagnostics(diagnostics, poseEnvelopeResult);

  // 6. v0.6.2 — emit assembly.mate.limit-missing warning per articulated
  //    mate without declared limits (Gap 4). The pose-envelope sampler
  //    only walks mates whose `limitsDeg ?? limitsMm` is defined; a mate
  //    without limits is invisible to envelope review, which is a silent
  //    correctness hole for agents (the mechanism could still collide
  //    somewhere in its undeclared travel range). Surface that explicitly
  //    so callers either declare limits or accept the partial check.
  //
  //    Fastened/planar mates are 0-DOF (or planar's 3 in-plane DOFs are
  //    not pose-driven), so they are exempt. Ball mates exposed via the
  //    per-axis Euler triple are also exempt — `buildPoseEnvelopeSamples`
  //    only reads scalar `limitsDeg ?? limitsMm`, and the `MateRecord`
  //    schema stores the ball triple in a different field (see mate.ts).
  //    If a ball mate's scalar `limitsDeg` field is undefined, the check
  //    below treats it as exempt; if a future schema change merges the
  //    triple into scalar `limitsDeg`, this check will need to inspect
  //    the field's shape.
  for (const mate of arm.__mates()) {
    if (mate.type === 'fastened' || mate.type === 'planar' || mate.type === 'ball') continue;
    if (mate.limitsDeg !== undefined || mate.limitsMm !== undefined) continue;
    diagnostics.push({
      code: 'assembly.mate.limit-missing',
      severity: 'warning',
      mateName: mate.name,
      message: `Mate '${mate.name}' (${mate.type}) has no declared limits; envelope check cannot verify its travel range.`,
      hint: `invalid-args.assembly.mate-limit-missing — declare limitsDeg:[min,max] (or limitsMm for prismatic) on '${mate.name}' so the kernel can verify the mechanism does not self-collide across its declared range.`,
    });
  }

  // 7. v0.7.4 — kinematic grounding gates. Run order: cheap pure gates first
  //    (Gate 3, Gate 1), expensive BREP gate last (Gate 2) so an earlier
  //    error can short-circuit when desired. For now we run all three so the
  //    agent sees the full picture per single solvedModel call (per plan
  //    Step 2 — no short-circuit, agent gets full diagnostic chain).
  diagnostics.push(...validateJointLoadCapacity(arm, externalLoads));
  diagnostics.push(...validateMountingHoleConsistency(arm));
  diagnostics.push(...await validateJointAxisBinding(arm));

  // 8. v0.7 Slice 1 — workspace-reachability gate. Pure: takes the sampled
  //    `ConnectorWorkspace[]` produced by `reviewPoseEnvelope` and checks
  //    each `arm.workspace(...)` declared target against the matching AABB
  //    (minus toleranceMm). Emits `assembly.workspace.unreachable` (error)
  //    per out-of-range target, OR an info-severity hint per declaration
  //    when no envelope was sampled (gate inert).
  diagnostics.push(...validateWorkspaceReachability(arm, connectorWorkspace));

  return finalizeResult(
    diagnostics,
    arm.__parts().length,
    arm.__joints().length,
    solveResult.status,
  );
}

/**
 * v0.6.2 — fold `PoseEnvelopeDiagnostic` entries into the validator's
 * diagnostic stream 1:1. Codes are part of `ValidatorDiagnosticCode` so
 * downstream consumers (lowerer, MCP error-chain echoes, the
 * `validate:'error'` throw path on `Assembly.solvedModel`) get a single
 * pipe of structured failure info. No severity escalation: warnings stay
 * warnings, errors stay errors.
 */
function foldEnvelopeDiagnostics(
  out: ValidatorDiagnostic[],
  envelope: PoseEnvelopeReviewResult | undefined,
): void {
  if (!envelope) return;
  for (const ed of envelope.diagnostics) {
    // Skip codes that don't belong in the validator union (defensive: the
    // `gripper-aperture.connector-missing` envelope code is not folded —
    // it's a UX-layer aperture-tracking diagnostic, not a structural
    // validity concern).
    if (ed.code === 'assembly.gripper-aperture.connector-missing') continue;
    out.push({
      code: ed.code,
      severity: ed.severity,
      message: ed.message,
      hint: ed.hint,
      ...(ed.sampleName !== undefined ? { sampleName: ed.sampleName } : {}),
      ...(ed.mateName !== undefined ? { mateName: ed.mateName } : {}),
      ...(ed.pose !== undefined ? { pose: ed.pose } : {}),
      ...(ed.limits !== undefined ? { limits: ed.limits } : {}),
      ...(ed.partA !== undefined ? { partA: ed.partA } : {}),
      ...(ed.partB !== undefined ? { partB: ed.partB } : {}),
      ...(ed.volumeMm3 !== undefined ? { volumeMm3: ed.volumeMm3 } : {}),
      ...(ed.connectorRef !== undefined ? { connectorRef: ed.connectorRef } : {}),
    });
  }
}

/** Parse `"part.connector"` safely (returns undefined on malformed refs
 *  instead of throwing — the validator's job is to report, not to fail). */
function safeParse(ref: string): string | undefined {
  try {
    return parseConnectorRef(ref).partName;
  } catch {
    return undefined;
  }
}

/**
 * Compute the final `ValidatorStatus` from the diagnostic chain plus the
 * upstream mate solver verdict. Most-severe-wins (see
 * `validateAssemblyWithMates` JSDoc for the precedence table).
 */
function finalizeResult(
  diagnostics: readonly ValidatorDiagnostic[],
  partCount: number,
  jointCount: number,
  solveStatus: import('./solver').SolveStatus | null,
): ValidatorResult {
  const hasError = diagnostics.some((d) => d.severity === 'error');
  const hasWarning = diagnostics.some((d) => d.severity === 'warning');

  let status: ValidatorStatus;
  if (hasError) {
    // v0.5 errors win over solver-status. But: if the only error is the
    // 'over-constrained' / 'did-not-converge' one we just emitted, surface
    // those specific statuses (not the generic 'error' bucket) — they
    // carry more information for the agent.
    if (solveStatus === 'over-constrained') status = 'over-constrained';
    else if (solveStatus === 'did-not-converge') status = 'did-not-converge';
    else status = 'error';
  } else if (solveStatus === 'under-constrained') {
    status = 'under-constrained';
  } else if (solveStatus === 'redundant-ok') {
    status = 'redundant-ok';
  } else if (hasWarning) {
    status = 'warning';
  } else {
    status = 'solved';
  }

  return { status, diagnostics, partCount, jointCount };
}

function connectedComponents(
  nodes: readonly string[],
  adj: Map<string, Set<string>>,
): Set<string>[] {
  const visited = new Set<string>();
  const out: Set<string>[] = [];
  for (const start of nodes) {
    if (visited.has(start)) continue;
    const component = new Set<string>();
    const stack = [start];
    while (stack.length > 0) {
      const n = stack.pop()!;
      if (visited.has(n)) continue;
      visited.add(n);
      component.add(n);
      for (const nb of adj.get(n) ?? []) {
        if (!visited.has(nb)) stack.push(nb);
      }
    }
    out.push(component);
  }
  return out;
}

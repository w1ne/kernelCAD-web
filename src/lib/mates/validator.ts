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
// DIDNT_CONVERGE / UNDER_CONSTRAINED / REDUNDANT_OKAY) collapsed to the
// three buckets that matter for an MVP without a numerical solver.

import type { FeatureRecord } from '../../intent/featureRecord';
import type { InterferencePair } from '../../script-runtime/checkInterference';

export type ValidatorStatus = 'solved' | 'warning' | 'error';

export type ValidatorDiagnosticCode =
  | 'assembly.part.floating'
  | 'assembly.part.orphan'
  | 'assembly.interference.overlap';

export interface ValidatorDiagnostic {
  readonly code: ValidatorDiagnosticCode;
  readonly severity: 'warning' | 'error';
  readonly message: string;
  readonly hint: string;
  /** Set when the diagnostic targets a single part. */
  readonly partName?: string;
  /** Set on interference diagnostics. */
  readonly partA?: string;
  readonly partB?: string;
  readonly volumeMm3?: number;
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
}

/** Run all MVP checks. Returns a status + diagnostic chain. Pure: no I/O. */
export function validateAssembly(input: ValidateAssemblyInput): ValidatorResult {
  const parts = collectParts(input.records);
  const joints = collectJoints(input.records);
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

  // Check 1 — floating parts (zero joints).
  for (const p of parts) {
    if ((adj.get(p.partName)?.size ?? 0) === 0) {
      diagnostics.push({
        code: 'assembly.part.floating',
        severity: 'warning',
        message: `Part '${p.partName}' has no joint connecting it to any other part.`,
        hint: `invalid-args.assembly.floating-part — declare a connection via arm.fixed('${p.partName}-mount', '${p.partName}', '<other>') or arm.revolute(...) so the assembly graph reflects how parts actually mate.`,
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
  for (const pair of input.interferencePairs ?? []) {
    diagnostics.push({
      code: 'assembly.interference.overlap',
      severity: 'error',
      message: `Parts '${pair.a}' and '${pair.b}' overlap by ${pair.volumeMm3.toFixed(2)} mm³.`,
      hint: `invalid-args.assembly.interference — translate one part along its mating direction, or add a coupling part (washer / spacer / bracket) to clear the overlap. Use --ignore '${pair.a},${pair.b}' on kernelcad interference if the contact is intentional.`,
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

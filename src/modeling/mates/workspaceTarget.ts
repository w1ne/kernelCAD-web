// src/modeling/mates/workspaceTarget.ts
//
// v0.7 Slice 1 — declarative workspace-reachability targets.
//
// Spec: `2026-05-15-v0.7-kinematic-grounding-design.md` §workspace-reachability.
//
// Agents declare "this connector must be able to reach these world-frame
// points across its sampled pose envelope" via:
//
//   arm.workspace('elbow_tip', {
//     reachable: [[200, 0, 100], [0, 200, 100], [-200, 0, 100]],
//     toleranceMm: 5, // optional, default 5
//   });
//
// The capture-time call validates shape only — the actual reachability
// check runs in `validateWorkspaceReachability` against the sampled
// `ConnectorWorkspace` produced by `reviewPoseEnvelope`.
//
// This is the FIRST shipped data shape on the v0.7 kinematic-grounding
// workstream; the other three gates landed in v0.7.5 already with their
// declarations attached to existing `MateRecord` fields. Workspace targets
// have no natural home on a mate (they reference a connector, not a mate
// pair) so they get their own record type — mirroring `MateRecord` in
// spirit but with a distinct collection on the `Assembly`.

import type { Vec3 } from '../../shared/intent/types';
import { isValidVec3 } from '../../shared/intent/types';
import { KernelError } from '../../shared/intent/kernelError';
import { parseConnectorRef } from './mate';

/** Default tolerance (mm) used when `opts.toleranceMm` is omitted. */
export const DEFAULT_WORKSPACE_TOLERANCE_MM = 5;

/**
 * Persistent shape of a single `arm.workspace(connectorRef, opts)` call.
 * Stored on the `Assembly` capture session; the agent-facing surface keeps
 * the literal world-frame coords (no ParamRefs in v0.7 — keeps the gate's
 * arithmetic synchronous, mirroring `Vec3` rather than `Vec3Param`).
 */
export interface WorkspaceTargetRecord {
  /** Fully-qualified `"<partName>.<connectorName>"` reference. */
  readonly connectorRef: string;
  /** Declared world-frame targets the connector must reach. Non-empty. */
  readonly reachable: readonly Vec3[];
  /** Per-target tolerance in mm (≥ 0). Default 5 mm. */
  readonly toleranceMm: number;
}

/**
 * Capture-time options accepted by `arm.workspace(connectorRef, opts)`.
 * Same fields as `WorkspaceTargetRecord`, minus the resolved tolerance
 * default; the public surface mirrors `RevoluteJointOpts` / `Vec3Param`
 * conventions.
 */
export interface WorkspaceTargetOpts {
  readonly reachable: readonly Vec3[];
  readonly toleranceMm?: number;
}

/**
 * Validate the args to `arm.workspace(...)` and produce a stored record.
 * Throws `KernelError('feature.invalid-args')` on malformed input — same
 * error class used everywhere else in the assembly capture surface.
 *
 * The connector existence check is INTENTIONALLY deferred to the
 * validator pass; this lets callers declare targets before the connector
 * is materialised (e.g. via a sub-assembly import). The validator emits
 * a structured diagnostic when the ref doesn't resolve.
 */
export function validateWorkspaceTargetOpts(
  connectorRef: string,
  opts: WorkspaceTargetOpts,
): WorkspaceTargetRecord {
  // Shape check: `parseConnectorRef` already enforces the `"part.connector"`
  // form and throws a structured error for malformed inputs. Wrap so we
  // surface a workspace-domain error chain rather than the mate one.
  try {
    parseConnectorRef(connectorRef);
  } catch {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.workspace: connectorRef '${connectorRef}' is not a 'partName.connectorName' reference.`,
      undefined,
      "invalid-args.assembly.workspace-connector-ref — pass connectorRef as 'partName.connectorName' (the same form arm.mate(...) accepts).",
    );
  }

  if (!opts || typeof opts !== 'object') {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.workspace: opts must be an object with a 'reachable' array; got ${typeof opts}.`,
      undefined,
      "invalid-args.assembly.workspace-opts — pass arm.workspace(connectorRef, { reachable: [[x,y,z], ...], toleranceMm? }).",
    );
  }

  if (!Array.isArray(opts.reachable) || opts.reachable.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.workspace: opts.reachable must be a non-empty array of Vec3 targets.`,
      undefined,
      "invalid-args.assembly.workspace-reachable-empty — pass at least one world-frame [x, y, z] target the connector must reach.",
    );
  }

  for (let i = 0; i < opts.reachable.length; i++) {
    const t = opts.reachable[i];
    if (!isValidVec3(t)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.workspace: opts.reachable[${i}] must be a finite Vec3 [x, y, z]; got ${JSON.stringify(t)}.`,
        undefined,
        "invalid-args.assembly.workspace-reachable-shape — every entry of opts.reachable must be a finite [number, number, number] world-frame coordinate.",
      );
    }
  }

  if (opts.toleranceMm !== undefined) {
    if (
      typeof opts.toleranceMm !== 'number' ||
      !Number.isFinite(opts.toleranceMm) ||
      opts.toleranceMm < 0
    ) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.workspace: opts.toleranceMm must be a finite non-negative number; got ${String(opts.toleranceMm)}.`,
        undefined,
        "invalid-args.assembly.workspace-tolerance — pass a finite toleranceMm >= 0, or omit it (default 5 mm).",
      );
    }
  }

  return {
    connectorRef,
    reachable: opts.reachable.map((t) => [t[0], t[1], t[2]] as Vec3),
    toleranceMm: opts.toleranceMm ?? DEFAULT_WORKSPACE_TOLERANCE_MM,
  };
}

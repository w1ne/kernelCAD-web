import type { Assembly } from '../../capture/assembly';
import type { NumericPoses } from '../../capture/forwardKinematics';
import { createOcctLowerer } from '../../backends/occt/occtLowerer';
import { initOcct } from '../../backends/occt/occtBackend';
import { isSceneBackend } from '../../backends/sceneBackend';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import type { Vec3 } from '../../intent/types';
import { currentValue } from '../../runtime/editableHelpers';
import type { Editable } from '../../runtime/paramRef';
import { detectInterferences } from '../../script-runtime/checkInterference';
import type { InterferencePair } from '../../script-runtime/checkInterference';
import type { MatePose, MateRecord } from './mate';
import { solveMates } from './solver';

export type PoseEnvelopeDiagnosticCode =
  | 'assembly.pose.out-of-limits'
  | 'assembly.pose-envelope.solve-failed'
  | 'assembly.pose-envelope.interference'
  | 'assembly.pose-envelope.connector-unresolved';

export interface PoseEnvelopeDiagnostic {
  readonly code: PoseEnvelopeDiagnosticCode;
  readonly severity: 'warning' | 'error';
  readonly message: string;
  readonly hint: string;
  readonly sampleName?: string;
  readonly mateName?: string;
  readonly pose?: number | [number, number, number];
  readonly limits?: readonly [number, number];
  readonly partA?: string;
  readonly partB?: string;
  readonly volumeMm3?: number;
  readonly connectorRef?: string;
}

export interface PoseEnvelopeSample {
  readonly name: string;
  readonly poses: NumericPoses;
  readonly reason: string;
}

export interface PoseEnvelopeReviewOptions {
  readonly includeInterference?: boolean;
  readonly epsilonMm3?: number;
  readonly trackConnectors?: readonly string[];
}

export interface PoseEnvelopeReviewResult {
  readonly samples: PoseEnvelopeSample[];
  readonly diagnostics: PoseEnvelopeDiagnostic[];
  readonly interferencePairs: Array<InterferencePair & { sampleName: string }>;
  readonly connectorPoses: TrackedConnectorPose[];
  readonly connectorWorkspace: ConnectorWorkspace[];
}

export interface TrackedConnectorPose {
  readonly sampleName: string;
  readonly ref: string;
  readonly partName: string;
  readonly connectorName: string;
  readonly world: Vec3;
}

export interface ConnectorWorkspace {
  readonly ref: string;
  readonly partName: string;
  readonly connectorName: string;
  readonly min: Vec3;
  readonly max: Vec3;
  readonly travelMm: number;
}

const DEFAULT_EPSILON_MM3 = 0.01;

export function buildPoseEnvelopeSamples(arm: Assembly): PoseEnvelopeSample[] {
  const samples: PoseEnvelopeSample[] = [
    { name: 'current', poses: {}, reason: 'capture-time/default mate poses' },
  ];

  for (const mate of arm.__mates()) {
    const limits = mate.limitsDeg ?? mate.limitsMm;
    if (limits === undefined) continue;
    const [min, max] = limits;
    samples.push({
      name: `${mate.name}:min`,
      poses: { [mate.name]: min },
      reason: `${mate.name} lower limit`,
    });
    if (max !== min) {
      samples.push({
        name: `${mate.name}:max`,
        poses: { [mate.name]: max },
        reason: `${mate.name} upper limit`,
      });
    }
  }

  return samples;
}

export function validateMatePoseLimits(
  arm: Assembly,
  poses?: NumericPoses,
  sampleName = 'current',
): PoseEnvelopeDiagnostic[] {
  const diagnostics: PoseEnvelopeDiagnostic[] = [];
  for (const mate of arm.__mates()) {
    const limits = mate.limitsDeg ?? mate.limitsMm;
    if (limits === undefined) continue;
    const pose = resolveMatePose(mate, arm, poses);
    if (pose === undefined || Array.isArray(pose)) continue;
    const [min, max] = limits;
    if (pose < min || pose > max) {
      diagnostics.push({
        code: 'assembly.pose.out-of-limits',
        severity: 'error',
        sampleName,
        mateName: mate.name,
        pose,
        limits,
        message: `Mate '${mate.name}' pose ${pose} is outside its declared limits [${min}, ${max}].`,
        hint: `invalid-args.assembly.pose-out-of-limits — clamp '${mate.name}' to [${min}, ${max}] or widen the mate limits if the mechanism is intended to travel that far.`,
      });
    }
  }
  return diagnostics;
}

export async function reviewPoseEnvelope(
  arm: Assembly,
  opts: PoseEnvelopeReviewOptions = {},
): Promise<PoseEnvelopeReviewResult> {
  const includeInterference = opts.includeInterference ?? true;
  const epsilon = opts.epsilonMm3 ?? DEFAULT_EPSILON_MM3;
  const samples = buildPoseEnvelopeSamples(arm);
  const diagnostics: PoseEnvelopeDiagnostic[] = [];
  const interferencePairs: Array<InterferencePair & { sampleName: string }> = [];
  const connectorPoses: TrackedConnectorPose[] = [];
  const trackConnectors = opts.trackConnectors !== undefined ? new Set(opts.trackConnectors) : undefined;
  const unresolvedConnectorRefs = new Set<string>();

  for (const sample of samples) {
    diagnostics.push(...validateMatePoseLimits(arm, sample.poses, sample.name));
    try {
      const solved = await solveMates(arm, sample.poses);
      collectConnectorPoses(
        arm,
        solved.poses,
        sample.name,
        trackConnectors,
        connectorPoses,
        unresolvedConnectorRefs,
      );
      if (
        solved.status === 'over-constrained' ||
        solved.status === 'did-not-converge'
      ) {
        diagnostics.push({
          code: 'assembly.pose-envelope.solve-failed',
          severity: 'error',
          sampleName: sample.name,
          message: `Pose-envelope sample '${sample.name}' produced solver status '${solved.status}'.`,
          hint: `invalid-args.assembly.pose-envelope-solve-failed — repair the mate graph or reduce declared travel before trusting this mechanism range.`,
        });
      }
    } catch (e) {
      diagnostics.push({
        code: 'assembly.pose-envelope.solve-failed',
        severity: 'error',
        sampleName: sample.name,
        message: `Pose-envelope sample '${sample.name}' could not be solved: ${e instanceof Error ? e.message : String(e)}`,
        hint: `invalid-args.assembly.pose-envelope-solve-failed — inspect the mate refs, connector origins, and pose shapes for this sample.`,
      });
    }

    if (!includeInterference) continue;
    const pairs = await detectInterferencesForSample(arm, sample.poses, epsilon);
    for (const pair of pairs) {
      interferencePairs.push({ ...pair, sampleName: sample.name });
      diagnostics.push({
        code: 'assembly.pose-envelope.interference',
        severity: 'error',
        sampleName: sample.name,
        partA: pair.a,
        partB: pair.b,
        volumeMm3: pair.volumeMm3,
        message: `Pose-envelope sample '${sample.name}' makes parts '${pair.a}' and '${pair.b}' overlap by ${pair.volumeMm3.toFixed(2)} mm³.`,
        hint: `invalid-args.assembly.pose-envelope-interference — add clearance, reduce mate travel, or move the connector/mount geometry so the swept pose stays collision-free.`,
      });
    }
  }

  for (const ref of unresolvedConnectorRefs) {
    diagnostics.push({
      code: 'assembly.pose-envelope.connector-unresolved',
      severity: 'warning',
      connectorRef: ref,
      message: `Tracked connector '${ref}' has a topology-based origin and cannot be included in capture-time workspace bounds.`,
      hint: `invalid-args.assembly.pose-envelope-connector-unresolved — use a numeric vec3 connector origin for workspace review, or run a lowerer-backed topology resolver before requesting this connector.`,
    });
  }

  return {
    samples,
    diagnostics,
    interferencePairs,
    connectorPoses,
    connectorWorkspace: buildConnectorWorkspace(connectorPoses),
  };
}

function collectConnectorPoses(
  arm: Assembly,
  partTransforms: ReadonlyMap<string, import('../../runtime/se3').Transform>,
  sampleName: string,
  trackConnectors: ReadonlySet<string> | undefined,
  out: TrackedConnectorPose[],
  unresolvedConnectorRefs: Set<string>,
): void {
  for (const part of arm.__parts()) {
    const transform = partTransforms.get(part.name);
    if (!transform) continue;
    for (const connector of part.mateConnectors) {
      const ref = `${part.name}.${connector.name}`;
      if (trackConnectors !== undefined && !trackConnectors.has(ref)) continue;
      if (connector.origin.kind !== 'vec3') {
        unresolvedConnectorRefs.add(ref);
        continue;
      }
      out.push({
        sampleName,
        ref,
        partName: part.name,
        connectorName: connector.name,
        world: [...transform.point(connector.origin.value)] as Vec3,
      });
    }
  }
}

function buildConnectorWorkspace(poses: readonly TrackedConnectorPose[]): ConnectorWorkspace[] {
  const byRef = new Map<string, TrackedConnectorPose[]>();
  for (const pose of poses) {
    const list = byRef.get(pose.ref);
    if (list) list.push(pose);
    else byRef.set(pose.ref, [pose]);
  }

  const out: ConnectorWorkspace[] = [];
  for (const [ref, list] of byRef) {
    const first = list[0];
    const min: Vec3 = [
      Math.min(...list.map((p) => p.world[0])),
      Math.min(...list.map((p) => p.world[1])),
      Math.min(...list.map((p) => p.world[2])),
    ];
    const max: Vec3 = [
      Math.max(...list.map((p) => p.world[0])),
      Math.max(...list.map((p) => p.world[1])),
      Math.max(...list.map((p) => p.world[2])),
    ];
    let travelMm = 0;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i].world;
        const b = list[j].world;
        travelMm = Math.max(
          travelMm,
          Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
        );
      }
    }
    out.push({
      ref,
      partName: first.partName,
      connectorName: first.connectorName,
      min,
      max,
      travelMm,
    });
  }
  return out.sort((a, b) => a.ref.localeCompare(b.ref));
}

function resolveMatePose(
  mate: MateRecord,
  arm: Assembly,
  numericOverrides: NumericPoses | undefined,
): number | [number, number, number] | undefined {
  if (mate.type === 'fastened' || mate.type === 'planar') return undefined;
  const override = numericOverrides?.[mate.name];
  if (override !== undefined) return override;
  if (mate.pose !== undefined) return resolvePoseFromEditable(mate.pose, arm);
  return mate.type === 'ball' ? [0, 0, 0] : 0;
}

function resolvePoseFromEditable(
  pose: MatePose,
  arm: Assembly,
): number | [number, number, number] {
  const table = arm.__session().paramTable;
  if (Array.isArray(pose)) {
    return [
      currentValue(pose[0] as Editable<number>, table),
      currentValue(pose[1] as Editable<number>, table),
      currentValue(pose[2] as Editable<number>, table),
    ];
  }
  return currentValue(pose as Editable<number>, table);
}

async function detectInterferencesForSample(
  arm: Assembly,
  poses: NumericPoses,
  epsilonMm3: number,
): Promise<InterferencePair[]> {
  await initOcct();
  const scene = await arm.solvedModel(poses, { validate: 'off' });
  const engine = new RecomputeEngine(createOcctLowerer(arm.__session()));
  const result = await engine.run(arm.__session().getRecords(), {
    paramTable: arm.__session().paramTable,
    gatedFeatureNames: arm.__session().gatedFeatureNames,
  });
  const sourceId = scene.__sourceFeatureId();
  if (sourceId === undefined) return [];
  const lowered = result.shapes.get(sourceId);
  if (!lowered || !isSceneBackend(lowered)) return [];
  return detectInterferences(lowered, epsilonMm3, new Set<string>(), result.diagnostics).pairs;
}

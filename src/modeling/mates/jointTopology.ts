// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type {
  Assembly,
  AssemblyPartStored,
  JointSupportIntentRecord,
  MechanicalJointIntentRecord,
} from '../capture/assembly';
import type { Connector } from './connector';
import { parseConnectorRef, type MateLimitRange, type MateRecord } from './mate';

export type JointTopologyDiagnosticCode =
  | 'assembly.connectivity.floating-moving-part'
  | 'assembly.connectivity.no-load-path'
  | 'assembly.joint-topology.connector-missing'
  | 'assembly.joint-topology.axis-invalid'
  | 'assembly.joint-topology.missing-limit'
  | 'assembly.joint-topology.unsupported-axis';

export interface JointTopologyDiagnostic {
  readonly code: JointTopologyDiagnosticCode;
  readonly severity: 'error';
  readonly message: string;
  readonly hint: string;
  readonly mateName?: string;
  readonly partName?: string;
  readonly connectorRef?: string;
  readonly useCaseName?: string;
  readonly stableParts?: readonly string[];
}

export interface JointTopologyReviewResult {
  readonly diagnostics: readonly JointTopologyDiagnostic[];
  readonly checkedMateCount: number;
  readonly checkedMovingPartCount: number;
}

interface ParsedEndpoint {
  readonly ref: string;
  readonly partName: string;
  readonly connectorName: string;
  readonly connector?: Connector;
}

interface JointSupportLikeIntent {
  readonly mate: string;
  readonly shaft: string;
  readonly supports: readonly string[];
  readonly output: string;
}

const ROOT_FALLBACK_NAMES = ['palm-root', 'palm', 'base', 'root'] as const;
const AXIS_ALIGNMENT_TOLERANCE = 0.999;
const AXIS_REQUIRED_MATES = new Set(['revolute', 'prismatic', 'cylindrical', 'pin_slot']);
const ROTATIONAL_LIMIT_MATES = new Set(['revolute', 'cylindrical', 'pin_slot']);

export function reviewJointTopology(arm: Assembly): JointTopologyReviewResult {
  const diagnostics: JointTopologyDiagnostic[] = [];
  const parts = arm.__parts();
  const partsByName = new Map(parts.map((part) => [part.name, part]));
  const mates = arm.__mates();
  const graph = new Map<string, Set<string>>();
  const movingParts = new Set<string>();
  const supportedRevoluteMates = collectSupportedRevoluteMates(arm, partsByName);

  for (const part of parts) {
    graph.set(part.name, new Set());
  }

  const checkedMates = mates.filter((mate) => mate.type !== 'fastened');

  for (const mate of mates) {
    const a = parseEndpoint(mate.a, partsByName);
    const b = parseEndpoint(mate.b, partsByName);

    if (a.partName !== undefined && b.partName !== undefined && partsByName.has(a.partName) && partsByName.has(b.partName)) {
      graph.get(a.partName)?.add(b.partName);
      graph.get(b.partName)?.add(a.partName);
    }

    if (mate.type === 'fastened') continue;

    recordMovingPart(a, partsByName, movingParts);
    recordMovingPart(b, partsByName, movingParts);

    validateEndpointContract(mate, a, diagnostics);
    validateEndpointContract(mate, b, diagnostics);
    validateMateAxisAlignment(mate, a, b, diagnostics);
    validateMateContract(mate, supportedRevoluteMates, diagnostics);
  }

  const stableRoots = collectStableRoots(arm, partsByName);
  const reachableFromRoots = findReachableParts(stableRoots, graph);

  for (const partName of movingParts) {
    if (!reachableFromRoots.has(partName)) {
      diagnostics.push({
        code: 'assembly.connectivity.floating-moving-part',
        severity: 'error',
        partName,
        stableParts: [...stableRoots],
        message: `Moving part '${partName}' has no mate-graph path to a stable root.`,
        hint: `connectivity.floating-moving-part — connect '${partName}' through mates to a stable root (${formatRoots(stableRoots)}), or declare the intended root in physicalUseCase(...).stableParts.`,
      });
    }
  }

  for (const useCase of arm.__physicalUseCases()) {
    const useCaseStableParts = stableRootsForUseCase(useCase.stableParts, partsByName);
    const reachableForUseCase = findReachableParts(useCaseStableParts, graph);
    for (const load of useCase.loads) {
      const loadPart = partsByName.get(load.part);
      if (loadPart === undefined) continue;
      if (loadPart.role === 'contact-target') continue;
      if (!reachableForUseCase.has(load.part)) {
        diagnostics.push({
          code: 'assembly.connectivity.no-load-path',
          severity: 'error',
          useCaseName: useCase.name,
          partName: load.part,
          stableParts: [...useCaseStableParts],
          message: `Physical use case '${useCase.name}' load part '${load.part}' has no mate-graph path to a stable root.`,
          hint: `connectivity.no-load-path — add mates from '${load.part}' back to a stable part (${formatRoots(useCaseStableParts)}) so applied loads have a structural path.`,
        });
      }
    }
  }

  return {
    diagnostics,
    checkedMateCount: checkedMates.length,
    checkedMovingPartCount: movingParts.size,
  };
}

function parseEndpoint(ref: string, partsByName: ReadonlyMap<string, { readonly mateConnectors: readonly Connector[] }>): Partial<ParsedEndpoint> {
  try {
    const parsed = parseConnectorRef(ref);
    const part = partsByName.get(parsed.partName);
    return {
      ref,
      partName: parsed.partName,
      connectorName: parsed.connectorName,
      connector: part?.mateConnectors.find((connector) => connector.name === parsed.connectorName),
    };
  } catch {
    return { ref };
  }
}

function recordMovingPart(
  endpoint: Partial<ParsedEndpoint>,
  partsByName: ReadonlyMap<string, unknown>,
  movingParts: Set<string>,
): void {
  if (endpoint.partName !== undefined && partsByName.has(endpoint.partName)) {
    movingParts.add(endpoint.partName);
  }
}

function validateEndpointContract(
  mate: MateRecord,
  endpoint: Partial<ParsedEndpoint>,
  diagnostics: JointTopologyDiagnostic[],
): void {
  if (endpoint.partName === undefined || endpoint.connectorName === undefined || endpoint.connector === undefined) {
    diagnostics.push({
      code: 'assembly.joint-topology.connector-missing',
      severity: 'error',
      mateName: mate.name,
      partName: endpoint.partName,
      connectorRef: endpoint.ref,
      message: `Mate '${mate.name}' references missing connector '${endpoint.ref}'.`,
      hint: `joint-topology.connector-missing — declare both mate endpoints as '<part>.<connector>' refs on existing parts before reviewing topology.`,
    });
    return;
  }

  if (!isNumericVec3Origin(endpoint.connector.origin)) {
    diagnostics.push({
      code: 'assembly.joint-topology.axis-invalid',
      severity: 'error',
      mateName: mate.name,
      partName: endpoint.partName,
      connectorRef: endpoint.ref,
      message: `Mate '${mate.name}' connector '${endpoint.ref}' does not have a numeric vec3 origin.`,
      hint: `joint-topology.axis-invalid — give '${endpoint.ref}' origin: { kind: 'vec3', value: [x, y, z] } with finite numbers.`,
    });
  }

  if (AXIS_REQUIRED_MATES.has(mate.type) && !isFiniteNonZeroVec3(endpoint.connector.axis)) {
    diagnostics.push({
      code: 'assembly.joint-topology.axis-invalid',
      severity: 'error',
      mateName: mate.name,
      partName: endpoint.partName,
      connectorRef: endpoint.ref,
      message: `Mate '${mate.name}' connector '${endpoint.ref}' has an invalid joint axis.`,
      hint: `joint-topology.axis-invalid — give '${endpoint.ref}' a finite non-zero axis vector aligned with the intended joint.`,
    });
  }
}

function validateMateAxisAlignment(
  mate: MateRecord,
  a: Partial<ParsedEndpoint>,
  b: Partial<ParsedEndpoint>,
  diagnostics: JointTopologyDiagnostic[],
): void {
  if (!AXIS_REQUIRED_MATES.has(mate.type)) return;

  const axisA = normaliseAxis(a.connector?.axis);
  const axisB = normaliseAxis(b.connector?.axis);
  if (axisA === undefined || axisB === undefined) return;

  if (Math.abs(dot(axisA, axisB)) < AXIS_ALIGNMENT_TOLERANCE) {
    diagnostics.push({
      code: 'assembly.joint-topology.axis-invalid',
      severity: 'error',
      mateName: mate.name,
      connectorRef: `${mate.a} / ${mate.b}`,
      message: `Mate '${mate.name}' endpoint axes are not aligned.`,
      hint: `joint-topology.axis-invalid — align '${mate.a}' and '${mate.b}' axes so the '${mate.type}' joint has one coherent physical axis.`,
    });
  }
}

function validateMateContract(
  mate: MateRecord,
  supportedRevoluteMates: ReadonlySet<string>,
  diagnostics: JointTopologyDiagnostic[],
): void {
  if (ROTATIONAL_LIMIT_MATES.has(mate.type) && !isFiniteRange(mate.limitsDeg)) {
    diagnostics.push({
      code: 'assembly.joint-topology.missing-limit',
      severity: 'error',
      mateName: mate.name,
      message: `Mate '${mate.name}' is type '${mate.type}' and needs finite limitsDeg.`,
      hint: `joint-topology.missing-limit — add limitsDeg: [minDeg, maxDeg] to '${mate.name}'.`,
    });
  }

  if (mate.type === 'prismatic' && !isFiniteRange(mate.limitsMm)) {
    diagnostics.push({
      code: 'assembly.joint-topology.missing-limit',
      severity: 'error',
      mateName: mate.name,
      message: `Mate '${mate.name}' is prismatic and needs finite limitsMm.`,
      hint: `joint-topology.missing-limit — add limitsMm: [minMm, maxMm] to '${mate.name}'.`,
    });
  }

  if (mate.type === 'revolute' && !supportedRevoluteMates.has(mate.name)) {
    diagnostics.push({
      code: 'assembly.joint-topology.unsupported-axis',
      severity: 'error',
      mateName: mate.name,
      message: `Revolute mate '${mate.name}' has no joint support intent declaring support.`,
      hint: `joint-topology.unsupported-axis — add arm.jointSupport(..., { mate: '${mate.name}', shaft, supports, output }) for passive hinges, or arm.mechanicalJoint(..., { mate: '${mate.name}', actuator, shaft, supports, output }) for driven hinges, so the hinge axis has physical support intent.`,
    });
  }
}

function collectSupportedRevoluteMates(
  arm: Assembly,
  partsByName: ReadonlyMap<string, AssemblyPartStored>,
): Set<string> {
  const supported = new Set<string>();
  const mates = arm.__mates();
  const matesByName = new Map(mates.map((mate) => [mate.name, mate]));
  const fastenedGraph = buildFastenedGraph(mates, partsByName);

  for (const intent of arm.__mechanicalJointIntents()) {
    if (!isCompleteDrivenMechanicalIntent(intent, matesByName, partsByName, fastenedGraph)) continue;
    supported.add(intent.mate);
  }

  for (const intent of arm.__jointSupportIntents()) {
    if (!isCompleteJointSupportIntent(intent, matesByName, partsByName, fastenedGraph)) continue;
    supported.add(intent.mate);
  }

  return supported;
}

function isCompleteDrivenMechanicalIntent(
  intent: MechanicalJointIntentRecord,
  matesByName: ReadonlyMap<string, MateRecord>,
  partsByName: ReadonlyMap<string, AssemblyPartStored>,
  fastenedGraph: ReadonlyMap<string, ReadonlySet<string>>,
): boolean {
  if (!partsByName.has(intent.actuator)) return false;
  return isCompleteJointSupportIntent(intent, matesByName, partsByName, fastenedGraph);
}

function isCompleteJointSupportIntent(
  intent: JointSupportIntentRecord | JointSupportLikeIntent,
  matesByName: ReadonlyMap<string, MateRecord>,
  partsByName: ReadonlyMap<string, AssemblyPartStored>,
  fastenedGraph: ReadonlyMap<string, ReadonlySet<string>>,
): boolean {
  const mate = matesByName.get(intent.mate);
  if (mate === undefined || mate.type !== 'revolute') return false;
  if (!partsByName.has(intent.shaft)) return false;
  if (!partsByName.has(intent.output)) return false;
  if (intent.supports.length === 0 || intent.supports.some((support) => !partsByName.has(support))) return false;

  const endpointParts = mateEndpointParts(mate);
  if (endpointParts === undefined || !endpointParts.names.has(intent.output)) return false;

  const supportSide = endpointParts.a === intent.output ? endpointParts.b : endpointParts.a;
  const fastenedToSupportSide = findReachableParts(new Set([supportSide]), fastenedGraph);
  return fastenedToSupportSide.has(intent.shaft) && intent.supports.some((support) => fastenedToSupportSide.has(support));
}

function buildFastenedGraph(
  mates: readonly MateRecord[],
  partsByName: ReadonlyMap<string, AssemblyPartStored>,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const partName of partsByName.keys()) graph.set(partName, new Set());

  for (const mate of mates) {
    if (mate.type !== 'fastened') continue;
    const endpointParts = mateEndpointParts(mate);
    if (endpointParts === undefined) continue;
    if (!partsByName.has(endpointParts.a) || !partsByName.has(endpointParts.b)) continue;
    graph.get(endpointParts.a)?.add(endpointParts.b);
    graph.get(endpointParts.b)?.add(endpointParts.a);
  }

  return graph;
}

function mateEndpointParts(mate: MateRecord): { readonly a: string; readonly b: string; readonly names: ReadonlySet<string> } | undefined {
  try {
    const a = parseConnectorRef(mate.a).partName;
    const b = parseConnectorRef(mate.b).partName;
    return { a, b, names: new Set([a, b]) };
  } catch {
    return undefined;
  }
}

function collectStableRoots(
  arm: Assembly,
  partsByName: ReadonlyMap<string, unknown>,
): Set<string> {
  const roots = new Set<string>();
  for (const useCase of arm.__physicalUseCases()) {
    for (const stablePart of useCase.stableParts) {
      if (partsByName.has(stablePart)) roots.add(stablePart);
    }
  }
  for (const fallback of ROOT_FALLBACK_NAMES) {
    if (partsByName.has(fallback)) roots.add(fallback);
  }
  return roots;
}

function stableRootsForUseCase(
  stableParts: readonly string[],
  partsByName: ReadonlyMap<string, unknown>,
): Set<string> {
  const roots = new Set<string>();
  for (const stablePart of stableParts) {
    if (partsByName.has(stablePart)) roots.add(stablePart);
  }
  for (const fallback of ROOT_FALLBACK_NAMES) {
    if (partsByName.has(fallback)) roots.add(fallback);
  }
  return roots;
}

function findReachableParts(roots: ReadonlySet<string>, graph: ReadonlyMap<string, ReadonlySet<string>>): Set<string> {
  const reachable = new Set<string>();
  const pending = [...roots].filter((root) => graph.has(root));
  for (const root of pending) reachable.add(root);

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;
    for (const neighbor of graph.get(current) ?? []) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        pending.push(neighbor);
      }
    }
  }

  return reachable;
}

function isNumericVec3Origin(origin: Connector['origin']): boolean {
  return origin.kind === 'vec3' && isFiniteVec3(origin.value);
}

function isFiniteNonZeroVec3(value: unknown): value is readonly [number, number, number] {
  return isFiniteVec3(value) && (value[0] !== 0 || value[1] !== 0 || value[2] !== 0);
}

function normaliseAxis(value: unknown): readonly [number, number, number] | undefined {
  if (!isFiniteNonZeroVec3(value)) return undefined;
  const length = Math.hypot(value[0], value[1], value[2]);
  return [value[0] / length, value[1] / length, value[2] / length];
}

function dot(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function isFiniteVec3(value: unknown): value is readonly [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((coord) => typeof coord === 'number' && Number.isFinite(coord))
  );
}

function isFiniteRange(range: MateLimitRange | undefined): range is MateLimitRange {
  return (
    Array.isArray(range) &&
    range.length === 2 &&
    typeof range[0] === 'number' &&
    typeof range[1] === 'number' &&
    Number.isFinite(range[0]) &&
    Number.isFinite(range[1])
  );
}

function formatRoots(roots: ReadonlySet<string>): string {
  return roots.size === 0 ? 'none declared' : [...roots].join(', ');
}

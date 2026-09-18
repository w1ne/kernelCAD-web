// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Assembly } from '../capture/assembly';
import type { NumericPoses } from '../capture/forwardKinematics';
import type { Vec3 } from '../../shared/intent/types';
import { currentValue } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';
import type { Transform } from '../../shared/runtime/se3';
import type { PhysicalUseCaseRecord } from './physicalUseCase';
import {
  DEFAULT_FORCE_RESIDUAL_N,
  DEFAULT_TORQUE_RESIDUAL_NMM,
  type PhysicalUseCaseStaticCertificate,
  type PhysicalUseCaseStaticContactForce,
} from './physicalUseCaseStatics';
import { solveMates } from './solver';
import {
  CERTIFICATE_NUMERIC_TOLERANCE,
  add,
  buildDeclaredContactMap,
  computeHeldNetWrench,
  contactKey,
  copyVec,
  cross,
  distance,
  dot,
  errorMessage,
  isFiniteVec3,
  isPositiveFinite,
  midpoint,
  norm,
  numbersMatch,
  resolveConnectorPoint,
  resolveSolvedLoads,
  safePartName,
  scale,
  sub,
  unit,
  validateCertificateIdentity,
  validateCertificatePoses,
  validateCertificateResiduals,
  validateCertifiedContact,
  validateSolvedContact,
} from './physicalUseCaseJointReactionsPhases';

const CONNECTOR_COINCIDENCE_TOLERANCE_MM = 1e-6;
const AXIS_ALIGNMENT_TOLERANCE = 1e-6;

export interface PhysicalUseCaseJointReactionEvidence {
  readonly mateName: string;
  readonly parentPart: string;
  readonly childPart: string;
  readonly pointWorldMm: Vec3;
  readonly axisWorld: Vec3;
  readonly forceWorldN: Vec3;
  readonly momentWorldNmm: Vec3;
  readonly resultantForceN: number;
  readonly resultantMomentNmm: number;
  readonly axialForceN: number;
  readonly radialForceN: number;
  readonly axisMomentNmm: number;
  readonly bendingMomentNmm: number;
}

export type PhysicalUseCaseJointReactionIssue =
  | { readonly kind: 'joint-reaction-input-incomplete'; readonly useCaseName: string; readonly message: string }
  | { readonly kind: 'joint-reaction-indeterminate'; readonly useCaseName: string; readonly message: string };

export interface PhysicalUseCaseJointReactionCertificate {
  readonly useCaseName: string;
  readonly poses: NumericPoses;
  readonly reactions: readonly PhysicalUseCaseJointReactionEvidence[];
}

export interface PhysicalUseCaseJointReactionsResult {
  readonly issues: readonly PhysicalUseCaseJointReactionIssue[];
  readonly certificates: readonly PhysicalUseCaseJointReactionCertificate[];
}

type Mate = ReturnType<Assembly['__mates']>[number];

export interface CertifiedMechanismContact {
  readonly evidence: PhysicalUseCaseStaticContactForce;
  readonly mechanismPart: string;
  readonly pointWorldMm: Vec3;
  readonly forceOnMechanismWorldN: Vec3;
}

interface ArticulatedEdge {
  readonly mate: Mate;
  readonly aPart: string;
  readonly bPart: string;
  readonly aGroup: string;
  readonly bGroup: string;
}

interface RigidGroupTopology {
  readonly groupByPart: ReadonlyMap<string, string>;
  readonly edges: readonly ArticulatedEdge[];
  readonly adjacency: ReadonlyMap<string, readonly ArticulatedEdge[]>;
}

interface SupportedComponent {
  readonly groups: ReadonlySet<string>;
  readonly edges: readonly ArticulatedEdge[];
  readonly rootGroup: string;
}

interface OrientedEdge {
  readonly edge: ArticulatedEdge;
  readonly parentGroup: string;
  readonly childGroup: string;
  readonly parentPart: string;
  readonly childPart: string;
}

interface ResolvedJointFrame {
  readonly pointWorldMm: Vec3;
  readonly axisWorld: Vec3;
}

interface WrenchAtWorldOrigin {
  readonly forceWorldN: Vec3;
  readonly momentWorldNmm: Vec3;
}

interface AccumulatedSubtree {
  readonly wrench: WrenchAtWorldOrigin;
  readonly hasAppliedContactLoad: boolean;
}

interface PreparationFailure {
  readonly kind: 'input' | 'indeterminate';
  readonly message: string;
}

export async function reviewPhysicalUseCaseJointReactions(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  certificate: PhysicalUseCaseStaticCertificate,
): Promise<PhysicalUseCaseJointReactionsResult> {
  const contacts = validateCertificateInput(arm, useCase, certificate);
  if (typeof contacts === 'string') return inputFailure(useCase.name, contacts);
  const expandedPoses = expandCertificatePoses(arm, certificate.poses);
  if (typeof expandedPoses === 'string') return inputFailure(useCase.name, expandedPoses);

  const topology = buildRigidGroupTopology(arm);
  if ('kind' in topology) return failure(useCase.name, topology);
  const components = findSupportedLoadedComponents(arm, useCase, topology, contacts);
  if ('kind' in components) return failure(useCase.name, components);

  let solved: Awaited<ReturnType<typeof solveMates>>;
  try {
    solved = await solveMates(arm, expandedPoses, {
      acceptConsistentArticulatedLoops: true,
      solveDisconnectedComponents: true,
    });
  } catch (error) {
    return inputFailure(
      useCase.name,
      `Static certificate poses could not be solved: ${errorMessage(error)}.`,
    );
  }
  if (solved.status !== 'solved' && solved.status !== 'redundant-ok') {
    return inputFailure(
      useCase.name,
      `Static certificate poses returned mate solver status '${solved.status}'.`,
    );
  }
  const exactPoseIssue = await validateCertificateAtSolvedPose(
    arm,
    useCase,
    certificate,
    contacts,
    solved.poses,
  );
  if (exactPoseIssue !== undefined) return inputFailure(useCase.name, exactPoseIssue);

  const externalByGroup = contactWrenchesByGroup(topology.groupByPart, contacts);
  const reactions: PhysicalUseCaseJointReactionEvidence[] = [];
  for (const component of components) {
    const oriented = orientComponent(component, topology.adjacency);
    if ('kind' in oriented) return failure(useCase.name, oriented);

    const frameByEdge = new Map<ArticulatedEdge, ResolvedJointFrame>();
    for (const entry of oriented) {
      const frame = await resolveJointFrame(arm, solved.poses, entry);
      if (typeof frame === 'string') return inputFailure(useCase.name, frame);
      frameByEdge.set(entry.edge, frame);
    }
    accumulateComponentReactions(
      component.rootGroup,
      oriented,
      frameByEdge,
      externalByGroup,
      reactions,
    );
  }

  return {
    issues: [],
    certificates: [{
      useCaseName: useCase.name,
      poses: copyPoses(expandedPoses),
      reactions,
    }],
  };
}

function expandCertificatePoses(
  arm: Assembly,
  certificatePoses: NumericPoses,
): NumericPoses | string {
  const matesByName = new Map(arm.__mates().map((mate) => [mate.name, mate]));
  const couplings = arm.__mateCouplings();
  const drivenMateNames = new Set(couplings.map((coupling) => coupling.driven));
  const expanded = copyPoses(certificatePoses);

  for (let pass = 0; pass <= couplings.length; pass++) {
    let changed = false;
    for (const coupling of couplings) {
      const sourceMate = matesByName.get(coupling.source);
      if (sourceMate === undefined) {
        return `Coupling for driven mate '${coupling.driven}' names unknown source '${coupling.source}'.`;
      }
      let sourcePose: number | [number, number, number] | undefined =
        expanded[coupling.source];
      if (sourcePose === undefined && !drivenMateNames.has(coupling.source)) {
        try {
          sourcePose = sourceMate.pose === undefined
            ? 0
            : Array.isArray(sourceMate.pose)
              ? undefined
              : currentValue(sourceMate.pose as Editable<number>, arm.__session().paramTable);
        } catch (error) {
          return `Coupling source pose '${coupling.source}' could not be resolved: ${errorMessage(error)}.`;
        }
      }
      if (sourcePose === undefined) continue;
      if (Array.isArray(sourcePose) || !Number.isFinite(sourcePose)) {
        return `Coupling source pose '${coupling.source}' is not a finite scalar.`;
      }
      const expectedDriven = sourcePose * coupling.ratio + (coupling.offset ?? 0);
      const explicitDriven = certificatePoses[coupling.driven];
      if (explicitDriven !== undefined) {
        if (Array.isArray(explicitDriven) || !numbersMatch(explicitDriven, expectedDriven)) {
          return `Explicit driven pose '${coupling.driven}' contradicts coupling '${coupling.source} * ${coupling.ratio} + ${coupling.offset ?? 0}'.`;
        }
        continue;
      }
      if (expanded[coupling.driven] === undefined) {
        expanded[coupling.driven] = expectedDriven;
        changed = true;
      }
    }
    if (!changed) break;
  }

  for (const coupling of couplings) {
    if (expanded[coupling.driven] === undefined) {
      return `Coupled pose '${coupling.driven}' could not be derived from source '${coupling.source}'.`;
    }
  }
  return expanded;
}

async function validateCertificateAtSolvedPose(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  certificate: PhysicalUseCaseStaticCertificate,
  contacts: readonly CertifiedMechanismContact[],
  transforms: ReadonlyMap<string, Transform>,
): Promise<string | undefined> {
  for (const contact of contacts) {
    const issue = await validateSolvedContact(arm, transforms, useCase, certificate, contact);
    if (issue !== undefined) return issue;
  }

  const solvedLoads = await resolveSolvedLoads(arm, transforms, useCase, certificate);
  if (typeof solvedLoads === 'string') return solvedLoads;
  const { loads, referencePoint } = solvedLoads;

  const { netForce, netMoment } = computeHeldNetWrench(loads, contacts, referencePoint);

  const forceResidualN = norm(netForce);
  const torqueResidualNmm = norm(netMoment);
  const forceToleranceN = Math.min(
    useCase.criteria?.maxForceResidualN ?? DEFAULT_FORCE_RESIDUAL_N,
    DEFAULT_FORCE_RESIDUAL_N,
  );
  const torqueToleranceNmm = Math.min(
    useCase.criteria?.maxTorqueResidualNmm ?? DEFAULT_TORQUE_RESIDUAL_NMM,
    DEFAULT_TORQUE_RESIDUAL_NMM,
  );
  if (
    !isPositiveFinite(forceToleranceN) ||
    !isPositiveFinite(torqueToleranceNmm) ||
    forceResidualN > forceToleranceN + CERTIFICATE_NUMERIC_TOLERANCE ||
    torqueResidualNmm > torqueToleranceNmm + CERTIFICATE_NUMERIC_TOLERANCE
  ) {
    return `Supplied contact forces do not satisfy held-body equilibrium at the certified pose (force residual ${forceResidualN} N, moment residual ${torqueResidualNmm} Nmm).`;
  }
  if (
    !numbersMatch(forceResidualN, certificate.forceResidualN) ||
    !numbersMatch(torqueResidualNmm, certificate.torqueResidualNmm)
  ) {
    return `Recomputed solved-pose residuals do not match the static certificate residual fields.`;
  }
  return undefined;
}

function validateCertificateInput(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  certificate: PhysicalUseCaseStaticCertificate,
): CertifiedMechanismContact[] | string {
  const partsByName = new Map(arm.__parts().map((part) => [part.name, part]));
  const identityIssue = validateCertificateIdentity(arm, useCase, certificate, partsByName);
  if (identityIssue !== undefined) return identityIssue;

  const residualIssue = validateCertificateResiduals(useCase, certificate);
  if (residualIssue !== undefined) return residualIssue;

  const poseIssue = validateCertificatePoses(arm, certificate);
  if (poseIssue !== undefined) return poseIssue;

  const declaredContacts = buildDeclaredContactMap(useCase, certificate);
  if (typeof declaredContacts === 'string') return declaredContacts;

  const seen = new Set<string>();
  const resolved: CertifiedMechanismContact[] = [];
  for (const evidence of certificate.contactForces) {
    const key = contactKey(evidence.contactA, evidence.contactB);
    const contact = validateCertifiedContact(
      evidence,
      declaredContacts.get(key),
      certificate,
      partsByName,
      seen,
    );
    if (typeof contact === 'string') return contact;
    seen.add(key);
    resolved.push(contact);
  }
  return resolved;
}

function buildRigidGroupTopology(arm: Assembly): RigidGroupTopology | PreparationFailure {
  const parts = arm.__parts();
  const partNames = new Set(parts.map((part) => part.name));
  const groups = new DisjointSet(partNames);
  for (const mate of arm.__mates()) {
    const endpoints = mateEndpointParts(mate);
    if (typeof endpoints === 'string') return { kind: 'input', message: endpoints };
    if (!partNames.has(endpoints.aPart) || !partNames.has(endpoints.bPart)) {
      return { kind: 'input', message: `Mate '${mate.name}' references an unknown part.` };
    }
    if (mate.type === 'fastened') groups.union(endpoints.aPart, endpoints.bPart);
  }

  const groupByPart = new Map(parts.map((part) => [part.name, groups.find(part.name)]));
  const adjacency = new Map<string, ArticulatedEdge[]>();
  for (const group of groupByPart.values()) adjacency.set(group, []);
  const edges: ArticulatedEdge[] = [];
  for (const mate of arm.__mates()) {
    if (mate.type === 'fastened') continue;
    const endpoints = mateEndpointParts(mate);
    if (typeof endpoints === 'string') return { kind: 'input', message: endpoints };
    const edge: ArticulatedEdge = {
      mate,
      ...endpoints,
      aGroup: groupByPart.get(endpoints.aPart)!,
      bGroup: groupByPart.get(endpoints.bPart)!,
    };
    edges.push(edge);
    adjacency.get(edge.aGroup)!.push(edge);
    if (edge.bGroup !== edge.aGroup) adjacency.get(edge.bGroup)!.push(edge);
  }
  return { groupByPart, edges, adjacency };
}

function findSupportedLoadedComponents(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  topology: RigidGroupTopology,
  contacts: readonly CertifiedMechanismContact[],
): SupportedComponent[] | PreparationFailure {
  const stableGroups = new Set(useCase.stableParts.map((part) => topology.groupByPart.get(part)!));
  const loadedGroups = contacts.map((contact) => topology.groupByPart.get(contact.mechanismPart)!);
  const covered = new Set<string>();
  const components: SupportedComponent[] = [];

  for (const loadedGroup of loadedGroups) {
    if (loadedGroup === undefined) {
      return { kind: 'input', message: 'A certified mechanism contact has no rigid-group owner.' };
    }
    if (covered.has(loadedGroup)) continue;
    const componentGroups = collectConnectedGroups(loadedGroup, topology.adjacency);
    for (const group of componentGroups) covered.add(group);
    const componentEdges = topology.edges.filter((edge) =>
      componentGroups.has(edge.aGroup) && componentGroups.has(edge.bGroup));
    const roots = [...componentGroups].filter((group) => stableGroups.has(group));
    if (roots.length === 0) {
      return {
        kind: 'indeterminate',
        message: `Loaded articulated component containing rigid group '${loadedGroup}' has no stable root rigid group.`,
      };
    }
    if (roots.length !== 1) {
      return {
        kind: 'indeterminate',
        message: `Loaded articulated component containing rigid group '${loadedGroup}' has ${roots.length} stable root rigid groups; exactly one is required.`,
      };
    }
    if (componentEdges.length !== componentGroups.size - 1) {
      return {
        kind: 'indeterminate',
        message: `Loaded articulated component containing rigid group '${loadedGroup}' is not a tree (${componentGroups.size} groups, ${componentEdges.length} articulated mates); loops and parallel paths require load-sharing evidence.`,
      };
    }
    components.push({ groups: componentGroups, edges: componentEdges, rootGroup: roots[0] });
  }

  if (contacts.length > 0 && components.length === 0) {
    return { kind: 'input', message: `Use case '${useCase.name}' has no resolvable loaded component.` };
  }
  void arm;
  return components;
}

function orientComponent(
  component: SupportedComponent,
  adjacency: RigidGroupTopology['adjacency'],
): OrientedEdge[] | PreparationFailure {
  const oriented: OrientedEdge[] = [];
  const visited = new Set([component.rootGroup]);
  const queue = [component.rootGroup];
  while (queue.length > 0) {
    const parentGroup = queue.shift()!;
    for (const edge of adjacency.get(parentGroup) ?? []) {
      if (!component.edges.includes(edge)) continue;
      const childGroup = edge.aGroup === parentGroup ? edge.bGroup : edge.aGroup;
      if (visited.has(childGroup)) continue;
      visited.add(childGroup);
      queue.push(childGroup);
      const parentIsA = edge.aGroup === parentGroup;
      oriented.push({
        edge,
        parentGroup,
        childGroup,
        parentPart: parentIsA ? edge.aPart : edge.bPart,
        childPart: parentIsA ? edge.bPart : edge.aPart,
      });
    }
  }
  if (visited.size !== component.groups.size || oriented.length !== component.edges.length) {
    return { kind: 'indeterminate', message: 'Loaded articulated component could not be oriented as a rooted tree.' };
  }
  return oriented;
}

async function resolveJointFrame(
  arm: Assembly,
  transforms: ReadonlyMap<string, Transform>,
  oriented: OrientedEdge,
): Promise<ResolvedJointFrame | string> {
  const parentRef = oriented.parentPart === oriented.edge.aPart
    ? oriented.edge.mate.a
    : oriented.edge.mate.b;
  const childRef = oriented.childPart === oriented.edge.aPart
    ? oriented.edge.mate.a
    : oriented.edge.mate.b;
  const parent = await resolveConnectorSide(arm, transforms, parentRef);
  if (typeof parent === 'string') return `Mate '${oriented.edge.mate.name}' parent side: ${parent}`;
  const child = await resolveConnectorSide(arm, transforms, childRef);
  if (typeof child === 'string') return `Mate '${oriented.edge.mate.name}' child side: ${child}`;
  if (distance(parent.pointWorldMm, child.pointWorldMm) > CONNECTOR_COINCIDENCE_TOLERANCE_MM) {
    return `Mate '${oriented.edge.mate.name}' connector origins are not coincident at the certified pose.`;
  }
  if (Math.abs(dot(parent.axisWorld, child.axisWorld)) < 1 - AXIS_ALIGNMENT_TOLERANCE) {
    return `Mate '${oriented.edge.mate.name}' connector axes are not aligned at the certified pose.`;
  }
  return {
    pointWorldMm: midpoint(parent.pointWorldMm, child.pointWorldMm),
    axisWorld: parent.axisWorld,
  };
}

async function resolveConnectorSide(
  arm: Assembly,
  transforms: ReadonlyMap<string, Transform>,
  ref: string,
): Promise<ResolvedJointFrame | string> {
  const resolved = await resolveConnectorPoint(arm, transforms, ref);
  if (typeof resolved === 'string') return resolved;
  const { connector, pointWorldMm, transform } = resolved;
  if (connector.type !== 'axis') return `connector '${ref}' is not an axis connector.`;
  const localAxis = connector.axis ?? [0, 0, 1];
  if (!isFiniteVec3(localAxis) || norm(localAxis) <= 0) {
    return `connector '${ref}' has no finite non-zero axis.`;
  }
  const axisWorld = unit([...transform.axisDir(localAxis)] as Vec3);
  if (!isFiniteVec3(axisWorld) || norm(axisWorld) <= 0) {
    return `connector '${ref}' has a non-finite solved axis.`;
  }
  return { pointWorldMm, axisWorld };
}

function contactWrenchesByGroup(
  groupByPart: ReadonlyMap<string, string>,
  contacts: readonly CertifiedMechanismContact[],
): Map<string, WrenchAtWorldOrigin> {
  const result = new Map<string, WrenchAtWorldOrigin>();
  for (const contact of contacts) {
    const group = groupByPart.get(contact.mechanismPart)!;
    const current = result.get(group) ?? zeroWrench();
    result.set(group, {
      forceWorldN: add(current.forceWorldN, contact.forceOnMechanismWorldN),
      momentWorldNmm: add(
        current.momentWorldNmm,
        cross(contact.pointWorldMm, contact.forceOnMechanismWorldN),
      ),
    });
  }
  return result;
}

function accumulateComponentReactions(
  rootGroup: string,
  oriented: readonly OrientedEdge[],
  frameByEdge: ReadonlyMap<ArticulatedEdge, ResolvedJointFrame>,
  externalByGroup: ReadonlyMap<string, WrenchAtWorldOrigin>,
  reactions: PhysicalUseCaseJointReactionEvidence[],
): AccumulatedSubtree {
  const children = new Map<string, OrientedEdge[]>();
  for (const entry of oriented) {
    const list = children.get(entry.parentGroup) ?? [];
    list.push(entry);
    children.set(entry.parentGroup, list);
  }

  const accumulate = (group: string): AccumulatedSubtree => {
    const ownWrench = externalByGroup.get(group);
    let subtree = ownWrench ?? zeroWrench();
    let hasAppliedContactLoad = ownWrench !== undefined && norm(ownWrench.forceWorldN) > 1e-9;
    for (const child of children.get(group) ?? []) {
      const childSubtree = accumulate(child.childGroup);
      const frame = frameByEdge.get(child.edge)!;
      const externalMomentAtJoint = sub(
        childSubtree.wrench.momentWorldNmm,
        cross(frame.pointWorldMm, childSubtree.wrench.forceWorldN),
      );
      const forceWorldN = scale(childSubtree.wrench.forceWorldN, -1);
      const momentWorldNmm = scale(externalMomentAtJoint, -1);
      if (childSubtree.hasAppliedContactLoad) {
        reactions.push(makeReactionEvidence(child, frame, forceWorldN, momentWorldNmm));
      }
      subtree = addWrenches(subtree, childSubtree.wrench);
      hasAppliedContactLoad ||= childSubtree.hasAppliedContactLoad;
    }
    return { wrench: subtree, hasAppliedContactLoad };
  };
  return accumulate(rootGroup);
}

function makeReactionEvidence(
  oriented: OrientedEdge,
  frame: ResolvedJointFrame,
  forceWorldN: Vec3,
  momentWorldNmm: Vec3,
): PhysicalUseCaseJointReactionEvidence {
  const axialForce = dot(forceWorldN, frame.axisWorld);
  const axisMoment = dot(momentWorldNmm, frame.axisWorld);
  const radialForce = sub(forceWorldN, scale(frame.axisWorld, axialForce));
  const bendingMoment = sub(momentWorldNmm, scale(frame.axisWorld, axisMoment));
  return {
    mateName: oriented.edge.mate.name,
    parentPart: oriented.parentPart,
    childPart: oriented.childPart,
    pointWorldMm: copyVec(frame.pointWorldMm),
    axisWorld: copyVec(frame.axisWorld),
    forceWorldN: copyVec(forceWorldN),
    momentWorldNmm: copyVec(momentWorldNmm),
    resultantForceN: norm(forceWorldN),
    resultantMomentNmm: norm(momentWorldNmm),
    axialForceN: Math.abs(axialForce),
    radialForceN: norm(radialForce),
    axisMomentNmm: Math.abs(axisMoment),
    bendingMomentNmm: norm(bendingMoment),
  };
}

function mateEndpointParts(mate: Mate): { aPart: string; bPart: string } | string {
  const aPart = safePartName(mate.a);
  const bPart = safePartName(mate.b);
  if (aPart === undefined || bPart === undefined) {
    return `Mate '${mate.name}' has a malformed connector reference.`;
  }
  return { aPart, bPart };
}

function collectConnectedGroups(
  start: string,
  adjacency: RigidGroupTopology['adjacency'],
): Set<string> {
  const result = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const group = queue.shift()!;
    for (const edge of adjacency.get(group) ?? []) {
      const neighbor = edge.aGroup === group ? edge.bGroup : edge.aGroup;
      if (result.has(neighbor)) continue;
      result.add(neighbor);
      queue.push(neighbor);
    }
  }
  return result;
}

class DisjointSet {
  private readonly parent = new Map<string, string>();
  private readonly rank = new Map<string, number>();

  constructor(values: Iterable<string>) {
    for (const value of values) {
      this.parent.set(value, value);
      this.rank.set(value, 0);
    }
  }

  find(value: string): string {
    const parent = this.parent.get(value);
    if (parent === undefined) throw new Error(`Unknown disjoint-set value '${value}'.`);
    if (parent === value) return value;
    const root = this.find(parent);
    this.parent.set(value, root);
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;
    const rankA = this.rank.get(rootA)!;
    const rankB = this.rank.get(rootB)!;
    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else {
      this.parent.set(rootB, rootA);
      if (rankA === rankB) this.rank.set(rootA, rankA + 1);
    }
  }
}

function failure(
  useCaseName: string,
  problem: PreparationFailure,
): PhysicalUseCaseJointReactionsResult {
  return problem.kind === 'input'
    ? inputFailure(useCaseName, problem.message)
    : {
        certificates: [],
        issues: [{ kind: 'joint-reaction-indeterminate', useCaseName, message: problem.message }],
      };
}

function inputFailure(useCaseName: string, message: string): PhysicalUseCaseJointReactionsResult {
  return {
    certificates: [],
    issues: [{ kind: 'joint-reaction-input-incomplete', useCaseName, message }],
  };
}

function copyPoses(poses: NumericPoses): NumericPoses {
  return Object.fromEntries(Object.entries(poses).map(([name, pose]) => [
    name,
    Array.isArray(pose) ? [pose[0], pose[1], pose[2]] : pose,
  ]));
}

function zeroWrench(): WrenchAtWorldOrigin {
  return { forceWorldN: [0, 0, 0], momentWorldNmm: [0, 0, 0] };
}

function addWrenches(a: WrenchAtWorldOrigin, b: WrenchAtWorldOrigin): WrenchAtWorldOrigin {
  return {
    forceWorldN: add(a.forceWorldN, b.forceWorldN),
    momentWorldNmm: add(a.momentWorldNmm, b.momentWorldNmm),
  };
}


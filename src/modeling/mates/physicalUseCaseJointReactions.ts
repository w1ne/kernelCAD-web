// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import type { NumericPoses } from '../capture/forwardKinematics';
import type { Vec3 } from '../../shared/intent/types';
import { currentValue } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';
import type { Transform } from '../../shared/runtime/se3';
import { resolveConnectorOrigin, type Connector } from './connector';
import { parseConnectorRef } from './mate';
import type { PhysicalUseCaseRecord } from './physicalUseCase';
import {
  DEFAULT_FORCE_RESIDUAL_N,
  DEFAULT_TORQUE_RESIDUAL_NMM,
  type PhysicalUseCaseStaticCertificate,
  type PhysicalUseCaseStaticContactForce,
} from './physicalUseCaseStatics';
import { solveMates } from './solver';

const CONNECTOR_COINCIDENCE_TOLERANCE_MM = 1e-6;
const AXIS_ALIGNMENT_TOLERANCE = 1e-6;
const CERTIFICATE_POINT_TOLERANCE_MM = 1e-6;
const CONTACT_DISTANCE_TOLERANCE_MM = 1e-6;
const CERTIFICATE_NUMERIC_TOLERANCE = 1e-8;

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

interface CertifiedMechanismContact {
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

interface ResolvedConnectorPoint {
  readonly connector: Connector;
  readonly pointWorldMm: Vec3;
  readonly transform: Transform;
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
    const declared = useCase.contacts.find((candidate) =>
      contactKey(candidate.a, candidate.b) ===
      contactKey(contact.evidence.contactA, contact.evidence.contactB));
    if (declared === undefined) {
      return `Certified contact '${contact.evidence.contactA}' to '${contact.evidence.contactB}' is not declared.`;
    }
    const aPoint = await resolveConnectorPoint(arm, transforms, declared.a);
    if (typeof aPoint === 'string') return aPoint;
    const bPoint = await resolveConnectorPoint(arm, transforms, declared.b);
    if (typeof bPoint === 'string') return bPoint;
    const maxSlipMm = useCase.criteria?.maxSlipMm ?? 0;
    if (!Number.isFinite(maxSlipMm) || maxSlipMm < 0) {
      return `Use-case maxSlipMm must be a finite non-negative value.`;
    }
    const endpointDistanceMm = distance(aPoint.pointWorldMm, bPoint.pointWorldMm);
    if (endpointDistanceMm > maxSlipMm + CONTACT_DISTANCE_TOLERANCE_MM) {
      return `Solved contact endpoint distance ${endpointDistanceMm} mm for '${declared.a}' to '${declared.b}' exceeds maxSlipMm ${maxSlipMm}.`;
    }
    const expectedPoint = midpoint(aPoint.pointWorldMm, bPoint.pointWorldMm);
    if (distance(contact.evidence.pointWorldMm, expectedPoint) > CERTIFICATE_POINT_TOLERANCE_MM) {
      return `Certified contact point for '${declared.a}' to '${declared.b}' does not match the solved endpoint midpoint.`;
    }

    const heldNormal = contactHeldWorldNormal(
      declared,
      certificate.heldPart,
      transforms,
    );
    if (typeof heldNormal === 'string') return heldNormal;
    const normalForceN = dot(contact.evidence.forceOnHeldWorldN, heldNormal);
    const tangentialForceN = norm(sub(
      contact.evidence.forceOnHeldWorldN,
      scale(heldNormal, normalForceN),
    ));
    if (
      !numbersMatch(normalForceN, contact.evidence.normalForceN) ||
      !numbersMatch(tangentialForceN, contact.evidence.tangentialForceN)
    ) {
      return `Certified contact force metadata for '${declared.a}' to '${declared.b}' does not match forceOnHeldWorldN at the solved pose.`;
    }
    if (
      normalForceN < -CERTIFICATE_NUMERIC_TOLERANCE ||
      normalForceN > contact.evidence.normalCapacityN + CERTIFICATE_NUMERIC_TOLERANCE ||
      tangentialForceN >
        contact.evidence.friction * Math.max(0, normalForceN) + CERTIFICATE_NUMERIC_TOLERANCE
    ) {
      return `Certified contact force for '${declared.a}' to '${declared.b}' is outside its solved-pose contact limits.`;
    }
  }

  const loads: { force: Vec3; torque: Vec3; pointWorldMm?: Vec3 }[] = [];
  for (const load of useCase.loads) {
    if (load.force !== undefined && !isFiniteVec3(load.force)) {
      return `Declared force load on '${load.part}' is not a finite Vec3.`;
    }
    if (load.torque !== undefined && !isFiniteVec3(load.torque)) {
      return `Declared torque load on '${load.part}' is not a finite Vec3.`;
    }
    let pointWorldMm: Vec3 | undefined;
    if (load.at !== undefined) {
      const parsed = safeParseConnectorRef(load.at);
      if (parsed?.partName !== certificate.heldPart) {
        return `Load application connector '${load.at}' does not belong to held part '${certificate.heldPart}'.`;
      }
      const resolved = await resolveConnectorPoint(arm, transforms, load.at);
      if (typeof resolved === 'string') return resolved;
      pointWorldMm = resolved.pointWorldMm;
    } else if (hasNonZeroVec(load.force)) {
      return `Force load on '${load.part}' has no application connector at the certified pose.`;
    }
    loads.push({
      force: load.force === undefined ? [0, 0, 0] : copyVec(load.force),
      torque: load.torque === undefined ? [0, 0, 0] : copyVec(load.torque),
      ...(pointWorldMm === undefined ? {} : { pointWorldMm }),
    });
  }
  const referencePoint = loads.find((load) => load.pointWorldMm !== undefined)?.pointWorldMm;
  if (referencePoint === undefined) {
    return `Held part '${certificate.heldPart}' has no resolved load application connector.`;
  }

  let netForce: Vec3 = [0, 0, 0];
  let netMoment: Vec3 = [0, 0, 0];
  for (const load of loads) {
    netForce = add(netForce, load.force);
    netMoment = add(netMoment, load.torque);
    if (load.pointWorldMm !== undefined) {
      netMoment = add(
        netMoment,
        cross(sub(load.pointWorldMm, referencePoint), load.force),
      );
    }
  }
  for (const contact of contacts) {
    netForce = add(netForce, contact.evidence.forceOnHeldWorldN);
    netMoment = add(
      netMoment,
      cross(
        sub(contact.evidence.pointWorldMm, referencePoint),
        contact.evidence.forceOnHeldWorldN,
      ),
    );
  }

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

function contactHeldWorldNormal(
  contact: PhysicalUseCaseRecord['contacts'][number],
  heldPart: string,
  transforms: ReadonlyMap<string, Transform>,
): Vec3 | string {
  const frame = contact.normalFrame ?? 'world';
  let worldNormal: Vec3;
  if (frame === 'world') {
    worldNormal = copyVec(contact.normal);
  } else {
    const ref = frame === 'a' ? contact.a : contact.b;
    const partName = safePartName(ref);
    const transform = partName === undefined ? undefined : transforms.get(partName);
    if (transform === undefined) {
      return `Contact normal frame '${frame}' for '${contact.a}' to '${contact.b}' could not be resolved.`;
    }
    worldNormal = [...transform.axisDir(contact.normal)] as Vec3;
  }
  if (!isFiniteVec3(worldNormal) || norm(worldNormal) <= 0) {
    return `Contact normal for '${contact.a}' to '${contact.b}' is not finite and non-zero.`;
  }
  worldNormal = unit(worldNormal);
  return safePartName(contact.a) === heldPart ? worldNormal : scale(worldNormal, -1);
}

function validateCertificateInput(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  certificate: PhysicalUseCaseStaticCertificate,
): CertifiedMechanismContact[] | string {
  if (certificate.useCaseName !== useCase.name) {
    return `Static certificate use case '${certificate.useCaseName}' does not match '${useCase.name}'.`;
  }
  const partsByName = new Map(arm.__parts().map((part) => [part.name, part]));
  if (!partsByName.has(certificate.heldPart)) {
    return `Static certificate held part '${certificate.heldPart}' does not exist in the assembly.`;
  }
  const loadedParts = [...new Set(useCase.loads.map((load) => load.part))];
  if (loadedParts.length !== 1 || loadedParts[0] !== certificate.heldPart) {
    return `Static certificate held part '${certificate.heldPart}' does not match the use-case load owner.`;
  }
  for (const stablePart of useCase.stableParts) {
    if (!partsByName.has(stablePart)) {
      return `Stable part '${stablePart}' does not exist in the assembly.`;
    }
  }
  for (const mate of arm.__mates()) {
    const aPart = safePartName(mate.a);
    const bPart = safePartName(mate.b);
    if (aPart === certificate.heldPart || bPart === certificate.heldPart) {
      return `Static certificate held part '${certificate.heldPart}' is connected by structural mate '${mate.name}'.`;
    }
  }

  const forceLimit = useCase.criteria?.maxForceResidualN ?? DEFAULT_FORCE_RESIDUAL_N;
  const torqueLimit = useCase.criteria?.maxTorqueResidualNmm ?? DEFAULT_TORQUE_RESIDUAL_NMM;
  if (
    !isNonNegativeFinite(certificate.forceResidualN) ||
    certificate.forceResidualN > forceLimit + 1e-12 ||
    !isNonNegativeFinite(certificate.torqueResidualNmm) ||
    certificate.torqueResidualNmm > torqueLimit + 1e-12
  ) {
    return 'Static certificate residuals are not finite passing values for this use case.';
  }

  const matesByName = new Map(arm.__mates().map((mate) => [mate.name, mate]));
  for (const [mateName, pose] of Object.entries(certificate.poses)) {
    const mate = matesByName.get(mateName);
    if (mate === undefined) return `Static certificate pose names unknown mate '${mateName}'.`;
    if (!isFinitePose(pose)) return `Static certificate pose for mate '${mateName}' is not finite.`;
    if (mate.type === 'ball' ? !Array.isArray(pose) : Array.isArray(pose)) {
      return `Static certificate pose for mate '${mateName}' has the wrong shape for '${mate.type}'.`;
    }
    if (mate.type === 'fastened' || mate.type === 'planar') {
      return `Static certificate must not provide a pose for zero-DOF mate '${mateName}'.`;
    }
  }

  if (certificate.contactForces.length !== useCase.contacts.length) {
    return `Static certificate has ${certificate.contactForces.length} contact forces for ${useCase.contacts.length} declared contacts.`;
  }
  const declaredContacts = new Map<string, PhysicalUseCaseRecord['contacts'][number]>();
  for (const contact of useCase.contacts) {
    const key = contactKey(contact.a, contact.b);
    if (declaredContacts.has(key)) {
      return `Use case declares duplicate contact '${contact.a}' to '${contact.b}'.`;
    }
    declaredContacts.set(key, contact);
  }

  const seen = new Set<string>();
  const resolved: CertifiedMechanismContact[] = [];
  for (const evidence of certificate.contactForces) {
    const key = contactKey(evidence.contactA, evidence.contactB);
    const declared = declaredContacts.get(key);
    if (declared === undefined || seen.has(key)) {
      return `Static certificate contact '${evidence.contactA}' to '${evidence.contactB}' does not match the declared contacts.`;
    }
    seen.add(key);
    const aPart = safePartName(evidence.contactA);
    const bPart = safePartName(evidence.contactB);
    const heldIsA = aPart === certificate.heldPart;
    const heldIsB = bPart === certificate.heldPart;
    if (aPart === undefined || bPart === undefined || heldIsA === heldIsB) {
      return `Static certificate contact '${evidence.contactA}' to '${evidence.contactB}' has invalid held/mechanism ownership.`;
    }
    const mechanismPart = heldIsA ? bPart : aPart;
    if (evidence.mechanismPart !== mechanismPart || !partsByName.has(mechanismPart)) {
      return `Static certificate mechanism part '${evidence.mechanismPart}' does not own the non-held contact endpoint.`;
    }
    if (
      !connectorExists(partsByName, evidence.contactA) ||
      !connectorExists(partsByName, evidence.contactB)
    ) {
      return `Static certificate contact '${evidence.contactA}' to '${evidence.contactB}' names an unknown connector.`;
    }
    if (!isFiniteVec3(evidence.pointWorldMm) || !isFiniteVec3(evidence.forceOnHeldWorldN)) {
      return `Static certificate contact '${evidence.contactA}' to '${evidence.contactB}' has a non-finite point or force.`;
    }
    if (
      !isNonNegativeFinite(evidence.normalForceN) ||
      !isNonNegativeFinite(evidence.tangentialForceN) ||
      !isPositiveFinite(evidence.normalCapacityN) ||
      !isPositiveFinite(evidence.friction) ||
      evidence.normalForceN > evidence.normalCapacityN + 1e-8 ||
      evidence.tangentialForceN > evidence.friction * evidence.normalForceN + 1e-8
    ) {
      return `Static certificate contact '${evidence.contactA}' to '${evidence.contactB}' is outside its certified contact limits.`;
    }
    if (
      declared.normalForceN === undefined ||
      !nearlyEqual(evidence.normalCapacityN, declared.normalForceN) ||
      !nearlyEqual(evidence.friction, declared.friction)
    ) {
      return `Static certificate contact '${evidence.contactA}' to '${evidence.contactB}' does not match declared capacity or friction.`;
    }
    resolved.push({
      evidence,
      mechanismPart,
      pointWorldMm: copyVec(evidence.pointWorldMm),
      forceOnMechanismWorldN: scale(evidence.forceOnHeldWorldN, -1),
    });
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

async function resolveConnectorPoint(
  arm: Assembly,
  transforms: ReadonlyMap<string, Transform>,
  ref: string,
): Promise<ResolvedConnectorPoint | string> {
  const parsed = safeParseConnectorRef(ref);
  if (parsed === undefined) return `connector reference '${ref}' is malformed.`;
  const part = arm.__parts().find((candidate) => candidate.name === parsed.partName);
  const connector = part?.mateConnectors.find((candidate) => candidate.name === parsed.connectorName);
  const transform = transforms.get(parsed.partName);
  if (part === undefined || connector === undefined || transform === undefined) {
    return `connector '${ref}' could not be resolved in the solved assembly.`;
  }
  let localPoint: Vec3;
  try {
    localPoint = (await resolveConnectorOrigin(
      part.originalShape,
      connector.origin,
      arm.__session().getRecords(),
    )).value;
  } catch (error) {
    return `connector '${ref}' origin could not be resolved: ${errorMessage(error)}.`;
  }
  const pointWorldMm = [...transform.point(localPoint)] as Vec3;
  if (!isFiniteVec3(pointWorldMm)) {
    return `connector '${ref}' has a non-finite solved transform.`;
  }
  return { connector, pointWorldMm, transform };
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

function connectorExists(
  partsByName: ReadonlyMap<string, AssemblyPartStored>,
  ref: string,
): boolean {
  const parsed = safeParseConnectorRef(ref);
  return parsed !== undefined &&
    partsByName.get(parsed.partName)?.mateConnectors.some(
      (connector: Connector) => connector.name === parsed.connectorName,
    ) === true;
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

function safeParseConnectorRef(ref: string): ReturnType<typeof parseConnectorRef> | undefined {
  try {
    return parseConnectorRef(ref);
  } catch {
    return undefined;
  }
}

function safePartName(ref: string): string | undefined {
  return safeParseConnectorRef(ref)?.partName;
}

function contactKey(a: string, b: string): string {
  return `${a}\n${b}`;
}

function copyPoses(poses: NumericPoses): NumericPoses {
  return Object.fromEntries(Object.entries(poses).map(([name, pose]) => [
    name,
    Array.isArray(pose) ? [pose[0], pose[1], pose[2]] : pose,
  ]));
}

function isFinitePose(value: number | [number, number, number]): boolean {
  return Array.isArray(value)
    ? value.length === 3 && value.every(Number.isFinite)
    : Number.isFinite(value);
}

function isFiniteVec3(value: readonly number[]): value is Vec3 {
  return value.length === 3 && value.every(Number.isFinite);
}

function hasNonZeroVec(value: readonly number[] | undefined): value is Vec3 {
  return value !== undefined && isFiniteVec3(value) && norm(value) > 0;
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

function numbersMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <=
    CERTIFICATE_NUMERIC_TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
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

function copyVec(value: readonly [number, number, number]): Vec3 {
  return [value[0], value[1], value[2]];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(value: readonly [number, number, number], scalar: number): Vec3 {
  return [value[0] * scalar, value[1] * scalar, value[2] * scalar];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function norm(value: Vec3): number {
  return Math.hypot(value[0], value[1], value[2]);
}

function unit(value: Vec3): Vec3 {
  return scale(value, 1 / norm(value));
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return scale(add(a, b), 0.5);
}

function distance(a: Vec3, b: Vec3): number {
  return norm(sub(a, b));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

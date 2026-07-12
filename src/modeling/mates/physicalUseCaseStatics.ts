// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Assembly } from '../capture/assembly';
import type { NumericPoses } from '../capture/forwardKinematics';
import type { Vec3 } from '../../shared/intent/types';
import type { Transform } from '../../shared/runtime/se3';
import { expandCoupledPoses } from './coupledPoses';
import { parseConnectorRef } from './mate';
import { solveMates } from './solver';
import type {
  PhysicalUseCaseContact,
  PhysicalUseCaseRecord,
} from './physicalUseCase';
import type { PhysicalUseCasePoseWitness } from './physicalUseCaseReachability';

export const DEFAULT_FORCE_RESIDUAL_N = 0.01;
export const DEFAULT_TORQUE_RESIDUAL_NMM = 0.1;
const FRICTION_PYRAMID_EDGE_COUNT = 8;
const MAX_PROJECTED_GRADIENT_ITERATIONS = 12_000;
const ACTUATOR_JACOBIAN_STEP_RAD = 1e-4;

export interface PhysicalUseCaseStaticInputIssue {
  readonly kind: 'static-input-incomplete';
  readonly useCaseName: string;
  readonly message: string;
}

export interface PhysicalUseCaseStaticEquilibriumIssue {
  readonly kind: 'static-equilibrium-unmet';
  readonly useCaseName: string;
  readonly bestPoses?: NumericPoses;
  readonly bestForceResidualN?: number;
  readonly bestTorqueResidualNmm?: number;
}

export interface PhysicalUseCaseStaticActuatorTorqueIssue {
  readonly kind: 'static-actuator-torque-insufficient';
  readonly useCaseName: string;
  readonly bestPoses?: NumericPoses;
  readonly actuatorTorques: readonly PhysicalUseCaseStaticActuatorTorqueEvidence[];
}

export type PhysicalUseCaseStaticIssue =
  | PhysicalUseCaseStaticInputIssue
  | PhysicalUseCaseStaticEquilibriumIssue
  | PhysicalUseCaseStaticActuatorTorqueIssue;

export interface PhysicalUseCaseStaticContactForce {
  readonly contactA: string;
  readonly contactB: string;
  readonly pointWorldMm: Vec3;
  readonly mechanismPart: string;
  readonly forceOnHeldWorldN: Vec3;
  readonly normalForceN: number;
  readonly tangentialForceN: number;
  readonly normalCapacityN: number;
  readonly friction: number;
}

export interface PhysicalUseCaseStaticActuatorTorqueEvidence {
  readonly mateName: string;
  readonly requiredTorqueNmm: number;
  readonly maxTorqueNmm: number;
}

export interface PhysicalUseCaseStaticCertificate {
  readonly useCaseName: string;
  readonly heldPart: string;
  readonly poses: NumericPoses;
  readonly forceResidualN: number;
  readonly torqueResidualNmm: number;
  readonly contactForces: readonly PhysicalUseCaseStaticContactForce[];
  readonly actuatorTorques: readonly PhysicalUseCaseStaticActuatorTorqueEvidence[];
}

export interface PhysicalUseCaseStaticsResult {
  readonly issues: readonly PhysicalUseCaseStaticIssue[];
  readonly certificates: readonly PhysicalUseCaseStaticCertificate[];
}

interface ResolvedLoad {
  readonly force: Vec3;
  readonly torque: Vec3;
  readonly point?: Vec3;
}

interface ResolvedContact {
  readonly contact: PhysicalUseCaseContact;
  readonly point: Vec3;
  readonly heldNormal: Vec3;
  readonly generators: readonly Vec3[];
  readonly capN: number;
  readonly heldRef: string;
  readonly mechanismRef: string;
}

interface ResolvedActuator {
  readonly mateName: string;
  readonly maxTorqueNmm: number;
  readonly coefficients: readonly number[];
}

interface ResolvedStaticSample {
  readonly heldPart: string;
  readonly poses: NumericPoses;
  readonly referencePoint: Vec3;
  readonly externalForce: Vec3;
  readonly externalTorque: Vec3;
  readonly contacts: readonly ResolvedContact[];
  readonly actuators: readonly ResolvedActuator[];
  readonly forceToleranceN: number;
  readonly torqueToleranceNmm: number;
}

interface SearchCandidate {
  readonly weights: readonly number[];
  readonly contactForces: readonly PhysicalUseCaseStaticContactForce[];
  readonly forceResidualN: number;
  readonly torqueResidualNmm: number;
  readonly normalizedResidual: number;
  readonly actuatorTorques: readonly PhysicalUseCaseStaticActuatorTorqueEvidence[];
}

export async function reviewPhysicalUseCaseStatics(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  witnesses: readonly PhysicalUseCasePoseWitness[],
): Promise<PhysicalUseCaseStaticsResult> {
  if (witnesses.length === 0) {
    return {
      certificates: [],
      issues: [{
        kind: 'static-input-incomplete',
        useCaseName: useCase.name,
        message: 'No complete common-contact pose witness was provided for static review.',
      }],
    };
  }

  let best: { poses: NumericPoses; forceResidualN: number; torqueResidualNmm: number; score: number } | undefined;
  let bestActuator: {
    poses: NumericPoses;
    actuatorTorques: readonly PhysicalUseCaseStaticActuatorTorqueEvidence[];
    violation: number;
  } | undefined;
  let equilibriumFound = false;
  for (const witness of witnesses) {
    const resolved = await resolveStaticSample(arm, useCase, witness);
    if (typeof resolved === 'string') {
      return {
        certificates: [],
        issues: [{ kind: 'static-input-incomplete', useCaseName: useCase.name, message: resolved }],
      };
    }

    const contactCandidate = searchContactAllocation(resolved, false);
    if (
      best === undefined ||
      contactCandidate.normalizedResidual < best.score
    ) {
      best = {
        poses: { ...resolved.poses },
        forceResidualN: contactCandidate.forceResidualN,
        torqueResidualNmm: contactCandidate.torqueResidualNmm,
        score: contactCandidate.normalizedResidual,
      };
    }

    if (!isVerifiedContactCertificate(resolved, contactCandidate)) continue;
    equilibriumFound = true;
    const candidate = resolved.actuators.length === 0
      ? contactCandidate
      : searchContactAllocation(resolved, true);
    const actuatorViolation = totalActuatorViolation(candidate.actuatorTorques);
    if (bestActuator === undefined || actuatorViolation < bestActuator.violation) {
      bestActuator = {
        poses: { ...resolved.poses },
        actuatorTorques: candidate.actuatorTorques,
        violation: actuatorViolation,
      };
    }
    if (!isVerifiedContactCertificate(resolved, candidate) || !areActuatorsWithinLimits(candidate)) continue;
    return {
      issues: [],
      certificates: [{
        useCaseName: useCase.name,
        heldPart: resolved.heldPart,
        poses: { ...resolved.poses },
        forceResidualN: candidate.forceResidualN,
        torqueResidualNmm: candidate.torqueResidualNmm,
        contactForces: candidate.contactForces,
        actuatorTorques: candidate.actuatorTorques,
      }],
    };
  }

  if (equilibriumFound) {
    return {
      certificates: [],
      issues: [{
        kind: 'static-actuator-torque-insufficient',
        useCaseName: useCase.name,
        ...(bestActuator === undefined ? {} : { bestPoses: bestActuator.poses }),
        actuatorTorques: bestActuator?.actuatorTorques ?? [],
      }],
    };
  }

  return {
    certificates: [],
    issues: [{
      kind: 'static-equilibrium-unmet',
      useCaseName: useCase.name,
      ...(best === undefined ? {} : {
        bestPoses: best.poses,
        bestForceResidualN: best.forceResidualN,
        bestTorqueResidualNmm: best.torqueResidualNmm,
      }),
    }],
  };
}

async function resolveStaticSample(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  witness: PhysicalUseCasePoseWitness,
): Promise<ResolvedStaticSample | string> {
  const heldParts = [...new Set(useCase.loads.map((load) => load.part))];
  if (heldParts.length !== 1) {
    return 'Static equilibrium v1 requires every load to act on one held part.';
  }
  const heldPart = heldParts[0];
  if (useCase.stableParts.includes(heldPart)) {
    return `Held part '${heldPart}' cannot also be a stable part.`;
  }
  if (arm.__mates().some((mate) =>
    safePartName(mate.a) === heldPart || safePartName(mate.b) === heldPart)) {
    return `Held part '${heldPart}' must be disconnected from structural mates in static equilibrium v1.`;
  }

  const forceToleranceN = useCase.criteria?.maxForceResidualN ?? DEFAULT_FORCE_RESIDUAL_N;
  const torqueToleranceNmm = useCase.criteria?.maxTorqueResidualNmm ?? DEFAULT_TORQUE_RESIDUAL_NMM;
  if (!isPositiveFinite(forceToleranceN) || !isPositiveFinite(torqueToleranceNmm)) {
    return 'Static residual tolerances must be positive finite values.';
  }
  if (
    forceToleranceN > DEFAULT_FORCE_RESIDUAL_N ||
    torqueToleranceNmm > DEFAULT_TORQUE_RESIDUAL_NMM
  ) {
    return `Static residual tolerances cannot exceed ${DEFAULT_FORCE_RESIDUAL_N} N force and ${DEFAULT_TORQUE_RESIDUAL_NMM} Nmm torque.`;
  }

  const loads: ResolvedLoad[] = [];
  for (const load of useCase.loads) {
    if (load.force !== undefined && !isFiniteVec3(load.force)) {
      return `Force load on '${heldPart}' must be a finite Vec3.`;
    }
    if (load.torque !== undefined && !isFiniteVec3(load.torque)) {
      return `Torque load on '${heldPart}' must be a finite Vec3.`;
    }
    let point: Vec3 | undefined;
    if (load.at !== undefined) {
      const parsed = safeParseConnectorRef(load.at);
      if (parsed?.partName !== heldPart) {
        return `Load application connector '${load.at}' must belong to held part '${heldPart}'.`;
      }
      point = connectorWorldPoint(arm, witness.transforms, load.at);
      if (point === undefined) {
        return `Load application connector '${load.at}' could not be resolved at the sampled pose.`;
      }
    } else if (hasNonZeroVec(load.force)) {
      return `Force load on '${heldPart}' requires load.at naming an application connector.`;
    }
    loads.push({
      force: load.force === undefined ? [0, 0, 0] : copyVec(load.force),
      torque: load.torque === undefined ? [0, 0, 0] : copyVec(load.torque),
      ...(point === undefined ? {} : { point }),
    });
  }

  const referencePoint = loads.find((load) => load.point !== undefined)?.point;
  if (referencePoint === undefined) {
    return `Held part '${heldPart}' requires at least one load with an explicit application connector.`;
  }

  const contacts: ResolvedContact[] = [];
  const seenContactPairs = new Set<string>();
  for (const contact of useCase.contacts) {
    const pairKey = [contact.a, contact.b].sort().join('\n');
    if (seenContactPairs.has(pairKey)) {
      return `Physical use case '${useCase.name}' declares duplicate contact endpoints '${contact.a}' and '${contact.b}'.`;
    }
    seenContactPairs.add(pairKey);
    const aPart = safePartName(contact.a);
    const bPart = safePartName(contact.b);
    const heldIsA = aPart === heldPart;
    const heldIsB = bPart === heldPart;
    if (heldIsA === heldIsB) {
      return `Contact '${contact.a}' to '${contact.b}' must have exactly one endpoint on held part '${heldPart}'.`;
    }
    if (!isPositiveFinite(contact.normalForceN)) {
      return `Contact '${contact.a}' to '${contact.b}' requires a positive normalForceN capacity.`;
    }
    if (!Number.isFinite(contact.friction) || contact.friction <= 0) {
      return `Contact '${contact.a}' to '${contact.b}' requires positive finite friction.`;
    }

    const witnessContact = witness.contacts.find((entry) =>
      entry.contactA === contact.a && entry.contactB === contact.b);
    if (witnessContact === undefined) {
      return `Contact '${contact.a}' to '${contact.b}' is missing from the common-pose witness.`;
    }
    const worldNormal = contactWorldNormal(contact, witness.transforms);
    if (worldNormal === undefined) {
      return `Contact '${contact.a}' to '${contact.b}' has an unresolved normal frame.`;
    }
    const heldNormal = heldIsA ? worldNormal : scale(worldNormal, -1);
    const point = midpoint(witnessContact.pointA, witnessContact.pointB);
    contacts.push({
      contact,
      point,
      heldNormal,
      generators: frictionPyramidGenerators(heldNormal, contact.friction),
      capN: contact.normalForceN,
      heldRef: heldIsA ? contact.a : contact.b,
      mechanismRef: heldIsA ? contact.b : contact.a,
    });
  }
  if (contacts.length === 0) return `Held part '${heldPart}' has no declared contacts.`;

  let externalForce: Vec3 = [0, 0, 0];
  let externalTorque: Vec3 = [0, 0, 0];
  for (const load of loads) {
    externalForce = add(externalForce, load.force);
    externalTorque = add(externalTorque, load.torque);
    if (load.point !== undefined) {
      externalTorque = add(externalTorque, cross(sub(load.point, referencePoint), load.force));
    }
  }

  const actuators = await resolveActuators(arm, useCase, witness, contacts);
  if (typeof actuators === 'string') return actuators;

  return {
    heldPart,
    poses: { ...witness.poses },
    referencePoint,
    externalForce,
    externalTorque,
    contacts,
    actuators,
    forceToleranceN,
    torqueToleranceNmm,
  };
}

async function resolveActuators(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  witness: PhysicalUseCasePoseWitness,
  contacts: readonly ResolvedContact[],
): Promise<ResolvedActuator[] | string> {
  const matesByName = new Map(arm.__mates().map((mate) => [mate.name, mate]));
  const couplings = arm.__mateCouplings();
  const transmissions = arm.__transmissionIntents();
  const actuators: ResolvedActuator[] = [];
  const requiredSources = requiredContactPathActuatorSources(arm, useCase, contacts);
  if (typeof requiredSources === 'string') return requiredSources;
  const declaredActuators = new Set(useCase.actuatorLimits.map((limit) => limit.mate));
  for (const sourceMate of requiredSources) {
    if (!declaredActuators.has(sourceMate)) {
      return `Contact load path requires independent mate '${sourceMate}' in actuatorLimits.`;
    }
  }

  for (const limit of useCase.actuatorLimits) {
    if (!isPositiveFinite(limit.maxTorqueNmm)) {
      return `Actuator '${limit.mate}' requires a positive finite maxTorqueNmm.`;
    }
    const mate = matesByName.get(limit.mate);
    if (mate === undefined) return `Actuator mate '${limit.mate}' does not exist.`;
    if (mate.type !== 'revolute') {
      return `Actuator mate '${limit.mate}' must be revolute for static torque review v1.`;
    }
    if (
      mate.limitsDeg === undefined ||
      !mate.limitsDeg.every(Number.isFinite) ||
      mate.limitsDeg[0] > mate.limitsDeg[1]
    ) {
      return `Actuator mate '${limit.mate}' requires finite ordered limitsDeg.`;
    }
    if (couplings.some((coupling) => coupling.driven === limit.mate)) {
      return `Actuator limit '${limit.mate}' names a driven coupled mate; name its independent source mate instead.`;
    }

    const movedCouplings = collectMovedCouplings(limit.mate, couplings);
    for (const coupling of movedCouplings) {
      const transmission = transmissions.find((candidate) =>
        candidate.sourceMate === coupling.source &&
        candidate.drivenMates.includes(coupling.driven));
      if (transmission === undefined) {
        return `Coupled motion '${coupling.source}' to '${coupling.driven}' requires arm.transmission(...) evidence for static torque review.`;
      }
      if (
        transmission.ratio !== undefined &&
        !nearlyEqual(transmission.ratio, coupling.ratio)
      ) {
        return `Transmission '${transmission.name}' ratio ${transmission.ratio} contradicts coupling ratio ${coupling.ratio} for '${coupling.source}' to '${coupling.driven}'.`;
      }
    }

    const poseDeg = witness.poses[limit.mate];
    if (typeof poseDeg !== 'number' || !Number.isFinite(poseDeg)) {
      return `Actuator mate '${limit.mate}' has no finite scalar pose in the common-pose witness.`;
    }
    const [minDeg, maxDeg] = mate.limitsDeg;
    if (poseDeg < minDeg - 1e-9 || poseDeg > maxDeg + 1e-9) {
      return `Actuator mate '${limit.mate}' pose ${poseDeg} deg is outside limitsDeg.`;
    }

    const baseRelativePoints = relativeContactPoints(arm, witness.transforms, contacts);
    if (baseRelativePoints === undefined) {
      return `Actuator mate '${limit.mate}' has unresolved contact endpoints at the common pose.`;
    }
    const derivative = await relativeContactJacobian(
      arm,
      witness,
      contacts,
      limit.mate,
      poseDeg,
      minDeg,
      maxDeg,
      baseRelativePoints,
    );
    if (typeof derivative === 'string') return derivative;

    const coefficients: number[] = [];
    for (let contactIndex = 0; contactIndex < contacts.length; contactIndex++) {
      for (const generator of contacts[contactIndex].generators) {
        coefficients.push(-dot(derivative[contactIndex], generator));
      }
    }
    actuators.push({
      mateName: limit.mate,
      maxTorqueNmm: limit.maxTorqueNmm,
      coefficients,
    });
  }

  return actuators;
}

function requiredContactPathActuatorSources(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  contacts: readonly ResolvedContact[],
): Set<string> | string {
  type Mate = ReturnType<Assembly['__mates']>[number];
  type PathEdge = { readonly partName: string; readonly mate: Mate };
  const adjacency = new Map<string, PathEdge[]>();
  for (const part of arm.__parts()) adjacency.set(part.name, []);
  for (const mate of arm.__mates()) {
    const aPart = safePartName(mate.a);
    const bPart = safePartName(mate.b);
    if (aPart === undefined || bPart === undefined) continue;
    adjacency.get(aPart)?.push({ partName: bPart, mate });
    adjacency.get(bPart)?.push({ partName: aPart, mate });
  }

  const couplingByDriven = new Map<string, string>();
  for (const coupling of arm.__mateCouplings()) {
    const existing = couplingByDriven.get(coupling.driven);
    if (existing !== undefined && existing !== coupling.source) {
      return `Driven mate '${coupling.driven}' has multiple coupling sources.`;
    }
    couplingByDriven.set(coupling.driven, coupling.source);
  }

  const stableParts = new Set(useCase.stableParts);
  const required = new Set<string>();
  for (const contact of contacts) {
    const mechanismPart = safePartName(contact.mechanismRef);
    if (mechanismPart === undefined) {
      return `Mechanism contact '${contact.mechanismRef}' has no resolvable part.`;
    }
    if (stableParts.has(mechanismPart)) continue;

    const queue = [mechanismPart];
    const visited = new Set(queue);
    const parent = new Map<string, { readonly from: string; readonly mate: Mate }>();
    let reachedStablePart: string | undefined;
    while (queue.length > 0 && reachedStablePart === undefined) {
      const partName = queue.shift()!;
      for (const edge of adjacency.get(partName) ?? []) {
        if (visited.has(edge.partName)) continue;
        visited.add(edge.partName);
        parent.set(edge.partName, { from: partName, mate: edge.mate });
        if (stableParts.has(edge.partName)) {
          reachedStablePart = edge.partName;
          break;
        }
        queue.push(edge.partName);
      }
    }
    if (reachedStablePart === undefined) {
      return `Mechanism contact part '${mechanismPart}' has no mate path to a declared stable part.`;
    }

    let currentPart = reachedStablePart;
    while (currentPart !== mechanismPart) {
      const step = parent.get(currentPart);
      if (step === undefined) {
        return `Mechanism contact part '${mechanismPart}' has an unresolved stable-part path.`;
      }
      if (step.mate.type !== 'fastened') {
        const source = ultimateCouplingSource(step.mate.name, couplingByDriven);
        if (typeof source !== 'string') return source.message;
        required.add(source);
      }
      currentPart = step.from;
    }
  }
  return required;
}

function ultimateCouplingSource(
  mateName: string,
  couplingByDriven: ReadonlyMap<string, string>,
): string | { readonly message: string } {
  const visited = new Set<string>();
  let current = mateName;
  while (couplingByDriven.has(current)) {
    if (visited.has(current)) {
      return { message: `Mate coupling cycle includes '${current}'.` };
    }
    visited.add(current);
    current = couplingByDriven.get(current)!;
  }
  return current;
}

function collectMovedCouplings(
  sourceMate: string,
  couplings: ReturnType<Assembly['__mateCouplings']>,
): ReturnType<Assembly['__mateCouplings']>[number][] {
  const movedMates = new Set([sourceMate]);
  const movedCouplings: ReturnType<Assembly['__mateCouplings']>[number][] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const coupling of couplings) {
      if (!movedMates.has(coupling.source) || movedMates.has(coupling.driven)) continue;
      movedCouplings.push(coupling);
      movedMates.add(coupling.driven);
      changed = true;
    }
  }
  return movedCouplings;
}

async function relativeContactJacobian(
  arm: Assembly,
  witness: PhysicalUseCasePoseWitness,
  contacts: readonly ResolvedContact[],
  mateName: string,
  poseDeg: number,
  minDeg: number,
  maxDeg: number,
  baseRelativePoints: readonly Vec3[],
): Promise<Vec3[] | string> {
  const deltaDeg = ACTUATOR_JACOBIAN_STEP_RAD * 180 / Math.PI;
  const availableMinus = Math.max(0, poseDeg - minDeg);
  const availablePlus = Math.max(0, maxDeg - poseDeg);

  if (availableMinus > 1e-12 && availablePlus > 1e-12) {
    const stepDeg = Math.min(deltaDeg, availableMinus, availablePlus);
    const minus = await solveRelativeContactPoints(arm, witness, contacts, mateName, poseDeg - stepDeg);
    if (typeof minus === 'string') return minus;
    const plus = await solveRelativeContactPoints(arm, witness, contacts, mateName, poseDeg + stepDeg);
    if (typeof plus === 'string') return plus;
    const denominatorRad = 2 * stepDeg * Math.PI / 180;
    return plus.map((point, index) => scale(sub(point, minus[index]), 1 / denominatorRad));
  }

  if (availablePlus > 1e-12) {
    const stepDeg = Math.min(deltaDeg, availablePlus);
    const plus = await solveRelativeContactPoints(arm, witness, contacts, mateName, poseDeg + stepDeg);
    if (typeof plus === 'string') return plus;
    const denominatorRad = stepDeg * Math.PI / 180;
    return plus.map((point, index) => scale(sub(point, baseRelativePoints[index]), 1 / denominatorRad));
  }

  if (availableMinus > 1e-12) {
    const stepDeg = Math.min(deltaDeg, availableMinus);
    const minus = await solveRelativeContactPoints(arm, witness, contacts, mateName, poseDeg - stepDeg);
    if (typeof minus === 'string') return minus;
    const denominatorRad = stepDeg * Math.PI / 180;
    return baseRelativePoints.map((point, index) => scale(sub(point, minus[index]), 1 / denominatorRad));
  }

  return `Actuator mate '${mateName}' has no in-limit interval for a torque Jacobian.`;
}

async function solveRelativeContactPoints(
  arm: Assembly,
  witness: PhysicalUseCasePoseWitness,
  contacts: readonly ResolvedContact[],
  mateName: string,
  poseDeg: number,
): Promise<Vec3[] | string> {
  const poses: NumericPoses = { ...witness.poses, [mateName]: poseDeg };
  for (const coupling of arm.__mateCouplings()) delete poses[coupling.driven];
  const expanded = expandCoupledPoses(arm.__mates(), arm.__mateCouplings(), poses);
  let solved: Awaited<ReturnType<typeof solveMates>>;
  try {
    solved = await solveMates(arm, expanded);
  } catch {
    return `Actuator mate '${mateName}' perturbation could not be solved.`;
  }
  if (solved.status !== 'solved' && solved.status !== 'redundant-ok') {
    return `Actuator mate '${mateName}' perturbation returned solver status '${solved.status}'.`;
  }
  const points = relativeContactPoints(arm, solved.poses, contacts);
  return points ?? `Actuator mate '${mateName}' perturbation has unresolved contact endpoints.`;
}

function relativeContactPoints(
  arm: Assembly,
  transforms: ReadonlyMap<string, Transform>,
  contacts: readonly ResolvedContact[],
): Vec3[] | undefined {
  const points: Vec3[] = [];
  for (const contact of contacts) {
    const mechanismPoint = connectorWorldPoint(arm, transforms, contact.mechanismRef);
    const heldPoint = connectorWorldPoint(arm, transforms, contact.heldRef);
    if (mechanismPoint === undefined || heldPoint === undefined) return undefined;
    points.push(sub(mechanismPoint, heldPoint));
  }
  return points;
}

function searchContactAllocation(
  sample: ResolvedStaticSample,
  penalizeActuators: boolean,
): SearchCandidate {
  const variableCount = sample.contacts.length * FRICTION_PYRAMID_EDGE_COUNT;
  const matrix: number[][] = Array.from({ length: 6 }, () => new Array<number>(variableCount).fill(0));
  for (let contactIndex = 0; contactIndex < sample.contacts.length; contactIndex++) {
    const contact = sample.contacts[contactIndex];
    const arm = sub(contact.point, sample.referencePoint);
    for (let edge = 0; edge < FRICTION_PYRAMID_EDGE_COUNT; edge++) {
      const column = contactIndex * FRICTION_PYRAMID_EDGE_COUNT + edge;
      const force = contact.generators[edge];
      const torque = cross(arm, force);
      matrix[0][column] = force[0];
      matrix[1][column] = force[1];
      matrix[2][column] = force[2];
      matrix[3][column] = torque[0];
      matrix[4][column] = torque[1];
      matrix[5][column] = torque[2];
    }
  }

  const forceScale = Math.max(1, norm(sample.externalForce));
  const maxArmMm = Math.max(
    1,
    ...sample.contacts.map((contact) => norm(sub(contact.point, sample.referencePoint))),
  );
  const torqueScale = Math.max(1, norm(sample.externalTorque), forceScale * maxArmMm);
  const target = [
    -sample.externalForce[0] / forceScale,
    -sample.externalForce[1] / forceScale,
    -sample.externalForce[2] / forceScale,
    -sample.externalTorque[0] / torqueScale,
    -sample.externalTorque[1] / torqueScale,
    -sample.externalTorque[2] / torqueScale,
  ];
  const scaledMatrix = matrix.map((row, rowIndex) =>
    row.map((value) => value / (rowIndex < 3 ? forceScale : torqueScale)));

  const weights = projectedGradientLeastSquares(
    scaledMatrix,
    target,
    sample.contacts.map((contact) => contact.capN),
    penalizeActuators ? sample.actuators : [],
  );
  return evaluateCandidate(sample, weights);
}

function projectedGradientLeastSquares(
  matrix: readonly (readonly number[])[],
  target: readonly number[],
  caps: readonly number[],
  actuators: readonly ResolvedActuator[],
): number[] {
  const variableCount = matrix[0]?.length ?? 0;
  let current = new Array<number>(variableCount).fill(0);
  let best = current;
  let bestScore = Infinity;
  const frobeniusSquared = matrix.reduce(
    (sum, row) => sum + row.reduce((rowSum, value) => rowSum + value * value, 0),
    0,
  ) + actuators.reduce(
    (sum, actuator) => sum + actuator.coefficients.reduce(
      (rowSum, value) => rowSum + (value / actuator.maxTorqueNmm) ** 2,
      0,
    ),
    0,
  );
  const step = 1 / Math.max(1e-9, 2 * frobeniusSquared);

  for (let iteration = 0; iteration < MAX_PROJECTED_GRADIENT_ITERATIONS; iteration++) {
    const residual = matrixVector(matrix, current).map((value, index) => value - target[index]);
    let score = dotArray(residual, residual);
    for (const actuator of actuators) {
      const normalizedTorque = dotArray(actuator.coefficients, current) / actuator.maxTorqueNmm;
      const violation = Math.max(0, Math.abs(normalizedTorque) - 1);
      score += violation * violation;
    }
    if (score < bestScore) {
      bestScore = score;
      best = [...current];
    }
    const gradient = new Array<number>(variableCount).fill(0);
    for (let row = 0; row < matrix.length; row++) {
      for (let column = 0; column < variableCount; column++) {
        gradient[column] += 2 * matrix[row][column] * residual[row];
      }
    }
    for (const actuator of actuators) {
      const normalizedCoefficients = actuator.coefficients.map(
        (value) => value / actuator.maxTorqueNmm,
      );
      const normalizedTorque = dotArray(normalizedCoefficients, current);
      const violation = Math.abs(normalizedTorque) - 1;
      if (violation <= 0) continue;
      const gradientScale = 2 * violation * Math.sign(normalizedTorque);
      for (let column = 0; column < variableCount; column++) {
        gradient[column] += gradientScale * normalizedCoefficients[column];
      }
    }
    const next = current.map((value, index) => value - step * gradient[index]);
    projectContactGroups(next, caps);
    if (normArray(next.map((value, index) => value - current[index])) < 1e-12) {
      current = next;
      break;
    }
    current = next;
  }

  const finalResidual = matrixVector(matrix, current).map((value, index) => value - target[index]);
  let finalScore = dotArray(finalResidual, finalResidual);
  for (const actuator of actuators) {
    const normalizedTorque = dotArray(actuator.coefficients, current) / actuator.maxTorqueNmm;
    const violation = Math.max(0, Math.abs(normalizedTorque) - 1);
    finalScore += violation * violation;
  }
  if (finalScore < bestScore) return current;
  return best;
}

function projectContactGroups(values: number[], caps: readonly number[]): void {
  for (let group = 0; group < caps.length; group++) {
    const start = group * FRICTION_PYRAMID_EDGE_COUNT;
    const projected = projectCappedSimplex(
      values.slice(start, start + FRICTION_PYRAMID_EDGE_COUNT),
      caps[group],
    );
    for (let i = 0; i < projected.length; i++) values[start + i] = projected[i];
  }
}

function projectCappedSimplex(values: readonly number[], cap: number): number[] {
  const nonNegative = values.map((value) => Math.max(0, value));
  if (nonNegative.reduce((sum, value) => sum + value, 0) <= cap) return nonNegative;

  const sorted = [...nonNegative].sort((a, b) => b - a);
  let cumulative = 0;
  let threshold = 0;
  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i];
    const candidate = (cumulative - cap) / (i + 1);
    if (i === sorted.length - 1 || candidate >= sorted[i + 1]) {
      threshold = candidate;
      break;
    }
  }
  return nonNegative.map((value) => Math.max(0, value - threshold));
}

function evaluateCandidate(
  sample: ResolvedStaticSample,
  weights: readonly number[],
): SearchCandidate {
  const contactForces: PhysicalUseCaseStaticContactForce[] = [];
  let netForce = sample.externalForce;
  let netTorque = sample.externalTorque;

  for (let contactIndex = 0; contactIndex < sample.contacts.length; contactIndex++) {
    const contact = sample.contacts[contactIndex];
    let force: Vec3 = [0, 0, 0];
    for (let edge = 0; edge < FRICTION_PYRAMID_EDGE_COUNT; edge++) {
      const weight = weights[contactIndex * FRICTION_PYRAMID_EDGE_COUNT + edge] ?? 0;
      force = add(force, scale(contact.generators[edge], weight));
    }
    const normalForceN = dot(force, contact.heldNormal);
    const tangent = sub(force, scale(contact.heldNormal, normalForceN));
    const tangentialForceN = norm(tangent);
    contactForces.push({
      contactA: contact.contact.a,
      contactB: contact.contact.b,
      pointWorldMm: copyVec(contact.point),
      mechanismPart: safePartName(contact.mechanismRef)!,
      forceOnHeldWorldN: copyVec(force),
      normalForceN,
      tangentialForceN,
      normalCapacityN: contact.capN,
      friction: contact.contact.friction,
    });
    netForce = add(netForce, force);
    netTorque = add(netTorque, cross(sub(contact.point, sample.referencePoint), force));
  }

  const forceResidualN = norm(netForce);
  const torqueResidualNmm = norm(netTorque);
  const actuatorTorques = sample.actuators.map((actuator) => ({
    mateName: actuator.mateName,
    requiredTorqueNmm: Math.abs(dotArray(actuator.coefficients, weights)),
    maxTorqueNmm: actuator.maxTorqueNmm,
  }));
  return {
    weights,
    contactForces,
    forceResidualN,
    torqueResidualNmm,
    normalizedResidual:
      forceResidualN / sample.forceToleranceN +
      torqueResidualNmm / sample.torqueToleranceNmm,
    actuatorTorques,
  };
}

function isVerifiedContactCertificate(
  sample: ResolvedStaticSample,
  candidate: SearchCandidate,
): boolean {
  if (
    !Number.isFinite(candidate.forceResidualN) ||
    !Number.isFinite(candidate.torqueResidualNmm) ||
    candidate.forceResidualN > sample.forceToleranceN ||
    candidate.torqueResidualNmm > sample.torqueToleranceNmm
  ) {
    return false;
  }

  return candidate.contactForces.every((contact) =>
    contact.normalForceN >= -1e-8 &&
    contact.normalForceN <= contact.normalCapacityN + 1e-8 &&
    contact.tangentialForceN <= contact.friction * Math.max(0, contact.normalForceN) + 1e-8);
}

function areActuatorsWithinLimits(candidate: SearchCandidate): boolean {
  return candidate.actuatorTorques.every((actuator) =>
    Number.isFinite(actuator.requiredTorqueNmm) &&
    actuator.requiredTorqueNmm <= actuator.maxTorqueNmm + 1e-6);
}

function totalActuatorViolation(
  actuators: readonly PhysicalUseCaseStaticActuatorTorqueEvidence[],
): number {
  return actuators.reduce(
    (sum, actuator) => sum + Math.max(
      0,
      (actuator.requiredTorqueNmm - actuator.maxTorqueNmm) / actuator.maxTorqueNmm,
    ),
    0,
  );
}

function contactWorldNormal(
  contact: PhysicalUseCaseContact,
  transforms: ReadonlyMap<string, Transform>,
): Vec3 | undefined {
  const frame = contact.normalFrame ?? 'world';
  let normal: Vec3;
  if (frame === 'world') {
    normal = copyVec(contact.normal);
  } else if (frame === 'a' || frame === 'b') {
    const ref = frame === 'a' ? contact.a : contact.b;
    const partName = safePartName(ref);
    const transform = partName === undefined ? undefined : transforms.get(partName);
    if (transform === undefined) return undefined;
    normal = [...transform.axisDir(contact.normal)] as Vec3;
  } else {
    return undefined;
  }
  const magnitude = norm(normal);
  if (!Number.isFinite(magnitude) || magnitude <= 0) return undefined;
  return scale(normal, 1 / magnitude);
}

function frictionPyramidGenerators(normal: Vec3, friction: number): Vec3[] {
  const seed: Vec3 = Math.abs(normal[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
  const tangentA = unit(cross(seed, normal));
  const tangentB = unit(cross(normal, tangentA));
  return Array.from({ length: FRICTION_PYRAMID_EDGE_COUNT }, (_, index) => {
    const angle = (2 * Math.PI * index) / FRICTION_PYRAMID_EDGE_COUNT;
    const tangent = add(scale(tangentA, Math.cos(angle)), scale(tangentB, Math.sin(angle)));
    return add(normal, scale(tangent, friction));
  });
}

function connectorWorldPoint(
  arm: Assembly,
  transforms: ReadonlyMap<string, Transform>,
  ref: string,
): Vec3 | undefined {
  const parsed = safeParseConnectorRef(ref);
  if (parsed === undefined) return undefined;
  const part = arm.__parts().find((candidate) => candidate.name === parsed.partName);
  const connector = part?.mateConnectors.find((candidate) => candidate.name === parsed.connectorName);
  const transform = transforms.get(parsed.partName);
  if (connector?.origin.kind !== 'vec3' || transform === undefined) return undefined;
  return [...transform.point(connector.origin.value)] as Vec3;
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

function hasNonZeroVec(value: readonly number[] | undefined): value is Vec3 {
  return Array.isArray(value) &&
    value.length === 3 &&
    value.every((entry) => Number.isFinite(entry)) &&
    Math.hypot(value[0], value[1], value[2]) > 0;
}

function isFiniteVec3(value: readonly number[]): value is Vec3 {
  return value.length === 3 && value.every((entry) => Number.isFinite(entry));
}

function isPositiveFinite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
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

function scale(value: Vec3, scalar: number): Vec3 {
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
  const magnitude = norm(value);
  return magnitude <= 0 ? [0, 0, 0] : scale(value, 1 / magnitude);
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return scale(add(a, b), 0.5);
}

function matrixVector(matrix: readonly (readonly number[])[], vector: readonly number[]): number[] {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
}

function dotArray(a: readonly number[], b: readonly number[]): number {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function normArray(values: readonly number[]): number {
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

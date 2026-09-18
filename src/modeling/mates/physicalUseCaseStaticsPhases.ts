// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Phase helpers for `resolveStaticSample` in `physicalUseCaseStatics.ts`, plus
// the pure scalar/vector and connector primitives they share with the
// orchestrator. Code moved here unchanged; only the early-exit string returns
// were wrapped in small result objects so the orchestrator can narrow them.
import type { Assembly } from '../capture/assembly';
import type { Vec3 } from '../../shared/intent/types';
import type { Transform } from '../../shared/runtime/se3';
import { parseConnectorRef } from './mate';
import type {
  PhysicalUseCaseContact,
  PhysicalUseCaseRecord,
} from './physicalUseCase';
import type { PhysicalUseCasePoseWitness } from './physicalUseCaseReachability';
import type { ResolvedContact, ResolvedLoad } from './physicalUseCaseStatics';

export const DEFAULT_FORCE_RESIDUAL_N = 0.01;
export const DEFAULT_TORQUE_RESIDUAL_NMM = 0.1;
export const FRICTION_PYRAMID_EDGE_COUNT = 8;

export function resolveStaticHeldPart(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
): string | { readonly heldPart: string } {
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
  return { heldPart };
}

export function resolveStaticTolerances(
  useCase: PhysicalUseCaseRecord,
): string | { readonly forceToleranceN: number; readonly torqueToleranceNmm: number } {
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
  return { forceToleranceN, torqueToleranceNmm };
}

export function resolveStaticLoads(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  witness: PhysicalUseCasePoseWitness,
  heldPart: string,
): string | { readonly loads: ResolvedLoad[]; readonly referencePoint: Vec3 } {
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
  return { loads, referencePoint };
}

export function resolveStaticContacts(
  useCase: PhysicalUseCaseRecord,
  witness: PhysicalUseCasePoseWitness,
  heldPart: string,
): string | ResolvedContact[] {
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
  return contacts;
}

export function sumExternalLoads(
  loads: readonly ResolvedLoad[],
  referencePoint: Vec3,
): { readonly externalForce: Vec3; readonly externalTorque: Vec3 } {
  let externalForce: Vec3 = [0, 0, 0];
  let externalTorque: Vec3 = [0, 0, 0];
  for (const load of loads) {
    externalForce = add(externalForce, load.force);
    externalTorque = add(externalTorque, load.torque);
    if (load.point !== undefined) {
      externalTorque = add(externalTorque, cross(sub(load.point, referencePoint), load.force));
    }
  }
  return { externalForce, externalTorque };
}

export function contactWorldNormal(
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

export function frictionPyramidGenerators(normal: Vec3, friction: number): Vec3[] {
  const seed: Vec3 = Math.abs(normal[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
  const tangentA = unit(cross(seed, normal));
  const tangentB = unit(cross(normal, tangentA));
  return Array.from({ length: FRICTION_PYRAMID_EDGE_COUNT }, (_, index) => {
    const angle = (2 * Math.PI * index) / FRICTION_PYRAMID_EDGE_COUNT;
    const tangent = add(scale(tangentA, Math.cos(angle)), scale(tangentB, Math.sin(angle)));
    return add(normal, scale(tangent, friction));
  });
}

export function connectorWorldPoint(
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

export function safeParseConnectorRef(ref: string): ReturnType<typeof parseConnectorRef> | undefined {
  try {
    return parseConnectorRef(ref);
  } catch {
    return undefined;
  }
}

export function safePartName(ref: string): string | undefined {
  return safeParseConnectorRef(ref)?.partName;
}

export function hasNonZeroVec(value: readonly number[] | undefined): value is Vec3 {
  return Array.isArray(value) &&
    value.length === 3 &&
    value.every((entry) => Number.isFinite(entry)) &&
    Math.hypot(value[0], value[1], value[2]) > 0;
}

export function isFiniteVec3(value: readonly number[]): value is Vec3 {
  return value.length === 3 && value.every((entry) => Number.isFinite(entry));
}

export function isPositiveFinite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

export function copyVec(value: readonly [number, number, number]): Vec3 {
  return [value[0], value[1], value[2]];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(value: Vec3, scalar: number): Vec3 {
  return [value[0] * scalar, value[1] * scalar, value[2] * scalar];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function norm(value: Vec3): number {
  return Math.hypot(value[0], value[1], value[2]);
}

export function unit(value: Vec3): Vec3 {
  const magnitude = norm(value);
  return magnitude <= 0 ? [0, 0, 0] : scale(value, 1 / magnitude);
}

export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return scale(add(a, b), 0.5);
}

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Assembly } from '../capture/assembly';
import type { NumericPoses } from '../capture/forwardKinematics';
import type { Vec3 } from '../../shared/intent/types';
import type { Transform } from '../../shared/runtime/se3';
import { expandCoupledPoses } from './coupledPoses';
import { solveMates } from './solver';
import { parseConnectorRef } from './mate';
import type { PhysicalUseCaseRecord } from './physicalUseCase';

export interface PhysicalUseCaseReachabilityOptions {
  readonly samplesPerMate?: number;
  readonly maxCombinations?: number;
}

export interface PhysicalUseCaseReachabilityIssue {
  readonly useCaseName: string;
  readonly contactA: string;
  readonly contactB: string;
  readonly minDistanceMm?: number;
  readonly toleranceMm: number;
}

export interface PhysicalUseCaseReachabilityContactDistance {
  readonly contactA: string;
  readonly contactB: string;
  readonly distanceMm?: number;
}

export interface PhysicalUseCaseSimultaneousContactsReachabilityIssue {
  readonly kind: 'simultaneous-contacts-unreachable';
  readonly useCaseName: string;
  readonly toleranceMm: number;
  readonly bestMaxDistanceMm?: number;
  readonly contactDistances: readonly PhysicalUseCaseReachabilityContactDistance[];
}

export type PhysicalUseCaseReachabilityFinding =
  | PhysicalUseCaseReachabilityIssue
  | PhysicalUseCaseSimultaneousContactsReachabilityIssue;

export interface PhysicalUseCaseSolvedContact {
  readonly contactA: string;
  readonly contactB: string;
  readonly pointA: Vec3;
  readonly pointB: Vec3;
  readonly distanceMm: number;
}

export interface PhysicalUseCasePoseWitness {
  readonly poses: NumericPoses;
  readonly transforms: ReadonlyMap<string, Transform>;
  readonly contacts: readonly PhysicalUseCaseSolvedContact[];
  readonly complete: boolean;
  readonly maxDistanceMm?: number;
}

export interface PhysicalUseCaseReachabilityAssessment {
  readonly findings: readonly PhysicalUseCaseReachabilityFinding[];
  readonly samples: readonly PhysicalUseCasePoseWitness[];
  readonly commonPoseSamples: readonly PhysicalUseCasePoseWitness[];
}

export async function reviewPhysicalUseCaseReachability(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  opts: PhysicalUseCaseReachabilityOptions = {},
): Promise<PhysicalUseCaseReachabilityFinding[]> {
  return [...(await assessPhysicalUseCaseReachability(arm, useCase, opts)).findings];
}

export async function assessPhysicalUseCaseReachability(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  opts: PhysicalUseCaseReachabilityOptions = {},
): Promise<PhysicalUseCaseReachabilityAssessment> {
  const samples = buildTargetedReachabilitySamples(arm, useCase, opts);
  const contactDistances = new Map<string, { contactA: string; contactB: string; minDistanceMm?: number }>();
  const toleranceMm = useCase.criteria?.maxSlipMm ?? 0;
  const solvedSamples: PhysicalUseCasePoseWitness[] = [];
  const commonPoseSamples: PhysicalUseCasePoseWitness[] = [];
  let bestCommonPose: {
    maxDistanceMm: number;
    contactDistances: PhysicalUseCaseReachabilityContactDistance[];
  } | undefined;

  for (const contact of useCase.contacts) {
    contactDistances.set(contactKey(contact.a, contact.b), {
      contactA: contact.a,
      contactB: contact.b,
    });
  }

  for (const poses of samples) {
    let solved: Awaited<ReturnType<typeof solveMates>>;
    try {
      solved = await solveMates(arm, poses);
    } catch {
      continue;
    }
    if (solved.status !== 'solved' && solved.status !== 'redundant-ok') continue;
    const solvedContacts: PhysicalUseCaseSolvedContact[] = [];
    let sampleComplete = true;
    for (const contact of useCase.contacts) {
      const a = connectorWorldPoint(arm, solved.poses, contact.a);
      const b = connectorWorldPoint(arm, solved.poses, contact.b);
      if (a === undefined || b === undefined) {
        sampleComplete = false;
        continue;
      }

      const key = contactKey(contact.a, contact.b);
      const entry = contactDistances.get(key);
      if (entry === undefined) continue;
      const distance = distanceMm(a, b);
      solvedContacts.push({
        contactA: contact.a,
        contactB: contact.b,
        pointA: a,
        pointB: b,
        distanceMm: distance,
      });
      contactDistances.set(key, {
        ...entry,
        minDistanceMm: entry.minDistanceMm === undefined
          ? distance
          : Math.min(entry.minDistanceMm, distance),
      });
    }

    const complete = sampleComplete && solvedContacts.length === useCase.contacts.length;
    const maxDistanceMm = complete
      ? solvedContacts.reduce((maxDistance, contact) => Math.max(maxDistance, contact.distanceMm), 0)
      : undefined;
    const witness: PhysicalUseCasePoseWitness = {
      poses: { ...poses },
      transforms: solved.poses,
      contacts: solvedContacts,
      complete,
      ...(maxDistanceMm === undefined ? {} : { maxDistanceMm }),
    };
    solvedSamples.push(witness);
    if (!complete || maxDistanceMm === undefined) continue;
    const evidence = solvedContacts.map((contact) => ({
      contactA: contact.contactA,
      contactB: contact.contactB,
      distanceMm: contact.distanceMm,
    }));
    if (bestCommonPose === undefined || maxDistanceMm < bestCommonPose.maxDistanceMm) {
      bestCommonPose = { maxDistanceMm, contactDistances: evidence };
    }
    if (maxDistanceMm <= toleranceMm) commonPoseSamples.push(witness);
  }

  const contactIssues: PhysicalUseCaseReachabilityIssue[] = [...contactDistances.values()]
    .filter((entry) => entry.minDistanceMm === undefined || entry.minDistanceMm > toleranceMm)
    .map((entry) => ({
      useCaseName: useCase.name,
      contactA: entry.contactA,
      contactB: entry.contactB,
      ...(entry.minDistanceMm === undefined ? {} : { minDistanceMm: entry.minDistanceMm }),
      toleranceMm,
    }));
  if (contactIssues.length > 0 || useCase.contacts.length < 2 || commonPoseSamples.length > 0) {
    return { findings: contactIssues, samples: solvedSamples, commonPoseSamples };
  }

  const findings: PhysicalUseCaseReachabilityFinding[] = [{
    kind: 'simultaneous-contacts-unreachable',
    useCaseName: useCase.name,
    toleranceMm,
    ...(bestCommonPose === undefined ? {} : { bestMaxDistanceMm: bestCommonPose.maxDistanceMm }),
    contactDistances: bestCommonPose?.contactDistances ?? useCase.contacts.map((contact) => ({
      contactA: contact.a,
      contactB: contact.b,
    })),
  }];
  return { findings, samples: solvedSamples, commonPoseSamples };
}

export function buildTargetedReachabilitySamples(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  opts: PhysicalUseCaseReachabilityOptions,
): NumericPoses[] {
  const samplesPerMate = Math.max(1, Math.floor(opts.samplesPerMate ?? 3));
  const maxCombinations = Math.max(1, Math.floor(opts.maxCombinations ?? 64));
  const matesByName = new Map(arm.__mates().map((mate) => [mate.name, mate]));
  const mateSamples: Array<{ mateName: string; values: readonly number[] }> = [];
  const seen = new Set<string>();

  for (const limit of useCase.actuatorLimits) {
    if (seen.has(limit.mate)) continue;
    seen.add(limit.mate);
    const mate = matesByName.get(limit.mate);
    const limits = scalarSampleLimits(mate);
    if (mate === undefined || limits === undefined) continue;
    mateSamples.push({
      mateName: mate.name,
      values: sampleRange(limits, samplesPerMate),
    });
  }

  if (mateSamples.length === 0) return [];

  const totalCombinations = mateSamples.reduce((product, sample) => product * sample.values.length, 1);
  if (totalCombinations > maxCombinations) {
    return buildDistributedCappedSamples(mateSamples, maxCombinations)
      .map((poses) => expandCoupledPoses(arm.__mates(), arm.__mateCouplings(), poses));
  }

  const samples: NumericPoses[] = [];
  const visit = (index: number, current: NumericPoses): void => {
    if (index === mateSamples.length) {
      samples.push(expandCoupledPoses(arm.__mates(), arm.__mateCouplings(), current));
      return;
    }
    const sample = mateSamples[index];
    for (const value of sample.values) {
      current[sample.mateName] = value;
      visit(index + 1, current);
    }
    delete current[sample.mateName];
  };
  visit(0, {});
  return samples;
}

function scalarSampleLimits(
  mate: ReturnType<Assembly['__mates']>[number] | undefined,
): readonly [number, number] | undefined {
  if (mate === undefined) return undefined;
  if (
    (mate.type === 'revolute' || mate.type === 'cylindrical' || mate.type === 'pin_slot') &&
    mate.limitsDeg !== undefined
  ) {
    return mate.limitsDeg;
  }
  if (mate.type === 'prismatic' && mate.limitsMm !== undefined) {
    return mate.limitsMm;
  }
  return undefined;
}

function buildDistributedCappedSamples(
  mateSamples: ReadonlyArray<{ mateName: string; values: readonly number[] }>,
  maxCombinations: number,
): NumericPoses[] {
  const sampleCount = Math.max(1, maxCombinations);
  const totalCombinations = mateSamples.reduce((product, sample) => product * sample.values.length, 1);
  const out: NumericPoses[] = [];
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
    const flatIndex = sampleCount === 1
      ? 0
      : Math.round((sampleIndex * (totalCombinations - 1)) / (sampleCount - 1));
    out.push(flattenedIndexToPose(mateSamples, flatIndex));
  }
  return out;
}

function flattenedIndexToPose(
  mateSamples: ReadonlyArray<{ mateName: string; values: readonly number[] }>,
  flatIndex: number,
): NumericPoses {
  let remaining = flatIndex;
  const indices = new Array<number>(mateSamples.length).fill(0);
  for (let i = mateSamples.length - 1; i >= 0; i--) {
    const radix = mateSamples[i].values.length;
    indices[i] = remaining % radix;
    remaining = Math.floor(remaining / radix);
  }
  const pose: NumericPoses = {};
  for (let i = 0; i < mateSamples.length; i++) {
    pose[mateSamples[i].mateName] = mateSamples[i].values[indices[i]];
  }
  return pose;
}

function sampleRange(limits: readonly [number, number], samplesPerMate: number): readonly number[] {
  const [min, max] = limits;
  if (samplesPerMate <= 1 || min === max) return [min];
  if (samplesPerMate === 2) return [min, max];

  const values: number[] = [];
  for (let i = 0; i < samplesPerMate; i++) {
    const t = i / (samplesPerMate - 1);
    values.push(min + (max - min) * t);
  }
  return values;
}

function connectorWorldPoint(
  arm: Assembly,
  partTransforms: ReadonlyMap<string, import('../../shared/runtime/se3').Transform>,
  ref: string,
): Vec3 | undefined {
  try {
    const parsed = parseConnectorRef(ref);
    const part = arm.__parts().find((candidate) => candidate.name === parsed.partName);
    const transform = partTransforms.get(parsed.partName);
    const connector = part?.mateConnectors.find((candidate) => candidate.name === parsed.connectorName);
    if (connector?.origin.kind !== 'vec3' || transform === undefined) return undefined;
    return [...transform.point(connector.origin.value)] as Vec3;
  } catch {
    return undefined;
  }
}

function contactKey(contactA: string, contactB: string): string {
  return `${contactA}\n${contactB}`;
}

function distanceMm(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

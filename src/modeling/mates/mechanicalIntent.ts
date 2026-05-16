import type { Assembly, MechanicalJointIntentRecord } from '../capture/assembly';
import type { Vec3 } from '../../shared/runtime/se3';
import { parseConnectorRef, type MateRecord } from './mate';
import { solveMates } from './solver';

export type MechanicalIntentDiagnostic =
  | MechanicalIntentMateMissingDiagnostic
  | MechanicalIntentMateTypeDiagnostic
  | MechanicalIntentPartMissingDiagnostic
  | MechanicalIntentActuatorNotMountedDiagnostic
  | MechanicalIntentSupportMissingDiagnostic
  | MechanicalIntentOutputNotCapturedDiagnostic
  | MechanicalIntentShaftNotOnAxisDiagnostic
  | MechanicalIntentRequiredSupportMissingDiagnostic;

interface MechanicalIntentDiagnosticBase {
  readonly severity: 'error';
  readonly intentName: string;
  readonly message: string;
  readonly hint: string;
}

export interface MechanicalIntentMateMissingDiagnostic extends MechanicalIntentDiagnosticBase {
  readonly code: 'assembly.mechanical.intent.mate-missing';
  readonly mateName: string;
}

export interface MechanicalIntentMateTypeDiagnostic extends MechanicalIntentDiagnosticBase {
  readonly code: 'assembly.mechanical.intent.mate-not-revolute';
  readonly mateName: string;
  readonly mateType: string;
}

export interface MechanicalIntentPartMissingDiagnostic extends MechanicalIntentDiagnosticBase {
  readonly code: 'assembly.mechanical.intent.part-missing';
  readonly role: 'actuator' | 'shaft' | 'support' | 'output';
  readonly partName: string;
}

export interface MechanicalIntentActuatorNotMountedDiagnostic extends MechanicalIntentDiagnosticBase {
  readonly code: 'assembly.mechanical.intent.actuator-not-mounted';
  readonly actuatorPartName: string;
}

export interface MechanicalIntentSupportMissingDiagnostic extends MechanicalIntentDiagnosticBase {
  readonly code: 'assembly.mechanical.intent.support-missing';
  readonly supportPartName: string;
}

export interface MechanicalIntentOutputNotCapturedDiagnostic extends MechanicalIntentDiagnosticBase {
  readonly code: 'assembly.mechanical.intent.output-not-captured';
  readonly outputPartName: string;
  readonly mateName: string;
}

export interface MechanicalIntentShaftNotOnAxisDiagnostic extends MechanicalIntentDiagnosticBase {
  readonly code: 'assembly.mechanical.intent.shaft-not-on-axis';
  readonly shaftPartName: string;
  readonly mateName: string;
  readonly distanceMm?: number;
}

export interface MechanicalIntentRequiredSupportMissingDiagnostic extends MechanicalIntentDiagnosticBase {
  readonly code: 'assembly.mechanical.intent.required-support-missing';
  readonly supportKind: string;
  readonly around: string;
  readonly supportPartNames: readonly string[];
  readonly distanceMm?: number;
  readonly minBearingLengthMm?: number;
}

export interface MechanicalIntentReviewResult {
  readonly diagnostics: readonly MechanicalIntentDiagnostic[];
  readonly checkedIntentCount: number;
}

const SHAFT_AXIS_TOL_MM = 8;
const REQUIRED_SUPPORT_TOL_MM = 1;

export async function reviewMechanicalIntent(arm: Assembly): Promise<MechanicalIntentReviewResult> {
  const diagnostics: MechanicalIntentDiagnostic[] = [];
  const intents = arm.__mechanicalJointIntents();
  const partsByName = new Map(arm.__parts().map((part) => [part.name, part]));
  const matesByName = new Map(arm.__mates().map((mate) => [mate.name, mate]));

  if (intents.length === 0) {
    return { diagnostics, checkedIntentCount: 0 };
  }

  const solved = await solveMates(arm);

  for (const intent of intents) {
    const mate = matesByName.get(intent.mate);
    if (mate === undefined) {
      diagnostics.push({
        code: 'assembly.mechanical.intent.mate-missing',
        severity: 'error',
        intentName: intent.name,
        mateName: intent.mate,
        message: `Mechanical intent '${intent.name}' references missing mate '${intent.mate}'.`,
        hint: `mechanical-intent.mate-missing — declare arm.mate('${intent.mate}', ...) before arm.mechanicalJoint('${intent.name}', ...).`,
      });
    } else if (mate.type !== 'revolute') {
      diagnostics.push({
        code: 'assembly.mechanical.intent.mate-not-revolute',
        severity: 'error',
        intentName: intent.name,
        mateName: mate.name,
        mateType: mate.type,
        message: `Mechanical intent '${intent.name}' expects mate '${mate.name}' to be revolute, but it is '${mate.type}'.`,
        hint: `mechanical-intent.mate-not-revolute — v1 mechanicalJoint contracts describe driven revolute joints; use a revolute mate or skip this contract.`,
      });
    }

    checkPartExists(diagnostics, intent, partsByName, 'actuator', intent.actuator);
    checkPartExists(diagnostics, intent, partsByName, 'shaft', intent.shaft);
    checkPartExists(diagnostics, intent, partsByName, 'output', intent.output);
    for (const support of intent.supports) {
      checkPartExists(diagnostics, intent, partsByName, 'support', support);
    }

    if (!partsByName.has(intent.actuator)) continue;
    if (!hasFastenedMateForPart(arm.__mates(), intent.actuator)) {
      diagnostics.push({
        code: 'assembly.mechanical.intent.actuator-not-mounted',
        severity: 'error',
        intentName: intent.name,
        actuatorPartName: intent.actuator,
        message: `Mechanical intent '${intent.name}' actuator '${intent.actuator}' is not mounted by any fastened mate.`,
        hint: `mechanical-intent.actuator-not-mounted — fasten '${intent.actuator}' to a bracket, support, or frame part so the actuator has a physical load path.`,
      });
    }

    for (const support of intent.supports) {
      if (!partsByName.has(support)) continue;
      if (hasFastenedMateForPart(arm.__mates(), support)) continue;
      diagnostics.push({
        code: 'assembly.mechanical.intent.support-missing',
        severity: 'error',
        intentName: intent.name,
        supportPartName: support,
        message: `Mechanical intent '${intent.name}' support '${support}' is not fixed to the assembly by any fastened mate.`,
        hint: `mechanical-intent.support-missing — fasten '${support}' to the frame, actuator bracket, or joint carrier.`,
      });
    }

    if (mate !== undefined && partsByName.has(intent.output) && !mateReferencesPart(mate, intent.output)) {
      diagnostics.push({
        code: 'assembly.mechanical.intent.output-not-captured',
        severity: 'error',
        intentName: intent.name,
        outputPartName: intent.output,
        mateName: mate.name,
        message: `Mechanical intent '${intent.name}' output '${intent.output}' is not one side of mate '${mate.name}'.`,
        hint: `mechanical-intent.output-not-captured — set output to the driven link connected by the declared revolute mate.`,
      });
    }

    if (mate !== undefined && partsByName.has(intent.shaft)) {
      const shaftDistanceMm = nearestShaftAxisDistanceMm(arm, solved.poses, intent, mate);
      if (shaftDistanceMm === undefined || shaftDistanceMm > SHAFT_AXIS_TOL_MM) {
        diagnostics.push({
          code: 'assembly.mechanical.intent.shaft-not-on-axis',
          severity: 'error',
          intentName: intent.name,
          shaftPartName: intent.shaft,
          mateName: mate.name,
          ...(shaftDistanceMm === undefined ? {} : { distanceMm: shaftDistanceMm }),
          message: shaftDistanceMm === undefined
            ? `Mechanical intent '${intent.name}' shaft '${intent.shaft}' has no numeric axis connector near mate '${mate.name}'.`
            : `Mechanical intent '${intent.name}' shaft '${intent.shaft}' axis is ${shaftDistanceMm.toFixed(1)} mm from mate '${mate.name}'.`,
          hint: `mechanical-intent.shaft-not-on-axis — add an axis connector to '${intent.shaft}' and fasten the shaft so that connector lies on the revolute mate axis.`,
        });
      }
    }

    if (intent.requiredSupport !== undefined) {
      const issue = await checkRequiredSupport(arm, solved.poses, intent);
      if (issue !== undefined) {
        diagnostics.push({
          code: 'assembly.mechanical.intent.required-support-missing',
          severity: 'error',
          intentName: intent.name,
          supportKind: intent.requiredSupport.kind,
          around: intent.requiredSupport.around,
          supportPartNames: issue.supportPartNames,
          ...(issue.distanceMm !== undefined ? { distanceMm: issue.distanceMm } : {}),
          ...(intent.requiredSupport.minBearingLengthMm !== undefined ? { minBearingLengthMm: intent.requiredSupport.minBearingLengthMm } : {}),
          message: `Mechanical intent '${intent.name}' requires ${intent.requiredSupport.kind} support around '${intent.requiredSupport.around}', but modeled support does not reach that connector.`,
          hint: `mechanical-intent.required-support-missing — add bearing/hinge/bracket material on ${issue.supportPartNames.join(', ')} so it reaches '${intent.requiredSupport.around}' and preserves clearance through the mate travel.`,
        });
      }
    }
  }

  return { diagnostics, checkedIntentCount: intents.length };
}

async function checkRequiredSupport(
  arm: Assembly,
  poses: ReadonlyMap<string, { point(p: Vec3): Vec3 }>,
  intent: MechanicalJointIntentRecord,
): Promise<{ supportPartNames: string[]; distanceMm?: number } | undefined> {
  const requirement = intent.requiredSupport;
  if (requirement === undefined) return undefined;

  let parsed: { partName: string; connectorName: string };
  try {
    parsed = parseConnectorRef(requirement.around);
  } catch {
    return { supportPartNames: [...(requirement.supports ?? intent.supports)] };
  }

  const parts = arm.__parts();
  const aroundPart = parts.find((part) => part.name === parsed.partName);
  const aroundConnector = aroundPart?.mateConnectors.find((connector) => connector.name === parsed.connectorName);
  if (aroundPart === undefined || aroundConnector === undefined || aroundConnector.origin.kind !== 'vec3') {
    return { supportPartNames: [...(requirement.supports ?? intent.supports)] };
  }
  const aroundPose = poses.get(aroundPart.name);
  if (aroundPose === undefined) {
    return { supportPartNames: [...(requirement.supports ?? intent.supports)] };
  }
  const worldPoint = aroundPose.point(aroundConnector.origin.value);

  const supportPartNames = [...(requirement.supports ?? intent.supports)];
  let bestDistance = Infinity;
  for (const supportPartName of supportPartNames) {
    const supportPart = parts.find((part) => part.name === supportPartName);
    if (supportPart === undefined) continue;
    const supportPose = poses.get(supportPart.name);
    if (supportPose === undefined) continue;
    const localBbox = (await supportPart.originalShape.lower()).boundingBox();
    const bbox = transformBbox(localBbox, supportPose);
    const distance = distanceOutsideExpandedBbox(worldPoint, bbox, REQUIRED_SUPPORT_TOL_MM);
    bestDistance = Math.min(bestDistance, distance);
    if (distance > 0) continue;
    if (requirement.minBearingLengthMm !== undefined && aroundConnector.axis !== undefined) {
      const axis = dominantAxis(aroundConnector.axis);
      const extent = bbox.max[axis] - bbox.min[axis];
      if (extent < requirement.minBearingLengthMm) {
        bestDistance = Math.min(bestDistance, requirement.minBearingLengthMm - extent);
        continue;
      }
    }
    return undefined;
  }

  return {
    supportPartNames,
    ...(Number.isFinite(bestDistance) ? { distanceMm: bestDistance } : {}),
  };
}

function transformBbox(bbox: { min: Vec3; max: Vec3 }, transform: { point(p: Vec3): Vec3 }): { min: Vec3; max: Vec3 } {
  const localCorners: Vec3[] = [
    [bbox.min[0], bbox.min[1], bbox.min[2]],
    [bbox.min[0], bbox.min[1], bbox.max[2]],
    [bbox.min[0], bbox.max[1], bbox.min[2]],
    [bbox.min[0], bbox.max[1], bbox.max[2]],
    [bbox.max[0], bbox.min[1], bbox.min[2]],
    [bbox.max[0], bbox.min[1], bbox.max[2]],
    [bbox.max[0], bbox.max[1], bbox.min[2]],
    [bbox.max[0], bbox.max[1], bbox.max[2]],
  ];
  const corners = localCorners.map((corner) => transform.point(corner));
  return {
    min: [
      Math.min(...corners.map((corner) => corner[0])),
      Math.min(...corners.map((corner) => corner[1])),
      Math.min(...corners.map((corner) => corner[2])),
    ],
    max: [
      Math.max(...corners.map((corner) => corner[0])),
      Math.max(...corners.map((corner) => corner[1])),
      Math.max(...corners.map((corner) => corner[2])),
    ],
  };
}

function distanceOutsideExpandedBbox(point: Vec3, bbox: { min: Vec3; max: Vec3 }, toleranceMm: number): number {
  let d2 = 0;
  for (let axis = 0; axis < 3; axis++) {
    const min = bbox.min[axis] - toleranceMm;
    const max = bbox.max[axis] + toleranceMm;
    const value = point[axis];
    if (value < min) d2 += (min - value) ** 2;
    else if (value > max) d2 += (value - max) ** 2;
  }
  return Math.sqrt(d2);
}

function dominantAxis(axis: Vec3): 0 | 1 | 2 {
  const abs = axis.map((value) => Math.abs(value));
  if (abs[1] >= abs[0] && abs[1] >= abs[2]) return 1;
  if (abs[2] >= abs[0] && abs[2] >= abs[1]) return 2;
  return 0;
}

function checkPartExists(
  diagnostics: MechanicalIntentDiagnostic[],
  intent: MechanicalJointIntentRecord,
  partsByName: ReadonlyMap<string, unknown>,
  role: 'actuator' | 'shaft' | 'support' | 'output',
  partName: string,
): void {
  if (partsByName.has(partName)) return;
  diagnostics.push({
    code: 'assembly.mechanical.intent.part-missing',
    severity: 'error',
    intentName: intent.name,
    role,
    partName,
    message: `Mechanical intent '${intent.name}' references missing ${role} part '${partName}'.`,
    hint: `mechanical-intent.part-missing — declare arm.part('${partName}', ...) or update the mechanicalJoint ${role} reference.`,
  });
}

function hasFastenedMateForPart(mates: readonly MateRecord[], partName: string): boolean {
  return mates.some((mate) => {
    if (mate.type !== 'fastened') return false;
    return mateReferencesPart(mate, partName);
  });
}

function mateReferencesPart(mate: MateRecord, partName: string): boolean {
  return parseConnectorRef(mate.a).partName === partName || parseConnectorRef(mate.b).partName === partName;
}

function nearestShaftAxisDistanceMm(
  arm: Assembly,
  poses: ReadonlyMap<string, { point(p: Vec3): Vec3 }>,
  intent: MechanicalJointIntentRecord,
  mate: MateRecord,
): number | undefined {
  const matePoint = worldConnectorPoint(arm, poses, mate.a) ?? worldConnectorPoint(arm, poses, mate.b);
  if (matePoint === undefined) return undefined;

  const shaft = arm.__parts().find((part) => part.name === intent.shaft);
  if (shaft === undefined) return undefined;
  const pose = poses.get(shaft.name);
  if (pose === undefined) return undefined;
  const shaftAxisPoints: Vec3[] = [];
  for (const connector of shaft.mateConnectors) {
    if (connector.type !== 'axis' || connector.origin.kind !== 'vec3') continue;
    shaftAxisPoints.push(pose.point(connector.origin.value));
  }
  if (shaftAxisPoints.length === 0) return undefined;

  return Math.min(...shaftAxisPoints.map((point) => distance(point, matePoint)));
}

function worldConnectorPoint(
  arm: Assembly,
  poses: ReadonlyMap<string, { point(p: Vec3): Vec3 }>,
  connectorRef: string,
): Vec3 | undefined {
  const parsed = parseConnectorRef(connectorRef);
  const part = arm.__parts().find((candidate) => candidate.name === parsed.partName);
  const connector = part?.mateConnectors.find((candidate) => candidate.name === parsed.connectorName);
  if (part === undefined || connector === undefined || connector.origin.kind !== 'vec3') return undefined;
  const pose = poses.get(part.name);
  return pose?.point(connector.origin.value);
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

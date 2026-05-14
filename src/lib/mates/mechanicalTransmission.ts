import type { Assembly, TransmissionIntentRecord } from '../../capture/assembly';
import type { RuntimeMesh } from '../../backends/runtimeMesh';
import type { Vec3 } from '../../intent/types';
import { Transform } from '../../runtime/se3';
import { buildPoseEnvelopeSamples, type PoseEnvelopeSample } from './poseEnvelope';
import { solveMates } from './solver';

type Bbox = { min: Vec3; max: Vec3 };
type AssemblyPart = ReturnType<Assembly['__parts']>[number];
type TransformedMesh = { positions: Float32Array; indices: Uint32Array };

export type MechanicalTransmissionDiagnostic =
  | TransmissionMissingForCoupledMateDiagnostic
  | TransmissionMateMissingDiagnostic
  | TransmissionPartMissingDiagnostic
  | TransmissionPathDisconnectedDiagnostic;

interface MechanicalTransmissionDiagnosticBase {
  readonly severity: 'error';
  readonly transmissionName?: string;
  readonly message: string;
  readonly hint: string;
}

export interface TransmissionMissingForCoupledMateDiagnostic extends MechanicalTransmissionDiagnosticBase {
  readonly code: 'assembly.transmission.missing-for-coupled-mate';
  readonly sourceMate: string;
  readonly drivenMate: string;
}

export interface TransmissionMateMissingDiagnostic extends MechanicalTransmissionDiagnosticBase {
  readonly code: 'assembly.transmission.mate-missing';
  readonly mateName: string;
  readonly role: 'sourceMate' | 'drivenMate';
}

export interface TransmissionPartMissingDiagnostic extends MechanicalTransmissionDiagnosticBase {
  readonly code: 'assembly.transmission.part-missing';
  readonly partName: string;
  readonly role: 'actuator' | 'input' | 'output' | 'path';
}

export interface TransmissionPathDisconnectedDiagnostic extends MechanicalTransmissionDiagnosticBase {
  readonly code: 'assembly.transmission.path-disconnected';
  readonly sampleName: string;
  readonly fromPartName: string;
  readonly toPartName: string;
  readonly gapMm: number;
  readonly worldBboxA: Bbox;
  readonly worldBboxB: Bbox;
}

export interface MechanicalTransmissionReviewResult {
  readonly diagnostics: readonly MechanicalTransmissionDiagnostic[];
  readonly checkedTransmissionCount: number;
  readonly checkedCouplingCount: number;
}

export interface MechanicalTransmissionReviewOptions {
  readonly includePoseEnvelope?: boolean;
}

const TRANSMISSION_PATH_CONTACT_GAP_TOL_MM = 3;

export async function reviewMechanicalTransmission(
  arm: Assembly,
  opts: MechanicalTransmissionReviewOptions = {},
): Promise<MechanicalTransmissionReviewResult> {
  const diagnostics: MechanicalTransmissionDiagnostic[] = [];
  const transmissions = arm.__transmissionIntents();
  const matesByName = new Map(arm.__mates().map((mate) => [mate.name, mate]));
  const partsByName = new Map(arm.__parts().map((part) => [part.name, part]));
  const partNames = new Set(partsByName.keys());
  const localMeshByPartName = new Map<string, RuntimeMesh>();
  const pathSamples = opts.includePoseEnvelope === true
    ? buildPoseEnvelopeSamples(arm)
    : [{ name: 'current', poses: {}, reason: 'capture-time/default mate poses' }] satisfies PoseEnvelopeSample[];

  for (const coupling of arm.__mateCouplings()) {
    const matching = transmissions.some((transmission) =>
      transmission.sourceMate === coupling.source &&
      transmission.drivenMates.includes(coupling.driven),
    );
    if (matching) continue;

    diagnostics.push({
      code: 'assembly.transmission.missing-for-coupled-mate',
      severity: 'error',
      sourceMate: coupling.source,
      drivenMate: coupling.driven,
      message: `Coupled mate '${coupling.driven}' follows '${coupling.source}' but no arm.transmission(...) declares the physical drive path.`,
      hint: `mechanical-transmission.missing-for-coupled-mate — add arm.transmission(name, { sourceMate: '${coupling.source}', drivenMates: ['${coupling.driven}'], kind, path: [...] }) naming the horn/link/gear/belt/tendon parts that transfer motion.`,
    });
  }

  for (const transmission of transmissions) {
    if (!matesByName.has(transmission.sourceMate)) {
      diagnostics.push({
        code: 'assembly.transmission.mate-missing',
        severity: 'error',
        transmissionName: transmission.name,
        mateName: transmission.sourceMate,
        role: 'sourceMate',
        message: `Transmission '${transmission.name}' references missing source mate '${transmission.sourceMate}'.`,
        hint: `mechanical-transmission.mate-missing — declare arm.mate('${transmission.sourceMate}', ...) before arm.transmission('${transmission.name}', ...).`,
      });
    }

    for (const drivenMate of transmission.drivenMates) {
      if (matesByName.has(drivenMate)) continue;
      diagnostics.push({
        code: 'assembly.transmission.mate-missing',
        severity: 'error',
        transmissionName: transmission.name,
        mateName: drivenMate,
        role: 'drivenMate',
        message: `Transmission '${transmission.name}' references missing driven mate '${drivenMate}'.`,
        hint: `mechanical-transmission.mate-missing — declare arm.mate('${drivenMate}', ...) before naming it in arm.transmission('${transmission.name}', ...).`,
      });
    }

    checkOptionalPart(diagnostics, transmission, partNames, 'actuator', transmission.actuator);
    checkOptionalPart(diagnostics, transmission, partNames, 'input', transmission.input);
    checkOptionalPart(diagnostics, transmission, partNames, 'output', transmission.output);
    for (const pathPart of transmission.path) {
      checkOptionalPart(diagnostics, transmission, partNames, 'path', pathPart);
    }

    for (const sample of pathSamples) {
      const solved = await solveMates(arm, sample.poses);
      const worldBoundsByPartName = new Map<string, Bbox>();
      const worldMeshByPartName = new Map<string, TransformedMesh>();
      for (let index = 1; index < transmission.path.length; index++) {
        const fromPartName = transmission.path[index - 1];
        const toPartName = transmission.path[index];
        if (!partNames.has(fromPartName) || !partNames.has(toPartName)) continue;
        const worldBboxA = await worldBoundsFor(fromPartName, partsByName, solved.poses, worldBoundsByPartName);
        const worldBboxB = await worldBoundsFor(toPartName, partsByName, solved.poses, worldBoundsByPartName);
        if (worldBboxA === undefined || worldBboxB === undefined) continue;
        let gapMm = bboxGap(worldBboxA, worldBboxB);
        if (gapMm <= TRANSMISSION_PATH_CONTACT_GAP_TOL_MM) {
          const worldMeshA = await worldMeshFor(fromPartName, partsByName, solved.poses, localMeshByPartName, worldMeshByPartName);
          const worldMeshB = await worldMeshFor(toPartName, partsByName, solved.poses, localMeshByPartName, worldMeshByPartName);
          if (worldMeshA === undefined || worldMeshB === undefined) continue;
          gapMm = meshSurfaceGap(worldMeshA, worldMeshB);
        }
        if (gapMm <= TRANSMISSION_PATH_CONTACT_GAP_TOL_MM) continue;

        diagnostics.push({
          code: 'assembly.transmission.path-disconnected',
          severity: 'error',
          transmissionName: transmission.name,
          sampleName: sample.name,
          fromPartName,
          toPartName,
          gapMm,
          worldBboxA,
          worldBboxB,
          message: `Transmission '${transmission.name}' path jumps ${gapMm.toFixed(1)} mm from '${fromPartName}' to '${toPartName}' at pose-envelope sample '${sample.name}'.`,
          hint: `mechanical-transmission.path-disconnected — add a horn/link/gear/belt/tendon part that physically touches both '${fromPartName}' and '${toPartName}' across the declared travel, or reorder the transmission path so consecutive parts form a load path within ${TRANSMISSION_PATH_CONTACT_GAP_TOL_MM} mm.`,
        });
      }
    }
  }

  return {
    diagnostics,
    checkedTransmissionCount: transmissions.length,
    checkedCouplingCount: arm.__mateCouplings().length,
  };
}

async function worldBoundsFor(
  partName: string,
  partsByName: ReadonlyMap<string, AssemblyPart>,
  poses: ReadonlyMap<string, Transform>,
  cache: Map<string, Bbox>,
): Promise<Bbox | undefined> {
  let bbox = cache.get(partName);
  if (bbox !== undefined) return bbox;
  const part = partsByName.get(partName);
  if (part === undefined) return undefined;
  const local = (await part.originalShape.lower()).boundingBox();
  const transform = poses.get(partName) ?? Transform.identity();
  bbox = transformBbox(local, transform);
  cache.set(partName, bbox);
  return bbox;
}

async function worldMeshFor(
  partName: string,
  partsByName: ReadonlyMap<string, AssemblyPart>,
  poses: ReadonlyMap<string, Transform>,
  localCache: Map<string, RuntimeMesh>,
  worldCache: Map<string, TransformedMesh>,
): Promise<TransformedMesh | undefined> {
  let mesh = worldCache.get(partName);
  if (mesh !== undefined) return mesh;
  const part = partsByName.get(partName);
  if (part === undefined) return undefined;
  let localMesh = localCache.get(partName);
  if (localMesh === undefined) {
    localMesh = (await part.originalShape.lower()).getMesh();
    localCache.set(partName, localMesh);
  }
  const transform = poses.get(partName) ?? Transform.identity();
  const positions = new Float32Array(localMesh.positions.length);
  for (let i = 0; i < localMesh.positions.length; i += 3) {
    const point = transform.point([
      localMesh.positions[i],
      localMesh.positions[i + 1],
      localMesh.positions[i + 2],
    ]) as Vec3;
    positions[i] = point[0];
    positions[i + 1] = point[1];
    positions[i + 2] = point[2];
  }
  mesh = { positions, indices: localMesh.indices };
  worldCache.set(partName, mesh);
  return mesh;
}

function bboxGap(a: Bbox, b: Bbox): number {
  return Math.hypot(axisGap(a, b, 0), axisGap(a, b, 1), axisGap(a, b, 2));
}

function axisGap(a: Bbox, b: Bbox, axis: number): number {
  if (a.max[axis] < b.min[axis]) return b.min[axis] - a.max[axis];
  if (b.max[axis] < a.min[axis]) return a.min[axis] - b.max[axis];
  return 0;
}

function transformBbox(bbox: Bbox, transform: Transform): Bbox {
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
  const corners = localCorners.map((corner) => transform.point(corner) as Vec3);

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

function meshSurfaceGap(a: TransformedMesh, b: TransformedMesh): number {
  let best2 = Number.POSITIVE_INFINITY;
  best2 = Math.min(best2, meshVertexToMeshTriangleDistanceSquared(a, b, best2));
  if (best2 <= TRANSMISSION_PATH_CONTACT_GAP_TOL_MM ** 2) return Math.sqrt(best2);
  best2 = Math.min(best2, meshVertexToMeshTriangleDistanceSquared(b, a, best2));
  return Math.sqrt(best2);
}

function meshVertexToMeshTriangleDistanceSquared(
  vertices: TransformedMesh,
  triangles: TransformedMesh,
  earlyExit2: number,
): number {
  let best2 = earlyExit2;
  for (let i = 0; i < vertices.positions.length; i += 3) {
    const point: Vec3 = [vertices.positions[i], vertices.positions[i + 1], vertices.positions[i + 2]];
    for (let tri = 0; tri < triangles.indices.length; tri += 3) {
      const a = vertexAt(triangles, triangles.indices[tri]);
      const b = vertexAt(triangles, triangles.indices[tri + 1]);
      const c = vertexAt(triangles, triangles.indices[tri + 2]);
      best2 = Math.min(best2, pointTriangleDistanceSquared(point, a, b, c));
      if (best2 <= TRANSMISSION_PATH_CONTACT_GAP_TOL_MM ** 2) return best2;
    }
  }
  return best2;
}

function vertexAt(mesh: TransformedMesh, vertexIndex: number): Vec3 {
  const i = vertexIndex * 3;
  return [mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]];
}

function pointTriangleDistanceSquared(p: Vec3, a: Vec3, b: Vec3, c: Vec3): number {
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return lengthSquared(ap);

  const bp = sub(p, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return lengthSquared(bp);

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return lengthSquared(sub(p, add(a, scale(ab, v))));
  }

  const cp = sub(p, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return lengthSquared(cp);

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return lengthSquared(sub(p, add(a, scale(ac, w))));
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    return lengthSquared(sub(p, add(b, scale(sub(c, b), w))));
  }

  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  return lengthSquared(sub(p, add(a, add(scale(ab, v), scale(ac, w)))));
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function lengthSquared(v: Vec3): number {
  return dot(v, v);
}

function checkOptionalPart(
  diagnostics: MechanicalTransmissionDiagnostic[],
  transmission: TransmissionIntentRecord,
  partNames: ReadonlySet<string>,
  role: TransmissionPartMissingDiagnostic['role'],
  partName: string | undefined,
): void {
  if (partName === undefined || partNames.has(partName)) return;
  diagnostics.push({
    code: 'assembly.transmission.part-missing',
    severity: 'error',
    transmissionName: transmission.name,
    partName,
    role,
    message: `Transmission '${transmission.name}' references missing ${role} part '${partName}'.`,
    hint: `mechanical-transmission.part-missing — declare arm.part('${partName}', ...) or remove it from arm.transmission('${transmission.name}', ...).`,
  });
}

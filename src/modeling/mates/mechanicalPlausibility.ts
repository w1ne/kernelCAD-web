// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Assembly } from '../capture/assembly';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { Vec3 } from '../../shared/intent/types';
import type { DiagnosticCode } from '../../shared/diagnostics/registry';
import { Transform } from '../../shared/runtime/se3';
import { parseConnectorRef } from './mate';
import { solveMates } from './solver';

type Bbox = { min: Vec3; max: Vec3 };

/**
 * Mechanical-plausibility review attaches one of five `assembly.mechanical.*`
 * codes per diagnostic. Each code is registered in the central
 * `DIAGNOSTIC_REGISTRY` (`src/shared/diagnostics/registry.ts`) so the
 * `code` literal here is a single-element `Extract` of `DiagnosticCode` —
 * the type system enforces that any new mechanical-plausibility code goes
 * through the registry first.
 *
 * Per-code interfaces retain their own structured payload fields
 * (`partName`, `componentCount`, etc.) because the consumers
 * (`inspectAssembly`, `reviewCad`, `mechanismFitness`) need that richer
 * shape — those are downstream of the code itself.
 */
export type MechanicalPlausibilityDiagnostic =
  | PartDisconnectedDiagnostic
  | ConnectorNotInSolidDiagnostic
  | RevoluteUnsupportedDiagnostic
  | RevoluteContactMissingDiagnostic
  | MateContactMissingDiagnostic
  | FixedJointContactMissingDiagnostic;

export interface PartDisconnectedDiagnostic {
  readonly code: Extract<DiagnosticCode, 'assembly.mechanical.part-disconnected'>;
  readonly severity: 'warning';
  readonly message: string;
  readonly hint: string;
  readonly partName: string;
  readonly componentCount: number;
  readonly largestComponentTriangleCount: number;
  readonly maxComponentGapMm: number;
  readonly bbox: Bbox;
}

export interface ConnectorNotInSolidDiagnostic {
  readonly code: Extract<DiagnosticCode, 'assembly.mechanical.connector-not-in-solid'>;
  readonly severity: 'error';
  readonly message: string;
  readonly hint: string;
  readonly mateName: string;
  readonly partName: string;
  readonly connectorName: string;
  readonly connectorRef: string;
  readonly distanceMm: number;
  readonly bbox: Bbox;
}

export interface MateContactMissingDiagnostic {
  readonly code: Extract<DiagnosticCode, 'assembly.mechanical.mate-contact-missing'>;
  readonly severity: 'error';
  readonly message: string;
  readonly hint: string;
  readonly mateName: string;
  readonly partAName: string;
  readonly partBName: string;
  readonly connectorARef: string;
  readonly connectorBRef: string;
  readonly contactAreaMm2: number;
  readonly gapMm: number;
  readonly worldBboxA: Bbox;
  readonly worldBboxB: Bbox;
}

export interface FixedJointContactMissingDiagnostic {
  readonly code: Extract<DiagnosticCode, 'assembly.mechanical.fixed-contact-missing'>;
  readonly severity: 'error';
  readonly message: string;
  readonly hint: string;
  readonly jointName: string;
  readonly partAName: string;
  readonly partBName: string;
  readonly contactAreaMm2: number;
  readonly gapMm: number;
  readonly worldBboxA: Bbox;
  readonly worldBboxB: Bbox;
}

export interface RevoluteUnsupportedDiagnostic {
  readonly code: Extract<DiagnosticCode, 'assembly.mechanical.revolute-unsupported'>;
  readonly severity: 'error';
  readonly message: string;
  readonly hint: string;
  readonly mateName: string;
  readonly partName: string;
  readonly connectorName: string;
  readonly connectorRef: string;
  readonly distanceMm: number;
  readonly bbox: Bbox;
}

export interface RevoluteContactMissingDiagnostic {
  readonly code: Extract<DiagnosticCode, 'assembly.mechanical.revolute-contact-missing'>;
  readonly severity: 'error';
  readonly message: string;
  readonly hint: string;
  readonly mateName: string;
  readonly partAName: string;
  readonly partBName: string;
  readonly connectorARef: string;
  readonly connectorBRef: string;
  readonly axialGapMm: number;
}

export interface MechanicalPlausibilityResult {
  readonly diagnostics: readonly MechanicalPlausibilityDiagnostic[];
  readonly checkedMateConnectorCount: number;
  readonly checkedFastenedMateContactCount: number;
}

const CONNECTOR_SOLID_TOL_MM = 6;
const REVOLUTE_SUPPORT_TOL_MM = 1;
const REVOLUTE_BEARING_AXIAL_GAP_TOL_MM = 3;
const REVOLUTE_BEARING_RADIAL_SAMPLE_RADIUS_MM = 24;
const FASTENED_CONTACT_GAP_TOL_MM = 0.5;
const MIN_FASTENED_CONTACT_AREA_MM2 = 0.25;
// Treat visible/mechanical clearance gaps inside a single named part as
// disconnected. The remaining tolerance is only for mesh/OCCT numeric noise;
// separate hardware with a 0.2-0.5 mm running clearance must be modeled as
// its own part/mate, not hidden inside one part as "connected" geometry.
const DISCONNECTED_COMPONENT_GAP_TOL_MM = 0.05;
const MAX_COMPONENTS_FOR_EXACT_CLUSTERING = 1000;
const MAX_VERTICES_FOR_EXACT_CLUSTERING = 50_000;

export async function reviewMechanicalPlausibility(
  arm: Assembly,
): Promise<MechanicalPlausibilityResult> {
  const diagnostics: MechanicalPlausibilityDiagnostic[] = [];
  const partsByName = new Map(arm.__parts().map((part) => [part.name, part]));
  const partNameById = new Map(arm.__parts().map((part) => [part.id, part.name]));
  const boundsByPartName = new Map<string, Bbox>();
  const backendByPartName = new Map<string, ShapeBackend>();
  const solved = await solveMates(arm);
  const worldBoundsByPartName = new Map<string, Bbox>();
  let checkedMateConnectorCount = 0;
  let checkedFastenedMateContactCount = 0;

  const localBoundsFor = async (partName: string): Promise<Bbox | undefined> => {
    const part = partsByName.get(partName);
    if (part === undefined) return undefined;
    let bbox = boundsByPartName.get(part.name);
    if (bbox === undefined) {
      bbox = (await part.originalShape.lower()).boundingBox();
      boundsByPartName.set(part.name, bbox);
    }
    return bbox;
  };

  const backendFor = async (partName: string): Promise<ShapeBackend | undefined> => {
    const part = partsByName.get(partName);
    if (part === undefined) return undefined;
    let backend = backendByPartName.get(part.name);
    if (backend === undefined) {
      backend = await part.originalShape.lower();
      backendByPartName.set(part.name, backend);
    }
    return backend;
  };

  const worldBoundsFor = async (partName: string): Promise<Bbox | undefined> => {
    let bbox = worldBoundsByPartName.get(partName);
    if (bbox !== undefined) return bbox;
    const local = await localBoundsFor(partName);
    if (local === undefined) return undefined;
    const transform = solved.poses.get(partName) ?? Transform.identity();
    bbox = transformBbox(local, transform);
    worldBoundsByPartName.set(partName, bbox);
    return bbox;
  };

  for (const part of arm.__parts()) {
    const backend = await backendFor(part.name);
    if (backend === undefined) continue;
    const disconnected = analyzeDisconnectedMesh(backend.getMesh());
    if (disconnected === undefined) continue;
    const bbox = await localBoundsFor(part.name);
    if (bbox === undefined) continue;
    diagnostics.push({
      code: 'assembly.mechanical.part-disconnected',
      severity: 'warning',
      partName: part.name,
      componentCount: disconnected.componentCount,
      largestComponentTriangleCount: disconnected.largestComponentTriangleCount,
      maxComponentGapMm: disconnected.maxComponentGapMm,
      bbox,
      message: `Part '${part.name}' contains ${disconnected.componentCount} disconnected solids; the farthest component is ${disconnected.maxComponentGapMm.toFixed(1)} mm from the main body.`,
      hint: `mechanical-plausibility.part-disconnected — remove decorative/floating solids from '${part.name}', or add real bridge/bracket geometry so every solid in the part shares a physical load path.`,
    });
  }

  for (const joint of arm.__joints()) {
    if (joint.kind !== 'fixed') continue;
    const partAName = partNameById.get(joint.parentPartId);
    const partBName = partNameById.get(joint.childPartId);
    if (partAName === undefined || partBName === undefined) continue;
    const worldBboxA = await worldBoundsFor(partAName);
    const worldBboxB = await worldBoundsFor(partBName);
    if (worldBboxA === undefined || worldBboxB === undefined) continue;

    const contact = analyzeFastenedContact(worldBboxA, worldBboxB);
    if (contact.supported) continue;

    diagnostics.push({
      code: 'assembly.mechanical.fixed-contact-missing',
      severity: 'error',
      jointName: joint.name,
      partAName,
      partBName,
      contactAreaMm2: contact.maxContactAreaMm2,
      gapMm: contact.gapMm,
      worldBboxA,
      worldBboxB,
      message: `Fixed joint '${joint.name}' between '${partAName}' and '${partBName}' has only ${contact.maxContactAreaMm2.toFixed(1)} mm^2 of support contact and ${contact.gapMm.toFixed(1)} mm gap.`,
      hint: `mechanical-plausibility.fixed-contact-missing — move '${partBName}' into contact with '${partAName}', or add a bracket, flange, stem, bridge, or mounting face so fixed joint '${joint.name}' has a real load path instead of an air gap.`,
    });
  }

  for (const mate of arm.__mates()) {
    for (const connectorRef of [mate.a, mate.b]) {
      const parsed = parseConnectorRef(connectorRef);
      const part = partsByName.get(parsed.partName);
      const connector = part?.mateConnectors.find((c) => c.name === parsed.connectorName);
      if (part === undefined || connector === undefined || connector.origin.kind !== 'vec3') continue;

      checkedMateConnectorCount += 1;
      const bbox = await localBoundsFor(part.name);
      if (bbox === undefined) continue;

      const distanceMm = distanceOutsideExpandedBbox(connector.origin.value, bbox, CONNECTOR_SOLID_TOL_MM);
      if (distanceMm === 0) continue;

      diagnostics.push({
        code: 'assembly.mechanical.connector-not-in-solid',
        severity: 'error',
        mateName: mate.name,
        partName: part.name,
        connectorName: parsed.connectorName,
        connectorRef,
        distanceMm,
        bbox,
        message: `Mate '${mate.name}' connector '${connectorRef}' is ${distanceMm.toFixed(1)} mm away from modeled material on part '${part.name}'.`,
        hint: `mechanical-plausibility.connector-not-in-solid — move '${connectorRef}' onto the part's modeled bearing/bracket/knuckle, or add support geometry around that connector so the mate has a physical load path.`,
      });
    }

    if (mate.type === 'revolute') {
      const a = parseConnectorRef(mate.a);
      const b = parseConnectorRef(mate.b);
      const partA = partsByName.get(a.partName);
      const partB = partsByName.get(b.partName);
      const connectorA = partA?.mateConnectors.find((c) => c.name === a.connectorName);
      const connectorB = partB?.mateConnectors.find((c) => c.name === b.connectorName);
      const hasDeclaredDriveSupport = arm.__mechanicalJointIntents().some((intent) => intent.mate === mate.name) ||
        arm.__jointSupportIntents().some((intent) => intent.mate === mate.name);
      if (
        !hasDeclaredDriveSupport &&
        partA !== undefined &&
        partB !== undefined &&
        connectorA?.origin.kind === 'vec3' &&
        connectorB?.origin.kind === 'vec3' &&
        connectorA.axis !== undefined
      ) {
        const backendA = await backendFor(partA.name);
        const backendB = await backendFor(partB.name);
        if (backendA !== undefined && backendB !== undefined) {
          const axialGapMm = minBearingAxialGapMm(
            backendA,
            connectorA.origin.value,
            connectorA.axis,
            backendB,
            connectorB.origin.value,
            connectorA.axis,
          );
          if (axialGapMm > REVOLUTE_BEARING_AXIAL_GAP_TOL_MM) {
            diagnostics.push({
              code: 'assembly.mechanical.revolute-contact-missing',
              severity: 'error',
              mateName: mate.name,
              partAName: partA.name,
              partBName: partB.name,
              connectorARef: mate.a,
              connectorBRef: mate.b,
              axialGapMm,
              message: `Revolute mate '${mate.name}' leaves ${axialGapMm.toFixed(1)} mm of air gap between bearing material on '${partA.name}' and '${partB.name}'.`,
              hint: `mechanical-plausibility.revolute-contact-missing — add interleaved hinge knuckles, a clevis tab, spacer, or bearing shoulder so '${partA.name}' and '${partB.name}' have modeled support faces within ${REVOLUTE_BEARING_AXIAL_GAP_TOL_MM} mm along the hinge axis.`,
            });
          }
        }
      }

      for (const connectorRef of [mate.a, mate.b]) {
        const parsed = parseConnectorRef(connectorRef);
        const part = partsByName.get(parsed.partName);
        const connector = part?.mateConnectors.find((c) => c.name === parsed.connectorName);
        if (part === undefined || connector === undefined || connector.origin.kind !== 'vec3') continue;
        const bbox = await localBoundsFor(part.name);
        if (bbox === undefined) continue;

        const distanceMm = distanceOutsideExpandedBbox(connector.origin.value, bbox, REVOLUTE_SUPPORT_TOL_MM);
        if (distanceMm === 0) continue;

        const worldPoint = (solved.poses.get(part.name) ?? Transform.identity()).point(connector.origin.value) as Vec3;
        const fastenedSupport = await findFastenedSupportForPoint(
          arm,
          part.name,
          worldPoint,
          worldBoundsFor,
        );
        if (fastenedSupport !== undefined) continue;

        diagnostics.push({
          code: 'assembly.mechanical.revolute-unsupported',
          severity: 'error',
          mateName: mate.name,
          partName: part.name,
          connectorName: parsed.connectorName,
          connectorRef,
          distanceMm,
          bbox,
          message: `Revolute mate '${mate.name}' connector '${connectorRef}' is ${distanceMm.toFixed(1)} mm outside modeled support material on part '${part.name}'.`,
          hint: `mechanical-plausibility.revolute-unsupported — add a hinge knuckle, bearing block, bracket, or shaft support so '${connectorRef}' lies on modeled material, not just near a bounding box.`,
        });
      }
    }

    if (mate.type !== 'fastened') continue;

    const a = parseConnectorRef(mate.a);
    const b = parseConnectorRef(mate.b);
    const worldBboxA = await worldBoundsFor(a.partName);
    const worldBboxB = await worldBoundsFor(b.partName);
    if (worldBboxA === undefined || worldBboxB === undefined) continue;

    checkedFastenedMateContactCount += 1;
    const contact = analyzeFastenedContact(worldBboxA, worldBboxB);
    if (contact.supported) continue;

    diagnostics.push({
      code: 'assembly.mechanical.mate-contact-missing',
      severity: 'error',
      mateName: mate.name,
      partAName: a.partName,
      partBName: b.partName,
      connectorARef: mate.a,
      connectorBRef: mate.b,
      contactAreaMm2: contact.maxContactAreaMm2,
      gapMm: contact.gapMm,
      worldBboxA,
      worldBboxB,
      message: `Fastened mate '${mate.name}' between '${a.partName}' and '${b.partName}' has only ${contact.maxContactAreaMm2.toFixed(1)} mm^2 of support contact.`,
      hint: `mechanical-plausibility.mate-contact-missing — add a bracket, flange, horn, or mounting face so '${a.partName}' and '${b.partName}' share a real contact patch near mate '${mate.name}', not just a connector point.`,
    });
  }

  return { diagnostics, checkedMateConnectorCount, checkedFastenedMateContactCount };
}

function analyzeDisconnectedMesh(mesh: ReturnType<ShapeBackend['getMesh']>): {
  componentCount: number;
  largestComponentTriangleCount: number;
  maxComponentGapMm: number;
} | undefined {
  const triangleCount = Math.floor(mesh.indices.length / 3);
  if (triangleCount <= 1) return undefined;

  const trianglesByVertexKey = new Map<string, number[]>();
  const triangleVertexKeys: string[][] = [];
  for (let tri = 0; tri < triangleCount; tri++) {
    const keys: string[] = [];
    for (let corner = 0; corner < 3; corner++) {
      const vertexIndex = mesh.indices[tri * 3 + corner];
      const key = vertexKey(mesh.positions, vertexIndex);
      keys.push(key);
      const tris = trianglesByVertexKey.get(key);
      if (tris === undefined) {
        trianglesByVertexKey.set(key, [tri]);
      } else {
        tris.push(tri);
      }
    }
    triangleVertexKeys.push(keys);
  }

  const visited = new Uint8Array(triangleCount);
  const components: MeshComponent[] = [];
  for (let start = 0; start < triangleCount; start++) {
    if (visited[start]) continue;
    const stack = [start];
    visited[start] = 1;
    const bbox: Bbox = {
      min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
      max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
    };
    const vertices = new Map<string, Vec3>();
    let componentTriangleCount = 0;

    while (stack.length > 0) {
      const tri = stack.pop();
      if (tri === undefined) continue;
      componentTriangleCount += 1;
      for (let corner = 0; corner < 3; corner++) {
        const vertexIndex = mesh.indices[tri * 3 + corner];
        expandBboxWithVertex(bbox, mesh.positions, vertexIndex);
        const key = vertexKey(mesh.positions, vertexIndex);
        if (!vertices.has(key)) vertices.set(key, readVertex(mesh.positions, vertexIndex));
      }
      for (const key of triangleVertexKeys[tri]) {
        for (const neighbor of trianglesByVertexKey.get(key) ?? []) {
          if (visited[neighbor]) continue;
          visited[neighbor] = 1;
          stack.push(neighbor);
        }
      }
    }

    components.push({ triangleCount: componentTriangleCount, bbox, vertices: [...vertices.values()] });
  }

  // Some OCCT triangulations do not share exact vertex coordinates across
  // adjacent faces, which can make a single complex solid look like thousands
  // of triangle components. Exact bbox clustering has pairwise vertex-distance
  // checks, so keep the review bounded and let simpler/floating parts still
  // receive the strict disconnected-solid check.
  if (components.length > MAX_COMPONENTS_FOR_EXACT_CLUSTERING) return undefined;
  const totalVertexCount = components.reduce((sum, component) => sum + component.vertices.length, 0);
  if (totalVertexCount > MAX_VERTICES_FOR_EXACT_CLUSTERING) return undefined;

  const clusters = clusterTouchingComponents(components);
  if (clusters.length <= 1) return undefined;
  clusters.sort((a, b) => b.triangleCount - a.triangleCount);
  const largest = clusters[0];
  const maxComponentGapMm = Math.max(...clusters.slice(1).map((component) => componentSeparationMm(largest, component)));
  if (maxComponentGapMm <= DISCONNECTED_COMPONENT_GAP_TOL_MM) return undefined;

  return {
    componentCount: clusters.length,
    largestComponentTriangleCount: largest.triangleCount,
    maxComponentGapMm,
  };
}

function clusterTouchingComponents(
  components: MeshComponent[],
): MeshComponent[] {
  const clustered: MeshComponent[] = [];
  const consumed = new Uint8Array(components.length);

  for (let start = 0; start < components.length; start++) {
    if (consumed[start]) continue;
    consumed[start] = 1;
    const cluster = {
      triangleCount: 0,
      vertices: [] as Vec3[],
      bbox: {
        min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY] as Vec3,
        max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY] as Vec3,
      },
    };
    const stack = [start];
    while (stack.length > 0) {
      const index = stack.pop();
      if (index === undefined) continue;
      const component = components[index];
      cluster.triangleCount += component.triangleCount;
      mergeBbox(cluster.bbox, component.bbox);
      cluster.vertices.push(...component.vertices);

      for (let candidate = 0; candidate < components.length; candidate++) {
        if (consumed[candidate]) continue;
        if (bboxGap(cluster.bbox, components[candidate].bbox) > DISCONNECTED_COMPONENT_GAP_TOL_MM) continue;
        if (!componentsHaveNearVertices(cluster, components[candidate])) continue;
        consumed[candidate] = 1;
        stack.push(candidate);
      }
    }
    clustered.push(cluster);
  }

  return clustered;
}

interface MeshComponent {
  triangleCount: number;
  bbox: Bbox;
  vertices: Vec3[];
}

function mergeBbox(target: Bbox, source: Bbox): void {
  for (let axis = 0; axis < 3; axis++) {
    target.min[axis] = Math.min(target.min[axis], source.min[axis]);
    target.max[axis] = Math.max(target.max[axis], source.max[axis]);
  }
}

function vertexKey(positions: Float32Array, vertexIndex: number): string {
  const i = vertexIndex * 3;
  return [
    Math.round(positions[i] * 1000),
    Math.round(positions[i + 1] * 1000),
    Math.round(positions[i + 2] * 1000),
  ].join(',');
}

function readVertex(positions: Float32Array, vertexIndex: number): Vec3 {
  const i = vertexIndex * 3;
  return [positions[i], positions[i + 1], positions[i + 2]];
}

function componentsHaveNearVertices(a: MeshComponent, b: MeshComponent): boolean {
  return minVertexDistanceMm(a, b) <= DISCONNECTED_COMPONENT_GAP_TOL_MM;
}

function componentSeparationMm(a: MeshComponent, b: MeshComponent): number {
  const boxGap = bboxGap(a.bbox, b.bbox);
  if (boxGap > DISCONNECTED_COMPONENT_GAP_TOL_MM) return boxGap;
  return minVertexDistanceMm(a, b);
}

function minVertexDistanceMm(a: MeshComponent, b: MeshComponent): number {
  const smaller = a.vertices.length <= b.vertices.length ? a.vertices : b.vertices;
  const larger = smaller === a.vertices ? b.vertices : a.vertices;
  let minSq = Number.POSITIVE_INFINITY;
  for (const va of smaller) {
    for (const vb of larger) {
      const dx = va[0] - vb[0];
      const dy = va[1] - vb[1];
      const dz = va[2] - vb[2];
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < minSq) minSq = distSq;
    }
  }
  return Math.sqrt(minSq);
}

function expandBboxWithVertex(bbox: Bbox, positions: Float32Array, vertexIndex: number): void {
  const i = vertexIndex * 3;
  for (let axis = 0; axis < 3; axis++) {
    const value = positions[i + axis];
    bbox.min[axis] = Math.min(bbox.min[axis], value);
    bbox.max[axis] = Math.max(bbox.max[axis], value);
  }
}

function bboxGap(a: Bbox, b: Bbox): number {
  return Math.hypot(axisGap(a, b, 0), axisGap(a, b, 1), axisGap(a, b, 2));
}

function minBearingAxialGapMm(
  backendA: ShapeBackend,
  originA: Vec3,
  axisA: Vec3,
  backendB: ShapeBackend,
  originB: Vec3,
  axisB: Vec3,
): number {
  const samplesA = bearingProjectionSamples(backendA, originA, axisA);
  const samplesB = bearingProjectionSamples(backendB, originB, axisB);
  if (samplesA.length === 0 || samplesB.length === 0) return Number.POSITIVE_INFINITY;

  let best = Number.POSITIVE_INFINITY;
  for (const a of samplesA) {
    for (const b of samplesB) {
      best = Math.min(best, Math.abs(a - b));
    }
  }
  return best;
}

function bearingProjectionSamples(
  backend: ShapeBackend,
  origin: Vec3,
  axis: Vec3,
): number[] {
  const normalizedAxis = normalize(axis);
  if (normalizedAxis === undefined) return [];
  const mesh = backend.getMesh();
  const out: number[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const point: Vec3 = [mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]];
    const rel = sub(point, origin);
    const projection = dot(rel, normalizedAxis);
    const closest = scale(normalizedAxis, projection);
    const radial = length(sub(rel, closest));
    if (radial <= REVOLUTE_BEARING_RADIAL_SAMPLE_RADIUS_MM) {
      out.push(projection);
    }
  }
  return out;
}

async function findFastenedSupportForPoint(
  arm: Assembly,
  partName: string,
  worldPoint: Vec3,
  worldBoundsFor: (partName: string) => Promise<Bbox | undefined>,
): Promise<string | undefined> {
  for (const mate of arm.__mates()) {
    if (mate.type !== 'fastened') continue;
    const a = parseConnectorRef(mate.a);
    const b = parseConnectorRef(mate.b);
    const supportPartName = a.partName === partName
      ? b.partName
      : b.partName === partName
        ? a.partName
        : undefined;
    if (supportPartName === undefined) continue;
    const supportBbox = await worldBoundsFor(supportPartName);
    if (supportBbox === undefined) continue;
    if (distanceOutsideExpandedBbox(worldPoint, supportBbox, REVOLUTE_SUPPORT_TOL_MM) === 0) {
      return supportPartName;
    }
  }
  return undefined;
}

function distanceOutsideExpandedBbox(
  point: Vec3,
  bbox: { min: Vec3; max: Vec3 },
  toleranceMm: number,
): number {
  let d2 = 0;
  for (let axis = 0; axis < 3; axis++) {
    const min = bbox.min[axis] - toleranceMm;
    const max = bbox.max[axis] + toleranceMm;
    const value = point[axis];
    if (value < min) {
      d2 += (min - value) ** 2;
    } else if (value > max) {
      d2 += (value - max) ** 2;
    }
  }
  return Math.sqrt(d2);
}

function analyzeFastenedContact(
  a: Bbox,
  b: Bbox,
): { supported: boolean; maxContactAreaMm2: number; gapMm: number } {
  const overlaps = [0, 1, 2].map((axis) =>
    Math.max(0, Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis])),
  );
  const gaps = [0, 1, 2].map((axis) => axisGap(a, b, axis));

  let maxContactAreaMm2 = 0;
  for (let normalAxis = 0; normalAxis < 3; normalAxis++) {
    if (gaps[normalAxis] > FASTENED_CONTACT_GAP_TOL_MM) continue;
    const tangentA = (normalAxis + 1) % 3;
    const tangentB = (normalAxis + 2) % 3;
    const contactAreaMm2 = overlaps[tangentA] * overlaps[tangentB];
    maxContactAreaMm2 = Math.max(maxContactAreaMm2, contactAreaMm2);
  }

  return {
    supported: maxContactAreaMm2 >= MIN_FASTENED_CONTACT_AREA_MM2,
    maxContactAreaMm2,
    gapMm: Math.hypot(gaps[0], gaps[1], gaps[2]),
  };
}

function axisGap(a: Bbox, b: Bbox, axis: number): number {
  if (a.max[axis] < b.min[axis]) return b.min[axis] - a.max[axis];
  if (b.max[axis] < a.min[axis]) return a.min[axis] - b.max[axis];
  return 0;
}

function normalize(v: Vec3): Vec3 | undefined {
  const len = length(v);
  if (len === 0) return undefined;
  return [v[0] / len, v[1] / len, v[2] / len];
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

function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
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

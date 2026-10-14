// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getOC, makeVertex, type Face } from 'replicad';
import type { BuiltModel } from '../buildModel';
import type { Assembly } from '../capture/assembly';
import { isSceneBackend, type SceneBackend } from '../../kernel/backends/sceneBackend';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { inspectCylindricalHoles, collectFullCylinders, type CylindricalHole } from '../../kernel/backends/occt/holeDetection';
import { brepExtremaDistance } from '../../kernel/backends/occt/brepDistance';
import { validateHashBoundConnectorManifest } from '../../shared/parts/connectorManifestSchema';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import { resolveParams } from '../../shared/runtime/resolveParams';
import { Transform, type Vec3 } from '../../shared/runtime/se3';
import type { FastenerInstallationOptions, FastenerInstallationReport, FastenerStation, FastenerStationReport, InstallationMetric } from './fastenerInstallationTypes';

const add = (a: Vec3, b: Vec3): Vec3 => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const scale = (a: Vec3, n: number): Vec3 => [a[0]*n,a[1]*n,a[2]*n];
const dot = (a: Vec3, b: Vec3): number => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const norm = (a: Vec3): number => Math.hypot(...a);
const unit = (a: Vec3): Vec3 => scale(a, 1/norm(a));
const vector = (p: { x: number; y: number; z: number }): Vec3 => [p.x,p.y,p.z];
const unknown = (name: string, part: string | null, basis: string): InstallationMetric => ({ name, part, status: 'unknown', value: null, unit: name === 'axis-tilt' ? 'deg' : 'mm', limit: null, basis, repairHint: 'Resolve the unsupported geometry/metadata and rerun this explicit station.' });
function measured(name: string, part: string | null, value: number, limit: number | null, passes: boolean, basis: string, hint: string): InstallationMetric {
  return { name, part, status: passes ? 'pass' : 'fail', value, unit: name === 'axis-tilt' ? 'deg' : 'mm', limit, basis, repairHint: passes ? null : hint };
}
function notApplicable(name: string): InstallationMetric {
  return { name, part: null, status: 'not-applicable', value: null, unit: 'mm', limit: null, basis: 'No receiver or corresponding geometric limit declared.', repairHint: null };
}
function validateTolerances(options: FastenerInstallationOptions): void {
  for (const key of ['toleranceMm','angleToleranceDeg'] as const) {
    const n = options[key];
    if (n !== undefined && (!Number.isFinite(n) || n < 0 || (key === 'angleToleranceDeg' && n > 90))) throw new Error(`${key} must be finite and nonnegative (angle <= 90).`);
  }
}
function validateStationTargets(s: FastenerStation): void {
  if (!Array.isArray(s.against) || !s.against.length || s.against.some((p: string) => typeof p !== 'string' || !p || p === s.part) || new Set(s.against).size !== s.against.length) throw new Error('against must contain unique target part names.');
}
function validateStationReceiver(s: FastenerStation): void {
  if (s.engagementPart !== undefined && (typeof s.engagementPart !== 'string' || !s.engagementPart || s.engagementPart === s.part)) throw new Error('engagementPart must name a receiver part.');
  for (const key of ['minEngagementMm','maxProtrusionMm'] as const) if (s[key] !== undefined && (!Number.isFinite(s[key]) || s[key]! < 0 || !s.engagementPart)) throw new Error(`${key} requires a receiver and a finite nonnegative limit.`);
}
function validateStation(s: FastenerStation, seen: Set<string>): void {
  if (!s || typeof s.part !== 'string' || !s.part || seen.has(s.part)) throw new Error('Station part names must be nonempty and unique.');
  seen.add(s.part);
  validateStationTargets(s);
  validateStationReceiver(s);
}
function validateOptions(options: FastenerInstallationOptions): void {
  if (options.assembly !== undefined && (typeof options.assembly !== 'string' || !options.assembly)) throw new Error('assembly must be a nonempty name.');
  if (!Array.isArray(options.fasteners)) throw new Error('fasteners must be an explicit station array.');
  validateTolerances(options);
  const seen = new Set<string>();
  for (const s of options.fasteners) validateStation(s,seen);
}
export interface ScrewFrame { origin: Vec3; axis: Vec3; length: number; diameter: number; catalogId: string; world: OcctBackend }
function sceneOf(model: BuiltModel, assembly?: string): SceneBackend | undefined {
  const candidates = [model.rootShape, ...[...model.shapes.values()].reverse()];
  return candidates.find(s => isSceneBackend(s) && (assembly === undefined || s.assemblyName === assembly)) as SceneBackend | undefined;
}
interface ScrewInterfaces { bearingOrigin: Vec3; tipOrigin: Vec3; length: number; diameter: number; catalogId: string }
function screwInterfaces(record: FeatureRecord, families: readonly string[]): ScrewInterfaces | undefined {
  const catalog = record.metadata?.catalogPart;
  if (record.kind !== 'importedStep' || !catalog || !families.includes(catalog.family)) return undefined;
  const manifest = catalog.connectorManifest;
  if (!manifest) return undefined;
  validateHashBoundConnectorManifest(manifest, { partId: catalog.id, family: catalog.family, geometrySha256: catalog.sha256 });
  const insert = catalog.family === 'heat-set-insert';
  const bearing = manifest.connectors.find(c => c.name === (insert || catalog.family === 'flat-head-countersunk' ? 'mating-face' : 'head-bearing'));
  const tip = manifest.connectors.find(c => c.name === (insert ? 'top-face' : 'thread-tip'));
  const length = Number(catalog.attributes.lengthMm);
  const diameter = Number(insert ? catalog.attributes.outerDiameterMm : catalog.attributes.shankDiameterMm ?? String(catalog.attributes.thread).slice(1));
  if (bearing?.type !== 'frame' || !tip || !(length > 0) || !(diameter > 0)) return undefined;
  return { bearingOrigin: bearing.origin, tipOrigin: tip.origin, length, diameter, catalogId: catalog.id };
}
function recordPlacement(model: BuiltModel, record: FeatureRecord): Transform | undefined {
  let placement = Transform.identity();
  const resolved = resolveParams(record, model.session.paramTable);
  for (const t of resolved.transforms) {
    if (t.op === 'translate') placement = Transform.translation(t.vec.x.evaluated,t.vec.y.evaluated,t.vec.z.evaluated).compose(placement);
    else if (t.op === 'rotateAxis') placement = Transform.rotationAroundPivot([t.axis.x.evaluated,t.axis.y.evaluated,t.axis.z.evaluated],t.degrees.evaluated,t.pivot ? [t.pivot.x.evaluated,t.pivot.y.evaluated,t.pivot.z.evaluated] : [0,0,0]).compose(placement);
    else return undefined;
  }
  return placement;
}
export function catalogFastenerOf(model: BuiltModel, scene: SceneBackend, name: string, families: readonly string[] = ['socket-head-cap-screw', 'button-head-cap-screw']): ScrewFrame | undefined {
  const arm = (model.session.assemblies as Map<string, Assembly>).get(scene.assemblyName);
  const stored = arm?.__parts().find(p => p.name === name);
  const placed = scene.parts.find(p => p.name === name);
  if (!stored || !placed || !(placed.shape instanceof OcctBackend)) return undefined;
  const record = model.records.find(r => r.id === stored.originalShape.id);
  if (!record) return undefined;
  const interfaces = screwInterfaces(record,families);
  if (!interfaces) return undefined;
  let placement = recordPlacement(model,record);
  if (!placement) return undefined;
  const { length, diameter, catalogId } = interfaces;
  const at = resolveParams(stored.at, model.session.paramTable);
  placement = placed.worldTransform.compose(Transform.translation(at.x.evaluated,at.y.evaluated,at.z.evaluated)).compose(placement);
  const origin = placement.point(interfaces.bearingOrigin);
  const end = placement.point(interfaces.tipOrigin);
  if (Math.abs(norm(sub(end,origin))-length) > .01) return undefined;
  const axis = unit(sub(end,origin));
  const world = (placed.shape as OcctBackend).clone().applyTransform(placed.worldTransform);
  const shaft = collectFullCylinders(world,'pin').some(c => {
    const low = add(c.loc0,scale(c.dir0,c.tMin)), high = add(c.loc0,scale(c.dir0,c.tMax));
    const start = Math.min(dot(sub(low,origin),axis),dot(sub(high,origin),axis));
    const finish = Math.max(dot(sub(low,origin),axis),dot(sub(high,origin),axis));
    const fromBearing = sub(c.loc0,origin);
    const lateral = norm(sub(fromBearing,scale(axis,dot(fromBearing,axis))));
    return lateral<.01 && Math.abs(2*c.radiusMm-diameter)<.01 && Math.abs(start)<.01 && Math.abs(finish-length)<.01 && Math.abs(dot(c.dir0,axis))>.999999;
  });
  if (!shaft) return undefined;
  return { origin, axis, length, diameter, catalogId, world };
}
/** Strict probes propagate kernel errors. Hole inspector's legacy end classification
 * catches errors as outside; never rely on that classification here. */
function probe(shape: OcctBackend, point: Vec3): boolean {
  const sphere = OcctBackend.sphere(.05).translate(...point);
  return !shape.clone().intersect(sphere).isEmpty();
}
function fullOpenBore(shape: OcctBackend, hole: CylindricalHole): boolean {
  const start = hole.axisOrigin; const axis = hole.axisDirection;
  // Center probes at the actual wall endpoints catch thin blind caps that
  // outside-offset probes can jump over. Errors still propagate as unknown.
  for (const offset of [0, .2, .45*hole.diameterMm]) {
    for (const end of [scale(axis,-offset),scale(axis,hole.depthMm+offset)]) if (probe(shape,add(start,end))) return false;
  }
  return true;
}
function boreFor(shape: OcctBackend, screw: ScrewFrame, tolerance: number): CylindricalHole | undefined {
  const inspection = inspectCylindricalHoles(shape);
  if (inspection.holeDetection !== 'exact') return undefined;
  const distance = (h: CylindricalHole): number => {
    const d = sub(screw.origin,h.axisOrigin); const dir = h.axisDirection;
    return norm(sub(d,scale(dir,dot(d,dir))));
  };
  const sorted = [...inspection.holes].sort((a,b) => distance(a)-distance(b));
  const bore = sorted[0];
  if (!bore || (sorted[1] && Math.abs(distance(sorted[1])-distance(bore)) <= tolerance)) return undefined;
  // Only open through bores have a verified outlet. Blind/countersunk/threaded
  // topology is intentionally unknown in this first, flat-bearing audit.
  return fullOpenBore(shape,bore) ? bore : undefined;
}
/** Maximum shank radial envelope over the actual bore interval. The screw
 * can accumulate tilt before it reaches a distant receiver; bore depth alone
 * therefore cannot bound its offset. Plane crossings are clipped to the shaft. */
export function radialEnvelopeExcess(hole: CylindricalHole, screw: ScrewFrame): number {
  const cosine = dot(screw.axis,hole.axisDirection);
  if (Math.abs(cosine)<1e-9) return Infinity;
  const start = hole.axisOrigin;
  const end = add(start,scale(hole.axisDirection,hole.depthMm));
  const clip = (t: number): number => Math.max(0,Math.min(screw.length,t));
  const parameters = [start,end].map(p=>clip(dot(sub(p,screw.origin),hole.axisDirection)/cosine));
  const offsets = parameters.map(t=> {
    const fromBore = sub(add(screw.origin,scale(screw.axis,t)),start);
    return norm(sub(fromBore,scale(hole.axisDirection,dot(fromBore,hole.axisDirection))));
  });
  // A tilted cylinder has an elliptical section in the bore endpoint plane.
  const sectionExcess = screw.diameter/2*(1/Math.abs(cosine)-1);
  return Math.max(...offsets)+sectionExcess;
}
interface BoreInterval { min: number; max: number; hole: CylindricalHole }
/** Shared world-space bore/shaft matching used by installation and coverage. */
export function measureBoreAlignment(hole: CylindricalHole, screw: ScrewFrame): { offset: number; tilt: number; overlap: number; min: number; max: number } {
  const d = sub(screw.origin,hole.axisOrigin);
  const offset = norm(sub(d,scale(hole.axisDirection,dot(d,hole.axisDirection))));
  const tilt = Math.acos(Math.min(1,Math.abs(dot(screw.axis,hole.axisDirection))))*180/Math.PI;
  const first = dot(sub(hole.axisOrigin,screw.origin),screw.axis);
  const last = dot(sub(add(hole.axisOrigin,scale(hole.axisDirection,hole.depthMm)),screw.origin),screw.axis);
  const min = Math.min(first,last), max = Math.max(first,last);
  const overlap = Math.max(0,Math.min(screw.length,max)-Math.max(0,min));
  return { offset, tilt, overlap, min, max };
}
function boreMetrics(part: string, shape: OcctBackend, screw: ScrewFrame, tol: number, angleTol: number): { metrics: InstallationMetric[]; interval?: BoreInterval } {
  const names = ['coaxial-offset','axis-tilt','bore-diameter','axial-overlap'];
  const hole = boreFor(shape,screw,tol);
  if (!hole) return { metrics: names.map(n => unknown(n,part,'Missing, ambiguous, breached or non-through BREP bore.')) };
  const { offset, tilt, overlap, min, max } = measureBoreAlignment(hole,screw);
  // Tilt/offset and clearance together must leave the entire shank envelope
  // inside the bore; individually small errors can still clip a wall.
  const maxOffset = radialEnvelopeExcess(hole,screw);
  const clearance = (hole.diameterMm-screw.diameter)/2;
  return { interval: { min,max,hole }, metrics: [
    measured(names[0],part,offset,tol,offset<=tol,'Distance of screw bearing center to measured bore axis.','Align the screw and target bore axes.'),
    measured(names[1],part,tilt,angleTol,tilt<=angleTol,'Angle between measured bore axis and catalog bearing-to-tip axis.','Rotate the screw onto the bore axis.'),
    measured(names[2],part,hole.diameterMm,screw.diameter,hole.diameterMm+tol>=screw.diameter && maxOffset<=clearance+tol,'BREP bore diameter and conservative shank envelope at shaft-clipped bore endpoint planes, including tilt accumulated from the bearing.','Increase modeled clearance or correct offset/tilt.'),
    measured(names[3],part,overlap,0,overlap>tol,'Axial interval overlap of measured cylindrical bore with catalog shank.','Extend or move the screw so its shank spans this target.'),
  ] };
}
function distanceToFace(point: Vec3, face: Face): number {
  const vertex = makeVertex([...point]);
  try { const result = brepExtremaDistance(getOC(),vertex.wrapped,face.wrapped); if (result === undefined || !Number.isFinite(result)) throw new Error('BREP face probe failed'); return result; }
  finally { vertex.delete(); }
}
function bearingMetric(screw: ScrewFrame, targets: Map<string, OcctBackend>, tol: number, angleTol: number): InstallationMetric {
  const faces = screw.world.getReplicadShape().faces;
  const bearingFaces = faces.filter(f => f.geomType === 'PLANE' && dot(unit(vector(f.normalAt())),screw.axis) > .999999 && Math.abs(dot(sub(vector(f.center),screw.origin),screw.axis)) < .001 && f.clone().innerWires().length > 0);
  if (bearingFaces.length !== 1) return unknown('bearing-gap',null,'A unique trimmed planar annular head bearing was not found in the BREP.');
  const head = bearingFaces[0];
  let best = Infinity;
  for (const shape of targets.values()) for (const face of shape.getReplicadShape().faces) {
    if (face.geomType !== 'PLANE' || dot(unit(vector(face.normalAt())),screw.axis) > -Math.cos(angleTol*Math.PI/180) + 1e-8) continue;
    // Facing planes beyond the bearing, through its head annulus. This excludes
    // walls that touch the shank or head sides and planes behind the head.
    const gap = dot(sub(vector(face.center),screw.origin),screw.axis);
    if (gap < -tol || gap > screw.length+tol) continue;
    const distance = brepExtremaDistance(getOC(),head.wrapped,face.wrapped);
    if (distance === undefined || !Number.isFinite(distance)) throw new Error('Bearing BREP probe failed');
    // Verify facing trimmed material at several radial bearing locations;
    // a single edge/side touch cannot certify an annular bearing support.
    const radial = Math.max(screw.diameter/2+.2, screw.diameter*.65);
    const helper: Vec3 = Math.abs(screw.axis[0])<.9 ? [1,0,0] : [0,1,0];
    const u = unit(sub(helper,scale(screw.axis,dot(helper,screw.axis))));
    const v: Vec3 = [screw.axis[1]*u[2]-screw.axis[2]*u[1],screw.axis[2]*u[0]-screw.axis[0]*u[2],screw.axis[0]*u[1]-screw.axis[1]*u[0]];
    const supported = [u,scale(u,-1),v,scale(v,-1)].every(r => distanceToFace(add(add(screw.origin,scale(screw.axis,gap)),scale(r,radial)),face) <= tol);
    if (supported && [u,scale(u,-1),v,scale(v,-1)].every(r => distanceToFace(add(screw.origin,scale(r,radial)),head)<=tol)) best = Math.min(best,distance);
  }
  if (!Number.isFinite(best)) return unknown('bearing-gap',null,'No facing trimmed bearing annulus support found; side contact is insufficient.');
  return measured('bearing-gap',null,best,tol,best<=tol,'BREP minimum distance between actual trimmed head annulus and facing target material; four radial support probes.','Seat the head on the facing washer/plate bearing surface.');
}
function receiverMetrics(station: FastenerStation, interval: BoreInterval | undefined, screw: ScrewFrame, tol: number): InstallationMetric[] {
  if (!station.engagementPart) return [notApplicable('engagement'),notApplicable('tip-protrusion')];
  if (!interval) return [unknown('engagement',station.engagementPart,'Receiver bore could not be measured.'),unknown('tip-protrusion',station.engagementPart,'Receiver outlet could not be measured.')];
  const engagement = Math.max(0, Math.min(screw.length,interval.max)-Math.max(0,interval.min));
  const protrusion = Math.max(0,screw.length-interval.max);
  return [
    measured('engagement',station.engagementPart,engagement,station.minEngagementMm ?? null,engagement>tol && (station.minEngagementMm===undefined || engagement+tol>=station.minEngagementMm),'Geometric axial overlap with receiver cylindrical bore; no thread-contact/strength certification.','Use a longer screw or reposition the receiver to meet declared engagement.'),
    measured('tip-protrusion',station.engagementPart,protrusion,station.maxProtrusionMm ?? null,station.maxProtrusionMm===undefined || protrusion<=station.maxProtrusionMm+tol,'Catalog tip beyond measured receiver cylindrical outlet along the screw axis.','Use a shorter screw or revise the declared protrusion allowance.'),
  ];
}
function stationReport(model: BuiltModel, scene: SceneBackend | undefined, station: FastenerStation, tol: number, angleTol: number): FastenerStationReport {
  let metrics: InstallationMetric[] = []; let catalogId: string | null = null;
  try {
    const screw = scene && catalogFastenerOf(model,scene,station.part);
    if (!screw) metrics = [unknown('catalog-geometry',station.part,'Missing lowered scene screw, supported head or hash-bound imported catalog interfaces.')];
    else {
      catalogId = screw.catalogId;
      const targets = new Map<string,OcctBackend>(); let receiver: BoreInterval | undefined;
      for (const name of new Set([...station.against,...(station.engagementPart ? [station.engagementPart] : [])])) {
        const part = scene!.parts.find(p => p.name === name);
        if (!part || !(part.shape instanceof OcctBackend)) { metrics.push(unknown('target-geometry',name,'Target is missing from the lowered scene.')); continue; }
        const shape = part.shape.clone().applyTransform(part.worldTransform);
        if (station.against.includes(name)) targets.set(name,shape);
        const result = boreMetrics(name,shape,screw,tol,angleTol);
        metrics.push(...result.metrics);
        if (name === station.engagementPart) receiver = result.interval;
      }
      metrics.push(bearingMetric(screw,targets,tol,angleTol),...receiverMetrics(station,receiver,screw,tol));
    }
  } catch (error) { metrics.push(unknown('geometry-probe',station.part,`Geometry/metadata probe failed: ${error instanceof Error ? error.message : String(error)}`)); }
  const status = metrics.some(m=>m.status==='fail') ? 'fail' : metrics.some(m=>m.status==='unknown') ? 'partial' : 'pass';
  return { part: station.part, against: station.against, engagementPart: station.engagementPart ?? null, catalogId, status, metrics };
}
export function checkFastenerInstallation(model: BuiltModel, options: FastenerInstallationOptions): FastenerInstallationReport {
  validateOptions(options);
  const scene = sceneOf(model,options.assembly);
  const stations = options.fasteners.map(s => stationReport(model,scene,s,options.toleranceMm ?? .05,options.angleToleranceDeg ?? 1));
  const counts = { requested: stations.length, measured: stations.filter(s=>s.metrics.some(m=>m.value!==null)).length, passed: stations.filter(s=>s.status==='pass').length, failed: stations.filter(s=>s.status==='fail').length, unknown: stations.filter(s=>s.metrics.some(m=>m.status==='unknown')).length };
  const status = !stations.length ? 'no-coverage' : counts.failed ? 'fail' : counts.unknown ? 'partial' : 'pass';
  return { ok: status==='pass', source: 'local', assembly: scene?.assemblyName ?? options.assembly ?? null, status, counts, stations,
    limitations: ['Explicit stations only; unlisted fasteners are not audited.','Flat annular-bearing screws and full open cylindrical bores only; unsupported/ambiguous geometry is unknown.','Engagement is modeled axial overlap. Simplified threads cannot certify thread contact, strength, torque, preload or physical installation.','Bearing support is checked at four radial locations on facing trimmed faces; this is not a pressure/contact-area analysis.'] };
}

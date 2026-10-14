// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { BuiltModel } from '../buildModel';
import type { Assembly } from '../capture/assembly';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { inspectCylindricalHoles, type CylindricalHole } from '../../kernel/backends/occt/holeDetection';
import { isSceneBackend, type SceneBackend } from '../../kernel/backends/sceneBackend';
import { Transform } from '../../shared/runtime/se3';
import { isoThreadInfo } from '../threads';
import { loadCatalog } from '../parts/catalog';
import { catalogFastenerOf, measureBoreAlignment, radialEnvelopeExcess, type ScrewFrame } from './fastenerInstallation';
export interface HoleFastenerCoverageOptions {
  assembly?: string;
  holeReasons?: Record<string, string>;
  holeFits?: Record<string, 'clearance' | 'tap'>;
  toleranceMm?: number;
  angleToleranceDeg?: number;
}
export interface HoleCoverageEntry {
  id: string;
  part: string;
  location: readonly [number, number, number];
  diameterMm: number;
  depthMm: number;
  status: 'matched' | 'explained' | 'fail' | 'unknown';
  message: string;
  reason?: string;
  fastener?: { part: string; catalogId: string; size: string; expectedDiameterMm: number; fit: 'clearance' | 'tap' | 'insert' | 'thread' };
}
export interface HoleFastenerCoverageReport {
  ok: boolean;
  source: 'local';
  assembly: string | null;
  status: 'pass' | 'fail' | 'partial' | 'no-coverage';
  counts: { holes: number; matched: number; explained: number; failed: number; unknown: number };
  holes: HoleCoverageEntry[];
  uncertainties: string[];
  limitations: readonly string[];
}
const SUPPORTED_FAMILIES = ['socket-head-cap-screw', 'button-head-cap-screw', 'flat-head-countersunk', 'heat-set-insert'];
interface PlacedFastener { part: string; size: string; insert: boolean; frame: ScrewFrame; clearanceDiameterMm?: number }
interface InventoryHole { entry: HoleCoverageEntry; geometry: CylindricalHole; receiverThread?: string; receiverClearance?: { size: string; diameterMm: number } }

function validateOptions(options: HoleFastenerCoverageOptions): void {
  if (options.assembly !== undefined && (typeof options.assembly !== 'string' || !options.assembly)) throw new Error('assembly must be a nonempty name.');
  for (const key of ['toleranceMm', 'angleToleranceDeg'] as const) {
    const value = options[key];
    if (value !== undefined && (!Number.isFinite(value) || value < 0 || (key === 'angleToleranceDeg' && value > 90))) throw new Error(`${key} tolerance must be finite and nonnegative (angle <= 90).`);
  }
  for (const key of ['holeReasons', 'holeFits'] as const) {
    const map = options[key];
    if (map === undefined) continue;
    if (!map || typeof map !== 'object' || Array.isArray(map)) throw new Error(`${key} must be a selector map.`);
    for (const [id, value] of Object.entries(map)) {
      if (!id || typeof value !== 'string' || !value.trim()) throw new Error(`${key} requires a nonempty selector and written reason/fit.`);
      if (key === 'holeFits' && value !== 'clearance' && value !== 'tap') throw new Error('holeFits must specify clearance or tap.');
    }
  }
}

function inventory(part: string, shape: unknown, placement: Transform, uncertainties: string[]): InventoryHole[] {
  if (!(shape instanceof OcctBackend)) {
    uncertainties.push(`${part}: unsupported geometry; holes could not be inventoried.`);
    return [];
  }
  try {
    // Sort in the part's local frame so selectors survive assembly placement.
    const inspection = inspectCylindricalHoles(shape);
    if (inspection.holeDetection !== 'exact') uncertainties.push(`${part}: heuristic cylindrical-hole detection.`);
    const sorted = [...inspection.holes].sort((a,b) => {
      for (let i = 0; i < 3; i++) if (Math.abs(a.axisOrigin[i]-b.axisOrigin[i]) > 1e-7) return a.axisOrigin[i]-b.axisOrigin[i];
      return a.diameterMm-b.diameterMm || a.depthMm-b.depthMm;
    });
    return sorted.map((hole, index) => {
      const geometry: CylindricalHole = { ...hole, axisOrigin: [...placement.point(hole.axisOrigin)], axisDirection: [...placement.axisDir(hole.axisDirection)] };
      return { geometry, entry: { id: `${part}/hole-${index+1}`, part, location: geometry.axisOrigin, diameterMm: hole.diameterMm, depthMm: hole.depthMm, status: hole.partial ? 'unknown' : 'fail', message: hole.partial ? 'partial bore; coverage unknown' : 'unexplained hole' } };
    });
  } catch (error) {
    uncertainties.push(`${part}: hole inspection failed: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

function placedFasteners(model: BuiltModel, scene: SceneBackend, uncertainties: string[]): PlacedFastener[] {
  const assembly = (model.session.assemblies as Map<string, Assembly>).get(scene.assemblyName);
  const catalog = loadCatalog();
  const out: PlacedFastener[] = [];
  for (const part of scene.parts) {
    const stored = assembly?.__parts().find(p => p.name === part.name);
    const record = stored && model.records.find(r => r.id === stored.originalShape.id);
    const metadata = record?.metadata?.catalogPart;
    if (!metadata || !SUPPORTED_FAMILIES.includes(metadata.family)) continue;
    try {
      const frame = catalogFastenerOf(model, scene, part.name, SUPPORTED_FAMILIES);
      if (!frame) { uncertainties.push(`${part.name}: catalog placement/shaft could not be verified.`); continue; }
      const size = String(metadata.attributes.thread);
      // Validate the existing catalog designation through the modeling thread table.
      isoThreadInfo(size);
      const clearance = Number(metadata.attributes.clearanceDiameterMm ?? catalog.records.find(r => r.family === 'flat-washer' && r.attributes.thread === size)?.attributes.innerDiameterMm);
      out.push({ part: part.name, size, insert: metadata.family === 'heat-set-insert', frame, clearanceDiameterMm: Number.isFinite(clearance) && clearance > 0 ? clearance : undefined });
    } catch (error) {
      uncertainties.push(`${part.name}: catalog matching failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return out;
}

function candidateFit(hole: InventoryHole, fastener: PlacedFastener, options: HoleFastenerCoverageOptions): { report?: HoleCoverageEntry['fastener']; fits?: boolean } {
  // Catalog receiver thread intent takes precedence over caller pilot declarations.
  const fit = fastener.insert ? 'insert' : hole.receiverThread ? 'thread' : hole.receiverClearance ? 'clearance' : options.holeFits?.[hole.entry.id] ?? 'clearance';
  const expected = fit === 'insert' ? fastener.frame.diameter : fit === 'tap' ? isoThreadInfo(fastener.size).tapDrill : fit === 'thread' ? isoThreadInfo(fastener.size).diameter : hole.receiverClearance?.diameterMm ?? fastener.clearanceDiameterMm;
  if (expected === undefined) return {};
  const tolerance = options.toleranceMm ?? .05;
  const receiverMatches = (!hole.receiverThread || (!fastener.insert && hole.receiverThread === fastener.size)) && (!hole.receiverClearance || (!fastener.insert && hole.receiverClearance.size === fastener.size));
  // Tap pilots are declared manufacturing intent: no real thread-contact claim.
  const fits = receiverMatches && Math.abs(hole.entry.diameterMm-expected) <= tolerance && (fit === 'tap' || radialEnvelopeExcess(hole.geometry,fastener.frame) <= (hole.entry.diameterMm-fastener.frame.diameter)/2+tolerance);
  return { report: { part: fastener.part, catalogId: fastener.frame.catalogId, size: fastener.size, expectedDiameterMm: expected, fit }, fits };
}

function cover(hole: InventoryHole, fasteners: PlacedFastener[], options: HoleFastenerCoverageOptions): void {
  const { entry, geometry } = hole;
  if (entry.status === 'unknown') return;
  const tolerance = options.toleranceMm ?? .05;
  const angleTolerance = options.angleToleranceDeg ?? 1;
  const candidates = fasteners.filter(f => {
    if (f.part === entry.part) return false;
    const alignment = measureBoreAlignment(geometry, f.frame);
    return alignment.offset <= tolerance && alignment.tilt <= angleTolerance && alignment.overlap > tolerance;
  }).map(f => ({ ...candidateFit(hole,f,options), fastener: f }));
  if (candidates.length) {
    const compatible = candidates.filter(c => c.fits === true);
    if (candidates.some(c => c.fits === undefined) || compatible.length > 1) {
      entry.status = 'unknown'; entry.message = compatible.length > 1 ? 'ambiguous fastener match' : 'catalog clearance diameter unavailable'; return;
    }
    const incompatible = candidates.filter(c => c.fits === false && !(
      compatible.length === 1 && compatible[0].report?.fit === 'insert' && !c.fastener.insert &&
      radialEnvelopeExcess(geometry,c.fastener.frame) <= (entry.diameterMm-c.fastener.frame.diameter)/2+tolerance
    ));
    if (incompatible.length) {
      entry.fastener = incompatible[0].report;
      entry.status = 'fail'; entry.message = 'fastener size does not fit hole'; return;
    }
    // A screw through an insert shares its axis with the insert. The outer
    // plate bore must match the insert, and the insert's inner bore the screw.
    const selected = compatible[0] ?? (candidates.length === 1 ? candidates[0] : undefined);
    entry.fastener = selected?.report;
    entry.status = compatible.length === 1 ? 'matched' : 'fail';
    entry.message = entry.status === 'matched' ? 'matched catalog fastener' : 'fastener size does not fit hole';
    return;
  }
  const reason = options.holeReasons?.[entry.id];
  if (reason !== undefined) { entry.status = 'explained'; entry.reason = reason.trim(); entry.message = 'written reason'; }
}

/** Exhaustive over the returned model's detected cylindrical bores, including
 * hardware bores. A named assembly explicitly scopes the inventory. */
export function checkHoleFastenerCoverage(model: BuiltModel, options: HoleFastenerCoverageOptions = {}): HoleFastenerCoverageReport {
  validateOptions(options);
  let scene: SceneBackend | undefined;
  if (options.assembly !== undefined) {
    scene = [...model.shapes.values()].find(s => isSceneBackend(s) && s.assemblyName === options.assembly) as SceneBackend | undefined;
    if (!scene) throw new Error(`assembly '${options.assembly}' not found.`);
  } else if (isSceneBackend(model.rootShape)) scene = model.rootShape;
  const uncertainties: string[] = [];
  const holes = scene
    ? scene.parts.flatMap(p => inventory(p.name,p.shape,p.worldTransform,uncertainties))
    : inventory('(root)',model.rootShape,Transform.identity(),uncertainties);
  if (scene) {
    const assembly = (model.session.assemblies as Map<string, Assembly>).get(scene.assemblyName);
    for (const hole of holes) {
      const stored = assembly?.__parts().find(p => p.name === hole.entry.part);
      const record = stored && model.records.find(r => r.id === stored.originalShape.id);
      const metadata = record?.kind === 'importedStep' ? record.metadata?.catalogPart : undefined;
      if (metadata && ['hex-nut','lock-nut','heat-set-insert'].includes(metadata.family)) hole.receiverThread = String(metadata.attributes.thread);
      if (metadata && ['flat-washer','lock-washer'].includes(metadata.family)) {
        const diameterMm = Number(metadata.attributes.innerDiameterMm);
        if (Number.isFinite(diameterMm) && diameterMm > 0) hole.receiverClearance = { size: String(metadata.attributes.thread), diameterMm };
      }
    }
  }
  const ids = new Set(holes.map(h => h.entry.id));
  for (const map of [options.holeReasons, options.holeFits]) for (const id of Object.keys(map ?? {})) {
    if (!ids.has(id)) throw new Error(`Unknown hole selector '${id}'; use ids from the current coverage report.`);
  }
  const fasteners = scene ? placedFasteners(model,scene,uncertainties) : [];
  try { holes.forEach(h => cover(h,fasteners,options)); }
  finally { fasteners.forEach(f => f.frame.world.dispose()); }
  const entries = holes.map(h => h.entry);
  const counts = { holes: entries.length, matched: entries.filter(h => h.status === 'matched').length, explained: entries.filter(h => h.status === 'explained').length, failed: entries.filter(h => h.status === 'fail').length, unknown: entries.filter(h => h.status === 'unknown').length };
  const status = counts.failed ? 'fail' : uncertainties.length || counts.unknown ? 'partial' : !counts.holes ? 'no-coverage' : 'pass';
  return { ok: status === 'pass', source: 'local', assembly: scene?.assemblyName ?? null, status, counts, holes: entries, uncertainties,
    limitations: ['Cylindrical BREP bores only; noncylindrical openings are outside detection coverage. Heuristic/unsupported geometry cannot pass.', 'Selectors are local-coordinate-sorted part/hole-N ids, stable under rigid placement only; rerun after geometry edits.', 'Clearance uses catalog clearanceDiameterMm or the matching catalog flat-washer bore; tap pilots use the catalog thread designation and existing ISO thread table.', 'Insert fit uses catalog outer diameter; no manufacturer heat-setting pilot allowance is inferred.', 'Local modeled coverage only: no thread-contact, seating, torque, strength or hardware acceptance certification. Use fastener-installation for seating/engagement.'] };
}

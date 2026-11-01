// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd/caseSpec.ts
//
// From the fluid domain and the study to a FoamCaseSpec: cell sizes, the
// background box, the snappyHexMesh keep-point, boundary roles, Reynolds
// number and turbulence model. Pure apart from the geometry it is handed.

import type { CfdAxisDirection, CfdStudyMetadata } from '../../shared/intent/cfdStudyRecord';
import type { FluidDomain } from './fluidDomain';
import { mergeSoups, patchStats, pointInside, projectedArea, vertexClearance, type TriSoup } from './meshGeom';
import { chooseTurbulence, turbulenceInlet, type RegimeChoice } from './regime';
import type { FoamCaseSpec, FoamPatch, Vec3 } from './types';

const MM = 1e-3;
/** Background cells budget; above it the surface refinement level rises. */
export const CFD_BACKGROUND_CELL_BUDGET = 250_000;
/** Cells across the characteristic length at the surface, per preset. */
const CELLS_ACROSS = { coarse: 8, medium: 14, fine: 22 } as const;

export interface CaseDerived {
  spec: FoamCaseSpec;
  regime: RegimeChoice;
  reynolds: { value: number; lengthMm: number; speed: number; basis: string };
  surfaceCellMm: number;
  backgroundCellMm: number;
  /** External flow: drag reference area and axes. */
  referenceAreaMm2?: number;
  dragAxis?: Vec3;
  liftAxis?: Vec3;
  /** Internal flow: inlet area and the mean inlet speed. */
  inletAreaMm2?: number;
  meanInletSpeed?: number;
}

export function axisOf(dir: CfdAxisDirection): { axis: 0 | 1 | 2; sign: 1 | -1 } {
  return { axis: (['X', 'Y', 'Z'].indexOf(dir[1]) as 0 | 1 | 2), sign: dir[0] === '-' ? -1 : 1 };
}

const unit = (axis: number, sign = 1): Vec3 => [0, 1, 2].map(k => (k === axis ? sign : 0)) as Vec3;

function surfaceCell(meta: CfdStudyMetadata, lengthMm: number): number {
  return typeof meta.meshSize === 'number' ? meta.meshSize : lengthMm / CELLS_ACROSS[meta.meshSize];
}

/** A point inside the fluid with at least ~1.5 surface cells of clearance. */
function keepPointInternal(domain: FluidDomain, h: number): Vec3 | undefined {
  const all = mergeSoups(domain.patches.map(p => p.soup));
  const inlet = domain.patches.find(p => p.role === 'inlet');
  const cands: Vec3[] = [];
  if (inlet !== undefined) {
    const s = patchStats(inlet.soup);
    for (const d of [1.7 * h, -1.7 * h, 3.3 * h, -3.3 * h]) cands.push([0, 1, 2].map(k => s.centroid[k] + d * s.normal[k]) as Vec3);
  }
  const { min, max } = domain.bounds;
  for (let i = 1; i < 8; i++) for (let j = 1; j < 8; j++) for (let k = 1; k < 8; k++) {
    cands.push([min[0] + ((max[0] - min[0]) * i) / 8, min[1] + ((max[1] - min[1]) * j) / 8, min[2] + ((max[2] - min[2]) * k) / 8]);
  }
  // Nudge off any grid plane so the point never sits on a cell face.
  const jitter = (p: Vec3): Vec3 => [p[0] + 0.0137 * h, p[1] + 0.0191 * h, p[2] + 0.0113 * h];
  return cands.map(jitter).find(p => pointInside(all, p) && vertexClearance(all, p) > 0.6 * h);
}

function patch(name: string, role: FoamPatch['role']): FoamPatch {
  return { name, role };
}

type Six<T> = [T, T, T, T, T, T];

function internalSpec(domain: FluidDomain, meta: CfdStudyMetadata): CaseDerived | string {
  const inlet = domain.patches.find(p => p.role === 'inlet') as { soup: TriSoup };
  const aIn = patchStats(inlet.soup).area;
  const dEq = 2 * Math.sqrt(aIn / Math.PI);
  const h = surfaceCell(meta, dEq);
  const qM3s = meta.flowRateLpm !== undefined ? meta.flowRateLpm / 60_000 : undefined;
  const speed = qM3s !== undefined ? qM3s / (aIn * MM * MM) : (meta.velocity as number);
  const re = (speed * dEq * MM) / meta.fluid.nu;
  const regime = chooseTurbulence('internal', re, meta.turbulence);
  const { min, max } = domain.bounds;
  const vol = (max[0] - min[0]) * (max[1] - min[1]) * (max[2] - min[2]);
  let level = 0;
  while (level < 3 && vol / (h * 2 ** level) ** 3 > CFD_BACKGROUND_CELL_BUDGET) level++;
  const H = h * 2 ** level;
  const keep = keepPointInternal(domain, h);
  if (keep === undefined) return 'could not find a point inside the fluid volume with clearance from its walls; the channel may be thinner than about two cells (lower meshSize).';
  const pad = 2.37 * H;
  const bmin = min.map(v => v - pad) as Vec3;
  const bmax = max.map(v => v + pad) as Vec3;
  const cells = [0, 1, 2].map(k => Math.max(1, Math.round((bmax[k] - bmin[k]) / H))) as [number, number, number];
  const ext = [0, 1, 2].map(k => max[k] - min[k]);
  const thin = ext.indexOf(Math.min(...ext));
  const normal = unit(ext[2] <= ext[thin] + 1e-9 ? 2 : thin);
  const centre = [0, 1, 2].map(k => (min[k] + max[k]) / 2 + 0.0071 * h) as Vec3;
  const bg = patch('background', 'background');
  const spec: FoamCaseSpec = {
    flow: 'internal',
    block: { min: bmin.map(v => v * MM) as Vec3, max: bmax.map(v => v * MM) as Vec3, cells },
    blockPatches: [bg, bg, bg, bg, bg, bg] as Six<FoamPatch>,
    stlPatches: domain.patches.map(p => patch(p.name, p.role)),
    locationInMesh: keep.map(v => v * MM) as Vec3,
    surfaceLevel: level,
    fluid: { rho: meta.fluid.rho, nu: meta.fluid.nu },
    turbulence: regime.model,
    inlet: qM3s !== undefined ? { kind: 'flowRate', m3s: qM3s } : { kind: 'normalSpeed', speed },
    outletKinematicP: meta.outletPressurePa / meta.fluid.rho,
    turbulenceInlet: turbulenceInlet(speed, 0.05, dEq * MM),
    iterations: meta.iterations,
    residualTarget: meta.residualTarget,
    cores: 1,
    plane: { point: centre.map(v => v * MM) as Vec3, normal },
  };
  return {
    spec, regime, surfaceCellMm: h, backgroundCellMm: H, inletAreaMm2: aIn, meanInletSpeed: speed,
    reynolds: { value: re, lengthMm: dEq, speed, basis: 'mean inlet speed x equivalent inlet diameter' },
  };
}

function externalSpec(domain: FluidDomain, meta: CfdStudyMetadata): CaseDerived {
  const body = mergeSoups(domain.patches.map(p => p.soup));
  const { axis, sign } = axisOf(meta.direction);
  const aFront = meta.referenceAreaMm2 ?? projectedArea(body, axis);
  const dEq = 2 * Math.sqrt(aFront / Math.PI);
  const h = surfaceCell(meta, dEq);
  const speed = meta.velocity as number;
  const re = (speed * dEq * MM) / meta.fluid.nu;
  const regime = chooseTurbulence('external', re, meta.turbulence);
  const { min, max } = domain.bounds;
  const lb = Math.max(...[0, 1, 2].map(k => max[k] - min[k]));
  const level = 3;
  const H = h * 2 ** level;
  const bmin: Vec3 = [0, 1, 2].map(k => min[k] - 3 * lb) as Vec3;
  const bmax: Vec3 = [0, 1, 2].map(k => max[k] + 3 * lb) as Vec3;
  if (sign > 0) bmax[axis] = max[axis] + 8 * lb; else bmin[axis] = min[axis] - 8 * lb;
  const cells = [0, 1, 2].map(k => Math.max(2, Math.round((bmax[k] - bmin[k]) / H))) as [number, number, number];
  const rmin: Vec3 = [0, 1, 2].map(k => min[k] - 0.6 * lb) as Vec3;
  const rmax: Vec3 = [0, 1, 2].map(k => max[k] + 0.6 * lb) as Vec3;
  if (sign > 0) rmax[axis] = max[axis] + 3 * lb; else rmin[axis] = min[axis] - 3 * lb;
  const names: Six<FoamPatch> = [0, 1, 2, 3, 4, 5].map(i => {
    const k = Math.floor(i / 2);
    if (k !== axis) return patch('sides', 'slip');
    const upstream = (i % 2 === 0) === (sign > 0);
    return upstream ? patch('inlet', 'inlet') : patch('outlet', 'outlet');
  }) as Six<FoamPatch>;
  const keep: Vec3 = [0, 1, 2].map(k => (k === axis ? (sign > 0 ? (bmin[k] + min[k]) / 2 : (bmax[k] + max[k]) / 2) : (min[k] + max[k]) / 2 + 0.31 * H)) as Vec3;
  const liftAxisIdx = axis === 2 ? 1 : 2;
  const centre = [0, 1, 2].map(k => (min[k] + max[k]) / 2) as Vec3;
  const spec: FoamCaseSpec = {
    flow: 'external',
    block: { min: bmin.map(v => v * MM) as Vec3, max: bmax.map(v => v * MM) as Vec3, cells },
    blockPatches: names,
    stlPatches: [patch('body', 'wall')],
    locationInMesh: keep.map(v => v * MM) as Vec3,
    surfaceLevel: level,
    refineBox: { min: rmin.map(v => v * MM) as Vec3, max: rmax.map(v => v * MM) as Vec3, level: 2 },
    fluid: { rho: meta.fluid.rho, nu: meta.fluid.nu },
    turbulence: regime.model,
    inlet: { kind: 'freestream', U: unit(axis, sign).map(v => v * speed) as Vec3 },
    outletKinematicP: meta.outletPressurePa / meta.fluid.rho,
    turbulenceInlet: turbulenceInlet(speed, 0.01, dEq * MM),
    iterations: meta.iterations,
    residualTarget: meta.residualTarget,
    cores: 1,
    forces: { patch: 'body', rhoInf: meta.fluid.rho, CofR: centre.map(v => v * MM) as Vec3 },
    plane: { point: centre.map(v => (v + 0.0071 * h) * MM) as Vec3, normal: unit(3 - axis - liftAxisIdx) },
  };
  return {
    spec, regime, surfaceCellMm: h, backgroundCellMm: H, referenceAreaMm2: aFront,
    dragAxis: unit(axis, sign), liftAxis: unit(liftAxisIdx),
    reynolds: { value: re, lengthMm: dEq, speed, basis: 'free-stream speed x equivalent frontal diameter' },
  };
}

/** The case spec, or the reason it cannot be built. */
export function deriveCaseSpec(domain: FluidDomain, meta: CfdStudyMetadata, cores: number): CaseDerived | string {
  const d = meta.flow === 'internal' ? internalSpec(domain, meta) : externalSpec(domain, meta);
  if (typeof d === 'string') return d;
  return { ...d, spec: { ...d.spec, cores } };
}

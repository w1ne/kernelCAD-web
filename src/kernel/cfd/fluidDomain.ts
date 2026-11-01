// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd/fluidDomain.ts
//
// The fluid volume and its named patches, from the model.
//
//   internal / 'solid'    : the solid IS the fluid.
//   internal / 'interior' : the fluid fills the part's channels. It is the
//     bounding box minus the part, keeping the solid components that are not
//     the exterior shell (the exterior component spans the full box on every
//     axis; a channel that opens onto the box faces does not). Channels must
//     therefore open flush onto the part's bounding box, which is the normal
//     shape of a pipe, duct or manifold port.
//   external              : the solid is the body; every face is the 'body' wall.
//
// Inlet / outlet selectors are resolved on the FLUID volume with the same
// resolver the structural study uses, then each face index becomes a member
// of one STL region, so the solver's patches carry the model's face names.

import { OcctBackend } from '../backends/occt/occtBackend';
import { triangulateFaces } from '../backends/occt/faceTriangles';
import { describeAllFaces, resolveSelector, type FaceDescriptor } from '../fea/faceBinding';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { CfdFaceSelector, CfdStudyMetadata } from '../../shared/intent/cfdStudyRecord';
import { mergeSoups, type TriSoup } from './meshGeom';
import type { Vec3 } from './types';

export interface FluidPatchSoup {
  name: string;
  role: 'inlet' | 'outlet' | 'wall';
  soup: TriSoup;
  /** Face refs that make up the patch (on the fluid volume). */
  refs: string[];
}

export interface FluidDomain {
  fluid: OcctBackend;
  patches: FluidPatchSoup[];
  bounds: { min: Vec3; max: Vec3 };
  /** Fluid components dropped/kept by the interior extraction. */
  note: string;
}

export type DomainResult =
  | { ok: true; domain: FluidDomain }
  | { ok: false; code: 'cfd.domain.no-fluid' | 'cfd.study.patch-unresolved'; message: string };

const span = (b: { min: Vec3; max: Vec3 }, k: number): number => b.max[k] - b.min[k];

function boxOf(b: { min: Vec3; max: Vec3 }): OcctBackend {
  return OcctBackend.box(span(b, 0), span(b, 1), span(b, 2)).translate(b.min[0], b.min[1], b.min[2]);
}

/**
 * A box that encloses the part with its planar extremes EXACT: a channel end
 * flush with the box must stay flush, or the channel would leak into the
 * exterior through a sliver. The tessellated box is exact on planar faces and
 * slightly inside on curved ones; OCCT's Bnd_Box is outside on curved ones.
 * Per side: where both agree it is a planar face, else take the enclosing one.
 */
function enclosingBox(part: OcctBackend): { min: Vec3; max: Vec3 } {
  const mesh = part.boundingBox({ exact: true });
  const bnd = part.boundingBox();
  const pick = (m: number, b: number, outward: (a: number, c: number) => number): number =>
    Math.abs(m - b) < 1e-6 ? m : outward(m, b);
  return {
    min: [0, 1, 2].map(k => pick(mesh.min[k], bnd.min[k], Math.min)) as Vec3,
    max: [0, 1, 2].map(k => pick(mesh.max[k], bnd.max[k], Math.max)) as Vec3,
  };
}

/** Does `c`'s box contain any corner of `b` (within tol)? The exterior
 *  pieces of (box - part) always reach a corner; an enclosed channel does not. */
function reachesCorner(c: { min: Vec3; max: Vec3 }, b: { min: Vec3; max: Vec3 }, tol: number): boolean {
  for (let m = 0; m < 8; m++) {
    const corner = [0, 1, 2].map(k => ((m >> k) & 1 ? b.max[k] : b.min[k]));
    if (corner.every((v, k) => v >= c.min[k] - tol && v <= c.max[k] + tol)) return true;
  }
  return false;
}

/** Components of (bbox - part) that are not the exterior shell. */
function interiorFluid(part: OcctBackend, meta: CfdStudyMetadata): { ok: true; fluid: OcctBackend; note: string } | { ok: false; message: string } {
  const b = enclosingBox(part);
  const diag = Math.hypot(span(b, 0), span(b, 1), span(b, 2));
  const tol = Math.max(1e-3, diag * 1e-4);
  const rest = boxOf(b).subtract(part);
  const comps = rest.solidComponents();
  const channels = comps.filter(c => !reachesCorner(c.boundingBox({ exact: true }), b, tol));
  if (channels.length === 0) {
    return {
      ok: false,
      message:
        `no internal channel found: the bounding box minus the part left ${comps.length} region(s), all of them the exterior. ` +
        "Interior flow needs channels that open flush onto the part's bounding box (pipe ends, manifold ports).",
    };
  }
  // Keep only the channels an inlet or outlet opens into: a through bolt
  // hole is also an enclosed void, but no fluid reaches it.
  const selectors = [meta.inlet, ...(meta.outlets ?? [])].filter((x): x is CfdFaceSelector => x !== undefined);
  const wetted = channels.filter(c => selectors.some(sel => resolveSelector(c, sel, { owner: 'fluid' }).ok));
  const kept = wetted.length > 0 ? wetted : channels;
  const fluid = kept.slice(1).reduce((acc, c) => acc.union(c), kept[0]);
  return {
    ok: true,
    fluid,
    note: `interior extraction kept ${kept.length} wetted channel region(s); ${channels.length - kept.length} unconnected void(s) and ${comps.length - channels.length} exterior region(s) dropped`,
  };
}

function faceIndices(all: readonly FaceDescriptor[], picked: readonly FaceDescriptor[], scale: number): number[] {
  const tol = Math.max(1e-3, scale * 1e-5);
  const out: number[] = [];
  for (const p of picked) {
    const i = all.findIndex(f =>
      Math.hypot(f.centroid[0] - p.centroid[0], f.centroid[1] - p.centroid[1], f.centroid[2] - p.centroid[2]) <= tol &&
      Math.abs(f.area - p.area) <= Math.max(1e-6, 1e-4 * p.area));
    if (i >= 0 && !out.includes(i)) out.push(i);
  }
  return out;
}

interface PatchRequest { name: string; role: 'inlet' | 'outlet'; selector: CfdFaceSelector }

function patchRequests(meta: CfdStudyMetadata): PatchRequest[] {
  if (meta.flow === 'external') return [];
  const outs = meta.outlets ?? [];
  return [
    { name: 'inlet', role: 'inlet', selector: meta.inlet as CfdFaceSelector },
    ...outs.map((selector, i) => ({ name: outs.length > 1 ? `outlet_${i + 1}` : 'outlet', role: 'outlet' as const, selector })),
  ];
}

function assignPatches(
  fluid: OcctBackend,
  meta: CfdStudyMetadata,
  ctx: { owner: string; records?: readonly FeatureRecord[] },
  tolerance: number,
): { ok: true; patches: FluidPatchSoup[] } | { ok: false; message: string } {
  const all = describeAllFaces(fluid, ctx.owner);
  const b = fluid.boundingBox({ exact: true });
  const scale = Math.hypot(span(b, 0), span(b, 1), span(b, 2));
  const owner = new Map<number, string>();
  const reqs = patchRequests(meta);
  for (const req of reqs) {
    const r = resolveSelector(fluid, req.selector, ctx);
    const idx = r.ok ? faceIndices(all, r.faces, scale) : [];
    if (idx.length === 0) {
      const faces = all.map(f => `${f.ref} centre [${f.centroid.map(v => v.toFixed(2)).join(', ')}] area ${f.area.toFixed(1)} mm^2`).slice(0, 24);
      return { ok: false, message: `${req.name} selector ${JSON.stringify(req.selector)} matched no face of the fluid volume${r.error !== undefined ? ` (${r.error})` : ''}. Fluid faces: ${faces.join('; ')}.` };
    }
    for (const i of idx) {
      const prev = owner.get(i);
      if (prev !== undefined) return { ok: false, message: `face ${all[i].ref} is claimed by both ${prev} and ${req.name}.` };
      owner.set(i, req.name);
    }
  }
  const tri = triangulateFaces(fluid, tolerance);
  const wallName = meta.flow === 'external' ? 'body' : 'walls';
  const groups = new Map<string, { role: FluidPatchSoup['role']; soups: TriSoup[]; refs: string[] }>();
  for (const req of reqs) groups.set(req.name, { role: req.role, soups: [], refs: [] });
  groups.set(wallName, { role: 'wall', soups: [], refs: [] });
  for (const f of tri) {
    const g = groups.get(owner.get(f.index) ?? wallName);
    g?.soups.push({ vertices: f.vertices, triangles: f.triangles });
    g?.refs.push(all[f.index]?.ref ?? `f${f.index}`);
  }
  const patches = [...groups.entries()]
    .filter(([, g]) => g.soups.length > 0)
    .map(([name, g]) => ({ name, role: g.role, soup: mergeSoups(g.soups), refs: g.refs }));
  return { ok: true, patches };
}

/** Build the fluid volume and its patch soups. `tolerance` is the STL
 *  chordal deviation, mm. */
export function buildFluidDomain(
  part: OcctBackend,
  meta: CfdStudyMetadata,
  ctx: { owner: string; records?: readonly FeatureRecord[] },
  tolerance: number,
): DomainResult {
  let fluid = part;
  let note = meta.flow === 'external' ? 'external flow around the solid' : 'the solid is the fluid volume';
  let patchCtx = ctx;
  if (meta.flow === 'internal' && meta.fluidVolume !== 'solid') {
    const ex = interiorFluid(part, meta);
    if (!ex.ok) return { ok: false, code: 'cfd.domain.no-fluid', message: ex.message };
    fluid = ex.fluid;
    note = ex.note;
    patchCtx = { owner: 'fluid' };
  }
  const assigned = assignPatches(fluid, meta, patchCtx, tolerance);
  if (!assigned.ok) return { ok: false, code: 'cfd.study.patch-unresolved', message: assigned.message };
  return { ok: true, domain: { fluid, patches: assigned.patches, bounds: fluid.boundingBox({ exact: true }), note } };
}

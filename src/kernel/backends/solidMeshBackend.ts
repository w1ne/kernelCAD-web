// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/solidMeshBackend.ts
//
// A MANUFACTURABLE mesh body: a closed, edge-manifold, consistently
// outward-wound triangle mesh (lattice infill is the producer). Unlike the
// display-only MeshBackend it is a real solid for everything a mesh can
// answer exactly — volume, area, mass properties, bounding box, STL / 3MF /
// OBJ export — while still refusing what needs B-rep topology (booleans,
// fillets, face refs, STEP). It inherits the display paths (viewer, render,
// rigid assembly placement) from MeshBackend.

import { MeshBackend } from './meshBackend';
import type { ShapeBackend } from './backend';
import type { Vec3 } from '../../shared/intent/types';
import type { GyrationAxis, MassProperties } from '../properties/massProperties';
import { meshMassProperties } from '../properties/meshMassProperties';
import { meshMass } from '../lattice/meshMetrics';

export class SolidMeshBackend extends MeshBackend {
  /** Producer facts (e.g. the lattice report), carried through transforms. */
  readonly facts: Readonly<Record<string, unknown>>;

  constructor(positions: Float32Array, indices: Uint32Array, facts: Readonly<Record<string, unknown>> = {}) {
    super(positions, indices);
    this.facts = facts;
  }

  protected override withPositions(p: Float32Array): SolidMeshBackend {
    return new SolidMeshBackend(p, this.indices, this.facts);
  }

  override clone(): SolidMeshBackend { return this.withPositions(this.positions); }

  override scale(s: number | Vec3): SolidMeshBackend {
    const v = typeof s === 'number' ? [s, s, s] : s;
    const p = this.positions.slice();
    for (let i = 0; i < p.length; i += 3) { p[i] *= v[0]; p[i + 1] *= v[1]; p[i + 2] *= v[2]; }
    // A mirror (odd number of negative factors) turns the winding inside out.
    if (v[0] * v[1] * v[2] >= 0) return new SolidMeshBackend(p, this.indices, this.facts);
    const idx = this.indices.slice();
    for (let t = 0; t < idx.length; t += 3) { const a = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = a; }
    return new SolidMeshBackend(p, idx, this.facts);
  }

  override volume(): number { return meshMass(this.positions, this.indices).volumeMm3; }
  override surfaceArea(): number { return meshMass(this.positions, this.indices).areaMm2; }
  override massProperties(density?: number, gyrationAxis?: GyrationAxis): MassProperties {
    return meshMassProperties(this.positions, this.indices, density, gyrationAxis);
  }
  override solidComponents(): readonly ShapeBackend[] { return [this]; }
  /** Binary STL (little-endian, 50 bytes per facet). */
  override exportSTL(): Uint8Array { return binaryStlBytes(this.positions, this.indices); }
}

export function isSolidMeshBackend(shape: unknown): shape is SolidMeshBackend {
  return shape instanceof SolidMeshBackend;
}

export function binaryStlBytes(P: Float32Array, I: Uint32Array, header = 'kernelCAD mesh solid'): Uint8Array {
  const n = I.length / 3;
  const out = new Uint8Array(84 + 50 * n);
  const view = new DataView(out.buffer);
  for (let i = 0; i < Math.min(header.length, 80); i++) out[i] = header.charCodeAt(i) & 0x7f;
  view.setUint32(80, n, true);
  let o = 84;
  for (let t = 0; t < I.length; t += 3) {
    const a = 3 * I[t], b = 3 * I[t + 1], c = 3 * I[t + 2];
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    view.setFloat32(o, nx, true); view.setFloat32(o + 4, ny, true); view.setFloat32(o + 8, nz, true);
    o += 12;
    for (const q of [a, b, c]) {
      view.setFloat32(o, P[q], true); view.setFloat32(o + 4, P[q + 1], true); view.setFloat32(o + 8, P[q + 2], true);
      o += 12;
    }
    o += 2;
  }
  return out;
}

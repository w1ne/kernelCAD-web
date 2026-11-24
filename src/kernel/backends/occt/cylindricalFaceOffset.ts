// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Read the analytic frame of a cylindrical face for offsetFaces. A full
// 360 degree face is offset by changing its radius; the sleeve and boolean
// stay in faceEdit.ts. Kept separate so faceEdit.ts stays below the quality
// ratchet's file-size limit.
import { getOC } from 'replicad';
import type { Face } from 'replicad';

type Vec3 = [number, number, number];

export interface CylinderAxis {
  origin: Vec3;
  dir: Vec3;
  radius: number;
}

export interface CylinderFace extends CylinderAxis {
  /** Axis point at the face's low V bound. */
  base: Vec3;
  /** Axial length of the face, mm. */
  height: number;
  /** Angular coverage, radians. */
  arc: number;
  /** A point on the surface at the middle of the face. */
  point: Vec3;
  /** Surface normal at `point`; its sign follows the face orientation. */
  normal: Vec3;
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function unit(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]);
  if (!(length > 0)) return [0, 0, 0];
  return [v[0] / length, v[1] / length, v[2] / length];
}

export function readCylinderAxis(face: Face): CylinderAxis | undefined {
  if (face.geomType !== 'CYLINDRE') return undefined;
  const oc = getOC();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adaptor = new (oc as any).BRepAdaptor_Surface_2((face as any).wrapped, true);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cylinder = (adaptor as any).Cylinder();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axis = (cylinder as any).Position();
      const location = axis.Location();
      const direction = axis.Direction();
      return {
        origin: [location.X(), location.Y(), location.Z()],
        dir: [direction.X(), direction.Y(), direction.Z()],
        radius: cylinder.Radius() as number,
      };
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cylinder as any).delete?.();
    }
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adaptor as any).delete?.();
  }
}

export function readCylinderFace(face: Face): CylinderFace | undefined {
  const axis = readCylinderAxis(face);
  if (!axis) return undefined;
  const bounds = (face as unknown as {
    UVBounds: { uMin: number; uMax: number; vMin: number; vMax: number };
    pointOnSurface: (u: number, v: number) => { x: number; y: number; z: number };
    normalAt: (point: Vec3) => { x: number; y: number; z: number };
  }).UVBounds;
  // replicad's pointOnSurface takes normalized [0, 1] parameters.
  const p = (face as unknown as { pointOnSurface: (u: number, v: number) => { x: number; y: number; z: number } })
    .pointOnSurface(0.5, 0.5);
  const point: Vec3 = [p.x, p.y, p.z];
  const n = (face as unknown as { normalAt: (point: Vec3) => { x: number; y: number; z: number } })
    .normalAt(point);
  const under = (face as unknown as { normalAt: (point?: Vec3) => { x: number; y: number; z: number } })
    .normalAt();
  const useUnder = Math.hypot(n.x, n.y, n.z) < 1e-9 && Math.hypot(under.x, under.y, under.z) > 0;
  const normal: Vec3 = useUnder ? [under.x, under.y, under.z] : [n.x, n.y, n.z];
  return {
    ...axis,
    base: [
      axis.origin[0] + axis.dir[0] * bounds.vMin,
      axis.origin[1] + axis.dir[1] * bounds.vMin,
      axis.origin[2] + axis.dir[2] * bounds.vMin,
    ],
    height: bounds.vMax - bounds.vMin,
    arc: bounds.uMax - bounds.uMin,
    point,
    normal,
  };
}

export function axesCoincident(a: CylinderAxis, b: CylinderAxis): boolean {
  const parallel = Math.abs(dot(unit(a.dir), unit(b.dir)));
  if (parallel < 1 - 1e-6) return false;
  const rel = sub(b.origin, a.origin);
  const along = dot(rel, unit(a.dir));
  const off = Math.hypot(
    rel[0] - unit(a.dir)[0] * along,
    rel[1] - unit(a.dir)[1] * along,
    rel[2] - unit(a.dir)[2] * along,
  );
  return off < 1e-4;
}

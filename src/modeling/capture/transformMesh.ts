// src/modeling/capture/transformMesh.ts
//
// Apply an SE(3) Transform to a FeatureMesh's geometry.
// - Vertices use Transform.point() (translation + rotation).
// - Normals use Transform.axisDir() (rotation only) and are renormalized.
// - Edges (if present) use Transform.point() (positions).
// - plane.origin uses point(); plane.normal/xDir/yDir use axisDir().
// - cylinder.origin uses point(); cylinder.axis uses axisDir() (renormalized);
//   cylinder.radius is invariant under rigid SE(3).
//
// Returns a new FeatureMesh; does not mutate input.
//
// The meshing layer will adopt this to FK-transform per-part meshes when a
// SceneBackend is encountered.

import type { FeatureMesh } from './featureMeshing';
import type { Transform } from '../../shared/runtime/se3';

export function transformFeatureMesh(mesh: FeatureMesh, t: Transform): FeatureMesh {
  const transformedFaces = mesh.faces.map((f) => {
    const v = f.vertices;
    const newV = new Float32Array(v.length);
    for (let i = 0; i < v.length; i += 3) {
      const p = t.point([v[i], v[i + 1], v[i + 2]]);
      newV[i] = p[0]; newV[i + 1] = p[1]; newV[i + 2] = p[2];
    }
    const n = f.normals;
    const newN = new Float32Array(n.length);
    for (let i = 0; i < n.length; i += 3) {
      const d = t.axisDir([n[i], n[i + 1], n[i + 2]]);
      const len = Math.hypot(d[0], d[1], d[2]) || 1;
      newN[i] = d[0] / len; newN[i + 1] = d[1] / len; newN[i + 2] = d[2] / len;
    }
    const newPlane = f.plane
      ? {
          origin: ((): [number, number, number] => {
            const p = t.point(f.plane!.origin);
            return [p[0], p[1], p[2]];
          })(),
          normal: ((): [number, number, number] => {
            const d = t.axisDir(f.plane!.normal);
            const l = Math.hypot(d[0], d[1], d[2]) || 1;
            return [d[0] / l, d[1] / l, d[2] / l];
          })(),
          ...(f.plane.xDir !== undefined
            ? {
                xDir: ((): [number, number, number] => {
                  const d = t.axisDir(f.plane!.xDir!);
                  return [d[0], d[1], d[2]];
                })(),
              }
            : {}),
          ...(f.plane.yDir !== undefined
            ? {
                yDir: ((): [number, number, number] => {
                  const d = t.axisDir(f.plane!.yDir!);
                  return [d[0], d[1], d[2]];
                })(),
              }
            : {}),
        }
      : undefined;
    const newCylinder = f.cylinder
      ? {
          origin: ((): [number, number, number] => {
            const p = t.point(f.cylinder!.origin);
            return [p[0], p[1], p[2]];
          })(),
          axis: ((): [number, number, number] => {
            const d = t.axisDir(f.cylinder!.axis);
            const l = Math.hypot(d[0], d[1], d[2]) || 1;
            return [d[0] / l, d[1] / l, d[2] / l];
          })(),
          radius: f.cylinder.radius, // scale-free transform; rigid SE(3) preserves radius
        }
      : undefined;
    return {
      ...f,
      vertices: newV,
      normals: newN,
      ...(newPlane ? { plane: newPlane } : {}),
      ...(newCylinder ? { cylinder: newCylinder } : {}),
    };
  });
  let newEdges: Float32Array | undefined;
  if (mesh.edges) {
    const e = mesh.edges;
    newEdges = new Float32Array(e.length);
    for (let i = 0; i < e.length; i += 3) {
      const p = t.point([e[i], e[i + 1], e[i + 2]]);
      newEdges[i] = p[0]; newEdges[i + 1] = p[1]; newEdges[i + 2] = p[2];
    }
  }
  return { ...mesh, faces: transformedFaces, ...(newEdges ? { edges: newEdges } : {}) };
}

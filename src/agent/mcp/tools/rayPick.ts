// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { z } from 'zod';
import { meshFeaturesPerFeature, selectTerminalFeatures } from '../../../modeling/capture/featureMeshing';
import { resolveRootId } from '../../../composition/buildModel';
import type { FaceGeometry } from '../../../shared/worker/workerTypes';
import { runMcpScript } from '../runMcpScript';

const vec3 = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const inputSchema = z.object({ file: z.string().min(1).optional(), code: z.string().min(1).optional(), feature_id: z.string().min(1).optional(), origin: vec3, direction: vec3 })
  .refine(v => (v.file !== undefined) !== (v.code !== undefined), { message: 'Provide exactly one of file or code.' })
  .refine(v => Math.hypot(...v.direction) > 0, { message: 'direction must be nonzero.' });

type V3 = [number, number, number];
type RayHit = { face_id: number; point: V3; distance: number; normal: V3 };

/** Intersect a normalized ray with the viewer's per-face tessellation. One closest hit per face. */
export function rayPickFaces(faces: readonly FaceGeometry[], origin: V3, direction: V3): RayHit[] {
  const hits = new Map<number, RayHit>();
  for (const face of faces) {
    const v = face.vertices, ix = face.indices, ns = face.normals;
    for (let i = 0; i + 2 < ix.length; i += 3) {
      const ia = ix[i]! * 3, ib = ix[i + 1]! * 3, ic = ix[i + 2]! * 3;
      const ax = v[ia]!, ay = v[ia + 1]!, az = v[ia + 2]!;
      const e1x = v[ib]! - ax, e1y = v[ib + 1]! - ay, e1z = v[ib + 2]! - az;
      const e2x = v[ic]! - ax, e2y = v[ic + 1]! - ay, e2z = v[ic + 2]! - az;
      const px = direction[1] * e2z - direction[2] * e2y;
      const py = direction[2] * e2x - direction[0] * e2z;
      const pz = direction[0] * e2y - direction[1] * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (Math.abs(det) < 1e-12) continue;
      const inv = 1 / det;
      const tx = origin[0] - ax, ty = origin[1] - ay, tz = origin[2] - az;
      const u = (tx * px + ty * py + tz * pz) * inv;
      if (u < -1e-9 || u > 1 + 1e-9) continue;
      const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
      const w = (direction[0] * qx + direction[1] * qy + direction[2] * qz) * inv;
      if (w < -1e-9 || u + w > 1 + 1e-9) continue;
      const distance = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (distance < -1e-9) continue;
      const prior = hits.get(face.faceId);
      if (prior && prior.distance <= distance) continue;
      const b = 1 - u - w;
      let nx = ns[ia]! * b + ns[ib]! * u + ns[ic]! * w;
      let ny = ns[ia + 1]! * b + ns[ib + 1]! * u + ns[ic + 1]! * w;
      let nz = ns[ia + 2]! * b + ns[ib + 2]! * u + ns[ic + 2]! * w;
      const nl = Math.hypot(nx, ny, nz);
      if (nl > 0) { nx /= nl; ny /= nl; nz /= nl; }
      hits.set(face.faceId, { face_id: face.faceId, point: [origin[0] + direction[0] * distance, origin[1] + direction[1] * distance, origin[2] + direction[2] * distance], distance: Math.max(0, distance), normal: [nx, ny, nz] });
    }
  }
  return [...hits.values()].sort((a, b) => a.distance - b.distance || a.face_id - b.face_id);
}

export async function rayPickTool(raw: Record<string, unknown>) {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map(issue => issue.message).join('; ') };
  const input = parsed.data;
  const script = await runMcpScript({ file: input.file, code: input.code });
  if (!script.ok) return script;
  const { run } = script;
  if (!run.records.length) return { ok: false, error: 'Script produced no features.' };
  const targetId = input.feature_id ?? resolveRootId(run.returnValue, run.records.at(-1)!.id);
  if (!targetId) return { ok: false, error: 'Could not resolve the returned model feature.' };
  if (!run.records.some(record => record.id === targetId)) return { ok: false, error: `feature_id '${targetId}' not found in script's features.` };
  const meshing = await meshFeaturesPerFeature(run.records, run.paramTable, run.session);
  const terminals = selectTerminalFeatures(meshing.features);
  const index = terminals.findIndex(feature => feature.featureId === targetId);
  if (index < 0) return { ok: false, error: `Feature '${targetId}' is not displayed as a terminal model shape, so it has no current selection shapeIndex.` };
  const dirLength = Math.hypot(...input.direction);
  const direction = input.direction.map(value => value / dirLength) as V3;
  const hits = rayPickFaces(terminals[index]!.faces, input.origin, direction);
  return { ok: true, feature_id: targetId, shape_index: index, hit_basis: 'per-face tessellation', hits: hits.map(hit => ({ ...hit, selection: { shapeIndex: index, kind: 'face' as const, id: hit.face_id, featureId: targetId } })) };
}

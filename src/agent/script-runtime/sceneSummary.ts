// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getOC } from 'replicad';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { sceneToWorldFrameParts } from '../../kernel/backends/occt/sceneToWorldFrame';

/** Geometry facts, independent of DFM/mechanism/tool success. Units: mm³ and mm.
 * Null means unavailable, never a fabricated zero or a validation pass.
 * Assembly volume/faces are summed per part, including overlapping parts.
 * Size uses the backend's conservative axis-aligned bounding box. */
export interface SceneSummary {
  valid: boolean | null;
  volume: number | null;
  faceCount: number | null;
  size: [number, number, number] | null;
}

export function unavailableSceneSummary(): SceneSummary {
  return { valid: null, volume: null, faceCount: null, size: null };
}

function measure<T>(read: () => T): T | null {
  try { return read(); } catch { return null; }
}

function finite(n: number): number {
  if (!Number.isFinite(n)) throw new Error('Non-finite scene measurement');
  return n;
}

function summarizeShape(shape: ShapeBackend): SceneSummary {
  // Use the existing read-only geometry accessor; no backend API changes.
  const provider = shape as Partial<Pick<OcctBackend, 'getReplicadShape'>>;
  const raw = measure(() => provider.getReplicadShape?.());
  const faceCount = raw ? measure(() => {
    const faces = raw.faces;
    try { return faces.length; }
    finally { for (const face of faces) face.delete(); }
  }) : null;
  return {
    valid: raw && faceCount !== null ? measure(() => {
      if (faceCount === 0) return false;
      const analyzer = new (getOC().BRepCheck_Analyzer)(raw.wrapped, true, false);
      try { return analyzer.IsValid_2(); }
      finally { analyzer.delete(); }
    }) : null,
    volume: measure(() => finite(shape.volume())),
    faceCount,
    size: measure(() => {
      const bb = shape.boundingBox();
      return [0, 1, 2].map(i => finite(bb.max[i] - bb.min[i])) as [number, number, number];
    }),
  };
}

export function summarizeScene(root: ShapeBackend | undefined): SceneSummary {
  if (!root) return unavailableSceneSummary();
  if (!isSceneBackend(root)) return summarizeShape(root);
  if (root.parts.length === 0) return unavailableSceneSummary();
  const parts = measure(() => sceneToWorldFrameParts(root));
  if (!parts) return unavailableSceneSummary();
  try {
    const summaries = parts.map(p => summarizeShape(p.shape));
    const valid = summaries.some(s => s.valid === false) ? false
      : summaries.every(s => s.valid === true) ? true : null;
    const sum = (key: 'volume' | 'faceCount') => summaries.every(s => s[key] !== null)
      ? finite(summaries.reduce((n, s) => n + s[key]!, 0)) : null;
    return {
      valid,
      volume: measure(() => sum('volume')),
      faceCount: measure(() => sum('faceCount')),
      size: measure(() => {
        const boxes = parts.map(p => p.shape.boundingBox());
        return [0, 1, 2].map(i => finite(
          Math.max(...boxes.map(b => b.max[i])) - Math.min(...boxes.map(b => b.min[i])),
        )) as [number, number, number];
      }),
    };
  } finally {
    for (const part of parts) part.shape.dispose();
  }
}

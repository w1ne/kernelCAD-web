// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ContactGraphResult } from '../../modeling/runtime/contactGraph';
import {
  missingFilletFacts,
  stackedPrimitiveToyFacts,
} from './revisionAssist';

function countPattern(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

export function scriptQualityFacts(
  source: string,
  goal: string,
  allowReviewWarnings: readonly string[],
): Array<{ code: string; severity: string; message: string; hint?: string }> {
  const facts: Array<{ code: string; severity: string; message: string; hint?: string }> = [
    ...stackedPrimitiveToyFacts(source, goal, allowReviewWarnings),
    ...missingFilletFacts(source, goal, allowReviewWarnings),
  ];

  const code = 'assembly.quality.box-fragment-clutter';
  if (!allowReviewWarnings.includes(code)) {
    const boxCount = countPattern(source, /\bbox\s*\(/g);
    const boxUnionCount = countPattern(source, /\.union\s*\(\s*box\s*\(/g);
    const cylinderCount = countPattern(source, /\bcylinder\s*\(/g);
    if (boxUnionCount >= 6 && boxCount >= cylinderCount * 2) {
      facts.push({
        code,
        severity: 'warning',
        message: `Script uses ${boxCount} box primitives and ${boxUnionCount} box unions; this often produces visually arbitrary cuboid fragments instead of an explainable mechanical load path.`,
        hint: 'quality.box-fragment-clutter — replace decorative cuboids with continuous brackets, cylinders/shafts/bearing washers, or fewer purpose-named bodies. Each visible sub-shape should have an obvious role in the mechanism.',
      });
    }
  }
  return facts;
}

/**
 * Deterministic floating-geometry gate.
 *
 * The visual `no-stray-or-floating-geometry` / `main-object-count` checks are
 * graded on the agent's own prose. This grades them on the geometry: the
 * contact-graph analysis (dfm surface-distance sweep → connected components)
 * reports how many disconnected bodies the scene actually contains and which
 * parts are the stray islands. Any floating body is a warning the loop cannot
 * be talked out of. It is allow-listable only by its explicit named code,
 * because a genuinely multi-body deliverable is occasionally intended.
 */
export function geometryReviewFacts(
  geometry: ContactGraphResult | undefined,
  allowReviewWarnings: readonly string[],
): Array<{ code: string; severity: string; message: string; hint?: string }> {
  const code = 'assembly.geometry.floating-body';
  if (geometry === undefined || geometry.floatingParts.length === 0) return [];
  if (allowReviewWarnings.includes(code)) return [];
  const parts = geometry.floatingParts.join(', ');
  return [{
    code,
    severity: 'warning',
    message: `Deterministic contact graph found ${geometry.objectCount} disconnected bodies; parts float free of the main body (gap > ${geometry.gapMm} mm): ${parts}.`,
    hint: 'geometry.floating-body — the named parts have no surface contact or near-contact with the main body. Move or extend them so they seat against the structure they belong to (mate-graph connectivity is not geometric contact), then rerun review_cad. Allow-list assembly.geometry.floating-body only when the design is genuinely meant to ship as separate bodies.',
  }];
}

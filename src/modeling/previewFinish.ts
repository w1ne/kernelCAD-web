// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { FeatureRecord } from '../shared/intent/featureRecord';
import type { FeatureKind } from '../shared/intent/types';

/**
 * Finish features. They decorate a solid that is already built. A drag whose
 * parameter they do not read can show the updated solid without rebuilding
 * them. The exact update on release builds them again.
 */
const PREVIEW_FINISH_KINDS = new Set<FeatureKind>([
  'fillet',
  'chamfer',
  'filletIntersection',
  'draft',
  'embossText',
  'projectCurve',
]);

export function previewSkipsFeature(
  record: FeatureRecord,
  edited: ReadonlySet<string> | undefined,
): boolean {
  if (!PREVIEW_FINISH_KINDS.has(record.kind)) return false;
  const refs = (record.metadata as { paramRefs?: unknown } | undefined)?.paramRefs;
  if (!Array.isArray(refs)) return true;
  return !refs.some((name) => typeof name === 'string' && (edited?.has(name) ?? false));
}

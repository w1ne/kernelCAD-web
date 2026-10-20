// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import { createMarkupId, type ModelPoint, type TopologyRef } from './markupSnapshot';
import { markupStore } from './markupStore';

/** Place the typed note at the actual point picked by the model mesh. */
export function placeMarkupNoteFromModelHit(
  anchor: ModelPoint,
  shapeIndex: number,
  faceId: number,
  geometry: GeometryResult,
): boolean {
  const state = markupStore.getSnapshot();
  if (state.mode !== 'note') return false;

  const featureId = faceId >= 0 ? geometry.faceOwners?.[faceId] ?? geometry.featureId : undefined;
  const refs: TopologyRef[] = faceId >= 0
    ? [{ shapeIndex, kind: 'face', id: faceId, ...(featureId ? { featureId } : {}) }]
    : [];
  markupStore.setSelection(refs);

  const text = state.draftText.trim();
  if (text) {
    const added = markupStore.addNote({
      id: createMarkupId('note-'),
      text,
      anchor,
      refs,
    });
    if (added) markupStore.setDraftText('');
  }
  return true;
}

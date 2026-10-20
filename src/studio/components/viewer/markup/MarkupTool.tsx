// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import { markupStore } from '../../../markup/markupStore';
import { buildVisibleEdgePolylines } from '../measure/edgePolylines';
import { useViewerSnapper } from '../measure/useViewerSnapper';
import { useMarkupPointer } from './useMarkupPointer';

interface MarkupToolProps {
  geometries: readonly GeometryResult[];
  itemNames: readonly (string | null)[];
  hiddenIds: readonly string[];
}

function markupId(): string {
  return `note-${crypto.randomUUID()}`;
}

export function MarkupTool({ geometries, itemNames, hiddenIds }: MarkupToolProps) {
  const dom = useThree((state) => state.gl.domElement);
  const state = useSyncExternalStore(markupStore.subscribe, markupStore.getSnapshot, markupStore.getSnapshot);
  const polylines = useMemo(
    () => buildVisibleEdgePolylines(geometries, itemNames, hiddenIds),
    [geometries, itemNames, hiddenIds],
  );
  const snapAt = useViewerSnapper(polylines, geometries);

  useMarkupPointer(dom, state.mode === 'note', (point) => {
    const hit = snapAt(point);
    if (!hit) return;
    markupStore.setSelection(hit.refs);
    const text = markupStore.getSnapshot().draftText.trim();
    if (!text) return;
    markupStore.addNote({ id: markupId(), text, anchor: [...hit.point] as [number, number, number], refs: hit.refs });
    markupStore.setDraftText('');
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && markupStore.getSnapshot().mode === 'note') markupStore.setMode('off');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return null;
}

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import { markupStore } from './markupStore';
import { placeMarkupNoteFromModelHit } from './markupPlacement';
import { MARKUP_SNAPSHOT_MAX_NOTES } from './markupLimits';

afterEach(() => markupStore.clear());

describe('markup note placement', () => {
  it('anchors the draft note at the model click and records the picked face', () => {
    markupStore.setMode('note');
    markupStore.setDraftText('  Keep this mounting face flat  ');
    const geometry: GeometryResult = {
      faces: [],
      faceOwners: ['', '', '', '', 'bracket-wall-feature'],
    };

    const handled = placeMarkupNoteFromModelHit([12, 3, 5], 2, 4, geometry);

    expect(handled).toBe(true);
    expect(markupStore.getSnapshot()).toMatchObject({
      draftText: '',
      topologyRefs: [{ shapeIndex: 2, kind: 'face', id: 4, featureId: 'bracket-wall-feature' }],
      notes: [{
        text: 'Keep this mounting face flat',
        anchor: [12, 3, 5],
        refs: [{ shapeIndex: 2, kind: 'face', id: 4, featureId: 'bracket-wall-feature' }],
      }],
    });
  });

  it('places a note when the browser has Web Crypto without secure-context randomUUID', () => {
    const browserCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', {
      getRandomValues: browserCrypto.getRandomValues.bind(browserCrypto),
    });
    markupStore.setMode('note');
    markupStore.setDraftText('Keep the mounting face flat');

    try {
      const handled = placeMarkupNoteFromModelHit([12, 3, 5], 2, 4, { faces: [] });

      expect(handled).toBe(true);
      expect(markupStore.getSnapshot().notes).toMatchObject([{
        text: 'Keep the mounting face flat',
        anchor: [12, 3, 5],
        refs: [{ shapeIndex: 2, kind: 'face', id: 4 }],
      }]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps the draft note when placement is rejected at the snapshot limit', () => {
    for (let index = 0; index < MARKUP_SNAPSHOT_MAX_NOTES; index += 1) {
      markupStore.addNote({
        id: `saved-note-${index}`,
        text: 'Existing note',
        anchor: [0, 0, 0],
        refs: [],
      });
    }
    markupStore.setMode('note');
    markupStore.setDraftText('Keep this note available');

    expect(placeMarkupNoteFromModelHit([1, 2, 3], 0, -1, { faces: [] })).toBe(true);
    expect(markupStore.getSnapshot().draftText).toBe('Keep this note available');
    expect(markupStore.getSnapshot().error).toMatch(/128 notes.*remove a note/i);
  });
});

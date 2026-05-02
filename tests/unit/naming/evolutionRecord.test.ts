import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { OcctBackend } from '../../../src/backends/occt/occtBackend';
import { propagateTransformHistory } from '../../../src/naming/evolutionRecord';
import type { HistoryMap, FaceLineage } from '../../../src/naming/evolutionRecord';

describe('propagateTransformHistory', () => {
  beforeAll(async () => { await initOcct(); });

  // SKIP: faceHashes() helper added in Task 5; unskip after that task lands.
  it.skip('maps each input face to the i-th output face after a translate', async () => {
    const box = OcctBackend.box(10, 10, 10);  // 6 faces
    // Seed an input historyMap where each of the 6 faces has a canonical name lineage
    const inputMap: HistoryMap = new Map();
    const inputHashes = box.faceHashes();  // helper added in Task 5
    expect(inputHashes).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      const lineage: FaceLineage = {
        rootHash: inputHashes[i],
        canonicalName: (['top','bottom','left','right','front','back'] as const)[i],
        rootFeatureId: 'box-1',
      };
      inputMap.set(inputHashes[i], lineage);
    }
    const translated = box.translate(5, 0, 0);
    const outputHashes = translated.faceHashes();
    expect(outputHashes).toHaveLength(6);
    const newMap = propagateTransformHistory(inputMap, inputHashes, outputHashes);
    // Every output face should resolve to the same canonical name as its input counterpart
    for (let i = 0; i < 6; i++) {
      const outputLineage = newMap.get(outputHashes[i]);
      expect(outputLineage).toBeDefined();
      expect(outputLineage!.canonicalName).toBe((['top','bottom','left','right','front','back'] as const)[i]);
      expect(outputLineage!.rootFeatureId).toBe('box-1');
    }
  });

  // SKIP: faceHashes() helper added in Task 5; unskip after that task lands.
  it.skip('preserves rootHash through the transformation (lineage points to original primitive)', async () => {
    const box = OcctBackend.box(10, 10, 10);
    const originalHashes = box.faceHashes();
    const inputMap: HistoryMap = new Map();
    inputMap.set(originalHashes[0], { rootHash: originalHashes[0], canonicalName: 'top', rootFeatureId: 'box-1' });
    const moved = box.translate(1, 0, 0);
    const movedHashes = moved.faceHashes();
    const newMap = propagateTransformHistory(inputMap, originalHashes.slice(0, 1), movedHashes.slice(0, 1));
    const lineage = newMap.get(movedHashes[0]);
    expect(lineage!.rootHash).toBe(originalHashes[0]);  // still points to original
  });
});

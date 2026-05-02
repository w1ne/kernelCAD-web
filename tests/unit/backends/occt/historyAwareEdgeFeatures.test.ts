import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/backends/occt/occtBackend';
import { filletWithHistory, chamferWithHistory } from '../../../../src/backends/occt/historyAwareEdgeFeatures';

describe('historyAwareEdgeFeatures', () => {
  beforeAll(async () => { await initOcct(); });

  // SKIP: faceHashes()/edgeHashes()/findCanonicalFaceHash() helpers added in Task 5; unskip after that task lands.
  it.skip('filletWithHistory preserves face identity for non-filleted faces', async () => {
    const box = OcctBackend.box(20, 20, 20);
    // All 12 edges of the box; produce a fillet on all
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allEdges = (box as any).edgeHashes().map((h: string) => ({ hash: h }));  // helper added in Task 5
    const result = filletWithHistory(box, allEdges, 1);
    expect(result.shape).toBeDefined();
    // Top face should map to a single child (modified — corners rounded but face survives)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topHash = (box as any).findCanonicalFaceHash('top');
    const children = result.faceHistory.get(topHash);
    expect(children).toBeDefined();
    expect(children!.length).toBe(1);
  });

  // SKIP: faceHashes()/edgeHashes()/findCanonicalFaceHash() helpers added in Task 5; unskip after that task lands.
  it.skip('chamferWithHistory: same identity-preservation property', async () => {
    const box = OcctBackend.box(20, 20, 20);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allEdges = (box as any).edgeHashes().map((h: string) => ({ hash: h }));
    const result = chamferWithHistory(box, allEdges, 0.5);
    expect(result.shape).toBeDefined();
  });
});

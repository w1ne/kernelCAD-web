// tests/unit/mcp/tools/listFaceLabels.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { listFaceLabelsTool } from '../../../../src/mcp/tools/listFaceLabels';
import { initOcct } from '../../../../src/backends/occt/occtBackend';

describe('listFaceLabelsTool', () => {
  beforeAll(async () => { await initOcct(); });

  // ── A. Returns faceLabels declared on box (canonical-alias value) ──────────
  it('A: returns faceLabels declared on box with canonical-alias value', async () => {
    const result = await listFaceLabelsTool({
      code: `return box(10, 10, 5, false, { faceLabels: { lid: 'top' } });`,
    });
    expect(result.ok).toBe(true);
    const lidLabel = result.labels!.find(l => l.name === 'lid');
    expect(lidLabel).toBeDefined();
    expect(lidLabel!.source).toBe('faceLabels');
    if (lidLabel!.source === 'faceLabels') {
      expect(lidLabel!.canonical).toBe('top');
      expect(lidLabel!.featureKind).toBe('box');
      expect(lidLabel!.featureId).toBeTruthy();
    }
  });

  // ── B. Returns faceLabels with FaceQuery values ───────────────────────────
  it('B: returns faceLabels with FaceQuery value (query-based label)', async () => {
    const result = await listFaceLabelsTool({
      code: `
        return path()
          .moveTo(0, 0)
          .lineTo(10, 0)
          .lineTo(10, 5)
          .lineTo(0, 5)
          .close()
          .extrude(5, { faceLabels: { rim: { atZ: 5, parallelTo: 'XY' } } });
      `,
    });
    expect(result.ok).toBe(true);
    const rimLabel = result.labels!.find(l => l.name === 'rim');
    expect(rimLabel).toBeDefined();
    expect(rimLabel!.source).toBe('faceLabels');
    if (rimLabel!.source === 'faceLabels') {
      expect(rimLabel!.query).toMatchObject({ atZ: 5, parallelTo: 'XY' });
      expect(rimLabel!.featureId).toBeTruthy();
    }
  });

  // ── C. Returns sketch-segment labels alongside faceLabels labels ──────────
  it('C: returns sketch-segment labels and faceLabels labels in the same script', async () => {
    const result = await listFaceLabelsTool({
      code: `
        const shelf = path()
          .moveTo(0, 0)
          .lineTo(20, 0).label('base-edge')
          .lineTo(20, 10)
          .lineTo(0, 10)
          .close()
          .extrude(8);
        const lid = box(20, 10, 2, false, { faceLabels: { top: 'top' } });
        return shelf;
      `,
    });
    expect(result.ok).toBe(true);
    const sketchLabel = result.labels!.find(l => l.name === 'base-edge');
    expect(sketchLabel).toBeDefined();
    expect(sketchLabel!.source).toBe('sketch-segment');

    const faceLabel = result.labels!.find(l => l.name === 'top');
    expect(faceLabel).toBeDefined();
    expect(faceLabel!.source).toBe('faceLabels');
  });

  // ── D. Empty script returns empty labels list ─────────────────────────────
  it('D: empty script returns empty labels list', async () => {
    const result = await listFaceLabelsTool({
      code: `return box(10, 10, 10);`,
    });
    expect(result.ok).toBe(true);
    expect(result.labels).toEqual([]);
  });

  // ── E. Filter by feature_id works on faceLabels-sourced labels ────────────
  it('E: feature_id filter works for faceLabels-sourced labels', async () => {
    const result = await listFaceLabelsTool({
      code: `
        const a = box(10, 10, 5, false, { faceLabels: { lid: 'top' } });
        const b = box(20, 20, 8, false, { faceLabels: { floor: 'bottom' } });
        return a.union(b);
      `,
    });
    expect(result.ok).toBe(true);
    // Get all labels to find the feature_id for box a
    const allLabels = result.labels!;
    expect(allLabels.length).toBeGreaterThanOrEqual(2);

    // Find the lid label to get the featureId
    const lidLabel = allLabels.find(l => l.name === 'lid');
    expect(lidLabel).toBeDefined();
    expect(lidLabel!.source).toBe('faceLabels');
    const lidFeatureId = lidLabel!.source === 'faceLabels' ? lidLabel!.featureId : undefined;
    expect(lidFeatureId).toBeTruthy();

    // Filter by lidFeatureId - should only return lid, not floor
    const filtered = await listFaceLabelsTool({
      code: `
        const a = box(10, 10, 5, false, { faceLabels: { lid: 'top' } });
        const b = box(20, 20, 8, false, { faceLabels: { floor: 'bottom' } });
        return a.union(b);
      `,
      feature_id: lidFeatureId,
    });
    expect(filtered.ok).toBe(true);
    expect(filtered.labels!.every(l => l.name !== 'floor')).toBe(true);
    expect(filtered.labels!.some(l => l.name === 'lid')).toBe(true);
  });
});

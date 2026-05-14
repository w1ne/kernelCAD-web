import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../backends/occt/occtBackend';
import { getFaceLineageTool } from './getFaceLineage';

describe('get_face_lineage', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns chain length ≥ 1 for a fresh hole.wall (creator only)', async () => {
    const code = `
      return box(40,40,10).hole('top', { u: 0, v: 0, diameter: 6, depth: 3, name: 'pilot' });
    `;
    const result = await getFaceLineageTool({ code, feature_id: 'auto', ref: 'pilot.wall' });
    expect(result.ok).toBe(true);
    expect(result.chain?.length).toBeGreaterThanOrEqual(1);
    expect(result.chain?.[0].slot).toBe('wall');
  });

  it('returns usedFallback boolean field after downstream fillet', async () => {
    const code = `
      const plate = box(40,40,10).hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', name: 'thru' });
      return plate.fillet(0.2, { face: 'thru.entry-rim' });
    `;
    const result = await getFaceLineageTool({ code, feature_id: 'auto', ref: 'thru.wall' });
    expect(result.ok).toBe(true);
    expect(typeof result.usedFallback).toBe('boolean');
  });

  it('rejects unknown feature_id', async () => {
    const result = await getFaceLineageTool({ code: 'return box(1,1,1);', feature_id: 'noSuch', ref: 'x.y' });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBeDefined();
  });
});

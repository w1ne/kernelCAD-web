import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
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
    // 'wall' must be present somewhere in the chain — slot order is now
    // canonical (lex by slot name within a single feature), so we don't
    // hard-code an index.
    expect(result.chain?.some((s) => s.slot === 'wall')).toBe(true);
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

  it('accepts ordinal selector form (hole1.wall) for unnamed holes', async () => {
    // Selector delegation to runtime/selectorParser.parseFaceSelector means
    // the tool now accepts the canonical `<kind><N>.<ref>` form for unnamed
    // features in addition to the legacy `<name>.<ref>` form.
    const code = `
      return box(40, 40, 10).hole('top', { u: 0, v: 0, diameter: 6, depth: 3 });
    `;
    const result = await getFaceLineageTool({ code, feature_id: 'auto', ref: 'hole1.wall' });
    expect(result.ok).toBe(true);
    expect(result.chain && result.chain.length).toBeGreaterThan(0);
  });

  it('returns chain sorted by feature creation order (non-decreasing index in run.records)', async () => {
    // Build a 3-op chain that exercises propagation through fillet + chamfer
    // (chamfer targets the box's bottom face — independent of the hole's
    // edges so it doesn't kill the fillet). The chain query is filtered to
    // the hole's featureId, but we still assert the canonical sort
    // invariant: each entry's featureId-index in `run.records` is >= the
    // previous entry's. This guards against future tools or future hole
    // re-lowerings that might emit multi-feature chains.
    const code = `
      const plate = box(40, 40, 10).hole('top', { u: 0, v: 0, diameter: 6, depth: 3, name: 'blind' });
      const filleted = plate.fillet(0.2, { face: 'blind.entry-rim' });
      return filleted.chamfer(0.3, { face: 'bottom' });
    `;
    // Resolve the script independently to capture canonical creation order.
    const { runScript } = await import('../../script-runtime/runScript');
    const run = await runScript({ code, fileName: '<inline>' });
    const idIndex = new Map(run.records.map((r, i) => [r.id, i] as const));

    const result = await getFaceLineageTool({ code, feature_id: 'auto', ref: 'blind.wall' });
    expect(result.ok).toBe(true);
    const chain = result.chain!;
    expect(chain.length).toBeGreaterThanOrEqual(2);

    for (let i = 1; i < chain.length; i++) {
      const prev = idIndex.get(chain[i - 1].featureId);
      const cur = idIndex.get(chain[i].featureId);
      expect(prev).toBeDefined();
      expect(cur).toBeDefined();
      expect(cur!).toBeGreaterThanOrEqual(prev!);
    }
  });

  it('tie-breaks same-feature slots by slot name (lexicographic)', async () => {
    // A blind hole emits both 'wall' and 'floor' lineage entries — same
    // featureId, different slot. The chain must report them in
    // lexicographic slot order ('floor' before 'wall').
    const code = `
      return box(40, 40, 10).hole('top', { u: 0, v: 0, diameter: 6, depth: 3, name: 'blind' });
    `;
    const result = await getFaceLineageTool({ code, feature_id: 'auto', ref: 'blind.wall' });
    expect(result.ok).toBe(true);
    const chain = result.chain!;
    // Group by featureId and check slot order within each group.
    const groups = new Map<string, string[]>();
    for (const step of chain) {
      const arr = groups.get(step.featureId) ?? [];
      if (step.slot) arr.push(step.slot);
      groups.set(step.featureId, arr);
    }
    let sawMultiSlotGroup = false;
    for (const slots of groups.values()) {
      if (slots.length > 1) sawMultiSlotGroup = true;
      const sorted = [...slots].sort();
      expect(slots).toEqual(sorted);
    }
    // Sanity: the blind hole must produce a multi-slot group (wall + floor).
    expect(sawMultiSlotGroup).toBe(true);
  });
});

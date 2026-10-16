// tests/integration/mcp/listFacesRefs.test.ts
//
// F-surface Task F2.1: list_faces emits @kc[...] refs + lineage per face,
// while retaining the legacy `id` with deprecated: true for one release.
import { describe, it, expect, beforeAll } from 'vitest';
import { listFacesTool } from '../../../src/agent/mcp/tools/listFaces';

describe('list_faces — @kc[...] ref emission (F-surface F2)', () => {
  beforeAll(async () => {
    const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
    await initOcct();
  });

  it('emits ref and lineage for each face on a labeled box', async () => {
    // Note: box's signature is `box(x, y, z, centered, opts)`; the plan's
    // 4-arg form would pass the opts object as `centered`. Match the canonical
    // 5-arg signature so `faceLabels` actually reaches the captured record.
    const code = `
      return box(20, 20, 10, false, { faceLabels: { lid: 'top' } });
    `;
    const r = await listFacesTool({ code });
    expect(r.ok).toBe(true);
    if (!r.ok || !r.faces) throw new Error('expected faces');

    // Every face has a ref string of the form @kc[<owner>/face/<name>].
    for (const f of r.faces) {
      expect(f.ref).toMatch(/^@kc\[[^\]]+\/face\/[^\]]+\]$/);
      expect(f.lineage).toBeDefined();
    }

    // The labeled face's ref includes 'lid'.
    const lidFace = r.faces.find((f) => f.label === 'lid');
    expect(lidFace).toBeDefined();
    expect(lidFace!.ref).toContain('/face/lid');
  });

  it('keeps the positional id field without the per-face deprecated marker', async () => {
    const code = `return box(10, 10, 10);`;
    const r = await listFacesTool({ code });
    expect(r.ok).toBe(true);
    if (!r.ok || !r.faces) throw new Error('expected faces');
    expect(r.faces[0].id).toMatch(/^f\d+$/);
    // FIX-03: `deprecated: true` flagged every face of every listing and
    // carried no information; it was dropped.
    expect('deprecated' in r.faces[0]).toBe(false);
  });
});

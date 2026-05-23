// tests/integration/mcp/topoRefMetadataFaceLabelRoundTrip.test.ts
//
// F-surface round-trip lock: `list_faces` emits `@kc[<owner>/face/<label>]`
// where `<label>` is the user-applied name from `metadata.faceLabels` (e.g.
// `lid` when the script is `box(...).faceLabels({ lid: 'top' })`).
// `resolve_topo_ref` must round-trip the same ref string back to the same
// face hash — otherwise the agent-visible contract of list_faces is broken.
//
// Without the metadata-label walk in resolveTopoRef, the resolver only
// matches `lineage.labelName` / `lineage.canonicalName`, neither of which
// carries the user-applied label `lid`. The bug surfaces as
// `not-resolvable` for a ref that list_faces itself just emitted.
import { describe, it, expect, beforeAll } from 'vitest';
import { listFacesTool } from '../../../src/agent/mcp/tools/listFaces';
import { resolveTopoRefTool } from '../../../src/agent/mcp/tools/resolveTopoRef';

describe('topo-ref round-trip on metadata.faceLabels (F-surface)', () => {
  beforeAll(async () => {
    const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
    await initOcct();
  });

  it('round-trips @kc[<owner>/face/<label>] for a metadata.faceLabels-labeled box face', async () => {
    // `box(x, y, z, centered, { faceLabels })` — matches the canonical 5-arg
    // signature used in `listFacesRefs.test.ts`. The post-op site for snapshot
    // capture is `.hole(...)`: F-foundation's resolver filters out lineage
    // entries without a snapshot, so a primitive box alone won't round-trip
    // even on canonical refs (see resolveTopoRef integration test).
    const code = `
      return box(20, 20, 10, false, { faceLabels: { lid: 'top' } })
        .hole('top', { u: 0, v: 0, diameter: 4, depth: 'through' });
    `;

    // 1. list_faces emits the ref using the user-applied label `lid`, NOT the
    //    canonical name `top`. This is the agent-visible contract — see the
    //    canonicalToLabel projection in listFaces.ts.
    const list = await listFacesTool({ code });
    expect(list.ok).toBe(true);
    if (!list.ok || !list.faces) throw new Error('expected faces');
    const lidFace = list.faces.find((f) => f.label === 'lid');
    expect(lidFace).toBeDefined();
    expect(lidFace!.ref).toContain('/face/lid');

    // 2. Feeding that exact ref back into resolve_topo_ref must round-trip
    //    successfully — the resolver must walk metadata.faceLabels the same
    //    way list_faces did when emitting.
    const resolved = await resolveTopoRefTool({ code, ref: lidFace!.ref });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) {
      throw new Error(
        `round-trip failed: list_faces emitted '${lidFace!.ref}' but resolve_topo_ref returned ${resolved.errorCode}: ${resolved.error}`,
      );
    }
    expect(resolved.entity).toBeDefined();
    expect(resolved.entity!.kind).toBe('face');

    // Sanity: an unknown label-name still returns a structured not-resolvable
    // (the fix must not be over-permissive — it should match `lid` because the
    // metadata aliases it to `top`, not arbitrary names).
    const unknown = await resolveTopoRefTool({
      code,
      ref: lidFace!.ref.replace('/face/lid', '/face/lidthatdoesnotexist'),
    });
    expect(unknown.ok).toBe(false);
    if (unknown.ok) throw new Error('expected not-ok for unknown label');
    expect(unknown.errorCode).toBe('feature.face-ref.not-resolvable');
  });
});

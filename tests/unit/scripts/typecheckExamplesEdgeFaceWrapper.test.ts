import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { REPO_ROOT, runTypecheck } from '../../../scripts/typecheckExamples';

// `fillet` / `chamfer` accept `{ face: <FaceQuery> }` at runtime (every edge
// of the face the query picks). The public `EdgeSelector` type allowed only
// `{ face: 'top' | <label> }`, so these examples failed TS2345 in the editor.
describe('typecheckExamples edge selector face wrapper', () => {
  it('accepts a FaceQuery inside the { face } edge selector', async () => {
    const targets = [
      'examples/selector-binding-drift.kcad.ts',
      'tests/unit/scripts/fixtures/edge-face-wrapper.kcad.ts',
    ].map((p) => join(REPO_ROOT, p));
    expect(await runTypecheck(targets)).toBe(0);
  }, 180_000);
});

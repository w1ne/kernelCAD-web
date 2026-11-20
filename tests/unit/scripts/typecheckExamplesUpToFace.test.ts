import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT, runTypecheck } from '../../../scripts/typecheckExamples';

// `upToFace` on hole, holes and cutout accepts every form the entry `face`
// accepts (`buildUpToFaceInputRef`). A FaceRef-only option type made the
// ledge-height cookbook example fail TS2353 on `{ containsPoint }`.
describe('typecheckExamples upToFace selectors', () => {
  it('accepts a FaceQuery upToFace in the ledge-height cookbook example', async () => {
    const target = join(REPO_ROOT, 'examples/cookbook-parity/ledge-height-slot-block.kcad.ts');
    expect(await runTypecheck([target])).toBe(0);
  }, 180_000);

  it('accepts FaceRef, name, label and FaceQuery upToFace on hole, holes and cutout', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kc-uptoface-'));
    const target = join(dir, 'up-to-face.kcad.ts');
    writeFileSync(target, [
      'const block = box(60, 30, 24).subtract(box(30, 30, 12).translate(30, 0, 12));',
      'const slot = path().moveTo(-5, -10).lineTo(5, -10).lineTo(5, 10).lineTo(-5, 10).close();',
      "const a = block.hole('top', { u: -15, v: 0, diameter: 4, upToFace: { kind: 'canonical', face: 'bottom' } });",
      "const b = a.holes('top', { positions: [{ u: -20, v: 5 }], diameter: 3, upToFace: 'bottom' });",
      "const c = b.hole('top', { u: -20, v: -5, diameter: 3, upToFace: { face: 'bottom' } });",
      'return c.cutout(slot, { face: { containsPoint: [15, 15, 24] }, upToFace: { containsPoint: [45, 15, 12] } });',
      '',
    ].join('\n'));
    try {
      expect(await runTypecheck([target])).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 180_000);
});

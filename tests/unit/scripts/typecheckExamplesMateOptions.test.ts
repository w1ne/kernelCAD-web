import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { REPO_ROOT, runTypecheck } from '../../../scripts/typecheckExamples';

// `Assembly.mate` must expose every option `recordMate` accepts. The gearbox
// example passes `fastener` and `fit` metadata on fastened mates; an inline
// option type that drops them makes the script fail TS2353 in the editor.
describe('typecheckExamples mate options', () => {
  it('accepts fastener and fit metadata on assembly.mate', async () => {
    const target = join(REPO_ROOT, 'examples/assemblies/assembly-sequence-gearbox.kcad.ts');
    expect(await runTypecheck([target])).toBe(0);
  }, 180_000);
});

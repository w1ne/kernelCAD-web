import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE = resolvePath(__dirname, '../../..', 'examples/from-reference/e-reader/kindle-2-e-reader.kcad.ts');
const REFERENCE = resolvePath(__dirname, '../../..', 'examples/from-reference/e-reader/kindle-2-reference.jpg');

describe('photo-reference Kindle 2 e-reader example', () => {
  it('preserves the real-object brief, reference image, and parametric device dimensions', async () => {
    expect(existsSync(REFERENCE)).toBe(true);

    const source = readFileSync(EXAMPLE, 'utf8');
    expect(source).toContain('// Real Object Brief');
    expect(source).toContain("referenceImage('./kindle-2-reference.jpg'");
    for (const name of ['bodyWidth', 'bodyHeight', 'bodyThickness', 'screenWidth', 'screenHeight']) {
      expect(source).toContain(`param('${name}'`);
    }

    const built = await evaluateAndBuildScript({ file: EXAMPLE });
    const result = built.evaluation;

    expect(result.exitCode).toBe(0);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.featureCount).toBeGreaterThanOrEqual(7);

    const referenceImage = built.model?.records.find((record) => record.kind === 'referenceImage');
    expect(referenceImage).toBeDefined();
    expect(referenceImage?.metadata?.path).toEqual(expect.stringMatching(/kindle-2-reference\.jpg$/));
    expect(referenceImage?.metadata?.diagnostics ?? []).toEqual([]);
  });
});

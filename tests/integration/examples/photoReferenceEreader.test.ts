import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';

const EXAMPLE = 'examples/from-reference/e-reader/kindle-2-e-reader.kcad.ts';
const REFERENCE = 'examples/from-reference/e-reader/kindle-2-reference.jpg';

describe('photo-reference Kindle 2 e-reader example', () => {
  it('preserves the real-object brief, reference image, and parametric device dimensions', async () => {
    expect(existsSync(REFERENCE)).toBe(true);

    const source = readFileSync(EXAMPLE, 'utf8');
    expect(source).toContain('// Real Object Brief');
    expect(source).toContain("referenceImage('./kindle-2-reference.jpg'");
    expect(source).toContain('bodyWidth');
    expect(source).toContain('bodyHeight');
    expect(source).toContain('bodyThickness');
    expect(source).toContain('screenWidth');
    expect(source).toContain('screenHeight');

    const result = await evaluateScript({ file: EXAMPLE });

    expect(result.exitCode).toBe(0);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.featureCount).toBeGreaterThanOrEqual(7);
  });
});

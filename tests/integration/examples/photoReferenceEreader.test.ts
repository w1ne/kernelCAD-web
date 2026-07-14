import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE = resolvePath(__dirname, '../../..', 'examples/from-reference/e-reader/kindle-2-e-reader.kcad.ts');
const REFERENCE = resolvePath(__dirname, '../../..', 'examples/from-reference/e-reader/kindle-2-reference.jpg');
const PROVENANCE = resolvePath(__dirname, '../../..', 'examples/from-reference/e-reader/PROVENANCE.md');

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
    expect(referenceImage?.metadata?.pixelWidth).toBe(2100);
    expect(referenceImage?.metadata?.pixelHeight).toBe(3000);

    const interference = await checkInterference({
      code: source,
      fileName: 'examples/from-reference/e-reader/kindle-2-e-reader.kcad.ts',
      scriptDir: dirname(EXAMPLE),
      epsilonMm3: 0.01,
      ignorePairs: new Set<string>(),
    });
    expect(interference.partCount).toBe(4);
    expect(interference.pairs).toEqual([]);
  });

  it('uses a cited physical scale anchor and keeps static assembly connectors parametric', async () => {
    expect(existsSync(PROVENANCE)).toBe(true);

    const source = readFileSync(EXAMPLE, 'utf8');
    const provenance = readFileSync(PROVENANCE, 'utf8');
    expect(source).toContain('const REFERENCE_WIDTH_MM = 134.6;');
    expect(source).toContain('const REFERENCE_DEVICE_PIXEL_WIDTH = 1843;');
    expect(source).toContain('scale: REFERENCE_IMAGE_WIDTH_MM');
    expect(source).toContain('// Scale anchor:');
    expect(provenance).toContain('https://kindle.s3.amazonaws.com/Kindle%20User%E2%80%99s%20Guide%2C%202nd%20Ed.-%20English.pdf');
    expect(provenance).toContain('203.2 mm × 134.6 mm × 9.1 mm');
    expect(provenance).toContain('1843 px × 2774 px');

    const built = await evaluateAndBuildScript({ file: EXAMPLE });
    const referenceImage = built.model?.records.find((record) => record.kind === 'referenceImage');
    const expectedMmPerPixel = ((134.6 / 1843) + (203.2 / 2774)) / 2;
    expect(referenceImage?.metadata?.scale).toBeCloseTo(2100 * expectedMmPerPixel);
    const assemblyParts = built.model?.records.filter((record) => record.kind === 'assemblyPart') ?? [];
    const housing = assemblyParts.find((record) => record.metadata?.partName === 'housing');
    const display = assemblyParts.find((record) => record.metadata?.partName === 'display');
    const housingConnectors = housing?.metadata?.connectors as Record<string, {
      origin: { y: { paramRef?: unknown }; z: { paramRef?: unknown } };
    }> | undefined;
    const displayConnectors = display?.metadata?.connectors as Record<string, {
      origin: { y: { paramRef?: unknown }; z: { paramRef?: unknown } };
    }> | undefined;

    expect(housingConnectors?.displaySeat.origin.y.paramRef).toBeDefined();
    expect(housingConnectors?.displaySeat.origin.z.paramRef).toBeDefined();
    expect(displayConnectors?.mount.origin.y.paramRef).toBeDefined();
    expect(displayConnectors?.mount.origin.z.paramRef).toBeDefined();
    expect(built.model?.records.filter((record) => record.kind === 'assemblyConnect')).toHaveLength(3);

    // Legacy `connect` records keep the parameter-driven placement metadata,
    // while the v0.6 fastened mates make the four visual parts one genuine
    // solved graph. A connector-only record must not leave the Studio
    // mechanism gate reporting orphan parts.
    expect(source).toContain("reader.mate('display-fastened'");
    expect(source).toContain('return reader.solvedModel({});');
    const evaluation = await evaluateScriptTool({ file: EXAMPLE });
    expect(evaluation.ok).toBe(true);
    expect(evaluation.parts).toEqual({
      count: 4,
      names: ['housing', 'display', 'navigation-control', 'status-led'],
    });
    expect(evaluation.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('mechanism.'))).toEqual([]);
  });
});

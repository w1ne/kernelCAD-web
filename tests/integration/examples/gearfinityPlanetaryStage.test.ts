import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { inspectAssemblyTool } from '../../../src/agent/mcp/tools/inspectAssembly';
import { Scene } from '../../../src/modeling/validation/scene';
import { runScript } from '../../../src/modeling/runtime/runScript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_PATH = 'examples/gallery/gearfinity-planetary-stage.kcad.ts';
const EXAMPLE_ABSOLUTE = resolvePath(__dirname, '../../..', EXAMPLE_PATH);

describe('Gearfinity-inspired planetary stage gallery example', () => {
  it('evaluates as a dense mate-driven gear mechanism', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });

    expect(result.evaluation.exitCode).toBe(0);
    expect(result.evaluation.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);

    const records = result.model?.records ?? [];
    expect(records.filter((record) => record.kind === 'assemblyPart').length).toBeGreaterThanOrEqual(18);
    expect(records.at(-1)?.kind).toBe('solvedAssembly');

    const code = await readFile(EXAMPLE_ABSOLUTE, 'utf8');
    const { returnValue } = await runScript({
      code,
      fileName: EXAMPLE_ABSOLUTE,
      scriptDir: dirname(EXAMPLE_ABSOLUTE),
    });

    expect(returnValue).toBeInstanceOf(Scene);
    const scene = returnValue as Scene;
    expect(scene.parts.map((part) => part.name)).toEqual(
      expect.arrayContaining([
        'fixed-ring-gear-with-internal-teeth',
        'drive-sun-gear',
        'planet-carrier-output-web',
        'planet-gear-1',
        'planet-gear-2',
        'planet-gear-3',
        'output-fan-wheel',
      ]),
    );
    expect(scene.mates?.filter((mate) => mate.type === 'revolute').map((mate) => mate.name)).toEqual(
      expect.arrayContaining([
        'drive-sun-spin',
        'carrier-output-spin',
        'planet-1-orbit-spin',
        'planet-2-orbit-spin',
        'planet-3-orbit-spin',
        'fan-output-spin',
      ]),
    );
    expect(scene.part('output-fan-wheel').connectors?.some((connector) => connector.name === 'blade-tip')).toBe(true);
  }, 300_000);

  it('has connected mechanism geometry under inspect_assembly', async () => {
    const result = await inspectAssemblyTool({ file: EXAMPLE_PATH });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.unexplainedGeometry).toEqual([]);
      expect(result.partCount).toBeGreaterThanOrEqual(18);
      expect(result.mateCount).toBeGreaterThanOrEqual(18);
    }
  }, 300_000);
});

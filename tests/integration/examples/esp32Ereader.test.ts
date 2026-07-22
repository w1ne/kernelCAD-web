import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import type { Shape } from '../../../src/modeling/capture/proxy';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { validateAssembly } from '../../../src/modeling/mates/validator';
import { probeAssemblies } from '../../../src/modeling/runtime/mechanismProbe';
import { detectInterferences } from '../../../src/modeling/runtime/detectInterferences';
import { runIsolated } from '../../../src/modeling/runtime/isolation';
import { runScript, type ScriptRunner } from '../../../src/modeling/runtime/runScript';
import { Scene } from '../../../src/modeling/validation/scene';
import {
  HOSTED_IN_DEDICATED_FILE,
  discoverSweepExamples,
} from '../physics-loop/exampleSweepShared';

const sourcePath = resolve('examples/community/esp32-ereader.kcad.ts');

// These envelopes are measured from the current remote STEP models after the
// assembly's rotations. They deliberately exceed the catalog summary fields
// where a connector, flex, or lead adds real packaging volume.
const physicalCatalogFixtureBboxMm: Record<string, readonly [number, number, number]> = {
  'esp32-wroom-32': [18, 25.5, 3.1],
  'epaper-29-tricolor': [62.736, 5.62, 39.37],
  'lipo-1200mah-pouch': [37, 63, 6],
  'pushbutton-6mm': [8.6, 6, 5],
};

function fixtureCatalogRunnerFor(
  fixtureBboxes: Record<string, readonly [number, number, number]>,
  fetchCalls: string[],
): ScriptRunner {
  return (code, fileName, injected, opts) => {
    const box = injected.box as (
      x: number,
      y: number,
      z: number,
      centered?: boolean,
    ) => Shape;
    const lib = injected.lib as { fetchPart(id: string): Promise<Shape> };

    lib.fetchPart = async (id: string) => {
      fetchCalls.push(id);
      const bbox = fixtureBboxes[id];
      if (!bbox) throw new Error(`unexpected catalog id: ${id}`);
      return box(...bbox, true);
    };

    return runIsolated(code, fileName, injected, opts);
  };
}

/**
 * Exercise the remote-catalog assembly through an explicit, physically sized
 * offline fixture. The fixture rejects unknown IDs so the source keeps its
 * exact catalog dependency contract while CI remains hermetic.
 */
async function runCatalogFixtureAssemblyValidation() {
  await initOcct();

  const source = readFileSync(sourcePath, 'utf8');
  const fetchCalls: string[] = [];
  const run = await runScript({
    code: source,
    fileName: sourcePath,
    scriptDir: resolve('examples/community'),
    runner: fixtureCatalogRunnerFor(physicalCatalogFixtureBboxMm, fetchCalls),
  });

  if (!(run.returnValue instanceof Scene)) {
    throw new Error('ESP32 e-reader fixture did not return an assembly scene.');
  }

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const lowered = await engine.run(run.records, {
    paramTable: run.paramTable,
    gatedFeatureNames: run.session.gatedFeatureNames,
  });
  const sceneBackend = lowered.shapes.get(run.returnValue.__sourceFeatureId());
  if (!isSceneBackend(sceneBackend)) {
    throw new Error('ESP32 e-reader fixture did not lower to a scene backend.');
  }

  const interferences = detectInterferences(sceneBackend, 0.01, new Set(), lowered.diagnostics);
  const validation = validateAssembly({
    records: run.records,
    interferencePairs: interferences.pairs,
  });
  const mechanism = await probeAssemblies(
    Array.from(run.session.assemblies.values()) as Assembly[],
    { physicsCheck: false },
  );

  return { source, fetchCalls, run, lowered, interferences, validation, mechanism };
}

describe('ESP32 E-Reader reference assembly', () => {
  it('delegates its remote-catalog assembly from the hermetic live sweep to this fixture', () => {
    const examplePath = 'examples/community/esp32-ereader.kcad.ts';

    expect(HOSTED_IN_DEDICATED_FILE.get(examplePath)).toMatchObject({
      testFile: 'tests/integration/examples/esp32Ereader.test.ts',
      coverage: 'catalog-fixture',
    });
    expect(discoverSweepExamples()).not.toContain(examplePath);
  });

  describe('offline catalog fixture coverage', () => {
    let fixture: Awaited<ReturnType<typeof runCatalogFixtureAssemblyValidation>>;

    beforeAll(async () => {
      fixture = await runCatalogFixtureAssemblyValidation();
    }, 180_000);

    it('uses exact catalog components in a mechanically connected enclosure without substitutes', async () => {
      expect(existsSync(sourcePath)).toBe(true);

      const { source, fetchCalls, run } = fixture;
      const { returnValue, records } = run;

      expect(fetchCalls).toEqual([
        'epaper-29-tricolor',
        'esp32-wroom-32',
        'lipo-1200mah-pouch',
        'pushbutton-6mm',
        'pushbutton-6mm',
      ]);

      expect(returnValue).toBeInstanceOf(Scene);
      const scene = returnValue as Scene;
      expect(scene.parts.map((part) => part.name)).toEqual(expect.arrayContaining([
        'e-reader-enclosure',
        'display-bezel',
        'electronics-carrier',
        'epaper-29-tricolor-display',
        'esp32-wroom-32-controller',
        'lipo-1200mah-pouch-battery',
        'page-turn-button-left',
        'page-turn-button-right',
      ]));
      expect(scene.parts).toHaveLength(8);
      expect(scene.mates?.map((mate) => mate.name)).toEqual(expect.arrayContaining([
        'bezel-retained-in-enclosure',
        'carrier-retained-in-enclosure',
        'display-retained-by-bezel',
        'controller-on-carrier',
        'battery-retained-in-enclosure',
        'left-button-installed',
        'right-button-installed',
      ]));
      expect(records.at(-1)?.kind).toBe('solvedAssembly');

      expect(scene.part('e-reader-enclosure').connectors?.map((connector) => connector.name))
        .toEqual(expect.arrayContaining([
          'bezel-seat',
          'carrier-seat',
          'battery-seat',
          'left-button-aperture',
          'right-button-aperture',
        ]));
      expect(scene.part('electronics-carrier').connectors?.map((connector) => connector.name))
        .toEqual(expect.arrayContaining([
          'enclosure-mount',
          'controller-seat',
          'left-button-seat',
          'right-button-seat',
        ]));

      expect(source).toContain("lib.fetchPart('epaper-29-tricolor')");
      expect(source).toContain("lib.fetchPart('esp32-wroom-32')");
      expect(source).toContain("lib.fetchPart('lipo-1200mah-pouch')");
      expect(source).toContain("lib.fetchPart('pushbutton-6mm')");
      expect(source).toContain('Known catalog / electrical boundary');
      expect(source).toContain('No durable e-paper display-paint receipt exists yet.');
      expect(source).toContain('No firmware proof or LabWired run receipt binds this assembly yet.');
      expect(source).toContain('return reader.solvedModel({});');
      expect(source).not.toMatch(/part\(\s*null/);
      expect(source).not.toMatch(/fallback\s*(?:box|electronics|component)/i);
      expect(source).not.toMatch(/catch\s*\(/);
    });

    it('keeps measured catalog envelopes clear of the shell, carrier, and each other', () => {
      expect(fixture.interferences.pairs).toEqual([]);
    });

    // This exact title is audited by exampleSweepGate.test.ts. It replaces
    // the live remote-catalog sweep only because CI forbids remote I/O; this
    // fixture executes the lowered-scene, mate-validator, and mechanism
    // surfaces against physically sized catalog envelopes.
    it('examples/community/esp32-ereader.kcad.ts passes the physics-grounded loop', () => {
      expect(fixture.lowered.diagnostics).toEqual([]);
      expect(fixture.interferences).toMatchObject({
        partCount: 8,
        pairs: [],
        diagnostics: [],
      });
      expect(fixture.validation).toMatchObject({
        status: 'solved',
        partCount: 8,
      });
      expect(fixture.validation.diagnostics).toEqual([]);
      expect(fixture.mechanism).toEqual({ mechanism: 'real', failures: [] });
    });
  });
});

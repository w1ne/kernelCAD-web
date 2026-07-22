import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import type { Shape } from '../../../src/modeling/capture/proxy';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { validateAssembly } from '../../../src/modeling/mates/validator';
import { runIsolated } from '../../../src/modeling/runtime/isolation';
import { probeAssemblies } from '../../../src/modeling/runtime/mechanismProbe';
import { detectInterferences } from '../../../src/modeling/runtime/detectInterferences';
import { runScript, type ScriptRunner } from '../../../src/modeling/runtime/runScript';
import { Scene } from '../../../src/modeling/validation/scene';
import {
  HOSTED_IN_DEDICATED_FILE,
  discoverSweepExamples,
} from '../physics-loop/exampleSweepShared';

const examplePath = 'examples/community/thermal-iolink-machine-health.kcad.ts';
const sourcePath = resolve(examplePath);

// Deterministic envelopes for the five exact remote catalog identities. The
// M12 fixture models its retained cylindrical barrel rather than the external
// coupling shell, so the test exercises the panel/clamp placement without
// pretending that the whole connector is a solid rectangular block.
const catalogFixtureBboxMm: Record<string, readonly [number, number, number]> = {
  'esp32-c3-supermini-board': [24.31, 18, 5.56],
  'mlx90640': [25.4, 17.78, 11.7],
  'max14827': [12, 19, 5.1],
  'buck-24v-3v3': [24, 12, 5.6],
};

function fixtureCatalogRunner(fetchCalls: string[]): ScriptRunner {
  return (code, fileName, injected, opts) => {
    const box = injected.box as (
      x: number,
      y: number,
      z: number,
      centered?: boolean,
    ) => Shape;
    const cylinder = injected.cylinder as (
      height: number,
      radius: number,
      segments?: number,
    ) => Shape;
    const lib = injected.lib as { fetchPart(id: string): Promise<Shape> };

    lib.fetchPart = async (id: string) => {
      fetchCalls.push(id);
      const shape = id === 'm12-iolink-5pin'
        ? await cylinder(28.9, 8.2, 64).alongAxis([0, 1, 0]).recenter()
        : (() => {
            const bbox = catalogFixtureBboxMm[id];
            if (!bbox) throw new Error('unexpected catalog id: ' + id);
            return box(...bbox, true);
          })();
      // The fixture envelope is already centered. Production source still
      // calls recenter() on the imported vendor STEP geometry.
      const catalogShape = Object.create(shape) as Shape;
      catalogShape.recenter = async () => shape;
      return catalogShape;
    };

    return runIsolated(code, fileName, injected, opts);
  };
}

/**
 * Run the same assembly / clash / mechanism surfaces as the live sweep, but
 * supply only the exact remote catalog imports through a deterministic
 * offline fixture. Unknown identities fail hard, so a source edit cannot
 * silently replace a catalog part with an ad-hoc solid.
 */
async function runCatalogFixtureAssemblyValidation() {
  await initOcct();

  const source = readFileSync(sourcePath, 'utf8');
  const fetchCalls: string[] = [];
  const run = await runScript({
    code: source,
    fileName: sourcePath,
    scriptDir: resolve('examples/community'),
    runner: fixtureCatalogRunner(fetchCalls),
  });

  if (!(run.returnValue instanceof Scene)) {
    throw new Error('Thermal IO-Link fixture did not return an assembly scene.');
  }

  const recompute = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, {
    paramTable: run.paramTable,
  });
  const targetId = run.returnValue.__sourceFeatureId();
  const lowered = recompute.shapes.get(targetId);
  if (!isSceneBackend(lowered)) {
    throw new Error('Thermal IO-Link fixture did not lower to a scene backend.');
  }

  const interferences = detectInterferences(lowered, 0.01, new Set(), recompute.diagnostics);
  const validation = validateAssembly({
    records: run.records,
    interferencePairs: interferences.pairs,
  });
  const mechanism = await probeAssemblies(
    Array.from(run.session.assemblies.values()) as Assembly[],
    { physicsCheck: false },
  );

  return { source, fetchCalls, run, recompute, interferences, validation, mechanism };
}

describe('Thermal IO-Link machine-health reference assembly', () => {
  it('delegates its remote-catalog assembly from the hermetic live sweep to this fixture', () => {
    expect(HOSTED_IN_DEDICATED_FILE.get(examplePath)).toMatchObject({
      testFile: 'tests/integration/examples/thermalIoLinkMachineHealth.test.ts',
      coverage: 'catalog-fixture',
    });
    expect(discoverSweepExamples()).not.toContain(examplePath);
  });

  describe('offline catalog fixture coverage', () => {
    let fixture: Awaited<ReturnType<typeof runCatalogFixtureAssemblyValidation>>;

    beforeAll(async () => {
      fixture = await runCatalogFixtureAssemblyValidation();
    }, 180_000);

    it('uses exact catalog identities and named sensor interfaces', () => {
      expect(existsSync(sourcePath)).toBe(true);

      const { source, fetchCalls, run } = fixture;
      const { returnValue, records } = run;

      expect(fetchCalls).toEqual([
        'mlx90640',
        'esp32-c3-supermini-board',
        'max14827',
        'm12-iolink-5pin',
        'buck-24v-3v3',
      ]);
      expect(returnValue).toBeInstanceOf(Scene);
      const scene = returnValue as Scene;
      expect(scene.parts.map((part) => part.name)).toEqual(expect.arrayContaining([
        'industrial-sensor-enclosure',
        'thermal-aperture-bezel',
        'm12-panel-clamp',
        'carrier-support-rails',
        'electronics-carrier',
        'power-regulator-shelf',
        'mlx90640-thermal-camera',
        'esp32-c3-supermini-controller',
        'max14827-iolink-phy',
        'm12-iolink-5pin-connector',
        'buck-24v-3v3-power-regulator',
      ]));
      expect(scene.parts).toHaveLength(11);
      expect(records.at(-1)?.kind).toBe('solvedAssembly');
      expect(scene.part('electronics-carrier').connectors?.map((connector) => connector.name))
        .toEqual(expect.arrayContaining([
          'support-mount',
          'mlx90640-seat',
          'esp32-seat',
          'max14827-seat',
        ]));
      expect(scene.part('power-regulator-shelf').connectors?.map((connector) => connector.name))
        .toEqual(expect.arrayContaining([
          'enclosure-mount',
          'buck-seat',
        ]));
      expect(scene.mates?.map((mate) => mate.name)).toEqual(expect.arrayContaining([
        'carrier-supports-retained-in-enclosure',
        'carrier-retained-on-supports',
        'power-regulator-shelf-retained-in-enclosure',
        'mlx90640-on-carrier',
        'esp32-on-carrier',
        'max14827-on-carrier',
        'm12-retained-by-panel-clamp',
        'buck-24v-3v3-on-power-shelf',
      ]));

      expect(source).toContain("await lib.fetchPart('mlx90640')");
      expect(source).toContain("await lib.fetchPart('esp32-c3-supermini-board')");
      expect(source).toContain("await lib.fetchPart('max14827')");
      expect(source).toContain("await lib.fetchPart('m12-iolink-5pin')");
      expect(source).toContain("await lib.fetchPart('buck-24v-3v3')");
      expect(source).not.toContain('does not currently serve it');
      expect(source).not.toMatch(/part\(\s*null/);
      expect(source).not.toMatch(/fallback\s*(?:box|electronics|component)/i);
    });

    // This literal title is checked by exampleSweepGate.test.ts. It replaces
    // the live runValidateCli sweep only because this test explicitly lowers,
    // clash-checks, validates, and probes the same assembly through a
    // deterministic catalog fixture.
    it('examples/community/thermal-iolink-machine-health.kcad.ts passes the physics-grounded loop', () => {
      expect(fixture.recompute.diagnostics).toEqual([]);
      expect(fixture.interferences).toMatchObject({
        partCount: 11,
        pairs: [],
        diagnostics: [],
      });
      expect(fixture.validation).toMatchObject({
        status: 'solved',
        partCount: 11,
      });
      expect(fixture.validation.diagnostics).toEqual([]);
      expect(fixture.mechanism).toEqual({ mechanism: 'real', failures: [] });
    });
  });
});

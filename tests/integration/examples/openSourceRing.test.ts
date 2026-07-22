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
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import {
  HOSTED_IN_DEDICATED_FILE,
  discoverSweepExamples,
} from '../physics-loop/exampleSweepShared';

const sourcePath = resolve('examples/community/open-source-ring.kcad.ts');
const hapticSourcePath = 'scripts/parts/authored/precision-microdrives-304-002-erm.kcad.ts';
const hapticSourceAbsolute = resolve(hapticSourcePath);
const electronicsManifestPath = resolve('scripts/electronics-parts.json');

const catalogFixtureBboxMm: Record<string, readonly [number, number, number]> = {
  'nrf54l15-qfn48': [6, 6, 0.85],
  'bmi270-lga14': [3, 2.5, 0.83],
  'max30102-optical': [5.6, 3.3, 1.55],
  'tmp117-dsbga': [1.488, 0.95, 0.531],
  'drv2605-yzf': [1.44, 1.44, 0.625],
  'precision-microdrives-304-002-erm': [12, 4.4, 4.4],
};

function fixtureCatalogRunner(fetchCalls: string[]): ScriptRunner {
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
      const bbox = catalogFixtureBboxMm[id];
      if (!bbox) throw new Error(`unexpected catalog id: ${id}`);
      const shape = box(...bbox, true);
      // The fixture box is already centred. Avoid forcing six OCCT lowerings
      // solely to rediscover that fact; real catalog imports still call the
      // production `recenter()` path in the source.
      const catalogShape = Object.create(shape) as Shape;
      catalogShape.recenter = async () => shape;
      return catalogShape;
    };

    return runIsolated(code, fileName, injected, opts);
  };
}

/**
 * Run the same assembly / clash / mechanism surfaces as the live sweep, but
 * supply only the six catalog imports through a deterministic offline fixture.
 * The source itself retains its exact `lib.fetchPart(...)` calls; this runner
 * is a test-only catalog boundary and rejects any unknown identity.
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
    throw new Error('Open Source Ring fixture did not return an assembly scene.');
  }

  const recompute = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, {
    paramTable: run.paramTable,
  });
  const targetId = run.returnValue.__sourceFeatureId();
  const lowered = recompute.shapes.get(targetId);
  if (!isSceneBackend(lowered)) {
    throw new Error('Open Source Ring fixture did not lower to a scene backend.');
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

describe('Open Source Ring reference assembly', () => {
  it('delegates its remote-catalog assembly from the hermetic live sweep to this fixture', () => {
    const examplePath = 'examples/community/open-source-ring.kcad.ts';

    expect(HOSTED_IN_DEDICATED_FILE.get(examplePath)).toMatchObject({
      testFile: 'tests/integration/examples/openSourceRing.test.ts',
      coverage: 'catalog-fixture',
    });
    expect(discoverSweepExamples()).not.toContain(examplePath);
  });

  it('declares an evaluable, datasheet-backed reusable ERM catalog part', async () => {
    expect(existsSync(hapticSourceAbsolute)).toBe(true);

    const manifest = JSON.parse(readFileSync(electronicsManifestPath, 'utf8')) as {
      parts: Array<Record<string, unknown>>;
    };
    const haptic = manifest.parts.find(
      (part) => part.id === 'precision-microdrives-304-002-erm',
    );

    expect(haptic).toMatchObject({
      id: 'precision-microdrives-304-002-erm',
      family: 'Haptic actuator',
      mpn: 'Precision Microdrives 304-002',
      kcad_source: hapticSourcePath,
    });
    expect(haptic?.tags).toEqual(expect.arrayContaining(['haptic', 'erm', 'vibration-motor']));
    expect(haptic?.attribution).toMatch(/304-002.*datasheet/i);

    const evaluation = await evaluateScript({ file: hapticSourcePath });
    expect(evaluation.exitCode).toBe(0);
    expect(evaluation.diagnostics).toEqual([]);
    expect(evaluation.featureCount).toBeGreaterThanOrEqual(6);
  }, 120_000);

  describe('offline catalog fixture coverage', () => {
    let fixture: Awaited<ReturnType<typeof runCatalogFixtureAssemblyValidation>>;

    beforeAll(async () => {
      fixture = await runCatalogFixtureAssemblyValidation();
    }, 180_000);

    it('uses catalog identities and records a mechanically connected thermal and haptic assembly', async () => {
      expect(existsSync(sourcePath)).toBe(true);

      const { source, fetchCalls, run } = fixture;
      const { returnValue, records } = run;

      for (const id of [
        'nrf54l15-qfn48',
        'bmi270-lga14',
        'max30102-optical',
        'tmp117-dsbga',
        'drv2605-yzf',
        'precision-microdrives-304-002-erm',
      ]) {
        expect(fetchCalls).toContain(id);
      }
      expect(fetchCalls).toHaveLength(6);

      expect(returnValue).toBeInstanceOf(Scene);
      const scene = returnValue as Scene;
      expect(scene.parts.map((part) => part.name)).toEqual(expect.arrayContaining([
        'open-c-band-enclosure',
        'electronics-carrier',
        'skin-side-ppg-window',
        'skin-thermal-window',
        'thermal-coupling-pad',
        'tmp117-dsbga-skin-temperature',
        'drv2605-yzf-haptic-driver',
        'precision-microdrives-304-002-erm-haptic-actuator',
      ]));
      expect(scene.parts).toHaveLength(11);
      expect(records.at(-1)?.kind).toBe('solvedAssembly');

      expect(scene.part('open-c-band-enclosure').connectors?.map((connector) => connector.name))
        .toEqual(expect.arrayContaining([
          'carrier-seat',
          'ppg-window-seat',
          'thermal-window-seat',
          'haptic-actuator-pocket',
        ]));
      expect(scene.part('tmp117-dsbga-skin-temperature').connectors?.map((connector) => connector.name))
        .toEqual(expect.arrayContaining(['carrier-mount', 'thermal-contact']));
      expect(scene.mates?.map((mate) => mate.name)).toEqual(expect.arrayContaining([
        'thermal-window-retained-in-enclosure',
        'thermal-pad-against-window',
        'tmp117-coupled-to-thermal-pad',
        'haptic-actuator-retained-in-enclosure',
      ]));

      expect(source).toMatch(/ring\.part\('open-c-band-enclosure'/);
      expect(source).toMatch(/ring\.part\('electronics-carrier'/);
      expect(source).toMatch(/ring\.part\('skin-side-ppg-window'/);
      expect(source).toContain('const ppgApertureDepthMm = 1.1;');
      expect(source).toContain('const drv2605MountZ = -1.0;');
      expect(source).toContain('cylinder(ppgApertureDepthMm, 2.7, 64)');
      expect(source).not.toContain('cylinder(12.0, 2.7, 64)');
      expect(source).toMatch(/openBand\s*\.union\(signetOuter\)/);
      expect(source).toContain(
        '.subtract(signetCavity, ppgAperture, thermalWindowAperture, hapticActuatorPocket)',
      );
      expect(source).toContain('const minComponentClearanceMm = 0.5;');
      expect(source).toContain('const tmp117ToDrvClearanceMm =');
      expect(source).toContain('const hapticPocketAxialClearanceMm = 0.15;');
      expect(source).toContain('const hapticPocketRadialClearanceMm = 0.15;');
      expect(source).toMatch(/ring\.mate\(\s*'carrier-retained-in-enclosure'/);
      expect(source).toMatch(/ring\.mate\(\s*'ppg-window-retained-in-enclosure'/);
      expect(source).toContain('return ring.solvedModel({});');
      expect(source).not.toMatch(/part\(\s*null/);
      expect(source).not.toMatch(/fallback\s*(?:box|electronics|component)/i);
    });

    // This literal title is checked by exampleSweepGate.test.ts. It replaces
    // the live `runValidateCli` sweep only because the test suite keeps the
    // remote catalog disabled; the assertions below exercise the equivalent
    // lowered-scene, validator, and mechanism surfaces through the fixture.
    it('examples/community/open-source-ring.kcad.ts passes the physics-grounded loop', () => {
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

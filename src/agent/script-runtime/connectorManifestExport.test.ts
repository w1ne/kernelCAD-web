// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  chmodSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { Param, Vec3Param } from '../../shared/intent/types';
import { ParamTable } from '../../shared/runtime/paramTable';
import { resolveParams } from '../../shared/runtime/resolveParams';
import { Transform } from '../../shared/runtime/se3';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { sceneToWorldFrameParts } from '../../kernel/backends/occt/sceneToWorldFrame';
import { createOcctLowerer } from '../../modeling/backends/occt/occtLowerer';
import type { Shape } from '../../modeling/capture/proxy';
import type { Connector } from '../../modeling/mates/connector';
import { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { runScript } from '../../modeling/runtime/runScript';
import { Scene } from '../../modeling/validation/scene';
import { exportCommand, exportScript, writeManifestSidecarAtomically } from '../cli/commands/export';
import { runAndExport } from './export';
import { sceneToConnectorManifest } from './connectorManifestExport';

const SOURCE_ID = 'source-model';
const temporaryDirectories: string[] = [];

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

interface FixturePart {
  id: string;
  name: string;
  at?: [number, number, number];
  connectors?: readonly Connector[];
  worldTransform?: Transform;
}

interface FixtureOptions {
  extraRecords?: readonly FeatureRecord[];
  sourceMates?: boolean;
  sceneMates?: boolean;
}

function scalar(value: number, unit: Param['unit'] = 'mm'): Param {
  return { expression: String(value), unit, evaluated: value };
}

function vec3Param(values: [number, number, number]): Vec3Param {
  return { x: scalar(values[0]), y: scalar(values[1]), z: scalar(values[2]) };
}

function assemblyPartRecord(part: FixturePart): FeatureRecord {
  return {
    id: part.id,
    kind: 'assemblyPart',
    params: {},
    inputs: { shape: { kind: 'feature', id: `shape-${part.id}` } },
    transforms: [],
    suppressed: false,
    metadata: {
      assemblyName: 'target',
      partName: part.name,
      at: vec3Param(part.at ?? [0, 0, 0]),
    },
  };
}

function makeFixture(parts: readonly FixturePart[], options: FixtureOptions = {}) {
  const sourceRecord: FeatureRecord = {
    id: SOURCE_ID,
    kind: 'assemblyModel',
    params: {},
    inputs: Object.fromEntries(parts.map((part, index) => [
      `part_${index}`,
      { kind: 'feature', id: part.id },
    ])),
    transforms: [],
    suppressed: false,
    metadata: {
      assemblyName: 'target',
      partIds: parts.map((part) => part.id),
      ...(options.sourceMates ? { mates: [{ name: 'mate' }] } : {}),
    },
  };
  const scene = new Scene(
    'target',
    parts.map((part) => ({
      name: part.name,
      shape: {} as Shape,
      worldTransform: Transform.identity(),
      ...(part.connectors === undefined ? {} : { connectors: part.connectors }),
    })),
    () => ({ min: [0, 0, 0], max: [0, 0, 0] }),
    undefined,
    SOURCE_ID,
    options.sceneMates ? ([{ name: 'mate' }] as never) : undefined,
  );
  const lowered: SceneBackend = {
    target: 'export-occt',
    assemblyName: 'target',
    _kind: 'scene',
    parts: parts.map((part) => ({
      name: part.name,
      shape: {} as ShapeBackend,
      worldTransform: part.worldTransform ?? Transform.identity(),
    })),
  };
  return {
    scene,
    lowered,
    records: [...parts.map(assemblyPartRecord), sourceRecord, ...(options.extraRecords ?? [])],
  };
}

const FRAME: Connector = {
  name: 'pwm-contact',
  type: 'frame',
  origin: { kind: 'vec3', value: [1, 1, 1] },
  normal: [1, 0, 0],
};

const AXIS: Connector = {
  name: 'shaft',
  type: 'axis',
  origin: { kind: 'vec3', value: [1, 1, 1] },
  axis: [0, 1, 0],
};

const RUNTIME_CODE = `
  const arm = assembly('target');
  arm.part('servo', box(1, 1, 1), { at: [10, 20, 30] })
    .connector('pwm-contact', {
      type: 'frame',
      origin: { kind: 'vec3', value: [1, 1, 1] },
      normal: [1, 0, 0],
    });
  return arm.model();
`;

async function lowerRuntimeScene(code = RUNTIME_CODE) {
  const run = await runScript({ code, fileName: 'connector-manifest.kcad.ts' });
  if (!(run.returnValue instanceof Scene)) throw new Error('fixture did not return a Scene');
  const scene = run.returnValue;
  const sourceId = scene.__sourceFeatureId();
  if (sourceId === undefined) throw new Error('fixture Scene has no source id');
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const recomputed = await engine.run(run.records, { paramTable: run.paramTable });
  if (recomputed.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    throw new Error(`fixture lowering failed: ${JSON.stringify(recomputed.diagnostics)}`);
  }
  const lowered = recomputed.shapes.get(sourceId);
  if (!isSceneBackend(lowered)) throw new Error('fixture source did not lower to SceneBackend');
  return { scene, lowered, run };
}

describe('sceneToConnectorManifest', () => {
  beforeAll(async () => { await initOcct(); });

  it('matches the STEP world frame for a real placed assembly part', async () => {
    const { scene, lowered, run } = await lowerRuntimeScene();

    expect(lowered.parts[0].worldTransform.point([1, 1, 1])).toEqual([1, 1, 1]);
    expect(sceneToWorldFrameParts(lowered)[0].shape.boundingBox().min).toEqual([10, 20, 30]);
    expect(sceneToConnectorManifest(
      scene,
      lowered,
      resolveParams(run.records, run.paramTable),
      { partId: 'servo', family: 'micro-servo' },
    )).toMatchObject({
      schemaVersion: 1,
      partId: 'servo',
      family: 'micro-servo',
      connectors: [{
        name: 'pwm-contact',
        type: 'frame',
        origin: [11, 21, 31],
        normal: [1, 0, 0],
      }],
    });
  });

  it('uses resolved ParamRef placements rather than their stale capture snapshots', () => {
    const fixture = makeFixture([{ id: 'servo-part', name: 'servo', connectors: [FRAME] }]);
    const part = fixture.records.find((record) => record.id === 'servo-part')!;
    const at = (part.metadata as { at: Vec3Param }).at;
    part.metadata = {
      ...part.metadata,
      at: {
        ...at,
        x: { expression: 'offset', unit: 'mm', evaluated: 0, paramRef: 'offset' },
      },
    };
    const table = new ParamTable();
    table.declare('offset', 'number', 40);

    const manifest = sceneToConnectorManifest(
      fixture.scene,
      fixture.lowered,
      resolveParams(fixture.records, table),
      { partId: 'servo', family: 'micro-servo' },
    );

    expect(manifest.connectors[0]).toMatchObject({ origin: [41, 1, 1] });
  });

  it('composes a non-identity SceneBackend world transform after the part placement', () => {
    const fixture = makeFixture([{
      id: 'servo-part',
      name: 'servo',
      at: [10, 20, 30],
      connectors: [FRAME, AXIS],
      worldTransform: Transform.translation(5, 6, 7),
    }]);

    expect(sceneToConnectorManifest(
      fixture.scene,
      fixture.lowered,
      fixture.records,
      { partId: 'servo', family: 'micro-servo' },
    )).toMatchObject({
      connectors: [
        { name: 'pwm-contact', type: 'frame', origin: [16, 27, 38], normal: [1, 0, 0] },
        { name: 'shaft', type: 'axis', origin: [16, 27, 38], axis: [0, 1, 0] },
      ],
    });
  });

  it('defaults omitted frame normals and axis directions to +Z', () => {
    const fixture = makeFixture([{
      id: 'servo-part',
      name: 'servo',
      connectors: [
        { name: 'frame-default', type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } },
        { name: 'axis-default', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] } },
      ],
    }]);

    expect(sceneToConnectorManifest(
      fixture.scene,
      fixture.lowered,
      fixture.records,
      { partId: 'servo', family: 'micro-servo' },
    ).connectors).toEqual([
      { name: 'frame-default', type: 'frame', origin: [0, 0, 0], normal: [0, 0, 1] },
      { name: 'axis-default', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
    ]);
  });

  it('uses source assembly part IDs instead of an unrelated same-named part', () => {
    const unrelatedPart = assemblyPartRecord({
      id: 'other-servo-part',
      name: 'servo',
      at: [900, 0, 0],
    });
    unrelatedPart.metadata = {
      ...unrelatedPart.metadata,
      assemblyName: 'unrelated',
    };
    const unrelatedModel: FeatureRecord = {
      id: 'other-model',
      kind: 'assemblyModel',
      params: {},
      inputs: { part_0: { kind: 'feature', id: 'other-servo-part' } },
      transforms: [],
      suppressed: false,
      metadata: { assemblyName: 'unrelated', partIds: ['other-servo-part'] },
    };
    const fixture = makeFixture([{
      id: 'source-servo-part',
      name: 'servo',
      at: [10, 0, 0],
      connectors: [FRAME],
    }], { extraRecords: [unrelatedPart, unrelatedModel] });

    const manifest = sceneToConnectorManifest(
      fixture.scene,
      fixture.lowered,
      fixture.records,
      { partId: 'servo', family: 'micro-servo' },
    );

    expect(manifest.connectors).toEqual([{
      name: 'pwm-contact', type: 'frame', origin: [11, 1, 1], normal: [1, 0, 0],
    }]);
  });

  it.each([
    ['duplicate connector names', () => makeFixture([
      { id: 'a', name: 'a', connectors: [{ ...FRAME, name: 'duplicate' }] },
      { id: 'b', name: 'b', connectors: [{ ...AXIS, name: 'duplicate' }] },
    ]), /duplicate connector/i],
    ['a topology connector origin', () => makeFixture([{
      id: 'servo-part', name: 'servo', connectors: [{
        ...FRAME,
        origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
      }],
    }]), /numeric Vec3/i],
    ['a planar connector', () => makeFixture([{
      id: 'servo-part', name: 'servo', connectors: [{
        name: 'plane', type: 'planar', origin: { kind: 'vec3', value: [0, 0, 0] }, normal: [0, 0, 1],
      }],
    }]), /frame or axis/i],
    ['a ball connector', () => makeFixture([{
      id: 'servo-part', name: 'servo', connectors: [{
        name: 'ball', type: 'ball', origin: { kind: 'vec3', value: [0, 0, 0] },
      }],
    }]), /frame or axis/i],
    ['source assembly mates', () => makeFixture([{
      id: 'servo-part', name: 'servo', connectors: [FRAME],
    }], { sourceMates: true, sceneMates: true }), /mate-free/i],
    ['a joint connected to source assembly parts', () => makeFixture([
      { id: 'a', name: 'a', connectors: [FRAME] },
      { id: 'b', name: 'b', connectors: [AXIS] },
    ], {
      extraRecords: [{
        id: 'joint', kind: 'assemblyJoint', params: {}, transforms: [], suppressed: false,
        inputs: { a: { kind: 'feature', id: 'a' }, b: { kind: 'feature', id: 'b' } },
        metadata: { assemblyName: 'target', jointName: 'hinge' },
      }],
    }), /joint-free/i],
  ] as const)('rejects %s', (_label, build, expected) => {
    const fixture = build();
    expect(() => sceneToConnectorManifest(
      fixture.scene,
      fixture.lowered,
      fixture.records,
      { partId: 'servo', family: 'micro-servo' },
    )).toThrow(expected);
  });

  it('does not confuse an unrelated assembly joint with a source-owned joint', () => {
    const unrelatedJoint: FeatureRecord = {
      id: 'unrelated-joint', kind: 'assemblyJoint', params: {}, transforms: [], suppressed: false,
      inputs: {
        a: { kind: 'feature', id: 'source-a' },
        b: { kind: 'feature', id: 'source-b' },
      },
      metadata: { assemblyName: 'unrelated', jointName: 'foreign-hinge' },
    };
    const fixture = makeFixture([
      { id: 'source-a', name: 'a', connectors: [FRAME] },
      { id: 'source-b', name: 'b', connectors: [AXIS] },
    ], { extraRecords: [unrelatedJoint] });

    expect(sceneToConnectorManifest(
      fixture.scene,
      fixture.lowered,
      fixture.records,
      { partId: 'servo', family: 'micro-servo' },
    ).connectors).toHaveLength(2);
  });

  it('rejects a source-owned joint even when only one endpoint is a source part', () => {
    const fixture = makeFixture([{
      id: 'source-part', name: 'servo', connectors: [FRAME],
    }], {
      extraRecords: [{
        id: 'source-joint', kind: 'assemblyJoint', params: {}, transforms: [], suppressed: false,
        inputs: {
          a: { kind: 'feature', id: 'source-part' },
          b: { kind: 'feature', id: 'outside-part' },
        },
        metadata: { assemblyName: 'target', jointName: 'cross-boundary' },
      }],
    });

    expect(() => sceneToConnectorManifest(
      fixture.scene,
      fixture.lowered,
      fixture.records,
      { partId: 'servo', family: 'micro-servo' },
    )).toThrow(/joint-free/i);
  });

  it('fails closed on a malformed resolved part placement', () => {
    const fixture = makeFixture([{ id: 'servo-part', name: 'servo', connectors: [FRAME] }]);
    const part = fixture.records.find((record) => record.id === 'servo-part')!;
    part.metadata = {
      ...part.metadata,
      at: { x: scalar(0), y: null, z: scalar(0) },
    };

    expect(() => sceneToConnectorManifest(
      fixture.scene,
      fixture.lowered,
      fixture.records,
      { partId: 'servo', family: 'micro-servo' },
    )).toThrow(/invalid resolved at placement/i);
  });

  it('fails closed when the source is solved, parts are ambiguous, or names disagree', () => {
    const fixture = makeFixture([{ id: 'servo-part', name: 'servo', connectors: [FRAME] }]);
    const source = fixture.records.find((record) => record.id === SOURCE_ID)!;
    const sourceAsSolved = fixture.records.map((record) => (
      record.id === SOURCE_ID ? { ...record, kind: 'solvedAssembly' as const } : record
    ));
    expect(() => sceneToConnectorManifest(
      fixture.scene, fixture.lowered, sourceAsSolved, { partId: 'servo', family: 'micro-servo' },
    )).toThrow(/assemblyModel/i);

    const part = fixture.records.find((record) => record.id === 'servo-part')!;
    expect(() => sceneToConnectorManifest(
      fixture.scene,
      fixture.lowered,
      [...fixture.records, { ...part }],
      { partId: 'servo', family: 'micro-servo' },
    )).toThrow(/ambiguous/i);

    const mismatchedBackend: SceneBackend = {
      ...fixture.lowered,
      parts: [{ ...fixture.lowered.parts[0], name: 'wrong-name' }],
    };
    expect(() => sceneToConnectorManifest(
      fixture.scene, mismatchedBackend, fixture.records, { partId: 'servo', family: 'micro-servo' },
    )).toThrow(/name agreement/i);
    expect(source.kind).toBe('assemblyModel');
  });
});

describe('connector manifest runtime and CLI integration', () => {
  beforeAll(async () => { await initOcct(); });
  afterEach(() => {
    process.exitCode = undefined;
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('returns a manifest from the exact SceneBackend used for STEP export', async () => {
    const result = await runAndExport({
      code: RUNTIME_CODE,
      fileName: 'runtime-manifest.kcad.ts',
      format: 'step',
      connectorManifest: { partId: 'servo', family: 'micro-servo' },
    });

    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.connectorManifest).toMatchObject({
      partId: 'servo', family: 'micro-servo',
      connectors: [{ name: 'pwm-contact', origin: [11, 21, 31] }],
    });
  });

  it('rejects manifest requests outside STEP Scene exports and mismatched feature ids', async () => {
    await expect(runAndExport({
      code: RUNTIME_CODE,
      fileName: 'runtime-manifest.kcad.ts',
      format: 'stl',
      connectorManifest: { partId: 'servo', family: 'micro-servo' },
    })).rejects.toThrow(/STEP/i);

    const run = await runScript({ code: RUNTIME_CODE, fileName: 'runtime-manifest.kcad.ts' });
    const boxId = run.records.find((record) => record.kind === 'box')!.id;
    await expect(runAndExport({
      code: RUNTIME_CODE,
      fileName: 'runtime-manifest.kcad.ts',
      format: 'step',
      feature_id: boxId,
      connectorManifest: { partId: 'servo', family: 'micro-servo' },
    })).rejects.toThrow(/source feature/i);
  });

  it('requires the three CLI manifest options as a STEP-only group', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await exportCommand().parseAsync(
        ['step', '/tmp/unused.kcad.ts', '-o', '/tmp/out.step', '--connector-manifest', '/tmp/out.json', '--manifest-part-id', 'servo'],
        { from: 'user' },
      );
      expect(process.exitCode).toBe(2);
      expect(err.mock.calls.flat().join('\n')).toMatch(/must be provided together/i);
      err.mockClear();
      process.exitCode = undefined;

      await exportCommand().parseAsync(
        ['stl', '/tmp/unused.kcad.ts', '-o', '/tmp/out.stl', '--connector-manifest', '/tmp/out.json', '--manifest-part-id', 'servo', '--manifest-family', 'micro-servo'],
        { from: 'user' },
      );
      expect(process.exitCode).toBe(2);
      expect(err.mock.calls.flat().join('\n')).toMatch(/STEP/i);
    } finally {
      err.mockRestore();
    }
  });

  it('validates the connector-manifest option group for direct exportScript callers', async () => {
    const incomplete = await exportScript({
      file: '/tmp/unused.kcad.ts',
      format: 'step',
      out: '/tmp/out.step',
      connectorManifest: '/tmp/out.json',
    });
    expect(incomplete.exitCode).toBe(2);
    expect(incomplete.diagnostics[0]?.message).toMatch(/must be provided together/i);

    const nonStep = await exportScript({
      file: '/tmp/unused.kcad.ts',
      format: 'stl',
      out: '/tmp/out.stl',
      connectorManifest: '/tmp/out.json',
      manifestPartId: 'servo',
      manifestFamily: 'micro-servo',
    });
    expect(nonStep.exitCode).toBe(2);
    expect(nonStep.diagnostics[0]?.message).toMatch(/STEP/i);
  });

  it('writes the requested manifest beside the STEP output through exportScript', async () => {
    const directory = temporaryDirectory('kcad-manifest-export-');
    const file = join(directory, 'servo.kcad.ts');
    const out = join(directory, 'servo.step');
    const manifestPath = join(directory, 'servo.connector-manifest.json');
    writeFileSync(file, RUNTIME_CODE);

    const result = await exportScript({
      file,
      format: 'step',
      out,
      connectorManifest: manifestPath,
      manifestPartId: 'servo',
      manifestFamily: 'micro-servo',
    });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(readFileSync(manifestPath, 'utf8'))).toMatchObject({
      partId: 'servo', family: 'micro-servo',
      connectors: [{ name: 'pwm-contact', origin: [11, 21, 31] }],
    });
  });

  it('rejects an existing manifest before it can overwrite the STEP output', async () => {
    const directory = temporaryDirectory('kcad-manifest-existing-');
    const file = join(directory, 'servo.kcad.ts');
    const out = join(directory, 'servo.step');
    const manifestPath = join(directory, 'servo.connector-manifest.json');
    writeFileSync(file, RUNTIME_CODE);
    writeFileSync(manifestPath, 'existing manifest');

    const result = await exportScript({
      file,
      format: 'step',
      out,
      connectorManifest: manifestPath,
      manifestPartId: 'servo',
      manifestFamily: 'micro-servo',
    });

    expect(result.exitCode).toBe(2);
    expect(result.bytesWritten).toBe(0);
    expect(readFileSync(manifestPath, 'utf8')).toBe('existing manifest');
    expect(existsSync(out)).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('cli.invalid-args');
  });

  it('rejects an insecure manifest parent before writing the STEP output', async () => {
    const directory = temporaryDirectory('kcad-manifest-insecure-parent-');
    const file = join(directory, 'servo.kcad.ts');
    const out = join(directory, 'servo.step');
    const manifestPath = join(directory, 'servo.connector-manifest.json');
    writeFileSync(file, RUNTIME_CODE);
    chmodSync(directory, 0o777);

    const result = await exportScript({
      file,
      format: 'step',
      out,
      connectorManifest: manifestPath,
      manifestPartId: 'servo',
      manifestFamily: 'micro-servo',
    });

    expect(result.exitCode).toBe(2);
    expect(result.bytesWritten).toBe(0);
    expect(existsSync(out)).toBe(false);
    expect(existsSync(manifestPath)).toBe(false);
    expect(result.diagnostics[0]?.message).toMatch(/must not be writable by group or other users/i);
  });

  it('rejects symlink and hard-link aliases before a manifest can overwrite the STEP output', async () => {
    const directory = temporaryDirectory('kcad-manifest-alias-');
    const realDirectory = join(directory, 'real');
    const aliasDirectory = join(directory, 'alias');
    const scriptPath = join(directory, 'servo.kcad.ts');
    mkdirSync(realDirectory);
    symlinkSync(realDirectory, aliasDirectory);
    writeFileSync(scriptPath, RUNTIME_CODE);

    const stepPath = join(realDirectory, 'servo.step');
    const symlinkAliasResult = await exportScript({
      file: scriptPath,
      format: 'step',
      out: stepPath,
      connectorManifest: join(aliasDirectory, 'servo.step'),
      manifestPartId: 'servo',
      manifestFamily: 'micro-servo',
    });
    expect(symlinkAliasResult.exitCode).toBe(2);
    expect(existsSync(stepPath)).toBe(false);

    const hardLinkStepPath = join(directory, 'hard-link.step');
    const hardLinkManifestPath = join(directory, 'hard-link.json');
    writeFileSync(hardLinkStepPath, 'existing STEP bytes');
    linkSync(hardLinkStepPath, hardLinkManifestPath);
    const hardLinkAliasResult = await exportScript({
      file: scriptPath,
      format: 'step',
      out: hardLinkStepPath,
      connectorManifest: hardLinkManifestPath,
      manifestPartId: 'servo',
      manifestFamily: 'micro-servo',
    });
    expect(hardLinkAliasResult.exitCode).toBe(2);
    expect(readFileSync(hardLinkStepPath, 'utf8')).toBe('existing STEP bytes');
  });

  it.each(['hard link', 'symbolic link'] as const)(
    'rejects a late %s manifest destination without following the STEP inode',
    async (aliasKind) => {
      const directory = temporaryDirectory('kcad-manifest-late-alias-');
      const stepPath = join(directory, 'servo.step');
      const manifestPath = join(directory, 'servo.connector-manifest.json');
      const stepBytes = Buffer.from('STEP bytes that must survive');
      const manifestContents = '{\n  "partId": "servo"\n}\n';
      writeFileSync(stepPath, stepBytes);

      // Model an alias created after exportScript's post-STEP check but before
      // the sidecar writer opens its destination.
      if (aliasKind === 'hard link') linkSync(stepPath, manifestPath);
      else symlinkSync(stepPath, manifestPath);

      await expect(writeManifestSidecarAtomically(manifestPath, manifestContents))
        .rejects.toMatchObject({ code: 'EEXIST' });

      expect(readFileSync(stepPath)).toEqual(stepBytes);
      expect(readFileSync(manifestPath)).toEqual(stepBytes);
    },
  );
});

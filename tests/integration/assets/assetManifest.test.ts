import { afterEach, describe, expect, it } from 'vitest';
import { createModelingApi } from '../../../src/modeling/api';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { callMcpTool, getToolDefinition } from '../../../src/agent/mcp/toolRegistry';
import { clearActiveMcpSession, setActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import {
  AssetManifestSchema,
  AssetMetadataSchema,
  AssetPresetsSchema,
} from '../../../src/shared/assets/assetSchema';
import { emitParamsJson } from '../../../src/shared/assets/emitParamsJson';
import type { ShapeBackend } from '../../../src/kernel/backends/backend';
import type { SolvedRigAssembly } from '../../../src/kernel/export/rigHierarchy';
import { Transform } from '../../../src/shared/runtime/se3';

afterEach(() => clearActiveMcpSession());

describe('versioned asset schemas', () => {
  it('defaults asset-content licensing to CC-BY-4.0, independently of package licensing', () => {
    expect(AssetMetadataSchema.parse({ name: 'Bracket' })).toMatchObject({
      schemaVersion: 1,
      license: 'CC-BY-4.0',
    });
  });

  it('rejects licenses outside the SPDX allowlist, including GPL and AGPL', () => {
    expect(() => AssetMetadataSchema.parse({ name: 'Bracket', license: 'GPL-3.0-only' })).toThrow();
    expect(() => AssetMetadataSchema.parse({ name: 'Bracket', license: 'AGPL-3.0-only' })).toThrow();
  });

  it('validates and versions the metadata, parameter values, and presets envelope', () => {
    const manifest = AssetManifestSchema.parse({
      meta: { schemaVersion: 1, name: 'Bracket', license: 'CC-BY-4.0' },
      params: { width: 40 },
      presets: [{ schemaVersion: 1, name: 'Compact', params: { width: 30 } }],
    });
    expect(manifest.params).toEqual({ width: 40 });
    expect(manifest.presets[0].params).toEqual({ width: 30 });
  });

  it('validates the optional mate-derived rig metadata in an asset manifest', () => {
    const manifest = AssetManifestSchema.parse({
      meta: { schemaVersion: 1, name: 'Hinged box', license: 'CC-BY-4.0' },
      params: {},
      presets: [],
      rig: { lid: { type: 'rotate', axis: 'z', range: [0, 110], node: 'pivot:lid' } },
      rigWarnings: [],
    });
    expect(manifest.rig?.lid).toMatchObject({ type: 'rotate', range: [0, 110] });
  });

  it('rejects a preset whose values are not JSON primitives', () => {
    expect(() => AssetPresetsSchema.parse({ broken: { width: { nested: true } } })).toThrow();
  });

  it('emits the evaluated value when present and the declared default when absent', () => {
    expect(emitParamsJson([
      { name: 'changed', value: 7, defaultValue: 5 },
      { name: 'fallback', value: undefined as never, defaultValue: 3 },
    ])).toBe(`{
  "changed": 7,
  "fallback": 3
}\n`);
  });

  it('emits a version-compatible params document envelope when rig metadata is supplied', () => {
    expect(JSON.parse(emitParamsJson([
      { name: 'width', value: 40, defaultValue: 40 },
    ], { rig: { lid: { type: 'rotate', axis: 'z', range: [0, 90], node: 'pivot:lid' } } }))).toEqual({
      params: { width: 40 },
      rig: { lid: { type: 'rotate', axis: 'z', range: [0, 90], node: 'pivot:lid' } },
    });
  });
});

describe('asset declarations and manifest tool', () => {
  it('captures typed batch params with metadata while retaining numeric and boolean shorthand', () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const knobs = api.params({
      width: { default: 40, min: 20, max: 80, unit: 'mm' },
      enabled: { default: true, description: 'Enable the port' },
      finish: { default: 'matte', choices: ['matte', 'gloss'] },
      legacyNumber: 12,
      legacyBoolean: false,
    });

    expect(knobs.width._brand).toBe('ParamRef');
    expect(knobs.finish._type).toBe('choice');
    expect(knobs.finish.value).toBe('matte');
    expect(session.paramTable.get('width')).toMatchObject({
      type: 'number', value: 40, defaultValue: 40, meta: { min: 20, max: 80, unit: 'mm' },
    });
    expect(session.paramTable.get('finish')).toMatchObject({
      type: 'choice', value: 'matte', defaultValue: 'matte', meta: { choices: ['matte', 'gloss'] },
    });
    expect(session.paramTable.get('legacyBoolean').value).toBe(false);
  });

  it('captures metadata and presets on the session and emits deterministic current params', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    api.params({ width: { default: 40, min: 10, max: 80 }, label: { default: 'KCAD' } });
    api.meta({ name: 'Parametric bracket', description: 'A configurable bracket.' });
    api.presets({ Compact: { width: 25 }, Wide: { width: 60, label: 'Wide bracket' } });

    expect(emitParamsJson(session.paramTable.list())).toBe(`{
  "label": "KCAD",
  "width": 40
}\n`);

    setActiveMcpSession({ session });
    const manifest = await callMcpTool('asset_manifest', {}) as {
      meta: { license: string; name: string };
      params: Record<string, unknown>;
      presets: Array<{ name: string; params: Record<string, unknown> }>;
    };
    expect(manifest.meta).toMatchObject({ name: 'Parametric bracket', license: 'CC-BY-4.0' });
    expect(manifest.params).toEqual({ label: 'KCAD', width: 40 });
    expect(manifest.presets.map(preset => preset.name)).toEqual(['Compact', 'Wide']);
    expect(manifest.presets[0].params).toEqual({ width: 25 });
    expect(AssetManifestSchema.safeParse(manifest).success).toBe(true);
  });

  it('mirrors solved assembly rig metadata into the asset manifest and params JSON helper', async () => {
    const rig: SolvedRigAssembly = {
      groundedPart: 'base',
      parts: [
        { name: 'base', worldTransform: Transform.identity().toMat4() },
        { name: 'lid', worldTransform: Transform.translation(10, 0, 0).toMat4() },
      ],
      mates: [{ name: 'lid', type: 'revolute', a: 'base.hinge', b: 'lid.hinge', limitsDeg: [0, 90] }],
      connectorsByPartName: {
        base: [{ name: 'hinge', type: 'axis', origin: [10, 0, 0], axis: [0, 0, 1] }],
        lid: [{ name: 'hinge', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] }],
      },
    };
    const sceneBackend = {
      target: 'export-occt',
      assemblyName: 'manifest rig',
      parts: [],
      rig,
      _kind: 'scene',
    } as const;
    setActiveMcpSession({ session: new CaptureSession(), rootShape: sceneBackend as unknown as ShapeBackend });

    const manifest = await callMcpTool('asset_manifest', {}) as {
      rig?: Record<string, unknown>;
      rigWarnings?: string[];
    };
    expect(manifest.rig?.lid).toMatchObject({
      type: 'rotate', axis: 'z', range: [0, 90], node: 'pivot:lid',
    });
    expect(manifest.rigWarnings).toEqual([]);
    expect(AssetManifestSchema.safeParse(manifest).success).toBe(true);
  });

  it('rejects preset overrides that do not resolve to valid declared knobs', () => {
    const api = createModelingApi({ session: new CaptureSession() });
    api.params({ width: { default: 40, min: 10, max: 80 } });
    expect(() => api.presets({ Unknown: { depth: 20 } })).toThrow(/undeclared param 'depth'/);
    expect(() => api.presets({ OutOfRange: { width: 100 } })).toThrow();
  });

  it('returns a valid empty manifest before a model has been evaluated', async () => {
    const manifest = await callMcpTool('asset_manifest', {}) as {
      meta: { license: string };
      params: Record<string, unknown>;
      presets: unknown[];
    };
    expect(manifest).toMatchObject({ meta: { license: 'CC-BY-4.0' }, params: {}, presets: [] });
    expect(AssetManifestSchema.safeParse(manifest).success).toBe(true);
  });

  it('marks asset_manifest as a read-only MCP tool', () => {
    expect(getToolDefinition('asset_manifest')?.annotations).toMatchObject({
      title: 'List Asset Manifest',
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    });
  });
});

describe('catalog metadata fields', () => {
  it('accepts kit, category, origin, compat and triangle budget', () => {
    expect(AssetMetadataSchema.parse({
      name: 'park-bench',
      kit: 'city-street',
      category: 'furniture',
      origin: 'base',
      compat: ['grid-1m', 'street'],
      triangleBudget: 400,
    })).toMatchObject({ kit: 'city-street', category: 'furniture', compat: ['grid-1m', 'street'], triangleBudget: 400 });
  });

  it('rejects non-slug kits, unknown categories and non-positive budgets', () => {
    expect(() => AssetMetadataSchema.parse({ kit: 'City Street' })).toThrow();
    expect(() => AssetMetadataSchema.parse({ category: 'spaceship' })).toThrow();
    expect(() => AssetMetadataSchema.parse({ triangleBudget: 0 })).toThrow();
  });
});

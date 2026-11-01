// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  TOOL_REGISTRY,
  TOOLS,
  callMcpTool,
  getToolDefinition,
  runClosedLoop,
  buildRepairPrompt,
  defaultBuildRepairPrompt,
  type McpToolDefinition,
} from './toolRegistry';
import { catalogToolEntries } from './registry/catalogTools';
import { coreRuntimeParameterToolEntries, coreRuntimePreludeToolEntries } from './registry/coreRuntimeTools';
import { geometryAuthoringToolEntries } from './registry/geometryAuthoringTools';
import { feaToolEntries } from './registry/feaTools';
import { drawingImportToolEntries } from './registry/drawingImportTools';
import { geometryDiffToolEntries } from './registry/geometryDiffTools';
import { inspectionVerificationPreludeToolEntries, inspectionVerificationQueryToolEntries, inspectionVerificationRepairToolEntries } from './registry/inspectionVerificationTools';
import { printToolEntries } from './registry/printTools';
import { referenceExportToolEntries } from './registry/referenceExportTools';
import { referenceLedgerToolEntries } from './registry/referenceLedgerTools';
import { reviewPipelineToolEntries } from './registry/reviewPipelineTools';
import { sketchAssemblyToolEntries } from './registry/sketchAssemblyTools';
import { mechanismSimToolEntries } from './registry/mechanismSimTools';
import { meshReconstructToolEntries } from './registry/meshReconstructTools';
import { cookbookExecutionToolEntries } from './registry/cookbookExecutionTools';
import { importToolEntries } from './registry/importTools';
import { manufacturingToolEntries } from './registry/manufacturingTools';
import { nurbsToolEntries } from './registry/nurbsTools';
import { rayPickToolEntries } from './registry/rayPickTools';
import { surfaceBlendToolEntries } from './registry/surfaceBlendTools';
import { pointCloudToolEntries } from './registry/pointCloudTools';
import { cfdToolEntries } from './registry/cfdTools';
import { blockoutToolEntries } from './registry/blockoutTools';
import { meshBooleanToolEntries } from './registry/meshBooleanTools';
import { explodeViewToolEntries } from './registry/explodeViewTools';
import { assetManifestToolEntries } from './registry/assetManifestTools';
import { assetCatalogToolEntries } from './registry/assetCatalogTools';

const EXPECTED_TOOL_NAMES = [
  'evaluate_script',
  'diff_scripts',
  'inspect',
  'verify',
  'why_did_this_fail',
  'set_param',
  'add_feature',
  'add_surface',
  'add_curve',
  'add_path_segment',
  'trace_from_image',
  'add_variable_sweep',
  'add_text',
  'project_curve',
  'add_pattern_feature',
  'remove_feature',
  'query',
  'lookup_api',
  'lookup_diagnostics',
  'export',
  'lookup_cookbook',
  'find_part',
  'fetch_part',
  'solve_sketch',
  'add_constraint',
  'add_part',
  'add_connector',
  'add_mate',
  'add_workspace_target',
  'set_scene_return',
  'solve_mates',
  'review_cad',
  'design_loop',
  'flatten_pattern',
  'evaluate_sdf',
  'capture_animation',
  'render_preview',
  'resolve_assumptions',
  'run_fea',
  'fea_summary',
  'send_to_printer',
  'repair_script',
  'sweep_tolerance',
  // Tail-appended: a new tool goes on the END so kernelCAD-server's
  // index-based consumption of the historical order keeps working.
  'diff_geometry',
  'drawing_to_cad',
  'mesh_to_features',
  'execute_cookbook',
  'get_selection',
  'set_selection',
  'import_step',
  'dfm_review',
  'ray_pick',
  'inspect_nurbs',
  'fit_plane',
  'mesh_boolean',
  'explode_view',
  'apply_surface_blend',
  'blockout_assembly',
  'asset_manifest',
  'search_assets',
  'get_asset',
  'find_matching',
  'get_variant',
  'list_kits',
  'get_kit',
  'run_cfd',
  'cfd_summary',
] as const;

const PUBLIC_CONTRACT_FIXTURE = new URL(
  '../../../tests/fixtures/mcp/toolRegistry.publicContract.json',
  import.meta.url,
);
const SCENE_SUMMARY_FIXTURE = new URL(
  '../../../tests/fixtures/mcp/sceneSummary.schema.json',
  import.meta.url,
);
const TOOL_REGISTRY_SOURCE = new URL('./toolRegistry.ts', import.meta.url);

function serializedPublicTools(): unknown {
  return JSON.parse(JSON.stringify(TOOLS));
}

describe('toolRegistry public contract', () => {
  // 'lookup_api' is a stable, always-registered tool used as a contract anchor below.
  // If you rename or remove it, update the references in this file.
  it('exports TOOL_REGISTRY as a non-empty array of entries with definition+handler', () => {
    expect(Array.isArray(TOOL_REGISTRY)).toBe(true);
    expect(TOOL_REGISTRY.length).toBeGreaterThan(0);
    for (const entry of TOOL_REGISTRY) {
      expect(typeof entry.definition.name).toBe('string');
      expect(typeof entry.definition.description).toBe('string');
      expect(entry.definition.inputSchema.type).toBe('object');
      expect(typeof entry.handler).toBe('function');
    }
  });

  it('exports TOOLS as a flat definitions array matching TOOL_REGISTRY length', () => {
    expect(TOOLS.length).toBe(TOOL_REGISTRY.length);
    for (let i = 0; i < TOOLS.length; i++) {
      expect(TOOLS[i].name).toBe(TOOL_REGISTRY[i].definition.name);
    }
  });

  it('every tool parameter declares a JSON Schema type', () => {
    // Directory reviewers (Anthropic, OpenAI) reject parameters without a type;
    // a union is fine as a type array or an anyOf/oneOf composition.
    const offenders: string[] = [];
    const walk = (toolName: string, schema: unknown, prefix: string): void => {
      if (!schema || typeof schema !== 'object') return;
      const node = schema as { properties?: Record<string, unknown>; items?: unknown };
      for (const [name, raw] of Object.entries(node.properties ?? {})) {
        const prop = (raw ?? {}) as { type?: unknown; anyOf?: unknown; oneOf?: unknown; $ref?: unknown; const?: unknown };
        const typed = prop.type !== undefined || prop.anyOf !== undefined || prop.oneOf !== undefined || prop.$ref !== undefined || prop.const !== undefined;
        if (!typed) offenders.push(`${toolName}.${prefix}${name}`);
        walk(toolName, prop, `${prefix}${name}.`);
      }
      walk(toolName, node.items, `${prefix}[].`);
    };
    for (const entry of TOOL_REGISTRY) walk(entry.definition.name, entry.definition.inputSchema, '');
    expect(offenders).toEqual([]);
  });

  it('keeps the public tool order stable', () => {
    expect(TOOL_REGISTRY.map(entry => entry.definition.name)).toEqual(EXPECTED_TOOL_NAMES);
    expect(TOOLS.map(tool => tool.name)).toEqual(EXPECTED_TOOL_NAMES);
  });

  it('keeps merged public tool metadata stable', () => {
    // Resolve only this fixture's local reference; production schemas stay inline.
    const sceneSummary = JSON.parse(readFileSync(SCENE_SUMMARY_FIXTURE, 'utf8'));
    const fixture = JSON.parse(readFileSync(PUBLIC_CONTRACT_FIXTURE, 'utf8'), (_key, value: unknown) => {
      if (value !== null && typeof value === 'object'
        && '$ref' in value && value.$ref === './sceneSummary.schema.json') return sceneSummary;
      return value;
    });
    expect(serializedPublicTools()).toEqual(fixture);
  });

  it('keeps toolRegistry as the composition and dispatch boundary', () => {
    expect(readFileSync(TOOL_REGISTRY_SOURCE, 'utf8')).not.toContain('definition: {');
  });

  it('composes core runtime tools from the core runtime registry module', () => {
    const names = [...coreRuntimePreludeToolEntries, ...coreRuntimeParameterToolEntries].map(entry => entry.definition.name);

    expect(names).toEqual(['evaluate_script', 'diff_scripts', 'set_param']);
    expect(TOOL_REGISTRY.slice(0, 2)).toEqual(coreRuntimePreludeToolEntries);
    expect(TOOL_REGISTRY[5]).toEqual(coreRuntimeParameterToolEntries[0]);
  });

  it('composes inspection and verification tools from the inspection verification registry module', () => {
    const names = [
      ...inspectionVerificationPreludeToolEntries,
      ...inspectionVerificationQueryToolEntries,
      ...inspectionVerificationRepairToolEntries,
    ].map(entry => entry.definition.name);

    expect(names).toEqual(['inspect', 'verify', 'why_did_this_fail', 'query', 'repair_script']);
    expect(TOOL_REGISTRY.slice(2, 5)).toEqual(inspectionVerificationPreludeToolEntries);
    expect(TOOL_REGISTRY[16]).toEqual(inspectionVerificationQueryToolEntries[0]);
    expect(TOOL_REGISTRY[41]).toEqual(inspectionVerificationRepairToolEntries[0]);
  });

  it('composes reference and export tools from the reference export registry module', () => {
    const names = referenceExportToolEntries.map(entry => entry.definition.name);

    expect(names).toEqual(['lookup_api', 'lookup_diagnostics', 'export']);
    expect(TOOL_REGISTRY.slice(17, 20)).toEqual(referenceExportToolEntries);
  });

  it('wires the moved core runtime handlers through the public dispatcher', async () => {
    const evalResult = await callMcpTool('evaluate_script', {
      code: 'return box(10, 10, 10);',
      dryRun: true,
    });
    expect(evalResult).toMatchObject({ ok: true, dryRun: true, featureCount: 1 });

    const diffResult = await callMcpTool('diff_scripts', {});
    expect(diffResult).toMatchObject({
      ok: false,
      side: 'base',
      errorCode: 'cli.invalid-args',
    });

    const setParamResult = await callMcpTool('set_param', {
      code: "const width = param('width', 1);\nreturn box(width, 1, 1);",
      param_name: 'missing',
      new_value: 2,
    });
    expect(setParamResult).toMatchObject({ ok: false });
    expect((setParamResult as { error?: string }).error).toContain('missing');
  });

  it('wires the moved inspection and verification handlers through the public dispatcher', async () => {
    await expect(callMcpTool('inspect', { of: 'nope' })).rejects.toThrow(
      /Unknown inspect subject: nope/,
    );

    await expect(callMcpTool('verify', { check: 'nope' })).rejects.toThrow(
      /Unknown verify check: nope/,
    );

    const whyResult = await callMcpTool('why_did_this_fail', {
      code: 'return box(10, 10, 10);',
    });
    expect(whyResult).toMatchObject({
      ok: true,
      chain: [{ feature_id: 'box_1', kind: 'box', health: 'healthy' }],
    });

    await expect(callMcpTool('query', { mode: 'nope' })).resolves.toMatchObject({
      ok: false,
      errorCode: 'cli.invalid-args',
      error: expect.stringMatching(/unknown mode "nope"/),
    });
  });

  it('wires the moved reference and export handlers through the public dispatcher', async () => {
    const apiResult = await callMcpTool('lookup_api', {});
    expect((apiResult as { globals?: Array<{ name: string }> }).globals).toContainEqual(
      expect.objectContaining({ name: 'box' }),
    );

    const diagnosticResult = await callMcpTool('lookup_diagnostics', {});
    expect((diagnosticResult as { codes?: Array<{ code: string }> }).codes).toContainEqual(
      expect.objectContaining({ code: 'cli.invalid-args' }),
    );

    await expect(callMcpTool('export', { target: 'nope' })).rejects.toThrow(
      /Unknown export target: nope/,
    );
  });

  it('composes catalog tools from the catalog registry module', () => {
    const names = catalogToolEntries.map(entry => entry.definition.name);

    expect(names).toEqual(['lookup_cookbook', 'find_part', 'fetch_part']);
    expect(TOOL_REGISTRY.slice(20, 23)).toEqual(catalogToolEntries);
  });

  it('composes geometry-authoring tools from the geometry registry module', () => {
    const names = geometryAuthoringToolEntries.map(entry => entry.definition.name);

    expect(names).toEqual([
      'add_feature',
      'add_surface',
      'add_curve',
      'add_path_segment',
      'trace_from_image',
      'add_variable_sweep',
      'add_text',
      'project_curve',
      'add_pattern_feature',
      'remove_feature',
    ]);
    expect(TOOL_REGISTRY.slice(6, 16)).toEqual(geometryAuthoringToolEntries);
  });

  it('composes sketch and assembly authoring tools from the sketch assembly registry module', () => {
    const names = sketchAssemblyToolEntries.map(entry => entry.definition.name);

    expect(names).toEqual([
      'solve_sketch',
      'add_constraint',
      'add_part',
      'add_connector',
      'add_mate',
      'add_workspace_target',
      'set_scene_return',
      'solve_mates',
    ]);
    expect(TOOL_REGISTRY.slice(23, 31)).toEqual(sketchAssemblyToolEntries);
  });

  it('composes review and rendering pipeline tools from the review pipeline registry module', () => {
    const names = reviewPipelineToolEntries.map(entry => entry.definition.name);

    expect(names).toEqual([
      'review_cad',
      'design_loop',
      'flatten_pattern',
      'evaluate_sdf',
      'capture_animation',
      'render_preview',
    ]);
    expect(TOOL_REGISTRY.slice(31, 37)).toEqual(reviewPipelineToolEntries);
  });

  it('appends the reference-ledger tools at the tail of TOOL_REGISTRY', () => {
    // New tool families are always appended at the very end — never inserted
    // into an existing family — because TOOL_REGISTRY order is a public
    // contract kernelCAD-server consumes. This asserts the tail, leaving
    // every earlier family's slice index untouched.
    const names = referenceLedgerToolEntries.map(entry => entry.definition.name);

    expect(names).toEqual(['resolve_assumptions']);
    expect(TOOL_REGISTRY.slice(37, 38)).toEqual(referenceLedgerToolEntries);
  });

  it('composes the structural-FEA tools last, so existing tool indices never shift', () => {
    const names = feaToolEntries.map(entry => entry.definition.name);

    expect(names).toEqual(['run_fea', 'fea_summary']);
    expect(TOOL_REGISTRY.slice(38, 40)).toEqual(feaToolEntries);
  });

  it('composes the send_to_printer tool from the print registry module, appended last', () => {
    expect(printToolEntries.map(entry => entry.definition.name)).toEqual(['send_to_printer']);
    expect(TOOL_REGISTRY.slice(40, 41)).toEqual(printToolEntries);
  });

  it('composes the mechanism-sim tail slice from the mechanism-sim registry module', () => {
    const names = mechanismSimToolEntries.map(entry => entry.definition.name);

    expect(names).toEqual(['sweep_tolerance']);
    expect(TOOL_REGISTRY.slice(42, 43)).toEqual(mechanismSimToolEntries);
  });

  it('composes the geometry diff family at the registry tail, after every pre-existing family', () => {
    const names = geometryDiffToolEntries.map(entry => entry.definition.name);

    expect(names).toEqual(['diff_geometry']);
    expect(TOOL_REGISTRY.slice(43, 44)).toEqual(geometryDiffToolEntries);
  });

  it('composes the drawing-import family at the registry tail, after every pre-existing family', () => {
    const names = drawingImportToolEntries.map(entry => entry.definition.name);

    expect(names).toEqual(['drawing_to_cad']);
    expect(TOOL_REGISTRY.slice(44, 45)).toEqual(drawingImportToolEntries);
  });

  it('composes the mesh reconstruction family at the registry tail, after the drawing-import family', () => {
    const names = meshReconstructToolEntries.map(entry => entry.definition.name);

    expect(names).toEqual(['mesh_to_features']);
    expect(TOOL_REGISTRY.slice(45, 46)).toEqual(meshReconstructToolEntries);
  });

  it('composes the cookbook-execution family at the registry tail, after mesh reconstruction', () => {
    const names = cookbookExecutionToolEntries.map(entry => entry.definition.name);

    expect(names).toEqual(['execute_cookbook']);
    expect(TOOL_REGISTRY.slice(46, 47)).toEqual(cookbookExecutionToolEntries);
  });

  it('keeps the historical entries stable and appends new families in merge order', () => {
    expect(TOOL_REGISTRY.slice(37).map(entry => entry.definition.name)).toEqual([
      'resolve_assumptions',
      'run_fea',
      'fea_summary',
      'send_to_printer',
      'repair_script',
      'sweep_tolerance',
      'diff_geometry',
      'drawing_to_cad',
      'mesh_to_features',
      'execute_cookbook',
      'get_selection',
      'set_selection',
      'import_step',
      'dfm_review',
      'ray_pick',
      'inspect_nurbs',
      'fit_plane',
      'mesh_boolean',
      'explode_view',
       'apply_surface_blend',
       'blockout_assembly',
       'asset_manifest',
       'search_assets',
       'get_asset',
       'find_matching',
       'get_variant',
       'list_kits',
       'get_kit',
       'run_cfd',
       'cfd_summary',
     ]);
    expect(TOOL_REGISTRY).toHaveLength(67);
  });

  it('composes the user-file import family at the registry tail, with ChatGPT file params', () => {
    expect(importToolEntries.map(entry => entry.definition.name)).toEqual(['import_step']);
    expect(TOOL_REGISTRY.slice(49, 50)).toEqual(importToolEntries);
    expect(getToolDefinition('import_step')?._meta).toEqual({ 'openai/fileParams': ['upload'] });
  });
  it('composes the manufacturability review family at the registry tail', () => {
    expect(manufacturingToolEntries.map(entry => entry.definition.name)).toEqual(['dfm_review']);
    expect(TOOL_REGISTRY.slice(50, 51)).toEqual(manufacturingToolEntries);
  });
  it('composes ray picking before NURBS inspection at the registry tail', () => {
    expect(TOOL_REGISTRY.slice(51, 52).map(entry => entry.definition.name)).toEqual(['ray_pick']);
    expect(nurbsToolEntries.map(entry => entry.definition.name)).toEqual(['inspect_nurbs']);
    expect(TOOL_REGISTRY.slice(52, 53)).toEqual(nurbsToolEntries);
    expect(TOOL_REGISTRY.slice(53, 54)).toEqual(pointCloudToolEntries);
  });

  it('composes ray picking at the registry tail', () => {
    expect(TOOL_REGISTRY.slice(51, 52).map(entry => entry.definition.name)).toEqual(['ray_pick']);
  });
  it('composes the point-cloud analysis family before mesh boolean', () => {
    expect(TOOL_REGISTRY.slice(53, 54)).toEqual(pointCloudToolEntries);
  });

  it('dispatches plane fitting through the MCP registry', async () => {
    await expect(callMcpTool('fit_plane', { points: [[0, 0, 0], [1, 0, 0], [0, 1, 0]] }))
      .resolves.toMatchObject({ normal: [0, 0, 1], rms: 0 });
  });

  it('composes ray picking from the ray-pick registry module', () => {
    expect(rayPickToolEntries.map(entry => entry.definition.name)).toEqual(['ray_pick']);
    expect(TOOL_REGISTRY.slice(51, 52)).toEqual(rayPickToolEntries);
  });

  it('composes ray picking at the registry tail', () => {
    expect(rayPickToolEntries.map(entry => entry.definition.name)).toEqual(['ray_pick']);
    expect(TOOL_REGISTRY.slice(51, 52)).toEqual(rayPickToolEntries);
  });
  it('appends the mesh boolean tool after the point-cloud family', async () => {
    expect(meshBooleanToolEntries.map(entry => entry.definition.name)).toEqual(['mesh_boolean']);
    expect(TOOL_REGISTRY.slice(54, 55)).toEqual(meshBooleanToolEntries);
    await expect(callMcpTool('mesh_boolean', { operation: 'bad' })).resolves.toMatchObject({ ok: false });
  });

  it('appends the exploded-view planner after the mesh boolean tool', () => {
    expect(explodeViewToolEntries.map(entry => entry.definition.name)).toEqual(['explode_view']);
    expect(TOOL_REGISTRY.slice(55, 56)).toEqual(explodeViewToolEntries);
    expect(TOOL_REGISTRY[55]?.definition.name).toBe('explode_view');
  });

  it('appends the surface blend authoring tool before the blockout tool', () => {
    expect(TOOL_REGISTRY.slice(56, 57)).toEqual(surfaceBlendToolEntries);
  });

  it('appends the generic blockout assembly generator at the registry tail', () => {
    expect(blockoutToolEntries.map(entry => entry.definition.name)).toEqual(['blockout_assembly']);
    expect(TOOL_REGISTRY.slice(-10, -9)).toEqual(blockoutToolEntries);
    expect(blockoutToolEntries[0].definition.description).toMatch(/^Use this when /);
  });

  it('appends the read-only asset manifest tool after the historical blockout tail', () => {
    expect(assetManifestToolEntries.map(entry => entry.definition.name)).toEqual(['asset_manifest']);
    expect(TOOL_REGISTRY.slice(-9, -8)).toEqual(assetManifestToolEntries);
  });

  it('appends the read-only asset catalog family before the CFD tail', () => {
    expect(TOOL_REGISTRY.slice(-assetCatalogToolEntries.length - cfdToolEntries.length, -cfdToolEntries.length)).toEqual(assetCatalogToolEntries);
    expect(assetCatalogToolEntries.map(entry => entry.definition.name)).toEqual([
      'search_assets', 'get_asset', 'find_matching', 'get_variant', 'list_kits', 'get_kit',
    ]);
  });

  it('appends the CFD family (run_cfd, cfd_summary) at the registry tail', () => {
    expect(cfdToolEntries.map(entry => entry.definition.name)).toEqual(['run_cfd', 'cfd_summary']);
    expect(TOOL_REGISTRY.slice(-cfdToolEntries.length)).toEqual(cfdToolEntries);
    expect(cfdToolEntries[0].definition.description).toMatch(/^Use this when /);
  });

  it('exports callMcpTool that dispatches by name and returns a result', async () => {
    const result = await callMcpTool('lookup_api', {});
    expect(result).toBeDefined();
  });

  it('does not expose commercial fabrication or supplier checks', async () => {
    expect(getToolDefinition('fab_pack')).toBeUndefined();
    expect(getToolDefinition('dfm_preflight')).toBeUndefined();
    await expect(callMcpTool('fab_pack', {})).rejects.toThrow();
    const checks = getToolDefinition('verify')?.inputSchema.properties?.check as { enum: string[] };
    expect(checks.enum).toContain('dfm');
    expect(checks.enum).not.toContain('dfm-preflight');
    const formats = getToolDefinition('export')?.inputSchema.properties?.format as { enum: string[] };
    expect(formats.enum).toContain('step');
    expect(formats.enum).not.toContain('order-pack');
  });

  it('exports callMcpTool that throws on unknown tool name', async () => {
    await expect(callMcpTool('nonexistent_tool_xyz', {})).rejects.toThrow();
  });

  it('exports getToolDefinition(name) returning the definition or undefined', () => {
    const def = getToolDefinition('lookup_api');
    expect(def).toBeDefined();
    expect(def?.name).toBe('lookup_api');
    expect(getToolDefinition('nonexistent_tool_xyz')).toBeUndefined();
  });

  it('type McpToolDefinition is exported and compatible with getToolDefinition return', () => {
    // Assignment compiles only if McpToolDefinition matches the returned shape.
    const def: McpToolDefinition | undefined = getToolDefinition('lookup_api');
    expect(def).toBeDefined();
  });

  it('exposes the closed-loop seam the hosted server consumes', () => {
    // The kernelCAD-server orchestrator imports these from this public entry.
    // Keep them exported so the hosted generation loop can repair with the
    // typed, root-cause-first prompt instead of the generic fallback.
    expect(typeof runClosedLoop).toBe('function');
    expect(typeof buildRepairPrompt).toBe('function');
    expect(typeof defaultBuildRepairPrompt).toBe('function');
  });

  it('the rich buildRepairPrompt differs from the generic fallback for a typed verdict', () => {
    const verdicts = [
      {
        gate: 'interference',
        ok: false,
        code: 'mechanism.interpenetration',
        message: 'Parts overlap.',
        margin: 42,
        locus: 'shade∩beam',
      },
    ];
    const rich = buildRepairPrompt(verdicts);
    const generic = defaultBuildRepairPrompt(verdicts);
    expect(rich).not.toBe(generic);
    // Rich prompt carries the numeric margin + topological locus as evidence.
    expect(rich).toContain('42');
    expect(rich).toContain('shade∩beam');
  });
});

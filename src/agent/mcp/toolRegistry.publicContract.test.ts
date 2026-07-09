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
import { coreRuntimeToolEntries } from './registry/coreRuntimeTools';
import { geometryAuthoringToolEntries } from './registry/geometryAuthoringTools';
import { inspectionVerificationToolEntries } from './registry/inspectionVerificationTools';
import { referenceExportToolEntries } from './registry/referenceExportTools';
import { reviewPipelineToolEntries } from './registry/reviewPipelineTools';
import { sketchAssemblyToolEntries } from './registry/sketchAssemblyTools';

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
  'review_paint_peek_latest',
  'design_loop',
  'flatten_pattern',
  'evaluate_sdf',
  'capture_animation',
  'render_preview',
] as const;

const PUBLIC_CONTRACT_FIXTURE = new URL(
  '../../../tests/fixtures/mcp/toolRegistry.publicContract.json',
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

  it('keeps the public tool order stable', () => {
    expect(TOOL_REGISTRY.map(entry => entry.definition.name)).toEqual(EXPECTED_TOOL_NAMES);
    expect(TOOLS.map(tool => tool.name)).toEqual(EXPECTED_TOOL_NAMES);
  });

  it('keeps merged public tool metadata stable', () => {
    const fixture = JSON.parse(readFileSync(PUBLIC_CONTRACT_FIXTURE, 'utf8'));
    expect(serializedPublicTools()).toEqual(fixture);
  });

  it('keeps toolRegistry as the composition and dispatch boundary', () => {
    expect(readFileSync(TOOL_REGISTRY_SOURCE, 'utf8')).not.toContain('definition: {');
  });

  it('composes core runtime tools from the core runtime registry module', () => {
    const names = coreRuntimeToolEntries.map(entry => entry.definition.name);

    expect(names).toEqual(['evaluate_script', 'diff_scripts', 'set_param']);
    expect([TOOL_REGISTRY[0], TOOL_REGISTRY[1], TOOL_REGISTRY[5]]).toEqual(coreRuntimeToolEntries);
  });

  it('composes inspection and verification tools from the inspection verification registry module', () => {
    const names = inspectionVerificationToolEntries.map(entry => entry.definition.name);

    expect(names).toEqual(['inspect', 'verify', 'why_did_this_fail', 'query']);
    expect([TOOL_REGISTRY[2], TOOL_REGISTRY[3], TOOL_REGISTRY[4], TOOL_REGISTRY[16]]).toEqual(
      inspectionVerificationToolEntries,
    );
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

    await expect(callMcpTool('query', { mode: 'nope' })).rejects.toThrow(
      /Unknown query mode: nope/,
    );
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
      'review_paint_peek_latest',
      'design_loop',
      'flatten_pattern',
      'evaluate_sdf',
      'capture_animation',
      'render_preview',
    ]);
    expect(TOOL_REGISTRY.slice(31, 38)).toEqual(reviewPipelineToolEntries);
  });

  it('exports callMcpTool that dispatches by name and returns a result', async () => {
    const result = await callMcpTool('lookup_api', {});
    expect(result).toBeDefined();
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

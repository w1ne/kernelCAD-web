// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getMcpViewerResult } from './liveViewer';
import { selectionToolEntries } from './registry/selectionTools';
import { pointCloudToolEntries } from './registry/pointCloudTools';
import { TOOL_ANNOTATIONS } from './toolAnnotations';
import { toolTitle } from './toolTitles';
import { TOOL_OUTPUT_SCHEMAS } from './toolOutputSchemas';
import { catalogToolEntries } from './registry/catalogTools';
import { feaToolEntries } from './registry/feaTools';
import {
  coreRuntimeParameterToolEntries,
  coreRuntimePreludeToolEntries,
} from './registry/coreRuntimeTools';
import { geometryAuthoringToolEntries } from './registry/geometryAuthoringTools';
import { drawingImportToolEntries } from './registry/drawingImportTools';
import { geometryDiffToolEntries } from './registry/geometryDiffTools';
import {
  inspectionVerificationPreludeToolEntries,
  inspectionVerificationQueryToolEntries,
  inspectionVerificationRepairToolEntries,
} from './registry/inspectionVerificationTools';
import { printToolEntries } from './registry/printTools';
import { importToolEntries } from './registry/importTools';
import { manufacturingToolEntries } from './registry/manufacturingTools';
import { rayPickToolEntries } from './registry/rayPickTools';
import { nurbsToolEntries } from './registry/nurbsTools';
import { surfaceBlendToolEntries } from './registry/surfaceBlendTools';
import { explodeViewToolEntries } from './registry/explodeViewTools';
import { referenceExportToolEntries } from './registry/referenceExportTools';
import { referenceLedgerToolEntries } from './registry/referenceLedgerTools';
import { reviewPipelineToolEntries } from './registry/reviewPipelineTools';
import { sketchAssemblyToolEntries } from './registry/sketchAssemblyTools';
import { mechanismSimToolEntries } from './registry/mechanismSimTools';
import { meshReconstructToolEntries } from './registry/meshReconstructTools';
import { blockoutToolEntries } from './registry/blockoutTools';
import { assetManifestToolEntries } from './registry/assetManifestTools';
import { assetCatalogToolEntries } from './registry/assetCatalogTools';
import { meshBooleanToolEntries } from './registry/meshBooleanTools';
import { cookbookExecutionToolEntries } from './registry/cookbookExecutionTools';
import type { McpToolDefinition, ToolRegistryEntry } from './registry/types';
import { guardMcpToolArgs } from './sandboxArgs';
export { runClosedLoop } from '../loop/closedLoop.js';
export { buildRepairPrompt } from '../loop/repairPrompt.js';
export * from '../loop/types.js';
export type { McpToolDefinition } from './registry/types';
// lookup_authoring_skill is hosted by kernelCAD-server; it answers from the
// vendored SKILL.md through this sectioning helper.
export {
  lookupAuthoringSkill,
  parseAuthoringSkill,
  LOOKUP_AUTHORING_SKILL_DESCRIPTION,
  LOOKUP_AUTHORING_SKILL_INPUT_SCHEMA,
} from '../skills/authoringSkillLookup';
export type {
  LookupAuthoringSkillInput,
  LookupAuthoringSkillResult,
} from '../skills/authoringSkillLookup';

/**
 * Registry of every MCP tool — pairs each definition with its handler.
 *
 * Public contract — depended on by kernelCAD-server (vendor/kernelcad/ submodule).
 * The shape of `ToolRegistryEntry` (`{ definition: McpToolDefinition, handler: ToolHandler }`)
 * is the source of truth; `TOOLS` and the in-process Map indexes are derived from it.
 * Do NOT change the entry shape or remove entries without bumping the consumer SHA explicitly.
 */
export const TOOL_REGISTRY: ToolRegistryEntry[] = [
  // Some extracted families are split here because kernelCAD-server consumes
  // the historical registry order as part of this public contract.
  ...coreRuntimePreludeToolEntries,
  ...inspectionVerificationPreludeToolEntries,
  ...coreRuntimeParameterToolEntries,
  ...geometryAuthoringToolEntries,
  ...inspectionVerificationQueryToolEntries,
  ...referenceExportToolEntries,
  ...catalogToolEntries,
  ...sketchAssemblyToolEntries,
  ...reviewPipelineToolEntries,
  // Appended last — new tool families are always appended at the tail of
  // TOOL_REGISTRY, never inserted into an existing family, because the
  // registry order is a public contract kernelCAD-server depends on.
  ...referenceLedgerToolEntries,
  // Appended last: the registry order is a public contract, so a new family
  // goes on the end rather than renumbering the existing ones.
  ...feaToolEntries,
  // New tool families are appended LAST — inserting mid-list renumbers
  // every family after it, breaking the kernelCAD-server public contract.
  ...printToolEntries,
  ...inspectionVerificationRepairToolEntries,
  // New tools are appended here — never inserted mid-list, which would
  // shift existing indices (a kernelCAD-server contract; see the
  // publicContract test's per-family slice-index assertions).
  ...mechanismSimToolEntries,
  // New families are appended here, never inserted: index order is public.
  ...geometryDiffToolEntries,
  // Appended last: engineering-drawing import is its own family at the tail.
  ...drawingImportToolEntries,
  // Appended at the tail like every family before it (public index order).
  ...meshReconstructToolEntries,
  // Appended at the tail: cookbook one-shot execute for ChatGPT industry demos.
  ...cookbookExecutionToolEntries,
  ...selectionToolEntries,
  // Appended at the tail: import the user's own STEP/STL as a base body.
  ...importToolEntries,
  // Appended at the tail: manufacturability review (FDM + CNC).
  ...manufacturingToolEntries,
  ...rayPickToolEntries,
  ...nurbsToolEntries,
  ...pointCloudToolEntries,
  ...meshBooleanToolEntries,
  ...explodeViewToolEntries,
  ...surfaceBlendToolEntries,
  // Appended at the tail: generic parts-list -> placeholder assembly script.
  ...blockoutToolEntries,
  ...assetManifestToolEntries,
  // Appended at the tail: read-only low-poly asset catalog.
  ...assetCatalogToolEntries,
];

/** Merge the central MCP metadata maps onto a definition: behavioral hints
 *  (TOOL_ANNOTATIONS), human titles (TOOL_TITLES), and the structured-output
 *  schema (TOOL_OUTPUT_SCHEMAS). Each lives in one central map so the surface
 *  is classified in a single place and the consistency gate can enforce coverage. */
function withMetadata(def: McpToolDefinition): McpToolDefinition {
  const base = TOOL_ANNOTATIONS[def.name];
  const title = toolTitle(def.name);
  const annotations = base ? { ...base, title } : undefined;
  const outputSchema = TOOL_OUTPUT_SCHEMAS[def.name];
  return {
    ...def,
    title,
    ...(annotations ? { annotations } : {}),
    ...(outputSchema ? { outputSchema } : {}),
  };
}

const toolHandlers = new Map(TOOL_REGISTRY.map(entry => [entry.definition.name, entry.handler]));
const toolDefinitions = new Map(
  TOOL_REGISTRY.map(entry => [entry.definition.name, withMetadata(entry.definition)]),
);

/**
 * Flat array of all tool definitions (with behavioral annotations + output schemas), in registry order.
 *
 * Public contract — depended on by kernelCAD-server.
 */
export const TOOLS = TOOL_REGISTRY.map(entry => withMetadata(entry.definition));

/**
 * Dispatch an MCP tool call by name. Transport-agnostic: used by stdio MCP server,
 * remote MCP gateway (kernelCAD-server), and the server-side agent orchestrator.
 *
 * Public contract — depended on by kernelCAD-server. Do NOT remove or change the
 * signature without bumping the consumer SHA explicitly.
 *
 * @param name - The MCP tool name
 * @param input - The tool's input arguments (validated against inputSchema by the handler)
 * @returns The tool's result (shape varies per tool — see individual tool files)
 * @throws Error if `name` does not match any registered tool
 */
export async function callMcpTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const handler = toolHandlers.get(name);
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  // Sandbox mode: refuse out-of-workspace paths / network URLs before the
  // handler runs (no-op when the sandbox is off). See ./sandboxArgs.ts.
  guardMcpToolArgs(name, input);
  const previousViewer = getMcpViewerResult();
  const result = await handler(input);
  const viewer = getMcpViewerResult();
  // Source-edit tools often return a trimmed evaluate result. Preserve the
  // live link whenever this call built a replacement model.
  return viewer !== previousViewer && result && typeof result === 'object' && !Array.isArray(result)
    ? { ...result, ...viewer }
    : result;
}

/**
 * Look up a tool's MCP definition by name.
 *
 * Public contract — depended on by kernelCAD-server (vendor/kernelcad/ submodule).
 * Do NOT remove or change the signature without bumping the consumer SHA explicitly.
 *
 * @param name - The MCP tool name (e.g. 'evaluate_script')
 * @returns The McpToolDefinition, or undefined if no tool by that name exists
 */
export function getToolDefinition(name: string): McpToolDefinition | undefined {
  return toolDefinitions.get(name);
}

/**
 * Look up a registered tool by name: its merged definition (annotations +
 * output schema, exactly as in {@link TOOLS}) and its handler.
 *
 * Name-keyed access for consumers (kernelCAD-server) that today index
 * TOOL_REGISTRY / TOOLS by position: resolving by name does not depend on
 * the registry order, so a consumer that switches to this lookup no longer
 * needs the order frozen.
 *
 * @returns the entry, or undefined when no tool by that name is registered
 */
export function getToolByName(name: string): ToolRegistryEntry | undefined {
  const definition = toolDefinitions.get(name);
  const handler = toolHandlers.get(name);
  return definition !== undefined && handler !== undefined ? { definition, handler } : undefined;
}

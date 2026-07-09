// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { TOOL_ANNOTATIONS } from './toolAnnotations';
import { TOOL_OUTPUT_SCHEMAS } from './toolOutputSchemas';
import { catalogToolEntries } from './registry/catalogTools';
import {
  coreRuntimeParameterToolEntries,
  coreRuntimePreludeToolEntries,
} from './registry/coreRuntimeTools';
import { geometryAuthoringToolEntries } from './registry/geometryAuthoringTools';
import {
  inspectionVerificationPreludeToolEntries,
  inspectionVerificationQueryToolEntries,
} from './registry/inspectionVerificationTools';
import { referenceExportToolEntries } from './registry/referenceExportTools';
import { reviewPipelineToolEntries } from './registry/reviewPipelineTools';
import { sketchAssemblyToolEntries } from './registry/sketchAssemblyTools';
import type { McpToolDefinition, ToolRegistryEntry } from './registry/types';
export { runClosedLoop } from '../loop/closedLoop.js';
export { buildRepairPrompt } from '../loop/repairPrompt.js';
export * from '../loop/types.js';
export type { McpToolDefinition } from './registry/types';

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
];

/** Merge the central MCP metadata maps onto a definition: behavioral hints
 *  (TOOL_ANNOTATIONS) and the structured-output schema (TOOL_OUTPUT_SCHEMAS).
 *  Both live in one central map each so the surface is classified in a single
 *  place and the consistency gate can enforce coverage. */
function withMetadata(def: McpToolDefinition): McpToolDefinition {
  const annotations = TOOL_ANNOTATIONS[def.name];
  const outputSchema = TOOL_OUTPUT_SCHEMAS[def.name];
  return {
    ...def,
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
  return handler(input);
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

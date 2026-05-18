// src/agent/mcp/toolRegistry.ts
//
// Flat manifest of every MCP tool — pairs each definition with its handler.
// Tool descriptors live alongside their implementations in tools/<name>.ts
// (built via the `defineMCPTool` helper); this file is a thin import-and-list.
//
// Public contract — depended on by kernelCAD-server (vendor/kernelcad/ submodule).
// The shape of `ToolRegistryEntry` (`{ definition: McpToolDefinition, handler }`)
// is the source of truth; `TOOLS` and the in-process Map indexes are derived from it.
// Do NOT change the entry shape or remove entries without bumping the consumer SHA explicitly.

import type { ToolRegistryEntry } from './defineMCPTool';
export type { McpToolDefinition, ToolHandler } from './defineMCPTool';
import type { McpToolDefinition } from './defineMCPTool';

import { addConnectorMcpTool } from './tools/addConnector';
import {
  addConstraintMcpTool,
  listConstraintsMcpTool,
  solveSketchMcpTool,
} from './tools/constraints';
import { addFeatureMcpTool } from './tools/addFeature';
import { addNurbsSurfaceMcpTool } from './tools/addNurbsSurface';
import { addPatternFeatureMcpTool } from './tools/addPatternFeature';
import { addSketchTextMcpTool } from './tools/addSketchText';
import { addMateMcpTool } from './tools/addMate';
import { designLoopMcpTool } from './tools/designLoop';
import { evaluateScriptMcpTool } from './tools/evaluateScript';
import { evaluateSdfMcpTool } from './tools/evaluateSdf';
import { exportStlMcpTool } from './tools/exportStl';
import { flattenPatternMcpTool } from './tools/flattenPattern';
import { getBendTableMcpTool } from './tools/getBendTable';
import { getEdgesOfMcpTool } from './tools/getEdgesOf';
import { getFaceLineageMcpTool } from './tools/getFaceLineage';
import { getShapeInfoMcpTool } from './tools/getShapeInfo';
import { inspectAssemblyMcpTool } from './tools/inspectAssembly';
import { listApiMcpTool } from './tools/listApi';
import { listAssembliesMcpTool } from './tools/listAssemblies';
import { listDiagnosticCodesMcpTool } from './tools/listDiagnosticCodes';
import { listEdgesMcpTool } from './tools/listEdges';
import { listFaceLabelsMcpTool } from './tools/listFaceLabels';
import { listFacesMcpTool } from './tools/listFaces';
import { listFeaturesMcpTool } from './tools/listFeatures';
import { listMatesMcpTool } from './tools/listMates';
import { listTopologyMcpTool } from './tools/listTopology';
import { lookupCookbookMcpTool } from './tools/lookupCookbook';
import { paramsListMcpTool } from './tools/paramsList';
import { paramsUpdateMcpTool } from './tools/paramsUpdate';
import { removeFeatureMcpTool } from './tools/removeFeature';
import { reviewCadMcpTool } from './tools/reviewCad';
import { setParamValueMcpTool } from './tools/setParamValue';
import { solveMatesMcpTool } from './tools/solveMates';
import { validateAssemblyMcpTool } from './tools/validateAssembly';
import { whyDidThisFailMcpTool } from './tools/whyDidThisFail';

export const TOOL_REGISTRY: ToolRegistryEntry[] = [
  evaluateScriptMcpTool,
  listFeaturesMcpTool,
  listAssembliesMcpTool,
  inspectAssemblyMcpTool,
  getShapeInfoMcpTool,
  listTopologyMcpTool,
  getEdgesOfMcpTool,
  whyDidThisFailMcpTool,
  setParamValueMcpTool,
  addFeatureMcpTool,
  addNurbsSurfaceMcpTool,
  addSketchTextMcpTool,
  addPatternFeatureMcpTool,
  removeFeatureMcpTool,
  listEdgesMcpTool,
  listFacesMcpTool,
  listFaceLabelsMcpTool,
  getFaceLineageMcpTool,
  listApiMcpTool,
  listDiagnosticCodesMcpTool,
  exportStlMcpTool,
  lookupCookbookMcpTool,
  paramsListMcpTool,
  paramsUpdateMcpTool,
  solveSketchMcpTool,
  addConstraintMcpTool,
  listConstraintsMcpTool,
  addConnectorMcpTool,
  addMateMcpTool,
  listMatesMcpTool,
  validateAssemblyMcpTool,
  solveMatesMcpTool,
  reviewCadMcpTool,
  designLoopMcpTool,
  flattenPatternMcpTool,
  getBendTableMcpTool,
  evaluateSdfMcpTool,
];

const toolHandlers = new Map(TOOL_REGISTRY.map(entry => [entry.definition.name, entry.handler]));
const toolDefinitions = new Map(TOOL_REGISTRY.map(entry => [entry.definition.name, entry.definition]));

/**
 * Flat array of all tool definitions, in registry order.
 *
 * Public contract — depended on by kernelCAD-server.
 */
export const TOOLS = TOOL_REGISTRY.map(entry => entry.definition);

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

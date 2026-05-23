// src/agent/mcp/tools/exportStl.ts
//
// @deprecated Use `export_model` with `format: 'stl'` instead. This shim
// keeps the existing tool name registered for one release; removal is
// scheduled for the next minor version.
//
// The shim forwards verbatim to `exportModelTool({ ..., format: 'stl' })`.
// All existing `export_stl` callers (CLI, MCP, integration tests) pass
// through unchanged.

import {
  exportModelTool,
  type ExportModelInput,
  type ExportModelOutput,
} from './exportModel';

export interface ExportStlInput {
  file?: string;
  code?: string;
  output_path: string;
  feature_id?: string;
}

export type ExportStlOutput = ExportModelOutput;

/** @deprecated Use `exportModelTool({ ..., format: 'stl' })` instead. */
export async function exportStlTool(input: ExportStlInput): Promise<ExportStlOutput> {
  const modelInput: ExportModelInput = { ...input, format: 'stl' };
  return exportModelTool(modelInput);
}

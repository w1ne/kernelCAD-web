// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ToolAnnotations } from '../toolAnnotations';
import type { JSONSchemaObject } from '../toolOutputSchemas';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    /** Optional JSON Schema conditional blocks (if/then/else) for
     *  required-by-discriminator fields. */
    allOf?: unknown[];
  };
  /** MCP behavioral hints (readOnly/destructive/openWorld). Required for ChatGPT
   *  app-directory submission; merged from TOOL_ANNOTATIONS at build time. */
  annotations?: ToolAnnotations;
  /** MCP structured-output schema (JSON Schema for the tool's return value).
   *  Merged from TOOL_OUTPUT_SCHEMAS at build time. */
  outputSchema?: JSONSchemaObject;
}

export type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

export interface ToolRegistryEntry {
  definition: McpToolDefinition;
  handler: ToolHandler;
}

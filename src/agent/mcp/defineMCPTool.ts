// src/agent/mcp/defineMCPTool.ts
//
// Helper for declaring MCP tool descriptors with less per-tool boilerplate.
//
// Co-locates each tool's name/description/inputSchema with its implementation
// (instead of splitting them across toolRegistry.ts) and removes the
// `input as Parameters<typeof fooTool>[0]` cast incantation that used to
// appear once per registry entry.
//
// Pure runtime helper — no codegen, no build-time emit-metadata, no Zod
// migration. Authors keep using hand-written JSON Schema (the existing shape)
// and a typed async handler.

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

export interface ToolRegistryEntry {
  definition: McpToolDefinition;
  handler: ToolHandler;
  /** Optional agent-introspectable metadata; reserved for future MCP surfacing. */
  metadata?: ToolMetadata;
}

/**
 * Agent-introspectable per-tool metadata. Optional; the registry's public
 * contract (`{ definition, handler }`) is unchanged — this rides alongside
 * for future surfacing on `list_tools` / capability negotiation.
 */
export interface ToolMetadata {
  /** Whether the tool requires the kernelCAD-server auth gate (defaults to false). */
  readonly requiresAuth?: boolean;
  /** Default error-recovery hint for an agent that calls this tool and gets `ok: false`. */
  readonly defaultErrorRecovery?: string;
  /** Whether the tool mutates session state (vs. side-effect-free queries). */
  readonly mutatesSession?: boolean;
  /** Free-form category tag for grouping in agent UIs / docs. */
  readonly category?: string;
}

export interface DefineMCPToolOptions<I> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: McpToolDefinition['inputSchema'];
  readonly handler: (input: I) => Promise<unknown>;
  readonly metadata?: ToolMetadata;
}

/**
 * Build a registry entry for an MCP tool.
 *
 * `I` is inferred from the handler's parameter type. Inside the helper we
 * perform a single unsafe cast from the protocol-level `Record<string, unknown>`
 * to `I` — this is the cast that previously appeared at every registry entry
 * (`input as unknown as Parameters<typeof fooTool>[0]`). Centralising it here
 * removes ~39 duplicated cast sites without changing the runtime contract:
 * handlers were already responsible for validating their own input shape.
 */
export function defineMCPTool<I>(opts: DefineMCPToolOptions<I>): ToolRegistryEntry {
  const entry: ToolRegistryEntry = {
    definition: {
      name: opts.name,
      description: opts.description,
      inputSchema: opts.inputSchema,
    },
    handler: (input: Record<string, unknown>) => opts.handler(input as unknown as I),
  };
  if (opts.metadata !== undefined) {
    entry.metadata = opts.metadata;
  }
  return entry;
}

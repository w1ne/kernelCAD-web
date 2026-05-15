// tests/unit/mcp/toolRegistrySchema.test.ts
import { describe, it, expect } from 'vitest';
import { TOOL_REGISTRY } from '../../../src/mcp/toolRegistry';

function findTool(name: string) {
  const entry = TOOL_REGISTRY.find(e => e.definition.name === name);
  if (!entry) throw new Error(`tool not found: ${name}`);
  return entry.definition;
}

describe('toolRegistry pose-envelope schema options', () => {
  it('review_cad schema declares samplesPerMate as integer with minimum 1', () => {
    const def = findTool('review_cad');
    const prop = def.inputSchema.properties.samplesPerMate as {
      type: string;
      minimum: number;
    };
    expect(prop).toBeDefined();
    expect(prop.type).toBe('integer');
    expect(prop.minimum).toBe(1);
  });

  it('review_cad schema declares combinatorial as boolean', () => {
    const def = findTool('review_cad');
    const prop = def.inputSchema.properties.combinatorial as { type: string };
    expect(prop).toBeDefined();
    expect(prop.type).toBe('boolean');
  });

  it('design_loop schema declares samplesPerMate as integer with minimum 1', () => {
    const def = findTool('design_loop');
    const prop = def.inputSchema.properties.samplesPerMate as {
      type: string;
      minimum: number;
    };
    expect(prop).toBeDefined();
    expect(prop.type).toBe('integer');
    expect(prop.minimum).toBe(1);
  });

  it('design_loop schema declares combinatorial as boolean', () => {
    const def = findTool('design_loop');
    const prop = def.inputSchema.properties.combinatorial as { type: string };
    expect(prop).toBeDefined();
    expect(prop.type).toBe('boolean');
  });
});

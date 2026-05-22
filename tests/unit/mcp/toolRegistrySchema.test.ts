// tests/unit/mcp/toolRegistrySchema.test.ts
import { describe, it, expect } from 'vitest';
import { TOOL_REGISTRY } from '../../../src/agent/mcp/toolRegistry';

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

  it('review_cad schema declares gripperAperture refs', () => {
    const def = findTool('review_cad');
    const prop = def.inputSchema.properties.gripperAperture as {
      type: string;
      properties?: Record<string, { type: string }>;
    };
    expect(prop).toBeDefined();
    expect(prop.type).toBe('object');
    expect(prop.properties?.left?.type).toBe('string');
    expect(prop.properties?.right?.type).toBe('string');
  });

  it('design_loop visual review schema names every required visual check', () => {
    const def = findTool('design_loop');
    const attempts = def.inputSchema.properties.attempts as {
      items: {
        properties: {
          visualReview: {
            properties: {
              checks: { description: string };
            };
          };
        };
      };
    };
    const description = attempts.items.properties.visualReview.properties.checks.description;
    for (const code of [
      'main-object-count',
      'proportions-match-reference',
      'required-visible-features',
      'no-stray-or-floating-geometry',
      'attachment-plausibility',
      'semantic-orientation-alignment',
      'device-depth-and-construction',
      'canonical-views-physically-coherent',
    ]) {
      expect(description).toContain(code);
    }
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

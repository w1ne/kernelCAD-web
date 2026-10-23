// tests/unit/mcp/toolRegistrySchema.test.ts
import { describe, it, expect } from 'vitest';
import { TOOL_REGISTRY } from '../../../src/agent/mcp/toolRegistry';

function findTool(name: string) {
  const entry = TOOL_REGISTRY.find(e => e.definition.name === name);
  if (!entry) throw new Error(`tool not found: ${name}`);
  return entry.definition;
}

describe('toolRegistry pose-envelope schema options', () => {
  it('publishes geometry-quality thresholds, body selection and asserted plane', () => {
    const def = findTool('verify');
    const props = def.inputSchema.properties;
    expect(props.check).toMatchObject({ enum: expect.arrayContaining(['geometry-quality']) });
    for (const name of ['feature_id', 'tiny_face_area_mm2', 'tiny_face_relative', 'short_edge_length_mm', 'symmetry_tolerance_mm', 'mesh_deflection_mm']) expect(props).toHaveProperty(name);
    expect(props.asserted_plane).toMatchObject({ type: 'object', required: ['origin','normal'] });
    expect(def.description).toContain('sampled');
  });
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

  it('review_cad schema declares reaction and clevis structure review flags', () => {
    const def = findTool('review_cad');
    expect(def.inputSchema.properties.includePhysicalUseCaseJointReactions).toMatchObject({
      type: 'boolean',
    });
    expect(def.inputSchema.properties.includePhysicalUseCaseJointStructure).toMatchObject({
      type: 'boolean',
    });
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

import { describe, expect, it } from 'vitest';
import { TOOL_OUTPUT_SCHEMAS } from '../../../src/agent/mcp/toolOutputSchemas';

describe('review_cad output schema', () => {
  it('declares connectorWorkspace as the array returned by reviewCadTool', () => {
    const schema = TOOL_OUTPUT_SCHEMAS.review_cad;
    const connectorWorkspace = schema.properties.connectorWorkspace;

    expect(connectorWorkspace).toMatchObject({
      type: 'array',
      items: { type: 'object', additionalProperties: true },
    });
  });

  it('declares pose-bound static certificates as structured evidence', () => {
    const schema = TOOL_OUTPUT_SCHEMAS.review_cad;

    expect(schema.properties.physicalUseCaseStaticCertificates).toMatchObject({
      type: 'array',
      items: { type: 'object', additionalProperties: true },
    });
  });

  it('declares unit-bearing joint reaction and structural certificate arrays', () => {
    const schema = TOOL_OUTPUT_SCHEMAS.review_cad;
    const reactions = schema.properties.physicalUseCaseJointReactionCertificates;
    const structures = schema.properties.physicalUseCaseJointStructuralCertificates;

    expect(reactions).toMatchObject({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          reactions: {
            type: 'array',
            items: {
              required: expect.arrayContaining([
                'mateName',
                'forceWorldN',
                'momentWorldNmm',
                'resultantForceN',
                'resultantMomentNmm',
              ]),
            },
          },
        },
      },
    });
    expect(structures).toMatchObject({
      type: 'array',
      items: {
        type: 'object',
        properties: { joints: { type: 'array' } },
      },
    });
  });
});

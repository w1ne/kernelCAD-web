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
});

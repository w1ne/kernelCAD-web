import { describe, expect, it } from 'vitest';
import { TOOL_REGISTRY } from '../../../src/agent/mcp/toolRegistry';
import { loadCombinedSkillMd } from './_helpers';

const SKILL_MD = loadCombinedSkillMd();

const editTools = [
  {
    name: 'set_param',
    forbiddenParams: ['file', 'value'],
  },
  {
    name: 'add_feature',
    forbiddenParams: ['file', 'kind', '...'],
  },
  {
    name: 'remove_feature',
    forbiddenParams: ['file', 'feature_id'],
  },
];

function documentedSignatureParams(toolName: string): string[] {
  const signaturePattern = new RegExp(`- \`${toolName}\\(\\{([^}]*)\\}\\)\``);
  const match = SKILL_MD.match(signaturePattern);

  expect(match, `SKILL.md must document a signature bullet for ${toolName}`).not.toBeNull();

  return match![1]
    .split(',')
    .map(param => param.trim().replace(/\?$/, ''))
    .filter(Boolean);
}

describe('SKILL.md MCP edit tool signatures', () => {
  it('match the required parameters exposed by the MCP registry', () => {
    for (const tool of editTools) {
      const registryEntry = TOOL_REGISTRY.find(entry => entry.definition.name === tool.name);
      expect(registryEntry, `MCP registry must expose ${tool.name}`).toBeDefined();

      const documentedParams = documentedSignatureParams(tool.name);
      const requiredParams = registryEntry!.definition.inputSchema.required ?? [];

      for (const requiredParam of requiredParams) {
        expect(
          documentedParams,
          `${tool.name} docs must include required param ${requiredParam}`,
        ).toContain(requiredParam);
      }
    }
  });

  it('do not advertise stale edit tool parameters', () => {
    for (const tool of editTools) {
      const documentedParams = documentedSignatureParams(tool.name);

      for (const staleParam of tool.forbiddenParams) {
        expect(
          documentedParams,
          `${tool.name} docs must not include stale param ${staleParam}`,
        ).not.toContain(staleParam);
      }
    }
  });
});

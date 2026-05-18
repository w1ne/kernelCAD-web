import { describe, it, expect } from 'vitest';
import { listDiagnosticCodesTool } from '../../../../src/agent/mcp/tools/listDiagnosticCodes';
import { DIAGNOSTIC_CODES } from '../../../../src/shared/diagnostics/registry';

describe('list_diagnostic_codes', () => {
  it('returns all 71 codes with non-empty hint templates', async () => {
    const result = await listDiagnosticCodesTool({});
    expect(result.ok).toBe(true);
    expect(result.codes).toHaveLength(71);
    for (const entry of result.codes) {
      expect(entry.hint_template.trim().length).toBeGreaterThan(0);
    }
  });

  it('every code is unique', async () => {
    const result = await listDiagnosticCodesTool({});
    expect(new Set(result.codes.map((c) => c.code)).size).toBe(71);
  });
});

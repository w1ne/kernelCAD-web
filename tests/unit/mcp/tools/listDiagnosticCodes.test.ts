import { describe, it, expect } from 'vitest';
import { listDiagnosticCodesTool } from '../../../../src/agent/mcp/tools/listDiagnosticCodes';
import { DIAGNOSTIC_CODES } from '../../../../src/shared/diagnostics/registry';

describe('list_diagnostic_codes', () => {
  it('returns every catalogued code with a non-empty hint template', async () => {
    const result = await listDiagnosticCodesTool({});
    expect(result.ok).toBe(true);
    expect(result.codes).toHaveLength(DIAGNOSTIC_CODES.length);
    for (const entry of result.codes) {
      expect(entry.hint_template.trim().length).toBeGreaterThan(0);
    }
  });

  it('every code is unique', async () => {
    const result = await listDiagnosticCodesTool({});
    expect(new Set(result.codes.map((c) => c.code)).size).toBe(DIAGNOSTIC_CODES.length);
  });
});

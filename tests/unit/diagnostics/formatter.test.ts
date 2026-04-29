import { describe, it, expect } from 'vitest';
import { formatJson } from '../../../src/diagnostics/formatter';
import type { CompilerDiagnostic } from '../../../src/diagnostics/diagnostic';

describe('formatter', () => {
  it('formats a list of diagnostics as JSON', () => {
    const diags: CompilerDiagnostic[] = [
      { target: 'export-occt', code: 'feature.box.invalid-dim', featureId: 'box_1', severity: 'error', message: 'Width must be > 0' },
    ];
    const out = formatJson(diags);
    const parsed = JSON.parse(out);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].featureId).toBe('box_1');
  });
});

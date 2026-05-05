import { describe, it, expect } from 'vitest';
import { formatJson, formatHuman } from '../../../src/diagnostics/formatter';
import type { CompilerDiagnostic } from '../../../src/diagnostics/diagnostic';

describe('formatter', () => {
  it('formats a list of diagnostics as JSON', () => {
    const diags: CompilerDiagnostic[] = [
      {
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: 'box_1',
        severity: 'error',
        message: 'Width must be > 0',
        hint: 'Pass a positive finite number for width.',
      },
    ];
    const out = formatJson(diags);
    const parsed = JSON.parse(out);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].featureId).toBe('box_1');
    expect(parsed[0].hint).toBe('Pass a positive finite number for width.');
  });

  it('renders the hint on a separate line in human format', () => {
    const diags: CompilerDiagnostic[] = [
      {
        target: 'export-occt',
        code: 'feature.kernel-failed',
        featureId: 'fillet_3',
        severity: 'error',
        message: 'OCCT could not apply that fillet.',
        hint: 'Try a smaller radius.',
      },
    ];
    const out = formatHuman(diags);
    expect(out).toContain('[feature.kernel-failed]');
    expect(out).toContain('OCCT could not apply that fillet.');
    expect(out).toContain('Hint: Try a smaller radius.');
  });
});

import { describe, expect, it } from 'vitest';
import { auditTestText, formatAuditReport } from './testQualityAudit';

describe('testQualityAudit', () => {
  it('flags focused tests and todo tests as release-blocking', () => {
    const result = auditTestText('src/example.test.ts', [
      `it${'.only'}('focus leak', () => {})`,
      `it${'.todo'}('fake coverage')`,
    ].join('\n'));

    expect(result.blockers.map(b => b.kind)).toEqual(['focused-test', 'todo-test']);
    expect(formatAuditReport([result])).toContain('src/example.test.ts:1 focused-test');
    expect(formatAuditReport([result])).toContain('src/example.test.ts:2 todo-test');
  });

  it('allows explicit environment-gated suites but reports them as supplemental', () => {
    const result = auditTestText('src/integration/ui_workflows.test.tsx', [
      'const describeUI = runUIE2E ? describe : describe.skip;',
    ].join('\n'));

    expect(result.blockers).toEqual([]);
    expect(result.warnings.map(w => w.kind)).toEqual(['env-gated-suite']);
  });
});

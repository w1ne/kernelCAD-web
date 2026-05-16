// tests/unit/diagnostics/nextAction.test.ts
import { describe, it, expect } from 'vitest';
import { DIAGNOSTIC_CODES } from '../../../src/shared/diagnostics/codes';
import { NEXT_ACTIONS, type NextAction } from '../../../src/shared/diagnostics/nextAction';

function isWellFormed(a: NextAction): boolean {
  switch (a.kind) {
    case 'retry-with-smaller-param': return typeof a.param === 'string' && typeof a.factor === 'number' && a.factor > 0 && a.factor < 1;
    case 'call-introspection-tool': return typeof a.tool === 'string' && a.tool.length > 0;
    case 'rewrite-feature':         return typeof a.guidance === 'string' && a.guidance.length > 0;
    case 'reorder-pipeline':        return typeof a.guidance === 'string' && a.guidance.length > 0;
    case 'fix-arg':                 return typeof a.field === 'string' && a.field.length > 0;
    case 'inspect-message':         return true;
    case 'rename':                  return typeof a.guidance === 'string' && a.guidance.length > 0;
    case 'add-return':              return true;
    case 'check-cli-args':          return true;
    case 'check-file-path':         return true;
  }
}

describe('NEXT_ACTIONS coverage', () => {
  it('every diagnostic code maps to a well-formed NextAction', () => {
    for (const code of DIAGNOSTIC_CODES) {
      const a = NEXT_ACTIONS[code];
      expect(a, `code ${code} has no NextAction`).toBeDefined();
      expect(isWellFormed(a), `code ${code} has malformed NextAction: ${JSON.stringify(a)}`).toBe(true);
    }
  });
});

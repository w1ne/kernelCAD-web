// eval/portfolio/failureMode.ts
import { DIAGNOSTIC_CODES, type DiagnosticCode } from '../../src/diagnostics/codes';

/** Locked taxonomy per spec Open Item #7. */
export type FailureMode =
  | { kind: 'diagnostic'; code: DiagnosticCode }
  | { kind: 'retrieval_miss' }
  | { kind: 'tool_gap'; tool?: string }
  | { kind: 'model_limit' }
  | { kind: 'out_of_scope' };

/** String representation used in the JSONL log. */
export type FailureModeTag = `diagnostic_${DiagnosticCode}` | 'retrieval_miss' | 'tool_gap' | 'model_limit' | 'out_of_scope';

export function failureModeToTag(m: FailureMode): FailureModeTag {
  switch (m.kind) {
    case 'diagnostic': return `diagnostic_${m.code}`;
    case 'retrieval_miss': return 'retrieval_miss';
    case 'tool_gap': return 'tool_gap';
    case 'model_limit': return 'model_limit';
    case 'out_of_scope': return 'out_of_scope';
  }
}

export function isFailureModeTag(s: string): s is FailureModeTag {
  if (s === 'retrieval_miss' || s === 'tool_gap' || s === 'model_limit' || s === 'out_of_scope') return true;
  if (!s.startsWith('diagnostic_')) return false;
  return (DIAGNOSTIC_CODES as readonly string[]).includes(s.slice('diagnostic_'.length));
}

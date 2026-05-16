// Soft warnings — non-fatal advisories surfaced by the param edit loop and
// the gated-feature lineage resolver. See spec §E.7.
//
// Codes are drawn from the closed milestone-C catalog (D-1). Hints
// discriminate within a code (slice-2 convention).
//
// Emission paths append to `CaptureSession.warnings` via softWarn();
// `params.update` returns the per-call subset as `UpdateResult.warnings`.

import type { DiagnosticCode } from '../shared/diagnostics/codes';

export type SoftWarningPhase = 'build' | 'update';

export interface SoftWarning {
  code: DiagnosticCode;
  hint: string;
  message: string;
  recordId?: string;
  paramName?: string;
  phase: SoftWarningPhase;
}

export type SoftWarningSink = (warning: SoftWarning) => void;

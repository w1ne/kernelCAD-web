import type { FeatureId, ScriptLocation } from '../intent/types';
import type { BackendTarget } from '../backends/backend';
import type { DiagnosticCode } from './codes';

export type { BackendTarget };
export type { DiagnosticCode };

export type DiagnosticSeverity = 'info' | 'warn' | 'error';

export interface CompilerDiagnostic {
  target: BackendTarget;
  code: DiagnosticCode;
  featureId?: FeatureId;
  scriptLocation?: ScriptLocation;
  severity: DiagnosticSeverity;
  message: string;
  /** Imperative one-sentence agent recovery instruction. Mandatory. */
  hint: string;
}

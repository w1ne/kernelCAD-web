import type { FeatureId, ScriptLocation } from '../intent/types';
import type { BackendTarget } from '../backends/backend';

export type { BackendTarget };

export type DiagnosticSeverity = 'info' | 'warn' | 'error';

export interface CompilerDiagnostic {
  target: BackendTarget;
  code: string;
  featureId?: FeatureId;
  scriptLocation?: ScriptLocation;
  severity: DiagnosticSeverity;
  message: string;
}

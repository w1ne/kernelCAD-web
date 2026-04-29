import type { FeatureId, ScriptLocation } from '../intent/types';

export type BackendTarget = 'export-occt' | 'faceted-mesh';

export type DiagnosticSeverity = 'info' | 'warn' | 'error';

export interface CompilerDiagnostic {
  target: BackendTarget;
  code: string;
  featureId?: FeatureId;
  scriptLocation?: ScriptLocation;
  severity: DiagnosticSeverity;
  message: string;
}

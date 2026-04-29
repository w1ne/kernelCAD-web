import type { CompilerDiagnostic } from './diagnostic';

export function formatJson(diags: readonly CompilerDiagnostic[]): string {
  return JSON.stringify(diags, null, 2);
}

export function formatHuman(diags: readonly CompilerDiagnostic[]): string {
  return diags.map(d => {
    const where = d.scriptLocation
      ? `${d.scriptLocation.file}:${d.scriptLocation.line}:${d.scriptLocation.column}`
      : (d.featureId ?? '<unknown>');
    return `${d.severity.toUpperCase()} [${d.code}] ${where}: ${d.message}`;
  }).join('\n');
}

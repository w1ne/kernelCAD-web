// src/mcp/tools/validateAssembly.ts
//
// v0.6 MCP tool — run the mate-aware validator on the active assembly.
// Surfaces the structured `ValidatorResult` (status + diagnostics + counts)
// so agents can recover from authoring errors using the per-code hint.

import type { Assembly } from '../../shared/capture/assembly';
import { isKernelError } from '../../intent/kernelError';
import type { ValidatorDiagnostic, ValidatorStatus } from '../../lib/mates/validator';
import { validateAssemblyWithMates } from '../../lib/mates/validator';
import { getActiveMcpSession } from '../activeSession';

export interface ValidateAssemblyInput {
  assembly?: string;
}

export type ValidateAssemblyOutput =
  | {
      ok: true;
      status: ValidatorStatus;
      diagnostics: ValidatorDiagnostic[];
      partCount: number;
      jointCount: number;
    }
  | { ok: false; error: string; errorCode?: string; errorHint?: string };

export async function validateAssemblyTool(input: ValidateAssemblyInput): Promise<ValidateAssemblyOutput> {
  const active = getActiveMcpSession();
  if (!active) {
    return {
      ok: false,
      error: 'No active kernelCAD session. Run evaluate_script successfully before calling validate_assembly.',
      errorCode: 'feature.invalid-args',
      errorHint: 'invalid-args.session.no-active-session',
    };
  }
  const assemblies = active.session.assemblies;
  if (assemblies.size === 0) {
    return {
      ok: false,
      error: 'No assembly captured on the active session.',
      errorCode: 'feature.invalid-args',
      errorHint: 'invalid-args.assembly.no-assembly — run evaluate_script with a script that calls kcad.assembly(...).',
    };
  }
  const arm = (input.assembly !== undefined
    ? assemblies.get(input.assembly)
    : assemblies.values().next().value) as Assembly | undefined;
  if (!arm) {
    return {
      ok: false,
      error: `validate_assembly: assembly '${input.assembly ?? '<default>'}' not found.`,
      errorCode: 'feature.invalid-args',
    };
  }
  try {
    const r = await validateAssemblyWithMates(arm);
    return {
      ok: true,
      status: r.status,
      diagnostics: [...r.diagnostics],
      partCount: r.partCount,
      jointCount: r.jointCount,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      errorCode: isKernelError(e) ? e.code : undefined,
      errorHint: isKernelError(e) ? e.hint : undefined,
    };
  }
}

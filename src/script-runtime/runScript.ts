import { CaptureSession } from '../capture/captureSession';
import { ParamRegistry } from '../compute/paramRegistry';
import { createApi } from '../modules/api';
import type { FeatureRecord } from '../intent/featureRecord';
import { transpileTs } from './transpile';
import { runIsolated } from './isolation';

export interface RunScriptInput {
  code: string;
  fileName: string;
}

export interface RunScriptResult {
  records: readonly FeatureRecord[];
  params: ParamRegistry;
  returnValue: unknown;
}

/**
 * Execute a `.kcad.ts` user script end-to-end:
 *   1. transpile TypeScript → ES2022 JavaScript,
 *   2. run inside an isolated `vm` context with the kernelCAD API injected
 *      as the only mutable globals, and
 *   3. return the captured `FeatureRecord`s, the populated `ParamRegistry`,
 *      and whatever the script `return`ed (typically the root `Shape`).
 *
 * The script's top-level `return` is captured via `wrapReturn` — the script
 * body is wrapped in an IIFE inside the sandbox.
 */
export async function runScript(input: RunScriptInput): Promise<RunScriptResult> {
  const { code, fileName } = input;
  const session = new CaptureSession();
  const params = new ParamRegistry();
  const api = createApi({ session, params });

  const transpiled = transpileTs(code, fileName);

  const result = runIsolated(
    transpiled.code,
    fileName,
    api as unknown as Record<string, unknown>,
    { wrapReturn: true },
  );

  return {
    records: session.getRecords(),
    params,
    returnValue: result.returnValue,
  };
}

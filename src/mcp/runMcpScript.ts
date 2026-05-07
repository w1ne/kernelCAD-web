import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { initOcct } from '../backends/occt/occtBackend';
import { kernelErrorToDiagnostic } from '../script-runtime/kernelErrorToDiagnostic';
import { runScript, type RunScriptResult } from '../script-runtime/runScript';

export interface McpScriptInput {
  file?: string;
  code?: string;
}

export type RunMcpScriptResult =
  | {
      ok: true;
      run: RunScriptResult;
      fileName: string;
    }
  | {
      ok: false;
      error: string;
      errorCode?: string;
    };

export async function runMcpScript(input: McpScriptInput): Promise<RunMcpScriptResult> {
  await initOcct();

  const source = await loadMcpScriptSource(input);
  if (!source.ok) return source;

  try {
    return {
      ok: true,
      fileName: source.fileName,
      run: await runScript({ code: source.code, fileName: source.fileName }),
    };
  } catch (e) {
    const diag = kernelErrorToDiagnostic(e);
    return { ok: false, error: diag.message, errorCode: diag.code };
  }
}

export type LoadMcpScriptSourceResult =
  | { ok: true; code: string; fileName: string }
  | { ok: false; error: string };

export async function loadMcpScriptSource(input: McpScriptInput): Promise<LoadMcpScriptSourceResult> {
  if (input.code !== undefined) {
    return {
      ok: true,
      code: input.code,
      fileName: input.file ?? '<inline>',
    };
  }

  if (input.file === undefined) {
    return { ok: false, error: 'Must provide either { file } or { code }.' };
  }

  const filePath = resolve(input.file);
  try {
    return {
      ok: true,
      code: await readFile(filePath, 'utf8'),
      fileName: filePath,
    };
  } catch (e) {
    return {
      ok: false,
      error: `Cannot read file: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

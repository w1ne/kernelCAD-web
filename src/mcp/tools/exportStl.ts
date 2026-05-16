// src/mcp/tools/exportStl.ts
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runAndExport } from '../../script-runtime/export';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../shared/diagnostics/diagnostic';
import { validateOutputPath } from '../../script-runtime/safeOutputPath';
import { loadMcpScriptSource } from '../runMcpScript';

export interface ExportStlInput {
  file?: string;
  code?: string;
  output_path: string;
  feature_id?: string;
}

export interface ExportStlOutput {
  ok: boolean;
  output_path?: string;
  byte_count?: number;
  /** Total features in the script, not the count contributing to the exported shape. */
  feature_count?: number;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

/**
 * MCP `export_stl` tool — runs a kernelCAD script and writes a binary STL
 * file to `output_path`. This is the first MCP tool with a server-side
 * write side-effect; STL files are 50KB–1MB+ and unsuitable for inline
 * JSON-RPC transport.
 *
 * Pass either `{ file }` (path on disk) or `{ code }` (inline source),
 * plus a required `output_path`. Optional `feature_id` selects which
 * feature to export (default: last returned shape).
 *
 * Returns a JSON receipt: `{ ok, output_path, byte_count, feature_count, diagnostics }`.
 */
export async function exportStlTool(input: ExportStlInput): Promise<ExportStlOutput> {
  const { output_path, feature_id } = input;

  if (!output_path || typeof output_path !== 'string') {
    return { ok: false, error: 'Required: output_path' };
  }

  const source = await loadMcpScriptSource(input);
  if (!source.ok) return source;

  await initOcct();

  let result;
  try {
    result = await runAndExport({
      code: source.code,
      fileName: source.fileName,
      format: 'stl',
      feature_id,
    });
  } catch (e) {
    return {
      ok: false,
      error: `Export failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const errorDiagnostics = result.diagnostics.filter(d => d.severity === 'error');
  if (errorDiagnostics.length > 0) {
    return {
      ok: false,
      diagnostics: withNextActions(result.diagnostics),
      feature_count: result.featureCount,
    };
  }

  // Validate output_path before any write.
  const pathCheck = validateOutputPath(output_path);
  if (!pathCheck.ok) {
    return { ok: false, error: pathCheck.error };
  }
  const finalPath = pathCheck.resolved!;

  try {
    await mkdir(dirname(finalPath), { recursive: true });
    await writeFile(finalPath, Buffer.from(result.bytes));
  } catch (e) {
    return {
      ok: false,
      error: `Cannot write to ${finalPath}: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  return {
    ok: true,
    output_path: finalPath,
    byte_count: result.bytes.byteLength,
    feature_count: result.featureCount,
    diagnostics: withNextActions(result.diagnostics),
  };
}

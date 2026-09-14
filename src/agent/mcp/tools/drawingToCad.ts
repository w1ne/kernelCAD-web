// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/drawingToCad.ts
//
// MCP `drawing_to_cad` — file IO around the drawing-to-CAD pipeline in
// src/agent/drawing/. Reads the PDF (a local path, or inline base64 for a
// hosted server that cannot see the caller's filesystem), runs the pipeline,
// and on `out` writes the emitted `.kcad.ts` plus its `<stem>.ledger.json` —
// the same persisted-ledger convention `resolve_assumptions` reads.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { drawingToCad, type DrawingToCadResult } from '../../drawing/index';
import { FILE_READ_CODE } from '../../../shared/diagnostics/fileReadError';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../../shared/diagnostics/registry';

export interface DrawingToCadToolInput {
  /** Path to the drawing PDF on the machine running kernelCAD. */
  path?: string;
  /** The PDF inline, base64-encoded — works against a hosted server. */
  pdfBase64?: string;
  /** 1-based page. Default 1. */
  page?: number;
  projection?: 'third-angle' | 'first-angle';
  /** Where to write the emitted `.kcad.ts`; the ledger lands beside it as `<stem>.ledger.json`. */
  out?: string;
  /** Evaluate the result and compare it with the drawing (default true). */
  verify?: boolean;
}

export type DrawingToCadToolOutput = DrawingToCadResult & {
  scriptPath?: string;
  ledgerPath?: string;
};

function inputError(message: string): DrawingToCadToolOutput {
  const d: CompilerDiagnostic = {
    target: 'export-occt',
    code: 'cli.invalid-args',
    severity: 'error',
    message,
    hint: HINT_TEMPLATES['cli.invalid-args'].template,
    nextAction: NEXT_ACTIONS['cli.invalid-args'],
  };
  return { ok: false, page: 1, pageCount: 0, views: [], params: [], ledger: { facts: [], unresolvedCount: 0 }, diagnostics: [d] };
}

/** `bracket.kcad.ts` → `bracket.ledger.json`; any other name gets `.ledger.json` appended to its stem. */
export function ledgerPathFor(scriptPath: string): string {
  const stem = scriptPath.replace(/(\.kcad)?\.ts$/, '');
  return `${stem}.ledger.json`;
}

export async function drawingToCadTool(input: DrawingToCadToolInput): Promise<DrawingToCadToolOutput> {
  const hasPath = typeof input?.path === 'string' && input.path.length > 0;
  const hasInline = typeof input?.pdfBase64 === 'string' && input.pdfBase64.length > 0;
  if (hasPath === hasInline) {
    return inputError('drawing_to_cad: pass exactly one of `path` (a local PDF) or `pdfBase64` (the PDF inline).');
  }
  if (input.out !== undefined && !/\.ts$/.test(input.out)) {
    return inputError(`drawing_to_cad: \`out\` must name a .kcad.ts file; got '${input.out}'.`);
  }

  let pdf: Uint8Array;
  let source: string;
  if (hasPath) {
    try {
      pdf = new Uint8Array(await readFile(input.path!));
      source = basename(input.path!);
    } catch (e) {
      const d: CompilerDiagnostic = {
        target: 'export-occt',
        code: FILE_READ_CODE,
        severity: 'error',
        message:
          `Cannot read file: ${e instanceof Error ? e.message : String(e)}. Either the path does not exist locally, ` +
          'or this kernelCAD server is hosted/remote and cannot see your filesystem. Pass the PDF inline via `pdfBase64` instead of `path` — that works on both.',
        hint: HINT_TEMPLATES[FILE_READ_CODE].template,
        nextAction: NEXT_ACTIONS[FILE_READ_CODE],
      };
      return { ok: false, page: input.page ?? 1, pageCount: 0, views: [], params: [], ledger: { facts: [], unresolvedCount: 0 }, diagnostics: [d] };
    }
  } else {
    pdf = new Uint8Array(Buffer.from(input.pdfBase64!, 'base64'));
    source = 'inline PDF';
  }

  const scriptPath = input.out !== undefined ? resolve(input.out) : undefined;
  const ledgerPath = scriptPath ? ledgerPathFor(scriptPath) : undefined;
  const result = await drawingToCad({
    pdf,
    source,
    ...(input.page !== undefined ? { page: input.page } : {}),
    ...(input.projection !== undefined ? { projection: input.projection } : {}),
    ...(input.verify !== undefined ? { verify: input.verify } : {}),
    ...(ledgerPath ? { ledgerPath: `./${basename(ledgerPath)}` } : {}),
  });

  if (!scriptPath || !ledgerPath || result.script === undefined) return result;
  await mkdir(dirname(scriptPath), { recursive: true });
  await writeFile(scriptPath, result.script, 'utf8');
  await writeFile(ledgerPath, JSON.stringify(result.ledger, null, 2) + '\n', 'utf8');
  return { ...result, scriptPath, ledgerPath };
}

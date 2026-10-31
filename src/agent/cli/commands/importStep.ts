// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// `kernelcad import-step` translates STEP product assemblies into a portable
// KernelCAD source + exact native BREP asset bundle.

import { readFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { Command } from 'commander';
import { importStepAssembly } from '../../../kernel/import/stepAssemblyImport';
import { StepAssemblyImportError } from '../../../kernel/import/stepAssemblyTypes';
import { readStepExternalDocuments } from '../../../kernel/import/stepExternalDocuments';
import { validateStepBundleName, writeStepBundle, type WrittenStepBundle } from '../../../kernel/import/stepBundleWriter';

export interface ImportStepCliInput {
  file: string;
  out: string;
  name?: string;
  json: boolean;
}

export interface ImportStepCliResult {
  exitCode: number;
  ok: boolean;
  bundle?: WrittenStepBundle;
  error?: { code: string; message: string; sourcePath?: string[] };
  warnings?: string[];
}

function failure(exitCode: number, code: string, message: string, sourcePath?: string[]): ImportStepCliResult {
  return { exitCode, ok: false, error: { code, message, ...(sourcePath !== undefined ? { sourcePath } : {}) } };
}

export async function runImportStepCli(input: ImportStepCliInput): Promise<ImportStepCliResult> {
  const extension = extname(input.file).toLowerCase();
  if (extension !== '.step' && extension !== '.stp') {
    return failure(2, 'cli.invalid-args', `Expected a .step or .stp input file; got '${input.file}'.`);
  }
  if (typeof input.out !== 'string' || input.out.trim() === '') {
    return failure(2, 'cli.invalid-args', '--out must name a destination directory.');
  }

  const inputBaseName = basename(input.file);
  const assemblyName = input.name ?? inputBaseName.slice(0, -extension.length);
  const nameError = validateStepBundleName(assemblyName);
  if (nameError !== undefined) return failure(2, 'cli.invalid-args', nameError);

  const inputPath = resolve(input.file);
  let bytes: Buffer;
  try {
    bytes = await readFile(inputPath);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return failure(2, 'cli.file-read', `Cannot read STEP input '${inputPath}': ${detail}`);
  }

  try {
    const externalDocuments = await readStepExternalDocuments(inputPath, bytes);
    const snapshot = await importStepAssembly(bytes, basename(inputPath), externalDocuments);
    const bundle = await writeStepBundle({
      inputName: inputPath,
      inputBytes: bytes,
      externalDocuments,
      outDir: input.out,
      assemblyName,
      snapshot,
    });
    return { exitCode: 0, ok: true, bundle, warnings: snapshot.warnings };
  } catch (error) {
    if (error instanceof StepAssemblyImportError) {
      return failure(1, `step.${error.reason}`, error.message, error.sourcePath);
    }
    const message = error instanceof Error ? error.message : String(error);
    const alreadyExists = message.startsWith('Output path already exists:');
    return failure(1, alreadyExists ? 'cli.output-exists' : 'cli.import-step-failed', message);
  }
}

export function importStepCommand(): Command {
  return new Command('import-step')
    .description('Translate a STEP assembly into a .kcad.ts project with exact native BREP part assets')
    .argument('<input.step>', 'path to an ISO-10303-21 STEP file (.step or .stp)')
    .requiredOption('--out <directory>', 'new output bundle directory; an existing path is never overwritten')
    .option('--name <assembly-name>', 'root assembly and generated script name; defaults to the input filename')
    .option('--json', 'emit a machine-readable result')
    .addHelpText('after', '\nBundle contents: <name>.kcad.ts, manifest.json, parts/*.brep\nLocal relative DOCUMENT_FILE dependencies are read recursively and hashed; references must stay within the input directory.\n')
    .action(async (file: string, opts: { out: string; name?: string; json?: boolean }) => {
      const result = await runImportStepCli({
        file,
        out: opts.out,
        name: opts.name,
        json: opts.json ?? false,
      });
      if (opts.json) {
        console.log(JSON.stringify({
          ok: result.ok,
          ...(result.bundle !== undefined ? { bundle: result.bundle } : {}),
          ...(result.error !== undefined ? { error: result.error } : {}),
          ...(result.warnings !== undefined ? { warnings: result.warnings } : {}),
        }, null, 2));
      } else if (result.bundle !== undefined) {
        console.log(`wrote ${result.bundle.script}`);
        console.log(`wrote ${result.bundle.manifest}`);
        console.log(`${result.bundle.partAssets} BREP assets for ${result.bundle.definitionCount} definitions and ${result.bundle.occurrenceCount} occurrences`);
        for (const warning of result.warnings ?? []) console.warn(`warning: ${warning}`);
      } else if (result.error !== undefined) {
        console.error(`${result.error.code}: ${result.error.message}`);
        if (result.error.sourcePath !== undefined) console.error(`component: ${result.error.sourcePath.join(' / ')}`);
      }
      process.exitCode = result.exitCode;
    });
}

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// `kernelcad import-step` translates STEP product assemblies into a portable
// KernelCAD source + exact native BREP asset bundle.

import { readFile, stat } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { Command } from 'commander';
import { convertSolidWorksPart, MAX_NATIVE_CAD_BYTES } from '../../../modeling/parts/fromNativeCAD';
import { importStepAssembly } from '../../../kernel/import/stepAssemblyImport';
import { StepAssemblyImportError } from '../../../kernel/import/stepAssemblyTypes';
import { readStepExternalDocuments } from '../../../kernel/import/stepExternalDocuments';
import { renamedStepPartWarning, validateStepBundleName, writeStepBundle, type WrittenStepBundle } from '../../../kernel/import/stepBundleWriter';
import { KernelError } from '../../../shared/intent/kernelError';

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

interface PreparedImport {
  inputPath: string;
  nativeSolidWorks: boolean;
  assemblyName: string;
  outDir: string;
}

type PrepareImportResult = { ok: true; value: PreparedImport } | { ok: false; result: ImportStepCliResult };
type ReadInputResult = { ok: true; bytes: Buffer } | { ok: false; result: ImportStepCliResult };

function failure(exitCode: number, code: string, message: string, sourcePath?: string[]): ImportStepCliResult {
  return { exitCode, ok: false, error: { code, message, ...(sourcePath !== undefined ? { sourcePath } : {}) } };
}

export async function runImportStepCli(input: ImportStepCliInput): Promise<ImportStepCliResult> {
  const prepared = prepareImport(input);
  if (!prepared.ok) return prepared.result;
  const source = await readImportSource(prepared.value, input.file);
  if (!source.ok) return source.result;

  try {
    const conversion = prepared.value.nativeSolidWorks
      ? await convertSolidWorksPart(prepared.value.inputPath, 'cli')
      : undefined;
    const imported = await importPreparedStep(prepared.value, source.bytes, conversion);
    return success(imported.snapshot.warnings, imported.bundle, conversion);
  } catch (error) {
    return handleImportError(error);
  }
}

function prepareImport(input: ImportStepCliInput): PrepareImportResult {
  const extension = extname(input.file).toLowerCase();
  const nativeSolidWorks = extension === '.sldprt';
  if (extension !== '.step' && extension !== '.stp' && !nativeSolidWorks) {
    return { ok: false, result: failure(2, 'cli.invalid-args', `Expected a .step, .stp, or native SolidWorks .sldprt input file; got '${input.file}'.`) };
  }
  if (typeof input.out !== 'string' || input.out.trim() === '') {
    return { ok: false, result: failure(2, 'cli.invalid-args', '--out must name a destination directory.') };
  }

  const inputBaseName = basename(input.file);
  const assemblyName = input.name ?? inputBaseName.slice(0, -extension.length);
  const nameError = validateStepBundleName(assemblyName);
  if (nameError !== undefined) return { ok: false, result: failure(2, 'cli.invalid-args', nameError) };
  return {
    ok: true,
    value: { inputPath: resolve(input.file), nativeSolidWorks, assemblyName, outDir: input.out },
  };
}

async function readImportSource(prepared: PreparedImport, inputLabel: string): Promise<ReadInputResult> {
  try {
    if (prepared.nativeSolidWorks) {
      const sourceStat = await stat(prepared.inputPath);
      if (!sourceStat.isFile() || sourceStat.size === 0) {
        return { ok: false, result: failure(2, 'cli.file-read', `Native CAD input '${prepared.inputPath}' is not a non-empty regular file.`) };
      }
      if (sourceStat.size > MAX_NATIVE_CAD_BYTES) {
        return { ok: false, result: failure(2, 'cli.input-too-large', `Native CAD input is ${sourceStat.size} bytes; the import limit is ${MAX_NATIVE_CAD_BYTES} bytes.`) };
      }
    }
    return { ok: true, bytes: await readFile(prepared.inputPath) };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, result: failure(2, 'cli.file-read', `Cannot read CAD input '${resolve(inputLabel)}': ${detail}`) };
  }
}

async function importPreparedStep(
  prepared: PreparedImport,
  sourceBytes: Buffer,
  conversion: Awaited<ReturnType<typeof convertSolidWorksPart>> | undefined,
) {
  const inputBytes = conversion?.bytes ?? sourceBytes;
  const externalDocuments = conversion
    ? new Map<string, Uint8Array>()
    : await readStepExternalDocuments(prepared.inputPath, inputBytes);
  const stepInputName = conversion
    ? `${basename(prepared.inputPath, extname(prepared.inputPath))}.step`
    : basename(prepared.inputPath);
  const snapshot = await importStepAssembly(inputBytes, stepInputName, externalDocuments);
  const bundle = await writeStepBundle({
    inputName: prepared.inputPath,
    inputBytes: sourceBytes,
    externalDocuments,
    outDir: prepared.outDir,
    assemblyName: prepared.assemblyName,
    snapshot,
    ...(conversion ? { sourceFormat: 'sldprt' as const, conversionEngine: conversion.version } : {}),
  });
  return { snapshot, bundle };
}

function success(
  snapshotWarnings: string[],
  bundle: WrittenStepBundle,
  conversion: Awaited<ReturnType<typeof convertSolidWorksPart>> | undefined,
): ImportStepCliResult {
  const conversionWarnings = conversion === undefined ? [] : [
    `Native SolidWorks part converted through ${conversion.version}; source feature history, PMI, and assembly relations are not preserved by the STEP B-rep handoff.`,
    ...(conversion.report !== '' ? [`cadmpeg report: ${conversion.report}`] : []),
  ];
  return {
    exitCode: 0,
    ok: true,
    bundle,
    warnings: [...snapshotWarnings, ...bundle.renamedParts.map(renamedStepPartWarning), ...conversionWarnings],
  };
}

function handleImportError(error: unknown): ImportStepCliResult {
  if (error instanceof KernelError) return failure(1, error.code, error.message);
  if (error instanceof StepAssemblyImportError) {
    return failure(1, `step.${error.reason}`, error.message, error.sourcePath);
  }
  const message = error instanceof Error ? error.message : String(error);
  const alreadyExists = message.startsWith('Output path already exists:');
  return failure(1, alreadyExists ? 'cli.output-exists' : 'cli.import-step-failed', message);
}

export function importStepCommand(): Command {
  return new Command('import-step')
    .description('Translate a STEP assembly or SolidWorks part into a .kcad.ts project with exact native BREP assets')
    .argument('<input.cad>', 'path to STEP (.step/.stp) or a native SolidWorks part (.sldprt)')
    .requiredOption('--out <directory>', 'new output bundle directory; an existing path is never overwritten')
    .option('--name <assembly-name>', 'root assembly and generated script name; defaults to the input filename')
    .option('--json', 'emit a machine-readable result')
    .addHelpText('after', '\nBundle contents: <name>.kcad.ts, manifest.json, parts/*.brep\nNative .sldprt input requires cadmpeg 0.6.12 or newer (or KERNELCAD_CADMPEG_BIN). It is converted to exact STEP B-rep geometry; original feature history, PMI, and assembly relations are not preserved.\nSTEP relative DOCUMENT_FILE dependencies are read recursively and hashed; references must stay within the input directory.\n')
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

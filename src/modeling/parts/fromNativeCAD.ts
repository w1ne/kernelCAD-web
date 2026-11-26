// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Import native SolidWorks part files through the explicitly installed
// cadmpeg converter, then hand the exact STEP B-rep to the existing OCCT
// import path. No mesh fallback is allowed on this path.

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { promisify } from 'node:util';
import { resolveScriptRelativePath } from '../../shared/runtime/scriptRelativePath';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { KernelError } from '../../shared/intent/kernelError';
import { isTopologicallyValid } from '../../kernel/backends/occt/edgeFeatureValidity';
import { Shape } from '../capture/proxy';
import type { FromSTEPContext } from './fromSTEP';
import { importStepCached, isStepBackendHealed } from './stepParseCache';

const execFileAsync = promisify(execFile);
export const MAX_NATIVE_CAD_BYTES = 50 * 1024 * 1024;
const MAX_CONVERTED_STEP_BYTES = 100 * 1024 * 1024;
const CONVERSION_TIMEOUT_MS = 120_000;
const CONVERSION_MAX_BUFFER_BYTES = 10 * 1024 * 1024;

export interface FromNativeCADOptions {
  /** Zero-based solid to select from a multi-solid part. Omit to import all bodies. */
  solid?: number;
}

export interface ConvertedNativeCADStep {
  bytes: Buffer;
  version: string;
  report: string;
}

type NativeCADCaller = 'api' | 'cli';

/** Import a native SolidWorks part as exact B-rep through cadmpeg and OCCT. */
export async function fromNativeCAD(
  ctx: FromSTEPContext,
  path: string,
  opts?: FromNativeCADOptions,
): Promise<Shape> {
  if (typeof path !== 'string' || path.length === 0) {
    invalidArgs({
      api: 'lib.fromNativeCAD(path)',
      path: 'path',
      got: path,
      requires: 'a relative or absolute path to a native SolidWorks part file with the .sldprt extension',
      example: "await lib.fromNativeCAD('parts/bracket.sldprt')",
    });
  }
  if (extname(path).toLowerCase() !== '.sldprt') {
    invalidArgs({
      api: 'lib.fromNativeCAD(path)',
      path: 'path',
      got: path,
      requires: 'a native SolidWorks part file with the .sldprt extension; assemblies and other native formats are not supported by this import path',
      example: "await lib.fromNativeCAD('parts/bracket.sldprt')",
    });
  }
  if (opts?.solid !== undefined && (!Number.isInteger(opts.solid) || opts.solid < 0)) {
    invalidArgs({
      api: 'lib.fromNativeCAD(path, opts)',
      path: 'opts.solid',
      got: opts.solid,
      showType: true,
      requires: 'a non-negative integer zero-based solid index',
      example: "await lib.fromNativeCAD('parts/bracket.sldprt', { solid: 0 })",
    });
  }

  const sourcePath = resolveScriptRelativePath(ctx.scriptDir, path);
  const converted = await convertSolidWorksPart(sourcePath);
  const backend = await importConvertedStep(converted.bytes, sourcePath);
  const solidCount = backend.solidComponents().length;
  if (solidCount === 0) {
    throw conversionError(
      sourcePath,
      'cadmpeg output contained no solid bodies',
      'The native file must translate to at least one closed solid. Export a STEP file from SolidWorks if its body is surface-only.',
    );
  }

  const selected = opts?.solid === undefined ? backend : selectSolid(backend, opts.solid, sourcePath, solidCount);
  if (!isValidBrep(selected)) {
    throw conversionError(
      sourcePath,
      'cadmpeg output did not produce a valid OCCT B-rep',
      'The imported native file is not returned because its translated solid failed the OCCT B-rep validity check.',
    );
  }

  const shape = ctx.session.createShape({
    kind: 'importedStep',
    params: {},
    inputs: {},
    metadata: {
      sourcePath,
      sourceFormat: 'sldprt',
      conversionEngine: converted.version,
      conversionReport: converted.report,
      solidCount,
      ...(opts?.solid !== undefined ? { solidIndex: opts.solid } : {}),
      healed: isStepBackendHealed(selected),
    },
  });
  ctx.session.importedGeometry.set(shape.id, selected);
  return shape;
}

export async function convertSolidWorksPart(
  sourcePath: string,
  caller: NativeCADCaller = 'api',
): Promise<ConvertedNativeCADStep> {
  await validateSolidWorksSource(sourcePath, caller);
  const converter = process.env.KERNELCAD_CADMPEG_BIN?.trim() || 'cadmpeg';
  const tempDir = await mkdtemp(join(tmpdir(), 'kernelcad-native-cad-'));
  const outputPath = join(tempDir, 'converted.step');
  try {
    const version = await readCadmpegVersion(converter, sourcePath);
    return await convertCadmpegOutput(converter, sourcePath, outputPath, version);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function validateSolidWorksSource(sourcePath: string, caller: NativeCADCaller): Promise<void> {
  if (extname(sourcePath).toLowerCase() !== '.sldprt') {
    invalidNativeCADInput(sourcePath, 'a native SolidWorks part file with the .sldprt extension', caller);
  }
  let sourceStat;
  try {
    sourceStat = await stat(sourcePath);
  } catch {
    invalidNativeCADInput(sourcePath, 'an existing readable native SolidWorks part file', caller);
  }
  if (!sourceStat.isFile() || sourceStat.size === 0) {
    invalidNativeCADInput(`${sourcePath} (${sourceStat.size} bytes)`, 'a non-empty regular SolidWorks part file', caller);
  }
  if (sourceStat.size > MAX_NATIVE_CAD_BYTES) {
    invalidNativeCADInput(
      `${sourcePath} (${sourceStat.size} bytes)`,
      `a native part no larger than ${MAX_NATIVE_CAD_BYTES} bytes`,
      caller,
    );
  }
}

function invalidNativeCADInput(got: unknown, requires: string, caller: NativeCADCaller): never {
  const context = caller === 'cli'
    ? {
        api: 'kernelcad import-step <input.cad>',
        path: 'input.cad',
        code: 'cli.invalid-args' as const,
        example: "kernelcad import-step 'parts/bracket.sldprt' --out ./bracket-import",
      }
    : {
        api: 'lib.fromNativeCAD(path)',
        path: 'path',
        code: 'feature.invalid-args' as const,
        example: "await lib.fromNativeCAD('parts/bracket.sldprt')",
      };
  invalidArgs({ ...context, got, requires });
}

async function readCadmpegVersion(converter: string, sourcePath: string): Promise<string> {
  const result = await executeCadmpeg(converter, ['--version'], sourcePath);
  const version = result.stdout.trim();
  const parsed = version.match(/^cadmpeg\s+(\d+)\.(\d+)\.(\d+)/);
  if (!parsed) throw conversionError(sourcePath, `unexpected cadmpeg version response: ${version || '(empty)'}`);
  const [major, minor, patch] = parsed.slice(1).map(Number);
  if (major === 0 && (minor < 6 || (minor === 6 && patch < 12))) {
    throw conversionError(
      sourcePath,
      `${version} is older than the supported minimum cadmpeg 0.6.12`,
      'Install cadmpeg 0.6.12 or newer; the native file was not imported.',
    );
  }
  return version;
}

async function convertCadmpegOutput(
  converter: string,
  sourcePath: string,
  outputPath: string,
  version: string,
): Promise<ConvertedNativeCADStep> {
  const result = await executeCadmpeg(converter, ['convert', sourcePath, '-o', outputPath], sourcePath);
  const outputStat = await stat(outputPath).catch(() => undefined);
  if (!outputStat?.isFile() || outputStat.size === 0) {
    throw conversionError(sourcePath, 'cadmpeg exited without writing a STEP file');
  }
  if (outputStat.size > MAX_CONVERTED_STEP_BYTES) {
    throw conversionError(sourcePath, `cadmpeg output exceeds the ${MAX_CONVERTED_STEP_BYTES}-byte STEP import limit`);
  }
  const bytes = await readFile(outputPath);
  if (!/^\s*ISO-10303-21\b/.test(bytes.subarray(0, 256).toString('latin1'))) {
    throw conversionError(sourcePath, 'cadmpeg output is not a STEP Part 21 file');
  }
  return { bytes, version, report: clip(`${result.stdout}\n${result.stderr}`, 2400) };
}

async function executeCadmpeg(
  converter: string,
  args: string[],
  sourcePath: string,
): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync(converter, args, {
      timeout: CONVERSION_TIMEOUT_MS,
      maxBuffer: CONVERSION_MAX_BUFFER_BYTES,
      windowsHide: true,
      env: converterEnv(),
    });
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stderr?: string; killed?: boolean; code?: string | number };
    if (err.code === 'ENOENT') {
      throw new KernelError(
        'feature.kernel-failed',
        'lib.fromNativeCAD requires the cadmpeg command. Install cadmpeg 0.6.12 or newer, or set KERNELCAD_CADMPEG_BIN to its executable path.',
        undefined,
        'kernel-failed.lib.fromNativeCAD.converter-unavailable — install cadmpeg 0.6.12 or newer; the native file was not imported.',
      );
    }
    const reason = err.killed
      ? `cadmpeg conversion exceeded ${CONVERSION_TIMEOUT_MS} ms`
      : `cadmpeg failed${err.code !== undefined ? ` (${err.code})` : ''}: ${clip(err.stderr ?? err.message)}`;
    throw conversionError(
      sourcePath,
      reason,
      'Check that the SolidWorks part is supported and not truncated. No STEP body was imported.',
    );
  }
}

function converterEnv(): NodeJS.ProcessEnv {
  const keys = ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'SYSTEMROOT'];
  return Object.fromEntries(keys.flatMap(key => {
    const value = process.env[key];
    return value === undefined ? [] : [[key, value]];
  }));
}

function clip(value: string, maxLength = 800): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

async function importConvertedStep(bytes: Buffer, sourcePath: string) {
  try {
    return await importStepCached(bytes);
  } catch (error) {
    throw conversionError(
      sourcePath,
      `the converted STEP could not be imported: ${error instanceof Error ? error.message : String(error)}`,
      'The native file is refused unless cadmpeg produces a readable exact STEP B-rep. No mesh fallback is used.',
    );
  }
}

function selectSolid(
  backend: Awaited<ReturnType<typeof importStepCached>>,
  index: number,
  sourcePath: string,
  count: number,
): Awaited<ReturnType<typeof importStepCached>> {
  const selected = backend.solidComponents()[index];
  if (selected === undefined) {
    throw conversionError(sourcePath, `solid index ${index} is not present; the native part produced ${count} solid bodies`);
  }
  return selected;
}

function isValidBrep(backend: Awaited<ReturnType<typeof importStepCached>>): boolean {
  return isTopologicallyValid(backend.getReplicadShape().wrapped);
}

function conversionError(sourcePath: string, reason: string, action?: string): KernelError {
  return new KernelError(
    'feature.kernel-failed',
    `lib.fromNativeCAD: ${basename(sourcePath)} was not imported: ${reason}.`,
    undefined,
    `kernel-failed.lib.fromNativeCAD.conversion-failed — ${action ?? 'the source must translate to a readable exact solid.'}`,
  );
}

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/gcode/slicerCli.ts
//
// Real slicer CLI integration for the `gcode` export format. No fake or
// placeholder G-code is ever produced: when no slicer binary is available,
// `sliceStlToGcode` returns `{ ok: false }` and the caller emits
// `export.gcode.slicer-unavailable`.
//
// Detection order: `KERNELCAD_SLICER` env var (explicit path/binary name),
// then PATH lookup of `orca-slicer`, `prusa-slicer`, `PrusaSlicer` in that
// order.
//
// CLI dispatch note (see the design spec for the full story): OrcaSlicer's
// `--load-settings` for *machine*/*process* profile JSON trips a
// printer/process compatibility-check bug regardless of the profile's own
// `compatible_printers` field, so per-print knobs (layer height, infill,
// supports, bed shape, start/end gcode) are passed as individual dash-cased
// CLI flags instead of a loaded settings file — the same config keys, just
// via `--layer-height 0.2` rather than a JSON blob. `--load-filaments` for
// material profiles works normally and is used as designed.

import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { accessSync, constants } from 'node:fs';
import {
  materialProfilePath, resolvePrinterProfile, printableAreaArg, isKnownMaterial,
  DEFAULT_MATERIAL, type MaterialName,
} from './profiles';

const CANDIDATE_BINARIES = ['orca-slicer', 'prusa-slicer', 'PrusaSlicer'];

/** Slicer binaries that are valid for the "open a STEP/3MF file" action.
 *  Kept separate from {@link CANDIDATE_BINARIES} so the gcode slicing path
 *  keeps its Orca/Prusa-specific CLI contract. */
const OPEN_CANDIDATE_BINARIES = [
  'orca-slicer', 'prusa-slicer', 'PrusaSlicer', 'bambu-studio', 'BambuStudio', 'cura',
];

function isExecutableOnPath(bin: string): string | undefined {
  const pathDirs = (process.env.PATH ?? '').split(':').filter(Boolean);
  for (const dir of pathDirs) {
    const candidate = join(dir, bin);
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // not here, keep looking
    }
  }
  return undefined;
}

/**
 * Locate the slicer binary to invoke. Returns `undefined` if none is
 * available (env var unset/invalid and no candidate on PATH).
 *
 * @param candidates - Binary names to search on PATH. Defaults to the
 *   Orca/Prusa candidates used by the gcode slicing path.
 */
export function detectSlicer(candidates: readonly string[] = CANDIDATE_BINARIES): string | undefined {
  const envSlicer = process.env.KERNELCAD_SLICER;
  if (envSlicer) {
    try {
      accessSync(envSlicer, constants.X_OK);
      return envSlicer;
    } catch {
      const onPath = isExecutableOnPath(envSlicer);
      if (onPath) return onPath;
    }
  }
  for (const bin of candidates) {
    const found = isExecutableOnPath(bin);
    if (found) return found;
  }
  return undefined;
}

export interface SliceOptions {
  printer?: string;
  layerHeight?: number;
  /** Infill density, 0-100 (percent). */
  infill?: number;
  supports?: boolean;
  material?: string;
}

export interface SliceResult {
  ok: boolean;
  gcode?: string;
  error?: string;
}

/**
 * Slice an STL file to G-code with the detected slicer CLI. Runs
 * synchronously (blocking) with a generous but bounded timeout — slicing a
 * small mechanical part should complete in well under a minute.
 */
export async function sliceStlToGcode(
  stlPath: string,
  opts: SliceOptions,
): Promise<SliceResult> {
  const binary = detectSlicer();
  if (!binary) {
    return { ok: false, error: 'slicer-unavailable' };
  }

  // Validate the printer profile name (throws on an unknown profile) and
  // forward its bed to the slicer CLI. OrcaSlicer's own default
  // `printable_height` is ~100 mm; without these flags a part that already
  // passed the pre-slice bbox gate against `generic-fdm` (250 mm) is still
  // rejected. Real option names (see `orca-slicer --help` + the settings
  // dump): `--printable-area`, `--printable-height`. `--bed-shape` is not
  // a recognized Orca flag.
  const printer = resolvePrinterProfile(opts.printer);
  const material: MaterialName = opts.material && isKnownMaterial(opts.material)
    ? opts.material
    : DEFAULT_MATERIAL;

  const outDir = await mkdtemp(join(tmpdir(), 'kernelcad-gcode-'));
  try {
    const args = [
      '--datadir', outDir,
      '--slice', '0',
      '--outputdir', outDir,
      '--load-filaments', materialProfilePath(material),
      '--layer-height', String(opts.layerHeight ?? 0.2),
      '--sparse-infill-density', String(opts.infill ?? 15),
      '--printable-area', printableAreaArg(printer),
      '--printable-height', String(printer.bedSizeMm.z),
      // `--enable-support` is a bare boolean flag (no value token) —
      // passing "0" gets consumed as the next positional argument (the
      // input file), which fails the slicer with "No such file: 0".
      ...(opts.supports ? ['--enable-support'] : []),
      // OrcaSlicer's relative-extruder Marlin flavor requires an explicit
      // per-layer extruder reset or the slicer refuses to slice
      // (return code -51, "Relative extruder addressing requires
      // resetting the extruder position at each layer").
      '--before-layer-change-gcode', 'G92 E0',
      stlPath,
    ];
    const result = spawnSync(binary, args, {
      timeout: 120_000,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.error) {
      return { ok: false, error: `slicer spawn failed: ${result.error.message}` };
    }
    if (result.status !== 0) {
      return {
        ok: false,
        error: `slicer exited ${result.status}: ${(result.stdout ?? '') + (result.stderr ?? '')}`.trim(),
      };
    }
    const gcodePath = join(outDir, 'plate_1.gcode');
    try {
      const gcode = await readFile(gcodePath, 'utf8');
      return { ok: true, gcode };
    } catch (e) {
      return { ok: false, error: `slicer reported success but no G-code was written: ${e instanceof Error ? e.message : String(e)}` };
    }
  } finally {
    await rm(outDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Write an STL buffer to a fresh temp file for the slicer CLI's own input. */
export async function withTempStl<T>(bytes: Uint8Array, fn: (path: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'kernelcad-stl-'));
  const path = join(dir, 'model.stl');
  try {
    await writeFile(path, bytes);
    return await fn(path);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Fail-closed error tag for {@link openFileInSlicer}. */
export type OpenSlicerError = 'no-slicer' | 'spawn-failed';

/** Result of asking a locally installed slicer to open a STEP/3MF file. */
export interface OpenSlicerResult {
  ok: boolean;
  file: string;
  binary?: string;
  error?: OpenSlicerError;
  message?: string;
}

/**
 * Open an already-exported STEP/3MF file in the locally installed slicer.
 * Detection prefers `KERNELCAD_SLICER`, then common binaries on PATH. The
 * process is launched detached and unreferenced so the CLI returns
 * immediately. If no slicer is found the result is typed
 * `{ ok: false, error: 'no-slicer' }` and the file is left untouched.
 */
export async function openFileInSlicer(filePath: string): Promise<OpenSlicerResult> {
  const binary = detectSlicer(OPEN_CANDIDATE_BINARIES);
  if (!binary) {
    return {
      ok: false,
      file: filePath,
      error: 'no-slicer',
      message: 'No slicer found. Set KERNELCAD_SLICER or install OrcaSlicer, PrusaSlicer, Bambu Studio, or Cura.',
    };
  }

  try {
    const child = spawn(binary, [filePath], { detached: true, stdio: 'ignore' });
    const result = await new Promise<OpenSlicerResult>((resolve) => {
      let settled = false;
      const done = (value: OpenSlicerResult) => {
        if (settled) return;
        settled = true;
        child.off('spawn', onSpawn);
        child.off('error', onError);
        resolve(value);
      };
      const onSpawn = () => {
        child.unref();
        done({ ok: true, file: filePath, binary });
      };
      const onError = (e: Error) => {
        // Do not unref a child that never started; report the async spawn failure.
        done({
          ok: false,
          file: filePath,
          binary,
          error: 'spawn-failed',
          message: e instanceof Error ? e.message : String(e),
        });
      };
      child.once('spawn', onSpawn);
      child.once('error', onError);
      // Defensive bounded wait: in pathological cases where neither 'spawn' nor
      // 'error' fires, unref the child and treat the open as best-effort success
      // so the CLI never hangs. Real systems resolve within a tick or two.
      const t = setTimeout(() => {
        child.unref();
        done({ ok: true, file: filePath, binary });
      }, 1_000);
      t.unref?.();
    });
    return result;
  } catch (e) {
    return {
      ok: false,
      file: filePath,
      binary,
      error: 'spawn-failed',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

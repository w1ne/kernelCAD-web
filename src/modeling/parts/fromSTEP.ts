// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/lib/parts/fromSTEP.ts
//
// Host-side STEP loader. The agent-facing `lib.fromSTEP(path)` call lives
// here — read a STEP file from disk (Node) or fetch it (browser), feed it
// to replicad's `importSTEP`, wrap the result in OcctBackend, and stash
// the lowered shape on the FeatureRecord's metadata so the lowerer can
// hand it back without re-importing.

import { readFile } from 'node:fs/promises';
import { resolveScriptRelativePath } from '../../shared/runtime/scriptRelativePath';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { importStepCached, StepParseError } from './stepParseCache';
import { Shape } from '../capture/proxy';
import type { CaptureSession } from '../capture/captureSession';
import { KernelError } from '../../shared/intent/kernelError';

export interface FromSTEPContext {
  session: CaptureSession;
  /** Absolute directory the calling .kcad.ts script lives in. Used to
   *  resolve relative STEP paths. Optional — when undefined, only absolute
   *  paths work. */
  scriptDir?: string;
}

export async function fromSTEP(ctx: FromSTEPContext, path: string): Promise<Shape> {
  if (typeof path !== 'string' || path.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      'lib.fromSTEP(path): path must be a non-empty string.',
      undefined,
      "invalid-args.lib.fromSTEP — pass a relative or absolute path to a .step file (e.g. lib.fromSTEP('parts/servo.step')).",
    );
  }

  const absPath = resolveScriptRelativePath(ctx.scriptDir, path);

  let buf: Buffer;
  try {
    buf = await readFile(absPath);
  } catch {
    throw new KernelError(
      'feature.invalid-args',
      `lib.fromSTEP: cannot read STEP file at ${absPath}.`,
      undefined,
      `invalid-args.lib.fromSTEP.path — verify the path '${path}' resolves under the script's directory; absolute paths are also accepted.`,
    );
  }

  // Parse (or reuse a content-hash-cached parse of) the STEP bytes. The cache
  // is what keeps a Studio rebuild from re-importing an unchanged part on
  // every code edit. We re-raise its failures as this call's KernelErrors so
  // the agent-facing diagnostics are unchanged.
  let backend: OcctBackend;
  try {
    backend = await importStepCached(buf);
  } catch (e) {
    if (e instanceof StepParseError && e.reason === 'no-solid') {
      // A Shape3D-class result is required (Solid / CompSolid / Compound);
      // 2D drawings and empty imports are rejected before the lowerer.
      throw new KernelError(
        'feature.kernel-failed',
        `lib.fromSTEP: ${absPath} did not contain a 3D solid.`,
        undefined,
        'kernel-failed.lib.fromSTEP.no-solid — the STEP file must contain at least one closed solid body.',
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fromSTEP: replicad failed to parse STEP at ${absPath}: ${msg}`,
      undefined,
      'kernel-failed.lib.fromSTEP.parse — file is not a valid STEP solid; re-export from the source CAD as AP203/AP214 with solid bodies.',
    );
  }

  // Park the lowered shape on the session's `importedGeometry` map (not in
  // metadata): replicad shapes carry circular refs that trip the
  // ParamRef metadata walker. The lowerer fetches by feature id.
  const shape = ctx.session.createShape({
    kind: 'importedStep',
    params: {},
    inputs: {},
    metadata: {
      sourcePath: absPath,
    },
  });
  ctx.session.importedGeometry.set(shape.id, backend);
  return shape;
}

/**
 * Lower an already-loaded STEP byte buffer onto a Shape. Used by the parts
 * catalog resolver (Slice C) so the orchestrator can pass cached or bundled
 * bytes without re-reading the disk.
 *
 * `sourceLabel` is used only for diagnostics / metadata.sourcePath; pass the
 * absolute path or remote URL the bytes came from.
 */
export async function fromStepBytes(
  ctx: FromSTEPContext,
  bytes: Buffer,
  sourceLabel: string,
): Promise<Shape> {
  if (!bytes || bytes.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      `lib.fetchPart: STEP bytes for ${sourceLabel} are empty.`,
      undefined,
      'parts.fetch.empty-bytes — re-fetch and try again.',
    );
  }
  let backend: OcctBackend;
  try {
    backend = await importStepCached(bytes);
  } catch (e) {
    if (e instanceof StepParseError && e.reason === 'no-solid') {
      throw new KernelError(
        'feature.kernel-failed',
        `lib.fetchPart: ${sourceLabel} did not contain a 3D solid.`,
        undefined,
        'kernel-failed.lib.fetchPart.no-solid.',
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fetchPart: replicad failed to parse STEP for ${sourceLabel}: ${msg}`,
      undefined,
      'kernel-failed.lib.fetchPart.parse — file is not a valid STEP solid.',
    );
  }
  const shape = ctx.session.createShape({
    kind: 'importedStep',
    params: {},
    inputs: {},
    metadata: { sourcePath: sourceLabel },
  });
  ctx.session.importedGeometry.set(shape.id, backend);
  return shape;
}

// src/lib/parts/fromSTEP.ts
//
// Host-side STEP loader. The agent-facing `lib.fromSTEP(path)` call lives
// here — read a STEP file from disk (Node) or fetch it (browser), feed it
// to replicad's `importSTEP`, wrap the result in OcctBackend, and stash
// the lowered shape on the FeatureRecord's metadata so the lowerer can
// hand it back without re-importing.

import * as replicad from 'replicad';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { OcctBackend, initOcct } from '../../backends/occt/occtBackend';
import { Shape } from '../../shared/capture/proxy';
import type { CaptureSession } from '../../capture/captureSession';
import { KernelError } from '../../intent/kernelError';

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

  const absPath = isAbsolute(path)
    ? path
    : ctx.scriptDir
      ? resolve(ctx.scriptDir, path)
      : resolve(process.cwd(), path);

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

  await initOcct();

  // replicad.importSTEP wants a Blob. In Node 22+, Blob is global.
  // The bytes copy is unavoidable: importSTEP reads the blob async.
  const blob = new Blob([new Uint8Array(buf)]);

  let imported: replicad.AnyShape;
  try {
    imported = await replicad.importSTEP(blob);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fromSTEP: replicad failed to parse STEP at ${absPath}: ${msg}`,
      undefined,
      'kernel-failed.lib.fromSTEP.parse — file is not a valid STEP solid; re-export from the source CAD as AP203/AP214 with solid bodies.',
    );
  }

  // We expect a Shape3D-class result (Solid / CompSolid / Compound). Reject
  // 2D drawings or empty imports up-front so the lowerer never sees them.
  // Duck-typed against `meshShape` — the method lives on replicad's `_3DShape`
  // prototype only, so a 2D `Sketch` import would correctly fail this check.
  if (
    !imported ||
    typeof (imported as { meshShape?: unknown }).meshShape !== 'function'
  ) {
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fromSTEP: ${absPath} did not contain a 3D solid.`,
      undefined,
      'kernel-failed.lib.fromSTEP.no-solid — the STEP file must contain at least one closed solid body.',
    );
  }

  const backend = new OcctBackend(imported as replicad.Shape3D);

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

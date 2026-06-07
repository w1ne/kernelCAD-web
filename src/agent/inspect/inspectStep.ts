// src/agent/inspect/inspectStep.ts
//
// W4 inspection — Task 3: pure-analysis STEP inspect orchestrator.
//
// Read a STEP file from disk → replicad.importSTEP → explode the result
// into TopAbs_SOLID children → per-solid exact bbox, volume, face count,
// and cylindrical-hole detection. No capture session, no feature records,
// no assembly solve — this is the agent's read-only interrogation path
// for vendor STEP files.

import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { readFile } from 'node:fs/promises';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import {
  detectCylindricalHoles,
  type CylindricalHole,
} from '../../kernel/backends/occt/holeDetection';
import { KernelError } from '../../shared/intent/kernelError';

export interface StepSolidReport {
  /** Stable index in TopExp_Explorer traversal order. */
  index: number;
  /** Best-effort name from MANIFOLD_SOLID_BREP entities, file order. */
  name: string | null;
  /** Tessellation-tight axis-aligned bounding box (mm). */
  bboxExact: { min: [number, number, number]; max: [number, number, number] };
  volumeMm3: number;
  faceCount: number;
  holes: CylindricalHole[];
}

export interface StepInspectReport {
  /** The path as passed by the caller. */
  file: string;
  solidCount: number;
  solids: StepSolidReport[];
}

/**
 * Inspect a STEP file on disk and report its solid tree.
 *
 * @throws {KernelError} `feature.invalid-args` when the file cannot be
 *   read; `feature.kernel-failed` when the bytes do not parse as a STEP
 *   model containing at least one 3D solid.
 */
export async function inspectStepFile(path: string): Promise<StepInspectReport> {
  if (typeof path !== 'string' || path.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      'inspectStepFile(path): path must be a non-empty string.',
      undefined,
      'invalid-args.inspect.step — pass an absolute path to a .step file.',
    );
  }

  let buf: Buffer;
  try {
    buf = await readFile(path);
  } catch {
    throw new KernelError(
      'feature.invalid-args',
      `inspectStepFile: cannot read STEP file at ${path}.`,
      undefined,
      `invalid-args.inspect.step.path — verify the file exists and is readable at '${path}'.`,
    );
  }

  await initOcct();

  // replicad.importSTEP wants a Blob (global in Node 22+). The bytes copy
  // is unavoidable: importSTEP reads the blob async.
  const blob = new Blob([new Uint8Array(buf)]);

  let imported: replicad.AnyShape;
  try {
    imported = await replicad.importSTEP(blob);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new KernelError(
      'feature.kernel-failed',
      `inspectStepFile: replicad failed to parse STEP at ${path}: ${msg}`,
      undefined,
      'kernel-failed.inspect.step.parse — file is not a valid STEP model; re-export from the source CAD as AP203/AP214 with solid bodies.',
    );
  }

  // Reject 2D drawings or empty imports up-front. Duck-typed against
  // `meshShape` — the method lives on replicad's `_3DShape` prototype only,
  // so a 2D `Sketch` import would correctly fail this check (same guard as
  // lib.fromSTEP).
  if (
    !imported ||
    typeof (imported as { meshShape?: unknown }).meshShape !== 'function'
  ) {
    throw new KernelError(
      'feature.kernel-failed',
      `inspectStepFile: ${path} did not contain a 3D solid.`,
      undefined,
      'kernel-failed.inspect.step.no-solid — the STEP file must contain at least one closed solid body.',
    );
  }

  // Best-effort solid names: replicad's importer drops STEP entity names,
  // so parse them from the file text in entity order and pair them with
  // explorer index. This pairing is heuristic — TopExp_Explorer traversal
  // order vs MANIFOLD_SOLID_BREP file order is NOT contractual — so names
  // are reported null whenever the counts disagree.
  const entityNames: string[] = [];
  for (const m of buf.toString('utf8').matchAll(/MANIFOLD_SOLID_BREP\('([^']*)'/g)) {
    entityNames.push(m[1]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = (imported as any).wrapped;

  // Explode into solids. A single-solid import yields one TopAbs_SOLID;
  // a compound yields one per child.
  const solidBackends: OcctBackend[] = [];
  const explorer = new oc.TopExp_Explorer_2(
    wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  try {
    while (explorer.More()) {
      const solid = oc.TopoDS.Solid_1(explorer.Current());
      solidBackends.push(
        new OcctBackend(replicad.cast(solid) as replicad.Shape3D),
      );
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }

  if (solidBackends.length === 0) {
    throw new KernelError(
      'feature.kernel-failed',
      `inspectStepFile: ${path} did not contain a 3D solid.`,
      undefined,
      'kernel-failed.inspect.step.no-solid — the STEP file must contain at least one closed solid body.',
    );
  }

  const namesUsable = entityNames.length === solidBackends.length;

  const solids: StepSolidReport[] = solidBackends.map((backend, index) => {
    const bb = backend.boundingBox({ exact: true });
    const name = namesUsable && entityNames[index] !== '' ? entityNames[index] : null;
    return {
      index,
      name,
      bboxExact: {
        min: [bb.min[0], bb.min[1], bb.min[2]],
        max: [bb.max[0], bb.max[1], bb.max[2]],
      },
      volumeMm3: backend.volume(),
      faceCount: countFaces(oc, backend),
      holes: detectCylindricalHoles(backend),
    };
  });

  return { file: path, solidCount: solids.length, solids };
}

/** Count TopAbs_FACE children of a solid via TopExp_Explorer. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function countFaces(oc: any, backend: OcctBackend): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = (backend.getReplicadShape() as any).wrapped;
  const explorer = new oc.TopExp_Explorer_2(
    wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_FACE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  let count = 0;
  try {
    while (explorer.More()) {
      count++;
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  return count;
}

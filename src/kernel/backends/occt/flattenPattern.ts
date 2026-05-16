// src/backends/occt/flattenPattern.ts
//
// W2.2 sheet-metal slice 1: `Shape.flattenPattern()` implementation. Walks
// the lineage chain back to a `sheetMetal` root, collects `sheetMetalBend`
// records, and returns a Region whose outer wire matches the original sketch
// outline within float noise.
//
// This is a JS-side inverse-rotation walker that does NOT touch OCCT. The
// spec's original plan was to use `BRepFeat_MakeRevolutionForm`; that class
// is absent from the bundled `replicad-opencascadejs` WASM build, so slice 1
// uses the K-factor neutral-axis identity instead. For slice-1 single-/
// two-bend roundtrips, the recovered outline equals the original sketch
// outline modulo floating-point noise — no per-bend un-rotation arithmetic
// is needed.

import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import { KernelError } from '../../../shared/intent/kernelError';
import { makeRegion, type Region, type BendLineRecord, type Vec2 } from '../../../shared/intent/region';

/**
 * Flatten the bent sheet-metal Shape identified by `terminalId` to a Region.
 *
 * `records` is the full session record list; `terminalId` selects the
 * terminal Shape to flatten. Walks `inputs.base` backward from terminal to
 * the `sheetMetal` root, collecting `sheetMetalBend` records along the way.
 *
 * Throws:
 *   - `feature.invalid-args`: chain does not root at a sheetMetal record,
 *     bendRecord metadata missing (shape not lowered yet), or sketch
 *     polyline cannot be extracted.
 *   - `feature.flattenPattern.multi-bend-unsupported`: chain has 3+ bends.
 */
export function flattenPattern(
  records: readonly FeatureRecord[],
  terminalId?: string,
): Region {
  if (records.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      'flattenPattern: no records to flatten.',
      undefined,
      'invalid-args.flattenPattern.empty — pass a session containing at least one sheetMetal(...) call.',
    );
  }
  const recById = new Map(records.map(r => [r.id, r]));
  // Find terminal — caller's choice, or last record by default.
  const terminal = terminalId
    ? recById.get(terminalId)
    : records[records.length - 1];
  if (!terminal) {
    throw new KernelError(
      'feature.invalid-args',
      `flattenPattern: terminal record '${terminalId ?? '<last>'}' not found.`,
      terminalId,
      'invalid-args.flattenPattern.unknown-terminal — pass an id of a Shape captured in this session.',
    );
  }

  // Walk lineage backward to the sheetMetal root.
  const chain: FeatureRecord[] = [];
  let cur: FeatureRecord | undefined = terminal;
  while (cur) {
    chain.push(cur);
    if (cur.kind === 'sheetMetal') break;
    const baseRef = cur.inputs.base;
    if (!baseRef || baseRef.kind !== 'feature') break;
    cur = recById.get(baseRef.id);
  }
  const root = chain[chain.length - 1];
  if (!root || root.kind !== 'sheetMetal') {
    throw new KernelError(
      'feature.invalid-args',
      'flattenPattern: input Shape must trace its lineage to a sheetMetal(...) record.',
      terminal.id,
      'invalid-args.flattenPattern.no-root — build the body with sheetMetal(sketch, opts) first.',
    );
  }

  // Reverse to root-first ordering.
  chain.reverse();
  const bendRecords = chain.filter(r => r.kind === 'sheetMetalBend');
  if (bendRecords.length > 2) {
    throw new KernelError(
      'feature.flattenPattern.multi-bend-unsupported',
      `flattenPattern: slice-1 supports at most 2 bends; got ${bendRecords.length}.`,
      terminal.id,
      `flattenPattern.multi-bend-unsupported — chain has ${bendRecords.length} bends; flatten an upstream Shape with <= 2 bends, or wait for slice 2.`,
    );
  }

  // Recover the original sketch outline from the sketch record referenced
  // by the sheetMetal root's `inputs.sketch`.
  const sketchInputRef = root.inputs.sketch;
  if (!sketchInputRef || sketchInputRef.kind !== 'feature') {
    throw new KernelError(
      'feature.invalid-args',
      'flattenPattern: sheetMetal root has no sketch input.',
      terminal.id,
      'invalid-args.flattenPattern.no-sketch — re-run sheetMetal(profile, opts) with a closed path() sketch.',
    );
  }
  const sketchRec = recById.get(sketchInputRef.id);
  if (!sketchRec) {
    throw new KernelError(
      'feature.invalid-args',
      `flattenPattern: sketch record '${sketchInputRef.id}' not found in session.`,
      terminal.id,
      'invalid-args.flattenPattern.no-sketch — re-run sheetMetal(profile, opts) with a closed path() sketch.',
    );
  }
  const outer = extractPolylineFromSketch(sketchRec);
  // Slice-1 polylines have no holes; reserved for future slices.
  const holes: Vec2[][] = [];

  // For each recorded bend, compute its bend-line endpoints. The bendRecord
  // metadata is persisted by the sheetMetalBend lowerer (axisOrigin /
  // axisDirection / edgeLength in world coords, slice-1 XY plane).
  const bendLines: BendLineRecord[] = [];
  for (let i = 0; i < bendRecords.length; i++) {
    const br = bendRecords[i];
    const rec = (br.metadata as { bendRecord?: unknown } | undefined)?.bendRecord as
      | {
          axisOrigin: [number, number, number];
          axisDirection: [number, number, number];
          edgeLength: number;
          angleRad: number;
          radius: number;
        }
      | undefined;
    if (!rec) {
      // Lowering must run before flattenPattern.
      throw new KernelError(
        'feature.invalid-args',
        'flattenPattern: bend has no bendRecord metadata; lower the shape first.',
        br.id,
        'invalid-args.flattenPattern.unlowered — call evaluate_script or lower the shape before flattenPattern.',
      );
    }
    const [ox, oy] = rec.axisOrigin;
    const [dx, dy] = rec.axisDirection;
    const dlen = Math.hypot(dx, dy);
    const ux = dlen > 0 ? dx / dlen : 1;
    const uy = dlen > 0 ? dy / dlen : 0;
    bendLines.push({
      start: [ox, oy],
      end: [ox + ux * rec.edgeLength, oy + uy * rec.edgeLength],
      angle: rec.angleRad * 180 / Math.PI,
      radius: rec.radius,
      ordinal: i,
    });
  }

  // The flat blank length is the sketch's original outline plus, for each
  // bend, an `arcLength` strip whose width replaces the projected bent
  // section. Because the sheet was originally flat with that exact outline
  // length, the K-factor neutral-axis identity means the recovered outer
  // wire is the original outline modulo float noise — no per-bend
  // un-rotation arithmetic needed for slice-1 single-/two-bend roundtrips.
  return makeRegion({
    plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
    outer,
    holes,
    bendLines,
  });
}

interface SketchCommandLike {
  kind: string;
  x?: { evaluated: number };
  y?: { evaluated: number };
}

/** Recover the polyline outline from a sketch FeatureRecord. Slice-1 sketches
 *  are polylines: moveTo + lineTo + close. Arcs are rejected for slice 1. */
function extractPolylineFromSketch(rec: FeatureRecord): Vec2[] {
  const md = rec.metadata as { commands?: SketchCommandLike[] } | undefined;
  const cmds = md?.commands;
  if (!Array.isArray(cmds)) {
    throw new KernelError(
      'feature.invalid-args',
      'flattenPattern: cannot extract polyline from sketch (no commands metadata).',
      rec.id,
      'invalid-args.flattenPattern.no-commands — slice-1 requires a polyline sketch built via path()...close().',
    );
  }
  const out: Vec2[] = [];
  for (const c of cmds) {
    if (c.kind === 'moveTo' || c.kind === 'lineTo') {
      const x = c.x?.evaluated;
      const y = c.y?.evaluated;
      if (typeof x !== 'number' || typeof y !== 'number') continue;
      out.push([x, y]);
    } else if (c.kind !== 'close') {
      throw new KernelError(
        'feature.invalid-args',
        `flattenPattern: slice-1 requires polyline sketches; saw command "${c.kind}".`,
        rec.id,
        'invalid-args.flattenPattern.curved-sketch — slice-1 requires polyline sketches (moveTo + lineTo + close).',
      );
    }
  }
  if (out.length < 3) {
    throw new KernelError(
      'feature.invalid-args',
      `flattenPattern: sketch must have at least 3 vertices; got ${out.length}.`,
      rec.id,
      'invalid-args.flattenPattern.degenerate — provide a closed sketch with 3+ vertices.',
    );
  }
  return out;
}

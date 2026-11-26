// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/padLowerer.ts
//
// Lowering for `Shape.pad(profile, opts)` — the additive counterpart of
// `cutout`. The closed profile starts on a selected planar face, grows outward
// along that face's normal for a depth or up to a planar target face, then
// fuses into the target body.
//
// Pipeline:
//   1. Resolve the entry face and its outward frame (same frame as cutout).
//   2. Read the profile sketch commands.
//   3. Build a prism that starts 0.01 mm inside the body and ends at the
//      requested height (or past the upToFace target, then trim it).
//   4. Fuse with history so the base body's face lineage survives.
//   5. Fail closed unless the result is one valid solid with more volume than
//      the input. A pad that misses the body, or is buried under an overhang,
//      must not return an unchanged body as a success.

import * as replicad from 'replicad';
import { OcctBackend } from './occtBackend';
import { fuseWithHistory, mergeBooleanHistory } from './historyAwareBooleans';
import { countSolids, isTopologicallyValid } from './edgeFeatureValidity';
import { surfaceTypeOf } from './createdRefs';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { Vec3 } from '../../../shared/intent/types';
import type { SketchCommand } from '../../../shared/capture/sketchCommand';
import { collectParamRefs } from '../../../shared/runtime/resolveParams';
import { invalidArgsText } from '../../../shared/intent/invalidArgs';
import {
  buildUpToFaceTool,
  type UpToFaceEntry,
} from './cutoutUpToFace';
import {
  profileSketchOnPlane,
  resolveEntry,
  type ResolvedEntry,
} from './cutoutLowerer';

export interface PadLowerResult {
  backend: OcctBackend;
  diagnostics: CompilerDiagnostic[];
}

const OVERSHOOT = 0.01;
const PAD_EXAMPLE =
  "plate.pad(path().moveTo(-5, -5).lineTo(5, -5).lineTo(5, 5).lineTo(-5, 5).close(), { face: 'top', depth: 4 })";

function error(
  featureId: string,
  message: string,
  hint: string,
): { error: CompilerDiagnostic } {
  return {
    error: {
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId,
      severity: 'error',
      message,
      hint,
    },
  };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  return len < 1e-12 ? [0, 0, 1] : [v[0] / len, v[1] / len, v[2] / len];
}

function resolvePadCommands(
  feature: FeatureRecord,
  records: readonly FeatureRecord[] | undefined,
  resolveRecord?: (record: FeatureRecord) => FeatureRecord,
): SketchCommand[] | { error: CompilerDiagnostic } {
  const profileRef = feature.inputs.profile;
  const profileFeatureId = profileRef && profileRef.kind === 'feature' ? profileRef.id : undefined;
  const rawProfileRecord = records?.find(r => r.id === profileFeatureId);
  const profileRecord = rawProfileRecord && resolveRecord
    ? resolveRecord(rawProfileRecord)
    : rawProfileRecord;
  const commands = ((profileRecord?.metadata as { commands?: SketchCommand[] } | undefined)?.commands) ?? [];
  if (commands.length === 0) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: feature.id,
        severity: 'error',
        ...invalidArgsText({
          api: 'pad(profile, opts)',
          path: 'profile',
          gotText: 'a sketch with no path commands',
          requires: 'a closed sketch built via path().moveTo(...).lineTo(...).close()',
          example: PAD_EXAMPLE,
          hint: 'The pad profile must be a closed sketch built via path().moveTo(...).lineTo(...).close().',
        }),
      },
    };
  }
  const unresolvedRefs = [...collectParamRefs(commands)];
  if (unresolvedRefs.length > 0 && rawProfileRecord === profileRecord) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: feature.id,
        severity: 'error',
        ...invalidArgsText({
          api: 'pad(profile, opts)',
          path: 'profile.commands',
          gotText: `unresolved parameter reference(s): ${unresolvedRefs.join(', ')}`,
          requires: 'coordinates evaluated with the current script parameter table',
          example: PAD_EXAMPLE,
          hint: "Recompute with the script's current parameter table so every profile coordinate is evaluated before pad lowering.",
        }),
      },
    };
  }
  return commands;
}

/** Prism from the entry face to the pad end. A positive extrude follows the
 *  plane normal, which is the face's outward direction. The base sits exactly
 *  on the face plane: overshooting into the body would add a 0.01 mm lip
 *  wherever the profile overhangs a face edge. */
function buildPadTool(
  entry: ResolvedEntry,
  commands: readonly SketchCommand[],
  depth: number,
  mode: 'blind' | 'exit',
): replicad.Shape3D {
  const start: Vec3 = [...entry.centroid] as Vec3;
  const totalDepth = depth + (mode === 'exit' ? OVERSHOOT : 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plane = new (replicad as any).Plane(start, entry.uBasis, entry.normalOutward) as replicad.Plane;
  return profileSketchOnPlane(commands, plane).extrude(totalDepth) as replicad.Shape3D;
}

function resolveDepth(
  feature: FeatureRecord,
): number | { error: CompilerDiagnostic } {
  const depth = feature.params.depth?.evaluated;
  if (typeof depth === 'number' && Number.isFinite(depth) && depth > 0) return depth;
  return {
    error: {
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: feature.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'pad(profile, { face, depth })',
        path: 'opts.depth',
        got: depth,
        requires: 'a positive finite height in mm',
        unit: 'mm',
        example: PAD_EXAMPLE,
        hint: 'Pass opts.depth as a positive height, or opts.upToFace to end the pad on a planar body face.',
      }),
    },
  };
}

/** Resolve the pad tool from `depth` or `upToFace`, or return a diagnostic. */
function buildPadToolForFeature(
  feature: FeatureRecord,
  target: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
  entry: ResolvedEntry,
  commands: readonly SketchCommand[],
): { tool: replicad.Shape3D } | { error: CompilerDiagnostic } {
  if (feature.inputs.upToFace) {
    const upToEntry: UpToFaceEntry = {
      centroid: entry.centroid,
      axisIntoBody: normalize(entry.normalOutward),
    };
    const upTo = buildUpToFaceTool(
      feature,
      target,
      records,
      upToEntry,
      (depth) => buildPadTool(entry, commands, depth, 'exit'),
      (e) => {
        const msg = e instanceof Error ? e.message : String(e);
        return error(
          feature.id,
          `pad: could not build the profile prism before trimming at the upToFace plane: ${msg}`,
          'Check that the profile lies on the entry face and has no self-intersection or zero-area segments.',
        ).error;
      },
    );
    return 'error' in upTo ? upTo : { tool: upTo.tool };
  }
  const depthRes = resolveDepth(feature);
  if (typeof depthRes !== 'number') return depthRes;
  try {
    return { tool: buildPadTool(entry, commands, depthRes, 'blind') };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return error(
      feature.id,
      `pad: prism construction failed: ${msg}`,
      'OCCT could not build the pad prism. Check the profile for self-intersection, zero-area segments or coordinates outside the face frame.',
    );
  }
}

/** Accept only one valid solid with strictly more volume than the base. */
function validatePadResult(
  feature: FeatureRecord,
  target: OcctBackend,
  fused: ReturnType<typeof fuseWithHistory>,
): { backend: OcctBackend } | { error: CompilerDiagnostic } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = replicad.cast(fused.shape as any) as replicad.Shape3D;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrappedRaw = (wrapped as any).wrapped as unknown;
  const solidCount = countSolids(wrappedRaw);
  if (solidCount !== 1) {
    return error(
      feature.id,
      `pad: the result has ${solidCount} solids, not one connected body.`,
      'The profile does not touch the entry face material, so the pad is a detached body. Move the profile onto the face, or union a separate part explicitly.',
    );
  }
  if (!isTopologicallyValid(wrappedRaw)) {
    return error(
      feature.id,
      'pad: the fused result fails the BRep validity check.',
      'Reduce the pad height or move the profile away from a tangent edge; the boolean produced a self-intersecting body.',
    );
  }
  const backend = new OcctBackend(wrapped, undefined, mergeBooleanHistory(target.historyMap, undefined, fused));
  const before = target.volume();
  const after = backend.volume();
  if (!(after > before + 1e-6)) {
    return error(
      feature.id,
      `pad: added no material (volume ${before.toFixed(3)} -> ${after.toFixed(3)} mm³).`,
      'The pad is fully buried inside existing material or sits over a void. Move it onto free surface material, or use cutout() for a pocket.',
    );
  }
  return { backend };
}

export function lowerPad(
  feature: FeatureRecord,
  target: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
  resolveRecord?: (record: FeatureRecord) => FeatureRecord,
): PadLowerResult {
  const diagnostics: CompilerDiagnostic[] = [];
  const entryRes = resolveEntry(feature, target, records);
  if ('error' in entryRes) {
    diagnostics.push(entryRes.error);
    return { backend: target, diagnostics };
  }
  const entrySurface = surfaceTypeOf(entryRes.face);
  if (entrySurface !== 'PLANE') {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: feature.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'pad(profile, opts)',
        path: 'opts.face',
        gotText: `a ${entrySurface} face`,
        requires: 'a planar face for the profile; a curved entry face has no single tangent plane',
        example: PAD_EXAMPLE,
        hint: 'Select a planar face for the profile, or build the profile in XY, extrude it and union it. A curved entry face has no single tangent plane to grow the pad from.',
      }),
    });
    return { backend: target, diagnostics };
  }
  const commandsRes = resolvePadCommands(feature, records, resolveRecord);
  if ('error' in commandsRes) {
    diagnostics.push(commandsRes.error);
    return { backend: target, diagnostics };
  }
  const toolRes = buildPadToolForFeature(feature, target, records, entryRes, commandsRes);
  if ('error' in toolRes) {
    diagnostics.push(toolRes.error);
    return { backend: target, diagnostics };
  }

  let fused: ReturnType<typeof fuseWithHistory>;
  try {
    fused = fuseWithHistory(target, new OcctBackend(toolRes.tool));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push(error(
      feature.id,
      `pad: OCCT fuse failed: ${msg}`,
      'The pad may be tangent to the body or self-intersecting. Move the profile clear of an edge or reduce its size.',
    ).error);
    return { backend: target, diagnostics };
  }

  const accepted = validatePadResult(feature, target, fused);
  if ('error' in accepted) {
    diagnostics.push(accepted.error);
    return { backend: target, diagnostics };
  }
  return { backend: accepted.backend, diagnostics };
}

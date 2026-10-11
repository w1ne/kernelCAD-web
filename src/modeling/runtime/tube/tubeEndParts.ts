// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// What a tube claims about the assembly parts around it, checked before
// clearance is measured:
//
//   - A plain end may name the part it sits on (`{ point, axis, part }`).
//     The name must be a part of the scene and the end must touch that part;
//     otherwise the end gets no fitting zone and the tube is measured against
//     the part in full.
//   - One tube shape carried by two assembly parts: only the first is checked,
//     so the second is reported.

import { getOC } from 'replicad';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { TubeEndMeta } from '../../../shared/intent/tubeRecord';
import { add, buildTubePath, isTubePathError, scale } from '../../../shared/tube/tubePath';
import { tubeSolid } from '../../backends/occt/tubeLowerer';
import { brepExtremaClosest, wrappedShape } from '../brepDistance';
import { transformScenePart } from '../dfm/clearance';
import { kernelFailed } from './tubeClearance';
import { mm2 } from './tubeRules';
import { endsOf, tubeDiagnostic, type ResolvedTube, type TubeEndState, type TubeSceneContext } from './tubeScene';

/** An end this close to the part it names is on it. */
const CONTACT_TOL_MM = 0.01;

type ScenePart = NonNullable<TubeSceneContext['scene']>['parts'][number];

/** Distance from the tube end to the part, world frame: a short solid stub of
 *  the end leg against the part's shape. Undefined when the kernel cannot
 *  measure it or the tube has no rigid placement. */
function endGap(tube: ResolvedTube, end: TubeEndState, part: ScenePart): number | undefined {
  if (tube.placement === undefined) return undefined;
  const stub = buildTubePath([end.captured, add(end.captured, scale(end.leaving, Math.max(tube.od, 1)))], tube.path.bendRadius);
  if (isTubePathError(stub)) return undefined;
  try {
    const body = transformScenePart(part, []).shape;
    if (body === undefined) return undefined;
    const rod = tubeSolid(stub, tube.od, tube.od).applyTransform(tube.placement);
    return brepExtremaClosest(getOC(), wrappedShape(rod), wrappedShape(body))?.distance;
  } catch {
    return undefined;
  }
}

/** The finding for one plain end that names a part, or undefined when the
 *  end is on that part. A measurement the kernel could not make warns and
 *  leaves the end as declared. */
function endPartFinding(ctx: TubeSceneContext, tube: ResolvedTube, end: TubeEndState): CompilerDiagnostic | undefined {
  const name = end.meta.part;
  const part = ctx.scene?.parts.find((p) => p.name === name);
  if (part === undefined) {
    const why = ctx.scene === undefined ? 'but the script returns no assembly' :
      `which is not a part of the assembly; its parts are ${ctx.scene.parts.map((p) => `'${p.name}'`).join(', ')}`;
    return tubeDiagnostic('tube.end.part-not-found', `tube '${tube.name}' ${end.which} end names part '${name}', ${why}.`, tube.id);
  }
  const gap = endGap(tube, end, part);
  if (gap === undefined) return kernelFailed(tube, `measuring the ${end.which} end against part '${name}'`, '; the end was taken to be on it');
  if (gap <= CONTACT_TOL_MM) return undefined;
  return tubeDiagnostic('tube.port.misaligned',
    `tube '${tube.name}' ${end.which} end is ${mm2(gap)} mm from part '${name}', which it names as its part; ` +
    'the end must touch the part.', tube.id);
}

function withoutPart(end: TubeEndMeta): TubeEndMeta {
  const rest = { ...end };
  delete rest.part;
  return rest;
}

/**
 * Check every plain end that names a part. Returns the diagnostics and the
 * tubes as clearance should see them: an end whose claim failed no longer
 * names the part, so it gets no fitting zone.
 */
export function checkEndParts(
  ctx: TubeSceneContext, tubes: readonly ResolvedTube[],
): { diagnostics: CompilerDiagnostic[]; tubes: ResolvedTube[] } {
  const diagnostics: CompilerDiagnostic[] = [];
  const checked = tubes.map((tube) => {
    let meta = tube.meta;
    for (const end of endsOf(tube)) {
      if (end.meta.part === undefined || end.meta.connector !== undefined) continue;
      const finding = endPartFinding(ctx, tube, end);
      if (finding === undefined) continue;
      diagnostics.push(finding);
      if (finding.severity === 'error') meta = { ...meta, [end.which]: withoutPart(meta[end.which]) };
    }
    return meta === tube.meta ? tube : { ...tube, meta };
  });
  return { diagnostics, tubes: checked };
}

/** A tube shape added to the assembly under more than one part name: the
 *  gates follow the first part only. */
export function checkTubeParts(ctx: TubeSceneContext, tubes: readonly ResolvedTube[]): CompilerDiagnostic[] {
  const out: CompilerDiagnostic[] = [];
  for (const tube of tubes) {
    const names = [...ctx.stored.values()].filter((p) => p.originalShape.id === tube.id).map((p) => p.name);
    if (names.length < 2) continue;
    out.push(tubeDiagnostic('tube.part.duplicate',
      `tube '${tube.name}' is added to the assembly as parts ${names.map((n) => `'${n}'`).join(', ')}; ` +
      `only '${names[0]}' is checked.`, tube.id));
  }
  return out;
}

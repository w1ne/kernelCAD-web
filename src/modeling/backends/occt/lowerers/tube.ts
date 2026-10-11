// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { DIAGNOSTIC_REGISTRY } from '../../../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { invalidArgsText, type InvalidArgsSpec } from '../../../../shared/intent/invalidArgs';
import { isTubeMetadata } from '../../../../shared/intent/tubeRecord';
import type { FeatureId } from '../../../../shared/intent/types';
import {
  branchFaultDiagnostic, isBranchFault, isTubeGeometryError, tubeGeometry, type BranchFault,
} from '../../../../shared/tube/tubeBranch';
import { tubePathErrorArgs } from '../../../../shared/tube/tubePath';
import { tubeSolidOnTrunks } from '../tubeLowerer';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';

const HINT = 'Fix the tube() arguments named in the message, then re-evaluate.';

/** Another record of the run, with its params read through the param table. */
function resolvedRecord(ctx: LowerContext, id: FeatureId): FeatureRecord | undefined {
  const record = ctx.allRecords?.find((x) => x.id === id);
  return record === undefined ? undefined : ctx.inputs?.resolveRecord?.(record) ?? record;
}

/** A branch end that cannot be placed on its trunk: the registry diagnostic that says where it landed. */
function branchFault(ctx: LowerContext, r: FeatureRecord, name: string, fault: BranchFault): LowerOutcome {
  const d = branchFaultDiagnostic(name, fault);
  if (d === undefined) {
    ctx.diagnostics.push({
      target: 'export-occt', code: 'feature.invalid-args', featureId: r.id, severity: 'error',
      ...invalidArgsText({
        api: 'tube.branch.trunk-not-found',
        path: `tube '${name}' ${fault.which} end`,
        gotText: `trunk '${fault.trunk}', which has no path in this build`,
        requires: 'a trunk that builds',
        example: "from: { tube: 'act-supply', at: 180, axis: [0, 1, 0] }",
        hint: 'Fix the trunk first; its own diagnostic says what is wrong with it.',
      }),
    });
    return noShape();
  }
  const entry = DIAGNOSTIC_REGISTRY[d.code];
  ctx.diagnostics.push({
    target: 'export-occt', code: d.code, featureId: r.id, severity: entry.defaultSeverity,
    message: `${d.code}: ${d.text}`, hint: entry.hintTemplate, nextAction: entry.nextAction,
  });
  return noShape();
}

export function lowerTube(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const meta = (r.metadata as { tube?: unknown } | undefined)?.tube;
  const fail = (spec: InvalidArgsSpec): LowerOutcome => {
    ctx.diagnostics.push({
      target: 'export-occt', code: 'feature.invalid-args', featureId: r.id, severity: 'error',
      ...invalidArgsText({ ...spec, hint: HINT }),
    });
    return noShape();
  };
  if (!isTubeMetadata(meta)) {
    return fail({
      api: 'tube.record.invalid',
      path: `record '${r.id}' metadata.tube`,
      gotText: 'missing or malformed tube metadata',
      requires: 'the metadata written by tube(name, opts)',
      example: "tube('t', { from: { point: [0, 0, 0] }, to: { point: [0, 0, 100] }, od: 10, wall: 1, bendRadius: 30 })",
    });
  }
  const geometry = tubeGeometry(r, (id) => resolvedRecord(ctx, id));
  if (isTubeGeometryError(geometry)) {
    return isBranchFault(geometry) ? branchFault(ctx, r, meta.name, geometry) : fail(tubePathErrorArgs(meta.name, geometry));
  }
  return built(tubeSolidOnTrunks(geometry, r.params.od.evaluated, r.params.wall.evaluated));
}

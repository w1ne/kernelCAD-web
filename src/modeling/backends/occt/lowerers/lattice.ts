// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { SolidMeshBackend } from '../../../../kernel/backends/solidMeshBackend';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../../../shared/diagnostics/registry';
import { LatticeGradeError, lowerLatticeRecord } from '../../../lattice/latticeLower';
import { latticeReportMessage } from '../../../lattice/latticeReportText';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';

/** `lattice` — TPMS infill of the host B-rep; the result is a mesh solid. */
export async function lowerLattice(ctx: LowerContext, r: FeatureRecord): Promise<LowerOutcome> {
  const base = ctx.inputs.byKey.base;
  if (!(base instanceof OcctBackend)) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.lattice.mesh-input',
      featureId: r.id,
      severity: 'error',
      message: 'lattice(): the host must be a B-rep solid; this input is a mesh body (an earlier .lattice() or lib.meshFromSTL).',
      hint: HINT_TEMPLATES['feature.lattice.mesh-input'].template,
      nextAction: NEXT_ACTIONS['feature.lattice.mesh-input'],
    });
    return noShape();
  }
  try {
    const out = await lowerLatticeRecord({ record: r, base, records: ctx.allRecords ?? [] });
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.lattice.report',
      featureId: r.id,
      severity: 'info',
      message: latticeReportMessage(out.report),
      hint: HINT_TEMPLATES['feature.lattice.report'].template,
      nextAction: NEXT_ACTIONS['feature.lattice.report'],
    });
    return built(new SolidMeshBackend(out.positions, out.indices, { lattice: out.report }));
  } catch (e) {
    if (!(e instanceof LatticeGradeError)) throw e;
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.lattice.grade-unavailable',
      featureId: r.id,
      severity: 'error',
      message: `lattice(): grade unavailable — ${e.message}.`,
      hint: HINT_TEMPLATES['feature.lattice.grade-unavailable'].template,
      nextAction: NEXT_ACTIONS['feature.lattice.grade-unavailable'],
    });
    return noShape();
  }
}

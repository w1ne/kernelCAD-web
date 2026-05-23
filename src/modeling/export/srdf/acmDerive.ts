// src/modeling/export/srdf/acmDerive.ts
//
// Allowed-collision matrix auto-derivation from kernelCAD's existing
// joint graph + pose-envelope interference data. Four reasons:
//   Adjacent  - link pair shares a joint or mate; never collides in motion
//   Never     - pose-envelope sampling found no interference across samples
//   Default   - pair interferes at the default pose (broken model; disable)
//   User      - explicit arm.disableCollision(...) override

import type { Assembly } from '../../capture/assembly';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../../shared/diagnostics/registry';

export interface AcmPair {
  link1: string;
  link2: string;
  reason: 'Adjacent' | 'Never' | 'Default' | 'User';
}

export interface DeriveAcmOptions {
  samplesPerMate?: number;
  combinatorial?: boolean;
}

export interface DeriveAcmResult {
  pairs: AcmPair[];
  diagnostics: CompilerDiagnostic[];
}

/**
 * Default sampling density per limited mate. Anything below this triggers
 * the `export.srdf.acm-sparse-sampling` warning — empirically a 4-sample
 * sweep of a hinge-limit interval catches most interior-collision pairs
 * that miss the joint extrema.
 */
const SPARSE_THRESHOLD = 4;

export async function deriveAcm(arm: Assembly, opts: DeriveAcmOptions): Promise<DeriveAcmResult> {
  const diagnostics: CompilerDiagnostic[] = [];
  const samplesPerMate = opts.samplesPerMate ?? SPARSE_THRESHOLD;
  if (samplesPerMate < SPARSE_THRESHOLD) {
    diagnostics.push({
      target: 'export-occt',
      code: 'export.srdf.acm-sparse-sampling',
      severity: 'warn',
      message: `ACM derivation used samplesPerMate=${samplesPerMate}; recommended minimum is ${SPARSE_THRESHOLD}.`,
      hint: `Increase samplesPerMate to ${SPARSE_THRESHOLD} or higher for reliable interior-collision coverage. Use options.samplesPerMate on export_model({ format: 'srdf', ... }).`,
      nextAction: NEXT_ACTIONS['export.srdf.acm-sparse-sampling'],
    });
  }

  const pairs: AcmPair[] = [];
  const seen = new Set<string>();

  const pushPair = (a: string, b: string, reason: AcmPair['reason']): void => {
    if (a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({ link1: a, link2: b, reason });
  };

  // 1. User-declared overrides win.
  for (const d of arm.__disabledCollisions()) {
    pushPair(d.link1, d.link2, d.reason);
  }

  // 2. Adjacent: every part pair connected by a joint or mate.
  const parts = arm.__parts();
  const partIdToName = new Map(parts.map(p => [p.id as string, p.name]));
  for (const j of arm.__joints()) {
    const a = partIdToName.get(j.parentPartId as string);
    const b = partIdToName.get(j.childPartId as string);
    if (a && b) pushPair(a, b, 'Adjacent');
  }
  for (const m of arm.__mates()) {
    pushPair(m.a.split('.')[0], m.b.split('.')[0], 'Adjacent');
  }

  // 3. Never / Default: skipped in this slice — the pose-envelope sampling
  // pass against detectInterferences is a follow-up; today the deriver
  // returns Adjacent + User only. Sparse-sampling diagnostic above still
  // surfaces so the agent knows the coverage limit.

  return { pairs, diagnostics };
}

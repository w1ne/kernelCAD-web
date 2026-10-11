// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Rules on a tube that branches off another tube, read from the resolved
// tubes (so a param in `at`, in the trunk or in the spec is at its current
// value):
//
//   - the joint keeps the trunk's straight-between-bends length from a bend
//     of the trunk and the trunk's end straight from an end of the trunk,
//     and never less than half the branch OD, so the saddle stays on the
//     straight,
//   - the branch leaves square to the trunk leg,
//   - the branch is no larger than the trunk.
//
// A station on a bend or off the trunk is not here: the branch cannot be
// built there, and the lowerer reports it.

import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { TubeJoint } from '../../../shared/tube/tubeBranch';
import { effectiveRules, endStraightNeed, mm2, PORT_AXIS_TOL_DEG, xyz2, type TubeRuleSpec } from './tubeRules';
import { tubeDiagnostic, type ResolvedTube } from './tubeScene';

/** Lengths within this of the rule pass: the path math is float. */
const LENGTH_TOL_MM = 1e-9;

interface Side { gap: number; need: number; to: string }

/** The two sides of the joint along the trunk: the distance to the end of the
 *  straight, what that end is, and the straight the trunk's rules need there. */
function sides(branch: ResolvedTube, joint: TubeJoint, trunk: ResolvedTube, spec: TubeRuleSpec): { before: Side; after: Side } {
  const rules = effectiveRules(spec, trunk.meta.system);
  const foot = branch.od / 2;
  const atBend = Math.max(rules.minStraightBetweenBends * trunk.od, foot);
  const atEnd = (which: 'from' | 'to'): number => Math.max(endStraightNeed(trunk.od, trunk.meta[which], rules), foot);
  return {
    before: joint.startsAtEnd ? { gap: joint.before, need: atEnd('from'), to: "the trunk's from end" } :
      { gap: joint.before, need: atBend, to: `bend ${joint.bendsBefore} of the trunk` },
    after: joint.endsAtEnd ? { gap: joint.after, need: atEnd('to'), to: "the trunk's to end" } :
      { gap: joint.after, need: atBend, to: `bend ${joint.bendsBefore + 1} of the trunk` },
  };
}

function tooClose(branch: ResolvedTube, joint: TubeJoint, trunk: ResolvedTube, spec: TubeRuleSpec): CompilerDiagnostic[] {
  const { before, after } = sides(branch, joint, trunk, spec);
  const short = [before, after].filter((s) => s.gap < s.need - LENGTH_TOL_MM);
  if (short.length === 0) return [];
  const lo = joint.at - joint.before + before.need;
  const hi = joint.at + joint.after - after.need;
  const room = lo <= hi + LENGTH_TOL_MM ? `On this leg at may be ${mm2(lo)} to ${mm2(hi)} mm.` :
    'This leg of the trunk is too short for a branch.';
  return short.map((s) => tubeDiagnostic('tube.branch.too-close',
    `tube '${branch.name}' joins tube '${joint.trunk}' at ${mm2(joint.at)} mm, ${mm2(s.gap)} mm from ${s.to}; ` +
    `the rule needs ${mm2(s.need)} mm. ${room}`, branch.id));
}

function notSquare(branch: ResolvedTube, joint: TubeJoint): CompilerDiagnostic[] {
  if (joint.offSquareDeg <= PORT_AXIS_TOL_DEG) return [];
  return [tubeDiagnostic('tube.branch.axis-not-square',
    `tube '${branch.name}' leaves tube '${joint.trunk}' ${mm2(joint.offSquareDeg)} deg off square; ` +
    `the trunk leg runs along ${xyz2(joint.legDir)}. Use axis ${xyz2(joint.axis)}.`, branch.id)];
}

function tooLarge(branch: ResolvedTube, joint: TubeJoint, trunk: ResolvedTube): CompilerDiagnostic[] {
  if (branch.od <= trunk.od + LENGTH_TOL_MM) return [];
  return [tubeDiagnostic('tube.branch.od-too-large',
    `tube '${branch.name}' has OD ${mm2(branch.od)} mm and branches off tube '${joint.trunk}', whose OD is ${mm2(trunk.od)} mm.`,
    branch.id)];
}

/** Every branch finding for one tube; empty for a tube with no branch end.
 *  `tubes` are the model's resolved tubes, to find each trunk in. */
export function checkBranchRules(branch: ResolvedTube, tubes: readonly ResolvedTube[], spec: TubeRuleSpec): CompilerDiagnostic[] {
  return branch.joints.flatMap((joint) => {
    const trunk = tubes.find((t) => t.id === joint.trunkId);
    if (trunk === undefined) return [];
    return [...tooClose(branch, joint, trunk, spec), ...notSquare(branch, joint), ...tooLarge(branch, joint, trunk)];
  });
}

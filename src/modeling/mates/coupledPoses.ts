// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { NumericPoses } from '../capture/forwardKinematics';
import type { MateRecord } from './mate';

export interface MateCouplingRecord {
  readonly driven: string;
  readonly source: string;
  readonly ratio: number;
  readonly offset?: number;
}

export interface ExpandCoupledPosesOptions {
  readonly resolveSourcePose?: (
    source: MateRecord,
    poses: NumericPoses,
  ) => number | [number, number, number] | undefined;
}

export function expandCoupledPoses(
  mates: readonly MateRecord[],
  couplings: readonly MateCouplingRecord[],
  poses: NumericPoses = {},
  options: ExpandCoupledPosesOptions = {},
): NumericPoses {
  if (couplings.length === 0) return { ...poses };

  const mateByName = new Map(mates.map((mate) => [mate.name, mate]));
  const couplingByDriven = new Map(couplings.map((coupling) => [coupling.driven, coupling]));
  const expanded: NumericPoses = { ...poses };
  const resolving = new Set<string>();

  // A chained coupling (output <- idler <- input) can be declared in any
  // order, so derive a driven source from its own coupling first.
  const expand = (coupling: MateCouplingRecord): void => {
    if (expanded[coupling.driven] !== undefined || resolving.has(coupling.driven)) return;
    resolving.add(coupling.driven);
    const sourceCoupling = couplingByDriven.get(coupling.source);
    if (sourceCoupling !== undefined) expand(sourceCoupling);

    const sourcePose = resolveSourcePose(
      mateByName.get(coupling.source),
      expanded,
      options.resolveSourcePose,
    );
    resolving.delete(coupling.driven);
    if (sourcePose === undefined || Array.isArray(sourcePose)) return;

    expanded[coupling.driven] = sourcePose * coupling.ratio + (coupling.offset ?? 0);
  };

  for (const coupling of couplings) expand(coupling);

  return expanded;
}

function resolveSourcePose(
  source: MateRecord | undefined,
  poses: NumericPoses,
  resolver: ExpandCoupledPosesOptions['resolveSourcePose'],
): number | [number, number, number] | undefined {
  if (!source) return undefined;

  const override = poses[source.name];
  if (override !== undefined) return override;

  const resolved = resolver?.(source, poses);
  if (resolved !== undefined) return resolved;

  const pose = source.pose;
  if (typeof pose === 'number') return pose;
  // An unposed source rests at zero, as solveMates and physics place it, so
  // the driven mate still gets the coupling offset. A ParamRef pose stays
  // unresolved here for a caller that has a resolver.
  if (pose === undefined) return 0;

  return undefined;
}

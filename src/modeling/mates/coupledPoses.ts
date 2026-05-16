import type { NumericPoses } from '../../capture/forwardKinematics';
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
  const expanded: NumericPoses = { ...poses };

  for (const coupling of couplings) {
    if (expanded[coupling.driven] !== undefined) continue;

    const sourcePose = resolveSourcePose(
      mateByName.get(coupling.source),
      expanded,
      options.resolveSourcePose,
    );
    if (sourcePose === undefined || Array.isArray(sourcePose)) continue;

    expanded[coupling.driven] = sourcePose * coupling.ratio + (coupling.offset ?? 0);
  }

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

  return undefined;
}

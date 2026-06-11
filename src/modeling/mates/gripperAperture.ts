// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { TrackedConnectorPose } from './poseEnvelope';

export interface GripperApertureRequest {
  readonly left: string;
  readonly right: string;
}

export interface GripperApertureSample {
  readonly sampleName: string;
  readonly distanceMm: number;
}

export interface GripperApertureSummary {
  readonly left: string;
  readonly right: string;
  readonly minMm: number;
  readonly maxMm: number;
  readonly travelMm: number;
  readonly samples: readonly GripperApertureSample[];
}

export type GripperApertureResult =
  | { readonly summary: GripperApertureSummary; readonly missingRefs: readonly string[] }
  | { readonly summary?: undefined; readonly missingRefs: readonly string[] };

export function computeGripperAperture(
  poses: readonly TrackedConnectorPose[],
  request: GripperApertureRequest,
): GripperApertureResult {
  const left = poses.filter((pose) => pose.ref === request.left);
  const right = poses.filter((pose) => pose.ref === request.right);
  const missingRefs = [
    ...(left.length === 0 ? [request.left] : []),
    ...(right.length === 0 ? [request.right] : []),
  ];
  if (missingRefs.length > 0) return { missingRefs };

  const rightBySample = new Map(right.map((pose) => [pose.sampleName, pose]));
  const samples: GripperApertureSample[] = [];
  for (const leftPose of left) {
    const rightPose = rightBySample.get(leftPose.sampleName);
    if (!rightPose) continue;
    samples.push({
      sampleName: leftPose.sampleName,
      distanceMm: distance(leftPose.world, rightPose.world),
    });
  }

  if (samples.length === 0) return { missingRefs: [request.left, request.right] };

  samples.sort((a, b) => a.sampleName.localeCompare(b.sampleName));
  const distances = samples.map((sample) => sample.distanceMm);
  const minMm = Math.min(...distances);
  const maxMm = Math.max(...distances);

  return {
    summary: {
      left: request.left,
      right: request.right,
      minMm,
      maxMm,
      travelMm: maxMm - minMm,
      samples,
    },
    missingRefs: [],
  };
}

function distance(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

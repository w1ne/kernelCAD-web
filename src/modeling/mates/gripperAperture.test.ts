// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { computeGripperAperture } from './gripperAperture';
import type { TrackedConnectorPose } from './poseEnvelope';

const poses: TrackedConnectorPose[] = [
  {
    sampleName: 'open',
    ref: 'left.tip',
    partName: 'left',
    connectorName: 'tip',
    world: [-10, 0, 0],
  },
  {
    sampleName: 'open',
    ref: 'right.tip',
    partName: 'right',
    connectorName: 'tip',
    world: [10, 0, 0],
  },
  {
    sampleName: 'closed',
    ref: 'left.tip',
    partName: 'left',
    connectorName: 'tip',
    world: [-3, 0, 0],
  },
  {
    sampleName: 'closed',
    ref: 'right.tip',
    partName: 'right',
    connectorName: 'tip',
    world: [3, 0, 0],
  },
];

describe('computeGripperAperture', () => {
  it('computes min, max, and travel from paired fingertip samples', () => {
    expect(computeGripperAperture(poses, { left: 'left.tip', right: 'right.tip' })).toEqual({
      summary: {
        left: 'left.tip',
        right: 'right.tip',
        minMm: 6,
        maxMm: 20,
        travelMm: 14,
        samples: [
          { sampleName: 'closed', distanceMm: 6 },
          { sampleName: 'open', distanceMm: 20 },
        ],
      },
      missingRefs: [],
    });
  });

  it('reports missing refs when one fingertip connector has no poses', () => {
    expect(computeGripperAperture(poses, { left: 'left.tip', right: 'missing.tip' })).toEqual({
      missingRefs: ['missing.tip'],
    });
  });
});

// tests/unit/kinematic/pieperDetector.test.ts
//
// Classifies a chain as eligible for the closed-form analytical IK
// (six revolute joints in a serial open chain with the last three axes
// intersecting at a single point — the spherical-wrist condition).

import { describe, it, expect } from 'vitest';
import { pieperDetector } from '../../../src/kinematic/pieperDetector';
import { buildSpherical6DOF } from './fixtures/spherical6DOF';
import { buildNonPieper5DOF } from './fixtures/nonPieper5DOF';
import { buildRedundant7DOF } from './fixtures/redundant7DOF';

describe('pieperDetector', () => {
  it('classifies a 6-DOF spherical-wrist arm as analytical-IK-eligible', () => {
    const { arm, tipLink } = buildSpherical6DOF();
    const r = pieperDetector(arm, tipLink);
    expect(r.matches).toBe(true);
    if (r.matches) {
      expect(r.wristCenterPart).toBeDefined();
    }
  });

  it('rejects a 5-DOF chain as wrong-dof-count', () => {
    const { arm, tipLink } = buildNonPieper5DOF();
    const r = pieperDetector(arm, tipLink);
    expect(r.matches).toBe(false);
    if (!r.matches) {
      expect(r.reason).toBe('wrong-dof-count');
    }
  });

  it('rejects a 7-DOF redundant chain as wrong-dof-count', () => {
    const { arm, tipLink } = buildRedundant7DOF();
    const r = pieperDetector(arm, tipLink);
    expect(r.matches).toBe(false);
    if (!r.matches) {
      expect(r.reason).toBe('wrong-dof-count');
    }
  });
});

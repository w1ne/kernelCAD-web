// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { lookupCookbookTool } from './lookupCookbook';

describe('lookupCookbookTool — industry L/M/N chain cookbooks', () => {
  it('finds gt2-shop-release-actuator for shop-release actuator queries', async () => {
    for (const query of [
      'shop-release GT2 rotary actuator machined housing',
      'compact manufacturable belt-driven actuator 608 bearing cover',
      'GT2 belt cord rounded nubs not tooth meshing',
    ]) {
      const r = await lookupCookbookTool({ query, k: 5 });
      expect(r.ok, query).toBe(true);
      const ids = r.hits!.map((h) => h.id);
      expect(ids, query).toContain('gt2-shop-release-actuator');
    }
  });

  it('finds mated-inspection-head-routed-tube-animation for pan/tilt tube queries', async () => {
    for (const query of [
      'pan tilt inspection head routed service tube',
      'two DOF inspection head rigid swept tube animationView',
      'yaw stage tilt yoke fastened tube not flexible hose',
    ]) {
      const r = await lookupCookbookTool({ query, k: 5 });
      expect(r.ok, query).toBe(true);
      const ids = r.hits!.map((h) => h.id);
      expect(ids, query).toContain('mated-inspection-head-routed-tube-animation');
    }
  });

  it('finds 4dof-release-evidence-pack for release-pack queries', async () => {
    for (const query of [
      'four DOF release evidence pack static hold BOM USD',
      '4 DOF arm release package FEA unverified CalculiX',
      'open-chain reach cycle checkStaticHold explicit drives',
    ]) {
      const r = await lookupCookbookTool({ query, k: 5 });
      expect(r.ok, query).toBe(true);
      const ids = r.hits!.map((h) => h.id);
      expect(ids, query).toContain('4dof-release-evidence-pack');
    }
  });

  it('keeps the atomic GT2 and pipe-route snippets first for their parity queries', async () => {
    const gt2 = await lookupCookbookTool({
      query: 'GT2 timing belt drive pulleys center distance',
      k: 3,
    });
    expect(gt2.hits![0].id).toBe('gt2-timing-belt-drive');

    const pipe = await lookupCookbookTool({
      query: 'pipe route through 3D waypoints with bend radius',
      k: 3,
    });
    expect(pipe.hits![0].id).toBe('pipe-route-swept-tube');
  });
});

import { describe, it, expect } from 'vitest';
import { listPartFamiliesTool } from '../../../src/agent/mcp/tools/listPartFamilies';

describe('list_part_families — end-to-end', () => {
  it('returns all 39 bundled families with no filter', async () => {
    const r = await listPartFamiliesTool({});
    expect(r.ok).toBe(true);
    // Names are the generateSeedCatalog family ids; a renamed or extra family fails here.
    expect(r.families.map((f) => f.name).sort()).toEqual([
      'aluminum-extrusion',
      'button-head-cap-screw',
      'clamping-stud',
      'deep-groove-ball-bearing',
      'extrusion-bracket',
      'extrusion-t-nut',
      'flange-nut',
      'flat-head-countersunk',
      'flat-washer',
      'heat-set-insert',
      'hex-head-bolt',
      'hex-head-bolt-partial',
      'hex-nut',
      'jst-xh',
      'leadscrew',
      'leadscrew-nut',
      'linear-bearing',
      'linear-carriage',
      'linear-rail',
      'linear-shaft',
      'lock-nut',
      'lock-washer',
      'micro-servo',
      'mini-servo',
      'pin-header',
      'servo-horn',
      'set-screw',
      'shaft-collar',
      'shaft-coupler',
      'shaft-support',
      'socket-head-cap-screw',
      'spur-gear',
      'standard-servo',
      'step-block',
      'stepper-motor',
      'strap-clamp',
      't-slot-nut',
      'threaded-rod',
      'timing-pulley',
    ]);
  });

  it('every family entry carries a count and exemplar list', async () => {
    const r = await listPartFamiliesTool({});
    for (const f of r.families) {
      expect(f.count).toBeGreaterThan(0);
      expect(f.exemplarIds.length).toBeGreaterThan(0);
      expect(f.exemplarIds.length).toBeLessThanOrEqual(3);
    }
  });
});

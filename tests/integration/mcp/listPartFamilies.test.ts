import { describe, it, expect } from 'vitest';
import { listPartFamiliesTool } from '../../../src/agent/mcp/tools/listPartFamilies';

describe('list_part_families — end-to-end', () => {
  it('returns all 27 bundled families with no filter', async () => {
    const r = await listPartFamiliesTool({});
    expect(r.ok).toBe(true);
    // ISO 4014 is its own family (`hex-head-bolt-partial`), so the generated
    // catalog is the previous 24 families plus that one, plus the datasheet-modelled
    // `standard-servo` and `mini-servo` (MG995/MG996R, MG90S). Names are the
    // generateSeedCatalog family ids; a renamed or extra family fails here.
    expect(r.families.map((f) => f.name).sort()).toEqual([
      'button-head-cap-screw',
      'clamping-stud',
      'deep-groove-ball-bearing',
      'flange-nut',
      'flat-head-countersunk',
      'flat-washer',
      'heat-set-insert',
      'hex-head-bolt',
      'hex-head-bolt-partial',
      'hex-nut',
      'jst-xh',
      'linear-shaft',
      'lock-nut',
      'lock-washer',
      'micro-servo',
      'mini-servo',
      'pin-header',
      'servo-horn',
      'set-screw',
      'socket-head-cap-screw',
      'spur-gear',
      'standard-servo',
      'step-block',
      'stepper-motor',
      'strap-clamp',
      't-slot-nut',
      'threaded-rod',
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

// eval/oracle/museScorer.test.ts
//
// Tests for the pure payload-shaping helper that turns the MUSE wrapper's
// JSON output into a typed MuseScoreResult. The subprocess pipeline itself
// (kernelcad export step + MUSE venv python) is exercised by the muse-*
// task harnesses, not unit tests.

import { describe, it, expect } from 'vitest';
import { parseMuseWrapperPayload } from './museScorer';

const basePayload = {
  shim_code_path: '/run/muse/code.py',
  step_path: '/run/muse/sample.step',
  step_exists: true,
  sandbox_ok: true,
  sandbox_error: '',
  result_solid_count: 5,
  bbox: [500, 500, 415],
  validator_available: false,
  geometry: null,
  geometry_note: 'validator unavailable',
  interpenetration: {
    interpenetration_free: true,
    n_solids: 5,
    max_overlap_ratio: 0,
    interpenetrating_pairs: 0,
    pairs_checked: 4,
  },
  render_ok: true,
  render_png_path: '/run/muse/render/x_render.png',
  render_mesh_path: '/run/muse/render/x.stl',
  render_step_path: '/run/muse/render/x.step',
  render_error: '',
};

describe('parseMuseWrapperPayload', () => {
  it('maps a passing funnel payload', () => {
    const r = parseMuseWrapperPayload(basePayload, '/run/muse/sample.step', 100, 200, []);
    expect(r.sandboxOk).toBe(true);
    expect(r.overlapFree).toBe(true);
    expect(r.resultSolidCount).toBe(5);
    expect(r.validatorAvailable).toBe(false);
    expect(r.renderOk).toBe(true);
    expect(r.reason).toContain('sandbox=pass');
    expect(r.reason).toContain('occt-validity=unavailable');
    expect(r.reason).toContain('overlap=pass');
  });

  it('treats a sandbox failure as overlap not-reached (null), never silently passing', () => {
    const r = parseMuseWrapperPayload(
      {
        ...basePayload,
        sandbox_ok: false,
        sandbox_error: 'Traceback: importStep failed',
        interpenetration: null,
        render_ok: false,
      },
      '/run/muse/sample.step',
      0,
      0,
      ['kernelcad export step failed (exit 1)'],
    );
    expect(r.sandboxOk).toBe(false);
    expect(r.overlapFree).toBeNull();
    expect(r.errors).toContain('kernelcad export step failed (exit 1)');
    expect(r.reason).toContain('sandbox=FAIL');
    expect(r.reason).toContain('overlap=not-reached');
  });

  it('flags interpenetration failures', () => {
    const r = parseMuseWrapperPayload(
      {
        ...basePayload,
        interpenetration: {
          interpenetration_free: false,
          n_solids: 3,
          max_overlap_ratio: 0.4,
          interpenetrating_pairs: 1,
          pairs_checked: 2,
        },
      },
      '/run/muse/sample.step',
      10,
      20,
      [],
    );
    expect(r.overlapFree).toBe(false);
    expect(r.reason).toContain('overlap=FAIL');
  });

  it('surfaces a wrapper infra error without claiming any stage result', () => {
    const r = parseMuseWrapperPayload(
      { infra_error: 'cannot import MUSE judge_system' },
      '/x.step',
      0,
      0,
      [],
    );
    expect(r.sandboxOk).toBe(false);
    expect(r.overlapFree).toBeNull();
    expect(r.errors.some((e) => e.includes('cannot import MUSE judge_system'))).toBe(true);
  });

  it('keeps overlap null when the interpenetration check itself errored', () => {
    const r = parseMuseWrapperPayload(
      { ...basePayload, interpenetration: { interpenetration_free: null, error: 'STEP parse failed' } },
      '/x.step',
      0,
      0,
      [],
    );
    expect(r.overlapFree).toBeNull();
  });
});

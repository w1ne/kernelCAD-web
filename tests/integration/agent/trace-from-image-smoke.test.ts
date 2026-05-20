// tests/integration/agent/trace-from-image-smoke.test.ts
//
// End-to-end smoke for `trace_from_image` on the eyewear-wayfarer reference.
// Proves the pipe (real image → router → opencv → polyline → scale conversion)
// works on one canonical product photo.
//
// SKIPPED in vitest: this test exercises the opencv backend, whose WASM
// init (`@techstark/opencv-js`) does NOT auto-initialize under node-vitest —
// the test would hang indefinitely.  See src/agent/vision/opencvBackend.test.ts
// for the same skip and the follow-up note.  The behaviour is still
// exercised end-to-end by the real CLI process (which loads opencv lazily and
// completes init asynchronously without vitest's worker pool gating the WASM
// onload callbacks).
//
// Follow-up: unskip once getCv() in opencvBackend.ts is rewritten against the
// supported @techstark/opencv-js init API.

import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { traceFromImage } from '../../../src/agent/vision';

const WAYFARER_REF = join(
  __dirname,
  '../../../eval/tasks/eyewear-wayfarer-front/reference.jpg',
);

describe.skip('trace_from_image — eyewear-wayfarer smoke', () => {
  it('opencv backend extracts a usable silhouette polyline', async () => {
    const bytes = await readFile(WAYFARER_REF);
    expect(bytes.length).toBeGreaterThan(50 * 1024);

    const out = await traceFromImage({
      imageUrl: `file://${WAYFARER_REF}`,
      backend: 'opencv',
    });

    expect(out.ok).toBe(true);
    expect(out.features).toHaveLength(1);
    const feat = out.features[0];
    expect(feat.backend).toBe('opencv');
    expect(feat.waypoints.length).toBeGreaterThanOrEqual(4);
    expect(feat.waypoints.length).toBeLessThanOrEqual(16);

    // The wayfarer reference is much wider than tall — bbox width > height.
    const xs = feat.waypoints.map(([x]) => x);
    const ys = feat.waypoints.map(([, y]) => y);
    const bboxW = Math.max(...xs) - Math.min(...xs);
    const bboxH = Math.max(...ys) - Math.min(...ys);
    expect(bboxW).toBeGreaterThan(bboxH);
    expect(bboxW).toBeGreaterThan(0.5);
  }, 60000);

  it('auto-routes the wayfarer reference to opencv', async () => {
    const out = await traceFromImage({
      imageUrl: `file://${WAYFARER_REF}`,
      // backend omitted → auto
    });
    expect(out.ok).toBe(true);
    expect(out.features[0].backend).toBe('opencv');
  }, 60000);

  it('scale-anchor conversion produces a plausible mm polyline', async () => {
    const out = await traceFromImage({
      imageUrl: `file://${WAYFARER_REF}`,
      backend: 'opencv',
    });
    expect(out.ok).toBe(true);
    const FRAME_WIDTH_MM = 130;
    const FRAME_NORM_SPAN = 0.84;
    const MM_PER_NORM = FRAME_WIDTH_MM / FRAME_NORM_SPAN;
    const mm = out.features[0].waypoints.map(([nx, ny]) => [
      (nx - 0.5) * MM_PER_NORM,
      -(ny - 0.5) * MM_PER_NORM,
    ]);
    for (const [x, y] of mm) {
      expect(Math.abs(x)).toBeLessThan(120);
      expect(Math.abs(y)).toBeLessThan(60);
    }
  }, 60000);
});

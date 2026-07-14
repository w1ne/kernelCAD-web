// tests/integration/agent/trace-from-image-smoke.test.ts
//
// End-to-end smoke for `trace_from_image` on a tiny deterministic PNG.
// Proves the pipe (image file → router → opencv → polyline) works in vitest
// without depending on a large product-photo fixture.

import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { TraceFromImageInput, TraceFromImageOutput } from '../../../src/agent/vision';

const FIXTURE = join(__dirname, '../../../tests/fixtures/vision/uniform-bg-square.png');
const E_READER_REFERENCE = join(__dirname, '../../../examples/from-reference/e-reader/kindle-2-reference.jpg');
// A cold Node + sharp process has taken 4.6s on the CI runner for the 6 MP
// e-reader reference. Keep the subprocess bounded so the old WASM-hang bug is
// still caught, but leave enough headroom for a real product photo.
const FAIL_FAST_MS = 15_000;
const execFileAsync = promisify(execFile);

describe('trace_from_image smoke', () => {
  it('opencv backend extracts normalized square bbox and bounded waypoint count', async () => {
    const out = await runTraceFromImageInNode({
      imageUrl: `file://${FIXTURE}`,
      backend: 'opencv',
      maxWaypointsPerFeature: 12,
    });

    expect(out.ok).toBe(true);
    expect(out.imageDims).toEqual([256, 256]);
    expect(out.features).toHaveLength(1);
    const feat = out.features[0];
    expect(feat.backend).toBe('opencv');
    expect(feat.waypoints.length).toBeGreaterThanOrEqual(4);
    expect(feat.waypoints.length).toBeLessThanOrEqual(16);

    const xs = feat.waypoints.map(([x]) => x);
    const ys = feat.waypoints.map(([, y]) => y);
    expect(Math.min(...xs)).toBeGreaterThan(0.25);
    expect(Math.min(...xs)).toBeLessThan(0.35);
    expect(Math.max(...xs)).toBeGreaterThan(0.65);
    expect(Math.max(...xs)).toBeLessThan(0.75);
    expect(Math.min(...ys)).toBeGreaterThan(0.25);
    expect(Math.min(...ys)).toBeLessThan(0.35);
    expect(Math.max(...ys)).toBeGreaterThan(0.65);
    expect(Math.max(...ys)).toBeLessThan(0.75);
  }, 5000);

  it('auto-routes the uniform-background fixture to opencv', async () => {
    const out = await runTraceFromImageInNode({
      imageUrl: `file://${FIXTURE}`,
      // backend omitted → auto
    });
    expect(out.ok).toBe(true);
    expect(out.features[0].backend).toBe('opencv');
  }, 5000);

  it.each(['auto', 'opencv'] as const)(
    '%s traces the broad light e-reader housing instead of its dark internal screen',
    async (backend) => {
      const out = await runTraceFromImageInNode({
        imageUrl: `file://${E_READER_REFERENCE}`,
        backend,
        features: [{ label: 'outer_housing', kind: 'silhouette' }],
      });

      expect(out.ok).toBe(true);
      expect(out.features).toHaveLength(1);
      expect(out.features[0].backend).toBe('opencv');
      const xs = out.features[0].waypoints.map(([x]) => x);
      const ys = out.features[0].waypoints.map(([, y]) => y);
      // The dark screen spans ~59% × 55% of the photo. A valid outer-device
      // trace must instead cover the pale housing's broad, inset silhouette.
      expect(Math.min(...xs)).toBeLessThan(0.12);
      expect(Math.max(...xs)).toBeGreaterThan(0.88);
      expect(Math.min(...ys)).toBeLessThan(0.1);
      expect(Math.max(...ys)).toBeGreaterThan(0.9);
    },
    FAIL_FAST_MS + 1_000,
  );
});

async function runTraceFromImageInNode(input: TraceFromImageInput): Promise<TraceFromImageOutput> {
  const script = `
    import { traceFromImage } from './src/agent/vision/index.ts';

    const out = await traceFromImage(${JSON.stringify(input)});
    console.log(JSON.stringify(out));
  `;
  const { stdout } = await execFileAsync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', script],
    {
      cwd: join(__dirname, '../../..'),
      timeout: FAIL_FAST_MS,
      killSignal: 'SIGKILL',
    },
  );
  return JSON.parse(stdout.trim()) as TraceFromImageOutput;
}

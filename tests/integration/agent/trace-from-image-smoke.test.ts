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
const FAIL_FAST_MS = 5000;
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

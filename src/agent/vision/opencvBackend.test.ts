// src/agent/vision/opencvBackend.test.ts
//
// Tests for the pure-JS opencv silhouette backend.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const FIXTURE_DIR = join(__dirname, '../../..', 'tests/fixtures/vision');
const FAIL_FAST_MS = 4000;
const execFileAsync = promisify(execFile);

async function withFailFast<T>(promise: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`test-side fail-fast after ${FAIL_FAST_MS}ms`)),
          FAIL_FAST_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

describe('extractSilhouettePolyline', () => {
  afterEach(() => {
    vi.doUnmock('@techstark/opencv-js');
    vi.resetModules();
    delete process.env.KERNELCAD_OPENCV_INIT_TIMEOUT_MS;
  });

  it('extracts a polyline hugging the centered black square on a white background', async () => {
    const polyline = await runExtractorInNode('uniform-bg-square.png', 12);
    // Must extract at least the 4 corners of the square.
    expect(polyline.length).toBeGreaterThanOrEqual(4);
    expect(polyline.length).toBeLessThanOrEqual(12);

    // Bounding box of the extracted polyline should hug the centered 100×100
    // square inside a 256×256 image. Square spans pixel rows/cols [78..177];
    // normalised [78/256, 177/256] = [~0.305, ~0.691]. Allow a few px of slack
    // for findContours' edge handling.
    const xs = polyline.map(([x]) => x);
    const ys = polyline.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    expect(minX).toBeGreaterThan(0.25);
    expect(minX).toBeLessThan(0.35);
    expect(maxX).toBeGreaterThan(0.65);
    expect(maxX).toBeLessThan(0.75);
    expect(minY).toBeGreaterThan(0.25);
    expect(minY).toBeLessThan(0.35);
    expect(maxY).toBeGreaterThan(0.65);
    expect(maxY).toBeLessThan(0.75);
  }, 5000);

  it('times out instead of hanging when opencv never initializes', async () => {
    process.env.KERNELCAD_OPENCV_INIT_TIMEOUT_MS = '25';
    vi.doMock('@techstark/opencv-js', () => ({ default: {} }));
    const { extractSilhouettePolyline } = await import('./opencvBackend');
    const png = await readFile(join(FIXTURE_DIR, 'uniform-bg-square.png'));

    await expect(withFailFast(extractSilhouettePolyline(png, 12))).rejects.toThrow(
      /opencv initialization timed out/i,
    );
  }, 1000);
});

async function runExtractorInNode(fixtureName: string, maxWaypoints: number): Promise<[number, number][]> {
  const script = `
    import { readFile } from 'node:fs/promises';
    import { join } from 'node:path';
    import { extractSilhouettePolyline } from './src/agent/vision/opencvBackend.ts';

    const png = await readFile(join(${JSON.stringify(FIXTURE_DIR)}, ${JSON.stringify(fixtureName)}));
    const polyline = await extractSilhouettePolyline(png, ${JSON.stringify(maxWaypoints)});
    console.log(JSON.stringify(polyline));
  `;
  return runNodeExtractorScript(script);
}

async function runNodeExtractorScript(script: string): Promise<[number, number][]> {
  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '-e', script],
      {
        cwd: join(__dirname, '../../..'),
        timeout: FAIL_FAST_MS,
        killSignal: 'SIGKILL',
      },
    );
    return JSON.parse(stdout.trim()) as [number, number][];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(message);
  }
}

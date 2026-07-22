import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import {
  normalizeInspectionTileForTest,
  resolveDemoPlayerReadyTimeout,
  waitForDemoPlayerReady,
} from '../../../src/agent/render/headlessRender';

describe('headlessRender inspection channel normalization', () => {
  it('allows a cold static demo-player mount up to one minute by default', () => {
    expect(resolveDemoPlayerReadyTimeout()).toBe(60_000);
    expect(resolveDemoPlayerReadyTimeout(12_345)).toBe(12_345);
  });

  it('passes the readiness timeout as Playwright options rather than as the page-function argument', async () => {
    const waitForFunction = vi.fn().mockResolvedValue(undefined);

    await waitForDemoPlayerReady({ waitForFunction } as never);

    expect(waitForFunction).toHaveBeenCalledWith(expect.any(Function), undefined, { timeout: 60_000 });
  });

  it('center-crops object-id masks to the output aspect with nearest sampling', async () => {
    const source = await sharp({
      create: {
        width: 2,
        height: 1,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        data.set([0, 0, 1, 255, 0, 0, 2, 255]);
        return sharp(data, { raw: info }).png().toBuffer();
      });

    const normalized = await normalizeInspectionTileForTest(source, {
      viewportWidth: 4,
      viewportHeight: 4,
      channel: 'mask',
    });
    const { data, info } = await sharp(normalized).raw().toBuffer({ resolveWithObject: true });

    expect(info.width).toBe(4);
    expect(info.height).toBe(4);
    // The 2×1 source center-crops to the 1×1 region at floor((2-1)/2) = 0
    // (the LEFT pixel) and nearest-resizes — no background sentinel is
    // injected because padding no longer exists.
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += info.channels) {
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
    }
    expect(colors).toEqual(new Set(['0,0,1,255']));
  });

  it('center-crops packed depth to the output aspect with nearest sampling', async () => {
    const source = await sharp({
      create: {
        width: 2,
        height: 1,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        data.set([10, 20, 30, 255, 40, 50, 60, 255]);
        return sharp(data, { raw: info }).png().toBuffer();
      });

    const normalized = await normalizeInspectionTileForTest(source, {
      viewportWidth: 4,
      viewportHeight: 4,
      channel: 'depth',
    });
    const { data, info } = await sharp(normalized).raw().toBuffer({ resolveWithObject: true });

    expect(info.width).toBe(4);
    expect(info.height).toBe(4);
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += info.channels) {
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
    }
    expect(colors).toEqual(new Set(['10,20,30,255']));
  });
});

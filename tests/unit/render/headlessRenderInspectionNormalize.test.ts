import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { normalizeInspectionTileForTest } from '../../../src/agent/render/headlessRender';

describe('headlessRender inspection channel normalization', () => {
  it('resizes object-id masks with nearest sampling and black background sentinel', async () => {
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
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += info.channels) {
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
    }
    expect(colors).toEqual(new Set(['0,0,0,255', '0,0,1,255', '0,0,2,255']));
  });

  it('resizes packed depth with nearest sampling and transparent background sentinel', async () => {
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

    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += info.channels) {
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
    }
    expect(colors).toEqual(new Set(['0,0,0,0', '10,20,30,255', '40,50,60,255']));
  });
});

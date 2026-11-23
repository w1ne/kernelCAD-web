// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import {
  exceptionApplies, pixelDiff, pixelSha256, previewMatches, shardPreviewAssets, touchedAssets, type RgbaImage,
} from './catalogPreviewGate';

const rows = [
  { id: 'din-rail-end-stop', kit: 'standard-components', source: 'catalog/kits/standard-components/din-rail-end-stop.kcad.ts' },
  { id: 'pipe-elbow-90', kit: 'standard-components', source: 'catalog/kits/standard-components/pipe-elbow-90.kcad.ts' },
];

function image(width: number, height: number, fill: number): RgbaImage {
  const data = new Uint8Array(width * height * 4).fill(fill);
  return { width, height, data };
}

describe('touchedAssets', () => {
  it('flags a source-only change, as in the stale #1413 head', () => {
    expect(touchedAssets(['catalog/kits/standard-components/din-rail-end-stop.kcad.ts', 'README.md'], rows)).toEqual([
      { row: rows[0], sourceChanged: true, previewChanged: false },
    ]);
  });

  it('flags a preview-only change and ignores unrelated catalog files', () => {
    expect(touchedAssets(['catalog/kits/standard-components/previews/pipe-elbow-90.png', 'catalog/index.json'], rows)).toEqual([
      { row: rows[1], sourceChanged: false, previewChanged: true },
    ]);
  });
});

describe('pixelDiff and previewMatches', () => {
  it('accepts identical pixels', () => {
    expect(previewMatches(pixelDiff(image(4, 4, 10), image(4, 4, 10)))).toBe(true);
  });

  it('accepts a few anti-aliased edge pixels', () => {
    // One pixel in 100 changes by 60 on each channel: mean 0.6, 1 % of pixels.
    const a = image(10, 10, 100);
    const b = image(10, 10, 100);
    b.data.fill(160, 0, 3);
    const diff = pixelDiff(a, b);
    expect(diff.changedFraction).toBeCloseTo(0.01);
    expect(diff.meanAbs).toBeCloseTo(0.6);
    expect(previewMatches(diff)).toBe(true);
  });

  it('rejects a broadly different image, such as a stale model or another camera', () => {
    expect(previewMatches(pixelDiff(image(10, 10, 100), image(10, 10, 130)))).toBe(false);
  });

  it('rejects a size change', () => {
    expect(pixelDiff(image(4, 4, 0), image(4, 5, 0)).sameSize).toBe(false);
    expect(previewMatches(pixelDiff(image(4, 4, 0), image(4, 5, 0)))).toBe(false);
  });
});

describe('exceptionApplies', () => {
  const exception = { sourceSha256: 'src-a', previewPixelsSha256: 'px-a', reason: 'custom camera', reviewedIn: '#1342' };

  it('applies only to the reviewed source and preview', () => {
    expect(exceptionApplies(exception, 'src-a', 'px-a')).toBe(true);
    expect(exceptionApplies(exception, 'src-b', 'px-a')).toBe(false);
    expect(exceptionApplies(exception, 'src-a', 'px-b')).toBe(false);
    expect(exceptionApplies(undefined, 'src-a', 'px-a')).toBe(false);
  });

  it('hashes decoded pixels and size, not PNG bytes', () => {
    expect(pixelSha256(image(4, 4, 7))).toBe(pixelSha256(image(4, 4, 7)));
    expect(pixelSha256(image(4, 4, 7))).not.toBe(pixelSha256(image(2, 8, 7)));
    expect(pixelSha256(image(4, 4, 7))).not.toBe(pixelSha256(image(4, 4, 8)));
  });
});


describe('shardPreviewAssets', () => {
  it('covers every changed asset exactly once across four CI runners', () => {
    const ids = Array.from({ length: 50 }, (_, index) => `asset-${index}`);
    const buckets = Array.from({ length: 4 }, (_, index) => shardPreviewAssets(ids, `${index + 1}/4`));
    expect(buckets.map((bucket) => bucket.length)).toEqual([13, 13, 12, 12]);
    const all = buckets.flat();
    expect(all).toHaveLength(ids.length);
    expect(new Set(all).size).toBe(ids.length);
    expect(all.slice().sort()).toEqual(ids.slice().sort());
    expect(shardPreviewAssets(ids)).toEqual(ids);
  });
  it.each(['0/4', '5/4', '1/0', '2', 'a/4', '2/1', '1/4.5', '', '999999999999999999/999999999999999999'])('fails closed on an invalid shard spec %s', (spec) => {
    expect(() => shardPreviewAssets(['asset'], spec)).toThrow(/Invalid preview shard/);
  });
});

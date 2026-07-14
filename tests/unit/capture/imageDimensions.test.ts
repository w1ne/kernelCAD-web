import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { imageDimensions } from '../../../src/modeling/capture/imageDimensions';

function jpegSegment(marker: number, payload: Buffer): Buffer {
  const length = payload.length + 2;
  if (length > 0xffff) throw new Error('JPEG segment payload is too large for this fixture');
  return Buffer.concat([
    Buffer.from([0xff, marker, length >> 8, length & 0xff]),
    payload,
  ]);
}

function jpegWithDimensions(
  width: number,
  height: number,
  appPayloadLengths: number[] = [],
): Buffer {
  const sof0Payload = Buffer.from([
    8,
    height >> 8, height & 0xff,
    width >> 8, width & 0xff,
    3,
    1, 0x11, 0,
    2, 0x11, 0,
    3, 0x11, 0,
  ]);

  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    ...appPayloadLengths.map((length) => jpegSegment(0xe1, Buffer.alloc(length))),
    jpegSegment(0xc0, sof0Payload),
    Buffer.from([0xff, 0xd9]),
  ]);
}

describe('imageDimensions', () => {
  it('decodes JPEG dimensions after more than 80 KiB of metadata headers', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-image-dimensions-'));
    try {
      const imagePath = join(tmpDir, 'large-header.jpg');
      writeFileSync(imagePath, jpegWithDimensions(2100, 3000, [42_000, 42_000]));

      expect(imageDimensions(imagePath)).toEqual({ width: 2100, height: 3000 });
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('fails closed when the Start Of Frame is beyond the finite JPEG header scan budget', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-image-dimensions-'));
    try {
      const imagePath = join(tmpDir, 'scan-budget.jpg');
      writeFileSync(imagePath, jpegWithDimensions(2100, 3000, Array.from({ length: 36 }, () => 60_000)));

      expect(imageDimensions(imagePath)).toEqual({ width: 0, height: 0 });
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('fails closed after a finite number of crafted JPEG marker segments', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-image-dimensions-'));
    try {
      const imagePath = join(tmpDir, 'marker-budget.jpg');
      writeFileSync(imagePath, jpegWithDimensions(2100, 3000, Array.from({ length: 5_000 }, () => 0)));

      expect(imageDimensions(imagePath)).toEqual({ width: 0, height: 0 });
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

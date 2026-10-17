// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Side-view measurement of the McGregor studio frame.
// Bright means Rec.709 luminance above 48. Nose and tail are the first and
// last columns that contain a vertical run of at least 14 bright pixels.
// The ground row is the lowest bright pixel on the single-run nose and hood,
// where that clip meets the floor. Station s maps across nose..tail onto the
// assumed body length.

import sharp from 'sharp';

const RUN_FOR_SPAN = 14;
const RUN_FOR_EDGE = 8;

export interface StationPhoto {
  readonly s: number;
  readonly x: number;
  readonly photoZTop: number;
  readonly photoZBottom: number;
}

export interface SideTrace {
  readonly imagePath: string;
  readonly width: number;
  readonly height: number;
  readonly noseX: number;
  readonly tailX: number;
  readonly groundRow: number;
  readonly mmPerPx: number;
  readonly lengthMm: number;
  readonly stations: readonly StationPhoto[];
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function runsOf(mask: readonly boolean[], minLength: number): Array<[number, number]> {
  const found: Array<[number, number]> = [];
  let start = -1;
  for (let y = 0; y <= mask.length; y++) {
    const on = y < mask.length && mask[y] === true;
    if (on && start < 0) start = y;
    if (!on && start >= 0) {
      if (y - start >= minLength) found.push([start, y - 1]);
      start = -1;
    }
  }
  return found;
}

export async function traceSidePhoto(
  imagePath: string,
  stationS: readonly number[],
  lengthMm = 4520,
): Promise<SideTrace> {
  const { data, info } = await sharp(imagePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) throw new Error(`expected RGB pixels, got ${info.channels} channels`);
  const width = info.width;
  const height = info.height;
  const column = (x: number): boolean[] => {
    const mask = Array<boolean>(height).fill(false);
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 3;
      mask[y] = luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0) > 48;
    }
    return mask;
  };

  const spanned: number[] = [];
  const masks: boolean[][] = [];
  for (let x = 0; x < width; x++) {
    const mask = column(x);
    masks.push(mask);
    if (runsOf(mask, RUN_FOR_SPAN).length > 0) spanned.push(x);
  }
  const noseX = spanned[0];
  const tailX = spanned[spanned.length - 1];
  if (noseX === undefined || tailX === undefined || tailX <= noseX) {
    throw new Error('the side frame has no bright span to measure');
  }

  let groundRow = -1;
  for (let x = noseX; x <= tailX; x++) {
    const runs = runsOf(masks[x] ?? [], RUN_FOR_EDGE);
    if (runs.length !== 1) break;
    const bottom = runs[0]?.[1] ?? 0;
    if (bottom > groundRow) groundRow = bottom;
  }
  if (groundRow < 0) throw new Error('the nose clip has no bright floor');

  const mmPerPx = lengthMm / (tailX - noseX);
  const stations = stationS.map((s) => {
    const x = Math.round(noseX + s / mmPerPx);
    const clamped = Math.min(width - 1, Math.max(0, x));
    const runs = runsOf(masks[clamped] ?? [], RUN_FOR_EDGE);
    if (runs.length === 0) {
      return { s, x: clamped, photoZTop: Number.NaN, photoZBottom: Number.NaN };
    }
    const top = Math.min(...runs.map((run) => run[0]));
    const bottom = Math.max(...runs.map((run) => run[1]));
    return {
      s,
      x: clamped,
      photoZTop: (groundRow - top) * mmPerPx,
      photoZBottom: (groundRow - bottom) * mmPerPx,
    };
  });

  return { imagePath, width, height, noseX, tailX, groundRow, mmPerPx, lengthMm, stations };
}

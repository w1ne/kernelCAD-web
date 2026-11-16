// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Pure logic for the changed-source catalog preview gate (#1416): which assets
// a diff touches, whether two decoded previews match, and whether a reviewed
// exception still applies. scripts/checkChangedCatalogPreviews.ts does the git,
// build and render work around it.
import { createHash } from 'node:crypto';

export interface GateRow {
  id: string;
  kit: string;
  source: string;
}

export interface TouchedAsset {
  row: GateRow;
  sourceChanged: boolean;
  previewChanged: boolean;
}

export function previewPathFor(row: GateRow): string {
  return `catalog/kits/${row.kit}/previews/${row.id}.png`;
}

/** Map changed repo paths to the catalog assets whose source or preview they are. */
export function touchedAssets(changed: readonly string[], rows: readonly GateRow[]): TouchedAsset[] {
  const files = new Set(changed);
  const out: TouchedAsset[] = [];
  for (const row of rows) {
    const sourceChanged = files.has(row.source);
    const previewChanged = files.has(previewPathFor(row));
    if (sourceChanged || previewChanged) out.push({ row, sourceChanged, previewChanged });
  }
  return out;
}

export interface RgbaImage {
  width: number;
  height: number;
  /** 4 bytes per pixel. */
  data: Uint8Array;
}

export interface PixelDiff {
  sameSize: boolean;
  /** Mean absolute RGB difference per channel, 0..255. */
  meanAbs: number;
  /** Fraction of pixels with any RGB difference, 0..1. */
  changedFraction: number;
}

export function pixelDiff(a: RgbaImage, b: RgbaImage): PixelDiff {
  if (a.width !== b.width || a.height !== b.height) return { sameSize: false, meanAbs: 255, changedFraction: 1 };
  const pixels = a.width * a.height;
  let sum = 0;
  let changed = 0;
  for (let i = 0; i < pixels * 4; i += 4) {
    let any = false;
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(a.data[i + c]! - b.data[i + c]!);
      sum += d;
      if (d > 0) any = true;
    }
    if (any) changed++;
  }
  return { sameSize: true, meanAbs: sum / (pixels * 3), changedFraction: changed / pixels };
}

/**
 * Re-renders on another machine differ from the committed preview by a few
 * anti-aliased edge pixels (measured on develop: mean below 0.5/255 and under
 * 0.7 % of pixels for pipe-reducer, knurled-knob and shaft-collar). A stale or
 * different-camera preview differs far more (pipe-elbow-90: mean 19.4/255).
 */
export const PREVIEW_TOLERANCE = { meanAbs: 1, changedFraction: 0.02 } as const;

export function previewMatches(diff: PixelDiff): boolean {
  return diff.sameSize && diff.meanAbs <= PREVIEW_TOLERANCE.meanAbs && diff.changedFraction <= PREVIEW_TOLERANCE.changedFraction;
}

export function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Hash of the decoded pixels, so a lossless PNG re-encode keeps the same value. */
export function pixelSha256(image: RgbaImage): string {
  return createHash('sha256').update(`${image.width}x${image.height}:`).update(image.data).digest('hex');
}

export interface PreviewException {
  /** sha256 of the reviewed .kcad.ts source bytes. */
  sourceSha256: string;
  /** pixelSha256 of the reviewed committed preview. */
  previewPixelsSha256: string;
  reason: string;
  reviewedIn: string;
}

export type PreviewExceptions = Record<string, PreviewException>;

/** An exception applies only to the exact source and preview that were reviewed. */
export function exceptionApplies(
  exception: PreviewException | undefined,
  sourceSha: string,
  previewPixelsSha: string,
): boolean {
  return exception !== undefined && exception.sourceSha256 === sourceSha && exception.previewPixelsSha256 === previewPixelsSha;
}

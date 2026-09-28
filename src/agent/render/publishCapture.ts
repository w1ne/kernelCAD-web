// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/render/publishCapture.ts
//
// Node half of the 'publish' render preset (src/shared/render/publishPreset.ts).
// Drives the demo-player's publish bridge (publishStage.ts): apply the
// studio stage once, then capture each frame from the canvas at the
// supersampled size and downsample it here with sharp to the exact output
// size — the supersample + lanczos downsample on top of MSAA is the
// anti-aliasing. Used by headlessRender (render_preview stills) and
// captureTurntable (capture_animation turntables): one capture path.

import type { Page } from 'playwright';
import sharp from 'sharp';
import {
  PUBLISH_PRESET,
  publishSupersample,
  type PublishFrameCapture,
  type PublishFrameRequest,
  type PublishStageSpec,
} from '../../shared/render/publishPreset';

// `page.evaluate(...)` callbacks execute inside the browser; narrow shim of
// the bridge (same pattern as headlessRender.ts).
declare const window: {
  __demoPlayer?: {
    setPublishStage: (spec: PublishStageSpec | null) => void;
    capturePublishFrame: (req: PublishFrameRequest) => PublishFrameCapture;
  };
};

/** Demo-player query parts a publish capture needs: an alpha-capable WebGL
 *  context (transparent backdrop) and no DOM watermark badge. */
export const PUBLISH_QUERY_PARTS: readonly string[] = ['alpha=1', 'nowatermark=1'];

export async function applyPublishStageOnPage(
  page: Pick<Page, 'evaluate'>,
  spec: PublishStageSpec,
): Promise<void> {
  await page.evaluate((s) => window.__demoPlayer!.setPublishStage(s), spec);
}

export interface PublishTileRequest {
  width: number;
  height: number;
  view?: PublishFrameRequest['view'];
  azDeg?: number;
  elDeg?: number;
  fit?: PublishFrameRequest['fit'];
  /** Override the size-derived supersample factor (turntables pass
   *  PUBLISH_PRESET.turntableSupersample). */
  supersample?: number;
}

/** The full bridge request for a tile: preset margin + supersample factor. */
export function publishFrameRequest(tile: PublishTileRequest): PublishFrameRequest {
  return {
    width: tile.width,
    height: tile.height,
    supersample: Math.min(tile.supersample ?? Infinity, publishSupersample(tile.width, tile.height)),
    margin: PUBLISH_PRESET.margin,
    ...(tile.view !== undefined ? { view: tile.view } : {}),
    ...(tile.azDeg !== undefined ? { azDeg: tile.azDeg } : {}),
    ...(tile.elDeg !== undefined ? { elDeg: tile.elDeg } : {}),
    ...(tile.fit !== undefined ? { fit: tile.fit } : {}),
  };
}

/** Downsample a supersampled capture to the exact output size. sharp
 *  premultiplies alpha before resampling, so transparent edges stay clean. */
export async function downsamplePublishFrame(png: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(png)
    .resize(width, height, { kernel: 'lanczos3', fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Capture one publish tile as an exact-size PNG buffer. */
export async function capturePublishTile(
  page: Pick<Page, 'evaluate'>,
  tile: PublishTileRequest,
): Promise<Buffer> {
  const req = publishFrameRequest(tile);
  const capture = await page.evaluate((r) => window.__demoPlayer!.capturePublishFrame(r), req);
  const raw = Buffer.from(capture.pngDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  return downsamplePublishFrame(raw, tile.width, tile.height);
}

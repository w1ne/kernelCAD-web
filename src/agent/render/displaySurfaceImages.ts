// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/render/displaySurfaceImages.ts
//
// Node-side half of the display-surface contract (src/shared/render/
// displaySurface.ts): turn a validated DisplaySurfaceSpec[] into
// ResolvedDisplaySurface[] by reading each image into a data URL the page can
// load without a dev-server asset route. PNG / JPEG / WebP only — the bytes
// are sniffed, so a .png extension on a broken file is refused, not rendered
// as a transparent plane.

import { readFile, stat } from 'node:fs/promises';
import { resolveScriptRelativePath } from '../../shared/runtime/scriptRelativePath';
import {
  DEFAULT_DISPLAY_OFFSET_MM,
  type DisplaySurfaceSpec,
  type ResolvedDisplaySurface,
} from '../../shared/render/displaySurface';

/** Hard cap on one display image (16 MiB): screens are small, a bigger file
 *  is a mistake, and the browser decodes whatever it receives. */
export const MAX_DISPLAY_IMAGE_BYTES = 16 * 1024 * 1024;

const DATA_IMAGE_RE = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$/i;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function startsWith(bytes: Buffer, magic: Buffer): boolean {
  return bytes.length >= magic.length && bytes.subarray(0, magic.length).equals(magic);
}

/** Sniff PNG / JPEG / WebP magic bytes; throws on anything else. */
export function sniffDisplayImageMime(bytes: Buffer): string {
  if (startsWith(bytes, PNG_MAGIC)) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes.length >= 12
    && bytes.subarray(0, 4).toString('latin1') === 'RIFF'
    && bytes.subarray(8, 12).toString('latin1') === 'WEBP'
  ) return 'image/webp';
  throw new Error('display-surface: unsupported image bytes (expected PNG, JPEG or WebP).');
}

function encodeDataImage(bytes: Buffer, image: string): string {
  if (bytes.length === 0) {
    throw new Error(`display-surface: image '${image}' is empty.`);
  }
  if (bytes.length > MAX_DISPLAY_IMAGE_BYTES) {
    throw new Error(
      `display-surface: image '${image}' is ${bytes.length} bytes; the limit is ${MAX_DISPLAY_IMAGE_BYTES} bytes.`,
    );
  }
  return `data:${sniffDisplayImageMime(bytes)};base64,${bytes.toString('base64')}`;
}

async function readDisplayImageFile(image: string, scriptDir: string): Promise<string> {
  const absolute = resolveScriptRelativePath(scriptDir, image);
  let size: number;
  try {
    size = (await stat(absolute)).size;
  } catch (e) {
    throw new Error(
      `display-surface: cannot read image '${image}' (${absolute}): ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (size > MAX_DISPLAY_IMAGE_BYTES) {
    throw new Error(
      `display-surface: image '${image}' is ${size} bytes; the limit is ${MAX_DISPLAY_IMAGE_BYTES} bytes.`,
    );
  }
  return encodeDataImage(await readFile(absolute), image);
}

/** Resolve one display image: inline data URI (normalised) or script-relative
 *  file, encoded as a data URL. Throws a `display-surface:`-prefixed Error. */
export async function resolveDisplaySurfaceImage(image: string, scriptDir: string): Promise<string> {
  const inline = DATA_IMAGE_RE.exec(image.trim());
  if (inline === null) return readDisplayImageFile(image, scriptDir);
  const base64 = inline[1]!.replace(/\s+/g, '');
  return encodeDataImage(Buffer.from(base64, 'base64'), image);
}

function withDefaults(spec: DisplaySurfaceSpec): Omit<ResolvedDisplaySurface, 'imageDataUrl'> {
  return {
    part: spec.part,
    ...(spec.subMesh !== undefined ? { subMesh: spec.subMesh } : {}),
    face: spec.face ?? '+z',
    region: spec.region ?? [0, 0, 1, 1],
    rotation: spec.rotation ?? 0,
    mode: spec.mode ?? 'oled',
    ...(spec.emissiveIntensity !== undefined ? { emissiveIntensity: spec.emissiveIntensity } : {}),
    offsetMm: spec.offsetMm ?? DEFAULT_DISPLAY_OFFSET_MM,
  };
}

/** Resolve every display spec's image to a browser-loadable data URL. */
export async function resolveDisplaySurfaceImages(
  displays: readonly DisplaySurfaceSpec[],
  scriptDir: string,
): Promise<ResolvedDisplaySurface[]> {
  const resolved: ResolvedDisplaySurface[] = [];
  for (const spec of displays) {
    const imageDataUrl = await resolveDisplaySurfaceImage(spec.image, scriptDir);
    resolved.push({ ...withDefaults(spec), imageDataUrl });
  }
  return resolved;
}

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// STL attachments for the agent composer: check, measure and encode a mesh the
// user wants built around ("add a stand", "cut a hole"), so the agent imports
// it with `lib.fromSTL` and sizes its changes from the real extents instead of
// recreating the part from a description.
import { inspectStl, STL_DEFAULT_MAX_TRIANGLES } from '../../shared/mesh/stlInfo';
import type { StlAttachment } from './generateClient';

/**
 * Largest STL the composer sends. A binary STL at the `lib.fromSTL` triangle
 * budget is 84 + 200,000 × 50 bytes ≈ 9.5 MiB, so this cap lets a file through
 * whenever the importer would accept it; an ASCII STL reaches this size first
 * (≈ 40k triangles). Base64 grows it to ≈ 14 MiB of request body.
 */
export const MAX_STL_ATTACHMENT_BYTES = 10 * 1024 * 1024;
/** Same budget `lib.fromSTL` refuses above, so nothing is sent that cannot import. */
export const MAX_STL_ATTACHMENT_TRIANGLES = STL_DEFAULT_MAX_TRIANGLES;

export function isStlFileName(name: string): boolean {
  return name.toLowerCase().endsWith('.stl');
}

function base64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Check an STL payload against the attachment limits and measure it.
 * @throws Error with a message fit to show the user.
 */
export function stlAttachmentFromBytes(fileName: string, bytes: Uint8Array): StlAttachment {
  if (bytes.byteLength === 0) throw new Error(`${fileName} is empty.`);
  if (bytes.byteLength > MAX_STL_ATTACHMENT_BYTES) {
    throw new Error(`${fileName} is too large. STL files must be 10 MiB or smaller.`);
  }
  const info = inspectStl(bytes);
  if (info.triangleCount === 0 || info.bounds === null) {
    throw new Error(`${fileName} is not a readable STL (no triangles found).`);
  }
  if (info.triangleCount > MAX_STL_ATTACHMENT_TRIANGLES) {
    throw new Error(
      `${fileName} has ${info.triangleCount.toLocaleString('en-US')} triangles; the limit is ` +
        `${MAX_STL_ATTACHMENT_TRIANGLES.toLocaleString('en-US')}. Decimate the mesh in your slicer or mesh tool and attach it again.`,
    );
  }
  return {
    format: 'stl',
    fileName,
    dataUrl: `data:model/stl;base64,${base64(bytes)}`,
    encoding: info.binary ? 'binary' : 'ascii',
    triangleCount: info.triangleCount,
    bounds: info.bounds,
  };
}

function fmt(value: number): string {
  return String(Number(value.toFixed(3)));
}

/**
 * The line the agent reads about an attached mesh: what it is and how big.
 * The bytes travel separately in `GenerateRequest.attachments`.
 */
export function meshAttachmentPromptNote(attachment: StlAttachment): string {
  const { min, max } = attachment.bounds;
  const axes = ['X', 'Y', 'Z'] as const;
  const ranges = axes.map((axis, i) => `${axis} ${fmt(min[i])} to ${fmt(max[i])}`).join(', ');
  const size = axes.map((_, i) => fmt(max[i] - min[i])).join(' x ');
  return `Attached mesh: ${attachment.fileName} (${attachment.encoding} STL, ` +
    `${attachment.triangleCount.toLocaleString('en-US')} triangle${attachment.triangleCount === 1 ? '' : 's'}). ` +
    `Bounding box in file units (mm): ${ranges}; size ${size}.`;
}

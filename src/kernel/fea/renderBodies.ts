// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/renderBodies.ts
//
// Sidecar next to a generated band script: which STL is which coloured body.
// The script is for people (and stays valid); the sidecar lets the renderer
// draw the same bodies as display-only meshes without evaluating the script.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const RENDER_BODIES_FILE = 'render-bodies.json';

export interface RenderBodyRef {
  name: string;
  color: string;
  /** STL file name, relative to the sidecar's directory. */
  file: string;
}

export async function writeRenderBodies(dir: string, bodies: readonly RenderBodyRef[]): Promise<void> {
  await writeFile(join(dir, RENDER_BODIES_FILE), JSON.stringify(bodies), 'utf8');
}

/** The bodies of a script directory, or undefined when it has no sidecar. */
export async function readRenderBodies(dir: string): Promise<RenderBodyRef[] | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(join(dir, RENDER_BODIES_FILE), 'utf8'));
    return Array.isArray(parsed) ? (parsed as RenderBodyRef[]) : undefined;
  } catch {
    return undefined;
  }
}

/** Triangle positions (9 floats per triangle) from a binary STL. */
export function parseBinaryStl(buf: Buffer): Float32Array {
  const count = buf.length >= 84 ? Math.min(buf.readUInt32LE(80), Math.floor((buf.length - 84) / 50)) : 0;
  const out = new Float32Array(count * 9);
  for (let t = 0; t < count; t++) {
    const base = 84 + t * 50 + 12; // skip the facet normal
    for (let k = 0; k < 9; k++) out[t * 9 + k] = buf.readFloatLE(base + k * 4);
  }
  return out;
}

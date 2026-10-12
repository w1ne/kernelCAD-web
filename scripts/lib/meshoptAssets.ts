// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

export const MESHOPT_DECODER_URL = '/vendor/meshopt/meshopt_decoder.js';

/** Classic decoder has embedded WASM and needs no separately fetched binary. */
export function copyMeshoptDecoder(publicDir: string): void {
  const packageDir = path.dirname(createRequire(import.meta.url).resolve('meshoptimizer'));
  const destination = path.join(publicDir, 'vendor', 'meshopt');
  mkdirSync(destination, {recursive:true});
  for (const name of ['meshopt_decoder.js','LICENSE.md']) {
    copyFileSync(path.join(packageDir,name),path.join(destination,name));
  }
}

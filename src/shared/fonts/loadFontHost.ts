// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Capability-guarded entry to the node-only font loader.
//
// `resolveAndLoadFont` (fonts/index.ts) reads TTF bytes off disk. The text
// lowerers call it, and they sit inside the modeling API's import graph, so a
// STATIC import would pull `node:fs` into every browser bundle. This shim
// checks the host-filesystem capability FIRST and only then reaches the loader
// through a dynamic import, so:
//   - node behaves exactly as before (same loader, same call, same result),
//   - the browser gets a named diagnostic instead of a module-resolution crash,
//   - the loader lands in a lazy chunk rather than the main browser payload.

import { hasHostFs } from '../runtime/hostFs';
import { KernelError } from '../intent/kernelError';
import type { FontPath } from './fontPath';

export async function loadFontViaHost(
  font: string | FontPath | undefined,
  scriptDir: string | undefined,
): Promise<{ fontFamily: string }> {
  if (!hasHostFs()) {
    throw new KernelError(
      'cli.host-fs-unavailable',
      'Text features load font files from disk, which the browser runtime cannot do. ' +
        'Run this script through the kernelCAD CLI or MCP server to render text.',
    );
  }
  const { resolveAndLoadFont } = await import('./index');
  return resolveAndLoadFont(font, scriptDir);
}

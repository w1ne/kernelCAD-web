// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Browser-safe fonts entry point. Keep filesystem access in nodeLoader.ts;
// host-only callers reach that implementation through loadFontHost.ts.

import { KernelError } from '../intent/kernelError';
import type { DiagnosticCode } from '../diagnostics/registry';
import type { FontPath } from './fontPath';
import { hasHostFs } from '../runtime/hostFs';

export { fontPath, isFontPath, type FontPath } from './fontPath';

/** Browser-safe validation for a font family already registered by the host. */
export async function resolveAndLoadFont(
  font: string | FontPath | undefined,
  _scriptDir: string | undefined,
): Promise<{ fontFamily: string }> {
  if (hasHostFs()) {
    const { resolveAndLoadFont: loadOnHost } = await import('./nodeLoader');
    return loadOnHost(font, _scriptDir);
  }
  if (font === undefined || (typeof font === 'string' && font.endsWith('.ttf'))) {
    throw new KernelError(
      'cli.host-fs-unavailable',
      'Text features load font files from disk, which the browser runtime cannot do. ' +
        'Run this script through the kernelCAD CLI or MCP server to render text.',
    );
  }

  // Dynamic import keeps the browser module graph free of node:* imports.
  const { getFont } = await import('replicad');
  if (!getFont(font)) {
    throw new KernelError(
      'sketch.text.font-not-found' as DiagnosticCode,
      `Font '${font}' is not registered.`,
      undefined,
      `The font name '${font}' is not registered. Use fontPath('/path/to/font.ttf') to load a TTF from disk, or omit opts.font to use the bundled Liberation Sans.`,
    );
  }
  return { fontFamily: font };
}

/** Browser runtimes cannot load the bundled TTF from disk. */
export async function ensureBundledFontLoaded(): Promise<void> {
  if (hasHostFs()) {
    const { ensureBundledFontLoaded: loadOnHost } = await import('./nodeLoader');
    return loadOnHost();
  }
  throw new KernelError(
    'cli.host-fs-unavailable',
    'Text features load font files from disk, which the browser runtime cannot do. ' +
      'Run this script through the kernelCAD CLI or MCP server to render text.',
  );
}

/** Test compatibility helper; there is no browser-side loaded font state. */
export function __resetFontStateForTests(): void {}

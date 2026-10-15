// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Node-only bundled-font loader and script-relative path resolver.

import { readFileSync } from 'node:fs';
import { basename, extname, isAbsolute, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFont, getFont } from 'replicad';
import { KernelError } from '../intent/kernelError';
import type { DiagnosticCode } from '../diagnostics/registry';
import { isFontPath, type FontPath } from './fontPath';

let bundledLoaded = false;

function bundledFontFilePath(): string {
  const here =
    typeof __dirname !== 'undefined'
      ? __dirname
      : dirname(fileURLToPath(import.meta.url));
  const dev = resolve(here, 'LiberationSans-Regular.ttf');
  const bundle = resolve(here, 'fonts', 'LiberationSans-Regular.ttf');
  try {
    readFileSync(dev);
    return dev;
  } catch {
    return bundle;
  }
}

export async function ensureBundledFontLoaded(): Promise<void> {
  if (bundledLoaded) return;
  const buf = readFileSync(bundledFontFilePath());
  await loadFont(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    'default',
  );
  bundledLoaded = true;
}

export async function resolveAndLoadFont(
  font: string | FontPath | undefined,
  scriptDir: string | undefined,
): Promise<{ fontFamily: string }> {
  if (font === undefined) {
    await ensureBundledFontLoaded();
    return { fontFamily: 'default' };
  }

  if (isFontPath(font)) {
    const abs = isAbsolute(font)
      ? font
      : resolve(scriptDir ?? process.cwd(), font);
    const base = basename(abs, extname(abs));
    if (getFont(base)) return { fontFamily: base };
    const buf = readFileSync(abs);
    await loadFont(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      base,
    );
    return { fontFamily: base };
  }

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

export function __resetFontStateForTests(): void {
  bundledLoaded = false;
}

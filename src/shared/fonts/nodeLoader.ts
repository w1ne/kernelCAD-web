// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Node-only bundled-font loader and script-relative path resolver.

// Namespace imports: browser bundlers stub node:* builtins as empty modules,
// and a named import from that stub is a build error.
import * as nodeFs from 'node:fs';
import * as nodePath from 'node:path';
import * as nodeUrl from 'node:url';
import { loadFont, getFont } from 'replicad';
import { KernelError } from '../intent/kernelError';
import type { DiagnosticCode } from '../diagnostics/registry';
import { isFontPath, type FontPath } from './fontPath';

let bundledLoadPromise: Promise<void> | undefined;

function bundledFontFilePath(): string {
  const here =
    typeof __dirname !== 'undefined'
      ? __dirname
      : nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url));
  const dev = nodePath.resolve(here, 'LiberationSans-Regular.ttf');
  const bundle = nodePath.resolve(here, 'fonts', 'LiberationSans-Regular.ttf');
  try {
    nodeFs.readFileSync(dev);
    return dev;
  } catch {
    return bundle;
  }
}

export async function ensureBundledFontLoaded(): Promise<void> {
  if (bundledLoadPromise) return bundledLoadPromise;
  const pending = (async () => {
    const buf = nodeFs.readFileSync(bundledFontFilePath());
    await loadFont(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      'default',
    );
  })();
  bundledLoadPromise = pending;
  try {
    await pending;
  } catch (error) {
    if (bundledLoadPromise === pending) bundledLoadPromise = undefined;
    throw error;
  }
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
    const abs = nodePath.isAbsolute(font)
      ? font
      : nodePath.resolve(scriptDir ?? process.cwd(), font);
    const base = nodePath.basename(abs, nodePath.extname(abs));
    // Already registered under this family: reuse it instead of re-reading
    // and re-registering the file on every call.
    if (getFont(base)) return { fontFamily: base };
    const buf = nodeFs.readFileSync(abs);
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
  bundledLoadPromise = undefined;
}

export function __getBundledFontLoadPromiseForTests(): Promise<void> | undefined {
  return bundledLoadPromise;
}

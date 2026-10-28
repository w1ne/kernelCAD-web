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
/** Basename → hash of the bytes last passed to `loadFont`. */
const fontBytesByFamily = new Map<string, string>();

/** Same two-word FNV as `importIdentity`, so a same-length collision that
 *  misses document identity also misses this cache. */
function fontHash(bytes: Uint8Array): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ bytes.length;
  for (let i = 0; i < bytes.length; i++) {
    const code = bytes[i] ?? 0;
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ code, 0x01000193);
  }
  return `${bytes.length.toString(16)}:${(h1 >>> 0).toString(16)}:${(h2 >>> 0).toString(16)}`;
}

async function loadFontFile(abs: string, base: string): Promise<string> {
  // A missing or unreadable file must fail the rebuild. Returning the
  // previously registered face would store the old glyphs.
  const buf = nodeFs.readFileSync(abs);
  const hash = fontHash(buf);
  if (fontBytesByFamily.get(base) === hash && getFont(base)) return base;
  const bytes = new ArrayBuffer(buf.byteLength);
  new Uint8Array(bytes).set(buf);
  await loadFont(bytes, base, getFont(base) !== undefined);
  fontBytesByFamily.set(base, hash);
  return base;
}

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
    return { fontFamily: await loadFontFile(abs, base) };
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
  fontBytesByFamily.clear();
}

export function __getBundledFontLoadPromiseForTests(): Promise<void> | undefined {
  return bundledLoadPromise;
}

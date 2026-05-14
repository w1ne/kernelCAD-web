// src/lib/fonts/index.ts
//
// Bundled-font loader + script-relative font path resolver. Owns the
// "default" family registration in replicad's font registry. The OCCT
// text lowerer calls `resolveAndLoadFont(...)` before `replicad.drawText`.

import { readFileSync } from 'node:fs';
import { basename, extname, isAbsolute, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFont, getFont } from 'replicad';
import { KernelError } from '../../intent/kernelError';
import type { DiagnosticCode } from '../../diagnostics/codes';

/** Branded path type — distinguishes a font file path from a logical font name. */
export type FontPath = string & { readonly _brand: 'FontPath' };
export function fontPath(p: string): FontPath {
  return p as FontPath;
}
export function isFontPath(v: unknown): v is FontPath {
  // Branding is at the type level only; runtime detection is via "looks like a
  // file path" + extension. `.ttf` is the only format we accept today.
  return typeof v === 'string' && v.endsWith('.ttf');
}

let bundledLoaded = false;

/** Locate the bundled font file on disk in both dev (source tree) and
 *  prod (CLI bundle) contexts. */
function bundledFontFilePath(): string {
  // __dirname points at `<repo>/src/lib/fonts` in dev (transpiled at runtime
  // by tsx / Vitest). In the CLI bundle, this file is concatenated into
  // `dist/cli/index.js` — esbuild's banner sets `__dirname` to `dist/cli/`,
  // and the build:cli step copies the TTF into `dist/cli/fonts/`.
  // Try the dev path first (sibling file in source); fall back to the bundle
  // path (`<here>/fonts/...`).
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
  // Replicad's loadFont accepts `ArrayBuffer | string`. Provide ArrayBuffer
  // so we don't need a writable filesystem in the CLI sandbox.
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
  // Default: bundled font.
  if (font === undefined) {
    await ensureBundledFontLoaded();
    return { fontFamily: 'default' };
  }

  // Path-shaped input (.ttf) — load + register under basename.
  if (isFontPath(font)) {
    const abs = isAbsolute(font)
      ? font
      : resolve(scriptDir ?? process.cwd(), font);
    const base = basename(abs, extname(abs));
    if (getFont(base)) {
      return { fontFamily: base };
    }
    const buf = readFileSync(abs);
    await loadFont(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      base,
    );
    return { fontFamily: base };
  }

  // Logical name — must already be registered.
  const existing = getFont(font);
  if (!existing) {
    throw new KernelError(
      'sketch.text.font-not-found' as DiagnosticCode,
      `Font '${font}' is not registered.`,
      undefined,
      `The font name '${font}' is not registered. Use fontPath('/path/to/font.ttf') to load a TTF from disk, or omit opts.font to use the bundled Liberation Sans.`,
    );
  }
  return { fontFamily: font };
}

/** Test-only: clear bundled-loaded flag so each test starts from a clean slate. */
export function __resetFontStateForTests(): void {
  bundledLoaded = false;
}

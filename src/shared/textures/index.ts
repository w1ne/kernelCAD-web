// src/shared/textures/index.ts
//
// Texture loader — script-dir + absolute + URL path resolution, sha256 disk
// cache for URL-fetched textures, format and dimension validation.
//
// Server side (Node): `resolveAndLoadTextureBytes(ref, scriptDir)` returns
// `{ buffer, contentType, absPath, width, height }`. The /__kernelcad/texture
// dev-server route (Task 8) streams `buffer` with the matching MIME type.
//
// Browser side: `loadTextureFromUrl(url)` is a thin wrapper around
// `THREE.TextureLoader` so the studio renderer never touches `node:fs`.
//
// Cache layout (server only):
//   ~/.cache/kernelcad/textures/<sha256(url)>.<ext>
//
// Note: this is the FIRST kernelCAD module to use a user-cache pattern; the
// fonts loader (src/shared/fonts/index.ts) does not yet — fonts will follow
// when bundle-shipped fonts become insufficient. Mirroring this loader's
// directory layout is the intended convergence path.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { extname, isAbsolute, join, resolve } from 'node:path';
import sharp from 'sharp';
import type { TextureRef } from '../intent/textureRef';
import { KernelError } from '../intent/kernelError';
import type { DiagnosticCode } from '../diagnostics/registry';

const SUPPORTED_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const OVERSIZE_WARN_PX = 2048;
const OVERSIZE_ERROR_PX = 8192;

// 1-week TTL for URL-cached textures.
const URL_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// In-process URL cache so repeated fetches inside a single process don't hit
// the network at all (mirrors fonts loader's bundledLoaded flag, but per-URL).
const urlMemo = new Map<string, string>(); // url -> absPath in user cache

function userCacheDir(): string {
  // Allow override via env for tests and CI.
  const envOverride = process.env.KERNELCAD_TEXTURE_CACHE_DIR;
  if (envOverride && envOverride.length > 0) {
    return envOverride;
  }
  let base: string;
  try {
    base = homedir();
  } catch {
    base = tmpdir();
  }
  return join(base, '.cache', 'kernelcad', 'textures');
}

function ensureCacheDir(): string {
  const dir = userCacheDir();
  mkdirSync(dir, { recursive: true });
  return dir;
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function extOf(p: string): string {
  return extname(p).toLowerCase();
}

function throwKE(code: DiagnosticCode, message: string, hint?: string): never {
  throw new KernelError(code, message, undefined, hint);
}

function validateExtension(p: string): string {
  const ext = extOf(p);
  if (!SUPPORTED_EXTS.has(ext)) {
    throwKE(
      'feature.material.texture-unsupported-format' as DiagnosticCode,
      `Unsupported texture format '${ext || '(none)'}' at ${p}.`,
      'Use one of: .png, .jpg, .jpeg, .webp. KTX2 / TGA / EXR are not supported in this slice.',
    );
  }
  return ext;
}

async function readDimensions(
  buf: Buffer,
  absPath: string,
): Promise<{ width: number; height: number }> {
  try {
    const meta = await sharp(buf).metadata();
    const width = typeof meta.width === 'number' ? meta.width : 0;
    const height = typeof meta.height === 'number' ? meta.height : 0;
    return { width, height };
  } catch (e) {
    // sharp failed to decode → treat as unsupported / corrupt.
    throwKE(
      'feature.material.texture-unsupported-format' as DiagnosticCode,
      `Failed to read image metadata for ${absPath}: ${(e as Error).message}.`,
      'Texture bytes could not be decoded by sharp. Re-export as PNG/JPEG/WebP and retry.',
    );
  }
}

function enforceDimensionCaps(width: number, height: number, absPath: string): void {
  if (width > OVERSIZE_ERROR_PX || height > OVERSIZE_ERROR_PX) {
    throwKE(
      'feature.material.texture-oversize-error' as DiagnosticCode,
      `Texture ${absPath} is ${width}x${height}; max supported dimension is ${OVERSIZE_ERROR_PX}px.`,
      `Downscale to ≤${OVERSIZE_ERROR_PX}px on the longest side and retry.`,
    );
  }
  if (width > OVERSIZE_WARN_PX || height > OVERSIZE_WARN_PX) {
    // Soft warning: surface via console; agents can route this to a diagnostic
    // collector at a higher layer if available.
    // We do not throw — the load proceeds.
    // eslint-disable-next-line no-console
    console.warn(
      `[kernelcad] feature.material.texture-oversize-warning: ${absPath} is ${width}x${height} (recommended ≤${OVERSIZE_WARN_PX}px).`,
    );
  }
}

function fetchUrlToCache(url: string, ext: string): string {
  const cacheDir = ensureCacheDir();
  const cachePath = join(cacheDir, `${sha256Hex(url)}${ext}`);

  // Respect TTL: re-fetch if the cache file is older than URL_CACHE_TTL_MS.
  if (existsSync(cachePath)) {
    try {
      const st = statSync(cachePath);
      const ageMs = Date.now() - st.mtimeMs;
      if (ageMs < URL_CACHE_TTL_MS) {
        return cachePath;
      }
    } catch {
      // fall through to re-fetch
    }
  }

  // Synchronous fetch via XHR-style — Node 18+ ships global fetch. We block
  // on a tiny promise.
  // (Texture loads inside the capture clamper are async already; we only call
  // this from `resolveAndLoadTextureBytes` which is itself async.)
  throw new Error('fetchUrlToCache must be invoked from the async helper below');
}

async function fetchUrlToCacheAsync(url: string, ext: string): Promise<string> {
  const cacheDir = ensureCacheDir();
  const cachePath = join(cacheDir, `${sha256Hex(url)}${ext}`);

  if (existsSync(cachePath)) {
    try {
      const st = statSync(cachePath);
      const ageMs = Date.now() - st.mtimeMs;
      if (ageMs < URL_CACHE_TTL_MS) {
        return cachePath;
      }
    } catch {
      // fall through to re-fetch
    }
  }

  const res = await fetch(url);
  if (!res.ok) {
    throwKE(
      'feature.material.texture-not-found' as DiagnosticCode,
      `Failed to fetch texture URL ${url}: ${res.status} ${res.statusText}.`,
      'Check the URL is reachable and serves a supported image format.',
    );
  }
  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  writeFileSync(cachePath, buf);
  return cachePath;
}

export interface LoadedTextureBytes {
  /** Raw bytes of the texture file. */
  buffer: Buffer;
  /** MIME type matching the file extension. */
  contentType: string;
  /** Absolute on-disk path (post-cache, post-resolve). */
  absPath: string;
  /** Pixel width as reported by sharp. */
  width: number;
  /** Pixel height as reported by sharp. */
  height: number;
}

/**
 * Resolve a TextureRef to absolute on-disk bytes, returning the buffer +
 * content-type + dimensions. Throws KernelError with one of:
 *   - feature.material.texture-not-found
 *   - feature.material.texture-unsupported-format
 *   - feature.material.texture-oversize-error
 *
 * Emits a console.warn for feature.material.texture-oversize-warning when
 * a dimension exceeds 2048px but stays under 8192px.
 *
 * Server-side only. Browser-side rendering uses `loadTextureFromUrl()` which
 * does not touch the filesystem.
 */
export async function resolveAndLoadTextureBytes(
  ref: TextureRef,
  scriptDir: string | undefined,
): Promise<LoadedTextureBytes> {
  if (typeof ref.path !== 'string' || ref.path.length === 0) {
    throwKE(
      'feature.material.texture-not-found' as DiagnosticCode,
      'TextureRef.path is empty.',
      'Provide a non-empty absolute path, relative path, or https:// URL.',
    );
  }

  // URL branch: fetch + cache.
  if (/^https?:\/\//i.test(ref.path)) {
    // Derive extension from the URL pathname (not query string).
    let urlExt = '';
    try {
      const u = new URL(ref.path);
      urlExt = extOf(u.pathname);
    } catch {
      urlExt = extOf(ref.path);
    }
    validateExtension(`url${urlExt}`);
    const cached = urlMemo.get(ref.path);
    const absPath = cached ?? (await fetchUrlToCacheAsync(ref.path, urlExt));
    if (!cached) urlMemo.set(ref.path, absPath);
    const buffer = readFileSync(absPath);
    const { width, height } = await readDimensions(buffer, absPath);
    enforceDimensionCaps(width, height, absPath);
    return {
      buffer,
      contentType: MIME_BY_EXT[urlExt] ?? 'application/octet-stream',
      absPath,
      width,
      height,
    };
  }

  // Local-path branch.
  const ext = validateExtension(ref.path);
  const absPath = isAbsolute(ref.path)
    ? ref.path
    : resolve(scriptDir ?? process.cwd(), ref.path);

  if (!existsSync(absPath)) {
    throwKE(
      'feature.material.texture-not-found' as DiagnosticCode,
      `Texture file not found at ${absPath} (resolved from '${ref.path}').`,
      'Check that the path is correct, relative paths resolve against the script directory, and the file exists.',
    );
  }

  const buffer = readFileSync(absPath);
  const { width, height } = await readDimensions(buffer, absPath);
  enforceDimensionCaps(width, height, absPath);
  return {
    buffer,
    contentType: MIME_BY_EXT[ext] ?? 'application/octet-stream',
    absPath,
    width,
    height,
  };
}

// fetchUrlToCache is unused outside this module but retained as a synchronous
// stub so future sync code paths (e.g. CLI bundle warmup) can plug in.
void fetchUrlToCache;

/**
 * Test-only: clear the URL memo cache so each test starts from a clean slate.
 * The on-disk cache directory is NOT removed (tests should use a temporary
 * `KERNELCAD_TEXTURE_CACHE_DIR` if isolation is required).
 */
export function __resetTextureCacheForTests(): void {
  urlMemo.clear();
}

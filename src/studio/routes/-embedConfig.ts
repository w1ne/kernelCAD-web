// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { BACKGROUND_DARK_HEX, BACKGROUND_LIGHT_HEX } from '../components/viewer/sceneBackgroundTexture';

export type EmbedPresentation = 'viewer' | 'studio';

/** The plain embed stays the compatibility default; Studio is opt-in per host. */
export function embedPresentationMode(value: unknown): EmbedPresentation {
  return value === 'studio' ? 'studio' : 'viewer';
}

/**
 * `?customize=1` opts an embed into the model customizer panel. Off by
 * default: an embed that customizes re-builds the model from source instead
 * of showing a stored mesh.
 */
export function embedCustomize(value: unknown): boolean {
  return value === 1 || value === true || value === '1' || value === 'true';
}

/**
 * `undefined` means no requested revision (the compatible live model). `null`
 * means a malformed requested revision, which the embed must fail closed.
 */
export function embedRevision(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  const raw = typeof value === 'number' ? String(value) : value;
  if (typeof raw !== 'string' || !/^[1-9][0-9]*$/.test(raw)) return null;
  const revision = Number(raw);
  return Number.isSafeInteger(revision) ? revision : null;
}

export interface EmbedCodeLoaders {
  loadCurrent: () => Promise<string | null>;
  loadRevision: (revision: number) => Promise<string>;
}

/**
 * Resolves the source code an embed is allowed to render. Explicit revisions
 * never fall back to the mutable current project after a failed read.
 */
export async function loadEmbedCode(
  revision: number | null | undefined,
  loaders: EmbedCodeLoaders,
): Promise<string | null> {
  if (revision === null) return null;
  if (revision === undefined) return loaders.loadCurrent();
  try {
    return await loaders.loadRevision(revision);
  } catch {
    return null;
  }
}

const GEOMETRY_HASH_MESH_PATH = /\/mesh-artifacts\/g\/[a-f0-9]+\.json$/i;

/**
 * Pre-#147 tool results advertised geometry-hash CDN URLs. Those JSON bodies
 * stamp `revision` from the *first* persist, so a later open_in_studio revision
 * fails FunnelViewer with "Mesh revision N does not match requested revision M".
 * Rewrite to the revision-pinned object the server now always writes.
 */
export function revisionPinnedMeshUrl(
  meshUrl: string | undefined,
  slug: string,
  revision: number | null | undefined,
): string | undefined {
  if (!meshUrl || typeof revision !== 'number' || revision < 1 || !slug) return meshUrl;
  let parsed: URL;
  try {
    parsed = new URL(meshUrl);
  } catch {
    return meshUrl;
  }
  if (!GEOMETRY_HASH_MESH_PATH.test(parsed.pathname)) return meshUrl;
  parsed.pathname = `/mesh-artifacts/${encodeURIComponent(slug)}/v${revision}.json`;
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

export type EmbedTheme = 'light' | 'dark';

/**
 * `?theme=light|dark` pins the embed theme. Anything else (or no param) is
 * `undefined`: the embed follows the host's `prefers-color-scheme`.
 */
export function embedTheme(value: unknown): EmbedTheme | undefined {
  return value === 'light' || value === 'dark' ? value : undefined;
}

/** The theme the embed draws: the pinned one, else the host preference. */
export function resolveEmbedTheme(pinned: EmbedTheme | undefined, prefersDark: boolean): EmbedTheme {
  return pinned ?? (prefersDark ? 'dark' : 'light');
}

/**
 * The embed's backdrop per theme: the viewer canvas background of the same
 * theme, so the cross-fade from the poster to the live canvas has no colour
 * jump. Every other embed colour comes from the shared semantic tokens
 * (`data-theme` on the embed root).
 */
export const EMBED_CANVAS_BG: Record<EmbedTheme, string> = {
  dark: hexColor(BACKGROUND_DARK_HEX),
  light: hexColor(BACKGROUND_LIGHT_HEX),
};

function hexColor(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

/** Path of a project's stored render (kernelCAD-server `GET /api/v1/projects/:slug/og.png`). */
function storedRenderPath(slug: string): string {
  return `/api/v1/projects/${encodeURIComponent(slug)}/og.png`;
}

/**
 * The stored render to show as a poster while the geometry builds, or
 * `undefined`. The source is the page's own `og:image` tag, which the
 * /embed/:slug Pages Function (functions/_lib/og.ts) fills from the API, so
 * the poster costs no extra request before first paint. Only this project's
 * render counts: the generic site image that index.html ships is not a poster.
 *
 * A pinned revision gets no poster: the stored render is of the latest
 * revision and can show a different model.
 */
export function embedPosterUrl(
  slug: string,
  revision: number | null | undefined,
  ogImage: string | null | undefined,
): string | undefined {
  if (revision !== undefined || !slug || !ogImage) return undefined;
  let url: URL;
  try {
    url = new URL(ogImage);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') return undefined;
  return url.pathname === storedRenderPath(slug) ? url.toString() : undefined;
}

/** An in-memory `Storage`: values last for this page only. */
export function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(String(key)) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(String(key));
    },
    setItem: (key, value) => {
      values.set(String(key), String(value));
    },
  };
}

/**
 * A third-party iframe with storage blocked (third-party cookies off, as in
 * private windows) throws on every `localStorage` read. The viewer stack
 * reads stored preferences in many places, so an embed would crash with
 * "Something went wrong!". Swap in page-lifetime storage instead: the embed
 * renders with default preferences. Returns the names it replaced.
 */
export function ensureUsableStorage(win: Window = window): string[] {
  const replaced: string[] = [];
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try {
      const storage = win[name];
      storage.getItem('kernelcad:probe');
    } catch {
      try {
        Object.defineProperty(win, name, { value: createMemoryStorage(), configurable: true });
        replaced.push(name);
      } catch {
        // Not replaceable here: leave the browser's behaviour.
      }
    }
  }
  return replaced;
}

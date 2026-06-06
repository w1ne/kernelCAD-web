// Studio ↔ hosted MCP coverage — S1: API base-URL helper + auth wiring.
//
// Spec: docs/specs/2026-05-30-studio-hosted-mcp-coverage-design.md
// Plan: docs/plans/2026-05-30-studio-hosted-mcp-s1-api-base-helper.md
//
// Single place every Studio backend fetch routes through. Returns the URL
// prefix to prepend to legacy `/__kernelcad/...` paths and the headers to
// merge into `init.headers`:
//
// - Unsigned-in: `{ base: '', headers: {} }` — relative paths hit the
//   existing local vite middleware so behavior is bit-for-bit identical
//   to today.
// - Signed-in: `{ base: <hosted-api-root>, headers: { Authorization } }`
//   — fetches go to the hosted backend with the Supabase JWT.
//
// The hosted endpoints themselves (S2-S5) are not in this slice; the
// rewrite is correct but signed-in requests against the legacy paths will
// 404 until the hosted side lands.

import { getSupabase } from '../../funnel/lib/supabaseClient';

export interface ApiCallContext {
  /** URL prefix to prepend to legacy `/__kernelcad/...` paths. Empty
   *  string keeps the call same-origin → existing vite middleware. */
  base: string;
  /** Extra headers to merge into the fetch `init.headers`. Empty object
   *  when unsigned-in. */
  headers: Record<string, string>;
}

/** Returns the base URL + auth headers callers should use for every
 *  Studio backend fetch.
 *
 *  - Unsigned-in: returns `{ base: '', headers: {} }` — relative paths
 *    hit the existing local vite middleware (`/__kernelcad/...`).
 *  - Signed-in: returns `{ base: <hosted-api-root>, headers: { Authorization } }`
 *    — fetches go to the hosted backend with the Supabase JWT.
 *
 *  Resolves the hosted base from `import.meta.env.VITE_KERNELCAD_API_BASE`
 *  (preferred — dev override) or falls back to the prod URL.
 */
export async function apiCall(): Promise<ApiCallContext> {
  // Plain local dev has no Supabase env, so `getSupabase()` throws. That is
  // exactly the unsigned-in case: relative paths should hit the local vite
  // middleware. Swallow the missing-config throw and fall through to the
  // unsigned-in default — otherwise every Studio backend fetch (source, mesh,
  // review) crashes on localhost and the deep-link `?script=` route renders a
  // blank "Failed to load Studio source." screen.
  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return { base: '', headers: {} };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { base: '', headers: {} };
  const base = import.meta.env.VITE_KERNELCAD_API_BASE
    ?? 'https://app.kernelcad.com/api/v1';
  return { base, headers: { Authorization: `Bearer ${token}` } };
}

/** Convenience for the common case `fetch(rewritePath('/__kernelcad/foo', base))`.
 *  Strips the leading `/__kernelcad` and substitutes the hosted prefix
 *  when signed-in, keeping the same path tail. */
export function rewritePath(localPath: string, base: string): string {
  if (base === '') return localPath;
  return base + localPath.replace(/^\/__kernelcad/, '');
}

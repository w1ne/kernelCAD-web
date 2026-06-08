// Studio ↔ hosted MCP coverage — S1: API base-URL helper + auth wiring.
//
// Spec: docs/specs/2026-05-30-studio-hosted-mcp-coverage-design.md
// Plan: docs/plans/2026-05-30-studio-hosted-mcp-s1-api-base-helper.md
//
// THE single place every Studio backend fetch resolves its URL. One canonical
// convention, so the client path always equals the server mount path:
//
//   <base> + "/__kernelcad/<endpoint>"
//
// - Local dev (no API base configured): `base = ''` → relative `/__kernelcad/…`
//   hits the same-origin vite middleware. Bit-for-bit identical to today.
// - Hosted: `base = VITE_API_BASE_URL` (= https://api.kernelcad.com, the Hetzner
//   backend, direct origin — NOT CF-proxied). The `/__kernelcad` prefix is KEPT,
//   because that is exactly where the backend mounts every route (mesh, session,
//   params, transforms, events, animation-bake, source). Signed-in calls add the
//   Supabase JWT as a bearer header.
//
// History / why no `/api/v1`: an earlier draft sent signed-in calls to
// `app.kernelcad.com/api/v1/*` and stripped the `/__kernelcad` prefix, relying
// on a CF edge rewrite that does not exist (POST → 405, never reached Hetzner).
// `scriptSource.ts`'s mesh path already used VITE_API_BASE_URL + kept-prefix and
// worked; this module now matches it, so there is ONE routing convention.

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
 *  (dev override) then `VITE_API_BASE_URL` (the prod hosted backend, shared with
 *  scriptSource.ts), else `''` (local same-origin vite middleware).
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
  // Same base resolution as scriptSource.ts's hosted mesh path → ONE host for
  // all Studio backend traffic (api.kernelcad.com, the direct Hetzner origin).
  const base = import.meta.env.VITE_KERNELCAD_API_BASE
    ?? import.meta.env.VITE_API_BASE_URL
    ?? '';
  return { base, headers: { Authorization: `Bearer ${token}` } };
}

/** Convenience for the common case `fetch(rewritePath('/__kernelcad/foo', base))`.
 *  Prepends the hosted origin while KEEPING the `/__kernelcad` prefix — the
 *  backend mounts every route under `/__kernelcad/*`, so the client path must
 *  match the server mount path. Empty base → unchanged same-origin path (local
 *  vite middleware). */
export function rewritePath(localPath: string, base: string): string {
  if (base === '') return localPath;
  return base + localPath;
}

/** Extracts the raw Supabase JWT from an `apiCall()` headers map, or
 *  `undefined` when unsigned-in (no `Authorization` header). Lets SSE callers
 *  reuse the exact token every other Studio fetch sends as a bearer header. */
export function bearerToken(headers: Record<string, string>): string | undefined {
  const auth = headers.Authorization;
  if (!auth) return undefined;
  const m = /^Bearer\s+(.+)$/.exec(auth);
  return m ? m[1] : undefined;
}

/** Builds the `/__kernelcad/events` SSE URL.
 *
 *  `EventSource` cannot carry custom headers, so the signed-in path cannot
 *  send `Authorization: Bearer <jwt>` the way every other Studio fetch does.
 *  Instead we append the JWT as an `access_token` query param, which the
 *  hosted server's injected `authenticate` hook validates (see
 *  `eventsEndpoint.ts`). When `jwt` is absent (local vite dev, unsigned-in)
 *  the param is omitted and behavior is bit-for-bit identical to today.
 *
 *  `base` is routed through `rewritePath` so signed-in users hit the hosted
 *  endpoint and unsigned-in users hit the same-origin vite middleware.
 *
 *  Security note: the `access_token` rides in the query string and can land
 *  in access logs. Accepted for now — it is the short-lived Supabase JWT, and
 *  the `session` token is already an unguessable per-user randomUUID. */
export function buildEventsUrl(
  base: string,
  sessionToken: string,
  jwt?: string,
): string {
  let url = rewritePath(
    `/__kernelcad/events?session=${encodeURIComponent(sessionToken)}`,
    base,
  );
  if (jwt) url += `&access_token=${encodeURIComponent(jwt)}`;
  return url;
}

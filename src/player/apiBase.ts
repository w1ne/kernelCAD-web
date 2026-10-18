// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Minimal backend-URL helper for the standalone player. No auth: the player is
// a local/render surface; the private Studio keeps its own Supabase-aware client.
// Deliberate divergence from Studio's client: the player always honors the
// VITE_* env base, even unsigned-in (Studio blanks it to '' on that path).

export interface ApiCallContext {
  base: string;
  headers: Record<string, string>;
}

export async function apiCall(): Promise<ApiCallContext> {
  const env = import.meta.env as Record<string, string | undefined>;
  const base = env.VITE_KERNELCAD_API_BASE ?? env.VITE_API_BASE_URL ?? '';
  return { base, headers: {} };
}

export function rewritePath(path: string, base: string): string {
  if (!base) return path;
  return `${base.replace(/\/$/, '')}${path}`;
}

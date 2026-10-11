// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** The longest prompt the marketing hero form accepts in its URL. */
export const MAX_QUERY_PROMPT = 2000;

/** Pages allowed to start a build on load. Anything else only prefills. */
const AUTO_SUBMIT_ORIGINS: ReadonlySet<string> = new Set([
  'https://kernelcad.com',
  'https://www.kernelcad.com',
]);

/**
 * True when `?auto=1` came from the marketing site. A third-party link or a
 * link previewer must not spend a build, so an empty or foreign referrer
 * gets the prefill only.
 */
export function shouldAutoSubmit(auto: string | null, referrer: string | null | undefined): boolean {
  if (auto !== '1' || !referrer) return false;
  try {
    return AUTO_SUBMIT_ORIGINS.has(new URL(referrer).origin);
  } catch {
    return false;
  }
}

export interface GenerateQuery {
  prompt: string;
  auto: string | null;
  /** The URL carried q, prompt or auto, so there is something to strip. */
  hadParams: boolean;
}

/** Reads `q` (or the older `prompt`), trimmed and capped, plus `auto`. */
export function parseGenerateQuery(search: string): GenerateQuery {
  const params = new URLSearchParams(search);
  const raw = params.get('q') ?? params.get('prompt') ?? '';
  return {
    prompt: raw.trim().slice(0, MAX_QUERY_PROMPT).trim(),
    auto: params.get('auto'),
    hadParams: params.has('q') || params.has('prompt') || params.has('auto'),
  };
}

/** Drops the handoff params so a reload or Back does not build again. */
export function stripGenerateQuery(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('q');
  url.searchParams.delete('prompt');
  url.searchParams.delete('auto');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}

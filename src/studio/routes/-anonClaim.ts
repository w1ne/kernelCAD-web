// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Shared text and URL helpers for the anonymous-project claim flows
// (/claim landing, /p/:slug banner, /me notice).
import type { AnonClaimErrorKind } from '../../funnel/lib/apiClient';

/** Query flag the /p/:slug banner's sign-in round trip returns with, so the
 *  page runs the claim as soon as the session is back. */
export const CLAIM_AFTER_SIGN_IN_PARAM = 'claim';

/** Current URL plus `?claim=1`: where the banner's sign-in returns to. */
export function claimReturnUrl(href: string): string {
  const url = new URL(href);
  url.searchParams.set(CLAIM_AFTER_SIGN_IN_PARAM, '1');
  return url.toString();
}

export const ANON_CLAIM_ERROR_TEXT: Record<AnonClaimErrorKind, string> = {
  expired: 'This link has expired. Open a project link from your chat and use “Sign in to keep it” there.',
  invalid: 'This link is not valid. Copy the full sign-in link from your chat and try again.',
  foreign: 'These projects are already saved to another account.',
  unavailable: 'Saving projects to an account is not available right now. Try again later.',
  failed: 'Something went wrong while moving your projects. Reload the page to try again.',
};

/** Text for the /me notice after a claim moved anonymous projects. */
export function movedProjectsText(moved: number): string {
  if (moved <= 0) return 'Your projects are already in your account.';
  return `${moved} ${moved === 1 ? 'project' : 'projects'} moved to your account`;
}

/** Parse the `moved` search param of /me; undefined when absent or bad. */
export function parseMovedParam(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value !== '' ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 0 && n <= 10_000 ? n : undefined;
}

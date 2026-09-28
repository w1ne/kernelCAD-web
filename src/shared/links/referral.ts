// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/links/referral.ts
//
// Vendor referral tags live in exactly ONE place: this file.
//
//   - Data (shopcheck catalogs, parts records, configurator URLs) stores only
//     clean canonical vendor URLs. No tags or tracking parameters in data.
//   - `buildVendorUrl()` / `buildVendorLink()` is the ONLY function allowed to
//     produce an outbound vendor URL that reaches the UI or an agent. A unit
//     gate (tests/unit/links/referral.gate.test.ts) fails if source code
//     emits a raw vendor URL anywhere else.
//   - A vendor with an empty tag (the default) gets the clean URL back,
//     unchanged. A missing tag never breaks a link.
//   - Every surface that shows a tagged link also shows REFERRAL_DISCLOSURE.
//
// Self-hosters and forks: fill in or clear the tags below, or override them
// at runtime with `KERNELCAD_REFERRAL_<VENDOR>=<tag>` (e.g.
// `KERNELCAD_REFERRAL_SENDCUTSEND=abc`). `KERNELCAD_REFERRALS=off` turns every
// tag off. See ATTRIBUTION.md.

import type { LinkSurface } from './attribution';

export type { LinkSurface } from './attribution';

/** Shown next to every tagged vendor link, in the UI and in agent output. */
export const REFERRAL_DISCLOSURE =
  'Some links are referral links; kernelCAD may earn a commission.';

export interface VendorReferral {
  /** Stable vendor key. Also the env-override suffix, upper-cased. */
  readonly vendor: string;
  /** Hostnames this vendor serves (matched against the URL hostname). */
  readonly hosts: readonly RegExp[];
  /** Query parameter the vendor's referral program reads. */
  readonly param: string;
  /** Referral tag. Empty string = no tag = the clean URL. */
  readonly tag: string;
}

/**
 * Per-vendor referral config.
 *
 * TODO(owner): fill in each `tag` once the vendor's referral program is set
 * up, and confirm `param` against that program's docs. Until then every tag
 * is empty and every vendor link stays clean. Do not put placeholder IDs here.
 */
export const VENDOR_REFERRALS: readonly VendorReferral[] = [
  { vendor: 'sendcutsend', hosts: [/(^|\.)sendcutsend\.com$/i], param: 'ref', tag: '' },
  { vendor: 'igus', hosts: [/(^|\.)igus\.partcommunity\.com$/i, /(^|\.)igus\.(com|de|eu)$/i], param: 'ref', tag: '' },
  { vendor: 'misumi', hosts: [/(^|\.)misumi([.-]|$)/i], param: 'ref', tag: '' },
  { vendor: 'pololu', hosts: [/(^|\.)pololu\.com$/i], param: 'ref', tag: '' },
  { vendor: 'traceparts', hosts: [/(^|\.)traceparts/i], param: 'ref', tag: '' },
  { vendor: 'partcommunity', hosts: [/(^|\.)partcommunity\.com$/i], param: 'ref', tag: '' },
];

/** Result of building a vendor link. `referral` is true only when a tag was added. */
export interface VendorLink {
  url: string;
  referral: boolean;
  vendor?: string;
}

export interface BuildVendorUrlOptions {
  /** Where the link is shown. Carried as `utm_medium` on tagged links. */
  surface: LinkSurface;
  /** Env source for overrides. Defaults to `process.env` where it exists. */
  env?: Record<string, string | undefined>;
}

function defaultEnv(): Record<string, string | undefined> {
  return typeof process !== 'undefined' && process.env ? process.env : {};
}

/** The vendor whose hosts match `url`, or undefined for an unknown host / bad URL. */
export function vendorForUrl(url: string): VendorReferral | undefined {
  let hostname: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
    hostname = parsed.hostname.toLowerCase();
  } catch {
    return undefined;
  }
  return VENDOR_REFERRALS.find((v) => v.hosts.some((re) => re.test(hostname)));
}

/** The effective tag for `vendor`: env override, else the constant above. */
export function referralTag(
  vendor: VendorReferral,
  env: Record<string, string | undefined> = defaultEnv(),
): string {
  if ((env.KERNELCAD_REFERRALS ?? '').toLowerCase() === 'off') return '';
  const override = env[`KERNELCAD_REFERRAL_${vendor.vendor.toUpperCase()}`];
  return (override ?? vendor.tag).trim();
}

/**
 * Build the outbound URL for a vendor link.
 *
 * Known vendor with a tag: sets `<param>=<tag>`, `utm_source=kernelcad` and
 * `utm_medium=<surface>`. Unknown vendor, empty tag, or unparseable URL: the
 * input comes back unchanged. Idempotent: building an already-built URL gives
 * the same URL (parameters are set, never appended).
 */
export function buildVendorLink(url: string, opts: BuildVendorUrlOptions): VendorLink {
  const vendor = vendorForUrl(url);
  if (!vendor) return { url, referral: false };
  const tag = referralTag(vendor, opts.env);
  if (tag === '') return { url, referral: false, vendor: vendor.vendor };
  const out = new URL(url);
  out.searchParams.set(vendor.param, tag);
  out.searchParams.set('utm_source', 'kernelcad');
  out.searchParams.set('utm_medium', opts.surface);
  return { url: out.toString(), referral: true, vendor: vendor.vendor };
}

/** `buildVendorLink(url, opts).url`. */
export function buildVendorUrl(url: string, opts: BuildVendorUrlOptions): string {
  return buildVendorLink(url, opts).url;
}

/** REFERRAL_DISCLOSURE when any of `links` carries a referral tag, else undefined. */
export function referralDisclosure(links: readonly VendorLink[]): string | undefined {
  return links.some((l) => l.referral) ? REFERRAL_DISCLOSURE : undefined;
}

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import {
  buildVendorLink,
  buildVendorUrl,
  referralDisclosure,
  REFERRAL_DISCLOSURE,
  VENDOR_REFERRALS,
  vendorForUrl,
} from './referral';

const TAGGED = {
  KERNELCAD_REFERRAL_SENDCUTSEND: 'kc-scs',
  KERNELCAD_REFERRAL_MISUMI: 'kc-mis',
};

describe('buildVendorUrl', () => {
  it('ships with empty tags: every vendor link is the clean URL', () => {
    for (const v of VENDOR_REFERRALS) expect(v.tag).toBe('');
    const url = 'https://sendcutsend.com/materials/';
    expect(buildVendorUrl(url, { surface: 'shopcheck', env: {} })).toBe(url);
  });

  it('adds the vendor tag and the surface per vendor', () => {
    expect(buildVendorUrl('https://sendcutsend.com/materials/', { surface: 'shopcheck', env: TAGGED }))
      .toBe('https://sendcutsend.com/materials/?ref=kc-scs&utm_source=kernelcad&utm_medium=shopcheck');
    expect(buildVendorUrl('https://us.misumi-ec.com/vona2/detail/X/?Tab=cad', { surface: 'part', env: TAGGED }))
      .toBe('https://us.misumi-ec.com/vona2/detail/X/?Tab=cad&ref=kc-mis&utm_source=kernelcad&utm_medium=part');
  });

  it('carries the surface it is shown on', () => {
    const bom = buildVendorUrl('https://sendcutsend.com/', { surface: 'bom', env: TAGGED });
    const embed = buildVendorUrl('https://sendcutsend.com/', { surface: 'embed', env: TAGGED });
    expect(new URL(bom).searchParams.get('utm_medium')).toBe('bom');
    expect(new URL(embed).searchParams.get('utm_medium')).toBe('embed');
  });

  it('leaves unknown vendors, look-alike hosts and non-URLs clean', () => {
    for (const url of [
      'https://example.com/part.step',
      'https://sendcutsend.com.evil.example/x',
      'https://raw.githubusercontent.com/o/r/main/p.step',
      'not a url',
      'ftp://sendcutsend.com/x',
    ]) {
      expect(buildVendorUrl(url, { surface: 'part', env: TAGGED })).toBe(url);
    }
  });

  it('leaves a known vendor with an empty tag clean', () => {
    const url = 'https://www.pololu.com/product/1';
    expect(buildVendorLink(url, { surface: 'part', env: TAGGED })).toEqual({ url, referral: false, vendor: 'pololu' });
  });

  it('never double-tags', () => {
    const once = buildVendorUrl('https://sendcutsend.com/a?x=1#f', { surface: 'bom', env: TAGGED });
    const twice = buildVendorUrl(once, { surface: 'bom', env: TAGGED });
    expect(twice).toBe(once);
    expect(new URL(twice).searchParams.getAll('ref')).toEqual(['kc-scs']);
    expect(new URL(twice).hash).toBe('#f');
  });

  it('KERNELCAD_REFERRALS=off turns every tag off', () => {
    const url = 'https://sendcutsend.com/';
    expect(buildVendorUrl(url, { surface: 'bom', env: { ...TAGGED, KERNELCAD_REFERRALS: 'off' } })).toBe(url);
  });

  it('matches the vendor hosts that data and code use', () => {
    expect(vendorForUrl('https://igus.partcommunity.com/3d-cad-models/x')?.vendor).toBe('igus');
    expect(vendorForUrl('https://www.traceparts.com/en/x')?.vendor).toBe('traceparts');
    expect(vendorForUrl('https://sendcutsend.com/bending/')?.vendor).toBe('sendcutsend');
  });
});

describe('referralDisclosure', () => {
  it('is present only when a link carries a tag', () => {
    const clean = buildVendorLink('https://sendcutsend.com/', { surface: 'bom', env: {} });
    const tagged = buildVendorLink('https://sendcutsend.com/', { surface: 'bom', env: TAGGED });
    expect(referralDisclosure([clean])).toBeUndefined();
    expect(referralDisclosure([clean, tagged])).toBe(REFERRAL_DISCLOSURE);
    expect(REFERRAL_DISCLOSURE).toBe('Some links are referral links; kernelCAD may earn a commission.');
  });
});

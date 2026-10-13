// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { galleryEntryRedirect } from '../../../functions/gallery/[slug]';

describe('/gallery/:slug redirect', () => {
  it('sends a curated slug to the hosted Studio view', () => {
    const res = galleryEntryRedirect(new Request('https://app.kernelcad.com/gallery/hand-coffee-grinder'), 'hand-coffee-grinder');
    expect(res?.status).toBe(302);
    expect(res?.headers.get('Location')).toBe('https://app.kernelcad.com/studio?gallery=hand-coffee-grinder');
  });
  it('ignores malformed slugs', () => {
    const req = new Request('https://app.kernelcad.com/gallery/x');
    expect(galleryEntryRedirect(req, '../etc')).toBeNull();
    expect(galleryEntryRedirect(req, ['a', 'b'])).toBeNull();
  });
});

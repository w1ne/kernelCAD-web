// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { resolveReviewPaintTargets } from './reviewPaintTargets';

// jsdom default origin is http://localhost:3000 — the local-dev chain derives
// its first target from window.location.protocol/hostname + :5174.
const LOCAL_CHAIN = [
  'http://localhost:5174/__kernelcad/review-paint',
  '/__kernelcad/review-paint',
];

describe('resolveReviewPaintTargets', () => {
  it('targets the hosted backend first on a /p page when apiBase is set', () => {
    expect(
      resolveReviewPaintTargets('/p/abc123', 'https://api.kernelcad.com'),
    ).toEqual({
      slug: 'abc123',
      urls: [
        'https://api.kernelcad.com/api/v1/review-paint',
        '/__kernelcad/review-paint',
      ],
    });
  });

  it('keeps the local-dev chain on a /p page when no apiBase is configured', () => {
    expect(resolveReviewPaintTargets('/p/abc123', undefined)).toEqual({
      slug: 'abc123',
      urls: LOCAL_CHAIN,
    });
  });

  it('treats an empty apiBase as unconfigured', () => {
    expect(resolveReviewPaintTargets('/p/abc123', '')).toEqual({
      slug: 'abc123',
      urls: LOCAL_CHAIN,
    });
  });

  it('uses the local-dev chain with no slug on non-project pages', () => {
    expect(
      resolveReviewPaintTargets('/', 'https://api.kernelcad.com'),
    ).toEqual({ slug: null, urls: LOCAL_CHAIN });
  });

  it('does not match nested or malformed /p paths', () => {
    expect(resolveReviewPaintTargets('/p/abc/extra', undefined).slug).toBeNull();
    expect(resolveReviewPaintTargets('/p/', undefined).slug).toBeNull();
    expect(resolveReviewPaintTargets('/project/abc', undefined).slug).toBeNull();
  });
});

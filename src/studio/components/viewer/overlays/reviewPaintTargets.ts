/**
 * Resolve the ordered list of POST targets for a review-paint packet.
 *
 * Returns `{ slug, urls }` where `slug` is the `/p/<slug>` project slug
 * (or null on non-project pages) and `urls` is an ordered array of
 * candidate endpoints — first successful POST wins.
 *
 * Priority:
 *  1. On a `/p/<slug>` page AND `apiBase` is set → hosted backend first,
 *     then same-origin fallback (harmless on hosted; catches split-origin dev).
 *  2. Otherwise → local dev server (:5174) first, then same-origin fallback.
 */
export function resolveReviewPaintTargets(
  pathname: string,
  apiBase: string | undefined,
): { slug: string | null; urls: string[] } {
  const match = pathname.match(/^\/p\/([A-Za-z0-9_-]+)$/);
  const slug = match?.[1] ?? null;

  if (slug && apiBase) {
    // Hosted /p/<slug> page: talk to the backend first, same-origin as fallback.
    return {
      slug,
      urls: [
        `${apiBase}/api/v1/review-paint`,
        '/__kernelcad/review-paint',
      ],
    };
  }

  // Local dev (with or without a /p page) or hosted non-/p page: use the
  // existing :5174 → same-origin chain so local dev stays unchanged.
  return {
    slug,
    urls: [
      `${window.location.protocol}//${window.location.hostname}:5174/__kernelcad/review-paint`,
      '/__kernelcad/review-paint',
    ],
  };
}

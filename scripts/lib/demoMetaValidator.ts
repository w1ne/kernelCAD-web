// scripts/lib/demoMetaValidator.ts
//
// Pure validator for docs/demos/v0.X/<task>/meta.json contents.
// Called by scripts/lint-demos.ts and unit-tested in isolation.

import {
  getCatalogForVersion,
  isCatalogSlug,
  GENERIC_PRIMITIVE_DENYLIST,
} from './memorableBuildsCatalog';

const REQUIRED_PRE_EXISTING = ['gitSha', 'capturedAt', 'taskId'] as const;
const REQUIRED_NEW = ['heroArtifact', 'catalogSource', 'overrideApprovedBy'] as const;

export function validateDemoMeta(meta: Record<string, unknown>, version: string): string[] {
  const errors: string[] = [];

  for (const k of REQUIRED_PRE_EXISTING) {
    if (!meta[k]) errors.push(`meta.json missing key '${k}'`);
  }
  for (const k of REQUIRED_NEW) {
    // overrideApprovedBy may be null, but the key must be present.
    if (!(k in meta)) errors.push(`meta.json missing key '${k}'`);
  }

  if (!getCatalogForVersion(version)) {
    errors.push(`no catalog entry for ${version} in memorableBuildsCatalog`);
    return errors;
  }

  const heroArtifact = meta.heroArtifact;
  if (typeof heroArtifact === 'string' && GENERIC_PRIMITIVE_DENYLIST.has(heroArtifact)) {
    errors.push(`heroArtifact '${heroArtifact}' is denylisted (generic primitive)`);
  }

  const override = meta.overrideApprovedBy;
  const hasOverride = typeof override === 'string' && override.length > 0;

  if (
    typeof heroArtifact === 'string' &&
    !GENERIC_PRIMITIVE_DENYLIST.has(heroArtifact) &&
    !hasOverride &&
    !isCatalogSlug(heroArtifact, version)
  ) {
    errors.push(`heroArtifact '${heroArtifact}' does not match catalog for ${version} and no overrideApprovedBy is set`);
  }

  return errors;
}
